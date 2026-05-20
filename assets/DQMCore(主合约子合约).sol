// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";

interface IDQToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

interface IDQCard {
    function balanceOf(address owner) external view returns (uint256);
    function mintByOwner(address to, uint256 _type) external;
    function getCardPrice(uint256 _type) external pure returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function cardType(uint256 tokenId) external view returns (uint256);
}

interface IPancakeRouter02 {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external;
    function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity);
    function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB);
}

interface IDQMiningStake {
    function registerUser(address _u, address _r) external;
    function importUser(address _u, address _r, uint256 _total, uint256 _team, uint8 _level, uint256 _energy) external;
    function lpPair() external view returns (address);
    function setEnergyMul(uint256 _m) external;
    function addEnergy(address _u, uint256 _a) external;
    function addTeamInvest(address _u, uint256 _a) external;
    function updateTeam(address _u, uint256 _a) external;
    function addDirectSales(address _u, uint256 _a) external;
    function distReward(address _u, uint256 _dyn) external;
    function addLP(address _u, uint256 _a, uint256 _t) external;
    function getDirectSales(address _u) external view returns (uint256);
    function claimLP(address u) external;
    function claimNft(address _u) external;
    function claimD(address _u) external;
    function withdrawBlockDQ(address _u) external;
    function registerDLevel(address _user, uint8 _level) external;
    function setUserNodeLevel(address _u, uint8 _lvl) external;
    function claimFee(address _u) external;
    function withdraw(address _u, uint256 _a) external;
    function withdrawLP(address _u) external;
    function getLP(address _u) external view returns (uint256);
    function subTotalLP(uint256 _a) external;
    function getUserLPRemovalFee(address _u) external view returns (uint256);
    function clearUserLPRemovalFee(address _u) external;
    function distDQFee(uint256 _amount) external;
    function distNFT(uint256 _fee) external payable;
    function stake(address _u, uint256 _a, uint _i) external;
    function unstake(address _u, uint _recordIndex) external;
    function clmS(address _u, uint _i) external;
    function withdrawDQReward(address _u, uint _i) external;
    function getStakeRecordCount(address _u) external view returns (uint256);
    function getTeamInvest(address _u) external view returns (uint256);
    function getEnergy(address _u) external view returns (uint256);
    function getPendingSOL(address _u) external view returns (uint256);
    function getPendingDQ(address _u, uint _i) external view returns (uint256);
    function subPendingSOL(address _u, uint256 _a) external;
    function mine() external;
    function getUserNodeLevel(address _u) external view returns (uint8);
    function getTotalNodes() external view returns (uint256, uint256, uint256);
}

