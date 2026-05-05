import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

// 颜色常量
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const BORDER_GRAY = 'rgba(255,255,255,0.1)';
const BG_CARD_TRANS = 'rgba(255,255,255,0.05)';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.5)';

interface QuickMenuProps {
  onClose?: () => void;
}

export const QuickMenu: React.FC<QuickMenuProps> = ({ onClose }) => {
  const { t } = useLanguage();

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose?.();
  };

  return (
    <View className="px-4 pb-3">
      <View 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
      >
        <TouchableOpacity
          className="flex-row items-center gap-3 p-4 border-b"
          style={{ borderColor: BORDER_GRAY }}
          onPress={() => handleNavigate('/profile')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
            <Ionicons name="person" size={20} color={YELLOW} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.title')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('profile.myAssets')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-3 p-4 border-b"
          style={{ borderColor: BORDER_GRAY }}
          onPress={() => handleNavigate('/team')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
            <Ionicons name="people" size={20} color={CYAN} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('team.title')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.teamRewards')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-3 p-4 border-b"
          style={{ borderColor: BORDER_GRAY }}
          onPress={() => handleNavigate('/stakes')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
            <Ionicons name="time" size={20} color={PURPLE} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.stakes')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('stakes.title')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-3 p-4 border-b"
          style={{ borderColor: BORDER_GRAY }}
          onPress={() => handleNavigate('/rewards')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
            <Ionicons name="gift" size={20} color={YELLOW} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.rewards')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('rewards.title')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-3 p-4 border-b"
          style={{ borderColor: BORDER_GRAY }}
          onPress={() => handleNavigate('/withdrawals')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
            <Ionicons name="wallet-outline" size={20} color={CYAN} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.withdrawals')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('withdrawals.title')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-3 p-4"
          onPress={() => handleNavigate('/nodes')}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
            <Ionicons name="ribbon" size={20} color={PURPLE} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.nodes')}</Text>
            <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('nodes.subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
