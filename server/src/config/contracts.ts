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
    address: '0x15f6Cc620078f3CfE3FC3cA1290f7471cF404867',
    name: 'DQMCore',
  },
  DQSTAKE: {
    address: '0x4310fc632D04abE19b32ee0649d6e3cFeB38eBCb',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0x3f0DF91A1bd7A93e59B4329f68cB01a60DbA60C0',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0x92FCBC48D64fb9Cf6245B066d591222703FA07f5',
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
