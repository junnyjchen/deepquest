import { useState, useCallback } from 'react';
import QuickMenu from '@/components/QuickMenu';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Screen } from '@/components/Screen';

import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';

const { width } = Dimensions.get('window');

// 颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD = 'rgba(26, 26, 48, 0.95)';
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const GREEN = '#00FF88';
const RED = '#FF4444';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const BORDER_GRAY = '#303040';

const WALLET_STORAGE_KEY = '@deepquest_wallet';

// 卡牌达标信息
interface CardNodeInfo {
  cardType: number;
  cardName: string;
  qualifiedLines: number;
  requiredLines: number;
  isQualified: boolean;
  rewardWeight: number;
  cardCount: number;
}

export default function DappNodes() {
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [nodeInfo, setNodeInfo] = useState<{
    cardCount: number;
    highestType: number;
    qualifiedLines: number;
    requiredLines: number;
    isQualified: boolean;
    cards: CardNodeInfo[];
  } | null>(null);
  const [pendingNFT, setPendingNFT] = useState('0.00');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<number | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      setWalletAddress(address);

      if (address) {
        // 获取节点达标信息
        const nodeInfoRes = await dappApi.getNodeInfo(address);
        if (nodeInfoRes.code === 0 && nodeInfoRes.data) {
          setNodeInfo(nodeInfoRes.data);
        }

        // 获取待领取NFT分红
        const userInfoRes = await dappApi.getUserInfo(address);
        if (userInfoRes.code === 0 && userInfoRes.data) {
          setPendingNFT(userInfoRes.data.pendingNft || '0.00');
        }
      }
    } catch (error) {
      console.error('加载节点信息失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 领取NFT分红
  const handleClaimNFT = async () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }

    if (!nodeInfo?.isQualified) {
      Alert.alert('提示', '您的节点未达标，无法领取分红');
      return;
    }

    Alert.alert(
      '领取NFT分红',
      `确定要领取 ${pendingNFT} DQ 的NFT分红吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认领取',
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await dappApi.claimNFT(walletAddress);
              if (response.code === 0) {
                Alert.alert('领取成功', `成功领取 ${pendingNFT} DQ！`);
                loadData();
              } else {
                Alert.alert('领取失败', response.message || '请重试');
              }
            } catch (error: any) {
              Alert.alert('错误', error.message || '网络错误');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // 获取卡牌颜色
  const getCardColor = (type: number) => {
    switch (type) {
      case 1: return YELLOW;
      case 2: return CYAN;
      case 3: return PURPLE;
      default: return YELLOW;
    }
  };

  // 获取卡牌名称
  const getCardName = (type: number) => {
    switch (type) {
      case 1: return 'S1 节点卡';
      case 2: return 'S2 节点卡';
      case 3: return 'S3 节点卡';
      default: return '未知';
    }
  };

  // 获取达标进度
  const getQualifiedProgress = () => {
    if (!nodeInfo) return 0;
    if (nodeInfo.requiredLines === 0) return 0;
    return Math.min((nodeInfo.qualifiedLines / nodeInfo.requiredLines) * 100, 100);
  };

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: BG_DARK }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={YELLOW} />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <QuickMenu />
      <ScrollView style={[styles.container, { backgroundColor: BG_DARK }]}>
        {/* 页面标题 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NODE CENTER</Text>
          <Text style={styles.headerSubtitle}>节点中心</Text>
        </View>

        {/* 达标状态卡片 */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>节点达标状态</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: nodeInfo?.isQualified ? GREEN + '20' : RED + '20' }
            ]}>
              <Ionicons 
                name={nodeInfo?.isQualified ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={nodeInfo?.isQualified ? GREEN : RED} 
              />
              <Text style={[
                styles.statusText,
                { color: nodeInfo?.isQualified ? GREEN : RED }
              ]}>
                {nodeInfo?.isQualified ? '已达标' : '未达标'}
              </Text>
            </View>
          </View>

          {/* 达标进度条 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { 
                  width: `${getQualifiedProgress()}%`,
                  backgroundColor: nodeInfo?.isQualified ? GREEN : YELLOW
                }
              ]} />
            </View>
            <Text style={styles.progressText}>
              {nodeInfo?.qualifiedLines || 0} / {nodeInfo?.requiredLines || 0} 条线
            </Text>
          </View>

          <Text style={styles.progressHint}>
            达标条件：直接下级中有用户完成入金即为1条达标线
          </Text>
        </View>

        {/* 待领取NFT分红 */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <Text style={styles.rewardLabel}>待领取 NFT 分红</Text>
            <View style={styles.rewardBadge}>
              <Ionicons name="diamond-outline" size={14} color={PURPLE} />
              <Text style={styles.rewardBadgeText}>DQ</Text>
            </View>
          </View>
          <Text style={styles.rewardAmount}>{pendingNFT}</Text>
          
          <TouchableOpacity
            style={[
              styles.claimButton,
              (!nodeInfo?.isQualified || parseFloat(pendingNFT) <= 0) && styles.claimButtonDisabled
            ]}
            onPress={handleClaimNFT}
            disabled={submitting || !nodeInfo?.isQualified || parseFloat(pendingNFT) <= 0}
          >
            {submitting ? (
              <ActivityIndicator color={BG_DARK} size="small" />
            ) : (
              <Text style={styles.claimButtonText}>
                {nodeInfo?.isQualified ? '领取分红' : '节点未达标'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 我的卡牌 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY NODES</Text>
          <Text style={styles.sectionSubtitle}>我的节点卡</Text>
          
          {nodeInfo?.cards && nodeInfo.cards.length > 0 ? (
            <View style={styles.cardsGrid}>
              {nodeInfo.cards.map((card) => (
                <TouchableOpacity
                  key={card.cardType}
                  style={[
                    styles.cardItem,
                    { borderColor: getCardColor(card.cardType) }
                  ]}
                  onPress={() => setSelectedCardType(card.cardType)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.cardIcon,
                    { backgroundColor: getCardColor(card.cardType) + '20' }
                  ]}>
                    <Ionicons 
                      name="ribbon" 
                      size={24} 
                      color={getCardColor(card.cardType)} 
                    />
                  </View>
                  <Text style={styles.cardName}>{card.cardName}</Text>
                  <Text style={styles.cardCount}>x{card.cardCount}</Text>
                  <View style={[
                    styles.cardQualified,
                    { backgroundColor: card.isQualified ? GREEN + '20' : RED + '20' }
                  ]}>
                    <Text style={[
                      styles.cardQualifiedText,
                      { color: card.isQualified ? GREEN : RED }
                    ]}>
                      {card.isQualified ? '已达标' : '未达标'}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardInfoText}>
                      {card.qualifiedLines}/{card.requiredLines} 线
                    </Text>
                    <Text style={styles.cardInfoText}>
                      权重: {card.rewardWeight}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCards}>
              <Ionicons name="card-outline" size={48} color={BORDER_GRAY} />
              <Text style={styles.emptyText}>您还没有购买节点卡</Text>
              <Text style={styles.emptyHint}>前往购买节点卡开启DeFi之旅</Text>
            </View>
          )}
        </View>

        {/* 卡牌说明 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>卡牌权益说明</Text>
          
          <View style={styles.infoCard}>
            <View style={[styles.infoCardHeader, { backgroundColor: YELLOW + '20' }]}>
              <View style={[styles.infoCardDot, { backgroundColor: YELLOW }]} />
              <Text style={[styles.infoCardName, { color: YELLOW }]}>S1 节点卡</Text>
              <Text style={styles.infoCardPrice}>500 USDT</Text>
            </View>
            <View style={styles.infoCardBody}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>需要 5 条达标线</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>NFT 分红权重: 4%</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>一拖五 LP 质押</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoCardHeader, { backgroundColor: CYAN + '20' }]}>
              <View style={[styles.infoCardDot, { backgroundColor: CYAN }]} />
              <Text style={[styles.infoCardName, { color: CYAN }]}>S2 节点卡</Text>
              <Text style={styles.infoCardPrice}>1500 USDT</Text>
            </View>
            <View style={styles.infoCardBody}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>需要 10 条达标线</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>NFT 分红权重: 5%</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>一拖十 LP 质押</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoCardHeader, { backgroundColor: PURPLE + '20' }]}>
              <View style={[styles.infoCardDot, { backgroundColor: PURPLE }]} />
              <Text style={[styles.infoCardName, { color: PURPLE }]}>S3 节点卡</Text>
              <Text style={styles.infoCardPrice}>5000 USDT</Text>
            </View>
            <View style={styles.infoCardBody}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>需要 20 条达标线</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>NFT 分红权重: 6%</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.infoItemText}>一拖二十 LP 质押</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 底部留白 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginTop: 4,
  },
  statusCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: TEXT_WHITE,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  rewardCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: PURPLE + '40',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardBadgeText: {
    fontSize: 12,
    color: PURPLE,
    fontWeight: '600',
  },
  rewardAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: PURPLE,
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: BORDER_GRAY,
  },
  claimButtonText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 2,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginTop: 4,
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardItem: {
    width: (width - 44) / 2,
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  cardQualified: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardQualifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardInfo: {
    alignItems: 'center',
    gap: 2,
  },
  cardInfoText: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  emptyCards: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
    opacity: 0.7,
  },
  infoSection: {
    margin: 16,
    marginTop: 0,
  },
  infoTitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 2,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: BG_CARD,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  infoCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoCardName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoCardPrice: {
    fontSize: 14,
    color: TEXT_WHITE,
    fontWeight: '700',
  },
  infoCardBody: {
    padding: 12,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItemText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
});
