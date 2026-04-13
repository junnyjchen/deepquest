import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
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

// 区块链DAPP标准：用户等级名称映射
const levelNames: Record<number, string> = {
  0: 'None',
  1: 'S1',
  2: 'S2',
  3: 'S3',
  4: 'S4',
  5: 'S5',
  6: 'S6',
};

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncAddress, setSyncAddress] = useState('');
  const [syncing, setSyncing] = useState(false);

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

  // 区块链DAPP标准：从链上同步用户
  const handleSyncUser = async () => {
    if (!syncAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }
    
    setSyncing(true);
    try {
      const result = await usersApi.syncUser(syncAddress.trim());
      setSyncModalVisible(false);
      setSyncAddress('');
      Alert.alert(
        'Success',
        result.isNew ? 'New user synced from chain' : 'User data updated',
        [{ text: 'OK', onPress: () => fetchUsers(1) }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync user');
    } finally {
      setSyncing(false);
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
    <AdminLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>USER MANAGEMENT</Text>
              <Text style={styles.headerSubtitle}>BSC Chain 用户管理</Text>
            </View>
            {/* BSC区块链DAPP标准：同步按钮 */}
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => setSyncModalVisible(true)}
            >
              <Text style={styles.syncButtonText}>SYNC FROM CHAIN</Text>
            </TouchableOpacity>
          </View>
          {/* BSC区块链DAPP说明 */}
          <Text style={styles.chainInfo}>
            BSC DAPP: Users identified by wallet address (0x...)
          </Text>
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

      {/* BSC区块链DAPP标准：同步用户Modal */}
      <Modal
        visible={syncModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SYNC USER FROM BSC CHAIN</Text>
            <Text style={styles.modalSubtitle}>
              从BSC区块链同步用户数据
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>BSC WALLET ADDRESS:</Text>
              <TextInput
                style={styles.addressInput}
                value={syncAddress}
                onChangeText={setSyncAddress}
                placeholder="Enter BSC wallet address (0x...)"
                placeholderTextColor="#555570"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Format: 0x + 40 hexadecimal characters
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSyncModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.syncConfirmButton]}
                onPress={handleSyncUser}
                disabled={syncing}
              >
                <ActivityIndicator color="#0A0A0F" size="small" />
                <Text style={styles.syncConfirmText}>
                  {syncing ? 'SYNCING...' : 'SYNC'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  chainInfo: {
    fontSize: 10,
    color: '#00F0FF',
    marginTop: 8,
    letterSpacing: 1,
  },
  syncButton: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
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
  // 区块链DAPP同步Modal样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
    textAlign: 'center',
    letterSpacing: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#00F0FF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addressInput: {
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#EAEAEA',
    fontFamily: 'monospace',
  },
  inputHint: {
    fontSize: 10,
    color: '#555570',
    marginTop: 8,
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#1A1A24',
    borderWidth: 1,
    borderColor: '#555570',
  },
  cancelButtonText: {
    color: '#EAEAEA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  syncConfirmButton: {
    backgroundColor: '#00F0FF',
  },
  syncConfirmText: {
    color: '#0A0A0F',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
