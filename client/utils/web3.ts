/**
 * Web3 工具库 - 钱包连接和链上交互
 */
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, DQPROJECT_ABI, DQTOKEN_ABI, DQCARD_ABI } from '../config/contracts';

// BSC 主网配置
const BSC_CHAIN_ID = 56;
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';

// 检查是否为浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

/**
 * 检查 MetaMask 是否已安装
 */
export const isMetaMaskInstalled = (): boolean => {
  return isBrowser && !!window.ethereum?.isMetaMask;
};

/**
 * 获取浏览器钱包 provider
 */
export const getBrowserProvider = (): ethers.BrowserProvider | null => {
  if (!isBrowser) {
    console.log('[Web3] 非浏览器环境');
    return null;
  }
  return new ethers.BrowserProvider(window.ethereum);
};

/**
 * 请求钱包连接
 */
export const connectWallet = async (): Promise<{
  address: string;
  chainId: number;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
} | null> => {
  try {
    const provider = getBrowserProvider();
    if (!provider) {
      throw new Error('请在浏览器中安装 TP 钱包或 MetaMask 钱包');
    }

    // 请求账户连接
    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('未找到已连接的账户');
    }

    const address = accounts[0];
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    const signer = await provider.getSigner();

    console.log('[Web3] 钱包连接成功:', address, 'ChainId:', chainId);

    return {
      address,
      chainId,
      provider,
      signer,
    };
  } catch (error: any) {
    console.error('[Web3] 连接钱包失败:', error);
    throw error;
  }
};

/**
 * 断开钱包连接
 */
export const disconnectWallet = (): void => {
  if (isBrowser) {
    window.ethereum?.removeAllListeners?.('accountsChanged');
    window.ethereum?.removeAllListeners?.('chainChanged');
  }
};

/**
 * 监听账户变化
 */
export const onAccountsChanged = (callback: (accounts: string[]) => void): void => {
  if (isBrowser) {
    window.ethereum?.on?.('accountsChanged', callback);
  }
};

/**
 * 监听链变化
 */
export const onChainChanged = (callback: (chainId: string) => void): void => {
  if (isBrowser) {
    window.ethereum?.on?.('chainChanged', callback);
  }
};

/**
 * 切换到 BSC 主网
 */
export const switchToBSC = async (): Promise<void> => {
  if (!isBrowser || !window.ethereum) return;

  const targetChainId = '0x' + BSC_CHAIN_ID.toString(16);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });
  } catch (switchError: any) {
    // 如果链不存在，则添加
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: targetChainId,
            chainName: 'BNB Smart Chain',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18,
            },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/'],
          },
        ],
      });
    }
  }
};

/**
 * 获取合约实例（只读）
 */
export const getContract = (
  address: string,
  abi: any[],
  provider?: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract => {
  const rpcProvider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  return new ethers.Contract(address, abi, provider || rpcProvider);
};

/**
 * 获取签名合约实例
 */
export const getSignedContract = async (
  address: string,
  abi: any[],
  signer: ethers.Signer
): Promise<ethers.Contract> => {
  return new ethers.Contract(address, abi, signer);
};

// ============ DQProject 合约交互 ============

/**
 * 获取用户信息（从链上）
 */
export const getUserFromChain = async (userAddress: string): Promise<{
  referrer: string;
  directCount: number;
  level: number;
  totalInvest: string;
  teamInvest: string;
} | null> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const user = await contract.users(userAddress);
    
    // 检查是否未注册（referrer 为零地址）
    if (!user.referrer || user.referrer === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      referrer: user.referrer,
      directCount: Number(user.directCount),
      level: Number(user.level),
      totalInvest: ethers.formatEther(user.totalInvest),
      teamInvest: ethers.formatEther(user.teamInvest),
    };
  } catch (error: any) {
    // 如果是 require(false) 错误，认为用户未注册
    if (error.code === 'CALL_EXCEPTION' || error.message?.includes('require')) {
      console.log('[Web3] 用户未注册或数据不存在');
      return null;
    }
    console.error('[Web3] 获取用户信息失败:', error);
    return null;
  }
};

