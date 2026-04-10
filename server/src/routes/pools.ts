import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取所有资金池
export async function getPools() {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .order('pool_name', { ascending: true });
  
  if (error) throw new Error(`获取资金池失败: ${error.message}`);
  return data;
}

// 获取单个资金池
export async function getPoolByName(poolName: string) {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('pool_name', poolName)
    .maybeSingle();
  
  if (error) throw new Error(`获取资金池失败: ${error.message}`);
  return data;
}

// 更新资金池余额
export async function updatePoolBalance(poolName: string, balanceChange: string) {
  const { data: pool, error: getError } = await supabase
    .from('pools')
    .select('balance')
    .eq('pool_name', poolName)
    .maybeSingle();
  
  if (getError) throw new Error(`获取资金池失败: ${getError.message}`);
  
  const currentBalance = parseFloat(pool?.balance || '0');
  const change = parseFloat(balanceChange);
  const newBalance = currentBalance + change;
  
  const { data, error } = await supabase
    .from('pools')
    .update({
      balance: newBalance.toString(),
      updated_at: new Date().toISOString(),
    })
    .eq('pool_name', poolName)
    .select()
    .single();
  
  if (error) throw new Error(`更新资金池失败: ${error.message}`);
  return data;
}

// 初始化资金池（如不存在）
export async function initPools() {
  const poolNames = ['management', 'dao', 'insurance', 'operation', 'fee'];
  
  for (const name of poolNames) {
    const { error } = await supabase
      .from('pools')
      .upsert({
        pool_name: name,
        balance: '0',
        total_distributed: '0',
      }, { onConflict: 'pool_name' });
    
    if (error) throw new Error(`初始化资金池 ${name} 失败: ${error.message}`);
  }
  
  return { success: true };
}

// 获取资金池统计
export async function getPoolStats() {
  const { data: pools, error } = await supabase
    .from('pools')
    .select('pool_name, balance, total_distributed');
  
  if (error) throw new Error(`获取资金池统计失败: ${error.message}`);
  
  const stats: Record<string, { balance: number; distributed: number }> = {};
  let totalBalance = 0;
  let totalDistributed = 0;
  
  for (const pool of pools || []) {
    const balance = parseFloat(pool.balance || '0');
    const distributed = parseFloat(pool.total_distributed || '0');
    stats[pool.pool_name] = { balance, distributed };
    totalBalance += balance;
    totalDistributed += distributed;
  }
  
  return {
    pools: stats,
    totalBalance,
    totalDistributed,
  };
}
