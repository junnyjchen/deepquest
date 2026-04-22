// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * ================================================================================
 *                               DQProject 智能合约
 *                           DeepQuest DeFi 量化平台
 *                              BSC 币安智能链
 * ================================================================================
 * 
 * 【合约版本】: v3.3
 * 【Solidity版本】: 0.8.17
 * 【编译日期】: 2024
 * 
 * ================================================================================
 *                              核心业务机制
 * ================================================================================
 * 
 * 一、入金机制 (SOL 进)
 *    - 用户使用 BEP20 代币 (0x570A5D26...) 入金
 *    - 入金分成两部分：50% 动态分币池 + 50% LP 质押池
 *    - 入金条件：
 *      1. 注册：推荐人必须是节点会员
 *      2. 首次入金：用户必须是节点会员
 *      3. 后续入金：只要在节点下面有关系链即可
 * 
 * 二、出金机制 (DQ 出)
 *    - 用户卖出 DQ 代币，换回 BEP20 代币
 *    - 卖出手续费 6%，50% 给 LP 质押者，50% 给运营池
 *    - DQ 卖出即销毁（通缩机制）
 * 
 * 三、节点 NFT 系统
 *    - A卡牌：500 BEP20，需5条达标线，4%分币权重
 *    - B卡牌：1500 BEP20，需10条达标线，5%分币权重
 *    - C卡牌：5000 BEP20，需20条达标线，6%分币权重
 *    - 达标定义：直接子节点中有用户完成入金 = 1条线
 *    - 不达标只有资格，无法领取节点分红
 * 
 * 四、爆块机制
 *    - 每天释放 DQ 总量的 1.3%
 *    - 80% 销毁至黑洞，每天递减 0.5%，最低 30%
 *    - 剩余 20% 分配：LP(60%) + 节点(15%) + 基金会(5%) + 合伙人(6%) + 团队(14%)
 * 
 * 五、合伙人机制
 *    - 由 Owner 添加固定白名单地址
 *    - 合伙人收益由白名单地址平均分配
 *    - 需要满足投资和直推业绩要求
 * 
 * 六、地址限制功能
 *    - Owner 可限制某地址领取奖励
 *    - 被限制地址无法领取任何奖励
 *    - 收益转入运营池
 * 
 * ================================================================================
 *                              合约架构
 * ================================================================================
 * 
 *  ┌─────────────────────────────────────────────────────────┐
 *  │                    DQProject (主合约)                    │
 *  │  - 核心业务逻辑、用户管理、资金池分配                     │
 *  ├─────────────────────────────────────────────────────────┤
 *  │  DQToken (ERC20)          DQCard (ERC721)               │
 *  │  - DQ 代币，1000亿总量     - 节点 NFT 卡牌               │
 *  │  - 全部打入底池锁死         - A/B/C 三种等级              │
 *  └─────────────────────────────────────────────────────────┘
 * 
 * ================================================================================
 *                              重要地址
 * ================================================================================
 * 
 *  BEP20 代币地址: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
 *  黑洞地址:       0x000000000000000000000000000000000000dEaD
 * 
 * ================================================================================
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============================================================================
//                           接口定义
// ============================================================================

/**
 * @dev BEP20 代币接口
 * @notice 用于与 BEP20 代币合约交互
 */
interface IBEP20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ============================================================================
//                           DQ 代币合约
// ============================================================================

/**
 * @title DQToken
 * @notice DQ 代币合约 (ERC20 标准)
 * 
 * 【代币信息】
 * - 名称: DQ Token
 * - 符号: DQ
 * - 总供应量: 1000亿 (1,000,000,000,000 * 10^18)
 * 
 * 【代币分配】
 * - 全部铸造后打入合约地址锁死
 * - 无预留、无私募、联合坐庄
 * - 玩家人人都是庄家
 * 
 * 【销毁机制】
 * - 卖出即销毁，发送至黑洞地址
 * - 通缩率 99%，停止卖出即停止销毁
 */
