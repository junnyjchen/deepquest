/**
 * ABI Export for DQProject Smart Contract v3.3
 * Network: BSC (Binance Smart Chain)
 * 
 * ================================================================================
 *                              合约信息
 * ================================================================================
 * 
 * 代币信息:
 * - 代币名称: DQ (DeepQuest Token)
 * - 兑换对: DQ ↔ BEP20 (USDT)
 * - BEP20 合约: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
 * 
 * 卡牌类型:
 * - 类型 1: A级节点卡 (500 BEP20) - 需5条达标线, 4%分红权重
 * - 类型 2: B级节点卡 (1500 BEP20) - 需10条达标线, 5%分红权重
 * - 类型 3: C级节点卡 (5000 BEP20) - 需20条达标线, 6%分红权重
 * 
 * 质押周期:
 * - 索引 0: 30天 (5%)
 * - 索引 1: 90天 (10%)
 * - 索引 2: 180天 (15%)
 * - 索引 3: 360天 (20%)
 * 
 * ================================================================================
 *                              业务规则
 * ================================================================================
 * 
 * 入金条件:
 * 1. 注册：推荐人必须是节点会员
 * 2. 首次入金：用户必须是节点会员
 * 3. 后续入金：只要在节点下面有关系链即可
 * 
 * 节点达标条件:
 * - 直接子节点中有用户完成入金 = 1条线
 * - A级需要5条，B级需要10条，C级需要20条
 * - 不达标只有资格，无法领取节点分红
 * 
 * 爆块机制:
 * - 每天释放 DQ 总量的 1.3%
 * - 80% 销毁至黑洞，每天递减 0.5%，最低 30%
 * - 剩余 20% 分配：LP(60%) + 节点(15%) + 基金会(5%) + 合伙人(6%) + 团队(14%)
 * 
 * ================================================================================
 */

