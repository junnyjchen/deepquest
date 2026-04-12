import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

/**
 * DAPP前端API - 平台数据
 * 用于DAPP首页展示全局统计数据
 */

// 获取平台全局统计数据
router.get('/stats', async (req, res) => {
  try {
    // 从数据库获取真实数据
    const [usersResult, depositsResult, poolsResult, rewardsResult] = await Promise.all([
      supabase.from('users').select('count', { count: 'exact' }),
      supabase.from('deposits').select('amount').eq('status', 'completed'),
      supabase.from('pools').select('name, balance'),
      supabase.from('rewards').select('amount').eq('status', 'completed'),
    ]);

    // 计算统计数据
    const totalUsers = usersResult.count || 0;
    const totalDeposit = depositsResult.data?.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0) || 0;
    
    // 获取底池数据
    const pools = poolsResult.data || [];
    const usdtPool = pools.find((p: { name?: string }) => p.name === 'usdt') || { balance: '0' };
    const dqtPool = pools.find((p: { name?: string }) => p.name === 'dqt') || { balance: '0' };

    // 计算今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayDeposits = depositsResult.data?.filter((d: { created_at?: string; amount?: string }) => {
      const depositDate = new Date(d.created_at || '');
      return depositDate >= new Date(todayStart);
    }) || [];
    const todayDeposit = todayDeposits.reduce((sum: number, d: { amount?: string }) => sum + parseFloat(d.amount || '0'), 0);

    // 模拟一些动态数据
    const stats = {
      // 平台数据
      totalSupply: '330,000,000',      // 总供应量 DQT
      totalBurned: '140,480,617',      // 总销毁数
      todayDeposit: todayDeposit.toFixed(2),  // 今日入单 BNB
      networkPower: '63,497,422',      // 全网算力 T/H
      
      // 底池数据
      usdtPoolBalance: parseFloat(usdtPool.balance || '0').toFixed(2),
      dqtPoolBalance: parseFloat(dqtPool.balance || '0').toFixed(2),
      
      // 全网数据
      totalUsers: totalUsers,
      totalDeposit: totalDeposit.toFixed(2),
      totalReward: rewardsResult.data?.reduce((sum: number, r: { amount?: string }) => sum + parseFloat(r.amount || '0'), 0) || 0,
      
      // K线数据
      chartData: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        values: [0.012, 0.015, 0.014, 0.018, 0.022, 0.025]
      }
    };

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    console.error('获取平台统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 质押操作 - 创建质押记录
router.post('/stake', async (req, res) => {
  try {
    const { wallet_address, amount, tx_hash } = req.body;

    if (!wallet_address || !amount || !tx_hash) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 验证用户是否存在
    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address, is_partner, level')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在，请先注册'
      });
    }

    // 创建质押记录
    const { data: deposit, error: insertError } = await supabase
      .from('deposits')
      .insert({
        user_address: wallet_address.toLowerCase(),
        amount: amount,
        tx_hash: tx_hash,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        code: 500,
        message: '创建质押记录失败'
      });
    }

    res.json({
      code: 0,
      data: deposit,
      message: '质押提交成功'
    });
  } catch (error) {
    console.error('质押操作失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取质押奖励
router.post('/claim-reward', async (req, res) => {
  try {
    const { wallet_address, reward_type } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 验证用户
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

    // 查询可领取的奖励
    const { data: rewards, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'pending')
      .eq('reward_type', reward_type || 'deposit');

    if (rewardError) {
      return res.status(500).json({
        code: 500,
        message: '查询奖励失败'
      });
    }

    const totalReward = rewards?.reduce((sum: number, r: { amount?: string }) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 更新奖励状态为已领取
    if (rewards && rewards.length > 0) {
      const rewardIds = rewards.map((r: { id?: number }) => r.id);
      await supabase
        .from('rewards')
        .update({ status: 'claimed' })
        .in('id', rewardIds);
    }

    res.json({
      code: 0,
      data: {
        claimed: totalReward,
        count: rewards?.length || 0
      },
      message: '奖励领取成功'
    });
  } catch (error) {
    console.error('领取奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户推广信息
router.get('/referral/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 查询用户
    const { data: user, error } = await supabase
      .from('users')
      .select('referrer_address')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 查询推荐人的信息
    const { data: referrer } = await supabase
      .from('users')
      .select('wallet_address, level')
      .eq('wallet_address', user.referrer_address?.toLowerCase())
      .single();

    res.json({
      code: 0,
      data: {
        referrer_address: user.referrer_address,
        referrer_level: referrer?.level || 0
      }
    });
  } catch (error) {
    console.error('获取推广信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

export default router;
