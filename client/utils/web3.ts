/**
 * Web3 工具库 - 钱包连接和链上交互
 */
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, DQPROJECT_ABI, DQTOKEN_ABI, DQCARD_ABI, DQSTAKE_ABI } from '../config/contracts';

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
  // isBrowser 已保证 window.ethereum 存在，这里显式断言以满足 ethers 的 Eip1193Provider 类型要求
  return new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
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
export const getUserFromChain = async (userAddress: string) => {
  const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);

  try {
    // getUser 当前仅返回 4 个字段（与 assets/DQM.SOL 对齐）：
    // (referrer, directCount, level, totalInvest)
    // 其余信息需分别从 getUserStake 获取。
    const [
      referrer,
      directCount,
      level,
      totalInvest,
    ] = await contract.getUser(userAddress);

    // const owner = await contract.owner();

    // 未注册判定：referrer=0 且 不是 owner
    const isRegistered = referrer !== ethers.ZeroAddress;

    if (!isRegistered) return null;

    let teamInvest = '0.0';
    let energy = '0.0';
    let pendingSOL = '0.0';

    const [stakeRes] = await Promise.allSettled([
      contract.getUserStake(userAddress),
    ]);

    if (stakeRes.status === 'fulfilled') {
      teamInvest = ethers.formatEther(stakeRes.value[0]);
      energy = ethers.formatEther(stakeRes.value[1]);
      pendingSOL = ethers.formatEther(stakeRes.value[2]);
    }
    
    return {
      referrer,
      directCount: Number(directCount),
      level: Number(level),
      totalInvest: ethers.formatEther(totalInvest),
      teamInvest,
      energy,
      pendingSOL,
    };
  } catch (e) {
    // 如果调用本身 revert / ABI 不匹配，也返回 null（但建议日志打出来）
    console.error("[Web3] getUser 调用失败(可能 ABI/地址不匹配):", e);
    return null;
  }
};

/**
 * 检查用户是否已注册（链上）
 */
