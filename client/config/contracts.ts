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
    address: '0xF8045E6521d38670b139799c99bc5744FB6C7411',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x377CdAf2dACF3a233af8a2F52c98fcB1eFC135eC',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x101d8D4c2f199787e7EA74ADE3d73ED4025ac8e5',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0xc5ea8123C7595536b3F8C55A4B4AA717c9CfcbB7',
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

export const AVE_PAIR_ADDRESS = '0x540a8eee2be3d8bca4d59af43f15b6f1fc0c979c';

export {
  DQPROJECT_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI
} from './contractAbis';
