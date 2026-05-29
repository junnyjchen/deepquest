// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DQMiningStakeCore V2
 * @notice 质押核心合约 - 包含管理奖和见点奖逻辑
 * 
 * 功能:
 * 1. 用户关系管理
 * 2. 三奖分配：直推奖30%、见点奖1%×15代、管理奖30%级差制
 * 3. LP奖励分配
 * 4. 质押奖励分配
 * 5. SOL/DQ提取
 */

// 能量接口
interface IEnergy {
    function useEnergy(address user, uint256 amount) external returns (bool);
    function getUserEnergy(address user) external view returns (uint256);
}

// LP代币接口(用于获取LP中的SOL和DQ数量)
interface ILP {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

// DQT代币接口
interface IDQT {
    function burnFromPool(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// DQMCore接口
interface IDQMCore {
    function getUserEnergy(address user) external view returns (uint256);
    function getUserTotalInvest(address user) external view returns (uint256);
    function isBlacklisted(address user) external view returns (bool);
    function setReferrer(address _user, address _referrer) external;
}

// PancakeSwap Router接口（用于移除流动性）
interface IPancakeRouter01 {
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
}

contract DQMiningStakeCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
    // ============ 常量地址 ============
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public constant PARTNER = 0x803B79B608455808C2f752c588804c3F5bF676a3;
    address public constant FIXED_NODE = 0x822682A54C454e938374e9690420cdFA264A18Aa;  // 固定节点地址
    
    // ============ 合约引用 ============
    address public dqToken;
    address public dqCard;
    address public coreContract;       // DQMCore合约地址
    address public miningContract;      // 爆块合约地址
    address public adminContract;
    address public lpPair;
    address public lpRouter;  // PancakeSwap Router地址
    
    // ============ 常量配置 ============
    uint256 public constant INITIAL_SUPPLY = 100_000_000_000 * 10**18; // 1000亿
    uint256 public constant MAX_REWARD = 3 * 10**18;                   // 最大奖励限制3 DQ
    uint256 public constant RT = 13;                                    // 释放率1.3%
    uint256 public constant IB = 8000;                                  // 初始销毁率80%
    uint256 public constant MB = 3000;                                  // 最低销毁率30%
    uint256 public constant BD = 50;                                    // 每天递减0.5%
    
    // ============ 奖励比例 ============
    uint256 public constant DIRECT_RATE = 30;   // 直推奖30%
    uint256 public constant SEE_RATE = 1;       // 见点奖1%/代 (15代共15%)
    uint256 public constant MGR_RATE = 30;      // 管理奖30%
    uint256 public constant DAO_RATE = 10;      // DAO 10%
    uint256 public constant OPER_RATE = 8;      // 运营 8%
    uint256 public constant INSURE_RATE = 7;    // 保险 7%
    uint256 public constant MAX_GENERATIONS = 15; // 见点奖最多15代
    
    // ============ 管理奖等级配置 ============
    uint256[6] public mgrThresh = [100 ether, 200 ether, 600 ether, 2000 ether, 6000 ether, 20000 ether];
    uint8[6] public mgrRates = [5, 10, 15, 20, 25, 30]; // 级差比率
    
    // ============ 手续费配置 ============
    // 手续费
    uint256 public constant CLAIM_FEE = 1000;  // 10%领取手续费
    address public feeReceiver;  // 手续费接收地址(从构造函数设置)
    
    // 外部合约地址
    address public dLevelPool;  // D等级池合约
    
    // DAO/运营/保险地址 (入金时直接分配)
    address public daoAddr;
    address public operAddr;
    address public insureAddr;
    
    // 用户数据
    mapping(address => uint256) public userEnergy;
    mapping(address => uint256) public userPendingSOL;
    mapping(address => uint256) public userBlockDQ;      // 爆块DQ奖励
    mapping(address => uint256) public userDirectSales;  // 直推数
    mapping(address => uint8) public userNodeLevel;      // 节点等级
    mapping(address => uint8) public userLevel;          // 用户等级 (S1-S6)
    mapping(address => address) public userReferrer;
    mapping(address => uint256) public directCount;    // 直推人数统计
    mapping(address => EnumerableSet.AddressSet) internal userChildren;
    
    // LP数据
    mapping(address => uint256) public lpS;  // 用户LP数量
    mapping(address => uint256) public lpD;  // 用户LP已领取
    mapping(address => uint256) public lpStakeTime;  // 用户LP质押时间（入金时首次记录）
    mapping(address => uint256) public userLP;      // 入金时记录的用户LP数量（authorizeLPEquity时核对用）
    uint256 public tLP;  // 总LP质押量
    uint256 public lA;   // LP累计奖励
    
    // D等级
    uint256[8] public dLevelCount;
    uint256[8] public dLevelAccReward;
    mapping(uint8 => mapping(address => bool)) public isDLevel;
    mapping(address => uint8) public userDLevel;
    mapping(address => uint256) public dLevelRewardDebt;
    
    // 节点NFT奖励
    uint256[3] public nA;  // A/B/C类型累计奖励
    
    // 节点奖励模式
    bool public nodeRewardToFixed;                          // true=给固定地址, false=给节点NFT持有者
    address public fixedNodeAddress;                        // 固定节点接收地址
    mapping(address => uint256[3]) public userNftF;
    
    // 质押数据
    uint256[4] public sA;  // 各周期累计奖励
    uint256[4] public tS;  // 各周期总质押量
    mapping(address => mapping(uint => uint256)) public sAmt;   // 用户各周期质押量
    mapping(address => mapping(uint => uint256)) public sDebt;  // 用户各周期已领取
    mapping(address => mapping(uint256 => uint256)) public userPendingDQ; // 用户待领取DQ
    
    uint256[4] public stakeDurations = [30 days, 90 days, 180 days, 360 days];
    uint256[4] public stakeWeights = [5, 10, 15, 20];
    
    // 黑名单
    mapping(address => bool) public isB;
    
    // LP权益管理（用户授权LP权益，无需转移LP代币）
    mapping(address => uint256) public lpEquity;        // 用户授权的LP权益数量
    uint256 public totalLPEquity;                       // 总LP权益
    mapping(address => uint256) public lpEquityDebt;    // 用户已领取的LP权益奖励
    
    // 团队业绩 (用于L等级自动升级)
    mapping(address => uint256) public teamSales;  // 用户团队总业绩
    mapping(address => mapping(address => uint256)) public directBranchSales;  // 直推分支业绩: user => directChild => branchSales
    
    // L等级升级阈值 (团队业绩)
    uint256[6] public levelThresholds = [
        100 ether,    // S1: 100 SOL
        200 ether,    // S2: 200 SOL
        600 ether,    // S3: 600 SOL
        2000 ether,   // S4: 2000 SOL
        6000 ether,   // S5: 6000 SOL
        20000 ether   // S6: 20000 SOL
    ];
    
    // 能量倍率
    uint256 public energyMul = 3;  // 默认3倍能量
    
    // ============ 事件 ============
    event EnergyChanged(address indexed user, uint256 energy);
    event RewardDistributed(address indexed user, uint8 rewardType, uint256 amount);
    event WithdrawSOL(address indexed user, uint256 amount);
    event WithdrawDQ(address indexed user, uint256 amount);
    event LPStaked(address indexed user, uint256 amount);
    event LPUnstaked(address indexed user, uint256 amount);
    event LPWithdrawn(address indexed user, uint256 amount, uint256 fee, uint256 stakeDuration);
    event LPRewardDistributed(uint256 amount);
    // LPRewardClaimed 已拆分到 DQMiningStakeVault.sol
    event NodeRewardDistributed(uint256 amount);
    event NodeRewardToFixed(address indexed receiver, uint256 amount);
    event NodeRewardModeChanged(bool toFixed, address fixedAddress);
    event NodeRewardClaimed(address indexed user, uint8 nodeType, uint256 amount);
    event DRankRewardDistributed(uint256 amount);
    event DRankRewardClaimed(address indexed user, uint8 dLevel, uint256 amount);
    event LPMigrated(address indexed user, uint256 lpAmount, uint256 energy);
    event LevelChanged(address indexed user, uint8 level);
    event ReferrerSet(address indexed user, address indexed referrer);
    event TeamSalesUpdated(address indexed user, uint256 amount, uint256 totalTeamSales);
    event AutoUpgraded(address indexed user, uint8 oldLevel, uint8 newLevel);
    event LPEquityAuthorized(address indexed user, uint256 amount);
    event LPEquityCancelled(address indexed user, uint256 amount);
    event LPEquityRewardClaimed(address indexed user, uint256 amount);
    event LPRecorded(address indexed user, uint256 amount);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER || msg.sender == adminContract, "!owner");
        _;
    }
    
