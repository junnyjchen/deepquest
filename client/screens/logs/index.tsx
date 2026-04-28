import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { logsApi } from '@/utils/api';

interface Log {
  id: number;
  admin_id: number;
  admin_address: string;
  action: string;
  target: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface LogResponse {
  data: Log[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

const actionColors: Record<string, string> = {
  create: '#00FF88',
  update: '#00F0FF',
  delete: '#FF003C',
  login: '#FFD700',
  mint: '#BF00FF',
  withdraw: '#FF6B00',
};

export default function LogsScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchLogs = useCallback(async (pageNum: number = 1) => {
    try {
      const result: LogResponse = await logsApi.getList({
        page: pageNum,
        pageSize: 20,
      });
      if (pageNum === 1) {
        setLogs(result.data || []);
      } else {
        setLogs(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(result.totalPages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(1);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchLogs(page + 1);
    }
  };

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.toLowerCase().includes(key)) {
        return color;
      }
    }
    return '#555570';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDetails = (details: any): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  };

  const renderItem = ({ item }: { item: Log }) => {
    const isExpanded = expandedLog === item.id;
    const actionColor = getActionColor(item.action);
    
    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => setExpandedLog(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.logHeader}>
          <View style={styles.logInfo}>
            <LinearGradient
              colors={[`${actionColor}30`, 'transparent']}
              style={styles.actionBadge}
            >
              <Text style={[styles.actionText, { color: actionColor }]}>
                {item.action.toUpperCase()}
              </Text>
            </LinearGradient>
            {item.target && (
              <Text style={styles.targetText}>{item.target}</Text>
            )}
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '>'}</Text>
        </View>

        <View style={styles.logMeta}>
          <Text style={styles.metaText}>Admin ID: {item.admin_id || 'N/A'}</Text>
          {item.ip_address && (
            <Text style={styles.metaText}>IP: {item.ip_address}</Text>
          )}
        </View>

        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>

        {isExpanded && item.details && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>DETAILS:</Text>
            <Text style={styles.detailsText}>{formatDetails(item.details)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <AdminLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OPERATION LOGS</Text>
          <Text style={styles.headerSubtitle}>操作日志</Text>
        </View>

        <View style={styles.legend}>
          {Object.entries(actionColors).map(([action, color]) => (
            <View key={action} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{action}</Text>
            </View>
          ))}
        </View>

        <FlatList
          data={logs}
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
                <Text style={styles.emptyText}>No logs found</Text>
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#555570',
    textTransform: 'capitalize',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  logCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#EAEAEA',
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    color: '#555570',
  },
  logMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#555570',
  },
  dateText: {
    fontSize: 11,
    color: '#555570',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.1)',
  },
  detailsLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    padding: 8,
    borderRadius: 4,
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
