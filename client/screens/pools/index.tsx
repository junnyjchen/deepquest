import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { poolsApi } from '@/utils/api';

interface Pool {
  id: number;
  pool_name: string;
  balance: string;
  total_distributed: string;
}

interface PoolStats {
  pools: Record<string, { balance: number; distributed: number }>;
  totalBalance: number;
  totalDistributed: number;
}

const poolNames: Record<string, { label: string; color: string }> = {
  management: { label: 'Management Pool', color: '#00F0FF' },
  dao: { label: 'DAO Pool', color: '#BF00FF' },
  insurance: { label: 'Insurance Pool', color: '#FFD700' },
  operation: { label: 'Operation Pool', color: '#00FF88' },
  fee: { label: 'Fee Pool', color: '#FF003C' },
};

export default function PoolsScreen() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [poolsData, statsData] = await Promise.all([
        poolsApi.getAll(),
        poolsApi.getStats(),
      ]);
      setPools(poolsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch pools:', error);
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

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const getPoolInfo = (name: string) => {
    return poolNames[name] || { label: name, color: '#555570' };
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING POOL DATA...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FUND POOLS</Text>
          <Text style={styles.headerSubtitle}>资金池管理</Text>
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerLine}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TOTAL BALANCE</Text>
            <Text style={styles.summaryValue}>{formatAmount(stats?.totalBalance || 0)} SOL</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TOTAL DISTRIBUTED</Text>
            <Text style={[styles.summaryValue, { color: '#00FF88' }]}>
              {formatAmount(stats?.totalDistributed || 0)} SOL
            </Text>
          </View>
        </View>

        {/* Pool Cards */}
        <View style={styles.poolsGrid}>
          {pools.map((pool) => {
            const info = getPoolInfo(pool.pool_name);
            const poolStats = stats?.pools[pool.pool_name];
            
            return (
              <View key={pool.id} style={styles.poolCard}>
                <View style={styles.poolHeader}>
                  <LinearGradient
                    colors={[`${info.color}30`, 'transparent']}
                    style={styles.poolGlow}
                  />
                  <Text style={[styles.poolLabel, { color: info.color }]}>{info.label}</Text>
                </View>
                
                <View style={styles.poolStats}>
                  <View style={styles.poolStatItem}>
                    <Text style={styles.poolStatLabel}>Balance</Text>
                    <Text style={[styles.poolStatValue, { color: info.color }]}>
                      {formatAmount(pool.balance)} SOL
                    </Text>
                  </View>
                  <View style={styles.poolStatItem}>
                    <Text style={styles.poolStatLabel}>Distributed</Text>
                    <Text style={styles.poolStatValue}>
                      {formatAmount(pool.total_distributed)} SOL
                    </Text>
                  </View>
                </View>

                {/* Distribution Bar */}
                {poolStats && poolStats.distributed > 0 && (
                  <View style={styles.distributionBar}>
                    <View 
                      style={[
                        styles.distributionFill, 
                        { 
                          width: `${Math.min(
                            (poolStats.distributed / (poolStats.balance + poolStats.distributed)) * 100,
                            100
                          )}%`,
                          backgroundColor: info.color,
                        }
                      ]} 
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Pool Distribution Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>POOL DISTRIBUTION</Text>
          <View style={styles.chartContainer}>
            {Object.entries(poolNames).map(([key, info]) => {
              const poolStats = stats?.pools[key];
              const percentage = stats?.totalBalance 
                ? ((poolStats?.balance || 0) / stats.totalBalance * 100) 
                : 0;
              
              return (
                <View key={key} style={styles.chartItem}>
                  <View style={styles.chartLabelRow}>
                    <View style={[styles.chartDot, { backgroundColor: info.color }]} />
                    <Text style={styles.chartLabel}>{info.label}</Text>
                    <Text style={styles.chartPercentage}>{percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.chartBar}>
                    <View 
                      style={[
                        styles.chartBarFill, 
                        { width: `${percentage}%`, backgroundColor: info.color }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 2,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EAEAEA',
  },
  poolsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  poolCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  poolHeader: {
    marginBottom: 12,
  },
  poolGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 12,
  },
  poolLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  poolStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  poolStatItem: {},
  poolStatLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  poolStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EAEAEA',
  },
  distributionBar: {
    height: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  chartItem: {
    marginBottom: 16,
  },
  chartLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  chartLabel: {
    flex: 1,
    fontSize: 12,
    color: '#EAEAEA',
  },
  chartPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555570',
  },
  chartBar: {
    height: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
