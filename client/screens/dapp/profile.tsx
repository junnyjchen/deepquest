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
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useLanguage } from '@/contexts/LanguageContext';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappUserApi } from '@/utils/api';
import { showToast } from '@/utils/toast';
import {
  getBNBBalance,
  getDQTokenBalance,
  getSOLTokenBalance,
  getPendingSOL,
  getLPReward,
  getDLevelReward,
  getUserFromChain,
} from '@/utils/web3';

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
const ACTIVATION_STORAGE_KEY = '@deepquest_activation';

// 加载本地激活状态
const loadLocalActivation = async (address: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(ACTIVATION_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.address?.toLowerCase() === address?.toLowerCase() && parsed.activated === true;
    }
  } catch (error) {
    console.error('加载本地激活状态失败:', error);
  }
  return false;
};

export default function DappProfile() {
  const router = useSafeRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [chainLoading, setChainLoading] = useState(false);

  // 用户数据
  const [userData, setUserData] = useState({
    stakedAmount: '0.0',
    pendingRewards: '0.0',
    totalRewards: '0.0',
    bnbBalance: '0.0',
    dqtBalance: '0.0',
    teamSize: 0,
    directCount: 0,
    level: 'S0',
    isActivated: false,
    stakeDays: 0,
    totalInvest: '0.0',
    teamInvest: '0.0',
    totalReward: '0.0',
    referrerAddress: null as string | null,
    dLevel: 'D0',
  });

  const fetchChainData = useCallback(async (address: string) => {
    // 链上数据属于“实时态”，允许失败：失败时只返回局部字段，不影响后端数据展示。
    try {
      setChainLoading(true);

      const [chainUser] =
        await Promise.all([
          // getDQTokenBalance(address),
          // getSOLTokenBalance(address),
          // getLPReward(address),
          getUserFromChain(address),
        ]);
      console.log(chainUser);
      // 合并：链上字段优先覆盖（实时）
      setUserData(prev => {
        const next = { ...prev };
        next.level = 'S' + (chainUser?.level ?? prev.level);
        next.dLevel = 'D' + (chainUser?.dLevel ?? prev.dLevel);

        // 这里 UI 文案写的是“SOL余额/质押SOL/…”，但链上实际：
        // - bnbBalance: BNB 原生余额
        // - solTokenBalance: SOL(ERC20) 余额（当前 UI 还没有字段承载，这里先用 stakeDays 之外的字段不动）
        // 如需展示 SOL Token 余额，建议新增 userData.solBalance 字段。

      // 待领取收益：这里先把定义为「LP 待领取 DQ + D 等级待领取 DQ」
        // const pendingDQ = (parseFloat(lp.pendingReward || '0')).toString();
        // next.pendingRewards = pendingDQ;

      // 同步链上 getUser 返回的 pendingSOL（动态奖励待提现余额）。
      // 说明：pendingSOL 在链上既可以通过 getUser 返回，也可以通过 getPendingSOL 单独读。
      // 我们优先使用 getUser 返回值；如果没取到，则 fallback 到单独查询结果。
      const pendingSolOnChain = chainUser?.pendingSOL;
      void pendingSolOnChain;

        // stakedAmount：优先用链上 totalInvest（如果能取到）
        if (chainUser?.totalInvest) {
          next.stakedAmount = chainUser.totalInvest;
          next.totalInvest = chainUser.totalInvest;
        }

        // 推荐人地址：链上优先
        if (chainUser?.referrer && chainUser.referrer !== '0x0000000000000000000000000000000000000000') {
          next.referrerAddress = chainUser.referrer;
        }

        // 直推人数/等级：链上可作为更可信来源
        if (typeof chainUser?.directCount === 'number') next.directCount = chainUser.directCount;

  // validAddressCount：线下“有入金地址数量”（合约字段）
  // 你如果希望前端把它显示成 teamSize（更贴近合约口径），可以打开下面这行。
  // if (typeof chainUser?.validAddressCount === 'number') next.teamSize = chainUser.validAddressCount;

        // 激活状态：链上存在投资即可视为激活
        const activatedOnChain =
          (chainUser?.totalInvest && parseFloat(chainUser.totalInvest) > 0) ||
          false;
        next.isActivated = prev.isActivated || activatedOnChain;

  // 备注：solTokenBalance、pendingSol 当前没有直接展示在 UI；如果你希望展示，可扩展 userData 结构。
        // void solTokenBalance;
        return next;
      });
    } catch (error) {
      console.error('[Profile] 获取链上数据失败:', error);
    } finally {
      setChainLoading(false);
    }
  }, []);

  // 获取用户数据
  const fetchUserData = useCallback(async (address: string) => {
    try {
      setUserLoading(true);
      
      // 优先使用本地激活状态
      const localActivated = await loadLocalActivation(address);
      console.log('[Profile] address:', address);
      console.log('[Profile] localActivated:', localActivated);
      
      const response = await dappUserApi.getProfile(address);
      console.log('[Profile] response:', JSON.stringify(response));
      
      const isActivated = localActivated || response?.data?.is_activated || parseFloat(response?.data?.total_invest || '0') > 0;
      console.log('[Profile] final isActivated:', isActivated);

      // 从链上补充实时信息（不阻塞后端接口渲染）
      // 注意：这里不 await，避免接口慢导致 UI 卡顿；链上数据会通过 fetchChainData 合并进来。
      fetchChainData(address);
      
      if (response.code === 0 && response.data) {
        setUserData({
          stakedAmount: response.data.total_invest || '0.0',
          pendingRewards: response.data.pending_reward || '0.0',
          totalRewards: response.data.total_reward || '0.0',
          bnbBalance: '0.0', // 需要从链上获取
          dqtBalance: '0.0', // 需要从链上获取
          teamSize: response.data.team_count || 0,
          directCount: response.data.direct_count || 0,
          level: 'S' + (response.data.level || 1),
          dLevel: 'D' + (response.data.d_level || 0),
          isActivated: isActivated, // 优先使用本地激活状态
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
  }, [fetchChainData]);

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
            // 同步拉取链上实时数据
            // await fetchChainData(savedWallet);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [fetchUserData])
  );

  // 聚焦页面后，定时刷新链上数据（轻量，避免频繁打 RPC）
  // useFocusEffect(
  //   useCallback(() => {
  //     if (!walletAddress) return;

  //     // let timer: ReturnType<typeof setInterval> | null = null;

  //     // 先触发一次
  //     fetchChainData(walletAddress);

  //     // 每 20 秒刷新一次（可按需调整）
  //     // timer = setInterval(() => {
  //     //   fetchChainData(walletAddress);
  //     // }, 20_000);

  //     // return () => {
  //     //   if (timer) clearInterval(timer);
  //     // };
  //   }, [walletAddress, fetchChainData])
  // );

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
              showToast.success('成功', `钱包已连接: ${mockWallet.slice(0, 10)}...`);
            }
          },
        ]
      );
    } catch (error) {
      console.error('连接钱包失败:', error);
      showToast.error('错误', '钱包连接失败');
    }
  };

  // 复制地址
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      showToast.success('复制成功', '钱包地址已复制');
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

  // 分享邀请链接
  const handleShare = async () => {
    try {
      // 使用当前域名
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.deepquest.io';
      if (walletAddress) {
        // 生成邀请链接
        const inviteLink = `${origin}/invite?ref=${walletAddress}`;
        await Share.share({
          title: 'Join DeepQuest',
          message: `加入DeepQuest，质押DQ获取被动收益！\n我的邀请链接: ${inviteLink}`,
          url: inviteLink,
        });
      } else {
        await Share.share({
          title: 'Join DeepQuest',
          message: '下载DeepQuest Web3 DeFi量化平台，开启您的DeFi之旅！',
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // 复制邀请链接
  const handleCopyInviteLink = async () => {
    if (walletAddress) {
      // 使用当前域名
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.deepquest.io';
      const inviteLink = `${origin}/invite?ref=${walletAddress}`;
      await Clipboard.setStringAsync(inviteLink);
      showToast.success('复制成功', '邀请链接已复制到剪贴板');
    } else {
      showToast.info('提示', '请先连接钱包');
    }
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: BG_DARK }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <LogoHeader />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BG_DARK }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 顶部导航 */}
        <View className="px-4 pt-3 pb-3 flex-row items-center justify-end">
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
                      {(userLoading || chainLoading) ? '加载中...' : (walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : '点击连接钱包')}
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
                  <Text className="text-xs" style={{ color: '#FF003C' }}>{t('home.disconnect')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="px-4 py-2 rounded-xl"
                  style={{ backgroundColor: YELLOW }}
                  onPress={handleConnect}
                >
                  <Text className="text-sm font-semibold" style={{ color: '#333' }}>{t('home.connectWallet')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 账户状态 */}
            <View className="flex-row items-center gap-3 mt-4 pt-3 border-t border-[rgba(48,48,64,0.5)]">
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('profile.accountStatus') || '账户状态'}</Text>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: userData.isActivated ? 'rgba(0,255,136,0.15)' : 'rgba(255,215,0,0.15)' }}
                >
                  <Text className="text-xs font-medium" style={{ color: userData.isActivated ? '#00FF88' : YELLOW }}>
                    {userData.isActivated ? (t('profile.activated') || '已激活') : (t('profile.notActivated') || '未激活')}
                  </Text>
                </View>
              </View>
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.level')}</Text>
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
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>SOL余额</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.bnbBalance}
                </Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>DQ余额</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.dqtBalance}
                </Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>质押数量</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.stakedAmount} SOL
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
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>累计收益</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>
                  {userLoading ? '...' : userData.totalRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
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
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>SOL</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队业绩</Text>
                <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>
                  {userLoading ? '...' : userData.teamInvest}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>SOL</Text>
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
                <View>
                  <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>邀请好友</Text>
                  <Text className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>分享邀请链接获得奖励</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  style={{ padding: 8 }}
                  onPress={handleCopyInviteLink}
                >
                  <Ionicons name="copy-outline" size={18} color={CYAN} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </View>
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
