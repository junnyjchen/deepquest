import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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

const menuItems = [
  { icon: 'person', color: YELLOW, key: 'profile', path: '/profile', titleKey: 'profile.title', descKey: 'profile.myAssets' },
  { icon: 'people', color: CYAN, key: 'team', path: '/team', titleKey: 'team.title', descKey: 'team.teamRewards' },
  { icon: 'wallet', color: PURPLE, key: 'rewards', path: '/rewards', titleKey: 'rewards.title', descKey: 'rewards.claimable' },
  { icon: 'diamond', color: YELLOW, key: 'stakes', path: '/stakes', titleKey: 'stakes.title', descKey: 'stakes.myStakes' },
  { icon: 'cash', color: CYAN, key: 'withdrawals', path: '/withdrawals', titleKey: 'withdrawals.title', descKey: 'withdrawals.record' },
  { icon: 'share-social', color: PURPLE, key: 'invite', path: '/invite', titleKey: 'invite.title', descKey: 'invite.inviteFriends' },
  { icon: 'extension-puzzle', color: YELLOW, key: 'nodes', path: '/nodes', titleKey: 'nodes.title', descKey: 'nodes.earnByNodes' },
  { icon: 'color-filter', color: CYAN, key: 'nodes-new', path: '/nodes-new', titleKey: 'nodesNew.title', descKey: 'nodesNew.nodeCenter' },
];

export const QuickMenu: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* 菜单按钮 - 收起状态显示 */}
      {!isOpen && (
        <TouchableOpacity
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          onPress={toggleMenu}
        >
          <Ionicons name="menu" size={22} color={TEXT_WHITE} />
        </TouchableOpacity>
      )}

      {/* 菜单内容 - 展开状态 */}
      {isOpen && (
        <View className="flex-1 flex-row items-center gap-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            onPress={toggleMenu}
          >
            <Ionicons name="close" size={22} color={TEXT_WHITE} />
          </TouchableOpacity>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle="items-center gap-2"
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                className="flex-row items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                onPress={() => handleNavigate(item.path)}
              >
                <Ionicons name={item.icon as any} size={16} color={item.color} />
                <Text className="text-xs text-white font-medium">{t(item.titleKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}