/**
 * 检查用户是否已注册（链上）
 */
export const isUserRegisteredOnChain = async (userAddress: string): Promise<boolean> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const result = await contract.isRegistered(userAddress);
    return result === true;
  } catch (error) {
    console.error('[Web3] 检查注册状态失败:', error);
    return false;
  }
};

/**
 * 注册用户（链上）
 */
export const registerUserOnChain = async (
  signer: ethers.Signer,
  referrer: string
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上注册用户:', await signer.getAddress(), '推荐人:', referrer);

  const tx = await contract.register(referrer);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 获取质押金额范围
 */
export const getInvestRange = async (): Promise<{ min: string; max: string }> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const min = await contract.INVEST_MIN();
    const max = await contract.getCurrentMaxInvest();

    return {
      min: ethers.formatEther(min),
      max: ethers.formatEther(max),
    };
  } catch (error) {
    console.error('[Web3] 获取投资范围失败:', error);
    return { min: '1', max: '10' };
  }
};

/**
 * 质押 SOL（链上）
 */
export const depositSOLOnChain = async (
  signer: ethers.Signer,
  amount: string
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const amountInWei = ethers.parseEther(amount);

  console.log('[Web3] 链上质押:', amount, 'SOL');

  const tx = await contract.depositSOL(amountInWei);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取 LP 奖励（链上）
 */
export const claimLPOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上领取 LP 奖励');

  const tx = await contract.claimLP();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取 NFT 奖励（链上）
 */
export const claimNFTOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上领取 NFT 奖励');

  const tx = await contract.claimNft();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取 D 团队奖励（链上）
 */
export const claimDTeamOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上领取 D 团队奖励');

  const tx = await contract.claimDTeam();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取合伙人奖励（链上）
 */
export const claimPartnerOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上领取合伙人奖励');

  const tx = await contract.claimPartnerReward();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

// ============ DQToken 合约交互 ============

/**
 * 获取 DQ Token 余额
 */
export const getDQTokenBalance = async (address: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQTOKEN.address, DQTOKEN_ABI);
    const balance = await contract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('[Web3] 获取 DQ Token 余额失败:', error);
    return '0';
  }
};

/**
 * 购买 Node NFT（链上）
 */
export const buyNodeOnChain = async (
  signer: ethers.Signer,
  cardType: number // 1=A, 2=B, 3=C
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上购买 Node:', 'CardType:', cardType);

  const tx = await contract.buyNode(cardType);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

// ============ DQCard 合约交互 ============

/**
 * 获取用户持有的 NFT 数量
 */
export const getUserNFTCount = async (address: string): Promise<number> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQCARD.address, DQCARD_ABI);
    return await contract.balanceOf(address);
  } catch (error) {
    console.error('[Web3] 获取 NFT 数量失败:', error);
    return 0;
  }
};

/**
 * 获取 NFT 卡牌价格
 */
export const getCardPrices = async (): Promise<{ A: string; B: string; C: string }> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQCARD.address, DQCARD_ABI);
    const [priceA, priceB, priceC] = await Promise.all([
      contract.PRICE_A(),
      contract.PRICE_B(),
      contract.PRICE_C(),
    ]);
    return {
      A: ethers.formatEther(priceA),
      B: ethers.formatEther(priceB),
      C: ethers.formatEther(priceC),
    };
  } catch (error) {
    console.error('[Web3] 获取卡牌价格失败:', error);
    return { A: '100', B: '500', C: '2000' };
  }
};

/**
 * 等待交易确认
 */
export const waitForTransaction = async (
  tx: ethers.TransactionResponse,
  confirmations: number = 1
): Promise<ethers.Receipt> => {
  console.log('[Web3] 等待交易确认:', tx.hash);
  return await tx.wait(confirmations);
};

/**
 * 格式化地址（显示缩写）
 */
export const formatAddress = (address: string, start: number = 6, end: number = 4): string => {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

// TypeScript 类型声明
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (event?: string) => void;
    };
  }
}
