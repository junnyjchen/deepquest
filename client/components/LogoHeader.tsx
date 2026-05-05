import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

// 颜色常量
const YELLOW = '#FFD23F';
const BORDER_GRAY = 'rgba(255,255,255,0.1)';
const BG_CARD = '#1a1a2e';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.6)';

interface LogoHeaderProps {
  showMenuButton?: boolean;
  menuExpanded?: boolean;
  onMenuPress?: () => void;
  rightContent?: React.ReactNode;
}

export function LogoHeader({
  showMenuButton = false,
  menuExpanded = false,
  onMenuPress,
  rightContent,
}: LogoHeaderProps) {
  const { t } = useLanguage();
  
  return (
    <View className="px-4 pt-3 pb-2">
      <View className="flex-row items-center justify-between mb-3">
        {/* Logo 区域 */}
        <TouchableOpacity 
          className="flex-row items-center gap-2"
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: YELLOW }}>
            <Text className="text-lg font-bold text-black">DQ</Text>
          </View>
          <Text className="text-lg font-bold" style={{ color: TEXT_WHITE }}>DeepQuest</Text>
        </TouchableOpacity>

        {/* 右侧区域 */}
        <View className="flex-row items-center gap-2">
          {rightContent}
          {showMenuButton && (
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              onPress={onMenuPress}
            >
              <Ionicons 
                name={menuExpanded ? "close" : "menu"} 
                size={24} 
                color={TEXT_WHITE} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 菜单展开区域 */}
      {showMenuButton && menuExpanded && (
        <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: BG_CARD }}>
          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(191,0,255,0.1)' }}>
              <Ionicons name="home" size={20} color="#BF00FF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t.home}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t.homePage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/team'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
              <Ionicons name="people" size={20} color="#00F0FF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t.team}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t.teamInfo}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/rewards'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(32,200,80,0.1)' }}>
              <Ionicons name="gift" size={20} color="#20C850" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t.rewards}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t.claimRewards}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/withdrawals'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,100,50,0.1)' }}>
              <Ionicons name="wallet" size={20} color="#FF6432" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t.withdraw}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t.records}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4"
            onPress={() => { router.push('/nodes'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,200,0,0.1)' }}>
              <Ionicons name="diamond" size={20} color="#FFC800" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t.nodes}</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t.myNodes}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
