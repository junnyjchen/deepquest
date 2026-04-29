import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardApi } from '@/utils/api';

// API Base URL（用于调试）
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface DashboardStats {
  users: { total: number };
  deposits: { total: number; today: number; week: number };
  withdrawals: { total: number };
  rewards: { total: number; byType: Record<string, number> };
  partners: { total: number };
  cards: { total: number };
  blocks: { recentCount: number; recentReleased: number; recentBurned: number };
  pools: { totalBalance: number };
  levelDistribution: Record<number, number>;
}

interface TrendData {
  date: string;
  amount: number;
  count: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('[Dashboard] API_BASE:', API_BASE);
      console.log('[Dashboard] Full URL:', `${API_BASE}/api/v1/dashboard/stats`);
      setError(null);
      const [statsData, trendData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getTrend(7),
      ]);
      setStats(statsData);
      setTrend(trendData);
    } catch (err: any) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
      console.error('[Dashboard] Error name:', err.name);
      console.error('[Dashboard] Error message:', err.message);
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(decimals) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING DATA...</Text>
        </View>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>ERROR</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  const maxTrendAmount = Math.max(...trend.map(t => t.amount), 1);

  return (
    <AdminLayout>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>总用户数</Text>
            <Text style={styles.overviewValue}>{stats?.users?.total || 0}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>总入金</Text>
            <Text style={styles.overviewValue}>{formatNumber(stats?.deposits?.total || 0)}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>今日入金</Text>
            <Text style={styles.overviewValue}>{formatNumber(stats?.deposits?.today || 0)}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>本周入金</Text>
            <Text style={styles.overviewValue}>{formatNumber(stats?.deposits?.week || 0)}</Text>
          </View>
        </View>

        {/* Users & Partners */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>用户与合伙人</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>注册用户</Text>
              <Text style={styles.statValue}>{stats?.users?.total || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>合伙人</Text>
              <Text style={styles.statValue}>{stats?.partners?.total || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>节点卡牌</Text>
              <Text style={styles.statValue}>{stats?.cards?.total || 0}</Text>
            </View>
          </View>
        </View>

        {/* Deposits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>入金统计</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总入金</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.deposits?.total || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>今日入金</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.deposits?.today || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>本周入金</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.deposits?.week || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Rewards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>奖金池</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总奖金</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.rewards?.total || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总出金</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.withdrawals?.total || 0)}</Text>
            </View>
          </View>
          <View style={styles.rewardsList}>
            {stats?.rewards?.byType && Object.entries(stats.rewards.byType).map(([type, amount]) => (
              <View key={type} style={styles.rewardItem}>
                <Text style={styles.rewardType}>{type}</Text>
                <Text style={styles.rewardAmount}>{formatNumber(amount as number)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Block Mining */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>爆块信息</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>近期爆块</Text>
              <Text style={styles.statValue}>{stats?.blocks?.recentCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>释放DQ</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.blocks?.recentReleased || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>销毁DQ</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.blocks?.recentBurned || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Pools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>资金池</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总余额</Text>
              <Text style={styles.statValue}>{formatNumber(stats?.pools?.totalBalance || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7日趋势</Text>
          <View style={styles.chartContainer}>
            {trend.map((item, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: Math.max((item.amount / maxTrendAmount) * 100, 4) }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{formatDate(item.date)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Level Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>等级分布</Text>
          <View style={styles.levelGrid}>
            {Object.entries(stats?.levelDistribution || {}).map(([level, count]) => (
              <View key={level} style={styles.levelItem}>
                <Text style={styles.levelLabel}>S{level}</Text>
                <Text style={styles.levelValue}>{count as number}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  overviewCard: {
    width: '50%',
    padding: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  rewardsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rewardType: {
    fontSize: 14,
    color: '#666',
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 4,
  },
  bar: {
    backgroundColor: '#3498db',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  levelItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  levelLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  levelValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
});
