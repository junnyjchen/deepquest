/**
 * 链上数据同步服务
 * 从区块链同步数据到数据库，保证数据一致性
 * 
 * 使用方式：外部服务器定时调用 /api/v1/dapp/sync 接口
 */

import { getSupabaseClient } from '../storage/database/supabase-client';
import { DQ_CONTRACT_ADDRESS, DQ_ABI, DQCARD_ABI, DQCARD_CONTRACT_ADDRESS } from '../config/contracts.ts';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import {
  loadSyncState,
  saveSyncState,
  getLastSyncedIndex,
  updateLastSyncedIndex,
  updateSyncError,
  resetSyncState,
  getFullSyncState,
  initSyncStateFile,
} from './sync-state';
import { getUserRegisterTxHash, getReferralLineage } from './bsc-web3';

const supabase = getSupabaseClient();

// 初始化同步状态文件
initSyncStateFile();

// BSC RPC
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
// 关闭 ethers 内部 JSON-RPC 批量请求，避免节点将 eth_call 批请求整体限流（-32005）
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, undefined, {
  batchMaxCount: 1,
});
const CARD_CONFIG_CACHE_FILE = process.env.CARD_CONFIG_CACHE_FILE || path.join(process.cwd(), 'cache', 'card-config.json');

// 单次同步最大用户数（防止 Gas 限制）
const BATCH_SIZE = 50;

// RPC 限流保护参数
const RPC_CALL_CONCURRENCY = 10;         // 每轮并发 eth_call 数
const RPC_CHUNK_DELAY_MS = 120;          // 每轮并发后的短暂间隔
const RPC_RETRY_MAX = 3;                 // 限流后最大重试次数
const RPC_RETRY_BASE_DELAY_MS = 300;     // 指数退避基准延迟
const INCREMENTAL_REBUILD_MAX_USERS = Number(process.env.INCREMENTAL_REBUILD_MAX_USERS || 100); // 每次增量重建最多处理用户数

// 记录同步状态
let syncInProgress = false;
let lastSyncTime: Date | null = null;
let lastError: string | null = null;
let lastSyncResult: { totalUsers: number; syncedUsers: number; failedUsers: number } | null = null;

// 注意: lastSyncedIndex 现在从文件加载，不再存储在内存中
// 使用 getLastSyncedIndex() 获取，使用 updateLastSyncedIndex() 更新

/**
 * 获取合约实例
 */
function getContract() {
  return new ethers.Contract(DQ_CONTRACT_ADDRESS, DQ_ABI, provider);
}

type AllUsersQueryResult =
  | { success: true; address: string; index: number }
  | { success: false; index: number; code?: string; reason: string };

export type CardKey = 'A' | 'B' | 'C';

export type ChainCardConfigItem = {
  price: string;
  total: number;
  remaining: number;
  reward_rate: number;
  name: string;
  level: string;
  fee_rate: number;
  minted: number;
};

export type ChainCardRecord = {
  token_id: number;
  owner_address: string;
  card_type: number;
  card_key: CardKey;
  card_name: string;
  card_level: string;
  mint_price: string;
  dq_reward: string;
  fee_reward: string;
  status: string;
};

const CARD_METADATA: Record<number, { key: CardKey; name: string; level: string; rewardRate: number; feeRate: number }> = {
  1: { key: 'A', name: 'S1节点卡', level: 'S1', rewardRate: 4, feeRate: 10 },
  2: { key: 'B', name: 'S2节点卡', level: 'S2', rewardRate: 5, feeRate: 15 },
  3: { key: 'C', name: 'S3节点卡', level: 'S3', rewardRate: 6, feeRate: 15 },
};

/**
 * 标准化链上读取错误，便于日志排查
 */
