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

// 注册/绑定推荐关系
router.post('/bind-referrer', async (req, res) => {
  try {
    const { wallet_address, referrer_address, tx_hash } = req.body;

    if (!wallet_address || !referrer_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：wallet_address 和 referrer_address'
      });
    }

    // 验证钱包地址格式
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(wallet_address) || !addressRegex.test(referrer_address)) {
      return res.status(400).json({
        code: 400,
        message: '无效的钱包地址格式'
      });
    }

    // 不能自己推荐自己
    if (wallet_address.toLowerCase() === referrer_address.toLowerCase()) {
      return res.status(400).json({
        code: 400,
        message: '不能绑定自己为推荐人'
      });
    }

    const walletLower = wallet_address.toLowerCase();
    const referrerLower = referrer_address.toLowerCase();

    // 查询推荐人是否存在
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', referrerLower)
      .single();

    if (referrerError || !referrer) {
      return res.status(404).json({
        code: 404,
        message: '推荐人不存在'
      });
    }

    // 查询用户是否存在
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_address')
      .eq('wallet_address', walletLower)
      .single();

    if (existingUser) {
      // 用户已存在，检查是否已有推荐人
      if (existingUser.referrer_address) {
        return res.status(400).json({
          code: 400,
          message: '您已经有推荐人了，无法重复绑定'
        });
      }
      
      // 更新推荐关系
      const { error: updateError } = await supabase
        .from('users')
        .update({ referrer_address: referrerLower })
        .eq('wallet_address', walletLower);

      if (updateError) {
        return res.status(500).json({
          code: 500,
          message: '绑定推荐人失败'
        });
      }

      return res.json({
        code: 0,
        message: '绑定推荐人成功',
        data: {
          wallet_address: walletLower,
          referrer_address: referrerLower
        }
      });
    }

    // 创建新用户并绑定推荐人
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletLower,
        referrer_address: referrerLower,
        level: 1,
        is_partner: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('创建用户失败:', insertError);
      return res.status(500).json({
        code: 500,
        message: '注册用户失败'
      });
    }

    res.json({
      code: 0,
      message: '注册并绑定推荐人成功',
      data: {
        wallet_address: walletLower,
        referrer_address: referrerLower
      }
    });
  } catch (error) {
    console.error('绑定推荐人失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 验证推荐人地址
router.get('/validate-referrer/:referrer_address', async (req, res) => {
  try {
    const { referrer_address } = req.params;

    if (!referrer_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少推荐人地址'
      });
    }

    // 验证地址格式
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(referrer_address)) {
      return res.status(400).json({
        code: 400,
        message: '无效的钱包地址格式'
      });
    }

    // 查询推荐人
    const { data: referrer, error } = await supabase
      .from('users')
      .select('wallet_address, level, created_at')
      .eq('wallet_address', referrer_address.toLowerCase())
      .single();

    if (error || !referrer) {
      return res.status(404).json({
        code: 404,
        message: '推荐人不存在',
        valid: false
      });
    }

    res.json({
      code: 0,
      valid: true,
      data: {
        wallet_address: referrer.wallet_address,
        level: referrer.level,
        created_at: referrer.created_at
      }
    });
  } catch (error) {
    console.error('验证推荐人失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 检查用户是否已绑定推荐人
router.get('/check-binding/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address, referrer_address')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (error || !user) {
      return res.json({
        code: 0,
        bound: false,
        has_referrer: false
      });
    }

    res.json({
      code: 0,
      bound: !!user.referrer_address,
      has_referrer: !!user.referrer_address,
      referrer_address: user.referrer_address
    });
  } catch (error) {
    console.error('检查绑定状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取NFT卡牌配置
router.get('/card-config', async (req, res) => {
  try {
    // 从配置表获取卡牌配置
    const { data: config, error } = await supabase
      .from('configs')
      .select('config_key, config_value')
      .eq('config_key', 'card_config')
      .single();

    if (error || !config) {
      // 返回默认配置
      return res.json({
        code: 0,
        data: {
          A: { price: '500', total: 1000, remaining: 1000, reward_rate: 4, name: 'S1节点卡', level: 'S1', fee_rate: 10 },
          B: { price: '1500', total: 500, remaining: 500, reward_rate: 5, name: 'S2节点卡', level: 'S2', fee_rate: 15 },
          C: { price: '5000', total: 100, remaining: 100, reward_rate: 6, name: 'S3节点卡', level: 'S3', fee_rate: 15 },
        }
      });
    }

    res.json({
      code: 0,
      data: config.config_value
    });
  } catch (error) {
    console.error('获取卡牌配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 购买NFT卡牌
router.post('/buy-card', async (req, res) => {
  try {
    const { wallet_address, card_type, tx_hash, amount = 1 } = req.body;

    if (!wallet_address || !card_type || !tx_hash) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：wallet_address, card_type, tx_hash'
      });
    }

    // 获取卡牌配置
    const { data: config, error: configError } = await supabase
      .from('configs')
      .select('config_value')
      .eq('config_key', 'card_config')
      .single();

    const cardConfig = config?.config_value || {
      A: { price: '500', total: 1000, remaining: 1000, reward_rate: 4, name: 'S1节点卡', level: 'S1', fee_rate: 10 },
      B: { price: '1500', total: 500, remaining: 500, reward_rate: 5, name: 'S2节点卡', level: 'S2', fee_rate: 15 },
      C: { price: '5000', total: 100, remaining: 100, reward_rate: 6, name: 'S3节点卡', level: 'S3', fee_rate: 15 },
    };

    const card = cardConfig[card_type.toUpperCase()];
    if (!card) {
      return res.status(400).json({
        code: 400,
        message: '无效的卡牌类型'
      });
    }

    // 检查剩余数量
    if (card.remaining < amount) {
      return res.status(400).json({
        code: 400,
        message: `卡牌库存不足，剩余 ${card.remaining} 张`
      });
    }

    // 检查用户是否已购买过此类型卡牌
    const { data: existingCard } = await supabase
      .from('nft_cards')
      .select('id')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('card_type', card_type.toUpperCase())
      .single();

    if (existingCard) {
      return res.status(400).json({
        code: 400,
        message: '您已购买过此类型卡牌，每人每类型限购买1张'
      });
    }

    // 创建购买记录
    const { data: purchase, error: insertError } = await supabase
      .from('nft_cards')
      .insert({
        user_address: wallet_address.toLowerCase(),
        card_type: card_type.toUpperCase(),
        card_level: card.level,
        price: card.price,
        reward_rate: card.reward_rate,
        fee_rate: card.fee_rate,
        tx_hash: tx_hash,
        status: 'active',
        purchased_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('购买卡牌失败:', insertError);
      return res.status(500).json({
        code: 500,
        message: '购买卡牌失败'
      });
    }

    // 更新用户等级
    const userLevelMap: Record<string, number> = { 'S1': 1, 'S2': 2, 'S3': 3 };
    const newLevel = userLevelMap[card.level] || 1;

    await supabase
      .from('users')
      .update({ 
        node_level: card.level,
        level: newLevel > 0 ? newLevel : undefined
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    res.json({
      code: 0,
      message: '购买成功',
      data: {
        card_id: purchase.id,
        card_type: card_type.toUpperCase(),
        card_level: card.level,
        reward_rate: card.reward_rate,
        price: card.price
      }
    });
  } catch (error) {
    console.error('购买卡牌失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户的NFT卡牌
router.get('/my-cards/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const { data: cards, error } = await supabase
      .from('nft_cards')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .order('purchased_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询失败'
      });
    }

    res.json({
      code: 0,
      data: cards || []
    });
  } catch (error) {
    console.error('获取NFT卡牌失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取卡牌收益记录
router.get('/card-rewards/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { data: rewards, count, error } = await supabase
      .from('card_rewards')
      .select('*', { count: 'exact' })
      .eq('user_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        code: 500,
        message: '查询失败'
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
    console.error('获取卡牌收益失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取卡牌统计
router.get('/card-stats/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取用户卡牌
    const { data: cards } = await supabase
      .from('nft_cards')
      .select('card_type, reward_rate, price')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'active');

    // 计算总投入
    const totalInvest = cards?.reduce((sum: number, card: any) => sum + parseFloat(card.price || '0'), 0) || 0;

    // 获取累计收益
    const { data: rewards } = await supabase
      .from('card_rewards')
      .select('amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'claimed');

    const totalReward = rewards?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 获取待领取收益
    const { data: pendingRewards } = await supabase
      .from('card_rewards')
      .select('amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'pending');

    const pendingReward = pendingRewards?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;

    res.json({
      code: 0,
      data: {
        cards: cards || [],
        cardCount: cards?.length || 0,
        totalInvest: totalInvest.toFixed(2),
        totalReward: totalReward.toFixed(2),
        pendingReward: pendingReward.toFixed(2)
      }
    });
  } catch (error) {
    console.error('获取卡牌统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

export default router;
