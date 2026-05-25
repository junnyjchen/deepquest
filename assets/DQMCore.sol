// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";

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
contract DQMCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
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
    address public nodeUSDTReceiver = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public partnerAddr = 0x803B79B608455808C2f752c588804c3F5bF676a3; // 合伙人/创始人地址
    
    // ============ 合约引用 ============
    address public dqToken;
    address public dqCard;
    address public stakeContract;
    address public adminContract;
    address public migratorContract;  // 迁移合约
    address public pool;  // 底池地址
    
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
    mapping(address => uint256) public dailyDeposit;       // 用户当日入金时间戳
    mapping(address => bool) public depositWhiteList;
    mapping(address => uint256) public userEnergy;         // 用户能量
    mapping(address => uint256) public userEnergyUsed;     // 用户已使用能量
    uint256 public startTime;
    uint256 public currentPhase = 1;                       // 当前阶段(1-8)
    uint256 public totalInvested;
    uint256 public totalLPAdded;  // 总添加流动性数量
    
    // 阶段入金限制 (SOL)
    uint256[8] public phaseLimits = [
        1 ether,      // Phase 1: 1 SOL
        5 ether,      // Phase 2: 5 SOL
        10 ether,     // Phase 3: 10 SOL
        20 ether,     // Phase 4: 20 SOL
        50 ether,     // Phase 5: 50 SOL
        100 ether,    // Phase 6: 100 SOL
        150 ether,    // Phase 7: 150 SOL
        200 ether     // Phase 8: 200 SOL
    ];
    
    // ============ 事件 ============
    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount, uint256 lpAmount, uint256 energy);
    event WithdrawSOL(address indexed user, uint256 amount);
    event AddressesUpdated(address dqToken, address dqCard, address stakeContract);
    event PoolSet(address indexed pool);
    event LPAdded(address indexed user, uint256 solAmount, uint256 dqAmount, uint256 lpAmount);
    event PhaseAdvanced(uint256 newPhase, uint256 newLimit);
    event EnergyAdded(address indexed user, uint256 amount, uint256 totalEnergy);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER || msg.sender == adminContract, "!owner");
        _;
    }
    
    // ============ Router接口 ============
    interface IRouter {
        function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
        function swapExactETHForTokensSupportingFeeOnTransferTokens(
            uint amountOutMin,
            address[] calldata path,
            address to,
            uint deadline
        ) external payable;
        function addLiquidityETH(
            address token,
            uint amountTokenDesired,
            uint amountTokenMin,
            uint amountETHMin,
            address to,
            uint deadline
        ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
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
    
    function setPartnerAddr(address _addr) external onlyOwner {
        partnerAddr = _addr;
    }
    
    function setPhase(uint256 _phase) external onlyOwner {
        currentPhase = _phase;
    }
    
    function setDepositWhiteList(address _user, bool _status) external onlyOwner {
        depositWhiteList[_user] = _status;
    }
    
    function setBlacklisted(address _user, bool _status) external onlyOwner {
        isBlacklisted[_user] = _status;
    }
    
    function setMigratorContract(address _migrator) external onlyOwner {
        migratorContract = _migrator;
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
     * @notice 管理员导入用户
     */
    function importUser(address _user, address _referrer) external onlyOwner {
        require(users[_user].referrer == address(0), "registered");
        
        users[_user].referrer = _referrer;
        if (_referrer != address(0)) {
            users[_referrer].directCount++;
            users[_referrer].children.add(_user);
        }
        allUsers.push(_user);
        emit Register(_user, _referrer);
    }
    
    /**
     * @notice 批量导入用户
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
    function importUserRelation(address _user, address _referrer) external {
        require(msg.sender == migratorContract || msg.sender == OWNER || msg.sender == adminContract, "!auth");
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
     * @notice 用户入金（发送SOL/BNB）
     * @dev 资金分配：
     *      - 50% 进入动态分币（通过质押合约）
     *      - 50% 进入LP质押：
     *        - 25% SOL保留
     *        - 25% SOL从底池买DQ（合约白名单不扣手续费）
     *        - 添加流动性获得LP代币质押给用户
     *      入金限制：
     *      - 每日只能入金一次
     *      - 金额限制按阶段：1->5->10->20->50->100->150->200 SOL
     *      能量机制：
     *      - 入金1 SOL获得3倍能量
     *      - 最多能获得3倍入金的SOL奖励
     */
    function deposit() external payable nonReentrant {
        require(msg.value >= INVEST_MIN, "!min");
        require(users[msg.sender].referrer != address(0), "!registered");
        require(pool != address(0), "!pool");
        require(dqToken != address(0), "!dqToken");
        require(!isBlacklisted[msg.sender], "blacklisted");
        
        // 入金限制检查
        uint256 limit = phaseLimits[currentPhase - 1];
        require(msg.value <= limit, "!limit");
        
        // 每日只能入金一次
        require(dailyDeposit[msg.sender] < block.timestamp / 1 days, "daily limit");
        
        uint256 totalAmount = msg.value;
        
        // 更新入金时间
        dailyDeposit[msg.sender] = block.timestamp / 1 days;
        
        // 更新用户投资
        users[msg.sender].totalInvest += totalAmount;
        totalInvested += totalAmount;
        
        // 添加能量：入金1 SOL获得3倍能量
        uint256 energyToAdd = totalAmount * ENERGY_MUL;
        userEnergy[msg.sender] += energyToAdd;
        emit EnergyAdded(msg.sender, totalAmount, userEnergy[msg.sender]);
        
        // 1. 50% 进入动态分币
        uint256 rewardAmount = totalAmount / 2;
        if (stakeContract != address(0)) {
            IDQMiningStake(stakeContract).onDeposit{value: rewardAmount}(msg.sender, rewardAmount);
        }
        
        // 2. 50% 进入LP质押
        uint256 lpAmount = _addLiquidity(msg.sender, totalAmount / 2);
        
        emit Deposit(msg.sender, totalAmount, lpAmount, energyToAdd);
    }
    
    /**
     * @dev 内部函数：添加流动性
     * @param _user 用户地址
     * @param _solAmount SOL数量（50%的入金）
     * @return lpAmount 获得的LP代币数量
     */
    function _addLiquidity(address _user, uint256 _solAmount) internal returns (uint256 lpAmount) {
        // 25% SOL保留
        uint256 solForLP = _solAmount / 2;
        // 25% SOL用于买DQ
        uint256 solForBuy = _solAmount - solForLP;
        
        // 从底池买DQ（合约是白名单，不扣手续费）
        uint256 dqAmount = _buyDQ(solForBuy);
        
        if (dqAmount > 0) {
            // 授权
            IERC20(dqToken).safeApprove(ROUTER, dqAmount);
            
            // 添加流动性
            (,, lpAmount) = IRouter(ROUTER).addLiquidityETH{value: solForLP}(
                dqToken,
                dqAmount,
                0,  // min DQ
                0,  // min SOL
                address(this),  // LP代币给合约
                block.timestamp
            );
            
            // 将LP代币质押给用户（通知质押合约）
            if (stakeContract != address(0) && lpAmount > 0) {
                // 授权LP给质押合约
                address pair = pool;
                IERC20(pair).safeApprove(stakeContract, lpAmount);
                // 通知质押合约
                IDQMiningStake(stakeContract).onLPStake(_user, lpAmount);
            }
            
            totalLPAdded += lpAmount;
            emit LPAdded(_user, solForLP, dqAmount, lpAmount);
        }
    }
    
    /**
     * @dev 从底池买DQ（合约是白名单，不扣手续费）
     * @param _solAmount SOL数量
     * @return dqAmount 买到的DQ数量
     */
    function _buyDQ(uint256 _solAmount) internal returns (uint256 dqAmount) {
        require(pool != address(0), "!pool");
        
        // 记录买入前的DQ余额
        uint256 balanceBefore = IERC20(dqToken).balanceOf(address(this));
        
        // 执行买入（合约是白名单，不扣手续费）
        address[] memory path = new address[](2);
        path[0] = WBNB;
        path[1] = dqToken;
        
        IRouter(ROUTER).swapExactETHForTokensSupportingFeeOnTransferTokens{value: _solAmount}(
            0,  // 最小输出
            path,
            address(this),
            block.timestamp
        );
        
        // 计算实际买到的数量
        dqAmount = IERC20(dqToken).balanceOf(address(this)) - balanceBefore;
    }
    
    /**
     * @notice 管理员代用户入金
     */
    function depositForUser(address _user, uint256 _amount) external payable onlyOwner {
        require(msg.value >= _amount, "!value");
        require(users[_user].referrer != address(0), "!registered");
        require(pool != address(0), "!pool");
        
        users[_user].totalInvest += _amount;
        totalInvested += _amount;
        
        // 添加能量（3倍）
        _addEnergy(_user, _amount * 3);
        
        // 50% 进入动态分币
        uint256 rewardAmount = _amount / 2;
        if (stakeContract != address(0)) {
            IDQMiningStake(stakeContract).onDeposit{value: rewardAmount}(_user, rewardAmount);
        }
        
        // 50% 进入LP质押
        uint256 lpAmount = _addLiquidity(_user, _amount / 2);
        
        emit Deposit(_user, _amount, lpAmount);
    }
    
    // ============ SOL提取（解决问题） ============
    
    /**
     * @notice 用户提取SOL奖励 - 从质押合约提取
     */
    function withdrawSOL(uint256 _amount) external nonReentrant {
        require(stakeContract != address(0), "!stake");
        require(_amount > 0, "!amount");
        
        IDQMiningStake(stakeContract).withdrawSOL(msg.sender, _amount);
        
        emit WithdrawSOL(msg.sender, _amount);
    }
    
    /**
     * @notice 转移SOL给用户（仅质押合约调用）
     */
    function transferSOLToUser(address _user, uint256 _amount) external {
        require(msg.sender == stakeContract, "!stake");
        payable(_user).transfer(_amount);
    }
    
    // ============ 查询函数 ============
    
    function getUser(address _user) external view returns (
        address referrer,
        uint256 directCount,
        uint8 level,
        uint256 totalInvest,
        uint256 childrenCount
    ) {
        User storage user = users[_user];
        return (
            user.referrer,
            user.directCount,
            user.level,
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
     * @notice 升级到下一阶段（管理员操作）
     * @dev 每次操作完上限增加到下一阶段
     */
    function advancePhase() external onlyOwner {
        require(currentPhase < 8, "max phase");
        currentPhase++;
        emit PhaseAdvanced(currentPhase, phaseLimits[currentPhase - 1]);
    }
    
    /**
     * @notice 设置阶段（管理员操作）
     */
    function setPhase(uint256 _phase) external onlyOwner {
        require(_phase >= 1 && _phase <= 8, "invalid phase");
        currentPhase = _phase;
        emit PhaseAdvanced(currentPhase, phaseLimits[currentPhase - 1]);
    }
    
    /**
     * @notice 获取当前阶段限制
     */
    function getCurrentLimit() external view returns (uint256) {
        return phaseLimits[currentPhase - 1];
    }
    
    // ============ 能量管理 ============
    
    /**
     * @notice 使用能量（质押合约调用）
     * @param _user 用户地址
     * @param _amount 使用金额
     * @return success 是否成功
     */
    function useEnergy(address _user, uint256 _amount) external returns (bool) {
        require(msg.sender == stakeContract || msg.sender == adminContract, "!auth");
        
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
}

// ============ 接口 ============
interface IDQMiningStake {
    function onDeposit(address _user, uint256 _amount) external payable;
    function onLPStake(address _user, uint256 _lpAmount) external;
    function withdrawSOL(address _user, uint256 _amount) external;
}
