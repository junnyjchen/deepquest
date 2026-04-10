import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

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