export const isUserRegisteredOnChain = async (userAddress: string): Promise<boolean> => {
  const user = await getUserFromChain(userAddress);
  return user !== null;
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

const getPanicCode = (error: unknown): number | null => {
  const candidate = error as {
    revert?: { args?: unknown[] };
    info?: { error?: { data?: string } };
    data?: string;
    message?: string;
  };

  const rawArg = candidate?.revert?.args?.[0];
  if (typeof rawArg === 'number') return rawArg;
  if (typeof rawArg === 'bigint') return Number(rawArg);
  if (typeof rawArg === 'string' && /^\d+$/.test(rawArg)) return Number(rawArg);

  const rawData = candidate?.info?.error?.data || candidate?.data;
  if (typeof rawData === 'string' && rawData.startsWith('0x4e487b71') && rawData.length >= 74) {
    return Number(BigInt(rawData));
  }

  if (typeof candidate?.message === 'string') {
    const match = candidate.message.match(/Panic(?: due to [^(]+)?\((\d+)\)/i);
    if (match) return Number(match[1]);
  }

  return null;
};

const diagnoseDepositOverflow = async (
  contract: ethers.Contract,
  userAddress: string,
  amountInWei: bigint
): Promise<string> => {
  const directReward = amountInWei * 50n / 100n * 30n / 100n;

  try {
    const [userRes, dqCardAddr, stakeInfoRes] = await Promise.all([
      contract.getUser(userAddress),
      contract.dqCard().catch(() => CONTRACT_ADDRESSES.DQCARD.address),
      contract.getUserStake(userAddress).catch(() => [0n, 0n, 0n]),
    ]);

    const referrer = String(userRes?.[0] || ethers.ZeroAddress);
    if (!referrer || referrer === ethers.ZeroAddress) {
      return '入金失败：合约内部发生了整数下溢（Panic 0x11），但当前账户没有可用的上级关系信息。优先检查链上部署是否还是旧版 DQMining 合约。';
    }

    const cardContract = getContract(dqCardAddr, DQCARD_ABI);
    const [referrerStake, referrerNftBalance] = await Promise.all([
      contract.getUserStake(referrer).catch(() => [0n, 0n, 0n]),
      cardContract.balanceOf(referrer).catch(() => 0n),
    ]);

    const referrerEnergy = BigInt(referrerStake?.[1]?.toString?.() ?? referrerStake?.[1] ?? 0);
    const userEnergy = BigInt(stakeInfoRes?.[1]?.toString?.() ?? stakeInfoRes?.[1] ?? 0);
    const nftCount = BigInt(referrerNftBalance?.toString?.() ?? referrerNftBalance ?? 0);

    if (nftCount === 0n && referrerEnergy < directReward) {
      return `入金失败：当前链上主合约很像仍在执行旧版分润逻辑。你的直推上级 ${referrer} 没有 NFT，且 energy=${ethers.formatEther(referrerEnergy)}，但本次入金会触发约 ${ethers.formatEther(directReward)} SOL 的直推奖励扣能量，导致整数下溢并回退（Panic 0x11）。建议先让上级补能量/先完成一笔入金，或切换到已修复的合约版本。`;
    }

    if (referrerEnergy < directReward) {
      return `入金失败：上级 ${referrer} 的 energy=${ethers.formatEther(referrerEnergy)}，低于本次入金所需的直推奖励扣减 ${ethers.formatEther(directReward)}。链上旧版分润实现会在这里直接下溢并触发 Panic 0x11。`;
    }

    return `入金失败：合约在执行分润或加 LP 时发生整数下溢（Panic 0x11）。当前账户 energy=${ethers.formatEther(userEnergy)}，上级=${referrer}，上级 energy=${ethers.formatEther(referrerEnergy)}。最可疑的是链上仍是旧版 DQMining/DQStake 分润实现，而不是前端重复调用。`;
  } catch (diagnoseError) {
    console.error('[Web3] 诊断 Panic(0x11) 失败:', diagnoseError);
    return '入金失败：合约在执行分润或加 LP 时发生整数下溢（Panic 0x11）。这通常不是前端重复调用，而是链上旧版合约内部的算术下溢。';
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
  const userAddress = (await signer.getAddress()).toLowerCase();

  console.log('[Web3] 链上质押:', amount, 'SOL');

  // ── 预检查：把常见 require/transferFrom 失败原因提前暴露出来 ──
  try {
    const [stakeAddr, minInvest, isBlacklisted, isWhitelisted] = await Promise.all([
      contract.stakeContract().catch(() => ethers.ZeroAddress),
      contract.INVEST_MIN().catch(() => 0n),
      contract.isBlacklisted(userAddress).catch(() => false),
      contract.depositWhiteList(userAddress).catch(() => false),
    ]);

    if (isBlacklisted) {
      throw new Error('入金失败：地址被拉黑（!inv）');
    }
    if (typeof minInvest === 'bigint' && minInvest > 0n && amountInWei < minInvest) {
      throw new Error(`入金失败：金额小于最小入金（min=${ethers.formatEther(minInvest)}）`);
    }
    if (stakeAddr === ethers.ZeroAddress) {
      // DQMiningV3.depositSOL 会在 swapAndAddLP 时 require(!stake)
      throw new Error('入金失败：stakeContract 未设置（!stake），需管理员先 setStakeContract');
    }

    if (!isWhitelisted) {
      const [daily, limit] = await Promise.all([
        contract.dailyDeposit(userAddress).catch(() => 0n),
        contract.getDailyLimit().catch(() => 0n),
      ]);
      if (typeof daily === 'bigint' && typeof limit === 'bigint' && daily + amountInWei > limit) {
        throw new Error(
          `入金失败：超过当日限额（!lim），已入金=${ethers.formatEther(daily)}，限额=${ethers.formatEther(limit)}`
        );
      }
    }

    // ERC20: balance/allowance
    const solContract = await getSignedContract(CONTRACT_ADDRESSES.SOL.address, DQTOKEN_ABI, signer);
    const [balance, allowance] = await Promise.all([
      solContract.balanceOf(userAddress).catch(() => 0n),
      solContract.allowance(userAddress, CONTRACT_ADDRESSES.DQPROJECT.address).catch(() => 0n),
    ]);

    if (typeof balance === 'bigint' && balance < amountInWei) {
      throw new Error(`入金失败：SOL 余额不足（bal=${ethers.formatEther(balance)}）`);
    }
    if (typeof allowance === 'bigint' && allowance < amountInWei) {
      throw new Error(`入金失败：SOL 授权额度不足，请先授权（allow=${ethers.formatEther(allowance)}）`);
    }
  } catch (preflightError) {
    console.error('[Web3] 入金预检查失败:', preflightError);
    throw preflightError;
  }

  // 静态调用再兜底一次（有些 RPC 不回传 revert reason，但能挡住明显 revert）
  try {
    await contract.depositSOL.staticCall(amountInWei);
  } catch (e) {
    const panicCode = getPanicCode(e);
    if (panicCode === 0x11) {
      const diagnosis = await diagnoseDepositOverflow(contract, userAddress, amountInWei);
      console.error('[Web3] depositSOL 检测到 Panic(0x11):', diagnosis, e);
      throw new Error(diagnosis);
    }

    console.error('[Web3] depositSOL staticCall 失败:', e);
    throw e;
  }

  const tx = await contract.depositSOL(amountInWei);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 质押 DQ（链上）
 */
export const stakeDQOnChain = async (
  signer: ethers.Signer,
  amount: string,
  periodIndex: number
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const amountInWei = ethers.parseEther(amount);
  const userAddress = (await signer.getAddress()).toLowerCase();

  console.log('[Web3] 链上质押 DQ:', amount, 'periodIndex:', periodIndex);

  try {
    const [stakeAddr, balance, allowance] = await Promise.all([
      contract.stakeContract().catch(() => ethers.ZeroAddress),
      contract.dqToken().then(async (dqAddr: string) => {
        const dqContract = getContract(dqAddr, DQTOKEN_ABI);
        return dqContract.balanceOf(userAddress).catch(() => 0n);
      }).catch(() => 0n),
      contract.dqToken().then(async (dqAddr: string) => {
        const dqContract = getContract(dqAddr, DQTOKEN_ABI);
        return dqContract.allowance(userAddress, CONTRACT_ADDRESSES.DQPROJECT.address).catch(() => 0n);
      }).catch(() => 0n),
    ]);

    if (stakeAddr === ethers.ZeroAddress) {
      throw new Error('质押失败：stakeContract 未设置（!stake）');
    }
    if (periodIndex < 0 || periodIndex > 3) {
      throw new Error('质押失败：质押周期索引无效（!i）');
    }
    if (typeof balance === 'bigint' && balance < amountInWei) {
      throw new Error(`质押失败：DQ 余额不足（bal=${ethers.formatEther(balance)}）`);
    }
    if (typeof allowance === 'bigint' && allowance < amountInWei) {
      throw new Error(`质押失败：DQ 授权额度不足，请先授权（allow=${ethers.formatEther(allowance)}）`);
    }
  } catch (preflightError) {
    console.error('[Web3] 质押 DQ 预检查失败:', preflightError);
    throw preflightError;
  }

  try {
    await contract.stakeDQ.staticCall(amountInWei, periodIndex);
  } catch (error) {
    console.error('[Web3] stakeDQ staticCall 失败:', error);
    throw error;
  }

  const tx = await contract.stakeDQ(amountInWei, periodIndex);
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
 * 授权 DQ Token 给主合约（用于兑换）
 */
export const approveDQToken = async (
  signer: ethers.Signer,
  amount: string
): Promise<ethers.TransactionResponse> => {
  const dqContract = await getSignedContract(CONTRACT_ADDRESSES.DQTOKEN.address, DQTOKEN_ABI, signer);
  const amountInWei = ethers.parseEther(amount);

  console.log('[Web3] 授权 DQ Token:', amount);

  const tx = await dqContract.approve(CONTRACT_ADDRESSES.DQPROJECT.address, amountInWei);
  console.log('[Web3] 授权交易已发送:', tx.hash);

  return tx;
};

/**
 * 检查 DQ Token 授权额度
 */
export const checkDQAllowance = async (
  userAddress: string
): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQTOKEN.address, DQTOKEN_ABI);
    const allowance = await contract.allowance(userAddress, CONTRACT_ADDRESSES.DQPROJECT.address);
    return ethers.formatEther(allowance);
  } catch (error) {
    console.error('[Web3] 检查授权额度失败:', error);
    return '0';
  }
};

/**
 * 卖出 DQ 换取 SOL（链上）
 */
export const sellDQForSOL = async (
  signer: ethers.Signer,
  dqAmount: string,
  minSolAmount: string = '0'
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const dqAmountInWei = ethers.parseEther(dqAmount);
  const minSolAmountInWei = ethers.parseEther(minSolAmount);

  console.log('[Web3] 链上兑换 DQ 为 SOL:', dqAmount, 'DQ, 最小获得:', minSolAmount, 'SOL');

  const tx = await contract.sellDQForSOL(dqAmountInWei, minSolAmountInWei);
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

/**
 * 领取 SOL 奖励（链上）
 */
export const claimSOLOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 链上领取 SOL 奖励');

  const tx = await contract.claimReward();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 获取待领取 SOL 金额（从链上）
 */
export const getPendingSOL = async (userAddress: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const pending = await contract.getPendingSOL(userAddress);
    return ethers.formatEther(pending);
  } catch (error) {
    console.error('[Web3] 获取待领取 SOL 失败:', error);
    return '0';
  }
};

// ============ DQToken 合约交互 ============

/**
 * 获取 BNB 余额（原生代币）
 */
export const getBNBBalance = async (address: string): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('[Web3] 获取 BNB 余额失败:', error);
    return '0';
  }
};

