import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/utils/toast';
import { ChainStakeRecord, connectWallet, getStakeRecordsFromChain, unstakeDQOnChain } from '@/utils/web3';

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

interface StakeRecord {
  id: number;
  amount: string;
  duration: number;
  startTime: number;
  pendingReward: string;
  active: boolean;
  canUnstake: boolean;
}

export default function DappStakes() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [unstakingId, setUnstakingId] = useState<number | null>(null);
  const [confirmRecord, setConfirmRecord] = useState<StakeRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            await fetchStakes(savedWallet);
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

  const fetchStakes = async (address: string) => {
    try {
      setLoading(true);
      const records = await getStakeRecordsFromChain(address);
      setStakes(records.map((record) => ({
        id: record.recordIndex,
        amount: record.amount,
        duration: record.duration,
        startTime: record.startTime,
        pendingReward: record.pendingReward,
        active: record.active,
        canUnstake: record.canUnstake,
      })));
    } catch (error) {
      console.error('获取质押记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (walletAddress) {
      await fetchStakes(walletAddress);
    }
    setRefreshing(false);
  }, [walletAddress]);

  const handleCopyAddress = async (text: string) => {
    if (text) {
      await Clipboard.setStringAsync(text);
      showToast.success(t('common.success'), '已复制到剪贴板');
    }
  };

  const getStatusColor = (item: StakeRecord) => {
    if (!item.active) return TEXT_MUTED;
    if (item.canUnstake) return '#00FF88';
    return YELLOW;
  };

  const getStatusText = (item: StakeRecord) => {
    if (!item.active) return '已解押';
    if (item.canUnstake) return '可解押';
    return '锁定中';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDurationDays = (duration: number) => Math.round(duration / (24 * 60 * 60));

  const openUnstakeDialog = (item: StakeRecord) => {
    if (!item.canUnstake || !item.active) {
      showToast.info(t('common.tips'), '该质押记录尚未到期，暂不可解押');
      return;
    }
    setConfirmRecord(item);
  };

  const handleUnstake = async () => {
    if (!confirmRecord || !walletAddress) return;

    try {
      setUnstakingId(confirmRecord.id);
      setConfirmRecord(null);

      const walletInfo = await connectWallet();
      if (!walletInfo) {
        showToast.error(t('common.error'), t('common.walletConnectFailed'));
        return;
      }

      const tx = await unstakeDQOnChain(walletInfo.signer, confirmRecord.id);
      await tx.wait();

      showToast.success(t('common.success'), '解押成功');
      await fetchStakes(walletAddress);
    } catch (error: any) {
      console.error('解押失败:', error);
      showToast.error(t('common.error'), error.message || '解押失败，请重试');
    } finally {
      setUnstakingId(null);
    }
  };

  const renderItem = ({ item }: { item: StakeRecord }) => (
    <View
      className="rounded-xl p-4 mb-3"
      style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.15)' }}>
            <Ionicons name="arrow-down" size={16} color={CYAN} />
          </View>
          <View>
            <Text className="text-sm font-semibold" style={{ color: TEXT_WHITE }}>{t('stakes.stake')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{formatDate(item.startTime)}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-bold" style={{ color: YELLOW }}>{item.amount} DQ</Text>
          <Text className="text-xs mt-1" style={{ color: CYAN }}>{formatDurationDays(item.duration)} 天</Text>
          <View className="px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: `${getStatusColor(item)}20` }}>
            <Text className="text-xs" style={{ color: getStatusColor(item) }}>{getStatusText(item)}</Text>
          </View>
        </View>
      </View>

      <View className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs" style={{ color: TEXT_MUTED }}>待领取 DQ</Text>
          <Text className="text-sm font-semibold" style={{ color: CYAN }}>{item.pendingReward} DQ</Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center justify-between"
          onPress={() => handleCopyAddress(String(item.id))}
        >
          <Text className="text-xs" style={{ color: TEXT_MUTED }}>记录索引</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-mono" style={{ color: CYAN }}>{item.id}</Text>
            <Ionicons name="copy" size={14} color={CYAN} />
          </View>
        </TouchableOpacity>
      </View>

      {item.active ? (
        <TouchableOpacity
          className="py-3 rounded-lg items-center"
          style={{
            backgroundColor: item.canUnstake ? YELLOW : 'rgba(255,255,255,0.08)',
            opacity: unstakingId === item.id ? 0.7 : 1,
          }}
          onPress={() => openUnstakeDialog(item)}
          disabled={!item.canUnstake || unstakingId === item.id}
        >
          {unstakingId === item.id ? (
            <ActivityIndicator size="small" color={item.canUnstake ? BG_DARK : TEXT_MUTED} />
          ) : (
            <Text className="text-sm font-semibold" style={{ color: item.canUnstake ? BG_DARK : TEXT_MUTED }}>
              {item.canUnstake ? '解押' : '未到期'}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );

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
      <ConfirmDialog
        visible={Boolean(confirmRecord)}
        title="确认解押"
        message={confirmRecord ? `确定解押这笔 ${confirmRecord.amount} DQ 的质押记录吗？` : ''}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        type="warning"
        onConfirm={handleUnstake}
        onCancel={() => setConfirmRecord(null)}
      />
      <LogoHeader />
      <View className="flex-1" style={{ backgroundColor: BG_DARK }}>
        {/* 钱包提示 */}
        {!walletAddress && (
          <View className="px-4 pb-4">
            <View className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: YELLOW }}>
              <Text className="text-sm" style={{ color: YELLOW }}>{t('stakes.pleaseConnectWalletToView')}</Text>
            </View>
          </View>
        )}

        {/* 质押记录列表 */}
        {walletAddress && stakes.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="time-outline" size={64} color={TEXT_MUTED} />
            <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>{t('stakes.noRecords')}</Text>
            <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>{t('stakes.startStaking')}</Text>
          </View>
        ) : (
          <FlatList
            data={stakes}
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
          />
        )}
      </View>
    </Screen>
  );
}
