import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { stakesApi } from '@/utils/api';

interface Stake {
  id: number;
  user_address: string;
  amount: string;
  stake_days: number;
  start_time: string;
  end_time: string;
  reward_amount: string;
  is_claimed: boolean;
  created_at: string;
}

interface StakeStats {
  totalStakes: number;
  totalAmount: number;
  totalRewards: number;
  claimedCount: number;
  unclaimedCount: number;
  byPeriod: {
    period: number;
    count: number;
    amount: number;
  }[];
}

interface StakeResponse {
  data: Stake[];
  total: number;
  page: number;
  pageSize: number;
}

const periodNames: Record<number, { name: string; color: string }> = {
  30: { name: '30天', color: '#00FF88' },
  90: { name: '90天', color: '#00F0FF' },
  180: { name: '180天', color: '#FFD700' },
  360: { name: '360天', color: '#BF00FF' },
};

export default function StakesScreen() {
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [stats, setStats] = useState<StakeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterPeriod, setFilterPeriod] = useState<number | null>(null);
  const [filterClaimed, setFilterClaimed] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchStakes = useCallback(async (pageNum: number = 1, period?: number | null, claimed?: boolean | null) => {
    try {
      const result: StakeResponse = await stakesApi.getList({
        page: pageNum,
        pageSize: 20,
        stakeDays: period ?? undefined,
        isClaimed: claimed ?? undefined,
        search: searchText || undefined,
      });
      if (pageNum === 1) {
        setStakes(result.data || []);
      } else {
        setStakes(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(Math.ceil((result.total || 0) / 20));
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch stakes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await stakesApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStakes(1, filterPeriod, filterClaimed);
    fetchStats();
  }, [fetchStakes, fetchStats, filterPeriod, filterClaimed]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStakes(1, filterPeriod, filterClaimed);
    fetchStats();
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchStakes(page + 1, filterPeriod, filterClaimed);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    setStakes([]);
    fetchStakes(1, filterPeriod, filterClaimed);
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount || '0').toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getPeriodInfo = (days: number) => {
    return periodNames[days] || { name: `${days}天`, color: '#555570' };
  };

  const getRemainingDays = (endTime: string) => {
    if (!endTime) return '进行中';
    const end = new Date(endTime);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}天` : '已到期';
  };

  const renderItem = ({ item }: { item: Stake }) => {
    const periodInfo = getPeriodInfo(item.stake_days);
    
    return (
      <View style={styles.stakeCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[`${periodInfo.color}30`, 'transparent']}
              style={styles.cardGlow}
            />
            <View style={[styles.periodBadge, { borderColor: periodInfo.color }]}>
              <Text style={[styles.periodText, { color: periodInfo.color }]}>
                {periodInfo.name}
              </Text>
            </View>
            <Text style={styles.addressText}>{formatAddress(item.user_address)}</Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.is_claimed ? '#00FF8820' : '#FFD70020' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.is_claimed ? '#00FF88' : '#FFD700' }
            ]}>
              {item.is_claimed ? '已领取' : '进行中'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>质押数量</Text>
              <Text style={styles.statValue}>{formatAmount(item.amount)} DQ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>预计奖励</Text>
              <Text style={[styles.statValue, { color: '#00FF88' }]}>
                {formatAmount(item.reward_amount)} DQ
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>开始时间</Text>
              <Text style={styles.dateValue}>{formatDate(item.start_time)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>到期时间</Text>
              <Text style={styles.dateValue}>{item.end_time ? formatDate(item.end_time) : '-'}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>剩余天数</Text>
              <Text style={[styles.dateValue, { color: periodInfo.color }]}>
                {getRemainingDays(item.end_time)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>{stats?.totalStakes || 0}</Text>
          <Text style={styles.statCardLabel}>总质押数</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#00FF88' }]}>
          <Text style={[styles.statCardValue, { color: '#00FF88' }]}>
            {formatAmount(String(stats?.totalAmount || 0))}
          </Text>
          <Text style={styles.statCardLabel}>质押总量</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#FFD700' }]}>
          <Text style={[styles.statCardValue, { color: '#FFD700' }]}>
            {stats?.claimedCount || 0}
          </Text>
          <Text style={styles.statCardLabel}>已领取</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#00F0FF' }]}>
          <Text style={[styles.statCardValue, { color: '#00F0FF' }]}>
            {stats?.unclaimedCount || 0}
          </Text>
          <Text style={styles.statCardLabel}>进行中</Text>
        </View>
      </View>

      {/* Period Filter */}
      <Text style={styles.filterLabel}>按周期筛选</Text>
      <View style={styles.periodScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.periodTab, filterPeriod === null && styles.periodTabActive]}
          onPress={() => {
            setFilterPeriod(null);
            setLoading(true);
            setStakes([]);
          }}
        >
          <Text style={[styles.periodTabText, filterPeriod === null && styles.periodTabTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        {Object.entries(periodNames).map(([days, info]) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.periodTab,
              filterPeriod === parseInt(days) && { borderColor: info.color, backgroundColor: `${info.color}20` }
            ]}
            onPress={() => {
              setFilterPeriod(parseInt(days));
              setLoading(true);
              setStakes([]);
            }}
          >
            <Text style={[
              styles.periodTabText,
              filterPeriod === parseInt(days) && { color: info.color }
            ]}>
              {info.name}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Status Filter */}
      <Text style={styles.filterLabel}>按状态筛选</Text>
      <View style={styles.statusFilterRow}>
        <TouchableOpacity
          style={[styles.statusTab, filterClaimed === null && styles.statusTabActive]}
          onPress={() => {
            setFilterClaimed(null);
            setLoading(true);
            setStakes([]);
          }}
        >
          <Text style={[styles.statusTabText, filterClaimed === null && styles.statusTabTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusTab, filterClaimed === false && styles.statusTabActive]}
          onPress={() => {
            setFilterClaimed(false);
            setLoading(true);
            setStakes([]);
          }}
        >
          <Text style={[styles.statusTabText, filterClaimed === false && { color: '#FFD700' }]}>
            进行中
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusTab, filterClaimed === true && styles.statusTabActive]}
          onPress={() => {
            setFilterClaimed(true);
            setLoading(true);
            setStakes([]);
          }}
        >
          <Text style={[styles.statusTabText, filterClaimed === true && { color: '#00FF88' }]}>
            已领取
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索钱包地址..."
          placeholderTextColor="#555570"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Period Distribution */}
      {stats?.byPeriod && stats.byPeriod.length > 0 && (
        <View style={styles.distributionContainer}>
          <Text style={styles.distributionTitle}>各周期分布</Text>
          <View style={styles.distributionGrid}>
            {stats.byPeriod.map((item) => {
              const info = getPeriodInfo(item.period);
              return (
                <View key={item.period} style={[styles.distributionItem, { borderColor: info.color }]}>
                  <Text style={[styles.distributionValue, { color: info.color }]}>
                    {item.count}
                  </Text>
                  <Text style={styles.distributionLabel}>{info.name}</Text>
                  <Text style={styles.distributionAmount}>
                    {formatAmount(String(item.amount))} DQ
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  if (loading && stakes.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING STAKES...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={stakes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无质押记录</Text>
          </View>
        }
        ListFooterComponent={
          loading && stakes.length > 0 ? (
            <ActivityIndicator color="#00F0FF" style={styles.footerLoader} />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A12',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    letterSpacing: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statCardLabel: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
  },
  filterLabel: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 8,
  },
  periodScroll: {
    marginBottom: 8,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  periodTabActive: {
    backgroundColor: '#00F00F20',
    borderColor: '#00F0FF',
  },
  periodTabText: {
    color: '#888888',
    fontSize: 14,
  },
  periodTabTextActive: {
    color: '#00F0FF',
  },
  statusFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#12121A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  statusTabActive: {
    backgroundColor: '#00F0FF20',
    borderColor: '#00F0FF',
  },
  statusTabText: {
    color: '#888888',
    fontSize: 14,
  },
  statusTabTextActive: {
    color: '#00F0FF',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#12121A',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 20,
    height: 44,
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#0A0A12',
    fontWeight: 'bold',
  },
  distributionContainer: {
    marginTop: 8,
  },
  distributionTitle: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
  },
  distributionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  distributionItem: {
    width: '23%',
    margin: '1%',
    backgroundColor: '#12121A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  distributionValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  distributionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
  },
  distributionAmount: {
    color: '#888888',
    fontSize: 8,
    marginTop: 2,
  },
  stakeCard: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 15,
  },
  periodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 10,
  },
  periodText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#888888',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {},
  statRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#555570',
    fontSize: 10,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    color: '#555570',
    fontSize: 10,
  },
  dateValue: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#555570',
    fontSize: 14,
  },
  footerLoader: {
    marginVertical: 20,
  },
});
