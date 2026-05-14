// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";

interface IDQToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

interface IDQCard {
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function cardType(uint256 tokenId) external view returns (uint256);
    function totalA() external view returns (uint256);
    function totalB() external view returns (uint256);
    function totalC() external view returns (uint256);
    function PRICE_A() external pure returns (uint256);
    function PRICE_B() external pure returns (uint256);
    function PRICE_C() external pure returns (uint256);
    function getCardPrice(uint256 _type) external pure returns (uint256);
}

// ========== 新增：PancakeSwap接口 ==========
interface IPancakeRouter02 {
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
}

interface IPancakePair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
// ==========================================

contract DQMiningStake is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    IDQToken public constant dq = IDQToken(0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B);
    
    // ========== 修复：DQCard改为可设置变量 ==========
    IDQCard public dc;
    // ===========================================
    
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public mc;
    address public miningContract;  // DQMining主合约地址
    
    // ========== 新增：PancakeSwap配置 ==========
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;  // PancakeSwap Router V2
    address public lpPair;  // DQ/SOL交易对地址（部署后设置）
    // ==========================================
    
    // ========== 新增：基金会配置 ==========
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    uint256 public constant FOUNDATION_RATE = 5;  // 基金会分配比例 5%
    // =====================================
    
    // 手续费设置
    uint256 public claimGasFee = 0.00005 ether;
    address public feeRecipient = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant FEE_RECEIVER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;  // LP移除手续费接收地址
    
    // 分配比例（基于ra总量）
    // 基金会 5% + D等级 14%（每级1.75%）+ LP 60% + NFT 15% + 合伙人 6% = 100%
    uint256 public constant LP = 60;
    uint256 public constant NFT = 15;
    uint256 public constant PT = 6;
    uint256 public constant RT = 13;  // 每日释放1.3%
    uint256 public constant IB = 80;
    uint256 public constant MB = 30;
    uint256 public constant BD = 5;
    uint256 public constant F60 = 20;
    uint256 public constant F180 = 10;
    
    // ========== 合伙人配置（固定地址，不可修改）==========
    address public constant PARTNER = 0x803B79B608455808C2f752c588804c3F5bF676a3;
    
    // ========== D等级分红配置 ==========
    // 每个D等级各分1.75%，共8个等级，总计14%
    uint256 public constant D_LEVEL_RATE = 175;  // 每个等级 1.75% (175/10000)
    uint256[8] public dLevelCount;  // D1-D8每个等级的用户数量
    mapping(uint8 => mapping(address => bool)) public isDLevel;  // 等级-地址映射
    mapping(address => uint8) public userDLevel;  // 用户当前D等级
    mapping(address => uint256) public dLevelRewardDebt;  // 用户已领取的D等级奖励
    uint256[8] public dLevelAccReward;  // 每个D等级的累计每单位奖励（D1-D8）
    // ===================================
    
    // ========== LP移除手续费配置 ==========
    uint256 public constant LP_FEE = 6;  // LP移除手续费率 6%，100%给手续费地址
    
    // ========== 销毁配置 ==========
    uint256 public pendingBurn;  // 待销毁的DQ数量（用户卖出时累积）
    uint256 public contractLpBalance;  // 合约持有的LP数量（用于销毁）
    uint256 public totalBurned;  // 已销毁总量
    uint256 public constant MIN_BURN_AMOUNT = 100 * 10**18;  // 最小销毁触发量 100 DQ
    
    // ========== 爆块配置：基于初始发行量计算 ==========
    uint256 public constant INITIAL_SUPPLY = 1000 * 10**8 * 10**18;  // 初始发行量 1000亿 DQ
    uint256 public releasedSupply;  // 已释放总量
    // ===================================================
    
    uint256[] public SP = [30, 90, 180, 360];
    uint256[4] public sA;
    uint256[4] public tS;
    
    // 合伙人（固定地址，只有一个）
    uint256 public pDA;  // 合伙人DQ累计奖励
    uint256 public pBA;  // 合伙人SOL累计奖励
    uint256 public pDD;  // 合伙人已领取DQ
    uint256 public pBD;  // 合伙人已领取SOL
    
    // 团队
    uint256[8] public dT;
    uint256[8] public dA;
    
    // 销毁率
    uint256 public br = IB;
    uint256 public lt;
    uint256 public lA;
    
    // NFT
    uint256[3] public nA;
    uint256[3] public fA;
    mapping(uint256 => uint256) public lF;
    uint256 public fp;
    
    // LP
    uint256 public tLP;
    mapping(address => uint256) public lpS;
    mapping(address => uint256) public lpD;
    mapping(address => uint256) public lpT;
    
    // NFT分红
    mapping(address => uint256) public nD0;
    mapping(address => uint256) public nD1;
    mapping(address => uint256) public nD2;
    
    // 团队
    mapping(address => uint256) public dd;
    mapping(address => uint8) public dl;
    
    // Staking
    mapping(address => uint256[4]) public sAmt;
    mapping(address => uint256[4]) public sDebt;
    
    // 黑名单
    mapping(address => bool) public isB;
    
    // 事件
    event ClaimLP(address indexed u, uint256 a);
    event ClaimNft(address indexed u, uint256 a);
    event ClaimDTeam(address indexed u, uint256 a);
    event ClaimPdq(address indexed u, uint256 a);
    event ClaimPbnb(address indexed u, uint256 a);
    event ClaimFee(address indexed u, uint256 a);
    event RmLP(address indexed u, uint256 a, uint256 f);
    event RmLPDetails(address indexed u, uint256 dqAmt, uint256 solAmt, uint256 feeDQ, uint256 feeSOL);  // 新增：移除LP详情
    event Withdraw(address indexed u, uint256 a, uint256 f);
    event Stk(address indexed u, uint256 a, uint256 p);
    event Unstk(address indexed u, uint256 a, uint256 p);
    event ClmStk(address indexed u, uint256 a);
    event Mine(uint256 r, uint256 b, uint256 t);
    event GasFeePaid(address indexed u, uint256 amount);
    // ========== 新增事件 ==========
    event DQCardSet(address indexed oldAddr, address indexed newAddr);
    event FoundationDistributed(uint256 amount);
    // ========== 销毁相关事件 ==========
    event PendingBurnAdded(uint256 amount, uint256 totalPending);
    event ExecuteBurn(uint256 lpRemoved, uint256 dqBurned, uint256 solReceived);
    event LpReceived(address indexed from, uint256 amount);
    // ================================
    
    // ========== D等级事件 ==========
    event DLevelRegistered(address indexed user, uint8 oldLevel, uint8 newLevel);
    event DLevelRewardClaimed(address indexed user, uint256 amount);
    // ===============================
    
    modifier onlyO() { require(msg.sender == OWNER, "!o"); _; }
    modifier onlyM() { require(msg.sender == mc, "!m"); _; }
    modifier onlyMining() { require(msg.sender == miningContract, "!mining"); _; }
    
    constructor() {
        lt = block.timestamp;
        // ========== 初始化DQCard地址 ==========
        dc = IDQCard(0x1857aCeDf9b73163D791eb2F0374a328416291a1);
        // =====================================
    }
    
    // ========== 新增：设置DQCard合约地址 ==========
    function setDQCard(address _addr) external onlyO {
        require(_addr != address(0), "!addr");
        address oldAddr = address(dc);
        dc = IDQCard(_addr);
        emit DQCardSet(oldAddr, _addr);
    }
    // ==============================================
    
    // 手续费设置函数
    function setClaimGasFee(uint256 _fee) external onlyO { claimGasFee = _fee; }
    function setFeeRecipient(address _addr) external onlyO { require(_addr != address(0)); feeRecipient = _addr; }
    
    function setM(address a) external onlyO { mc = a; }
    function bl(address u, bool s) external onlyO { isB[u] = s; }
    
    // ========== 新增：设置DQMining主合约地址 ==========
    function setMiningContract(address _addr) external onlyO {
        require(_addr != address(0), "!addr");
        miningContract = _addr;
    }
    // ==============================================
    
    // ========== 新增：D等级用户注册/更新 ==========
    function registerDLevel(address _user, uint8 _newLevel) external onlyMining {
        uint8 oldLevel = userDLevel[_user];
        
        // 如果之前有等级，从旧等级移除
        if (oldLevel > 0 && oldLevel <= 8) {
            if (isDLevel[oldLevel][_user]) {
                isDLevel[oldLevel][_user] = false;
                dLevelCount[oldLevel - 1]--;
            }
        }
        
        // 添加到新等级
        if (_newLevel > 0 && _newLevel <= 8) {
            isDLevel[_newLevel][_user] = true;
            dLevelCount[_newLevel - 1]++;
            userDLevel[_user] = _newLevel;
        }
        
        emit DLevelRegistered(_user, oldLevel, _newLevel);
    }
    // ============================================
    
    // ========== 新增：用户领取D等级分红（需支付BNB手续费）==========
    function claimDLevelReward() external payable nonReentrant {
        require(msg.value >= claimGasFee, "!bnb");
        uint8 lvl = userDLevel[msg.sender];
        require(lvl > 0 && lvl <= 8, "!dlevel");
        require(dLevelCount[lvl - 1] > 0, "!count");
        
        // 计算用户应得奖励（使用对应等级的累计奖励）
        uint256 reward = dLevelAccReward[lvl - 1] - dLevelRewardDebt[msg.sender];
        if (reward > 0) {
            dLevelRewardDebt[msg.sender] = dLevelAccReward[lvl - 1];
            dq.transfer(msg.sender, reward);
            emit DLevelRewardClaimed(msg.sender, reward);
        }
        
        // BNB手续费留在合约，管理员可提取
        emit GasFeePaid(msg.sender, claimGasFee);
    }
    // ==========================================
    
    // ========== 新增：查询用户D等级待领取奖励 ==========
    function getDLevelReward(address _user) external view returns (uint256) {
        uint8 lvl = userDLevel[_user];
        if (lvl == 0 || lvl > 8 || dLevelCount[lvl - 1] == 0) return 0;
        return dLevelAccReward[lvl - 1] - dLevelRewardDebt[_user];
    }
    // ==============================================
    
    function addLP(address u, uint256 a, uint256 t) external onlyM {
        uint256 o = lpS[u];
        lpS[u] += a; tLP += a;
        if (lpT[u] == 0 || t < lpT[u]) lpT[u] = t;
        if (o > 0) lpD[u] = o * lA / 1e12;
    }
    
    function distLP(uint256 f) external onlyM { if (f == 0 || tLP == 0) return; lA += f * LP / 100 * 1e12 / tLP; }
    
    // 分配SOL给NFT持有者（payable，接收BNB手续费转给基金会）
    function distNFT(uint256 f) external payable onlyM {
        if (f == 0) return;
        // BNB手续费转给基金会
        if (msg.value > 0) {
            payable(FOUNDATION).transfer(msg.value);
        }
        uint256 s0 = dc.totalA() * dc.PRICE_A();
        uint256 s1 = dc.totalB() * dc.PRICE_B();
        uint256 s2 = dc.totalC() * dc.PRICE_C();
        if (s0 > 0) nA[0] += f * 1e12 / s0;
        if (s1 > 0) nA[1] += f * 1e12 / s1;
        if (s2 > 0) nA[2] += f * 1e12 / s2;
    }
    
    // distD已删除，团队奖励改为D等级分红，在mine函数中自动处理
    
    // 合伙人SOL分红（提现手续费30%）
    function distP(uint256 f) external onlyM { if (f == 0) return; pBA += f * 1e12; }
    
    // 领取LP奖励 + Gas费
    function claimLP(address u) external onlyM {
        require(!isB[u], "bl"); require(lpS[u] > 0, "!lp");
        uint256 p = lpS[u] * lA / 1e12 - lpD[u];
        require(p > 0, "!p");
        lpD[u] = lpS[u] * lA / 1e12;
        dq.transfer(u, p);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimLP(u, p);
    }
    
    // 领取NFT分红 + Gas费
    function claimNft(address u) external onlyM {
        require(!isB[u], "bl"); uint256 b = dc.balanceOf(u);
        require(b > 0, "!nft"); uint256 tot;
        for (uint i = 0; i < b; i++) {
            uint256 tid = dc.tokenOfOwnerByIndex(u, i);
            uint256 t = dc.cardType(tid);
            uint256 idx = t - 1;
            uint256 price = dc.getCardPrice(t);
            uint256 pend;
            if (idx == 0) { pend = price * nA[0] / 1e12 - nD0[u]; nD0[u] = price * nA[0] / 1e12; }
            else if (idx == 1) { pend = price * nA[1] / 1e12 - nD1[u]; nD1[u] = price * nA[1] / 1e12; }
            else { pend = price * nA[2] / 1e12 - nD2[u]; nD2[u] = price * nA[2] / 1e12; }
            if (pend > 0) tot += pend;
        }
        require(tot > 0, "!p");
        dq.transfer(u, tot);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimNft(u, tot);
    }
    
    // 领取团队奖励 + Gas费
    function claimD(address u) external onlyM {
        require(!isB[u], "bl"); require(dl[u] > 0, "!d");
        uint256 p = dA[dl[u] - 1] / 1e12 - dd[u];
        require(p > 0, "!p");
        dd[u] = dA[dl[u] - 1] / 1e12;
        dq.transfer(u, p);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimDTeam(u, p);
    }
    
    // 领取手续费分红 + Gas费
    function claimFee(address u) external onlyM {
        require(!isB[u], "bl"); uint256 b = dc.balanceOf(u);
        require(b > 0, "!nft"); uint256 tot;
        for (uint i = 0; i < b; i++) {
            uint256 tid = dc.tokenOfOwnerByIndex(u, i);
            uint256 idx = dc.cardType(tid) - 1;
            uint256 p2 = fA[idx] - lF[tid];
            if (p2 > 0) { tot += p2; lF[tid] = fA[idx]; }
        }
        require(tot > 0, "!p");
        IERC20(SOL).safeTransfer(u, tot);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimFee(u, tot);
    }
    
    // 领取合伙人DQ奖励 + Gas费
    function claimPdq(address u) external onlyM {
        require(!isB[u], "bl"); require(u == PARTNER, "!p");
        uint256 p = pDA / 1e12 - pDD;
        require(p > 0, "!p");
        pDD = pDA / 1e12;
        dq.transfer(u, p);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimPdq(u, p);
    }
    
    // 领取合伙人BNB奖励 + Gas费
    function claimPbnb(address u) external onlyM {
        require(!isB[u], "bl"); require(u == PARTNER, "!p");
        uint256 p = pBA / 1e12 - pBD;
        require(p > 0, "!p");
        pBD = pBA / 1e12;
        IERC20(SOL).safeTransfer(u, p);
        
        if (claimGasFee > 0) {
            payable(address(this)).transfer(claimGasFee);
            emit GasFeePaid(u, claimGasFee);
        }
        emit ClaimPbnb(u, p);
    }
    
    function withdraw(address u, uint256 a) external onlyM {
        require(!isB[u], "bl"); require(a > 0, "!inv");
        uint256 fee = a * 10 / 100;
        _df(fee * 40 / 100);
        pBA += fee * 30 / 100 * 1e12;  // 合伙人固定地址
        IERC20(SOL).safeTransfer(OP, fee * 30 / 100);
        IERC20(SOL).safeTransfer(u, a - fee);
        emit Withdraw(u, a, fee);
    }
    
    function _df(uint256 f) internal {
        if (f == 0) return; fp += f;
        uint256 s0 = dc.totalA() * dc.PRICE_A();
        uint256 s1 = dc.totalB() * dc.PRICE_B();
        uint256 s2 = dc.totalC() * dc.PRICE_C();
        if (s0 > 0) fA[0] += f * 1e12 / s0;
        if (s1 > 0) fA[1] += f * 1e12 / s1;
        if (s2 > 0) fA[2] += f * 1e12 / s2;
    }
    
    function rmLP(address u) external onlyM {
        require(lpS[u] > 0, "!LP");
        require(lpPair != address(0), "!pair");
        
        uint256 lp = lpS[u];
        lpS[u] = 0; 
        tLP -= lp;
        
        // 1. 通过PancakeSwap移除流动性
        IPancakePair pair = IPancakePair(lpPair);
        pair.approve(ROUTER, lp);
        
        (uint256 amountDQ, uint256 amountSOL) = IPancakeRouter02(ROUTER).removeLiquidity(
            address(dq),    // tokenA: DQ
            SOL,            // tokenB: SOL
            lp,             // 移除的LP数量
            0,              // amountAMin
            0,              // amountBMin
            address(this),  // to: 合约地址
            block.timestamp // deadline
        );
        
        // 2. 计算手续费（固定6%）
        uint256 feeDQ = amountDQ * LP_FEE / 100;
        uint256 feeSOL = amountSOL * LP_FEE / 100;
        
        // 3. 手续费100%给手续费地址
        if (feeDQ > 0) {
            dq.transfer(FEE_RECEIVER, feeDQ);
        }
        
        if (feeSOL > 0) {
            IERC20(SOL).safeTransfer(FEE_RECEIVER, feeSOL);
        }
        
        // 4. 转给用户扣除手续费后的DQ和SOL
        uint256 userDQ = amountDQ - feeDQ;
        uint256 userSOL = amountSOL - feeSOL;
        
        if (userDQ > 0) dq.transfer(u, userDQ);
        if (userSOL > 0) IERC20(SOL).safeTransfer(u, userSOL);
        
        emit RmLP(u, lp, feeDQ + feeSOL);
        emit RmLPDetails(u, amountDQ, amountSOL, feeDQ, feeSOL);
    }
    
    // ========== 新增：设置LP交易对地址 ==========
    function setLpPair(address _pair) external onlyO {
        lpPair = _pair;
    }
    
    // ========== 销毁相关功能 ==========
    /// @notice 增加待销毁DQ数量（由DQToken卖出时调用）
    function addPendingBurn(uint256 _amount) external {
        require(msg.sender == address(dq), "!dq");
        pendingBurn += _amount;
        emit PendingBurnAdded(_amount, pendingBurn);
    }
    
    /// @notice 执行销毁：从合约持有的LP中移除流动性并销毁DQ
    /// @param _lpAmount 要移除的LP数量
    function executeBurn(uint256 _lpAmount) external {
        require(lpPair != address(0), "!pair");
        require(_lpAmount > 0, "!amt");
        
        // 获取合约LP余额
        uint256 contractLpBalance = IERC20(lpPair).balanceOf(address(this));
        require(_lpAmount <= contractLpBalance, "insufficient LP");
        
        // 授权Router操作LP
        IPancakePair(lpPair).approve(ROUTER, _lpAmount);
        
        // 移除流动性
        (uint256 dqReceived, uint256 solReceived) = IPancakeRouter02(ROUTER).removeLiquidity(
            address(dq),
            SOL,
            _lpAmount,
            0,  // minDQ
            0,  // minSOL
            address(this),
            block.timestamp
        );
        
        // 销毁DQ
        if (dqReceived > 0) {
            dq.burn(dqReceived);
        }
        
        // 扣减待销毁数量
        if (pendingBurn >= dqReceived) {
            pendingBurn -= dqReceived;
        } else {
            pendingBurn = 0;
        }
        
        emit ExecuteBurn(_lpAmount, dqReceived, solReceived);
    }
    
    /// @notice 查看合约LP余额
    function getContractLpBalance() external view returns (uint256) {
        if (lpPair == address(0)) return 0;
        return IERC20(lpPair).balanceOf(address(this));
    }
    
    /// @notice 接收LP代币（创建交易对后转入）
    function receiveLp(uint256 _amount) external {
        require(_amount > 0, "!amt");
        IERC20(lpPair).transferFrom(msg.sender, address(this), _amount);
        emit LpReceived(msg.sender, _amount);
    }
    
    /// @notice 初始化：移除部分LP获取DQ用于爆块分红
    /// @param _lpAmount 要移除的LP数量
    function initPoolDQ(uint256 _lpAmount) external onlyO {
        require(lpPair != address(0), "!pair");
        require(_lpAmount > 0, "!amt");
        
        // 获取合约LP余额
        uint256 contractLpBalance = IERC20(lpPair).balanceOf(address(this));
        require(_lpAmount <= contractLpBalance, "insufficient LP");
        
        // 授权Router操作LP
        IPancakePair(lpPair).approve(ROUTER, _lpAmount);
        
        // 移除流动性
        (uint256 dqReceived, uint256 solReceived) = IPancakeRouter02(ROUTER).removeLiquidity(
            address(dq),
            SOL,
            _lpAmount,
            0,  // minDQ
            0,  // minSOL
            address(this),
            block.timestamp
        );
        
        // DQ留在合约用于爆块分红
        // SOL留在合约可用于其他用途
        
        emit InitPoolDQ(_lpAmount, dqReceived, solReceived);
    }
    
    /// @notice 添加流动性：将合约持有的DQ和SOL添加到PancakeSwap
    /// @param _dqAmount DQ数量
    /// @param _solAmount SOL数量
    function addLiquidity(uint256 _dqAmount, uint256 _solAmount) external onlyO {
        require(lpPair != address(0), "!pair");
        require(_dqAmount > 0 && _solAmount > 0, "!amt");
        
        // 授权Router操作DQ和SOL
        dq.approve(ROUTER, _dqAmount);
        IERC20(SOL).approve(ROUTER, _solAmount);
        
        // 添加流动性
        (uint256 dqUsed, uint256 solUsed, uint256 liquidity) = IPancakeRouter02(ROUTER).addLiquidity(
            address(dq),
            SOL,
            _dqAmount,
            _solAmount,
            0,  // minDQ
            0,  // minSOL
            address(this),
            block.timestamp
        );
        
        emit AddLiquidity(dqUsed, solUsed, liquidity);
    }
    
    /// @notice 手动提取合约中的SOL（仅管理员）
    function withdrawSOL(uint256 _amount) external onlyO {
        require(_amount > 0, "!amt");
        uint256 bal = IERC20(SOL).balanceOf(address(this));
        require(_amount <= bal, "insufficient SOL");
        IERC20(SOL).safeTransfer(msg.sender, _amount);
    }
    
    /// @notice 手动提取合约中的DQ（仅管理员）
    function withdrawDQ(uint256 _amount) external onlyO {
        require(_amount > 0, "!amt");
        uint256 bal = dq.balanceOf(address(this));
        require(_amount <= bal, "insufficient DQ");
        dq.transfer(msg.sender, _amount);
    }
    
    // ========== 事件 ==========
    event InitPoolDQ(uint256 lpAmount, uint256 dqReceived, uint256 solReceived);
    event AddLiquidity(uint256 dqAmount, uint256 solAmount, uint256 liquidity);
    // ==========================================
    
    // Staking质押（不收Gas费）
    function stake(address u, uint256 a, uint i) external onlyM {
        require(i < 4 && a > 0, "!inv"); require(!isB[u], "bl");
        _cs(u, i); 
        sAmt[u][i] += a; 
        tS[i] += a; 
        sDebt[u][i] = sAmt[u][i] * sA[i] / 1e12;
        emit Stk(u, a, SP[i]);
    }
    
    // 解除质押（不收Gas费）
    function unstake(address u, uint i) external onlyM {
        require(!isB[u], "bl"); _cs(u, i);
        uint256 amt = sAmt[u][i]; require(amt > 0, "!stk");
        sAmt[u][i] = 0; tS[i] -= amt; 
        dq.transfer(u, amt);
        emit Unstk(u, amt, SP[i]);
    }
    
    // 领取Staking奖励（不收Gas费）
    function clmS(address u, uint i) external onlyM { 
        require(!isB[u], "bl"); 
        _cs(u, i); 
    }
    
    function _cs(address u, uint i) internal {
        uint256 a = sAmt[u][i];
        uint256 p = a * sA[i] / 1e12 - sDebt[u][i];
        if (p > 0) { 
            sDebt[u][i] = a * sA[i] / 1e12; 
            dq.transfer(u, p);
            emit ClmStk(u, p);
        }
    }
    
    // ========== 修复：mine()函数添加基金会分配 ==========
    function mine() external onlyM {
        uint256 e = block.timestamp - lt; uint256 b = e / 86400;
        if (b == 0) return; lt = block.timestamp;
        uint256 totR; uint256 totB;
        
        for (uint k = 0; k < b; k++) {
            uint256 cbr = br > MB ? br - k * BD : MB;
            // ========== 修改：基于初始发行量递减计算爆块 ==========
            // 剩余量 = 初始发行量 - 已释放总量
            uint256 remainingSupply = INITIAL_SUPPLY - releasedSupply;
            // 每日释放 = 剩余量 × 1.3%
            uint256 rel = remainingSupply * RT / 1000;
            // 记录已释放
            releasedSupply += rel;
            // ======================================================
            uint256 ra = rel * (100 - cbr) / 100;
            uint256 ba = rel - ra;
            totR += ra; totB += ba; dq.burn(ba);
            
            // ========== 基金会分配 5% ==========
            uint256 foundationAmt = ra * FOUNDATION_RATE / 100;
            if (foundationAmt > 0) {
                dq.transfer(FOUNDATION, foundationAmt);
                emit FoundationDistributed(foundationAmt);
            }
            // ===================================
            
            // ========== D等级分红，每级各1.75%，共14% ==========
            // D1-D8每个等级各分ra的1.75%，等级内平均分配
            for (uint8 lvl = 0; lvl < 8; lvl++) {
                uint256 levelAmt = ra * D_LEVEL_RATE / 10000;  // 每级占ra的1.75%
                if (levelAmt > 0 && dLevelCount[lvl] > 0) {
                    dLevelAccReward[lvl] += levelAmt * 1e12 / dLevelCount[lvl];
                }
            }
            // ================================================
            
            // ========== LP分配 60% ==========
            if (tLP > 0) lA += ra * LP / 100 * 1e12 / tLP;
            // ================================
            
            // ========== NFT分配 15% ==========
            uint256 np = ra * NFT / 100;
            uint256 s0 = dc.totalA() * dc.PRICE_A();
            uint256 s1 = dc.totalB() * dc.PRICE_B();
            uint256 s2 = dc.totalC() * dc.PRICE_C();
            if (s0 > 0) nA[0] += np * 1e12 / s0;
            if (s1 > 0) nA[1] += np * 1e12 / s1;
            if (s2 > 0) nA[2] += np * 1e12 / s2;
            // =================================
            
            // ========== 合伙人分配 6% ==========
            pDA += ra * PT / 100 * 1e12;  // 合伙人固定地址
            // ==================================
        }
        if (br > MB) { br = br - b * BD; if (br < MB) br = MB; }
        emit Mine(totR, totB, block.timestamp);
    }
    // =================================================
    
    function getLP(address u) external view returns (uint256, uint256) { uint256 p = lpS[u] * lA / 1e12 - lpD[u]; return (lpS[u], p); }
    function getStk(address u, uint i) external view returns (uint256, uint256) { uint256 p = sAmt[u][i] * sA[i] / 1e12 - sDebt[u][i]; return (sAmt[u][i], p); }
    
    // 查询合伙人待领取奖励
    function getPartnerReward() external view returns (uint256 dqReward, uint256 solReward) {
        dqReward = pDA / 1e12 - pDD;
        solReward = pBA / 1e12 - pBD;
    }
    
    // Owner提取合约收到的Gas费
    function withdrawBNB() external onlyO {
        uint256 balance = address(this).balance;
        require(balance > 0, "!bal");
        payable(feeRecipient).transfer(balance);
    }
    
    receive() external payable {}
}