// 主合约 ABI
export const DQPROJECT_ABI = [
  // ============ View Functions: 基础信息 ============
  "function dqToken() view returns (address)",
  "function dqCard() view returns (address)",
  "function USDT_ADDRESS() view returns (address)",
  "function dqPrice() view returns (uint256)",
  
  // ============ View Functions: 用户信息 ============
  "function users(address) view returns (address referrer, uint256 directCount, uint8 level, uint256 totalInvest, uint256 teamInvest, uint256 energy, uint256 lpShares, uint256 lpRewardDebt, uint256 pendingRewards, uint256 totalMgmtClaimed, uint256 totalDaoClaimed, uint8 dLevel, uint256 dRewardDebt)",
  "function isRegistered(address) view returns (bool)",
  "function isNode(address) view returns (bool)",
  
  // ============ View Functions: 节点系统 ============
  "function getNodeInfo(address _user) view returns (uint256 cardCount, uint256 highestType, uint256 qualifiedLines, uint256 requiredLines, bool isQualified)",
  "function checkNodeQualified(address _user) view returns (bool qualified, uint256 currentLines, uint256 requiredLines)",
  
  // ============ View Functions: 合伙人系统 ============
  "function isPartner(address) view returns (bool)",
  "function partnerCount() view returns (uint256)",
  "function partnerList(uint256) view returns (address)",
  "function getPartnerPendingDQ(address) view returns (uint256)",
  "function getPartnerPendingUSDT(address) view returns (uint256)",
  
  // ============ View Functions: LP质押 ============
  "function totalLPShares() view returns (uint256)",
  "function lpAccPerShare() view returns (uint256)",
  "function getPendingLp(address) view returns (uint256)",
  
  // ============ View Functions: NFT分红 ============
  "function nftAccPerShare(uint256) view returns (uint256)",
  "function nftRewardDebt(address, uint256) view returns (uint256)",
  "function getPendingNft(address) view returns (uint256)",
  
  // ============ View Functions: 团队奖励 ============
  "function dAccPerShare(uint256) view returns (uint256)",
  "function getDLevel(address) view returns (uint8)",
  "function getPendingDTeam(address) view returns (uint256)",
  
  // ============ View Functions: 单币质押 ============
  "function stakes(address, uint256) view returns (uint256 amount, uint256 rewardDebt)",
  "function stakePeriods(uint256) view returns (uint256)",
  "function stakeRates(uint256) view returns (uint256)",
  "function stakeAccPerShare(uint256) view returns (uint256)",
  "function getStakeInfo(address, uint256) view returns (uint256, uint256)",
  
  // ============ View Functions: 入金限制 ============
  "function getCurrentMaxInvest() view returns (uint256)",
  "function getUserInvestedAmount(address) view returns (uint256)",
  "function isInvestRestricted(address) view returns (bool)",
  
  // ============ View Functions: 地址限制 ============
  "function isRestricted(address) view returns (bool)",
  "function restrictedDebt(address) view returns (uint256)",
  
  // ============ View Functions: 通用 ============
  "function getSwapQuote(uint256) view returns (uint256)",
  "function getReverseSwapQuote(uint256) view returns (uint256)",
  "function getCardPrice(uint256) view returns (uint256)",
  "function getUserInfo(address) view returns (uint256, uint256, uint8, uint256, uint256, uint8, uint256, uint256, bool)",

  // ============ User Functions: 注册与入金 ============
  "function register(address _referrer)",
  "function deposit(uint256 amount)",
  
  // ============ User Functions: 出金 ============
  "function withdraw()",
  
  // ============ User Functions: 节点操作 ============
  "function buyNode(uint256 _type)",
  
  // ============ User Functions: LP质押 ============
  "function claimLp()",
  
  // ============ User Functions: NFT分红 ============
  "function claimNft()",
  
  // ============ User Functions: 团队奖励 ============
  "function claimDTeam()",
  
  // ============ User Functions: 合伙人 ============
  "function claimPartnerDQ()",
  "function claimPartnerUSDT()",
  
  // ============ User Functions: 单币质押 ============
  "function stakeDQ(uint256 _amount, uint256 _periodIndex)",
  "function unstakeDQ(uint256 _periodIndex)",
  
  // ============ User Functions: 代币交换 ============
  "function swapDQForUSDT(uint256 _dqAmount)",
  
  // ============ Admin Functions: 爆块 ============
  "function blockMining()",
  
  // ============ Admin Functions: 合伙人管理 ============
  "function addPartners(address[] _partners)",
  "function removePartner(address _partner)",
  
  // ============ Admin Functions: 地址限制 ============
  "function restrictAddress(address _user)",
  "function unrestrictAddress(address _user)",
  
  // ============ Admin Functions: 初始节点 ============
  "function addInitialNodes(address[] _users, uint8[] _cardTypes)",
  
  // ============ Admin Functions: 配置 ============
  "function setDQPrice(uint256 _newPrice)",
  
  // ============ Admin Functions: 紧急 ============
  "function emergencyWithdrawUSDT(uint256 amount)",
  "function emergencyWithdrawETH()",

  // ============ Events ============
  "event Register(address indexed user, address indexed referrer)",
  "event Deposit(address indexed user, uint256 amount, uint256 lpAmount, uint256 dynamicAmount)",
  "event BuyNode(address indexed user, uint256 cardType, uint256 amount)",
  "event StakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event UnstakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event ClaimLp(address indexed user, uint256 amount)",
  "event ClaimNft(address indexed user, uint256 amount)",
  "event ClaimDTeam(address indexed user, uint256 amount)",
  "event ClaimPartnerDQ(address indexed user, uint256 amount)",
  "event ClaimPartnerSol(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount, uint256 fee)",
  "event SwapDQForUSDT(address indexed user, uint256 dqAmount, uint256 usdtAmount)",
  "event BlockMining(uint256 release, uint256 burn, uint256 lpShare, uint256 nftShare, uint256 fundShare, uint256 partnerShare, uint256 teamShare, uint256 timestamp)",
  "event PartnerAdded(address indexed user, uint256 order)",
  "event PartnerRemoved(address indexed user)",
  "event AddressRestricted(address indexed user)",
  "event AddressUnrestricted(address indexed user)",
  "event LevelUp(address indexed user, uint8 newLevel)",
  "event LineQualified(address indexed user, uint256 qualifiedLines)",
  "event EnergyConsumed(address indexed user, uint256 amount, string reason)"
];

// DQ Token ABI
export const DQTOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function burn(uint256 amount)",
  "function burnToBlackhole(uint256 amount)",
  "function mint(address to, uint256 amount)"
];

// DQ Card ABI
export const DQCARD_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function totalA() view returns (uint256)",
  "function totalB() view returns (uint256)",
  "function totalC() view returns (uint256)",
  "function CARD_A() view returns (uint256)",
  "function CARD_B() view returns (uint256)",
  "function CARD_C() view returns (uint256)",
  "function PRICE_A() view returns (uint256)",
  "function PRICE_B() view returns (uint256)",
  "function PRICE_C() view returns (uint256)",
  "function WEIGHT_A() view returns (uint256)",
  "function WEIGHT_B() view returns (uint256)",
  "function WEIGHT_C() view returns (uint256)",
  "function LINE_A() view returns (uint256)",
  "function LINE_B() view returns (uint256)",
  "function LINE_C() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function cardType(uint256 tokenId) view returns (uint256)",
  "function getCardPrice(uint256 _type) view returns (uint256)",
  "function getCardWeight(uint256 _type) view returns (uint256)",
  "function getRequiredLines(uint256 _type) view returns (uint256)"
];

