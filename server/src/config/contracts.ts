/**
 * DeepQuest 合约配置
 * 
 * 主合约（DQMining）：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * 质押合约（DQMiningStake）：0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * DQToken合约：0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B
 * DQCard合约：0x1857aCeDf9b73163D791eb2F0374a328416291a1
 */

/**
 * ========================================
 * 主合约：DQMining_v11
 * 地址：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * ========================================
 * 
 * 主要 API：
 * - register(address _r) - 用户注册（参数：推荐人地址）
 * - depositSOL(uint256 _a) - SOL入金（参数：入金数量）
 * - getUser(address _user) - 查询用户信息
 * - getTeamSize(address _u) - 查询团队人数
 * - getTeamInvest(address _u) - 查询团队投资额
 * - allUsers() - 获取所有用户地址数组（返回 address[]）
 * 
 * 事件：
 * - Register(address indexed u, address indexed r) - 注册事件
 * - Deposit(address indexed u, uint256 a) - 入金事件
 * - SwapSOLForDQ(address indexed u, uint256 s, uint256 d) - SOL换DQ事件
 * - SwapAndAddLP(address indexed u, uint256 s, uint256 d, uint256 l) - Swap并添加LP事件
 * - SellDQ(address indexed u, uint256 d, uint256 s, uint256 f) - 卖出DQ事件
 * 
 * 用户信息结构（getUser 返回）：
 * - referrer: 推荐人地址
 * - directCount: 直推人数
 * - level: 节点等级 (uint8)
 * - totalInvest: 总投资额
 * - teamInvest: 团队投资额
 * - energy: 能量值
 * - lpShares: LP份额
 * - dLevel: D等级 (uint8)
 * 
 * 查询 API：
 * - INVEST_MIN: 最低投资额
 * - SOL: SOL代币地址
 * - OWNER: 合约所有者
 * - stakeContract: 质押合约地址
 * - startTime: 开始时间
 * - getDailyLimit: 每日限额
 * - currentPhase: 当前阶段
 * - dqToken: DQ代币地址
 * - dqCard: DQ卡牌地址
 * - isBlacklisted(address): 黑名单检查
 * - dailyDeposit(address, uint): 用户每日入金
 * - getCurrentMaxInvest: 当前最大投资额
 */

/**
 * ========================================
 * 质押合约：DQMiningStake
 * 地址：0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * ========================================
 * 
 * 主要 API：
 * - addLP(address _user, uint256 _amount) - 添加LP份额（由主合约调用）
 * - stake(uint256 _amount, uint256 _period) - 质押DQ（参数：质押数量、质押周期）
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

// 合约地址配置
export const DQ_CONTRACT_ADDRESS = '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E';
export const DQSTAKE_CONTRACT_ADDRESS = '0x666197e39dB9bA342De02aE969Ea76EdE6709823';
export const DQTOKEN_CONTRACT_ADDRESS = '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B';
export const DQCARD_CONTRACT_ADDRESS = '0x1857aCeDf9b73163D791eb2F0374a328416291a1';

/**
 * DQ 主合约 ABI（DQMining_v11）
 */
export const DQ_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":true,"internalType":"address","name":"r","type":"address"}],"name":"Register","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"Deposit","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"}],"name":"SwapSOLForDQ","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"l","type":"uint256"}],"name":"SwapAndAddLP","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"f","type":"uint256"}],"name":"SellDQ","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"bool","name":"s","type":"bool"}],"name":"WhiteListSet","type":"event"},
  {"inputs":[],"name":"INVEST_MIN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"SOL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"stakeContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"allUsers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getDailyLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"currentPhase","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqToken","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqCard","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUser","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint8","name":"level","type":"uint8"},{"internalType":"uint256","name":"totalInvest","type":"uint256"},{"internalType":"uint256","name":"teamInvest","type":"uint256"},{"internalType":"uint256","name":"energy","type":"uint256"},{"internalType":"uint256","name":"lpShares","type":"uint256"},{"internalType":"uint8","name":"dLevel","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_r","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"depositSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamSize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"dailyDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getCurrentMaxInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_a","type":"address"}],"name":"setStakeContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"indexed":false,"internalType":"bool","name":"_s","type":"bool"}],"name":"setDepositWhiteList","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"address[]","name":"_r","type":"address[]"}],"name":"importUsers","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"uint8[]","name":"_t","type":"uint8[]"}],"name":"importNodes","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

/**
 * 质押合约 ABI（DQMiningStake）
 */
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
