/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x6003B9Ae7940C287f1610d1ab4Fb10e6c97D77a4',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xb6Aa2F51d4C9b64c1cb50F005aAd3c5d3f9CC789',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xae1c9598426B6481d4689752BCeE2505c79bcab8',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x78Aa71730Da0103ED9A57EEce92B227C502918ca',
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
