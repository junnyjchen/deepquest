import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const supabase = getSupabaseClient();

// 获取限制地址列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    let query = supabase
      .from('address_restrictions')
      .select('*', { count: 'exact' });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query
      .order('restricted_at', { ascending: false })
      .range(from, to);
    
    if (error) throw new Error(`获取限制列表失败: ${error.message}`);
    
    // 获取操作人信息
    const adminIds = [...new Set((data || []).map(r => r.restricted_by).filter(Boolean))];
    let adminMap: Record<string, string> = {};
    
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from('admins')
        .select('id, username')
        .in('id', adminIds);
      
      if (admins) {
        adminMap = admins.reduce((acc, admin) => {
          acc[admin.id] = admin.username;
          return acc;
        }, {} as Record<string, string>);
      }
    }
    
    const enrichedData = (data || []).map(record => ({
      ...record,
      restricted_by_name: adminMap[record.restricted_by] || null
    }));
    
    res.json({
      data: enrichedData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error: any) {
    console.error('Get restrictions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取限制统计
router.get('/stats', async (req, res) => {
  try {
    // 总限制数
    const { count: totalRestricted, error: totalError } = await supabase
      .from('address_restrictions')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw new Error(totalError.message);
    
    // 活跃限制数
    const { count: activeRestricted, error: activeError } = await supabase
      .from('address_restrictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'restricted');
    
    if (activeError) throw new Error(activeError.message);
    
    // 被锁定的奖励总额
    const { data: restrictedRecords, error: rewardError } = await supabase
      .from('address_restrictions')
      .select('restricted_debt')
      .eq('status', 'restricted');
    
    if (rewardError) throw new Error(rewardError.message);
    
    const totalRestrictedReward = restrictedRecords?.reduce(
      (sum, r) => sum + parseFloat(r.restricted_debt || '0'), 
      0
    ) || 0;
    
    res.json({
      totalRestricted: totalRestricted || 0,
      activeRestricted: activeRestricted || 0,
      totalRestrictedReward: totalRestrictedReward.toFixed(9),
    });
  } catch (error: any) {
    console.error('Get restriction stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个地址限制详情
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const { data, error } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', address)
      .maybeSingle();
    
    if (error) throw new Error(`获取限制详情失败: ${error.message}`);
    
    if (!data) {
      return res.status(404).json({ error: '限制记录不存在' });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error('Get restriction detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加限制地址
router.post('/', async (req, res) => {
  try {
    const { address, reason } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: '地址必填' });
    }
    
    // 检查地址格式
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      return res.status(400).json({ error: '地址格式不正确' });
    }
    
    // 检查是否已存在
    const { data: existing, error: existingError } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', address)
      .maybeSingle();
    
    if (existingError) throw new Error(existingError.message);
    
    if (existing) {
      if (existing.status === 'restricted') {
        return res.status(400).json({ error: '地址已被限制' });
      }
      // 重新激活
      const { data, error } = await supabase
        .from('address_restrictions')
        .update({
          status: 'restricted',
          reason: reason || '',
          restricted_at: new Date().toISOString(),
        })
        .eq('user_address', address)
        .select()
        .single();
      
      if (error) throw new Error(`更新限制失败: ${error.message}`);
      return res.json(data);
    }
    
    // 创建新记录
    const { data, error } = await supabase
      .from('address_restrictions')
      .insert({
        user_address: address,
        reason: reason || '',
        status: 'restricted',
        restricted_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw new Error(`添加限制失败: ${error.message}`);
    
    res.json(data);
  } catch (error: any) {
    console.error('Add restriction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 解除限制
router.delete('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const { data, error } = await supabase
      .from('address_restrictions')
      .update({
        status: 'unrestricted',
        unrestricted_at: new Date().toISOString(),
      })
      .eq('user_address', address)
      .select()
      .single();
    
    if (error) throw new Error(`解除限制失败: ${error.message}`);
    
    if (!data) {
      return res.status(404).json({ error: '限制记录不存在' });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error('Remove restriction error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
