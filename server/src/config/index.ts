import { supabase } from '../storage/database/supabase-client';

// 获取合约配置（返回原始 key-value 格式）
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
  
  // 添加环境变量中的 RPC 和私钥
  config.rpc_url = config.rpc_url || process.env.BSC_RPC_URL || '';
  config.factory_private_key = config.factory_private_key || process.env.FACTORY_PRIVATE_KEY || '';
  
  return config;
}

// 获取完整合约配置（包含解析后的 ABI）
async function getFullContractConfig() {
  const config = await getContractConfig();
  
  // 解析 ABI（如果是 JSON 字符串）
  let abi = config.abi || '[]';
  try {
    abi = JSON.parse(abi);
  } catch {
    // 如果不是 JSON，可能已经是数组格式
  }
  
  return {
    contract_address: config.contract_address || '',
    rpc_url: config.rpc_url,
    factory_private_key: config.factory_private_key,
    abi: abi
  };
}

export { getContractConfig, getFullContractConfig };
