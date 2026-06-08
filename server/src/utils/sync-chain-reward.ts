import { ethers } from 'ethers';
import { getSupabaseClient } from '../storage/database/supabase-client';
import {
	DQSTAKE_ABI,
	DQSTAKEVAULT_ABI,
	DQSTAKE_CONTRACT_ADDRESS,
	DQSTAKEVAULT_CONTRACT_ADDRESS,
} from '../config/contracts.ts';
import {
	getFullRewardSyncState,
	initSyncStateFile,
	resetRewardSyncState,
	updateRewardSyncError,
	updateRewardSyncState,
} from './sync-state';

const supabase = getSupabaseClient();

initSyncStateFile();

const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const REWARD_SYNC_START_BLOCK = Number(process.env.REWARD_SYNC_START_BLOCK || process.env.BSC_START_BLOCK || 0);
const REWARD_SYNC_REORG_BLOCKS = Number(process.env.REWARD_SYNC_REORG_BLOCKS || 6);
const REWARD_EVENT_BATCH_BLOCKS = Number(process.env.REWARD_EVENT_BATCH_BLOCKS || 2000);
const REWARD_EVENT_CACHE_LIMIT = Number(process.env.REWARD_EVENT_CACHE_LIMIT || 5000);
const RPC_RETRY_MAX = Number(process.env.BSC_RPC_RETRY_MAX || 3);
const RPC_RETRY_BASE_DELAY_MS = Number(process.env.BSC_RPC_RETRY_BASE_DELAY_MS || 300);

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, undefined, {
	batchMaxCount: 1,
});

type RewardEventName = 'LPRewardClaimed' | 'StakeRewardClaimed' | 'WithdrawSOL' | 'WithdrawDQ';
type RewardTokenType = 'DQ' | 'SOL';

type RewardEventConfig = {
	eventName: RewardEventName;
	contractAddress: string;
	contractLabel: string;
	iface: ethers.Interface;
	topic: string;
	tokenType: RewardTokenType;
};

type RewardEventRecord = {
	eventId: string;
	rewardType: RewardEventName;
	userAddress: string;
	amount: string;
	tokenType: RewardTokenType;
	fromAddress: string;
	txHash: string;
	blockNumber: number;
	logIndex: number;
	createdAt: string;
};

type RewardSyncSummary = {
	success: boolean;
	fromBlock: number;
	toBlock: number;
	scannedEvents: number;
	insertedEvents: number;
	duration: number;
	error?: string;
};

const stakeCoreInterface = new ethers.Interface(DQSTAKE_ABI);
const stakeVaultInterface = new ethers.Interface(DQSTAKEVAULT_ABI);

const REWARD_EVENT_CONFIGS: RewardEventConfig[] = [
	{
		eventName: 'LPRewardClaimed',
		contractAddress: DQSTAKEVAULT_CONTRACT_ADDRESS.toLowerCase(),
		contractLabel: 'DQStakeVault',
		iface: stakeVaultInterface,
		topic: ethers.id('LPRewardClaimed(address,uint256)'),
		tokenType: 'DQ',
	},
	{
		eventName: 'StakeRewardClaimed',
		contractAddress: DQSTAKEVAULT_CONTRACT_ADDRESS.toLowerCase(),
		contractLabel: 'DQStakeVault',
		iface: stakeVaultInterface,
		topic: ethers.id('StakeRewardClaimed(address,uint8,uint256)'),
		tokenType: 'DQ',
	},
	{
		eventName: 'WithdrawSOL',
		contractAddress: DQSTAKE_CONTRACT_ADDRESS.toLowerCase(),
		contractLabel: 'DQStakeCore',
		iface: stakeCoreInterface,
		topic: ethers.id('WithdrawSOL(address,uint256)'),
		tokenType: 'SOL',
	},
	{
		eventName: 'WithdrawDQ',
		contractAddress: DQSTAKE_CONTRACT_ADDRESS.toLowerCase(),
		contractLabel: 'DQStakeCore',
		iface: stakeCoreInterface,
		topic: ethers.id('WithdrawDQ(address,uint256)'),
		tokenType: 'DQ',
	},
];

let rewardSyncInProgress = false;
let lastRewardSyncTime: Date | null = null;
let lastRewardSyncError: string | null = null;
let lastRewardSyncResult: { scannedEvents: number; insertedEvents: number } | null = null;

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
				`[RewardSync] RPC 重试 ${attempt}/${RPC_RETRY_MAX} - ${label}（code=${code ?? 'N/A'} reason=${reason}）等待 ${delay}ms`
			);
			await sleep(delay);
		}
	}

	throw lastError;
}

