import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// BSC 主网 RPC
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
// BSC RPC 的 eth_getLogs 默认限制约 10000 个区块，这里设置为 5000 避免超限
const BSC_EVENT_BLOCK_STEP = Number(process.env.BSC_EVENT_BLOCK_STEP || 5000);
const BSC_START_BLOCK = Number(process.env.BSC_START_BLOCK || 0);
const BSC_REGISTER_TX_CACHE_DIR = process.env.BSC_REGISTER_TX_CACHE_DIR || path.join(process.cwd(), 'server', 'cache', 'register-tx');

const RPC_RETRY_MAX = Number(process.env.BSC_RPC_RETRY_MAX || 3);
const RPC_RETRY_BASE_DELAY_MS = Number(process.env.BSC_RPC_RETRY_BASE_DELAY_MS || 300);

// 合约地址
const DQ_CONTRACT = '0xD6C7f9a6460034317294c52FDc056C548fbd0040';

// DQProject ABI - 只包含 register 和 Register 事件
const DQ_ABI = [
  // register 函数
  "function register(address _referrer) external",
  // Register 事件
  "event Register(address indexed user, address indexed referrer)",
  // getUser 函数 - 返回7个值（无 lpShares 字段）
  "function getUser(address) view returns (address, uint256, uint8, uint256, uint256, uint256, uint8)"
];

// 复用 Provider，避免重复创建连接
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, undefined, {
  batchMaxCount: 1,
});

type RegisterTxCachePayload = {
  walletAddress: string;
  txHash: string;
  cachedAt: string;
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

    const contract = getContract();
    const filter = contract.filters.Register(normalizedAddress, null);

    // 分段区块查询，避免一次扫全链导致超时/限流
    const latestBlock = await withRpcRetry(
      () => provider.getBlockNumber(),
      `getBlockNumber()`
    );

    const fromStart = Number.isFinite(BSC_START_BLOCK) && BSC_START_BLOCK >= 0 ? BSC_START_BLOCK : 0;
    const step = Number.isFinite(BSC_EVENT_BLOCK_STEP) && BSC_EVENT_BLOCK_STEP > 0 ? BSC_EVENT_BLOCK_STEP : 50000;

    for (let fromBlock = fromStart; fromBlock <= latestBlock; fromBlock += step) {
      const toBlock = Math.min(fromBlock + step - 1, latestBlock);

      let events = await withRpcRetry(
        () => contract.queryFilter(filter, fromBlock, toBlock),
        `queryFilter(Register, ${fromBlock}-${toBlock})`
      );

      // 如果遇到 limit exceeded 错误，缩小步长重试
      if (events.length === 0) {
        // 如果当前区块范围太大（超过 10000），尝试缩小步长
        if (toBlock - fromBlock > 8000) {
          const smallStep = 2000;
          for (let smallFrom = fromBlock; smallFrom <= toBlock; smallFrom += smallStep) {
            const smallTo = Math.min(smallFrom + smallStep - 1, toBlock);
            try {
              const smallEvents = await contract.queryFilter(filter, smallFrom, smallTo);
              events = events.concat(smallEvents);
            } catch (err: any) {
              // 如果还是失败，继续下一个分段
              console.warn(`[BSC] 分段查询失败 ${smallFrom}-${smallTo}: ${err.message}`);
            }
          }
        }
      }

      if (events.length > 0) {
        const sortedEvents = [...events].sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
          return (a.index ?? 0) - (b.index ?? 0);
        });

        const txHash = sortedEvents[0].transactionHash;
        writeRegisterTxCache(normalizedAddress, txHash);
        console.log(
          `[BSC] 找到用户 ${walletAddress} 的注册交易: ${txHash}（区块范围 ${fromBlock}-${toBlock}）`
        );
        return txHash;
      }
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

    const contract = getContract();
    const userInfo = await withRpcRetry(
      () => contract.getUser(walletAddress),
      `getUser(${walletAddress})`
    );
    
    // getUser 返回数组: [referrer, directCount, level, totalInvest, teamInvest, energy, dLevel]
    return {
      referrer: userInfo[0],
      directCount: userInfo[1]?.toString() || '0',
      level: userInfo[2]?.toString() || '0',
      totalInvest: userInfo[3]?.toString() || '0',
      teamInvest: userInfo[4]?.toString() || '0',
      energy: userInfo[5]?.toString() || '0',
      dLevel: userInfo[6]?.toString() || '0',
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
