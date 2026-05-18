import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import {
  DQ_CONTRACT_ADDRESS,
  DQ_ABI as DQ_MINING_ABI,
} from '../config/contracts';

// BSC 主网 RPC
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
// BSC RPC 的 eth_getLogs 默认限制约 10000 个区块，这里设置为 5000 避免超限
const BSC_EVENT_BLOCK_STEP = Number(process.env.BSC_EVENT_BLOCK_STEP || 5000);
const BSC_START_BLOCK = Number(process.env.BSC_START_BLOCK || 0);
const BSC_REGISTER_TX_CACHE_DIR = process.env.BSC_REGISTER_TX_CACHE_DIR || path.join(process.cwd(), 'server', 'cache', 'register-tx');
const BSC_EVENT_CACHE_DIR = process.env.BSC_EVENT_CACHE_DIR || path.join(process.cwd(), 'server', 'cache', 'events');
const BSC_REGISTER_LOG_QUERY_CONCURRENCY = Number(process.env.BSC_REGISTER_LOG_QUERY_CONCURRENCY || 2);
const BSC_REGISTER_LOG_MIN_STEP = Number(process.env.BSC_REGISTER_LOG_MIN_STEP || 200);
const BSC_REGISTER_TX_NEGATIVE_CACHE_TTL_MS = Number(process.env.BSC_REGISTER_TX_NEGATIVE_CACHE_TTL_MS || 10 * 60 * 1000);
const BSC_EVENT_CACHE_VERSION = 1;

const RPC_RETRY_MAX = Number(process.env.BSC_RPC_RETRY_MAX || 3);
const RPC_RETRY_BASE_DELAY_MS = Number(process.env.BSC_RPC_RETRY_BASE_DELAY_MS || 300);

// 合约地址/ABI：统一从配置读取，避免与前端/链上部署版本不一致
const DQ_CONTRACT = DQ_CONTRACT_ADDRESS;
const DQ_ABI = DQ_MINING_ABI;

// 复用 Provider，避免重复创建连接
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, undefined, {
  batchMaxCount: 1,
});

const pendingRegisterTxLookups = new Map<string, Promise<string | null>>();
const registerTxMissCache = new Map<string, number>();

let registerLogQueryInFlight = 0;
const registerLogQueryWaiters: Array<() => void> = [];

type RegisterTxCachePayload = {
  walletAddress: string;
  txHash: string;
  cachedAt: string;
};

