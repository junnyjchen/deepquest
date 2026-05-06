import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { getUserRegisterTxHash, isUserRegisteredOnChain, getUserInfoFromChain } from '../utils/bsc-web3';

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

// ============ 节点达标信息 API ============

// 获取节点达标信息
router.get('/node-info/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取用户的NFT卡牌
    const { data: cards } = await supabase
      .from('nft_cards')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'active');

    // 获取累计卡牌收益
    const { data: cardRewards } = await supabase
      .from('card_rewards')
      .select('amount, status')
      .eq('user_address', wallet_address.toLowerCase());

    const claimedRewards = cardRewards?.filter(r => r.status === 'claimed')
      .reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const pendingRewards = cardRewards?.filter(r => r.status === 'pending')
      .reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 卡牌达标配置
    const cardLinesConfig: Record<number, { name: string; required: number; weight: number }> = {
      1: { name: 'S1', required: 5, weight: 4 },  // A级卡：5条线
      2: { name: 'S2', required: 10, weight: 5 }, // B级卡：10条线
      3: { name: 'S3', required: 20, weight: 6 }, // C级卡：20条线
    };

    // 计算每个卡牌的达标情况
    const cardInfos = (cards || []).map((card: any) => {
      const config = cardLinesConfig[card.card_type_num || 1] || cardLinesConfig[1];
      const qualified = (user.qualified_lines || 0) >= config.required;
      return {
        cardType: card.card_type_num || 1,
        cardName: config.name + ' 节点卡',
        qualifiedLines: user.qualified_lines || 0,
        requiredLines: config.required,
        isQualified: qualified,
        rewardWeight: config.weight,
        cardCount: 1,
      };
    });

    // 计算最高卡牌类型
    const highestType = cardInfos.length > 0 
      ? Math.max(...cardInfos.map(c => c.cardType))
      : 0;

    // 判断是否达标（取最高卡牌的要求）
    const requiredLines = highestType > 0 && cardLinesConfig[highestType] 
      ? cardLinesConfig[highestType].required 
      : 0;
    const isQualified = (user.qualified_lines || 0) >= requiredLines;

    res.json({
      code: 0,
      data: {
        cardCount: cards?.length || 0,
        highestType,
        qualifiedLines: user.qualified_lines || 0,
        requiredLines,
        isQualified,
        cards: cardInfos,
        pendingNft: pendingRewards.toFixed(2),
        totalNftReward: claimedRewards.toFixed(2),
      }
    });
  } catch (error) {
    console.error('获取节点信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取用户完整信息
router.get('/user-info/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取用户基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取各项待领取奖励
    const [lpRewards, nftRewards, teamRewards, directRewards] = await Promise.all([
      supabase.from('rewards').select('amount').eq('user_address', wallet_address.toLowerCase())
        .eq('reward_type', 'lp').eq('status', 'pending'),
      supabase.from('rewards').select('amount').eq('user_address', wallet_address.toLowerCase())
        .eq('reward_type', 'nft').eq('status', 'pending'),
      supabase.from('rewards').select('amount').eq('user_address', wallet_address.toLowerCase())
        .eq('reward_type', 'team').eq('status', 'pending'),
      supabase.from('rewards').select('amount').eq('user_address', wallet_address.toLowerCase())
        .eq('reward_type', 'direct').eq('status', 'pending'),
    ]);

    const pendingLp = lpRewards.data?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const pendingNft = nftRewards.data?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const pendingTeam = teamRewards.data?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const pendingDirect = directRewards.data?.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0) || 0;

    res.json({
      code: 0,
      data: {
        wallet_address: user.wallet_address,
        referrer_address: user.referrer_address,
        is_registered: true,
        is_activated: user.is_activated || false,
        activation_tx_hash: user.activation_tx_hash || null,
        activated_at: user.activated_at || null,
        is_node: !!user.level && user.level > 0,
        level: user.level || 0,
        total_invest: user.total_invest || '0',
        team_invest: user.team_invest || '0',
        direct_count: user.direct_count || 0,
        energy: user.energy || '0',
        qualified_lines: user.qualified_lines || 0,
        is_node_qualified: user.is_node_qualified || false,
        is_partner: user.is_partner || false,
        pendingLp: pendingLp.toFixed(2),
        pendingNft: pendingNft.toFixed(2),
        pendingTeam: pendingTeam.toFixed(2),
        pendingDirect: pendingDirect.toFixed(2),
        totalPending: (pendingLp + pendingNft + pendingTeam + pendingDirect).toFixed(2),
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

// 获取入金限制信息
router.get('/invest-limit/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    // 获取配置
    const { data: configs } = await supabase
      .from('configs')
      .select('config_key, config_value')
      .in('config_key', ['invest_min', 'invest_max_initial', 'invest_max_final', 'phase_duration_days']);

    const configMap: Record<string, string> = {};
    (configs || []).forEach((c: any) => {
      configMap[c.config_key] = c.config_value;
    });

    // 获取用户已投资金额
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'completed');

    const totalInvested = deposits?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0) || 0;

    // 获取当前最大投资额（根据时间计算）
    const minInvest = parseFloat(configMap['invest_min'] || '1');
    const maxInitial = parseFloat(configMap['invest_max_initial'] || '10');
    const maxFinal = parseFloat(configMap['invest_max_final'] || '200');
    const phaseDays = parseInt(configMap['phase_duration_days'] || '15');

    // 计算当前阶段
    const startDate = new Date('2025-01-01'); // 项目启动日期
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentPhase = Math.floor(daysSinceStart / phaseDays);
    const currentMax = Math.min(maxInitial + (currentPhase * 10), maxFinal);

    res.json({
      code: 0,
      data: {
        min_invest: minInvest.toString(),
        max_invest: currentMax.toString(),
        total_invested: totalInvested.toFixed(2),
        remaining_invest: Math.max(0, currentMax - totalInvested).toFixed(2),
        can_invest: totalInvested < currentMax,
      }
    });
  } catch (error) {
    console.error('获取入金限制失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 检查注册状态
router.get('/check-registered/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address, level, referrer_address')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (error || !user) {
      return res.json({
        code: 0,
        data: {
          is_registered: false,
          is_node: false,
          has_referrer: false,
        }
      });
    }

    res.json({
      code: 0,
      data: {
        is_registered: true,
        is_node: user.level > 0,
        level: user.level,
        has_referrer: !!user.referrer_address,
        referrer_address: user.referrer_address,
      }
    });
  } catch (error) {
    console.error('检查注册状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 注册（首次入金）
router.post('/register', async (req, res) => {
  try {
    const { wallet_address, referrer_address, tx_hash } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：wallet_address'
      });
    }

    // 检查用户是否已存在
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('wallet_address, is_activated, activation_tx_hash')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (existing) {
      // 用户已存在，检查是否需要激活
      if (!existing.is_activated || !existing.activation_tx_hash) {
        // 用户存在但未激活，尝试从链上查询注册交易
        console.log(`[DApp] 用户 ${wallet_address} 存在但未激活，尝试从链上查询注册交易...`);
        
        // 从链上查询注册交易 hash
        const chainTxHash = await getUserRegisterTxHash(wallet_address);
        
        if (chainTxHash) {
          // 找到了链上注册交易，更新用户状态
          const { error: updateError } = await supabase
            .from('users')
            .update({
              is_activated: true,
              activation_tx_hash: chainTxHash,
              activated_at: new Date().toISOString()
            })
            .eq('wallet_address', wallet_address.toLowerCase());

          if (updateError) {
            console.error('[DApp] 更新激活状态失败:', updateError);
          } else {
            console.log(`[DApp] 用户 ${wallet_address} 激活成功，tx: ${chainTxHash}`);
            return res.json({
              code: 0,
              message: '用户已激活',
              data: { 
                wallet_address: existing.wallet_address,
                is_activated: true,
                activation_tx_hash: chainTxHash
              }
            });
          }
        } else {
          console.log(`[DApp] 未找到用户 ${wallet_address} 的链上注册交易`);
        }
      }
      
      return res.json({
        code: 0,
        message: '用户已注册',
        data: { 
          wallet_address: existing.wallet_address,
          is_activated: existing.is_activated,
          activation_tx_hash: existing.activation_tx_hash
        }
      });
    }

    // 如果有推荐人，验证推荐人是否存在
    let validReferrer = null;
    if (referrer_address) {
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('wallet_address', referrer_address.toLowerCase())
        .single();

      if (!referrerError && referrer) {
        validReferrer = referrer_address.toLowerCase();
      }
    }

    // 创建新用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        wallet_address: wallet_address.toLowerCase(),
        referrer_address: validReferrer || null,
        direct_count: 0,
        level: 0,
        total_invest: '0',
        team_invest: '0',
        energy: '0',
        lp_shares: '0',
        is_partner: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('注册失败:', insertError);
      return res.status(500).json({
        code: 500,
        message: '注册失败'
      });
    }

    // 如果有有效推荐人，增加推荐人的直推数量
    if (validReferrer) {
      await supabase.rpc('increment_direct_count', {
        user_address: validReferrer
      });
    }

    res.json({
      code: 0,
      message: '注册成功',
      data: {
        wallet_address: newUser.wallet_address,
        referrer_address: newUser.referrer_address,
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 激活用户 - 前端激活成功后调用此接口
router.post('/activate', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：wallet_address'
      });
    }

    console.log(`[DApp] 激活用户: ${wallet_address}`);

    // 检查用户是否存在
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('wallet_address, is_activated')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在，请先注册'
      });
    }

    // 如果已经激活，直接返回
    if (existing.is_activated) {
      // 从链上再次查询确认
      const chainTxHash = await getUserRegisterTxHash(wallet_address);
      return res.json({
        code: 0,
        message: '用户已激活',
        data: { 
          wallet_address: existing.wallet_address,
          is_activated: true,
          activation_tx_hash: chainTxHash || existing.activation_tx_hash
        }
      });
    }

    // 从链上查询注册交易 hash
    const chainTxHash = await getUserRegisterTxHash(wallet_address);
    
    if (!chainTxHash) {
      return res.status(400).json({
        code: 400,
        message: '未找到链上注册交易，请确认已完成链上激活'
      });
    }

    // 更新用户激活状态
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_activated: true,
        activation_tx_hash: chainTxHash,
        activated_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    if (updateError) {
      console.error('[DApp] 更新激活状态失败:', updateError);
      return res.status(500).json({
        code: 500,
        message: '激活状态更新失败'
      });
    }

    console.log(`[DApp] 用户 ${wallet_address} 激活成功，tx: ${chainTxHash}`);

    res.json({
      code: 0,
      message: '激活成功',
      data: {
        wallet_address: wallet_address,
        is_activated: true,
        activation_tx_hash: chainTxHash
      }
    });
  } catch (error) {
    console.error('激活失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 绑定/更新推荐人关系
router.put('/referrer', async (req, res) => {
  try {
    const { wallet_address, referrer_address } = req.body;

    if (!wallet_address || !referrer_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 验证推荐人地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(referrer_address)) {
      return res.status(400).json({
        code: 400,
        message: '推荐人地址格式不正确'
      });
    }

    // 不能绑定自己
    if (wallet_address.toLowerCase() === referrer_address.toLowerCase()) {
      return res.status(400).json({
        code: 400,
        message: '不能绑定自己为推荐人'
      });
    }

    // 查询用户是否存在
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在，请先注册'
      });
    }

    // 更新推荐人关系
    const { error: updateError } = await supabase
      .from('users')
      .update({
        referrer_address: referrer_address.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    if (updateError) {
      console.error('[DApp] 更新推荐人失败:', updateError);
      return res.status(500).json({
        code: 500,
        message: '绑定推荐人失败'
      });
    }

    res.json({
      code: 0,
      message: '绑定推荐人成功',
      data: {
        wallet_address: wallet_address.toLowerCase(),
        referrer_address: referrer_address.toLowerCase()
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

// 入金
router.post('/deposit', async (req, res) => {
  try {
    const { wallet_address, amount, tx_hash } = req.body;

    if (!wallet_address || !amount || !tx_hash) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在，请先注册'
      });
    }

    // 首次入金检查（首次入金必须是节点）
    const { data: existingDeposits } = await supabase
      .from('deposits')
      .select('id')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'completed');

    if ((existingDeposits?.length || 0) === 0 && (!user.level || user.level === 0)) {
      return res.status(400).json({
        code: 400,
        message: '首次入金必须是节点用户，请先购买节点'
      });
    }

    // 创建入金记录
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_address: wallet_address.toLowerCase(),
        amount: amount,
        tx_hash: tx_hash,
        status: 'completed',
        deposited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (depositError) {
      console.error('入金失败:', depositError);
      return res.status(500).json({
        code: 500,
        message: '入金失败'
      });
    }

    // 更新用户入金总额
    const newTotalInvest = parseFloat(user.total_invest || '0') + parseFloat(amount);
    await supabase
      .from('users')
      .update({ 
        total_invest: newTotalInvest.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    res.json({
      code: 0,
      message: '入金成功',
      data: {
        deposit_id: deposit.id,
        amount: amount,
        total_invest: newTotalInvest.toFixed(2),
      }
    });
  } catch (error) {
    console.error('入金失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取待领取奖励
router.get('/pending-rewards/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;

    const { data: rewards } = await supabase
      .from('rewards')
      .select('reward_type, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'pending');

    const rewardsByType: Record<string, number> = {};
    (rewards || []).forEach((r: any) => {
      const type = r.reward_type || 'other';
      rewardsByType[type] = (rewardsByType[type] || 0) + parseFloat(r.amount || '0');
    });

    res.json({
      code: 0,
      data: {
        lp: rewardsByType['lp']?.toFixed(2) || '0.00',
        nft: rewardsByType['nft']?.toFixed(2) || '0.00',
        team: rewardsByType['team']?.toFixed(2) || '0.00',
        direct: rewardsByType['direct']?.toFixed(2) || '0.00',
        management: rewardsByType['management']?.toFixed(2) || '0.00',
        total: Object.values(rewardsByType).reduce((a, b) => a + b, 0).toFixed(2),
      }
    });
  } catch (error) {
    console.error('获取待领取奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取LP分红
router.post('/claim-lp', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 检查地址限制
    const { data: restriction } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'restricted')
      .single();

    if (restriction) {
      return res.status(400).json({
        code: 400,
        message: '地址已被限制，无法领取奖励'
      });
    }

    // 获取待领取LP奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('id, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'lp')
      .eq('status', 'pending');

    if (!pendingRewards || pendingRewards.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有可领取的LP奖励'
      });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    // 更新奖励状态
    await supabase
      .from('rewards')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'lp')
      .eq('status', 'pending');

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        amount: totalAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('领取LP奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取NFT分红
router.post('/claim-nft', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 检查节点达标状态
    const { data: user } = await supabase
      .from('users')
      .select('is_node_qualified, qualified_lines, highest_card_type')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user?.is_node_qualified) {
      return res.status(400).json({
        code: 400,
        message: '节点未达标，无法领取NFT分红'
      });
    }

    // 检查地址限制
    const { data: restriction } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'restricted')
      .single();

    if (restriction) {
      return res.status(400).json({
        code: 400,
        message: '地址已被限制，无法领取奖励'
      });
    }

    // 获取待领取NFT奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('id, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'nft')
      .eq('status', 'pending');

    if (!pendingRewards || pendingRewards.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有可领取的NFT分红'
      });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    // 更新奖励状态
    await supabase
      .from('rewards')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'nft')
      .eq('status', 'pending');

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        amount: totalAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('领取NFT分红失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取团队奖励
router.post('/claim-dteam', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 检查能量值
    const { data: user } = await supabase
      .from('users')
      .select('energy')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (user && parseFloat(user.energy || '0') <= 0) {
      return res.status(400).json({
        code: 400,
        message: '能量值不足，无法领取团队奖励'
      });
    }

    // 检查地址限制
    const { data: restriction } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'restricted')
      .single();

    if (restriction) {
      return res.status(400).json({
        code: 400,
        message: '地址已被限制，无法领取奖励'
      });
    }

    // 获取待领取团队奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('id, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'team')
      .eq('status', 'pending');

    if (!pendingRewards || pendingRewards.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有可领取的团队奖励'
      });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    // 更新奖励状态
    await supabase
      .from('rewards')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'team')
      .eq('status', 'pending');

    // 扣除能量值
    await supabase
      .from('users')
      .update({ 
        energy: '0', // 清零，实际应按奖励金额扣除
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        amount: totalAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('领取团队奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取合伙人DQ奖励
router.post('/claim-partner-dq', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 检查是否为合伙人
    const { data: user } = await supabase
      .from('users')
      .select('is_partner')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user?.is_partner) {
      return res.status(400).json({
        code: 400,
        message: '您不是合伙人，无法领取DQ奖励'
      });
    }

    // 检查地址限制
    const { data: restriction } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'restricted')
      .single();

    if (restriction) {
      return res.status(400).json({
        code: 400,
        message: '地址已被限制，无法领取奖励'
      });
    }

    // 获取待领取DQ奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('id, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'partner_dq')
      .eq('status', 'pending');

    if (!pendingRewards || pendingRewards.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有可领取的DQ奖励'
      });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    // 更新奖励状态
    await supabase
      .from('rewards')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'partner_dq')
      .eq('status', 'pending');

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        amount: totalAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('领取合伙人DQ奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 领取合伙人SOL奖励
router.post('/claim-partner-sol', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        code: 400,
        message: '缺少钱包地址'
      });
    }

    // 检查是否为合伙人
    const { data: user } = await supabase
      .from('users')
      .select('is_partner')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!user?.is_partner) {
      return res.status(400).json({
        code: 400,
        message: '您不是合伙人，无法领取SOL奖励'
      });
    }

    // 检查地址限制
    const { data: restriction } = await supabase
      .from('address_restrictions')
      .select('*')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('status', 'restricted')
      .single();

    if (restriction) {
      return res.status(400).json({
        code: 400,
        message: '地址已被限制，无法领取奖励'
      });
    }

    // 获取待领取SOL奖励
    const { data: pendingRewards } = await supabase
      .from('rewards')
      .select('id, amount')
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'partner_sol')
      .eq('status', 'pending');

    if (!pendingRewards || pendingRewards.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有可领取的SOL奖励'
      });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    // 更新奖励状态
    await supabase
      .from('rewards')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('user_address', wallet_address.toLowerCase())
      .eq('reward_type', 'partner_sol')
      .eq('status', 'pending');

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        amount: totalAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('领取合伙人SOL奖励失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 获取兑换报价
router.get('/swap-quote', async (req, res) => {
  try {
    const { dq_amount } = req.query;

    if (!dq_amount) {
      return res.status(400).json({
        code: 400,
        message: '缺少DQ数量'
      });
    }

    // 获取DQ价格配置
    const { data: config } = await supabase
      .from('configs')
      .select('config_value')
      .eq('config_key', 'dq_price')
      .single();

    const dqPrice = parseFloat(config?.config_value || '0.0001');
    const dqAmount = parseFloat(dq_amount as string);
    const usdtAmount = dqAmount * dqPrice;

    // 计算手续费
    const feeRate = 0.06; // 6%
    const fee = usdtAmount * feeRate;
    const netAmount = usdtAmount - fee;

    res.json({
      code: 0,
      data: {
        dq_amount: dqAmount.toFixed(2),
        dq_price: dqPrice.toFixed(6),
        usdt_amount: usdtAmount.toFixed(2),
        fee: fee.toFixed(2),
        fee_rate: '6%',
        net_amount: netAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('获取兑换报价失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

// 执行DQ兑换
router.post('/swap-dq', async (req, res) => {
  try {
    const { wallet_address, dq_amount, tx_hash } = req.body;

    if (!wallet_address || !dq_amount || !tx_hash) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 获取DQ价格配置
    const { data: config } = await supabase
      .from('configs')
      .select('config_value')
      .eq('config_key', 'dq_price')
      .single();

    const dqPrice = parseFloat(config?.config_value || '0.0001');
    const dqAmount = parseFloat(dq_amount);
    const usdtAmount = dqAmount * dqPrice;
    const fee = usdtAmount * 0.06;
    const netAmount = usdtAmount - fee;

    // 创建兑换记录
    const { data: swap, error: swapError } = await supabase
      .from('dq_swaps')
      .insert({
        user_address: wallet_address.toLowerCase(),
        dq_amount: dq_amount,
        usdt_amount: netAmount.toString(),
        fee: fee.toString(),
        tx_hash: tx_hash,
        status: 'completed',
        swapped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (swapError) {
      console.error('兑换失败:', swapError);
      return res.status(500).json({
        code: 500,
        message: '兑换失败'
      });
    }

    res.json({
      code: 0,
      message: '兑换成功',
      data: {
        swap_id: swap.id,
        dq_amount: dq_amount,
        usdt_amount: netAmount.toFixed(2),
      }
    });
  } catch (error) {
    console.error('兑换失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

/**
 * 手动触发链上数据同步
 * POST /api/v1/dapp/sync
 */
router.post('/sync', async (req, res) => {
  try {
    // 动态导入避免循环依赖
    const { syncChainData, getSyncStatus, startSyncTask, stopSyncTask } = await import('../utils/sync-chain-service');
    
    // 启动定时任务
    startSyncTask();
    
    // 立即执行一次同步
    const result = await syncChainData();
    
    res.json({
      code: 0,
      message: '同步完成',
      data: result
    });
  } catch (error: any) {
    console.error('同步失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '同步失败'
    });
  }
});

/**
 * 获取同步状态
 * GET /api/v1/dapp/sync/status
 */
router.get('/sync/status', async (req, res) => {
  try {
    const { getSyncStatus } = await import('../utils/sync-chain-service');
    const status = getSyncStatus();
    
    res.json({
      code: 0,
      data: status
    });
  } catch (error: any) {
    console.error('获取同步状态失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '获取状态失败'
    });
  }
});

export default router;