// 合约配置
export const CONTRACT_CONFIG = {
  // BSC Mainnet
  BSC_MAINNET: {
    DQProject: "YOUR_DEPLOYED_CONTRACT_ADDRESS",
    USDT: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org"
  },
  // BSC Testnet
  BSC_TESTNET: {
    DQProject: "YOUR_DEPLOYED_CONTRACT_ADDRESS",
    USDT: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
    chainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545"
  },
  
  // 卡牌配置
  CARDS: {
    A: { 
      type: 1, 
      price: "500", 
      maxSupply: 1000,
      weight: 4,
      requiredLines: 5,
      name: 'S1 节点卡'
    },
    B: { 
      type: 2, 
      price: "1500", 
      maxSupply: 500,
      weight: 5,
      requiredLines: 10,
      name: 'S2 节点卡'
    },
    C: { 
      type: 3, 
      price: "5000", 
      maxSupply: 100,
      weight: 6,
      requiredLines: 20,
      name: 'S3 节点卡'
    }
  },
  
  // 质押周期配置
  STAKING_PERIODS: [30, 90, 180, 360],
  STAKING_RATES: [5, 10, 15, 20],
  
  // 合伙人配置
  PARTNER: {
    MAX_COUNT: 50,
    FIRST_20: { invest: "5000", directSales: "30000" },
    LAST_30: { invest: "5000", directSales: "50000" }
  },
  
  // 入金限制配置
  INVESTMENT: {
    MIN: "1",
    MAX_START: "10",
    MAX_FINAL: "200",
    PHASE_DURATION_DAYS: 15
  },
  
  // 爆块配置
  BLOCK_MINING: {
    DAILY_RELEASE_RATE: 13, // 1.3%
    BURN_RATE_START: 80,
    BURN_RATE_MIN: 30,
    BURN_RATE_DECAY: 5, // 每天递减0.5%
    LP_SHARE: 60,
    NFT_SHARE: 15,
    FUND_SHARE: 5,
    PARTNER_SHARE: 6,
    TEAM_SHARE: 14
  },
  
  // 动态分币配置
  DYNAMIC_REWARDS: {
    DIRECT: 30,      // 直推奖励 30%
    NODE: 15,        // 见点奖励 15%
    MANAGEMENT: 30,  // 管理奖 30%
    DAO: 10,         // DAO组织补贴 10%
    INSURANCE: 7,    // 保险池 7%
    OPERATION: 8     // 运营 8%
  },
  
  // 管理等级配置
  MANAGEMENT_LEVELS: [
    { level: 1, name: 'S1', teamInvest: 100, rate: 5 },
    { level: 2, name: 'S2', teamInvest: 200, rate: 10 },
    { level: 3, name: 'S3', teamInvest: 600, rate: 15 },
    { level: 4, name: 'S4', teamInvest: 2000, rate: 20 },
    { level: 5, name: 'S5', teamInvest: 6000, rate: 25 },
    { level: 6, name: 'S6', teamInvest: 20000, rate: 30 }
  ],
  
  // D级别配置
  D_LEVELS: [
    { level: 1, name: 'D1', requiredUsers: 30, share: 1.75 },
    { level: 2, name: 'D2', requiredUsers: 120, share: 1.75 },
    { level: 3, name: 'D3', requiredUsers: 360, share: 1.75 },
    { level: 4, name: 'D4', requiredUsers: 1000, share: 1.75 },
    { level: 5, name: 'D5', requiredUsers: 4000, share: 1.75 },
    { level: 6, name: 'D6', requiredUsers: 10000, share: 1.75 },
    { level: 7, name: 'D7', requiredUsers: 15000, share: 1.75 },
    { level: 8, name: 'D8', requiredUsers: 30000, share: 1.75 }
  ]
};

// 辅助函数
export const formatAddress = (address: string): string => {
  if (!address || address.length < 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

export const formatAmount = (amount: string | number, decimals: number = 2): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
};

export const parseAmount = (amount: string): string => {
  // 转换为 wei 单位
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return (num * 1e18).toFixed(0);
};

export const formatCardType = (type: number): string => {
  switch (type) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return 'C';
    default: return 'Unknown';
  }
};

export const formatCardName = (type: number): string => {
  switch (type) {
    case 1: return 'S1 节点卡';
    case 2: return 'S2 节点卡';
    case 3: return 'S3 节点卡';
    default: return '未知';
  }
};