function compactRecentEventIds(ids: string[]): string[] {
	if (ids.length <= REWARD_EVENT_CACHE_LIMIT) {
		return ids;
	}

	return ids.slice(ids.length - REWARD_EVENT_CACHE_LIMIT);
}

function formatTokenAmount(value: bigint, decimals = 18): string {
	const formatted = ethers.formatUnits(value, decimals);
	if (!formatted.includes('.')) {
		return formatted;
	}

	return formatted.replace(/\.0+$|(?<=\.\d*?)0+$/g, '');
}

function parseHexNumber(value: string | null | undefined): number {
	return value ? Number.parseInt(value, 16) : 0;
}

function buildRewardEventId(txHash: string, logIndex: number, rewardType: RewardEventName): string {
	return `${txHash.toLowerCase()}:${logIndex}:${rewardType}`;
}

async function getBlockTimestamp(blockNumber: number, cache: Map<number, string>): Promise<string> {
	const cached = cache.get(blockNumber);
	if (cached) {
		return cached;
	}

	const block = await withRpcRetry(
		() => provider.send('eth_getBlockByNumber', [ethers.toQuantity(blockNumber), false]),
		`eth_getBlockByNumber(${blockNumber})`
	) as { timestamp?: string } | null;

	const timestamp = new Date(parseHexNumber(block?.timestamp) * 1000).toISOString();
	cache.set(blockNumber, timestamp);
	return timestamp;
}

async function fetchRewardLogs(
	config: RewardEventConfig,
	fromBlock: number,
	toBlock: number,
	timestampCache: Map<number, string>
): Promise<RewardEventRecord[]> {
	const logs = await withRpcRetry(
		() => provider.send('eth_getLogs', [{
			fromBlock: ethers.toQuantity(fromBlock),
			toBlock: ethers.toQuantity(toBlock),
			address: config.contractAddress,
			topics: [config.topic],
		}]),
		`${config.contractLabel}.${config.eventName}(${fromBlock}-${toBlock})`
	) as Array<{
		address: string;
		blockNumber: string;
		transactionHash: string;
		logIndex: string;
		data: string;
		topics: string[];
	}>;

	const events: RewardEventRecord[] = [];

	for (const log of logs) {
		const parsed = config.iface.parseLog({ data: log.data, topics: log.topics });
		const userAddress = String(parsed?.args?.user || '').toLowerCase();
		const amount = parsed?.args?.amount as bigint | undefined;

		if (!userAddress || amount === undefined) {
			continue;
		}

		const blockNumber = parseHexNumber(log.blockNumber);
		const logIndex = parseHexNumber(log.logIndex);
		events.push({
			eventId: buildRewardEventId(log.transactionHash, logIndex, config.eventName),
			rewardType: config.eventName,
			userAddress,
			amount: formatTokenAmount(amount),
			tokenType: config.tokenType,
			fromAddress: config.contractAddress,
			txHash: log.transactionHash.toLowerCase(),
			blockNumber,
			logIndex,
			createdAt: await getBlockTimestamp(blockNumber, timestampCache),
		});
	}

	return events;
}

async function fetchRewardEvents(fromBlock: number, toBlock: number): Promise<RewardEventRecord[]> {
	if (toBlock < fromBlock) {
		return [];
	}

	const timestampCache = new Map<number, string>();
	const events: RewardEventRecord[] = [];

	for (let start = fromBlock; start <= toBlock; start += REWARD_EVENT_BATCH_BLOCKS) {
		const end = Math.min(start + REWARD_EVENT_BATCH_BLOCKS - 1, toBlock);
		const batchResults = await Promise.all(
			REWARD_EVENT_CONFIGS.map((config) => fetchRewardLogs(config, start, end, timestampCache))
		);
		events.push(...batchResults.flat());
	}

	return events.sort((left, right) => {
		if (left.blockNumber !== right.blockNumber) {
			return left.blockNumber - right.blockNumber;
		}
		return left.logIndex - right.logIndex;
	});
}

