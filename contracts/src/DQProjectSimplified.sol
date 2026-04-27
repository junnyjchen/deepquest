// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
interface IPancakeRouter02 {
    function WETH() external pure returns (address);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

/**
 * @title DQToken - DQ 代币合约
 * @notice 1000亿总量，全部打入合约锁死，联合坐庄
 */
contract DQToken is ERC20, Ownable {
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    
    constructor() ERC20("DQ Token", "DQ") {
        _mint(address(this), 100_000_000_000 * 10**18);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    function burnToBlackhole(uint256 amount) external {
        _transfer(msg.sender, BLACKHOLE, amount);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title DQCard - 节点 NFT 卡牌
 * @notice A卡500/B卡1500/C卡5000 BEP20
 */
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    uint256 public constant CARD_A = 1;
    uint256 public constant CARD_B = 2;
    uint256 public constant CARD_C = 3;
    
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    
    // 卡牌价格 (BEP20)
    uint256 public constant PRICE_A = 500 ether;  
    uint256 public constant PRICE_B = 1500 ether;  
    uint256 public constant PRICE_C = 5000 ether;  
    
    // 达标所需线数
    uint256 public constant LINE_A = 5;   // A卡需5条线
    uint256 public constant LINE_B = 10;   // B卡需10条线
    uint256 public constant LINE_C = 20;  // C卡需20条线
    
    // 分红权重
    uint256 public constant WEIGHT_A = 4;
    uint256 public constant WEIGHT_B = 5;
    uint256 public constant WEIGHT_C = 6;
    
    mapping(uint256 => uint256) public cardType;
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    
    constructor() ERC721("DQ Card", "DQC") {}
    
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    
    function _mintCard(address to, uint256 _type) internal {
        require(_type >= CARD_A && _type <= CARD_C, "invalid type");
        
        if (_type == CARD_A) {
            totalA++;
        } else if (_type == CARD_B) {
            totalB++;
        } else {
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
    
    function getRequiredLines(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return LINE_A;
        if (_type == CARD_B) return LINE_B;
        return LINE_C;
    }
}

/**
 * @title DQProject - DeepQuest DeFi 量化平台
 * 
 * 【核心机制】
 * 1. SOL进SOL出 (BEP20代币)
 * 2. 50%动态分币 + 50%LP质押
 * 3. 节点NFT (A/B/C三种)
 * 4. 节点达标限制 (A卡5线/B卡10线/C卡20线)
 * 5. 地址限制功能
 * 6. 入金必须在节点关系链下
 * 
 * 【地址配置】
 * BEP20代币: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
 */
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    DQToken public dqToken;
    DQCard public dqCard;
    
    address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant BLACKHOLE = 0x000000000000000000000000000000000000dEaD;
    address public foundationWallet;
    
    uint256 public dqPrice = 1 ether;

    // 入金配置
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;
    uint256 public lastBlockTime;

    // 管理奖级别配置
    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    // 用户数据结构
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;          // S1-S6
        uint8 dLevel;         // D1-D8
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;        // 能量值 (入金额×6)
        uint256 directSales;
        bool hasNode;          // 是否持有节点NFT
        bool hasDeposited;     // 是否已完成首次入金
        uint256 activeLineCount; // 达标线数
        uint256 lpRewardDebt;
        uint256 nftRewardDebt;  // NFT分红待领
        uint256 dRewardDebt;    // 团队分红待领
        EnumerableSet.AddressSet children;
    }

    mapping(address => User) internal _users;
    address[] public allUsers;

    // LP质押
    uint256 public totalLPShares;
    uint256 public lpAccPerShare;
    uint256 public lpPool;

    // 单币质押
    uint256[] public stakePeriods = [30, 90, 180, 360];
    uint256[] public stakeRates = [5, 10, 15, 20];
    mapping(address => mapping(uint => uint256)) public singleStakes;
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalSingleStaked;

    // 合伙人白名单 (固定50席)
    address[] public partnerWhiteList;
    mapping(address => bool) public isPartnerWhite;
    uint256 public partnerAccPerShare;
    mapping(address => uint256) public partnerDebt;

    // ===== 新增：地址限制功能 =====
    mapping(address => bool) public restrictedAddresses;
    mapping(address => uint256) public restrictedDebt;
    uint256 public totalRestrictedCount;

    // NFT分红
    uint256[3] public nftAccPerShare;
    mapping(address => uint256[3]) public nftRewardDebtAcc;

    // 团队分红
    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;
    mapping(address => uint256) public dRewardDebt;

    // 合伙人分红
    uint256 public partnerDqAccPerShare;

    // 爆块配置
    uint256 public lastBlockTimeV2;
    uint256 public dailyReleaseRate = 13;  // 1.3%
    uint256 public burnRate = 80;          // 80%销毁
    uint256 public constant MIN_BURN_RATE = 30;
    uint256 public constant BURN_DECREMENT = 5;

    // 资金池
    uint256 public dynamicPool;
    uint256 public insurancePool;
    uint256 public operationPool;
    uint256 public feePool;

    // 事件
    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount, uint256 fee);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event LevelUp(address indexed user, uint8 newLevel);
    event DLevelUp(address indexed user, uint8 newDLevel);
    event LineQualified(address indexed user, uint256 lineCount);
    event ClaimLp(address indexed user, uint256 amount);
    event ClaimNft(address indexed user, uint256 amount);
    event ClaimDTeam(address indexed user, uint256 amount);
    event ClaimPartner(address indexed user, uint256 amount);
    event StakeDQ(address indexed user, uint256 amount, uint256 period);
    event UnstakeDQ(address indexed user, uint256 amount, uint256 period);
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    event PriceUpdated(uint256 newPrice);
    event RestrictAddress(address indexed user);
    event UnrestrictAddress(address indexed user);
    event AddPartner(address indexed partner);
    event RemovePartner(address indexed partner);
    event SwapBEP20ForDQ(address indexed user, uint256 tokenAmount, uint256 dqAmount);
    event SwapDQForBEP20(address indexed user, uint256 dqAmount, uint256 tokenAmount, uint256 fee);

    constructor(address _foundationWallet) {
        dqToken = new DQToken();
        dqCard = new DQCard();
        foundationWallet = _foundationWallet;
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        lastBlockTimeV2 = block.timestamp;
        
        _users[owner()].referrer = address(0);
        _users[owner()].hasNode = true;
        _users[owner()].activeLineCount = type(uint256).max;
        allUsers.push(owner());
    }

    // ===== 修饰符 =====
    
    modifier notRestricted() {
        require(!restrictedAddresses[msg.sender], "address restricted");
        _;
    }
    
    /**
     * @dev 检查是否可以入金
     * - 已注册
     * - 推荐链上有节点
     * - 首次入金必须是节点
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

    // ===== 内部函数 =====
    
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
     * @dev 更新达标线数
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

    // ===== 用户注册 =====
    
    /**
     * @notice 注册成为会员
     * @param _referrer 推荐人（必须是节点会员）
     */
    function register(address _referrer) external {
        require(_referrer != address(0) && _referrer != msg.sender, "invalid referrer");
        require(_users[msg.sender].referrer == address(0), "already registered");
        require(_users[_referrer].hasNode || _referrer == owner(), "referrer must have node");

        _users[msg.sender].referrer = _referrer;
        _users[_referrer].directCount++;
        _users[_referrer].children.add(msg.sender);
        allUsers.push(msg.sender);

        emit Register(msg.sender, _referrer);
    }

    // ===== 入金配置 =====
    
    function getCurrentMaxInvest() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        uint256 phase = elapsed / PHASE_DURATION;
        uint256 max = INVEST_MAX_START + phase * INVEST_MAX_STEP;
        if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
        return max;
    }

    // ===== 购买节点 =====
    
    /**
     * @notice 购买节点NFT卡牌
     * @param _type 卡牌类型 (1=A, 2=B, 3=C)
     * 
     * @dev 资金分配：
     * - 100% 进入LP质押池
     */
    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = DQCard(dqCard).getCardPrice(_type);
        require(IERC20(BEP20_TOKEN).balanceOf(msg.sender) >= price, "insufficient balance");
        
        IERC20(BEP20_TOKEN).transferFrom(msg.sender, address(this), price);
        dqCard.mintByOwner(msg.sender, _type);
        
        _users[msg.sender].hasNode = true;
        lpPool += price;
        totalLPShares += price;
        
        // 自动升级管理级别
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
        
        // 如果未注册，自动注册到owner
        if (user.referrer == address(0) && msg.sender != owner()) {
            user.referrer = owner();
            _users[owner()].directCount++;
            _users[owner()].children.add(msg.sender);
            allUsers.push(msg.sender);
            emit Register(msg.sender, owner());
        }
        
        _updateActiveLines(msg.sender);
        emit BuyNode(msg.sender, _type, price);
    }

