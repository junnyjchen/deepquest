/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQADMIN: {
    address: '0xf6E4ab5e212cACC52dF1927F8AF9d99B2b7590b5',
    name: 'DQMAdmin',
  },
  DQPROJECT: {
    address: '0xc99C923703D1dAb41B92ABF59D5a35d3a9375B34',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xa261563844F240D2e2B68BA1aB38Ae05d52D50De',
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
  DQADMIN_ABI,
  DQPROJECT_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI
} from './contractAbis';
