// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";

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

contract DQMiningStakeCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
    // ============ 常量地址 ============
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
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
    uint256 public constant SEE_RATE = 1;       // 见点奖1%/代
    uint256 public constant MGR_RATE = 30;      // 管理奖30%
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
    
    // 用户数据
    mapping(address => uint256) public userEnergy;
    mapping(address => uint256) public userPendingSOL;
    mapping(address => uint256) public userBlockDQ;      // 爆块DQ奖励
    mapping(address => uint256) public userDirectSales;  // 直推数
    mapping(address => uint8) public userNodeLevel;      // 节点等级
    mapping(address => uint8) public userLevel;          // 用户等级 (S1-S6)
    mapping(address => address) public userReferrer;
    mapping(address => EnumerableSet.AddressSet) internal userChildren;
    
    // LP数据
    mapping(address => uint256) public lpS;  // 用户LP数量
    mapping(address => uint256) public lpD;  // 用户LP已领取
    mapping(address => uint256) public lpStakeTime;  // 用户LP质押时间
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
    
    // 迁移合约
    address public migratorContract;
    
    // ============ 事件 ============
    event EnergyChanged(address indexed user, uint256 energy);
    event RewardDistributed(address indexed user, uint8 rewardType, uint256 amount);
    event WithdrawSOL(address indexed user, uint256 amount);
    event WithdrawDQ(address indexed user, uint256 amount);
    event LPStaked(address indexed user, uint256 amount);
    event LPUnstaked(address indexed user, uint256 amount);
    event LPWithdrawn(address indexed user, uint256 amount, uint256 fee, uint256 stakeDuration);
    event LPRewardDistributed(uint256 amount);
    event LPRewardClaimed(address indexed user, uint256 amount);
    event NodeRewardDistributed(uint256 amount);
    event NodeRewardToFixed(address indexed receiver, uint256 amount);
    event NodeRewardModeChanged(bool toFixed, address fixedAddress);
    event NodeRewardClaimed(address indexed user, uint8 nodeType, uint256 amount);
    event DRankRewardDistributed(uint256 amount);
    event DRankRewardClaimed(address indexed user, uint8 dLevel, uint256 amount);
    event LPMigrated(address indexed user, uint256 lpAmount, uint256 energy);
    event LevelChanged(address indexed user, uint8 level);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER || msg.sender == adminContract, "!owner");
        _;
    }
    
    modifier onlyMining() {
        require(msg.sender == miningContract || msg.sender == adminContract, "!mining");
        _;
    }
    
    modifier onlyCore() {
        require(msg.sender == coreContract || msg.sender == adminContract, "!core");
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
    
    function setEnergyMul(uint256 _m) external onlyMining {
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
    }
    
    function setEnergy(address _u, uint256 _e) external onlyMining {
        userEnergy[_u] = _e;
        emit EnergyChanged(_u, _e);
    }
    
    function addEnergy(address _u, uint256 _a) external onlyMining {
        userEnergy[_u] += _a;
        emit EnergyChanged(_u, userEnergy[_u]);
    }
    
    function subEnergy(address _u, uint256 _a) external onlyMining {
        userEnergy[_u] = _a > userEnergy[_u] ? 0 : userEnergy[_u] - _a;
        emit EnergyChanged(_u, userEnergy[_u]);
    }
    
    // ============ 入金回调 ============
    
    /**
     * @notice 从DQMCore接收入金
     */
    function onDeposit(address _user, uint256 _amount) external payable onlyCore {
        // 增加能量值
        uint256 energyAdd = _amount * energyMul;
        userEnergy[_user] += energyAdd;
        emit EnergyChanged(_user, userEnergy[_user]);
        
        // 分配三奖
        _distributeRewards(_user, _amount);
    }
    
    /**
     * @notice 接收LP质押（由DQMCore调用）
     * @dev 用户入金50%用于添加流动性，获得的LP代币自动质押
     * @param _user 用户地址
     * @param _lpAmount LP代币数量
     */
    function onLPStake(address _user, uint256 _lpAmount) external onlyCore {
        require(_lpAmount > 0, "!amount");
        require(lpPair != address(0), "!lpPair");
        
        // 从调用者转入LP代币
        IERC20(lpPair).safeTransferFrom(msg.sender, address(this), _lpAmount);
        
        // 更新用户LP质押
        if (lpS[_user] == 0) {
            lpStakeTime[_user] = block.timestamp;  // 首次质押记录时间
        }
        lpS[_user] += _lpAmount;
        tLP += _lpAmount;
        
        emit LPStaked(_user, _lpAmount);
    }
    
    /**
     * @notice 用户移除LP质押
     * @dev 根据质押时间计算手续费：<60天20%，60-180天10%，>180天0%
     * @param _lpAmount 要移除的LP数量
     */
    function withdrawLP(uint256 _lpAmount) external nonReentrant {
        require(_lpAmount > 0, "!amount");
        require(lpS[msg.sender] >= _lpAmount, "!balance");
        require(lpPair != address(0), "!lpPair");
        require(lpRouter != address(0), "!router");
        
        // 计算手续费（边界：180天之后0%，不包括180天）
        uint256 stakeTime = block.timestamp - lpStakeTime[msg.sender];
        uint256 feeRate;
        
        if (stakeTime < 60 days) {
            feeRate = 2000;  // 20%手续费
        } else if (stakeTime <= 180 days) {
            feeRate = 1000;  // 10%手续费
        } else {
            feeRate = 0;     // 无手续费（180天之后）
        }
        
        // 更新用户LP质押
        lpS[msg.sender] -= _lpAmount;
        tLP -= _lpAmount;
        
        // 从Pair移除流动性（获得SOL和DQ）
        IERC20(lpPair).safeTransferFrom(msg.sender, address(this), _lpAmount);
        IERC20(lpPair).safeApprove(lpRouter, _lpAmount);
        
        (uint256 amountSOL, uint256 amountDQ) = IPancakeRouter01(lpRouter).removeLiquidity(
            dqToken,  // tokenA = DQ
            0xbb4CdB9CBBD57659aE1f1B5438cE1a4eC2aC35e,  // WBNB
            _lpAmount,
            1,  // minDQ
            1,  // minWBNB
            address(this),
            block.timestamp + 3600
        );
        
        // 计算手续费（SOL和DQ各50%）
        uint256 solFee = amountSOL * feeRate / 10000;
        uint256 dqFee = amountDQ * feeRate / 10000;
        
        // 用户获得（扣除手续费后）
        uint256 userSOL = amountSOL - solFee;
        uint256 userDQ = amountDQ - dqFee;
        
        // 转给用户
        (bool sent, ) = payable(msg.sender).call{value: userSOL}("");
        require(sent, "!sol");
        IERC20(dqToken).safeTransfer(msg.sender, userDQ);
        
        // 手续费给手续费地址（SOL和DQ各50%）
        if (solFee > 0) {
            (bool feeSent, ) = payable(feeReceiver).call{value: solFee}("");
            require(feeSent, "!fee");
        }
        if (dqFee > 0) {
            IERC20(dqToken).safeTransfer(feeReceiver, dqFee);
        }
        
        emit LPWithdrawn(msg.sender, _lpAmount, solFee + dqFee, stakeTime);
    }
    
    /**
     * @notice 迁移LP质押（由迁移合约调用）
     * @dev 用于从旧合约迁移LP数据到新合约
     * @param _user 用户地址
     * @param _lpAmount LP代币数量
     * @param _pendingReward 待领取的奖励（从旧合约转来）
     */
    function migrateLP(
        address _user, 
        uint256 _lpAmount, 
        uint256 _energy
    ) external nonReentrant {
        require(msg.sender == migratorContract || msg.sender == adminContract, "!migrator");
        require(_user != address(0), "!user");
        require(_lpAmount > 0, "!amount");
        
        // LP代币已经在迁移合约中转到本合约，这里只记录数据
        
        // 更新用户LP质押
        lpS[_user] += _lpAmount;
        tLP += _lpAmount;
        
        // 记录用户能量（从旧合约导入）
        userEnergy[_user] = _energy;
        emit EnergyChanged(_user, _energy);
        
        emit LPMigrated(_user, _lpAmount, _energy);
    }
    
    /**
     * @notice 导入用户等级（供迁移合约调用）
     * @param _user 用户地址
     * @param _level 等级 (1-6 对应 S1-S6)
     */
    function importUserLevel(address _user, uint8 _level) external {
        require(msg.sender == migratorContract || msg.sender == adminContract, "!auth");
        require(_user != address(0), "!user");
        require(_level >= 1 && _level <= 6, "!level");
        
        userLevel[_user] = _level;
        emit LevelChanged(_user, _level);
    }
    
    /**
     * @notice 设置迁移合约地址
     */
    function setMigratorContract(address _migrator) external onlyOwner {
        migratorContract = _migrator;
    }
    
    // ============ 三奖分配 ============
    
    /**
     * @notice 分配三奖
     * @param _user 入金用户
     * @param _amount 入金金额
     */
    function _distributeRewards(address _user, uint256 _amount) internal {
        address ref = userReferrer[_user];
        if (ref == address(0)) return;
        
        // 1. 直推奖30%
        _distDirect(_user, ref, _amount);
        
        // 2. 见点奖1%×最多15代
        _distSee(_user, _amount * SEE_RATE / 100, 1);
        
        // 3. 管理奖30%级差制
        _distMgr(_user, _amount * MGR_RATE / 100);
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
            uint8 curLvl = userNodeLevel[cur];  // 直接使用注册等级
            
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
     * @notice 直接提取SOL到用户（管理员操作）
     */
    function withdrawSOLDirect(address _user, uint256 _amount) external onlyOwner {
        require(_amount <= userPendingSOL[_user], "!balance");
        userPendingSOL[_user] -= _amount;
        IERC20(SOL).safeTransfer(_user, _amount);
        emit WithdrawSOL(_user, _amount);
    }
    
    // ============ 爆块奖励分配（由爆块合约调用） ============
    
    /**
     * @notice 分配LP奖励
     * @dev 由爆块合约调用，按LP质押比例分配给所有LP质押者
     */
    function distributeLPReward(uint256 _amount) external onlyMining {
        require(_amount > 0, "!amount");
        
        if (tLP > 0) {
            // 累加到LP总奖励
            lA += _amount;
            emit LPRewardDistributed(_amount);
        } else {
            // 没有LP质押者，退回到爆块合约
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
            dqToken.transfer(fixedNodeAddress, _amount);
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
    
    /**
     * @notice 用户领取LP奖励
     */
    function claimLPReward() external nonReentrant {
        uint256 userLP = lpS[msg.sender];
        require(userLP > 0, "!lp");
        require(tLP > 0, "!tLP");
        
        // 检查能量 - 没有能量不能领取奖励
        uint256 userE = IDQMCore(coreContract).getUserEnergy(msg.sender);
        require(userE > 0, "!energy");
        
        // 计算用户应得奖励 (正确的公式)
        uint256 pending = userLP * lA / tLP;
        uint256 reward = pending - lpD[msg.sender];
        
        if (reward > 0) {
            lpD[msg.sender] = pending;  // 更新为当前应得累计
            
            // 扣除10%手续费
            uint256 fee = reward * CLAIM_FEE / 10000;
            uint256 actualReward = reward - fee;
            
            // 扣减能量（奖励金额对应的能量）
            IDQMCore(coreContract).subEnergy(msg.sender, actualReward);
            
            // 手续费三方分配：30%基金会、30%合伙人、40%固定节点
            if (fee > 0) {
                uint256 foundationShare = fee * 30 / 100;   // 30%
                uint256 partnerShare = fee * 30 / 100;      // 30%
                uint256 nodeShare = fee - foundationShare - partnerShare;  // 40%
                
                IERC20(dqToken).safeTransfer(FOUNDATION, foundationShare);
                IERC20(dqToken).safeTransfer(PARTNER, partnerShare);
                IERC20(dqToken).safeTransfer(FIXED_NODE, nodeShare);
            }
            IERC20(dqToken).safeTransfer(msg.sender, actualReward);
            emit LPRewardClaimed(msg.sender, actualReward);
        }
    }
    
    /**
     * @notice 用户领取节点卡奖励
     * @param _type 节点卡类型 0=A, 1=B, 2=C
     */
    function claimNodeReward(uint8 _type) external nonReentrant {
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
     */
    function claimDRankReward() external nonReentrant {
        uint8 dLvl = userDLevel[msg.sender];
        require(dLvl > 0, "!dLevel");
        
        uint256 reward = dLevelAccReward[dLvl - 1] - dLevelRewardDebt[msg.sender];
        if (reward > 0) {
            dLevelRewardDebt[msg.sender] = dLevelAccReward[dLvl - 1];
            IERC20(dqToken).safeTransfer(msg.sender, reward);
            emit DRankRewardClaimed(msg.sender, dLvl, reward);
        }
    }
    
    // ============ 单币质押 ============
    
    // 用户质押时间记录
    mapping(address => mapping(uint => uint256)) public stakeTime;  // 用户各周期质押开始时间
    uint256 public totalSellFee;  // 累计卖出税
    
    event Staked(address indexed user, uint8 level, uint256 amount);
    event Unstaked(address indexed user, uint8 level, uint256 amount);
    event SellFeeDistributed(uint256 amount);
    event StakeRewardClaimed(address indexed user, uint8 level, uint256 amount);
    
    /**
     * @notice 用户质押DQ
     * @param _level 质押周期等级 0=30天, 1=90天, 2=180天, 3=360天
     * @param _amount 质押数量
     */
    function stake(uint8 _level, uint256 _amount) external nonReentrant {
        require(_level < 4, "!level");
        require(_amount > 0, "!amount");
        
        // 从用户转入DQ
        IERC20(dqToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        // 更新质押数据
        sAmt[msg.sender][_level] += _amount;
        tS[_level] += _amount;
        stakeTime[msg.sender][_level] = block.timestamp;
        
        emit Staked(msg.sender, _level, _amount);
    }
    
    /**
     * @notice 用户解押
     * @param _level 质押周期等级
     * @param _amount 解押数量
     */
    function unstake(uint8 _level, uint256 _amount) external nonReentrant {
        require(_level < 4, "!level");
        require(sAmt[msg.sender][_level] >= _amount, "!balance");
        
        // 检查质押时间是否足够
        uint256 st = stakeTime[msg.sender][_level];
        require(block.timestamp >= st + stakeDurations[_level], "!time");
        
        // 更新质押数据
        sAmt[msg.sender][_level] -= _amount;
        tS[_level] -= _amount;
        
        // 转回DQ给用户
        IERC20(dqToken).safeTransfer(msg.sender, _amount);
        
        emit Unstaked(msg.sender, _level, _amount);
    }
    
    /**
     * @notice 接收卖出税分红（由DQT调用）
     * @dev 按时间等级加权分配给单币质押用户
     */
    function distributeSellFee(uint256 _amount) external {
        require(msg.sender == dqToken, "!dqToken");
        require(_amount > 0, "!amount");
        
        // 计算总权重
        uint256 totalWeight = 0;
        for (uint8 i = 0; i < 4; i++) {
            totalWeight += tS[i] * stakeWeights[i];
        }
        
        if (totalWeight > 0) {
            // 按权重分配到各周期累计奖励
            for (uint8 i = 0; i < 4; i++) {
                if (tS[i] > 0) {
                    uint256 weight = tS[i] * stakeWeights[i];
                    uint256 share = _amount * weight / totalWeight;
                    sA[i] += share;
                }
            }
        } else {
            // 没有质押者，记录到待分配
            totalSellFee += _amount;
        }
        
        emit SellFeeDistributed(_amount);
    }
    
    /**
     * @notice 用户领取单币质押奖励
     * @param _level 质押周期等级
     */
    function claimStakeReward(uint8 _level) external nonReentrant {
        require(_level < 4, "!level");
        require(sAmt[msg.sender][_level] > 0, "!stake");
        
        // 计算用户应得奖励
        uint256 reward = sAmt[msg.sender][_level] * sA[_level] / tS[_level] - sDebt[msg.sender][_level];
        
        if (reward > 0) {
            sDebt[msg.sender][_level] = sAmt[msg.sender][_level] * sA[_level] / tS[_level];
            IERC20(dqToken).safeTransfer(msg.sender, reward);
            emit StakeRewardClaimed(msg.sender, _level, reward);
        }
    }
    
    /**
     * @notice 查询用户单币质押信息
     */
    function getStakeInfo(address _user) external view returns (
        uint256[4] memory amounts,
        uint256[4] memory times,
        uint256[4] memory pendingRewards
    ) {
        for (uint8 i = 0; i < 4; i++) {
            amounts[i] = sAmt[_user][i];
            times[i] = stakeTime[_user][i];
            if (tS[i] > 0 && sAmt[_user][i] > 0) {
                pendingRewards[i] = sAmt[_user][i] * sA[i] / tS[i] - sDebt[_user][i];
            }
        }
    }
    
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
    
    function getPendingSOL(address _user) external view returns (uint256) {
        return userPendingSOL[_user];
    }
    
    function getEnergy(address _user) external view returns (uint256) {
        return userEnergy[_user];
    }
    
    function getDirectSales(address _user) external view returns (uint256) {
        return userDirectSales[_user];
    }
    
    function getUserNodeLevel(address _u) external view returns (uint8) {
        return userNodeLevel[_u];
    }
    
    function getChildCount(address _u) external view returns (uint256) {
        return userChildren[_u].length();
    }
    
    function getLP(address _u) external view returns (uint256) {
        return lpS[_u];
    }
    
    receive() external payable {}
}
