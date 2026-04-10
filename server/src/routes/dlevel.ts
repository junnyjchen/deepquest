import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取D级统计列表
export async function getDLevelStats(params: {
  page?: number;
  pageSize?: number;
  dLevel?: number;
}) {
  const { page = 1, pageSize = 20, dLevel } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('d_level_stats')
    .select('*', { count: 'exact' });
  
  if (dLevel !== undefined && dLevel !== null) {
    query = query.eq('d_level', dLevel);
  }
  
  const { data, error, count } = await query
    .order('d_level', { ascending: true })
    .range(from, to);
  
  if (error) throw new Error(`获取D级统计失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取用户D级详情
export async function getUserDLevel(walletAddress: string) {
  const { data, error } = await supabase
    .from('d_level_stats')
    .select('*')
    .eq('user_address', walletAddress)
    .maybeSingle();
  
  if (error) throw new Error(`获取用户D级详情失败: ${error.message}`);
  return data;
}

// D级汇总统计
export async function getDLevelSummary() {
  const { data, error } = await supabase
    .from('d_level_stats')
    .select('d_level, reward_amount');
  
  if (error) throw new Error(`获取D级汇总失败: ${error.message}`);
  
  const distribution: Record<number, { count: number; totalReward: number }> = {};
  let totalReward = 0;
  
  for (const stat of data || []) {
    const level = stat.d_level || 0;
    if (!distribution[level]) {
      distribution[level] = { count: 0, totalReward: 0 };
    }
    distribution[level].count++;
    distribution[level].totalReward += parseFloat(stat.reward_amount || '0');
    totalReward += parseFloat(stat.reward_amount || '0');
  }
  
  return {
    distribution,
    totalReward,
  };
}
