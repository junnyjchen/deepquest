import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useWallet } from '@/hooks/useWallet';
import { Screen } from '@/components/Screen';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LogoHeader } from '@/components/LogoHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusEffect, router } from 'expo-router';
import { getSigner, waitForTransaction } from '@/utils/web3';
import {
  getPendingReward,
  getPendingFee,
  getPendingBlockReward,
  getPendingStakeReward,
  getLPReward,
  getNFTReward,
  getDLevelReward,
  claimSOLOnChain,
  claimLPOnChain,
  claimNFTOnChain,
  claimDTeamOnChain,
  claimBlockDQOnChain,
  claimFeeOnChain,
  claimStakeRewardOnChain,
  withdrawDQRewardOnChain,
} from '@/utils/web3';

const COLORS = {
  solBg: 'rgba(0, 217, 255, 0.1)',
  solBorder: '#00D9FF',
  solAccent: '#00D9FF',
  dqBg: 'rgba(139, 92, 246, 0.1)',
  dqBorder: '#8B5CF6',
  dqAccent: '#A78BFA',
  stakeBg: 'rgba(251, 191, 36, 0.1)',
  stakeBorder: '#FBBF24',
  stakeAccent: '#FBBF24',
  withdrawBg: 'rgba(239, 68, 68, 0.1)',
  withdrawBorder: '#EF4444',
  withdrawAccent: '#EF4444',
  cardBg: 'rgba(26, 26, 48, 0.6)',
};

const noop = (): void => undefined;

type ConfirmDialogState = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
};

