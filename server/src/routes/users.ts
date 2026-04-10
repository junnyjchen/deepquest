import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

/**
 * 区块链DAPP标准：模拟从链上同步用户数据
 * 在真实的DAPP中，这会调用合约的 getUserInfo 或类似方法来获取链上数据
 * 这里我们提供两种同步方式：
 * 1. 同步单个用户（通过钱包地址）
 * 2. 批量同步（从链上事件中获取）
 */
export async function syncUserFromChain(walletAddress: string) {
  // 模拟从区块链合约获取用户数据
  // 在真实场景中，这里会调用合约方法
  // const chainUser = await contract.getUserInfo(walletAddress);
  
  // 模拟链上数据
  const chainUser = {
    wallet_address: walletAddress,
    // 其他字段将在真实场景中从链上获取
    // 如：level, total_invest, team_invest, referrer_address 等
  };
  
  // 检查用户是否已存在
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  
  if (checkError) {
    throw new Error(`检查用户失败: ${checkError.message}`);
  }
  
  // 如果用户不存在，创建新用户
  if (!existingUser) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        // 初始值，将在后续交易中更新
        direct_count: 0,
        level: 0,
        total_invest: '0',
        team_invest: '0',
        energy: '0',
        lp_shares: '0',
        pending_rewards: '0',
        direct_sales: '0',
        d_level: 0,
        is_partner: false,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`同步用户失败: ${error.message}`);
    }
    
    return { ...data, isNew: true };
  }
  
  return { ...existingUser, isNew: false };
}

// 批量同步链上用户（用于初始化或批量导入）
export async function batchSyncUsers(walletAddresses: string[]) {
  const results = [];
  
  for (const address of walletAddresses) {
    try {
      const result = await syncUserFromChain(address);
      results.push(result);
    } catch (error) {
      console.error(`同步用户 ${address} 失败:`, error);
      results.push({ wallet_address: address, error: (error as Error).message });
    }
  }
  
  return results;
}

// 获取用户列表（支持分页和搜索）
export async function getUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  level?: number;
  isPartner?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { page = 1, pageSize = 20, search, level, isPartner, sortBy = 'created_at', sortOrder = 'desc' } = params;
  
  let query = supabase
    .from('users')
    .select('*', { count: 'exact' });
  
  // 搜索钱包地址
  if (search) {
    query = query.ilike('wallet_address', `%${search}%`);
  }
  
  // 筛选等级
  if (level !== undefined && level !== null) {
    query = query.eq('level', level);
  }
  
  // 筛选合伙人
  if (isPartner !== undefined && isPartner !== null) {
    query = query.eq('is_partner', isPartner);
  }
  
  // 排序
  query = query.order(sortBy as any, { ascending: sortOrder === 'asc' });
  
  // 分页
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  if (error) throw new Error(`获取用户列表失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// 获取单个用户详情
export async function getUserByAddress(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  
  if (error) throw new Error(`获取用户详情失败: ${error.message}`);
  if (!data) throw new Error('用户不存在');
  
  return data;
}

// 获取用户入金记录
export async function getUserDeposits(walletAddress: string, page: number = 1, pageSize: number = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('deposits')
    .select('*', { count: 'exact' })
    .eq('user_address', walletAddress)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw new Error(`获取入金记录失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取用户奖励记录
export async function getUserRewards(walletAddress: string, params: {
  page?: number;
  pageSize?: number;
  rewardType?: string;
}) {
  const { page = 1, pageSize = 20, rewardType } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('rewards')
    .select('*', { count: 'exact' })
    .eq('user_address', walletAddress);
  
  if (rewardType) {
    query = query.eq('reward_type', rewardType);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw new Error(`获取奖励记录失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取用户提现记录
export async function getUserWithdrawals(walletAddress: string, page: number = 1, pageSize: number = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('withdrawals')
    .select('*', { count: 'exact' })
    .eq('user_address', walletAddress)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw new Error(`获取提现记录失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取用户团队（直接推荐）
export async function getUserTeam(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('wallet_address, level, total_invest, team_invest, direct_count, is_partner, created_at')
    .eq('referrer_address', walletAddress)
    .order('total_invest', { ascending: false });
  
  if (error) throw new Error(`获取团队失败: ${error.message}`);
  
  return data;
}

// 统计用户总数
export async function getUserStats() {
  const { count: totalUsers, error: totalError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) throw new Error(`统计用户数失败: ${totalError.message}`);
  
  const { count: totalPartners, error: partnerError } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true });
  
  if (partnerError) throw new Error(`统计合伙人数失败: ${partnerError.message}`);
  
  // 按等级统计
  const { data: levelStats, error: levelError } = await supabase
    .from('users')
    .select('level')
    .order('level', { ascending: false });
  
  if (levelError) throw new Error(`获取等级分布失败: ${levelError.message}`);
  
  const levelDistribution: Record<number, number> = {};
  for (const user of levelStats || []) {
    const l = user.level || 0;
    levelDistribution[l] = (levelDistribution[l] || 0) + 1;
  }
  
  return {
    totalUsers: totalUsers || 0,
    totalPartners: totalPartners || 0,
    levelDistribution,
  };
}
