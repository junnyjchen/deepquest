/**
 * DeepQuest 合约配置
 * 
 * 合约地址（最新）：
 * 主合约（DQMining）：0xF5E7b93059A9EEa53191CC0ab9326cA3D87fF6a6
 * 质押合约（DQMiningStake）：0x29b5F72f977Fc989eC4ca8533177529315C53990
 * 
 * ABI 来源：assets/DQMining.sol (基于合约源码生成)
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0xF5E7b93059A9EEa53191CC0ab9326cA3D87fF6a6',
    name: 'DQProject'
  },
  DQSTAKE: {
    address: '0x29b5F72f977Fc989eC4ca8533177529315C53990',
    name: 'DQMiningStake'
  },
  DQTOKEN: {
    address: '0xeD82B38bE28bB1552d0792b978e4361aEf46283e', // 待确认
    name: 'DQToken'
  },
  DQCARD: {
    address: '0xA275d02a6bDc9bd79FdAAD1838a9f5b1F19d032a', // 待确认
    name: 'DQCard'
  },
  SOL: {
    address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    name: 'SOL'
  }
};

/**
 * DQ 主合约 ABI（DQProject / DQMining 项目主合约）
 *
 * 用途：前端通过 ethers / viem 等库调用主合约的读写方法（注册、存取、兑换、领取奖励等）。
 * ABI 来源：`assets/DQMining.sol`（基于合约源码生成并复制到本文件）。
 *
 * 地址说明：
 * - 当前前端实际使用的地址以 `CONTRACT_ADDRESSES.DQPROJECT.address` 为准。
 * - 下面“合约地址”仅为历史/备注，可能已过期。
 *
 * 备注合约地址: 0x732B7f9EF6381120458D49CF4aaaF9a4B780c008
 */
