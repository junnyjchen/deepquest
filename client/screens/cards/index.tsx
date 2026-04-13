import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { cardsApi } from '@/utils/api';

interface Card {
  id: number;
  token_id: number;
  owner_address: string;
  card_type: number;
  mint_price: string;
  dq_reward: string;
  fee_reward: string;
  status: string;
  minted_at: string;
}

interface CardStats {
  totalCards: number;
  totalA: number;
  totalB: number;
  totalC: number;
  totalReward: number;
  remainingA: number;
  remainingB: number;
  remainingC: number;
}

interface CardResponse {
  data: Card[];
  total: number;
  page: number;
  pageSize: number;
}

const cardTypeNames: Record<number, { name: string; color: string }> = {
  1: { name: 'A级', color: '#FFD700' },
  2: { name: 'B级', color: '#00F0FF' },
  3: { name: 'C级', color: '#BF00FF' },
};

export default function CardsScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [mintModalVisible, setMintModalVisible] = useState(false);
  const [mintAddress, setMintAddress] = useState('');
  const [mintType, setMintType] = useState<number>(1);
  const [mintLoading, setMintLoading] = useState(false);

  const fetchCards = useCallback(async (pageNum: number = 1, type?: number | null) => {
    try {
      const result: CardResponse = await cardsApi.getList({
        page: pageNum,
        pageSize: 20,
        cardType: type ?? undefined,
        search: searchText || undefined,
      });
      if (pageNum === 1) {
        setCards(result.data || []);
      } else {
        setCards(prev => [...prev, ...(result.data || [])]);
      }
      setTotalPages(Math.ceil((result.total || 0) / 20));
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await cardsApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchCards(1, filterType);
    fetchStats();
  }, [fetchCards, fetchStats, filterType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCards(1, filterType);
    fetchStats();
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchCards(page + 1, filterType);
    }
  };

  const handleFilterType = (type: number | null) => {
    setFilterType(type);
    setLoading(true);
    setCards([]);
  };

  const handleSearch = () => {
    setLoading(true);
    setCards([]);
    fetchCards(1, filterType);
  };

  const formatAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount || '0').toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getTypeInfo = (type: number) => {
    return cardTypeNames[type] || { name: '未知', color: '#555570' };
  };

  const getTypeColor = (type: number) => {
    return cardTypeNames[type]?.color || '#555570';
  };

  // 批量发放卡牌
  const handleMintCards = async () => {
    if (!mintAddress.trim()) {
      Alert.alert('错误', '请输入钱包地址');
      return;
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(mintAddress)) {
      Alert.alert('错误', '钱包地址格式不正确');
      return;
    }

    setMintLoading(true);
    try {
      await cardsApi.mint([{
        ownerAddress: mintAddress,
        cardType: mintType,
        mintPrice: getMintPrice(mintType),
      }]);
      Alert.alert('成功', '卡牌发放成功');
      setMintModalVisible(false);
      setMintAddress('');
      onRefresh();
    } catch (error: any) {
      Alert.alert('错误', error.message || '发放失败');
    } finally {
      setMintLoading(false);
    }
  };

  const getMintPrice = (type: number) => {
    switch (type) {
      case 1: return '500';
      case 2: return '1000';
      case 3: return '3000';
      default: return '0';
    }
  };

  const renderItem = ({ item }: { item: Card }) => {
    const typeInfo = getTypeInfo(item.card_type);
    
    return (
      <View style={styles.cardItem}>
        <View style={styles.cardLeft}>
          <LinearGradient
            colors={[`${typeInfo.color}30`, 'transparent']}
            style={styles.cardGlow}
          />
          <View style={[styles.typeBadge, { borderColor: typeInfo.color }]}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>
              {typeInfo.name}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardMiddle}>
          <Text style={styles.tokenIdText}>#{item.token_id}</Text>
          <Text style={styles.ownerText}>{formatAddress(item.owner_address)}</Text>
          <Text style={styles.dateText}>{formatDate(item.minted_at)}</Text>
        </View>
        
        <View style={styles.cardRight}>
          <View style={styles.rewardContainer}>
            <Text style={styles.rewardLabel}>DQ奖励</Text>
            <Text style={[styles.rewardValue, { color: '#00FF88' }]}>
              {formatAmount(item.dq_reward)}
            </Text>
          </View>
          <View style={styles.rewardContainer}>
            <Text style={styles.rewardLabel}>手续费</Text>
            <Text style={[styles.rewardValue, { color: '#00F0FF' }]}>
              {formatAmount(item.fee_reward)}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#00FF8820' : '#FF003C20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'active' ? '#00FF88' : '#FF003C' }
          ]}>
            {item.status === 'active' ? '持有中' : '已销毁'}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalCards || 0}</Text>
          <Text style={styles.statLabel}>总发行</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#FFD700' }]}>
          <Text style={[styles.statValue, { color: '#FFD700' }]}>{stats?.totalA || 0}</Text>
          <Text style={styles.statLabel}>A级 ({stats?.remainingA || 0})</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#00F0FF' }]}>
          <Text style={[styles.statValue, { color: '#00F0FF' }]}>{stats?.totalB || 0}</Text>
          <Text style={styles.statLabel}>B级 ({stats?.remainingB || 0})</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#BF00FF' }]}>
          <Text style={[styles.statValue, { color: '#BF00FF' }]}>{stats?.totalC || 0}</Text>
          <Text style={styles.statLabel}>C级 ({stats?.remainingC || 0})</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === null && styles.filterTabActive]}
            onPress={() => handleFilterType(null)}
          >
            <Text style={[styles.filterText, filterType === null && styles.filterTextActive]}>
              全部
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 1 && styles.filterTabActive, { borderColor: '#FFD700' }]}
            onPress={() => handleFilterType(1)}
          >
            <Text style={[styles.filterText, filterType === 1 && { color: '#FFD700' }]}>
              A级
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 2 && styles.filterTabActive, { borderColor: '#00F0FF' }]}
            onPress={() => handleFilterType(2)}
          >
            <Text style={[styles.filterText, filterType === 2 && { color: '#00F0FF' }]}>
              B级
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 3 && styles.filterTabActive, { borderColor: '#BF00FF' }]}
            onPress={() => handleFilterType(3)}
          >
            <Text style={[styles.filterText, filterType === 3 && { color: '#BF00FF' }]}>
              C级
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索钱包地址..."
          placeholderTextColor="#555570"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Mint Button */}
      <TouchableOpacity
        style={styles.mintButton}
        onPress={() => setMintModalVisible(true)}
      >
        <LinearGradient
          colors={['#00F0FF', '#BF00FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.mintButtonGradient}
        >
          <Text style={styles.mintButtonText}>+ 发放节点卡牌</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && cards.length === 0) {
    return (
      <AdminLayout>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING CARDS...</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无卡牌数据</Text>
          </View>
        }
        ListFooterComponent={
          loading && cards.length > 0 ? (
            <ActivityIndicator color="#00F0FF" style={styles.footerLoader} />
          ) : null
        }
      />

      {/* Mint Modal */}
      <Modal
        visible={mintModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMintModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>发放节点卡牌</Text>
              <TouchableOpacity onPress={() => setMintModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>钱包地址</Text>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor="#555570"
                value={mintAddress}
                onChangeText={setMintAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>卡牌类型</Text>
              <View style={styles.typeSelector}>
                {[1, 2, 3].map((type) => {
                  const info = getTypeInfo(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        mintType === type && { borderColor: info.color, backgroundColor: `${info.color}20` }
                      ]}
                      onPress={() => setMintType(type)}
                    >
                      <Text style={[styles.typeOptionText, { color: info.color }]}>
                        {info.name}
                      </Text>
                      <Text style={styles.typePrice}>{getMintPrice(type)} USDT</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setMintModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleMintCards}
                  disabled={mintLoading}
                >
                  {mintLoading ? (
                    <ActivityIndicator color="#0A0A12" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>确认发放</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#0A0A12',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A12',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    letterSpacing: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  statCard: {
    width: '23%',
    margin: '1%',
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888888',
    fontSize: 10,
    marginTop: 4,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  filterTabActive: {
    backgroundColor: '#00F0FF20',
    borderColor: '#00F0FF',
  },
  filterText: {
    color: '#888888',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#00F0FF',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#12121A',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 20,
    height: 44,
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#0A0A12',
    fontWeight: 'bold',
  },
  mintButton: {
    marginBottom: 8,
  },
  mintButtonGradient: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  mintButtonText: {
    color: '#0A0A12',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardItem: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  cardLeft: {
    marginRight: 12,
  },
  cardGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardMiddle: {
    flex: 1,
  },
  tokenIdText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
  },
  dateText: {
    color: '#555570',
    fontSize: 10,
    marginTop: 4,
  },
  cardRight: {
    marginRight: 12,
    alignItems: 'flex-end',
  },
  rewardContainer: {
    marginBottom: 4,
  },
  rewardLabel: {
    color: '#555570',
    fontSize: 10,
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#555570',
    fontSize: 14,
  },
  footerLoader: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2E',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: '#888888',
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0A12',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0A0A12',
    borderWidth: 1,
    borderColor: '#1E1E2E',
    alignItems: 'center',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  typePrice: {
    color: '#888888',
    fontSize: 10,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#00F0FF',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#0A0A12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
