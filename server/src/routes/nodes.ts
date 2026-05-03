import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

// 简单的管理员认证中间件
async function verifyAdmin(req: any, res: any, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ code: 401, message: '未授权' });
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id, username')
      .eq('id', parseInt(token))
      .single();

    if (!admin) {
      return res.status(401).json({ code: 401, message: '管理员不存在' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ code: 401, message: '认证失败' });
  }
}

/**
 * 节点管理API - 链上操作
 */

// 获取节点申请列表（待审核）
router.get('/applications', verifyAdmin, async (req: any, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('node_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      code: 0,
      data: data || [],
      total: count || 0
    });
  } catch (error: any) {
    console.error('获取节点申请失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 获取节点列表
router.get('/list', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, cardType, wallet } = req.query;

    let query = supabase
      .from('users')
      .select('wallet_address, card_type, card_level, total_invest, team_invest, created_at')
      .not('card_type', 'is', null)
      .order('created_at', { ascending: false });

    if (cardType) {
      query = query.eq('card_type', cardType);
    }

    if (wallet) {
      query = query.ilike('wallet_address', `%${wallet}%`);
    }

    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      code: 0,
      data: data || [],
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error: any) {
    console.error('获取节点列表失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 批量添加节点（模拟链上操作）
router.post('/add', verifyAdmin, async (req, res) => {
  try {
    const { nodes } = req.body;
    const adminId = (req as any).admin?.id;

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供节点列表'
      });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[]
    };

    // 模拟逐个添加节点
    for (const node of nodes) {
      const { wallet, cardType, referrer } = node;

      if (!wallet || !cardType) {
        results.failed.push({
          wallet,
          reason: '缺少钱包地址或卡牌类型'
        });
        continue;
      }

      // 检查用户是否存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, wallet_address')
        .eq('wallet_address', wallet.toLowerCase())
        .single();

      if (!existingUser) {
        // 创建用户记录
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            wallet_address: wallet.toLowerCase(),
            card_type: cardType,
            referrer: referrer || null,
            status: 'active'
          });

        if (insertError) {
          results.failed.push({ wallet, reason: insertError.message });
        } else {
          results.success.push({ wallet, cardType, referrer });
        }
      } else {
        // 更新用户节点信息
        const { error: updateError } = await supabase
          .from('users')
          .update({
            card_type: cardType,
            card_level: cardType
          })
          .eq('id', existingUser.id);

        if (updateError) {
          results.failed.push({ wallet, reason: updateError.message });
        } else {
          results.success.push({ wallet, cardType, referrer, updated: true });
        }
      }

      // 记录操作日志
      await supabase.from('operation_logs').insert({
        admin_id: adminId,
        action: 'ADD_NODE',
        target: wallet,
        details: JSON.stringify({ cardType, referrer }),
        ip_address: req.ip
      });
    }

    res.json({
      code: 0,
      message: `成功添加 ${results.success.length} 个节点，失败 ${results.failed.length} 个`,
      data: results
    });
  } catch (error: any) {
    console.error('添加节点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 注册用户并绑定推荐关系
router.post('/register', verifyAdmin, async (req, res) => {
  try {
    const { wallet, referrer } = req.body;
    const adminId = (req as any).admin?.id;

    if (!wallet) {
      return res.status(400).json({
        code: 400,
        message: '请提供钱包地址'
      });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address, referrer')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (existingUser) {
      // 如果已有推荐人，返回错误
      if (existingUser.referrer) {
        return res.status(400).json({
          code: 400,
          message: '用户已有推荐人，无法修改'
        });
      }

      // 更新推荐人
      const { error: updateError } = await supabase
        .from('users')
        .update({ referrer: referrer?.toLowerCase() || null })
        .eq('id', existingUser.id);

      if (updateError) throw updateError;

      // 记录日志
      await supabase.from('operation_logs').insert({
        admin_id: adminId,
        action: 'UPDATE_REFERRER',
        target: wallet,
        details: JSON.stringify({ oldReferrer: null, newReferrer: referrer }),
        ip_address: req.ip
      });

      return res.json({
        code: 0,
        message: '推荐人绑定成功',
        data: { wallet, referrer }
      });
    }

    // 创建新用户
    const { data, error } = await supabase
      .from('users')
      .insert({
        wallet_address: wallet.toLowerCase(),
        referrer: referrer?.toLowerCase() || null,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // 记录日志
    await supabase.from('operation_logs').insert({
      admin_id: adminId,
      action: 'REGISTER_USER',
      target: wallet,
      details: JSON.stringify({ referrer }),
      ip_address: req.ip
    });

    res.json({
      code: 0,
      message: '用户注册成功',
      data: { wallet, referrer }
    });
  } catch (error: any) {
    console.error('注册用户失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 获取推荐关系树
router.get('/referral-tree', verifyAdmin, async (req: any, res) => {
  try {
    const wallet = req.query.wallet as string;

    if (!wallet) {
      return res.status(400).json({
        code: 400,
        message: '请提供钱包地址'
      });
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取直接推荐人
    const { data: referrer } = await supabase
      .from('users')
      .select('wallet_address, card_type')
      .eq('wallet_address', user.referrer?.toLowerCase())
      .single();

    // 获取直推用户
    const { data: directChildren } = await supabase
      .from('users')
      .select('wallet_address, card_type, total_invest, created_at')
      .eq('referrer', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    res.json({
      code: 0,
      data: {
        user,
        referrer,
        directChildren: directChildren || []
      }
    });
  } catch (error: any) {
    console.error('获取推荐树失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 批量注册用户并添加节点（完整流程）
router.post('/batch-init', verifyAdmin, async (req, res) => {
  try {
    const { nodes } = req.body;
    const adminId = (req as any).admin?.id;

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供节点列表'
      });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[]
    };

    for (const node of nodes) {
      const { wallet, cardType, referrer } = node;

      if (!wallet || !cardType) {
        results.failed.push({ wallet, reason: '缺少必要参数' });
        continue;
      }

      try {
        // 1. 创建或更新用户
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', wallet.toLowerCase())
          .single();

        if (existingUser) {
          // 更新用户
          await supabase
            .from('users')
            .update({
              card_type: cardType,
              card_level: cardType,
              referrer: referrer?.toLowerCase() || (existingUser as any).referrer
            })
            .eq('id', existingUser.id);
        } else {
          // 创建用户
          await supabase
            .from('users')
            .insert({
              wallet_address: wallet.toLowerCase(),
              card_type: cardType,
              card_level: cardType,
              referrer: referrer?.toLowerCase() || null,
              status: 'active'
            });
        }

        results.success.push({ wallet, cardType, referrer });

        // 记录日志
        await supabase.from('operation_logs').insert({
          admin_id: adminId,
          action: 'BATCH_INIT_NODE',
          target: wallet,
          details: JSON.stringify({ cardType, referrer }),
          ip_address: req.ip
        });
      } catch (err: any) {
        results.failed.push({ wallet, reason: err.message });
      }
    }

    res.json({
      code: 0,
      message: `成功 ${results.success.length} 个，失败 ${results.failed.length} 个`,
      data: results
    });
  } catch (error: any) {
    console.error('批量初始化节点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

export default router;
