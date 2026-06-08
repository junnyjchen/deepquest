/**
 * 链上同步状态持久化管理
 * 使用 JSON 文件存储增量同步的索引和其他状态
 * 确保服务重启后同步进度不会丢失
 */

import fs from 'fs';
import path from 'path';

// 状态文件路径（存储在项目根目录的 .sync-state 文件）
const STATE_FILE = path.join(process.cwd(), '.sync-state.json');
const STAKE_STATE_FILE = path.join(process.cwd(), '.stake-sync-state.json');
const REWARD_STATE_FILE = path.join(process.cwd(), '.reward-sync-state.json');

/**
 * 同步状态接口
 */
interface SyncState {
  lastSyncedIndex: number;         // 上次同步到的最后用户索引
  lastSyncTime: string | null;     // 上次同步时间
  lastError: string | null;        // 上次同步错误
  totalSyncedCount: number;        // 累计同步用户总数
  version: number;                 // 状态版本（用于兼容性）
}

export interface StakePositionSnapshot {
  userAddress: string;
  stakeDays: number;
  amount: string;
  startTime: string;
  endTime: string | null;
  lastEventName: 'Staked' | 'Unstaked';
  lastTxHash: string;
  lastBlockNumber: number;
  updatedAt: string;
}

export interface StakeSyncState {
  lastProcessedBlock: number;
  lastSyncTime: string | null;
  lastError: string | null;
  recentEventIds: string[];
  positions: Record<string, StakePositionSnapshot>;
  version: number;
}

export interface RewardSyncState {
  lastProcessedBlock: number;
  lastSyncTime: string | null;
  lastError: string | null;
  recentEventIds: string[];
  version: number;
}

/**
 * 默认状态
 */
const defaultState: SyncState = {
  lastSyncedIndex: 0,
  lastSyncTime: null,
  lastError: null,
  totalSyncedCount: 0,
  version: 1,
};

const defaultStakeState: StakeSyncState = {
  lastProcessedBlock: 0,
  lastSyncTime: null,
  lastError: null,
  recentEventIds: [],
  positions: {},
  version: 1,
};

const defaultRewardState: RewardSyncState = {
  lastProcessedBlock: 0,
  lastSyncTime: null,
  lastError: null,
  recentEventIds: [],
  version: 1,
};

/**
 * 从文件加载同步状态
 * 如果文件不存在，返回默认状态
 */
export function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const state = JSON.parse(content) as SyncState;
      console.log('[SyncState] 加载同步状态:', state);
      return state;
    }
  } catch (error) {
    console.error('[SyncState] 加载状态文件失败:', error);
  }
  
  console.log('[SyncState] 使用默认状态');
  return { ...defaultState };
}

export function loadStakeSyncState(): StakeSyncState {
  try {
    if (fs.existsSync(STAKE_STATE_FILE)) {
      const content = fs.readFileSync(STAKE_STATE_FILE, 'utf-8');
      const state = JSON.parse(content) as Partial<StakeSyncState>;
      return {
        ...defaultStakeState,
        ...state,
        recentEventIds: Array.isArray(state.recentEventIds) ? state.recentEventIds : [],
        positions: state.positions && typeof state.positions === 'object' ? state.positions : {},
      };
    }
  } catch (error) {
    console.error('[SyncState] 加载质押同步状态文件失败:', error);
  }

  return { ...defaultStakeState };
}

export function loadRewardSyncState(): RewardSyncState {
  try {
    if (fs.existsSync(REWARD_STATE_FILE)) {
      const content = fs.readFileSync(REWARD_STATE_FILE, 'utf-8');
      const state = JSON.parse(content) as Partial<RewardSyncState>;
      return {
        ...defaultRewardState,
        ...state,
        recentEventIds: Array.isArray(state.recentEventIds) ? state.recentEventIds : [],
      };
    }
  } catch (error) {
    console.error('[SyncState] 加载奖励同步状态文件失败:', error);
  }

  return { ...defaultRewardState };
}

/**
 * 保存同步状态到文件
 */
export function saveSyncState(state: SyncState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('[SyncState] 同步状态已保存');
  } catch (error) {
    console.error('[SyncState] 保存状态文件失败:', error);
  }
}

