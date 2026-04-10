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

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const PURPLE = '#BF00FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappTeam() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 团队数据
  const [teamData, setTeamData] = useState({
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
  const [members, setMembers] = useState<any[]>([]);

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

  const handleCopyInviteCode = () => {
    Alert.alert('复制成功', '邀请码已复制到剪贴板');
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={YELLOW}
            colors={[YELLOW]}
          />
        }
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
            <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: CARD_BG }}>
              <Ionicons name="people" size={16} color={CYAN} />
              <Text className="text-cyan-400 font-medium text-sm">{teamData.totalMembers} 人</Text>
            </View>
          </View>
        </View>

        {/* 推荐人信息 */}
        {teamData.referrerAddress && (
          <View className="px-4 mb-4">
            <View
              className="rounded-xl p-3 flex-row items-center justify-between"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="person" size={16} color="#555570" />
                <Text className="text-gray-500 text-xs">推荐人</Text>
                <Text className="text-white text-xs font-mono">
                  {teamData.referrerAddress}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 团队统计 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold">团队统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-3">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="people" size={14} color={CYAN} />
                  <Text className="text-gray-400 text-xs">团队总人数</Text>
                </View>
                <Text className="text-cyan-400 font-bold text-xl">{teamData.totalMembers}</Text>
                <Text className="text-gray-500 text-xs mt-1">人</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,255,136,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="person-add" size={14} color="#00FF88" />
                  <Text className="text-gray-400 text-xs">直推人数</Text>
                </View>
                <Text className="text-green-400 font-bold text-xl">{teamData.directMembers}</Text>
                <Text className="text-gray-500 text-xs mt-1">人</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(243,186,47,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="wallet" size={14} color={YELLOW} />
                  <Text className="text-gray-400 text-xs">团队质押</Text>
                </View>
                <Text className="text-yellow-400 font-bold text-xl">{teamData.teamStaked}</Text>
                <Text className="text-gray-500 text-xs mt-1">BNB</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(191,0,255,0.08)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="trophy" size={14} color={PURPLE} />
                  <Text className="text-gray-400 text-xs">团队奖励</Text>
                </View>
                <Text className="text-purple-400 font-bold text-xl">{teamData.teamRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">DQT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 我的收益 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: CYAN }} />
              <Text className="text-white font-bold">我的推广收益</Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,215,0,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">直推奖励</Text>
                <Text className="text-yellow-400 font-bold text-lg">{teamData.myDirectRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">DQT</Text>
              </View>
              <View className="flex-1 p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.08)' }}>
                <Text className="text-gray-400 text-xs mb-2">团队奖励</Text>
                <Text className="text-cyan-400 font-bold text-lg">{teamData.myRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">DQT</Text>
              </View>
            </View>

            <View className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(191,0,255,0.05)' }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="link" size={16} color={PURPLE} />
                  <Text className="text-gray-400 text-sm">我的邀请码</Text>
                </View>
                <TouchableOpacity onPress={handleCopyInviteCode}>
                  <Ionicons name="copy" size={16} color="#555570" />
                </TouchableOpacity>
              </View>
              <Text className="text-white font-mono text-base mt-2">{teamData.inviteCode}</Text>
            </View>

            <TouchableOpacity
              className="mt-4 py-3 rounded-xl items-center"
              style={{ backgroundColor: YELLOW }}
              onPress={handleCopyInviteCode}
            >
              <Text className="text-black font-bold">复制邀请链接</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 团队成员 */}
        <View className="px-4 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold">团队成员</Text>
            </View>
            <Text className="text-gray-400 text-sm">{members.length} 人</Text>
          </View>

          {members.length === 0 ? (
            <View
              className="rounded-2xl p-8 items-center"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
            >
              <Ionicons name="people-outline" size={48} color="#555570" />
              <Text className="text-gray-400 mt-4">暂无团队成员</Text>
              <Text className="text-gray-500 text-sm mt-2">邀请好友加入，获得推广奖励</Text>
              <TouchableOpacity
                className="mt-4 px-6 py-2 rounded-xl"
                style={{ backgroundColor: YELLOW }}
                onPress={handleCopyInviteCode}
              >
                <Text className="text-black font-bold text-sm">立即邀请</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {members.map((member, index) => (
                <View
                  key={index}
                  className="rounded-xl p-4 flex-row items-center justify-between"
                  style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.2)' }}>
                      <Text className="text-cyan-400 font-bold">{member.name?.charAt(0) || 'U'}</Text>
                    </View>
                    <View>
                      <Text className="text-white font-medium">{member.name}</Text>
                      <Text className="text-gray-500 text-xs font-mono mt-1">{member.address}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-yellow-400 font-medium text-sm">{member.staked} BNB</Text>
                    <Text className="text-gray-500 text-xs mt-1">质押额</Text>
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