/**
 * 获取 SOL Token 余额（ERC20 代币）
 */
export const getSOLTokenBalance = async (address: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.SOL.address, DQTOKEN_ABI);
    const balance = await contract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('[Web3] 获取 SOL Token 余额失败:', error);
    return '0';
  }
};

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
 * 获取 USDT 合约地址（从主合约读取）
 */
export const getUSDTAddress = async (): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const usdtAddress = await contract.USDT();
    return usdtAddress;
  } catch (error) {
    console.error('[Web3] 获取 USDT 地址失败:', error);
    // 默认返回 BSC 主网 USDT 地址
    return '0x55d398326f99059fF775485246999027B3197955';
  }
};

/**
 * 授权 USDT 给主合约（用于购买节点）
 */
export const approveUSDT = async (
  signer: ethers.Signer,
  amount: string
): Promise<ethers.TransactionResponse> => {
  const usdtAddress = await getUSDTAddress();
  const usdtContract = await getSignedContract(usdtAddress, DQTOKEN_ABI, signer);
  const amountInWei = ethers.parseUnits(amount, 18); // USDT 也是 18 位小数

  console.log('[Web3] 授权 USDT:', amount);

  const tx = await usdtContract.approve(CONTRACT_ADDRESSES.DQPROJECT.address, amountInWei);
  console.log('[Web3] USDT 授权交易已发送:', tx.hash);

  return tx;
};

