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
    address: '0xb74857877858E0181C44C22Ab01Ec61772A20B72',
    name: 'DQMCore',
  },
  DQSTAKE: {
    address: '0xCB00E0BC748e79f6441BABe1aB6c6bcD75d5c621',
    name: 'DQStakeCore',
  },
  DQSTAKEMINE: {
    address: '0x39C44Dea9e946BD14ac0504879a84077Ad69DeE6',
    name: 'DQStakeMine',
  },
  DQSTAKEVAULT: {
    address: '0xF3D93557E235a8fA53b82D9CC440E2D661cCdec7',
    name: 'DQStakeVault',
  },
  DQTOKEN: {
    address: '0xf0C9eB94298134f9290f3258e07DcB0716f8891F',
    name: 'DQToken',
  },
  DQCARD: {
    address: '0x68077b4A505CD010734915dccC22d87296c9793D',
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
export const AVE_PAIR_ADDRESS = '0x7569a1baf02779253539a082d213aaef5ff84ec7';

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
