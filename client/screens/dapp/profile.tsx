import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as Clipboard from 'expo-clipboard';

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const PURPLE = '#BF00FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappProfile() {
  const router = useSafeRouter();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // 用户数据
  const [userData, setUserData] = useState({
    stakedAmount: '0.0',
    pendingRewards: '0.0',
    totalRewards: '0.0',
    bnbBalance: '0.000338',
    dqtBalance: '0.0',
    teamSize: '0',
    directCount: '0',
    level: 'Lv.0',
    isActivated: false,
    stakeDays: '0',
    referrerAddress: null,
  });

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }, [])
  );

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert('复制成功', '钱包地址已复制');
    }
  };

  const handleConnect = () => {
    Alert.alert('钱包连接', '正在连接Web3钱包...');
  };

  const handleDisconnect = () => {
    Alert.alert('断开钱包', '确定断开连接？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: () => setWalletAddress(null) },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: walletAddress
          ? `加入DeepQuest，质押BNB获取被动收益！\n我的邀请码: ${walletAddress}`
          : '下载DeepQuest Web3 DeFi量化平台',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
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
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 顶部 */}
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}>
                <Ionicons name="diamond" size={24} color={CYAN} />
              </View>
              <View>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>DeepQuest</Text>
                <Text className="text-gray-500 text-xs">Web3 DeFi</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="globe-outline" size={18} color="#555570" />
              <Text className="text-gray-500 text-sm">EN</Text>
            </View>
          </View>
        </View>

        {/* 钱包卡片 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: walletAddress ? YELLOW : 'rgba(0,240,255,0.2)' }}
                >
                  {walletAddress ? (
                    <Ionicons name="wallet" size={24} color="#0A0A0F" />
                  ) : (
                    <Ionicons name="add" size={24} color={CYAN} />
                  )}
                </View>
                <View>
                  <Text className="text-white font-semibold text-lg">
                    {walletAddress ? '已连接' : '未连接'}
                  </Text>
                  <TouchableOpacity onPress={handleCopyAddress} disabled={!walletAddress}>
                    <Text className="text-gray-400 text-sm mt-1 font-mono">
                      {walletAddress || '点击连接钱包'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {walletAddress ? (
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,0,60,0.15)' }}
                  onPress={handleDisconnect}
                >
                  <Text className="text-red-400 text-xs">断开</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="px-4 py-2 rounded-xl"
                  style={{ backgroundColor: YELLOW }}
                  onPress={handleConnect}
                >
                  <Text className="text-black font-bold text-sm">连接</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 账户状态 */}
            <View className="flex-row items-center gap-3 mt-4 pt-4 border-t border-[rgba(0,240,255,0.08)]">
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="text-gray-500 text-sm">账户状态</Text>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: userData.isActivated ? 'rgba(0,255,136,0.15)' : 'rgba(255,215,0,0.15)' }}
                >
                  <Text className="text-xs font-medium" style={{ color: userData.isActivated ? '#00FF88' : YELLOW }}>
                    {userData.isActivated ? '已激活' : '未激活'}
                  </Text>
                </View>
              </View>
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="text-gray-500 text-sm">等级</Text>
                <Text className="text-white text-sm font-medium">{userData.level}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 资产概览 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold">资产概览</Text>
            </View>

            <View className="grid grid-cols-2 gap-3">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(243,186,47,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                    <Text className="text-xs font-bold text-black">B</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">BNB 余额</Text>
                </View>
                <Text className="text-white font-bold text-lg">{userData.bnbBalance}</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="diamond" size={16} color={CYAN} />
                  <Text className="text-gray-400 text-xs">DQT 余额</Text>
                </View>
                <Text className="text-white font-bold text-lg">{userData.dqtBalance}</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,255,136,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">质押数量</Text>
                <Text className="text-green-400 font-bold text-lg">{userData.stakedAmount}</Text>
                <Text className="text-gray-500 text-xs">BNB</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(191,0,255,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">质押天数</Text>
                <Text className="text-purple-400 font-bold text-lg">{userData.stakeDays}</Text>
                <Text className="text-gray-500 text-xs">天</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 收益统计 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: CYAN }} />
              <Text className="text-white font-bold">收益统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-3">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,215,0,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">待领取收益</Text>
                <Text className="text-yellow-400 font-bold text-xl">{userData.pendingRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">DQT</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">累计收益</Text>
                <Text className="text-cyan-400 font-bold text-xl">{userData.totalRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">DQT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 功能菜单 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(0,240,255,0.08)]"
              onPress={() => router.push('/dapp/team')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                  <Ionicons name="people" size={20} color={CYAN} />
                </View>
                <View>
                  <Text className="text-white font-medium">我的团队</Text>
                  <Text className="text-gray-500 text-xs">{userData.teamSize} 人</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(0,240,255,0.08)]"
              onPress={handleShare}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,255,136,0.1)' }}>
                  <Ionicons name="share-social" size={20} color="#00FF88" />
                </View>
                <Text className="text-white font-medium">邀请好友</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(0,240,255,0.08)]"
              onPress={() => Alert.alert('开发中', '质押记录功能开发中')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(191,0,255,0.1)' }}>
                  <Ionicons name="time" size={20} color={PURPLE} />
                </View>
                <Text className="text-white font-medium">质押记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => Alert.alert('开发中', '收益记录功能开发中')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Ionicons name="receipt" size={20} color={YELLOW} />
                </View>
                <Text className="text-white font-medium">收益记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 版本 */}
        <View className="px-4 mt-8 pb-8">
          <Text className="text-gray-600 text-xs text-center">DeepQuest v1.0.0 | BSC Chain</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
