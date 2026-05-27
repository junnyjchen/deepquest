/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x65767e3564f6060Ce0844B23aB6A5B2ed4019491',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0x40c62053Ee493911C4f517a9824ba12AE74A9cd4',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xCcFdD942093AEeD0f41CC16c2834602b6548F8ea',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xCcFdD942093AEeD0f41CC16c2834602b6548F8ea',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x7CE9bbb974dedf191e99964278ff9d9d955a8E7C',
    name: 'DQCard'
  },
  SOL: {
    address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    name: 'SOL'
  }
};

export {
  DQPROJECT_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI
} from './contractAbis';
