/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQADMIN: {
    address: '0xeb616F19cdE155d6D0D1DC651E184909C37Df1CA',
    name: 'DQMAdmin',
  },
  DQPROJECT: {
    address: '0xF2c09006310941539070bd909B5625284F72D9C9',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xed22AD46B0E167A678822fC29644b21B7619fc21',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x82631029312a92C405f1AB3A87396E1aB992a6EB',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0x64C62bbfDa90294b1E246b7337bDF39078EAcc34',
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
  DQADMIN_ABI,
  DQPROJECT_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI
} from './contractAbis';
