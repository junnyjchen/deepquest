/**
 * Web3 工具库 - 钱包连接和链上交互
 */
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESSES,
  DQPROJECT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
} from '../config/contracts';

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
 * 获取签名者
 */
export const getSigner = async (): Promise<ethers.Signer | null> => {
  const provider = getBrowserProvider();
  if (!provider) {
    return null;
  }
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('[Web3] 获取签名者失败:', error);
    return null;
  }
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

type StakeContractRole = 'core' | 'mine' | 'vault';

const STAKE_CONTRACTS: Record<StakeContractRole, { address: string; abi: any[] }> = {
  core: {
    address: CONTRACT_ADDRESSES.DQSTAKE.address,
    abi: DQSTAKE_ABI,
  },
  mine: {
    address: CONTRACT_ADDRESSES.DQSTAKEMINE.address,
    abi: DQSTAKEMINE_ABI,
  },
  vault: {
    address: CONTRACT_ADDRESSES.DQSTAKEVAULT.address,
    abi: DQSTAKEVAULT_ABI,
  },
};

const getStakeContractByRole = (
  role: StakeContractRole,
  provider?: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract => {
  const { address, abi } = STAKE_CONTRACTS[role];
  return getContract(address, abi, provider);
};

const getSignedStakeContractByRole = async (
  role: StakeContractRole,
  signer: ethers.Signer
): Promise<ethers.Contract> => {
  const { address, abi } = STAKE_CONTRACTS[role];
  return getSignedContract(address, abi, signer);
};

const getStakeCoreContract = (
  provider?: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract => getStakeContractByRole('core', provider);

const getStakeMineContract = (
  provider?: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract => getStakeContractByRole('mine', provider);

const getStakeVaultContract = (
  provider?: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract => getStakeContractByRole('vault', provider);

const getSignedStakeVaultContract = async (
  signer: ethers.Signer
): Promise<ethers.Contract> => getSignedStakeContractByRole('vault', signer);

const getSignedStakeCoreContract = async (
  signer: ethers.Signer
): Promise<ethers.Contract> => getSignedStakeContractByRole('core', signer);


// ============ DQProject 合约交互 ============

/**
 * 获取用户信息（从链上）
 */
export const getUserFromChain = async (userAddress: string) => {
  const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);

  try {
    // 最新 getUser 返回 5 个字段：
    // (referrer, directCount, level, totalInvest, childrenCount)
    // 当前前端暂未使用 childrenCount。
    const [
      referrer,
      directCount,
      level,
      totalInvest,
      _childrenCount,
    ] = await contract.getUser(userAddress);

    // const owner = await contract.owner();

    // 未注册判定：referrer=0 且 不是 owner
    const isRegistered = referrer !== ethers.ZeroAddress;

    if (!isRegistered) return null;

    return {
      referrer,
      directCount: Number(directCount),
      level: Number(level),
      totalInvest: ethers.formatEther(totalInvest),
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
    const [min, max] = await Promise.all([
      contract.INVEST_MIN(),
      contract.currentDepositLimit(),
    ]);

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
    const diagStakeContract = getStakeCoreContract();
    const [userRes, dqCardAddr, userEnergyRaw] = await Promise.all([
      contract.getUser(userAddress),
      contract.dqCard().catch(() => CONTRACT_ADDRESSES.DQCARD.address),
      diagStakeContract.getEnergy(userAddress).catch(() => 0n),
    ]);

    const referrer = String(userRes?.[0] || ethers.ZeroAddress);
    if (!referrer || referrer === ethers.ZeroAddress) {
      return '入金失败：合约内部发生了整数下溢（Panic 0x11），但当前账户没有可用的上级关系信息。优先检查链上部署是否还是旧版 DQMining 合约。';
    }

    const cardContract = getContract(dqCardAddr, DQCARD_ABI);
    const [referrerEnergyRaw, referrerNftBalance] = await Promise.all([
      diagStakeContract.getEnergy(referrer).catch(() => 0n),
      cardContract.balanceOf(referrer).catch(() => 0n),
    ]);

    const referrerEnergy = BigInt(referrerEnergyRaw?.toString?.() ?? referrerEnergyRaw ?? 0);
    const userEnergy = BigInt(userEnergyRaw?.toString?.() ?? userEnergyRaw ?? 0);
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
  const provider = signer.provider;

  console.log('[Web3] 链上入金:', amount, 'BNB');

  // ── 预检查：把常见 payable 入金失败原因提前暴露出来 ──
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
        contract.currentDepositLimit().catch(() => 0n),
      ]);
      if (typeof daily === 'bigint' && typeof limit === 'bigint' && daily + amountInWei > limit) {
        throw new Error(
          `入金失败：超过当日限额（!lim），已入金=${ethers.formatEther(daily)}，限额=${ethers.formatEther(limit)}`
        );
      }
    }

    if (!provider) {
      throw new Error('入金失败：钱包 provider 不可用');
    }

    const nativeBalance = await provider.getBalance(userAddress).catch(() => 0n);
    if (typeof nativeBalance === 'bigint' && nativeBalance < amountInWei) {
      throw new Error(`入金失败：BNB 余额不足（bal=${ethers.formatEther(nativeBalance)}）`);
    }
  } catch (preflightError) {
    console.error('[Web3] 入金预检查失败:', preflightError);
    throw preflightError;
  }

  try {
    await contract.deposit.staticCall({ value: amountInWei });
  } catch (error) {
    console.error('[Web3] deposit staticCall 失败:', error);
    throw error;
  }

  const tx = await contract.deposit({ value: amountInWei });
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
  const contract = await getSignedStakeVaultContract(signer);
  const amountInWei = ethers.parseEther(amount);
  const userAddress = (await signer.getAddress()).toLowerCase();

  console.log('[Web3] 链上质押 DQ:', amount, 'level:', periodIndex);

  try {
    const dqContract = getContract(CONTRACT_ADDRESSES.DQTOKEN.address, DQTOKEN_ABI);
    const [balance, allowance] = await Promise.all([
      dqContract.balanceOf(userAddress).catch(() => 0n),
      dqContract.allowance(userAddress, CONTRACT_ADDRESSES.DQSTAKEVAULT.address).catch(() => 0n),
    ]);

    if (periodIndex < 0 || periodIndex > 3) {
      throw new Error('质押失败：质押等级无效（0-3）');
    }
    if (typeof balance === 'bigint' && balance < amountInWei) {
      throw new Error(`质押失败：DQ 余额不足（bal=${ethers.formatEther(balance)}）`);
    }
    if (typeof allowance === 'bigint' && allowance < amountInWei) {
      throw new Error(`质押失败：DQ 授权额度不足，请先授权 Vault（allow=${ethers.formatEther(allowance)}）`);
    }
  } catch (preflightError) {
    console.error('[Web3] 质押 DQ 预检查失败:', preflightError);
    throw preflightError;
  }

  try {
    await contract.stake.staticCall(periodIndex, amountInWei);
  } catch (error) {
    console.error('[Web3] stake staticCall 失败:', error);
    throw error;
  }

  const tx = await contract.stake(periodIndex, amountInWei);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

export interface ChainStakeRecord {
  recordIndex: number;
  amount: string;
  startTime: number;
  duration: number;
  pendingReward: string;
  active: boolean;
  canUnstake: boolean;
}

/**
 * 获取当前用户链上质押记录
 */
export const getStakeRecordsFromChain = async (userAddress: string): Promise<ChainStakeRecord[]> => {
  try {
    const contract = getStakeVaultContract();
    const [[amounts, times, pendingRewards], durations] = await Promise.all([
      contract.getStakeInfo(userAddress),
      Promise.all([0, 1, 2, 3].map((level) => contract.stakeDurations(level))),
    ]);

    const now = Math.floor(Date.now() / 1000);
    const records = amounts
      .map((amount: bigint, index: number) => {
        const startTime = Number(times[index]);
        const duration = Number(durations[index]);
        const active = BigInt(amount) > 0n;

        return {
          recordIndex: index,
          amount: ethers.formatEther(amount),
          startTime,
          duration,
          pendingReward: ethers.formatEther(pendingRewards[index]),
          active,
          canUnstake: active && startTime > 0 && now >= startTime + duration,
        } satisfies ChainStakeRecord;
      })
      .filter((record) => record.active);

    return records;
  } catch (error) {
    console.error('[Web3] 获取链上质押记录失败:', error);
    return [];
  }
};

/**
 * 解押 DQ（链上）
 */
export const unstakeDQOnChain = async (
  signer: ethers.Signer,
  recordIndex: number
): Promise<ethers.TransactionResponse> => {
  const userAddress = await signer.getAddress();
  const stakeContract = await getSignedStakeVaultContract(signer);

  try {
    const [amounts, times] = await stakeContract.getStakeInfo(userAddress);
    const amount = BigInt(amounts[recordIndex] ?? 0n);
    const startTime = Number(times[recordIndex] ?? 0n);
    const duration = Number(await stakeContract.stakeDurations(recordIndex));
    const active = amount > 0n;
    const canUnstake = active && startTime > 0 && Math.floor(Date.now() / 1000) >= startTime + duration;

    if (!active) {
      throw new Error('该质押记录已解押');
    }
    if (!canUnstake) {
      throw new Error('该质押记录尚未到期，暂不可解押');
    }

    try {
      await stakeContract.unstake.staticCall(recordIndex, amount);
    } catch (error) {
      console.error('[Web3] unstake staticCall 失败:', error);
      throw error;
    }

    const tx = await stakeContract.unstake(recordIndex, amount);
    console.log('[Web3] 解押交易已发送:', tx.hash);
    return tx;
  } catch (preflightError) {
    console.error('[Web3] 解押预检查失败:', preflightError);
    throw preflightError;
  }
};

/**
 * 从 StakeVault 领取 LP 奖励（Vault 合约入口）
 */
export const claimLPRewardFromVaultOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeVaultContract(signer);

  console.log('[Web3] 通过 StakeVault 领取 LP 奖励');

  const tx = await contract.claimLPReward();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 从 StakeVault 领取等级质押奖励（Vault 合约入口）
 */
export const claimStakeRewardFromVaultOnChain = async (
  signer: ethers.Signer,
  level: number
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeVaultContract(signer);

  console.log('[Web3] 通过 StakeVault 领取等级质押奖励，等级:', level);

  const tx = await contract.claimStakeReward(level);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

export interface StakeMineLPEquityInfo {
  stakedLP: string;
  equityLP: string;
  totalEquity: string;
  walletLP: string;
}

/**
 * 获取 StakeMine 中的 LP 权益信息
 */
export const getStakeMineLPEquityInfo = async (
  userAddress: string
): Promise<StakeMineLPEquityInfo | null> => {
  try {
    const contract = getStakeMineContract();
    const [stakedLP, equityLP, totalEquity, walletLP] = await contract.getLPEquityInfo(userAddress);

    return {
      stakedLP: ethers.formatEther(stakedLP),
      equityLP: ethers.formatEther(equityLP),
      totalEquity: ethers.formatEther(totalEquity),
      walletLP: ethers.formatEther(walletLP),
    };
  } catch (error) {
    console.error('[Web3] 获取 StakeMine LP 权益信息失败:', error);
    return null;
  }
};

/**
 * 获取 StakeMine 中待领取的 LP 权益奖励
 */
export const getStakeMineLPEquityPending = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeMineContract();
    const pending = await contract.getLPEquityPending(userAddress);
    return ethers.formatEther(pending);
  } catch (error) {
    console.error('[Web3] 获取 StakeMine LP 权益奖励失败:', error);
    return '0';
  }
};

/**
 * 领取 LP 奖励（链上）
 */
export const claimLPOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeVaultContract(signer);

  console.log('[Web3] 通过 StakeVault 领取 LP 奖励');

  const tx = await contract.claimLPReward();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 授权 DQ Token 给 StakeVault（用于单币质押）
 */
export const approveDQToken = async (
  signer: ethers.Signer,
  amount: string
): Promise<ethers.TransactionResponse> => {
  const dqContract = await getSignedContract(CONTRACT_ADDRESSES.DQTOKEN.address, DQTOKEN_ABI, signer);
  const amountInWei = ethers.parseEther(amount);

  console.log('[Web3] 授权 DQ Token 给 StakeVault:', amount);

  const tx = await dqContract.approve(CONTRACT_ADDRESSES.DQSTAKEVAULT.address, amountInWei);
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
    const allowance = await contract.allowance(userAddress, CONTRACT_ADDRESSES.DQSTAKEVAULT.address);
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
  void signer;
  void dqAmount;
  void minSolAmount;
  throw new Error('当前新版合约未提供 sellDQForSOL 主合约入口，DQ 卖出改为代币合约税制交易，不再通过 web3.ts 手动调用。');
};

/**
 * 领取 NFT 奖励（链上）
 */
export const claimNFTOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeCoreContract(signer);
  const userAddress = await signer.getAddress();

  const nodeLevel = Number(await contract.getUserNodeLevel(userAddress).catch(() => 0));
  if (nodeLevel <= 0) {
    throw new Error('当前地址没有可领取节点奖励的节点等级');
  }

  console.log('[Web3] 通过 StakeCore 领取节点奖励（当前奖励池为 A 桶）');

  const tx = await contract.claimNodeReward(0);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取 D 团队奖励（链上）
 */
export const claimDTeamOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeCoreContract(signer);

  console.log('[Web3] 通过 StakeCore 领取 D 等级奖励');

  const tx = await contract.claimDRankReward();
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取合伙人奖励（链上）
 */
export const claimPartnerOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  void signer;
  throw new Error('当前 ABI 未提供用户侧 claimPartnerReward/claimPartnerOnChain 方法');
};

