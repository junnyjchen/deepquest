import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { depositsApi } from '@/utils/api';

interface Deposit {
  id: number;
  tx_hash: string;
  user_address: string;
  amount: string;
  phase: number;
  status: string;
  created_at: string;
}

interface DepositResponse {
  data: Deposit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export default function DepositsScreen() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDeposits = useCallback(async (pageNum: number = 1) => {
    try {
      const result: DepositResponse = await depositsApi.getList({
        page: pageNum,
        pageSize: 20,
      });
      if (pageNum === 1) {
        setDeposits(result.data || []);
      } else {
        setDeposits(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(result.totalPages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits(1);
  }, [fetchDeposits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeposits(1);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchDeposits(page + 1);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(4);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00FF88';
      case 'pending': return '#FFD700';
      case 'failed': return '#FF003C';
      default: return '#555570';
    }
  };

  const renderItem = ({ item }: { item: Deposit }) => (
    <View style={styles.depositCard}>
      <View style={styles.cardHeader}>
        <View style={styles.addressContainer}>
          <Text style={styles.userAddress}>{formatAddress(item.user_address)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.amount}>{formatAmount(item.amount)} SOL</Text>
      </View>
      
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Phase</Text>
          <Text style={styles.metaValue}>{item.phase}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>TX Hash</Text>
          <Text style={styles.metaValueMono}>{formatAddress(item.tx_hash)}</Text>
        </View>
      </View>
      
      <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
    </View>
  );

  return (
    <AdminLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DEPOSIT RECORDS</Text>
          <Text style={styles.headerSubtitle}>入金记录</Text>
        </View>

        {/* List */}
        <FlatList
          data={deposits}
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
                <Text style={styles.emptyText}>No deposits found</Text>
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
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  depositCard: {
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAddress: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#00F0FF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00FF88',
  },
  cardMeta: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 24,
  },
  metaItem: {},
  metaLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAEAEA',
  },
  metaValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#EAEAEA',
  },
  dateText: {
    fontSize: 11,
    color: '#555570',
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
