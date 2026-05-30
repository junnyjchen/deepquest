/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x85f20cD995e36C19419AfB71559a7234a153EF2f',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0x85048453494D566B3380597BBDB620908c6Cda2b',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x56EB211640313d5321B703cd85D80Eb61C5e7cfb',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xFbD0B35C2B9e97c0a381677cCc2006C7Abe02aDE',
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
