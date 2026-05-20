import { useState, useEffect, useCallback } from 'react';
import { getBrowserProvider } from '@/utils/web3';

const isBrowser = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

interface WalletInfo {
  address: string;
  chainId: number;
  provider: any;
  signer: any;
}

export interface UseWalletReturn {
  wallet: WalletInfo | null;
  walletAddress: string | null;
  isConnected: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = (): UseWalletReturn => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!isBrowser) {
      console.warn('非浏览器环境');
      return;
    }

    try {
      const provider = getBrowserProvider();
      if (!provider) {
        console.warn('未检测到钱包');
        return;
      }

      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const signer = await provider.getSigner();

        const walletInfo: WalletInfo = {
          address,
          chainId,
          provider,
          signer,
        };

        setWallet(walletInfo);
        setIsConnected(true);
        console.log('[useWallet] 钱包连接成功:', address);
      }
    } catch (error) {
      console.error('[useWallet] 连接失败:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    const checkConnection = async () => {
      try {
        const provider = getBrowserProvider();
        if (!provider) return;

        const accounts = await window.ethereum!.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const signer = await provider.getSigner();

          setWallet({
            address,
            chainId,
            provider,
            signer,
          });
          setIsConnected(true);
        }
      } catch (error) {
        console.error('[useWallet] 检查连接失败:', error);
      }
    };

    checkConnection();

    // 监听账户变化
    window.ethereum?.on?.('accountsChanged', (accounts: string[]) => {
      if (accounts.length > 0) {
        connect();
      } else {
        setWallet(null);
        setIsConnected(false);
      }
    });

    // 监听链变化
    window.ethereum?.on?.('chainChanged', () => {
      checkConnection();
    });
  }, [connect]);

  return {
    wallet,
    walletAddress: wallet?.address || null,
    isConnected,
    chainId: wallet?.chainId || null,
    connect,
    disconnect,
  };
};