/**
 * 领取 SOL 奖励（链上）
 */
export const claimSOLOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const userAddress = await signer.getAddress();
  const stakeContract = getStakeCoreContract();
  const pending = await stakeContract.getPendingSOL(userAddress).catch(() => 0n);

  if (BigInt(pending) <= 0n) {
    throw new Error('当前没有可领取的 SOL 奖励');
  }

  console.log('[Web3] 通过 DQMCore 提取 SOL 奖励（直推+见点+管理）');

  const tx = await contract.withdrawSOL(pending);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 领取节点手续费分红（链上）
 */
export const claimFeeOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  void signer;
  throw new Error('当前新版合约未提供独立的 claimFee 入口，旧版节点手续费分红接口已废弃。');
};

/**
 * 领取所有爆块奖励（LP+节点+D等级）（链上）
 */
export const claimBlockDQOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  void signer;
  throw new Error('当前新版合约未提供用户侧 claimBlockDQ 入口，爆块奖励已拆分为 LP/节点/D 等级不同领取路径。');
};

/**
 * 提取质押奖励（链上）
 * @param signer 签名者
 * @param periodIndex 质押周期索引
 */
export const withdrawDQRewardOnChain = async (
  signer: ethers.Signer,
  periodIndex: number
): Promise<ethers.TransactionResponse> => {
  console.log('[Web3] 新版合约中质押奖励为单步领取，直接调用 Vault.claimStakeReward，等级:', periodIndex);
  return claimStakeRewardOnChain(signer, periodIndex);
};