function normalizeChainReadError(error: unknown): { code?: string; reason: string } {
  const err = error as any;
  const code = err?.code as string | undefined;
  const reason =
    err?.shortMessage ||
    err?.reason ||
    err?.message ||
    (typeof error === 'string' ? error : 'Unknown error');

  return { code, reason: String(reason) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatFixed2(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function readCardConfigCache(): Record<CardKey, ChainCardConfigItem> | null {
  try {
    if (!fs.existsSync(CARD_CONFIG_CACHE_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(CARD_CONFIG_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Record<CardKey, ChainCardConfigItem>>;

    if (!parsed.A || !parsed.B || !parsed.C) {
      return null;
    }

    return parsed as Record<CardKey, ChainCardConfigItem>;
  } catch (error) {
    console.warn('[ChainSync] 读取卡牌配置缓存失败，改为链上查询:', error);
    return null;
  }
}

function writeCardConfigCache(data: Record<CardKey, ChainCardConfigItem>): void {
  try {
    fs.mkdirSync(path.dirname(CARD_CONFIG_CACHE_FILE), { recursive: true });
    fs.writeFileSync(CARD_CONFIG_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('[ChainSync] 写入卡牌配置缓存失败:', error);
  }
}

function getCardContract() {
  return new ethers.Contract(DQCARD_CONTRACT_ADDRESS, DQCARD_ABI, provider);
}

function formatEtherFixed2(value: bigint | number | string): string {
  const bigintValue = typeof value === 'bigint' ? value : BigInt(String(value));
  return formatFixed2(ethers.formatEther(bigintValue));
}

function getCardMetadata(cardType: number) {
  return CARD_METADATA[cardType] || CARD_METADATA[1];
}

async function mapInChunks<T, R>(items: T[], chunkSize: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize);
    const chunkResults = await Promise.all(chunk.map((item, offset) => mapper(item, start + offset)));
    results.push(...chunkResults);
  }
  return results;
}

export async function getCardConfigFromChain(forceRefresh: boolean = false): Promise<Record<CardKey, ChainCardConfigItem>> {
  if (!forceRefresh) {
    const cached = readCardConfigCache();
    if (cached) {
      return cached;
    }
  }

  const contract = getCardContract();
  const [priceA, priceB, priceC, maxA, maxB, maxC, totalA, totalB, totalC] = await Promise.all([
    withRpcRetry(() => contract.PRICE_A(), 'DQCard.PRICE_A()'),
    withRpcRetry(() => contract.PRICE_B(), 'DQCard.PRICE_B()'),
    withRpcRetry(() => contract.PRICE_C(), 'DQCard.PRICE_C()'),
    withRpcRetry(() => contract.MAX_A(), 'DQCard.MAX_A()'),
    withRpcRetry(() => contract.MAX_B(), 'DQCard.MAX_B()'),
    withRpcRetry(() => contract.MAX_C(), 'DQCard.MAX_C()'),
    withRpcRetry(() => contract.totalA(), 'DQCard.totalA()'),
    withRpcRetry(() => contract.totalB(), 'DQCard.totalB()'),
    withRpcRetry(() => contract.totalC(), 'DQCard.totalC()'),
  ]);

  const config = {
    A: {
      price: formatEtherFixed2(priceA),
      total: Number(maxA),
      remaining: Math.max(Number(maxA) - Number(totalA), 0),
      reward_rate: CARD_METADATA[1].rewardRate,
      name: CARD_METADATA[1].name,
      level: CARD_METADATA[1].level,
      fee_rate: CARD_METADATA[1].feeRate,
      minted: Number(totalA),
    },
    B: {
      price: formatEtherFixed2(priceB),
      total: Number(maxB),
      remaining: Math.max(Number(maxB) - Number(totalB), 0),
      reward_rate: CARD_METADATA[2].rewardRate,
      name: CARD_METADATA[2].name,
      level: CARD_METADATA[2].level,
      fee_rate: CARD_METADATA[2].feeRate,
      minted: Number(totalB),
    },
    C: {
      price: formatEtherFixed2(priceC),
      total: Number(maxC),
      remaining: Math.max(Number(maxC) - Number(totalC), 0),
      reward_rate: CARD_METADATA[3].rewardRate,
      name: CARD_METADATA[3].name,
      level: CARD_METADATA[3].level,
      fee_rate: CARD_METADATA[3].feeRate,
      minted: Number(totalC),
    },
  };

  writeCardConfigCache(config);

  return config;
}

export async function getUserCardsFromChain(walletAddress: string): Promise<ChainCardRecord[]> {
  const normalizedAddress = walletAddress.toLowerCase();
  const contract = getCardContract();
  const balance = Number(await withRpcRetry(() => contract.balanceOf(normalizedAddress), `DQCard.balanceOf(${normalizedAddress})`));

  if (balance === 0) {
    return [];
  }

  const indices = Array.from({ length: balance }, (_, index) => index);
  const cards = await mapInChunks(indices, 20, async (index) => {
    const tokenId = Number(await withRpcRetry(() => contract.tokenOfOwnerByIndex(normalizedAddress, index), `DQCard.tokenOfOwnerByIndex(${normalizedAddress},${index})`));
    const cardType = Number(await withRpcRetry(() => contract.cardType(tokenId), `DQCard.cardType(${tokenId})`));
    const meta = getCardMetadata(cardType);
    const mintPrice = await withRpcRetry(() => contract.getCardPrice(cardType), `DQCard.getCardPrice(${cardType})`);

    return {
      token_id: tokenId,
      owner_address: normalizedAddress,
      card_type: cardType,
      card_key: meta.key,
      card_name: meta.name,
      card_level: meta.level,
      mint_price: formatEtherFixed2(mintPrice),
      dq_reward: '0.00',
      fee_reward: '0.00',
      status: 'active',
    } satisfies ChainCardRecord;
  });

  return cards.sort((left, right) => right.token_id - left.token_id);
}

export async function getAllCardsFromChain(): Promise<ChainCardRecord[]> {
  const contract = getCardContract();
  const totalSupply = Number(await withRpcRetry(() => contract.totalSupply(), 'DQCard.totalSupply()'));

  if (totalSupply === 0) {
    return [];
  }

  const priceCache = new Map<number, string>();
  const indices = Array.from({ length: totalSupply }, (_, index) => index);

  const cards = await mapInChunks(indices, 25, async (index) => {
    const tokenId = Number(await withRpcRetry(() => contract.tokenByIndex(index), `DQCard.tokenByIndex(${index})`));
    const [ownerRaw, cardTypeRaw] = await Promise.all([
      withRpcRetry(() => contract.ownerOf(tokenId), `DQCard.ownerOf(${tokenId})`),
      withRpcRetry(() => contract.cardType(tokenId), `DQCard.cardType(${tokenId})`),
    ]);
    const ownerAddress = String(ownerRaw).toLowerCase();
    const cardType = Number(cardTypeRaw);
    const meta = getCardMetadata(cardType);

    let mintPrice = priceCache.get(cardType);
    if (!mintPrice) {
      const priceRaw = await withRpcRetry(() => contract.getCardPrice(cardType), `DQCard.getCardPrice(${cardType})`);
      mintPrice = formatEtherFixed2(priceRaw);
      priceCache.set(cardType, mintPrice);
    }

    return {
      token_id: tokenId,
      owner_address: ownerAddress,
      card_type: cardType,
      card_key: meta.key,
      card_name: meta.name,
      card_level: meta.level,
      mint_price: mintPrice,
      dq_reward: '0.00',
      fee_reward: '0.00',
      status: 'active',
    } satisfies ChainCardRecord;
  });

  return cards.sort((left, right) => left.token_id - right.token_id);
}

export async function getCardStatsFromChain(walletAddress: string): Promise<{
  cards: ChainCardRecord[];
  cardCount: number;
  totalInvest: string;
  totalReward: string;
  pendingReward: string;
}> {
  const cards = await getUserCardsFromChain(walletAddress);
  const totalInvest = cards.reduce((sum, card) => sum + parseFloat(card.mint_price || '0'), 0);

  const [claimedResult, pendingResult] = await Promise.all([
    supabase
      .from('card_rewards')
      .select('amount')
      .eq('user_address', walletAddress.toLowerCase())
      .eq('status', 'claimed'),
    supabase
      .from('card_rewards')
      .select('amount')
      .eq('user_address', walletAddress.toLowerCase())
      .eq('status', 'pending'),
  ]);

  const totalReward = claimedResult.data?.reduce((sum: number, row: { amount?: string }) => sum + parseFloat(row.amount || '0'), 0) || 0;
  const pendingReward = pendingResult.data?.reduce((sum: number, row: { amount?: string }) => sum + parseFloat(row.amount || '0'), 0) || 0;

  return {
    cards,
    cardCount: cards.length,
    totalInvest: totalInvest.toFixed(2),
    totalReward: totalReward.toFixed(2),
    pendingReward: pendingReward.toFixed(2),
  };
}

export async function syncAllCardsFromChainToDatabase(): Promise<{ totalCards: number; syncedCards: number; inactiveCards: number }> {
  const chainCards = await getAllCardsFromChain();

  if (chainCards.length > 0) {
    const payload = chainCards.map((card) => ({
      token_id: card.token_id,
      owner_address: card.owner_address,
      card_type: card.card_type,
      mint_price: card.mint_price,
      dq_reward: card.dq_reward,
      fee_reward: card.fee_reward,
      status: card.status,
    }));

    const { error: upsertError } = await supabase
      .from('cards')
      .upsert(payload, { onConflict: 'token_id' });

    if (upsertError) {
      throw new Error(`同步链上卡牌失败: ${upsertError.message}`);
    }

    const tokenIds = chainCards.map((card) => card.token_id).join(',');
    const { error: deactivateError } = await supabase
      .from('cards')
      .update({ status: 'inactive' })
      .not('token_id', 'in', `(${tokenIds})`);

    if (deactivateError) {
      throw new Error(`更新本地下线卡牌失败: ${deactivateError.message}`);
    }
  } else {
    const { error: deactivateError } = await supabase
      .from('cards')
      .update({ status: 'inactive' })
      .neq('id', 0);

    if (deactivateError) {
      throw new Error(`清空本地卡牌状态失败: ${deactivateError.message}`);
    }
  }

  const { count: inactiveCards, error: countError } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'inactive');

  if (countError) {
    throw new Error(`统计失效卡牌失败: ${countError.message}`);
  }

  return {
    totalCards: chainCards.length,
    syncedCards: chainCards.length,
    inactiveCards: inactiveCards || 0,
  };
}

function isRetryableError(error: unknown): boolean {
  const { code, reason } = normalizeChainReadError(error);
  const text = `${code ?? ''} ${reason} ${JSON.stringify(error)}`.toLowerCase();

  return (
    // RPC 限流
    text.includes('rate limit') ||
    text.includes('too many requests') ||
    text.includes('429') ||
    text.includes('-32005') ||
    text.includes('missing response for request') ||
    // 网络层断连（TLS/TCP 握手失败、连接被重置等）
    text.includes('socket disconnected') ||
    text.includes('tls connection') ||
    text.includes('econnreset') ||
    text.includes('econnrefused') ||
    text.includes('etimedout') ||
    text.includes('network error') ||
    text.includes('network socket') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED'
  );
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
      const { code, reason } = normalizeChainReadError(error);
      console.warn(
        `[ChainSync] RPC 限流重试 ${attempt}/${RPC_RETRY_MAX} - ${label}（code=${code ?? 'N/A'} reason=${reason}）等待 ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 从链上获取所有用户地址
 * 通过 allUsers 数组直接查询（比事件扫描更稳定高效）
 * 采用增量查询：逐个尝试查询索引，直到出错
 */
export async function getAllUsersFromChain(): Promise<string[]> {
  const contract = getContract();
  try {
    const users: string[] = [];
    let index = 0;
    const batchSize = 100; // 每批查询数量
    const maxTries = 10000; // 最多尝试查询的索引数
    
    console.log('[ChainSync] 开始从链上获取用户列表...');
    
    while (index < maxTries) {
      try {
        // 批量查询用户地址（分块并发，避免瞬时触发 RPC 限流）
        const tasks: Array<() => Promise<AllUsersQueryResult>> = [];
        for (let i = 0; i < batchSize && index + i < maxTries; i++) {
          const currentIndex = index + i;
          tasks.push(async () => {
            try {
              const addr = await withRpcRetry(
                () => contract.allUsers(currentIndex),
                `allUsers(${currentIndex})`
              );
              return { success: true as const, address: addr, index: currentIndex };
            } catch (error) {
              const { code, reason } = normalizeChainReadError(error);
              return { success: false as const, index: currentIndex, code, reason };
            }
          });
        }

        const results: AllUsersQueryResult[] = [];
        for (let i = 0; i < tasks.length; i += RPC_CALL_CONCURRENCY) {
          const chunk = tasks.slice(i, i + RPC_CALL_CONCURRENCY);
          const chunkResults = await Promise.all(chunk.map((task) => task()));
          results.push(...chunkResults);

          if (i + RPC_CALL_CONCURRENCY < tasks.length) {
            await sleep(RPC_CHUNK_DELAY_MS);
          }
        }
        let foundAny = false;
        const failedResults: Array<Extract<AllUsersQueryResult, { success: false }>> = [];
        
        for (const result of results) {
          if (result.success) {
            users.push(result.address.toLowerCase());
            foundAny = true;
          } else {
            failedResults.push(result);
          }
        }

        if (failedResults.length > 0) {
          const sample = failedResults
            .slice(0, 3)
            .map((r) => `idx=${r.index}, code=${r.code ?? 'N/A'}, reason=${r.reason}`)
            .join(' | ');
          console.warn(
            `[ChainSync] allUsers 批次存在失败: ${failedResults.length}/${results.length}（范围 ${index}-${Math.min(index + batchSize - 1, maxTries - 1)}），示例: ${sample}`
          );
        }
        
        // 如果这一批都查不到，说明已经到头了
        if (!foundAny) {
          if (failedResults.length > 0) {
            const boundaryError = failedResults[0];
            console.log(
              `[ChainSync] allUsers 到达边界或读取失败，停止于索引 ${boundaryError.index}（code=${boundaryError.code ?? 'N/A'} reason=${boundaryError.reason}）`
            );
          }
          break;
        }
        
        index += batchSize;
        
        // 进度日志
        if (index % 500 === 0 || index === batchSize) {
          console.log(`[ChainSync] 已获取 ${users.length} 个用户...`);
        }
      } catch (error) {
        console.log(`[ChainSync] 在索引 ${index} 处停止查询`);
        break;
      }
    }
    
    // 去重（虽然不太可能有重复，但以防万一）
    const uniqueUsers = Array.from(new Set(users));
    console.log(`[ChainSync] 成功获取 ${uniqueUsers.length} 个唯一用户地址`);
    
    return uniqueUsers;
  } catch (error) {
    console.error('[ChainSync] 获取所有用户失败:', error);
    return [];
  }
}

/**
 * 从链上获取单个用户信息
 */
export async function getChainUserInfo(userAddress: string): Promise<{
  referrer: string;
  directCount: number;
  level: number;
  totalInvest: string;
} | null> {
  try {
    const contract = getContract();
    // getUser 返回: [referrer, directCount, level, totalInvest]
    const userInfo = await withRpcRetry(
      () => contract.getUser(userAddress),
      `getUser(${userAddress})`
    ) as any[];

    return {
      referrer: userInfo[0],
      directCount: Number(userInfo[1]),
      level: Number(userInfo[2]),
      totalInvest: userInfo[3].toString(),
    };
  } catch (error) {
    console.error(`[ChainSync] 获取用户 ${userAddress} 信息失败:`, error);
    return null;
  }
}

/**
 * 同步单个用户数据到数据库
 * @param userAddress 用户钱包地址
 * @param userInfo 用户链上信息
 * @param fields 要同步的字段数组，null 或空数组表示全部字段
 */
async function syncUserToDatabase(
  userAddress: string, 
  userInfo: {
    referrer: string;
    directCount: number;
    level: number;
    totalInvest: string;
  },
  fields?: string[]
): Promise<boolean> {
  try {
    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, wallet_address, is_activated, activation_tx_hash')
      .eq('wallet_address', userAddress.toLowerCase())
      .single();

    const hasValidReferrer =
      userInfo.referrer && userInfo.referrer !== '0x0000000000000000000000000000000000000000';

    const activationTxHash = hasValidReferrer && !existingUser?.activation_tx_hash
      ? await getUserRegisterTxHash(userAddress)
      : existingUser?.activation_tx_hash ?? null;

    // 定义可同步的字段映射（与 getChainUserInfo 返回字段对应）
    const fieldMap: Record<string, { chainKey: keyof typeof userInfo; dbKey: string }> = {
      direct_count: { chainKey: 'directCount', dbKey: 'direct_count' },
      level: { chainKey: 'level', dbKey: 'level' },
      total_invest: { chainKey: 'totalInvest', dbKey: 'total_invest' },
      referrer_address: { chainKey: 'referrer', dbKey: 'referrer_address' },
    };

    //如果用户地址是 0x0000000000000000000000000000000000000000,则 置空推荐人地址，避免数据库中出现无效地址
    if (userAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      userInfo.referrer = '';
    }

    if (existingUser) {
      // 更新现有用户
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // 根据 fields 参数决定同步哪些字段
      const fieldsToSync = fields && fields.length > 0 ? fields : Object.keys(fieldMap);

      for (const field of fieldsToSync) {
        if (fieldMap[field]) {
          updateData[fieldMap[field].dbKey] = userInfo[fieldMap[field].chainKey];
        }
      }

      // 如果推荐人有效，更新推荐人关系
      if (hasValidReferrer) {
        // 只有在同步 referrer_address 或同步全部字段时才更新推荐人
        if (!fields || fields.length === 0 || fields.includes('referrer_address')) {
          updateData.referrer_address = userInfo.referrer.toLowerCase();
        }

        if (activationTxHash) {
          updateData.activation_tx_hash = activationTxHash;
        }
        
        // 如果用户未激活但有推荐人，标记为已激活
        if (!existingUser.is_activated) {
          updateData.is_activated = true;
          updateData.activated_at = new Date().toISOString();
        }
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', userAddress.toLowerCase());

      // 同步团队闭包关系（不依赖激活状态）
      await syncUserTeamClosure(userAddress);

      return true;
    } else {
      // 创建新用户
      const insertData: Record<string, any> = {
        wallet_address: userAddress.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 根据 fields 参数决定同步哪些字段
      const fieldsToSync = fields && fields.length > 0 ? fields : Object.keys(fieldMap);

      for (const field of fieldsToSync) {
        if (fieldMap[field]) {
          insertData[fieldMap[field].dbKey] = userInfo[fieldMap[field].chainKey];
        }
      }

      // 如果推荐人有效，添加推荐人关系
      if (hasValidReferrer) {
        if (!fields || fields.length === 0 || fields.includes('referrer_address')) {
          insertData.referrer_address = userInfo.referrer.toLowerCase();
        }
        insertData.is_activated = true;
        insertData.activated_at = new Date().toISOString();

        if (activationTxHash) {
          insertData.activation_tx_hash = activationTxHash;
        }
      }

      await supabase.from('users').insert(insertData);
      
      // 同步成功后，添加团队闭包关系（15代以内，不依赖激活状态）
      await syncUserTeamClosure(userAddress);
      
      return true;
    }
  } catch (error) {
    console.error(`[ChainSync] 同步用户 ${userAddress} 到数据库失败:`, error);
    return false;
  }
}

/**
 * 同步单个用户（供外部调用）
 */
export async function syncSingleUser(userAddress: string): Promise<boolean> {
  const userInfo = await getChainUserInfo(userAddress);
  if (userInfo) {
    return await syncUserToDatabase(userAddress, userInfo);
  }
  return false;
}

/**
 * 从数据库获取用户的推荐链路（祖先）
 * 优先使用数据库已有的推荐关系，避免依赖链上查询
 */
async function getReferralLineageFromDB(
  userAddress: string, 
  maxDepth: number = 15
): Promise<Array<{ address: string; depth: number }>> {
  const lineage: Array<{ address: string; depth: number }> = [];
  let currentAddress = userAddress.toLowerCase();
  const visited = new Set<string>();

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (visited.has(currentAddress)) {
      console.warn(`[ChainSync] 检测到循环引用，停止追溯, 当前地址=${currentAddress}, depth=${depth}`);
      break;
    }
    visited.add(currentAddress);

    // 从数据库查询推荐人
    const { data: userData, error } = await supabase
      .from('users')
      .select('referrer_address')
      .eq('wallet_address', currentAddress)
      .single();

    if (error || !userData || !userData.referrer_address) {
      break;
    }

    const referrer = userData.referrer_address.toLowerCase();
    lineage.push({ address: referrer, depth });
    currentAddress = referrer;
  }

  return lineage;
}

/**
 * 同步用户团队闭包关系
 * 为用户及其所有祖先（15代以内）建立闭包表关系
 */
type TeamClosureSyncResult = {
  insertedRows: number;
  skipped: boolean;
  reason?: string;
};

async function syncUserTeamClosure(userAddress: string, maxDepth: number = 15): Promise<TeamClosureSyncResult> {
  // 从数据库获取推荐链路（不访问链上）
  const lineage = await getReferralLineageFromDB(userAddress, maxDepth);
  
  if (lineage.length === 0) {
    console.log(`[ChainSync] 用户 ${userAddress} 无推荐链路（数据库），跳过闭包关系创建`);
    return { insertedRows: 0, skipped: true, reason: 'NO_LINEAGE' };
  }

  console.log(`[ChainSync] 用户 ${userAddress} 找到 ${lineage.length} 个祖先（数据库）`);

  // 获取用户ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress.toLowerCase())
    .single();

  if (userError || !userData) {
    throw new Error(`[ChainSync] 获取用户ID失败: ${userAddress} - ${userError?.message || 'NOT_FOUND'}`);
  }

  const descendantId = userData.id;
  const closureRecords: Array<{ ancestor_id: number; descendant_id: number; depth: number }> = [];

  // 为每个祖先创建闭包记录
  for (const ancestor of lineage) {
    // 获取祖先用户ID
    let ancestorData = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', ancestor.address.toLowerCase())
      .single()
      .then(res => res.data);

    // 如果祖先用户不存在，先从链上获取并注册
    if (!ancestorData) {
      console.log(`[ChainSync] 祖先用户不存在: ${ancestor.address}，尝试从链上获取并注册...`);
      
      try {
        const ancestorInfo = await getChainUserInfo(ancestor.address);
        if (ancestorInfo) {
          // 链上有数据，同步到数据库
          await syncUserToDatabase(ancestor.address, ancestorInfo);
          console.log(`[ChainSync] 成功从链上同步祖先用户: ${ancestor.address}`);
        } else {
          // 链上也没有，先在数据库创建基础记录
          console.log(`[ChainSync] 链上无数据，先在数据库创建基础记录: ${ancestor.address}`);
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              wallet_address: ancestor.address.toLowerCase(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          
          if (insertError) {
            console.error(`[ChainSync] 创建祖先用户基础记录失败: ${ancestor.address}`, insertError);
          }
        }
        
        // 重新查询用户ID
        ancestorData = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', ancestor.address.toLowerCase())
          .single()
          .then(res => res.data);
      } catch (error) {
        console.error(`[ChainSync] 处理祖先用户失败: ${ancestor.address}`, error);
      }
    }

    // 如果仍然找不到，跳过
    if (!ancestorData) {
      console.warn(`[ChainSync] 祖先用户 ${ancestor.address} 无法获取，depth: ${ancestor.depth}，跳过此关系`);
      continue;
    }

    closureRecords.push({
      ancestor_id: ancestorData.id,
      descendant_id: descendantId,
      depth: ancestor.depth
    });
  }

  if (closureRecords.length === 0) {
    console.log(`[ChainSync] 未找到有效的祖先用户，跳过闭包关系创建`);
    return { insertedRows: 0, skipped: true, reason: 'NO_VALID_ANCESTOR' };
  }

  const { count: beforeCount, error: beforeCountError } = await supabase
    .from('team_closure')
    .select('*', { count: 'exact', head: true })
    .eq('descendant_id', descendantId);

  if (beforeCountError) {
    throw new Error(`[ChainSync] 查询闭包关系前计数失败: ${beforeCountError.message}`);
  }

  // 批量插入闭包记录（使用 upsert 避免重复）
  const { error: insertError } = await supabase
    .from('team_closure')
    .upsert(closureRecords, { 
      onConflict: 'ancestor_id,descendant_id',
      ignoreDuplicates: true 
    });

  if (insertError) {
    throw new Error(`[ChainSync] 创建团队闭包关系失败: ${insertError.message}`);
  }

  const { count: afterCount, error: afterCountError } = await supabase
    .from('team_closure')
    .select('*', { count: 'exact', head: true })
    .eq('descendant_id', descendantId);

  if (afterCountError) {
    throw new Error(`[ChainSync] 查询闭包关系后计数失败: ${afterCountError.message}`);
  }

  const insertedRows = Math.max(0, (afterCount || 0) - (beforeCount || 0));

  if (insertedRows > 0) {
    console.log(`[ChainSync] 为用户 ${userAddress} 实际新增 ${insertedRows} 条团队闭包关系`);
    return { insertedRows, skipped: false };
  }

  console.log(`[ChainSync] 用户 ${userAddress} 闭包关系无新增（可能已存在）`);
  return { insertedRows: 0, skipped: true, reason: 'NO_NEW_ROWS' };
}

/**
 * 执行一次完整同步
 * @param fields 要同步的字段数组，null 或空数组表示全部字段
 */
export async function syncChainData(fields?: string[]): Promise<{
  success: boolean;
  totalUsers: number;
  syncedUsers: number;
  failedUsers: number;
  duration: number;
  error?: string;
}> {
  if (syncInProgress) {
    console.log('[ChainSync] 同步任务正在执行中，跳过本次');
    return {
      success: false,
      totalUsers: 0,
      syncedUsers: 0,
      failedUsers: 0,
      duration: 0,
      error: 'Sync already in progress',
    };
  }

  syncInProgress = true;
  const startTime = Date.now();
  let totalUsers = 0;
  let syncedUsers = 0;
  let failedUsers = 0;

  console.log('[ChainSync] ========== 开始链上数据同步 ==========');

  try {
    // 1. 从链上获取所有用户
    const users = await getAllUsersFromChain();
    totalUsers = users.length;

    if (totalUsers === 0) {
      console.log('[ChainSync] 链上无用户数据');
      lastSyncTime = new Date();
      lastError = null;
      updateSyncError(null);
      lastSyncResult = { totalUsers: 0, syncedUsers: 0, failedUsers: 0 };
      syncInProgress = false;
      return {
        success: true,
        totalUsers: 0,
        syncedUsers: 0,
        failedUsers: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`[ChainSync] 开始同步 ${totalUsers} 个用户...`);

    // 2. 分批处理用户
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`[ChainSync] 同步批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalUsers / BATCH_SIZE)}`);

      await Promise.all(
        batch.map(async (userAddress) => {
          try {
            const userInfo = await getChainUserInfo(userAddress);
            if (userInfo) {
              const success = await syncUserToDatabase(userAddress, userInfo, fields);
              if (success) {
                syncedUsers++;
              } else {
                failedUsers++;
              }
            } else {
              failedUsers++;
            }
          } catch (error) {
            console.error(`[ChainSync] 处理用户 ${userAddress} 失败:`, error);
            failedUsers++;
          }
        })
      );

      // 批次间隔，避免请求过快
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;
    lastSyncTime = new Date();
    lastError = null;
    updateSyncError(null);
    lastSyncResult = { totalUsers, syncedUsers, failedUsers };

    console.log(`[ChainSync] ========== 同步完成 ==========`);
    console.log(`[ChainSync] 总用户: ${totalUsers}, 成功: ${syncedUsers}, 失败: ${failedUsers}`);
    console.log(`[ChainSync] 耗时: ${duration}ms`);

    return {
      success: true,
      totalUsers,
      syncedUsers,
      failedUsers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    lastError = error.message;
    updateSyncError(error.message);
    lastSyncResult = { totalUsers, syncedUsers, failedUsers };
    console.error('[ChainSync] 同步失败:', error);

    return {
      success: false,
      totalUsers,
      syncedUsers,
      failedUsers,
      duration,
      error: error.message,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * 获取链上新增用户（增量同步）
 * 只查询从上次同步索引之后的用户
 */
async function getNewUsersFromChain(startIndex: number): Promise<string[]> {
  const contract = getContract();
  try {
    const newUsers: string[] = [];
    let index = startIndex;
    const batchSize = 100;
    const maxTries = 10000;
    
    console.log(`[ChainSync] 开始增量查询新用户（从索引 ${startIndex} 开始）...`);
    
    while (index < maxTries) {
      try {
        const tasks: Array<() => Promise<AllUsersQueryResult>> = [];
        for (let i = 0; i < batchSize && index + i < maxTries; i++) {
          const currentIndex = index + i;
          tasks.push(async () => {
            try {
              const addr = await withRpcRetry(
                () => contract.allUsers(currentIndex),
                `allUsers(${currentIndex})`
              );
              return { success: true as const, address: addr, index: currentIndex };
            } catch (error) {
              const { code, reason } = normalizeChainReadError(error);
              return { success: false as const, index: currentIndex, code, reason };
            }
          });
        }

        const results: AllUsersQueryResult[] = [];
        for (let i = 0; i < tasks.length; i += RPC_CALL_CONCURRENCY) {
          const chunk = tasks.slice(i, i + RPC_CALL_CONCURRENCY);
          const chunkResults = await Promise.all(chunk.map((task) => task()));
          results.push(...chunkResults);

          if (i + RPC_CALL_CONCURRENCY < tasks.length) {
            await sleep(RPC_CHUNK_DELAY_MS);
          }
        }
        let foundAny = false;
        const failedResults: Array<Extract<AllUsersQueryResult, { success: false }>> = [];
        
        for (const result of results) {
          if (result.success) {
            newUsers.push(result.address.toLowerCase());
            foundAny = true;
          } else {
            failedResults.push(result);
          }
        }

        if (failedResults.length > 0) {
          const sample = failedResults
            .slice(0, 3)
            .map((r) => `idx=${r.index}, code=${r.code ?? 'N/A'}, reason=${r.reason}`)
            .join(' | ');
          console.warn(
            `[ChainSync] 增量 allUsers 批次存在失败: ${failedResults.length}/${results.length}（范围 ${index}-${Math.min(index + batchSize - 1, maxTries - 1)}），示例: ${sample}`
          );
        }
        
        if (!foundAny) {
          if (failedResults.length > 0) {
            const boundaryError = failedResults[0];
            console.log(
              `[ChainSync] 增量查询到达边界或读取失败，停止于索引 ${boundaryError.index}（code=${boundaryError.code ?? 'N/A'} reason=${boundaryError.reason}）`
            );
          }
          break;
        }
        
        index += batchSize;
        
        if (newUsers.length % 500 === 0) {
          console.log(`[ChainSync] 增量查询已获取 ${newUsers.length} 个新用户...`);
        }
      } catch (error) {
        break;
      }
    }
    
    console.log(`[ChainSync] 增量查询完成，找到 ${newUsers.length} 个新用户`);
    return newUsers;
  } catch (error) {
    console.error('[ChainSync] 获取新用户失败:', error);
    return [];
  }
}

/**
 * 执行增量同步（仅同步新增用户）
 * 比完整同步更快，适合定时任务
 */
export async function syncChainDataIncremental(fields?: string[]): Promise<{
  success: boolean;
  newUsers: number;
  syncedUsers: number;
  failedUsers: number;
  duration: number;
  error?: string;
}> {
  if (syncInProgress) {
    console.log('[ChainSync] 同步任务正在执行中，跳过本次');
    return {
      success: false,
      newUsers: 0,
      syncedUsers: 0,
      failedUsers: 0,
      duration: 0,
      error: 'Sync already in progress',
    };
  }

  syncInProgress = true;
  const startTime = Date.now();
  let newUsers = 0;
  let syncedUsers = 0;
  let failedUsers = 0;

  console.log('[ChainSync] ========== 开始增量同步 ==========');

  try {
    // 获取新增用户
    const users = await getNewUsersFromChain(getLastSyncedIndex());
    newUsers = users.length;

    if (newUsers === 0) {
      console.log('[ChainSync] 无新增用户');
      lastSyncTime = new Date();
      lastError = null;
      updateSyncError(null);
      const state = getFullSyncState();
      lastSyncResult = { totalUsers: state.lastSyncedIndex + newUsers, syncedUsers: 0, failedUsers: 0 };
      syncInProgress = false;
      return {
        success: true,
        newUsers: 0,
        syncedUsers: 0,
        failedUsers: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`[ChainSync] 开始同步 ${newUsers} 个新用户...`);

    // 分批处理新用户
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newUsers / BATCH_SIZE);
      console.log(`[ChainSync] 增量同步批次 ${batchNum}/${totalBatches}`);

      await Promise.all(
        batch.map(async (userAddress) => {
          try {
            const userInfo = await getChainUserInfo(userAddress);
            if (userInfo) {
              const success = await syncUserToDatabase(userAddress, userInfo, fields);
              if (success) {
                syncedUsers++;
              } else {
                failedUsers++;
              }
            } else {
              failedUsers++;
            }
          } catch (error) {
            console.error(`[ChainSync] 处理用户 ${userAddress} 失败:`, error);
            failedUsers++;
          }
        })
      );

      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;
    const newLastSyncedIndex = getLastSyncedIndex() + newUsers;
    updateLastSyncedIndex(newLastSyncedIndex, syncedUsers, null);
    lastSyncTime = new Date();
    lastError = null;
    lastSyncResult = { totalUsers: newLastSyncedIndex, syncedUsers, failedUsers };

    console.log(`[ChainSync] ========== 增量同步完成 ==========`);
    console.log(`[ChainSync] 新增用户: ${newUsers}, 成功: ${syncedUsers}, 失败: ${failedUsers}`);
    console.log(`[ChainSync] 耗时: ${duration}ms`);
    console.log(`[ChainSync] 下次同步索引: ${newLastSyncedIndex}`);

    return {
      success: true,
      newUsers,
      syncedUsers,
      failedUsers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    lastError = error.message;
    updateSyncError(error.message);
    console.error('[ChainSync] 增量同步失败:', error);

    return {
      success: false,
      newUsers,
      syncedUsers,
      failedUsers,
      duration,
      error: error.message,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * 获取同步状态
 */
export function getSyncStatus(): {
  inProgress: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
  lastResult: { totalUsers: number; syncedUsers: number; failedUsers: number } | null;
  lastSyncedIndex: number;
  totalSyncedCount: number;
} {
  const state = getFullSyncState();
  return {
    inProgress: syncInProgress,
    lastSyncTime: lastSyncTime,
    lastError,
    lastResult: lastSyncResult,
    lastSyncedIndex: state.lastSyncedIndex,
    totalSyncedCount: state.totalSyncedCount,
  };
}

/**
 * 重置同步索引
 * 用于需要重新完整同步的场景，清除所有同步进度
 */
export function resetSyncIndex(): void {
  console.log('[ChainSync] 重置同步索引');
  resetSyncState();
  lastSyncTime = null;
  lastError = null;
  lastSyncResult = null;
}

/**
 * 全量重建团队闭包关系
 * 清空所有闭包关系，然后为所有用户重新建立闭包关系
 */
export async function rebuildAllTeamClosure(): Promise<{
  success: boolean;
  totalUsers: number;
  rebuiltUsers: number;
  failedUsers: number;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  const pageSize = 1000;
  let totalUsers = 0;
  let rebuiltUsers = 0;
  let failedUsers = 0;

  console.log('[ChainSync] ========== 开始全量重建团队闭包关系 ==========');

  try {
    // 1. 获取所有用户（不限制激活状态）
    const allUsers: Array<{ wallet_address: string; is_activated: boolean | null }> = [];

    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('users')
        .select('wallet_address, is_activated')
        .range(from, to);

      if (error) {
        throw new Error(`查询用户失败: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allUsers.push(...(data as Array<{ wallet_address: string; is_activated: boolean | null }>));

      if (data.length < pageSize) {
        break;
      }
    }

    totalUsers = allUsers.length;

    if (totalUsers === 0) {
      console.log('[ChainSync] 无用户');
      return {
        success: true,
        totalUsers: 0,
        rebuiltUsers: 0,
        failedUsers: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`[ChainSync] 找到 ${totalUsers} 个用户，开始重建闭包关系...`);

    // 2. 清空所有闭包关系
    const { error: deleteError } = await supabase
      .from('team_closure')
      .delete()
      .neq('id', 0); // 删除所有记录

    if (deleteError) {
      throw new Error(`清空闭包表失败: ${deleteError.message}`);
    }

    console.log('[ChainSync] 已清空 team_closure 表');

    // 3. 逐个用户重建闭包关系
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      try {
        const result = await syncUserTeamClosure(user.wallet_address);
        if (result.insertedRows > 0) {
          rebuiltUsers++;
        }
        
        if ((i + 1) % 10 === 0 || i === allUsers.length - 1) {
          console.log(`[ChainSync] 已处理 ${i + 1}/${totalUsers} 个用户（有新增闭包: ${rebuiltUsers}）`);
        }
      } catch (error) {
        console.error(`[ChainSync] 重建用户 ${user.wallet_address} 闭包关系失败:`, error);
        failedUsers++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ChainSync] ========== 全量重建完成 ==========`);
    console.log(`[ChainSync] 总用户: ${totalUsers}, 成功: ${rebuiltUsers}, 失败: ${failedUsers}`);
    console.log(`[ChainSync] 耗时: ${duration}ms`);

    return {
      success: true,
      totalUsers,
      rebuiltUsers,
      failedUsers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[ChainSync] 全量重建失败:', error);

    return {
      success: false,
      totalUsers,
      rebuiltUsers,
      failedUsers,
      duration,
      error: error.message,
    };
  }
}

// 增量重建进程锁
let isIncrementalRebuildRunning = false;

/**
 * 增量重建团队闭包关系
 * 只处理 users 表中存在但 team_closure 中没有记录的用户
 * 使用进程锁防止并发执行
 */
export async function incrementalRebuildTeamClosure(): Promise<{
  success: boolean;
  totalUsers: number;
  rebuiltUsers: number;
  failedUsers: number;
  skippedUsers: number;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  const pageSize = 1000;

  type CandidateUser = { id: number; wallet_address: string; referrer_address: string | null };

  type RpcPendingUserRow = CandidateUser & { total_pending: number | null };

  const fetchPendingUsersViaRpc = async (limit: number): Promise<{ pendingUsers: CandidateUser[]; totalPending: number }> => {
    const { data, error } = await supabase.rpc('get_pending_team_closure_users', {
      p_limit: limit,
      p_offset: 0,
    });

    if (error) {
      throw new Error(`RPC 查询待重建用户失败: ${error.message}`);
    }

    const rows = (data || []) as RpcPendingUserRow[];
    const totalPending = rows.length > 0 ? Number(rows[0].total_pending || 0) : 0;

    return {
      pendingUsers: rows.map(({ id, wallet_address, referrer_address }) => ({
        id,
        wallet_address,
        referrer_address,
      })),
      totalPending,
    };
  };

  const fetchPendingUsersFallback = async (): Promise<CandidateUser[]> => {
    // 兜底方案：分页拉有推荐人的用户 + 分块命中 descendant_id（兼容不支持子查询过滤的场景）
    const allUsers: CandidateUser[] = [];

    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('users')
        .select('id, wallet_address, referrer_address')
        .not('referrer_address', 'is', null)
        .neq('referrer_address', '')
        .neq('referrer_address', '0x0000000000000000000000000000000000000000')
        .range(from, to);

      if (error) {
        throw new Error(`查询用户失败: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allUsers.push(...(data as CandidateUser[]));

      if (data.length < pageSize) {
        break;
      }
    }

    const usersWithClosureSet = new Set<number>();
    const candidateIds = allUsers.map((u) => u.id);
    const closureLookupChunkSize = 500;

    for (let i = 0; i < candidateIds.length; i += closureLookupChunkSize) {
      const idChunk = candidateIds.slice(i, i + closureLookupChunkSize);
      if (idChunk.length === 0) continue;

      const { data: existingClosures, error: closuresError } = await supabase
        .from('team_closure')
        .select('descendant_id')
        .in('descendant_id', idChunk);

      if (closuresError) {
        throw new Error(`查询已有闭包关系失败: ${closuresError.message}`);
      }

      existingClosures?.forEach((closure: { descendant_id: number | null }) => {
        if (typeof closure.descendant_id === 'number') {
          usersWithClosureSet.add(closure.descendant_id);
        }
      });
    }

    return allUsers.filter((user) => !usersWithClosureSet.has(user.id));
  };
  
  // 检查进程锁
  if (isIncrementalRebuildRunning) {
    return {
      success: false,
      totalUsers: 0,
      rebuiltUsers: 0,
      failedUsers: 0,
      skippedUsers: 0,
      duration: Date.now() - startTime,
      error: '增量重建任务正在执行中，请稍后重试',
    };
  }
  
  isIncrementalRebuildRunning = true;
  console.log('[ChainSync] ========== 开始增量重建团队闭包关系 ==========');
  
  let totalUsers = 0;
  let rebuiltUsers = 0;
  let failedUsers = 0;
  let skippedUsers = 0;

  try {
    const maxUsersPerRun = Number.isFinite(INCREMENTAL_REBUILD_MAX_USERS) && INCREMENTAL_REBUILD_MAX_USERS > 0
      ? Math.floor(INCREMENTAL_REBUILD_MAX_USERS)
      : 100;

    let pendingUsers: CandidateUser[] = [];
    let usersToSync: CandidateUser[] = [];

    try {
      const sqlResult = await fetchPendingUsersViaRpc(maxUsersPerRun);
      pendingUsers = sqlResult.pendingUsers;
      usersToSync = sqlResult.pendingUsers;

      console.log(
        `[ChainSync] RPC 命中待重建用户 ${sqlResult.totalPending} 个，本次按上限处理 ${usersToSync.length} 个`
      );
    } catch (sqlError: any) {
      console.warn(
        `[ChainSync] RPC 筛选失败，回退到兼容模式: ${sqlError?.message || 'UNKNOWN_ERROR'}`
      );
      pendingUsers = await fetchPendingUsersFallback();
      usersToSync = pendingUsers.slice(0, maxUsersPerRun);
    }

    totalUsers = usersToSync.length;

    if (totalUsers === 0) {
      console.log('[ChainSync] 无新增用户需要同步');
      return {
        success: true,
        totalUsers: 0,
        rebuiltUsers: 0,
        failedUsers: 0,
        skippedUsers: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(
      `[ChainSync] 找到 ${pendingUsers.length} 个有推荐人且缺失闭包关系的用户，本次最多处理 ${maxUsersPerRun} 个，实际处理 ${totalUsers} 个...`
    );

    // 3. 逐个用户建立闭包关系
    for (let i = 0; i < usersToSync.length; i++) {
      const user = usersToSync[i];
      try {
        const result = await syncUserTeamClosure(user.wallet_address);
        if (result.insertedRows > 0) {
          rebuiltUsers++;
        } else {
          skippedUsers++;
        }
        
        if ((i + 1) % 10 === 0 || i === usersToSync.length - 1) {
          console.log(`[ChainSync] 已处理 ${i + 1}/${totalUsers} 个新增用户（新增闭包用户: ${rebuiltUsers}，跳过: ${skippedUsers}）`);
        }
      } catch (error) {
        console.error(`[ChainSync] 处理用户 ${user.wallet_address} 闭包关系失败:`, error);
        failedUsers++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ChainSync] ========== 增量重建完成 ==========`);
    console.log(`[ChainSync] 总用户: ${totalUsers}, 新建: ${rebuiltUsers}, 跳过: ${skippedUsers}, 失败: ${failedUsers}`);
    console.log(`[ChainSync] 耗时: ${duration}ms`);

    return {
      success: true,
      totalUsers,
      rebuiltUsers,
      failedUsers,
      skippedUsers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[ChainSync] 增量重建失败:', error);

    return {
      success: false,
      totalUsers,
      rebuiltUsers,
      failedUsers,
      skippedUsers,
      duration,
      error: error.message,
    };
  } finally {
    // 释放进程锁
    isIncrementalRebuildRunning = false;
  }
}
