/**
 * 链上同步状态持久化管理
 * 使用 JSON 文件存储增量同步的索引和其他状态
 * 确保服务重启后同步进度不会丢失
 */

import fs from 'fs';
import path from 'path';

// 状态文件路径（存储在项目根目录的 .sync-state 文件）
const STATE_FILE = path.join(process.cwd(), '.sync-state.json');

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

/**
 * 获取上次同步的索引
 */
export function getLastSyncedIndex(): number {
  const state = loadSyncState();
  return state.lastSyncedIndex;
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

/**
 * 获取完整的同步状态
 */
export function getFullSyncState(): SyncState {
  return loadSyncState();
}

/**
 * 更新同步错误信息
 */
export function updateSyncError(error: string | null): void {
  const state = loadSyncState();
  state.lastError = error;
  saveSyncState(state);
}

/**
 * 初始化状态文件（如果不存在）
 */
export function initSyncStateFile(): void {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('[SyncState] 初始化同步状态文件');
    saveSyncState({ ...defaultState });
  }
}
