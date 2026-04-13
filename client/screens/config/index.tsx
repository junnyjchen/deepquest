import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import AdminLayout from '@/components/AdminLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { configApi } from '@/utils/api';

interface Config {
  id: number;
  config_key: string;
  config_value: any;
  description: string;
  updated_at: string;
  updated_by: string;
}

export default function ConfigScreen() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [editPeriods, setEditPeriods] = useState('');
  const [editRates, setEditRates] = useState('');
  const [editCardConfig, setEditCardConfig] = useState({
    A: { price: '', total: '', remaining: '', reward_rate: '', name: '', level: '', fee_rate: '' },
    B: { price: '', total: '', remaining: '', reward_rate: '', name: '', level: '', fee_rate: '' },
    C: { price: '', total: '', remaining: '', reward_rate: '', name: '', level: '', fee_rate: '' },
  });
  const [cardEditModalVisible, setCardEditModalVisible] = useState(false);

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

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getConfigCategory = (key: string): { label: string; color: string } => {
    if (key.includes('invest') || key.includes('phase')) {
      return { label: 'Investment', color: '#00FF88' };
    }
    if (key.includes('level') || key.includes('d_level')) {
      return { label: 'Levels', color: '#00F0FF' };
    }
    if (key.includes('card')) {
      return { label: 'NFT Cards', color: '#FFD700' };
    }
    if (key.includes('partner')) {
      return { label: 'Partners', color: '#BF00FF' };
    }
    if (key.includes('stake')) {
      return { label: 'Staking', color: '#FF6B00' };
    }
    return { label: 'Other', color: '#555570' };
  };

  const handleInit = async () => {
    Alert.alert(
      'Initialize Configs',
      'This will initialize default configuration values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              await configApi.init();
              fetchConfigs();
              Alert.alert('Success', 'Configuration initialized');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditStakeConfig = (config: Config) => {
    const value = config.config_value;
    setEditingConfig(config);
    setEditPeriods((value.periods || []).join(', '));
    setEditRates((value.rates || []).join(', '));
    setEditModalVisible(true);
  };

  const handleSaveStakeConfig = async () => {
    if (!editingConfig) return;
    
    try {
      const periods = editPeriods.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const rates = editRates.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      
      if (periods.length === 0 || rates.length === 0) {
        Alert.alert('Error', 'Invalid periods or rates format');
        return;
      }
      
      if (periods.length !== rates.length) {
        Alert.alert('Error', 'Periods and rates must have the same count');
        return;
      }
      
      await configApi.update(editingConfig.config_key, {
        periods,
        rates
      }, editingConfig.description);
      
      setEditModalVisible(false);
      fetchConfigs();
      Alert.alert('Success', 'Stake config updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditCardConfig = (config: Config) => {
    const value = config.config_value || {};
    setEditCardConfig({
      A: {
        price: String(value.A?.price || ''),
        total: String(value.A?.total || ''),
        remaining: String(value.A?.remaining || ''),
        reward_rate: String(value.A?.reward_rate || ''),
        name: value.A?.name || '',
        level: value.A?.level || '',
        fee_rate: String(value.A?.fee_rate || ''),
      },
      B: {
        price: String(value.B?.price || ''),
        total: String(value.B?.total || ''),
        remaining: String(value.B?.remaining || ''),
        reward_rate: String(value.B?.reward_rate || ''),
        name: value.B?.name || '',
        level: value.B?.level || '',
        fee_rate: String(value.B?.fee_rate || ''),
      },
      C: {
        price: String(value.C?.price || ''),
        total: String(value.C?.total || ''),
        remaining: String(value.C?.remaining || ''),
        reward_rate: String(value.C?.reward_rate || ''),
        name: value.C?.name || '',
        level: value.C?.level || '',
        fee_rate: String(value.C?.fee_rate || ''),
      },
    });
    setEditingConfig(config);
    setCardEditModalVisible(true);
  };

  const handleSaveCardConfig = async () => {
    if (!editingConfig) return;
    
    try {
      const newConfig: any = {};
      for (const type of ['A', 'B', 'C']) {
        const cardData = editCardConfig[type as keyof typeof editCardConfig];
        if (cardData.price) {
          newConfig[type] = {
            price: cardData.price,
            total: parseInt(cardData.total) || 0,
            remaining: parseInt(cardData.remaining) || 0,
            reward_rate: parseFloat(cardData.reward_rate) || 0,
            name: cardData.name,
            level: cardData.level,
            fee_rate: parseFloat(cardData.fee_rate) || 0,
          };
        }
      }
      
      await configApi.update(editingConfig.config_key, newConfig, editingConfig.description);
      
      setCardEditModalVisible(false);
      fetchConfigs();
      Alert.alert('Success', 'Card config updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING CONFIG...</Text>
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
          <Text style={styles.headerTitle}>CONTRACT CONFIG</Text>
          <Text style={styles.headerSubtitle}>合约配置</Text>
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerLine}
          />
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.initButton} onPress={handleInit}>
          <Text style={styles.initButtonText}>INITIALIZE DEFAULT CONFIG</Text>
        </TouchableOpacity>

        {/* Config List */}
        <View style={styles.configList}>
          {configs.map((config) => {
            const category = getConfigCategory(config.config_key);
            const isExpanded = expandedKey === config.config_key;
            
            return (
              <TouchableOpacity
                key={config.id}
                style={styles.configCard}
                onPress={() => setExpandedKey(isExpanded ? null : config.config_key)}
                activeOpacity={0.8}
              >
                <View style={styles.configHeader}>
                  <View style={styles.configTitleRow}>
                    <LinearGradient
                      colors={[`${category.color}30`, 'transparent']}
                      style={styles.categoryBadge}
                    >
                      <Text style={[styles.categoryText, { color: category.color }]}>
                        {category.label}
                      </Text>
                    </LinearGradient>
                    <Text style={styles.configKey}>{config.config_key}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '>'}</Text>
                </View>

                {isExpanded && (
                  <View style={styles.configBody}>
                    <View style={styles.valueContainer}>
                      <Text style={styles.valueLabel}>VALUE:</Text>
                      {config.config_key === 'stake_config' ? (
                        <View>
                          <Text style={styles.valueText}>
                            Periods: [{formatValue((config.config_value as any)?.periods)}]
                          </Text>
                          <Text style={styles.valueText}>
                            Rates: [{formatValue((config.config_value as any)?.rates)}]
                          </Text>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => handleEditStakeConfig(config)}
                          >
                            <Text style={styles.editButtonText}>EDIT STAKE CONFIG</Text>
                          </TouchableOpacity>
                        </View>
                      ) : config.config_key === 'card_config' ? (
                        <View>
                          {Object.entries((config.config_value as any) || {}).map(([type, card]: [string, any]) => (
                            <View key={type} style={styles.cardConfigRow}>
                              <Text style={[styles.cardTypeLabel, { 
                                color: type === 'A' ? '#FFD23F' : type === 'B' ? '#00F0FF' : '#D020FF' 
                              }]}>
                                [{type}]
                              </Text>
                              <Text style={styles.cardConfigText}>
                                {card.name} | {card.price}U | {card.reward_rate}% | {card.level} | 库存:{card.remaining}/{card.total}
                              </Text>
                            </View>
                          ))}
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => handleEditCardConfig(config)}
                          >
                            <Text style={styles.editButtonText}>EDIT CARD CONFIG</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.valueText}>
                          {formatValue(config.config_value)}
                        </Text>
                      )}
                    </View>
                    
                    {config.description && (
                      <View style={styles.descContainer}>
                        <Text style={styles.descLabel}>DESCRIPTION:</Text>
                        <Text style={styles.descText}>{config.description}</Text>
                      </View>
                    )}
                    
                    {config.updated_at && (
                      <Text style={styles.updateText}>
                        Updated: {new Date(config.updated_at).toLocaleString()}
                      </Text>
                    )}
                    
                    {config.updated_by && (
                      <Text style={styles.updateText}>
                        By: {config.updated_by}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {configs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No configurations found</Text>
            <Text style={styles.emptyHint}>Click &quot;Initialize Default Config&quot; to set up</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Stake Config Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EDIT STAKE CONFIG</Text>
            
            <Text style={styles.inputLabel}>PERIODS (days, comma separated):</Text>
            <TextInput
              style={styles.input}
              value={editPeriods}
              onChangeText={setEditPeriods}
              placeholder="30, 90, 180, 360"
              placeholderTextColor="#555570"
            />
            
            <Text style={styles.inputLabel}>RATES (% per day, comma separated):</Text>
            <TextInput
              style={styles.input}
              value={editRates}
              onChangeText={setEditRates}
              placeholder="5, 10, 15, 20"
              placeholderTextColor="#555570"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveBtn]}
                onPress={handleSaveStakeConfig}
              >
                <Text style={styles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Card Config Modal */}
      <Modal
        visible={cardEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCardEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.cardModalScroll}>
            <View style={styles.cardModalContent}>
              <Text style={styles.modalTitle}>EDIT CARD CONFIG</Text>
              
              {(['A', 'B', 'C'] as const).map((type) => {
                const colors: Record<string, string> = { A: '#FFD23F', B: '#00F0FF', C: '#D020FF' };
                const card = editCardConfig[type as keyof typeof editCardConfig];
                
                return (
                  <View key={type} style={[styles.cardEditSection, { borderColor: colors[type] }]}>
                    <Text style={[styles.cardEditTitle, { color: colors[type] }]}>Card Type {type}</Text>
                    
                    <Text style={styles.inputLabel}>Name:</Text>
                    <TextInput
                      style={styles.input}
                      value={card.name}
                      onChangeText={(text) => setEditCardConfig(prev => ({
                        ...prev,
                        [type]: { ...prev[type as keyof typeof prev], name: text }
                      }))}
                      placeholder="S1节点卡"
                      placeholderTextColor="#555570"
                    />
                    
                    <Text style={styles.inputLabel}>Level:</Text>
                    <TextInput
                      style={styles.input}
                      value={card.level}
                      onChangeText={(text) => setEditCardConfig(prev => ({
                        ...prev,
                        [type]: { ...prev[type as keyof typeof prev], level: text }
                      }))}
                      placeholder="S1"
                      placeholderTextColor="#555570"
                    />
                    
                    <Text style={styles.inputLabel}>Price (USDT):</Text>
                    <TextInput
                      style={styles.input}
                      value={card.price}
                      onChangeText={(text) => setEditCardConfig(prev => ({
                        ...prev,
                        [type]: { ...prev[type as keyof typeof prev], price: text }
                      }))}
                      placeholder="500"
                      placeholderTextColor="#555570"
                      keyboardType="numeric"
                    />
                    
                    <Text style={styles.inputLabel}>Total / Remaining:</Text>
                    <View style={styles.rowInputs}>
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        value={card.total}
                        onChangeText={(text) => setEditCardConfig(prev => ({
                          ...prev,
                          [type]: { ...prev[type as keyof typeof prev], total: text }
                        }))}
                        placeholder="1000"
                        placeholderTextColor="#555570"
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        value={card.remaining}
                        onChangeText={(text) => setEditCardConfig(prev => ({
                          ...prev,
                          [type]: { ...prev[type as keyof typeof prev], remaining: text }
                        }))}
                        placeholder="1000"
                        placeholderTextColor="#555570"
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <Text style={styles.inputLabel}>Reward Rate (%):</Text>
                    <TextInput
                      style={styles.input}
                      value={card.reward_rate}
                      onChangeText={(text) => setEditCardConfig(prev => ({
                        ...prev,
                        [type]: { ...prev[type as keyof typeof prev], reward_rate: text }
                      }))}
                      placeholder="4"
                      placeholderTextColor="#555570"
                      keyboardType="numeric"
                    />
                    
                    <Text style={styles.inputLabel}>Fee Rate (%):</Text>
                    <TextInput
                      style={styles.input}
                      value={card.fee_rate}
                      onChangeText={(text) => setEditCardConfig(prev => ({
                        ...prev,
                        [type]: { ...prev[type as keyof typeof prev], fee_rate: text }
                      }))}
                      placeholder="10"
                      placeholderTextColor="#555570"
                      keyboardType="numeric"
                    />
                  </View>
                );
              })}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={() => setCardEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveBtn]}
                  onPress={handleSaveCardConfig}
                >
                  <Text style={styles.saveBtnText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    letterSpacing: 2,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 11,
    color: '#555570',
    letterSpacing: 3,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EAEAEA',
    marginTop: 8,
  },
  headerLine: {
    height: 2,
    width: 60,
    marginTop: 16,
    borderRadius: 1,
  },
  initButton: {
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  initButtonText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  configList: {
    gap: 12,
  },
  configCard: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  configKey: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#EAEAEA',
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    color: '#555570',
  },
  configBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.1)',
  },
  valueContainer: {
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    padding: 12,
    borderRadius: 4,
  },
  descContainer: {
    marginBottom: 12,
  },
  descLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 4,
  },
  descText: {
    fontSize: 12,
    color: '#EAEAEA',
  },
  updateText: {
    fontSize: 10,
    color: '#555570',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#555570',
    fontSize: 14,
    marginBottom: 8,
  },
  emptyHint: {
    color: '#555570',
    fontSize: 12,
  },
  editButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 6,
    padding: 12,
    color: '#EAEAEA',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1A1A25',
    borderWidth: 1,
    borderColor: '#555570',
  },
  cancelBtnText: {
    color: '#555570',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  saveBtn: {
    backgroundColor: '#FF6B00',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 30,
  },
  cardConfigText: {
    fontSize: 11,
    color: '#00F0FF',
    fontFamily: 'monospace',
    flex: 1,
  },
  cardModalScroll: {
    flex: 1,
    marginTop: 60,
    marginBottom: 40,
  },
  cardModalContent: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  cardEditSection: {
    backgroundColor: '#0A0A0F',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardEditTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
});
