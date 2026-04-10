import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取合伙人列表
export async function getPartners(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const { page = 1, pageSize = 20, status = 'active' } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('partners')
    .select('*', { count: 'exact' });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error, count } = await query
    .order('order', { ascending: true })
    .range(from, to);
  
  if (error) throw new Error(`获取合伙人列表失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取合伙人详情
export async function getPartnerByAddress(walletAddress: string) {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_address', walletAddress)
    .maybeSingle();
  
  if (error) throw new Error(`获取合伙人详情失败: ${error.message}`);
  return data;
}

// 更新合伙人状态
export async function updatePartnerStatus(userAddress: string, status: string) {
  const { data, error } = await supabase
    .from('partners')
    .update({ status })
    .eq('user_address', userAddress)
    .select()
    .single();
  
  if (error) throw new Error(`更新合伙人状态失败: ${error.message}`);
  return data;
}

// 合伙人统计
export async function getPartnerStats() {
  const { count: activeCount, error: activeError } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  if (activeError) throw new Error(`获取合伙人数量失败: ${activeError.message}`);
  
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('dq_reward, sol_reward')
    .eq('status', 'active');
  
  if (partnersError) throw new Error(`获取合伙人奖励失败: ${partnersError.message}`);
  
  const totalDQ = partners?.reduce((sum, p) => sum + parseFloat(p.dq_reward || '0'), 0) || 0;
  const totalSOL = partners?.reduce((sum, p) => sum + parseFloat(p.sol_reward || '0'), 0) || 0;
  
  return {
    activeCount: activeCount || 0,
    totalDQ,
    totalSOL,
  };
}
