/**
 * DeepQuest 合约配置
 * 
 * 合约地址（最新）：
 * 主合约（DQMining）：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * 质押合约（DQMiningStake）：0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * 
 * ABI 来源：assets/DQMining.sol (基于合约源码生成)
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E',
    name: 'DQProject'
  },
  DQSTAKE: {
    address: '0x666197e39dB9bA342De02aE969Ea76EdE6709823',
    name: 'DQMiningStake'
  },
  DQTOKEN: {
    address: '0x0000000000000000000000000000000000000000', // 待确认
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x0000000000000000000000000000000000000000', // 待确认
    name: 'DQCard'
  }
};

/**
 * DQ 主合约 ABI（完整定义，基于源码生成）
 * 合约地址: 0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * 
 * 核心功能：
 * 1. 用户注册与推荐关系管理 (register)
 * 2. SOL 充值与投资管理 (depositSOL)
 * 3. DQ Token 交易（买入/卖出）(swapSOLForDQ, sellDQForSOL)
 * 4. 流动性管理（添加/移除 LP）(addLiquidityForUser)
 * 5. 节点购买与升级 (buyNode)
 * 6. 收益分配与提取 (claimReward, claimLP, claimNft, claimDTeam, claimFee)
 * 7. 质押挖矿 (stakeDQ, unstakeDQ, claimStakeReward)
 * 
 * 主要事件：
 * - Register: 用户注册事件
 * - Deposit: 用户充值事件
 * - SwapSOLForDQ: SOL 兑换 DQ 事件
 * - SwapAndAddLP: 添加流动性事件
 * - SellDQ: 卖出 DQ 事件
 * - ClaimReward: 领取奖励事件
 * - DLevelUpdated: D等级更新事件
 * - MgrReward: 管理奖发放事件
 * 
 * 关键查询函数：
 * - getUser(address): 获取用户信息，返回 9 个值
 *   [referrer, directCount, level, totalInvest, teamInvest, energy, dLevel, validAddressCount, pendingSOL]
 * - allUsers(uint256): 通过索引获取用户地址
 * - getTeamSize(address): 获取团队人数
 * - getDailyLimit(): 获取每日限额
 * - getPendingSOL(address): 获取待领取SOL
 */
export const DQPROJECT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "Deposit", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }], "name": "DLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "validCount", "type": "uint256" }], "name": "DLevelUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "diffRate", "type": "uint8" }], "name": "MgrReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }], "name": "NodeLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "SellDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "l", "type": "uint256" }], "name": "SwapAndAddLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }], "name": "SwapSOLForDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": true, "internalType": "address", "name": "r", "type": "address" }], "name": "Register", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "s", "type": "bool" }], "name": "WhiteListSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "oldPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newLimit", "type": "uint256" }], "name": "PhaseAdvanced", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "partner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ClaimPartnerSOL", "type": "event" },
  { "inputs": [], "name": "BUY_FEE", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "CLAIM_BNB_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "DAO", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "DAO_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "DAILY_LIMIT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "DIRECT_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "ENERGY_MUL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_NODE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_PARTNER_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "INS", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "INS_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "INVEST_MIN", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MGR_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "OP_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PHASE_STEP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SEE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "STAKE_OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "USDT", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "WITHDRAW_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "allUsers", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "currentPhase", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dailyDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "depositWhiteList", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "dqToken", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrRates", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "nftPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodePrices", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodeReq", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "partnerPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "stakeContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "startTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getBnbBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getDailyLimit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getTeamSize", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getUser", "outputs": [{ "internalType": "address", "name": "referrer", "type": "address" }, { "internalType": "uint256", "name": "directCount", "type": "uint256" }, { "internalType": "uint8", "name": "level", "type": "uint8" }, { "internalType": "uint256", "name": "totalInvest", "type": "uint256" }, { "internalType": "uint256", "name": "teamInvest", "type": "uint256" }, { "internalType": "uint256", "name": "energy", "type": "uint256" }, { "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "internalType": "uint256", "name": "validAddressCount", "type": "uint256" }, { "internalType": "uint256", "name": "pendingSOL", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minLp", "type": "uint256" }], "name": "addLiquidityForUser", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "addToBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "advancePhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "approveRouter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_t", "type": "uint256" }], "name": "buyNode", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimDTeam", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimNftSOL", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "claimPartnerBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimPartnerDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimPartnerSOL", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "depositSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distributeFeeToLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distributeFeeToNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_t", "type": "uint8[]" }], "name": "importNodes", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "address[]", "name": "_r", "type": "address[]" }], "name": "importUsers", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "mineBlock", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "nextPhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_r", "type": "address" }], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "removeFromBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "removeLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_dq", "type": "uint256" }, { "internalType": "uint256", "name": "_minSol", "type": "uint256" }], "name": "sellDQForSOL", "outputs": [{ "internalType": "uint256", "name": "solOut", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "stakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setDQCard", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "bool", "name": "_s", "type": "bool" }], "name": "setDepositWhiteList", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_a", "type": "address" }], "name": "setStakeContract", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minDq", "type": "uint256" }], "name": "swapSOLForDQ", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "unstakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "claimStakeReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "stateMutability": "payable", "type": "receive" }
];

