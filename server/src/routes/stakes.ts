import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

/**
 * GET /api/v1/stakes
 * 获取质押记录列表（分页）
 */
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const stakeDays = req.query.stakeDays as string;
    const isClaimed = req.query.isClaimed as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let query = supabase
      .from('lp_stakes')
      .select('*', { count: 'exact' });

    // 筛选条件
    if (stakeDays !== undefined) {
      query = query.eq('stake_days', parseInt(stakeDays));
    }

    if (isClaimed !== undefined) {
      query = query.eq('is_claimed', isClaimed === 'true');
    }

    if (search) {
      query = query.ilike('user_address', `%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      // 检查是否是表不存在的错误
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return res.status(500).json({
          error: `❌ 数据表 'lp_stakes' 不存在！\n\n请先在数据库中执行以下 SQL 创建表：\n\nCREATE TABLE IF NOT EXISTS lp_stakes (\n    id SERIAL PRIMARY KEY,\n    user_address VARCHAR(255) NOT NULL,\n    amount NUMERIC NOT NULL,\n    stake_days INTEGER NOT NULL,\n    start_time TIMESTAMP,\n    end_time TIMESTAMP,\n    reward_amount NUMERIC DEFAULT 0,\n    is_claimed BOOLEAN DEFAULT FALSE,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_user ON lp_stakes(user_address);\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_created ON lp_stakes(created_at DESC);`
        });
      }
      throw error;
    }

    res.json({
      list: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('Get stakes error:', error);
    res.status(500).json({ error: error.message || '获取质押记录失败' });
  }
});

/**
 * GET /api/v1/stakes/stats
 * 获取质押统计
 */
router.get('/stats', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    // 获取总质押金额
    const { data: amountData, error: amountError } = await supabase
      .from('lp_stakes')
      .select('amount');

    if (amountError) {
      if (amountError.message.includes('does not exist') || amountError.code === '42P01') {
        return res.status(500).json({
          error: `❌ 数据表 'lp_stakes' 不存在！\n\n请先在数据库中执行以下 SQL 创建表：\n\nCREATE TABLE IF NOT EXISTS lp_stakes (\n    id SERIAL PRIMARY KEY,\n    user_address VARCHAR(255) NOT NULL,\n    amount NUMERIC NOT NULL,\n    stake_days INTEGER NOT NULL,\n    start_time TIMESTAMP,\n    end_time TIMESTAMP,\n    reward_amount NUMERIC DEFAULT 0,\n    is_claimed BOOLEAN DEFAULT FALSE,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_user ON lp_stakes(user_address);\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_created ON lp_stakes(created_at DESC);`
        });
      }
      throw amountError;
    }

    // 获取用户数
    const { count: userCount } = await supabase
      .from('lp_stakes')
      .select('user_address', { count: 'exact', head: true });

    // 获取已赎回数量
    const { count: claimedCount } = await supabase
      .from('lp_stakes')
      .select('id', { count: 'exact', head: true })
      .eq('is_claimed', true);

    // 获取总奖励
    const { data: rewardData } = await supabase
      .from('lp_stakes')
      .select('reward_amount');

    const totalStaked = amountData?.reduce((sum: number, item: { amount: string | number }) => sum + Number(item.amount || 0), 0) || 0;
    const totalReward = rewardData?.reduce((sum: number, item: { reward_amount: string | number }) => sum + Number(item.reward_amount || 0), 0) || 0;

    res.json({
      totalStaked,
      totalUsers: userCount || 0,
      claimedCount: claimedCount || 0,
      totalRewards: totalReward,
    });
  } catch (error: any) {
    console.error('Get stakes stats error:', error);
    res.status(500).json({ error: error.message || '获取质押统计失败' });
  }
});

/**
 * GET /api/v1/stakes/user/:address
 * 获取用户的质押记录
 */
router.get('/user/:address', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { address } = req.params;

    const { data, error } = await supabase
      .from('lp_stakes')
      .select('*')
      .eq('user_address', address.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return res.status(500).json({
          error: `❌ 数据表 'lp_stakes' 不存在！\n\n请先在数据库中执行以下 SQL 创建表：\n\nCREATE TABLE IF NOT EXISTS lp_stakes (\n    id SERIAL PRIMARY KEY,\n    user_address VARCHAR(255) NOT NULL,\n    amount NUMERIC NOT NULL,\n    stake_days INTEGER NOT NULL,\n    start_time TIMESTAMP,\n    end_time TIMESTAMP,\n    reward_amount NUMERIC DEFAULT 0,\n    is_claimed BOOLEAN DEFAULT FALSE,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_user ON lp_stakes(user_address);\nCREATE INDEX IF NOT EXISTS idx_lp_stakes_created ON lp_stakes(created_at DESC);`
        });
      }
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get user stakes error:', error);
    res.status(500).json({ error: error.message || '获取用户质押记录失败' });
  }
});

export default router;