/**
 * 检查 USDT 授权额度
 */
export const checkUSDTAllowance = async (
  userAddress: string
): Promise<string> => {
  try {
    const usdtAddress = await getUSDTAddress();
    const contract = getContract(usdtAddress, DQTOKEN_ABI);
    const allowance = await contract.allowance(userAddress, CONTRACT_ADDRESSES.DQPROJECT.address);
    return ethers.formatUnits(allowance, 18);
  } catch (error) {
    console.error('[Web3] 检查 USDT 授权额度失败:', error);
    return '0';
  }
};

/**
 * 获取 USDT 余额
 */
export const getUSDTBalance = async (address: string): Promise<string> => {
  try {
    const usdtAddress = await getUSDTAddress();
    const contract = getContract(usdtAddress, DQTOKEN_ABI);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error('[Web3] 获取 USDT 余额失败:', error);
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
): Promise<ethers.TransactionReceipt | null> => {
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

// ============ LP 分红和 NFT 分红查询 ============

/**
 * 查询用户 LP 分红
 * @param address 用户地址
 * @returns { lpShare: string, pendingReward: string } LP份额和待领取分红(DQ)
 */
export const getLPReward = async (address: string): Promise<{ lpShare: string; pendingReward: string }> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQSTAKE.address, DQSTAKE_ABI);
    const [lpShareValue, lpDebtValue, lpAccRewardValue] = await Promise.all([
      contract.lpS(address),
      contract.lpD(address),
      contract.lA(),
    ]);

    const lpShareRaw = BigInt(lpShareValue.toString());
    const lpDebtRaw = BigInt(lpDebtValue.toString());
    const lpAccRewardRaw = BigInt(lpAccRewardValue.toString());
    const pendingRewardRaw = (lpAccRewardRaw * lpShareRaw) / (10n ** 12n) - lpDebtRaw;
    const lpShare = ethers.formatEther(lpShareRaw); // LP份额
    const pendingReward = ethers.formatEther(
      pendingRewardRaw > 0n ? pendingRewardRaw : 0n
    ); // 可领取的DQ分红
    
    console.log('[Web3] LP分红查询:', { lpShare, pendingReward });
    return { lpShare, pendingReward };
  } catch (error) {
    console.error('[Web3] 查询LP分红失败:', error);
    return { lpShare: '0', pendingReward: '0' };
  }
};

