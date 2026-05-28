/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0xAB72BbcBE736e0baA992fa42b7f0455a3A7a4354',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0x4A925aACF62C5E5989FC84EfDD2f48414633afCd',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0xb515B7aA046fC4DAe5054075ba5cC30d7290c4D7',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x028A04058AE63Cb6C6D1379d53A79E2517589602',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0x5022055E266260759dB3aA34Bcae85658D305d7F',
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
