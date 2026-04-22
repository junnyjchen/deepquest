// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DQProject Smart Contract v3.3
 * @notice DeepQuest DeFi Platform - BSC Network
 * @dev 深度求索机制
 * 
 * ==================== 核心机制 ====================
 * 1. SOL进SOL出（1-200 SOL）
 * 2. 入金分成：50%动态 + 50% LP质押
 * 3. LP质押分币：60% LP + 15%节点 + 5%基金会 + 6%合伙人 + 14%团队
 * 4. 合伙人：固定白名单地址，收益平均分配
 * 5. 地址限制：可限制某地址领取奖励
 * 6. 节点达标条件：5/10/20条线
 * 
 * ==================== 代币信息 ====================
 * - 代币名称: DQ (DeepQuest Token)
 * - 代币总量: 1000亿 (1,000,000,000,000)
 * - 入金代币: BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBEP20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ============ DQ 代币 ============
contract DQToken is ERC20 {
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
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ============ NFT 卡牌 ============
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    uint256 public constant CARD_A = 1;
    uint256 public constant CARD_B = 2;
    uint256 public constant CARD_C = 3;
    
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    
    uint256 public constant PRICE_A = 500 ether;
    uint256 public constant PRICE_B = 1500 ether;
    uint256 public constant PRICE_C = 5000 ether;
    
    uint256 public constant MAX_A = 1000;
    uint256 public constant MAX_B = 500;
    uint256 public constant MAX_C = 100;
    
    uint256 public constant WEIGHT_A = 4;
    uint256 public constant WEIGHT_B = 5;
    uint256 public constant WEIGHT_C = 6;
    
    uint256 public constant LINE_A = 5;
    uint256 public constant LINE_B = 10;
    uint256 public constant LINE_C = 20;
    
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
    
    function getRequiredLines(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return LINE_A;
        if (_type == CARD_B) return LINE_B;
        return LINE_C;
    }
}

