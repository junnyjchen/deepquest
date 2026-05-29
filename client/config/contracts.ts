/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x15f6Cc620078f3CfE3FC3cA1290f7471cF404867',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xb56549F28A33d3562D3D87465dB234FC05Bc8E0d',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x2C56251b0d0021F82C19aE8cbC48BC46fAaC28f9',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xf90605334e85d3C8d0d9022F93BC2dfBAe4B20Db',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0x60c28616374579D7483BBb5f26fF319b0748576a',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0xbe5a39720fDB02fDf744F592350bAB9cd882e785',
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
