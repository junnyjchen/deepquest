import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

/**
 * DAPP前端API - 团队数据
 * 从 team_closure 表查询团队关系数据
 */

// 获取用户团队统计数据
router.get('/stats/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取用户ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const userId = user.id;

    // 从 team_closure 统计团队总人数（depth=1 到 15）
    const { count: teamCount } = await supabase
      .from('team_closure')
      .select('*', { count: 'exact', head: true })
      .eq('ancestor_id', userId)
      .gte('depth', 1)
      .lte('depth', 15);

    // 从 team_closure 统计直接下级人数（depth=1）
    const { count: directCount } = await supabase
      .from('team_closure')
      .select('*', { count: 'exact', head: true })
      .eq('ancestor_id', userId)
      .eq('depth', 1);

    res.json({
      code: 0,
      data: {
        team_count: teamCount || 0,
        direct_count: directCount || 0
      }
    });
  } catch (error) {
    console.error('获取团队统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取团队所有成员列表（不含自己，depth=1 到 15）
router.get('/direct/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { depth = 15, page = 1, limit = 20 } = req.query;

    // 获取用户ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const userId = user.id;
    const maxDepth = Math.min(Number(depth), 15);
    const offset = (Number(page) - 1) * Number(limit);

    // 从 team_closure 查询所有后代（不含自己，depth=1 到 maxDepth）
    const { data: closures, count, error } = await supabase
      .from('team_closure')
      .select('depth, descendant_id', { count: 'exact' })
      .eq('ancestor_id', userId)
      .gte('depth', 1)
      .lte('depth', maxDepth)
      .order('depth', { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询团队列表失败'
      });
    }

    // 获取后代用户的详细信息
    const descendantIds = closures?.map(c => c.descendant_id) || [];
    let members: any[] = [];

    if (descendantIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, wallet_address, level, total_invest, team_invest, direct_count, is_activated, activated_at, created_at')
        .in('id', descendantIds);

      members = users || [];

      // 构建 depth 和用户信息的映射
      const depthMap = new Map(closures?.map(c => [c.descendant_id, c.depth]) || []);
      members = members.map(u => ({
        depth: depthMap.get(u.id) || 1,
        wallet_address: u.wallet_address,
        level: u.level,
        total_invest: u.total_invest,
        team_invest: u.team_invest,
        direct_count: u.direct_count,
        is_activated: u.is_activated,
        activated_at: u.activated_at,
        created_at: u.created_at
      }));
    }

    res.json({
      code: 0,
      data: {
        list: members,
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取团队列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

export default router;
