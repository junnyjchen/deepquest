import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function DappIndex() {
  const router = useSafeRouter();
  const { t, language, setLanguage, languages } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'swap' | 'stake'>('swap');
  const [swapDirection, setSwapDirection] = useState<'dq_to_sol' | 'sol_to_dq'>('dq_to_sol');
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakePeriod, setStakePeriod] = useState<30 | 90 | 180 | 360>(30);
  const [bnbBalance, setBnbBalance] = useState('0.0');
  const [dqtBalance, setDqtBalance] = useState('0.0');
  const [solBalance, setSolBalance] = useState('0.00');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 质押周期配置
  const stakePeriods = [
    { days: 30, label: '30天', reward: '5%' },
    { days: 90, label: '90天', reward: '10%' },
    { days: 180, label: '180天', reward: '15%' },
    { days: 360, label: '360天', reward: '20%' },
  ] as const;

  // SOL 代币颜色
  const SOL_PURPLE = '#9945FF';

  // 平台数据
  const [stats, setStats] = useState({
    totalSupply: '330,000,000',
    totalBurned: '140,480,617',
    todayDeposit: '0.00',
    networkPower: '63,497,422',
    solPoolBalance: '0.00',
    dqtPoolBalance: '0.00',
    totalUsers: 0,
    totalDeposit: '0.00',
    totalReward: 0,
    dqtPrice: '0.15224',
  });

  // 加载保存的钱包地址
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          // 加载保存的钱包地址
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
          }
          
          // 获取平台统计数据
          await fetchStats();
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [])
  );

  // 获取平台统计数据
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await dappApi.getStats();
      if (response.code === 0 && response.data) {
        setStats({
          totalSupply: response.data.totalSupply || '330,000,000',
          totalBurned: response.data.totalBurned || '140,480,617',
          todayDeposit: response.data.todayDeposit || '0.00',
          networkPower: response.data.networkPower || '63,497,422',
          solPoolBalance: response.data.usdtPoolBalance || '0.00',
          dqtPoolBalance: response.data.dqtPoolBalance || '0.00',
          totalUsers: response.data.totalUsers || 0,
          totalDeposit: response.data.totalDeposit || '0.00',
          totalReward: response.data.totalReward || 0,
          dqtPrice: response.data.dqtPrice || '0.15224',
        });
      }
    } catch (error) {
      console.error('获取平台数据失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 生成随机钱包地址（模拟）
  const generateMockWallet = async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(20);
    const address = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return address;
  };

  // 连接钱包
  const handleConnect = async () => {
    try {
      Alert.alert(
        '连接钱包',
        '请选择钱包类型',
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '模拟钱包（测试）', 
            onPress: async () => {
              const mockWallet = await generateMockWallet();
              await AsyncStorage.setItem(WALLET_STORAGE_KEY, mockWallet);
              setWalletAddress(mockWallet);
              Alert.alert('成功', `钱包已连接: ${mockWallet.slice(0, 10)}...`);
            }
          },
        ]
      );
    } catch (error) {
      console.error('连接钱包失败:', error);
      Alert.alert('错误', '钱包连接失败');
    }
  };

  // 断开钱包连接
  const handleDisconnect = () => {
    Alert.alert(
      '断开钱包',
      '确定要断开钱包连接吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
            setWalletAddress(null);
            setBnbBalance('0.0');
            setDqtBalance('0.0');
          }
        },
      ]
    );
  };

  // 注册
  const handleRegister = () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    Alert.alert('注册成功', '您已成功激活账户');
  };

  // 质押操作
  const handleStake = async () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert('提示', '请输入质押数量');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 模拟生成交易哈希
      const txHash = '0x' + Array.from(await Crypto.getRandomBytesAsync(32)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const response = await dappApi.stake(walletAddress, stakeAmount, txHash);
      
      if (response.code === 0) {
        Alert.alert('成功', `质押 ${stakeAmount} BNB 成功！\n交易哈希: ${txHash.slice(0, 20)}...`);
        setStakeAmount('');
      } else {
        Alert.alert('失败', response.message || '质押失败');
      }
    } catch (error) {
      console.error('质押失败:', error);
      Alert.alert('错误', '质押失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 兑换/质押确定
  const handleConfirm = () => {
    if (mode === 'swap') {
      // 兑换
      if (!walletAddress) {
        Alert.alert('提示', '请先连接钱包');
        return;
      }
      if (!sellAmount || !buyAmount) {
        Alert.alert('提示', '请输入兑换数量');
        return;
      }
      Alert.alert('功能开发中', '兑换功能正在开发中');
    } else {
      // 质押
      handleStake();
    }
  };

  // 复制地址
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert('已复制', '钱包地址已复制到剪贴板');
    }
  };

  // 打开社交链接
  const openTelegram = () => Linking.openURL('https://t.me/deepquest');
  const openTwitter = () => Linking.openURL('https://twitter.com/deepquest');

  // 计算百分比
  const handlePercent = (percent: number, setter: (v: string) => void, balance: string) => {
    const bal = parseFloat(balance) || 0;
    if (percent === 100) {
      setter(bal.toString());
    } else {
      const amount = (bal * percent) / 100;
      setter(amount.toFixed(6));
    }
  };

  // 切换兑换方向
  const handleSwapDirection = () => {
    setSwapDirection(prev => prev === 'dq_to_sol' ? 'sol_to_dq' : 'dq_to_sol');
    setSellAmount('');
    setBuyAmount('');
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: BG_DARK }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BG_DARK }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 顶部导航 */}
        <View className="px-4 pt-3 pb-3">
          <View className="flex-row items-center justify-between">
            {/* Logo */}
            <View className="flex-row items-center gap-2">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <Ionicons name="diamond" size={22} color={CYAN} />
              </View>
              <Text className="text-xl font-bold" style={{ color: YELLOW }}>
                DeepQuest
              </Text>
            </View>

            {/* 菜单按钮 */}
            <TouchableOpacity
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={() => setMenuExpanded(!menuExpanded)}
            >
              <Ionicons 
                name={menuExpanded ? "close" : "menu"} 
                size={22} 
                color={TEXT_WHITE} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 快捷菜单折叠区域 */}
        {menuExpanded && (
          <View className="px-4 pb-3">
            <View 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/profile'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Ionicons name="person" size={20} color={YELLOW} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.title')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('profile.myAssets')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/team'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                  <Ionicons name="people" size={20} color={CYAN} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('team.title')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.teamRewards')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/stakes'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                  <Ionicons name="time" size={20} color={PURPLE} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.stakes')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('stakes.title')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/rewards'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Ionicons name="gift" size={20} color={YELLOW} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.rewards')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('rewards.title')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/withdrawals'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                  <Ionicons name="wallet-outline" size={20} color={CYAN} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.withdrawals')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('withdrawals.title')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/nodes'); setMenuExpanded(false); }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                  <Ionicons name="ribbon" size={20} color={PURPLE} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.nodes')}</Text>
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('nodes.subtitle')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 钱包+注册 */}
        <View className="px-4 pb-2">
          <View className="flex-row items-center gap-2">
            {walletAddress ? (
              <>
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                  onPress={handleCopyAddress}
                >
                  <Ionicons name="folder-open" size={14} color={TEXT_WHITE} />
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,80,80,0.2)', borderWidth: 1, borderColor: '#FF5050' }}
                  onPress={handleDisconnect}
                >
                  <Text className="text-sm" style={{ color: '#FF5050' }}>{t('home.disconnect')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                className="px-2.5 py-1.5 rounded-lg"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                onPress={handleConnect}
              >
                <Text className="text-sm" style={{ color: TEXT_WHITE }}>{t('home.connectWallet')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: YELLOW }}
              onPress={handleRegister}
            >
              <Text className="text-sm font-semibold" style={{ color: '#333' }}>{t('home.register')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 语言切换 */}
        <View className="px-4 pb-2">
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() => setLangModalVisible(true)}
          >
            <Ionicons name="globe-outline" size={14} color={YELLOW} />
            <Text className="text-xs" style={{ color: YELLOW }}>
              {t('home.language')}：{languages.find(l => l.code === language)?.nativeName || '繁體中文'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={YELLOW} />
          </TouchableOpacity>
        </View>

        {/* 语言选择 Modal */}
        <Modal
          visible={langModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <TouchableOpacity
            className="flex-1 justify-center items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onPress={() => setLangModalVisible(false)}
            activeOpacity={1}
          >
            <View
              className="w-64 rounded-2xl overflow-hidden"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="p-4 border-b" style={{ borderColor: BORDER_GRAY }}>
                <Text className="text-base font-semibold text-center" style={{ color: TEXT_WHITE }}>
                  {t('home.language')}
                </Text>
              </View>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  className="flex-row items-center justify-between p-4 border-b"
                  style={{ borderColor: BORDER_GRAY }}
                  onPress={() => {
                    setLanguage(lang.code);
                    setLangModalVisible(false);
                  }}
                >
                  <Text style={{ color: TEXT_WHITE, fontSize: 15 }}>{lang.nativeName}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color={YELLOW} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                className="p-4 items-center"
                onPress={() => setLangModalVisible(false)}
              >
                <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 模式切换 */}
        <View className="px-4 pb-2">
          <View className="flex-row rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'swap' ? YELLOW : 'transparent' }}
              onPress={() => setMode('swap')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'swap' ? '#333' : TEXT_MUTED }}>
                {t('home.swap')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'stake' ? YELLOW : 'transparent' }}
              onPress={() => setMode('stake')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'stake' ? '#333' : TEXT_MUTED }}>
                {t('home.stake')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 交易区 */}
        <View className="px-4 pt-2 gap-3">
          {/* 质押模式 */}
          {mode === 'stake' && (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                    <Ionicons name="diamond" size={16} color="#0A0A12" />
                  </View>
                  <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>质押 DQ</Text>
                </View>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  余额: {dqtBalance} DQ
                </Text>
              </View>

              <TextInput
                className="text-xl font-semibold mb-3"
                style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                placeholder={t('home.inputAmount')}
                placeholderTextColor={TEXT_MUTED}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                keyboardType="decimal-pad"
              />

              <View className="flex-row gap-2 mb-3">
                {[
                  { label: '25%', value: 25 },
                  { label: '50%', value: 50 },
                  { label: '75%', value: 75 },
                  { label: 'MAX', value: 100 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{
                      backgroundColor: item.label === 'MAX' ? CYAN : 'transparent',
                      borderWidth: 1,
                      borderColor: item.label === 'MAX' ? CYAN : BORDER_GRAY,
                    }}
                    onPress={() => handlePercent(item.value, setStakeAmount, dqtBalance)}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: item.label === 'MAX' ? '#0A0A12' : TEXT_WHITE }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 质押周期选择 */}
              <View className="mb-3">
                <Text className="text-sm mb-2" style={{ color: TEXT_MUTED }}>选择质押周期</Text>
                <View className="flex-row gap-2">
                  {stakePeriods.map((period) => (
                    <TouchableOpacity
                      key={period.days}
                      className="flex-1 py-2.5 rounded-lg items-center"
                      style={{
                        backgroundColor: stakePeriod === period.days ? YELLOW : 'transparent',
                        borderWidth: 1,
                        borderColor: stakePeriod === period.days ? YELLOW : BORDER_GRAY,
                      }}
                      onPress={() => setStakePeriod(period.days)}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: stakePeriod === period.days ? '#333' : TEXT_WHITE }}
                      >
                        {period.label}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: stakePeriod === period.days ? '#333' : YELLOW }}
                      >
                        {period.reward}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 质押说明 */}
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="information-circle" size={16} color={CYAN} />
                  <Text className="text-sm font-medium" style={{ color: CYAN }}>{t('home.stakeInfo')}</Text>
                </View>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                  • 单币质押，爆块产出{'\n'}
                  • 质押 {stakePeriod} 天，享 {stakePeriods.find(p => p.days === stakePeriod)?.reward} 加权分红{'\n'}
                  • 加权按权重分配卖出手续费6%{'\n'}
                  • 质押锁定期内不可提前解押
                </Text>
              </View>
            </View>
          )}

          {/* 兑换模式 */}
          {mode === 'swap' && (
            <>
              {/* 出售区 */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: swapDirection === 'dq_to_sol' ? CYAN : SOL_PURPLE }}>
                      {swapDirection === 'dq_to_sol' ? (
                        <Ionicons name="diamond" size={16} color="#0A0A12" />
                      ) : (
                        <Text className="text-sm font-bold text-white">S</Text>
                      )}
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      {swapDirection === 'dq_to_sol' ? 'DQ' : 'SOL'}
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    余额: {swapDirection === 'dq_to_sol' ? dqtBalance : solBalance} {swapDirection === 'dq_to_sol' ? 'DQ' : 'SOL'}
                  </Text>
                </View>

                <TextInput
                  className="text-xl font-semibold mb-3"
                  style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                  placeholder={t('home.inputAmount')}
                  placeholderTextColor={TEXT_MUTED}
                  value={sellAmount}
                  onChangeText={setSellAmount}
                  keyboardType="decimal-pad"
                />

                <View className="flex-row gap-2">
                  {[
                    { label: '25%', value: 25 },
                    { label: '50%', value: 50 },
                    { label: '75%', value: 75 },
                    { label: 'MAX', value: 100 },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      className="flex-1 py-2.5 rounded-lg items-center"
                      style={{
                        backgroundColor: item.label === 'MAX' ? (swapDirection === 'dq_to_sol' ? CYAN : SOL_PURPLE) : 'transparent',
                        borderWidth: 1,
                        borderColor: item.label === 'MAX' ? (swapDirection === 'dq_to_sol' ? CYAN : SOL_PURPLE) : BORDER_GRAY,
                      }}
                      onPress={() => {
                        const balance = swapDirection === 'dq_to_sol' ? dqtBalance : solBalance;
                        if (balance) {
                          handlePercent(item.value, setSellAmount, balance);
                        }
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: item.label === 'MAX' ? '#0A0A12' : TEXT_WHITE }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 切换按钮 */}
              <View className="items-center -my-2 z-10">
                <TouchableOpacity
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: BG_DARK, borderWidth: 2, borderColor: YELLOW }}
                  onPress={handleSwapDirection}
                >
                  <Ionicons name="swap-vertical" size={24} color={YELLOW} />
                </TouchableOpacity>
              </View>

              {/* 购买区 */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: swapDirection === 'dq_to_sol' ? SOL_PURPLE : CYAN }}>
                      {swapDirection === 'dq_to_sol' ? (
                        <Text className="text-sm font-bold text-white">S</Text>
                      ) : (
                        <Ionicons name="diamond" size={16} color="#0A0A12" />
                      )}
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      {swapDirection === 'dq_to_sol' ? 'SOL' : 'DQ'}
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    余额: {swapDirection === 'dq_to_sol' ? solBalance : dqtBalance} {swapDirection === 'dq_to_sol' ? 'SOL' : 'DQ'}
                  </Text>
                </View>

                <View className="h-12 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                  <View className="flex-1 flex-row items-end px-2 gap-0.5">
                    {[30, 45, 35, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 55, 65].map((h, i) => (
                      <View key={i} className="flex-1 rounded-sm" style={{
                        height: `${h}%`,
                        backgroundColor: i > 10 ? (swapDirection === 'dq_to_sol' ? SOL_PURPLE : CYAN) : 'rgba(208,32,255,0.5)'
                      }} />
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* 确定兑换按钮 */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center"
            style={{ backgroundColor: YELLOW }}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text className="text-base font-semibold" style={{ color: '#333' }}>
                {mode === 'swap' ? t('home.confirmSwap') : t('home.confirmStake')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 数据卡片区 */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-base font-semibold mb-3" style={{ color: TEXT_WHITE }}>
            {t('home.networkData')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* 今日入单 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: YELLOW }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('home.todayDeposit')}</Text>
              <Text className="text-lg font-bold" style={{ color: YELLOW }}>
                {statsLoading ? '...' : stats.todayDeposit}
              </Text>
            </View>
            
            {/* 全网算力 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: CYAN }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>全网算力(T/H)</Text>
              <Text className="text-lg font-bold" style={{ color: CYAN }}>
                {statsLoading ? '...' : stats.networkPower}
              </Text>
            </View>
            
            {/* 总销毁 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: PURPLE }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>总销毁</Text>
              <Text className="text-lg font-bold" style={{ color: PURPLE }}>
                {statsLoading ? '...' : stats.totalBurned}
              </Text>
            </View>
            
            {/* 总用户 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: TEXT_MUTED }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>总用户数</Text>
              <Text className="text-lg font-bold" style={{ color: TEXT_WHITE }}>
                {statsLoading ? '...' : stats.totalUsers}
              </Text>
            </View>
          </View>
        </View>

        {/* 底池数据 */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-base font-semibold mb-3" style={{ color: TEXT_WHITE }}>
            底池数据
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* SOL池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: SOL_PURPLE }}
            >
              <Text className="text-xs mb-1" style={{ color: '#FFF' }}>SOL池</Text>
              <Text className="text-lg font-bold" style={{ color: '#FFF' }}>
                {statsLoading ? '...' : stats.solPoolBalance}
              </Text>
            </View>
            
            {/* DQ池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: CYAN }}
            >
              <Text className="text-xs mb-1" style={{ color: '#0A0A12' }}>DQ池</Text>
              <Text className="text-lg font-bold" style={{ color: '#0A0A12' }}>
                {statsLoading ? '...' : stats.dqtPoolBalance}
              </Text>
            </View>
          </View>
        </View>

        {/* 社交链接 */}
        <View className="px-4 pt-4 pb-8">
          <View className="flex-row justify-center gap-4">
            <TouchableOpacity
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={openTelegram}
            >
              <Ionicons name="paper-plane" size={18} color="#0088CC" />
              <Text className="text-sm" style={{ color: TEXT_WHITE }}>Telegram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={openTwitter}
            >
              <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
              <Text className="text-sm" style={{ color: TEXT_WHITE }}>Twitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
