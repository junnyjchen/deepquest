import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappUserApi } from '@/utils/api';
import { showToast } from '@/utils/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  connectWallet,
  getBrowserProvider,
  getPendingSOL,
  claimSOLOnChain,
  waitForTransaction,
} from '@/utils/web3';

// 精确匹配参考图的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';

const WALLET_STORAGE_KEY = '@deepquest_wallet';

interface RewardRecord {
  id: number;
  amount: string;
  reward_type: string;
  status: string;
  created_at: string;
}

const REWARD_TYPES: Record<string, { label: string; color: string }> = {
  // label 会在组件内根据语言动态生成，这里仅保留颜色（避免初始化时依赖 hooks）
  deposit: { label: 'deposit', color: CYAN },
  referral: { label: 'referral', color: YELLOW },
  team: { label: 'team', color: '#00FF88' },
  level: { label: 'level', color: '#D020FF' },
  default: { label: 'default', color: TEXT_MUTED },
};

export default function DappRewards() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [claiming, setClaiming] = useState(false);
  // SOL 领取相关状态
  const [pendingSOL, setPendingSOL] = useState('0');
  const [claimingSOL, setClaimingSOL] = useState(false);

  // 确认对话框状态（替代 Alert，确保多语言切换时文案一致）
  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger',
    onConfirm: () => { /* placeholder */ },
  });

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            await fetchRewards(savedWallet, 1);
            await fetchPendingSOL(savedWallet);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [])
  );

  // 获取待领取 SOL 金额
  const fetchPendingSOL = async (address: string) => {
    try {
      const pending = await getPendingSOL(address);
      setPendingSOL(pending);
    } catch (error) {
      console.error('获取待领取 SOL 失败:', error);
      setPendingSOL('0');
    }
  };

  const fetchRewards = async (address: string, pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await dappUserApi.getRewards(address, { page: pageNum, limit: 20 });
      
      if (response.code === 0 && response.data) {
        const newRewards = response.data.list || [];
        
        if (append) {
          setRewards(prev => [...prev, ...newRewards]);
        } else {
          setRewards(newRewards);
        }
        
        setHasMore(newRewards.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取奖励记录失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (walletAddress) {
      await fetchRewards(walletAddress, 1);
      await fetchPendingSOL(walletAddress);
    }
    setRefreshing(false);
  }, [walletAddress]);

  // 领取 SOL 奖励
  const handleClaimSOL = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    const pendingAmount = parseFloat(pendingSOL);
    if (pendingAmount <= 0) {
      showToast.info(t('common.tips'), t('rewards.noSolToClaim'));
      return;
    }

    setConfirmDialog({
      visible: true,
      title: t('rewards.claimSolTitle'),
      message: t('rewards.claimSolConfirm').replace('{amount}', pendingAmount.toFixed(4)),
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        try {
          setClaimingSOL(true);
          const provider = getBrowserProvider();
          if (!provider) {
            throw new Error(t('common.useWalletBrowser'));
          }
          const signer = await provider.getSigner();
          const tx = await claimSOLOnChain(signer);
          await waitForTransaction(tx, 1);
          showToast.success(t('common.success'), t('rewards.claimSolSuccess').replace('{amount}', pendingAmount.toFixed(4)));
          await fetchPendingSOL(walletAddress);
          await fetchRewards(walletAddress, 1);
        } catch (error: any) {
          console.error('领取 SOL 失败:', error);
          showToast.error(t('common.error'), error?.message || t('rewards.claimFailed'));
        } finally {
          setClaimingSOL(false);
        }
      },
    });
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore && walletAddress) {
      fetchRewards(walletAddress, page + 1, true);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    setConfirmDialog({
      visible: true,
      title: t('rewards.claimTitle'),
      message: t('rewards.claimAllConfirm'),
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        try {
          setClaiming(true);
          const response = await dappUserApi.claimReward(walletAddress);
          if (response.code === 0) {
            showToast.success(t('common.success'), t('rewards.claimDqSuccess').replace('{amount}', String(response.data?.claimed || 0)));
            await fetchRewards(walletAddress, 1);
          } else {
            showToast.error(t('common.error'), response.message || t('rewards.claimFailed'));
          }
        } catch (error) {
          showToast.error(t('common.error'), t('rewards.claimFailed'));
        } finally {
          setClaiming(false);
        }
      },
    });
  };

  const getRewardTypeInfo = (type: string) => {
    const info = REWARD_TYPES[type] || REWARD_TYPES.default;
    const labelMap: Record<string, string> = {
      deposit: t('rewards.type.deposit'),
      referral: t('rewards.type.referral'),
      team: t('rewards.type.team'),
      level: t('rewards.type.level'),
      default: t('rewards.type.other'),
    };

    return { ...info, label: labelMap[type] || labelMap.default };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'claimed':
        return '#00FF88';
      case 'pending':
        return YELLOW;
      default:
        return TEXT_MUTED;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'claimed':
        return t('rewards.claimed');
      case 'pending':
        return t('rewards.pending');
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 计算待领取和已领取总额
  const pendingTotal = rewards.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const claimedTotal = rewards.filter(r => r.status === 'claimed').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const pendingSOLAmount = parseFloat(pendingSOL);

  const renderItem = ({ item }: { item: RewardRecord }) => {
    const typeInfo = getRewardTypeInfo(item.reward_type);
    
    return (
      <View
        className="rounded-xl p-4 mb-3"
        style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: `${typeInfo.color}20` }}>
              <Ionicons name="gift" size={16} color={typeInfo.color} />
            </View>
            <View>
              <Text className="text-sm font-semibold" style={{ color: TEXT_WHITE }}>{typeInfo.label}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-base font-bold" style={{ color: typeInfo.color }}>+{item.amount} DQ</Text>
            <View className="px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: `${getStatusColor(item.status)}20` }}>
              <Text className="text-xs" style={{ color: getStatusColor(item.status) }}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: BG_DARK }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <LogoHeader />
      <View className="flex-1" style={{ backgroundColor: BG_DARK }}>
        {/* 收益汇总 */}
        {walletAddress && (
          <View className="px-4 pb-4">
            {/* SOL 领取卡片 */}
            <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: CYAN }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${CYAN}20` }}>
                    <Ionicons name="wallet" size={20} color={CYAN} />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: TEXT_WHITE }}>{t('rewards.solWalletReward')}</Text>
                    <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('rewards.claimableAmount')}</Text>
                  </View>
                </View>
                <Text className="text-2xl font-bold" style={{ color: CYAN }}>{pendingSOLAmount.toFixed(4)}</Text>
              </View>
              
              {pendingSOLAmount > 0 && (
                <TouchableOpacity
                  className="py-3 rounded-xl items-center"
                  style={{ backgroundColor: CYAN }}
                  onPress={handleClaimSOL}
                  disabled={claimingSOL}
                >
                  {claimingSOL ? (
                    <ActivityIndicator size="small" color="#0A0A12" />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: '#0A0A12' }}>{t('rewards.claimSol')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* DQ 奖励汇总卡片 */}
            <View className="rounded-2xl p-4" style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}>
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('rewards.pending')}</Text>
                  <Text className="text-xl font-bold" style={{ color: YELLOW }}>{pendingTotal.toFixed(2)}</Text>
                  <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
                </View>
                <View className="w-px" style={{ backgroundColor: BORDER_GRAY }} />
                <View className="items-center flex-1">
                  <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('rewards.claimed')}</Text>
                  <Text className="text-xl font-bold" style={{ color: CYAN }}>{claimedTotal.toFixed(2)}</Text>
                  <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
                </View>
              </View>
              
              {pendingTotal > 0 && (
                <TouchableOpacity
                  className="mt-4 py-3 rounded-xl items-center"
                  style={{ backgroundColor: YELLOW }}
                  onPress={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? (
                    <ActivityIndicator size="small" color="#333" />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: '#333' }}>{t('rewards.claimAll')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 钱包提示 */}
        {!walletAddress && (
          <View className="px-4 pb-4">
            <View className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: YELLOW }}>
              <Text className="text-sm" style={{ color: YELLOW }}>{t('rewards.pleaseConnectWalletToView')}</Text>
            </View>
          </View>
        )}

        {/* 奖励记录列表 */}
        {walletAddress && rewards.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="gift-outline" size={64} color={TEXT_MUTED} />
            <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>{t('rewards.noRecords')}</Text>
            <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>{t('rewards.noRecordsHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={rewards}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={YELLOW}
                colors={[YELLOW]}
              />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={YELLOW} />
                </View>
              ) : null
            }
          />
        )}

        <ConfirmDialog
          visible={confirmDialog.visible}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
        />
      </View>
    </Screen>
  );
}