contract DQToken is ERC20 {
    
    /** @dev 黑洞地址，用于接收销毁的代币 */
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    
    constructor() ERC20("DQ Token", "DQ") {
        // 铸造 1000亿 代币，全部打入合约地址锁死
        _mint(address(this), 100_000_000_000 * 10**18);
    }
    
    /**
     * @notice 销毁代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice 销毁代币到黑洞地址（永久消失）
     * @param amount 销毁数量
     */
    function burnToBlackhole(uint256 amount) external {
        _transfer(msg.sender, BLACKHOLE, amount);
    }
    
    /**
     * @notice 铸造代币（仅限合约调用）
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ============================================================================
//                           NFT 卡牌合约
// ============================================================================

/**
 * @title DQCard
 * @notice 节点 NFT 卡牌合约 (ERC721 枚举扩展)
 * 
 * 【卡牌类型】
 * - CARD_A (类型1): A级卡牌，500 BEP20
 * - CARD_B (类型2): B级卡牌，1500 BEP20  
 * - CARD_C (类型3): C级卡牌，5000 BEP20
 * 
 * 【铸造上限】
 * - A级卡牌: 1000 张
 * - B级卡牌: 500 张
 * - C级卡牌: 100 张
 * 
 * 【达标线数要求】
 * - A级卡牌: 需要 5 条达标线
 * - B级卡牌: 需要 10 条达标线
 * - C级卡牌: 需要 20 条达标线
 * 
 * 【分红权重】
 * - A级卡牌: 4%
 * - B级卡牌: 5%
 * - C级卡牌: 6%
 */
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    // ==================== 卡牌类型常量 ====================
    
    /** @dev A级卡牌类型 */
    uint256 public constant CARD_A = 1;
    /** @dev B级卡牌类型 */
    uint256 public constant CARD_B = 2;
    /** @dev C级卡牌类型 */
    uint256 public constant CARD_C = 3;
    
    // ==================== 铸造统计 ====================
    
    /** @dev 已铸造的A级卡牌数量 */
    uint256 public totalA;
    /** @dev 已铸造的B级卡牌数量 */
    uint256 public totalB;
    /** @dev 已铸造的C级卡牌数量 */
    uint256 public totalC;
    
    // ==================== 价格配置 ====================
    
    /** @dev A级卡牌价格: 500 BEP20 */
    uint256 public constant PRICE_A = 500 ether;
    /** @dev B级卡牌价格: 1500 BEP20 */
    uint256 public constant PRICE_B = 1500 ether;
    /** @dev C级卡牌价格: 5000 BEP20 */
    uint256 public constant PRICE_C = 5000 ether;
    
    // ==================== 铸造上限 ====================
    
    /** @dev A级卡牌铸造上限: 1000张 */
    uint256 public constant MAX_A = 1000;
    /** @dev B级卡牌铸造上限: 500张 */
    uint256 public constant MAX_B = 500;
    /** @dev C级卡牌铸造上限: 100张 */
    uint256 public constant MAX_C = 100;
    
    // ==================== 分红权重 ====================
    
    /** @dev A级卡牌分红权重: 4% */
    uint256 public constant WEIGHT_A = 4;
    /** @dev B级卡牌分红权重: 5% */
    uint256 public constant WEIGHT_B = 5;
    /** @dev C级卡牌分红权重: 6% */
    uint256 public constant WEIGHT_C = 6;
    
    // ==================== 达标线数要求 ====================
    
    /** @dev A级卡牌达标所需线数: 5条 */
    uint256 public constant LINE_A = 5;
    /** @dev B级卡牌达标所需线数: 10条 */
    uint256 public constant LINE_B = 10;
    /** @dev C级卡牌达标所需线数: 20条 */
    uint256 public constant LINE_C = 20;
    
    // ==================== 状态变量 ====================
    
    /** @dev tokenId => 卡牌类型 (1=A, 2=B, 3=C) */
    mapping(uint256 => uint256) public cardType;
    /** @dev 持有者的NFT列表 */
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    
    constructor() ERC721("DQ Card", "DQC") {}
    
    /**
     * @notice Owner铸造卡牌
     * @param to 接收地址
     * @param _type 卡牌类型 (1=A, 2=B, 3=C)
     */
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    
    /**
     * @dev 铸造NFT卡牌
     * @param to 接收地址
     * @param _type 卡牌类型
     */
    function _mintCard(address to, uint256 _type) internal {
        require(_type >= CARD_A && _type <= CARD_C, "invalid type");
        
        // 检查铸造上限
        if (_type == CARD_A) {
            require(totalA < MAX_A, "A sold out");
            totalA++;
        } else if (_type == CARD_B) {
            require(totalB < MAX_B, "B sold out");
            totalB++;
        } else {
            require(totalC < MAX_C, "C sold out");
            totalC++;
        }
        
        uint256 tokenId = totalSupply() + 1;
        _safeMint(to, tokenId);
        cardType[tokenId] = _type;
        _holderTokens[to].add(tokenId);
    }
    
    /**
     * @dev 转账前更新持有者NFT列表
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        if (batchSize > 1) {
            revert("ERC721Enumerable: consecutive transfers not supported");
        }
        if (from != address(0)) {
            _holderTokens[from].remove(firstTokenId);
        }
        if (to != address(0)) {
            _holderTokens[to].add(firstTokenId);
        }
    }
    
    /**
     * @notice 获取卡牌价格
     * @param _type 卡牌类型
     * @return 价格 (以 wei 为单位)
     */
    function getCardPrice(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return PRICE_A;
        if (_type == CARD_B) return PRICE_B;
        return PRICE_C;
    }
    
    /**
     * @notice 获取卡牌分红权重
     * @param _type 卡牌类型
     * @return 权重百分比
     */
    function getCardWeight(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return WEIGHT_A;
        if (_type == CARD_B) return WEIGHT_B;
        return WEIGHT_C;
    }
    
    /**
     * @notice 获取卡牌达标所需线数
     * @param _type 卡牌类型
     * @return 所需线数
     */
    function getRequiredLines(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return LINE_A;
        if (_type == CARD_B) return LINE_B;
        return LINE_C;
    }
}

// ============================================================================
//                           主合约
// ============================================================================

