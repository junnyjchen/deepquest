'use client';

import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Linking } from 'react-native';
import { Screen } from '@/components/Screen';
import { dappApi } from '@/utils/api';
import { formatAddress } from '@/utils/formatters';
import {
  connectWallet,
  disconnectWallet,
  isMetaMaskInstalled,
  switchToBSC,
  registerUserOnChain,
  depositSOLOnChain,
  claimLPOnChain,
  claimNFTOnChain,
  claimDTeamOnChain,
  getUserFromChain,
  waitForTransaction,
  onAccountsChanged,
  onChainChanged,
} from '@/utils/web3';
import type { ethers } from 'ethers';

interface WalletState {
  address: string;
  chainId: number;
  chainName: string;
}

interface PlatformStats {
  totalUsers: number;
  todayDeposit: string;
  networkPower: string;
  usdtPoolBalance: string;
  dqtPoolBalance: string;
}

interface UserData {
  referrer: string;
  directCount: number;
  level: number;
  totalInvest: string;
  teamInvest: string;
  pendingLP: string;
  pendingNFT: string;
  pendingDTeam: string;
}

const CHAIN_NAMES: Record<number, string> = {
  56: 'BNB Chain Mainnet',
  97: 'BNB Chain Testnet',
  1: 'Ethereum',
  5: 'Goerli Testnet',
};

