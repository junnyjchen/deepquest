// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DQM Core V2
 * @notice 用户核心操作合约 - 处理入金、注册、SOL提取
 * 
 * 功能:
 * 1. 用户注册与推荐关系
 * 2. 用户入金（SOL/BNB）
 *    - 50% 进入动态分币
 *    - 50% 进入LP质押（25% SOL + 用25% SOL买DQ添加流动性）
 * 3. SOL奖励提取（解决问题）
 * 4. 与质押合约交互
 */

interface IRouter {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

contract DQMCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
    // ============ 版本标识 ============
    uint256 public constant VERSION = 11;  // V11: 入金时记录LP数据到StakeCore，授权核对取最小值

    // ============ 常量地址 ============
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant FACTORY = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
    
    // ============ 可配置地址 ============
    address public foundation = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public feeAddr = 0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967;
    address public nodeUSDTReceiver = 0x49931c11577754066a3d7db28760f8C292b4091b;
    address public partnerAddr = 0x803B79B608455808C2f752c588804c3F5bF676a3; // 合伙人/创始人地址
    address public fixedNodeAddr = 0x822682A54C454e938374e9690420cdFA264A18Aa; // 节点固定地址（节点奖不开启时分给此地址）
    
    // ============ 合约引用 ============
    address public dqToken;
    address public dqCard;
    address public stakeContract;
    address public adminContract;
    address public migratorContract;  // 迁移合约
    address public pool;  // 底池地址
    
    // DAO/运营/保险地址（由DQMCore直接分发奖励，与原始代码一致）
    address public DAO;
    address public INS;
    address public OP;
    
    // ============ 配置常量 ============
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public constant DAILY_LIMIT = 1 ether;
    uint256 public constant DIRECT_RATE = 30;      // 直推奖30%
    uint256 public constant DAO_RATE = 10;
    uint256 public constant INS_RATE = 7;
    uint256 public constant OP_RATE = 8;
    uint256 public constant ENERGY_MUL = 3;
    uint256 public constant WITHDRAW_FEE = 10;     // 提现手续费10%
    
