import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { showToast } from '@/utils/toast';
import {
  connectWallet,
  buyNodeOnChain,
  approveUSDT,
  checkUSDTAllowance,
  getUSDTBalance,
} from '@/utils/web3';

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

// 卡牌配置类型
interface CardConfig {
  price: string;
  total: number;
  remaining: number;
  reward_rate: number;
  name: string;
  level: string;
  fee_rate: number;
  description?: string;
}

// 卡牌数据
interface CardData {
  id: number;
  card_type: string;
  card_level: string;
  price: string;
  reward_rate: number;
  fee_rate: number;
  status: string;
  purchased_at: string;
}

export default function DappNodes() {
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardConfig, setCardConfig] = useState<Record<string, CardConfig>>({});
  const [myCards, setMyCards] = useState<CardData[]>([]);
  const [cardStats, setCardStats] = useState({
    totalInvest: '0.00',
    pendingReward: '0.00',
    totalReward: '0.00',
  });
  const [activeTab, setActiveTab] = useState<'buy' | 'mine'>('buy');
  
  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger',
    onConfirm: () => { /* placeholder */ },
  });

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      setWalletAddress(address);

      // 获取卡牌配置
      const configRes = await dappApi.getCardConfig();
      if (configRes.code === 0 && configRes.data) {
        setCardConfig(configRes.data);
      }

      // 获取我的卡牌
      if (address) {
        const cardsRes = await dappApi.getMyCards(address);
        if (cardsRes.code === 0 && cardsRes.data) {
          setMyCards(cardsRes.data);
        }

        // 获取卡牌统计
        const statsRes = await dappApi.getCardStats(address);
        if (statsRes.code === 0 && statsRes.data) {
          setCardStats({
            totalInvest: statsRes.data.totalInvest,
            pendingReward: statsRes.data.pendingReward,
            totalReward: statsRes.data.totalReward,
          });
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 检查用户是否已购买某类型卡牌
  const hasCard = (cardType: string) => {
    return myCards.some(card => card.card_type === cardType);
  };

  // 购买卡牌
  const handleBuyCard = async () => {
    if (!walletAddress) {
      showToast.info('提示', '请先连接钱包');
      return;
    }

    if (!selectedCard) {
      showToast.info('提示', '请选择要购买的卡牌');
      return;
    }

    const card = cardConfig[selectedCard];
    if (!card) return;

    if (card.remaining <= 0) {
      showToast.error('提示', '该卡牌已售罄');
      return;
    }

    // 显示购买确认对话框
    setConfirmDialog({
      visible: true,
      title: '确认购买',
      message: `您确定购买 ${card.name} 吗？\n价格: ${card.price} USDT\n\n资金分配:\n- LP质押: 60%\n- 节点(NFT): 15%\n\n注意: 购买后不可退款`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, visible: false });
        (async () => {
            setSubmitting(true);
            try {
              // 检查是否连接了钱包
              if (typeof window !== 'undefined' && window.ethereum) {
                // 1. 获取钱包信息
                const walletInfo = await connectWallet();
                if (!walletInfo) {
                  showToast.error('错误', '钱包连接失败');
                  return;
                }

                const { signer } = walletInfo;

                // 2. 检查 USDT 余额
                const usdtBalance = await getUSDTBalance(walletAddress);
                const price = parseFloat(card.price);
                if (parseFloat(usdtBalance) < price) {
                  showToast.error('余额不足', `您的 USDT 余额不足\n当前余额: ${parseFloat(usdtBalance).toFixed(2)} USDT\n需要: ${card.price} USDT`);
                  return;
                }

                // 3. 检查 USDT 授权额度
                const allowance = await checkUSDTAllowance(walletAddress);
                console.log('[Nodes] USDT 授权额度:', allowance);

                if (parseFloat(allowance) < price) {
                  // 需要授权 - 显示授权确认对话框
                  setConfirmDialog({
                    visible: true,
                    title: '需要授权',
                    message: '为了购买节点卡片，需要先授权合约使用您的 USDT。',
                    type: 'info',
                    onConfirm: async () => {
                      setConfirmDialog({ ...confirmDialog, visible: false });
                      (async () => {
                      try {
                        const approveTx = await approveUSDT(signer, card.price);
                        showToast.info('授权已提交', '请等待区块链确认...');

                        // 等待授权确认
                        await approveTx.wait();

                        // 授权完成后，执行购买
                        await executeBuyNode(signer, selectedCard, card);
                      } catch (error: any) {
                        console.error('授权或购买失败:', error);
                        let errorMsg = error.message || '授权或购买失败';
                        if (error.message && error.message.includes('insufficient funds')) {
                          errorMsg = '余额不足，请确保有足够的 BNB 支付手续费';
                        }
                        showToast.error('失败', errorMsg);
                      } finally {
                        setSubmitting(false);
                      }
                    })();
                    },
                  });
                  return;
                }

                // 4. 已有足够授权，直接购买
                await executeBuyNode(signer, selectedCard, card);
              } else {
                // 模拟模式
                showToast.info('提示', '请在浏览器中使用钱包进行购买');
              }
            } catch (error: any) {
              console.error('购买失败:', error);
              showToast.error('错误', error.message || '网络错误，请重试');
            } finally {
              setSubmitting(false);
            }
          })();
      },
    });
  };

  // 执行链上购买节点
  const executeBuyNode = async (signer: any, cardType: string, card: CardConfig) => {
    try {
      // 将卡片类型转换为数字：A=1, B=2, C=3
      const cardTypeMap: Record<string, number> = { A: 1, B: 2, C: 3 };
      const cardTypeNum = cardTypeMap[cardType];

      if (!cardTypeNum) {
        throw new Error('无效的卡片类型');
      }

      const buyTx = await buyNodeOnChain(signer, cardTypeNum);
      showToast.info('购买已提交', `正在购买 ${card.name}...`);

      // 等待交易确认
      await buyTx.wait();

      // 调用后端 API 记录购买
      if (walletAddress) {
        try {
          await dappApi.buyCard(walletAddress, cardType, buyTx.hash);
        } catch (apiError) {
          console.log('[Nodes] 后端记录失败:', apiError);
        }
      }

      showToast.success(
        '购买成功',
        `恭喜您成功购买 ${card.name}！\n\n权益:\n- 每日分币: ${card.reward_rate}%\n- 赠送级别: ${card.level}\n- 手续费: ${card.fee_rate}% SOL`
      );
      loadData();
      setSelectedCard(null);
      setActiveTab('mine');
    } catch (error: any) {
      console.error('链上购买失败:', error);
      let errorMsg = error.message || '购买失败';
      if (error.message && error.message.includes('insufficient funds')) {
        errorMsg = 'USDT 余额不足或 BNB 手续费不足';
      } else if (error.message && error.message.includes('user rejected')) {
        errorMsg = '您取消了交易';
      }
      showToast.error('购买失败', errorMsg);
      throw error;
    }
  };

  // 获取卡牌颜色
  const getCardColor = (cardType: string) => {
    switch (cardType) {
      case 'A': return YELLOW;
      case 'B': return CYAN;
      case 'C': return PURPLE;
      default: return YELLOW;
    }
  };

  // 获取卡牌图标
  const getCardIcon = (cardType: string) => {
    switch (cardType) {
      case 'A': return 'ribbon';
      case 'B': return 'medal';
      case 'C': return 'star';
      default: return 'diamond';
    }
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
      <LogoHeader />
      <View style={[styles.container, { backgroundColor: BG_DARK }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 页面标题 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>节点权益</Text>
            <Text style={styles.headerSubtitle}>购买NFT卡牌，享受节点分红</Text>
          </View>

          {/* Tab切换 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'buy' && styles.tabActive]}
              onPress={() => setActiveTab('buy')}
            >
              <Text style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>
                购买卡牌
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
              onPress={() => setActiveTab('mine')}
            >
              <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>
                我的卡牌 ({myCards.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 购买区域 */}
          {activeTab === 'buy' && (
            <>
              {/* 资金分配说明 */}
              <View style={styles.allocationCard}>
                <Text style={styles.allocationTitle}>资金分配</Text>
                <View style={styles.allocationRow}>
                  <View style={styles.allocationItem}>
                    <View style={[styles.allocationBadge, { backgroundColor: GREEN + '30' }]}>
                      <Text style={[styles.allocationValue, { color: GREEN }]}>60%</Text>
                    </View>
                    <Text style={styles.allocationLabel}>LP质押</Text>
                  </View>
                  <View style={styles.allocationItem}>
                    <View style={[styles.allocationBadge, { backgroundColor: YELLOW + '30' }]}>
                      <Text style={[styles.allocationValue, { color: YELLOW }]}>15%</Text>
                    </View>
                    <Text style={styles.allocationLabel}>节点(NFT)</Text>
                  </View>
                  <View style={styles.allocationItem}>
                    <View style={[styles.allocationBadge, { backgroundColor: CYAN + '30' }]}>
                      <Text style={[styles.allocationValue, { color: CYAN }]}>25%</Text>
                    </View>
                    <Text style={styles.allocationLabel}>运营/研发</Text>
                  </View>
                </View>
              </View>

              {/* 卡牌列表 */}
              <View style={styles.cardList}>
                {Object.entries(cardConfig).map(([type, card]) => {
                  const color = getCardColor(type);
                  const owned = hasCard(type);
                  const soldOut = card.remaining <= 0;

                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.cardItem,
                        selectedCard === type && { borderColor: color, borderWidth: 2 },
                        owned && styles.cardItemOwned,
                        soldOut && styles.cardItemSoldOut,
                      ]}
                      onPress={() => !owned && !soldOut && setSelectedCard(type)}
                      disabled={owned || soldOut}
                    >
                      {/* 卡牌头部 */}
                      <View style={[styles.cardHeader, { backgroundColor: color }]}>
                        <View style={styles.cardIconContainer}>
                          <Ionicons
                            name={getCardIcon(type) as any}
                            size={32}
                            color={BG_DARK}
                          />
                        </View>
                        <Text style={styles.cardTitle}>{card.name}</Text>
                        <View style={styles.cardLevelBadge}>
                          <Text style={styles.cardLevelText}>{card.level}</Text>
                        </View>
                      </View>

                      {/* 卡牌内容 */}
                      <View style={styles.cardBody}>
                        <View style={styles.cardPriceRow}>
                          <Text style={styles.cardPriceLabel}>价格</Text>
                          <Text style={[styles.cardPrice, { color }]}>
                            {card.price} USDT
                          </Text>
                        </View>

                        <View style={styles.cardBenefits}>
                          <View style={styles.benefitItem}>
                            <Ionicons name="pie-chart" size={14} color={GREEN} />
                            <Text style={styles.benefitText}>
                              每日分币 {card.reward_rate}%
                            </Text>
                          </View>
                          <View style={styles.benefitItem}>
                            <Ionicons name="ribbon" size={14} color={PURPLE} />
                            <Text style={styles.benefitText}>
                              赠送{card.level}级别
                            </Text>
                          </View>
                          <View style={styles.benefitItem}>
                            <Ionicons name="wallet" size={14} color={CYAN} />
                            <Text style={styles.benefitText}>
                              手续费 {card.fee_rate}% SOL
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardFooter}>
                          <View style={styles.remainingBadge}>
                            <Text style={styles.remainingText}>
                              剩余 {card.remaining}/{card.total}
                            </Text>
                          </View>
                          {owned && (
                            <View style={[styles.ownedBadge, { backgroundColor: GREEN + '20' }]}>
                              <Text style={[styles.ownedText, { color: GREEN }]}>已购买</Text>
                            </View>
                          )}
                          {soldOut && !owned && (
                            <View style={[styles.ownedBadge, { backgroundColor: RED + '20' }]}>
                              <Text style={[styles.ownedText, { color: RED }]}>已售罄</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* 选中标记 */}
                      {selectedCard === type && !owned && (
                        <View style={[styles.selectedMark, { backgroundColor: color }]}>
                          <Ionicons name="checkmark" size={20} color={BG_DARK} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 购买按钮 */}
              {selectedCard && (
                <TouchableOpacity
                  style={[styles.buyButton, { backgroundColor: getCardColor(selectedCard) }]}
                  onPress={handleBuyCard}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={BG_DARK} />
                  ) : (
                    <>
                      <Ionicons name="cart" size={20} color={BG_DARK} />
                      <Text style={styles.buyButtonText}>
                        立即购买 {cardConfig[selectedCard]?.name}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* 我的卡牌区域 */}
          {activeTab === 'mine' && (
            <>
              {/* 统计卡片 */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{cardStats.totalInvest}</Text>
                  <Text style={styles.statLabel}>累计投入(USDT)</Text>
                </View>
                <View style={[styles.statItem, styles.statItemBorder]}>
                  <Text style={[styles.statValue, { color: YELLOW }]}>
                    {cardStats.pendingReward}
                  </Text>
                  <Text style={styles.statLabel}>待领取收益</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: GREEN }]}>
                    {cardStats.totalReward}
                  </Text>
                  <Text style={styles.statLabel}>累计收益</Text>
                </View>
              </View>

              {/* 卡牌列表 */}
              {myCards.length > 0 ? (
                <View style={styles.myCardsList}>
                  {myCards.map((card) => {
                    const color = getCardColor(card.card_type);
                    const config = cardConfig[card.card_type];

                    return (
                      <View
                        key={card.id}
                        style={[styles.myCardItem, { borderColor: color }]}
                      >
                        <View style={[styles.myCardHeader, { backgroundColor: color }]}>
                          <Ionicons
                            name={getCardIcon(card.card_type) as any}
                            size={24}
                            color={BG_DARK}
                          />
                          <Text style={styles.myCardTitle}>
                            {config?.name || card.card_type} 卡牌
                          </Text>
                        </View>

                        <View style={styles.myCardBody}>
                          <View style={styles.myCardRow}>
                            <Text style={styles.myCardLabel}>卡牌等级</Text>
                            <Text style={[styles.myCardValue, { color }]}>
                              {card.card_level}
                            </Text>
                          </View>
                          <View style={styles.myCardRow}>
                            <Text style={styles.myCardLabel}>购买价格</Text>
                            <Text style={styles.myCardValue}>
                              {card.price} USDT
                            </Text>
                          </View>
                          <View style={styles.myCardRow}>
                            <Text style={styles.myCardLabel}>每日分币</Text>
                            <Text style={[styles.myCardValue, { color: GREEN }]}>
                              {card.reward_rate}%
                            </Text>
                          </View>
                          <View style={styles.myCardRow}>
                            <Text style={styles.myCardLabel}>手续费率</Text>
                            <Text style={styles.myCardValue}>
                              {card.fee_rate}% SOL
                            </Text>
                          </View>
                          <View style={styles.myCardRow}>
                            <Text style={styles.myCardLabel}>购买时间</Text>
                            <Text style={styles.myCardValue}>
                              {new Date(card.purchased_at).toLocaleDateString('zh-CN')}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.myCardStatus}>
                          <View style={[styles.statusBadge, { backgroundColor: GREEN + '20' }]}>
                            <Text style={[styles.statusText, { color: GREEN }]}>
                              {card.status === 'active' ? '已激活' : card.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="card-outline" size={64} color={BORDER_GRAY} />
                  <Text style={styles.emptyText}>您还没有购买任何卡牌</Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setActiveTab('buy')}
                  >
                    <Text style={styles.emptyButtonText}>立即购买</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* 底部间距 */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      
      {/* 确认对话框 */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: TEXT_WHITE,
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: BG_CARD,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: YELLOW,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: BG_DARK,
  },
  allocationCard: {
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  allocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 16,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  allocationItem: {
    alignItems: 'center',
  },
  allocationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  allocationValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  allocationLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  cardList: {
    gap: 16,
  },
  cardItem: {
    backgroundColor: BG_CARD,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  cardItemOwned: {
    opacity: 0.7,
  },
  cardItemSoldOut: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: BG_DARK,
  },
  cardLevelBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardLevelText: {
    fontSize: 12,
    fontWeight: '700',
    color: BG_DARK,
  },
  cardBody: {
    padding: 16,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardPriceLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardBenefits: {
    gap: 8,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remainingText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  ownedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BG_DARK,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER_GRAY,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  myCardsList: {
    gap: 16,
  },
  myCardItem: {
    backgroundColor: BG_CARD,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  myCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: BG_DARK,
    marginLeft: 12,
  },
  myCardBody: {
    padding: 16,
  },
  myCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  myCardLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  myCardValue: {
    fontSize: 13,
    color: TEXT_WHITE,
    fontWeight: '500',
  },
  myCardStatus: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_MUTED,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: YELLOW,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BG_DARK,
  },
});
