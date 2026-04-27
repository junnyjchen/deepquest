// DQProject 合约 ABI - v3.4 精简版
// 包含：节点达标限制、地址限制、入金节点关系链

export const DQTOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function burn(uint256)",
  "function mint(address, uint256)"
];

export const DQCARD_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
  "function cardType(uint256) view returns (uint256)",
  "function CARD_A() pure returns (uint256)",
  "function CARD_B() pure returns (uint256)",
  "function CARD_C() pure returns (uint256)",
  "function PRICE_A() pure returns (uint256)",
  "function PRICE_B() pure returns (uint256)",
  "function PRICE_C() pure returns (uint256)",
  "function LINE_A() pure returns (uint256)",
  "function LINE_B() pure returns (uint256)",
  "function LINE_C() pure returns (uint256)",
  "function totalA() view returns (uint256)",
  "function totalB() view returns (uint256)",
  "function totalC() view returns (uint256)",
  "function getCardPrice(uint256) pure returns (uint256)",
  "function getRequiredLines(uint256) pure returns (uint256)"
];

export const DQPROJECT_ABI = [
  // 基础信息
  "function dqToken() view returns (address)",
  "function dqCard() view returns (address)",
  "function BEP20_TOKEN() view returns (address)",
  "function dqPrice() view returns (uint256)",
  "function INVEST_MIN() pure returns (uint256)",
  
  // 用户信息
  "function getUser(address) view returns (address, uint256, uint8, uint8, uint256, uint256, uint256, uint256, bool, bool, uint256, bool)",
  "function getNodeInfo(address) view returns (uint256, uint256, uint256, uint256, bool)",
  "function checkNodeQualified(address) view returns (bool, uint256, uint256)",
  "function canDeposit(address) view returns (bool)",
  "function getCurrentMaxInvest() view returns (uint256)",
  "function getPrice() view returns (uint256)",
  
  // 注册与入金
  "function register(address _referrer)",
  "function deposit(uint256 amount)",
  "function buyNode(uint256 _type)",
  
  // 出金
  "function withdraw(uint256 dqAmount, uint256 minOut)",
  
  // 兑换
  "function swapBEP20ForDQ(uint256 tokenAmount)",
  "function swapDQForBEP20(uint256 dqAmount, uint256 minOut)",
  
  // 单币质押
  "function stakeDQ(uint256 amount, uint periodIndex)",
  "function unstakeDQ(uint periodIndex)",
  "function getSingleStake(address) view returns (uint256[])",
  
  // 分红领取
  "function claimLp()",
  "function claimNft()",
  "function claimDTeam()",
  "function claimPartner()",
  
  // 爆块
  "function blockMining()",
  
  // LP质押
  "function totalLPShares() view returns (uint256)",
  "function lpPool() view returns (uint256)",
  "function lpAccPerShare() view returns (uint256)",
  
  // 合伙人
  "function addPartner(address _partner)",
  "function addPartnerBatch(address[] _partners)",
  "function removePartner(address _partner)",
  "function isPartnerWhite(address) view returns (bool)",
  "function partnerWhiteList(uint256) view returns (address)",
  "function getPartnerCount() view returns (uint256)",
  
  // 地址限制
  "function restrictAddress(address _user)",
  "function restrictAddressBatch(address[] _users)",
  "function unrestrictAddress(address _user)",
  "function restrictedAddresses(address) view returns (bool)",
  "function getRestrictedCount() view returns (uint256)",
  
  // 管理功能
  "function setPrice(uint256 _newPrice)",
  "function setFoundationWallet(address _wallet)",
  "function adminWithdrawBNB(uint256 amount)",
  "function adminWithdrawDQ(uint256 amount)",
  "function adminWithdrawBEP20(uint256 amount)",
  
  // 合约余额
  "function getContractBalance() view returns (uint256)",
  "function getBEP20Balance() view returns (uint256)",
  
  // 事件
  "event Register(address indexed user, address indexed referrer)",
  "event Deposit(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount, uint256 fee)",
  "event BuyNode(address indexed user, uint256 cardType, uint256 amount)",
  "event LevelUp(address indexed user, uint8 newLevel)",
  "event DLevelUp(address indexed user, uint8 newDLevel)",
  "event LineQualified(address indexed user, uint256 lineCount)",
  "event ClaimLp(address indexed user, uint256 amount)",
  "event ClaimNft(address indexed user, uint256 amount)",
  "event ClaimDTeam(address indexed user, uint256 amount)",
  "event ClaimPartner(address indexed user, uint256 amount)",
  "event StakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event UnstakeDQ(address indexed user, uint256 amount, uint256 period)",
  "event BlockMining(uint256 release, uint256 burn, uint256 timestamp)",
  "event PriceUpdated(uint256 newPrice)",
  "event RestrictAddress(address indexed user)",
  "event UnrestrictAddress(address indexed user)",
  "event AddPartner(address indexed partner)",
  "event RemovePartner(address indexed partner)",
  "event SwapBEP20ForDQ(address indexed user, uint256 tokenAmount, uint256 dqAmount)",
  "event SwapDQForBEP20(address indexed user, uint256 dqAmount, uint256 tokenAmount, uint256 fee)"
];

// 卡牌配置信息
export const CARD_CONFIG = {
  A: {
    type: 1,
    name: 'A级卡牌',
    price: '500',      // BEP20
    requiredLines: 5,
    weight: 4          // 分红权重百分比
  },
  B: {
    type: 2,
    name: 'B级卡牌',
    price: '1500',     // BEP20
    requiredLines: 10,
    weight: 5
  },
  C: {
    type: 3,
    name: 'C级卡牌',
    price: '5000',     // BEP20
    requiredLines: 20,
    weight: 6
  }
};

// 节点达标配置
export const NODE_QUALIFIED_CONFIG = {
  A_CARD_LINES: 5,   // A卡需5条达标线
  B_CARD_LINES: 10,  // B卡需10条达标线
  C_CARD_LINES: 20   // C卡需20条达标线
};

// 合约地址配置
export const CONTRACT_ADDRESSES = {
  // BSC Mainnet
  BSC_MAINNET: {
    BEP20_TOKEN: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    DQPROJECT: '待部署后填写'
  },
  // BSC Testnet
  BSC_TESTNET: {
    BEP20_TOKEN: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    DQPROJECT: '待部署后填写'
  }
};
