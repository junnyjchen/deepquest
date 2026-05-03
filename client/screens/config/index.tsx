import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { configApi } from '@/utils/api';

interface Config {
  id: number;
  key: string;
  value: any;
  rawValue?: string;
  description: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface LevelThreshold {
  thresholds: number[];
  labels: string[];
  rewards: number[];
  editable?: boolean;
}

interface CardConfig {
  cards: {
    [key: string]: {
      price: string;
      unit: string;
      total: number;
      remaining: number;
      reward_weight: number;
    };
  };
  requirements: {
    [key: string]: number;
  };
  editable?: boolean;
}

export default function ConfigScreen() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      const data = await configApi.getAll();
      setConfigs(data || []);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConfigs();
  };

  const getConfig = (key: string): Config | undefined => {
    return configs.find(c => c.key === key);
  };

  const getConfigCategory = (key: string): { label: string; color: string } => {
    if (key.includes('address') || key.includes('contract')) {
      return { label: 'Contract', color: '#00F0FF' };
    }
    if (key.includes('invest') || key.includes('phase')) {
      return { label: 'Investment', color: '#00FF88' };
    }
    if (key.includes('level_thresholds')) {
      return { label: 'S-Level', color: '#FFD700' };
    }
    if (key.includes('d_level')) {
      return { label: 'D-Level', color: '#00F0FF' };
    }
    if (key.includes('card')) {
      return { label: 'NFT Cards', color: '#FF6B35' };
    }
    if (key.includes('partner')) {
      return { label: 'Partners', color: '#BF00FF' };
    }
    if (key.includes('stake')) {
      return { label: 'Staking', color: '#FF9500' };
    }
    if (key.includes('reward')) {
      return { label: 'Rewards', color: '#34C759' };
    }
    if (key.includes('withdraw') || key.includes('lp_remove')) {
      return { label: 'Fee', color: '#FF3B30' };
    }
    return { label: 'Other', color: '#8E8E93' };
  };

  const isEditable = (config: Config): boolean => {
    const value = config.value;
    if (typeof value === 'object' && value !== null && 'editable' in value) {
      return value.editable === true;
    }
    return false;
  };

  const [showInitConfirm, setShowInitConfirm] = useState(false);

  const handleInit = async () => {
    console.log('[Config] handleInit called');
    setShowInitConfirm(true);
  };

  const confirmInit = async () => {
    console.log('[Config] Starting init...');
    setShowInitConfirm(false);
    try {
      const result = await configApi.init();
      console.log('[Config] Init result:', result);
      await fetchConfigs();
      Alert.alert('成功', '配置已初始化');
    } catch (error: any) {
      console.error('[Config] Init error:', error);
      Alert.alert('错误', error?.message || error?.error || '初始化失败');
    }
  };

  const handleEdit = (config: Config) => {
    const value = config.value;
    if (typeof value === 'object' && value !== null) {
      setEditValue(value.value || '');
      setEditUnit(value.unit || '');
    } else {
      setEditValue(String(value));
      setEditUnit('');
    }
    setEditingConfig(config);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    try {
      const value = editingConfig.value;
      let newValue: any;

      if (typeof value === 'object' && value !== null && 'value' in value) {
        // 带单位的配置
        newValue = { ...value, value: editValue, unit: editUnit };
      } else {
        newValue = editValue;
      }

      await configApi.update(editingConfig.key, newValue, editingConfig.description);
      setEditModalVisible(false);
      fetchConfigs();
      Alert.alert('成功', '配置已更新');
    } catch (error: any) {
      Alert.alert('错误', error.message);
    }
  };

  const renderContractAddresses = () => {
    const contractConfig = getConfig('contract_address');
    const dqtokenConfig = getConfig('dqtoken_address');
    const dqcardConfig = getConfig('dqcard_address');

    if (!contractConfig && !dqtokenConfig && !dqcardConfig) return null;

    const getAddress = (config: Config | undefined): string => {
      if (!config) return '';
      const value = config.value;
      if (typeof value === 'object' && value !== null && 'address' in value) {
        return value.address || '待设置';
      }
      return '待设置';
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>合约地址</Text>
        <View style={styles.addressList}>
          {contractConfig && (
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>主合约:</Text>
              <Text style={styles.addressValue} numberOfLines={1}>
                {getAddress(contractConfig)}
              </Text>
            </View>
          )}
          {dqtokenConfig && (
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>DQ代币:</Text>
              <Text style={styles.addressValue} numberOfLines={1}>
                {getAddress(dqtokenConfig)}
              </Text>
            </View>
          )}
          {dqcardConfig && (
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>NFT卡牌:</Text>
              <Text style={styles.addressValue} numberOfLines={1}>
                {getAddress(dqcardConfig)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderInvestmentConfig = () => {
    const investMin = getConfig('invest_min');
    const investMaxStart = getConfig('invest_max_start');
    const investMaxStep = getConfig('invest_max_step');
    const investMaxFinal = getConfig('invest_max_final');
    const phaseDuration = getConfig('phase_duration');

    if (!investMin && !investMaxStart && !investMaxStep && !investMaxFinal && !phaseDuration) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>投资参数</Text>
        <View style={styles.paramGrid}>
          {investMin && (
            <View style={styles.paramCard}>
              <Text style={styles.paramLabel}>最小投资</Text>
              <Text style={styles.paramValue}>
                {investMin.value?.value} {investMin.value?.unit}
              </Text>
              <Text style={styles.paramBadgeFixed}>固定</Text>
            </View>
          )}
          {investMaxStart && (
            <TouchableOpacity 
              style={[styles.paramCard, isEditable(investMaxStart) && styles.paramCardEditable]}
              onPress={() => isEditable(investMaxStart) && handleEdit(investMaxStart)}
              disabled={!isEditable(investMaxStart)}
            >
              <Text style={styles.paramLabel}>初始最大</Text>
              <Text style={styles.paramValue}>
                {investMaxStart.value?.value} {investMaxStart.value?.unit}
              </Text>
              {isEditable(investMaxStart) ? (
                <Text style={styles.paramBadgeEdit}>可调</Text>
              ) : (
                <Text style={styles.paramBadgeFixed}>固定</Text>
              )}
            </TouchableOpacity>
          )}
          {investMaxStep && (
            <TouchableOpacity 
              style={[styles.paramCard, isEditable(investMaxStep) && styles.paramCardEditable]}
              onPress={() => isEditable(investMaxStep) && handleEdit(investMaxStep)}
              disabled={!isEditable(investMaxStep)}
            >
              <Text style={styles.paramLabel}>阶段增量</Text>
              <Text style={styles.paramValue}>
                {investMaxStep.value?.value} {investMaxStep.value?.unit}
              </Text>
              {isEditable(investMaxStep) ? (
                <Text style={styles.paramBadgeEdit}>可调</Text>
              ) : (
                <Text style={styles.paramBadgeFixed}>固定</Text>
              )}
            </TouchableOpacity>
          )}
          {investMaxFinal && (
            <TouchableOpacity 
              style={[styles.paramCard, isEditable(investMaxFinal) && styles.paramCardEditable]}
              onPress={() => isEditable(investMaxFinal) && handleEdit(investMaxFinal)}
              disabled={!isEditable(investMaxFinal)}
            >
              <Text style={styles.paramLabel}>最终最大</Text>
              <Text style={styles.paramValue}>
                {investMaxFinal.value?.value} {investMaxFinal.value?.unit}
              </Text>
              {isEditable(investMaxFinal) ? (
                <Text style={styles.paramBadgeEdit}>可调</Text>
              ) : (
                <Text style={styles.paramBadgeFixed}>固定</Text>
              )}
            </TouchableOpacity>
          )}
          {phaseDuration && (
            <TouchableOpacity 
              style={[styles.paramCard, isEditable(phaseDuration) && styles.paramCardEditable]}
              onPress={() => isEditable(phaseDuration) && handleEdit(phaseDuration)}
              disabled={!isEditable(phaseDuration)}
            >
              <Text style={styles.paramLabel}>阶段天数</Text>
              <Text style={styles.paramValue}>
                {phaseDuration.value?.value} {phaseDuration.value?.unit}
              </Text>
              {isEditable(phaseDuration) ? (
                <Text style={styles.paramBadgeEdit}>可调</Text>
              ) : (
                <Text style={styles.paramBadgeFixed}>固定</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderLevelThresholds = () => {
    const levelConfig = getConfig('level_thresholds');
    if (!levelConfig) return null;

    const value = levelConfig.value as LevelThreshold;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>等级门槛 (S1-S6)</Text>
        <Text style={styles.sectionSubtitle}>小区业绩晋级 · 固定参数</Text>
        <View style={styles.levelGrid}>
          {value.labels.map((label, index) => (
            <View key={label} style={styles.levelCard}>
              <Text style={styles.levelLabel}>{label}</Text>
              <Text style={styles.levelValue}>{value.thresholds[index]} SOL</Text>
              <Text style={styles.levelReward}>{value.rewards[index]}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDLevelThresholds = () => {
    const dLevelConfig = getConfig('d_level_thresholds');
    if (!dLevelConfig) return null;

    const value = dLevelConfig.value as { thresholds: number[]; labels: string[] };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>D级门槛 (D1-D8)</Text>
        <Text style={styles.sectionSubtitle}>有效地址数晋级 · 固定参数</Text>
        <View style={styles.levelGrid}>
          {value.labels.map((label, index) => (
            <View key={label} style={styles.dLevelCard}>
              <Text style={styles.levelLabel}>{label}</Text>
              <Text style={styles.levelValue}>{value.thresholds[index]}</Text>
              <Text style={styles.levelUnit}>地址</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCardConfig = () => {
    const cardConfig = getConfig('card_config');
    if (!cardConfig) return null;

    const value = cardConfig.value as CardConfig;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NFT卡牌配置</Text>
        <Text style={styles.sectionSubtitle}>价格和总量固定 · 从合约读取</Text>
        <View style={styles.cardGrid}>
          {Object.entries(value.cards).map(([type, card]: [string, any]) => (
            <View 
              key={type} 
              style={[
                styles.nftCard,
                type === 'A' && styles.nftCardA,
                type === 'B' && styles.nftCardB,
                type === 'C' && styles.nftCardC,
              ]}
            >
              <Text style={[
                styles.nftCardTitle,
                type === 'A' && styles.nftCardTitleA,
                type === 'B' && styles.nftCardTitleB,
                type === 'C' && styles.nftCardTitleC,
              ]}>
                卡牌{type}
              </Text>
              <View style={styles.nftInfo}>
                <View style={styles.nftRow}>
                  <Text style={styles.nftLabel}>价格:</Text>
                  <Text style={styles.nftValue}>{card.price} {card.unit}</Text>
                </View>
                <View style={styles.nftRow}>
                  <Text style={styles.nftLabel}>总量:</Text>
                  <Text style={styles.nftValue}>{card.total}</Text>
                </View>
                <View style={styles.nftRow}>
                  <Text style={styles.nftLabel}>权重:</Text>
                  <Text style={styles.nftValue}>{card.reward_weight}</Text>
                </View>
                <View style={styles.nftRow}>
                  <Text style={styles.nftLabel}>所需线数:</Text>
                  <Text style={styles.nftValue}>{value.requirements[type]}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStakeConfig = () => {
    const stakeConfig = getConfig('stake_config');
    if (!stakeConfig) return null;

    const value = stakeConfig.value as { periods: number[]; rates: number[] };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>质押配置</Text>
        <Text style={styles.sectionSubtitle}>质押周期和利率 · 固定参数</Text>
        <View style={styles.stakeGrid}>
          {value.periods.map((period, index) => (
            <View key={period} style={styles.stakeCard}>
              <Text style={styles.stakePeriod}>{period}</Text>
              <Text style={styles.stakeUnit}>天</Text>
              <Text style={styles.stakeRate}>{value.rates[index]}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPartnerConfig = () => {
    const partnerConfig = getConfig('partner_requirements');
    if (!partnerConfig) return null;

    const value = partnerConfig.value;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>合伙人要求</Text>
        <View style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <Text style={styles.partnerTitle}>总名额: {value.total_limit}</Text>
          </View>
          <View style={styles.partnerRow}>
            <Text style={styles.partnerLabel}>前期20名:</Text>
            <Text style={styles.partnerValue}>
              投资{value.first_phase?.personal_invest} SOL + 直推{value.first_phase?.direct_sales} SOL
            </Text>
          </View>
          <View style={styles.partnerRow}>
            <Text style={styles.partnerLabel}>后期30名:</Text>
            <Text style={styles.partnerValue}>
              投资{value.second_phase?.personal_invest} SOL + 直推{value.second_phase?.direct_sales} SOL
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRewardDistribution = () => {
    const rewardConfig = getConfig('reward_distribution');
    if (!rewardConfig) return null;

    const value = rewardConfig.value;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>奖励分配比例</Text>
        <Text style={styles.sectionSubtitle}>固定参数 · 从合约读取</Text>
        
        <View style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>存款分配</Text>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardBadge, { backgroundColor: '#00FF88' }]}>
              <Text style={styles.rewardBadgeText}>{value.deposit_split?.dynamic}%</Text>
            </View>
            <Text style={styles.rewardLabel}>动态奖励</Text>
          </View>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardBadge, { backgroundColor: '#BF00FF' }]}>
              <Text style={styles.rewardBadgeText}>{value.deposit_split?.lp}%</Text>
            </View>
            <Text style={styles.rewardLabel}>LP挖矿</Text>
          </View>
        </View>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>动态分配</Text>
          <View style={styles.dynamicGrid}>
            <View style={styles.dynamicItem}>
              <Text style={styles.dynamicValue}>{value.dynamic_split?.direct}%</Text>
              <Text style={styles.dynamicLabel}>直推</Text>
            </View>
            <View style={styles.dynamicItem}>
              <Text style={styles.dynamicValue}>{value.dynamic_split?.node}%</Text>
              <Text style={styles.dynamicLabel}>节点</Text>
            </View>
            <View style={styles.dynamicItem}>
              <Text style={styles.dynamicValue}>{value.dynamic_split?.management}%</Text>
              <Text style={styles.dynamicLabel}>管理</Text>
            </View>
            <View style={styles.dynamicItem}>
              <Text style={styles.dynamicValue}>{value.dynamic_split?.dao}%</Text>
              <Text style={styles.dynamicLabel}>DAO</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFeeConfig = () => {
    const withdrawConfig = getConfig('withdraw_fee');
    const lpFeeConfig = getConfig('lp_remove_fee');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>手续费规则</Text>
        <Text style={styles.sectionSubtitle}>固定参数</Text>
        
        {withdrawConfig && (
          <View style={styles.feeCard}>
            <Text style={styles.feeTitle}>提现手续费: {withdrawConfig.value?.rate}%</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>NFT持有者: {withdrawConfig.value?.split?.nft}%</Text>
              <Text style={styles.feeLabel}>合伙人: {withdrawConfig.value?.split?.partner}%</Text>
              <Text style={styles.feeLabel}>基金会: {withdrawConfig.value?.split?.foundation}%</Text>
            </View>
          </View>
        )}

        {lpFeeConfig && (
          <View style={styles.feeCard}>
            <Text style={styles.feeTitle}>LP赎回手续费</Text>
            {(lpFeeConfig.value?.rules || []).map((rule: any, index: number) => (
              <View key={index} style={styles.feeRow}>
                <Text style={styles.feeLabel}>{rule.days}: {rule.rate}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>合约配置中心</Text>
          <Text style={styles.headerSubtitle}>Contract Configuration</Text>
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerLine}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8E8E93' }]} />
            <Text style={styles.legendText}>固定参数</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.legendText}>可调参数</Text>
          </View>
        </View>

        {/* Init Confirm Modal */}
        {showInitConfirm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>初始化配置</Text>
              <Text style={styles.modalText}>这将初始化默认配置值。继续吗？</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setShowInitConfirm(false)}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={confirmInit}
                >
                  <Text style={styles.confirmButtonText}>初始化</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.initButton} onPress={handleInit}>
          <Text style={styles.initButtonText}>初始化默认配置</Text>
        </TouchableOpacity>

        {/* Contract Addresses */}
        {renderContractAddresses()}

        {/* Investment Config */}
        {renderInvestmentConfig()}

        {/* Level Thresholds */}
        {renderLevelThresholds()}
        {renderDLevelThresholds()}

        {/* Card Config */}
        {renderCardConfig()}

        {/* Stake Config */}
        {renderStakeConfig()}

        {/* Partner Config */}
        {renderPartnerConfig()}

        {/* Reward Distribution */}
        {renderRewardDistribution()}

        {/* Fee Config */}
        {renderFeeConfig()}

        {configs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无配置</Text>
            <Text style={styles.emptyHint}>点击上方按钮初始化默认配置</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改配置</Text>
            
            <Text style={styles.inputLabel}>值:</Text>
            <TextInput
              style={styles.input}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              placeholder="输入数值"
              placeholderTextColor="#555570"
            />
            
            {editUnit && (
              <>
                <Text style={styles.inputLabel}>单位:</Text>
                <TextInput
                  style={styles.input}
                  value={editUnit}
                  onChangeText={setEditUnit}
                  placeholder="单位"
                  placeholderTextColor="#555570"
                />
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveBtn]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A12',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  headerLine: {
    height: 2,
    borderRadius: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
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
    color: '#8E8E93',
    fontSize: 12,
  },
  initButton: {
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  initButtonText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  addressList: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLabel: {
    color: '#8E8E93',
    fontSize: 12,
    width: 60,
  },
  addressValue: {
    color: '#00F0FF',
    fontSize: 12,
    flex: 1,
    fontFamily: 'monospace',
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paramCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    minWidth: 100,
  },
  paramCardEditable: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  paramLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 4,
  },
  paramValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paramBadgeFixed: {
    backgroundColor: '#3A3A4A',
    color: '#8E8E93',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  paramBadgeEdit: {
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    padding: 12,
    width: '30%',
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  levelLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  levelValue: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  levelReward: {
    color: '#34C759',
    fontSize: 10,
    marginTop: 2,
  },
  levelUnit: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  dLevelCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    padding: 12,
    width: '22%',
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF30',
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  nftCard: {
    flex: 1,
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nftCardA: {
    borderWidth: 1,
    borderColor: '#FFD70050',
  },
  nftCardB: {
    borderWidth: 1,
    borderColor: '#00F0FF50',
  },
  nftCardC: {
    borderWidth: 1,
    borderColor: '#D020FF50',
  },
  nftCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  nftCardTitleA: {
    color: '#FFD700',
  },
  nftCardTitleB: {
    color: '#00F0FF',
  },
  nftCardTitleC: {
    color: '#D020FF',
  },
  nftInfo: {
    width: '100%',
  },
  nftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nftLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  nftValue: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  stakeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  stakeCard: {
    flex: 1,
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF950030',
  },
  stakePeriod: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stakeUnit: {
    color: '#8E8E93',
    fontSize: 10,
  },
  stakeRate: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  partnerCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BF00FF30',
  },
  partnerHeader: {
    marginBottom: 12,
  },
  partnerTitle: {
    color: '#BF00FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnerRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  partnerLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  partnerValue: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  rewardCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rewardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  rewardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rewardBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rewardLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  dynamicGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dynamicItem: {
    alignItems: 'center',
  },
  dynamicValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dynamicLabel: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  feeCard: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  feeTitle: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  feeLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  emptyHint: {
    color: '#555570',
    fontSize: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0A12',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#333',
  },
  saveBtn: {
    backgroundColor: '#00F0FF',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#00F0FF30',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  confirmButton: {
    backgroundColor: '#00F0FF',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