    modifier onlyMining() {
        require(msg.sender == miningContract || msg.sender == adminContract || msg.sender == OWNER, "!mining");
        _;
    }
    
    modifier onlyCore() {
        require(msg.sender == coreContract || msg.sender == OWNER, "!core");
        _;
    }
    
    // ============ 构造函数 ============
    constructor() {}
    
    // ============ 设置函数 ============
    
    // 手续费地址 (0x1850933c0d64db3A56476F5Bdc4191BCFd242e30)
    address constant FEE_RECEIVER = 0x1850933c0d64db3A56476F5Bdc4191BCFd242e30;
    
    function setAddresses(address _dq, address _dc, address _lpPair) external onlyOwner {
        if (_dq != address(0)) dqToken = _dq;
        if (_dc != address(0)) dqCard = _dc;
        if (lpPair == address(0) && _lpPair != address(0)) lpPair = _lpPair;
        if (feeReceiver == address(0)) feeReceiver = FEE_RECEIVER;
    }
    
    function setCoreContract(address _addr) external onlyOwner {
        coreContract = _addr;
    }
    
    function setMiningContract(address _addr) external onlyOwner {
        miningContract = _addr;
    }
    
    function setAdminContract(address _addr) external onlyOwner {
        adminContract = _addr;
    }
    
    function setDLevelPool(address _addr) external onlyOwner {
        dLevelPool = _addr;
    }
    
    // 设置DAO/运营/保险地址
    function setDaoAddr(address _addr) external onlyOwner {
        daoAddr = _addr;
    }
    
    function setOperAddr(address _addr) external onlyOwner {
        operAddr = _addr;
    }
    
    function setInsureAddr(address _addr) external onlyOwner {
        insureAddr = _addr;
    }
    
    // 设置节点奖励模式
    // _toFixed: true=给固定地址, false=给节点NFT持有者
    // _fixedAddress: 固定接收地址
    function setNodeRewardMode(bool _toFixed, address _fixedAddress) external onlyOwner {
        nodeRewardToFixed = _toFixed;
        fixedNodeAddress = _fixedAddress;
        emit NodeRewardModeChanged(_toFixed, _fixedAddress);
    }
    
    function setLpPair(address _pair) external onlyOwner {
        lpPair = _pair;
    }
    
    function setLpRouter(address _router) external onlyOwner {
        lpRouter = _router;
    }
    
    function setEnergyMul(uint256 _m) external onlyOwner {
        energyMul = _m;
    }
    
    function bl(address _u, bool _s) external onlyOwner {
        isB[_u] = _s;
    }
    
    // ============ 用户管理 ============
    
    function registerUser(address _u, address _r) external onlyCore {
        userReferrer[_u] = _r;
        if (_r != address(0)) userChildren[_r].add(_u);
    }
    
