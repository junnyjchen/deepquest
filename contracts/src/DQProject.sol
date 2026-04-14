// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DQProject Smart Contract
 * @notice DeepQuest DeFi Platform - BSC Network
 * @dev 
 * 
 * ==================== 代币信息 ====================
 * - 代币名称: DQ (DeepQuest Token)
 * - 代币总量: 1000亿 (1,000,000,000,000)
 * - 入金代币: BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
 * - 出金方式: 通过 PancakeSwap DEX 卖出 DQ 换 BNB
 * 
 * ==================== 兑换流程 ====================
 * 1. 入金 (BEP20代币 → DQ):
 *    - 用户质押 BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
 *    - 30% 进入 LP 池，70% 进入运营池
 *    - 合约铸造对应数量的 DQ 给用户
 * 
 * 2. 质押 (DQ 锁仓):
 *    - 用户质押 DQ 代币
 *    - 获得分红收益
 *    - 支持随时提取本金
 * 
 * 3. 出金 (DQ → BNB):
 *    - 用户销毁 DQ 代币
 *    - 合约通过 PancakeSwap DEX 将 DQ 兑换为 WBNB，再换成 BNB
 *    - BNB 转给用户（扣除6%手续费）
 * 
 * ==================== 质押周期与分红 ====================
 * - 30天: 5% 收益
 * - 90天: 10% 收益
 * - 180天: 15% 收益
 * - 360天: 20% 收益
 * 
 * ==================== 节点卡牌资金分配 ====================
 * - LP质押池: 60%
 * - 节点NFT: 15%
 * - 运营池: 25%
 * 
 * ==================== 爆块分配 ====================
 * - LP: 60%
 * - NFT: 15%
 * - 基金会: 5%
 * - 团队: 14%
 * - 合伙人: 6%
 * 
 * ==================== 动态提现手续费分配 ====================
 * - 节点: 40%
 * - 合伙人: 30%
 * - 运营: 30%
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============ PancakeSwap V2 Router 接口 (BSC) ============
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

// ============ WBNB 代币接口 ============
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

