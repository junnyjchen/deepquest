import { ethers } from 'ethers';

// BSC 主网 RPC
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';

// 合约地址
const DQ_CONTRACT = '0xD6C7f9a6460034317294c52FDc056C548fbd0040';

// DQProject ABI - 只包含 register 和 Register 事件
const DQ_ABI = [
  // register 函数
  "function register(address _referrer) external",
  // Register 事件
  "event Register(address indexed user, address indexed referrer)",
  // isRegistered view 函数（如果有的话）
  "function users(address) view returns (address referrer, uint256 directCount, uint8 level, uint256 totalInvest, uint256 teamInvest, uint256 energy, uint256 lpShares, uint8 dLevel)"
];

// 获取 BSC Provider
function getBSCProvider() {
  return new ethers.JsonRpcProvider(BSC_RPC_URL);
}

// 获取合约实例
function getContract() {
  const provider = getBSCProvider();
  return new ethers.Contract(DQ_CONTRACT, DQ_ABI, provider);
}

/**
 * 获取用户在链上的注册交易 hash
 * 通过查询 Register 事件来找到用户的首次注册交易
 */
export async function getUserRegisterTxHash(walletAddress: string): Promise<string | null> {
  try {
    const contract = getContract();
    const filter = contract.filters.Register(null, null);
    
    // 获取该用户的所有 Register 事件（取第一条，即首次注册）
    const events = await contract.getFilterLogs(filter);
    
    // 找到该用户的注册事件
    const userEvents = events.filter(e => {
      const user = e.args?.[0];
      return user?.toLowerCase() === walletAddress.toLowerCase();
    });
    
    if (userEvents.length > 0) {
      // 返回首次注册的交易 hash
      const txHash = userEvents[0].transactionHash;
      console.log(`[BSC] 找到用户 ${walletAddress} 的注册交易: ${txHash}`);
      return txHash;
    }
    
    console.log(`[BSC] 未找到用户 ${walletAddress} 的注册交易`);
    return null;
  } catch (error) {
    console.error(`[BSC] 查询注册交易失败:`, error);
    return null;
  }
}

/**
 * 检查用户是否已在链上注册
 */
export async function isUserRegisteredOnChain(walletAddress: string): Promise<boolean> {
  try {
    const contract = getContract();
    
    // 尝试获取用户信息
    const userInfo = await contract.users(walletAddress);
    
    // 如果 referrer 不为 0x0...0，则认为已注册
    if (userInfo && userInfo.referrer !== ethers.ZeroAddress) {
      return true;
    }
    
    return false;
  } catch (error) {
    // 如果调用失败，可能用户不存在
    console.log(`[BSC] 用户 ${walletAddress} 未注册或查询失败`);
    return false;
  }
}

/**
 * 获取用户的链上信息
 */
export async function getUserInfoFromChain(walletAddress: string) {
  try {
    const contract = getContract();
    const userInfo = await contract.users(walletAddress);
    
    return {
      referrer: userInfo.referrer,
      directCount: userInfo.directCount?.toString() || '0',
      level: userInfo.level?.toString() || '0',
      totalInvest: userInfo.totalInvest?.toString() || '0',
      teamInvest: userInfo.teamInvest?.toString() || '0',
      energy: userInfo.energy?.toString() || '0',
      lpShares: userInfo.lpShares?.toString() || '0',
      dLevel: userInfo.dLevel?.toString() || '0',
    };
  } catch (error) {
    console.error(`[BSC] 获取用户信息失败:`, error);
    return null;
  }
}
