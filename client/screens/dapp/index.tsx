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
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';

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
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'swap' | 'stake'>('swap');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [bnbBalance, setBnbBalance] = useState('0.0');
  const [dqtBalance, setDqtBalance] = useState('0.0');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 平台数据
  const [stats, setStats] = useState({
    totalSupply: '330,000,000',
    totalBurned: '140,480,617',
    todayDeposit: '0.00',
    networkPower: '63,497,422',
    usdtPoolBalance: '0.00',
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
          usdtPoolBalance: response.data.usdtPoolBalance || '0.00',
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
        contentContainerStyle={{ paddingBottom: 120 }}
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

            {/* 钱包+注册 */}
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
                    <Text className="text-sm" style={{ color: '#FF5050' }}>断开</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  className="px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                  onPress={handleConnect}
                >
                  <Text className="text-sm" style={{ color: TEXT_WHITE }}>连接钱包</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: YELLOW }}
                onPress={handleRegister}
              >
                <Text className="text-sm font-semibold" style={{ color: '#333' }}>注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 语言切换 */}
        <View className="px-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="globe-outline" size={14} color={YELLOW} />
              <Text className="text-xs" style={{ color: YELLOW }}>语言：简体中文</Text>
            </View>
          </View>
        </View>

        {/* 模式切换 */}
        <View className="px-4 pb-2">
          <View className="flex-row rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'swap' ? YELLOW : 'transparent' }}
              onPress={() => setMode('swap')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'swap' ? '#333' : TEXT_MUTED }}>
                兑换
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'stake' ? YELLOW : 'transparent' }}
              onPress={() => setMode('stake')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'stake' ? '#333' : TEXT_MUTED }}>
                质押
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
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                    <Text className="text-sm font-bold text-black">B</Text>
                  </View>
                  <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>质押 BNB</Text>
                </View>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  余额: {bnbBalance} BNB
                </Text>
              </View>

              <TextInput
                className="text-xl font-semibold mb-3"
                style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                placeholder="请输入质押数量"
                placeholderTextColor={TEXT_MUTED}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                keyboardType="decimal-pad"
              />

              <View className="flex-row gap-2 mb-3">
                {[
                  { label: '20%', value: 20 },
                  { label: '50%', value: 50 },
                  { label: '70%', value: 70 },
                  { label: 'MAX', value: 100 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{
                      backgroundColor: item.label === 'MAX' ? '#FFFFFF' : 'transparent',
                      borderWidth: 1,
                      borderColor: item.label === 'MAX' ? '#FFFFFF' : BORDER_GRAY,
                    }}
                    onPress={() => handlePercent(item.value, setStakeAmount, bnbBalance)}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: item.label === 'MAX' ? '#333' : TEXT_WHITE }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 质押说明 */}
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="information-circle" size={16} color={CYAN} />
                  <Text className="text-sm font-medium" style={{ color: CYAN }}>质押说明</Text>
                </View>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                  • 质押 BNB 每日获得 DQT 收益{'\n'}
                  • 质押锁定期为 30 天{'\n'}
                  • 收益率根据等级和质押时长计算
                </Text>
              </View>
            </View>
          )}

          {/* 兑换模式 */}
          {mode === 'swap' && (
            <>
              {/* DQT 出售区 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                  <Ionicons name="diamond" size={16} color="#0A0A12" />
                </View>
                <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>DQT</Text>
              </View>
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                余额: {dqtBalance} DQT
              </Text>
            </View>

            <TextInput
              className="text-xl font-semibold mb-3"
              style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
              placeholder="请输入出售数量"
              placeholderTextColor={TEXT_MUTED}
              value={sellAmount}
              onChangeText={setSellAmount}
              keyboardType="decimal-pad"
            />

            <View className="flex-row gap-2">
              {[
                { label: '20%', value: 20 },
                { label: '50%', value: 50 },
                { label: '70%', value: 70 },
                { label: 'MAX', value: 100 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  className="flex-1 py-2.5 rounded-lg items-center"
                  style={{
                    backgroundColor: item.label === 'MAX' ? '#FFFFFF' : 'transparent',
                    borderWidth: 1,
                    borderColor: item.label === 'MAX' ? '#FFFFFF' : BORDER_GRAY,
                  }}
                  onPress={() => handlePercent(item.value, setSellAmount, dqtBalance)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: item.label === 'MAX' ? '#333' : TEXT_WHITE }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BNB 购买区 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                  <Text className="text-sm font-bold text-black">B</Text>
                </View>
                <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>BNB</Text>
              </View>
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                余额: {bnbBalance} BNB
              </Text>
            </View>

            <TextInput
              className="text-xl font-semibold mb-3"
              style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
              placeholder="请输入购买数量"
              placeholderTextColor={TEXT_MUTED}
              value={buyAmount}
              onChangeText={setBuyAmount}
              keyboardType="decimal-pad"
            />

            <View className="flex-row gap-2">
              {[
                { label: '20%', value: 20 },
                { label: '50%', value: 50 },
                { label: '70%', value: 70 },
                { label: 'MAX', value: 100 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  className="flex-1 py-2.5 rounded-lg items-center"
                  style={{
                    backgroundColor: item.label === 'MAX' ? '#FFFFFF' : 'transparent',
                    borderWidth: 1,
                    borderColor: item.label === 'MAX' ? '#FFFFFF' : BORDER_GRAY,
                  }}
                  onPress={() => handlePercent(item.value, setBuyAmount, bnbBalance)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: item.label === 'MAX' ? '#333' : TEXT_WHITE }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* K线装饰区域 */}
            <View className="mt-3 h-12 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
              <View className="flex-1 flex-row items-end px-2 gap-0.5">
                {[30, 45, 35, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 55, 65].map((h, i) => (
                  <View key={i} className="flex-1 rounded-sm" style={{ 
                    height: `${h}%`, 
                    backgroundColor: i > 10 ? CYAN : 'rgba(208,32,255,0.5)' 
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
                {mode === 'swap' ? '确定兑换' : '确定质押'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 数据卡片区 */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-base font-semibold mb-3" style={{ color: TEXT_WHITE }}>
            全网数据
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* 今日入单 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: YELLOW }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>今日入单(BNB)</Text>
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
            {/* USDT池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: YELLOW }}
            >
              <Text className="text-xs mb-1" style={{ color: '#333' }}>USDT池</Text>
              <Text className="text-lg font-bold" style={{ color: '#333' }}>
                {statsLoading ? '...' : stats.usdtPoolBalance}
              </Text>
            </View>
            
            {/* DQT池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: CYAN }}
            >
              <Text className="text-xs mb-1" style={{ color: '#0A0A12' }}>DQT池</Text>
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
