/**
 * 格式化工具函数
 */

/**
 * 格式化钱包地址（显示缩写）
 */
export const formatAddress = (address: string, start: number = 6, end: number = 4): string => {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

/**
 * 格式化数字（添加千分位）
 */
export const formatNumber = (num: number | string, decimals: number = 2): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(decimals) + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(decimals) + 'K';
  }
  return n.toFixed(decimals);
};

/**
 * 格式化金额（保留指定小数位）
 */
export const formatAmount = (amount: string | number, decimals: number = 4): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return n.toFixed(decimals);
};

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 格式化时间
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string | Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};