    // ============ 用户结构 ============
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        EnumerableSet.AddressSet children;
    }
    
    // ============ 状态变量 ============
    mapping(address => User) internal users;
    address[] public allUsers;
    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public dailyDeposit;       // 用户已入金累计金额（非白名单用户受currentDepositLimit限制）
    mapping(address => bool) public depositWhiteList;
    mapping(address => uint256) public userEnergy;         // 用户能量
    mapping(address => uint256) public userEnergyUsed;     // 用户已使用能量
    uint256 public totalEnergy;                            // 系统总能量
    uint256 public startTime;
    uint256 public currentPhase = 1;                       // 当前阶段
    uint256 public totalInvested;
    uint256 public totalLPAdded;  // 总添加流动性数量
    
    // 滑点保护（基点，1000 = 100%）
    uint256 public swapSlippage = 50;     // swap滑点 50 = 5%
    uint256 public lpSlippage = 50;       // LP滑点 50 = 5%
    address public sellFeeReceiver;       // 卖出手续费接收地址
    
    // 入金限制
    uint256 public constant MAX_LIMIT = 200 ether;          // 封顶200 SOL
    uint256 public currentDepositLimit = 1 ether;           // 当前入金上限，初始1 SOL
    
    // ============ 事件 ============
    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount, uint256 lpAmount, uint256 energy);
    event WithdrawSOL(address indexed user, uint256 amount, uint256 fee);
    event AddressesUpdated(address dqToken, address dqCard, address stakeContract);
    event PoolSet(address indexed pool);
    event LPAdded(address indexed user, uint256 solAmount, uint256 dqAmount, uint256 lpAmount);
    event SwapAndAddLP(address indexed user, uint256 solAmount, uint256 dqAmount, uint256 lpAmount);
    event PhaseAdvanced(uint256 newPhase, uint256 newLimit);
    event EnergyAdded(address indexed user, uint256 amount, uint256 totalEnergy);
    event SlippageUpdated(uint256 swapSlippage, uint256 lpSlippage);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER || msg.sender == adminContract, "!owner");
        _;
    }
    
    // ============ 初始化 ============
    constructor() {
        startTime = block.timestamp;
        users[OWNER].referrer = OWNER;
        allUsers.push(OWNER);
    }
    
    receive() external payable {}
    
    // ============ 管理函数 ============
    
    function setAddresses(address _dqToken, address _dqCard, address _stakeContract) external onlyOwner {
        dqToken = _dqToken;
        dqCard = _dqCard;
        stakeContract = _stakeContract;
        emit AddressesUpdated(_dqToken, _dqCard, _stakeContract);
    }
    
    function setAdminContract(address _admin) external onlyOwner {
        adminContract = _admin;
    }
    
    function setPool(address _pool) external onlyOwner {
        pool = _pool;
        emit PoolSet(_pool);
    }
    
    function setSlippage(uint256 _swapSlippage, uint256 _lpSlippage) external onlyOwner {
        require(_swapSlippage <= 500 && _lpSlippage <= 500, "max 50%");
        swapSlippage = _swapSlippage;
        lpSlippage = _lpSlippage;
        emit SlippageUpdated(_swapSlippage, _lpSlippage);
    }
    
    function setSellFeeReceiver(address _addr) external onlyOwner {
        require(_addr != address(0), "zero addr");
        sellFeeReceiver = _addr;
    }
    
    function setPartnerAddr(address _addr) external onlyOwner {
        partnerAddr = _addr;
    }
    
    function setBlacklisted(address _user, bool _status) external onlyOwner {
        isBlacklisted[_user] = _status;
    }
    
    function setMigratorContract(address _migrator) external onlyOwner {
        migratorContract = _migrator;
    }
    
    function setDAO(address _dao) external onlyOwner {
        DAO = _dao;
    }
    
    function setINS(address _ins) external onlyOwner {
        INS = _ins;
    }
    
    function setOP(address _op) external onlyOwner {
        OP = _op;
    }
    
    // ============ 用户注册 ============
    
    /**
     * @notice 用户注册
     * @param _referrer 推荐人地址
     */
    function register(address _referrer) external {
        require(users[msg.sender].referrer == address(0), "already registered");
        
        address referrer = _referrer;
        
        // 验证推荐人：推荐人必须已注册（有推荐人或者是OWNER）
        if (referrer == address(0) || (referrer != OWNER && users[referrer].referrer == address(0))) {
            referrer = OWNER;  // 无效推荐人则默认使用OWNER
        }
        
        users[msg.sender].referrer = referrer;
        users[referrer].directCount++;
        users[referrer].children.add(msg.sender);
        allUsers.push(msg.sender);
        
        emit Register(msg.sender, referrer);
    }
    
    /**
     * @notice 批量导入用户（传入单个用户即为单个导入）
     */
    function importUsers(address[] calldata _users, address[] calldata _referrers) external onlyOwner {
        require(_users.length == _referrers.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            if (users[_users[i]].referrer == address(0)) {
                users[_users[i]].referrer = _referrers[i];
                if (_referrers[i] != address(0)) {
                    users[_referrers[i]].directCount++;
                    users[_referrers[i]].children.add(_users[i]);
                }
                allUsers.push(_users[i]);
            }
        }
    }
    
    /**
     * @notice 导入用户关系（供迁移合约调用）
     * @param _user 用户地址
     * @param _referrer 推荐人地址
     */
    function importUserRelation(address _user, address _referrer) external onlyOwner {
        require(_user != address(0), "zero user");
        
        if (users[_user].referrer == address(0)) {
            users[_user].referrer = _referrer;
            if (_referrer != address(0)) {
                users[_referrer].directCount++;
                users[_referrer].children.add(_user);
            }
            allUsers.push(_user);
            emit Register(_user, _referrer);
        }
    }
    
    // ============ 入金 ============
    
    /**
     * @notice 用户入金（SOL ERC20）
     * @param _amount 入金的SOL数量
     * @dev 用户需先approve本合约足够的SOL额度
     *      入金流程：50%SOL→动态分币 + 50%SOL→swap+addLP
     *      重要：调用时需设置足够的gas limit（建议200万以上）
     */
    function deposit(uint256 _amount) external nonReentrant {
        require(_amount >= INVEST_MIN, "!min");
        require(users[msg.sender].referrer != address(0), "!reg");
        require(!isBlacklisted[msg.sender], "blacklisted");
        require(_amount <= currentDepositLimit, "!limit");

        if (!depositWhiteList[msg.sender]) {
            uint256 lim = currentDepositLimit;
            require(dailyDeposit[msg.sender] + _amount <= lim, "!lim");
            dailyDeposit[msg.sender] += _amount;
        }

        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _amount);
        _deposit(msg.sender, _amount);
    }

    /**
     * @dev 内部入金逻辑（完全对齐原始能跑通的代码）
     *      50% 动态分币 → DAO/运营/保险由DQMCore直接分发（保证一定到账）
     *                    推荐奖部分SOL转StakeCore（直推30%+见点15%+管理30%=75%）
     *      50% LP → swap SOL买DQ + addLiquidity
     * 
     * 关键修复：原始代码中DAO/OP/INS由DQMCore直接safeTransfer，
     *          之前改成经StakeCore的_distributeRewards分发，
     *          但_distributeRewards在用户无推荐人时直接return，
     *          导致DAO/OP/INS也全部跳过 → 奖励无法发放！
     */
    function _deposit(address _user, uint256 _a) internal {
        User storage u = users[_user];
        u.totalInvest += _a;
        totalInvested += _a;

        // 能量
        uint256 energyToAdd = _a * ENERGY_MUL;
        userEnergy[_user] += energyToAdd;
        totalEnergy += energyToAdd;
        emit EnergyAdded(_user, _a, userEnergy[_user]);

        uint256 dyn = _a * 50 / 100;   // 50% 动态分币
        uint256 lp = _a - dyn;          // 50% LP

        // ===== DAO/运营/保险：由DQMCore直接分发（与原始代码一致，保证一定到账）=====
        uint256 daoAmt = dyn * DAO_RATE / 100;
        uint256 opAmt  = dyn * OP_RATE / 100;
        uint256 insAmt = dyn * INS_RATE / 100;
        if (daoAmt > 0) IERC20(SOL).safeTransfer(DAO, daoAmt);
        if (insAmt > 0) IERC20(SOL).safeTransfer(INS, insAmt);
        if (opAmt > 0)  IERC20(SOL).safeTransfer(OP, opAmt);

        // ===== 推荐奖：SOL转StakeCore，由onDeposit→_distributeRewards分发 =====
        // 推荐奖 = 直推30% + 见点15% + 管理30% = 75% of dyn
        // 只转推荐奖部分SOL给StakeCore（DAO/OP/INS已从DQMCore直接转出）
        uint256 rewardPool = dyn - daoAmt - opAmt - insAmt;
        if (stakeContract != address(0) && rewardPool > 0) {
            IDQMiningStake sk = IDQMiningStake(stakeContract);
            IERC20(SOL).safeTransfer(stakeContract, rewardPool);
            sk.addDirectSales(_user, _a);  // 更新直推业绩（见点奖依赖此数据）
            sk.onDeposit(_user, dyn);       // 传入dyn作为基数计算各奖比例
        }

        // LP部分：swap + addLiquidity
        if (lp > 0) {
            _swapAndAddLP(_user, lp);
        }

        emit Deposit(_user, _a, 0, energyToAdd);
    }

    /**
     * @dev 用SOL swap买DQ并添加LP（参考原始能跑通的逻辑）
     * 流程：50% SOL买DQ → 50% SOL + DQ addLiquidity → LP质押给用户
     * 
     * 关键点（vs 之前失败的版本）：
     * 1. deadline使用 block.timestamp + 300（5分钟缓冲，之前用block.timestamp容易超时）
     * 2. addLiquidity的minToken用 dBal * lpSlippage / 1000（简单可靠）
     * 3. swap直接调用，不用this.externalBuyDQ()外部自调用
     * 4. 无try/catch包装（错误自然传播，不增加gas消耗）
     * 5. forceApprove替代简单approve（防止ROUTER已有allowance时approve失败）
     */
    function _swapAndAddLP(address _u, uint256 _a) internal {
        require(stakeContract != address(0), "!stake");
        require(pool != address(0), "!pair");
        require(IERC20(SOL).balanceOf(address(this)) >= _a, "!bal");

        uint256 halfSol = _a / 2;
        uint256 swapSol = _a - halfSol;

        // --- Step 1: swap SOL → DQ ---
        address[] memory path = new address[](2);
        path[0] = SOL;
        path[1] = dqToken;

        IERC20(SOL).forceApprove(ROUTER, _a);

        uint256[] memory expected = IRouter(ROUTER).getAmountsOut(swapSol, path);
        uint256 minOut = expected[1] * swapSlippage / 1000;

        uint256 dqBefore = IERC20(dqToken).balanceOf(address(this));
        IRouter(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            swapSol,
            minOut,
            path,
            address(this),
            block.timestamp + 300
        );
        uint256 dBal = IERC20(dqToken).balanceOf(address(this)) - dqBefore;
        require(dBal > 0, "!swap");

        // --- Step 2: addLiquidity SOL + DQ ---
        IERC20(dqToken).forceApprove(ROUTER, dBal);
        // SOL已在上方approve了整个_a，覆盖halfSol

        uint256 minA = halfSol * lpSlippage / 1000;
        uint256 minB = dBal * lpSlippage / 1000;

        (, , uint256 lpBal) = IRouter(ROUTER).addLiquidity(
            SOL,
            dqToken,
            halfSol,
            dBal,
            minA,
            minB,
            address(this),
            block.timestamp + 300
        );
        require(lpBal > 0, "!lp");

        // --- Step 3: LP直接转给用户钱包 + 记录LP数据到StakeCore ---
        // 用户持有LP，入金时记录LP数据和lpStakeTime
        // 用户通过authorizeLPEquity授权管理（核对钱包LP和合约记录LP取最小值）
        IERC20(pool).transfer(_u, lpBal);
        
        // 记录LP数据到StakeCore（入金时记录，用于授权核对和手续费计算）
        IDQMiningStake(stakeContract).recordLP(_u, lpBal);

        totalLPAdded += lpBal;
        emit SwapAndAddLP(_u, halfSol, dBal, lpBal);
    }

    /**
     * @notice 管理员代用户入金（SOL ERC20）
     */
    function depositForUser(address _user, uint256 _a) external onlyOwner {
        require(_a >= INVEST_MIN, "!min");
        require(users[_user].referrer != address(0), "!reg");

        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _deposit(_user, _a);
    }

    /**
     * @notice 管理员手动添加LP
     */
    function manualAddLP(address _user, uint256 _a) external onlyOwner {
        require(_user != address(0) && _a > 0);
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _swapAndAddLP(_user, _a);
    }

    // ============ DQ卖出（DApp内卖出DQ换SOL） ============
    
    function sellDQ(uint256 _dqAmount) external nonReentrant {
        require(_dqAmount > 0, "!amount");
        require(!isBlacklisted[msg.sender], "blacklisted");
        require(pool != address(0), "!pool");
        
        // 1. 转入用户的DQ
        IERC20(dqToken).safeTransferFrom(msg.sender, address(this), _dqAmount);
        
        // 2. 手动收取卖出税6%（因为DQMCore在DQT白名单中，DQT不会自动扣税）
        //    3% → StakeCore（分红给质押用户）
        //    3% → 卖出手续费地址
        uint256 sellFee = _dqAmount * 6 / 100;
        uint256 swapAmount = _dqAmount - sellFee;
        
        uint256 stakeFee = sellFee / 2;       // 3% 给StakeCore
        uint256 receiverFee = sellFee - stakeFee; // 3% 给卖出手续费地址
        
        // 分配卖出税
        if (stakeFee > 0) {
            IERC20(dqToken).safeTransfer(stakeContract, stakeFee);
        }
        if (receiverFee > 0 && sellFeeReceiver != address(0)) {
            IERC20(dqToken).safeTransfer(sellFeeReceiver, receiverFee);
        }
        
        // 3. 计算最小输出（滑点保护）路径: DQ → SOL
        address[] memory path = new address[](2);
        path[0] = dqToken;
        path[1] = SOL;
        
        uint256[] memory amountsOut = IRouter(ROUTER).getAmountsOut(swapAmount, path);
        uint256 minOut = amountsOut[1] * (1000 - swapSlippage) / 1000;
        
        // 4. approve Router（只approve税后金额）
        IERC20(dqToken).forceApprove(address(ROUTER), swapAmount);
        
        // 5. 通过PancakeSwap卖出DQ换SOL（只用税后金额swap）
        IRouter(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            swapAmount,
            minOut,
            path,
            msg.sender,  // SOL直接转给用户
            block.timestamp + 300
        );
        
        emit DQSold(msg.sender, _dqAmount, swapAmount, minOut);
    }
    
    event DQSold(address indexed seller, uint256 dqAmount, uint256 swapAmount, uint256 minSolOut);

    // ============ SOL提取（解决问题） ============
    
    /**
     * @notice 用户提取SOL奖励 - 从质押合约提取
     * @dev 扣除10%手续费转给feeReceiver，剩余转给用户
     *      SOL是ERC20代币，使用safeTransfer转账
     */
    function withdrawSOL(uint256 _amount) external nonReentrant {
        require(stakeContract != address(0), "!stake");
        require(_amount > 0, "!amount");
        
        // 从质押合约提取SOL到本合约（SOL是ERC20）
        IDQMiningStake(stakeContract).withdrawSOL(msg.sender, _amount);
        
        // 扣除10%手续费
        uint256 fee = _amount * WITHDRAW_FEE / 100;
        uint256 actual = _amount - fee;
        
        // 手续费分配: 30%基金会 + 30%合伙人 + 40%节点（不开启时分给固定地址）
        if (fee > 0) {
            uint256 foundationShare = fee * 30 / 100;  // 30%
            uint256 partnerShare = fee * 30 / 100;     // 30%
            uint256 nodeShare = fee - foundationShare - partnerShare;  // 40%（剩余，避免精度损失）
            
            if (foundationShare > 0) {
                IERC20(SOL).safeTransfer(foundation, foundationShare);
            }
            if (partnerShare > 0) {
                IERC20(SOL).safeTransfer(partnerAddr, partnerShare);
            }
            if (nodeShare > 0) {
                IERC20(SOL).safeTransfer(fixedNodeAddr, nodeShare);
            }
        }
        
        // 转给用户实际金额
        IERC20(SOL).safeTransfer(msg.sender, actual);
        
        emit WithdrawSOL(msg.sender, actual, fee);
    }
    
    /**
     * @notice 转移SOL给用户（仅质押合约调用）
     */
    function transferSOLToUser(address _user, uint256 _amount) external {
        require(msg.sender == stakeContract, "!stake");
        IERC20(SOL).safeTransfer(_user, _amount);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 查询用户总入金金额（供其他合约调用）
     */
    function getUserTotalInvest(address _user) external view returns (uint256) {
        return users[_user].totalInvest;
    }
    
    function getUser(address _user) external view returns (
        address referrer,
        uint256 directCount,
        uint8 level,
        uint256 totalInvest,
        uint256 childrenCount
    ) {
        User storage user = users[_user];
        // 优先从StakeCore读取真实等级（自动升级、管理员设置都会更新StakeCore）
        uint8 realLevel = user.level;
        if (stakeContract != address(0)) {
            try IDQMiningStake(stakeContract).userLevel(_user) returns (uint8 stakeLevel) {
                if (stakeLevel > realLevel) realLevel = stakeLevel;
            } catch {}
        }
        return (
            user.referrer,
            user.directCount,
            realLevel,
            user.totalInvest,
            user.children.length()
        );
    }
    
    function getUserChildren(address _user, uint256 _start, uint256 _end) external view returns (address[] memory) {
        require(_end > _start && _end - _start <= 100, "invalid range");
        User storage user = users[_user];
        uint256 len = user.children.length();
        if (_end > len) _end = len;
        
        address[] memory result = new address[](_end - _start);
        for (uint256 i = _start; i < _end; i++) {
            result[i - _start] = user.children.at(i);
        }
        return result;
    }
    
    function getAllUsersCount() external view returns (uint256) {
        return allUsers.length;
    }
    
    function getAllUsers(uint256 _start, uint256 _end) external view returns (address[] memory) {
        require(_end > _start && _end - _start <= 100, "invalid range");
        uint256 len = allUsers.length;
        if (_end > len) _end = len;
        
        address[] memory result = new address[](_end - _start);
        for (uint256 i = _start; i < _end; i++) {
            result[i - _start] = allUsers[i];
        }
        return result;
    }
    
    // ============ 阶段管理 ============
    
    /**
     * @notice 升级入金上限（管理员操作）
     * @dev 每次操作入金上限+5 SOL，直到200封顶
     */
    function advancePhase() external onlyOwner {
        if (currentDepositLimit < MAX_LIMIT) {
            currentDepositLimit += 5 ether;
            if (currentDepositLimit > MAX_LIMIT) {
                currentDepositLimit = MAX_LIMIT;
            }
        }
        currentPhase++;
        emit PhaseAdvanced(currentPhase, currentDepositLimit);
    }
    
    /**
     * @notice 直接设置入金上限（管理员操作）
     * @param _limit 新的入金上限(SOL)
     */
    function setDepositLimit(uint256 _limit) external onlyOwner {
        require(_limit <= MAX_LIMIT, "!max");
        currentDepositLimit = _limit;
        emit PhaseAdvanced(currentPhase, currentDepositLimit);
    }
    
    /**
     * @notice 设置阶段（管理员操作）
     */
    function setPhase(uint256 _phase) external onlyOwner {
        require(_phase >= 1, "invalid phase");
        currentPhase = _phase;
        emit PhaseAdvanced(currentPhase, currentDepositLimit);
    }
    
    /**
     * @notice 获取当前入金上限
     */
    function getCurrentLimit() external view returns (uint256) {
        return currentDepositLimit;
    }
    
    // ============ 能量管理 ============
    
    /**
     * @notice 使用能量（质押合约调用）
     * @param _user 用户地址
     * @param _amount 使用金额
     * @return success 是否成功
     */
    function useEnergy(address _user, uint256 _amount) external returns (bool) {
        require(msg.sender == stakeContract || msg.sender == adminContract || msg.sender == OWNER, "!auth");
        
        uint256 available = userEnergy[_user] - userEnergyUsed[_user];
        if (available >= _amount) {
            userEnergyUsed[_user] += _amount;
            return true;
        }
        return false;
    }
    
    /**
     * @notice 查询用户可用能量
     */
    function getAvailableEnergy(address _user) external view returns (uint256) {
        return userEnergy[_user] - userEnergyUsed[_user];
    }
    
    /**
     * @notice 查询用户能量详情
     */
    function getEnergyInfo(address _user) external view returns (
        uint256 totalEnergy,
        uint256 usedEnergy,
        uint256 availableEnergy
    ) {
        totalEnergy = userEnergy[_user];
        usedEnergy = userEnergyUsed[_user];
        availableEnergy = totalEnergy - usedEnergy;
    }
    
    // ============ 白名单管理 ============
    
    /**
     * @notice 设置入金白名单
     */
    function setDepositWhiteList(address _user, bool _status) external onlyOwner {
        depositWhiteList[_user] = _status;
    }
    
    /**
     * @notice 批量设置入金白名单
     */
    function batchSetDepositWhiteList(address[] calldata _users, bool _status) external onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            depositWhiteList[_users[i]] = _status;
        }
    }
    
    // ============ 能量管理(管理员) ============
    
    /**
     * @notice 管理员设置用户能量
     */
    function adminSetEnergy(address _user, uint256 _energy) external onlyOwner {
        userEnergy[_user] = _energy;
    }
    
    /**
     * @notice 管理员增加用户能量
     */
    function adminAddEnergy(address _user, uint256 _amount) external onlyOwner {
        userEnergy[_user] += _amount;
    }
    
    /**
     * @notice 管理员减少用户能量
     */
    function adminSubEnergy(address _user, uint256 _amount) external onlyOwner {
        userEnergy[_user] = _amount > userEnergy[_user] ? 0 : userEnergy[_user] - _amount;
    }
    
    // ============ 用户等级管理(管理员) ============
    
    /**
     * @notice 管理员设置用户L等级(S1-S6对应1-6)
     */
    function setUserLevel(address _user, uint8 _level) external {
        require(msg.sender == OWNER || msg.sender == adminContract || msg.sender == dqCard, "!auth");
        require(_user != address(0), "!user");
        require(_level >= 1 && _level <= 6, "!level");
        
        // 只升级不降级
        if (_level > users[_user].level) {
            users[_user].level = _level;
            emit UserLevelSet(_user, _level);
        }
    }
    
    // ============ 推荐人管理 ============
    
    /**
     * @notice 修改用户推荐人（仅限无下线的用户）
     * @param _user 用户地址
     * @param _newReferrer 新推荐人地址
     */
    function changeReferrer(address _user, address _newReferrer) external onlyOwner {
        require(users[_user].referrer != address(0), "user not registered");
        require(users[_newReferrer].referrer != address(0) || _newReferrer == OWNER, "new referrer not registered");
        
        // 检查用户是否有下线
        require(users[_user].children.length() == 0, "user has children");
        
        address oldReferrer = users[_user].referrer;
        
        // 从旧推荐人的下线列表中移除
        if (oldReferrer != address(0)) {
            users[oldReferrer].children.remove(_user);
            users[oldReferrer].directCount = users[oldReferrer].directCount > 0 ? users[oldReferrer].directCount - 1 : 0;
        }
        
        // 添加到新推荐人的下线列表
        users[_user].referrer = _newReferrer;
        users[_newReferrer].children.add(_user);
        users[_newReferrer].directCount++;
        
        emit ReferrerChanged(_user, oldReferrer, _newReferrer);
    }
    
    // ============ 代币提取 ============
    
    /**
     * @notice 提取合约中的代币（LP/DQ/WBNB/SOL等）
     * @param _token 代币地址（address(0)表示提取原生BNB，SOL请传SOL地址0x570A...）
     * @param _to 接收地址
     * @param _amount 提取数量
     */
    function withdrawToken(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "!zero");
        
        if (_token == address(0)) {
            // 提取原生BNB（如有意外收到）
            payable(_to).transfer(_amount);
        } else {
            // 提取ERC20代币（包括SOL）
            IERC20(_token).safeTransfer(_to, _amount);
        }
        emit TokenWithdrawn(_token, _to, _amount);
    }
    
    // ============ 事件 ============
    
    event ReferrerChanged(address indexed user, address oldReferrer, address newReferrer);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event UserLevelSet(address indexed user, uint8 level);
}

// ============ 接口 ============
interface IDQMiningStake {
    function onDeposit(address _user, uint256 _amount) external;
    function addDirectSales(address _user, uint256 _amount) external;
    function recordLP(address _user, uint256 _lpAmount) external;
    function withdrawSOL(address _user, uint256 _amount) external;
    function userLevel(address _user) external view returns (uint8);
}
