import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappNodeApi } from '@/utils/api';

// 精确匹配参考图的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';

const WALLET_STORAGE_KEY = '@deepquest_wallet';

interface NodeLevel {
  type: string;
  name: string;
  stakeAmount: string;
  dailyReward: string;
  icon: string;
  color: string;
  description: string;
}

const NODE_LEVELS: NodeLevel[] = [
  {
    type: 'node_partner',
    name: '节点合伙人',
    stakeAmount: '10,000',
    dailyReward: '0.8%',
    icon: 'ribbon',
    color: '#FFD23F',
    description: '质押10,000 DQT，每日获得0.8%静态奖励',
  },
  {
    type: 'node_delegate',
    name: '节点代表',
    stakeAmount: '50,000',
    dailyReward: '1.2%',
    icon: 'medal',
    color: '#D020FF',
    description: '质押50,000 DQT，每日获得1.2%静态奖励',
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '审核中', color: '#FFA500' },
  approved: { label: '已通过', color: '#00FF00' },
  rejected: { label: '已拒绝', color: '#FF4444' },
};

export default function DappNodes() {
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [myApplication, setMyApplication] = useState<any>(null);

  // 加载钱包地址
  const loadWalletAddress = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      setWalletAddress(address);
      return address;
    } catch {
      return null;
    }
  }, []);

  // 加载我的申请
  const loadMyApplication = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const response = await dappNodeApi.getMyApplication(walletAddress);
      if (response.code === 0 && response.data) {
        setMyApplication(response.data);
      }
    } catch (error) {
      console.error('加载申请记录失败:', error);
    }
  }, [walletAddress]);

  // 提交申请
  const handleSubmit = async () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }

    if (!selectedLevel) {
      Alert.alert('提示', '请选择节点类型');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert('提示', '请输入质押数量');
      return;
    }

    const level = NODE_LEVELS.find(l => l.type === selectedLevel);
    if (level && parseFloat(stakeAmount) < parseFloat(level.stakeAmount.replace(',', ''))) {
      Alert.alert('提示', `质押数量不能少于 ${level.stakeAmount} DQT`);
      return;
    }

    Alert.alert(
      '确认申请',
      `确定申请成为${level?.name}吗？\n质押数量: ${stakeAmount} DQT`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确认', 
          onPress: async () => {
            setSubmitting(true);
            try {
              // 模拟生成交易哈希
              const txHash = '0x' + Array.from({ length: 64 }, () => 
                Math.floor(Math.random() * 16).toString(16)
              ).join('');
              
              const response = await dappNodeApi.apply(walletAddress, {
                apply_type: selectedLevel,
                stake_amount: stakeAmount,
              });

              if (response.code === 0) {
                Alert.alert('申请成功', '节点申请已提交，请等待审核');
                setMyApplication({
                  ...response.data,
                  tx_hash: txHash,
                  apply_type: selectedLevel,
                  stake_amount: stakeAmount,
                  status: 'pending',
                  created_at: new Date().toISOString(),
                });
                setSelectedLevel(null);
                setStakeAmount('');
              } else {
                Alert.alert('申请失败', response.message || '请重试');
              }
            } catch (error) {
              Alert.alert('错误', '网络错误，请重试');
            } finally {
              setSubmitting(false);
            }
          }
        },
      ]
    );
  };

  // 快捷设置质押数量
  const handlePercent = (percent: number) => {
    const level = NODE_LEVELS.find(l => l.type === selectedLevel);
    if (level) {
      const minAmount = parseFloat(level.stakeAmount.replace(',', ''));
      const amount = (minAmount * percent) / 100;
      setStakeAmount(amount.toFixed(2));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        const address = await loadWalletAddress();
        if (address) {
          await loadMyApplication();
        }
        setLoading(false);
      };
      init();
    }, [loadWalletAddress, loadMyApplication])
  );

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
      <View style={[styles.container, { backgroundColor: BG_DARK }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>节点申请</Text>
            <Text style={styles.headerSubtitle}>成为节点，享受更多权益</Text>
          </View>

          {/* 我的申请状态 */}
          {myApplication && (
            <View style={styles.myApplicationCard}>
              <View style={styles.myApplicationHeader}>
                <Text style={styles.myApplicationTitle}>我的申请</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: STATUS_CONFIG[myApplication.status]?.color + '20' 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: STATUS_CONFIG[myApplication.status]?.color 
                  }]}>
                    {STATUS_CONFIG[myApplication.status]?.label || '未知'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.applicationInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>申请类型</Text>
                  <Text style={styles.infoValue}>
                    {NODE_LEVELS.find(l => l.type === myApplication.apply_type)?.name || myApplication.apply_type}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>质押数量</Text>
                  <Text style={[styles.infoValue, { color: YELLOW }]}>
                    {myApplication.stake_amount} DQT
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>申请时间</Text>
                  <Text style={styles.infoValue}>
                    {new Date(myApplication.created_at).toLocaleString('zh-CN')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 节点等级选择 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>选择节点类型</Text>
            {NODE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.type}
                style={[
                  styles.levelCard,
                  selectedLevel === level.type && styles.levelCardSelected,
                  { borderColor: selectedLevel === level.type ? level.color : BORDER_GRAY },
                ]}
                onPress={() => {
                  setSelectedLevel(level.type);
                  // 自动填充最低质押数量
                  setStakeAmount(level.stakeAmount.replace(',', ''));
                }}
              >
                <View style={styles.levelHeader}>
                  <View style={[styles.levelIcon, { backgroundColor: level.color + '20' }]}>
                    <Ionicons name={level.icon as any} size={24} color={level.color} />
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={[styles.levelName, { color: level.color }]}>{level.name}</Text>
                    <Text style={styles.levelAmount}>质押 {level.stakeAmount} DQT</Text>
                  </View>
                  {selectedLevel === level.type && (
                    <View style={[styles.checkBadge, { backgroundColor: level.color }]}>
                      <Ionicons name="checkmark" size={16} color="#000" />
                    </View>
                  )}
                </View>
                <Text style={styles.levelDesc}>{level.description}</Text>
                <View style={styles.levelReward}>
                  <Text style={styles.rewardLabel}>每日收益率</Text>
                  <Text style={[styles.rewardValue, { color: level.color }]}>{level.dailyReward}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 质押数量输入 */}
          {selectedLevel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>质押数量</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入质押数量"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="decimal-pad"
                  value={stakeAmount}
                  onChangeText={setStakeAmount}
                />
                <Text style={styles.inputSuffix}>DQT</Text>
              </View>
              
              <View style={styles.percentButtons}>
                {[100, 150, 200].map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={styles.percentButton}
                    onPress={() => handlePercent(percent)}
                  >
                    <Text style={styles.percentButtonText}>{percent}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedLevel || !stakeAmount || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedLevel || !stakeAmount || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>提交申请</Text>
            )}
          </TouchableOpacity>

          {/* 注意事项 */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>注意事项</Text>
            <View style={styles.noticeItem}>
              <Ionicons name="alert-circle" size={16} color={TEXT_MUTED} />
              <Text style={styles.noticeText}>节点申请需要质押相应数量的DQT代币</Text>
            </View>
            <View style={styles.noticeItem}>
              <Ionicons name="alert-circle" size={16} color={TEXT_MUTED} />
              <Text style={styles.noticeText}>申请提交后需要平台审核</Text>
            </View>
            <View style={styles.noticeItem}>
              <Ionicons name="alert-circle" size={16} color={TEXT_MUTED} />
              <Text style={styles.noticeText}>审核通过后开始计算节点奖励</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  myApplicationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YELLOW + '40',
  },
  myApplicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myApplicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
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
  applicationInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  infoValue: {
    fontSize: 13,
    color: TEXT_WHITE,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  levelCard: {
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    padding: 16,
    marginBottom: 12,
  },
  levelCardSelected: {
    borderWidth: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  levelAmount: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 12,
  },
  levelReward: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_GRAY,
  },
  rewardLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: TEXT_WHITE,
  },
  inputSuffix: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginLeft: 8,
  },
  percentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  percentButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG_CARD_SOLID,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentButtonText: {
    fontSize: 13,
    color: CYAN,
    fontWeight: '500',
  },
  submitButton: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  noticeCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    color: TEXT_MUTED,
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 12,
  },
});