    function addDirectSales(address _u, uint256 _a) external onlyCore {
        userDirectSales[_u] += _a;
    }
    
    function setUserNodeLevel(address _u, uint8 _lvl) external onlyOwner {
        userNodeLevel[_u] = _lvl;
    }
    
    /**
     * @notice 注册用户D等级
     * @dev 新注册时设置初始debt，防止领取之前累积的奖励
     */
    function registerDLevel(address _u, uint8 _lvl) external onlyOwner {
        require(_lvl > 0 && _lvl <= 8, "!level");
        // 如果之前有等级，减少计数
        if (userDLevel[_u] > 0) {
            dLevelCount[userDLevel[_u] - 1]--;
        }
        userDLevel[_u] = _lvl;
        dLevelCount[_lvl - 1]++;
        isDLevel[_lvl][_u] = true;
        
        // 设置初始debt，防止领取之前累积的奖励
        if (dLevelCount[_lvl - 1] > 0) {
            dLevelRewardDebt[_u] = dLevelAccReward[_lvl - 1] / dLevelCount[_lvl - 1];
        }
    }
    
    // D等级自动升级阈值：团队中有效入金地址数
    uint256[8] public dLevelThresholds = [
        30,      // D1: 30个有效地址
        120,     // D2: 120
        360,     // D3: 360
        1000,    // D4: 1000
        4000,    // D5: 4000
        10000,   // D6: 10000
        15000,   // D7: 15000
        30000    // D8: 30000
    ];
    
    /**
     * @notice 统计用户团队中有效入金地址数（递归遍历所有下级）
     * @dev 有效地址 = 有SOL入金记录的地址
     */
    function countValidAddresses(address _user) public view returns (uint256) {
        uint256 count = 0;
        EnumerableSet.AddressSet storage children = userChildren[_user];
        uint256 len = children.length();
        
        for (uint256 i = 0; i < len; i++) {
            address child = children.at(i);
            // 检查是否有入金记录（通过coreContract查询）
            if (IDQMCore(coreContract).getUserTotalInvest(child) > 0) {
                count++;
            }
            // 递归统计子团队
            count += countValidAddresses(child);
        }
        return count;
    }
    
    /**
     * @notice 检查并自动升级D等级
     * @dev 根据团队有效地址数自动升级，只能升级不能降级
     */
    function checkDLevelUpgrade(address _user) external onlyOwner {
        uint256 validCount = countValidAddresses(_user);
        uint8 newLevel = 0;
        
        // 从最高等级开始检查
        for (uint8 i = 8; i >= 1; i--) {
            if (validCount >= dLevelThresholds[i - 1]) {
                newLevel = i;
                break;
            }
        }
        
        // 只升级不降级
        if (newLevel > userDLevel[_user]) {
            uint8 oldLevel = userDLevel[_user];
            
            // 减少旧等级计数
            if (oldLevel > 0) {
                dLevelCount[oldLevel - 1]--;
            }
            
            userDLevel[_user] = newLevel;
            dLevelCount[newLevel - 1]++;
            isDLevel[newLevel][_user] = true;
            
            // 设置初始debt
            if (dLevelCount[newLevel - 1] > 0) {
                dLevelRewardDebt[_user] = dLevelAccReward[newLevel - 1] / dLevelCount[newLevel - 1];
            }
            
            emit AutoUpgraded(_user, oldLevel, newLevel);
        }
    }
    
    function setEnergy(address _u, uint256 _e) external onlyMining {
        userEnergy[_u] = _e;
        emit EnergyChanged(_u, _e);
    }
    
    function addEnergy(address _u, uint256 _a) external onlyMining {
        userEnergy[_u] += _a;
        emit EnergyChanged(_u, userEnergy[_u]);
    }
    
    // ============ 入金回调 ============
    
    /**
     * @notice 从DQMCore接收入金（SOL ERC20已转入本合约）
     */
    function onDeposit(address _user, uint256 _amount) external onlyCore {
        // 同步添加能量到StakeCore（奖励扣减用的是此处的userEnergy）
        uint256 energyAdd = _amount * energyMul;
        userEnergy[_user] += energyAdd;
        emit EnergyChanged(_user, userEnergy[_user]);
        
        // 更新团队业绩并检查自动升级
        _updateTeamSalesAndUpgrade(_user, _amount);
        
        // 分配三奖
        _distributeRewards(_user, _amount);
    }
    
    /**
     * @notice 更新团队业绩并检查自动升级
     * @dev 遍历上级链，更新每个人的团队业绩，并检查是否满足升级条件
     *      同时更新每个上级的直推分支业绩，用于"去掉一个大区"逻辑
     */
    function _updateTeamSalesAndUpgrade(address _user, uint256 _amount) internal {
        address cur = userReferrer[_user];
        
        while (cur != address(0)) {
            // 更新团队总业绩
            teamSales[cur] += _amount;
            
            // 更新直推分支业绩：找到cur的哪个直推包含了_user
            address directChild = _user;
            address parent = userReferrer[directChild];
            while (parent != cur && parent != address(0)) {
                directChild = parent;
                parent = userReferrer[directChild];
            }
            if (parent == cur) {
                directBranchSales[cur][directChild] += _amount;
            }
            
            emit TeamSalesUpdated(cur, _amount, teamSales[cur]);
            
            // 检查并自动升级（使用去掉一个大区的业绩）
            _checkAndAutoUpgrade(cur);
            
            cur = userReferrer[cur];
        }
    }
    