/**
 * 查询用户 NFT 分红
 * @param address 用户地址
 * @returns string 待领取的NFT分红(DQ)
 */
export const getNFTReward = async (address: string): Promise<string> => {
  try {
    const dqCardContract = getContract(CONTRACT_ADDRESSES.DQCARD.address, DQCARD_ABI);
    const stakeContract = getContract(CONTRACT_ADDRESSES.DQSTAKE.address, DQSTAKE_ABI);
    
    // 1. 获取用户持有的NFT数量
    const nftCount = await dqCardContract.balanceOf(address);
    const count = Number(nftCount);
    
    if (count === 0) {
      return '0';
    }
    
    // 2. 获取累计奖励系数 nA[0], nA[1], nA[2] (需要从合约状态读取)
    // 注意：这些是合约内部状态，可能需要合约提供查询函数
    // 这里我们通过计算每个NFT的分红来累加
    
    // 3. 遍历用户的每个NFT
    for (let i = 0; i < count; i++) {
      try {
        // 获取NFT的tokenId
        const tokenId = await dqCardContract.tokenOfOwnerByIndex(address, i);
        // 获取NFT类型 (1=A, 2=B, 3=C)
        const cardType = await dqCardContract.cardType(tokenId);
        const typeNum = Number(cardType);
        
        // 获取该类型的价格
        const price = await dqCardContract.getCardPrice(typeNum);
        
        // 这里需要从质押合约读取分红累计值
        // 由于合约可能没有直接提供查询接口，我们返回一个说明
        console.log(`[Web3] NFT #${i}: Type=${typeNum}, Price=${ethers.formatEther(price)}`);
        
        // 注意：完整的计算需要访问合约的 nA[idx] 和 nD{idx}[user] 状态
        // 如果合约没有提供查询函数，可能需要等待合约升级或使用事件日志
        
      } catch (err) {
        console.error(`[Web3] 获取NFT #${i} 信息失败:`, err);
      }
    }
    
    // 由于无法直接读取 nA 和 nD 状态变量，返回提示
    console.warn('[Web3] NFT分红需要合约提供查询函数，当前仅能通过claimNft交易来获取');
    return '0'; // 暂时返回0，实际需要合约提供getNFTReward函数
    
  } catch (error) {
    console.error('[Web3] 查询NFT分红失败:', error);
    return '0';
  }
};

/**
 * 查询用户D等级分红
 * @param address 用户地址
 * @returns string 待领取的D等级分红(DQ)
 */