export default function DAppPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'deposit' | 'team' | 'nft'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 平台数据
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  // 用户数据
  const [userData, setUserData] = useState<UserData | null>(null);
  const [referrerInput, setReferrerInput] = useState('');

  // 加载平台统计
  const loadPlatformStats = useCallback(async () => {
    try {
      const res = await dappApi.getStats();
      if (res.code === 0) {
        setPlatformStats(res.data);
      }
    } catch (err) {
      console.error('加载平台统计失败:', err);
    }
  }, []);

  // 加载用户链上数据
  const loadUserChainData = useCallback(async () => {
    if (!wallet?.address) return;

    try {
      const chainUser = await getUserFromChain(wallet.address);
      if (chainUser) {
        setUserData({
          ...chainUser,
          pendingLP: '0',
          pendingNFT: '0',
          pendingDTeam: '0',
        });
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.error('加载用户数据失败:', err);
    }
  }, [wallet?.address]);

  // 初始化
  useEffect(() => {
    loadPlatformStats();

    // 监听账户变化
    onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWallet(null);
        setUserData(null);
      } else {
        // 尝试重新连接
        handleConnect();
      }
    });

    // 监听链变化
    onChainChanged(() => {
      // 刷新页面数据
      loadPlatformStats();
      loadUserChainData();
    });

    return () => {
      disconnectWallet();
    };
  }, [loadPlatformStats, loadUserChainData]);

  // 每次钱包变化时加载用户数据
  useEffect(() => {
    if (wallet?.address) {
      loadUserChainData();
    }
  }, [wallet?.address, loadUserChainData]);

  // 连接钱包
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // 检查 MetaMask
      if (!isMetaMaskInstalled()) {
        if (Platform.OS === 'web') {
          setError('请安装 MetaMask 钱包');
          // 打开 MetaMask 下载页面
          Linking.openURL('https://metamask.io/download/');
        } else {
          setError('请使用浏览器访问并安装 MetaMask');
        }
        return;
      }

      // 连接钱包
      const result = await connectWallet();

      if (result) {
        // 检查链 ID
        if (result.chainId !== 56 && result.chainId !== 97) {
          await switchToBSC();
          // 重新获取网络信息
          const newProvider = result.provider;
          const network = await newProvider.getNetwork();
          const newChainId = Number(network.chainId);

          setWallet({
            address: result.address,
            chainId: newChainId,
            chainName: CHAIN_NAMES[newChainId] || `Chain ${newChainId}`,
          });
        } else {
          setWallet({
            address: result.address,
            chainId: result.chainId,
            chainName: CHAIN_NAMES[result.chainId] || `Chain ${result.chainId}`,
          });
        }

        // 同步到后端
        await syncWalletToBackend(result.address);
      }
    } catch (err: any) {
      console.error('连接钱包失败:', err);
      setError(err.message || '连接失败');
    } finally {
      setIsConnecting(false);
    }
  };

  // 断开钱包
  const handleDisconnect = () => {
    disconnectWallet();
    setWallet(null);
    setUserData(null);
    setTxHash(null);
  };

  // 同步钱包到后端
  const syncWalletToBackend = async (address: string) => {
    try {
      await dappApi.register({ wallet_address: address });
      console.log('钱包已同步到后端');
    } catch (err) {
      console.error('同步钱包失败:', err);
    }
  };

  // 注册用户
  const handleRegister = async () => {
    if (!wallet) {
      setError('请先连接钱包');
      return;
    }

    if (!referrerInput.trim()) {
      setError('请输入推荐人地址');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(referrerInput.trim())) {
      setError('推荐人地址格式不正确');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // 1. 链上注册
      const tx = await registerUserOnChain(null as any, referrerInput.trim());
      setTxHash(tx.hash);
      await waitForTransaction(tx);

      // 2. 同步到后端
      await dappApi.register({
        wallet_address: wallet.address,
        referrer_address: referrerInput.trim(),
      });

      // 3. 刷新用户数据
      await loadUserChainData();
      await loadPlatformStats();

      setReferrerInput('');
    } catch (err: any) {
      console.error('注册失败:', err);
      setError(err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 质押
  const handleDeposit = async (amount: string) => {
    if (!wallet) {
      setError('请先连接钱包');
      return;
    }

    if (!userData) {
      setError('请先完成注册');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // 1. 链上质押
      const tx = await depositSOLOnChain(null as any, amount);
      setTxHash(tx.hash);
      await waitForTransaction(tx);

      // 2. 同步到后端
      await dappApi.deposit({
        wallet_address: wallet.address,
        amount,
        tx_hash: tx.hash,
      });

      // 3. 刷新用户数据
      await loadUserChainData();
      await loadPlatformStats();
    } catch (err: any) {
      console.error('质押失败:', err);
      setError(err.message || '质押失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 领取 LP 奖励
  const handleClaimLP = async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await claimLPOnChain(null as any);
      setTxHash(tx.hash);
      await waitForTransaction(tx);

      await dappApi.claimLP({
        wallet_address: wallet.address,
        tx_hash: tx.hash,
      });

      await loadUserChainData();
    } catch (err: any) {
      setError(err.message || '领取失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 领取 NFT 奖励
  const handleClaimNFT = async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await claimNFTOnChain(null as any);
      setTxHash(tx.hash);
      await waitForTransaction(tx);

      await dappApi.claimNFT({
        wallet_address: wallet.address,
        tx_hash: tx.hash,
      });

      await loadUserChainData();
    } catch (err: any) {
      setError(err.message || '领取失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 领取 D 团队奖励
  const handleClaimDTeam = async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await claimDTeamOnChain(null as any);
      setTxHash(tx.hash);
      await waitForTransaction(tx);

      await dappApi.claimDTeam({
        wallet_address: wallet.address,
        tx_hash: tx.hash,
      });

      await loadUserChainData();
    } catch (err: any) {
      setError(err.message || '领取失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染钱包按钮
  const renderWalletButton = () => {
    if (isConnecting) {
      return (
        <TouchableOpacity style={styles.connectBtn} disabled>
          <ActivityIndicator color="#fff" />
          <Text style={styles.connectBtnText}>连接中...</Text>
        </TouchableOpacity>
      );
    }

    if (wallet) {
      return (
        <TouchableOpacity style={styles.walletBtn} onPress={handleDisconnect}>
          <Text style={styles.walletAddress}>{formatAddress(wallet.address)}</Text>
          <Text style={styles.walletChain}>{wallet.chainName}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
        <Text style={styles.connectBtnText}>连接钱包</Text>
      </TouchableOpacity>
    );
  };

  // 渲染首页
  const renderHome = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 平台统计 */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>平台数据</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{platformStats?.totalUsers || '--'}</Text>
            <Text style={styles.statLabel}>总用户</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{platformStats?.todayDeposit || '--'}</Text>
            <Text style={styles.statLabel}>今日入单(BNB)</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{platformStats?.networkPower || '--'}</Text>
            <Text style={styles.statLabel}>全网算力</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{platformStats?.usdtPoolBalance || '--'}</Text>
            <Text style={styles.statLabel}>USDT池</Text>
          </View>
        </View>
      </View>

      {/* 用户数据 */}
      {wallet && userData && (
        <View style={styles.userCard}>
          <Text style={styles.cardTitle}>我的数据</Text>
          <View style={styles.userInfo}>
            <View style={styles.userRow}>
              <Text style={styles.userLabel}>等级</Text>
              <Text style={styles.userValue}>LV.{userData.level}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.userLabel}>直推人数</Text>
              <Text style={styles.userValue}>{userData.directCount}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.userLabel}>总投入</Text>
              <Text style={styles.userValue}>{userData.totalInvest} BNB</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.userLabel}>团队业绩</Text>
              <Text style={styles.userValue}>{userData.teamInvest} BNB</Text>
            </View>
          </View>
        </View>
      )}

      {/* 注册入口 */}
      {wallet && !userData && (
        <View style={styles.registerCard}>
          <Text style={styles.cardTitle}>完成注册</Text>
          <Text style={styles.registerDesc}>输入推荐人地址完成链上注册</Text>
          <View style={styles.inputContainer}>
            <input
              type="text"
              placeholder="推荐人地址 (0x...)"
              value={referrerInput}
              onChange={(e) => setReferrerInput(e.target.value)}
              style={styles.input}
            />
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>注册</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // 渲染充值页
  const renderDeposit = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {!wallet ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>请先连接钱包</Text>
        </View>
      ) : !userData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>请先完成注册</Text>
        </View>
      ) : (
        <>
          <View style={styles.depositCard}>
            <Text style={styles.cardTitle}>质押 BNB</Text>
            <Text style={styles.depositDesc}>质押 BNB 获取算力和奖励</Text>
            <View style={styles.amountButtons}>
              {['1', '5', '10'].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.amountBtn}
                  onPress={() => handleDeposit(amount)}
                  disabled={isLoading}
                >
                  <Text style={styles.amountBtnText}>{amount} BNB</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.claimCard}>
            <Text style={styles.cardTitle}>领取奖励</Text>
            <View style={styles.claimButtons}>
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={handleClaimLP}
                disabled={isLoading}
              >
                <Text style={styles.claimBtnText}>领取 LP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={handleClaimNFT}
                disabled={isLoading}
              >
                <Text style={styles.claimBtnText}>领取 NFT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={handleClaimDTeam}
                disabled={isLoading}
              >
                <Text style={styles.claimBtnText}>D团队</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  // 渲染团队页
  const renderTeam = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {!wallet ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>请先连接钱包</Text>
        </View>
      ) : !userData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>请先完成注册</Text>
        </View>
      ) : (
        <View style={styles.teamCard}>
          <Text style={styles.cardTitle}>我的团队</Text>
          <View style={styles.teamInfo}>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>推荐人</Text>
              <Text style={styles.teamValue}>
                {userData.referrer ? formatAddress(userData.referrer) : '--'}
              </Text>
            </View>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>直推人数</Text>
              <Text style={styles.teamValue}>{userData.directCount}</Text>
            </View>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>团队业绩</Text>
              <Text style={styles.teamValue}>{userData.teamInvest} BNB</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  // 渲染 NFT 页
  const renderNFT = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.nftCard}>
        <Text style={styles.cardTitle}>Node NFT</Text>
        <Text style={styles.nftDesc}>购买 Node NFT 获取额外奖励</Text>
        <View style={styles.nftCards}>
          <View style={styles.nftItem}>
            <Text style={styles.nftName}>A 级节点</Text>
            <Text style={styles.nftPrice}>100 BNB</Text>
          </View>
          <View style={styles.nftItem}>
            <Text style={styles.nftName}>B 级节点</Text>
            <Text style={styles.nftPrice}>500 BNB</Text>
          </View>
          <View style={styles.nftItem}>
            <Text style={styles.nftName}>C 级节点</Text>
            <Text style={styles.nftPrice}>2000 BNB</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} disabled>
          <Text style={styles.actionBtnText}>即将上线</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>DeepQuest</Text>
          {renderWalletButton()}
        </View>

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={styles.errorClose}>关闭</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 交易哈希 */}
        {txHash && (
          <View style={styles.txBanner}>
            <Text style={styles.txText}>交易已发送</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`https://bscscan.com/tx/${txHash}`)}>
              <Text style={styles.txLink}>查看详情</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 导航 */}
        <View style={styles.tabNav}>
          {[
            { key: 'home', label: '首页' },
            { key: 'deposit', label: '质押' },
            { key: 'team', label: '团队' },
            { key: 'nft', label: 'NFT' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab 内容 */}
        {activeTab === 'home' && renderHome()}
        {activeTab === 'deposit' && renderDeposit()}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'nft' && renderNFT()}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#12121a',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  walletBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00f0ff',
  },
  walletAddress: {
    color: '#00f0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  walletChain: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  connectBtn: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  errorClose: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 8,
  },
  txBanner: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txText: {
    color: '#000',
    fontSize: 13,
  },
  txLink: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#12121a',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00f0ff',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#00f0ff',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  statValue: {
    color: '#00f0ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userInfo: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  userLabel: {
    color: '#666',
    fontSize: 14,
  },
  userValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  registerCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
  },
  registerDesc: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    width: '100%',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#00f0ff',
  },
  actionBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  depositCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  depositDesc: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  amountButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  amountBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  amountBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  claimCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
  },
  claimButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  claimBtn: {
    flex: 1,
    backgroundColor: '#00ff88',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  teamCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
  },
  teamInfo: {
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  teamLabel: {
    color: '#666',
    fontSize: 14,
  },
  teamValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  nftCard: {
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 16,
  },
  nftDesc: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  nftCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nftItem: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  nftName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  nftPrice: {
    color: '#00f0ff',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
  },
});
