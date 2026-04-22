/**
 * ================================================
 *          Web3 / 智能合约交互 Hook
 * ================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { formatEther, parseEther, isAddress } from 'viem';
import { BSC_TESTNET_CONFIG } from '@/config/contracts';

// 导入 ABI
import DQProjectAbi from '@/contracts/DQProject.abi.json';
import { getContractAddress, BEP20_TOKEN_ADDRESS, CARD_INFO, STAKE_PERIODS } from '@/config/contracts';

/**
 * 获取合约地址
 */
export const getContractAddr = () => {
  return getContractAddress();
};

/**
 * 格式化 BEP20 代币数量
 */
export const formatToken = (value: bigint | string | number, decimals = 18) => {
  try {
    const num = typeof value === 'string' ? parseFloat(value as string) : Number(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return '0';
  }
};

/**
 * 解析代币数量
 */
export const parseToken = (value: string, decimals = 18) => {
  try {
    return parseEther(value);
  } catch {
    return BigInt(0);
  }
};

/**
 * 检查是否已连接钱包
 */
export const useWalletStatus = () => {
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const isConnected = !!walletClient;
  const isCorrectChain = chainId === BSC_TESTNET_CONFIG.chainId;
  
  const connectWallet = useCallback(async () => {
    if (switchChain) {
      switchChain({ chainId: BSC_TESTNET_CONFIG.chainId });
    }
  }, [switchChain]);
  
  return {
    isConnected,
    isCorrectChain,
    address: walletClient?.account?.address || null,
    connectWallet,
    chainId,
  };
};

/**
 * 获取用户信息
 */
export const useUserInfo = (address: `0x${string}` | null) => {
  const publicClient = usePublicClient();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = useCallback(async () => {
    if (!address || !publicClient) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await publicClient.readContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'getUser',
        args: [address],
      });
      
      setUserInfo({
        referrer: result[0],
        directCount: Number(result[1]),
        level: Number(result[2]),
        dLevel: Number(result[3]),
        totalInvest: result[4].toString(),
        teamInvest: result[5].toString(),
        energy: result[6].toString(),
        directSales: result[7].toString(),
        hasNode: result[8],
        hasDeposited: result[9],
        activeLineCount: Number(result[10]),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user info');
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  return { userInfo, loading, error, refetch: fetchUserInfo };
};

/**
 * 获取合约余额
 */
export const useContractBalance = () => {
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicClient) return;
    
    setLoading(true);
    try {
      const addr = getContractAddr() as `0x${string}`;
      const balanceOfABI = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ];
      
      const result = await publicClient.readContract({
        address: BEP20_TOKEN_ADDRESS as `0x${string}`,
        abi: balanceOfABI,
        functionName: 'balanceOf',
        args: [addr],
      });
      
      setBalance(result as bigint);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
};

/**
 * 注册
 */
export const useRegister = () => {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (referrer: `0x${string}`) => {
    if (!walletClient) {
      setError('Please connect wallet first');
      return null;
    }

    if (!isAddress(referrer)) {
      setError('Invalid referrer address');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'register',
        args: [referrer],
      });
      
      return hash;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [walletClient]);

  return { register, loading, error };
};

/**
 * 购买节点
 */
export const useBuyNode = () => {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyNode = useCallback(async (cardType: number) => {
    if (!walletClient) {
      setError('Please connect wallet first');
      return null;
    }

    if (cardType < 1 || cardType > 3) {
      setError('Invalid card type');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'buyNode',
        args: [BigInt(cardType)],
      });
      
      return hash;
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [walletClient]);

  return { buyNode, loading, error };
};

/**
 * 入金
 */
export const useDeposit = () => {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(async (amount: string) => {
    if (!walletClient) {
      setError('Please connect wallet first');
      return null;
    }

    const amountWei = parseToken(amount);
    if (amountWei <= BigInt(0)) {
      setError('Invalid amount');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 首先需要授权合约使用代币
      const hash = await walletClient.writeContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'deposit',
        args: [amountWei],
      });
      
      return hash;
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [walletClient]);

  return { deposit, loading, error };
};

/**
 * 出金
 */
export const useWithdraw = () => {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(async (dqAmount: string, minOut: string) => {
    if (!walletClient) {
      setError('Please connect wallet first');
      return null;
    }

    const amountWei = parseToken(dqAmount);
    const minOutWei = parseToken(minOut);
    
    if (amountWei <= BigInt(0)) {
      setError('Invalid amount');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'withdrawDQ',
        args: [amountWei, minOutWei],
      });
      
      return hash;
    } catch (err: any) {
      setError(err.message || 'Withdraw failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [walletClient]);

  return { withdraw, loading, error };
};

/**
 * 检查节点是否达标
 */
export const useNodeQualified = (address: `0x${string}` | null) => {
  const publicClient = usePublicClient();
  const [qualified, setQualified] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkQualified = useCallback(async () => {
    if (!address || !publicClient) return;
    
    setLoading(true);
    try {
      const result = await publicClient.readContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'checkNodeQualified',
        args: [address],
      });
      
      setQualified({
        isQualified: result[0],
        currentLines: Number(result[1]),
        requiredLines: Number(result[2]),
      });
    } catch (err) {
      console.error('Failed to check qualified:', err);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    checkQualified();
  }, [checkQualified]);

  return { qualified, loading, refetch: checkQualified };
};

/**
 * 获取当前最大可入金金额
 */
export const useMaxInvest = () => {
  const publicClient = usePublicClient();
  const [maxInvest, setMaxInvest] = useState<bigint>(BigInt(0));

  const fetchMaxInvest = useCallback(async () => {
    if (!publicClient) return;
    
    try {
      const result = await publicClient.readContract({
        address: getContractAddr() as `0x${string}`,
        abi: DQProjectAbi.abi,
        functionName: 'getCurrentMaxInvest',
      });
      
      setMaxInvest(result as bigint);
    } catch (err) {
      console.error('Failed to fetch max invest:', err);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchMaxInvest();
  }, [fetchMaxInvest]);

  return { maxInvest, refetch: fetchMaxInvest };
};
