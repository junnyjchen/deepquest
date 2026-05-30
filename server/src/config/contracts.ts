import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { InterfaceAbi } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ABI_ASSETS_DIR = path.resolve(__dirname, '../../assets');

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
    address: '0x85048453494D566B3380597BBDB620908c6Cda2b',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0x56EB211640313d5321B703cd85D80Eb61C5e7cfb',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0xFbD0B35C2B9e97c0a381677cCc2006C7Abe02aDE',
    name: 'DQStakeVault',
  },
  DQTOKEN: {
    address: '0x60c28616374579D7483BBb5f26fF319b0748576a',
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
export const AVE_PAIR_ADDRESS = '0x79de8b515dc8e4d78b1fca79e89d8971182cb2c2';

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
