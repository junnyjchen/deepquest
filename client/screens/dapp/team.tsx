import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappTeamApi, dappApi } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/utils/toast';
import {
  getBNBBalance,
  getDQTokenBalance,
  getSOLTokenBalance,
  getPendingSOL,
  getLPReward,
  getDLevelReward,
  getUserFromChain,
  getUserDLevel,
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

const WALLET_STORAGE_KEY = '@deepquest_wallet';

export default function DappTeam() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // 团队数据
  const [teamData, setTeamData] = useState({
    totalMembers: 0,
    directMembers: 0,
    teamStaked: '0.0',
    teamRewards: '0.0',
    myRewards: '0.0',
    myDirectRewards: '0.0',
    referrerAddress: null as string | null,
    directCount: 0,
    teamCount: 0,
    teamInvest: '0.0',
    referralRewards: '0.0',
  });

  // 成员列表
  const [members, setMembers] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          // 加载保存的钱包地址
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            // 获取团队数据
            await fetchTeamData(savedWallet);
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

  // 获取团队数据
  const fetchTeamData = async (address: string) => {
    try {
      setTeamLoading(true);
      
      // 并行获取团队统计和推荐信息
      // 通过 getUserFromChain 获取推荐人地址，兼容链上数据和后端数据不一致的情况
      const [statsRes, referralRes, directListRes, chainUserRes] = await Promise.all([
        dappTeamApi.getStats(address),
        dappApi.getReferral(address),
        dappTeamApi.getDirectList(address, 1, 50),
        getUserFromChain(address), // 获取链上用户信息，包含推荐人地址
      ]);

      if (statsRes.code === 0 && statsRes.data) {
        setTeamData({
          totalMembers: statsRes.data.team_count || 0,
          directMembers: statsRes.data.direct_count || 0,
          teamStaked: statsRes.data.team_invest || '0.0',
          teamRewards: '0.0', // 需要从奖励接口获取
          myRewards: statsRes.data.referral_rewards || '0.0',
          myDirectRewards: statsRes.data.referral_rewards || '0.0',
          referrerAddress: chainUserRes ? chainUserRes.referrer : referralRes.data?.referrer || null, // 优先使用链上数据
          directCount: statsRes.data.direct_count || 0,
          teamCount: statsRes.data.team_count || 0,
          teamInvest: statsRes.data.team_invest || '0.0',
          referralRewards: statsRes.data.referral_rewards || '0.0',
        });
      }

      // 获取团队成员列表
      if (directListRes.code === 0 && directListRes.data?.list) {
        setMembers(directListRes.data.list.map((item: any) => ({
          address: item.wallet_address,
          level: item.level || 0,
          depth: item.depth || 0,
          is_activated: item.is_activated || false,
          staked: item.total_invest || '0.0',
          name: `用户 ${item.wallet_address?.slice(2, 6) || 'XXXX'}`,
        })));
      }
    } catch (error) {
      console.error('获取团队数据失败:', error);
    } finally {
      setTeamLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (walletAddress) {
      await fetchTeamData(walletAddress);
    }
    setRefreshing(false);
  }, [walletAddress]);

  const handleCopyInviteCode = async () => {
    if (walletAddress) {
      const inviteCode = walletAddress;
      await Clipboard.setStringAsync(inviteCode);
      showToast.success(t('common.success'), t('team.inviteCodeCopied'));
    } else {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
    }
  };

  // 复制完整邀请链接
  const handleCopyInviteLink = async () => {
    if (walletAddress) {
      // 使用当前域名
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.deepquest.io';
      const inviteLink = `${origin}/invite?ref=${walletAddress}`;
      await Clipboard.setStringAsync(inviteLink);
      showToast.success(t('common.success'), t('team.inviteLinkCopied'));
    } else {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={YELLOW}
            colors={[YELLOW]}
          />
        }
      >
        {/* 团队统计 */}
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
              <Ionicons name="people" size={16} color={CYAN} />
              <Text className="text-sm font-medium" style={{ color: CYAN }}>{teamData.totalMembers} {t('common.peopleUnit')}</Text>
            </View>
          </View>
        </View>

        {/* 推荐人信息 */}
        {teamData.referrerAddress && (
          <View className="px-4 mb-4">
            <View
              className="rounded-xl p-3 flex-row items-center justify-between"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="person" size={14} color={TEXT_MUTED} />
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.referrer')}</Text>
                <Text className="text-xs font-mono" style={{ color: TEXT_WHITE }}>
                  {teamData.referrerAddress?.slice(0, 10)}...{teamData.referrerAddress?.slice(-6)}
                </Text>
              </View>
              <TouchableOpacity className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Text className="text-xs" style={{ color: CYAN }}>{t('common.view')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 团队统计卡片 - 黄色边框 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{t('team.teamStats')}</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.totalMembersLabel')}</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>
                  {teamLoading ? '...' : teamData.teamCount}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>{t('common.peopleUnit')}</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.directMembersLabel')}</Text>
                <Text className="text-xl font-bold" style={{ color: '#00FF88' }}>
                  {teamLoading ? '...' : teamData.directCount}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>{t('common.peopleUnit')}</Text>
              </View>
              <View style={{ display: 'none' }}>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.teamPerformance')}</Text>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>
                  {teamLoading ? '...' : teamData.teamInvest}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>SOL</Text>
              </View>
              <View style={{ display: 'none' }}>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.teamRewards')}</Text>
                <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>
                  {teamLoading ? '...' : teamData.referralRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 我的推广收益卡片 - 黄色边框 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 2, borderColor: YELLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{t('team.myPromotionEarnings')}</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4" style={{ display: 'none' }}>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.directRewards')}</Text>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>
                  {teamLoading ? '...' : teamData.myDirectRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('team.teamRewards')}</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>
                  {teamLoading ? '...' : teamData.myRewards}
                </Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQ</Text>
              </View>
            </View>

            {/* 邀请码 */}
            <View
              className="p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="link" size={14} color={TEXT_MUTED} />
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.myInviteCode')}</Text>
                </View>
                <TouchableOpacity onPress={handleCopyInviteCode}>
                  <Ionicons name="copy" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
              <Text className="text-base font-mono font-semibold" style={{ color: TEXT_WHITE }}>
                {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : t('common.walletNotConnected')}
              </Text>
            </View>

            {/* 复制邀请链接按钮 */}
            <TouchableOpacity
              className="mt-4 py-3 rounded-xl items-center"
              style={{ backgroundColor: YELLOW }}
              onPress={handleCopyInviteLink}
            >
              <Text className="text-sm font-semibold" style={{ color: '#333' }}>{t('team.copyInviteLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 团队成员 */}
        <View className="px-4 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>{t('team.members')}</Text>
            </View>
            <Text className="text-sm" style={{ color: TEXT_MUTED }}>{teamData.teamCount} {t('common.peopleUnit')}</Text>
          </View>

          {teamLoading ? (
            <View className="rounded-2xl p-8 items-center" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
              <ActivityIndicator size="small" color={YELLOW} />
              <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>{t('common.loading')}</Text>
            </View>
          ) : members.length === 0 ? (
            <View
              className="rounded-2xl p-8 items-center"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <Ionicons name="people-outline" size={48} color={TEXT_MUTED} />
              <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>{t('team.noMembers')}</Text>
              <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>{t('team.inviteFriends')}</Text>
              <TouchableOpacity
                className="mt-4 px-6 py-2.5 rounded-xl"
                style={{ backgroundColor: YELLOW }}
                onPress={handleCopyInviteCode}
              >
                <Text className="text-sm font-semibold" style={{ color: '#333' }}>{t('team.inviteNow')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {members.map((member, index) => (
                <View
                  key={index}
                  className="rounded-xl p-4 flex-row items-center justify-between"
                  style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.2)' }}>
                      <Text className="text-sm font-bold" style={{ color: CYAN }}>
                        {member.name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{member.name}</Text>
                      <Text className="text-xs font-mono mt-0.5" style={{ color: TEXT_MUTED }}>
                        {member.address?.slice(0, 8)}...{member.address?.slice(-6)}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-medium" style={{ color: YELLOW }}>{member.staked} SOL</Text>
                    <View className="flex-row items-center mt-0.5 gap-1">
                      <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.lv')}{member.level}</Text>
                      <Text className="text-xs" style={{ color: TEXT_MUTED }}>|</Text>
                      <Text className="text-xs" style={{ color: CYAN }}>{t('team.generationPrefix')}{member.depth}{t('team.generationSuffix')}</Text>
                    </View>
                    <Text 
                      className="text-xs mt-0.5 px-1.5 py-0.5 rounded"
                      style={{ 
                        color: member.is_activated ? '#10B981' : '#EF4444',
                        backgroundColor: member.is_activated ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
                      }}
                    >
                      {member.is_activated ? t('profile.activated') : t('profile.notActivated')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
