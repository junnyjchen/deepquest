import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  claimSOLOnChain,
  claimLPOnChain,
  claimNFTOnChain,
  claimDTeamOnChain,
  claimFeeOnChain,
  claimBlockDQOnChain,
  withdrawDQRewardOnChain,
  getPendingReward,
  getPendingSOL,
  getPendingFee,
  getPendingBlockReward,
  getPendingStakeReward,
  getSigner,
  waitForTransaction,
} from '@/utils/web3';
import { ethers } from 'ethers';
import { dappUserApi } from '@/utils/api';

// ============ 样式定义 ============
const COLORS = {
  solBg: 'rgba(20, 40, 60, 0.6)',
  solBorder: '#00D9FF',
  solAccent: '#00D9FF',
  dqBg: 'rgba(40, 20, 60, 0.6)',
  dqBorder: '#B366FF',
  dqAccent: '#B366FF',
  cardBg: 'rgba(26, 26, 48, 0.95)',
  cardBg2: 'rgba(26, 26, 48, 0.8)',
  cardBgTrans: 'rgba(26, 26, 48, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  success: '#00FF88',
  warning: '#FFD700',
};

export default function RewardsScreen() {
  // @ts-ignore - 兼容多种导入方式
  const { user, userId, wallet, isConnected, account, chainId } = useWallet?.() || useWeb3React?.() || {};
  const { t } = useLanguage();
  const router = useSafeRouter();

  // 状态
  const [activeTab, setActiveTab] = useState<'rewards' | 'withdrawals'>('rewards');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // 奖励数据
  const [solRewards, setSolRewards] = useState<{
    directReferral: string;
    fee: string;
  }>({ directReferral: '0', fee: '0' });

  const [dqRewards, setDqRewards] = useState<{
    lp: string;
    nft: string;
    dTeam: string;
    block: string;
    stake: { index: number; amount: string }[];
  }>({
    lp: '0',
    nft: '0',
    dTeam: '0',
    block: '0',
    stake: [],
  });

  // 记录数据
  const [withdrawalRecords, setWithdrawalRecords] = useState<any[]>([]);

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isConnected || !wallet?.address) return;

    try {
      // 加载链上待领取奖励
      const address = wallet.address.toLowerCase();

      // SOL 奖励
      const [pendingReward, pendingFee] = await Promise.all([
        getPendingReward(address),
        getPendingFee(address),
      ]);
      setSolRewards({
        directReferral: pendingReward || '0',
        fee: pendingFee || '0',
      });

      // DQ 奖励
      const [pendingLP, pendingNft, pendingDTeam, pendingBlock] = await Promise.all([
        getPendingReward('lp'),
        getPendingReward('nft'),
        getPendingReward('dTeam'),
        getPendingBlockReward(address),
      ]);

      // 质押奖励（周期 0-3）
      const stakeRewards: { index: number; amount: string }[] = [];
      for (let i = 0; i < 4; i++) {
        const pending = await getPendingStakeReward(address, i);
        if (parseFloat(pending) > 0) {
          stakeRewards.push({ index: i, amount: pending });
        }
      }

      setDqRewards({
        lp: pendingLP || '0',
        nft: pendingNft || '0',
        dTeam: pendingDTeam || '0',
        block: pendingBlock || '0',
        stake: stakeRewards,
      });

      // 加载提现记录
      if (userId) {
        const withdrawalsRes = await dappUserApi.getRewards(userId);
        if (withdrawalsRes?.data) {
          setWithdrawalRecords(withdrawalsRes.data);
        }
      }
    } catch (error) {
      console.error('[Rewards] 加载数据失败:', error);
    }
  }, [isConnected, wallet?.address, userId]);

  // 刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 领取奖励
  const handleClaim = async (type: string) => {
    if (!isConnected) {
      Alert.alert(t('common.error'), t('lp.alert.connectFirst'));
      return;
    }

    const confirmMap: Record<string, { title: string; message: string }> = {
      sol: { title: t('rewards.claim.sol'), message: t('rewards.confirm.claim.sol') },
      fee: { title: t('rewards.claim.fee'), message: t('rewards.confirm.claim.fee') },
      lp: { title: t('rewards.claim.lp'), message: t('rewards.confirm.claim.lp') },
      nft: { title: t('rewards.claim.nft'), message: t('rewards.confirm.claim.nft') },
      dTeam: { title: t('rewards.claim.dTeam'), message: t('rewards.confirm.claim.dTeam') },
      block: { title: t('rewards.claim.block'), message: t('rewards.confirm.claim.block') },
      stake0: { title: t('rewards.claim.stake'), message: t('rewards.confirm.claim.stake') },
      stake1: { title: t('rewards.claim.stake'), message: t('rewards.confirm.claim.stake') },
      stake2: { title: t('rewards.claim.stake'), message: t('rewards.confirm.claim.stake') },
      stake3: { title: t('rewards.claim.stake'), message: t('rewards.confirm.claim.stake') },
    };

    Alert.alert(confirmMap[type]?.title || t('rewards.claim.title'), confirmMap[type]?.message || t('rewards.confirm.claim.default'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          setLoading(type);
          try {
            const signer = await getSigner();
            if (!signer) {
              Alert.alert(t('common.error'), t('lp.alert.connectFailed'));
              return;
            }
            let tx;

            switch (type) {
              case 'sol':
                tx = await claimSOLOnChain(signer);
                break;
              case 'fee':
                tx = await claimFeeOnChain(signer);
                break;
              case 'lp':
                tx = await claimLPOnChain(signer);
                break;
              case 'nft':
                tx = await claimNFTOnChain(signer);
                break;
              case 'dTeam':
                tx = await claimDTeamOnChain(signer);
                break;
              case 'block':
                tx = await claimBlockDQOnChain(signer);
                break;
              case 'stake0':
                tx = await withdrawDQRewardOnChain(signer, 0);
                break;
              case 'stake1':
                tx = await withdrawDQRewardOnChain(signer, 1);
                break;
              case 'stake2':
                tx = await withdrawDQRewardOnChain(signer, 2);
                break;
              case 'stake3':
                tx = await withdrawDQRewardOnChain(signer, 3);
                break;
              default:
                throw new Error('Unknown claim type');
            }

            await waitForTransaction(tx);
            Alert.alert(t('common.success'), t('rewards.claim.success'));
            await loadData();
          } catch (error: any) {
            console.error('[Rewards] 领取失败:', error);
            Alert.alert(t('common.error'), error.message || t('rewards.claim.failed'));
          } finally {
            setLoading(null);
          }
        },
      },
    ]);
  };

  // 未连接钱包
  if (!isConnected) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('rewards.connectTip')}</Text>
          <TouchableOpacity style={styles.connectButton} onPress={() => router.push('/dapp')}>
            <Text style={styles.connectButtonText}>{t('rewards.connectWallet')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* Tab 切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
              {t('rewards.tab.rewards')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'withdrawals' && styles.tabActive]}
            onPress={() => setActiveTab('withdrawals')}
          >
            <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.tabTextActive]}>
              {t('rewards.tab.withdrawals')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 奖励 Tab */}
        {activeTab === 'rewards' && (
          <>
            {/* SOL 奖励区域 */}
            <Text style={styles.sectionTitle}>{t('rewards.solRewards')}</Text>
            <View style={styles.rewardRow}>
              {/* 直推+见点+管理奖励 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.solBg, borderColor: COLORS.solBorder }]}
                onPress={() => handleClaim('sol')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.solBg }]}>
                  <Text style={styles.rewardIconText}>💰</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.directReferral')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.solAccent }]}>
                  {parseFloat(solRewards.directReferral || '0').toFixed(4)} SOL
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.solBorder }]}
                  onPress={() => handleClaim('sol')}
                  disabled={loading === 'sol'}
                >
                  {loading === 'sol' ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.claimButtonText}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {/* 节点手续费分红 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.solBg, borderColor: COLORS.solBorder }]}
                onPress={() => handleClaim('fee')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.solBg }]}>
                  <Text style={styles.rewardIconText}>📊</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.fee')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.solAccent }]}>
                  {parseFloat(solRewards.fee || '0').toFixed(4)} SOL
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.solBorder }]}
                  onPress={() => handleClaim('fee')}
                  disabled={loading === 'fee'}
                >
                  {loading === 'fee' ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.claimButtonText}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* DQ 奖励区域 */}
            <Text style={styles.sectionTitle}>{t('rewards.dqRewards')}</Text>
            <View style={styles.rewardRow}>
              {/* LP 奖励 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('lp')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.dqBg }]}>
                  <Text style={styles.rewardIconText}>💎</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.lp')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.dqAccent }]}>
                  {parseFloat(dqRewards.lp || '0').toFixed(4)} DQ
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.dqBorder }]}
                  onPress={() => handleClaim('lp')}
                  disabled={loading === 'lp'}
                >
                  {loading === 'lp' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.claimButtonTextDark}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {/* 节点奖励 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('nft')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.dqBg }]}>
                  <Text style={styles.rewardIconText}>🎫</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.nft')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.dqAccent }]}>
                  {parseFloat(dqRewards.nft || '0').toFixed(4)} DQ
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.dqBorder }]}
                  onPress={() => handleClaim('nft')}
                  disabled={loading === 'nft'}
                >
                  {loading === 'nft' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.claimButtonTextDark}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            <View style={styles.rewardRow}>
              {/* D等级奖励 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('dTeam')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.dqBg }]}>
                  <Text style={styles.rewardIconText}>👑</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.dTeam')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.dqAccent }]}>
                  {parseFloat(dqRewards.dTeam || '0').toFixed(4)} DQ
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.dqBorder }]}
                  onPress={() => handleClaim('dTeam')}
                  disabled={loading === 'dTeam'}
                >
                  {loading === 'dTeam' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.claimButtonTextDark}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {/* 爆块奖励 */}
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('block')}
                disabled={loading !== null}
              >
                <View style={[styles.rewardIcon, { backgroundColor: COLORS.dqBg }]}>
                  <Text style={styles.rewardIconText}>💥</Text>
                </View>
                <Text style={styles.rewardLabel}>{t('rewards.block')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.dqAccent }]}>
                  {parseFloat(dqRewards.block || '0').toFixed(4)} DQ
                </Text>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: COLORS.dqBorder }]}
                  onPress={() => handleClaim('block')}
                  disabled={loading === 'block'}
                >
                  {loading === 'block' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.claimButtonTextDark}>{t('rewards.claim.btn')}</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* 质押奖励 */}
            {dqRewards.stake.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('rewards.stakeRewards')}</Text>
                {dqRewards.stake.map((item) => (
                  <TouchableOpacity
                    key={`stake-${item.index}`}
                    style={[styles.stakeCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                    onPress={() => handleClaim(`stake${item.index}`)}
                    disabled={loading !== null}
                  >
                    <View style={styles.stakeInfo}>
                      <Text style={styles.stakeLabel}>{t('rewards.period')} {item.index + 1}</Text>
                      <Text style={[styles.stakeAmount, { color: COLORS.dqAccent }]}>
                        {parseFloat(item.amount).toFixed(4)} DQ
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.claimButton, { backgroundColor: COLORS.dqBorder }]}
                      onPress={() => handleClaim(`stake${item.index}`)}
                      disabled={loading === `stake${item.index}`}
                    >
                      {loading === `stake${item.index}` ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.claimButtonTextDark}>{t('rewards.claim.btn')}</Text>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* 提现记录 */}
            <Text style={styles.sectionTitle}>{t('rewards.withdrawalRecords')}</Text>
            {withdrawalRecords.length === 0 ? (
              <View style={styles.emptyRecords}>
                <Text style={styles.emptyRecordsText}>{t('rewards.noRecords')}</Text>
              </View>
            ) : (
              withdrawalRecords.slice(0, 10).map((record: any, index: number) => (
                <View key={index} style={styles.recordItem}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordType}>{record.type || 'Withdrawal'}</Text>
                    <Text style={styles.recordTime}>
                      {new Date(record.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.recordAmount, { color: record.token === 'SOL' ? COLORS.solAccent : COLORS.dqAccent }]}>
                    {record.amount} {record.token || 'DQ'}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {/* 提现记录 Tab */}
        {activeTab === 'withdrawals' && (
          <>
            <Text style={styles.sectionTitle}>{t('rewards.withdrawalRecords')}</Text>
            {withdrawalRecords.length === 0 ? (
              <View style={styles.emptyRecords}>
                <Text style={styles.emptyRecordsText}>{t('rewards.noRecords')}</Text>
              </View>
            ) : (
              withdrawalRecords.slice(0, 20).map((record: any, index: number) => (
                <View key={index} style={styles.recordItem}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordType}>{record.type || 'Withdrawal'}</Text>
                    <Text style={styles.recordTime}>
                      {new Date(record.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.recordAmount, { color: record.token === 'SOL' ? COLORS.solAccent : COLORS.dqAccent }]}>
                    {record.amount} {record.token || 'DQ'}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(26, 26, 48, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  rewardCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardIconText: {
    fontSize: 20,
  },
  rewardLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  claimButtonTextDark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  stakeInfo: {
    flex: 1,
  },
  stakeLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  stakeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(26, 26, 48, 0.6)',
    borderRadius: 12,
    padding: 12,
  },
  recordLeft: {
    flex: 1,
  },
  recordType: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  recordTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyRecords: {
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 48, 0.4)',
    borderRadius: 12,
  },
  emptyRecordsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#00D9FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