/**
 * 领取质押奖励（链上）
 * @param signer 签名者
 * @param periodIndex 质押等级索引
 */
export const claimStakeRewardOnChain = async (
  signer: ethers.Signer,
  periodIndex: number
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedStakeVaultContract(signer);

  console.log('[Web3] 通过 StakeVault 领取单币质押奖励，等级:', periodIndex);

  const tx = await contract.claimStakeReward(periodIndex);
  console.log('[Web3] 交易已发送:', tx.hash);

  return tx;
};

/**
 * 获取待领取直推 SOL 奖励（从 DQSTAKE 合约读取 getPendingSOL）
 */
export const getPendingReward = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeCoreContract();
    const pending = await contract.getPendingSOL(userAddress);
    return ethers.formatEther(pending);
  } catch (error) {
    console.error('[Web3] 获取待领取直推奖励失败:', error);
    return '0';
  }
};

/**
 * 获取待领取节点手续费分红（SOL）
 * 新版合约已移除独立 feePool 口径，保留兼容返回 0
 */
export const getPendingFee = async (userAddress: string): Promise<string> => {
  void userAddress;
  return '0';
};

/**
 * 获取已积累的爆块 DQ 奖励（LP/NFT/D等级 积累后待提取，从 DQSTAKE userBlockDQ 读取）
 */
