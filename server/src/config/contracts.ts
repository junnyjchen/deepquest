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
    address: '0xa85eE02619F0eD39D7CB9E76ed417005E16c7D97',
    name: 'DQMCore',
  },
  DQSTAKE: {
    address: '0xEE8327F146b984bD3a57dfbac6B9f9cfdDa82536',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0xbefe3DE3837eaC1EfbB7bB5A3240250B031304Fc',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0xf0abfAf1135E07C0bb378b3d1B652D258Ef7cdBF',
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