export const getDLevelReward = async (address: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQSTAKE.address, DQSTAKE_ABI);
    const reward = await contract.getDLevelReward(address);
    const formatted = ethers.formatEther(reward);
    console.log('[Web3] D等级分红查询:', formatted);
    return formatted;
  } catch (error) {
    console.error('[Web3] 查询D等级分红失败:', error);
    return '0';
  }
};

/**
 * 查询合伙人分红
 * @returns { dqReward: string, solReward: string } DQ和SOL分红
 */
export const getPartnerReward = async (): Promise<{ dqReward: string; solReward: string }> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQSTAKE.address, DQSTAKE_ABI);
    const result = await contract.getPartnerReward();
    
    const dqReward = ethers.formatEther(result[0]); // DQ分红
    const solReward = ethers.formatEther(result[1]); // SOL分红
    
    console.log('[Web3] 合伙人分红查询:', { dqReward, solReward });
    return { dqReward, solReward };
  } catch (error) {
    console.error('[Web3] 查询合伙人分红失败:', error);
    return { dqReward: '0', solReward: '0' };
  }
};

// ============ LP 添加/取消 LP ============

/**
 * 获取 SOL 代币授权额度（授权给主合约）
 */
export const getSOLAllowance = async (userAddress: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.SOL.address, DQTOKEN_ABI);
    const allowance = await contract.allowance(userAddress, CONTRACT_ADDRESSES.DQPROJECT.address);
    return ethers.formatEther(allowance);
  } catch (error) {
    console.error('[Web3] 获取 SOL 授权额度失败:', error);
    return '0';
  }
};

/**
 * 授权 SOL 代币给主合约
 */
export const approveSOL = async (
  signer: ethers.Signer,
  amount: string
): Promise<ethers.TransactionResponse> => {
  const solContract = await getSignedContract(CONTRACT_ADDRESSES.SOL.address, DQTOKEN_ABI, signer);
  const amountInWei = ethers.parseUnits(amount, 18);

  console.log('[Web3] 授权 SOL:', amount);

  const tx = await solContract.approve(CONTRACT_ADDRESSES.DQPROJECT.address, amountInWei);
  console.log('[Web3] SOL 授权交易已发送:', tx.hash);

  return tx;
};

/**
 * 添加 LP（入金）- 调用合约的 addLiquidityForUser
 * 流程：SOL -> 一半换 DQ，一半配对加池 -> 获得 LP
 */
export const addLiquidityOnChain = async (
  signer: ethers.Signer,
  solAmount: string,
  minLpAmount: string = '0'
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const amountInWei = ethers.parseUnits(solAmount, 18);
  const minLp = ethers.parseUnits(minLpAmount || '0', 18);

  console.log('[Web3] 添加 LP（入金）:', solAmount, 'SOL');

  const tx = await contract.addLiquidityForUser(amountInWei, minLp);
  console.log('[Web3] LP 添加交易已发送:', tx.hash);

  return tx;
};

/**
 * 取消 LP - 调用合约的 withdrawLP
 */
export const withdrawLPOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);

  console.log('[Web3] 取消 LP');

  const tx = await contract.withdrawLP();
  console.log('[Web3] 取消 LP 交易已发送:', tx.hash);

  return tx;
};

/**
 * 获取用户 LP 份额
 */
export const getUserLPShares = async (userAddress: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQSTAKE.address, DQSTAKE_ABI);
    const shares = await contract.lpS(userAddress);
    return ethers.formatEther(shares);
  } catch (error) {
    console.error('[Web3] 获取 LP 份额失败:', error);
    return '0';
  }
};

/**
 * 获取用户 LP 记录
 */
export const getUserLPRecords = async (userAddress: string): Promise<{ amount: string; depositTime: string }[]> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const index = await contract.userLPIndex(userAddress);
    const records: { amount: string; depositTime: string }[] = [];

    for (let i = 0; i < Number(index); i++) {
      const record = await contract.userLPRecords(userAddress, i);
      records.push({
        amount: ethers.formatEther(record[0]),
        depositTime: new Date(Number(record[1]) * 1000).toISOString(),
      });
    }
    return records;
  } catch (error) {
    console.error('[Web3] 获取 LP 记录失败:', error);
    return [];
  }
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
