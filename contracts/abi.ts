/**
 * ABI Export for DQProject Smart Contract
 * Network: BSC (Binance Smart Chain)
 * 
 * 代币信息:
 * - 代币名称: DQ (DeepQuest Token)
 * - 兑换对: DQ ↔ USDT
 * - USDT 合约: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
 * 
 * 质押周期:
 * - 索引 0: 30天 (5%)
 * - 索引 1: 90天 (10%)
 * - 索引 2: 180天 (15%)
 * - 索引 3: 360天 (20%)
 * 
 * 卡牌类型:
 * - 类型 1: A级节点卡 (500 USDT)
 * - 类型 2: B级节点卡 (1000 USDT)
 * - 类型 3: C级节点卡 (3000 USDT)
 */

export const DQPROJECT_ABI = [
  // View Functions
  "function dqToken() view returns (address)",
  "function dqCard() view returns (address)",
  "function USDT_ADDRESS() view returns (address)",
  "function dqPrice() view returns (uint256)",
  "function users(address) view returns (address referrer, uint256 directCount, uint8 level, uint256 totalInvest, uint256 teamInvest, uint256 energy, uint256 lpShares, uint256 lpRewardDebt, uint256 pendingRewards, uint256 totalMgmtClaimed, uint256 totalDaoClaimed, uint8 dLevel, uint256 dRewardDebt)",
  "function isPartner(address) view returns (bool)",
  "function partnerCount() view returns (uint256)",
  "function totalLPShares() view returns (uint256)",
  "function lpAccPerShare() view returns (uint256)",
  "function nftAccPerShare(uint256) view returns (uint256)",
  "function dAccPerShare(uint256) view returns (uint256)",
  "function stakes(address, uint256) view returns (uint256 amount, uint256 rewardDebt)",
  "function stakePeriods(uint256) view returns (uint256)",
  "function stakeRates(uint256) view returns (uint256)",
  "function getCurrentMaxInvest() view returns (uint256)",
  "function getUserInfo(address) view returns (uint256, uint256, uint8, uint256, uint256, uint8, uint256, uint256, bool)",
  "function getPendingLp(address) view returns (uint256)",
  "function getPendingNft(address) view returns (uint256)",
  "function getPendingDTeam(address) view returns (uint256)",
  "function getPartnerPendingDQ(address) view returns (uint256)",
  "function getPartnerPendingUSDT(address) view returns (uint256)",
  "function getStakeInfo(address, uint256) view returns (uint256, uint256)",
  "function getSwapQuote(uint256) view returns (uint256)",
  "function getReverseSwapQuote(uint256) view returns (uint256)",
  "function getCardPrice(uint256) view returns (uint256)",

  // User Functions
  "function register(address _referrer)",
  "function deposit(uint256 amount)",
  "function withdraw()",
  "function buyNode(uint256 _type)",
  "function stakeDQ(uint256 _amount, uint _periodIndex)",
  "function unstakeDQ(uint _periodIndex)",
  "function claimLp()",
  "function claimNft()",
  "function claimDTeam()",
  "function claimPartnerDQ()",
  "function claimPartnerUSDT()",
  "function claimFee()",
  "function swapDQForUSDT(uint256 _dqAmount)",
  "function swapUSDTForDQ(uint256 _usdtAmount)",
  "function blockMining()",
  "function withdrawAndUpdateFee()",

  // Admin Functions
  "function addInitialNodes(address[] _users, uint8[] _cardTypes)",
  "function setDQPrice(uint256 _newPrice)",
  "function emergencyWithdrawUSDT(uint256 amount)",
  "function emergencyWithdrawETH()",

  // Events
  "event Register(address indexed user, address indexed referrer)",
  "event Deposit(address indexed user, uint256 amount)",
  "event BuyNode(address indexed user, uint256 cardType, uint256 amount)",
  "event StakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event UnstakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event Withdraw(address indexed user, uint256 amount, uint256 fee)",
  "event BlockMining(uint256 release, uint256 burn, uint256 timestamp)",
  "event ClaimLp(address indexed user, uint256 amount)",
  "event ClaimNft(address indexed user, uint256 amount)",
  "event ClaimDTeam(address indexed user, uint256 amount)",
  "event ClaimPartnerDQ(address indexed user, uint256 amount)",
  "event ClaimPartnerSol(address indexed user, uint256 amount)",
  "event ClaimFee(address indexed user, uint256 amount)",
  "event SwapDQForUSDT(address indexed user, uint256 dqAmount, uint256 usdtAmount)",
  "event SwapUSDTForDQ(address indexed user, uint256 usdtAmount, uint256 dqAmount)",
  "event PartnerAdded(address indexed user, uint256 order)",
  "event LevelUp(address indexed user, uint8 newLevel)"
];

export const DQTOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function burn(uint256 amount)",
  "function mint(address to, uint256 amount)"
];

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
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function cardType(uint256 tokenId) view returns (uint256)",
  "function getCardPrice(uint256 _type) view returns (uint256)"
];

// Contract Configuration
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
  // Staking Periods (in days)
  STAKING_PERIODS: [30, 90, 180, 360],
  // Staking Rates (percentage)
  STAKING_RATES: [5, 10, 15, 20],
  // Card Types and Prices (USDT)
  CARDS: {
    A: { type: 1, price: "500", maxSupply: 3000 },
    B: { type: 2, price: "1000", maxSupply: 1000 },
    C: { type: 3, price: "3000", maxSupply: 300 }
  },
  // Partner Requirements
  PARTNER: {
    MAX_COUNT: 50,
    FIRST_20: { invest: "5000", directSales: "30000" },
    LAST_30: { invest: "5000", directSales: "50000" }
  },
  // Investment Limits
  INVESTMENT: {
    MIN: "1",
    MAX_START: "10",
    MAX_FINAL: "200",
    PHASE_DURATION_DAYS: 15
  },
  // Block Mining Configuration
  BLOCK_MINING: {
    DAILY_RELEASE_RATE: 13, // 1.3%
    BURN_RATE: 80,
    MIN_BURN_RATE: 30
  }
};
