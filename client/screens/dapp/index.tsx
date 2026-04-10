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

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const PURPLE = '#BF00FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappIndex() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'stake' | 'swap'>('swap');
  const [stakeAmount, setStakeAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [bnbBalance, setBnbBalance] = useState('0.000338');
  const [dqtBalance, setDqtBalance] = useState('0.0');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 全局数据
  const [stats, setStats] = useState({
    totalStaked: '12,450',
    todayStaked: '480.1',
    dqtPrice: '0.15224',
    totalRewards: '8,234',
    poolBalance: '54.8',
    myStake: '0.0',
    myRewards: '0.0',
    teamSize: '0',
  });

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }, [])
  );

  const handlePercent = (percent: number, setter: (v: string) => void, balance: string) => {
    const amount = (parseFloat(balance) * percent) / 100;
    setter(amount.toString());
  };

  const handleConnectWallet = () => {
    Alert.alert('钱包连接', '正在连接Web3钱包...');
  };

  const handleRegister = () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    Alert.alert('注册成功', '您已成功激活账户');
  };

  const handleAction = () => {
    if (!walletAddress) {
      Alert.alert('提示', '请先连接钱包');
      return;
    }
    Alert.alert('功能开发中', '该功能正在开发中');
  };

  const openTelegram = () => Linking.openURL('https://t.me/deepquest');
  const openTwitter = () => Linking.openURL('https://twitter.com/deepquest');

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center bg-[#0A0A0F]">
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1 bg-[#0A0A0F]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 顶部区域 */}
        <View className="px-4 pt-3 pb-4">
          {/* Logo */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <Ionicons name="diamond" size={28} color={CYAN} />
              </View>
              <View>
                <Text className="text-2xl font-bold" style={{ color: YELLOW }}>
                  DeepQuest
                </Text>
                <Text className="text-gray-500 text-xs">Web3 DeFi 量化平台</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Ionicons name="globe-outline" size={16} color="#555570" />
              <Text className="text-gray-500 text-sm">EN</Text>
            </View>
          </View>

          {/* 钱包状态 */}
          <View className="flex-row items-center justify-between">
            {walletAddress ? (
              <TouchableOpacity
                className="flex-row items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
                onPress={handleConnectWallet}
              >
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: YELLOW }}>
                  <Ionicons name="wallet" size={14} color="#0A0A0F" />
                </View>
                <Text className="text-white text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="px-3 py-2 rounded-xl"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
                onPress={handleConnectWallet}
              >
                <Text className="text-white text-sm">连接钱包</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: YELLOW }}
              onPress={handleRegister}
            >
              <Text className="text-black font-bold text-sm">激活账户</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 模式切换 */}
        <View className="px-4 mb-4">
          <View
            className="flex-row rounded-xl p-1"
            style={{ backgroundColor: CARD_BG }}
          >
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{
                backgroundColor: mode === 'swap' ? YELLOW : 'transparent',
              }}
              onPress={() => setMode('swap')}
            >
              <Text
                className="font-semibold text-sm"
                style={{ color: mode === 'swap' ? '#0A0A0F' : '#EAEAEA' }}
              >
                兑换
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{
                backgroundColor: mode === 'stake' ? YELLOW : 'transparent',
              }}
              onPress={() => setMode('stake')}
            >
              <Text
                className="font-semibold text-sm"
                style={{ color: mode === 'stake' ? '#0A0A0F' : '#EAEAEA' }}
              >
                质押
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 操作区 */}
        <View className="px-4 gap-3">
          {mode === 'swap' ? (
            <>
              {/* 兑换 - BNB */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                      <Text className="font-bold text-sm text-black">B</Text>
                    </View>
                    <Text className="text-white font-semibold">BNB</Text>
                  </View>
                  <Text className="text-gray-400 text-sm">余额: {bnbBalance}</Text>
                </View>
                <TextInput
                  className="text-2xl text-white font-semibold mb-3"
                  placeholder="输入数量"
                  placeholderTextColor="#555570"
                  value={swapAmount}
                  onChangeText={setSwapAmount}
                  keyboardType="decimal-pad"
                />
                <View className="flex-row gap-2">
                  {[20, 50, 70, 100].map((p) => (
                    <TouchableOpacity
                      key={p}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={{
                        backgroundColor: p === 100 ? YELLOW : 'transparent',
                        borderWidth: 1,
                        borderColor: p === 100 ? YELLOW : BORDER_GLOW,
                      }}
                      onPress={() => handlePercent(p, setSwapAmount, bnbBalance)}
                    >
                      <Text className="text-xs font-medium" style={{ color: p === 100 ? '#0A0A0F' : '#EAEAEA' }}>
                        {p === 100 ? 'MAX' : `${p}%`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 兑换 - DQT */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                      <Ionicons name="diamond" size={18} color="#0A0A0F" />
                    </View>
                    <Text className="text-white font-semibold">DQT</Text>
                  </View>
                  <Text className="text-gray-400 text-sm">余额: {dqtBalance}</Text>
                </View>
                <View className="py-2">
                  <Text className="text-gray-500 text-lg">—</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* 质押 - BNB */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                      <Text className="font-bold text-sm text-black">B</Text>
                    </View>
                    <Text className="text-white font-semibold">质押 BNB</Text>
                  </View>
                  <Text className="text-gray-400 text-sm">余额: {bnbBalance}</Text>
                </View>
                <TextInput
                  className="text-2xl text-white font-semibold mb-3"
                  placeholder="输入质押数量"
                  placeholderTextColor="#555570"
                  value={stakeAmount}
                  onChangeText={setStakeAmount}
                  keyboardType="decimal-pad"
                />
                <View className="flex-row gap-2">
                  {[20, 50, 70, 100].map((p) => (
                    <TouchableOpacity
                      key={p}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={{
                        backgroundColor: p === 100 ? YELLOW : 'transparent',
                        borderWidth: 1,
                        borderColor: p === 100 ? YELLOW : BORDER_GLOW,
                      }}
                      onPress={() => handlePercent(p, setStakeAmount, bnbBalance)}
                    >
                      <Text className="text-xs font-medium" style={{ color: p === 100 ? '#0A0A0F' : '#EAEAEA' }}>
                        {p === 100 ? 'MAX' : `${p}%`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 质押信息 */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="information-circle" size={18} color={CYAN} />
                  <Text className="text-gray-400 text-sm">质押说明</Text>
                </View>
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">预计年化收益</Text>
                    <Text className="text-yellow-400 font-medium">12% - 36%</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">质押锁定期</Text>
                    <Text className="text-white text-sm">30天起</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* 操作按钮 */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center"
            style={{ backgroundColor: YELLOW }}
            onPress={handleAction}
          >
            <Text className="text-black font-bold text-lg">
              {mode === 'swap' ? '确认兑换' : '确认质押'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 数据统计 */}
        <View className="px-4 mt-6 gap-3">
          {/* 平台数据 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold">平台数据</Text>
            </View>
            <View className="grid grid-cols-2 gap-4">
              <View>
                <Text className="text-gray-400 text-xs mb-1">总质押量(BNB)</Text>
                <Text className="text-white font-semibold">{stats.totalStaked}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">今日新增(BNB)</Text>
                <Text className="text-white font-semibold">{stats.todayStaked}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">DQT价格</Text>
                <Text className="text-cyan-400 font-semibold">${stats.dqtPrice}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">累计发放奖励</Text>
                <Text className="text-white font-semibold">{stats.totalRewards}</Text>
              </View>
            </View>
          </View>

          {/* 个人数据 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: CYAN }} />
              <Text className="text-white font-bold">我的数据</Text>
            </View>
            <View className="grid grid-cols-3 gap-3">
              <View className="p-3 rounded-xl items-center" style={{ backgroundColor: 'rgba(255,215,0,0.08)' }}>
                <Text className="text-yellow-400 font-bold text-lg">{stats.myStake}</Text>
                <Text className="text-gray-500 text-xs mt-1">我的质押</Text>
              </View>
              <View className="p-3 rounded-xl items-center" style={{ backgroundColor: 'rgba(0,240,255,0.08)' }}>
                <Text className="text-cyan-400 font-bold text-lg">{stats.myRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">我的收益</Text>
              </View>
              <View className="p-3 rounded-xl items-center" style={{ backgroundColor: 'rgba(191,0,255,0.08)' }}>
                <Text className="text-purple-400 font-bold text-lg">{stats.teamSize}</Text>
                <Text className="text-gray-500 text-xs mt-1">团队人数</Text>
              </View>
            </View>
          </View>

          {/* 社群入口 */}
          <View className="flex-row gap-4 mt-2">
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              onPress={openTelegram}
            >
              <Ionicons name="send" size={24} color={CYAN} />
              <Text className="text-white text-sm mt-2">Telegram</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              onPress={openTwitter}
            >
              <Ionicons name="logo-twitter" size={24} color={CYAN} />
              <Text className="text-white text-sm mt-2">Twitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
