import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 暗黑科技风配色
const COLORS = {
  bgDark: '#0A0A0F',
  bgSidebar: '#0D0D15',
  bgCard: '#12121A',
  bgHover: '#1A1A28',
  bgActive: '#1E1E30',
  border: '#252535',
  cyan: '#00F0FF',
  purple: '#BF00FF',
  yellow: '#FFD23F',
  green: '#00FF88',
  red: '#FF003C',
  textPrimary: '#EAEAEA',
  textMuted: '#6A6A7A',
  textDim: '#454555',
};

// 菜单项配置
const MENU_ITEMS = [
  {
    group: 'MAIN',
    items: [
      { path: '/dashboard', label: '仪表盘', icon: 'grid', iconType: 'Ionicons' as const },
      { path: '/users', label: '用户管理', icon: 'people', iconType: 'Ionicons' as const },
      { path: '/deposits', label: '充值记录', icon: 'arrow-up-circle', iconType: 'Ionicons' as const },
    ],
  },
  {
    group: 'BUSINESS',
    items: [
      { path: '/partners', label: '合伙人', icon: 'ribbon', iconType: 'Ionicons' as const },
      { path: '/cards', label: '节点卡牌', icon: 'card', iconType: 'Ionicons' as const },
      { path: '/stakes', label: '质押记录', icon: 'time', iconType: 'Ionicons' as const },
      { path: '/node-applications', label: '节点申请', icon: 'cloud-upload', iconType: 'Ionicons' as const },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { path: '/pools', label: '资金池', icon: 'wallet', iconType: 'Ionicons' as const },
      { path: '/config', label: '配置中心', icon: 'settings', iconType: 'Ionicons' as const },
      { path: '/logs', label: '操作日志', icon: 'document-text', iconType: 'Ionicons' as const },
    ],
  },
];

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function Sidebar({ currentPath = '/dashboard', onNavigate }: SidebarProps) {
  const router = useSafeRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    return currentPath.startsWith(path) || currentPath.includes(path.split('/')[1] || '');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('admin');
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path as any);
    onNavigate?.(path);
  };

  const iconSize = 20;

  return (
    <View style={styles.sidebar}>
      {/* Logo Area */}
      <View style={styles.logoArea}>
        <LinearGradient
          colors={['#00F0FF', '#BF00FF']}
          style={styles.logoGradient}
        >
          <Text style={styles.logoText}>DQ</Text>
        </LinearGradient>
        <View style={styles.logoTextArea}>
          <Text style={styles.logoTitle}>ADMIN</Text>
          <Text style={styles.logoSubtitle}>管理系统</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((group) => (
          <View key={group.group} style={styles.menuGroup}>
            <Text style={styles.groupLabel}>{group.group}</Text>
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    hoveredItem === item.path && !active && styles.menuItemHover,
                  ]}
                  onPress={() => handleNavigate(item.path)}
                  onPressIn={() => setHoveredItem(item.path)}
                  onPressOut={() => setHoveredItem(null)}
                  activeOpacity={0.7}
                >
                  {active && (
                    <View style={styles.activeIndicator} />
                  )}
                  <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                    <Ionicons
                      name={item.icon as any}
                      size={iconSize}
                      color={active ? COLORS.cyan : COLORS.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuLabel,
                      active && styles.menuLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.divider} />
        
        {/* Logout */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 0, 60, 0.1)' }]}>
            <Ionicons
              name="log-out"
              size={iconSize}
              color={COLORS.red}
            />
          </View>
          <Text style={[styles.menuLabel, { color: COLORS.red }]}>退出登录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: COLORS.bgSidebar,
    height: '100%',
    width: 220,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0A0F',
  },
  logoTextArea: {
    marginLeft: 12,
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDim,
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    position: 'relative',
  },
  menuItemHover: {
    backgroundColor: COLORS.bgHover,
  },
  menuItemActive: {
    backgroundColor: COLORS.bgActive,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: 12,
    flex: 1,
  },
  menuLabelActive: {
    color: COLORS.cyan,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
  },
  bottomActions: {
    paddingBottom: 16,
  },
});
