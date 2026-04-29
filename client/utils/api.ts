// API Base URL - 使用相对路径让 nginx 代理
// 在测试环境使用 /api/v1/ 相对路径，由 nginx 代理到后端
// 在需要外部访问时，设置为完整 URL 如 https://api.example.com
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '/api/v1';

// 通用请求方法 - 使用 AbortController 处理超时
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 如果 endpoint 已经包含完整路径（以 /api/v1 开头），直接使用
  // 否则拼接 API_BASE
  const url = endpoint.startsWith('/api/v1') 
    ? endpoint 
    : `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
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
// BSC区块链DAPP标准：用户数据通过钱包地址标识，无需注册
// BSC使用以太坊格式地址（0x开头，40位十六进制）
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
  
  // ============ BSC区块链DAPP标准：用户同步API ============
  // 从BSC链上同步单个用户
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
  // 获取用户BSC链上信息
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
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.cardType !== undefined) query.append('cardType', String(params.cardType));
    if (params?.ownerAddress) query.append('ownerAddress', params.ownerAddress);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    return request<any>(`/api/v1/cards?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/cards/stats'),
  mint: (cards: Array<{ ownerAddress: string; cardType: number; mintPrice: string }>) =>
    request<any>('/api/v1/cards/mint', {
      method: 'POST',
      body: JSON.stringify({ cards }),
    }),
};

// ============ Stakes API ============
export const stakesApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    stakeDays?: number;
    isClaimed?: boolean;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.stakeDays !== undefined) query.append('stakeDays', String(params.stakeDays));
    if (params?.isClaimed !== undefined) query.append('isClaimed', String(params.isClaimed));
    if (params?.search) query.append('search', params.search);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    return request<any>(`/api/v1/stakes?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/stakes/stats'),
  getByAddress: (address: string) => request<any[]>(`/api/v1/stakes/user/${address}`),
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

// ============ Restrictions API ============
export const restrictionsApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.status) query.append('status', params.status);
    return request<any>(`/api/v1/restrictions?${query.toString()}`);
  },
  getStats: () => request<any>('/api/v1/restrictions/stats'),
  getByAddress: (address: string) => request<any>(`/api/v1/restrictions/${address}`),
  add: (address: string, reason?: string) =>
    request<any>('/api/v1/restrictions', {
      method: 'POST',
      body: JSON.stringify({ address, reason }),
    }),
  remove: (address: string) =>
    request<any>(`/api/v1/restrictions/${address}`, {
      method: 'DELETE',
    }),
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

// ============ DAPP API (用户端) ============
export const dappApi = {
  // 获取平台统计数据
  getStats: () => request<any>('/api/v1/dapp/stats'),
  
  // ===== 注册与入金 =====
  // 检查钱包注册状态
  checkRegistered: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/check-registered/${wallet_address}`),
  
  // 用户注册（推荐人必须是节点）
  register: (wallet_address: string, referrer_address: string, tx_hash: string) =>
    request<any>('/api/v1/dapp/register', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, referrer_address, tx_hash }),
    }),
  
  // 入金
  deposit: (wallet_address: string, amount: string, tx_hash: string) =>
    request<any>('/api/v1/dapp/deposit', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, amount, tx_hash }),
    }),
  
  // 获取入金限制信息
  getInvestLimit: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/invest-limit/${wallet_address}`),
  
  // ===== 质押操作 =====
  stake: (wallet_address: string, amount: string, tx_hash: string) =>
    request<any>('/api/v1/dapp/stake', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, amount, tx_hash }),
    }),
  
  // ===== 领取奖励 =====
  claimReward: (wallet_address: string, reward_type?: string) =>
    request<any>('/api/v1/dapp/claim-reward', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, reward_type }),
    }),
  
  // 领取LP分红
  claimLP: (wallet_address: string) =>
    request<any>('/api/v1/dapp/claim-lp', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  
  // 领取NFT分红
  claimNFT: (wallet_address: string) =>
    request<any>('/api/v1/dapp/claim-nft', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  
  // 领取团队奖励
  claimDTeam: (wallet_address: string) =>
    request<any>('/api/v1/dapp/claim-dteam', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  
  // 领取合伙人DQ
  claimPartnerDQ: (wallet_address: string) =>
    request<any>('/api/v1/dapp/claim-partner-dq', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  
  // 领取合伙人SOL
  claimPartnerSOL: (wallet_address: string) =>
    request<any>('/api/v1/dapp/claim-partner-sol', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
  
  // ===== 推广相关 =====
  // 获取推广信息
  getReferral: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/referral/${wallet_address}`),
  
  // 绑定推荐人
  bindReferrer: (wallet_address: string, referrer_address: string, tx_hash?: string) =>
    request<any>('/api/v1/dapp/bind-referrer', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, referrer_address, tx_hash }),
    }),
  
  // 验证推荐人地址（必须是节点）
  validateReferrer: (referrer_address: string) =>
    request<any>(`/api/v1/dapp/validate-referrer/${referrer_address}`),
  
  // 检查绑定状态
  checkBinding: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/check-binding/${wallet_address}`),
  
  // ===== NFT卡牌相关 =====
  // 获取卡牌配置
  getCardConfig: () => request<any>('/api/v1/dapp/card-config'),
  
  // 购买NFT卡牌
  buyCard: (wallet_address: string, card_type: string, tx_hash: string) =>
    request<any>('/api/v1/dapp/buy-card', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, card_type, tx_hash }),
    }),
  
  // 获取我的NFT卡牌
  getMyCards: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/my-cards/${wallet_address}`),
  
  // 获取卡牌达标信息
  getNodeInfo: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/node-info/${wallet_address}`),
  
  // 获取卡牌收益记录
  getCardRewards: (wallet_address: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    return request<any>(`/api/v1/dapp/card-rewards/${wallet_address}?${query.toString()}`);
  },
  
  // 获取卡牌统计
  getCardStats: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/card-stats/${wallet_address}`),
  
  // ===== DQ代币交换 =====
  // 获取兑换报价
  getSwapQuote: (dq_amount: string) =>
    request<any>(`/api/v1/dapp/swap-quote?dq_amount=${dq_amount}`),
  
  // 执行兑换
  swapDQ: (wallet_address: string, dq_amount: string, tx_hash: string) =>
    request<any>('/api/v1/dapp/swap-dq', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, dq_amount, tx_hash }),
    }),
  
  // ===== 用户信息 =====
  // 获取用户完整信息
  getUserInfo: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/user-info/${wallet_address}`),
  
  // 获取待领取奖励
  getPendingRewards: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/pending-rewards/${wallet_address}`),
};