    /**
     * @dev 计算用户去掉最大区后的团队业绩（小区业绩）
     */
    function _getTeamSalesExcludingMaxBranch(address _user) internal view returns (uint256) {
        uint256 maxBranchSales = 0;
        EnumerableSet.AddressSet storage children = userChildren[_user];
        uint256 len = children.length();
        
        for (uint256 i = 0; i < len; i++) {
            address child = children.at(i);
            if (directBranchSales[_user][child] > maxBranchSales) {
                maxBranchSales = directBranchSales[_user][child];
            }
        }
        
        return teamSales[_user] - maxBranchSales;
    }
    
    /**
     * @notice 检查用户是否满足自动升级条件
     * @dev 根据团队业绩（去掉一个大区后的"小区"业绩）自动升级L等级（S1-S6）
     *      - S1: 小区业绩 >= 100 SOL
     *      - S2: 小区业绩 >= 200 SOL
     *      - S3: 小区业绩 >= 600 SOL
     *      - S4: 小区业绩 >= 2000 SOL
     *      - S5: 小区业绩 >= 6000 SOL
     *      - S6: 小区业绩 >= 20000 SOL
     */
    function _checkAndAutoUpgrade(address _user) internal {
        // 去掉一个大区后的业绩
        uint256 sales = _getTeamSalesExcludingMaxBranch(_user);
        uint8 currentLevel = userLevel[_user];
        uint8 newLevel = currentLevel;
        
        // 根据小区业绩确定等级
        if (sales >= levelThresholds[5]) {
            newLevel = 6;  // S6
        } else if (sales >= levelThresholds[4]) {
            newLevel = 5;  // S5
        } else if (sales >= levelThresholds[3]) {
            newLevel = 4;  // S4
        } else if (sales >= levelThresholds[2]) {
            newLevel = 3;  // S3
        } else if (sales >= levelThresholds[1]) {
            newLevel = 2;  // S2
        } else if (sales >= levelThresholds[0]) {
            newLevel = 1;  // S1
        }
        
        // 只有升级时才更新（不降级）
        if (newLevel > currentLevel) {
            userLevel[_user] = newLevel;
            emit LevelChanged(_user, newLevel);
            emit AutoUpgraded(_user, currentLevel, newLevel);
        }
    }
    
    /**
     * @notice 手动检查并升级用户等级（管理员调用）
     */
    function checkAndUpgradeUser(address _user) external onlyOwner {
        _checkAndAutoUpgrade(_user);
    }
    