// ============ 主合约 ============
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    DQToken public dqToken;
    DQCard public dqCard;
    
    address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant BLACKHOLE = address(0x000000000000000000000000000000000000dEaD);
    address public foundationWallet;
    
    uint256 public dqPrice = 1 ether;
    uint256 public dailyReleaseRate = 13;
    uint256 public burnRate = 80;
    uint256 public constant MIN_BURN_RATE = 30;
    uint256 public constant BURN_DECREMENT = 5;
    
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;
    uint256 public lastBlockTime;
    
    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    // ============ 用户数据结构 ============
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint8 dLevel;
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;
        uint256 directSales;
        bool hasNode;
        bool hasDeposited;
        uint256 activeLineCount;
        EnumerableSet.AddressSet children;
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
    uint256[] public stakeRates = [5, 10, 15, 20];
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalSingleStaked;

    // ============ 合伙人白名单 ============
    address[] public partnerWhiteList;              // 合伙人白名单地址列表
    mapping(address => bool) public isPartnerWhite; // 是否在白名单中
    mapping(address => uint256) public partnerDebt; // 合伙人待领取收益
    uint256 public partnerAccPerShare;              // 合伙人累积收益份额

    // ============ 地址限制 ============
    mapping(address => bool) public isRestricted;  // 被限制领取奖励的地址
    mapping(address => uint256) public restrictedDebt; // 限制前的待领取收益

    // 资金池
    uint256 public dynamicPool;
    uint256 public insurancePool;
    uint256 public operationPool;
    uint256 public feePool;
    
    // NFT分红
    uint256[3] public nftAccPerShare;
    mapping(address => uint256[3]) public nftRewardDebt;
    
    // 团队奖励
    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;
    mapping(address => uint256) public dRewardDebt;
    
    // 爆块
    uint256 public blockAccPerShare;
    mapping(address => uint256) public blockRewardDebt;

    struct LPStake {
        uint256 amount;
        uint256 startTime;
        uint256 rewardDebt;
    }

    // ============ 事件 ============
    event Register(address indexed user, address indexed referrer);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event Deposit(address indexed user, uint256 amount, uint256 dqAmount, bool isFirst);
    event Withdraw(address indexed user, uint256 amount);
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
    event LineQualified(address indexed user, uint256 lineCount);
    event PriceUpdated(uint256 newPrice);
    event SetFoundationWallet(address indexed wallet);
    
    // 合伙人事件
    event AddPartnerWhiteList(address indexed partner);
    event RemovePartnerWhiteList(address indexed partner);
    event RestrictAddress(address indexed user, address indexed operator);
    event UnrestrictAddress(address indexed user, address indexed operator);

    constructor(address _foundationWallet) {
        dqToken = new DQToken();
        dqCard = new DQCard();
        foundationWallet = _foundationWallet;
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        _users[owner()].referrer = address(0);
        _users[owner()].hasNode = true;
        _users[owner()].activeLineCount = type(uint256).max;
        allUsers.push(owner());
    }

    modifier onlyCanDeposit() {
        address referrer = _users[msg.sender].referrer;
        require(referrer != address(0), "not registered");
        require(_hasNodeInUpline(msg.sender), "no node in upline");
        if (!_users[msg.sender].hasDeposited) {
            require(_users[msg.sender].hasNode, "first deposit requires node");
        }
        _;
    }
    
    modifier notRestricted() {
        require(!isRestricted[msg.sender], "address is restricted");
        _;
    }
    
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

    // ============ 注册 ============
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

    // ============ 购买节点 NFT ============
    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = dqCard.getCardPrice(_type);
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= price, "insufficient balance");
        
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), price);
        
        dqCard.mintByOwner(msg.sender, _type);
        
        _users[msg.sender].hasNode = true;
        
        lpPool += price;
        totalLPShares += price;
        
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
        
        if (user.referrer == address(0) && msg.sender != owner()) {
            _users[msg.sender].referrer = owner();
            _users[owner()].directCount++;
            _users[owner()].children.add(msg.sender);
            allUsers.push(msg.sender);
            emit Register(msg.sender, owner());
        }
        
        _updateActiveLines(msg.sender);
        
        emit BuyNode(msg.sender, _type, price);
    }

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

    // ============ 入金 ============
    function deposit(uint256 _amount) external nonReentrant onlyCanDeposit {
        require(_amount >= INVEST_MIN, "below minimum");
        require(_amount <= getCurrentMaxInvest(), "exceed max");
        require(IBEP20(BEP20_TOKEN).balanceOf(msg.sender) >= _amount, "insufficient balance");
        
        bool isFirst = !_users[msg.sender].hasDeposited;
        
        IBEP20(BEP20_TOKEN).transferFrom(msg.sender, address(this), _amount);
        
        uint256 dqAmount = _amount * 1 ether / dqPrice;
        
        uint256 dynamicShare = _amount * 50 / 100;
        uint256 lpShare = _amount * 50 / 100;
        
        dynamicPool += dynamicShare;
        lpPool += lpShare;
        totalLPShares += lpShare;
        
        User storage user = _users[msg.sender];
        user.totalInvest += _amount;
        user.energy += _amount * 6;
        user.directSales += _amount;
        user.hasDeposited = true;
        
        _updateTeamInvest(msg.sender, _amount);
        _distributeDynamic(msg.sender, dynamicShare);
        _notifyUplineOfDeposit(msg.sender);
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        _checkAndAddPartner(msg.sender);
        
        dqToken.mint(msg.sender, dqAmount);
        
        emit Deposit(msg.sender, _amount, dqAmount, isFirst);
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

    function checkNodeQualified(address _user) public view returns (bool qualified, uint256 currentLines, uint256 requiredLines) {
        uint256 balance = dqCard.balanceOf(_user);
        if (balance == 0) {
            return (false, 0, 0);
        }
        
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

    // ============ 分发动态奖金 ============
    function _distributeDynamic(address _user, uint256 _amount) internal {
        uint256 directShare = _amount * 30 / 100;
        uint256 nodeShare = _amount * 15 / 100;
        uint256 mgmtShare = _amount * 30 / 100;
        uint256 daoShare = _amount * 10 / 100;
        uint256 insuranceShare = _amount * 7 / 100;
        uint256 operationShare = _amount * 8 / 100;
        
        address referrer = _users[_user].referrer;
        if (referrer != address(0)) {
            // 检查是否被限制
            if (!isRestricted[referrer]) {
                if (_users[referrer].energy >= directShare) {
                    _users[referrer].energy -= directShare;
                }
            } else {
                // 限制地址的收益进入运营池
                operationPool += directShare;
            }
            _users[referrer].directSales += directShare;
        }
        
        _distributeNode(_user, nodeShare);
        _distributeManagement(_user, mgmtShare);
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
                // 检查是否被限制
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
        // 检查是否在合伙人白名单中
        if (!isPartnerWhite[_user]) return;

        User storage user = _users[_user];
        uint256 investReq = 5000 ether;
        if (user.totalInvest < investReq) return;

        uint256 salesReq = partnerWhiteList.length <= 20 ? 30000 ether : 50000 ether;
        if (user.directSales < salesReq) return;

        partnerDebt[_user] = partnerAccPerShare / 1e12;
    }

    // ============ DQ 卖出 ============
    function withdrawDQ(uint256 _dqAmount, uint256 _minOut) external nonReentrant notRestricted {
        require(_dqAmount > 0, "amount must > 0");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        
        uint256 bep20Amount = _dqAmount * dqPrice / 1 ether;
        uint256 fee = bep20Amount * 6 / 100;
        uint256 userOut = bep20Amount - fee;
        
        require(userOut >= _minOut, "slippage too high");
        require(IERC20(BEP20_TOKEN).balanceOf(address(this)) >= userOut, "insufficient token");
        
        dqToken.burn(_dqAmount);
        
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        _distributeWithdrawFee(stakeFee);
        operationPool += operationFee;
        
        IBEP20(BEP20_TOKEN).transfer(msg.sender, userOut);
        
        emit Withdraw(msg.sender, userOut);
    }
    
    function _distributeWithdrawFee(uint256 _feeAmount) internal {
        if (totalLPShares > 0) {
            lpAccPerShare += _feeAmount * 1e12 / totalLPShares;
        }
    }

    // ============ LP 质押分币 ============
    function claimLP() external nonReentrant notRestricted {
        uint256 pending = lpStakes[msg.sender].amount * lpAccPerShare / 1e12 - lpStakes[msg.sender].rewardDebt;
        require(pending > 0, "no pending");
        
        lpStakes[msg.sender].rewardDebt = lpStakes[msg.sender].amount * lpAccPerShare / 1e12;
        
        uint256 dqAmount = pending * 1 ether / dqPrice;
        dqToken.mint(msg.sender, dqAmount);
        
        emit ClaimLP(msg.sender, pending);
    }
    
    // ============ 爆块机制 ============
    /**
     * @notice 每日爆块
     * @dev 合伙人收益由白名单地址平均分配
     */
    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");
        
        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000;
        uint256 burn = release * burnRate / 100;
        
        dqToken.burnToBlackhole(burn);
        
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
            blockAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        
        _updateNftAcc(nftShare);
        
        uint256 foundationDQ = foundationShare * 1 ether / dqPrice;
        dqToken.mint(foundationWallet, foundationDQ);
        
        // 合伙人收益由白名单平均分配
        _updatePartnerAcc(partnerShare);
        
        _updateTeamAcc(teamShare);
        
        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }
    
    /**
     * @notice 更新合伙人累积收益
     */
    function _updatePartnerAcc(uint256 _partnerShare) internal {
        uint256 partnerCount = partnerWhiteList.length;
        if (partnerCount > 0) {
            partnerAccPerShare += _partnerShare * 1e12 / partnerCount;
        }
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
    
    // ============ 领取 D 级团队分红 ============
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
    
    // ============ 领取合伙人分红 ============
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

    // ============ 单币质押 ============
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
    
    function _claimSingleStake(address _user, uint _period) internal {
        uint256 pending = singleStakes[_user][_period] * stakeFeeAccPerShare[_period] / 1e12;
        if (pending > 0) {
            uint256 dqAmount = pending * 1 ether / dqPrice;
            dqToken.mint(_user, dqAmount);
        }
    }

    // ============ 管理员功能 ============
    
    /**
     * @notice 添加合伙人白名单
     * @dev 合伙人收益由白名单地址平均分配
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
        
        // 从数组中移除
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
     * @dev 被限制的地址无法领取任何奖励，收益转入运营池
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
    
    function canDeposit(address _user) external view returns (bool) {
        if (_users[_user].referrer == address(0)) return false;
        if (!_hasNodeInUpline(_user)) return false;
        if (!_users[_user].hasDeposited && !_users[_user].hasNode) return false;
        return true;
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
    
    receive() external payable {}
}
