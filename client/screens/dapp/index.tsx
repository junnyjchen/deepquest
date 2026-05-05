import { useState, useCallback, useEffect } from 'react';
import QuickMenu from '@/components/QuickMenu';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  connectWallet,
  getCurrentAccount,
  switchToBSC,
  registerUser,
  depositSOL,
  claimLP,
  claimNft,
  claimDTeam,
  DQPROJECT_ABI,
} from '@/utils/web3';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

// 用户信息类型
interface UserInfo {
  wallet_address: string;
  referrer_address?: string;
  level?: number;
  directCount?: number;
  totalInvest?: string;
  teamInvest?: string;
  directSales?: string;
}

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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 邀请绑定相关状态
  const [pendingInviteReferrer, setPendingInviteReferrer] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);

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
            // 检查是否已绑定推荐人
            await checkInviteBinding(savedWallet);
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
  
  // 检查邀请绑定状态
  const checkInviteBinding = async (address: string) => {
    try {
      const result = await dappApi.checkBinding(address);
      // 如果未绑定，检查本地存储的待绑定推荐人
      if (!result.bound) {
        const pendingRef = await AsyncStorage.getItem('@deepquest_pending_referrer');
        if (pendingRef) {
          // 验证推荐人是否有效
          const validation = await dappApi.validateReferrer(pendingRef);
          if (validation.valid) {
            setPendingInviteReferrer(pendingRef);
            setInviteModalVisible(true);
          } else {
            // 无效则清除
            await AsyncStorage.removeItem('@deepquest_pending_referrer');
          }
        }
      }
    } catch (error) {
      console.error('检查绑定状态失败:', error);
    }
  };
  
  // 绑定推荐人
  const handleBindInvite = async () => {
    if (!walletAddress || !pendingInviteReferrer) return;
    
    try {
      setBindLoading(true);
      const result = await dappApi.bindReferrer(walletAddress, pendingInviteReferrer);
      
      if (result.code === 0) {
        Alert.alert('绑定成功', '您已成功绑定推荐人！');
        await AsyncStorage.removeItem('@deepquest_pending_referrer');
        setPendingInviteReferrer(null);
      } else {
        Alert.alert('绑定失败', result.message || '绑定推荐人失败');
      }
    } catch (error: any) {
      Alert.alert('绑定失败', error.message || '绑定推荐人失败');
    } finally {
      setBindLoading(false);
      setInviteModalVisible(false);
    }
  };
  
  // 跳过绑定
  const handleSkipInvite = async () => {
    await AsyncStorage.removeItem('@deepquest_pending_referrer');
    setPendingInviteReferrer(null);
    setInviteModalVisible(false);
  };

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

  // 连接 TP/钱包
  const handleConnect = async () => {
    try {
      // 尝试连接钱包
      const { provider, address } = await connectWallet();
      
      // 切换到 BSC 主网
      await switchToBSC(provider);
      
      // 保存钱包地址
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, address);
      setWalletAddress(address);
      
      // 同步获取用户信息
      await syncUserInfo(address);
      
      Alert.alert('成功', `钱包已连接: ${address.slice(0, 10)}...`);
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      
      // 如果 MetaMask 不可用，提供模拟选项
      if (typeof window !== 'undefined' && !window.ethereum) {
        Alert.alert(
          '提示',
          '未检测到钱包扩展。请在浏览器中安装 TP 钱包或 MetaMask 扩展。',
          [{ text: '确定' }]
        );
      } else {
        Alert.alert('错误', error.message || '钱包连接失败');
      }
    }
  };
  
  // 同步用户信息：检查注册状态，未注册则注册
  const syncUserInfo = async (address: string) => {
    try {
      // 1. 检查是否已注册
      const { is_registered, referrer_address } = await dappApi.checkRegistered(address);
      
      if (is_registered) {
        // 已注册，获取用户信息
        const userInfo = await dappApi.getUserInfo(address);
        console.log('[DApp] 用户已注册，获取信息:', userInfo);
        // TODO: 更新用户状态
      } else {
        // 未注册，尝试注册
        console.log('[DApp] 用户未注册，需要注册');
        // 如果有待处理的推荐人，使用待处理推荐人
        let referrer = referrer_address || '';
        const pendingRef = await AsyncStorage.getItem('@deepquest_pending_referrer');
        if (pendingRef) {
          referrer = pendingRef;
          await AsyncStorage.removeItem('@deepquest_pending_referrer');
        }
        
        // 无条件注册（允许无推荐人）
        try {
          const result = await dappApi.register(address, referrer, '');
          console.log('[DApp] 用户注册成功:', result);
        } catch (regError: any) {
          console.log('[DApp] 注册失败:', regError.message);
        }
      }
    } catch (error: any) {
      console.error('[DApp] 同步用户信息失败:', error);
    }
  };

  // 断开钱包连接
  const handleDisconnect = async () => {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (e) {
      // 忽略存储错误
    }
    setWalletAddress(null);
    setBnbBalance('0.0');
    setDqtBalance('0.0');
    setUserInfo(null);
    // 刷新页面
    router.replace('/(dapp)');
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
      
      // 检查是否连接了钱包
      if (typeof window !== 'undefined' && window.ethereum) {
        // 调用链上质押
        const amountInWei = (parseFloat(stakeAmount) * 1e18).toString();
        const txHash = await depositSOL(walletAddress, amountInWei);
        
        Alert.alert(
          '交易已提交',
          `质押 ${stakeAmount} BNB 成功！\n交易哈希: ${txHash.slice(0, 20)}...`,
          [
            { text: '确定' },
            { text: '查看详情', onPress: () => Linking.openURL(`https://bscscan.com/tx/${txHash}`) }
          ]
        );
        setStakeAmount('');
      } else {
        // 模拟模式 - 调用后端 API
        const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const response = await dappApi.stake(walletAddress, stakeAmount, txHash);
        
        if (response.code === 0) {
          Alert.alert('成功', `质押 ${stakeAmount} BNB 成功！\n交易哈希: ${txHash.slice(0, 20)}...`);
          setStakeAmount('');
        } else {
          Alert.alert('失败', response.message || '质押失败');
        }
      }
    } catch (error: any) {
      console.error('质押失败:', error);
      Alert.alert('错误', error.message || '质押失败，请重试');
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
        <QuickMenu
          menuExpanded={menuExpanded}
          onMenuPress={() => setMenuExpanded(!menuExpanded)}
        />

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

        {/* 邀请绑定弹窗 */}
        <Modal
          visible={inviteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.inviteModalContent}>
              <View style={styles.inviteModalHeader}>
                <Ionicons name="people-circle" size={48} color={YELLOW} />
                <Text style={styles.inviteModalTitle}>邀请绑定</Text>
              </View>
              
              <Text style={styles.inviteModalDesc}>
                您有一个待绑定的推荐人，绑定后可以获得邀请奖励
              </Text>
              
              {pendingInviteReferrer && (
                <View style={styles.referrerAddressBox}>
                  <Text style={styles.referrerLabel}>推荐人地址:</Text>
                  <Text style={styles.referrerAddress} numberOfLines={1} ellipsizeMode="middle">
                    {pendingInviteReferrer}
                  </Text>
                </View>
              )}
              
              <View style={styles.inviteModalButtons}>
                <TouchableOpacity
                  style={[styles.inviteModalBtn, styles.skipBtn]}
                  onPress={handleSkipInvite}
                >
                  <Text style={styles.skipBtnText}>暂不绑定</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inviteModalBtn, styles.bindBtn]}
                  onPress={handleBindInvite}
                  disabled={bindLoading}
                >
                  {bindLoading ? (
                    <ActivityIndicator size="small" color="#0A0A12" />
                  ) : (
                    <Text style={styles.bindBtnText}>确认绑定</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                      <Ionicons name="diamond" size={16} color="#0A0A12" />
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      DQ
                    </Text>
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
                        backgroundColor: item.label === 'MAX' ? CYAN : 'transparent',
                        borderWidth: 1,
                        borderColor: item.label === 'MAX' ? CYAN : BORDER_GRAY,
                      }}
                      onPress={() => {
                        if (dqtBalance) {
                          handlePercent(item.value, setSellAmount, dqtBalance);
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

              {/* 切换按钮 - 已隐藏，仅支持 DQ 兑换 SOL */}

              {/* 购买区 */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: SOL_PURPLE }}>
                      <Text className="text-sm font-bold text-white">S</Text>
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      SOL
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                    余额: {solBalance} SOL
                  </Text>
                </View>

                <View className="h-12 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                  <View className="flex-1 flex-row items-end px-2 gap-0.5">
                    {[30, 45, 35, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 55, 65].map((h, i) => (
                      <View key={i} className="flex-1 rounded-sm" style={{
                        height: `${h}%`,
                        backgroundColor: i > 10 ? SOL_PURPLE : 'rgba(208,32,255,0.5)'
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteModalContent: {
    backgroundColor: BG_CARD_TRANS,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: YELLOW,
  },
  inviteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginTop: 12,
  },
  inviteModalDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  referrerAddressBox: {
    backgroundColor: BG_DARK,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  referrerLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  referrerAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: CYAN,
  },
  inviteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  bindBtn: {
    backgroundColor: YELLOW,
  },
  bindBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG_DARK,
  },
});