    /**
     * @notice 批量检查并升级用户等级
     */
    function checkAndUpgradeUsers(address[] calldata _users) external onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            _checkAndAutoUpgrade(_users[i]);
        }
    }

    // ============ LP权益管理（入金LP直接转用户钱包，入金时记录数据，用户授权DAPP管理） ============
    
    /**
     * @notice 记录用户入金LP数据（由DQMCore入金时调用）
     * @dev 入金成功时DQMCore调用此函数，记录用户LP数量和首次入金时间
     *      LP代币已直接转给用户钱包，此函数只更新账本数据
     * @param _user 用户地址
     * @param _lpAmount 入金获得的LP数量
     */
    function recordLP(address _user, uint256 _lpAmount) external onlyCore {
        require(_lpAmount > 0, "!amount");
        
        // 首次入金记录时间（用于手续费计算：<60天20%，60-180天10%，>180天0%）
        if (userLP[_user] == 0) {
            lpStakeTime[_user] = block.timestamp;
        }
        userLP[_user] += _lpAmount;
        
        // 入金即获得LP权益身份，自动参与LP爆块分红
        lpEquity[_user] += _lpAmount;
        totalLPEquity += _lpAmount;
        
        // 设置debt防止领取之前累积的奖励（入金前的奖励不应获得）
        if (totalLPEquity > 0 && lA > 0) {
            lpEquityDebt[_user] = lpEquity[_user] * lA / totalLPEquity;
        }
        
        emit LPRecorded(_user, _lpAmount);
        emit LPEquityAuthorized(_user, _lpAmount);
    }
    
    /**
     * @notice 更新/核对LP权益数据
     * @dev 入金时LP权益已自动设置（recordLP），此函数用于核对和修正权益
     *      取用户钱包LP余额和合约记录LP的最小值作为权益上限
     *      如果钱包LP < 已记录权益，则减少差额（用户可能已卖掉部分LP）
     *      如果钱包LP > 已记录权益且合约记录LP > 已记录权益，则增加差额
     *      LP代币仍由用户持有，合约只记录权益用于奖励计算
     */
    function authorizeLPEquity() external nonReentrant {
        require(lpPair != address(0), "!lpPair");
        
        // 核对：取用户钱包LP余额和合约记录LP的最小值
        uint256 walletLP = IERC20(lpPair).balanceOf(msg.sender);
        uint256 recordedLP = userLP[msg.sender];
        uint256 maxEquity = walletLP < recordedLP ? walletLP : recordedLP;
        
        uint256 currentEquity = lpEquity[msg.sender];
        
        if (maxEquity > currentEquity) {
            // 权益增加（如用户从其他渠道获得LP，或重新买入LP）
            uint256 addAmount = maxEquity - currentEquity;
            lpEquity[msg.sender] = maxEquity;
            totalLPEquity += addAmount;
        } else if (maxEquity < currentEquity) {
            // 权益减少（用户已卖掉部分LP）
            uint256 subAmount = currentEquity - maxEquity;
            lpEquity[msg.sender] = maxEquity;
            totalLPEquity -= subAmount;
        }
        // 如果 maxEquity == currentEquity，无需变化
        
        // 重新设置debt
        if (totalLPEquity > 0 && lA > 0) {
            lpEquityDebt[msg.sender] = lpEquity[msg.sender] * lA / totalLPEquity;
        }
        
        emit LPEquityAuthorized(msg.sender, maxEquity);
    }
    
    /**
     * @notice 用户取消LP权益授权（破LP+扣手续费）
     * @dev 用户取消授权时，从用户钱包拉取LP，破除流动性获得SOL+DQ，扣除手续费后转给用户
     *      手续费率：<60天20%，60-180天10%，>180天0%
     * @param _amount 取消授权的LP权益数量
     */
    function cancelLPEquity(uint256 _amount) external nonReentrant {
        require(_amount > 0, "!amount");
        require(lpEquity[msg.sender] >= _amount, "!equity");
        // 实际可取消数量 = min(权益, 钱包LP, 合约记录LP)
        uint256 walletLP = IERC20(lpPair).balanceOf(msg.sender);
        uint256 actualAmount = _amount;
        if (actualAmount > walletLP) actualAmount = walletLP;
        if (actualAmount > userLP[msg.sender]) actualAmount = userLP[msg.sender];
        require(actualAmount > 0, "!walletLP");
        require(lpPair != address(0), "!lpPair");
        require(lpRouter != address(0), "!router");
        
        // 1. 计算并发放待领取的LP权益奖励
        if (totalLPEquity > 0 && lA > 0) {
            uint256 pending = lpEquity[msg.sender] * lA / totalLPEquity;
            uint256 reward = pending - lpEquityDebt[msg.sender];
            if (reward > 0) {
                lpEquityDebt[msg.sender] = pending;
                IERC20(dqToken).safeTransfer(msg.sender, reward);
                emit LPEquityRewardClaimed(msg.sender, reward);
            }
        }
        
        // 2. 更新用户LP权益记录（使用actualAmount）
        lpEquity[msg.sender] -= actualAmount;
        totalLPEquity -= actualAmount;
        userLP[msg.sender] -= actualAmount;
        
        // 更新debt
        if (totalLPEquity > 0) {
            lpEquityDebt[msg.sender] = lpEquity[msg.sender] * lA / totalLPEquity;
        } else {
            lpEquityDebt[msg.sender] = 0;
        }
        
        // 3. 从用户钱包拉取LP代币（用户需先approve LP给StakeCore）
        IERC20(lpPair).safeTransferFrom(msg.sender, address(this), actualAmount);
        
        // 4. 批准Router支配LP（removeLiquidity需要）
        IERC20(lpPair).approve(lpRouter, actualAmount);
        (uint256 amountSOL, uint256 amountDQ) = IPancakeRouter01(lpRouter).removeLiquidity(
            SOL,
            dqToken,
            actualAmount,
            1,  // minSOL
            1,  // minDQ
            address(this),
            block.timestamp + 3600
        );
        
        // 5. 计算手续费（与withdrawLP一致：<60天20%，60-180天10%，>180天0%）
        uint256 stakeTime = block.timestamp - lpStakeTime[msg.sender];
        uint256 feeRate;
        if (stakeTime < 60 days) {
            feeRate = 2000;  // 20%
        } else if (stakeTime <= 180 days) {
            feeRate = 1000;  // 10%
        } else {
            feeRate = 0;     // 0%
        }
        
        uint256 solFee = amountSOL * feeRate / 10000;
        uint256 dqFee = amountDQ * feeRate / 10000;
        uint256 userSOL = amountSOL - solFee;
        uint256 userDQ = amountDQ - dqFee;
        
        // 6. 转给用户（扣除手续费后）
        if (userSOL > 0) IERC20(SOL).safeTransfer(msg.sender, userSOL);
        if (userDQ > 0) IERC20(dqToken).safeTransfer(msg.sender, userDQ);
        
        // 7. 手续费转给手续费地址
        if (solFee > 0) IERC20(SOL).safeTransfer(feeReceiver, solFee);
        if (dqFee > 0) IERC20(dqToken).safeTransfer(feeReceiver, dqFee);
        
        emit LPEquityCancelled(msg.sender, actualAmount);
        emit LPWithdrawn(msg.sender, actualAmount, solFee + dqFee, stakeTime);
    }
    
    /**
     * @notice 用户一键取消全部LP权益（破LP+扣手续费）
     */
    function cancelAllLPEquity() external nonReentrant {
        uint256 equity = lpEquity[msg.sender];
        require(equity > 0, "!equity");
        
        // 实际可取消数量 = min(权益, 钱包LP, 合约记录LP)
        uint256 walletLP = IERC20(lpPair).balanceOf(msg.sender);
        uint256 actualAmount = equity;
        if (actualAmount > walletLP) actualAmount = walletLP;
        if (actualAmount > userLP[msg.sender]) actualAmount = userLP[msg.sender];
        require(actualAmount > 0, "!walletLP");
        require(lpPair != address(0), "!lpPair");
        require(lpRouter != address(0), "!router");
        
        // 1. 计算并发放待领取的LP权益奖励
        if (totalLPEquity > 0 && lA > 0) {
            uint256 pending = lpEquity[msg.sender] * lA / totalLPEquity;
            uint256 reward = pending - lpEquityDebt[msg.sender];
            if (reward > 0) {
                lpEquityDebt[msg.sender] = pending;
                IERC20(dqToken).safeTransfer(msg.sender, reward);
                emit LPEquityRewardClaimed(msg.sender, reward);
            }
        }
        
        // 2. 更新用户LP权益记录（使用actualAmount）
        totalLPEquity -= actualAmount;
        lpEquity[msg.sender] -= actualAmount;
        userLP[msg.sender] -= actualAmount;
        
        // 更新debt
        if (totalLPEquity > 0) {
            lpEquityDebt[msg.sender] = lpEquity[msg.sender] * lA / totalLPEquity;
        } else {
            lpEquityDebt[msg.sender] = 0;
        }
        
        // 3. 从用户钱包拉取LP代币（用户需先approve LP给StakeCore）
        IERC20(lpPair).safeTransferFrom(msg.sender, address(this), actualAmount);
        
        // 4. 批准Router支配LP
        IERC20(lpPair).approve(lpRouter, actualAmount);
        (uint256 amountSOL, uint256 amountDQ) = IPancakeRouter01(lpRouter).removeLiquidity(
            SOL,
            dqToken,
            actualAmount,
            1,
            1,
            address(this),
            block.timestamp + 3600
        );
        
        // 5. 计算手续费
        uint256 stakeTime = block.timestamp - lpStakeTime[msg.sender];
        uint256 feeRate;
        if (stakeTime < 60 days) {
            feeRate = 2000;  // 20%
        } else if (stakeTime <= 180 days) {
            feeRate = 1000;  // 10%
        } else {
            feeRate = 0;
        }
        
        uint256 solFee = amountSOL * feeRate / 10000;
        uint256 dqFee = amountDQ * feeRate / 10000;
        uint256 userSOL = amountSOL - solFee;
        uint256 userDQ = amountDQ - dqFee;
        
        // 6. 转给用户
        if (userSOL > 0) IERC20(SOL).safeTransfer(msg.sender, userSOL);
        if (userDQ > 0) IERC20(dqToken).safeTransfer(msg.sender, userDQ);
        
        // 7. 手续费转给手续费地址
        if (solFee > 0) IERC20(SOL).safeTransfer(feeReceiver, solFee);
        if (dqFee > 0) IERC20(dqToken).safeTransfer(feeReceiver, dqFee);
        
        emit LPEquityCancelled(msg.sender, actualAmount);
        emit LPWithdrawn(msg.sender, actualAmount, solFee + dqFee, stakeTime);
    }
    
    /**
     * @notice 查询用户LP权益详情
     * @return stakedLP 已质押的LP数量（入金时自动质押）
     * @return equityLP 已授权的钱包LP数量
     * @return totalEquity 总LP权益
     * @return walletLP 钱包LP余额
     */
    function getLPEquityInfo(address _user) external view returns (
        uint256 stakedLP,
        uint256 equityLP,
        uint256 totalEquity,
        uint256 walletLP
    ) {
        stakedLP = lpS[_user];
        equityLP = lpEquity[_user];
        totalEquity = stakedLP + equityLP;
        walletLP = lpPair != address(0) ? IERC20(lpPair).balanceOf(_user) : 0;
    }
    
    /**
     * @notice 用户领取LP权益奖励
     */
    function claimLPEquityReward() external nonReentrant {
        require(!IDQMCore(coreContract).isBlacklisted(msg.sender), "blacklisted");
        require(lpEquity[msg.sender] > 0, "!equity");
        require(totalLPEquity > 0, "!total");
        
        // 计算用户应得奖励
        uint256 pending = lpEquity[msg.sender] * lA / totalLPEquity;
        uint256 reward = pending - lpEquityDebt[msg.sender];
        
        require(reward > 0, "!reward");
        
        lpEquityDebt[msg.sender] = pending;
        
        IERC20(dqToken).safeTransfer(msg.sender, reward);
        emit LPEquityRewardClaimed(msg.sender, reward);
    }
    
    /**
     * @notice 查询用户LP权益
     */
    function getLPEquity(address _user) external view returns (uint256) {
        return lpEquity[_user];
    }
    
    /**
     * @notice 查询用户LP权益待领取奖励
     */
    function getLPEquityPending(address _user) external view returns (uint256) {
        if (totalLPEquity == 0 || lpEquity[_user] == 0) return 0;
        uint256 pending = lpEquity[_user] * lA / totalLPEquity;
        return pending - lpEquityDebt[_user];
    }
    
    /**
     * @notice 导入用户等级（供迁移合约调用）
     * @param _user 用户地址
     * @param _level 等级 (1-6 对应 S1-S6)
     */
    function importUserLevel(address _user, uint8 _level) external onlyMining {
        require(_user != address(0), "!user");
        require(_level >= 1 && _level <= 6, "!level");
        
        userLevel[_user] = _level;
        emit LevelChanged(_user, _level);
    }

    /**
     * @notice 批量导入用户推荐关系（供管理合约调用）
     * @param _users 用户地址数组
     * @param _referrers 推荐人地址数组
     * @dev 必须在用户首次入金前调用，否则推荐关系不会更新
     */
    function batchImportReferrers(address[] calldata _users, address[] calldata _referrers) external onlyOwner {
        require(_users.length == _referrers.length, "!len");
        require(_users.length > 0, "!empty");
        
        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            address ref = _referrers[i];
            if (user == address(0) || ref == address(0)) continue;
            if (user == ref) continue;
            if (userReferrer[user] != address(0)) continue; // 已存在不覆盖
            
            userReferrer[user] = ref;
            directCount[ref] += 1;
            IDQMCore(coreContract).setReferrer(user, ref);
            emit ReferrerSet(user, ref);
        }
    }

    /**
     * @notice 设置用户推荐人（由DQMCore注册时调用）
     */
    function setReferrer(address _user, address _referrer) external onlyCore {
        require(_user != address(0) && _referrer != address(0), "!addr");
        require(_user != _referrer, "!self");
        if (userReferrer[_user] == address(0)) {
            userReferrer[_user] = _referrer;
            directCount[_referrer] += 1;
            emit ReferrerSet(_user, _referrer);
        }
    }

    /**
     * @notice 设置用户推荐人（单个）
     */
    function importUserReferrer(address _user, address _referrer) external onlyOwner {
        require(_user != address(0) && _referrer != address(0), "!addr");
        require(_user != _referrer, "!self");
        require(userReferrer[_user] == address(0), "!exists");
        
        userReferrer[_user] = _referrer;
        directCount[_referrer] += 1;
        IDQMCore(coreContract).setReferrer(_user, _referrer);
        emit ReferrerSet(_user, _referrer);
    }

    /**
     * @notice 设置用户L等级
     * @param _user 用户地址
     * @param _level 等级 (1-6 对应 S1-S6)
     */
    function setUserLevel(address _user, uint8 _level) external {
        require(msg.sender == dqCard || msg.sender == adminContract || msg.sender == OWNER, "!auth");
        require(_user != address(0), "!user");
        require(_level >= 1 && _level <= 6, "!level");
        
        // 只升级不降级
        if (_level > userLevel[_user]) {
            userLevel[_user] = _level;
            emit LevelChanged(_user, _level);
        }
    }
    
    /**
     * @notice 设置迁移合约地址
     */
    // ============ 三奖分配 ============
    
    /**
     * @notice 分配动态奖励
     * @param _user 入金用户
     * @param _amount 入金金额
     * 
     * 分配比例：
     * - 直推奖 30%
     * - 见点奖 15% (1%×15代)
     * - 管理奖 30%
     * - DAO 10%
     * - 运营 8%
     * - 保险 7%
     * 合计 100%
     */
    function _distributeRewards(address _user, uint256 _amount) internal {
        address ref = userReferrer[_user];
        if (ref == address(0)) return;
        
        // 1. 直推奖30%
        _distDirect(_user, ref, _amount);
        
        // 2. 见点奖1%×最多15代 (共15%)
        _distSee(_user, _amount * SEE_RATE / 100, 1);
        
        // 3. 管理奖30%级差制
        _distMgr(_user, _amount * MGR_RATE / 100);
        
        // 注意：DAO/运营/保险已由DQMCore直接分发，此处不再处理
        // 原因：_distributeRewards在用户无推荐人时直接return，
        //        如果DAO/OP/INS在此分发，无推荐人时全部跳过 → 奖励无法发放
    }
    
    /**
     * @notice 直推奖分配 - 30%
     */
    function _distDirect(address _from, address _ref, uint256 _amount) internal {
        uint256 reward = _amount * DIRECT_RATE / 100;
        
        // 检查能量是否足够
        if (userEnergy[_ref] >= reward) {
            userEnergy[_ref] -= reward;
            userPendingSOL[_ref] += reward;
            emit RewardDistributed(_ref, 1, reward); // 1=直推奖
        }
    }
    
    /**
     * @notice 见点奖分配 - 1%/代，最多15代
     * @param _user 入金用户
     * @param _seePool 每代奖励金额
     * @param _depth 当前深度
     */
    function _distSee(address _user, uint256 _seePool, uint8 _depth) internal {
        if (_depth > MAX_GENERATIONS) return;
        
        address ref = userReferrer[_user];
        if (ref == address(0)) return;
        
        // 获取直推数
        uint256 ds = userDirectSales[ref];
        
        // 见点奖条件检查
        bool canReceive = false;
        if (_depth <= 3 && ds >= 1) {
            canReceive = true;
        } else if (_depth <= 6 && ds >= 2) {
            canReceive = true;
        } else if (_depth <= 9 && ds >= 3) {
            canReceive = true;
        } else if (_depth <= 12 && ds >= 4) {
            canReceive = true;
        } else if (_depth <= 15 && ds >= 5) {
            canReceive = true;
        }
        
        // 分配奖励
        if (canReceive && userEnergy[ref] >= _seePool) {
            userEnergy[ref] -= _seePool;
            userPendingSOL[ref] += _seePool;
            emit RewardDistributed(ref, 2, _seePool); // 2=见点奖
        }
        
        // 递归到上一级
        _distSee(ref, _seePool, _depth + 1);
    }
    
    /**
     * @notice 管理奖分配 - 30%级差制
     * 级差制说明：
     * - S1: 5%  (团队业绩≥100)
     * - S2: 10% (团队业绩≥200)
     * - S3: 15% (团队业绩≥600)
     * - S4: 20% (团队业绩≥2000)
     * - S5: 25% (团队业绩≥6000)
     * - S6: 30% (团队业绩≥20000)
     * 
     * 分配规则：只有比率高于上一个拿奖的才能拿差额部分
     */
    function _distMgr(address _user, uint256 _mgrPool) internal {
        address cur = userReferrer[_user];
        uint8 prevRate = 0;  // 上一个拿奖的比率
        
        // 向上遍历所有上级，直到分完30%为止
        while (cur != address(0) && prevRate < 30) {
            uint8 curLvl = userLevel[cur];  // 使用L等级（团队业绩自动升级的等级）
            
            if (curLvl > 0) {
                uint8 curRate = mgrRates[curLvl - 1];
                
                // 级差制：只有比率高于上一个拿奖的才能拿
                if (curRate > prevRate) {
                    uint8 diffRate = curRate - prevRate;  // 只拿差额部分
                    uint256 reward = _mgrPool * diffRate / 100;
                    
                    if (reward > 0 && userEnergy[cur] >= reward) {
                        userEnergy[cur] -= reward;
                        userPendingSOL[cur] += reward;
                        emit RewardDistributed(cur, 3, reward); // 3=管理奖
                        prevRate = curRate;  // 更新已分配的最高比率
                    }
                }
            }
            
            cur = userReferrer[cur];
        }
    }
    
    // ============ SOL提取（解决问题） ============
    
    /**
     * @notice 用户提取SOL
     * @param _user 用户地址
     * @param _amount 提取数量
     */
    function withdrawSOL(address _user, uint256 _amount) external onlyCore {
        require(_amount <= userPendingSOL[_user], "!balance");
        userPendingSOL[_user] -= _amount;
        
        // 转账给DQMCore，由DQMCore转给用户
        IERC20(SOL).safeTransfer(coreContract, _amount);
        
        emit WithdrawSOL(_user, _amount);
    }
    
    /**
     * @notice 查询用户待领取SOL推荐奖励
     * @dev 实际领取请使用 DQMCore.withdrawSOL(amount)，会扣10%手续费
     */
    function claimPendingSOL() external view returns (uint256) {
        return userPendingSOL[msg.sender];
    }

    // ============ 爆块奖励分配（由爆块合约调用） ============
    
    /**
     * @notice 分配LP奖励
     * @dev 由爆块合约调用，按LP质押比例分配给所有LP质押者
     * 同时支持LP质押（tLP）和LP权益授权（totalLPEquity）
     */
    function distributeLPReward(uint256 _amount) external onlyMining {
        require(_amount > 0, "!amount");
        
        // 优先按LP权益分配，其次按LP质押分配
        if (totalLPEquity > 0 || tLP > 0) {
            // 累加到LP总奖励
            lA += _amount;
            emit LPRewardDistributed(_amount);
        } else {
            // 没有LP质押者和LP权益，退回到爆块合约
            IERC20(dqToken).safeTransfer(miningContract, _amount);
        }
    }
    
    /**
     * @notice 分配节点奖励
     * @dev 由爆块合约调用，分配给持有节点卡的用户
     *      A类节点获得全部节点奖励
     */
    function distributeNodeReward(uint256 _amount) external onlyMining {
        require(_amount > 0, "!amount");
        
        // 检查是否给固定地址
        if (nodeRewardToFixed && fixedNodeAddress != address(0)) {
            // 直接转到固定地址
            IERC20(dqToken).safeTransfer(fixedNodeAddress, _amount);
            emit NodeRewardToFixed(fixedNodeAddress, _amount);
        } else {
            // 给A类节点累计奖励（节点NFT持有者）
            nA[0] += _amount;
            emit NodeRewardDistributed(_amount);
        }
    }
    
    /**
     * @notice 分配D等级奖励
     * @dev 由爆块合约调用，分配给D等级用户
     */
    function distributeDRankReward(uint256 _amount) external onlyMining {
        require(_amount > 0, "!amount");
        
        // 累加到各D等级奖励池
        for (uint8 i = 0; i < 8; i++) {
            if (dLevelCount[i] > 0) {
                dLevelAccReward[i] += _amount / 8;
            }
        }
        
        emit DRankRewardDistributed(_amount);
    }
    
    // claimLPReward 已拆分到 DQMiningStakeVault.sol
    
    /**
     * @notice 用户领取节点卡奖励
     * @param _type 节点卡类型 0=A, 1=B, 2=C
     */
    function claimNodeReward(uint8 _type) external nonReentrant {
        require(!IDQMCore(coreContract).isBlacklisted(msg.sender), "blacklisted");
        require(_type < 3, "!type");
        require(userNodeLevel[msg.sender] > _type, "!node");
        
        uint256 reward = nA[_type] - userNftF[msg.sender][_type];
        if (reward > 0) {
            userNftF[msg.sender][_type] = nA[_type];
            IERC20(dqToken).safeTransfer(msg.sender, reward);
            emit NodeRewardClaimed(msg.sender, _type, reward);
        }
    }
    
    /**
     * @notice 用户领取D等级奖励
     * @dev 每个等级内所有地址平均分配该等级的1.75%
     */
    function claimDRankReward() external nonReentrant {
        require(!IDQMCore(coreContract).isBlacklisted(msg.sender), "blacklisted");
        uint8 dLvl = userDLevel[msg.sender];
        require(dLvl > 0, "!dLevel");
        require(dLevelCount[dLvl - 1] > 0, "!count");
        
        // 计算每个地址应得 = 累计奖励 / 该等级地址数
        uint256 rewardPerUser = dLevelAccReward[dLvl - 1] / dLevelCount[dLvl - 1];
        uint256 reward = rewardPerUser - dLevelRewardDebt[msg.sender];
        
        if (reward > 0) {
            dLevelRewardDebt[msg.sender] = rewardPerUser;
            IERC20(dqToken).safeTransfer(msg.sender, reward);
            emit DRankRewardClaimed(msg.sender, dLvl, reward);
        }
    }
    
    // ============ 单币质押 & LP奖励 已拆分到 DQMiningStakeVault.sol ============
    
    // ============ DQ提取 ============
    
    function withdrawBlockDQ(address _user) external onlyMining {
        uint256 amt = userBlockDQ[_user];
        if (amt > 0) {
            userBlockDQ[_user] = 0;
            IERC20(dqToken).safeTransfer(_user, amt);
            emit WithdrawDQ(_user, amt);
        }
    }
    
    function withdrawDQReward(address _user, uint _i) external onlyMining {
        require(_i < 4, "!i");
        uint256 amt = userPendingDQ[_user][_i];
        if (amt > 0) {
            userPendingDQ[_user][_i] = 0;
            IERC20(dqToken).safeTransfer(_user, amt);
            emit WithdrawDQ(_user, amt);
        }
    }
    
    // ============ 查询函数 ============
    
    function getChildCount(address _u) external view returns (uint256) {
        return userChildren[_u].length();
    }

    function calculateLevel(address _user) external view returns (uint8) {
        uint256 sales = teamSales[_user];
        if (sales >= levelThresholds[5]) return 6;
        if (sales >= levelThresholds[4]) return 5;
        if (sales >= levelThresholds[3]) return 4;
        if (sales >= levelThresholds[2]) return 3;
        if (sales >= levelThresholds[1]) return 2;
        if (sales >= levelThresholds[0]) return 1;
        return 0;
    }
    
    /**
     * @notice 设置L等级升级阈值（管理员）
     */
    function setLevelThresholds(uint256[6] calldata _thresholds) external onlyOwner {
        levelThresholds = _thresholds;
    }
    
    /**
     * @notice 提取合约资产（管理员）
     */
    function withdrawToken(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "!zero");
        if (_token == address(0)) {
            payable(_to).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }
    
    receive() external payable {}
}
