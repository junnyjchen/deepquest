import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { usersApi } from '@/utils/api';
import { Link } from 'expo-router';

interface User {
  id: number;
  wallet_address: string;
  referrer_address: string;
  direct_count: number;
  level: number;
  total_invest: string;
  team_invest: string;
  energy: string;
  is_partner: boolean;
  created_at: string;
}

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = useCallback(async (pageNum: number = 1, search?: string) => {
    try {
      const result: UserListResponse = await usersApi.getList({
        page: pageNum,
        pageSize: 20,
        search: search || undefined,
      });
      if (pageNum === 1) {
        setUsers(result.data || []);
      } else {
        setUsers(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(result.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, searchText);
  };

  const onSearch = () => {
    setLoading(true);
    fetchUsers(1, searchText);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchUsers(page + 1, searchText);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const renderItem = ({ item }: { item: User }) => (
    <Link 
      href={`/user-detail?address=${item.wallet_address}`}
      style={styles.userCard}
    >
      <View style={styles.userHeader}>
        <View style={styles.addressContainer}>
          <Text style={styles.addressText}>{formatAddress(item.wallet_address)}</Text>
          {item.is_partner && (
            <LinearGradient
              colors={['#BF00FF', '#00F0FF']}
              style={styles.partnerBadge}
            >
              <Text style={styles.partnerText}>PARTNER</Text>
            </LinearGradient>
          )}
        </View>
        <Text style={styles.levelText}>S{item.level}</Text>
      </View>
      
      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Invest</Text>
          <Text style={styles.statValue}>{formatAmount(item.total_invest)} SOL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Team Invest</Text>
          <Text style={styles.statValue}>{formatAmount(item.team_invest)} SOL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Direct</Text>
          <Text style={styles.statValue}>{item.direct_count}</Text>
        </View>
      </View>
      
      <Text style={styles.dateText}>
        Joined: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </Link>
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>USER MANAGEMENT</Text>
          <Text style={styles.headerSubtitle}>用户管理</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={onSearch}
            placeholder="Search wallet address..."
            placeholderTextColor="#555570"
          />
          <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
            <Text style={styles.searchButtonText}>SEARCH</Text>
          </TouchableOpacity>
        </View>

        {/* User List */}
        <FlatList
          data={users}
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
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Screen>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#EAEAEA',
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#0A0A0F',
    fontWeight: '700',
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  userCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#00F0FF',
  },
  partnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partnerText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0A0A0F',
    letterSpacing: 1,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EAEAEA',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
