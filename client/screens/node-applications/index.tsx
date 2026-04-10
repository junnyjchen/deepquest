import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { nodeApplicationsApi } from '@/utils/api';

interface NodeApplication {
  id: number;
  user_address: string;
  user_name: string;
  apply_type: string;
  apply_reason: string;
  contact_info: string;
  total_invest: string;
  team_size: number;
  attachment_url: string;
  status: string;
  reviewer_notes: string;
  created_at: string;
  reviewed_at: string;
}

interface ApplicationResponse {
  data: NodeApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const statusColors: Record<string, string> = {
  pending: '#FFD700',
  approved: '#00FF88',
  rejected: '#FF003C',
};

const applyTypeLabels: Record<string, string> = {
  node_partner: 'Node Partner',
  node_delegate: 'Node Delegate',
};

export default function NodeApplicationsScreen() {
  const [applications, setApplications] = useState<NodeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewingApp, setReviewingApp] = useState<NodeApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchApplications = useCallback(async (pageNum: number = 1) => {
    try {
      const result: ApplicationResponse = await nodeApplicationsApi.getList({
        page: pageNum,
        pageSize: 20,
        status: statusFilter || undefined,
      });
      if (pageNum === 1) {
        setApplications(result.data || []);
      } else {
        setApplications(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(result.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await nodeApplicationsApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchApplications(1);
    fetchStats();
  }, [fetchApplications, fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications(1);
    fetchStats();
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchApplications(page + 1);
    }
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setLoading(true);
    fetchApplications(1);
  };

  const handleReview = (app: NodeApplication) => {
    setReviewingApp(app);
    setReviewNotes('');
    setReviewModalVisible(true);
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!reviewingApp) return;
    
    try {
      await nodeApplicationsApi.review(reviewingApp.id, status, 1, reviewNotes);
      Alert.alert('Success', `Application ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setReviewModalVisible(false);
      fetchApplications(1);
      fetchStats();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to review application');
    }
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const renderItem = ({ item }: { item: NodeApplication }) => {
    const isExpanded = expandedApp === item.id;
    const statusColor = statusColors[item.status] || '#555570';
    
    return (
      <TouchableOpacity
        style={styles.appCard}
        onPress={() => setExpandedApp(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.appHeader}>
          <View style={styles.appInfo}>
            <LinearGradient
              colors={[`${statusColor}30`, 'transparent']}
              style={styles.statusBadge}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={styles.applyTypeText}>{applyTypeLabels[item.apply_type] || item.apply_type}</Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '>'}</Text>
        </View>

        <View style={styles.appMeta}>
          <Text style={styles.metaLabel}>User:</Text>
          <Text style={styles.metaValue}>{item.user_name || formatAddress(item.user_address)}</Text>
        </View>

        <View style={styles.appMeta}>
          <Text style={styles.metaLabel}>Address:</Text>
          <Text style={styles.addressValue}>{formatAddress(item.user_address)}</Text>
        </View>

        <View style={styles.appStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Invest</Text>
            <Text style={styles.statValue}>{parseFloat(item.total_invest || '0').toFixed(2)} SOL</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Team</Text>
            <Text style={styles.statValue}>{item.team_size || 0}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.apply_reason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason:</Text>
                <Text style={styles.detailValue}>{item.apply_reason}</Text>
              </View>
            )}
            {item.contact_info && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact:</Text>
                <Text style={styles.detailValue}>{item.contact_info}</Text>
              </View>
            )}
            {item.attachment_url && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Attachment:</Text>
                <Text style={[styles.detailValue, styles.link]} numberOfLines={1}>{item.attachment_url}</Text>
              </View>
            )}
            {item.reviewer_notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Review Notes:</Text>
                <Text style={styles.detailValue}>{item.reviewer_notes}</Text>
              </View>
            )}
            {item.reviewed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reviewed:</Text>
                <Text style={styles.detailValue}>{formatDate(item.reviewed_at)}</Text>
              </View>
            )}

            {item.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleReview(item)}
                >
                  <Text style={styles.actionButtonText}>REVIEW</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NODE APPLICATIONS</Text>
          <Text style={styles.headerSubtitle}>节点申请管理</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#FFD700' }]}>{stats.pending}</Text>
            <Text style={styles.statCardLabel}>PENDING</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#00FF88' }]}>{stats.approved}</Text>
            <Text style={styles.statCardLabel}>APPROVED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#FF003C' }]}>{stats.rejected}</Text>
            <Text style={styles.statCardLabel}>REJECTED</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['', 'pending', 'approved', 'rejected'].map((status) => (
            <TouchableOpacity
              key={status || 'all'}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => handleFilterChange(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {status ? status.toUpperCase() : 'ALL'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={applications}
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
                <Text style={styles.emptyText}>No applications found</Text>
              </View>
            ) : null
          }
        />

        {/* Review Modal */}
        <Modal
          visible={reviewModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReviewModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>REVIEW APPLICATION</Text>
              <Text style={styles.modalSubtitle}>
                {reviewingApp?.user_name || formatAddress(reviewingApp?.user_address || '')}
              </Text>

              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>REVIEW NOTES:</Text>
                <TextInput
                  style={styles.notesInput}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  placeholder="Enter review notes (optional)"
                  placeholderTextColor="#555570"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={() => submitReview('rejected')}
                >
                  <Text style={styles.modalButtonText}>REJECT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.approveButtonModal]}
                  onPress={() => submitReview('approved')}
                >
                  <Text style={styles.modalButtonText}>APPROVE</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  filterText: {
    fontSize: 11,
    color: '#555570',
    fontWeight: '600',
    letterSpacing: 1,
  },
  filterTextActive: {
    color: '#00F0FF',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  appCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    marginBottom: 12,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  applyTypeText: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 10,
    color: '#555570',
  },
  appMeta: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: '#555570',
    width: 60,
  },
  metaValue: {
    fontSize: 12,
    color: '#EAEAEA',
    flex: 1,
  },
  addressValue: {
    fontSize: 12,
    color: '#00F0FF',
    fontFamily: 'monospace',
    flex: 1,
  },
  appStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#555570',
  },
  statValue: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: '#555570',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.1)',
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#EAEAEA',
    lineHeight: 18,
  },
  link: {
    color: '#00F0FF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FF88',
    letterSpacing: 1,
  },
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
    fontSize: 14,
    color: '#00F0FF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#EAEAEA',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 0, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#FF003C',
  },
  approveButtonModal: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#EAEAEA',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
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