async function syncRewardEventToDatabase(event: RewardEventRecord): Promise<boolean> {
	const { data: existingRow, error: existingError } = await supabase
		.from('withdraw_rewards')
		.select('id')
		.eq('tx_hash', event.txHash)
		.eq('reward_type', event.rewardType)
		.eq('user_address', event.userAddress)
		.eq('from_address', event.fromAddress)
		.maybeSingle();

	if (existingError) {
		throw new Error(`查询奖励事件 ${event.eventId} 失败: ${existingError.message}`);
	}

	if (existingRow) {
		return false;
	}

	const { error } = await supabase
		.from('withdraw_rewards')
		.insert({
			user_address: event.userAddress,
			reward_type: event.rewardType,
			amount: event.amount,
			from_address: event.fromAddress,
			tx_hash: event.txHash,
			block_number: event.blockNumber,
			created_at: event.createdAt,
			token_type: event.tokenType,
		});

	if (error) {
		throw new Error(`写入奖励事件 ${event.eventId} 失败: ${error.message}`);
	}

	return true;
}

export async function syncRewardDataIncremental(): Promise<RewardSyncSummary> {
	if (rewardSyncInProgress) {
		return {
			success: false,
			fromBlock: 0,
			toBlock: 0,
			scannedEvents: 0,
			insertedEvents: 0,
			duration: 0,
			error: 'Reward sync already in progress',
		};
	}

	rewardSyncInProgress = true;
	const startedAt = Date.now();

	try {
		const state = getFullRewardSyncState();
		const latestBlock = await withRpcRetry(() => provider.getBlockNumber(), 'provider.getBlockNumber()');
		const toBlock = Math.max(0, latestBlock - REWARD_SYNC_REORG_BLOCKS);
		const fromBlock = state.lastProcessedBlock > 0
			? Math.max(REWARD_SYNC_START_BLOCK, state.lastProcessedBlock - REWARD_SYNC_REORG_BLOCKS + 1)
			: REWARD_SYNC_START_BLOCK;

		if (toBlock < fromBlock) {
			lastRewardSyncTime = new Date();
			lastRewardSyncError = null;
			updateRewardSyncError(null);
			return {
				success: true,
				fromBlock,
				toBlock,
				scannedEvents: 0,
				insertedEvents: 0,
				duration: Date.now() - startedAt,
			};
		}

		const events = await fetchRewardEvents(fromBlock, toBlock);
		const recentEventIds = new Set(state.recentEventIds);
		const appliedEventIds: string[] = [];
		let insertedEvents = 0;

		for (const event of events) {
			const isHistoricalOverlap = event.blockNumber <= state.lastProcessedBlock;
			if (isHistoricalOverlap && recentEventIds.has(event.eventId)) {
				continue;
			}

			const inserted = await syncRewardEventToDatabase(event);
			appliedEventIds.push(event.eventId);
			if (inserted) {
				insertedEvents++;
			}
		}

		const nowIso = new Date().toISOString();
		updateRewardSyncState({
			lastProcessedBlock: toBlock,
			lastSyncTime: nowIso,
			lastError: null,
			recentEventIds: compactRecentEventIds([...state.recentEventIds, ...appliedEventIds]),
		});

		lastRewardSyncTime = new Date(nowIso);
		lastRewardSyncError = null;
		lastRewardSyncResult = {
			scannedEvents: events.length,
			insertedEvents,
		};

		console.log(`[RewardSync] 奖励增量同步完成，区块 ${fromBlock}-${toBlock}，扫描 ${events.length} 条事件，新增 ${insertedEvents} 条`);

		return {
			success: true,
			fromBlock,
			toBlock,
			scannedEvents: events.length,
			insertedEvents,
			duration: Date.now() - startedAt,
		};
	} catch (error: any) {
		const message = error?.message || 'Reward sync failed';
		lastRewardSyncError = message;
		updateRewardSyncError(message);

		return {
			success: false,
			fromBlock: 0,
			toBlock: 0,
			scannedEvents: 0,
			insertedEvents: 0,
			duration: Date.now() - startedAt,
			error: message,
		};
	} finally {
		rewardSyncInProgress = false;
	}
}

export function resetRewardSyncIndex(): void {
	resetRewardSyncState();
	lastRewardSyncTime = null;
	lastRewardSyncError = null;
	lastRewardSyncResult = null;
}

export function getRewardSyncStatus(): {
	inProgress: boolean;
	lastSyncTime: Date | null;
	lastError: string | null;
	lastResult: { scannedEvents: number; insertedEvents: number } | null;
	lastProcessedBlock: number;
} {
	const state = getFullRewardSyncState();

	return {
		inProgress: rewardSyncInProgress,
		lastSyncTime: lastRewardSyncTime,
		lastError: lastRewardSyncError,
		lastResult: lastRewardSyncResult,
		lastProcessedBlock: state.lastProcessedBlock,
	};
}
