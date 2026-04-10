// API Base URL
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 通用请求方法
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `请求失败: ${response.status}`);
  }

  return response.json();
}

// ============ Dashboard API ============
export const dashboardApi = {
  getStats: () => request<any>('/api/v1/dashboard/stats'),
  getTrend: (days: number = 7) => request<any>(`/api/v1/dashboard/trend?days=${days}`),
};

// ============ Admin API ============
export const adminApi = {
  login: (username: string, password: string) => 
    request<any>('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getList: () => request<any[]>('/api/v1/admin/list'),
  create: (username: string, password: string, role?: string) =>
    request<any>('/api/v1/admin/create', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),
};

// ============ Users API ============
// 区块链DAPP标准：用户数据通过钱包地址标识，无需注册
export const usersApi = {
  // 获取用户列表
  getList: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    level?: number;
    isPartner?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.pageSize) query.append('pageSize', String(params.pageSize));
    if (params.search) query.append('search', params.search);
    if (params.level !== undefined) query.append('level', String(params.level));
    if (params.isPartner !== undefined) query.append('isPartner', String(params.isPartner));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    return request<any>(`/api/v1/users?${query.toString()}`);
  },
  // 获取用户统计
  getStats: () => request<any>('/api/v1/users/stats'),
  // 获取用户详情（通过钱包地址）
  getByAddress: (address: string) => request<any>(`/api/v1/users/${address}`),
  // 获取用户入金记录
  getDeposits: (address: string, page?: number, pageSize?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (pageSize) query.append('pageSize', String(pageSize));
    return request<any>(`/api/v1/users/${address}/deposits?${query.toString()}`);
  },
  // 获取用户奖励记录
  getRewards: (address: string, params?: { page?: number; pageSize?: number; rewardType?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.rewardType) query.append('rewardType', params.rewardType);
    return request<any>(`/api/v1/users/${address}/rewards?${query.toString()}`);
  },
  // 获取用户提现记录
  getWithdrawals: (address: string, page?: number, pageSize?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (pageSize) query.append('pageSize', String(pageSize));
    return request<any>(`/api/v1/users/${address}/withdrawals?${query.toString()}`);
  },
  // 获取用户团队（直接推荐人）
  getTeam: (address: string) => request<any[]>(`/api/v1/users/${address}/team`),
  
  // ============ 区块链DAPP标准：用户同步API ============
  // 从链上同步单个用户
  syncUser: (wallet_address: string) =>
    request<any>('/api/v1/users/sync', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  // 批量同步用户
  batchSyncUsers: (wallet_addresses: string[]) =>
    request<any>('/api/v1/users/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ wallet_addresses }),
    }),
  // 获取用户链上信息
  getChainInfo: (address: string) => request<any>(`/api/v1/users/${address}/chain-info`),
};

// ============ Deposits API ============
export const depositsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/api/v1/deposits?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/deposits/stats'),
};

// ============ Rewards API ============
export const rewardsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    userAddress?: string;
    rewardType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.userAddress) query.append('userAddress', params.userAddress);
    if (params?.rewardType) query.append('rewardType', params.rewardType);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/api/v1/rewards?${query.toString()}`);
  },
};

// ============ Withdrawals API ============
export const withdrawalsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    userAddress?: string;
    status?: string;
    withdrawType?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.userAddress) query.append('userAddress', params.userAddress);
    if (params?.status) query.append('status', params.status);
    if (params?.withdrawType) query.append('withdrawType', params.withdrawType);
    return request<any>(`/api/v1/withdrawals?${query.toString()}`);
  },
};

// ============ Blocks API ============
export const blocksApi = {
  getList: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    return request<any>(`/api/v1/blocks?${query.toString()}`);
  },
};

// ============ Partners API ============
export const partnersApi = {
  getList: (params?: { page?: number; pageSize?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.status) query.append('status', params.status);
    return request<any>(`/api/v1/partners?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/partners/stats'),
  getByAddress: (address: string) => request<any>(`/api/v1/partners/${address}`),
  updateStatus: (address: string, status: string) =>
    request<any>(`/api/v1/partners/${address}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ============ Cards API ============
export const cardsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    cardType?: number;
    ownerAddress?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.cardType !== undefined) query.append('cardType', String(params.cardType));
    if (params?.ownerAddress) query.append('ownerAddress', params.ownerAddress);
    if (params?.status) query.append('status', params.status);
    return request<any>(`/api/v1/cards?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/cards/stats'),
  mint: (cards: Array<{ ownerAddress: string; cardType: number; mintPrice: string }>) =>
    request<any>('/api/v1/cards/mint', {
      method: 'POST',
      body: JSON.stringify({ cards }),
    }),
};

// ============ Pools API ============
export const poolsApi = {
  getAll: () => request<any[]>('/api/v1/pools'),
  getStats: () => request<any>('/api/v1/pools/stats'),
  getByName: (name: string) => request<any>(`/api/v1/pools/${name}`),
  update: (name: string, balanceChange: string) =>
    request<any>(`/api/v1/pools/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ balanceChange }),
    }),
  init: () => request<any>('/api/v1/pools/init', { method: 'POST' }),
};

// ============ DLevel API ============
export const dlevelApi = {
  getList: (params?: { page?: number; pageSize?: number; dLevel?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.dLevel !== undefined) query.append('dLevel', String(params.dLevel));
    return request<any>(`/api/v1/dlevel?${query.toString()}`);
  },
  getSummary: () => request<any>('/api/v1/dlevel/summary'),
  getByAddress: (address: string) => request<any>(`/api/v1/dlevel/user/${address}`),
};

// ============ Config API ============
export const configApi = {
  getAll: () => request<any[]>('/api/v1/config'),
  get: (key: string) => request<any>(`/api/v1/config/${key}`),
  update: (key: string, value: any, description?: string, updatedBy?: string) =>
    request<any>(`/api/v1/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description, updatedBy }),
    }),
  init: () => request<any>('/api/v1/config/init', { method: 'POST' }),
};

// ============ Logs API ============
export const logsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    adminId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.adminId) query.append('adminId', String(params.adminId));
    if (params?.action) query.append('action', params.action);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/api/v1/logs?${query.toString()}`);
  },
};

// ============ Node Applications API ============
export const nodeApplicationsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    apply_type?: string;
    user_address?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.status) query.append('status', params.status);
    if (params?.apply_type) query.append('apply_type', params.apply_type);
    if (params?.user_address) query.append('user_address', params.user_address);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/api/v1/node-applications?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/node-applications/stats'),
  getById: (id: number) => request<any>(`/api/v1/node-applications/${id}`),
  create: (data: {
    user_address: string;
    user_name?: string;
    apply_type: string;
    apply_reason?: string;
    contact_info?: string;
    total_invest?: string;
    team_size?: number;
    attachment_url?: string;
  }) =>
    request<any>('/api/v1/node-applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  review: (id: number, status: 'approved' | 'rejected', reviewerId?: number, reviewerNotes?: string) =>
    request<any>(`/api/v1/node-applications/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, reviewer_id: reviewerId, reviewer_notes: reviewerNotes }),
    }),
};
