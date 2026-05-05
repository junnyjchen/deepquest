/**
 * DeepQuest 合约配置
 * 合约地址（主网）
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

export const CONTRACTS = {
  // DQ 主合约
  DQPROJECT: {
    address: '0xD6C7f9a6460034317294c52FDc056C548fbd0040',
    name: 'DQProject'
  },
  
  // DQ Card NFT 合约
  DQCARD: {
    address: '0x1857aCeDf9b73163D791eb2F0374a328416291a1',
    name: 'DQCard'
  },
  
  // DQ Token 合约
  DQTOKEN: {
    address: '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B',
    name: 'DQToken'
  }
};

// 兼容别名
export const CONTRACT_ADDRESSES = CONTRACTS;

// BSC 链 ID
export const BSC_CHAIN_ID = 56;

// BSC 主网 RPC
export const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';
