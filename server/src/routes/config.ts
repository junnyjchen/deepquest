import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取所有配置
export async function getContractConfigs() {
  const { data, error } = await supabase
    .from('contract_config')
    .select('*')
    .order('config_key', { ascending: true });
  
  if (error) throw new Error(`获取配置失败: ${error.message}`);
  return data;
}

// 获取单个配置
export async function getConfig(key: string) {
  const { data, error } = await supabase
    .from('contract_config')
    .select('*')
    .eq('config_key', key)
    .maybeSingle();
  
  if (error) throw new Error(`获取配置失败: ${error.message}`);
  return data?.config_value;
}

// 更新配置
export async function updateConfig(key: string, value: any, description?: string, updatedBy?: string) {
  const { data, error } = await supabase
    .from('contract_config')
    .upsert({
      config_key: key,
      config_value: value,
      description,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: 'config_key' })
    .select()
    .single();
  
  if (error) throw new Error(`更新配置失败: ${error.message}`);
  return data;
}

// 初始化默认配置
export async function initDefaultConfigs() {
  const configs = [
    {
      config_key: 'invest_min',
      config_value: { value: '1', unit: 'SOL' },
      description: '最小投资金额',
    },
    {
      config_key: 'invest_max_start',
      config_value: { value: '10', unit: 'SOL' },
      description: '初始最大投资金额',
    },
    {
      config_key: 'invest_max_step',
      config_value: { value: '10', unit: 'SOL' },
      description: '每阶段最大投资增加量',
    },
    {
      config_key: 'invest_max_final',
      config_value: { value: '200', unit: 'SOL' },
      description: '最终最大投资金额',
    },
    {
      config_key: 'phase_duration',
      config_value: { value: '15', unit: 'days' },
      description: '每阶段持续天数',
    },
    {
      config_key: 'level_thresholds',
      config_value: { thresholds: [100, 200, 600, 2000, 6000, 20000], labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
      description: '等级晋级门槛（小区业绩）',
    },
    {
      config_key: 'd_level_thresholds',
      config_value: { thresholds: [30, 120, 360, 1000, 4000, 10000, 15000, 30000], labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'] },
      description: 'D级门槛（有效地址数）',
    },
    {
      config_key: 'card_config',
      config_value: {
        'A': { price: '500', total: 3000, remaining: 3000, reward_rate: 4 },
        'B': { price: '1500', total: 1000, remaining: 1000, reward_rate: 5 },
        'C': { price: '5000', total: 300, remaining: 300, reward_rate: 6 },
      },
      description: 'NFT卡牌配置',
    },
    {
      config_key: 'partner_requirements',
      config_value: {
        'first_20': { personal_invest: 5000, direct_sales: 30000 },
        'next_30': { personal_invest: 5000, direct_sales: 50000 },
      },
      description: '合伙人资格要求',
    },
    {
      config_key: 'stake_config',
      config_value: {
        periods: [30, 90, 180, 360],
        rates: [5, 10, 15, 20],
      },
      description: '质押配置',
    },
  ];
  
  for (const config of configs) {
    const { error } = await supabase
      .from('contract_config')
      .upsert(config, { onConflict: 'config_key' });
    
    if (error) throw new Error(`初始化配置 ${config.config_key} 失败: ${error.message}`);
  }
  
  return { success: true };
}
