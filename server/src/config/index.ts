// 获取完整合约配置（从 .env 环境变量读取）
async function getFullContractConfig() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const rpcUrl = process.env.BSC_RPC_URL;
  const privateKey = process.env.FACTORY_PRIVATE_KEY;
  const abiJson = process.env.CONTRACT_ABI;

  // 检查必需配置
  if (!contractAddress) {
    throw new Error('缺少环境变量: CONTRACT_ADDRESS');
  }
  if (!rpcUrl) {
    throw new Error('缺少环境变量: BSC_RPC_URL');
  }
  if (!privateKey) {
    throw new Error('缺少环境变量: FACTORY_PRIVATE_KEY');
  }

  // 解析 ABI
  let abi: any[] = [];
  if (abiJson) {
    try {
      abi = JSON.parse(abiJson);
    } catch {
      throw new Error('CONTRACT_ABI 格式错误，请提供有效的 JSON 数组');
    }
  } else {
    throw new Error('缺少环境变量: CONTRACT_ABI');
  }

  return {
    contract_address: contractAddress,
    rpc_url: rpcUrl,
    factory_private_key: privateKey,
    abi: abi
  };
}

// 获取合约配置（兼容旧接口）
async function getContractConfig() {
  return await getFullContractConfig();
}

export { getContractConfig, getFullContractConfig };
