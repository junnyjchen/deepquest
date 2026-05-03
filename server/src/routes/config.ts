import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取所有配置
export async function getContractConfigs() {
  const { data, error } = await supabase
    .from('contract_config')
    .select('*')
    .order('config_key', { ascending: true });
  
  // 检测表不存在错误
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      throw new Error(`❌ 数据表 'contract_config' 不存在！

请先在数据库中执行以下 SQL 创建表：

CREATE TABLE IF NOT EXISTS contract_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_contract_config_key ON contract_config(config_key);

-- 如果使用 Supabase anon key 访问，确保 RLS 策略允许读取：
-- ALTER TABLE contract_config ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read" ON contract_config FOR SELECT USING (true);`);
    }
    // 检查是否是 RLS 权限问题
    if (error.code === '42501' || error.message.includes('permission denied')) {
      throw new Error(`❌ 数据库权限不足！

错误: ${error.message}

请检查：
1. Supabase ANON_KEY 是否正确配置
2. 数据表的 RLS 策略是否允许访问
3. 尝试在 Supabase SQL Editor 执行：

-- 禁用 RLS（测试用）
ALTER TABLE contract_config DISABLE ROW LEVEL SECURITY;

-- 或创建公开访问策略
CREATE POLICY "public_read" ON contract_config FOR SELECT USING (true);`);
    }
    throw new Error(`获取配置失败: ${error.message}`);
  }
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
  try {
    // 先检查表是否存在
    const { error: checkError } = await supabase
      .from('contract_config')
      .select('id')
      .limit(1);
    
    if (checkError && (checkError.message.includes('does not exist') || checkError.code === '42P01')) {
      console.error('❌ contract_config 表不存在，请先创建表！');
      return { success: false, error: "数据表不存在" };
    }
  } catch (e) {
    console.error('❌ contract_config 表不存在，请先创建表！');
    return { success: false, error: "数据表不存在" };
  }
  const configs = [
    // 合约地址
    {
      config_key: 'contract_address',
      config_value: '0x1F45f166Dc74C0FAb7a1A5C3Eb1Ff2b0DA68c906',
      description: '主合约地址',
    },
    {
      config_key: 'dqtoken_address',
      config_value: '', // 部署后从合约获取
      description: 'DQ代币地址',
    },
    {
      config_key: 'dqcard_address',
      config_value: '', // 部署后从合约获取
      description: 'NFT卡牌地址',
    },
    // 可调整参数
    {
      config_key: 'invest_max_start',
      config_value: { value: '10', unit: 'SOL', editable: true },
      description: '初始最大投资金额（可调整）',
    },
    {
      config_key: 'invest_max_step',
      config_value: { value: '10', unit: 'SOL', editable: true },
      description: '每阶段最大投资增加量（可调整）',
    },
    {
      config_key: 'invest_max_final',
      config_value: { value: '200', unit: 'SOL', editable: true },
      description: '最终最大投资金额（可调整）',
    },
    {
      config_key: 'phase_duration',
      config_value: { value: '15', unit: 'days', editable: true },
      description: '每阶段持续天数（可调整）',
    },
    // 固定参数 - 仅展示
    {
      config_key: 'invest_min',
      config_value: { value: '1', unit: 'SOL', editable: false },
      description: '最小投资金额（固定）',
    },
    // 等级门槛（固定：小区业绩 SOL）
    {
      config_key: 'level_thresholds',
      config_value: { 
        editable: false,
        thresholds: [100, 200, 600, 2000, 6000, 20000], 
        labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
        rewards: [5, 10, 15, 20, 25, 30]
      },
      description: '等级晋级门槛（固定：小区业绩 SOL）',
    },
    // D级门槛（固定：有效地址数）
    {
      config_key: 'd_level_thresholds',
      config_value: { 
        editable: false,
        thresholds: [30, 120, 360, 1000, 4000, 10000, 15000, 30000], 
        labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
      },
      description: 'D级门槛（固定：有效地址数）',
    },
    // NFT卡牌配置（固定价格和总量，可调整剩余数量）
    {
      config_key: 'card_config',
      config_value: {
        editable: false,
        cards: {
          'A': { price: '500', unit: 'USDT', total: 1000, remaining: 1000, reward_weight: 4 },
          'B': { price: '1500', unit: 'USDT', total: 500, remaining: 500, reward_weight: 5 },
          'C': { price: '5000', unit: 'USDT', total: 100, remaining: 100, reward_weight: 6 },
        },
        requirements: { 'A': 5, 'B': 10, 'C': 20 } // 领取所需有效线数
      },
      description: 'NFT卡牌配置（价格和总量固定）',
    },
    // 合伙人要求
    {
      config_key: 'partner_requirements',
      config_value: {
        editable: true,
        total_limit: 50,
        first_phase: { personal_invest: 5000, direct_sales: 30000 },
        second_phase: { personal_invest: 5000, direct_sales: 50000 },
      },
      description: '合伙人资格要求',
    },
    // 质押配置（固定）
    {
      config_key: 'stake_config',
      config_value: {
        editable: false,
        periods: [30, 90, 180, 360],
        rates: [5, 10, 15, 20],
        unit: 'days / %'
      },
      description: '质押配置（固定）',
    },
    // 奖励分配比例（固定）
    {
      config_key: 'reward_distribution',
      config_value: {
        editable: false,
        deposit_split: {
          dynamic: 50,  // 动态奖励 50%
          lp: 50       // LP挖矿 50%
        },
        dynamic_split: {
          direct: 30,   // 直推奖励
          node: 15,     // 节点奖励
          management: 30, // 管理奖励
          dao: 10,      // DAO奖励
          insurance: 7, // 保险池
          operation: 8  // 运营池
        }
      },
      description: '奖励分配比例（固定）',
    },
    // 提现手续费（固定）
    {
      config_key: 'withdraw_fee',
      config_value: {
        editable: false,
        rate: 10,      // 10%
        split: {
          nft: 40,      // 40% 给NFT持有者
          partner: 30,  // 30% 给合伙人
          foundation: 30 // 30% 给基金会
        }
      },
      description: '提现手续费（固定）',
    },
    // LP赎回手续费
    {
      config_key: 'lp_remove_fee',
      config_value: {
        editable: false,
        rules: [
          { days: '<60', rate: 20 },
          { days: '60-180', rate: 10 },
          { days: '>180', rate: 0 }
        ]
      },
      description: 'LP赎回手续费规则（固定）',
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
