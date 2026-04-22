/**
 * ================================================
 *            DeepQuest DApp 配置文件
 * ================================================
 */

// BSC 网络配置
export const BSC_CONFIG = {
  chainId: 56,  // BSC Mainnet
  chainName: 'BNB Smart Chain',
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
};

// BSC Testnet 配置
export const BSC_TESTNET_CONFIG = {
  chainId: 97,  // BSC Testnet
  chainName: 'BNB Smart Chain Testnet',
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
};

// 合约地址配置
// TODO: 部署合约后替换为实际地址
export const CONTRACT_ADDRESSES = {
  // 主网
  mainnet: {
    DQProject: '0x0000000000000000000000000000000000000000', // 待部署
  },
  // 测试网
  testnet: {
    DQProject: '0x0000000000000000000000000000000000000000', // 待部署
  },
};

// BEP20 代币地址
export const BEP20_TOKEN_ADDRESS = '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF';

// 是否使用测试网
export const IS_TESTNET = true;

// 获取当前网络配置
export const getCurrentNetwork = () => {
  return IS_TESTNET ? BSC_TESTNET_CONFIG : BSC_CONFIG;
};

// 获取合约地址
export const getContractAddress = () => {
  return IS_TESTNET ? CONTRACT_ADDRESSES.testnet.DQProject : CONTRACT_ADDRESSES.mainnet.DQProject;
};

// 节点卡牌类型
export const CARD_TYPES = {
  A: 1,  // 500 BEP20, 需要5条线
  B: 2,  // 1500 BEP20, 需要10条线
  C: 3,  // 5000 BEP20, 需要20条线
};

// 节点卡牌信息
export const CARD_INFO = {
  [CARD_TYPES.A]: {
    name: 'A级节点',
    price: '500',
    requiredLines: 5,
    weight: 4,
    level: 'S1',
  },
  [CARD_TYPES.B]: {
    name: 'B级节点',
    price: '1500',
    requiredLines: 10,
    weight: 5,
    level: 'S2',
  },
  [CARD_TYPES.C]: {
    name: 'C级节点',
    price: '5000',
    requiredLines: 20,
    weight: 6,
    level: 'S3',
  },
};

// 质押周期
export const STAKE_PERIODS = [
  { index: 0, days: 30, rate: 5, name: '30天' },
  { index: 1, days: 90, rate: 10, name: '90天' },
  { index: 2, days: 180, rate: 15, name: '180天' },
  { index: 3, days: 360, rate: 20, name: '360天' },
];

// 入金限制
export const INVEST_LIMITS = {
  MIN: '1',        // 最小 1 BEP20
  MAX_START: '10', // 初始最大 10 BEP20
  MAX_FINAL: '200', // 最终最大 200 BEP20
};
