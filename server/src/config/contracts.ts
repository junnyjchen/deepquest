import fs from 'fs';
import path from 'path';
import type { InterfaceAbi } from 'ethers';

const ABI_ASSETS_DIR = path.resolve(process.cwd(), '../assets');

function extractJsonArray(raw: string, fileName: string): string {
  const start = raw.indexOf('[');
  if (start === -1) {
    throw new Error(`ABI array not found: ${fileName}`);
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < raw.length; index++) {
    const char = raw[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '[') {
      depth++;
      continue;
    }

    if (char === ']') {
      depth--;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  throw new Error(`ABI array not terminated: ${fileName}`);
}

function loadAbi(fileName: string): InterfaceAbi {
  const filePath = path.join(ABI_ASSETS_DIR, fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(extractJsonArray(raw, fileName)) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid ABI payload: ${fileName}`);
  }

  return parsed as InterfaceAbi;
}

export const DQPROJECT_ABI = loadAbi('DQMCore.txt');
export const DQSTAKE_ABI = loadAbi('DQMiningStakeCore.txt');
export const DQSTAKEMINE_ABI = loadAbi('DQMiningStakeMine.txt');
export const DQSTAKEVAULT_ABI = loadAbi('DQMiningStakeVault.txt');
export const DQTOKEN_ABI = loadAbi('DQT.txt');
export const DQCARD_ABI = loadAbi('DQC.txt');

export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x85f20cD995e36C19419AfB71559a7234a153EF2f',
    name: 'DQMCore',
  },
  DQSTAKE: {
    address: '0xF8045E6521d38670b139799c99bc5744FB6C7411',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0xCf8B03F7F89d53277D4Bc7A6B957fD35B9f15a4b',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0x101d8D4c2f199787e7EA74ADE3d73ED4025ac8e5',
    name: 'DQStakeVault',
  },
  DQTOKEN: {
    address: '0xc5ea8123C7595536b3F8C55A4B4AA717c9CfcbB7',
    name: 'DQToken',
  },
  DQCARD: {
    address: '0xbe5a39720fDB02fDf744F592350bAB9cd882e785',
    name: 'DQCard',
  },
  SOL: {
    address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    name: 'SOL',
  },
} as const;

export const DQ_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQPROJECT.address;
export const DQSTAKE_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQSTAKE.address;
export const DQSTAKEMINE_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQSTAKEMINE.address;
export const DQSTAKEVAULT_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQSTAKEVAULT.address;
export const DQTOKEN_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQTOKEN.address;
export const DQCARD_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DQCARD.address;
export const SOL_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.SOL.address;

export const DQ_ABI = DQPROJECT_ABI;

// Pair 地址在当前仓库里没有新的部署来源，先保留现网配置。
export const AVE_PAIR_ADDRESS = '0x540a8eee2be3d8bca4d59af43f15b6f1fc0c979c';

export const AVE_PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];
