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
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappUserApi } from '@/utils/api';

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

export default function DappProfile() {
  const router = useSafeRouter();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // 用户数据
  const [userData, setUserData] = useState({
    stakedAmount: '0.0',
    pendingRewards: '0.0',
    totalRewards: '0.0',
    bnbBalance: '0.0',
    dqtBalance: '0.0',
    teamSize: 0,
    directCount: 0,
    level: 1,
    isActivated: false,
    stakeDays: 0,
    totalInvest: '0.0',
    teamInvest: '0.0',
    totalReward: '0.0',
    referrerAddress: null as string | null,
  });

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          // 加载保存的钱包地址
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            // 获取用户数据
            await fetchUserData(savedWallet);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [])
  );

  // 获取用户数据
  const fetchUserData = async (address: string) => {
    try {
      setUserLoading(true);
      const response = await dappUserApi.getProfile(address);
      if (response.code === 0 && response.data) {
        setUserData({
          stakedAmount: response.data.total_invest || '0.0',
          pendingRewards: response.data.pending_reward || '0.0',
          totalRewards: response.data.total_reward || '0.0',
          bnbBalance: '0.0', // 需要从链上获取
          dqtBalance: '0.0', // 需要从链上获取
          teamSize: response.data.team_count || 0,
          directCount: response.data.direct_count || 0,
          level: response.data.level || 1,
          isActivated: parseFloat(response.data.total_invest || '0') > 0,
          stakeDays: 0, // 需要计算
          totalInvest: response.data.total_invest || '0.0',
          teamInvest: response.data.team_invest || '0.0',
          totalReward: response.data.total_reward || '0.0',
          referrerAddress: response.data.referrer_address || null,
        });
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
    } finally {
      setUserLoading(false);
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
              await fetchUserData(mockWallet);
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

  // 复制地址
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert('复制成功', '钱包地址已复制');
    }
  };

  // 断开钱包连接
  const handleDisconnect = () => {
    Alert.alert('断开钱包', '确定要断开钱包连接吗？', [
      { text: '取消', style: 'cancel' },
      { 
        text: '确定', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
          setWalletAddress(null);
          setUserData({
            stakedAmount: '0.0',
            pendingRewards: '0.0',
            totalRewards: '0.0',
            bnbBalance: '0.0',
            dqtBalance: '0.0',
            teamSize: 0,
            directCount: 0,
            level: 1,
            isActivated: false,
            stakeDays: 0,
            totalInvest: '0.0',
            teamInvest: '0.0',
            totalReward: '0.0',
            referrerAddress: null,
          });
        }
      },
    ]);
  };

  // 分享
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
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <Ionicons name="diamond" size={24} color={CYAN} />
              </View>
              <View>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>DeepQuest</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>Web3 DeFi</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="globe-outline" size={16} color={TEXT_MUTED} />
              <Text className="text-sm" style={{ color: TEXT_MUTED }}>中文</Text>
            </View>
          </View>
        </View>

        {/* 钱包卡片 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: walletAddress ? YELLOW : 'rgba(0,240,255,0.2)' }}
                >
                  {walletAddress ? (
                    <Ionicons name="folder-open" size={24} color="#333" />
                  ) : (
                    <Ionicons name="add" size={24} color={CYAN} />
                  )}
                </View>
                <View>
                  <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                    {walletAddress ? '已连接' : '未连接'}
                  </Text>
                  <TouchableOpacity onPress={handleCopyAddress} disabled={!walletAddress}>
                    <Text className="text-sm mt-1 font-mono" style={{ color: TEXT_MUTED }}>
                      {userLoading ? '加载中...' : (walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : '点击连接钱包')}
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
                  <Text className="text-xs" style={{ color: '#FF003C' }}>断开</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="px-4 py-2 rounded-xl"
                  style={{ backgroundColor: YELLOW }}
                  onPress={handleConnect}
                >
                  <Text className="text-sm font-semibold" style={{ color: '#333' }}>连接</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 账户状态 */}
            <View className="flex-row items-center gap-3 mt-4 pt-3 border-t border-[rgba(48,48,64,0.5)]">
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>账户状态</Text>
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
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>等级</Text>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Lv.{userData.level}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 资产统计卡片 - 黄色边框 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>资产统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>BNB余额</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.bnbBalance}
                </Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>DQT余额</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.dqtBalance}
                </Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>质押数量</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.stakedAmount} BNB
                </Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>质押天数</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.stakeDays} 天
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 收益统计卡片 - 黄色边框 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>收益统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>待领取收益</Text>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>
                  {userLoading ? '...' : userData.pendingRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>累计收益</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>
                  {userLoading ? '...' : userData.totalRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 团队数据卡片 - 黄色边框 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>团队数据</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队规模</Text>
                <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.teamSize}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>人</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>直推人数</Text>
                <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.directCount}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>人</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>个人投资</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.totalInvest}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>BNB</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队业绩</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.teamInvest}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>BNB</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 功能菜单 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
          >
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(48,48,64,0.5)]"
              onPress={() => router.push('/team')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                  <Ionicons name="people" size={20} color={CYAN} />
                </View>
                <View>
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>我的团队</Text>
                  <Text className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{userData.teamSize} 人</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(48,48,64,0.5)]"
              onPress={handleShare}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,255,136,0.1)' }}>
                  <Ionicons name="share-social" size={20} color="#00FF88" />
                </View>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>邀请好友</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-[rgba(48,48,64,0.5)]"
              onPress={() => router.push('/stakes')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                  <Ionicons name="time" size={20} color="#D020FF" />
                </View>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>质押记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => router.push('/rewards')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Ionicons name="receipt" size={20} color={YELLOW} />
                </View>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>收益记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-t border-[rgba(48,48,64,0.5)]"
              onPress={() => router.push('/withdrawals')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                  <Ionicons name="wallet-outline" size={20} color={CYAN} />
                </View>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>提现记录</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-t border-[rgba(48,48,64,0.5)]"
              onPress={() => router.push('/nodes')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                  <Ionicons name="ribbon" size={20} color={PURPLE} />
                </View>
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>节点申请</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 版本信息 */}
        <View className="px-4 mt-8 mb-8">
          <Text className="text-xs text-center" style={{ color: TEXT_MUTED }}>DeepQuest v1.0.0 | BSC Chain</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
