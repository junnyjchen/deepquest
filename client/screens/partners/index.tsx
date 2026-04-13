import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { partnersApi } from '@/utils/api';

interface Partner {
  id: number;
  user_address: string;
  order: number;
  personal_invest: string;
  direct_sales: string;
  dq_reward: string;
  sol_reward: string;
  status: string;
  created_at: string;
}

interface PartnerResponse {
  data: Partner[];
  total: number;
  page: number;
  pageSize: number;
}

interface PartnerStats {
  activeCount: number;
  totalDQ: number;
  totalSOL: number;
}

export default function PartnersScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async (pageNum: number = 1) => {
    try {
      const [partnersResult, statsResult] = await Promise.all([
        partnersApi.getList({ page: pageNum, pageSize: 20 }),
        partnersApi.getStats(),
      ]);
      
      if (pageNum === 1) {
        setPartners(partnersResult.data || []);
      } else {
        setPartners(prev => [...prev, ...(partnersResult.data || [])]);
      }
      setTotalPages(partnersResult.totalPages);
      setPage(pageNum);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(1);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchData(page + 1);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(2);
  };

  const handleUpdateStatus = async (address: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'removed' : 'active';
    Alert.alert(
      'Update Partner Status',
      `Change status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await partnersApi.updateStatus(address, newStatus);
              fetchData(1);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getTierColor = (order: number) => {
    if (order <= 20) return '#FFD700'; // Gold
    if (order <= 50) return '#00F0FF'; // Cyan
    return '#BF00FF'; // Purple
  };

  const renderItem = ({ item }: { item: Partner }) => (
    <View style={styles.partnerCard}>
      <View style={styles.cardHeader}>
        <View style={styles.orderContainer}>
          <LinearGradient
            colors={[getTierColor(item.order), `${getTierColor(item.order)}80`]}
            style={styles.orderBadge}
          >
            <Text style={styles.orderText}>#{item.order}</Text>
          </LinearGradient>
          <Text style={styles.addressText}>{formatAddress(item.user_address)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statusButton,
            item.status === 'active' ? styles.activeButton : styles.inactiveButton
          ]}
          onPress={() => handleUpdateStatus(item.user_address, item.status)}
        >
          <Text style={[
            styles.statusButtonText,
            item.status === 'active' ? styles.activeText : styles.inactiveText
          ]}>
            {item.status === 'active' ? 'ACTIVE' : 'REMOVED'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Personal Invest</Text>
          <Text style={styles.statValue}>{formatAmount(item.personal_invest)} SOL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Direct Sales</Text>
          <Text style={styles.statValue}>{formatAmount(item.direct_sales)} SOL</Text>
        </View>
      </View>

      <View style={styles.rewardsRow}>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardLabel}>DQ Rewards</Text>
          <Text style={[styles.rewardValue, { color: '#00FF88' }]}>
            {formatAmount(item.dq_reward)}
          </Text>
        </View>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardLabel}>SOL Rewards</Text>
          <Text style={[styles.rewardValue, { color: '#FFD700' }]}>
            {formatAmount(item.sol_reward)} SOL
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <AdminLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PARTNER MANAGEMENT</Text>
          <Text style={styles.headerSubtitle}>合伙人管理</Text>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsHeader}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{stats.activeCount}</Text>
              <Text style={styles.headerStatLabel}>TOTAL PARTNERS</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{formatAmount(String(stats.totalDQ))}</Text>
              <Text style={styles.headerStatLabel}>DQ REWARDS</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{formatAmount(String(stats.totalSOL))}</Text>
              <Text style={styles.headerStatLabel}>SOL REWARDS</Text>
            </View>
          </View>
        )}

        {/* List */}
        <FlatList
          data={partners}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator color="#00F0FF" style={styles.footer} />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No partners found</Text>
              </View>
            ) : null
          }
        />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 3,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EAEAEA',
    marginTop: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  headerStat: {
    flex: 1,
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00F0FF',
    marginBottom: 4,
  },
  headerStatLabel: {
    fontSize: 9,
    color: '#555570',
    letterSpacing: 1,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  partnerCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0A0F',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#EAEAEA',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeButton: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  inactiveButton: {
    borderColor: '#FF003C',
    backgroundColor: 'rgba(255, 0, 60, 0.1)',
  },
  statusButtonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeText: {
    color: '#00FF88',
  },
  inactiveText: {
    color: '#FF003C',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAEAEA',
  },
  rewardsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.1)',
    paddingTop: 12,
    gap: 16,
  },
  rewardItem: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#555570',
    fontSize: 14,
  },
  footer: {
    padding: 16,
  },
});
