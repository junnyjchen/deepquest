/**
 * 链上数据同步服务
 * 从区块链同步数据到数据库，保证数据一致性
 * 
 * 使用方式：外部服务器定时调用 /api/v1/dapp/sync 接口
 */

import { getSupabaseClient } from '../storage/database/supabase-client';
import { DQ_CONTRACT_ADDRESS, DQ_ABI } from '../config/contracts';
import { ethers } from 'ethers';

const supabase = getSupabaseClient();

// BSC RPC
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

// 单次同步最大用户数（防止 Gas 限制）
const BATCH_SIZE = 50;

// 记录同步状态
let syncInProgress = false;
let lastSyncTime: Date | null = null;
let lastError: string | null = null;
let lastSyncResult: { totalUsers: number; syncedUsers: number; failedUsers: number } | null = null;

/**
 * 获取合约实例
 */
function getContract() {
  return new ethers.Contract(DQ_CONTRACT_ADDRESS, DQ_ABI, provider);
}

/**
 * 从链上获取所有用户地址
 */
export async function getAllUsersFromChain(): Promise<string[]> {
  const contract = getContract();
  try {
    const totalUsers = await contract.allUsersLength();
    console.log(`[ChainSync] 链上总用户数: ${totalUsers}`);
    
    const users: string[] = [];
    for (let i = 0; i < Number(totalUsers); i++) {
      try {
        const user = await contract.allUsers(i);
        users.push(user);
      } catch (err) {
        console.log(`[ChainSync] 获取用户 ${i} 失败:`, err);
      }
    }
    
    return users;
  } catch (error) {
    console.error('[ChainSync] 获取所有用户失败:', error);
    return [];
  }
}

/**
 * 从链上获取单个用户信息
 */
export async function getChainUserInfo(userAddress: string): Promise<{
  referrer: string;
  directCount: number;
  level: number;
  totalInvest: string;
  teamInvest: string;
  energy: string;
  lpShares: string;
  dLevel: number;
} | null> {
  try {
    const contract = getContract();
    const userInfo = await contract.getUser(userAddress);
    
    return {
      referrer: userInfo[0],
      directCount: Number(userInfo[1]),
      level: Number(userInfo[2]),
      totalInvest: userInfo[3].toString(),
      teamInvest: userInfo[4].toString(),
      energy: userInfo[5].toString(),
      lpShares: userInfo[6].toString(),
      dLevel: Number(userInfo[7]),
    };
  } catch (error) {
    console.error(`[ChainSync] 获取用户 ${userAddress} 信息失败:`, error);
    return null;
  }
}

/**
 * 同步单个用户数据到数据库
 * @param userAddress 用户钱包地址
 * @param userInfo 用户链上信息
 * @param fields 要同步的字段数组，null 或空数组表示全部字段
 */
