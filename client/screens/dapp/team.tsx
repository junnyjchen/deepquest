import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

// 精确匹配参考图的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';

export default function DappTeam() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 团队数据
  const [teamData] = useState({
    totalMembers: '0',
    directMembers: '0',
    teamStaked: '0.0',
    teamRewards: '0.0',
    myRewards: '0.0',
    myDirectRewards: '0.0',
    referrerAddress: null,
    inviteCode: '0x0000...0000',
  });

  // 成员列表
  const [members] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCopyInviteCode = async () => {
    await Clipboard.setStringAsync(teamData.inviteCode);
    Alert.alert('复制成功', '邀请码已复制到剪贴板');
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={YELLOW}
            colors={[YELLOW]}
          />
        }
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
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
              <Ionicons name="people" size={16} color={CYAN} />
              <Text className="text-sm font-medium" style={{ color: CYAN }}>{teamData.totalMembers} 人</Text>
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
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>推荐人</Text>
                <Text className="text-xs font-mono" style={{ color: TEXT_WHITE }}>
                  {teamData.referrerAddress}
                </Text>
              </View>
              <TouchableOpacity className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Text className="text-xs" style={{ color: CYAN }}>查看</Text>
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
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>团队统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队总人数</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>{teamData.totalMembers}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>人</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>直推人数</Text>
                <Text className="text-xl font-bold" style={{ color: '#00FF88' }}>{teamData.directMembers}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>人</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队质押</Text>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>{teamData.teamStaked}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>BNB</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队奖励</Text>
                <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>{teamData.teamRewards}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
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
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>我的推广收益</Text>
            </View>

            <View className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>直推奖励</Text>
                <Text className="text-xl font-bold" style={{ color: YELLOW }}>{teamData.myDirectRewards}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
              </View>
              <View>
                <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>团队奖励</Text>
                <Text className="text-xl font-bold" style={{ color: CYAN }}>{teamData.myRewards}</Text>
                <Text className="text-xs mt-1" style={{ color: TEXT_MUTED }}>DQT</Text>
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
                  <Text className="text-xs" style={{ color: TEXT_MUTED }}>我的邀请码</Text>
                </View>
                <TouchableOpacity onPress={handleCopyInviteCode}>
                  <Ionicons name="copy" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
              <Text className="text-base font-mono font-semibold" style={{ color: TEXT_WHITE }}>
                {teamData.inviteCode}
              </Text>
            </View>

            {/* 复制邀请链接按钮 */}
            <TouchableOpacity
              className="mt-4 py-3 rounded-xl items-center"
              style={{ backgroundColor: YELLOW }}
              onPress={handleCopyInviteCode}
            >
              <Text className="text-sm font-semibold" style={{ color: '#333' }}>复制邀请链接</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 团队成员 */}
        <View className="px-4 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-base font-bold" style={{ color: TEXT_WHITE }}>团队成员</Text>
            </View>
            <Text className="text-sm" style={{ color: TEXT_MUTED }}>{members.length} 人</Text>
          </View>

          {members.length === 0 ? (
            <View
              className="rounded-2xl p-8 items-center"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <Ionicons name="people-outline" size={48} color={TEXT_MUTED} />
              <Text className="text-base mt-4" style={{ color: TEXT_MUTED }}>暂无团队成员</Text>
              <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>邀请好友加入，获得推广奖励</Text>
              <TouchableOpacity
                className="mt-4 px-6 py-2.5 rounded-xl"
                style={{ backgroundColor: YELLOW }}
                onPress={handleCopyInviteCode}
              >
                <Text className="text-sm font-semibold" style={{ color: '#333' }}>立即邀请</Text>
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
                      <Text className="text-xs font-mono mt-0.5" style={{ color: TEXT_MUTED }}>{member.address}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-medium" style={{ color: YELLOW }}>{member.staked} BNB</Text>
                    <Text className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>质押额</Text>
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
