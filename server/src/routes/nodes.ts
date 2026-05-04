import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();
const router = Router();

// 管理员认证中间件
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

// ==================== 节点申请管理 ====================

// 获取节点申请列表
router.get('/applications', verifyAdmin, async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    
    let query = supabase
      .from('node_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
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
    console.error('获取节点申请失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 审核节点申请（通过/拒绝）
router.post('/applications/review', verifyAdmin, async (req: any, res) => {
  try {
    const { id, status, reviewer_notes } = req.body;
    const adminId = req.admin?.id;

    if (!id || !status) {
      return res.status(400).json({
        code: 400,
        message: '请提供申请ID和审核状态'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态必须是 approved 或 rejected'
      });
    }

    // 获取申请信息
    const { data: application, error: fetchError } = await supabase
      .from('node_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({
        code: 404,
        message: '申请记录不存在'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该申请已审核，请勿重复操作'
      });
    }

    // 更新申请状态
    const { error: updateError } = await supabase
      .from('node_applications')
      .update({
        status,
        reviewer_id: adminId,
        reviewer_notes: reviewer_notes || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 如果审核通过，同步到 users 表
    if (status === 'approved') {
      const { wallet_address, referrer_address } = application;

      // 检查用户是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet_address?.toLowerCase())
        .single();

      if (existingUser) {
        // 更新用户
        await supabase
          .from('users')
          .update({
            card_type: application.apply_type === 'node' ? 1 : parseInt(application.apply_type) || 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);
      } else {
        // 创建用户
        await supabase
          .from('users')
          .insert({
            wallet_address: wallet_address?.toLowerCase(),
            referrer_address: referrer_address?.toLowerCase() || null,
            card_type: application.apply_type === 'node' ? 1 : parseInt(application.apply_type) || 1,
            total_invest: application.total_invest || 0,
            team_size: application.team_size || 0,
            created_at: new Date().toISOString()
          });
      }
    }

    // 记录操作日志
    await supabase.from('operation_logs').insert({
      admin_id: adminId,
      action: status === 'approved' ? 'APPROVE_NODE_APPLICATION' : 'REJECT_NODE_APPLICATION',
      target: `node_application:${id}`,
      details: JSON.stringify({
        applicationId: id,
        wallet: application.wallet_address,
        reviewer_notes
      }),
      ip_address: req.ip
    });

    res.json({
      code: 0,
      message: status === 'approved' ? '审核通过' : '审核拒绝'
    });
  } catch (error: any) {
    console.error('审核申请失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// ==================== 节点列表管理 ====================

// 获取节点列表
router.get('/list', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, cardType, wallet } = req.query;

    let query = supabase
      .from('users')
      .select('wallet_address, card_type, total_invest, team_invest, referrer_address, created_at', { count: 'exact' })
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

// ==================== 链上操作 ====================

// 批量添加节点（注册用户 + 绑定推荐关系 + 添加节点）
router.post('/add', verifyAdmin, async (req: any, res) => {
  try {
    const { nodes } = req.body;
    const adminId = req.admin?.id;

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
      const { wallet, cardType, referrer_address } = node;

      if (!wallet || !cardType) {
        results.failed.push({
          wallet,
          reason: '缺少钱包地址或卡牌类型'
        });
        continue;
      }

      try {
        // 1. 检查/创建用户
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, wallet_address, referrer_address')
          .eq('wallet_address', wallet.toLowerCase())
          .single();

        if (existingUser) {
          // 更新用户节点信息
          const { error: updateError } = await supabase
            .from('users')
            .update({
              card_type: cardType,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);

          if (updateError) {
            results.failed.push({ wallet, reason: updateError.message });
            continue;
          }
        } else {
          // 创建用户记录
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              wallet_address: wallet.toLowerCase(),
              card_type: cardType,
              referrer_address: referrer_address?.toLowerCase() || null,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            results.failed.push({ wallet, reason: insertError.message });
            continue;
          }
        }

        results.success.push({ wallet, cardType, referrer_address });

        // 2. 记录操作日志
        await supabase.from('operation_logs').insert({
          admin_id: adminId,
          action: 'ADD_NODE',
          target: wallet,
          details: JSON.stringify({ cardType, referrer_address }),
          ip_address: req.ip
        });
      } catch (err: any) {
        results.failed.push({ wallet, reason: err.message });
      }
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
router.post('/register', verifyAdmin, async (req: any, res) => {
  try {
    const { wallet, referrer_address, user_name, contact_info, apply_reason } = req.body;
    const adminId = req.admin?.id;

    if (!wallet) {
      return res.status(400).json({
        code: 400,
        message: '请提供钱包地址'
      });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address, referrer_address')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (existingUser) {
      // 如果已有推荐人，返回错误
      if (existingUser.referrer_address) {
        return res.status(400).json({
          code: 400,
          message: '用户已有推荐人，无法修改'
        });
      }

      // 更新推荐人
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          referrer_address: referrer_address?.toLowerCase() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) throw updateError;

      // 记录日志
      await supabase.from('operation_logs').insert({
        admin_id: adminId,
        action: 'UPDATE_REFERRER',
        target: wallet,
        details: JSON.stringify({ newReferrer: referrer_address }),
        ip_address: req.ip
      });

      return res.json({
        code: 0,
        message: '推荐人绑定成功',
        data: { wallet, referrer_address }
      });
    }

    // 创建新用户
    const { data, error } = await supabase
      .from('users')
      .insert({
        wallet_address: wallet.toLowerCase(),
        referrer_address: referrer_address?.toLowerCase() || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 如果提供了申请信息，同步创建申请记录
    if (user_name || contact_info || apply_reason) {
      await supabase.from('node_applications').insert({
        wallet_address: wallet.toLowerCase(),
        user_name: user_name || null,
        apply_type: 'node',
        apply_reason: apply_reason || null,
        contact_info: contact_info || null,
        status: 'approved',
        reviewer_id: adminId,
        reviewed_at: new Date().toISOString()
      });
    }

    // 记录日志
    await supabase.from('operation_logs').insert({
      admin_id: adminId,
      action: 'REGISTER_USER',
      target: wallet,
      details: JSON.stringify({ referrer_address, user_name }),
      ip_address: req.ip
    });

    res.json({
      code: 0,
      message: '用户注册成功',
      data: { wallet, referrer_address }
    });
  } catch (error: any) {
    console.error('注册用户失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// ==================== 推荐关系 ====================

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

    // 获取推荐人
    let referrer = null;
    if (user.referrer_address) {
      const { data: referrerData } = await supabase
        .from('users')
        .select('wallet_address, card_type, total_invest')
        .eq('wallet_address', user.referrer_address?.toLowerCase())
        .single();
      referrer = referrerData;
    }

    // 获取直推用户
    const { data: directChildren } = await supabase
      .from('users')
      .select('wallet_address, card_type, total_invest, team_invest, created_at')
      .eq('referrer_address', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    res.json({
      code: 0,
      data: {
        user,
        referrer,
        directChildren: directChildren || [],
        directCount: directChildren?.length || 0
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

// ==================== 统计接口 ====================

// 获取节点统计
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    // 节点总数
    const { count: totalNodes } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('card_type', 'is', null);

    // 待审核申请
    const { count: pendingApplications } = await supabase
      .from('node_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 各类型节点统计
    const { data: cardTypeStats } = await supabase
      .from('users')
      .select('card_type')
      .not('card_type', 'is', null);

    const stats = {
      totalNodes: totalNodes || 0,
      pendingApplications: pendingApplications || 0,
      cardTypeA: cardTypeStats?.filter(u => u.card_type === 1).length || 0,
      cardTypeB: cardTypeStats?.filter(u => u.card_type === 2).length || 0,
      cardTypeC: cardTypeStats?.filter(u => u.card_type === 3).length || 0
    };

    res.json({
      code: 0,
      data: stats
    });
  } catch (error: any) {
    console.error('获取节点统计失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// ==================== CSV 批量导入 ====================

// CSV 批量导入节点
router.post('/csv-import', verifyAdmin, async (req: any, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({
        code: 400,
        message: '请提供有效的 CSV 数据 (数组格式)'
      });
    }

    const results = {
      total: csvData.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`[CSV Import] 开始导入 ${csvData.length} 个节点`);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2; // CSV 行号（从 2 开始，跳过表头）

      try {
        const wallet = (row.wallet_address || row.wallet || '').toLowerCase().trim();
        const parent_address = (row.parent_address || row.referrer_address || row.parent || '').toLowerCase().trim();
        const level = parseInt(row.level || row.card_type || row.cardType || '1');

        if (!wallet) {
          results.failed++;
          results.errors.push(`行 ${rowNum}: 钱包地址不能为空`);
          continue;
        }

        if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
          results.failed++;
          results.errors.push(`行 ${rowNum}: 无效的钱包地址 ${wallet}`);
          continue;
        }

        const card_type = [1, 2, 3].includes(level) ? level : 1;

        // 检查用户是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, wallet_address')
          .eq('wallet_address', wallet)
          .single();

        if (existingUser) {
          // 用户已存在，更新推荐关系和卡牌类型
          const { error: updateError } = await supabase
            .from('users')
            .update({
              referrer_address: parent_address || null,
              card_type: card_type,
              updated_at: new Date().toISOString()
            })
            .eq('wallet_address', wallet);

          if (updateError) {
            throw new Error(`更新用户失败: ${updateError.message}`);
          }

          console.log(`[CSV Import] 更新用户: ${wallet}, card_type: ${card_type}, parent: ${parent_address || '无'}`);
        } else {
          // 用户不存在，创建新用户
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              wallet_address: wallet,
              referrer_address: parent_address || null,
              card_type: card_type,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error(`创建用户失败: ${insertError.message}`);
          }

          console.log(`[CSV Import] 创建用户: ${wallet}, card_type: ${card_type}, parent: ${parent_address || '无'}`);
        }

        results.success++;

      } catch (rowError: any) {
        results.failed++;
        results.errors.push(`行 ${rowNum}: ${rowError.message}`);
      }
    }

    // 记录操作日志
    await supabase
      .from('operation_logs')
      .insert({
        admin_id: req.admin.id,
        admin_address: req.admin.username,
        action: 'csv_import_nodes',
        target: `批量导入 ${csvData.length} 个节点`,
        details: JSON.stringify({
          success: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 10) // 只记录前 10 个错误
        }),
        ip_address: req.ip
      });

    console.log(`[CSV Import] 完成: 成功 ${results.success}, 失败 ${results.failed}`);

    res.json({
      code: 0,
      message: `导入完成: 成功 ${results.success}, 失败 ${results.failed}`,
      data: results
    });

  } catch (error: any) {
    console.error('CSV 导入失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// CSV 模板下载
router.get('/csv-template', verifyAdmin, (req, res) => {
  const template = `wallet_address,parent_address,level
0x1234567890123456789012345678901234567890,0xabcdef1234567890abcdef1234567890abcdef12,1
0xabcdef1234567890abcdef1234567890abcdef12,,1
0x9876543210987654321098765432109876543210,0x1234567890123456789012345678901234567890,2`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=nodes_template.csv');
  res.send(template);
});

export default router;
