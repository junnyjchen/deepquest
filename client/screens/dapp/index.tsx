import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappIndex() {
  const insets = useSafeAreaInsets();
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [judaoBalance, setJudauBalance] = useState('0.0');
  const [bnbBalance, setBnbBalance] = useState('0.000338');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 数据统计
  const [stats, setStats] = useState({
    totalSupply: '330,000,000',
    totalBurned: '140,480,617',
    todayDeposit: '480.1',
    networkPower: '63,497,422',
    myPower: '0.0',
    myInvestment: '0.0',
    myLP: '0.0',
    tomorrowOutput: '≈546,168',
    tomorrowBurn: '≈546,168',
    poolUSDT: '8,315,120',
    poolJUDAO: '54,616,828',
    judaoPrice: '0.15224',
  });

  // 模拟加载数据
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }, [])
  );

  const handlePercent = (percent: number) => {
    if (percent === 100) {
      setSellAmount(judaoBalance);
    } else {
      const amount = (parseFloat(judaoBalance) * percent) / 100;
      setSellAmount(amount.toString());
    }
  };

  const handleSwap = async () => {
    // alert('兑换功能开发中');
  };

  const handleConnectWallet = () => {
    // setWalletAddress('0x1234...5678');
  };

  const handleRegister = () => {
    // alert('注册功能开发中');
  };

  const openTelegram = () => {
    Linking.openURL('https://t.me/');
  };

  const openTwitter = () => {
    Linking.openURL('https://twitter.com/');
  };

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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 顶部区域 */}
        <View className="px-4 pt-3 pb-4">
          {/* Logo和标题 */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <Ionicons name="star" size={24} color={YELLOW} />
              </View>
              <Text className="text-2xl font-bold" style={{ color: YELLOW }}>
                JuDao
              </Text>
            </View>

            {/* 语言切换 */}
            <View className="flex-row items-center gap-1">
              <Ionicons name="globe-outline" size={16} color={YELLOW} />
              <Text className="text-sm" style={{ color: YELLOW }}>
                中文
              </Text>
            </View>
          </View>

          {/* 钱包连接区域 */}
          <View className="flex-row items-center justify-between">
            {walletAddress ? (
              <TouchableOpacity
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              >
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: YELLOW }}>
                  <Text className="text-xs font-bold text-black">B</Text>
                </View>
                <Text className="text-white text-sm">{walletAddress}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
                onPress={handleConnectWallet}
              >
                <Text className="text-white text-sm">连接钱包</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: YELLOW }}
              onPress={handleRegister}
            >
              <Text className="text-black font-semibold">注册</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 交易兑换区 */}
        <View className="px-4 gap-3">
          {/* JUDAO 出售区 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                  <Text className="text-sm font-bold text-black">J</Text>
                </View>
                <Text className="text-white font-semibold">JUDAO</Text>
              </View>
              <Text className="text-gray-400 text-sm">
                余额: {judaoBalance} JUDAO
              </Text>
            </View>

            <TextInput
              className="text-2xl text-white font-semibold mb-3"
              placeholder="请输入出售数量"
              placeholderTextColor="#555570"
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
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{
                    backgroundColor: item.label === 'MAX' ? YELLOW : 'transparent',
                    borderWidth: 1,
                    borderColor: item.label === 'MAX' ? YELLOW : BORDER_GLOW,
                  }}
                  onPress={() => handlePercent(item.value)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: item.label === 'MAX' ? '#0A0A0F' : '#EAEAEA' }}
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
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                  <Text className="text-sm font-bold text-black">B</Text>
                </View>
                <Text className="text-white font-semibold">BNB</Text>
              </View>
              <Text className="text-gray-400 text-sm">
                余额: {bnbBalance} BNB
              </Text>
            </View>

            <TextInput
              className="text-2xl text-white font-semibold mb-3"
              placeholder="请输入购买数量"
              placeholderTextColor="#555570"
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
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{
                    backgroundColor: item.label === 'MAX' ? YELLOW : 'transparent',
                    borderWidth: 1,
                    borderColor: item.label === 'MAX' ? YELLOW : BORDER_GLOW,
                  }}
                  onPress={() => handlePercent(item.value)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: item.label === 'MAX' ? '#0A0A0F' : '#EAEAEA' }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 确定兑换按钮 */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center"
            style={{ backgroundColor: YELLOW }}
            onPress={handleSwap}
          >
            <Text className="text-black font-bold text-lg">确定兑换</Text>
          </TouchableOpacity>
        </View>

        {/* 数据统计区 */}
        <View className="px-4 mt-6 gap-3">
          {/* 数据总览 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">数据总览</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
              <View>
                <Text className="text-gray-400 text-xs mb-1">总供应量(JUDAO)</Text>
                <Text className="text-white font-semibold">{stats.totalSupply}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">总销毁数(JUDAO)</Text>
                <Text className="text-white font-semibold">{stats.totalBurned}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">今日入单(BNB)</Text>
                <Text className="text-white font-semibold">{stats.todayDeposit}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">全网算力(T/H)</Text>
                <Text className="text-white font-semibold">{stats.networkPower}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">我的算力(T/H)</Text>
                <Text className="text-white font-semibold">{stats.myPower}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">我的投入(BNB)</Text>
                <Text className="text-white font-semibold">{stats.myInvestment}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">我的LP</Text>
                <Text className="text-white font-semibold">{stats.myLP}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs mb-1">明日产出(JUDAO)</Text>
                <Text className="text-white font-semibold">{stats.tomorrowOutput}</Text>
              </View>
            </View>
          </View>

          {/* 底池数据 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">底池数据</Text>
            </View>

            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-gray-400 text-xs mb-1">USDT数量</Text>
                <Text className="text-white font-semibold">{stats.poolUSDT}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-xs mb-1">JUDAO数量</Text>
                <Text className="text-white font-semibold">{stats.poolJUDAO}</Text>
              </View>
            </View>
          </View>

          {/* 当前币价 */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">当前币价</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold text-2xl">{stats.judaoPrice} USDT</Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="trending-up" size={20} color={YELLOW} />
                <Text className="text-yellow-400 text-sm font-medium">+2.5%</Text>
              </View>
            </View>
          </View>

          {/* 累计收益卡片 */}
          <TouchableOpacity
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: YELLOW }}
          >
            <View>
              <Text className="text-black font-semibold text-sm">我的累计收益</Text>
              <Text className="text-black font-bold text-2xl mt-1">0.0 JUDAO</Text>
            </View>
            <Ionicons name="trending-up" size={32} color="#0A0A0F" />
          </TouchableOpacity>

          {/* 钱包余额卡片 */}
          <TouchableOpacity
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{ backgroundColor: YELLOW }}
          >
            <View>
              <Text className="text-black font-semibold text-sm">钱包余额</Text>
              <Text className="text-black font-bold text-2xl mt-1">0.0 JUDAO</Text>
            </View>
            <Ionicons name="wallet" size={32} color="#0A0A0F" />
          </TouchableOpacity>

          {/* 社群入口 */}
          <View className="flex-row gap-4 mt-4">
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              onPress={openTelegram}
            >
              <Ionicons name="send" size={28} color="#00F0FF" />
              <Text className="text-white text-sm mt-2">Telegram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
              onPress={openTwitter}
            >
              <Ionicons name="logo-twitter" size={28} color="#00F0FF" />
              <Text className="text-white text-sm mt-2">Twitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
