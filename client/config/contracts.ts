/**
 * DeepQuest 合约配置
 * 合约地址（主网）
 */

/**
 * ========================================
 * 主合约：DQMining_v11
 * 地址：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * ========================================
 * 
 * 主要 API：
 * - register(address _r) - 用户注册（参数：推荐人地址）
 * - depositSOL() - SOL入金（ payable，需要发送 SOL）
 * - getUser(address _user) - 查询用户信息
 * - getUserDeposit(address _user) - 查询用户入金信息
 * - allUsers(uint256) - 获取所有用户地址列表
 * - owner() - 获取合约所有者
 * 
 * 事件：
 * - Register(address indexed u, address indexed r) - 注册事件
 * - Deposit(address indexed u, uint256 a) - 入金事件
 * 
 * 用户信息结构：
 * - referrer: 推荐人地址
 * - directCount: 直推人数
 * - level: 节点等级
 * - totalInvest: 总投资额
 * - teamInvest: 团队投资额
 * - energy: 能量值
 */

/**
 * ========================================
 * 质押合约：DQMiningStake
 * 地址：0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * ========================================
 * 
 * 主要 API：
 * - addLP(address _user, uint256 _amount) - 添加LP份额（由主合约调用）
 * - stake(uint256 _amount, uint256 _period) - 质押DQ（参数：质押数量、质押周期 30/90/180/360）
 * - unstake(uint256 _period) - 解押（参数：质押周期索引）
 * - claimLP() - 领取LP奖励
 * - claimNft() - 领取NFT奖励
 * - claimDTeam() - 领取D代币团队奖励
 * - mine() - 挖矿产出
 * 
 * 查询 API：
 * - getUserStakeInfo(address _user) - 查询用户质押信息
 * - getUserClaim(address _user) - 查询用户可领取奖励
 */

/**
 * ========================================
 * Token 合约
 * ========================================
 * 
 * DQToken: 0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B
 * DQCard: 0x1857aCeDf9b73163D791eb2F0374a328416291a1
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E',
    name: 'DQProject (DQMining_v11)'
  },
  DQSTAKE: {
    address: '0x666197e39dB9bA342De02aE969Ea76EdE6709823',
    name: 'DQMiningStake'
  },
  DQTOKEN: {
    address: '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x1857aCeDf9b73163D791eb2F0374a328416291a1',
    name: 'DQCard'
  }
};

// 主合约 ABI (DQMining_v11)
export const DQPROJECT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":true,"internalType":"address","name":"r","type":"address"}],"name":"Register","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"Deposit","type":"event"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_r","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"depositSOL","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUser","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint256","name":"level","type":"uint256"},{"internalType":"uint256","name":"totalInvest","type":"uint256"},{"internalType":"uint256","name":"teamInvest","type":"uint256"},{"internalType":"uint256","name":"energy","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserDeposit","outputs":[{"internalType":"uint256","name":"totalDeposit","type":"uint256"},{"internalType":"uint256","name":"directDeposit","type":"uint256"},{"internalType":"uint256","name":"teamDeposit","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
];

// 质押合约 ABI (DQMiningStake)
export const DQSTAKE_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"addLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_period","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_period","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimNft","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimDTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"mine","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserStakeInfo","outputs":[{"internalType":"uint256","name":"totalStake","type":"uint256"},{"internalType":"uint256","name":"pendingLP","type":"uint256"},{"internalType":"uint256","name":"pendingNft","type":"uint256"},{"internalType":"uint256","name":"pendingDTeam","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserClaim","outputs":[{"internalType":"uint256","name":"lpReward","type":"uint256"},{"internalType":"uint256","name":"nftReward","type":"uint256"},{"internalType":"uint256","name":"dTeamReward","type":"uint256"}],"stateMutability":"view","type":"function"}
];
