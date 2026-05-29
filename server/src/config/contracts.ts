import type { InterfaceAbi } from 'ethers';
import * as contractAbisModule from '../../../client/config/contractAbis.ts';

const ABI_SOURCE = contractAbisModule as Record<string, unknown>;

export const DQPROJECT_ABI = ABI_SOURCE.DQPROJECT_ABI as InterfaceAbi;
export const DQSTAKE_ABI = ABI_SOURCE.DQSTAKE_ABI as InterfaceAbi;
export const DQSTAKEMINE_ABI = ABI_SOURCE.DQSTAKEMINE_ABI as InterfaceAbi;
export const DQSTAKEVAULT_ABI = ABI_SOURCE.DQSTAKEVAULT_ABI as InterfaceAbi;
export const DQTOKEN_ABI = ABI_SOURCE.DQTOKEN_ABI as InterfaceAbi;
export const DQCARD_ABI = ABI_SOURCE.DQCARD_ABI as InterfaceAbi;

export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x3c07e260CB39FefF5DC2893AB3E9e85e5B115253',
    name: 'DQMCore',
  },
  DQSTAKE: {
    address: '0xaC4218d9b3c135027DdfF7ebe73dB4bF1DE527C8',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0xcF6B223f3E1ecFCCeC76EBB49Bf695EEac959799',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0x6231aDc19a9870Ac4cdc45101Df61f7954c02792',
    name: 'DQStakeVault',
  },
  DQTOKEN: {
    address: '0x9CC5c62345BCf133754126007b8Dff1a546E130F',
    name: 'DQToken',
  },
  DQCARD: {
    address: '0x1d6a57144F263B7c8BD4f4bbB9A9516aabd756A4',
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
export const AVE_PAIR_ADDRESS = '0xe7f2cf83b91d6738813d9d5bfce209ea03c06979';

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
