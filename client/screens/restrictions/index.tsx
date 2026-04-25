import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { restrictionsApi } from '@/utils/api';

interface RestrictionRecord {
  id: number;
  user_address: string;
  reason: string;
  restricted_at: string;
  restricted_by: string;
  status: 'restricted' | 'unrestricted';
  restricted_by_name?: string;
}

interface RestrictionStats {
  totalRestricted: number;
  activeRestricted: number;
  totalRestrictedReward: string;
}

export default function RestrictionsScreen() {
  const [records, setRecords] = useState<RestrictionRecord[]>([]);
  const [stats, setStats] = useState<RestrictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RestrictionRecord | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async (pageNum: number = 1) => {
    try {
      const [recordsResult, statsResult] = await Promise.all([
        restrictionsApi.getList({ page: pageNum, pageSize: 20 }),
        restrictionsApi.getStats(),
      ]);
      
      if (pageNum === 1) {
        setRecords(recordsResult.data || []);
      } else {
        setRecords(prev => [...prev, ...(recordsResult.data || [])]);
      }
      setTotalPages(recordsResult.totalPages);
      setPage(pageNum);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to fetch restrictions:', error);
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
    if (!address || address.length < 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleAddRestriction = async () => {
    if (!addressInput.trim()) {
      Alert.alert('错误', '请输入钱包地址');
      return;
    }
    
    // 验证地址格式
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(addressInput.trim())) {
      Alert.alert('错误', '钱包地址格式不正确');
      return;
    }

    Alert.alert(
      '确认限制',
      `确定要限制地址 ${formatAddress(addressInput)} 吗？\n\n限制后该地址将无法领取任何奖励收益。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认限制',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await restrictionsApi.add(addressInput.trim(), reasonInput.trim());
              Alert.alert('成功', '地址已限制');
              setShowAddModal(false);
              setAddressInput('');
              setReasonInput('');
              fetchData(1);
            } catch (error: any) {
              Alert.alert('错误', error.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveRestriction = (record: RestrictionRecord) => {
    Alert.alert(
      '确认解除',
      `确定要解除地址 ${formatAddress(record.user_address)} 的限制吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认解除',
          onPress: async () => {
            try {
              await restrictionsApi.remove(record.user_address);
              Alert.alert('成功', '地址限制已解除');
              fetchData(1);
            } catch (error: any) {
              Alert.alert('错误', error.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RestrictionRecord }) => (
    <TouchableOpacity 
      style={styles.recordCard}
      onPress={() => {
        setSelectedRecord(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.addressContainer}>
          <Text style={styles.addressText}>{formatAddress(item.user_address)}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'restricted' ? styles.restrictedBadge : styles.unrestrictedBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'restricted' ? styles.restrictedText : styles.unrestrictedText
            ]}>
              {item.status === 'restricted' ? '已限制' : '已解除'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>限制原因</Text>
          <Text style={styles.infoValue}>{item.reason || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>限制时间</Text>
          <Text style={styles.infoValue}>{formatDate(item.restricted_at)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>操作人</Text>
          <Text style={styles.infoValue}>{item.restricted_by_name || formatAddress(item.restricted_by)}</Text>
        </View>
      </View>

      {item.status === 'restricted' && (
        <TouchableOpacity 
          style={styles.unrestrictButton}
          onPress={() => handleRemoveRestriction(item)}
        >
          <Text style={styles.unrestrictButtonText}>解除限制</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <AdminLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ADDRESS MANAGEMENT</Text>
          <Text style={styles.headerSubtitle}>地址限制管理</Text>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsHeader}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{stats.totalRestricted}</Text>
              <Text style={styles.headerStatLabel}>TOTAL</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatValue, { color: '#FF003C' }]}>{stats.activeRestricted}</Text>
              <Text style={styles.headerStatLabel}>RESTRICTED</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{parseFloat(stats.totalRestrictedReward || '0').toFixed(2)}</Text>
              <Text style={styles.headerStatLabel}>REWARD LOCKED (SOL)</Text>
            </View>
          </View>
        )}

        {/* Add Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonText}>+ 添加限制地址</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* List */}
        <FlatList
          data={records}
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
                <Text style={styles.emptyText}>No restricted addresses</Text>
              </View>
            ) : null
          }
        />

        {/* Add Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>添加限制地址</Text>
              
              <Text style={styles.inputLabel}>钱包地址</Text>
              <TextInput
                style={styles.input}
                value={addressInput}
                onChangeText={setAddressInput}
                placeholder="0x..."
                placeholderTextColor="#555570"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <Text style={styles.inputLabel}>限制原因</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reasonInput}
                onChangeText={setReasonInput}
                placeholder="请输入限制原因..."
                placeholderTextColor="#555570"
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddModal(false);
                    setAddressInput('');
                    setReasonInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleAddRestriction}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0A0A0F" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>确认限制</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal
          visible={showDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>地址详情</Text>
              
              {selectedRecord && (
                <ScrollView style={styles.detailContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>钱包地址</Text>
                    <Text style={styles.detailValue}>{selectedRecord.user_address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>限制原因</Text>
                    <Text style={styles.detailValue}>{selectedRecord.reason || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>限制时间</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedRecord.restricted_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>操作人</Text>
                    <Text style={styles.detailValue}>{selectedRecord.restricted_by_name || selectedRecord.restricted_by}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>当前状态</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: selectedRecord.status === 'restricted' ? '#FF003C' : '#00FF88' }
                    ]}>
                      {selectedRecord.status === 'restricted' ? '已限制' : '已解除'}
                    </Text>
                  </View>
                </ScrollView>
              )}
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeButtonText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  addButton: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  addButtonGradient: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0A0A0F',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  recordCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#EAEAEA',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  restrictedBadge: {
    backgroundColor: 'rgba(255, 0, 60, 0.2)',
  },
  unrestrictedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  restrictedText: {
    color: '#FF003C',
  },
  unrestrictedText: {
    color: '#00FF88',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#555570',
  },
  infoValue: {
    fontSize: 12,
    color: '#EAEAEA',
    flex: 1,
    textAlign: 'right',
  },
  unrestrictButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00FF88',
    alignItems: 'center',
  },
  unrestrictButtonText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    color: '#555570',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0A0A0F',
    borderRadius: 8,
    padding: 12,
    color: '#EAEAEA',
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555570',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF003C',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailContent: {
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#555570',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#EAEAEA',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555570',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
  },
});