export default function RewardsScreen() {
  const router = useSafeRouter();
  const { wallet, isConnected } = useWallet();
  const { t } = useLanguage();
  const showSolRewards = false;

  const [activeTab, setActiveTab] = useState<'rewards' | 'withdrawals'>('rewards');
  const [recordType, setRecordType] = useState<'claim' | 'withdraw'>('claim');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // 奖励数据
  const [solRewards, setSolRewards] = useState({
    directReferral: '0',
    fee: '0',
  });
  const [dqRewards, setDqRewards] = useState({
    lp: '0',
    nft: '0',
    dTeam: '0',
    block: '0',
    stake: [] as { index: number; amount: string }[],
  });

  // 记录数据
  const [claimRecords, setClaimRecords] = useState<any[]>([]);
  const [withdrawalRecords, setWithdrawalRecords] = useState<any[]>([]);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: noop,
  });

  const [alertDialog, setAlertDialog] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger',
  });

  const showAlert = useCallback((title: string, message: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setAlertDialog({ visible: true, title, message, type });
  }, []);

  const walletAddress = wallet?.address || '';

  // 加载数据
  const loadData = useCallback(async () => {
    if (!walletAddress) return;

    try {
      // SOL 奖励：直推奖励 + 节点手续费
      const [pendingReward, pendingFee] = await Promise.all([
        getPendingReward(walletAddress),
        getPendingFee(walletAddress),
      ]);
      setSolRewards({
        directReferral: pendingReward || '0',
        fee: pendingFee || '0',
      });

      // DQ 奖励：LP / NFT / D等级 / 爆块已积累
      const [lpRewardData, nftReward, dTeamReward, blockReward] = await Promise.all([
        getLPReward(walletAddress),
        getNFTReward(walletAddress),
        getDLevelReward(walletAddress),
        getPendingBlockReward(walletAddress),
      ]);

      // 质押奖励：遍历 4 个周期，只展示有余额的
      const stakeItems: { index: number; amount: string }[] = [];
      for (let i = 0; i < 4; i++) {
        const amount = await getPendingStakeReward(walletAddress, i);
        if (parseFloat(amount) > 0) {
          stakeItems.push({ index: i, amount });
        }
      }

      setDqRewards({
        lp: lpRewardData.pendingReward || '0',
        nft: nftReward || '0',
        dTeam: dTeamReward || '0',
        block: blockReward || '0',
        stake: stakeItems,
      });
    } catch (error) {
      console.error('[Rewards] 加载数据失败:', error);
    }
  }, [walletAddress]);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 进入页面后自动拉取一次数据
  useFocusEffect(
    useCallback(() => {
      if (isConnected) {
        loadData();
      }
      return noop;
    }, [loadData, isConnected])
  );

  // 领取奖励
  const handleClaim = (type: 'sol' | 'fee' | 'lp' | 'nft' | 'dTeam' | 'block') => {
    const titles: Record<string, string> = {
      sol: t('rewards.directReferral'),
      fee: t('rewards.fee'),
      lp: t('rewards.lp'),
      nft: t('rewards.nft'),
      dTeam: t('rewards.dTeam'),
      block: t('rewards.block'),
    };

    setConfirmDialog({
      visible: true,
      title: t('rewards.confirm.title'),
      message: `${t('rewards.confirm.claim')} ${titles[type]}?`,
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        setLoading(type);
        try {
          const signer = await getSigner();
          if (!signer) {
            showAlert(t('common.error'), t('lp.alert.connectFailed'), 'danger');
            return;
          }

          let tx;
          switch (type) {
            case 'sol':
              tx = await claimSOLOnChain(signer);
              await waitForTransaction(tx);
              break;
            case 'fee':
              tx = await claimFeeOnChain(signer);
              await waitForTransaction(tx);
              break;
            case 'lp': {
              tx = await claimLPOnChain(signer);
              await waitForTransaction(tx);
              break;
            }
            case 'nft': {
              tx = await claimNFTOnChain(signer);
              await waitForTransaction(tx);
              break;
            }
            case 'dTeam': {
              tx = await claimDTeamOnChain(signer);
              await waitForTransaction(tx);
              break;
            }
            case 'block':
              tx = await claimBlockDQOnChain(signer);
              await waitForTransaction(tx);
              break;
          }
          showAlert(t('common.success'), t('rewards.claim.success'));
          await loadData();
        } catch (error: any) {
          console.error('[Rewards] 领取失败:', error);
          showAlert(t('common.error'), error.message || t('rewards.claim.failed'), 'danger');
        } finally {
          setLoading(null);
        }
      },
    });
  };

  // 质押奖励领取
  const handleStakeClaim = (periodIndex: number) => {
    setConfirmDialog({
      visible: true,
      title: t('rewards.claim.stake'),
      message: t('rewards.confirm.default'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        setLoading(`stake${periodIndex}`);
        try {
          const signer = await getSigner();
          if (!signer) {
            showAlert(t('common.error'), t('lp.alert.connectFailed'), 'danger');
            return;
          }
          const tx = await claimStakeRewardOnChain(signer, periodIndex);
          await waitForTransaction(tx);
          showAlert(t('common.success'), t('rewards.claim.success'));
          await loadData();
        } catch (error: any) {
          console.error('[Rewards] 领取失败:', error);
          showAlert(t('common.error'), error.message || t('rewards.claim.failed'), 'danger');
        } finally {
          setLoading(null);
        }
      },
    });
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
    <LogoHeader />
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
            <Text style={styles.sectionTitle}>{t('rewards.solRewards')}</Text>
            <View style={styles.rewardRow}>
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.solBg, borderColor: COLORS.solBorder }]}
                onPress={() => handleClaim('sol')}
                disabled={loading !== null}
              >
                <Text style={styles.rewardLabel}>{t('rewards.directReferral')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.solAccent }]}>
                  {parseFloat(solRewards.directReferral || '0').toFixed(4)} SOL
                </Text>
                { showSolRewards && (
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
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.solBg, borderColor: COLORS.solBorder }]}
                onPress={() => handleClaim('fee')}
                disabled={loading !== null}
              >
                <Text style={styles.rewardLabel}>{t('rewards.fee')}</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.solAccent }]}>
                  {parseFloat(solRewards.fee || '0').toFixed(4)} SOL
                </Text>
                { showSolRewards && (
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
                )}
              </TouchableOpacity>
            </View>
          


            {/* DQ 奖励 */}
            <Text style={styles.sectionTitle}>{t('rewards.dqRewards')}</Text>
            <View style={styles.rewardRow}>
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('lp')}
                disabled={loading !== null}
              >
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

              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('nft')}
                disabled={loading !== null}
              >
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
              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('dTeam')}
                disabled={loading !== null}
              >
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

              <TouchableOpacity
                style={[styles.rewardCard, { backgroundColor: COLORS.dqBg, borderColor: COLORS.dqBorder }]}
                onPress={() => handleClaim('block')}
                disabled={loading !== null}
              >
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
                <View style={styles.rewardRow}>
                  {dqRewards.stake.map((item) => (
                    <TouchableOpacity
                      key={`stake-${item.index}`}
                      style={[styles.rewardCard, { backgroundColor: COLORS.stakeBg, borderColor: COLORS.stakeBorder }]}
                      onPress={() => handleStakeClaim(item.index)}
                      disabled={loading !== null}
                    >
                      <Text style={styles.rewardLabel}>{t('rewards.period')} {item.index + 1}</Text>
                      <Text style={[styles.rewardAmount, { color: COLORS.stakeAccent }]}>
                        {parseFloat(item.amount).toFixed(4)} DQ
                      </Text>
                      <TouchableOpacity
                        style={[styles.claimButton, { backgroundColor: COLORS.stakeBorder }]}
                        onPress={() => handleStakeClaim(item.index)}
                        disabled={loading === `stake${item.index}`}
                      >
                        {loading === `stake${item.index}` ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <Text style={styles.claimButtonText}>{t('rewards.claim.btn')}</Text>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* 记录 Tab */}
        {activeTab === 'withdrawals' && (
          <>
            {/* 记录类型切换 */}
            <View style={styles.recordTabContainer}>
              <TouchableOpacity
                style={[styles.recordTab, recordType === 'claim' && styles.recordTabActive]}
                onPress={() => setRecordType('claim')}
              >
                <Text style={[styles.recordTabText, recordType === 'claim' && styles.recordTabTextActive]}>
                  {t('rewards.records.claim')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordTab, recordType === 'withdraw' && styles.recordTabActive]}
                onPress={() => setRecordType('withdraw')}
              >
                <Text style={[styles.recordTabText, recordType === 'withdraw' && styles.recordTabTextActive]}>
                  {t('rewards.records.withdraw')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 奖励记录 */}
            {recordType === 'claim' && (
              <>
                <Text style={styles.sectionTitle}>{t('rewards.records.claim')}</Text>
                {claimRecords.length === 0 ? (
                  <View style={styles.emptyRecords}>
                    <Text style={styles.emptyRecordsText}>{t('rewards.noRecords')}</Text>
                  </View>
                ) : (
                  claimRecords.slice(0, 20).map((record: any, index: number) => (
                    <View key={index} style={styles.recordItem}>
                      <View style={styles.recordLeft}>
                        <Text style={styles.recordType}>{record.type || 'Claim'}</Text>
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

            {/* 提现记录 */}
            {recordType === 'withdraw' && (
              <>
                <Text style={styles.sectionTitle}>{t('rewards.records.withdraw')}</Text>
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
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 确认对话框 */}
      {confirmDialog.visible && (
        <ConfirmDialog
          visible={confirmDialog.visible}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        />
      )}

      {/* 提示对话框 */}
      {alertDialog.visible && (
        <ConfirmDialog
          visible={alertDialog.visible}
          title={alertDialog.title}
          message={alertDialog.message}
          type={alertDialog.type}
          confirmText="OK"
          cancelText=""
          onConfirm={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
          onCancel={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        />
      )}
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
    marginBottom: 12,
    backgroundColor: 'rgba(26, 26, 48, 0.6)',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  recordTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(26, 26, 48, 0.4)',
    borderRadius: 8,
    padding: 3,
  },
  recordTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  recordTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  recordTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  recordTabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  rewardCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  rewardLabel: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  claimButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  claimButtonTextDark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#00D9FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyRecords: {
    marginHorizontal: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 48, 0.6)',
    borderRadius: 10,
  },
  emptyRecordsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    backgroundColor: 'rgba(26, 26, 48, 0.6)',
    borderRadius: 10,
  },
  recordLeft: {
    flex: 1,
  },
  recordType: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
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
});
