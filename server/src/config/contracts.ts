/**
 * DeepQuest 合约 ABI 配置
 * DQ主合约地址：0xD6C7f9a6460034317294c52FDc056C548fbd0040
 * DQCard合约：0x1857aCeDf9b73163D791eb2F0374a328416291a1
 * DQToken合约地址：0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B
 */

export const DQ_CONTRACT_ADDRESS = '0xD6C7f9a6460034317294c52FDc056C548fbd0040';
export const DQCARD_CONTRACT_ADDRESS = '0x1857aCeDf9b73163D791eb2F0374a328416291a1';
export const DQTOKEN_CONTRACT_ADDRESS = '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B';

/**
 * DQ 主合约 ABI（完整定义）
 * 包含所有事件、状态变量、查询函数、交易函数
 */
export const DQ_ABI = [
  // ==================== 事件定义 ====================
  // 挖矿事件
  {"inputs":[{"indexed":false,"internalType":"uint256","name":"release","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"burn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"BlockMining","type":"event"},
  // 用户购买节点（卡片）事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"cardType","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BuyNode","type":"event"},
  // 用户提取 D Team 奖励
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimDTeam","type":"event"},
  // 用户提取手续费分红
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimFee","type":"event"},
  // 用户提取 LP 分红
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimLp","type":"event"},
  // 用户提取 NFT 分红
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimNft","type":"event"},
  // 合作伙伴提取 BNB 分红
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimPartnerBNB","type":"event"},
  // 合作伙伴提取 DQ Token 分红
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ClaimPartnerDQ","type":"event"},
  // D 等级升级事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint8","name":"newDLevel","type":"uint8"}],"name":"DLevelUp","type":"event"},
  // 用户存款事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},
  // 初始节点批量添加事件
  {"inputs":[{"indexed":false,"internalType":"address[]","name":"users","type":"address[]"},{"indexed":false,"internalType":"uint8[]","name":"cardTypes","type":"uint8[]"}],"name":"InitialNodesAdded","type":"event"},
  // 用户等级升级事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint8","name":"newLevel","type":"uint8"}],"name":"LevelUp","type":"event"},
  // 权限转移事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  // 交易对设置事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"pair","type":"address"}],"name":"PairSet","type":"event"},
  // 合作伙伴添加事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"order","type":"uint256"}],"name":"PartnerAdded","type":"event"},
  // 推荐奖励事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReferralReward","type":"event"},
  // 用户注册事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"}],"name":"Register","type":"event"},
  // 用户 Stake DQ Token 事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"period","type":"uint256"}],"name":"StakeDQ","type":"event"},
  // 用户交换 DQ 为 SOL 事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"dqAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"solAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"SwapDQForSOL","type":"event"},
  // 用户交换 SOL 为 DQ 事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"solAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dqAmount","type":"uint256"}],"name":"SwapSOLForDQ","type":"event"},
  // 用户 Unstake DQ Token 事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"period","type":"uint256"}],"name":"UnstakeDQ","type":"event"},
  // 用户提款事件
  {"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"Withdraw","type":"event"},

  // ==================== 常量查询函数 ====================
  // 燃烧率递减值
  {"inputs":[],"name":"BURN_DECREMENT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 购买费用地址
  {"inputs":[],"name":"BUY_FEE_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 早期阶段第 10 天限额
  {"inputs":[],"name":"EARLY_DAY10_LIMIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 早期阶段第 20 天限额
  {"inputs":[],"name":"EARLY_DAY20_LIMIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 早期阶段第 30 天限额
  {"inputs":[],"name":"EARLY_DAY30_LIMIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 早期阶段结束时间
  {"inputs":[],"name":"EARLY_PHASE_END","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 最终投资限额
  {"inputs":[],"name":"INVEST_MAX_FINAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 初始投资限额
  {"inputs":[],"name":"INVEST_MAX_START","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 投资限额增长步长
  {"inputs":[],"name":"INVEST_MAX_STEP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 最小投资额
  {"inputs":[],"name":"INVEST_MIN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 最小燃烧率
  {"inputs":[],"name":"MIN_BURN_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // PancakeSwap Router 地址
  {"inputs":[],"name":"PANCAKE_ROUTER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 阶段持续时间（天数）
  {"inputs":[],"name":"PHASE_DURATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // SOL Token 地址
  {"inputs":[],"name":"SOL_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // USDT Token 地址
  {"inputs":[],"name":"USDT_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},

  // ==================== 管理员函数 ====================
  // 批量添加初始节点（仅管理员）
  {"inputs":[{"internalType":"address[]","name":"_usersArr","type":"address[]"},{"internalType":"uint8[]","name":"_cardTypes","type":"uint8[]"}],"name":"addInitialNodes","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 添加合作伙伴（仅管理员）
  {"inputs":[{"internalType":"address","name":"_partner","type":"address"}],"name":"addPartner","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 加入黑名单（仅管理员）
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"addToBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 管理员提取 DQ（仅管理员）
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"adminWithdrawDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 管理员提取 SOL（仅管理员）
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"adminWithdrawSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 从黑名单移除（仅管理员）
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"removeFromBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},

  // ==================== 用户交互函数 ====================
  // 注册用户
  {"inputs":[{"internalType":"address","name":"_referrer","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户存入 SOL 进行投资
  {"inputs":[{"internalType":"uint256","name":"_solAmount","type":"uint256"}],"name":"depositSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提取投资
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户购买节点卡片
  {"inputs":[{"internalType":"uint256","name":"_type","type":"uint256"}],"name":"buyNode","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提取 D Team 分红
  {"inputs":[],"name":"claimDTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提取手续费分红
  {"inputs":[],"name":"claimFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提取 LP 分红
  {"inputs":[],"name":"claimLp","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提取 NFT 分红
  {"inputs":[],"name":"claimNft","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 合作伙伴提取 BNB 分红
  {"inputs":[],"name":"claimPartnerBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 合作伙伴提取 DQ Token 分红
  {"inputs":[],"name":"claimPartnerDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户 Stake DQ Token 赚取收益
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_periodIndex","type":"uint256"}],"name":"stakeDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户 Unstake DQ Token
  {"inputs":[{"internalType":"uint256","name":"_periodIndex","type":"uint256"}],"name":"unstakeDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户交换 DQ 为 SOL
  {"inputs":[{"internalType":"uint256","name":"_dqAmount","type":"uint256"},{"internalType":"uint256","name":"_minSolOut","type":"uint256"}],"name":"swapDQForSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户交换 SOL 为 DQ
  {"inputs":[{"internalType":"uint256","name":"_solAmount","type":"uint256"},{"internalType":"uint256","name":"_minDqOut","type":"uint256"}],"name":"swapSOLForDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 挖矿（触发每个区块的奖励分配）
  {"inputs":[],"name":"mineBlock","outputs":[],"stateMutability":"nonpayable","type":"function"},

  // ==================== 查询函数 ====================
  // 获取所有注册用户（按索引）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 获取用户完整信息
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUser","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint8","name":"level","type":"uint8"},{"internalType":"uint256","name":"totalInvest","type":"uint256"},{"internalType":"uint256","name":"teamInvest","type":"uint256"},{"internalType":"uint256","name":"energy","type":"uint256"},{"internalType":"uint256","name":"lpShares","type":"uint256"},{"internalType":"uint8","name":"dLevel","type":"uint8"}],"stateMutability":"view","type":"function"},
  // 获取用户团队投资总额
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTeamInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取用户团队大小
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTeamSize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取当前最大投资限额
  {"inputs":[],"name":"getCurrentMaxInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取当前燃烧率
  {"inputs":[],"name":"burnRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户是否被黑名单限制
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 查询用户是否为合作伙伴
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isPartner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 查询用户 Stake 信息
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户 LP 记录
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userLPRecords","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 其他状态查询函数
  {"inputs":[],"name":"dailyReleaseRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"feePool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"lpPool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"operationPool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"partnerCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalLPShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalLPTokenShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"lastBlockTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqToken","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqCard","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqSolPair","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"daoAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"foundationAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"insuranceAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"operationAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"swapFeeAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  
  // ==================== 其他函数 ====================
  // 为 Router 批准 Token
  {"inputs":[],"name":"approveRouter","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 移除 LP（清算）
  {"inputs":[],"name":"removeLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 放弃所有权
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 转移所有权
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  
  // 接收 BNB 回调
  {"stateMutability":"payable","type":"receive"}
];

// DQCard 合约 ABI
export const DQCARD_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "cardType",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_type", "type": "uint256" }
    ],
    "name": "getCardPrice",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "_type", "type": "uint256" }
    ],
    "name": "mintByOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalA",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalB",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalC",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取所有用户数量
  {
    "inputs": [],
    "name": "allUsersLength",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取指定索引的用户地址
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "allUsers",
    "outputs": [
      { "internalType": "address", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取用户完整信息（新版本接口）
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getUser",
    "outputs": [
      { "internalType": "address", "name": "referrer", "type": "address" },
      { "internalType": "uint256", "name": "directCount", "type": "uint256" },
      { "internalType": "uint8", "name": "level", "type": "uint8" },
      { "internalType": "uint256", "name": "totalInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "teamInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "energy", "type": "uint256" },
      { "internalType": "uint256", "name": "lpShares", "type": "uint256" },
      { "internalType": "uint8", "name": "dLevel", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// DQToken 合约 ABI (继承 ERC20 + Ownable)
export const DQTOKEN_ABI = [
  // transfer
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [
      { "internalType": "bool", "type": "bool" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // balanceOf
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // burn (任何人都可以销毁自己的代币)
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // burnFrom (onlyOwner，可以销毁任意地址的代币)
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burnFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
