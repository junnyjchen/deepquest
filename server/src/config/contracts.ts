/**
 * ========================================
 * 主合约：DQMining_v11 (Genesis)
 * 地址：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * 链上验证：https://bscscan.com/address/0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E#code
 * ========================================
 * 
 * 【主要 API】
 * - register(address _r) - 用户注册
 * - depositSOL(uint256 _a) - SOL 入金
 * - getUser(address _u) - 查询用户信息
 * - getTeamSize(address _u) - 团队人数
 * - allUsers(uint256) - 获取用户地址
 * 
 * - buyNode(uint256 _t) - 购买节点
 * - stakeDQ(uint256 _amount, uint256 _periodIndex) - 质押 DQ
 * - unstakeDQ(uint256 _periodIndex) - 解押 DQ
 * - claimDTeam() - 领取团队奖励
 * - claimFee() - 领取手续费
 * - claimLP() - 领取 LP
 * - claimNft() - 领取 NFT
 * 
 * - swapSOLForDQ(uint256 _s, uint256 _minDq) - SOL 兑换 DQ
 * - sellDQForSOL(uint256 _d, uint256 _minSol) - DQ 卖出
 * - withdraw(uint256 _a) - 提现
 * - mineBlock() - 挖矿
 * 
 * 【事件 Events】
 * - Deposit(u, a)
 * - Register(u, r)
 * - SwapSOLForDQ(u, s, d)
 * - SwapAndAddLP(u, s, d, l)
 * - SellDQ(u, d, s, f)
 * 
 * 【用户信息 getUser() 返回 7 个字段】
 * - [0] referrer: address
 * - [1] directCount: uint256
 * - [2] level: uint8
 * - [3] totalInvest: uint256
 * - [4] teamInvest: uint256
 * - [5] energy: uint256
 * - [6] dLevel: uint8
 */

/**
 * ========================================
 * 质押合约：DQMiningStake
 * 地址：0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * ========================================
 * 
 * 【主要 API】
 * - addLP(address _user, uint256 _amount) - 添加 LP（由主合约调用）
 * - stake(uint256 _amount, uint256 _period) - 质押
 * - unstake(uint256 _period) - 解押
 * - claimLP() - 领取 LP
 * - claimNft() - 领取 NFT
 * - claimDTeam() - 领取团队奖励
 * - mine() - 挖矿
 */

// 主合约地址
export const DQ_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E';

// 质押合约地址
export const DQSTAKE_CONTRACT_ADDRESS = process.env.DQSTAKE_CONTRACT_ADDRESS || '0x666197e39dB9bA342De02aE969Ea76EdE6709823';

// 主合约 ABI
export const DQ_ABI = [
  "constructor()",
  "function BUY_FEE() view returns (address)",
  "function DAILY_LIMIT() view returns (uint256)",
  "function DAO_RATE() view returns (uint256)",
  "function DIRECT_RATE() view returns (uint256)",
  "function ENERGY_MUL() view returns (uint256)",
  "function FOUNDATION() view returns (address)",
  "function INS() view returns (address)",
  "function INS_RATE() view returns (uint256)",
  "function INVEST_MIN() view returns (uint256)",
  "function OP() view returns (address)",
  "function OP_RATE() view returns (uint256)",
  "function OWNER() view returns (address)",
  "function PHASE_STEP() view returns (uint256)",
  "function ROUTER() view returns (address)",
  "function SEE_RATE() view returns (uint256)",
  "function SOL() view returns (address)",
  "function STAKE_OP() view returns (address)",
  "function USDT() view returns (address)",
  "function addLiquidityForUser(uint256 _s, uint256 _minLp) returns (uint256)",
  "function addToBlacklist(address _u)",
  "function adminWithdrawDQ(uint256 _a)",
  "function adminWithdrawSOL(uint256 _a)",
  "function advancePhase()",
  "function allUsers(uint256) view returns (address)",
  "function approveRouter()",
  "function buyNode(uint256 _t)",
  "function claimDTeam()",
  "function claimFee()",
  "function claimLP()",
  "function claimNft()",
  "function claimPartnerBNB()",
  "function claimPartnerDQ()",
  "function claimStakeReward(uint256)",
  "function community() view returns (address)",
  "function communityRate() view returns (uint256)",
  "function currentPhase() view returns (uint256)",
  "function depositSOL(uint256 _a)",
  "function getConfig() view returns (address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getDailyLimit() view returns (uint256)",
  "function getRate(address) view returns (uint256)",
  "function getReward(address _u) view returns (uint256)",
  "function getSwapReward(address _u) view returns (uint256)",
  "function getTeamSize(address _u) view returns (uint256)",
  "function getUser(address _u) view returns (address, uint256, uint8, uint256, uint256, uint256, uint8)",
  "function isBlacklist(address) view returns (bool)",
  "function isWhitelist(address) view returns (bool)",
  "function lastProcessedId() view returns (uint256)",
  "function liquidity() view returns (uint256)",
  "function liquidityRate() view returns (uint256)",
  "function maxPhase() view returns (uint256)",
  "function minBuySol() view returns (uint256)",
  "function owner() view returns (address)",
  "function processedDividend() view returns (uint256)",
  "function register(address _r)",
  "function removeBlacklist(address _u)",
  "function renounceOwnership()",
  "function sellDQForSOL(uint256 _d, uint256 _minSol)",
  "function setCommunity(address _c)",
  "function setWhitelist(address _u, bool _s)",
  "function swapSOLForDQ(uint256 _s, uint256 _minDq) payable",
  "function teamReward() view returns (uint256)",
  "function totalDeposit() view returns (uint256)",
  "function totalReward() view returns (uint256)",
  "function totalSold() view returns (uint256)",
  "function transferOwnership(address)",
  "function withdraw(uint256 _a)",
  "function mineBlock()",
  "function stakeDQ(uint256 _amount, uint256 _periodIndex)",
  "function unstakeDQ(uint256 _periodIndex)",
  "event Deposit(address indexed u, uint256 a)",
  "event Register(address indexed u, address indexed r)",
  "event SellDQ(address indexed u, uint256 d, uint256 s, uint256 f)",
  "event SwapAndAddLP(address indexed u, uint256 s, uint256 d, uint256 l)",
  "event SwapSOLForDQ(address indexed u, uint256 s, uint256 d)",
  "event WhiteListSet(address indexed u, bool s)"
];

// 质押合约 ABI
export const DQSTAKE_CONTRACT_ABI = [
  // 待补充质押合约 ABI
];