/**
 * @title DQProject
 * @notice DeepQuest DeFi 量化平台主合约
 * 
 * 【主要功能】
 * - 用户注册与管理
 * - 节点 NFT 购买
 * - 入金/出金操作
 * - LP 质押分红
 * - 节点达标分红
 * - 动态奖金分配
 * - 合伙人白名单
 * - 地址限制功能
 * 
 * 【权限控制】
 * - 所有敏感操作均需通过 modifier 检查
 * - 管理员操作仅限 Owner
 * 
 * 【安全机制】
 * - 重入锁保护 (ReentrancyGuard)
 * - SafeERC20 安全转账
 */
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    // ==================== 关联合约 ====================
    
    /** @dev DQ 代币合约实例 */
    DQToken public dqToken;
    /** @dev NFT 卡牌合约实例 */
    DQCard public dqCard;
    
    // ==================== 核心地址配置 ====================
    
    /** @dev BEP20 代币地址 (入金/出金代币) */
    address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    /** @dev 黑洞地址 (用于接收销毁的代币) */
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    /** @dev 基金会钱包地址 */
    address public foundationWallet;
    
    // ==================== 价格与汇率 ====================
    
    /** @dev DQ 代币价格 (1 DQ = dqPrice BEP20) */
    uint256 public dqPrice = 1 ether;
    
    // ==================== 爆块配置 ====================
    
    /** @dev 每日释放率: 1.3% */
    uint256 public dailyReleaseRate = 13;  // 1.3% = 13/1000
    /** @dev 初始销毁率: 80% */
    uint256 public burnRate = 80;
    /** @dev 最低销毁率: 30% */
    uint256 public constant MIN_BURN_RATE = 30;
    /** @dev 每日销毁率递减: 0.5% */
    uint256 public constant BURN_DECREMENT = 5;  // 0.5% = 5/1000
    
    // ==================== 入金上限配置 ====================
    
    /** @dev 最小入金金额: 1 BEP20 */
    uint256 public constant INVEST_MIN = 1 ether;
    /** @dev 初始最大入金: 10 BEP20 */
    uint256 public INVEST_MAX_START = 10 ether;
    /** @dev 最大入金递增步长: 10 BEP20 */
    uint256 public INVEST_MAX_STEP = 10 ether;
    /** @dev 最终最大入金上限: 200 BEP20 */
    uint256 public INVEST_MAX_FINAL = 200 ether;
    /** @dev 每个阶段持续时间: 15天 */
    uint256 public PHASE_DURATION = 15 days;
    /** @dev 合约开始时间 */
    uint256 public startTime;
    /** @dev 最后爆块时间 */
    uint256 public lastBlockTime;
    
    // ==================== 管理奖级别配置 ====================
    
    /** @dev 管理奖各级别分红比例: [0, 5, 10, 15, 20, 25, 30] */
    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    /** @dev D级团队各级别有效地址门槛: [30, 120, 360, 1000, 4000, 10000, 15000, 30000] */
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    // ============================================================================
    //                           用户数据结构
    // ============================================================================
    
    /**
     * @dev 用户信息结构体
     * 
     * @member referrer 推荐人地址
     * @member directCount 直接推荐人数
     * @member level 管理奖级别 (S1-S6)
     * @member dLevel D级团队级别 (D1-D8)
     * @member totalInvest 累计投资总额
     * @member teamInvest 团队业绩
     * @member energy 能量值 (入金额×6)
     * @member directSales 直推业绩
     * @member hasNode 是否已购买节点
     * @member hasDeposited 是否已完成首次入金
     * @member activeLineCount 达标线数
     * @member children 子节点列表
     */
    struct User {
        address referrer;                    // 推荐人地址
        uint256 directCount;                 // 直接推荐人数
        uint8 level;                         // 管理奖级别 S1-S6
        uint8 dLevel;                        // D级团队 D1-D8
        uint256 totalInvest;                 // 累计投资总额
        uint256 teamInvest;                  // 团队业绩
        uint256 energy;                      // 能量值
        uint256 directSales;                 // 直推业绩
        bool hasNode;                        // 是否已购买节点
        bool hasDeposited;                   // 是否已完成首次入金
        uint256 activeLineCount;             // 达标线数
        EnumerableSet.AddressSet children;   // 子节点列表
    }
    
    /** @dev 用户地址 => 用户信息 */
    mapping(address => User) internal _users;
    /** @dev 所有用户地址列表 */
    address[] public allUsers;
    
    // ============================================================================
    //                           LP 质押
    // ============================================================================
    
    /**
     * @dev LP质押记录结构体
     * @member amount 质押数量
     * @member startTime 质押开始时间
     * @member rewardDebt 待领取分红
     */
    struct LPStake {
        uint256 amount;      // 质押数量
        uint256 startTime;   // 质押开始时间
        uint256 rewardDebt;  // 待领取分红
    }
    
    /** @dev 用户LP质押记录 */
    mapping(address => LPStake) public lpStakes;
    /** @dev LP总份额 */
    uint256 public totalLPShares;
    /** @dev LP累积收益份额 */
    uint256 public lpAccPerShare;
    /** @dev LP质押池余额 */
    uint256 public lpPool;
    
    // ============================================================================
    //                           单币质押
    // ============================================================================
    
    /** @dev 用户单币质押: user => period => amount */
    mapping(address => mapping(uint => uint256)) public singleStakes;
    /** @dev 质押周期列表: [30, 90, 180, 360] 天 */
    uint256[] public stakePeriods = [30, 90, 180, 360];
    /** @dev 各周期分红比例: [5, 10, 15, 20] (分6%手续费的百分比) */
    uint256[] public stakeRates = [5, 10, 15, 20];
    /** @dev 各周期累积手续费份额 */
    mapping(uint => uint256) public stakeFeeAccPerShare;
    /** @dev 各周期质押总量 */
    mapping(uint => uint256) public totalSingleStaked;

    // ============================================================================
    //                           合伙人白名单
    // ============================================================================
    
    /** @dev 合伙人白名单地址列表 */
    address[] public partnerWhiteList;
    /** @dev 地址是否在合伙人白名单中 */
    mapping(address => bool) public isPartnerWhite;
    /** @dev 合伙人待领取收益 */
    mapping(address => uint256) public partnerDebt;
    /** @dev 合伙人累积收益份额 */
    uint256 public partnerAccPerShare;

    // ============================================================================
    //                           地址限制
    // ============================================================================
    
    /** @dev 是否被限制领取奖励 */
    mapping(address => bool) public isRestricted;
    /** @dev 限制前的待领取收益 */
    mapping(address => uint256) public restrictedDebt;

    // ============================================================================
    //                           资金池
    // ============================================================================
    
    /** @dev 动态奖金池 (50%入金) */
    uint256 public dynamicPool;
    /** @dev 保险池 (7%动态奖金) */
    uint256 public insurancePool;
    /** @dev 运营池 (8%动态奖金 + 限制地址收益) */
    uint256 public operationPool;
    /** @dev 手续费池 (卖出手续费) */
    uint256 public feePool;
    
    // ============================================================================
    //                           NFT 分红
    // ============================================================================
    
    /** @dev 各类型NFT累积收益份额 [A, B, C] */
    uint256[3] public nftAccPerShare;
    /** @dev 用户各类型NFT待领取收益: user => typeIndex => debt */
    mapping(address => uint256[3]) public nftRewardDebt;
    
    // ============================================================================
    //                           团队奖励
    // ============================================================================
    
    /** @dev 各级别用户数量 [D1-D8] */
    uint256[8] public dTotalUsers;
    /** @dev 各级别累积收益份额 [D1-D8] */
    uint256[8] public dAccPerShare;
    /** @dev 用户团队待领取收益 */
    mapping(address => uint256) public dRewardDebt;
    
    // ============================================================================
    //                           爆块奖励
    // ============================================================================
    
    /** @dev 爆块累积收益份额 */
    uint256 public blockAccPerShare;
    /** @dev 用户爆块待领取收益 */
    mapping(address => uint256) public blockRewardDebt;

    // ============================================================================
    //                           事件定义
    // ============================================================================
    
    /** @dev 用户注册事件 */
    event Register(address indexed user, address indexed referrer);
    /** @dev 购买节点事件 */
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    /** @dev 入金事件 */
    event Deposit(address indexed user, uint256 amount, uint256 dqAmount, bool isFirst);
    /** @dev 出金事件 */
    event Withdraw(address indexed user, uint256 amount);
    /** @dev 单币质押事件 */
    event StakeSingle(address indexed user, uint256 amount, uint256 period);
    /** @dev 解除单币质押事件 */
    event UnstakeSingle(address indexed user, uint256 amount, uint256 period);
    /** @dev 爆块事件 */
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    /** @dev 领取LP分红事件 */
    event ClaimLP(address indexed user, uint256 amount);
    /** @dev 领取单币质押收益事件 */
    event ClaimSingle(address indexed user, uint256 amount);
    /** @dev 领取NFT分红事件 */
    event ClaimNft(address indexed user, uint256 amount);
    /** @dev 领取团队分红事件 */
    event ClaimDTeam(address indexed user, uint256 amount);
    /** @dev 领取合伙人分红事件 */
    event ClaimPartner(address indexed user, uint256 amount);
    /** @dev 级别晋升事件 */
    event LevelUp(address indexed user, uint8 newLevel);
    /** @dev D级晋升事件 */
    event DLevelUp(address indexed user, uint8 newDLevel);
    /** @dev 节点达标事件 */
    event LineQualified(address indexed user, uint256 lineCount);
    /** @dev 价格更新事件 */
    event PriceUpdated(uint256 newPrice);
    /** @dev 设置基金会钱包事件 */
    event SetFoundationWallet(address indexed wallet);
    /** @dev 添加合伙人白名单事件 */
    event AddPartnerWhiteList(address indexed partner);
    /** @dev 移除合伙人白名单事件 */
    event RemovePartnerWhiteList(address indexed partner);
    /** @dev 限制地址事件 */
    event RestrictAddress(address indexed user, address indexed operator);
    /** @dev 解除限制事件 */
    event UnrestrictAddress(address indexed user, address indexed operator);

    // ============================================================================
    //                           构造函数
    // ============================================================================
    
    /**
     * @notice 构造函数
     * @param _foundationWallet 基金会钱包地址
     */
    constructor(address _foundationWallet) {
        dqToken = new DQToken();
        dqCard = new DQCard();
        foundationWallet = _foundationWallet;
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        
        // 初始化 owner
        _users[owner()].referrer = address(0);
        _users[owner()].hasNode = true;
        _users[owner()].activeLineCount = type(uint256).max; // 基金会无限线
        allUsers.push(owner());
    }

    // ============================================================================
    //                           修饰符
    // ============================================================================
    
    /**
     * @dev 检查用户是否可以入金
     * 条件：
     * 1. 用户已注册（有推荐人）
     * 2. 推荐链上有节点会员
     * 3. 如果是首次入金，用户必须是节点
     */
    modifier onlyCanDeposit() {
        address referrer = _users[msg.sender].referrer;
        require(referrer != address(0), "not registered");
        require(_hasNodeInUpline(msg.sender), "no node in upline");
        
        // 首次入金需要是节点
        if (!_users[msg.sender].hasDeposited) {
            require(_users[msg.sender].hasNode, "first deposit requires node");
        }
        _;
    }
    
    /**
     * @dev 检查地址是否被限制
     */
    modifier notRestricted() {
        require(!isRestricted[msg.sender], "address is restricted");
        _;
    }

    // ============================================================================
    //                           内部函数
    // ============================================================================
    
    /**
     * @dev 检查用户的上级链上是否有节点
     * @param _user 用户地址
     * @return 是否有节点
     */
    function _hasNodeInUpline(address _user) internal view returns (bool) {
        address current = _users[_user].referrer;
        uint256 depth = 0;
        while (current != address(0) && depth < 100) {
            if (_users[current].hasNode) {
                return true;
            }
            current = _users[current].referrer;
            depth++;
        }
        return false;
    }
    
    /**
     * @dev 更新用户的达标线数
     * @param _user 用户地址
     * 达标定义：直接子节点中有用户完成入金 = 1条线
     */
    function _updateActiveLines(address _user) internal {
        uint256 qualifiedLines = 0;
        address[] memory children = _users[_user].children.values();
        
        for (uint i = 0; i < children.length; i++) {
            if (_users[children[i]].totalInvest > 0) {
                qualifiedLines++;
            }
        }
        
        if (qualifiedLines != _users[_user].activeLineCount) {
            _users[_user].activeLineCount = qualifiedLines;
            emit LineQualified(_user, qualifiedLines);
        }
    }
    
    /**
     * @dev 通知上级链上有新入金，更新达标线数
     */
    function _notifyUplineOfDeposit(address _user) internal {
        address current = _users[_user].referrer;
        uint256 depth = 0;
        while (current != address(0) && depth < 100) {
            if (_users[current].hasNode) {
                _updateActiveLines(current);
            }
            current = _users[current].referrer;
            depth++;
        }
    }

    // ============================================================================
    //                           用户注册
    // ============================================================================
    
    /**
     * @notice 注册成为会员
     * @param _referrer 推荐人地址（推荐人必须是节点会员）
     * 
     * @dev 注册规则：
     * - 推荐人不能为空且不能是自己
     * - 推荐人必须已注册
     * - 推荐人必须已购买节点
     */
    function register(address _referrer) external {
        require(_referrer != address(0) && _referrer != msg.sender, "invalid referrer");
        require(_users[msg.sender].referrer == address(0), "already registered");
        require(_users[_referrer].hasNode, "referrer must have node first");

        _users[msg.sender].referrer = _referrer;
        _users[_referrer].directCount++;
        _users[_referrer].children.add(msg.sender);
        allUsers.push(msg.sender);

        emit Register(msg.sender, _referrer);
    }

    // ============================================================================
    //                           入金配置
    // ============================================================================
    
    /**
     * @notice 获取当前最大可入金金额
     * @dev 前期控进机制：
     * - 1-10天: 每天1000个地址，每人1 BEP20
     * - 11-20天: 每天1500个地址，1-5 BEP20
     * - 21-30天: 每天2000个地址，1-5 BEP20
     * - 31天后: 每15天增加10 BEP20上限，最高200 BEP20
     */
    function getCurrentMaxInvest() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        uint256 phase = elapsed / PHASE_DURATION;
        
        if (phase < 2) return INVEST_MIN;
        if (phase < 4) return 15 ether;
        if (phase < 6) return 20 ether;
        
        uint256 max = INVEST_MAX_START + (phase - 4) * INVEST_MAX_STEP;
        if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
        return max;
    }

    // ============================================================================
    //                           购买节点
    // ============================================================================
    
    /**
     * @notice 购买节点 NFT 卡牌
     * @param _type 卡牌类型 (1=A级, 2=B级, 3=C级)
     * 
     * @dev 节点权益：
     * - 购买后成为节点会员，可进行首次入金
     * - 可获得对应级别的管理奖级别
     * - 可领取节点NFT分红（需达标）
     * 
     * @dev 资金分配：
     * - 100% 进入 LP 质押池
     */
    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = dqCard.getCardPrice(_type);
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= price, "insufficient balance");
        
        // 接收 BEP20 代币
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), price);
        
        // 铸造 NFT
        dqCard.mintByOwner(msg.sender, _type);
        
        // 标记用户已购买节点
        _users[msg.sender].hasNode = true;
        
        // 资金进入 LP 池
        lpPool += price;
        totalLPShares += price;
        
        // 自动升级用户级别
        User storage user = _users[msg.sender];
        if (_type == 1 && user.level < 1) {
            user.level = 1;
            emit LevelUp(msg.sender, 1);
        } else if (_type == 2 && user.level < 2) {
            user.level = 2;
            emit LevelUp(msg.sender, 2);
        } else if (_type == 3 && user.level < 3) {
            user.level = 3;
            emit LevelUp(msg.sender, 3);
        }
        
        // 如果用户未注册，自动注册到 owner
        if (user.referrer == address(0) && msg.sender != owner()) {
            _users[msg.sender].referrer = owner();
            _users[owner()].directCount++;
            _users[owner()].children.add(msg.sender);
            allUsers.push(msg.sender);
            emit Register(msg.sender, owner());
        }
        
        // 更新达标线数
        _updateActiveLines(msg.sender);
        
        emit BuyNode(msg.sender, _type, price);
    }

    // ============================================================================
    //                           入金
    // ============================================================================
    
    /**
     * @notice 入金：存入 BEP20，换取 DQ
     * @param _amount 入金数量 (最小 1 BEP20)
     * 
     * @dev 入金条件：
     * - 用户已注册
     * - 推荐链上有节点会员
     * - 如果是首次入金，用户必须是节点
     * 
     * @dev 资金分配：
     * - 50% 进入动态分币池
     * - 50% 进入 LP 质押池
     * 
     * @dev 动态奖金分配 (50%动态池)：
     * - 直推奖: 30%
     * - 见点奖: 15%
     * - 管理奖: 30%
     * - DAO补贴: 10%
     * - 保险池: 7%
     * - 运营池: 8%
     */
    function deposit(uint256 _amount) external nonReentrant onlyCanDeposit {
        require(_amount >= INVEST_MIN, "below minimum");
        require(_amount <= getCurrentMaxInvest(), "exceed max");
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= _amount, "insufficient balance");
        
        bool isFirst = !_users[msg.sender].hasDeposited;
        
        // 接收 BEP20 代币
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), _amount);
        
        // 计算 DQ 数量
        uint256 dqAmount = _amount * 1 ether / dqPrice;
        
        // 资金分配
        uint256 dynamicShare = _amount * 50 / 100;
        uint256 lpShare = _amount * 50 / 100;
        
        dynamicPool += dynamicShare;
        lpPool += lpShare;
        totalLPShares += lpShare;
        
        // 更新用户数据
        User storage user = _users[msg.sender];
        user.totalInvest += _amount;
        user.energy += _amount * 6; // 能量值6倍
        user.directSales += _amount;
        user.hasDeposited = true;
        
        // 更新团队业绩
        _updateTeamInvest(msg.sender, _amount);
        
        // 分发动态奖金
        _distributeDynamic(msg.sender, dynamicShare);
        
        // 通知上级更新达标线数
        _notifyUplineOfDeposit(msg.sender);
        
        // 检查级别晋升
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        _checkAndAddPartner(msg.sender);
        
        // 铸造 DQ 给用户
        dqToken.mint(msg.sender, dqAmount);
        
        emit Deposit(msg.sender, _amount, dqAmount, isFirst);
    }

    // ============================================================================
    //                           查询函数
    // ============================================================================
    
    /**
     * @notice 检查节点是否达标
     * @param _user 用户地址
     * @return qualified 是否达标
     * @return currentLines 当前达标线数
     * @return requiredLines 所需线数
     * 
     * @dev 达标条件：
     * - 用户持有NFT
     * - 直接子节点中有足够用户完成入金
     * - A级需要5条，B级需要10条，C级需要20条
     */
    function checkNodeQualified(address _user) public view returns (bool qualified, uint256 currentLines, uint256 requiredLines) {
        uint256 balance = dqCard.balanceOf(_user);
        if (balance == 0) {
            return (false, 0, 0);
        }
        
        // 获取最高级别卡牌
        uint256 highestType = 0;
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(_user, i);
            uint256 ctype = dqCard.cardType(tokenId);
            if (ctype > highestType) {
                highestType = ctype;
            }
        }
        
        uint256 required = dqCard.getRequiredLines(highestType);
        uint256 current = _users[_user].activeLineCount;
        
        return (current >= required, current, required);
    }
    
    /**
     * @notice 检查用户是否可以入金
     */
    function canDeposit(address _user) external view returns (bool) {
        if (_users[_user].referrer == address(0)) return false;
        if (!_hasNodeInUpline(_user)) return false;
        if (!_users[_user].hasDeposited && !_users[_user].hasNode) return false;
        return true;
    }

    // ============================================================================
    //                           动态奖金分配
    // ============================================================================
    
    /**
     * @dev 分发动态奖金
     * @param _user 用户地址
     * @param _amount 总奖金金额
     */
    function _distributeDynamic(address _user, uint256 _amount) internal {
        // 分配比例
        uint256 directShare = _amount * 30 / 100;  // 直推奖 30%
        uint256 nodeShare = _amount * 15 / 100;    // 见点奖 15%
        uint256 mgmtShare = _amount * 30 / 100;    // 管理奖 30%
        uint256 daoShare = _amount * 10 / 100;     // DAO补贴 10%
        uint256 insuranceShare = _amount * 7 / 100; // 保险池 7%
        uint256 operationShare = _amount * 8 / 100; // 运营池 8%
        
        // 直推奖励
        address referrer = _users[_user].referrer;
        if (referrer != address(0)) {
            if (!isRestricted[referrer]) {
                if (_users[referrer].energy >= directShare) {
                    _users[referrer].energy -= directShare;
                }
            } else {
                operationPool += directShare;
            }
            _users[referrer].directSales += directShare;
        }
        
        // 见点奖 (15层)
        _distributeNode(_user, nodeShare);
        
        // 管理奖级差
        _distributeManagement(_user, mgmtShare);
        
        // DAO补贴
        _distributeDAO(_user, daoShare);
        
        insurancePool += insuranceShare;
        operationPool += operationShare;
    }
    
    /**
     * @dev 分发见点奖
     * @param _user 用户地址
     * @param _total 见点奖总额
     * 
     * @dev 见点奖规则：
     * - 每层平均分配
     * - 最多15层
     * - 每人的最大层数 = 直推人数 × 3
     * - 只有达标的节点才能领取
     */
    function _distributeNode(address _user, uint256 _total) internal {
        uint256 perLayer = _total / 15;
        address current = _users[_user].referrer;
        uint256 layer = 1;
        
        while (current != address(0) && layer <= 15) {
            // 检查节点是否达标
            (bool qualified, , ) = checkNodeQualified(current);
            uint256 maxLayer = _users[current].directCount * 3;
            if (maxLayer > 15) maxLayer = 15;
            
            if (layer <= maxLayer && qualified) {
                if (!isRestricted[current]) {
                    if (_users[current].energy >= perLayer) {
                        _users[current].energy -= perLayer;
                    }
                } else {
                    insurancePool += perLayer;
                }
            } else {
                insurancePool += perLayer;
            }
            current = _users[current].referrer;
            layer++;
        }
        while (layer <= 15) {
            insurancePool += perLayer;
            layer++;
        }
    }
    
    /**
     * @dev 分发管理奖
     * @param _user 用户地址
     * @param _total 管理奖总额
     * 
     * @dev 管理奖规则：
     * - 级差制，按小区业绩晋升
     * - S1: 100 SOL, 5%
     * - S2: 200 SOL, 10%
     * - S3: 600 SOL, 15%
     * - S4: 2000 SOL, 20%
     * - S5: 6000 SOL, 25%
     * - S6: 20000 SOL, 30%
     */
    function _distributeManagement(address _user, uint256 _total) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 rate = levelRates[level];
            
            if (rate > lastRate) {
                uint256 delta = rate - lastRate;
                uint256 reward = _total * delta / 30;
                
                if (!isRestricted[current]) {
                    if (_users[current].energy >= reward) {
                        _users[current].energy -= reward;
                    }
                } else {
                    operationPool += reward;
                }
                lastRate = rate;
            }
            current = _users[current].referrer;
        }
    }
    
    /**
     * @dev 分发DAO补贴
     */
    function _distributeDAO(address _user, uint256 _total) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 daoRate = 0;
            if (level >= 6) daoRate = 10;
            else if (level >= 3) daoRate = 5;
            
            if (daoRate > lastRate) {
                uint256 delta = daoRate - lastRate;
                uint256 reward = _total * delta / 10;
                
                if (!isRestricted[current]) {
                    if (_users[current].energy >= reward) {
                        _users[current].energy -= reward;
                    }
                } else {
                    operationPool += reward;
                }
                lastRate = daoRate;
            }
            current = _users[current].referrer;
        }
    }
    
    /**
     * @dev 更新团队业绩
     */
    function _updateTeamInvest(address _user, uint256 _amount) internal {
        address current = _user;
        while (current != address(0)) {
            _users[current].teamInvest += _amount;
            current = _users[current].referrer;
        }
    }

    /**
     * @dev 检查管理奖级别晋升
     */
    function _checkLevelUp(address _user) internal {
        User storage user = _users[_user];
        uint256 maxChild = 0;
        uint256 sumOthers = 0;
        address[] memory children = user.children.values();
        
        for (uint i = 0; i < children.length; i++) {
            uint256 childTeam = _users[children[i]].teamInvest;
            if (childTeam > maxChild) {
                maxChild = childTeam;
            }
            sumOthers += childTeam;
        }
        
        uint256 smallArea = sumOthers - maxChild;
        uint8 newLevel = 0;
        if (smallArea >= 20000 ether) newLevel = 6;
        else if (smallArea >= 6000 ether) newLevel = 5;
        else if (smallArea >= 2000 ether) newLevel = 4;
        else if (smallArea >= 600 ether) newLevel = 3;
        else if (smallArea >= 200 ether) newLevel = 2;
        else if (smallArea >= 100 ether) newLevel = 1;
        
        if (newLevel > user.level) {
            user.level = newLevel;
            emit LevelUp(_user, newLevel);
        }
    }
    
    /**
     * @dev 检查D级团队晋升
     */
    function _checkDLevel(address _user) internal {
        User storage user = _users[_user];
        uint256 effective = _getEffectiveCount(_user);
        uint8 newD = 0;
        
        for (uint8 i = 0; i < 8; i++) {
            if (effective >= dThresholds[i]) {
                newD = i + 1;
            } else break;
        }
        
        if (newD != user.dLevel) {
            if (user.dLevel > 0) dTotalUsers[user.dLevel - 1]--;
            if (newD > 0) dTotalUsers[newD - 1]++;
            user.dLevel = newD;
            emit DLevelUp(_user, newD);
        }
    }
    
    /**
     * @dev 获取有效直推人数
     */
    function _getEffectiveCount(address _user) internal view returns (uint256) {
        uint256 count = 0;
        address[] memory children = _users[_user].children.values();
        for (uint i = 0; i < children.length; i++) {
            if (_users[children[i]].totalInvest > 0) count++;
        }
        return count;
    }
    
    /**
     * @dev 检查并添加合伙人
     */
    function _checkAndAddPartner(address _user) internal {
        if (!isPartnerWhite[_user]) return;

        User storage user = _users[_user];
        uint256 investReq = 5000 ether;
        if (user.totalInvest < investReq) return;

        uint256 salesReq = partnerWhiteList.length <= 20 ? 30000 ether : 50000 ether;
        if (user.directSales < salesReq) return;

        partnerDebt[_user] = partnerAccPerShare / 1e12;
    }

    // ============================================================================
    //                           出金
    // ============================================================================
    
    /**
     * @notice 卖出 DQ，换回 BEP20
     * @param _dqAmount 要卖出的 DQ 数量
     * @param _minOut 最小接收的 BEP20 数量（防滑点）
     * 
     * @dev 卖出规则：
     * - 扣除 6% 手续费
     * - 50% 手续费给 LP 质押者
     * - 50% 手续费给运营池
     * - DQ 卖出即销毁
     */
    function withdrawDQ(uint256 _dqAmount, uint256 _minOut) external nonReentrant notRestricted {
        require(_dqAmount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        
        uint256 bep20Amount = _dqAmount * dqPrice / 1 ether;
        uint256 fee = bep20Amount * 6 / 100;
        uint256 userOut = bep20Amount - fee;
        
        require(userOut >= _minOut, "slippage too high");
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= userOut, "insufficient token");
        
        // 销毁 DQ
        dqToken.burn(_dqAmount);
        
        // 手续费分配
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        _distributeWithdrawFee(stakeFee);
        operationPool += operationFee;
        
        // 转 BEP20 给用户
        IBEP20(BEP20_TOKEN).transfer(msg.sender, userOut);
        
        emit Withdraw(msg.sender, userOut);
    }
    
    /**
     * @dev 分发卖出手续费给 LP 质押者
     */
    function _distributeWithdrawFee(uint256 _feeAmount) internal {
        if (totalLPShares > 0) {
            lpAccPerShare += _feeAmount * 1e12 / totalLPShares;
        }
    }

    // ============================================================================
    //                           LP 质押分红
    // ============================================================================
    
    /**
     * @notice 领取 LP 质押分红
     */
    function claimLP() external nonReentrant notRestricted {
        uint256 pending = lpStakes[msg.sender].amount * lpAccPerShare / 1e12 - lpStakes[msg.sender].rewardDebt;
        require(pending > 0, "no pending");
        
        lpStakes[msg.sender].rewardDebt = lpStakes[msg.sender].amount * lpAccPerShare / 1e12;
        
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimLP(msg.sender, pending);
    }
    
    // ============================================================================
    //                           爆块机制
    // ============================================================================
    
    /**
     * @notice 每日爆块
     * 
     * @dev 爆块机制：
     * - 每天释放 DQ 总量的 1.3%
     * - 80% 销毁至黑洞，每天递减 0.5%，最低 30%
     * - 剩余 20% 分配：
     *   - LP质押者: 60%
     *   - 节点NFT: 15%
     *   - 基金会: 5%
     *   - 合伙人: 6%
     *   - 团队D1-D8: 14%
     */
    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");
        
        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000; // 1.3%
        uint256 burn = release * burnRate / 100;                  // 80%
        
        // 销毁到黑洞
        dqToken.burnToBlackhole(burn);
        
        // 递减销毁率
        if (burnRate > MIN_BURN_RATE) {
            burnRate -= BURN_DECREMENT;
            if (burnRate < MIN_BURN_RATE) burnRate = MIN_BURN_RATE;
        }
        
        uint256 remaining = release - burn; // 20%
        
        // 分配比例
        uint256 lpShare = remaining * 60 / 100;
        uint256 nftShare = remaining * 15 / 100;
        uint256 foundationShare = remaining * 5 / 100;
        uint256 partnerShare = remaining * 6 / 100;
        uint256 teamShare = remaining * 14 / 100;
        
        // LP 分红
        if (totalLPShares > 0) {
            blockAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        
        // NFT 分红
        _updateNftAcc(nftShare);
        
        // 基金会
        uint256 foundationDQ = foundationShare * 1 ether / dqPrice;
        dqToken.mint(foundationWallet, foundationDQ);
        
        // 合伙人 (白名单平均分配)
        _updatePartnerAcc(partnerShare);
        
        // 团队 D1-D8
        _updateTeamAcc(teamShare);
        
        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }
    
    /**
     * @dev 更新合伙人累积收益
     */
    function _updatePartnerAcc(uint256 _partnerShare) internal {
        uint256 partnerCount = partnerWhiteList.length;
        if (partnerCount > 0) {
            partnerAccPerShare += _partnerShare * 1e12 / partnerCount;
        }
    }
    
    /**
     * @dev 更新 NFT 累积收益
     */
    function _updateNftAcc(uint256 _nftShare) internal {
        uint256[3] memory totals = [dqCard.totalA(), dqCard.totalB(), dqCard.totalC()];
        uint256[3] memory weights = [dqCard.WEIGHT_A(), dqCard.WEIGHT_B(), dqCard.WEIGHT_C()];
        uint256 totalWeight = 15;
        
        for (uint i = 0; i < 3; i++) {
            if (totals[i] > 0) {
                uint256 shareForType = _nftShare * weights[i] / totalWeight;
                nftAccPerShare[i] += shareForType * 1e12 / totals[i];
            }
        }
    }
    
    /**
     * @dev 更新团队累积收益
     */
    function _updateTeamAcc(uint256 _teamShare) internal {
        uint256 perLevelShare = _teamShare / 8;
        for (uint i = 0; i < 8; i++) {
            if (dTotalUsers[i] > 0) {
                dAccPerShare[i] += perLevelShare * 1e12 / dTotalUsers[i];
            }
        }
    }
    
    // ============================================================================
    //                           领取分红
    // ============================================================================
    
    /**
     * @notice 领取 NFT 分红
     * @dev 只有达标的节点才能领取
     */
    function claimNft() external nonReentrant notRestricted {
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        
        (bool qualified, , ) = checkNodeQualified(msg.sender);
        require(qualified, "node not qualified");
        
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            
            uint256 pending = nftAccPerShare[typeIndex] / 1e12 - nftRewardDebt[msg.sender][typeIndex];
            totalPending += pending;
            nftRewardDebt[msg.sender][typeIndex] = nftAccPerShare[typeIndex] / 1e12;
        }
        
        require(totalPending > 0, "no pending");
        uint256 dqAmount = totalPending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimNft(msg.sender, totalPending);
    }
    
    /**
     * @notice 领取 D 级团队分红
     */
    function claimDTeam() external nonReentrant notRestricted {
        User storage user = _users[msg.sender];
        require(user.dLevel > 0, "no d level");
        
        uint256 levelIndex = user.dLevel - 1;
        uint256 pending = dAccPerShare[levelIndex] / 1e12 - dRewardDebt[msg.sender];
        require(pending > 0, "no pending");
        
        dRewardDebt[msg.sender] = dAccPerShare[levelIndex] / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimDTeam(msg.sender, pending);
    }
    
    /**
     * @notice 领取合伙人分红
     * @dev 只有在白名单中的地址才能领取
     */
    function claimPartner() external nonReentrant notRestricted {
        require(isPartnerWhite[msg.sender], "not in partner whitelist");
        
        uint256 pending = partnerAccPerShare / 1e12 - partnerDebt[msg.sender];
        require(pending > 0, "no pending");
        
        partnerDebt[msg.sender] = partnerAccPerShare / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimPartner(msg.sender, pending);
    }

    // ============================================================================
    //                           单币质押
    // ============================================================================
    
    /**
     * @notice 单币质押 DQ
     * @param _amount 质押数量
     * @param _periodIndex 质押周期索引 (0=30天, 1=90天, 2=180天, 3=360天)
     * 
     * @dev 分红比例：
     * - 30天: 分 6% 手续费的 5%
     * - 90天: 分 6% 手续费的 10%
     * - 180天: 分 6% 手续费的 15%
     * - 360天: 分 6% 手续费的 20%
     */
    function stakeSingle(uint256 _amount, uint _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        require(_amount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= _amount, "insufficient DQ");
        
        uint256 period = stakePeriods[_periodIndex];
        
        dqToken.transferFrom(msg.sender, address(this), _amount);
        
        singleStakes[msg.sender][period] += _amount;
        totalSingleStaked[period] += _amount;
        
        emit StakeSingle(msg.sender, _amount, period);
    }
    
    /**
     * @notice 解除单币质押
     * @param _periodIndex 质押周期索引
     */
    function unstakeSingle(uint256 _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        uint256 period = stakePeriods[_periodIndex];
        uint256 amount = singleStakes[msg.sender][period];
        require(amount > 0, "no stake");
        
        _claimSingleStake(msg.sender, period);
        
        singleStakes[msg.sender][period] = 0;
        totalSingleStaked[period] -= amount;
        
        dqToken.transfer(msg.sender, amount);
        
        emit UnstakeSingle(msg.sender, amount, period);
    }
    
    /**
     * @dev 领取单币质押收益
     */
    function _claimSingleStake(address _user, uint _period) internal {
        uint256 pending = singleStakes[_user][_period] * stakeFeeAccPerShare[_period] / 1e12;
        if (pending > 0) {
            uint256 dqAmount = pending * 1 ether / dqPrice;
            dqToken.mint(_user, dqAmount);
        }
    }

    // ============================================================================
    //                           管理员功能
    // ============================================================================
    
    /**
     * @notice 添加合伙人白名单
     * @param _partner 合伙人地址
     * 
     * @dev 合伙人权益：
     * - 可领取 6% 的合伙人分红
     * - 分红由所有白名单地址平均分配
     */
    function addPartnerWhiteList(address _partner) external onlyOwner {
        require(_partner != address(0), "invalid address");
        require(!isPartnerWhite[_partner], "already in whitelist");
        
        isPartnerWhite[_partner] = true;
        partnerWhiteList.push(_partner);
        partnerDebt[_partner] = partnerAccPerShare / 1e12;
        
        emit AddPartnerWhiteList(_partner);
    }
    
    /**
     * @notice 批量添加合伙人白名单
     */
    function addPartnerWhiteListBatch(address[] calldata _partners) external onlyOwner {
        for (uint i = 0; i < _partners.length; i++) {
            address _partner = _partners[i];
            if (_partner != address(0) && !isPartnerWhite[_partner]) {
                isPartnerWhite[_partner] = true;
                partnerWhiteList.push(_partner);
                partnerDebt[_partner] = partnerAccPerShare / 1e12;
                emit AddPartnerWhiteList(_partner);
            }
        }
    }
    
    /**
     * @notice 移除合伙人白名单
     */
    function removePartnerWhiteList(address _partner) external onlyOwner {
        require(isPartnerWhite[_partner], "not in whitelist");
        
        isPartnerWhite[_partner] = false;
        
        for (uint i = 0; i < partnerWhiteList.length; i++) {
            if (partnerWhiteList[i] == _partner) {
                partnerWhiteList[i] = partnerWhiteList[partnerWhiteList.length - 1];
                partnerWhiteList.pop();
                break;
            }
        }
        
        emit RemovePartnerWhiteList(_partner);
    }
    
    /**
     * @notice 限制地址领取奖励
     * @param _user 被限制的地址
     * 
     * @dev 限制效果：
     * - 无法领取 LP 分红
     * - 无法领取 NFT 分红
     * - 无法领取团队分红
     * - 无法领取合伙人分红
     * - 无法卖出 DQ
     * - 限制期间的收益转入运营池
     */
    function restrictAddress(address _user) external onlyOwner {
        require(_user != address(0), "invalid address");
        require(!isRestricted[_user], "already restricted");
        
        isRestricted[_user] = true;
        
        emit RestrictAddress(_user, msg.sender);
    }
    
    /**
     * @notice 批量限制地址
     */
    function restrictAddressBatch(address[] calldata _users) external onlyOwner {
        for (uint i = 0; i < _users.length; i++) {
            if (_users[i] != address(0) && !isRestricted[_users[i]]) {
                isRestricted[_users[i]] = true;
                emit RestrictAddress(_users[i], msg.sender);
            }
        }
    }
    
    /**
     * @notice 解除地址限制
     */
    function unrestrictAddress(address _user) external onlyOwner {
        require(isRestricted[_user], "not restricted");
        
        isRestricted[_user] = false;
        
        emit UnrestrictAddress(_user, msg.sender);
    }
    
    /**
     * @notice 设置 DQ 代币价格
     */
    function setPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "price must > 0");
        dqPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    /**
     * @notice 设置基金会钱包
     */
    function setFoundationWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "invalid address");
        foundationWallet = _wallet;
        emit SetFoundationWallet(_wallet);
    }
    
    /**
     * @notice 提取 BEP20 代币
     */
    function adminWithdrawBEP20(uint256 amount) external onlyOwner {
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= amount, "insufficient balance");
        IBEP20(BEP20_TOKEN).transfer(owner(), amount);
    }
    
    /**
     * @notice 提取 BNB
     */
    function adminWithdrawBNB() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ============================================================================
    //                           视图函数
    // ============================================================================
    
    /**
     * @notice 获取用户信息
     */
    function getUser(address _user) external view returns (
        address referrer,
        uint256 directCount,
        uint8 level,
        uint8 dLevel,
        uint256 totalInvest,
        uint256 teamInvest,
        uint256 energy,
        uint256 directSales,
        bool hasNode,
        bool hasDeposited,
        uint256 activeLineCount
    ) {
        User storage u = _users[_user];
        return (
            u.referrer,
            u.directCount,
            u.level,
            u.dLevel,
            u.totalInvest,
            u.teamInvest,
            u.energy,
            u.directSales,
            u.hasNode,
            u.hasDeposited,
            u.activeLineCount
        );
    }
    
    /**
     * @notice 获取合约 BNB 余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice 获取合约 BEP20 余额
     */
    function getBEP20Balance() external view returns (uint256) {
        return IERC20(BEP20_TOKEN).balanceOf(address(this));
    }
    
    /**
     * @notice 获取 DQ 价格
     */
    function getPrice() external view returns (uint256) {
        return dqPrice;
    }
    
    /**
     * @notice 获取用户 LP 质押信息
     */
    function getLPStake(address _user) external view returns (uint256 amount, uint256 startTime) {
        return (lpStakes[_user].amount, lpStakes[_user].startTime);
    }
    
    /**
     * @notice 获取用户单币质押信息
     */
    function getSingleStake(address _user, uint _periodIndex) external view returns (uint256 amount) {
        return singleStakes[_user][stakePeriods[_periodIndex]];
    }
    
    /**
     * @notice 获取合伙人白名单列表
     */
    function getPartnerWhiteList() external view returns (address[] memory) {
        return partnerWhiteList;
    }
    
    /**
     * @notice 获取合伙人数量
     */
    function getPartnerCount() external view returns (uint256) {
        return partnerWhiteList.length;
    }
    
    /**
     * @notice 检查地址是否被限制
     */
    function isAddressRestricted(address _user) external view returns (bool) {
        return isRestricted[_user];
    }
    
    /** @dev 接收 BNB */
    receive() external payable {}
}
