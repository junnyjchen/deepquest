import { Router } from 'express';
import { ethers } from 'ethers';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { getUserInfoFromChain } from '../utils/bsc-web3';

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

    // 计算团队数据（从 team_closure 表查询，与团队页面一致）
    // 获取用户 ID
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

    // 计算团队人数（从 team_closure 表查询，与团队页面一致）
    // 获取用户 ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();
    
    let directCount = 0;
    let teamCount = 0;
    
    if (userData) {
      // 从 team_closure 查询，team_count = depth=1 到 15，direct_count = depth=1
      const { count: directResult } = await supabase
        .from('team_closure')
        .select('*', { count: 'exact', head: true })
        .eq('ancestor_id', userData.id)
        .eq('depth', 1);
      
      const { count: teamResult } = await supabase
        .from('team_closure')
        .select('*', { count: 'exact', head: true })
        .eq('ancestor_id', userData.id)
        .gte('depth', 1)
        .lte('depth', 15);
      
      directCount = directResult || 0;
      teamCount = teamResult || 0;
    }

    res.json({
      code: 0,
      data: {
        wallet_address: user.wallet_address,
        level: user.level || 1,
        is_partner: user.is_partner || false,
        is_activated: user.is_activated || false,
        activation_tx_hash: user.activation_tx_hash || null,
        activated_at: user.activated_at || null,
        total_invest: totalInvest.toFixed(2),
        team_invest: user.team_invest || 0,
        direct_count: directCount,
        team_count: teamCount,
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

// 从链上刷新用户信息并写回后端
// 目的：以链上数据为准，更新 users 表中与链上强相关字段，供 App/管理后台统一使用。
router.post('/profile/:wallet_address/refresh', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const normalized = wallet_address.toLowerCase();

    // 先确认用户存在（避免无意义写入）
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', normalized)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const chainUser = await getUserInfoFromChain(wallet_address);
    if (!chainUser) {
      return res.status(502).json({
        code: 502,
        message: '链上查询失败',
      });
    }

    // 链上返回是字符串（BigInt string），这里做安全转换
    const level = Number(chainUser.level || '0');
    const dLevel = Number(chainUser.dLevel || '0');
    const directCount = Number(chainUser.directCount || '0');
    const validAddressCount = Number(chainUser.validAddressCount || '0');

    const patch: Record<string, any> = {
      referrer_address: String(chainUser.referrer || '').toLowerCase(),
      level,
      d_level: dLevel,
      direct_count: directCount,
      valid_address_count: validAddressCount,
      // users 表字段为 NUMERIC(20,9)，链上返回的是 wei(BigInt string)，这里转换为 18 位精度的十进制字符串存库
      total_invest: Number(ethers.formatEther(chainUser.totalInvest || '0')),
      team_invest: Number(ethers.formatEther(chainUser.teamInvest || '0')),
      energy: Number(ethers.formatEther(chainUser.energy || '0')),
      // 表结构里没有 pendingSOL 字段，这里先映射到 pending_rewards（同样是 NUMERIC），避免数据丢失
      pending_rewards: Number(ethers.formatEther(chainUser.pendingSOL || '0')),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('wallet_address', normalized)
      .select()
      .single();

    if (error) {
      console.error('刷新用户链上信息写库失败:', error);
      return res.status(500).json({
        code: 500,
        message: '刷新用户信息失败',
      });
    }

    return res.json({
      code: 0,
      data,
      message: '刷新成功',
    });
  } catch (error) {
    console.error('刷新用户链上信息失败:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器错误',
    });
  }
});

// 获取用户质押记录
router.get('/stakes/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = Number(page) * Number(limit) - 1;

    let query = supabase
      .from('lp_stakes')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: stakes, count, error } = await query;

    if (error && error.code !== '42P01') {
      return res.status(500).json({
        code: 500,
        message: '查询质押记录失败'
      });
    }

    if (!error && (stakes || []).length > 0) {
      const formattedStakes = (stakes || []).map((stake: any) => ({
        ...stake,
        status: stake.is_claimed ? 'completed' : 'pending',
        tx_hash: stake.tx_hash || '',
      }));

      return res.json({
        code: 0,
        data: {
          list: formattedStakes,
          total: count || 0,
          page: Number(page),
          limit: Number(limit)
        }
      });
    }

    const { data: legacyStakes, count: legacyCount, error: legacyError } = await supabase
      .from('deposits')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range(from, to);

    if (legacyError) {
      return res.status(500).json({
        code: 500,
        message: '查询质押记录失败'
      });
    }

    const formattedStakes = (legacyStakes || []).map((stake: any) => ({
      ...stake,
      stake_days: stake.stake_days || null,
    }));

    res.json({
      code: 0,
      data: {
        list: formattedStakes,
        total: legacyCount || 0,
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

// 获取用户 LP 操作记录
router.get('/lp-records/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = Number(page) * Number(limit) - 1;

    const { data: records, count, error } = await supabase
      .from('lp_action_records')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('action_time', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询 LP 操作记录失败'
      });
    }

    res.json({
      code: 0,
      data: {
        list: records || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取 LP 操作记录失败:', error);
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
