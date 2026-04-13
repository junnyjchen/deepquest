import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
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

interface RewardRecord {
  id: number;
  amount: string;
  reward_type: string;
  status: string;
  created_at: string;
}

const REWARD_TYPES: Record<string, { label: string; color: string }> = {
  deposit: { label: '质押收益', color: CYAN },
  referral: { label: '直推奖励', color: YELLOW },
  team: { label: '团队奖励', color: '#00FF88' },
  level: { label: '等级奖励', color: '#D020FF' },
  default: { label: '其他奖励', color: TEXT_MUTED },
};

export default function DappRewards() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            await fetchRewards(savedWallet, 1);
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
    }
    setRefreshing(false);
  }, [walletAddress]);

  const onEndReached = () => {
    if (!loadingMore && hasMore && walletAddress) {
      fetchRewards(walletAddress, page + 1, true);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }

    Alert.alert(
      '领取奖励',
      '确定要领取所有待领取奖励吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              setClaiming(true);
              const response = await dappUserApi.claimReward(walletAddress);
              if (response.code === 0) {
                Alert.alert('成功', `已领取 ${response.data?.claimed || 0} DQT`);
                await fetchRewards(walletAddress, 1);
              } else {
                Alert.alert('失败', response.message || '领取失败');
              }
            } catch (error) {
              Alert.alert('错误', '领取失败，请重试');
            } finally {
              setClaiming(false);
            }
          },
        },
      ]
    );
  };

  const getRewardTypeInfo = (type: string) => {
    return REWARD_TYPES[type] || REWARD_TYPES.default;
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
        return '已领取';
      case 'pending':
        return '待领取';
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
            <Text className="text-base font-bold" style={{ color: typeInfo.color }}>+{item.amount} DQT</Text>
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
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>收益记录</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 收益汇总 */}
        {walletAddress && (
          <View className="px-4 pb-4">
            <View className="rounded-2xl p-4" style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}>
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>待领取</Text>
                  <Text className="text-xl font-bold" style={{ color: YELLOW }}>{pendingTotal.toFixed(2)}</Text>
                  <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
                </View>
                <View className="w-px" style={{ backgroundColor: BORDER_GRAY }} />
                <View className="items-center flex-1">
                  <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>已领取</Text>
                  <Text className="text-xl font-bold" style={{ color: CYAN }}>{claimedTotal.toFixed(2)}</Text>
                  <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
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
                    <Text className="text-sm font-semibold" style={{ color: '#333' }}>一键领取</Text>
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
              <Text className="text-sm" style={{ color: YELLOW }}>请先连接钱包查看收益记录</Text>
            </View>
          </View>
        )}

        {/* 奖励记录列表 */}
        {walletAddress && rewards.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="gift-outline" size={64} color={TEXT_MUTED} />
            <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>暂无收益记录</Text>
            <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>质押或邀请好友获取收益</Text>
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
      </View>
    </Screen>
  );
}
