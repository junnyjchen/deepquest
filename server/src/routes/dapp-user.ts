import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

/**
 * DAPP前端API - 用户数据
 * 用于DAPP个人中心展示用户相关数据
 */

// 获取用户基本信息
router.get('/profile/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 计算团队数据
    const { count: directCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_address', wallet_address.toLowerCase());

    // 计算个人投资额
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount, created_at')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'completed');

    const totalInvest = deposits?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;

    // 计算累计奖励
    const { data: rewards } = await supabase
      .from('rewards')
      .select('amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'claimed');

    const totalReward = rewards?.reduce((sum: number, r: { amount?: string }) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 计算待领取奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'pending');

    const pendingReward = pendingRewards?.reduce((sum: number, r: { amount?: string }) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 计算团队人数
    const { data: teamMembers } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('referrer_address', wallet_address.toLowerCase());

    res.json({
      code: 0,
      data: {
        wallet_address: user.wallet_address,
        level: user.level || 1,
        is_partner: user.is_partner || false,
        total_invest: totalInvest.toFixed(2),
        team_invest: user.team_invest || 0,
        direct_count: directCount || 0,
        team_count: teamMembers?.length || 0,
        total_reward: totalReward.toFixed(2),
        pending_reward: pendingReward.toFixed(2),
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户质押记录
router.get('/stakes/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('deposits')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    const { data: stakes, count, error } = await query;

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询质押记录失败'
      });
    }

    res.json({
      code: 0,
      data: {
        list: stakes || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取质押记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户奖励记录
router.get('/rewards/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 10, reward_type } = req.query;

    let query = supabase
      .from('rewards')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (reward_type) {
      query = query.eq('reward_type', reward_type as string);
    }

    const { data: rewards, count, error } = await query;

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询奖励记录失败'
      });
    }

    res.json({
      code: 0,
      data: {
        list: rewards || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取奖励记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户提现记录
router.get('/withdrawals/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const { data: withdrawals, count, error } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询提现记录失败'
      });
    }

    res.json({
      code: 0,
      data: {
        list: withdrawals || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取提现记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 更新用户信息
router.put('/profile/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { nickname, avatar_url } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        nickname,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet_address.toLowerCase())
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '更新用户信息失败'
      });
    }

    res.json({
      code: 0,
      data,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 提现申请
router.post('/withdraw', async (req, res) => {
  try {
    const { wallet_address, amount, tx_hash } = req.body;

    if (!wallet_address || !amount) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 创建提现记录
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_address: wallet_address.toLowerCase(),
        amount: amount,
        tx_hash: tx_hash,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '创建提现记录失败'
      });
    }

    res.json({
      code: 0,
      data: withdrawal,
      message: '提现申请已提交'
    });
  } catch (error) {
    console.error('提现申请失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

export default router;