export const getPendingBlockReward = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeCoreContract();
    const pending = await contract.userBlockDQ(userAddress);
    return ethers.formatEther(pending);
  } catch (error) {
    console.error('[Web3] 获取待领取爆块奖励失败:', error);
    return '0';
  }
};

/**
 * 获取待领取质押奖励（DQ），使用 DQSTAKE getStk 返回实时 + 已积累总量
 */
export const getPendingStakeReward = async (userAddress: string, periodIndex: number): Promise<string> => {
  try {
    const contract = getStakeVaultContract();
    const [, , pendingRewards] = await contract.getStakeInfo(userAddress);
    return ethers.formatEther(pendingRewards[periodIndex] ?? 0n);
  } catch (error) {
    console.error('[Web3] 获取待领取质押奖励失败:', error);
    return '0';
  }
};

/**
 * 获取用户团队业绩（从质押合约）
 */
export const getUserTeamInvest = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeCoreContract();
    const value = await contract.getTeamSales(userAddress);
    return ethers.formatEther(value);
  } catch (error) {
    console.error('[Web3] 获取团队业绩失败:', error);
    return '0.0';
  }
};

/**
 * 获取用户可用能量值（从 DQMCore 合约）
 */
export const getUserEnergy = async (userAddress: string): Promise<string> => {
  try {
    const contract = getContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI);
    const value = await contract.getAvailableEnergy(userAddress);
    return ethers.formatEther(value);
  } catch (error) {
    console.error('[Web3] 获取用户能量失败:', error);
    return '0.0';
  }
};

/**
 * 获取用户 D 等级（从质押合约）
 */