export function saveStakeSyncState(state: StakeSyncState): void {
  try {
    fs.writeFileSync(STAKE_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('[SyncState] 质押同步状态已保存');
  } catch (error) {
    console.error('[SyncState] 保存质押同步状态文件失败:', error);
  }
}

export function saveRewardSyncState(state: RewardSyncState): void {
  try {
    fs.writeFileSync(REWARD_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('[SyncState] 奖励同步状态已保存');
  } catch (error) {
    console.error('[SyncState] 保存奖励同步状态文件失败:', error);
  }
}

/**
 * 获取上次同步的索引
 */
export function getLastSyncedIndex(): number {
  const state = loadSyncState();
  return state.lastSyncedIndex;
}

export function getStakeSyncState(): StakeSyncState {
  return loadStakeSyncState();
}

export function getRewardSyncState(): RewardSyncState {
  return loadRewardSyncState();
}

export function updateStakeSyncState(statePatch: Partial<StakeSyncState>): StakeSyncState {
  const state = loadStakeSyncState();
  const nextState: StakeSyncState = {
    ...state,
    ...statePatch,
    recentEventIds: statePatch.recentEventIds ?? state.recentEventIds,
    positions: statePatch.positions ?? state.positions,
  };
  saveStakeSyncState(nextState);
  return nextState;
}

export function updateRewardSyncState(statePatch: Partial<RewardSyncState>): RewardSyncState {
  const state = loadRewardSyncState();
  const nextState: RewardSyncState = {
    ...state,
    ...statePatch,
    recentEventIds: statePatch.recentEventIds ?? state.recentEventIds,
  };
  saveRewardSyncState(nextState);
  return nextState;
}

/**
 * 更新上次同步的索引
 * @param index 新的索引值
 * @param syncedCount 本次同步的用户数（累计到总数）
 * @param error 本次同步的错误（如果有）
 */
export function updateLastSyncedIndex(index: number, syncedCount?: number, error?: string | null): void {
  const state = loadSyncState();
  state.lastSyncedIndex = index;
  state.lastSyncTime = new Date().toISOString();
  if (syncedCount !== undefined) {
    state.totalSyncedCount += syncedCount;
  }
  if (error !== undefined) {
    state.lastError = error;
  }
  saveSyncState(state);
}

/**
 * 重置同步状态
 * 用于需要重新完整同步的场景
 */
export function resetSyncState(): void {
  console.log('[SyncState] 重置同步状态');
  saveSyncState({ ...defaultState });
}

export function resetStakeSyncState(): void {
  console.log('[SyncState] 重置质押同步状态');
  saveStakeSyncState({ ...defaultStakeState });
}

export function resetRewardSyncState(): void {
  console.log('[SyncState] 重置奖励同步状态');
  saveRewardSyncState({ ...defaultRewardState });
}

/**
 * 获取完整的同步状态
 */
export function getFullSyncState(): SyncState {
  return loadSyncState();
}

export function getFullStakeSyncState(): StakeSyncState {
  return loadStakeSyncState();
}

export function getFullRewardSyncState(): RewardSyncState {
  return loadRewardSyncState();
}

/**
 * 更新同步错误信息
 */
export function updateSyncError(error: string | null): void {
  const state = loadSyncState();
  state.lastError = error;
  saveSyncState(state);
}

export function updateStakeSyncError(error: string | null): void {
  const state = loadStakeSyncState();
  state.lastError = error;
  state.lastSyncTime = new Date().toISOString();
  saveStakeSyncState(state);
}

export function updateRewardSyncError(error: string | null): void {
  const state = loadRewardSyncState();
  state.lastError = error;
  state.lastSyncTime = new Date().toISOString();
  saveRewardSyncState(state);
}

/**
 * 初始化状态文件（如果不存在）
 */
export function initSyncStateFile(): void {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('[SyncState] 初始化同步状态文件');
    saveSyncState({ ...defaultState });
  }

  if (!fs.existsSync(STAKE_STATE_FILE)) {
    console.log('[SyncState] 初始化质押同步状态文件');
    saveStakeSyncState({ ...defaultStakeState });
  }

  if (!fs.existsSync(REWARD_STATE_FILE)) {
    console.log('[SyncState] 初始化奖励同步状态文件');
    saveRewardSyncState({ ...defaultRewardState });
  }
}
