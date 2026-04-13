import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
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

interface WithdrawalRecord {
  id: number;
  amount: string;
  withdraw_type: string;
  tx_hash: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '处理中', color: '#FFA500' },
  completed: { label: '已完成', color: '#00FF00' },
  rejected: { label: '已拒绝', color: '#FF4444' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  dynamic: { label: '动态奖励', icon: 'trending-up' },
  lp: { label: 'LP奖励', icon: 'diamond' },
  nft: { label: 'NFT奖励', icon: 'image' },
  team: { label: '团队奖励', icon: 'people' },
};

export default function DappWithdrawals() {
  const router = useSafeRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalWithdraw, setTotalWithdraw] = useState('0.0');

  // 加载钱包地址
  const loadWalletAddress = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      setWalletAddress(address);
      return address;
    } catch {
      return null;
    }
  }, []);

  // 加载提现记录
  const loadRecords = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const response = await dappUserApi.getWithdrawals(walletAddress, pageNum, 20);
      
      if (response.code === 0 && response.data) {
        const newRecords = response.data.list || [];
        
        if (isRefresh || pageNum === 1) {
          setRecords(newRecords);
        } else {
          setRecords(prev => [...prev, ...newRecords]);
        }
        
        setHasMore(newRecords.length === 20);
        setPage(pageNum);
        
        // 计算总提现金额
        if (response.data.total !== undefined) {
          setTotalWithdraw(response.data.total.toFixed(2));
        }
      }
    } catch (error) {
      console.error('加载提现记录失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [walletAddress]);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(1, true);
  }, [loadRecords]);

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      await loadRecords(page + 1);
    }
  }, [loadingMore, hasMore, page, loadRecords]);

  // 复制交易哈希
  const handleCopyTxHash = async (txHash: string) => {
    await Clipboard.setStringAsync(txHash);
    Alert.alert('已复制', '交易哈希已复制到剪贴板');
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 渲染单条记录
  const renderItem = ({ item }: { item: WithdrawalRecord }) => {
    const statusConfig = STATUS_CONFIG[item.status] || { label: '未知', color: TEXT_MUTED };
    const typeConfig = TYPE_CONFIG[item.withdraw_type] || { label: item.withdraw_type, icon: 'help' };

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.typeTag}>
            <Ionicons name={typeConfig.icon as any} size={14} color={YELLOW} />
            <Text style={styles.typeText}>{typeConfig.label}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: statusConfig.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.recordBody}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>提现金额</Text>
            <Text style={styles.amountValue}>{parseFloat(item.amount).toFixed(2)} DQT</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.txRow}
            onPress={() => handleCopyTxHash(item.tx_hash)}
          >
            <Text style={styles.txLabel}>交易哈希</Text>
            <View style={styles.txValueContainer}>
              <Text style={styles.txValue} numberOfLines={1}>
                {item.tx_hash.slice(0, 10)}...{item.tx_hash.slice(-8)}
              </Text>
              <Ionicons name="copy-outline" size={14} color={CYAN} />
            </View>
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>申请时间</Text>
            <Text style={styles.timeValue}>{formatTime(item.created_at)}</Text>
          </View>

          {item.processed_at && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>处理时间</Text>
              <Text style={styles.timeValue}>{formatTime(item.processed_at)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 渲染空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color={BORDER_GRAY} />
      <Text style={styles.emptyText}>暂无提现记录</Text>
      <Text style={styles.emptySubtext}>您的提现记录将显示在这里</Text>
    </View>
  );

  // 渲染底部加载
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={YELLOW} />
        <Text style={styles.footerText}>加载更多...</Text>
      </View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const address = await loadWalletAddress();
        if (address) {
          setLoading(true);
          await loadRecords(1);
        } else {
          setLoading(false);
        }
      };
      init();
    }, [loadWalletAddress, loadRecords])
  );

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: BG_DARK }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={YELLOW} />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (!walletAddress) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: BG_DARK }]}>
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={BORDER_GRAY} />
            <Text style={styles.emptyText}>请先连接钱包</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: BG_DARK }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={TEXT_WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>提现记录</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsCard}>
          <View style={styles.statsItem}>
            <Ionicons name="wallet" size={20} color={YELLOW} />
            <Text style={styles.statsLabel}>累计提现</Text>
            <Text style={styles.statsValue}>{totalWithdraw}</Text>
            <Text style={styles.statsUnit}>DQT</Text>
          </View>
        </View>

        {/* 记录列表 */}
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={YELLOW}
              colors={[YELLOW]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG_CARD_SOLID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  headerRight: {
    width: 40,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  statsItem: {
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: YELLOW,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  statsUnit: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  recordCard: {
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: YELLOW + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: YELLOW,
    fontWeight: '500',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recordBody: {
    padding: 16,
  },
  amountRow: {
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: CYAN,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  txValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txValue: {
    fontSize: 12,
    color: CYAN,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: 180,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  timeValue: {
    fontSize: 12,
    color: TEXT_WHITE,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_WHITE,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 12,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
});
