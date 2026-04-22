// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DQProject Smart Contract v3.0
 * @notice DeepQuest DeFi Platform - BSC Network
 * @dev 深度求索机制
 * 
 * ==================== 核心机制 ====================
 * 1. SOL进SOL出（1-200 SOL）
 * 2. 入金分成：50%动态 + 50% LP质押
 * 3. LP质押分币：60% LP + 15%节点 + 5%基金会 + 6%合伙人 + 14%团队
 * 4. 节点必须先购买，才能参与入金
 * 5. 入金资金分配：基金会优先，节点其次
 * 6. DQ只能卖不能买，卖出即销毁
 * 7. 单币质押分红
 * 
 * ==================== 代币信息 ====================
 * - 代币名称: DQ (DeepQuest Token)
 * - 代币总量: 1000亿 (1,000,000,000,000)
 * - 入金代币: BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
 * - 出金代币: BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============ BEP20 代币接口 ============
interface IBEP20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ============ DQ 代币 ============
contract DQToken is ERC20 {
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    
    constructor() ERC20("DQ Token", "DQ") {
        // 铸造 1000亿 代币，全部打入底池锁死
        _mint(address(this), 100_000_000_000 * 10**18);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    // 燃烧到黑洞地址
    function burnToBlackhole(uint256 amount) external {
        _transfer(msg.sender, BLACKHOLE, amount);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // 合约销毁自己的代币
    function burnFromContract(uint256 amount) external {
        require(msg.sender == address(this), "only contract");
        _burn(address(this), amount);
    }
}

// ============ NFT 卡牌 ============
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    uint256 public constant CARD_A = 1;  // S1级别
    uint256 public constant CARD_B = 2;  // S2级别
    uint256 public constant CARD_C = 3;  // S3级别
    
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    
    // 卡牌价格 (BEP20 代币)
    uint256 public constant PRICE_A = 500 ether;   // 500 BEP20
    uint256 public constant PRICE_B = 1500 ether;  // 1500 BEP20
    uint256 public constant PRICE_C = 5000 ether;  // 5000 BEP20
    
    // 卡牌铸造上限
    uint256 public constant MAX_A = 1000;
    uint256 public constant MAX_B = 500;
    uint256 public constant MAX_C = 100;
    
    // 分红权重
    uint256 public constant WEIGHT_A = 4;  // 4%
    uint256 public constant WEIGHT_B = 5;  // 5%
    uint256 public constant WEIGHT_C = 6;   // 6%
    
    mapping(uint256 => uint256) public cardType;
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    
    constructor() ERC721("DQ Card", "DQC") {}
    
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    
    function _mintCard(address to, uint256 _type) internal {
        require(_type >= CARD_A && _type <= CARD_C, "invalid type");
        
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
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        ERC721Enumerable._beforeTokenTransfer(from, to, firstTokenId, batchSize);
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
    
    function getCardPrice(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return PRICE_A;
        if (_type == CARD_B) return PRICE_B;
        return PRICE_C;
    }
    
    function getCardWeight(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return WEIGHT_A;
        if (_type == CARD_B) return WEIGHT_B;
        return WEIGHT_C;
    }
}

// ============ 主合约 ============
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    DQToken public dqToken;
    DQCard public dqCard;
    
    // ============ 合约地址 ============
    address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    address public foundationWallet;  // 基金会钱包
    
    // ============ 价格与配置 ============
    uint256 public dqPrice = 1 ether;  // 1 DQ = 1 BEP20
    
    // 爆块配置
    uint256 public dailyReleaseRate = 13;  // 每天1.3%
    uint256 public burnRate = 80;          // 初始销毁率80%
    uint256 public constant MIN_BURN_RATE = 30;  // 最低销毁率30%
    uint256 public constant BURN_DECREMENT = 5;  // 每天递减0.5%
    
    // 入金上限配置
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;
    uint256 public lastBlockTime;
    
    // LP移除手续费
    uint256 public constant LP_FEE_60DAYS = 20;    // 60天内20%
    uint256 public constant LP_FEE_180DAYS = 10;   // 61-180天10%
    uint256 public constant LP_FEE_AFTER = 0;       // 181天后0%
    
    // ============ 全局配置 ============
    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    // ============ 用户数据结构 ============
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;           // S1-S6
        uint8 dLevel;          // D1-D8
        uint256 totalInvest;    // 总投资额
        uint256 teamInvest;     // 团队业绩
        uint256 energy;         // 能量值 (入金额的6倍)
        uint256 directSales;     // 直推业绩
        EnumerableSet.AddressSet children;
    }
    
    // LP质押记录
    struct LPStake {
        uint256 amount;         // 质押数量
        uint256 startTime;      // 质押开始时间
        uint256 rewardDebt;     // 待领取分红
    }

    mapping(address => User) internal _users;
    address[] public allUsers;
    
    // LP质押
    mapping(address => LPStake) public lpStakes;
    uint256 public totalLPShares;
    uint256 public lpAccPerShare;
    uint256 public lpPool;
    
    // 单币质押
    mapping(address => mapping(uint => uint256)) public singleStakes;
    uint256[] public stakePeriods = [30, 90, 180, 360];
    uint256[] public stakeRates = [5, 10, 15, 20];  // 分6%手续费的5%/10%/15%/20%
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalSingleStaked;

    // ============ 合伙人相关 ============
    address[] public partnerList;
    mapping(address => bool) public isPartner;
    uint256 public partnerCount;
    uint256 public partnerAccPerShare;
    mapping(address => uint256) public partnerDebt;

    // ============ 资金池 ============
    uint256 public dynamicPool;      // 动态奖金池 (50%入金)
    uint256 public insurancePool;   // 保险池 (7%)
    uint256 public operationPool;   // 运营池 (8%)
    uint256 public feePool;         // 手续费池 (6%卖出手续费)
    
    // ============ NFT分红累积 ============
    uint256[3] public nftAccPerShare;
    mapping(address => uint256[3]) public nftRewardDebt;
    
    // ============ 团队奖励累积 ============
    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;
    mapping(address => uint256) public dRewardDebt;
    
    // ============ 爆块累积 ============
    uint256 public blockAccPerShare;
    mapping(address => uint256) public blockRewardDebt;

    // ============ 事件 ============
    event Register(address indexed user, address indexed referrer);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event Deposit(address indexed user, uint256 amount, uint256 dqAmount);
    event Withdraw(address indexed user, uint256 amount);
    event StakeLP(address indexed user, uint256 amount);
    event UnstakeLP(address indexed user, uint256 amount, uint256 fee);
    event StakeSingle(address indexed user, uint256 amount, uint256 period);
    event UnstakeSingle(address indexed user, uint256 amount, uint256 period);
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    event ClaimLP(address indexed user, uint256 amount);
    event ClaimSingle(address indexed user, uint256 amount);
    event ClaimNft(address indexed user, uint256 amount);
    event ClaimDTeam(address indexed user, uint256 amount);
    event ClaimPartner(address indexed user, uint256 amount);
    event LevelUp(address indexed user, uint8 newLevel);
    event DLevelUp(address indexed user, uint8 newDLevel);
    event PriceUpdated(uint256 newPrice);
    event SetFoundationWallet(address indexed wallet);

    constructor(address _foundationWallet) {
        dqToken = new DQToken();
        dqCard = new DQCard();
        foundationWallet = _foundationWallet;
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        _users[owner()].referrer = address(0);
        allUsers.push(owner());
    }

    modifier onlyWithNode() {
        require(dqCard.balanceOf(msg.sender) > 0, "must buy node first");
        _;
    }
    
    modifier onlyRegistered() {
        require(_users[msg.sender].referrer != address(0) || msg.sender == owner(), "not registered");
        _;
    }

    // ============ 注册 ============
    function register(address _referrer) external {
        require(_referrer != address(0) && _referrer != msg.sender, "invalid referrer");
        require(_users[msg.sender].referrer == address(0), "already registered");
        require(_users[_referrer].referrer != address(0) || _referrer == owner(), "referrer not registered");

        _users[msg.sender].referrer = _referrer;
        _users[_referrer].directCount++;
        _users[_referrer].children.add(msg.sender);
        allUsers.push(msg.sender);

        emit Register(msg.sender, _referrer);
    }

    // ============ 获取当前最大可投金额 ============
    function getCurrentMaxInvest() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        uint256 phase = elapsed / PHASE_DURATION;
        
        // 前期控进
        if (phase < 2) return INVEST_MIN; // 1-10天 1 SOL
        if (phase < 4) return 15 ether;     // 11-20天 1-5 SOL
        if (phase < 6) return 20 ether;     // 21-30天 1-5 SOL
        
        uint256 max = INVEST_MAX_START + (phase - 4) * INVEST_MAX_STEP;
        if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
        return max;
    }

    // ============ 购买节点 NFT ============
    /**
     * @notice 购买节点 NFT 卡牌
     * @dev A=500, B=1500, C=5000 BEP20
     *      购买后自动获得对应级别
     */
    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = dqCard.getCardPrice(_type);
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= price, "insufficient balance");
        
        // 从用户接收 BEP20
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), price);
        
        // 铸造 NFT
        dqCard.mintByOwner(msg.sender, _type);
        
        // 资金分配：全部进入 LP 质押池
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
        
        // 如果用户未注册，推荐人为合约创建者
        if (user.referrer == address(0) && msg.sender != owner()) {
            _users[msg.sender].referrer = owner();
            _users[owner()].directCount++;
            _users[owner()].children.add(msg.sender);
            allUsers.push(msg.sender);
            emit Register(msg.sender, owner());
        }
        
        emit BuyNode(msg.sender, _type, price);
    }

    // ============ 入金 (SOL 进) ============
    /**
     * @notice 入金：用户存入 BEP20，换取 DQ
     * @dev 
     * 1. 50% 进入动态分币池
     * 2. 50% 进入 LP 质押池
     * 3. 铸造 DQ 给用户
     * 4. 必须先购买节点才能入金
     */
    function deposit(uint256 _amount) external nonReentrant onlyWithNode onlyRegistered {
        require(_amount >= INVEST_MIN, "below minimum");
        require(_amount <= getCurrentMaxInvest(), "exceed max");
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= _amount, "insufficient balance");
        
        // 接收 BEP20
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), _amount);
        
        // 计算 DQ 数量
        uint256 dqAmount = _amount * 1 ether / dqPrice;
        
        // 50% 动态池，50% LP池
        uint256 dynamicShare = _amount * 50 / 100;
        uint256 lpShare = _amount * 50 / 100;
        
        dynamicPool += dynamicShare;
        lpPool += lpShare;
        totalLPShares += lpShare;
        
        // 更新用户数据
        User storage user = _users[msg.sender];
        user.totalInvest += _amount;
        user.energy += _amount * 6;  // 能量值6倍
        user.directSales += _amount;
        
        // 更新团队业绩
        _updateTeamInvest(msg.sender, _amount);
        
        // 分发动态奖金 (从动态池)
        _distributeDynamic(msg.sender, dynamicShare);
        
        // 检查级别晋升
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        _checkAndAddPartner(msg.sender);
        
        // 铸造 DQ 给用户
        dqToken.mint(msg.sender, dqAmount);
        
        emit Deposit(msg.sender, _amount, dqAmount);
    }

    // ============ 分发动态奖金 ============
    function _distributeDynamic(address _user, uint256 _amount) internal {
        // 直推：30%
        uint256 directShare = _amount * 30 / 100;
        // 见点：15%
        uint256 nodeShare = _amount * 15 / 100;
        // 管理奖：30%
        uint256 mgmtShare = _amount * 30 / 100;
        // DAO补贴：10%
        uint256 daoShare = _amount * 10 / 100;
        // 保险池：7%
        uint256 insuranceShare = _amount * 7 / 100;
        // 运营池：8%
        uint256 operationShare = _amount * 8 / 100;
        
        // 直推奖励
        address referrer = _users[_user].referrer;
        if (referrer != address(0)) {
            if (_users[referrer].energy >= directShare) {
                _users[referrer].energy -= directShare;
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

    function _distributeNode(address _user, uint256 _total) internal {
        uint256 perLayer = _total / 15;
        address current = _users[_user].referrer;
        uint256 layer = 1;
        
        while (current != address(0) && layer <= 15) {
            uint256 maxLayer = _users[current].directCount * 3;
            if (maxLayer > 15) maxLayer = 15;
            
            if (layer <= maxLayer) {
                if (_users[current].energy >= perLayer) {
                    _users[current].energy -= perLayer;
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

    function _distributeManagement(address _user, uint256 _total) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 rate = levelRates[level];
            
            if (rate > lastRate) {
                uint256 delta = rate - lastRate;
                uint256 reward = _total * delta / 30;
                if (_users[current].energy >= reward) {
                    _users[current].energy -= reward;
                }
                lastRate = rate;
            }
            current = _users[current].referrer;
        }
    }

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
                if (_users[current].energy >= reward) {
                    _users[current].energy -= reward;
                }
                lastRate = daoRate;
            }
            current = _users[current].referrer;
        }
    }

    function _updateTeamInvest(address _user, uint256 _amount) internal {
        address current = _user;
        while (current != address(0)) {
            _users[current].teamInvest += _amount;
            current = _users[current].referrer;
        }
    }

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

    function _getEffectiveCount(address _user) internal view returns (uint256) {
        uint256 count = 0;
        address[] memory children = _users[_user].children.values();
        for (uint i = 0; i < children.length; i++) {
            if (_users[children[i]].totalInvest > 0) count++;
        }
        return count;
    }

    function _checkAndAddPartner(address _user) internal {
        if (isPartner[_user]) return;
        if (partnerCount >= 50) return;

        User storage user = _users[_user];
        uint256 investReq = 5000 ether;
        if (user.totalInvest < investReq) return;

        uint256 salesReq = partnerCount < 20 ? 30000 ether : 50000 ether;
        if (user.directSales < salesReq) return;

        isPartner[_user] = true;
        partnerList.push(_user);
        partnerCount++;
    }

    // ============ DQ 卖出 (SOL 出) ============
    /**
     * @notice 卖出 DQ，换回 BEP20
     * @dev 1. 扣除 6% 手续费
     *      2. 50% 手续费分给质押者
     *      3. 50% 手续费进入运营池
     *      4. DQ 卖出即销毁
     */
    function withdrawDQ(uint256 _dqAmount, uint256 _minOut) external nonReentrant {
        require(_dqAmount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        
        uint256 bep20Amount = _dqAmount * dqPrice / 1 ether;
        uint256 fee = bep20Amount * 6 / 100;
        uint256 userOut = bep20Amount - fee;
        
        require(userOut >= _minOut, "slippage too high");
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= userOut, "insufficient token");
        
        // 燃烧 DQ
        dqToken.burn(_dqAmount);
        
        // 手续费分配：50% 质押者，50% 运营
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        // 分给质押者
        _distributeWithdrawFee(stakeFee);
        operationPool += operationFee;
        
        // 转 BEP20 给用户
        IBEP20(BEP20_TOKEN).transfer(msg.sender, userOut);
        
        emit Withdraw(msg.sender, userOut);
    }
    
    function _distributeWithdrawFee(uint256 _feeAmount) internal {
        // 按 LP 份额分配
        if (totalLPShares > 0) {
            lpAccPerShare += _feeAmount * 1e12 / totalLPShares;
        }
    }

    // ============ LP 质押分币 ============
    /**
     * @notice 领取 LP 质押分红
     */
    function claimLP() external nonReentrant {
        uint256 pending = lpStakes[msg.sender].amount * lpAccPerShare / 1e12 - lpStakes[msg.sender].rewardDebt;
        require(pending > 0, "no pending");
        
        lpStakes[msg.sender].rewardDebt = lpStakes[msg.sender].amount * lpAccPerShare / 1e12;
        
        // 以 DQ 形式发放
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimLP(msg.sender, pending);
    }
    
    // ============ 爆块机制 ============
    /**
     * @notice 每日爆块
     * @dev 
     * 1. 释放 1.3% 的 DQ
     * 2. 80% 销毁至黑洞，每天递减 0.5%，最低 30%
     * 3. 剩余 20% 分配：60% LP + 15% NFT + 5%基金会 + 6%合伙人 + 14%团队
     */
    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");
        
        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000;  // 1.3%
        uint256 burn = release * burnRate / 100;  // 80% 销毁
        
        // 销毁到黑洞
        dqToken.burnToBlackhole(burn);
        
        // 递减销毁率
        if (burnRate > MIN_BURN_RATE) {
            burnRate -= BURN_DECREMENT;
            if (burnRate < MIN_BURN_RATE) burnRate = MIN_BURN_RATE;
        }
        
        uint256 remaining = release - burn;  // 20%
        
        // 分配
        uint256 lpShare = remaining * 60 / 100;
        uint256 nftShare = remaining * 15 / 100;
        uint256 foundationShare = remaining * 5 / 100;
        uint256 partnerShare = remaining * 6 / 100;
        uint256 teamShare = remaining * 14 / 100;
        
        // LP 分红累积
        if (totalLPShares > 0) {
            blockAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        
        // NFT 分红累积
        _updateNftAcc(nftShare);
        
        // 基金会
        uint256 foundationDQ = foundationShare * 1 ether / dqPrice;
        dqToken.mint(foundationWallet, foundationDQ);
        
        // 合伙人
        if (partnerCount > 0) {
            partnerAccPerShare += partnerShare * 1e12 / partnerCount;
        }
        
        // 团队 D1-D8
        _updateTeamAcc(teamShare);
        
        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }
    
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
    
    function _updateTeamAcc(uint256 _teamShare) internal {
        uint256 perLevelShare = _teamShare / 8;
        for (uint i = 0; i < 8; i++) {
            if (dTotalUsers[i] > 0) {
                dAccPerShare[i] += perLevelShare * 1e12 / dTotalUsers[i];
            }
        }
    }
    
    // ============ 领取 NFT 分红 ============
    function claimNft() external nonReentrant {
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        
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
    
    // ============ 领取 D 级团队分红 ============
    function claimDTeam() external nonReentrant {
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
    
    // ============ 领取合伙人分红 ============
    function claimPartner() external nonReentrant {
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerAccPerShare / 1e12 - partnerDebt[msg.sender];
        require(pending > 0, "no pending");
        
        partnerDebt[msg.sender] = partnerAccPerShare / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimPartner(msg.sender, pending);
    }

    // ============ 单币质押 ============
    /**
     * @notice 单币质押 DQ
     * @param _periodIndex: 0=30天, 1=90天, 2=180天, 3=360天
     */
    function stakeSingle(uint256 _amount, uint _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        require(_amount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= _amount, "insufficient DQ");
        
        uint256 period = stakePeriods[_periodIndex];
        
        // 转移 DQ
        dqToken.transferFrom(msg.sender, address(this), _amount);
        
        singleStakes[msg.sender][period] += _amount;
        totalSingleStaked[period] += _amount;
        
        emit StakeSingle(msg.sender, _amount, period);
    }
    
    /**
     * @notice 解除单币质押
     */
    function unstakeSingle(uint256 _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        uint256 period = stakePeriods[_periodIndex];
        uint256 amount = singleStakes[msg.sender][period];
        require(amount > 0, "no stake");
        
        // 领取收益
        _claimSingleStake(msg.sender, period);
        
        singleStakes[msg.sender][period] = 0;
        totalSingleStaked[period] -= amount;
        
        // 退还 DQ
        dqToken.transfer(msg.sender, amount);
        
        emit UnstakeSingle(msg.sender, amount, period);
    }
    
    function _claimSingleStake(address _user, uint _period) internal {
        uint256 pending = singleStakes[_user][_period] * stakeFeeAccPerShare[_period] / 1e12;
        if (pending > 0) {
            uint256 dqAmount = pending * 1 ether / dqPrice;
            dqToken.mint(_user, dqAmount);
        }
    }
    
    // ============ 保险池回购销毁 ============
    /**
     * @notice 使用保险池回购 DQ 并销毁
     */
    function buybackAndBurn() external onlyOwner {
        uint256 insuranceBal = insurancePool;
        if (insuranceBal > 0 && IERC20(BEP20_TOKEN).balanceOf(address(this)) >= insuranceBal) {
            // 从市场购买 DQ 并销毁
            // 具体实现需要看是否有交易对
            insurancePool = 0;
        }
    }

    // ============ 管理员功能 ============
    function setPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "price must > 0");
        dqPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    function setFoundationWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "invalid address");
        foundationWallet = _wallet;
        emit SetFoundationWallet(_wallet);
    }
    
    function adminWithdrawBEP20(uint256 amount) external onlyOwner {
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= amount, "insufficient balance");
        IBEP20(BEP20_TOKEN).transfer(owner(), amount);
    }
    
    function adminWithdrawBNB() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ============ 视图函数 ============
    function getUser(address _user) external view returns (
        address referrer,
        uint256 directCount,
        uint8 level,
        uint8 dLevel,
        uint256 totalInvest,
        uint256 teamInvest,
        uint256 energy,
        uint256 directSales
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
            u.directSales
        );
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getBEP20Balance() external view returns (uint256) {
        return IERC20(BEP20_TOKEN).balanceOf(address(this));
    }
    
    function getPrice() external view returns (uint256) {
        return dqPrice;
    }
    
    function getLPStake(address _user) external view returns (uint256 amount, uint256 startTime) {
        return (lpStakes[_user].amount, lpStakes[_user].startTime);
    }
    
    function getSingleStake(address _user, uint _periodIndex) external view returns (uint256 amount) {
        return singleStakes[_user][stakePeriods[_periodIndex]];
    }
    
    receive() external payable {}
}
