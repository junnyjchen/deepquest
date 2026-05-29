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
    address: '0x4310fc632D04abE19b32ee0649d6e3cFeB38eBCb',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x3f0DF91A1bd7A93e59B4329f68cB01a60DbA60C0',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x92FCBC48D64fb9Cf6245B066d591222703FA07f5',
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
