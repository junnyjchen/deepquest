/**
 * 管理后台路由守卫 Hook
 * 用于在需要登录的页面检查认证状态
 */
import { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { useSafeRouter } from './useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_ROUTES = [
  '/dashboard',
  '/users',
  '/user-detail',
  '/deposits',
  '/withdrawals',
  '/partners',
  '/cards',
  '/stakes',
  '/pools',
  '/config',
  '/logs',
  '/node-applications',
];

/**
 * 检查当前路径是否需要登录
 */
export function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTES.some(route => 
    path === route || path.startsWith(route + '/')
  );
}

/**
 * 管理后台路由守卫
 * 未登录时自动跳转到登录页
 */
export function useAdminAuth() {
  const { admin, isAuthenticated, isLoading } = useAuth();
  const router = useSafeRouter();
  const segments = useSegments();

  const currentPath = '/' + segments.filter(Boolean).join('/');

  useEffect(() => {
    // 等待加载完成
    if (isLoading) return;

    // 如果未登录且当前是管理后台路由，跳转到登录页
    if (!isAuthenticated && isAdminRoute(currentPath)) {
      console.log('[AdminAuth] Not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // 如果已登录且在登录页，自动跳转到仪表盘
    if (isAuthenticated && currentPath === '/login') {
      console.log('[AdminAuth] Already authenticated, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, currentPath]);

  return {
    admin,
    isAuthenticated,
    isLoading,
    currentPath,
    requiresAuth: isAdminRoute(currentPath),
  };
}
