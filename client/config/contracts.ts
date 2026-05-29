/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x3c07e260CB39FefF5DC2893AB3E9e85e5B115253',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xaC4218d9b3c135027DdfF7ebe73dB4bF1DE527C8',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xcF6B223f3E1ecFCCeC76EBB49Bf695EEac959799',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x6231aDc19a9870Ac4cdc45101Df61f7954c02792',
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