export const getUserDLevel = async (userAddress: string): Promise<number | null> => {
  try {
    const contract = getStakeCoreContract();
    const value = await contract.userDLevel(userAddress);
    return Number(value);
  } catch (error) {
    console.error('[Web3] 获取用户 D 等级失败:', error);
    return null;
  }
};

/**
 * 获取待领取 SOL 金额（从 DQSTAKE 合约读取）
 */
export const getPendingSOL = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeCoreContract();
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

  console.log('[Web3] 授权 USDT 给 DQCard:', amount);

  const tx = await usdtContract.approve(CONTRACT_ADDRESSES.DQCARD.address, amountInWei);
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
    const allowance = await contract.allowance(userAddress, CONTRACT_ADDRESSES.DQCARD.address);
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
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQCARD.address, DQCARD_ABI, signer);

  console.log('[Web3] 通过 DQCard 购买 Node:', 'CardType:', cardType);

  const tx = await contract.buyCard(cardType);
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
    const contract = getStakeCoreContract();
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
    const stakeContract = getStakeCoreContract();
    const nodeLevel = Number(await stakeContract.getUserNodeLevel(address));
    if (nodeLevel <= 0) {
      return '0';
    }

    const [accReward, claimedReward] = await Promise.all([
      stakeContract.nA(0),
      stakeContract.userNftF(address, 0),
    ]);

    const reward = BigInt(accReward) > BigInt(claimedReward)
      ? BigInt(accReward) - BigInt(claimedReward)
      : 0n;

    return ethers.formatEther(reward);
    
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
    const contract = getStakeCoreContract();
    const dLevel = Number(await contract.userDLevel(address));
    if (dLevel <= 0) return '0';

    const [rewardAcc, count, debt] = await Promise.all([
      contract.dLevelAccReward(dLevel - 1),
      contract.dLevelCount(dLevel - 1),
      contract.dLevelRewardDebt(address),
    ]);

    if (BigInt(count) <= 0n) return '0';

    const rewardPerUser = BigInt(rewardAcc) / BigInt(count);
    const reward = rewardPerUser > BigInt(debt) ? rewardPerUser - BigInt(debt) : 0n;
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
    console.warn('[Web3] 当前 ABI 未提供 getPartnerReward 查询方法');
    return { dqReward: '0', solReward: '0' };
  } catch (error) {
    console.error('[Web3] 查询合伙人分红失败:', error);
    return { dqReward: '0', solReward: '0' };
  }
};

// ============ LP 添加/取消 LP ============

/**
 * 获取 SOL 代币授权额度（旧版兼容字段，仍查询主合约）
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
 * 新版原生入金不依赖该授权，保留仅作旧界面兼容
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
 * 添加 LP（入金）
 * 新版通过 DQMCore.deposit 自动完成换币和加池
 */
export const addLiquidityOnChain = async (
  signer: ethers.Signer,
  solAmount: string,
  minLpAmount: string = '0'
): Promise<ethers.TransactionResponse> => {
  const contract = await getSignedContract(CONTRACT_ADDRESSES.DQPROJECT.address, DQPROJECT_ABI, signer);
  const amountInWei = ethers.parseUnits(solAmount, 18);

  console.log('[Web3] 添加 LP（新版通过 DQMCore.deposit 自动完成）:', solAmount, 'BNB', 'minLp 参数未在当前合约使用:', minLpAmount);

  const tx = await contract.deposit({ value: amountInWei });
  console.log('[Web3] LP 添加交易已发送:', tx.hash);

  return tx;
};

/**
 * 取消 LP
 * 新版兼容实现为提取当前地址全部 LP 份额
 */
export const withdrawLPOnChain = async (
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> => {
  const userAddress = await signer.getAddress();
  const stakeReadContract = getStakeCoreContract();
  const contract = await getSignedStakeCoreContract(signer);
  const lpAmount = await stakeReadContract.getLP(userAddress).catch(() => 0n);

  if (BigInt(lpAmount) <= 0n) {
    throw new Error('当前没有可提取的 LP 份额');
  }

  console.log('[Web3] 从 StakeCore 提取全部 LP');

  const tx = await contract.withdrawLP(lpAmount);
  console.log('[Web3] 取消 LP 交易已发送:', tx.hash);

  return tx;
};

/**
 * 获取用户 LP 份额
 */
export const getUserLPShares = async (userAddress: string): Promise<string> => {
  try {
    const contract = getStakeCoreContract();
    const shares = await contract.getLP(userAddress);
    return ethers.formatEther(shares);
  } catch (error) {
    console.error('[Web3] 获取 LP 份额失败:', error);
    return '0';
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
