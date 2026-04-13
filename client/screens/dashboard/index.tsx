import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardApi, depositsApi } from '@/utils/api';

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

  const fetchData = useCallback(async () => {
    try {
      const [statsData, trendData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getTrend(7),
      ]);
      setStats(statsData);
      setTrend(trendData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  return (
    <AdminLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SYSTEM STATUS</Text>
          <Text style={styles.headerSubtitle}>全网实时概览</Text>
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerLine}
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="TOTAL USERS"
            value={formatNumber(stats?.users.total || 0, 0)}
            color="#00F0FF"
            icon="[U]"
          />
          <StatCard
            label="TOTAL DEPOSIT"
            value={formatNumber(stats?.deposits.total || 0, 2) + ' SOL'}
            color="#00FF88"
            icon="[D]"
          />
          <StatCard
            label="TODAY DEPOSIT"
            value={formatNumber(stats?.deposits.today || 0, 2) + ' SOL'}
            color="#FFD700"
            icon="[T]"
          />
          <StatCard
            label="TOTAL WITHDRAW"
            value={formatNumber(stats?.withdrawals.total || 0, 2) + ' SOL'}
            color="#FF003C"
            icon="[W]"
          />
        </View>

        {/* Reward Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REWARD DISTRIBUTION</Text>
          <View style={styles.rewardGrid}>
            <RewardItem label="Direct" amount={stats?.rewards.byType?.direct || 0} />
            <RewardItem label="Node" amount={stats?.rewards.byType?.node || 0} />
            <RewardItem label="Management" amount={stats?.rewards.byType?.management || 0} />
            <RewardItem label="DAO" amount={stats?.rewards.byType?.dao || 0} />
          </View>
          <View style={styles.totalReward}>
            <Text style={styles.totalRewardLabel}>TOTAL REWARDS</Text>
            <Text style={styles.totalRewardValue}>
              {formatNumber(stats?.rewards.total || 0, 2)} SOL
            </Text>
          </View>
        </View>

        {/* Deposit Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-DAY DEPOSIT TREND</Text>
          <View style={styles.trendChart}>
            {trend.map((item, index) => {
              const maxAmount = Math.max(...trend.map(t => t.amount), 1);
              const height = (item.amount / maxAmount) * 100;
              return (
                <View key={item.date} style={styles.trendBar}>
                  <View style={[styles.bar, { height: `${Math.max(height, 5)}%` }]} />
                  <Text style={styles.barLabel}>{formatDate(item.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Other Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM METRICS</Text>
          <View style={styles.metricsGrid}>
            <MetricItem label="PARTNERS" value={stats?.partners.total || 0} color="#BF00FF" />
            <MetricItem label="NFT CARDS" value={stats?.cards.total || 0} color="#FFD700" />
            <MetricItem label="BLOCKS (7D)" value={stats?.blocks.recentCount || 0} color="#00F0FF" />
            <MetricItem label="POOL BALANCE" value={formatNumber(stats?.pools.totalBalance || 0) + ' SOL'} color="#00FF88" />
          </View>
        </View>

        {/* Level Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEVEL DISTRIBUTION</Text>
          <View style={styles.levelList}>
            {[6, 5, 4, 3, 2, 1].map(level => (
              <View key={level} style={styles.levelItem}>
                <Text style={styles.levelLabel}>S{level}</Text>
                <View style={styles.levelBar}>
                  <View 
                    style={[
                      styles.levelFill, 
                      { 
                        width: `${Math.min(
                          ((stats?.levelDistribution[level] || 0) / (stats?.users.total || 1)) * 100,
                          100
                        )}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.levelValue}>{stats?.levelDistribution[level] || 0}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <LinearGradient
        colors={[`${color}40`, 'transparent']}
        style={styles.statGlow}
      />
    </View>
  );
}

function RewardItem({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.rewardItem}>
      <Text style={styles.rewardLabel}>{label}</Text>
      <Text style={styles.rewardAmount}>{amount.toFixed(2)}</Text>
    </View>
  );
}

function MetricItem({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    letterSpacing: 2,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 3,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EAEAEA',
    marginTop: 8,
  },
  headerLine: {
    height: 2,
    width: 60,
    marginTop: 16,
    borderRadius: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 2,
    fontWeight: '600',
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  statGlow: {
    position: 'absolute',
    bottom: 0,
    left: 6,
    right: 6,
    height: 40,
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 16,
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  rewardItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  rewardLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
  },
  totalReward: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  totalRewardLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 2,
    marginBottom: 4,
  },
  totalRewardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00F0FF',
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    backgroundColor: '#00F0FF',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#555570',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  levelList: {},
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#EAEAEA',
  },
  levelBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#12121A',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 4,
  },
  levelValue: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#555570',
    textAlign: 'right',
  },
});