// ============ DAPP User API (用户端) ============
export const dappUserApi = {
  // 获取用户资料
  getProfile: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/user/profile/${wallet_address}`),
  
  // 获取质押记录
  getStakes: (wallet_address: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    return request<any>(`/api/v1/dapp/user/stakes/${wallet_address}?${query.toString()}`);
  },
  
  // 获取奖励记录
  getRewards: (wallet_address: string, params?: { page?: number; limit?: number; reward_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.reward_type) query.append('reward_type', params.reward_type);
    return request<any>(`/api/v1/dapp/user/rewards/${wallet_address}?${query.toString()}`);
  },
  
  // 获取提现记录
  getWithdrawals: (wallet_address: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    return request<any>(`/api/v1/dapp/user/withdrawals/${wallet_address}?${query.toString()}`);
  },
  
  // 领取奖励
  claimReward: (wallet_address: string, reward_type?: string) =>
    request<any>('/api/v1/dapp/claim-reward', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, reward_type }),
    }),
  
  // 更新用户信息
  updateProfile: (wallet_address: string, data: { nickname?: string; avatar_url?: string }) =>
    request<any>(`/api/v1/dapp/user/profile/${wallet_address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 提现申请
  withdraw: (wallet_address: string, amount: string, tx_hash?: string) =>
    request<any>('/api/v1/dapp/user/withdraw', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, amount, tx_hash }),
    }),
};

// ============ DAPP Team API (用户端) ============
export const dappTeamApi = {
  // 获取团队统计数据
  getStats: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/team/stats/${wallet_address}`),
  
  // 获取直接推荐列表
  getDirectList: (wallet_address: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    return request<any>(`/api/v1/dapp/team/direct/${wallet_address}?${query.toString()}`);
  },
  
  // 获取团队排行榜
  getRanking: (wallet_address: string, type?: string, limit?: number) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    if (limit) query.append('limit', String(limit));
    return request<any>(`/api/v1/dapp/team/ranking/${wallet_address}?${query.toString()}`);
  },
  
  // 获取下线详情
  getDownline: (wallet_address: string, downline_address: string) =>
    request<any>(`/api/v1/dapp/team/downline/${wallet_address}/${downline_address}`),
  
  // 获取团队业绩趋势
  getTrend: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/team/trend/${wallet_address}`),
};

// ============ DAPP Node API (用户端) ============
export const dappNodeApi = {
  // 获取节点申请统计
  getStats: () =>
    request<any>('/api/v1/dapp/node/stats'),
  
  // 获取我的节点申请记录
  getMyApplication: (wallet_address: string) =>
    request<any>(`/api/v1/dapp/node/my-application/${wallet_address}`),
  
  // 提交节点申请
  apply: (wallet_address: string, data: { apply_type: string; stake_amount: string }) =>
    request<any>('/api/v1/dapp/node/apply', {
      method: 'POST',
      body: JSON.stringify({ wallet_address, ...data }),
    }),
  
  // 获取节点等级说明
  getLevels: () =>
    request<any>('/api/v1/dapp/node/levels'),
};
