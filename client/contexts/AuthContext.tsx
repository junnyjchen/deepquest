/**
 * 管理后台认证上下文
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '@/utils/api';

const ADMIN_STORAGE_KEY = 'admin_auth';

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const adminStr = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
      if (adminStr) {
        const adminData = JSON.parse(adminStr);
        setAdmin(adminData);
      }
    } catch (error) {
      console.error('[AuthContext] Check auth failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const result = await adminApi.login(username, password);
    // 保存管理员信息
    const adminData: AdminUser = {
      id: result.id || 1,
      username: result.username || username,
      role: result.role || 'admin',
    };
    await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdmin(null);
  };

  const value: AuthContextType = {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
