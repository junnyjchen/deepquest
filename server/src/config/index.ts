import { supabase } from '../storage/database/supabase-client';

// 获取合约配置
async function getContractConfig() {
  const { data, error } = await supabase
    .from('contract_config')
    .select('config_key, config_value');
  
  if (error) {
    throw new Error(`获取合约配置失败: ${error.message}`);
  }
  
  const config: Record<string, string> = {};
  if (data) {
    data.forEach((item: any) => {
      config[item.config_key] = item.config_value;
    });
  }
  
  return config;
}

export { getContractConfig };
