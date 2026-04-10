import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappProfile() {
  const router = useSafeRouter();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // 用户资产数据
  const [assets, setAssets] = useState({
    totalEarnings: '0.0',
    judaBalance: '0.0',
    bnbBalance: '0.000338',
    lpShares: '0.0',
    teamSize: '0',
    directCount: '0',
    level: 'S0',
    isPartner: false,
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

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert('复制成功', '钱包地址已复制到剪贴板');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      '断开钱包',
      '确定要断开钱包连接吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => setWalletAddress(null),
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: walletAddress
          ? `邀请码: ${walletAddress}`
          : '下载 JuDao DAPP，一起赚取收益！',
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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 顶部区域 */}
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold" style={{ color: YELLOW }}>
              个人中心
            </Text>
            <View className="flex-row items-center gap-2">
              <Ionicons name="globe-outline" size={20} color="#555570" />
              <Text className="text-gray-400 text-sm">中文</Text>
            </View>
          </View>
        </View>

        {/* 钱包信息卡片 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: YELLOW }}
                >
                  <Text className="text-2xl font-bold text-black">B</Text>
                </View>
                <View>
                  <Text className="text-white font-semibold text-lg">
                    {walletAddress ? '已连接' : '未连接'}
                  </Text>
                  <TouchableOpacity onPress={handleCopyAddress} disabled={!walletAddress}>
                    <Text className="text-gray-400 text-sm mt-1">
                      {walletAddress || '点击连接钱包'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {walletAddress && (
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,0,60,0.2)' }}
                  onPress={handleDisconnect}
                >
                  <Text className="text-red-400 text-xs">断开</Text>
                </TouchableOpacity>
              )}
            </View>

            {!walletAddress && (
              <TouchableOpacity
                className="mt-4 py-3 rounded-xl items-center"
                style={{ backgroundColor: YELLOW }}
                onPress={() => setWalletAddress('0x1234...5678')}
              >
                <Text className="text-black font-bold">连接钱包</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 用户等级 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-400 text-sm">当前等级</Text>
                <Text className="text-white font-bold text-2xl mt-1">{assets.level}</Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-sm">合伙人状态</Text>
                <View
                  className="mt-1 px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: assets.isPartner ? YELLOW : 'rgba(0,240,255,0.1)',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: assets.isPartner ? '#0A0A0F' : CYAN }}
                  >
                    {assets.isPartner ? '已开通' : '未开通'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 资产统计 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">资产统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                    <Text className="text-xs font-bold text-black">J</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">JUDAO余额</Text>
                </View>
                <Text className="text-white font-bold text-lg">{assets.judaBalance}</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(243,186,47,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: '#F3BA2F' }}>
                    <Text className="text-xs font-bold text-black">B</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">BNB余额</Text>
                </View>
                <Text className="text-white font-bold text-lg">{assets.bnbBalance}</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(191,0,255,0.05)' }}>
                <Text className="text-gray-400 text-xs mb-2">LP份额</Text>
                <Text className="text-white font-bold text-lg">{assets.lpShares}</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,255,136,0.05)' }}>
                <Text className="text-gray-400 text-xs mb-2">团队规模</Text>
                <Text className="text-white font-bold text-lg">{assets.teamSize}</Text>
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
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">收益统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                <Text className="text-gray-400 text-xs mb-2">累计收益</Text>
                <Text className="text-yellow-400 font-bold text-xl">{assets.totalEarnings}</Text>
                <Text className="text-gray-500 text-xs mt-1">JUDAO</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <Text className="text-gray-400 text-xs mb-2">直推人数</Text>
                <Text className="text-cyan-400 font-bold text-xl">{assets.directCount}</Text>
                <Text className="text-gray-500 text-xs mt-1">人</Text>
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
                <Text className="text-white font-medium">我的团队</Text>
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
              onPress={() => Alert.alert('开发中', '该功能正在开发中')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(191,0,255,0.1)' }}>
                  <Ionicons name="swap-horizontal" size={20} color="#BF00FF" />
                </View>
                <Text className="text-white font-medium">兑换记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => Alert.alert('开发中', '该功能正在开发中')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Ionicons name="document-text" size={20} color={YELLOW} />
                </View>
                <Text className="text-white font-medium">交易明细</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555570" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 版本信息 */}
        <View className="px-4 mt-8 pb-8">
          <Text className="text-gray-500 text-xs text-center">JuDao DAPP v1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
