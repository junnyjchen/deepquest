import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const YELLOW = '#FFD700';
const CYAN = '#00F0FF';
const CARD_BG = '#12121A';
const BORDER_GLOW = 'rgba(0, 240, 255, 0.15)';

export default function DappTeam() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 团队数据
  const [teamData, setTeamData] = useState({
    totalMembers: '0',
    directMembers: '0',
    totalInvestment: '0.0',
    teamPower: '0.0',
    totalRewards: '0.0',
    referrerAddress: null,
  });

  // 团队成员列表（模拟）
  const [members, setMembers] = useState<any[]>([]);

  // 模拟加载数据
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={YELLOW}
            colors={[YELLOW]}
          />
        }
      >
        {/* 顶部区域 */}
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold" style={{ color: YELLOW }}>
              我的团队
            </Text>
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
              className="rounded-2xl p-4 flex-row items-center justify-between"
              style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.2)' }}>
                  <Ionicons name="person" size={20} color={CYAN} />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs">推荐人</Text>
                  <Text className="text-white font-medium text-sm mt-1">
                    {teamData.referrerAddress}
                  </Text>
                </View>
              </View>
              <TouchableOpacity className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Text className="text-cyan-400 text-xs">查看</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 团队统计卡片 */}
        <View className="px-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">团队统计</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="people" size={16} color={CYAN} />
                  <Text className="text-gray-400 text-xs">团队总人数</Text>
                </View>
                <Text className="text-cyan-400 font-bold text-xl">{teamData.totalMembers}</Text>
                <Text className="text-gray-500 text-xs mt-1">人</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,255,136,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="person-add" size={16} color="#00FF88" />
                  <Text className="text-gray-400 text-xs">直推人数</Text>
                </View>
                <Text className="text-green-400 font-bold text-xl">{teamData.directMembers}</Text>
                <Text className="text-gray-500 text-xs mt-1">人</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,215,0,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="wallet" size={16} color={YELLOW} />
                  <Text className="text-gray-400 text-xs">团队总投资</Text>
                </View>
                <Text className="text-yellow-400 font-bold text-xl">{teamData.totalInvestment}</Text>
                <Text className="text-gray-500 text-xs mt-1">BNB</Text>
              </View>

              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(191,0,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="flash" size={16} color="#BF00FF" />
                  <Text className="text-gray-400 text-xs">团队算力</Text>
                </View>
                <Text className="text-purple-400 font-bold text-xl">{teamData.teamPower}</Text>
                <Text className="text-gray-500 text-xs mt-1">T/H</Text>
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
              <Text className="text-white font-bold text-base">团队奖励</Text>
            </View>

            <View className="flex-row items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
              <View>
                <Text className="text-gray-400 text-sm">累计获得</Text>
                <Text className="text-yellow-400 font-bold text-3xl mt-2">{teamData.totalRewards}</Text>
                <Text className="text-gray-500 text-xs mt-1">JUDAO</Text>
              </View>
              <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.2)' }}>
                <Ionicons name="gift" size={32} color={YELLOW} />
              </View>
            </View>
          </View>
        </View>

        {/* 邀请卡片 */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_GLOW }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">邀请链接</Text>
            </View>

            <View className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
              <Text className="text-gray-400 text-xs mb-2">您的邀请码</Text>
              <Text className="text-white font-mono text-lg">0x1234...5678</Text>
            </View>

            <TouchableOpacity
              className="mt-4 py-3 rounded-xl items-center"
              style={{ backgroundColor: YELLOW }}
            >
              <Text className="text-black font-bold">复制邀请链接</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 团队成员列表 */}
        <View className="px-4 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-5 rounded-full" style={{ backgroundColor: YELLOW }} />
              <Text className="text-white font-bold text-base">团队成员</Text>
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
              <Text className="text-gray-500 text-sm mt-2">邀请好友加入，获取更多奖励</Text>
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
                      <Text className="text-gray-500 text-xs mt-1">{member.address}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-yellow-400 font-medium text-sm">{member.investment} BNB</Text>
                    <Text className="text-gray-500 text-xs mt-1">投资额</Text>
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