type EventCachePayload = {
  version: number;
  eventKey: string;
  fromBlock: number;
  toBlock: number;
  cachedAt: string;
  events: any[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRpcError(error: unknown): { code?: string; reason: string } {
  const err = error as any;
  const code = err?.code as string | undefined;
  const reason =
    err?.shortMessage ||
    err?.reason ||
    err?.message ||
    (typeof error === 'string' ? error : 'Unknown error');

  return { code, reason: String(reason) };
}

function isRetryableError(error: unknown): boolean {
  const { code, reason } = normalizeRpcError(error);
  const text = `${code ?? ''} ${reason} ${JSON.stringify(error)}`.toLowerCase();

  return (
    text.includes('rate limit') ||
    text.includes('too many requests') ||
    text.includes('429') ||
    text.includes('-32005') ||
    text.includes('missing response for request') ||
    text.includes('socket disconnected') ||
    text.includes('tls connection') ||
    text.includes('network socket') ||
    text.includes('network error') ||
    text.includes('econnreset') ||
    text.includes('etimedout') ||
    text.includes('econnrefused') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED'
  );
}

function isLimitExceededError(error: unknown): boolean {
  const err = error as any;
  const innerCode = err?.error?.code;
  const message = `${err?.error?.message || ''} ${err?.message || ''} ${err?.shortMessage || ''}`.toLowerCase();

  return (
    innerCode === -32005 ||
    message.includes('limit exceeded') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  );
}

async function withRegisterLogQueryLimit<T>(fn: () => Promise<T>): Promise<T> {
  const concurrency = Number.isFinite(BSC_REGISTER_LOG_QUERY_CONCURRENCY) && BSC_REGISTER_LOG_QUERY_CONCURRENCY > 0
    ? Math.floor(BSC_REGISTER_LOG_QUERY_CONCURRENCY)
    : 2;

  while (registerLogQueryInFlight >= concurrency) {
    await new Promise<void>((resolve) => registerLogQueryWaiters.push(resolve));
  }

  registerLogQueryInFlight++;
  try {
    return await fn();
  } finally {
    registerLogQueryInFlight = Math.max(0, registerLogQueryInFlight - 1);
    const next = registerLogQueryWaiters.shift();
    if (next) {
      next();
    }
  }
}

async function withRpcRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RPC_RETRY_MAX; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableError(error) && attempt < RPC_RETRY_MAX;
      if (!shouldRetry) {
        throw error;
      }

      const delay = RPC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const { code, reason } = normalizeRpcError(error);
      console.warn(
        `[BSC] RPC 重试 ${attempt}/${RPC_RETRY_MAX} - ${label}（code=${code ?? 'N/A'} reason=${reason}）等待 ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function getRegisterTxCacheFilePath(walletAddress: string): string {
  return path.join(BSC_REGISTER_TX_CACHE_DIR, `${walletAddress.toLowerCase()}.json`);
}

function normalizeCacheKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getEventCacheFilePath(eventKey: string, fromBlock: number, toBlock: number): string {
  const safeKey = normalizeCacheKey(eventKey) || 'unknown_event';
  return path.join(BSC_EVENT_CACHE_DIR, safeKey, `${fromBlock}-${toBlock}.json`);
}

function toSerializable(value: any, seen = new WeakSet<object>()): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    const output: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      output[key] = toSerializable(value[key], seen);
    }
    seen.delete(value);
    return output;
  }

  return value;
}

function normalizeEventForCache(event: any): any {
  return {
    blockNumber: Number(event?.blockNumber ?? 0),
    transactionHash: event?.transactionHash ?? null,
    index: Number(event?.index ?? event?.logIndex ?? 0),
    logIndex: Number(event?.logIndex ?? event?.index ?? 0),
    blockHash: event?.blockHash ?? null,
    address: event?.address ?? null,
    data: event?.data ?? null,
    topics: Array.isArray(event?.topics) ? event.topics : [],
    eventName: event?.eventName ?? null,
    eventSignature: event?.eventSignature ?? null,
    args: toSerializable(event?.args),
  };
}

function readEventRangeCache(eventKey: string, fromBlock: number, toBlock: number): any[] | null {
  try {
    const filePath = getEventCacheFilePath(eventKey, fromBlock, toBlock);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(raw) as Partial<EventCachePayload>;

    if (
      payload.version !== BSC_EVENT_CACHE_VERSION ||
      !Array.isArray(payload.events)
    ) {
      return null;
    }

    return payload.events;
  } catch (error) {
    const { reason } = normalizeRpcError(error);
    console.warn(`[BSC] 读取事件缓存失败: ${reason}`);
    return null;
  }
}

function writeEventRangeCache(eventKey: string, fromBlock: number, toBlock: number, events: any[]): void {
  try {
    const filePath = getEventCacheFilePath(eventKey, fromBlock, toBlock);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const payload: EventCachePayload = {
      version: BSC_EVENT_CACHE_VERSION,
      eventKey,
      fromBlock,
      toBlock,
      cachedAt: new Date().toISOString(),
      events,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
  } catch (error) {
    const { reason } = normalizeRpcError(error);
    console.warn(`[BSC] 写入事件缓存失败: ${reason}`);
  }
}

async function queryEventRangeWithCache(
  contract: ethers.Contract,
  filter: any,
  fromBlock: number,
  toBlock: number,
  eventKey: string
): Promise<any[]> {
  const cached = readEventRangeCache(eventKey, fromBlock, toBlock);
  if (cached) {
    return cached;
  }

  const liveEvents = await withRegisterLogQueryLimit(() =>
    withRpcRetry(
      () => contract.queryFilter(filter, fromBlock, toBlock),
      `queryFilter(${eventKey}, ${fromBlock}-${toBlock})`
    )
  );

  const normalized = liveEvents.map((evt: any) => normalizeEventForCache(evt));
  writeEventRangeCache(eventKey, fromBlock, toBlock, normalized);
  return normalized;
}

function readRegisterTxCache(walletAddress: string): string | null {
  try {
    const filePath = getRegisterTxCacheFilePath(walletAddress);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(raw) as Partial<RegisterTxCachePayload>;
    if (typeof payload.txHash === 'string' && payload.txHash.length > 0) {
      return payload.txHash;
    }

    return null;
  } catch (error) {
    const { reason } = normalizeRpcError(error);
    console.warn(`[BSC] 读取注册交易缓存失败: ${reason}`);
    return null;
  }
}

function writeRegisterTxCache(walletAddress: string, txHash: string): void {
  try {
    fs.mkdirSync(BSC_REGISTER_TX_CACHE_DIR, { recursive: true });
    const filePath = getRegisterTxCacheFilePath(walletAddress);
    const payload: RegisterTxCachePayload = {
      walletAddress: walletAddress.toLowerCase(),
      txHash,
      cachedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (error) {
    const { reason } = normalizeRpcError(error);
    console.warn(`[BSC] 写入注册交易缓存失败: ${reason}`);
  }
}

async function queryRegisterEventsAdaptive(
  contract: ethers.Contract,
  filter: any,
  fromBlock: number,
  toBlock: number,
  eventKey: string
): Promise<Array<any>> {
  try {
    return await queryEventRangeWithCache(contract, filter, fromBlock, toBlock, eventKey);
  } catch (error) {
    const step = toBlock - fromBlock + 1;
    const minStep = Number.isFinite(BSC_REGISTER_LOG_MIN_STEP) && BSC_REGISTER_LOG_MIN_STEP > 0
      ? Math.floor(BSC_REGISTER_LOG_MIN_STEP)
      : 200;

    if (!isLimitExceededError(error) || fromBlock >= toBlock || step <= minStep) {
      throw error;
    }

    const mid = Math.floor((fromBlock + toBlock) / 2);
    console.warn(
      `[BSC] Register 日志区间过大，拆分查询 ${fromBlock}-${toBlock} -> ${fromBlock}-${mid}, ${mid + 1}-${toBlock}`
    );

    const left = await queryRegisterEventsAdaptive(contract, filter, fromBlock, mid, eventKey);
    const right = await queryRegisterEventsAdaptive(contract, filter, mid + 1, toBlock, eventKey);
    const merged = left.concat(right);
    writeEventRangeCache(eventKey, fromBlock, toBlock, merged);
    return merged;
  }
}

async function lookupRegisterTxHashOnChain(normalizedAddress: string): Promise<string | null> {
  const contract = getContract();
  const filter = contract.filters.Register(normalizedAddress, null);
  const eventKey = `register_${normalizedAddress}`;

  const latestBlock = await withRpcRetry(
    () => provider.getBlockNumber(),
    `getBlockNumber()`
  );

  const fromStart = Number.isFinite(BSC_START_BLOCK) && BSC_START_BLOCK >= 0 ? BSC_START_BLOCK : 0;
  const step = Number.isFinite(BSC_EVENT_BLOCK_STEP) && BSC_EVENT_BLOCK_STEP > 0 ? BSC_EVENT_BLOCK_STEP : 5000;

  for (let fromBlock = fromStart; fromBlock <= latestBlock; fromBlock += step) {
    const toBlock = Math.min(fromBlock + step - 1, latestBlock);
    const events = await queryRegisterEventsAdaptive(contract, filter, fromBlock, toBlock, eventKey);

    if (events.length > 0) {
      const sortedEvents = [...events].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
        return (a.index ?? 0) - (b.index ?? 0);
      });

      const txHash = sortedEvents[0].transactionHash;
      writeRegisterTxCache(normalizedAddress, txHash);
      console.log(
        `[BSC] 找到用户 ${normalizedAddress} 的注册交易: ${txHash}（区块范围 ${fromBlock}-${toBlock}）`
      );
      return txHash;
    }
  }

  return null;
}

// 获取合约实例
function getContract() {
  return new ethers.Contract(DQ_CONTRACT, DQ_ABI, provider);
}

/**
 * 获取用户在链上的注册交易 hash
 * 通过查询 Register 事件来找到用户的首次注册交易
 */
export async function getUserRegisterTxHash(walletAddress: string): Promise<string | null> {
  try {
    if (!ethers.isAddress(walletAddress)) {
      console.warn(`[BSC] 非法地址，跳过注册交易查询: ${walletAddress}`);
      return null;
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const cachedTxHash = readRegisterTxCache(normalizedAddress);
    if (cachedTxHash) {
      console.log(`[BSC] 命中注册交易缓存 ${normalizedAddress}: ${cachedTxHash}`);
      return cachedTxHash;
    }

    const lastMissAt = registerTxMissCache.get(normalizedAddress);
    if (lastMissAt && Date.now() - lastMissAt < BSC_REGISTER_TX_NEGATIVE_CACHE_TTL_MS) {
      return null;
    }

    const pendingLookup = pendingRegisterTxLookups.get(normalizedAddress);
    if (pendingLookup) {
      return await pendingLookup;
    }

    const lookupPromise = lookupRegisterTxHashOnChain(normalizedAddress)
      .then((txHash) => {
        if (!txHash) {
          registerTxMissCache.set(normalizedAddress, Date.now());
        } else {
          registerTxMissCache.delete(normalizedAddress);
        }
        return txHash;
      })
      .finally(() => {
        pendingRegisterTxLookups.delete(normalizedAddress);
      });

    pendingRegisterTxLookups.set(normalizedAddress, lookupPromise);
    const txHash = await lookupPromise;

    if (txHash) {
      return txHash;
    }
    
    console.log(`[BSC] 未找到用户 ${walletAddress} 的注册交易`);
    return null;
  } catch (error) {
    console.error(`[BSC] 查询注册交易失败:`, error);
    return null;
  }
}

/**
 * 检查用户是否已在链上注册
 */
export async function isUserRegisteredOnChain(walletAddress: string): Promise<boolean> {
  try {
    if (!ethers.isAddress(walletAddress)) {
      return false;
    }

    const contract = getContract();
    
    // 尝试获取用户信息
    const userInfo = await withRpcRetry(
      () => contract.getUser(walletAddress),
      `getUser(${walletAddress})`
    );
    
    // 如果 referrer 不为 0x0...0，则认为已注册
    // getUser 返回数组，第一个元素是 referrer
    if (userInfo && userInfo[0] !== ethers.ZeroAddress) {
      return true;
    }
    
    return false;
  } catch (error) {
    // 如果调用失败，可能用户不存在
    console.log(`[BSC] 用户 ${walletAddress} 未注册或查询失败`);
    return false;
  }
}

/**
 * 获取用户的链上信息
 */
export async function getUserInfoFromChain(walletAddress: string) {
  try {
    if (!ethers.isAddress(walletAddress)) {
      console.warn(`[BSC] 非法地址，跳过用户信息查询: ${walletAddress}`);
      return null;
    }

    // 基础诊断：避免“前端可用、后端不可用”时难以定位（常见原因是地址/网络不一致）
    try {
      const network = await provider.getNetwork();
      const code = await provider.getCode(DQ_CONTRACT);
      const codeSize = Math.max(0, Math.floor((code.length - 2) / 2));
      if (code === '0x' || codeSize === 0) {
        console.warn(
          `[BSC] 合约地址无代码（可能地址/网络不对）：contract=${DQ_CONTRACT} chainId=${network.chainId.toString()}`
        );
      }
    } catch (e) {
      console.warn('[BSC] 获取链/合约诊断信息失败:', e);
    }

    const contract = getContract();

    // getUser 返回数组: [referrer, directCount, level, totalInvest]
    const userInfo = await withRpcRetry(
      () => contract.getUser(walletAddress),
      `getUser(${walletAddress})`
    );

    // 额外字段：合约已拆分到单独的只读接口（兼容 getUser 只返回 4 个字段的版本）
    const [stakeInfo, dLevel, validAddressCount] = await Promise.all([
      withRpcRetry(() => contract.getUserStake(walletAddress), `getUserStake(${walletAddress})`).catch(() => null),
      withRpcRetry(() => contract.getDLevel(walletAddress), `getDLevel(${walletAddress})`).catch(() => null),
      withRpcRetry(
        () => contract.getValidAddressCount(walletAddress),
        `getValidAddressCount(${walletAddress})`
      ).catch(() => null),
    ]);

    return {
      referrer: userInfo[0],
      directCount: userInfo[1]?.toString() || '0',
      level: userInfo[2]?.toString() || '0',
      totalInvest: userInfo[3]?.toString() || '0',
      teamInvest: stakeInfo?.[0]?.toString?.() || '0',
      energy: stakeInfo?.[1]?.toString?.() || '0',
      pendingSOL: stakeInfo?.[2]?.toString?.() || '0',
      dLevel: dLevel?.toString?.() || '0',
      validAddressCount: validAddressCount?.toString?.() || '0',
    };
  } catch (error) {
    console.error(`[BSC] 获取用户信息失败:`, error);
    return null;
  }
}

/**
 * 获取用户的推荐链路（所有祖先）
 * 返回每个祖先及其代数深度
 * 最多追溯15代
 */
export async function getReferralLineage(
  walletAddress: string,
  maxDepth: number = 15
): Promise<Array<{ address: string; depth: number }>> {
  const MAX_LOOKUP_ADDRESSES = 100; // 每次最多查询多少个地址

  try {
    const contract = getContract();
    const lineage: Array<{ address: string; depth: number }> = [];
    let currentAddress = walletAddress.toLowerCase();
    let visited = new Set<string>();

    for (let depth = 1; depth <= maxDepth; depth++) {
      if (visited.has(currentAddress)) {
        console.warn(`[BSC] 检测到循环引用，停止追溯 depth=${depth}`);
        break;
      }

      try {
        const userInfo = await withRpcRetry(
          () => contract.users(currentAddress),
          `users(${currentAddress})`
        );

        // 检查是否有效用户
        if (userInfo.referrer === ethers.ZeroAddress || userInfo.referrer === '0x0000000000000000000000000000000000000000') {
          console.log(`[BSC] 用户 ${currentAddress} 无推荐人，停止追溯`);
          break;
        }

        const referrer = userInfo.referrer.toLowerCase();
        lineage.push({ address: referrer, depth });

        currentAddress = referrer;
        visited.add(currentAddress);
      } catch (error: any) {
        // 如果查询失败（用户不存在），停止追溯
        if (error?.reason?.includes('require') || error?.message?.includes('require(false)')) {
          console.log(`[BSC] 用户 ${currentAddress} 查询失败，停止追溯`);
          break;
        }
        throw error;
      }
    }

    console.log(`[BSC] 获取推荐链路 ${walletAddress}: ${lineage.length} 个祖先`);
    return lineage;
  } catch (error) {
    console.error(`[BSC] 获取推荐链路失败:`, error);
    return [];
  }
}

/**
 * 批量获取用户推荐链路（更高效的方式）
 */
export async function getReferralLineagesBatch(
  walletAddresses: string[],
  maxDepth: number = 15
): Promise<Map<string, Array<{ address: string; depth: number }>>> {
  const results = new Map<string, Array<{ address: string; depth: number }>>();

  // 并发查询，但限制并发数
  const batchSize = 10;
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(addr => getReferralLineage(addr, maxDepth))
    );
    batch.forEach((addr, idx) => {
      results.set(addr.toLowerCase(), batchResults[idx]);
    });
  }

  return results;
}
