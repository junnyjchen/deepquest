import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取仪表盘概览数据
export async function getDashboardStats() {
  // 用户统计
  const { count: totalUsers, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (usersError) throw new Error(`获取用户数失败: ${usersError.message}`);
  
  // 入金统计
  const { data: deposits, error: depositError } = await supabase
    .from('deposits')
    .select('amount, created_at')
    .eq('status', 'completed');
  
  if (depositError) throw new Error(`获取入金统计失败: ${depositError.message}`);
  
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let totalDeposit = 0;
  let todayDeposit = 0;
  let weekDeposit = 0;
  
  for (const d of deposits || []) {
    const amount = parseFloat(d.amount);
    totalDeposit += amount;
    const depositDate = d.created_at.split('T')[0];
    if (depositDate === today) {
      todayDeposit += amount;
    }
    if (depositDate >= weekAgo) {
      weekDeposit += amount;
    }
  }
  
  // 提现统计
  const { data: withdrawals, error: withdrawError } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('status', 'completed');
  
  if (withdrawError) throw new Error(`获取提现统计失败: ${withdrawError.message}`);
  
  const totalWithdraw = withdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;
  
  // 奖励统计
  const { data: rewards, error: rewardError } = await supabase
    .from('rewards')
    .select('amount, reward_type');
  
  if (rewardError) throw new Error(`获取奖励统计失败: ${rewardError.message}`);
  
  let totalRewards = 0;
  const rewardByType: Record<string, number> = {};
  
  for (const r of rewards || []) {
    const amount = parseFloat(r.amount);
    totalRewards += amount;
    rewardByType[r.reward_type] = (rewardByType[r.reward_type] || 0) + amount;
  }
  
  // 合伙人统计
  const { count: totalPartners, error: partnerError } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  if (partnerError) throw new Error(`获取合伙人统计失败: ${partnerError.message}`);
  
  // 卡牌统计
  const { count: totalCards, error: cardsError } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });
  
  if (cardsError) throw new Error(`获取卡牌统计失败: ${cardsError.message}`);
  
  // 爆块统计
  const { data: blocks, error: blocksError } = await supabase
    .from('block_rewards')
    .select('release_amount, burn_amount')
    .order('block_time', { ascending: false })
    .limit(7);
  
  if (blocksError) throw new Error(`获取爆块统计失败: ${blocksError.message}`);
  
  const recentBlocks = blocks || [];
  const totalReleased = recentBlocks.reduce((sum, b) => sum + parseFloat(b.release_amount), 0);
  const totalBurned = recentBlocks.reduce((sum, b) => sum + parseFloat(b.burn_amount), 0);
  
  // 资金池统计
  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('balance');
  
  if (poolsError) throw new Error(`获取资金池统计失败: ${poolsError.message}`);
  
  const totalPoolBalance = pools?.reduce((sum, p) => sum + parseFloat(p.balance || '0'), 0) || 0;
  
  // 等级分布
  const { data: levelData, error: levelError } = await supabase
    .from('users')
    .select('level');
  
  if (levelError) throw new Error(`获取等级分布失败: ${levelError.message}`);
  
  const levelDistribution: Record<number, number> = {};
  for (const user of levelData || []) {
    const l = user.level || 0;
    levelDistribution[l] = (levelDistribution[l] || 0) + 1;
  }
  
  return {
    users: {
      total: totalUsers || 0,
    },
    deposits: {
      total: totalDeposit,
      today: todayDeposit,
      week: weekDeposit,
    },
    withdrawals: {
      total: totalWithdraw,
    },
    rewards: {
      total: totalRewards,
      byType: rewardByType,
    },
    partners: {
      total: totalPartners || 0,
    },
    cards: {
      total: totalCards || 0,
    },
    blocks: {
      recentCount: recentBlocks.length,
      recentReleased: totalReleased,
      recentBurned: totalBurned,
    },
    pools: {
      totalBalance: totalPoolBalance,
    },
    levelDistribution,
  };
}

// 获取近期入金趋势（每日）
export async function getDepositTrend(days: number = 7) {
  const result: Array<{ date: string; amount: number; count: number }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('deposits')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', date)
      .lt('created_at', new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || date + 'T23:59:59');
    
    if (error) throw new Error(`获取入金趋势失败: ${error.message}`);
    
    const amount = data?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    result.push({ date, amount, count: data?.length || 0 });
  }
  
  return result;
}
