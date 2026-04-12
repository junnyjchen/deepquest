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
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function DappIndex() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'swap' | 'stake'>('swap');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [bnbBalance, setBnbBalance] = useState('0.000338');
  const [dqtBalance, setDqtBalance] = useState('0.0');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 平台数据
  const [stats] = useState({
    totalSupply: '330,000,000',
    totalBurned: '140,480,617',
    todayDeposit: '480.1',
    networkPower: '63,497,422',
    myPower: '0.0',
    myInvestment: '0.0',
    myLP: '0.0',
    tomorrowOutput: '546,168',
    poolUSDT: '8,315,120',
    poolDQT: '54,616,828',
    dqtPrice: '0.15224',
  });

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }, [])
  );

  const handlePercent = (percent: number, setter: (v: string) => void, balance: string) => {
    if (percent === 100) {
      setter(balance);
    } else {
      const amount = (parseFloat(balance) * percent) / 100;
      setter(amount.toFixed(6));
    }
  };

  const handleConnect = () => {
    Alert.alert('钱包连接', '正在连接Web3钱包...');
  };

  const handleRegister = () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    Alert.alert('注册成功', '您已成功激活账户');
  };

  const handleSwap = () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    Alert.alert('功能开发中', '兑换功能正在开发中');
  };

  const openTelegram = () => Linking.openURL('https://t.me/deepquest');
  const openTwitter = () => Linking.openURL('https://twitter.com/deepquest');

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
                <View
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                >
                  <Ionicons name="folder-open" size={14} color={TEXT_WHITE} />
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </Text>
                </View>
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
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="globe-outline" size={14} color={YELLOW} />
            <Text className="text-xs" style={{ color: YELLOW }}>语言：简体中文</Text>
          </View>
        </View>

        {/* 交易区 */}
        <View className="px-4 pt-2 gap-3">
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

          {/* 确定兑换按钮 */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center"
            style={{ backgroundColor: YELLOW }}
            onPress={handleSwap}
          >
            <Text className="text-base font-semibold" style={{ color: '#333' }}>确定兑换</Text>
          </TouchableOpacity>
        </View>

        {/* 数据总览卡片 */}
        <View className="px-4 mt-5">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>数据总览</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>总供应量(DQT)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.totalSupply}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>总销毁数(DQT)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.totalBurned}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>今日入单(BNB)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.todayDeposit}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>全网算力(T/H)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.networkPower}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>我的算力(T/H)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.myPower}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>我的投入(BNB)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.myInvestment}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>我的LP</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.myLP}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>明日产出(DQT)</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.tomorrowOutput}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 底池数据卡片 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>底池数据</Text>
            </View>

            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>USDT数量</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.poolUSDT}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>DQT数量</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{stats.poolDQT}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 当前币价卡片 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>当前币价</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold" style={{ color: TEXT_WHITE }}>
                {stats.dqtPrice} USDT
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="trending-up" size={18} color={YELLOW} />
                <Text className="text-sm font-medium" style={{ color: YELLOW }}>+2.5%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 我的累计收益卡片 - 黄色实色 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: YELLOW }}
          >
            <View>
              <Text className="text-sm font-medium" style={{ color: '#333' }}>我的累计收益</Text>
              <Text className="text-2xl font-bold mt-1" style={{ color: '#333' }}>0.0 DQT</Text>
            </View>
            <Ionicons name="trending-up" size={28} color="#333" />
          </View>
        </View>

        {/* 钱包余额卡片 - 黄色实色 */}
        <View className="px-4 mt-3">
          <View
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: YELLOW }}
          >
            <View>
              <Text className="text-sm font-medium" style={{ color: '#333' }}>钱包余额</Text>
              <Text className="text-2xl font-bold mt-1" style={{ color: '#333' }}>0.0 DQT</Text>
            </View>
            <Ionicons name="wallet" size={28} color="#333" />
          </View>
        </View>

        {/* 我的团队入口 */}
        <View className="px-4 mt-4">
          <TouchableOpacity
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                <Ionicons name="people" size={24} color={YELLOW} />
              </View>
              <Text className="text-base font-medium" style={{ color: TEXT_WHITE }}>我的团队</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* 社群入口 */}
        <View className="px-4 mt-4 mb-6 flex-row gap-4">
          <TouchableOpacity
            className="flex-1 py-4 rounded-2xl items-center"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: BORDER_GRAY }}
            onPress={openTelegram}
          >
            <Ionicons name="send" size={24} color={YELLOW} />
            <Text className="text-sm mt-2" style={{ color: TEXT_WHITE }}>Telegram</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-4 rounded-2xl items-center"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: BORDER_GRAY }}
            onPress={openTwitter}
          >
            <Ionicons name="logo-twitter" size={24} color={YELLOW} />
            <Text className="text-sm mt-2" style={{ color: TEXT_WHITE }}>Twitter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
