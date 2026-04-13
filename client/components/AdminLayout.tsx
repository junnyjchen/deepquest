import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sidebar from './Sidebar';

// 暗黑科技风配色
const COLORS = {
  bgDark: '#0A0A0F',
  bgSidebar: '#0D0D15',
  bgHeader: '#0D0D15',
  border: '#252535',
  cyan: '#00F0FF',
  textPrimary: '#EAEAEA',
  textMuted: '#6A6A7A',
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useSafeRouter();
  const segments = useSegments();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = Dimensions.get('window').width;
      setIsMobile(width < 768);
    };
    checkMobile();
    const subscription = Dimensions.addEventListener('change', checkMobile);
    return () => subscription?.remove();
  }, []);

  // 获取当前路径
  const currentPath = '/' + (segments.filter(Boolean).join('/') || 'dashboard');

  // 检查是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      const adminStr = await AsyncStorage.getItem('admin');
      if (!adminStr && currentPath !== '/') {
        router.replace('/');
      }
    };
    checkAuth();
  }, [currentPath]);

  // 页面标题映射
  const getPageTitle = () => {
    if (title) return title;
    const pathMap: Record<string, string> = {
      '/dashboard': '仪表盘',
      '/users': '用户管理',
      '/deposits': '充值记录',
      '/partners': '合伙人',
      '/cards': '节点卡牌',
      '/stakes': '质押记录',
      '/node-applications': '节点申请',
      '/pools': '资金池',
      '/config': '配置中心',
      '/logs': '操作日志',
    };
    return pathMap[currentPath] || pathMap[segments[0] || ''] || '管理系统';
  };

  if (isMobile) {
    // 移动端布局
    return (
      <View style={styles.mobileContainer}>
        {/* Mobile Header */}
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMobileMenuOpen(true)}
          >
            <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.mobileTitle}>{getPageTitle()}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Mobile Content */}
        <View style={styles.mobileContent}>
          {children}
        </View>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setMobileMenuOpen(false)}
            activeOpacity={1}
          >
            <View style={styles.mobileMenuContainer}>
              <View style={styles.mobileMenuHeader}>
                <Text style={styles.mobileMenuTitle}>导航菜单</Text>
                <TouchableOpacity
                  onPress={() => setMobileMenuOpen(false)}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Sidebar currentPath={currentPath} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 桌面端布局
  return (
    <View style={styles.desktopContainer}>
      <Sidebar currentPath={currentPath} />
      <View style={styles.contentArea}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{getPageTitle()}</Text>
          <View style={styles.headerRight}>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>在线</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bgDark,
  } as ViewStyle,
  contentArea: {
    flex: 1,
    flexDirection: 'column',
  } as ViewStyle,
  headerBar: {
    height: 56,
    backgroundColor: COLORS.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  } as ViewStyle,
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  } as TextStyle,
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  } as ViewStyle,
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
    marginRight: 6,
  } as ViewStyle,
  statusText: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
  content: {
    flex: 1,
    overflow: 'scroll',
  } as ViewStyle,

  // Mobile
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  } as ViewStyle,
  mobileHeader: {
    height: 56,
    backgroundColor: COLORS.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  } as ViewStyle,
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  mobileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  } as TextStyle,
  mobileContent: {
    flex: 1,
  } as ViewStyle,
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  } as ViewStyle,
  mobileMenuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: COLORS.bgSidebar,
  } as ViewStyle,
  mobileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  } as ViewStyle,
  mobileMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  } as TextStyle,
  closeButton: {
    fontSize: 20,
    color: COLORS.textMuted,
    padding: 8,
  } as TextStyle,
});