    // ===== 入金 =====
    
    /**
     * @notice 入金：存入BEP20，换取DQ
     * @param amount 入金数量
     * 
     * @dev 资金分配：
     * - 50% 进入动态分币池
     * - 50% 进入LP质押池
     * 
     * @dev 动态奖金分配 (50%动态池)：
     * - 直推奖: 30%
     * - 见点奖: 15% (需节点达标)
     * - 管理奖: 30% (需节点达标)
     * - DAO补贴: 10%
     * - 保险池: 7%
     * - 运营池: 8%
     */
    function deposit(uint256 amount) external nonReentrant onlyCanDeposit {
        require(amount >= INVEST_MIN && amount <= getCurrentMaxInvest(), "amount out of range");
        require(IERC20(BEP20_TOKEN).balanceOf(msg.sender) >= amount, "insufficient balance");
        
        IERC20(BEP20_TOKEN).transferFrom(msg.sender, address(this), amount);
        
        uint256 dynamicShare = amount * 50 / 100;
        uint256 lpShare = amount * 50 / 100;
        
        dynamicPool += dynamicShare;
        lpPool += lpShare;
        totalLPShares += lpShare;
        
        User storage user = _users[msg.sender];
        user.totalInvest += amount;
        user.energy += amount * 6;  // 能量值6倍
        user.directSales += amount;
        user.hasDeposited = true;
        
        _updateTeamInvest(msg.sender, amount);
        _distributeDynamic(msg.sender, dynamicShare);
        _notifyUplineOfDeposit(msg.sender);
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        
        uint256 dqAmount = amount * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit Deposit(msg.sender, amount);
    }

