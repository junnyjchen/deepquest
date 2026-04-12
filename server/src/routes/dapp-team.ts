import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

/**
 * DAPP前端API - 团队数据
 * 用于DAPP团队页面展示团队相关数据
 */

// 获取用户团队统计数据
router.get('/stats/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取用户基本信息
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 直接推荐人数
    const { data: directMembers, count: directCount } = await supabase
      .from('users')
      .select('wallet_address, level, total_invest, team_invest, created_at', { count: 'exact' })
      .eq('referrer_address', wallet_address.toLowerCase());

    // 获取所有下线钱包地址
    const { data: allTeamMembers } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('referrer_address', wallet_address.toLowerCase());

    const teamWalletAddresses = allTeamMembers?.map((m: { wallet_address: string }) => m.wallet_address) || [];

    // 计算团队总业绩
    let teamDeposit = 0;
    if (teamWalletAddresses.length > 0) {
      const { data: teamDeposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'completed')
        .in('user_address', teamWalletAddresses);

      teamDeposit = teamDeposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;
    }

    // 计算各级别下线投资额
    const memberStats: { level: number; count: number; invest: number }[] = [];
    if (directMembers && directMembers.length > 0) {
      for (const member of directMembers) {
        // 获取该直接成员的所有下线
        const { data: subMembers } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('referrer_address', member.wallet_address.toLowerCase());

        const subWallets = subMembers?.map((m: { wallet_address: string }) => m.wallet_address) || [];

        let memberInvest = 0;
        if (subWallets.length > 0) {
          const { data: memberDeposits } = await supabase
            .from('deposits')
            .select('amount')
            .eq('status', 'completed')
            .in('user_address', subWallets);

          memberInvest = memberDeposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;
        }

        const existingLevel = memberStats.find((s) => s.level === (member.level || 1));
        if (existingLevel) {
          existingLevel.count += 1;
          existingLevel.invest += memberInvest;
        } else {
          memberStats.push({
            level: member.level || 1,
            count: 1,
            invest: memberInvest
          });
        }
      }
    }

    // 获取我的推广奖励
    const { data: myRewards } = await supabase
      .from('rewards')
      .select('amount, reward_type')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'claimed');

    const referralRewards = myRewards?.reduce((sum: number, r: { amount?: string }) => sum + parseFloat(r.amount || '0'), 0) || 0;

    res.json({
      code: 0,
      data: {
        direct_count: directCount || 0,
        team_count: teamWalletAddresses.length,
        team_invest: teamDeposit.toFixed(2),
        referral_rewards: referralRewards.toFixed(2),
        level_stats: memberStats.sort((a, b) => a.level - b.level)
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

// 获取直接推荐列表
router.get('/direct/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { data: members, count, error } = await supabase
      .from('users')
      .select('wallet_address, level, total_invest, created_at', { count: 'exact' })
      .eq('referrer_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询推荐列表失败'
      });
    }

    // 获取每个成员的投资额
    if (members && members.length > 0) {
      for (const member of members) {
        const { data: deposits } = await supabase
          .from('deposits')
          .select('amount')
          .eq('user_address', member.wallet_address.toLowerCase())
          .eq('status', 'completed');

        member.total_invest = deposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;
      }
    }

    res.json({
      code: 0,
      data: {
        list: members || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取推荐列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取团队排行榜
router.get('/ranking/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { type = 'direct', limit = 10 } = req.query;

    // 统计各级别人数
    const { count: directCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_address', wallet_address.toLowerCase());

    // 获取所有直接推荐人
    const { data: directMembers } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('referrer_address', wallet_address.toLowerCase());

    // 递归获取所有下线（简化版，只统计一级）
    const levelCounts: { level: number; count: number }[] = [];
    
    if (directMembers && directMembers.length > 0) {
      for (const m of directMembers) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_address', m.wallet_address.toLowerCase());

        const existingLevel = levelCounts.find((l) => l.level === 2);
        if (existingLevel) {
          existingLevel.count += count || 0;
        } else {
          levelCounts.push({ level: 2, count: count || 0 });
        }
      }
    }

    res.json({
      code: 0,
      data: {
        direct_count: directCount || 0,
        level_counts: levelCounts.sort((a, b) => a.level - b.level)
      }
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取下线投资详情
router.get('/downline/:wallet_address/:downline_address', async (req: any, res: any) => {
  try {
    const { wallet_address, downline_address } = req.params;

    // 获取下线信息
    const { data: member, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', downline_address.toLowerCase())
      .single();

    if (error || !member) {
      return res.status(404).json({
        code: 404,
        message: '下线用户不存在'
      });
    }

    // 获取该下线的所有下线
    const { count: subCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_address', downline_address.toLowerCase());

    // 获取下线投资额
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_address', downline_address.toLowerCase())
      .eq('status', 'completed');

    const totalInvest = deposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;

    res.json({
      code: 0,
      data: {
        wallet_address: member.wallet_address,
        level: member.level || 1,
        total_invest: totalInvest.toFixed(2),
        team_invest: member.team_invest || 0,
        team_count: subCount || 0,
        created_at: member.created_at
      }
    });
  } catch (error) {
    console.error('获取下线详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取团队业绩趋势（按月）
router.get('/trend/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取所有直接推荐人
    const { data: directMembers } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('referrer_address', wallet_address.toLowerCase());

    const teamWallets = directMembers?.map((m: { wallet_address: string }) => m.wallet_address) || [];

    // 统计近6个月的趋势
    const now = new Date();
    const trend: { month: string; invest: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${targetDate.getMonth() + 1}月`;

      // 筛选该月的数据
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      let monthInvest = 0;
      if (teamWallets.length > 0) {
        const { data: monthDeposits } = await supabase
          .from('deposits')
          .select('amount')
          .eq('status', 'completed')
          .in('user_address', teamWallets)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        monthInvest = monthDeposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;
      }

      trend.push({
        month: monthLabel,
        invest: monthInvest
      });
    }

    res.json({
      code: 0,
      data: trend
    });
  } catch (error) {
    console.error('获取团队趋势失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

export default router;
