import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappUserApi } from '@/utils/api';

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
  status: string;
  created_at: string;
  tx_hash: string;
}

export default function DappStakes() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            await fetchStakes(savedWallet, 1);
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

  const fetchStakes = async (address: string, pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await dappUserApi.getStakes(address, pageNum, 20);
      
      if (response.code === 0 && response.data) {
        const newStakes = response.data.list || [];
        
        if (append) {
          setStakes(prev => [...prev, ...newStakes]);
        } else {
          setStakes(newStakes);
        }
        
        setHasMore(newStakes.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取质押记录失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (walletAddress) {
      await fetchStakes(walletAddress, 1);
    }
    setRefreshing(false);
  }, [walletAddress]);

  const onEndReached = () => {
    if (!loadingMore && hasMore && walletAddress) {
      fetchStakes(walletAddress, page + 1, true);
    }
  };

  const handleCopyTx = async (txHash: string) => {
    if (txHash) {
      await Clipboard.setStringAsync(txHash);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#00FF88';
      case 'pending':
        return YELLOW;
      case 'failed':
        return '#FF5050';
      default:
        return TEXT_MUTED;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'pending':
        return '处理中';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
            <Text className="text-sm font-semibold" style={{ color: TEXT_WHITE }}>质押</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-bold" style={{ color: YELLOW }}>{item.amount} BNB</Text>
          <View className="px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: `${getStatusColor(item.status)}20` }}>
            <Text className="text-xs" style={{ color: getStatusColor(item.status) }}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>
      
      {item.tx_hash && (
        <TouchableOpacity 
          className="flex-row items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}
          onPress={() => handleCopyTx(item.tx_hash)}
        >
          <Ionicons name="link" size={14} color={CYAN} />
          <Text className="text-xs font-mono flex-1" style={{ color: CYAN }} numberOfLines={1}>
            {item.tx_hash}
          </Text>
          <Ionicons name="copy" size={14} color={CYAN} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: BG_DARK }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1" style={{ backgroundColor: BG_DARK }}>
        {/* 顶部导航 */}
        <View className="px-4 pt-3 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <Ionicons name="diamond" size={24} color={CYAN} />
              </View>
              <View>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>DeepQuest</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>质押记录</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 钱包提示 */}
        {!walletAddress && (
          <View className="px-4 pb-4">
            <View className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: YELLOW }}>
              <Text className="text-sm" style={{ color: YELLOW }}>请先连接钱包查看质押记录</Text>
            </View>
          </View>
        )}

        {/* 质押记录列表 */}
        {walletAddress && stakes.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="time-outline" size={64} color={TEXT_MUTED} />
            <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>暂无质押记录</Text>
            <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>开始质押获取收益</Text>
          </View>
        ) : (
          <FlatList
            data={stakes}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
      </View>
    </Screen>
  );
}
