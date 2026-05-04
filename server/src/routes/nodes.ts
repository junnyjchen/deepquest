import { Router } from 'express';
import { ethers } from 'ethers';
import { supabase, verifyAdmin, verifyAdminToken } from '../middleware/index.js';
import { getDecryptedFactoryKey } from '../utils/crypto.js';
import {
  DQ_CONTRACT_ADDRESS,
  DQ_ABI,
  DQCARD_CONTRACT_ADDRESS,
  DQCARD_ABI,
} from '../config/contracts.js';

const router = Router();

// ==================== 合约调用函数 ====================

/**
 * 在 BSC 链上注册用户
 */
async function registerUserOnChain(walletAddress: string, referrerAddress: string | null) {
  try {
    const rpcUrl = process.env.BSC_RPC_URL;
    let factoryPK = process.env.FACTORY_PRIVATE_KEY;
    
    // 尝试解密加密的私钥
    if (!factoryPK && process.env.ENCRYPTED_FACTORY_KEY) {
      factoryPK = getDecryptedFactoryKey();
    }
    
    if (!factoryPK || !rpcUrl) {
      return { success: false, error: '未配置链上调用参数' };
    }

    console.log(`[Chain] 调用 register: wallet=${walletAddress}, referrer=${referrerAddress || '无'}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(factoryPK, provider);
    const contract = new ethers.Contract(DQ_CONTRACT_ADDRESS, DQ_ABI, wallet);

    const referrer = referrerAddress || ethers.ZeroAddress;
    const tx = await contract.register(referrer);
    const receipt = await tx.wait();

    console.log(`[Chain] ✓ 注册成功, tx=${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    console.error(`[Chain] ✗ 注册失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 在 BSC 链上铸造用户 Card NFT（设置等级）
 */
async function setUserLevelOnChain(walletAddress: string, cardType: number) {
  try {
    const rpcUrl = process.env.BSC_RPC_URL;
    let factoryPK = process.env.FACTORY_PRIVATE_KEY;
    
    // 尝试解密加密的私钥
    if (!factoryPK && process.env.ENCRYPTED_FACTORY_KEY) {
      factoryPK = getDecryptedFactoryKey();
    }
    
    if (!factoryPK || !rpcUrl) {
      return { success: false, error: '未配置链上调用参数' };
    }

    console.log(`[Chain] 调用 mintByOwner: wallet=${walletAddress}, cardType=${cardType}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(factoryPK, provider);
    const cardContract = new ethers.Contract(DQCARD_CONTRACT_ADDRESS, DQCARD_ABI, wallet);

    const tx = await cardContract.mintByOwner(walletAddress, cardType);
    const receipt = await tx.wait();

    console.log(`[Chain] ✓ 铸造NFT成功, tx=${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    console.error(`[Chain] ✗ 铸造NFT失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== 验证中间件 ====================

// ==================== 用户管理 ====================

// 创建用户
router.post('/register', verifyAdmin, async (req: any, res) => {
  try {
    const { wallet, referrer_address } = req.body;

    if (!wallet) {
      return res.status(400).json({ code: 400, message: '钱包地址不能为空' });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (existingUser) {
      // 更新推荐关系
      if (referrer_address) {
        await supabase
          .from('users')
          .update({ referrer_address: referrer_address.toLowerCase() })
          .eq('wallet_address', wallet.toLowerCase());
      }
      return res.json({ code: 0, message: '用户已存在，已更新推荐关系' });
    }

    // 创建新用户
    const { error } = await supabase
      .from('users')
      .insert({
        wallet_address: wallet.toLowerCase(),
        referrer_address: referrer_address ? referrer_address.toLowerCase() : null,
        status: 'active'
      });

    if (error) throw error;

    res.json({ code: 0, message: '用户创建成功' });
  } catch (error: any) {
    console.error('创建用户失败:', error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ==================== 节点等级管理 ====================

// 设置用户节点等级
router.post('/set-level', verifyAdmin, async (req: any, res) => {
  try {
    const { wallet, card_type } = req.body;

    if (!wallet || !card_type) {
      return res.status(400).json({ code: 400, message: '钱包地址和卡牌类型不能为空' });
    }

    const type = parseInt(card_type);
    if (![1, 2, 3].includes(type)) {
      return res.status(400).json({ code: 400, message: '卡牌类型必须是 1(A)、2(B) 或 3(C)' });
    }

    // 查找用户
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (!existingUser) {
      return res.status(404).json({ code: 404, message: '用户不存在，请先创建用户' });
    }

    // 更新卡牌类型
    const { error } = await supabase
      .from('users')
      .update({ card_type: type })
      .eq('wallet_address', wallet.toLowerCase());

    if (error) throw error;

    res.json({ code: 0, message: `用户 ${wallet} 节点等级已更新为 ${type}` });
  } catch (error: any) {
    console.error('设置节点等级失败:', error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ==================== CSV 批量导入 ====================

// CSV 批量创建用户、绑定关系和节点等级（一步到位）
router.post('/register-csv', verifyAdmin, async (req: any, res) => {
  try {
    const { csvData } = req.body;
    
    // 记录请求日志
    console.log(`[CSV Register] ========== 新请求 ==========`);
    console.log(`[CSV Register] 请求来源: ${req.ip}`);
    console.log(`[CSV Register] 数据条数: ${csvData?.length || 0}`);
    console.log(`[CSV Register] 数据内容:`, JSON.stringify(csvData, null, 2));

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
      created: 0,
      updated: 0,
      withLevel: 0,
      withoutLevel: 0,
      errors: [] as string[]
    };

    console.log(`[CSV Register] 开始导入 ${csvData.length} 个用户`);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2;

      try {
        const wallet = (row.wallet_address || row.wallet || '').toLowerCase().trim();
        const parent_address = (row.parent_address || row.referrer_address || row.parent || '').toLowerCase().trim();
        // 支持多种节点等级字段名
        const levelValue = row.level || row.card_type || row.cardType || row.cardtype || '';
        const level = levelValue ? parseInt(levelValue) : null;
        const hasLevel = level !== null && [1, 2, 3].includes(level);

        if (!wallet) {
          results.failed++;
          results.errors.push(`行 ${rowNum}: 钱包地址不能为空`);
          continue;
        }

        if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
          results.failed++;
          results.errors.push(`行 ${rowNum}: 无效的钱包地址 ${wallet}`);
          console.log(`[CSV Register] ❌ 行 ${rowNum}: 无效的钱包地址 ${wallet}`);
          continue;
        }

        // 验证节点等级有效性（如果有）
        if (hasLevel && ![1, 2, 3].includes(level)) {
          results.failed++;
          results.errors.push(`行 ${rowNum}: 无效的节点等级 ${levelValue}，必须为 1(A)、2(B) 或 3(C)`);
          console.log(`[CSV Register] ❌ 行 ${rowNum}: 无效的节点等级 ${levelValue}`);
          continue;
        }

        // 构建更新数据
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (parent_address) {
          updateData.referrer_address = parent_address;
        }
        
        if (hasLevel) {
          updateData.card_type = level;
        }

        console.log(`[CSV Register] → 处理: wallet=${wallet}, parent=${parent_address || '无'}, level=${hasLevel ? level : '无'}`);

        // 检查用户是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, wallet_address, card_type, referrer_address')
          .eq('wallet_address', wallet)
          .single();

        if (existingUser) {
          // 更新现有用户
          const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('wallet_address', wallet);

          if (updateError) throw new Error(`更新失败: ${updateError.message}`);
          results.updated++;
          console.log(`[CSV Register] ✓ 更新成功: ${wallet}, parent: ${parent_address || '无'}, level: ${hasLevel ? level : '无'}`);
        } else {
          // 创建新用户
          const insertData: any = {
            wallet_address: wallet,
            referrer_address: parent_address || null
          };
          
          if (hasLevel) {
            insertData.card_type = level;
          }

          const { error: insertError } = await supabase
            .from('users')
            .insert(insertData);

          if (insertError) throw new Error(`创建失败: ${insertError.message}`);
          results.created++;
          console.log(`[CSV Register] ✓ 创建成功: ${wallet}, parent: ${parent_address || '无'}, level: ${hasLevel ? level : '无'}`);
        }

        // 链上注册
        let chainResult: any = { success: true };
        try {
          // 先调用链上注册
          chainResult = await registerUserOnChain(wallet, parent_address || null);
          
          // 如果有节点等级，再调用链上设置等级
          if (hasLevel && chainResult.success) {
            const levelResult = await setUserLevelOnChain(wallet, level!);
            chainResult.levelTxHash = levelResult.txHash;
            if (!levelResult.success) {
              chainResult.error = `注册成功但设置等级失败: ${levelResult.error}`;
            }
          }
        } catch (chainError: any) {
          chainResult = { success: false, error: chainError.message };
          console.log(`[Chain] ✗ 链上操作失败: ${chainError.message}`);
        }

        // 统计等级情况
        if (hasLevel) {
          results.withLevel++;
        } else {
          results.withoutLevel++;
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
        admin_id: req.admin?.id,
        admin_address: req.admin?.username,
        action: 'csv_register_users',
        target: `批量导入 ${csvData.length} 个用户`,
        details: JSON.stringify({
          total: results.total,
          success: results.success,
          created: results.created,
          updated: results.updated,
          withLevel: results.withLevel,
          withoutLevel: results.withoutLevel,
          errors: results.errors.slice(0, 10)
        }),
        ip_address: req.ip
      });

    console.log(`[CSV Register] 完成: 成功 ${results.success}/${results.total}, 新建 ${results.created}, 更新 ${results.updated}, 带等级 ${results.withLevel}, 无等级 ${results.withoutLevel}`);

    res.json({
      code: 0,
      message: `完成: 成功 ${results.success}/${results.total}`,
      data: results
    });

  } catch (error: any) {
    console.error('CSV 导入用户失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// CSV 批量设置节点等级
router.post('/set-level-csv', verifyAdmin, async (req: any, res) => {
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
      notFound: 0,
      errors: [] as string[]
    };

    console.log(`[CSV Set Level] 开始设置 ${csvData.length} 个节点等级`);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2;

      try {
        const wallet = (row.wallet_address || row.wallet || '').toLowerCase().trim();
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

        // 查找用户
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, wallet_address')
          .eq('wallet_address', wallet)
          .single();

        if (!existingUser) {
          results.notFound++;
          results.errors.push(`行 ${rowNum}: 用户不存在 ${wallet}`);
          continue;
        }

        // 更新卡牌类型
        const { error: updateError } = await supabase
          .from('users')
          .update({
            card_type: card_type,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', wallet);

        if (updateError) throw new Error(`更新失败: ${updateError.message}`);

        console.log(`[CSV Set Level] 设置用户: ${wallet}, level: ${card_type}`);
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
        action: 'csv_set_level',
        target: `批量设置 ${csvData.length} 个节点等级`,
        details: JSON.stringify({
          success: results.success,
          failed: results.failed,
          notFound: results.notFound,
          errors: results.errors.slice(0, 10)
        }),
        ip_address: req.ip
      });

    console.log(`[CSV Set Level] 完成: 成功 ${results.success}, 不存在 ${results.notFound}, 失败 ${results.failed}`);

    res.json({
      code: 0,
      message: `完成: 成功 ${results.success}, 用户不存在 ${results.notFound}, 失败 ${results.failed}`,
      data: results
    });

  } catch (error: any) {
    console.error('CSV 设置节点等级失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
});

// 获取用户列表
router.get('/users', verifyAdmin, async (req: any, res) => {
  try {
    const { page = 1, pageSize = 20, search = '' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize as string) - 1);

    if (search) {
      query = query.or(`wallet_address.ilike.%${search}%,user_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      code: 0,
      data: {
        list: data,
        total: count || 0,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// CSV 模板下载
router.get('/csv-template/:type', verifyAdmin, (req, res) => {
  const { type } = req.params;

  if (type === 'register') {
    // 创建用户模板
    const template = `wallet_address,parent_address
0x1234567890123456789012345678901234567890,0xabcdef1234567890abcdef1234567890abcdef12
0xabcdef1234567890abcdef1234567890abcdef12,
0x9876543210987654321098765432109876543210,0x1234567890123456789012345678901234567890`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user_register_template.csv');
    res.send(template);
  } else if (type === 'level') {
    // 设置等级模板
    const template = `wallet_address,level
0x1234567890123456789012345678901234567890,1
0xabcdef1234567890abcdef1234567890abcdef12,2
0x9876543210987654321098765432109876543210,3`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=set_level_template.csv');
    res.send(template);
  } else {
    res.status(400).json({ code: 400, message: '无效的模板类型' });
  }
});

export default router;