    // ===== 动态奖金分配 =====
    
    function _distributeDynamic(address _user, uint256 _total) internal {
        uint256 directShare = _total * 30 / 100;
        uint256 nodeShare = _total * 15 / 100;
        uint256 mgmtShare = _total * 30 / 100;
        uint256 daoShare = _total * 10 / 100;
        uint256 insuranceShare = _total * 7 / 100;
        uint256 operationShare = _total * 8 / 100;

        // 直推奖
        address referrer = _users[_user].referrer;
        if (referrer != address(0)) {
            if (!restrictedAddresses[referrer]) {
                if (_users[referrer].energy >= directShare) {
                    _users[referrer].energy -= directShare;
                }
            } else {
                operationPool += directShare;
            }
            _users[referrer].directSales += directShare;
        }

        // 见点奖 (15层，需节点达标)
        _distributeNode(_user, nodeShare);
        
        // 管理奖
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
            (bool qualified, , ) = checkNodeQualified(current);
            uint256 maxLayer = _users[current].directCount * 3;
            if (maxLayer > 15) maxLayer = 15;
            
            if (layer <= maxLayer && qualified) {
                if (!restrictedAddresses[current]) {
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
    
    function _distributeManagement(address _user, uint256 _total) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 rate = levelRates[level];
            
            if (rate > lastRate) {
                uint256 delta = rate - lastRate;
                uint256 reward = _total * delta / 30;
                
                if (!restrictedAddresses[current]) {
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
        if (lastRate < 30) {
            uint256 remaining = _total * (30 - lastRate) / 30;
            insurancePool += remaining;
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
                
                if (!restrictedAddresses[current]) {
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
        if (lastRate < 10) {
            uint256 remaining = _total * (10 - lastRate) / 10;
            operationPool += remaining;
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

    // ===== 出金 =====
    
    /**
     * @notice 卖出DQ，换回BEP20
     * @param dqAmount DQ数量
     * @param minOut 最小接收数量
     * 
     * @dev 卖出手续费6%
     * - 50%给LP质押者
     * - 50%给运营池
     * - DQ卖出即销毁
     */
    function withdraw(uint256 dqAmount, uint256 minOut) external nonReentrant notRestricted {
        require(dqAmount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= dqAmount, "insufficient DQ");
        
        uint256 bep20Amount = dqAmount * dqPrice / 1 ether;
        uint256 fee = bep20Amount * 6 / 100;
        uint256 userOut = bep20Amount - fee;
        
        require(userOut >= minOut, "slippage too high");
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= userOut, "insufficient token");
        
        dqToken.burn(dqAmount);
        
        uint256 lpFee = fee * 50 / 100;
        uint256 opFee = fee * 50 / 100;
        
        if (totalLPShares > 0) {
            lpAccPerShare += lpFee * 1e12 / totalLPShares;
        }
        operationPool += opFee;
        
        IERC20(BEP20_TOKEN).safeTransfer(msg.sender, userOut);
        emit Withdraw(msg.sender, userOut, fee);
    }

    // ===== 爆块机制 =====
    
    /**
     * @notice 每日爆块
     * 
     * @dev 爆块机制：
     * - 每天释放DQ总量的1.3%
     * - 80%销毁至黑洞，每天递减0.5%，最低30%
     * - 剩余20%分配：
     *   - LP质押者: 60%
     *   - 节点NFT: 15%
     *   - 基金会: 5%
     *   - 合伙人: 6%
     *   - 团队D1-D8: 14%
     */
    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");
        
        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000;
        uint256 burn = release * burnRate / 100;
        
        if (burn > dqToken.balanceOf(address(this))) {
            burn = dqToken.balanceOf(address(this));
        }
        if (burn > 0) {
            dqToken.burnToBlackhole(burn);
        }
        
        if (burnRate > MIN_BURN_RATE) {
            burnRate -= BURN_DECREMENT;
            if (burnRate < MIN_BURN_RATE) burnRate = MIN_BURN_RATE;
        }
        
        uint256 remaining = release - burn;
        
        uint256 lpShare = remaining * 60 / 100;
        uint256 nftShare = remaining * 15 / 100;
        uint256 foundationShare = remaining * 5 / 100;
        uint256 partnerShare = remaining * 6 / 100;
        uint256 teamShare = remaining * 14 / 100;
        
        if (totalLPShares > 0) {
            lpAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        
        _updateNftAcc(nftShare);
        
        if (foundationWallet != address(0) && foundationShare > 0) {
            uint256 foundationDQ = foundationShare * 1 ether / dqPrice;
            dqToken.mint(foundationWallet, foundationDQ);
        }
        
        _updatePartnerAcc(partnerShare);
        _updateTeamAcc(teamShare);
        
        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }
    
    function _updateNftAcc(uint256 _nftShare) internal {
        uint256[3] memory totals = [dqCard.totalA(), dqCard.totalB(), dqCard.totalC()];
        uint256[3] memory weights = [uint256(4), uint256(5), uint256(6)];
        uint256 totalWeight = 15;
        
        for (uint i = 0; i < 3; i++) {
            if (totals[i] > 0) {
                uint256 shareForType = _nftShare * weights[i] / totalWeight;
                nftAccPerShare[i] += shareForType * 1e12 / totals[i];
            }
        }
    }
    
    function _updatePartnerAcc(uint256 _partnerShare) internal {
        uint256 partnerCount = partnerWhiteList.length;
        if (partnerCount > 0) {
            partnerDqAccPerShare += _partnerShare * 1e12 / partnerCount;
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

    // ===== 领取分红 =====
    
    /**
     * @notice 领取LP质押分红
     */
    function claimLp() external nonReentrant notRestricted {
        User storage user = _users[msg.sender];
        uint256 pending = totalLPShares * lpAccPerShare / 1e12 - user.lpRewardDebt;
        require(pending > 0, "no pending");
        
        user.lpRewardDebt = totalLPShares * lpAccPerShare / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimLp(msg.sender, pending);
    }
    
    /**
     * @notice 领取NFT分红
     * @dev 只有节点达标的用户才能领取
     */
    function claimNft() external nonReentrant notRestricted {
        (bool qualified, , ) = checkNodeQualified(msg.sender);
        require(qualified, "node not qualified");
        
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            
            uint256 pending = nftAccPerShare[typeIndex] / 1e12 - nftRewardDebtAcc[msg.sender][typeIndex];
            totalPending += pending;
            nftRewardDebtAcc[msg.sender][typeIndex] = nftAccPerShare[typeIndex] / 1e12;
        }
        
        require(totalPending > 0, "no pending");
        uint256 dqAmount = totalPending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimNft(msg.sender, totalPending);
    }
    
    /**
     * @notice 领取团队分红 (D1-D8)
     */
    function claimDTeam() external nonReentrant notRestricted {
        User storage user = _users[msg.sender];
        require(user.dLevel > 0, "no d level");
        
        uint256 levelIndex = user.dLevel - 1;
        uint256 pending = dAccPerShare[levelIndex] / 1e12 - user.dRewardDebt;
        require(pending > 0, "no pending");
        
        user.dRewardDebt = dAccPerShare[levelIndex] / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimDTeam(msg.sender, pending);
    }
    
    /**
     * @notice 领取合伙人分红
     */
    function claimPartner() external nonReentrant notRestricted {
        require(isPartnerWhite[msg.sender], "not partner");
        
        uint256 pending = partnerDqAccPerShare / 1e12 - partnerDebt[msg.sender];
        require(pending > 0, "no pending");
        
        partnerDebt[msg.sender] = partnerDqAccPerShare / 1e12;
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimPartner(msg.sender, pending);
    }

    // ===== 单币质押 =====
    
    /**
     * @notice 单币质押DQ
     * @param amount 质押数量
     * @param periodIndex 质押周期索引 (0=30天, 1=90天, 2=180天, 3=360天)
     */
    function stakeDQ(uint256 amount, uint periodIndex) external nonReentrant {
        require(periodIndex < stakePeriods.length, "invalid period");
        require(amount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= amount, "insufficient DQ");
        
        uint256 period = stakePeriods[periodIndex];
        
        dqToken.transferFrom(msg.sender, address(this), amount);
        singleStakes[msg.sender][period] += amount;
        totalSingleStaked[period] += amount;
        
        emit StakeDQ(msg.sender, amount, period);
    }
    
    /**
     * @notice 解除单币质押
     */
    function unstakeDQ(uint periodIndex) external nonReentrant {
        require(periodIndex < stakePeriods.length, "invalid period");
        uint256 period = stakePeriods[periodIndex];
        uint256 amount = singleStakes[msg.sender][period];
        require(amount > 0, "no stake");
        
        singleStakes[msg.sender][period] = 0;
        totalSingleStaked[period] -= amount;
        
        dqToken.transfer(msg.sender, amount);
        emit UnstakeDQ(msg.sender, amount, period);
    }

    // ===== BEP20/DQ 兑换 =====
    
    /**
     * @notice BEP20兑换DQ
     * @param tokenAmount BEP20数量
     */
    function swapBEP20ForDQ(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "amount must > 0");
        
        IERC20(BEP20_TOKEN).transferFrom(msg.sender, address(this), tokenAmount);
        
        uint256 dqAmount = tokenAmount * 1 ether / dqPrice;
        require(dqToken.balanceOf(address(this)) >= dqAmount, "insufficient DQ");
        
        uint256 lpShare = tokenAmount * 30 / 100;
        uint256 operationShare = tokenAmount * 70 / 100;
        
        lpPool += lpShare;
        if (totalLPShares > 0) {
            lpAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        operationPool += operationShare;
        
        dqToken.mint(msg.sender, dqAmount);
        emit SwapBEP20ForDQ(msg.sender, tokenAmount, dqAmount);
    }
    
    /**
     * @notice DQ兑换BEP20
     * @param dqAmount DQ数量
     * @param minOut 最小接收数量
     */
    function swapDQForBEP20(uint256 dqAmount, uint256 minOut) external nonReentrant notRestricted {
        require(dqAmount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= dqAmount, "insufficient DQ");
        
        uint256 tokenAmount = dqAmount * dqPrice / 1 ether;
        uint256 fee = tokenAmount * 6 / 100;
        uint256 userOut = tokenAmount - fee;
        
        require(userOut >= minOut, "slippage too high");
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= userOut, "insufficient token");
        
        dqToken.burn(dqAmount);
        
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        _distributeStakeFee(stakeFee);
        operationPool += operationFee;
        
        IERC20(BEP20_TOKEN).safeTransfer(msg.sender, userOut);
        emit SwapDQForBEP20(msg.sender, dqAmount, userOut, fee);
    }
    
    function _distributeStakeFee(uint256 _feeAmount) internal {
        for (uint i = 0; i < stakePeriods.length; i++) {
            uint256 period = stakePeriods[i];
            if (totalSingleStaked[period] > 0) {
                uint256 share = _feeAmount * stakeRates[i] / 100;
                uint256 dqAmount = share * 1 ether / dqPrice;
                stakeFeeAccPerShare[period] += dqAmount * 1e12 / totalSingleStaked[period];
            }
        }
    }

    // ===== 管理员功能 =====
    
    /**
     * @notice 添加合伙人白名单
     */
    function addPartner(address _partner) external onlyOwner {
        require(_partner != address(0), "invalid address");
        require(!isPartnerWhite[_partner], "already partner");
        
        isPartnerWhite[_partner] = true;
        partnerWhiteList.push(_partner);
        partnerDebt[_partner] = partnerDqAccPerShare / 1e12;
        
        emit AddPartner(_partner);
    }
    
    /**
     * @notice 批量添加合伙人
     */
    function addPartnerBatch(address[] calldata _partners) external onlyOwner {
        for (uint i = 0; i < _partners.length; i++) {
            if (_partners[i] != address(0) && !isPartnerWhite[_partners[i]]) {
                isPartnerWhite[_partners[i]] = true;
                partnerWhiteList.push(_partners[i]);
                partnerDebt[_partners[i]] = partnerDqAccPerShare / 1e12;
                emit AddPartner(_partners[i]);
            }
        }
    }
    
    /**
     * @notice 移除合伙人
     */
    function removePartner(address _partner) external onlyOwner {
        require(isPartnerWhite[_partner], "not partner");
        
        isPartnerWhite[_partner] = false;
        for (uint i = 0; i < partnerWhiteList.length; i++) {
            if (partnerWhiteList[i] == _partner) {
                partnerWhiteList[i] = partnerWhiteList[partnerWhiteList.length - 1];
                partnerWhiteList.pop();
                break;
            }
        }
        
        emit RemovePartner(_partner);
    }
    
    /**
     * @notice 限制地址领取奖励
     * @param _user 被限制的地址
     */
    function restrictAddress(address _user) external onlyOwner {
        require(_user != address(0), "invalid address");
        require(!restrictedAddresses[_user], "already restricted");
        
        restrictedAddresses[_user] = true;
        restrictedDebt[_user] = 0;
        totalRestrictedCount++;
        
        emit RestrictAddress(_user);
    }
    
    /**
     * @notice 批量限制地址
     */
    function restrictAddressBatch(address[] calldata _users) external onlyOwner {
        for (uint i = 0; i < _users.length; i++) {
            if (_users[i] != address(0) && !restrictedAddresses[_users[i]]) {
                restrictedAddresses[_users[i]] = true;
                restrictedDebt[_users[i]] = 0;
                totalRestrictedCount++;
                emit RestrictAddress(_users[i]);
            }
        }
    }
    
    /**
     * @notice 解除地址限制
     */
    function unrestrictAddress(address _user) external onlyOwner {
        require(restrictedAddresses[_user], "not restricted");
        
        restrictedAddresses[_user] = false;
        totalRestrictedCount--;
        
        emit UnrestrictAddress(_user);
    }
    
    function setPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "price must > 0");
        dqPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    function setFoundationWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "invalid address");
        foundationWallet = _wallet;
    }
    
    function adminWithdrawBNB(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    function adminWithdrawDQ(uint256 amount) external onlyOwner {
        require(dqToken.balanceOf(address(this)) >= amount, "insufficient balance");
        dqToken.transfer(owner(), amount);
    }
    
    function adminWithdrawBEP20(uint256 amount) external onlyOwner {
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= amount, "insufficient balance");
        IERC20(BEP20_TOKEN).safeTransfer(owner(), amount);
    }

    // ===== 查询函数 =====
    
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
    function checkNodeQualified(address _user) public view returns (
        bool qualified, 
        uint256 currentLines, 
        uint256 requiredLines
    ) {
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
        
        uint256 required = DQCard(dqCard).getRequiredLines(highestType);
        uint256 current = _users[_user].activeLineCount;
        
        return (current >= required, current, required);
    }
    
    /**
     * @notice 获取用户节点信息
     */
    function getNodeInfo(address _user) external view returns (
        uint256 cardType,
        uint256 cardCount,
        uint256 qualifiedLines,
        uint256 requiredLines,
        bool isQualified
    ) {
        uint256 balance = dqCard.balanceOf(_user);
        if (balance == 0) {
            return (0, 0, 0, 0, false);
        }
        
        uint256 highestType = 0;
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(_user, i);
            uint256 ctype = dqCard.cardType(tokenId);
            if (ctype > highestType) {
                highestType = ctype;
            }
        }
        
        (bool qualified, uint256 current, uint256 required) = checkNodeQualified(_user);
        
        return (highestType, balance, current, required, qualified);
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
    
    /**
     * @notice 获取用户完整信息
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
        uint256 activeLineCount,
        bool restricted
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
            u.activeLineCount,
            restrictedAddresses[_user]
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
    
    function getPartnerCount() external view returns (uint256) {
        return partnerWhiteList.length;
    }
    
    function getRestrictedCount() external view returns (uint256) {
        return totalRestrictedCount;
    }
    
    /**
     * @notice 获取用户单币质押信息
     */
    function getSingleStake(address _user) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](stakePeriods.length);
        for (uint i = 0; i < stakePeriods.length; i++) {
            amounts[i] = singleStakes[_user][stakePeriods[i]];
        }
    }
    
    receive() external payable {}
}
