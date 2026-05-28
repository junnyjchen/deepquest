/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x5fBC3382579840E288c56F0594a235Fbcd8C0Ef3',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0x8b304C29Ff9f25157C4744407F220b399e0ADA94',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xb8612FF88C10C4e97eE01C822047aeec2a06F2fe',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xDa292a8AE043f9ebA1673013d0Fb8C645f675E1a',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0xf0C9eB94298134f9290f3258e07DcB0716f8891F',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x68077b4A505CD010734915dccC22d87296c9793D',
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