// ============ DQ 代币 ============
contract DQToken is ERC20 {
    constructor() ERC20("DQ Token", "DQ") {
        // 铸造 1000亿 代币
        _mint(address(this), 100_000_000_000 * 10**18);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
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
    
    // 卡牌价格 (BEP20 代币)
    uint256 public constant PRICE_A = 500 ether;  // 500 BEP20
    uint256 public constant PRICE_B = 1000 ether;  // 1000 BEP20
    uint256 public constant PRICE_C = 3000 ether;  // 3000 BEP20
    
    mapping(uint256 => uint256) public cardType;
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    
    constructor() ERC721("DQ Card", "DQC") {}
    
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    
    function mintBatchByOwner(address[] calldata to, uint256[] calldata _types) external onlyOwner {
        require(to.length == _types.length, "length mismatch");
        for (uint i = 0; i < to.length; i++) {
            _mintCard(to[i], _types[i]);
        }
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
}

// ============ 主合约 ============
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    DQToken public dqToken;
    DQCard public dqCard;
    
    // ============ PancakeSwap 路由配置 (BSC) ============
    // PancakeSwap V2 Router on BSC
    address public constant PANCAKE_ROUTER = 0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6;
    // 入金代币地址 (BSC 链上的 BEP20 代币)
    address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    // WBNB 代币地址 (用于 DEX 交易)
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    
    // 价格相关 (1 DQ = ? BEP20代币, 默认 1:1)
    uint256 public dqPrice = 1 ether;

    // ============ 全局配置 ============
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;

    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    // ============ 用户数据结构 ============
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;
        uint256 lpShares;
        uint256 lpRewardDebt;
        uint256 pendingRewards;
        uint256 totalMgmtClaimed;
        uint256 totalDaoClaimed;
        uint8 dLevel;
        uint256 dRewardDebt;
        uint256[3] nftRewardDebt;
        uint256 directSales;
        EnumerableSet.AddressSet children;
    }

    mapping(address => User) internal _users;
    address[] public allUsers;

    // ============ 合伙人相关 ============
    address[] public partnerList;
    mapping(address => bool) public isPartner;
    uint256 public partnerCount;
    uint256 public partnerDQRewardDebt;
    uint256 public partnerDQAccPerShare;
    mapping(address => uint256) public partnerDQDebt;
    uint256 public partnerBNBAccPerShare;
    mapping(address => uint256) public partnerBNBDebt;

    // ============ 资金池 ============
    uint256 public managementPool;
    uint256 public daoPool;
    uint256 public insurancePool;
    uint256 public operationPool;
    uint256 public feePool;
    uint256 public lpPool;
	
    // ============ LP分红累积 ============
    uint256 public totalLPShares;
    uint256 public lpAccPerShare;

    // ============ NFT分红累积 ============
    uint256[3] public nftTotalShares;
    uint256[3] public nftAccPerShare;

    // ============ 团队奖励累积 ============
    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;

    // ============ 爆块状态 ============
    uint256 public lastBlockTime;
    uint256 public dailyReleaseRate = 13;
    uint256 public burnRate = 80;
    uint256 public constant MIN_BURN_RATE = 30;
    uint256 public constant BURN_DECREMENT = 5;

    // ============ 卡牌手续费分红累积 ============
    uint256[3] public feeAccPerShare;
    mapping(uint256 => uint256) public lastFeePerShare;

    // ============ 单币质押 ============
    struct Stake {
        uint256 amount;
        uint256 rewardDebt;
    }
    mapping(address => mapping(uint => Stake)) public stakes;
    uint256[] public stakePeriods = [30, 90, 180, 360];
    uint256[] public stakeRates = [5, 10, 15, 20];
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalStaked;

    // ============ 事件 ============
    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount);
    event LevelUp(address indexed user, uint8 newLevel);
    event DLevelUp(address indexed user, uint8 newDLevel);
    event ReferralReward(address indexed from, address indexed to, uint256 amount);
    event NodeReward(address indexed user, uint256 amount);
    event ManagementReward(address indexed user, uint256 amount);
    event DaoReward(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount, uint256 fee);
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    event ClaimLp(address indexed user, uint256 amount);
    event ClaimNft(address indexed user, uint256 amount);
    event ClaimDTeam(address indexed user, uint256 amount);
    event ClaimFee(address indexed user, uint256 amount);
    event InitialNodesAdded(address[] users, uint8[] cardTypes);
    event PartnerAdded(address indexed user, uint256 order);
    event ClaimPartnerDQ(address indexed user, uint256 amount);
    event ClaimPartnerBNB(address indexed user, uint256 amount);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event StakeDQ(address indexed user, uint256 amount, uint256 period);
    event UnstakeDQ(address indexed user, uint256 amount, uint256 period);
    
    // ============ 入金/出金事件 ============
    event SwapBEP20ForDQ(address indexed user, uint256 tokenAmount, uint256 dqAmount);
    event SwapBNBForDQ(address indexed user, uint256 bnbAmount, uint256 dqAmount);
    event SwapDQForBNB(address indexed user, uint256 dqAmount, uint256 bnbAmount, uint256 fee);
    event PriceUpdated(uint256 newPrice);

    constructor() {
        dqToken = new DQToken();
        dqCard = new DQCard();
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        _users[owner()].referrer = address(0);
        allUsers.push(owner());
    }

    modifier onlyRegistered() {
        require(_users[msg.sender].referrer != address(0) || msg.sender == owner(), "not registered");
        _;
    }

    // ============ 查看用户信息 ============
    function getUser(address _user) external view returns (
        address referrer,
        uint256 directCount,
        uint8 level,
        uint256 totalInvest,
        uint256 teamInvest,
        uint256 energy,
        uint256 lpShares,
        uint256 pendingRewards,
        uint8 dLevel
    ) {
        User storage u = _users[_user];
        return (
            u.referrer,
            u.directCount,
            u.level,
            u.totalInvest,
            u.teamInvest,
            u.energy,
            u.lpShares,
            u.pendingRewards,
            u.dLevel
        );
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
        uint256 max = INVEST_MAX_START + phase * INVEST_MAX_STEP;
        if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
        return max;
    }

    // ============ 入金 (使用 BNB) ============
    function deposit(uint256 amount) external payable nonReentrant onlyRegistered {
        require(amount >= INVEST_MIN && amount <= getCurrentMaxInvest(), "amount out of range");

        uint256 bnbReceived = msg.value;
        require(bnbReceived >= amount, "insufficient BNB");
        
        if (bnbReceived > amount) {
            payable(msg.sender).transfer(bnbReceived - amount);
        }

        uint256 half = amount / 2;

        User storage user = _users[msg.sender];
        user.totalInvest += amount;
        user.energy += amount * 3;
        user.lpShares += half;
        totalLPShares += half;
        lpPool += half;

        address referrer = user.referrer;
        if (referrer != address(0)) {
            _users[referrer].directSales += amount;
        }

        _distributeDynamic(msg.sender, half);
        _updateTeamInvest(msg.sender, amount);
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        _checkAndAddPartner(msg.sender);

        emit Deposit(msg.sender, amount);
    }

    function _checkAndAddPartner(address _user) internal {
        if (isPartner[_user]) return;
        if (partnerCount >= 50) return;

        User storage user = _users[_user];
        uint256 investReq = 5000 ether;
        if (user.totalInvest < investReq) return;

        uint256 salesReq;
        if (partnerCount < 20) {
            salesReq = 30000 ether;
        } else {
            salesReq = 50000 ether;
        }
        if (user.directSales < salesReq) return;

        isPartner[_user] = true;
        partnerList.push(_user);
        partnerCount++;
        emit PartnerAdded(_user, partnerCount);
    }

    // ============ 管理员批量添加初始节点 ============
    function addInitialNodes(address[] calldata _usersArr, uint8[] calldata _cardTypes) external onlyOwner {
        require(_usersArr.length == _cardTypes.length, "length mismatch");
        for (uint i = 0; i < _usersArr.length; i++) {
            address user = _usersArr[i];
            uint8 cardType = _cardTypes[i];
            require(_users[user].referrer != address(0) || user == owner(), "user not registered");
            dqCard.mintByOwner(user, cardType);
            if (cardType == 1 && _users[user].level < 1) {
                _users[user].level = 1;
                emit LevelUp(user, 1);
            } else if (cardType == 2 && _users[user].level < 2) {
                _users[user].level = 2;
                emit LevelUp(user, 2);
            } else if (cardType == 3 && _users[user].level < 3) {
                _users[user].level = 3;
                emit LevelUp(user, 3);
            }
        }
        emit InitialNodesAdded(_usersArr, _cardTypes);
    }

    // ============ 分配动态奖励 ============
    function _distributeDynamic(address _user, uint256 _half) internal {
        uint256 directShare = _half * 30 / 100;
        uint256 nodeShare = _half * 15 / 100;
        uint256 mgmtShare = _half * 30 / 100;
        uint256 daoShare = _half * 10 / 100;
        uint256 insuranceShare = _half * 7 / 100;
        uint256 operationShare = _half * 8 / 100;

        address referrer = _users[_user].referrer;
        if (referrer != address(0)) {
            _users[referrer].pendingRewards += directShare;
            emit ReferralReward(_user, referrer, directShare);
        } else {
            operationPool += directShare;
        }

        _distributeNode(_user, nodeShare);
        _distributeManagement(_user, mgmtShare);
        _distributeDAO(_user, daoShare);

        insurancePool += insuranceShare;
        operationPool += operationShare;
    }

    function _distributeNode(address _user, uint256 _totalNode) internal {
        uint256 perLayer = _totalNode / 15;
        uint256 remaining = _totalNode - perLayer * 15;
        insurancePool += remaining;

        address current = _users[_user].referrer;
        uint256 layer = 1;
        while (current != address(0) && layer <= 15) {
            uint256 maxLayer = _users[current].directCount * 3;
            if (maxLayer > 15) maxLayer = 15;
            if (layer <= maxLayer) {
                _users[current].pendingRewards += perLayer;
                emit NodeReward(current, perLayer);
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

    function _distributeManagement(address _user, uint256 _totalMgmt) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 rate = levelRates[level];
            if (rate > lastRate) {
                uint256 delta = rate - lastRate;
                uint256 reward = _totalMgmt * delta / 30;
                _users[current].pendingRewards += reward;
                emit ManagementReward(current, reward);
                lastRate = rate;
            }
            current = _users[current].referrer;
        }
        if (lastRate < 30) {
            uint256 remaining = _totalMgmt * (30 - lastRate) / 30;
            insurancePool += remaining;
        }
    }

    function _distributeDAO(address _user, uint256 _totalDao) internal {
        address current = _users[_user].referrer;
        uint256 lastRate = 0;
        while (current != address(0)) {
            uint8 level = _users[current].level;
            uint256 daoRate = 0;
            if (level >= 6) {
                daoRate = 10;
            } else if (level >= 3) {
                daoRate = 5;
            }
            if (daoRate > lastRate) {
                uint256 delta = daoRate - lastRate;
                uint256 reward = _totalDao * delta / 10;
                _users[current].pendingRewards += reward;
                emit DaoReward(current, reward);
                lastRate = daoRate;
            }
            current = _users[current].referrer;
        }
        if (lastRate < 10) {
            uint256 remaining = _totalDao * (10 - lastRate) / 10;
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

    // ============ 提现动态奖金 ============
    function withdraw() external nonReentrant {
        User storage user = _users[msg.sender];
        uint256 amount = user.pendingRewards;
        require(amount > 0, "no pending rewards");
        require(user.energy >= amount, "insufficient energy");

        user.energy -= amount;
        user.pendingRewards = 0;

        uint256 fee = amount * 10 / 100;
        uint256 userOut = amount - fee;
        
        uint256 nodeFee = fee * 40 / 100;
        uint256 partnerFee = fee * 30 / 100;
        uint256 operationFee = fee * 30 / 100;
        
        feePool += nodeFee;
        if (partnerCount > 0 && partnerFee > 0) {
            partnerBNBAccPerShare += partnerFee * 1e12 / partnerCount;
        }
        operationPool += operationFee;

        payable(msg.sender).transfer(userOut);
        emit Withdraw(msg.sender, userOut, fee);
    }

    // ============ 爆块 (每日一次) ============
    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");

        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000;
        uint256 burn = release * burnRate / 100;
        dqToken.burn(burn);

        if (burnRate > MIN_BURN_RATE) {
            burnRate -= BURN_DECREMENT;
            if (burnRate < MIN_BURN_RATE) burnRate = MIN_BURN_RATE;
        }

        uint256 remaining = release - burn;

        uint256 lpShare = remaining * 60 / 100;
        uint256 nftShare = remaining * 15 / 100;
        uint256 foundationShare = remaining * 5 / 100;
        uint256 teamShare = remaining * 14 / 100;
        uint256 partnerShare = remaining * 6 / 100;
	
        if (totalLPShares > 0) {
            lpAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        _updateNftAcc(nftShare);
        
        if (foundationShare > 0) {
            dqToken.transfer(owner(), foundationShare);
        }
        
        _updateTeamAcc(teamShare);
        if (partnerCount > 0 && partnerShare > 0) {
            partnerDQAccPerShare += partnerShare * 1e12 / partnerCount;
        }

        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }

    function _updateNftAcc(uint256 _nftShare) internal {
        uint256[3] memory totals = [
            dqCard.totalA(),
            dqCard.totalB(),
            dqCard.totalC()
        ];
        uint256[3] memory weights = [uint256(4), uint256(5), uint256(6)];
        uint256 totalWeight = 15;
        for (uint i = 0; i < 3; i++) {
            if (totals[i] > 0) {
                uint256 shareForType = _nftShare * weights[i] / totalWeight;
                nftAccPerShare[i] += shareForType * 1e12 / totals[i];
            }
            nftTotalShares[i] = totals[i];
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

    // ============ 领取分红 ============
    function claimLp() external nonReentrant {
        User storage user = _users[msg.sender];
        uint256 pending = user.lpShares * lpAccPerShare / 1e12 - user.lpRewardDebt;
        require(pending > 0, "no pending");
        user.lpRewardDebt = user.lpShares * lpAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimLp(msg.sender, pending);
    }

    function claimNft() external nonReentrant {
        User storage user = _users[msg.sender];
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            uint256 pending = nftAccPerShare[typeIndex] / 1e12 - user.nftRewardDebt[typeIndex];
            totalPending += pending;
            user.nftRewardDebt[typeIndex] = nftAccPerShare[typeIndex] / 1e12;
        }
        require(totalPending > 0, "no pending");
        dqToken.transfer(msg.sender, totalPending);
        emit ClaimNft(msg.sender, totalPending);
    }

    function claimDTeam() external nonReentrant {
        User storage user = _users[msg.sender];
        require(user.dLevel > 0, "no d level");
        uint256 levelIndex = user.dLevel - 1;
        uint256 pending = dAccPerShare[levelIndex] / 1e12 - user.dRewardDebt;
        require(pending > 0, "no pending");
        user.dRewardDebt = dAccPerShare[levelIndex] / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimDTeam(msg.sender, pending);
    }

    function claimPartnerDQ() external nonReentrant {
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerDQAccPerShare / 1e12 - partnerDQDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerDQDebt[msg.sender] = partnerDQAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimPartnerDQ(msg.sender, pending);
    }

    function claimPartnerBNB() external nonReentrant {
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerBNBAccPerShare / 1e12 - partnerBNBDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerBNBDebt[msg.sender] = partnerBNBAccPerShare / 1e12;
        payable(msg.sender).transfer(pending);
        emit ClaimPartnerBNB(msg.sender, pending);
    }

    function claimFee() external nonReentrant {
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            uint256 pending = feeAccPerShare[typeIndex] - lastFeePerShare[tokenId];
            if (pending > 0) {
                totalPending += pending;
                lastFeePerShare[tokenId] = feeAccPerShare[typeIndex];
            }
        }
        require(totalPending > 0, "no pending fee");
        payable(msg.sender).transfer(totalPending);
        emit ClaimFee(msg.sender, totalPending);
    }

    // ============ 购买节点 NFT (使用 BNB) ============
    function buyNode(uint256 _type) external payable nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = DQCard(dqCard).getCardPrice(_type);
        require(price > 0, "price not set");
        require(msg.value >= price, "insufficient BNB");
        
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        
        dqCard.mintByOwner(msg.sender, _type);
        
        uint256 lpShare = price * 60 / 100;
        uint256 nftShare = price * 15 / 100;
        uint256 operationShare = price * 25 / 100;
        
        lpPool += lpShare;
        lpAccPerShare += lpShare * 1e12 / (totalLPShares > 0 ? totalLPShares : 1);
        
        uint256[3] memory weights = [uint256(4), uint256(5), uint256(6)];
        uint256 totalWeight = 15;
        uint256 typeIndex = _type - 1;
        uint256[] memory totals = new uint256[](3);
        totals[0] = dqCard.totalA();
        totals[1] = dqCard.totalB();
        totals[2] = dqCard.totalC();
        uint256 totalNfts = totals[0] + totals[1] + totals[2];
        if (totalNfts > 0) {
            uint256 shareForType = nftShare * weights[typeIndex] / totalWeight;
            feeAccPerShare[typeIndex] += shareForType * 1e12 / totals[typeIndex];
        }
        
        operationPool += operationShare;
        
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
        
        emit BuyNode(msg.sender, _type, price);
    }

    // ============ 单币质押 DQ ============
    function stakeDQ(uint256 _amount, uint _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        require(_amount > 0, "amount must be > 0");
        
        uint period = stakePeriods[_periodIndex];
        Stake storage s = stakes[msg.sender][period];
        
        _claimFeeStake(msg.sender, period);
        
        dqToken.transferFrom(msg.sender, address(this), _amount);
        
        s.amount += _amount;
        totalStaked[period] += _amount;
        s.rewardDebt = s.amount * stakeFeeAccPerShare[period] / 1e12;
        
        emit StakeDQ(msg.sender, _amount, period);
    }

    function unstakeDQ(uint _periodIndex) external nonReentrant {
        uint period = stakePeriods[_periodIndex];
        Stake storage s = stakes[msg.sender][period];
        require(s.amount > 0, "no stake");
        
        _claimFeeStake(msg.sender, period);
        
        uint256 amount = s.amount;
        s.amount = 0;
        totalStaked[period] -= amount;
        
        dqToken.transfer(msg.sender, amount);
        emit UnstakeDQ(msg.sender, amount, period);
    }

    function _claimFeeStake(address _user, uint _period) internal {
        Stake storage s = stakes[_user][_period];
        uint256 pending = s.amount * stakeFeeAccPerShare[_period] / 1e12 - s.rewardDebt;
        if (pending > 0) {
            s.rewardDebt = s.amount * stakeFeeAccPerShare[_period] / 1e12;
            dqToken.transfer(_user, pending);
        }
    }

    // ============ BEP20 代币 → DQ 兑换 (入金) ============
    
    /**
     * @notice 将 BEP20 代币兑换为 DQ 代币
     * @dev 使用 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF 进行入金
     * @param _tokenAmount BEP20 代币数量
     */
    function swapBEP20ForDQ(uint256 _tokenAmount) external nonReentrant {
        require(_tokenAmount > 0, "amount must be > 0");
        
        // 从用户接收 BEP20 代币
        IERC20(BEP20_TOKEN).transferFrom(msg.sender, address(this), _tokenAmount);
        
        // 计算可获得的 DQ 数量
        uint256 dqAmount = _tokenAmount * 1 ether / dqPrice;
        
        // 检查不超过最大供应量
        uint256 maxSupply = 100_000_000_000 * 10**18;
        uint256 currentCirculating = dqToken.totalSupply();
        require(currentCirculating + dqAmount <= maxSupply, "exceed max supply");
        
        // 资金分配: 30% LP池, 70% 运营池
        uint256 lpShare = _tokenAmount * 30 / 100;
        uint256 operationShare = _tokenAmount * 70 / 100;
        
        lpPool += lpShare;
        lpAccPerShare += lpShare * 1e12 / (totalLPShares > 0 ? totalLPShares : 1);
        operationPool += operationShare;
        
        dqToken.mint(msg.sender, dqAmount);
        
        emit SwapBEP20ForDQ(msg.sender, _tokenAmount, dqAmount);
    }
    
    // ============ BNB → DQ 兑换 ============
    
    /**
     * @notice 将 BNB 兑换为 DQ 代币
     */
    function swapBNBForDQ() external payable nonReentrant {
        require(msg.value > 0, "must send BNB");
        
        uint256 bnbAmount = msg.value;
        uint256 dqAmount = bnbAmount * 1 ether / dqPrice;
        
        uint256 maxSupply = 100_000_000_000 * 10**18;
        uint256 currentCirculating = dqToken.totalSupply();
        require(currentCirculating + dqAmount <= maxSupply, "exceed max supply");
        
        uint256 lpShare = bnbAmount * 30 / 100;
        uint256 operationShare = bnbAmount * 70 / 100;
        
        lpPool += lpShare;
        lpAccPerShare += lpShare * 1e12 / (totalLPShares > 0 ? totalLPShares : 1);
        operationPool += operationShare;
        
        dqToken.mint(msg.sender, dqAmount);
        
        emit SwapBNBForDQ(msg.sender, bnbAmount, dqAmount);
    }
    
    // ============ DQ → BNB 兑换 (通过 PancakeSwap) ============
    
    /**
     * @notice 将 DQ 兑换为 BNB (通过 PancakeSwap DEX)
     * @dev 
     * 1. 用户销毁 DQ 代币
     * 2. 合约通过 PancakeSwap 将 DQ 兑换为 WBNB
     * 3. WBNB 转为 BNB 转给用户 (扣除 6% 手续费)
     */
    function swapDQForBNB(uint256 _dqAmount, uint256 _minOut) external nonReentrant {
        require(_dqAmount > 0, "amount must be > 0");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        
        uint256 bnbAmount = _dqAmount * dqPrice / 1 ether;
        uint256 fee = bnbAmount * 6 / 100;
        uint256 userOut = bnbAmount - fee;
        require(userOut >= _minOut, "slippage too high");
        
        dqToken.burn(_dqAmount);
        
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        _distributeStakeFee(stakeFee);
        operationPool += operationFee;
        
        _swapDQForBNB(userOut);
        
        emit SwapDQForBNB(msg.sender, _dqAmount, userOut, fee);
    }
    
    function _swapDQForBNB(uint256 _minOut) internal {
        address[] memory path = new address[](2);
        path[0] = address(dqToken);
        path[1] = WBNB;
        
        uint256 dqBalance = dqToken.balanceOf(address(this));
        if (dqBalance == 0) return;
        
        uint256 amountOutMin = _minOut * 95 / 100;
        
        dqToken.approve(PANCAKE_ROUTER, dqBalance);
        
        IPancakeRouter02(PANCAKE_ROUTER).swapExactTokensForETHSupportingFeeOnTransferTokens(
            dqBalance,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );
    }
    
    // ============ 管理员功能 ============
    
    function setPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "price must be > 0");
        dqPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    function _distributeStakeFee(uint256 _feeAmount) internal {
        for (uint i = 0; i < stakePeriods.length; i++) {
            uint period = stakePeriods[i];
            if (totalStaked[period] > 0) {
                uint256 share = _feeAmount * stakeRates[i] / 100;
                stakeFeeAccPerShare[period] += share * 1e12 / totalStaked[period];
            }
        }
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
    
    function adminWithdrawWBNB(uint256 amount) external onlyOwner {
        require(IERC20(WBNB).balanceOf(address(this)) >= amount, "insufficient balance");
        IERC20(WBNB).safeTransfer(owner(), amount);
    }
    
    function adminWithdrawToken(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).balanceOf(address(this)) >= amount, "insufficient balance");
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // ============ 视图函数 ============
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getBEP20Balance() external view returns (uint256) {
        return IERC20(BEP20_TOKEN).balanceOf(address(this));
    }
    
    function getWBNBBalance() external view returns (uint256) {
        return IERC20(WBNB).balanceOf(address(this));
    }
    
    function getPrice() external view returns (uint256) {
        return dqPrice;
    }
    
    function getStakeInfo(address _user) external view returns (
        uint256[] memory amounts,
        uint256[] memory pendingRewards
    ) {
        amounts = new uint256[](4);
        pendingRewards = new uint256[](4);
        for (uint i = 0; i < 4; i++) {
            uint period = stakePeriods[i];
            amounts[i] = stakes[_user][period].amount;
            pendingRewards[i] = stakes[_user][period].amount * stakeFeeAccPerShare[period] / 1e12 - stakes[_user][period].rewardDebt;
        }
    }
    
    receive() external payable {}
}
