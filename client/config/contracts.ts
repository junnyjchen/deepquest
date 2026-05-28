/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0xa85eE02619F0eD39D7CB9E76ed417005E16c7D97',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xEE8327F146b984bD3a57dfbac6B9f9cfdDa82536',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xbefe3DE3837eaC1EfbB7bB5A3240250B031304Fc',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xf0abfAf1135E07C0bb378b3d1B652D258Ef7cdBF',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0x9CC5c62345BCf133754126007b8Dff1a546E130F',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x1d6a57144F263B7c8BD4f4bbB9A9516aabd756A4',
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