/**
 * DQ Stake 质押合约 ABI（完整定义，基于源码生成）
 * 合约地址: 0x666197e39dB9bA342De02aE969Ea76EdE6709823
 * 
 * 核心功能：
 * 1. LP 流动性挖矿奖励 (claimLP, addLP, rmLP)
 * 2. NFT 分红 (claimNft, distNFT)
 * 3. 团队奖励/分红 (claimD, distDTeam)
 * 4. 手续费分红 (claimFee)
 * 5. 合伙人奖励 (claimPdq, claimPbnb)
 * 6. 质押挖矿 (stake, unstake, clmS)
 * 7. D等级分红 (registerDLevel, claimDLevelReward, getDLevelReward)
 * 8. 销毁功能 (addPendingBurn, executeBurn)
 */
export const DQSTAKE_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimNft", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimDTeam", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPdq", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPbnb", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "RmLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "dqAmt", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solAmt", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "feeDQ", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "feeSOL", "type": "uint256" }], "name": "RmLPDetails", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "Withdraw", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Stk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Unstk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClmStk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "r", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "b", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "Mine", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "GasFeePaid", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "FoundationDistributed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "totalPending", "type": "uint256" }], "name": "PendingBurnAdded", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "lpRemoved", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "dqBurned", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solReceived", "type": "uint256" }], "name": "ExecuteBurn", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "LpReceived", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "lpAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "dqReceived", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solReceived", "type": "uint256" }], "name": "InitPoolDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "dqAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "name": "AddLiquidity", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "oldLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "newLevel", "type": "uint8" }], "name": "DLevelRegistered", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "DLevelRewardClaimed", "type": "event" },
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "dq", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "dc", "outputs": [{ "internalType": "contract IDQCard", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "mc", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "miningContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lpPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "claimGasFee", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "feeRecipient", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_RECEIVER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "LP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "NFT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "RT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "IB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PARTNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "D_LEVEL_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "LP_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pendingBurn", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "contractLpBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalBurned", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MIN_BURN_AMOUNT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "INITIAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "releasedSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "SP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "tS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pDA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pBA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pDD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pBD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "br", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "fA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "lF", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "fp", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "tLP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD0", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD1", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD2", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dd", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dl", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sAmt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isB", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }, { "internalType": "address", "name": "", "type": "address" }], "name": "isDLevel", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userDLevel", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dLevelRewardDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelAccReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setDQCard", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_fee", "type": "uint256" }], "name": "setClaimGasFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setFeeRecipient", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "a", "type": "address" }], "name": "setM", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "bool", "name": "s", "type": "bool" }], "name": "bl", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setMiningContract", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_pair", "type": "address" }], "name": "setLpPair", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint8", "name": "_newLevel", "type": "uint8" }], "name": "registerDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimDLevelReward", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getDLevelReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "addLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "distNFT", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimD", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPdq", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPbnb", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "rmLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "addPendingBurn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_lpAmount", "type": "uint256" }], "name": "executeBurn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getContractLpBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "receiveLp", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_lpAmount", "type": "uint256" }], "name": "initPoolDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_dqAmount", "type": "uint256" }, { "internalType": "uint256", "name": "_solAmount", "type": "uint256" }], "name": "addLiquidity", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "clmS", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "mine", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "getLP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "getStk", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPartnerReward", "outputs": [{ "internalType": "uint256", "name": "dqReward", "type": "uint256" }, { "internalType": "uint256", "name": "solReward", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "withdrawBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "stateMutability": "payable", "type": "receive" }
];

// Token ABI
export const DQTOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function burn(uint256 amount)",
  "function burnFrom(address account, uint256 amount)",
  "function mint(address to, uint256 amount)"
];

// Card NFT ABI  
export const DQCARD_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function cardType(uint256 tokenId) view returns (uint8)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)"
];
