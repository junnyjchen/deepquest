/**
 * DeepQuest 合约配置
 * 
 * 合约地址（最新 - 2024）：
 * DQT:              0x9CC5c62345BCf133754126007b8Dff1a546E130F
 * DQCard:           0x1d6a57144F263B7c8BD4f4bbB9A9516aabd756A4
 * DQPAIR:           0xe7f2cf83b91d6738813d9d5bfce209ea03c06979
 * DQLPMigrator:      0x8eB742d12488f6689831599e8B12d66090BFE69c
 * DQMAdmin:         0xcB09EF06E60d4F69AF0d2AA63bd74b34C8Fcfe4F
 * DQMCore:          0xa85eE02619F0eD39D7CB9E76ed417005E16c7D97
 * DQMiningStakeCore: 0xEE8327F146b984bD3a57dfbac6B9f9cfdDa82536
 * DQMiningStakeMine: 0xbefe3DE3837eaC1EfbB7bB5A3240250B031304Fc
 * DQMiningStakeVault: 0xf0abfAf1135E07C0bb378b3d1B652D258Ef7cdBF
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0xa85eE02619F0eD39D7CB9E76ed417005E16c7D97',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xEE8327F146b984bD3a57dfbac6B9f9cfdDa82536',
    name: 'DQMiningStakeCore'
  },
  DQTOKEN: {
    address: '0x9CC5c62345BCf133754126007b8Dff1a546E130F',
    name: 'DQT'
  },
  DQCARD: {
    address: '0x1d6a57144F263B7c8BD4f4bbB9A9516aabd756A4',
    name: 'DQCard'
  },
  DQPAIR: {
    address: '0xe7f2cf83b91d6738813d9d5bfce209ea03c06979',
    name: 'DQPAIR'
  },
  DQLPMigrator: {
    address: '0x8eB742d12488f6689831599e8B12d66090BFE69c',
    name: 'DQLPMigrator'
  },
  DQMAdmin: {
    address: '0xcB09EF06E60d4F69AF0d2AA63bd74b34C8Fcfe4F',
    name: 'DQMAdmin'
  },
  DQMiningStakeMine: {
    address: '0xbefe3DE3837eaC1EfbB7bB5A3240250B031304Fc',
    name: 'DQMiningStakeMine'
  },
  DQMiningStakeVault: {
    address: '0xf0abfAf1135E07C0bb378b3d1B652D258Ef7cdBF',
    name: 'DQMiningStakeVault'
  },
  SOL: {
    address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    name: 'SOL'
  }
};