// DQMCore - 用户核心操作合约
contract DQMCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
    // 常量地址
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955; // USDT地址
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public feeAddr = 0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public constant INS = 0x2db993B862969040Cd971Df8Fd2a2C80EC285203;
    address public constant DAO = 0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852;
    address public constant PARTNER = 0x803B79B608455808C2f752c588804c3F5bF676a3;
    address public nodeUSDTReceiver = 0x274aCc6397349F21179ed6258A54B2a11B28faF5; // 节点USDT接收地址
    
    // 合约引用
    IDQToken public dqToken;
    IDQCard public dqCard;
    address public stakeContract;
    
    // 配置常量
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public constant DAILY_LIMIT = 1 ether;
    uint256 public currentPhase = 1;
    uint256 public constant PHASE_STEP = 5 ether;
    uint256 public constant DIRECT_RATE = 30;
    uint256 public constant SEE_RATE = 15;
    uint256 public constant DAO_RATE = 10;
    uint256 public constant INS_RATE = 7;
    uint256 public constant OP_RATE = 8;
    uint256 public constant ENERGY_MUL = 3;
    uint256 public constant WITHDRAW_FEE = 10;
    uint256 public constant FEE_NODE_RATE = 40;
    uint256 public constant FEE_PARTNER_RATE = 30;
    uint256 public constant FEE_FOUNDATION_RATE = 30;
    uint256 public SLIPPAGE = 995;  
    uint256 public constant SELL_FEE = 6;         
    uint256 public constant BURN_STOP_THRESHOLD = 1;
    uint256 public constant INITIAL_SUPPLY = 100000000000 * 10**18;
    
    // 用户结构
    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        EnumerableSet.AddressSet children;
    }
    
    // 状态变量
    mapping(address => User) internal users;
    address[] public allUsers;
    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public dailyDeposit;
    mapping(address => bool) public depositWhiteList;
    uint256 public startTime;
    
    // 节点手续费累计
    uint256 public feePoolS1;
    uint256 public feePoolS2;
    uint256 public feePoolS3;
    
    // 用户已领取节点手续费
    mapping(address => mapping(uint8 => uint256)) public userFeeDebt;
    
    // 节点手续费分配开关
    bool public nodeFeeDistributionEnabled = false;
    address public nodeFeeReceiver = 0x822682A54C454e938374e9690420cdFA264A18Aa;
    
    // 事件
    event Register(address indexed u, address indexed r);
    event Deposit(address indexed u, uint256 a);
    event SwapAndAddLP(address indexed u, uint256 s, uint256 d, uint256 l);
    event SellDQ(address indexed u, uint256 d, uint256 s, uint256 b, uint256 f);
    event BurnFromPool(address indexed seller, uint256 amount);
    event ClaimReward(address indexed user, uint256 amount, uint256 fee);
    event ClaimNodeFee(address indexed user, uint256 amount);
    event RemoveLP(address indexed user, uint256 lpAmount, uint256 dqAmount, uint256 solAmount);
    event BuyNode(address indexed user, uint8 nodeType, uint256 price);
    
    // 修饰器
    modifier onlyOwner() { require(msg.sender == OWNER, "!owner"); _; }
    modifier onlyReg() { require(users[msg.sender].referrer != address(0) || msg.sender == OWNER, "!reg"); _; }
    
    // 构造函数
    constructor() {
        startTime = block.timestamp;
        users[OWNER].referrer = address(0);
        allUsers.push(OWNER);
    }
    
    // 接收BNB
    receive() external payable {}
    
    //==================== 合约配置 ====================
    
    function setDQToken(address _addr) external onlyOwner { dqToken = IDQToken(_addr); }
    function setDQCard(address _addr) external onlyOwner { dqCard = IDQCard(_addr); }
    function setFoundation(address _addr) external onlyOwner { FOUNDATION = _addr; }
    function setFeeAddr(address _addr) external onlyOwner { feeAddr = _addr; }
    function setNodeUSDTReceiver(address _addr) external onlyOwner { require(_addr != address(0)); nodeUSDTReceiver = _addr; }
    function setSlippage(uint256 _s) external onlyOwner { SLIPPAGE = _s; }
    
    function setStakeContract(address _addr) external virtual onlyOwner {
        require(_addr != address(0), "!addr");
        stakeContract = _addr;
    }
    
    function setNodeFeeDistributionEnabled(bool _enabled) external onlyOwner {
        nodeFeeDistributionEnabled = _enabled;
    }
    
    function setNodeFeeReceiver(address _addr) external onlyOwner {
        require(_addr != address(0), "!addr");
        nodeFeeReceiver = _addr;
    }
    
    //==================== 数据导入 ====================
    
    function importUser(address _u, address _r) external onlyOwner {
        require(users[_u].referrer == address(0));
        users[_u].referrer = _r;
        allUsers.push(_u);
        if (_r != address(0) && users[_r].referrer != address(0)) {
            users[_r].directCount++;
            users[_r].children.add(_u);
        }
        if (stakeContract != address(0)) {
            User storage u = users[_u];
            IDQMiningStake(stakeContract).importUser(_u, _r, u.totalInvest, 0, u.level, 0);
        }
        emit Register(_u, _r);
    }

    function importUsers(address[] calldata _u, address[] calldata _r) external onlyOwner {
        require(_u.length == _r.length);
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer == address(0)) {
                users[_u[i]].referrer = _r[i];
                allUsers.push(_u[i]);
                if (_r[i] != address(0) && users[_r[i]].referrer != address(0)) {
                    users[_r[i]].directCount++;
                    users[_r[i]].children.add(_u[i]);
                }
                if (stakeContract != address(0)) {
                    User storage u = users[_u[i]];
                    IDQMiningStake(stakeContract).importUser(_u[i], _r[i], u.totalInvest, 0, u.level, 0);
                }
                emit Register(_u[i], _r[i]);
            }
        }
    }
    
    function importNodes(address[] calldata _u, uint8[] calldata _t) external onlyOwner {
        require(_u.length == _t.length);
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer == address(0)) {
                users[_u[i]].referrer = OWNER;
                allUsers.push(_u[i]);
                emit Register(_u[i], OWNER);
            }
            if (_t[i] >= 1 && _t[i] <= 3) {
                dqCard.mintByOwner(_u[i], _t[i]);
                users[_u[i]].level = _t[i];
                if (stakeContract != address(0)) {
                    IDQMiningStake(stakeContract).setUserNodeLevel(_u[i], _t[i]);
                }
            }
        }
    }
    
    function setNodesLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length);
        for (uint i = 0; i < _u.length; i++) {
            users[_u[i]].level = _lvl[i];
            if (stakeContract != address(0)) {
                IDQMiningStake(stakeContract).setUserNodeLevel(_u[i], _lvl[i]);
            }
        }
    }
    
    function setNodesDLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length);
        for (uint i = 0; i < _u.length; i++) {
            if (stakeContract != address(0)) IDQMiningStake(stakeContract).registerDLevel(_u[i], _lvl[i]);
        }
    }
    
    function addToBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = true; }
    function removeFromBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = false; }
    function advancePhase() external onlyOwner { currentPhase++; }
    
    //==================== 用户注册 ====================
    
    function register(address _r) external {
        require(_r != msg.sender && users[msg.sender].referrer == address(0), "!inv");
        if (_r != address(0)) {
            require(users[_r].referrer != address(0) || _r == OWNER, "!rref");
            users[_r].directCount++;
            users[_r].children.add(msg.sender);
        }
        users[msg.sender].referrer = _r;
        allUsers.push(msg.sender);
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).registerUser(msg.sender, _r);
        emit Register(msg.sender, _r);
    }
    
    //==================== 入金相关 ====================
    
    function depositSOL(uint256 _a) external nonReentrant onlyReg {
        require(_a >= INVEST_MIN && !isBlacklisted[msg.sender], "!inv");
        if (!depositWhiteList[msg.sender]) {
            uint256 lim = getDailyLimit();
            require(dailyDeposit[msg.sender] + _a <= lim, "!lim");
            dailyDeposit[msg.sender] += _a;
        }
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _deposit(msg.sender, _a);
    }
    
    // 管理员代用户入金
    function depositForUser(address _user, uint256 _a) external onlyOwner {
        require(_a >= INVEST_MIN);
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _deposit(_user, _a);
    }
    
    // 管理员手动添加LP
    function manualAddLP(address _user, uint256 _a) external onlyOwner {
        require(_user != address(0) && _a > 0);
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _swapAndAddLP(_user, _a);
    }
    
    function _deposit(address _user, uint256 _a) internal {
        User storage u = users[_user];
        u.totalInvest += _a;
        uint256 dyn = _a * 50 / 100;
        uint256 lp = _a - dyn;
        
        if (stakeContract != address(0)) {
            IDQMiningStake sk = IDQMiningStake(stakeContract);
            sk.addEnergy(_user, _a * ENERGY_MUL);
            sk.addTeamInvest(_user, _a * 50 / 100 * 30 / 100);
            sk.updateTeam(_user, _a * 50 / 100 * 30 / 100);
            sk.addDirectSales(_user, _a);
            sk.distReward(_user, dyn);
        }
        
        // 分配 DAO、保险、运营
        uint256 daoAmt = dyn * DAO_RATE / 100;
        uint256 insAmt = dyn * INS_RATE / 100;
        uint256 opAmt = dyn * OP_RATE / 100;
        if (daoAmt > 0) IERC20(SOL).safeTransfer(DAO, daoAmt);
        if (insAmt > 0) IERC20(SOL).safeTransfer(INS, insAmt);
        if (opAmt > 0) IERC20(SOL).safeTransfer(OP, opAmt);
        
        if (lp > 0) _swapAndAddLP(_user, lp);
        emit Deposit(_user, _a);
    }
    
    function _swapAndAddLP(address _u, uint256 _a) internal {
        require(stakeContract != address(0), "!stake");
        address lpP = IDQMiningStake(stakeContract).lpPair();
        require(lpP != address(0), "!pair");
        require(IERC20(SOL).balanceOf(address(this)) >= _a, "!bal");
        
        uint256 halfSol = _a / 2;
        uint256 swapSol = _a - halfSol;
        
        address[] memory path = new address[](2);
        path[0] = SOL; path[1] = address(dqToken);
        IERC20(SOL).approve(ROUTER, _a);
        
        uint256[] memory expected = IPancakeRouter02(ROUTER).getAmountsOut(swapSol, path);
        uint256 minOut = expected[1] * SLIPPAGE / 1000;
        
        uint256 dqBefore = dqToken.balanceOf(address(this));
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(swapSol, minOut, path, address(this), block.timestamp + 300);
        uint256 dqAfter = dqToken.balanceOf(address(this));
        uint256 dBal = dqAfter - dqBefore;
        require(dBal > 0, "!swap");
        
        dqToken.approve(ROUTER, dBal);
        uint256 minA = halfSol * SLIPPAGE / 1000;
        uint256 minB = dBal * SLIPPAGE / 1000;
        
        (, , uint256 lpBal) = IPancakeRouter02(ROUTER).addLiquidity(SOL, address(dqToken), halfSol, dBal, minA, minB, address(this), block.timestamp + 300);
        require(lpBal > 0, "!lp");
        
        IERC20(lpP).transfer(_u, lpBal);
        IDQMiningStake(stakeContract).addLP(_u, lpBal, block.timestamp);
        emit SwapAndAddLP(_u, halfSol, dBal, lpBal);
    }
    
    //==================== 领取奖励 ====================
    
    function claimReward() external nonReentrant {
        require(stakeContract != address(0), "!stake");
        IDQMiningStake sk = IDQMiningStake(stakeContract);
        
        uint256 pending = sk.getPendingSOL(msg.sender);
        require(pending > 0, "!pending");
        sk.subPendingSOL(msg.sender, pending);
        
        uint256 lpRemovalFee = sk.getUserLPRemovalFee(msg.sender);
        uint256 actualPending = pending;
        
        if (lpRemovalFee > 0) {
            if (lpRemovalFee >= pending) {
                sk.clearUserLPRemovalFee(msg.sender);
                IERC20(SOL).safeTransfer(FOUNDATION, pending);
                emit ClaimReward(msg.sender, 0, pending);
                return;
            }
            actualPending = pending - lpRemovalFee;
            sk.clearUserLPRemovalFee(msg.sender);
            IERC20(SOL).safeTransfer(FOUNDATION, lpRemovalFee);
        }
        
        uint256 fee = actualPending * WITHDRAW_FEE / 100;
        uint256 net = actualPending - fee;
        _distFee(fee);
        IERC20(SOL).safeTransfer(msg.sender, net);
        emit ClaimReward(msg.sender, net, fee + lpRemovalFee);
    }
    
    function _distFee(uint256 _fee) internal {
        if (_fee == 0) return;
        uint256 nodeTotal = _fee * FEE_NODE_RATE / 100;  // 40%
        uint256 p = _fee * FEE_PARTNER_RATE / 100;       // 30%
        uint256 f = _fee - nodeTotal - p;                 // 30%
        
        // 合伙人和基金会直接转账
        IERC20(SOL).safeTransfer(PARTNER, p);
        IERC20(SOL).safeTransfer(FOUNDATION, f);
        
        // 节点40%根据开关决定分配方式
        if (nodeFeeDistributionEnabled) {
            // 开启：按等级分配到累计池
            feePoolS1 += nodeTotal * 10 / 40;   // A卡 10%
            feePoolS2 += nodeTotal * 15 / 40;   // B卡 15%
            feePoolS3 += nodeTotal * 15 / 40;   // C卡 15%
        } else {
            // 关闭：转到指定地址
            IERC20(SOL).safeTransfer(nodeFeeReceiver, nodeTotal);
        }
    }
    
    function claimLP() external nonReentrant {
        require(stakeContract != address(0), "!stake");
        IDQMiningStake(stakeContract).claimLP(msg.sender);
    }
    
    function claimNft() external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimNft(msg.sender);
    }
    
    function claimFee() external nonReentrant {
        _claimNodeFee(msg.sender);
    }
    
    // 领取节点手续费（按NFT卡牌类型分配）
    function _claimNodeFee(address _u) internal {
        uint256 cnt = dqCard.balanceOf(_u);
        require(cnt > 0, "!nft");
        
        uint256 reward;
        for (uint256 i; i < cnt; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(_u, i);
            uint256 cardType = dqCard.cardType(tokenId);
            if (cardType == 1 && feePoolS1 > 0 && userFeeDebt[_u][0] < feePoolS1) {
                reward += feePoolS1 - userFeeDebt[_u][0];
            } else if (cardType == 2 && feePoolS2 > 0 && userFeeDebt[_u][1] < feePoolS2) {
                reward += feePoolS2 - userFeeDebt[_u][1];
            } else if (cardType == 3 && feePoolS3 > 0 && userFeeDebt[_u][2] < feePoolS3) {
                reward += feePoolS3 - userFeeDebt[_u][2];
            }
        }
        
        // 更新用户的领取记录
        userFeeDebt[_u][0] = feePoolS1;
        userFeeDebt[_u][1] = feePoolS2;
        userFeeDebt[_u][2] = feePoolS3;
        
        if (reward > 0) {
            IERC20(SOL).safeTransfer(_u, reward);
            emit ClaimNodeFee(_u, reward);
        }
    }
    
    function claimDTeam() external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimD(msg.sender);
    }
    
    //==================== 领取DQ爆块奖励 ====================
    
    function claimBlockDQ() external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).withdrawBlockDQ(msg.sender);
    }
    
    //==================== 取消LP ====================
    
    function removeMyLP() external nonReentrant {
        require(stakeContract != address(0), "!stake");
        
        address lpP = IDQMiningStake(stakeContract).lpPair();
        require(lpP != address(0), "!pair");
        
        uint256 userLP = IDQMiningStake(stakeContract).getLP(msg.sender);
        require(userLP > 0, "!lp");
        
        IERC20(lpP).safeTransferFrom(msg.sender, address(this), userLP);
        IDQMiningStake(stakeContract).withdrawLP(msg.sender);
        IDQMiningStake(stakeContract).subTotalLP(userLP);
        
        IERC20(lpP).approve(ROUTER, userLP);
        
        (uint256 amountDQ, uint256 amountSOL) = IPancakeRouter02(ROUTER).removeLiquidity(
            address(dqToken), SOL, userLP, 0, 0, address(this), block.timestamp + 300
        );
        
        if (amountDQ > 0) dqToken.transfer(msg.sender, amountDQ);
        if (amountSOL > 0) IERC20(SOL).safeTransfer(msg.sender, amountSOL);
        
        emit RemoveLP(msg.sender, userLP, amountDQ, amountSOL);
    }
    
    //==================== 质押相关 ====================
    
    function stakeDQ(uint256 _amount, uint _periodIndex) external nonReentrant {
        require(stakeContract != address(0), "!stake");
        require(dqToken.balanceOf(msg.sender) >= _amount, "!bal");
        dqToken.transferFrom(msg.sender, address(this), _amount);
        IDQMiningStake(stakeContract).stake(msg.sender, _amount, _periodIndex);
    }
    
    function unstakeDQ(uint _recordIndex) external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).unstake(msg.sender, _recordIndex);
    }
    
    function claimStakeReward(uint _periodIndex) external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).clmS(msg.sender, _periodIndex);
    }
    
    function withdrawDQReward(uint _periodIndex) external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).withdrawDQReward(msg.sender, _periodIndex);
    }
    
    //==================== 卖出DQ ====================
    
    function sellDQForSOL(uint256 _dq) external nonReentrant returns (uint256 solOut) {
        require(dqToken.balanceOf(msg.sender) >= _dq, "!bal");
        dqToken.transferFrom(msg.sender, address(this), _dq);
        
        uint256 supply = dqToken.totalSupply();
        uint256 burnAmount;
        
        // 销毁94%（从池子销毁，不影响用户用于交换的DQ）
        if (supply > INITIAL_SUPPLY * BURN_STOP_THRESHOLD / 100) {
            burnAmount = _dq * 94 / 100;
            IDQToken(address(dqToken)).burn(burnAmount);
        }
        
        // 扣手续费6%（从用户的DQ中扣）
        uint256 fee = _dq * SELL_FEE / 100;
        uint256 swapDQ = _dq - fee;  // 用户用于交换的DQ
        if (fee > 0) {
            uint256 halfFee = fee * 50 / 100;
            uint256 stakeFee = fee * 50 / 100;
            if (halfFee > 0 && feeAddr != address(0)) {
                dqToken.transfer(feeAddr, halfFee);
            }
            if (stakeFee > 0 && stakeContract != address(0)) {
                dqToken.transfer(stakeContract, stakeFee);
                IDQMiningStake(stakeContract).distDQFee(stakeFee);
            }
        }
        
        // 用 swapDQ 计算 SOL
        address[] memory path = new address[](2);
        path[0] = address(dqToken);
        path[1] = SOL;
        uint256[] memory amounts = IPancakeRouter02(ROUTER).getAmountsOut(swapDQ, path);
        solOut = amounts[1] * SLIPPAGE / 1000;  
        require(solOut > 0, "!price");
        
        IERC20(SOL).safeTransfer(msg.sender, solOut);
        emit SellDQ(msg.sender, _dq, solOut, burnAmount, fee);
    }
    
    // DQToken调用：底池卖出时销毁
    function onDQSell(address _seller, uint256 _sellAmount) external {
        require(msg.sender == address(dqToken), "!dqToken");
        
        uint256 supply = dqToken.totalSupply();
        if (supply > INITIAL_SUPPLY * BURN_STOP_THRESHOLD / 100) {
            uint256 burnAmount = _sellAmount * 94 / 100;
            uint256 bal = dqToken.balanceOf(address(this));
            if (burnAmount > bal) burnAmount = bal;
            if (burnAmount > 0) {
                IDQToken(address(dqToken)).burn(burnAmount);
                emit BurnFromPool(_seller, burnAmount);
            }
        }
    }
    
    //==================== 购买节点 ====================
    
    function buyNode(uint256 _t) external nonReentrant {
        require(_t >= 1 && _t <= 3, "!type");
        require(dqCard.getCardPrice(_t) > 0, "!price");
        uint256 price = dqCard.getCardPrice(_t);
        require(IERC20(USDT).balanceOf(msg.sender) >= price, "!bal");
        
        // 收取USDT
        IERC20(USDT).safeTransferFrom(msg.sender, nodeUSDTReceiver, price);
        
        // 铸造NFT
        dqCard.mintByOwner(msg.sender, _t);
        users[msg.sender].level = uint8(_t);
        
        emit BuyNode(msg.sender, uint8(_t), price);
    }
    
    //==================== 查询函数 ====================
    
    function getDailyLimit() public view returns (uint256) {
        uint256 l = DAILY_LIMIT + (currentPhase - 1) * PHASE_STEP;
        return l > 200 ether ? 200 ether : l;
    }
    
    function getUser(address _u) external view returns (address referrer, uint256 directCount, uint8 level, uint256 totalInvest) {
        User storage us = users[_u];
        return (us.referrer, us.directCount, us.level, us.totalInvest);
    }
    
    function getTeamSize(address _u) external view returns (uint256) { 
        return users[_u].children.length(); 
    }
    
    function getAllUsersLength() external view returns (uint256) { 
        return allUsers.length; 
    }
}
