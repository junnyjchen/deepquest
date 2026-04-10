import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取入金记录列表
export async function getDeposits(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 20, search, status, startDate, endDate } = params;
  
  let query = supabase
    .from('deposits')
    .select('*', { count: 'exact' });
  
  if (search) {
    query = query.ilike('user_address', `%${search}%`);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await query
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

// 获取奖励记录列表
export async function getRewards(params: {
  page?: number;
  pageSize?: number;
  userAddress?: string;
  rewardType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 20, userAddress, rewardType, startDate, endDate } = params;
  
  let query = supabase
    .from('rewards')
    .select('*', { count: 'exact' });
  
  if (userAddress) {
    query = query.eq('user_address', userAddress);
  }
  
  if (rewardType) {
    query = query.eq('reward_type', rewardType);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
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

// 获取提现记录列表
export async function getWithdrawals(params: {
  page?: number;
  pageSize?: number;
  userAddress?: string;
  status?: string;
  withdrawType?: string;
}) {
  const { page = 1, pageSize = 20, userAddress, status, withdrawType } = params;
  
  let query = supabase
    .from('withdrawals')
    .select('*', { count: 'exact' });
  
  if (userAddress) {
    query = query.eq('user_address', userAddress);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (withdrawType) {
    query = query.eq('withdraw_type', withdrawType);
  }
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await query
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

// 获取爆块记录
export async function getBlockRewards(params: {
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('block_rewards')
    .select('*', { count: 'exact' })
    .order('block_time', { ascending: false })
    .range(from, to);
  
  if (error) throw new Error(`获取爆块记录失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 投资统计
export async function getDepositStats() {
  // 总入金
  const { data: totalDepositData, error: totalError } = await supabase
    .from('deposits')
    .select('amount')
    .eq('status', 'completed');
  
  if (totalError) throw new Error(`获取总入金失败: ${totalError.message}`);
  
  const totalDeposit = totalDepositData?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  
  // 今日入金
  const today = new Date().toISOString().split('T')[0];
  const { data: todayDeposits, error: todayError } = await supabase
    .from('deposits')
    .select('amount')
    .eq('status', 'completed')
    .gte('created_at', today);
  
  if (todayError) throw new Error(`获取今日入金失败: ${todayError.message}`);
  
  const todayDeposit = todayDeposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  
  // 总提现
  const { data: withdrawData, error: withdrawError } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('status', 'completed');
  
  if (withdrawError) throw new Error(`获取总提现失败: ${withdrawError.message}`);
  
  const totalWithdraw = withdrawData?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;
  
  // 奖励总额
  const { data: rewardData, error: rewardError } = await supabase
    .from('rewards')
    .select('amount');
  
  if (rewardError) throw new Error(`获取奖励总额失败: ${rewardError.message}`);
  
  const totalRewards = rewardData?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
  
  return {
    totalDeposit,
    todayDeposit,
    totalWithdraw,
    totalRewards,
    netDeposit: totalDeposit - totalWithdraw,
  };
}