export const DQPROJECT_ABI = [
  // ========== 部署 / 事件 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": true, "internalType": "address", "name": "r", "type": "address" }], "name": "Register", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "Deposit", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "s", "type": "bool" }], "name": "WhiteListSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }], "name": "SwapSOLForDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "l", "type": "uint256" }], "name": "SwapAndAddLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "dqAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solOut", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "burned", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }], "name": "SellDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }], "name": "NodeLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }], "name": "DLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "oldPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newLimit", "type": "uint256" }], "name": "PhaseAdvanced", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }], "name": "ClaimReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "partner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ClaimPartnerSOL", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "partner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ClaimPartnerBNB", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "validCount", "type": "uint256" }], "name": "DLevelUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "diffRate", "type": "uint8" }], "name": "MgrReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "SellDQ", "type": "event" },

  // ========== 常量 / 状态读取（view）==========
  // 读取合约内置常量 OWNER（权限 owner）
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取代币合约地址（DQToken）
  { "inputs": [], "name": "dqToken", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 NFT 卡牌合约地址（DQCard）
  { "inputs": [], "name": "dqCard", "outputs": [{ "internalType": "contract IDQCard", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 USDT 合约地址
  { "inputs": [], "name": "USDT", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 SOL 合约地址（链上 SOL 代币地址）
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 Pancake Router 地址
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取基金会地址
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取运营地址（OP）
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取质押运营地址（STAKE_OP）
  { "inputs": [], "name": "STAKE_OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取保险地址（INS）
  { "inputs": [], "name": "INS", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取买入手续费地址（BUY_FEE）
  { "inputs": [], "name": "BUY_FEE", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 DAO 地址
  { "inputs": [], "name": "DAO", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },

  // 读取当前绑定的 stake 合约地址
  { "inputs": [], "name": "stakeContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取最小入金限制
  { "inputs": [], "name": "INVEST_MIN", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取基础日限额
  { "inputs": [], "name": "DAILY_LIMIT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取阶段开始时间（部署时设置）
  { "inputs": [], "name": "startTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取当前阶段
  { "inputs": [], "name": "currentPhase", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取每阶段增加的额度步长
  { "inputs": [], "name": "PHASE_STEP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取节点价格（index: 0..3）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodePrices", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取节点达标直推要求（index: 0..3）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodeReq", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取直推奖励费率
  { "inputs": [], "name": "DIRECT_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取见点奖励费率
  { "inputs": [], "name": "SEE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取 DAO 补贴费率
  { "inputs": [], "name": "DAO_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取保险费率
  { "inputs": [], "name": "INS_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取运营费率
  { "inputs": [], "name": "OP_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取能量倍数
  { "inputs": [], "name": "ENERGY_MUL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖池费率
  { "inputs": [], "name": "MGR_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖阈值（index: 0..5）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖费率阶梯（index: 0..5）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrRates", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 提现相关：读取提现手续费费率
  { "inputs": [], "name": "WITHDRAW_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给 NFT 的比例
  { "inputs": [], "name": "FEE_NODE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给合伙人的比例
  { "inputs": [], "name": "FEE_PARTNER_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给基金会的比例
  { "inputs": [], "name": "FEE_FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 领取手续费收益时需支付的 BNB 手续费
  { "inputs": [], "name": "CLAIM_BNB_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取 D 等级阈值表（index: 0..7）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取黑名单状态
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  // 读取当日入金额度（用于日限额统计）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dailyDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取是否处于白名单（白名单用户不受日限额约束）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "depositWhiteList", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 读取所有用户数组（按索引取地址）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "allUsers", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 NFT 节点累计待分发的 SOL
  { "inputs": [], "name": "nftPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取合伙人累计待分发的 SOL
  { "inputs": [], "name": "partnerPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 对外可调用方法（写操作 / nonpayable / payable）==========
  // 设置 stake 合约地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_a", "type": "address" }], "name": "setStakeContract", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置入金白名单（owner）：白名单用户不受日限额限制
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "bool", "name": "_s", "type": "bool" }], "name": "setDepositWhiteList", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置/更换 DQCard 合约地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setDQCard", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置基金会地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setFoundation", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 手动进入下一阶段（owner）：阶段 +1，并触发 PhaseAdvanced 事件
  { "inputs": [], "name": "nextPhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户注册推荐人（需未注册）
  { "inputs": [{ "internalType": "address", "name": "_r", "type": "address" }], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 手动设置单个用户推荐人
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "address", "name": "_r", "type": "address" }], "name": "setReferrer", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量导入用户推荐关系（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "address[]", "name": "_r", "type": "address[]" }], "name": "importUsers", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量设置节点等级 S1-S6（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置单个用户节点等级 S1-S6（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置单个用户 D 等级（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量设置用户 D 等级（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量导入节点（owner）：必要时为未注册用户补注册，并按类型铸造卡牌、写入 level
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_t", "type": "uint8[]" }], "name": "importNodes", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户入金（SOL 转入合约，产生动态奖励 + LP 逻辑；需已注册）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "depositSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 管理员代用户入金
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "depositForUser", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 购买节点卡（用 USDT 支付，铸造 DQCard，并按规则给推荐人/基金会分配）
  { "inputs": [{ "internalType": "uint256", "name": "_t", "type": "uint256" }], "name": "buyNode", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 加入黑名单（owner）：黑名单用户不能提现/参与等（具体逻辑见合约）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "addToBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 移出黑名单（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "removeFromBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 授权 Router 进行 SOL/DQ 操作（owner）
  { "inputs": [], "name": "approveRouter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用 SOL 兑换 DQ（包含 buyFee；有滑点保护 minDq），返回实际估算/兑换的 DQ 数量
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minDq", "type": "uint256" }], "name": "swapSOLForDQ", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  // 为用户加流动性（SOL 一半换 DQ、一半配对加池；LP 进入 stake 合约），返回 LP 数量
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minLp", "type": "uint256" }], "name": "addLiquidityForUser", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  // 卖出 DQ 换 SOL（94%销毁 + 6%手续费；从合约 SOL 池出 SOL），返回 solOut
  { "inputs": [{ "internalType": "uint256", "name": "_dq", "type": "uint256" }, { "internalType": "uint256", "name": "_minSol", "type": "uint256" }], "name": "sellDQForSOL", "outputs": [{ "internalType": "uint256", "name": "solOut", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },

  // 领取 LP 分红（转发到 stake 合约）
  { "inputs": [], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取 NFT 分红（转发到 stake 合约）
  { "inputs": [], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取 D 等级分红（团队奖励）（转发到 stake 合约）
  { "inputs": [], "name": "claimDTeam", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取手续费分红（转发到 stake 合约）
  { "inputs": [], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取合伙人 DQ 奖励（转发到 stake 合约）
  { "inputs": [], "name": "claimPartnerDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取合伙人 BNB 奖励（转发到 stake 合约）
  { "inputs": [], "name": "claimPartnerBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户提现（转发到 stake 合约）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 提走 LP（转发到 stake 合约）
  { "inputs": [], "name": "withdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 由 owner 触发 stake 合约挖矿结算（转发）
  { "inputs": [], "name": "mineBlock", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 质押 DQ（把 DQ 转到 stake 合约并记录周期）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "stakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 解押 DQ（按周期 index）
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "unstakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取单币质押奖励（按周期 index）
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "claimStakeReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 将手续费（SOL）分配到 NFT 分红池（触发 stake 合约记录）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distributeFeeToNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 保留：推进阶段（owner；不触发 PhaseAdvanced 事件）
  { "inputs": [], "name": "advancePhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // owner 提走合约内 DQ（应谨慎使用）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // owner 提走合约内 SOL（应谨慎使用）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // ========== 查询方法（view）==========
  // 计算当前阶段日限额（包含 phase step，上限 200 ether）
  { "inputs": [], "name": "getDailyLimit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 获取用户信息（推荐人、直推数、等级、业绩、能量、D等级、有效用户数、待提现余额）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getUser", "outputs": [{ "internalType": "address", "name": "referrer", "type": "address" }, { "internalType": "uint256", "name": "directCount", "type": "uint256" }, { "internalType": "uint8", "name": "level", "type": "uint8" }, { "internalType": "uint256", "name": "totalInvest", "type": "uint256" }, { "internalType": "uint256", "name": "teamInvest", "type": "uint256" }, { "internalType": "uint256", "name": "energy", "type": "uint256" }, { "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "internalType": "uint256", "name": "validAddressCount", "type": "uint256" }, { "internalType": "uint256", "name": "pendingSOL", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 获取团队规模（下级地址数量）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getTeamSize", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户待提现动态奖励余额
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询合约 BNB 余额
  { "inputs": [], "name": "getBnbBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 提现 / 分红相关（写操作）==========
  // 用户提现动态奖励（扣 WITHDRAW_FEE；以 SOL 支付给用户，部分手续费进入待分红池/基金会）
  { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // NFT 持有者收取 SOL 分红（需支付 BNB 手续费 msg.value >= CLAIM_BNB_FEE；实际分发在 stake 合约）
  { "inputs": [], "name": "claimNftSOL", "outputs": [], "stateMutability": "payable", "type": "function" },
  // 合伙人领取 SOL 分红（需支付 BNB 手续费；合伙人地址从 stake 合约读取）
  { "inputs": [], "name": "claimPartnerSOL", "outputs": [], "stateMutability": "payable", "type": "function" },

  // ========== 兜底：接收 BNB ==========
  { "stateMutability": "payable", "type": "receive" }
];

/**
 * DQ Stake 质押合约 ABI（DQMiningStake 质押/LP/燃烧相关合约）
 *
 * 用途：前端调用质押、解押、领取 LP/NFT/团队奖励、执行 burn 等方法。
 * ABI 来源：`assets/DQMiningStake.sol`（基于合约源码生成并复制到本文件）。
 *
 * 地址说明：
 * - 当前前端实际使用的地址以 `CONTRACT_ADDRESSES.DQSTAKE.address` 为准。
 * - 下面“合约地址”仅为历史/备注，可能已过期。
 *
 */
export const DQSTAKE_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimNft", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimDTeam", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPdq", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPbnb", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "Withdraw", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Stk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Unstk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClmStk", "type": "event" },

  // ========== 常量 / 状态读取（view）==========
  // 读取合约内置常量 OWNER（权限 owner）
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "r", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "b", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "Mine", "type": "event" },
  // 读取 DQToken 合约地址
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "GasFeePaid", "type": "event" },
  // 读取 DQCard 合约地址
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  // 读取 SOL 合约地址（链上 SOL 代币地址）
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "FoundationDistributed", "type": "event" },
  // 读取 Router 地址
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "lpAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "dqReceived", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solReceived", "type": "uint256" }], "name": "InitPoolDQ", "type": "event" },
  // 读取 LP Pair 地址
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "dqAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "name": "AddLiquidity", "type": "event" },
  // 读取基金会地址
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "oldLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "newLevel", "type": "uint8" }], "name": "DLevelRegistered", "type": "event" },
  // 读取基金会分配比例
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "DLevelRewardClaimed", "type": "event" },
  // 读取领取收益所需的 gasFee（BNB）
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取手续费接收地址（与 feeRecipient 同义/兼容）
  { "inputs": [], "name": "dq", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取手续费接收地址（FEE_RECEIVER 常量）
  { "inputs": [], "name": "dc", "outputs": [{ "internalType": "contract IDQCard", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取用于分配的 LP 奖池权重/常量
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取用于分配的 NFT 奖池权重/常量
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取用于分配的 Partner 奖池权重/常量
  { "inputs": [], "name": "mc", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取用于分配的 推荐/团队 奖池权重/常量
  { "inputs": [], "name": "miningContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取入金/铸造相关常量（内部计数/配置）
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取挖矿区块相关常量（mine block 配置）
  { "inputs": [], "name": "lpPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取销毁相关常量（burn 配置）
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取合伙人地址
  { "inputs": [], "name": "FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取 D 等级奖励分配比例
  { "inputs": [], "name": "claimGasFee", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取 LP 移除/提现手续费比例
  { "inputs": [], "name": "feeRecipient", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取待销毁累计值（pending burn）
  { "inputs": [], "name": "FEE_RECEIVER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 查询合约当前持有的 LP 数量
  { "inputs": [], "name": "LP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询累计已销毁数量
  { "inputs": [], "name": "NFT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取最小可执行销毁阈值
  { "inputs": [], "name": "PT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取初始供应量（用于释放/燃烧逻辑）
  { "inputs": [], "name": "RT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询已释放供应量
  { "inputs": [], "name": "IB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询分期/阶段配置 SP[index]
  { "inputs": [], "name": "MB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询分期/阶段配置 sA[index]
  { "inputs": [], "name": "BD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询分期/阶段配置 tS[index]
  { "inputs": [], "name": "PARTNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 查询待分配 DQ（Partner DQ）累计
  { "inputs": [], "name": "D_LEVEL_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询待分配 BNB（Partner BNB）累计
  { "inputs": [], "name": "LP_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询待分配 DQ（DLevel DQ）累计
  { "inputs": [], "name": "pendingBurn", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询待分配 BNB（DLevel BNB）累计
  { "inputs": [], "name": "contractLpBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询某 D 等级的阈值配置 dT[index]
  { "inputs": [], "name": "totalBurned", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询某 D 等级的奖励比例/配置 dA[index]
  { "inputs": [], "name": "MIN_BURN_AMOUNT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 burn ratio / burn related 配置 br
  { "inputs": [], "name": "INITIAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询锁仓周期/配置 lt
  { "inputs": [], "name": "releasedSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 LP 累计分配总额 lA
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "SP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 NFT 分红累计 nA[index]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询手续费分红累计 fA[index]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "tS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 LP 手续费累计 lF[index]
  { "inputs": [], "name": "pDA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 fee pool 配置 fp
  { "inputs": [], "name": "pBA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询总 LP（tLP）
  { "inputs": [], "name": "pDD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 LP 分红份额 lpS[user]
  { "inputs": [], "name": "pBD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 LP 分红债务/已结算值 lpD[user]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 LP 总收益/累计值 lpT[user]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 NFT 节点 D0 奖励/统计 nD0[user]
  { "inputs": [], "name": "br", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 NFT 节点 D1 奖励/统计 nD1[user]
  { "inputs": [], "name": "lt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 NFT 节点 D2 奖励/统计 nD2[user]
  { "inputs": [], "name": "lA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 D 等级奖励累计 dd[user]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 D 等级 dl[user]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "fA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户某周期的质押金额 sAmt[user][index]
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "lF", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户某周期的质押债务/已结算值 sDebt[user][index]
  { "inputs": [], "name": "fp", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户是否在黑名单 isB[user]
  { "inputs": [], "name": "tLP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 判断某地址是否满足某 D 等级判定 isDLevel[level][user]
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 D 等级 userDLevel[user]
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户 D 等级奖励债务 dLevelRewardDebt[user]
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 D 等级累计奖励系数 dLevelAccReward[index]
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD0", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询 D 等级人数统计 dLevelCount[index]
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD1", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 管理 / 写操作（nonpayable / payable）==========
  // 设置/更换 DQCard 合约地址（owner）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD2", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 设置领取收益所需 gasFee（owner）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dd", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 设置手续费接收地址（owner）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dl", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  // 设置主合约地址（owner，用于权限校验/转发）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sAmt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 设置/取消黑名单（owner）：bl(u, s)
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 设置 miningContract 地址（owner）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isB", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  // 设置 LP Pair 地址（owner）
  { "inputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }, { "internalType": "address", "name": "", "type": "address" }], "name": "isDLevel", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  // 登记/设置用户 D 等级（owner/管理员）：registerDLevel(user, newLevel)
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userDLevel", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  // 用户领取 D 等级奖励（payable：需支付 gasFee/手续费）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dLevelRewardDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询指定用户可领取 D 等级奖励金额
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getDLevelReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 为用户添加 LP（由主合约调用）：记录用户 LP 份额/统计
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "addLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 管理员提走 LP
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "adminWithdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 分配手续费到 LP 分红池（由主合约调用）
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 分配 DQ 手续费
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distDQFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 分配手续费到 NFT 分红池（payable：可能需要付费/携带 BNB）
  { "inputs": [], "name": "distNFT", "outputs": [], "stateMutability": "payable", "type": "function" },
  // 分配奖励到 Partner 池（由主合约调用）
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取 LP 分红（指定用户地址；通常前端传 msg.sender）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取 NFT 分红（指定用户地址）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取 D 团队奖励/见点奖励（指定用户地址）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimD", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取手续费分红（指定用户地址）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取合伙人 DQ 奖励（指定用户地址）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPdq", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户领取合伙人 BNB 奖励（指定用户地址）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPbnb", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户提现动态奖励/收益（指定用户地址 + 提现数量）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 增加待销毁金额（由主合约/管理员调用）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "addPendingBurn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 初始化池子 DQ（将 LP 中的 DQ 计入池子/统计）
  { "inputs": [{ "internalType": "uint256", "name": "_lpAmount", "type": "uint256" }], "name": "initPoolDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 添加流动性（由主合约调用/初始化）
  { "inputs": [{ "internalType": "uint256", "name": "_dqAmount", "type": "uint256" }, { "internalType": "uint256", "name": "_solAmount", "type": "uint256" }], "name": "addLiquidity", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 提走合约内 SOL（owner/管理员）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 提走合约内 DQ（owner/管理员）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 为用户质押（由主合约调用）：stake(u, amount, periodIndex)
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 为用户解押（由主合约调用）：unstake(u, periodIndex)
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取质押收益（由主合约调用）：clmS(u, periodIndex)
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "clmS", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 执行挖矿结算（由主合约/owner 调用）
  { "inputs": [], "name": "mine", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 查询用户 LP 相关信息（返回份额/债务等，具体含义见合约实现）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "getLP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户某周期的质押信息（返回质押额/债务等，具体含义见合约实现）
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "getStk", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询合伙人奖励（DQ + SOL）汇总
  { "inputs": [], "name": "getPartnerReward", "outputs": [{ "internalType": "uint256", "name": "dqReward", "type": "uint256" }, { "internalType": "uint256", "name": "solReward", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提走合约内 BNB（owner/管理员）
  { "inputs": [], "name": "withdrawBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
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
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "addPendingBurn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
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

/**
 * DQToken 代币合约 ABI（ERC20 + 项目手续费/黑名单逻辑）
 *
 * 用途：前端查询余额/授权/转账，以及读取手续费开关、燃烧目标、pair 列表等配置。
 * ABI 来源：`assets/DQToken.sol`（基于合约源码生成并复制到本文件）。
 *
 * 地址说明：当前前端实际使用的地址以 `CONTRACT_ADDRESSES.DQTOKEN.address` 为准。
 */
export const DQTOKEN_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "burnAmount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "netAmount", "type": "uint256" }], "name": "BuyFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "pairAmount", "type": "uint256" }, { "indexed": false, "name": "burnFromPool", "type": "uint256" }], "name": "SellFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "totalBurned", "type": "uint256" }], "name": "Burned", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "pair", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "PairUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "ExcludedUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "BlacklistedUpdated", "type": "event" },
  // ========== ERC20 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

  // 授权 spender 可花费 amount 数量的 DQ
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },

  // 转账：从当前调用者向 spender/收款方转移 amount
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },

  // 代扣转账：从 from 向 to 转移 amount（需 allowance 足够）
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },

  // 查询账户余额
  { "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ERC20 精度（通常为 18）
  { "inputs": [], "name": "decimals", "outputs": [{ "type": "uint8" }], "stateMutability": "view", "type": "function" },

  // Token 名称
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },

  // Token 符号
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },

  // 发行总量
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 查询 owner 对 spender 的授权额度
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 常量 ==========

  // 买入销毁率（百分比，示例：90 表示 90%）
  { "inputs": [], "name": "BUY_BURN_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 买入手续费率（百分比，示例：6 表示 6%）
  { "inputs": [], "name": "BUY_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 卖出手续费率（百分比）
  { "inputs": [], "name": "SELL_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 卖出进入交易对比例（百分比，示例：94）
  { "inputs": [], "name": "SELL_TO_PAIR_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 黑洞/销毁地址
  { "inputs": [], "name": "BURN_ADDRESS", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // 已销毁总量（用于判断通缩进度）
  { "inputs": [], "name": "burnedSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 通缩目标（达到后可停止销毁/改变处理策略）
  { "inputs": [], "name": "BURN_TARGET", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 买入手续费/销毁是否启用
  { "inputs": [], "name": "buyFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 卖出手续费是否启用
  { "inputs": [], "name": "sellFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 查询某地址是否被标记为交易对
  { "inputs": [{ "name": "", "type": "address" }], "name": "isPair", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 查询某地址是否在白名单（免手续费）
  { "inputs": [{ "name": "", "type": "address" }], "name": "isExcluded", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 查询某地址是否在黑名单（禁止交易）
  { "inputs": [{ "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 买入手续费接收/分配地址（主合约/单币质押合约等）
  { "inputs": [], "name": "buyFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // 卖出手续费接收/分配地址（主合约/单币质押合约等）
  { "inputs": [], "name": "sellFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // 记录待销毁数量的 DQMiningStake 合约地址
  { "inputs": [], "name": "miningStake", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // ========== 管理函数 ==========

  // 设置某地址是否为交易对（影响买卖手续费逻辑）
  { "inputs": [{ "name": "_pair", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setPair", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 批量设置交易对标记
  { "inputs": [{ "name": "_pairs", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setPairs", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置白名单（免手续费/免限制）
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setExcluded", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 批量设置白名单
  { "inputs": [{ "name": "_accounts", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setExcludedBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置黑名单（禁止交易）
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setBlacklisted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置买入手续费接收/分配地址（会自动加入白名单）
  { "inputs": [{ "name": "_buyFeeReceiver", "type": "address" }], "name": "setBuyFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置卖出手续费接收/分配地址（会自动加入白名单）
  { "inputs": [{ "name": "_sellFeeReceiver", "type": "address" }], "name": "setSellFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置 DQMiningStake 合约地址（用于记录待销毁数量；会自动加入白名单）
  { "inputs": [{ "name": "_miningStake", "type": "address" }], "name": "setMiningStake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置买入/卖出手续费开关
  { "inputs": [{ "name": "_buyFee", "type": "bool" }, { "name": "_sellFee", "type": "bool" }], "name": "setFeeStatus", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 用户主动销毁自己持有的代币
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 管理员销毁指定账户的代币
  { "inputs": [{ "name": "account", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // ========== 查询函数 ==========

  // 实际流通量（总量 - 黑洞余额）
  { "inputs": [], "name": "circulatingSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 剩余可销毁量（距离 BURN_TARGET 还有多少）
  { "inputs": [], "name": "remainingBurnable", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 是否已达到通缩目标
  { "inputs": [], "name": "isBurnTargetReached", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 计算买入到账拆分：销毁/手续费/实际到账
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateBuyOutput", "outputs": [{ "name": "burnAmount", "type": "uint256" }, { "name": "feeAmount", "type": "uint256" }, { "name": "netAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" },

  // 计算卖出拆分：手续费/进入交易对/从池子销毁
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateSellOutput", "outputs": [{ "name": "feeAmount", "type": "uint256" }, { "name": "pairAmount", "type": "uint256" }, { "name": "burnAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" }
];

/**
 * DQCard NFT 卡牌合约 ABI（ERC721 + 卡牌类型/价格等扩展）
 *
 * 用途：前端展示/查询用户卡牌资产，读取卡牌价格与配置，以及（管理员）铸造相关操作。
 * ABI 来源：`assets/DQCard.sol`（基于合约源码生成并复制到本文件）。
 *
 * 地址说明：当前前端实际使用的地址以 `CONTRACT_ADDRESSES.DQCARD.address` 为准。
 */
export const DQCARD_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }], "name": "ApprovalForAll", "type": "event" },
  // ========== ERC721 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

  // 授权某地址转移指定 tokenId
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 安全转移 NFT（无 data 参数版本）
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 安全转移 NFT（带 data 参数版本）
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }, { "name": "data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 普通转移 NFT（不校验接收方是否支持 ERC721Receiver）
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 查询某地址持有 NFT 数量
  { "inputs": [{ "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 查询 tokenId 的持有者
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // NFT 集合名称
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },

  // NFT 集合符号
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },

  // tokenId 的元数据 URI
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },

  // 查询 owner 是否已对 spender 批量授权
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 查询指定 tokenId 当前授权地址
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },

  // 设置或取消对 operator 的批量授权
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "operator", "type": "address" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // ========== ERC721Enumerable ==========

  // 按索引查询 owner 持有的 tokenId（枚举用）
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "index", "type": "uint256" }], "name": "tokenOfOwnerByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // NFT 总供应量（已铸造数量）
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 按全局索引查询 tokenId（枚举用）
  { "inputs": [{ "name": "index", "type": "uint256" }], "name": "tokenByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 卡牌常量 ==========

  // 卡牌类型常量：A
  { "inputs": [], "name": "CARD_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 卡牌类型常量：B
  { "inputs": [], "name": "CARD_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 卡牌类型常量：C
  { "inputs": [], "name": "CARD_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 已售/已铸造 A 卡数量
  { "inputs": [], "name": "totalA", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 已售/已铸造 B 卡数量
  { "inputs": [], "name": "totalB", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 已售/已铸造 C 卡数量
  { "inputs": [], "name": "totalC", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // A 卡上限（可变）
  { "inputs": [], "name": "MAX_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // B 卡上限（可变）
  { "inputs": [], "name": "MAX_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // C 卡上限（可变）
  { "inputs": [], "name": "MAX_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // A 卡价格
  { "inputs": [], "name": "PRICE_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // B 卡价格
  { "inputs": [], "name": "PRICE_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // C 卡价格
  { "inputs": [], "name": "PRICE_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 查询 tokenId 的卡牌类型（CARD_A/B/C）
  { "inputs": [{ "name": "", "type": "uint256" }], "name": "cardType", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 管理函数 ==========

  // 设置 A 卡上限（仅管理员）
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxA", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置 B 卡上限（仅管理员）
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 设置 C 卡上限（仅管理员）
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxC", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 管理员为指定地址铸造一张指定类型的卡
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "_type", "type": "uint256" }], "name": "mintByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 管理员批量为多个地址铸造卡牌
  { "inputs": [{ "name": "to", "type": "address[]" }, { "name": "_types", "type": "uint256[]" }], "name": "mintBatchByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // ========== 查询函数 ==========

  // 根据卡牌类型返回价格（与 PRICE_A/B/C 一致）
  { "inputs": [{ "name": "_type", "type": "uint256" }], "name": "getCardPrice", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" }
];