async function syncUserToDatabase(
  userAddress: string, 
  userInfo: {
    referrer: string;
    directCount: number;
    level: number;
    totalInvest: string;
    teamInvest: string;
    energy: string;
    lpShares: string;
    dLevel: number;
  },
  fields?: string[]
): Promise<boolean> {
  try {
    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address, is_activated')
      .eq('wallet_address', userAddress.toLowerCase())
      .single();

    // 定义可同步的字段映射
    const fieldMap: Record<string, { chainKey: string; dbKey: string }> = {
      direct_count: { chainKey: 'directCount', dbKey: 'direct_count' },
      level: { chainKey: 'level', dbKey: 'level' },
      total_invest: { chainKey: 'totalInvest', dbKey: 'total_invest' },
      team_invest: { chainKey: 'teamInvest', dbKey: 'team_invest' },
      energy: { chainKey: 'energy', dbKey: 'energy' },
      lp_shares: { chainKey: 'lpShares', dbKey: 'lp_shares' },
      d_level: { chainKey: 'dLevel', dbKey: 'd_level' },
      referrer_address: { chainKey: 'referrer', dbKey: 'referrer_address' },
    };

    if (existingUser) {
      // 更新现有用户
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // 根据 fields 参数决定同步哪些字段
      const fieldsToSync = fields && fields.length > 0 ? fields : Object.keys(fieldMap);

      for (const field of fieldsToSync) {
        if (fieldMap[field]) {
          updateData[fieldMap[field].dbKey] = userInfo[fieldMap[field].chainKey as keyof typeof userInfo];
        }
      }

      // 如果推荐人有效，更新推荐人关系
      if (userInfo.referrer && userInfo.referrer !== '0x0000000000000000000000000000000000000000') {
        // 只有在同步 referrer_address 或同步全部字段时才更新推荐人
        if (!fields || fields.length === 0 || fields.includes('referrer_address')) {
          updateData.referrer_address = userInfo.referrer.toLowerCase();
        }
        
        // 如果用户未激活但有推荐人，标记为已激活
        if (!existingUser.is_activated) {
          updateData.is_activated = true;
          updateData.activated_at = new Date().toISOString();
        }
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', userAddress.toLowerCase());

      return true;
    } else {
      // 创建新用户
      const insertData: Record<string, any> = {
        wallet_address: userAddress.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 根据 fields 参数决定同步哪些字段
      const fieldsToSync = fields && fields.length > 0 ? fields : Object.keys(fieldMap);

      for (const field of fieldsToSync) {
        if (fieldMap[field]) {
          insertData[fieldMap[field].dbKey] = userInfo[fieldMap[field].chainKey as keyof typeof userInfo];
        }
      }

      // 如果推荐人有效，添加推荐人关系
      if (userInfo.referrer && userInfo.referrer !== '0x0000000000000000000000000000000000000000') {
        if (!fields || fields.length === 0 || fields.includes('referrer_address')) {
          insertData.referrer_address = userInfo.referrer.toLowerCase();
        }
        insertData.is_activated = true;
        insertData.activated_at = new Date().toISOString();
      }

      await supabase.from('users').insert(insertData);
      return true;
    }
  } catch (error) {
    console.error(`[ChainSync] 同步用户 ${userAddress} 到数据库失败:`, error);
    return false;
  }
}

/**
 * 同步单个用户（供外部调用）
 */
export async function syncSingleUser(userAddress: string): Promise<boolean> {
  const userInfo = await getChainUserInfo(userAddress);
  if (userInfo) {
    return await syncUserToDatabase(userAddress, userInfo);
  }
  return false;
}

/**
 * 执行一次完整同步
 * @param fields 要同步的字段数组，null 或空数组表示全部字段
 */
export async function syncChainData(fields?: string[]): Promise<{
  success: boolean;
  totalUsers: number;
  syncedUsers: number;
  failedUsers: number;
  duration: number;
  error?: string;
}> {
  if (syncInProgress) {
    console.log('[ChainSync] 同步任务正在执行中，跳过本次');
    return {
      success: false,
      totalUsers: 0,
      syncedUsers: 0,
      failedUsers: 0,
      duration: 0,
      error: 'Sync already in progress',
    };
  }

  syncInProgress = true;
  const startTime = Date.now();
  let totalUsers = 0;
  let syncedUsers = 0;
  let failedUsers = 0;

  console.log('[ChainSync] ========== 开始链上数据同步 ==========');

  try {
    // 1. 从链上获取所有用户
    const users = await getAllUsersFromChain();
    totalUsers = users.length;

    if (totalUsers === 0) {
      console.log('[ChainSync] 链上无用户数据');
      lastSyncTime = new Date();
      lastError = null;
      lastSyncResult = { totalUsers: 0, syncedUsers: 0, failedUsers: 0 };
      syncInProgress = false;
      return {
        success: true,
        totalUsers: 0,
        syncedUsers: 0,
        failedUsers: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`[ChainSync] 开始同步 ${totalUsers} 个用户...`);

    // 2. 分批处理用户
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`[ChainSync] 同步批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalUsers / BATCH_SIZE)}`);

      await Promise.all(
        batch.map(async (userAddress) => {
          try {
            const userInfo = await getChainUserInfo(userAddress);
            if (userInfo) {
              const success = await syncUserToDatabase(userAddress, userInfo, fields);
              if (success) {
                syncedUsers++;
              } else {
                failedUsers++;
              }
            } else {
              failedUsers++;
            }
          } catch (error) {
            console.error(`[ChainSync] 处理用户 ${userAddress} 失败:`, error);
            failedUsers++;
          }
        })
      );

      // 批次间隔，避免请求过快
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;
    lastSyncTime = new Date();
    lastError = null;
    lastSyncResult = { totalUsers, syncedUsers, failedUsers };

    console.log(`[ChainSync] ========== 同步完成 ==========`);
    console.log(`[ChainSync] 总用户: ${totalUsers}, 成功: ${syncedUsers}, 失败: ${failedUsers}`);
    console.log(`[ChainSync] 耗时: ${duration}ms`);

    return {
      success: true,
      totalUsers,
      syncedUsers,
      failedUsers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    lastError = error.message;
    lastSyncResult = { totalUsers, syncedUsers, failedUsers };
    console.error('[ChainSync] 同步失败:', error);

    return {
      success: false,
      totalUsers,
      syncedUsers,
      failedUsers,
      duration,
      error: error.message,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * 获取同步状态
 */
export function getSyncStatus(): {
  inProgress: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
  lastResult: { totalUsers: number; syncedUsers: number; failedUsers: number } | null;
} {
  return {
    inProgress: syncInProgress,
    lastSyncTime,
    lastError,
    lastResult: lastSyncResult,
  };
}
