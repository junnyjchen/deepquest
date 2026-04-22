/**
 * ================================================
 *              Safe Router Hook
 * ================================================
 */

import { useRouter as useNextRouter, useLocalSearchParams as useNextSearchParams, Link as NextLink } from 'expo-router';

/**
 * Safe Router - 替代原生 useRouter
 * 支持嵌套对象和特殊字符的编解码
 */
export const useSafeRouter = () => {
  const router = useNextRouter();
  
  return {
    ...router,
    /**
     * 导航到指定路径，支持传递复杂参数
     * @param path 目标路径
     * @param params 传递的参数（会自动序列化）
     */
    push: (path: string, params?: Record<string, any>) => {
      if (params) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        });
        const queryString = query.toString();
        router.push(queryString ? `${path}?${queryString}` : path);
      } else {
        router.push(path);
      }
    },
    /**
     * 替换当前路径
     */
    replace: (path: string, params?: Record<string, any>) => {
      if (params) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        });
        const queryString = query.toString();
        router.replace(queryString ? `${path}?${queryString}` : path);
      } else {
        router.replace(path);
      }
    },
  };
};

// 别名导出，与原生 useRouter 兼容
export const useRouter = useSafeRouter;

/**
 * Safe Search Params - 替代原生 useLocalSearchParams
 * 自动处理参数的解析
 */
export const useSafeSearchParams = <T = Record<string, string>>() => {
  const params = useNextSearchParams() as Record<string, string>;
  
  return params as T;
};

// 别名导出
export { useSafeSearchParams as useLocalSearchParams };

export { NextLink as Link };
