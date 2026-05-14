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
    function burn(uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

interface IDQCard {
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function cardType(uint256 tokenId) external view returns (uint256);
    function mintByOwner(address to, uint256 _type) external;
    function totalA() external view returns (uint256);
    function totalB() external view returns (uint256);
    function totalC() external view returns (uint256);
    function PRICE_A() external pure returns (uint256);
    function PRICE_B() external pure returns (uint256);
    function PRICE_C() external pure returns (uint256);
    function getCardPrice(uint256 _type) external pure returns (uint256);
}

interface IPancakeRouter02 {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external;
    function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity);
}

interface IDQMiningStake {
    function addLP(address _u, uint256 _a, uint256 _t) external;
    function distLP(uint256 _fee) external;
    function distNFT(uint256 _fee) external payable;  // payable，接收BNB手续费
    // distD已删除，团队奖励改为D等级分红
    function distP(uint256 _fee) external;
    function claimLP(address _u) external;
    function claimNft(address _u) external;
    function claimD(address _u) external;
    function claimFee(address _u) external;
    function claimPdq(address _u) external;
    function registerDLevel(address _user, uint8 _level) external;  // 注册D等级
    function claimPbnb(address _u) external;
    function withdraw(address _u, uint256 _a) external;
    function rmLP(address _u) external;
    function stake(address _u, uint256 _a, uint _i) external;
    function unstake(address _u, uint _i) external;
    function clmS(address _u, uint _i) external;
    function mine() external;
}

contract DQMining is ReentrancyGuard {

    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    IDQToken public constant dqToken = IDQToken(0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B);
    IDQCard public dqCard;
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public constant STAKE_OP = 0x7cc3260b1E4e1d830A6a92A3b2F77257fbab169F;
    address public constant INS = 0x2db993B862969040Cd971Df8Fd2a2C80EC285203;
    address public constant BUY_FEE = 0x1850933c0d64db3A56476F5Bdc4191BCFd242e30;
    
    // ========== 新增：DAO地址常量 ==========
    address public constant DAO = 0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852;
    // =====================================

    address public stakeContract;

    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public constant DAILY_LIMIT = 1 ether;
    uint256 public startTime;
    uint256 public currentPhase = 1;
    uint256 public constant PHASE_STEP = 5 ether;

    uint256[4] public nodePrices = [0, 500 ether, 1500 ether, 5000 ether];
    uint256[4] public nodeReq = [0, 5, 10, 20];
    uint256 public constant DIRECT_RATE = 30;
    uint256 public constant SEE_RATE = 15;
    uint256 public constant DAO_RATE = 10;
    uint256 public constant INS_RATE = 7;
    uint256 public constant OP_RATE = 8;
    uint256[6] public mgrThresh = [100, 200, 600, 2000, 6000, 20000];
    uint256[6] public mgrRates = [5, 10, 15, 20, 25, 30];
    uint256 public constant ENERGY_MUL = 3;
    
    // ========== 动态奖励提现手续费配置 ==========
    uint256 public constant WITHDRAW_FEE = 10;        // 提现手续费10%
    uint256 public constant FEE_NODE_RATE = 40;       // 手续费的40%给NFT节点
    uint256 public constant FEE_PARTNER_RATE = 30;    // 手续费的30%给合伙人
    uint256 public constant FEE_FOUNDATION_RATE = 30; // 手续费的30%给基金会
    uint256 public constant CLAIM_BNB_FEE = 0.00005 ether;  // 领取手续费收益需支付的BNB
    // ==============================================

    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;
        uint256 directSales;
        uint8 dLevel;
        uint256 validAddressCount;  // 线下所有有入金的用户数量
        uint256 pendingSOL;         // 待提现的动态奖励余额
        EnumerableSet.AddressSet children;
    }

    // ========== D等级阈值（线下有入金用户数量） ==========
    // D1: 30, D2: 120, D3: 360, D4: 1000, D5: 4000, D6: 10000, D7: 15000, D8: 30000
    uint256[8] public dLevelThresh = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];
    // ==================================================

    mapping(address => User) internal users;
    address[] public allUsers;

    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public dailyDeposit;
    mapping(address => bool) public depositWhiteList;
    
    // ========== 提现手续费累计奖励 ==========
    uint256 public nftPendingSOL;        // NFT节点累计SOL奖励
    uint256 public partnerPendingSOL;    // 合伙人累计SOL奖励
    // ======================================

    event Register(address indexed u, address indexed r);
    event Deposit(address indexed u, uint256 a);
    event WhiteListSet(address indexed u, bool s);
    event SwapSOLForDQ(address indexed u, uint256 s, uint256 d);
    event SwapAndAddLP(address indexed u, uint256 s, uint256 d, uint256 l);
    event SellDQ(address indexed u, uint256 d, uint256 s, uint256 f);
    event DQCardSet(address indexed oldAddr, address indexed newAddr);
    event NodeLevelSet(address indexed u, uint8 level);
    event DLevelSet(address indexed u, uint8 dLevel);
    // ========== 新增事件 ==========
    event PhaseAdvanced(uint256 oldPhase, uint256 newPhase, uint256 newLimit);
    // ================================

    modifier onlyOwner() { require(msg.sender == OWNER, "!owner"); _; }
    modifier onlyReg() { require(users[msg.sender].referrer != address(0) || msg.sender == OWNER, "!reg"); _; }

    constructor() {
        startTime = block.timestamp;
        users[OWNER].referrer = address(0);
        allUsers.push(OWNER);
        dqCard = IDQCard(0x1857aCeDf9b73163D791eb2F0374a328416291a1);
    }

    function setStakeContract(address _a) external onlyOwner { stakeContract = _a; }
    function setDepositWhiteList(address _u, bool _s) external onlyOwner { depositWhiteList[_u] = _s; emit WhiteListSet(_u, _s); }
    
    function setDQCard(address _addr) external onlyOwner {
        require(_addr != address(0), "!addr");
        address oldAddr = address(dqCard);
        dqCard = IDQCard(_addr);
        emit DQCardSet(oldAddr, _addr);
    }

    // ========== 新增：nextPhase() 函数 ==========
    function nextPhase() external onlyOwner {
        uint256 oldPhase = currentPhase;
        currentPhase++;
        emit PhaseAdvanced(oldPhase, currentPhase, getDailyLimit());
    }
    // ===========================================

    function register(address _r) external {
        require(_r != msg.sender && users[msg.sender].referrer == address(0), "!inv");
        if (_r != address(0)) {
            require(users[_r].referrer != address(0) || _r == OWNER, "!rref");
            users[_r].directCount++;
            users[_r].children.add(msg.sender);
        }
        users[msg.sender].referrer = _r;
        allUsers.push(msg.sender);
        emit Register(msg.sender, _r);
    }

    function importUsers(address[] calldata _u, address[] calldata _r) external onlyOwner {
        require(_u.length == _r.length, "!len");
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer != address(0)) continue;
            users[_u[i]].referrer = _r[i];
            allUsers.push(_u[i]);
            if (_r[i] != address(0) && users[_r[i]].referrer != address(0)) {
                users[_r[i]].directCount++;
                users[_r[i]].children.add(_u[i]);
            }
            emit Register(_u[i], _r[i]);
        }
    }

    // 管理员批量设置用户等级（S1-S6）
    function setNodesLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length, "!len");
        for (uint i = 0; i < _u.length; i++) {
            require(_lvl[i] >= 1 && _lvl[i] <= 6, "!level");  // S1-S6
            users[_u[i]].level = _lvl[i];
            emit NodeLevelSet(_u[i], _lvl[i]);
        }
    }
    
    // 管理员单个设置用户等级（S1-S6）
    function setUserLevel(address _u, uint8 _lvl) external onlyOwner {
        require(_lvl >= 1 && _lvl <= 6, "!level");  // S1-S6
        users[_u].level = _lvl;
        emit NodeLevelSet(_u, _lvl);
    }

    event DLevelSet(address indexed u, uint8 dLevel);
    
    function setUserDLevel(address _u, uint8 _lvl) external onlyOwner {
        require(_lvl >= 0 && _lvl <= 8, "!Dlevel");
        users[_u].dLevel = _lvl;
        emit DLevelSet(_u, _lvl);
    }
    
    function setNodesDLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length, "!len");
        for (uint i = 0; i < _u.length; i++) {
            require(_lvl[i] <= 8, "!Dlevel");
            users[_u[i]].dLevel = _lvl[i];
            emit DLevelSet(_u[i], _lvl[i]);
        }
    }

    function importNodes(address[] calldata _u, uint8[] calldata _t) external onlyOwner {
        require(_u.length == _t.length, "!len");
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer == address(0)) {
                users[_u[i]].referrer = OWNER;
                allUsers.push(_u[i]);
                emit Register(_u[i], OWNER);
            }
            if (_t[i] >= 1 && _t[i] <= 3) {
                dqCard.mintByOwner(_u[i], _t[i]);
                users[_u[i]].level = _t[i];
            }
        }
    }

    function depositSOL(uint256 _a) external nonReentrant onlyReg {
        require(_a >= INVEST_MIN && !isBlacklisted[msg.sender], "!inv");
        if (!depositWhiteList[msg.sender]) {
            uint256 lim = getDailyLimit();
            require(dailyDeposit[msg.sender] + _a <= lim, "!lim");
            dailyDeposit[msg.sender] += _a;
        }
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        User storage u = users[msg.sender];
        
        // ========== 首次入金时更新上级有效用户计数 ==========
        bool isFirstDeposit = (u.totalInvest == 0);
        // ============================================================
        
        u.totalInvest += _a;
        u.energy += _a * ENERGY_MUL;
        uint256 dyn = _a * 50 / 100;
        _distDyn(msg.sender, dyn);
        uint256 lp = _a - dyn;
        uint256 directLp = lp / 2;
        uint256 swapLp = lp / 2;
        if (stakeContract != address(0)) {
            IDQMiningStake(stakeContract).addLP(msg.sender, directLp, block.timestamp);
            if (swapLp > 0) _swapAndAddLP(msg.sender, swapLp);
        }
        if (u.referrer != address(0)) _updateTeam(u.referrer, _a);
        
        // ========== 首次入金时更新所有上级的有效用户计数 ==========
        if (isFirstDeposit) {
            _updateValidAddressCount(msg.sender);
        }
        // ============================================================
        
        emit Deposit(msg.sender, _a);
    }

    function _swapAndAddLP(address _u, uint256 _a) internal {
        address[] memory p = new address[](2);
        p[0] = SOL;
        p[1] = address(dqToken);
        // 注意：不使用getAmountsOut计算期望值，因为DQToken有手续费机制
        // 设置最小期望为0，让实际数量由市场决定
        IERC20(SOL).approve(ROUTER, _a);
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(_a, 0, p, address(this), block.timestamp + 300);
        uint256 sBal = IERC20(SOL).balanceOf(address(this));
        uint256 dBal = dqToken.balanceOf(address(this));
        if (sBal > 0 && dBal > 0) {
            IERC20(address(dqToken)).approve(ROUTER, dBal);
            (, , uint256 lp) = IPancakeRouter02(ROUTER).addLiquidity(SOL, address(dqToken), sBal, dBal, 0, 0, address(this), block.timestamp + 300);
            if (lp > 0 && stakeContract != address(0)) IDQMiningStake(stakeContract).addLP(_u, lp, block.timestamp);
        }
    }

    function getDailyLimit() public view returns (uint256) {
        uint256 l = DAILY_LIMIT + (currentPhase - 1) * PHASE_STEP;
        return l > 200 ether ? 200 ether : l;
    }

    function _distDyn(address _u, uint256 _a) internal {
        address ref = users[_u].referrer;
        if (ref == address(0)) return;
        uint256 direct = _a * DIRECT_RATE / 100;
        if (_canClaim(ref)) {
            users[ref].energy -= direct;
            users[ref].pendingSOL += direct;  // 存入余额，不直接转账
            users[ref].directSales += _a;
        }
        _distSee(_u, ref, _a, 1);
        
        // ========== 修复：DAO补贴直接分配给DAO地址 ==========
        IERC20(SOL).safeTransfer(DAO, _a * DAO_RATE / 100);
        // ==================================================
        
        IERC20(SOL).safeTransfer(INS, _a * INS_RATE / 100);
        IERC20(SOL).safeTransfer(OP, _a * OP_RATE / 100);
        
        // ========== 新增：管理奖分配（基于动态分币的30%） ==========
        _distMgr(_u, _a * MGR_RATE / 100);
        // ============================================================
    }
    
    // ========== 修复：管理奖级差分配函数 ==========
    uint256 public constant MGR_RATE = 30;  // 管理奖费率30%（管理奖池的30%，即入金的15%）
    
    // 级差分配：低等级先拿完整份额，高等级拿差额，确保30%全部分配
    function _distMgr(address _u, uint256 _a) internal {
        // 每个等级只记录第一个出现的用户（避免重复）
        address[6] memory levelUser;  // levelUser[0] = S1, levelUser[5] = S6
        bool[6] memory levelFound;
        
        // 1. 遍历链条，记录每个等级的第一个用户
        address cur = users[_u].referrer;
        while (cur != address(0)) {
            uint8 lvl = users[cur].level;
            if (lvl >= 1 && lvl <= 6 && !levelFound[lvl - 1] && _canClaim(cur)) {
                levelUser[lvl - 1] = cur;
                levelFound[lvl - 1] = true;
            }
            cur = users[cur].referrer;
        }
        
        // 2. 从低到高分配（S1→S6），低等级拿完整份额，高等级拿差额
        uint8 prevRate = 0;
        for (uint8 lvl = 1; lvl <= 6; lvl++) {
            if (!levelFound[lvl - 1]) continue;
            
            uint8 curRate = mgrRates[lvl - 1];
            uint8 diffRate = curRate - prevRate;
            
            if (diffRate > 0) {
                uint256 mgrR = _a * diffRate / 100;
                if (mgrR > 0) {
                    address userAddr = levelUser[lvl - 1];
                    users[userAddr].energy -= mgrR;
                    users[userAddr].pendingSOL += mgrR;  // 存入余额，不直接转账
                    emit MgrReward(userAddr, mgrR, lvl, diffRate);
                }
            }
            prevRate = curRate;
        }
    }
    
    event MgrReward(address indexed u, uint256 amount, uint8 level, uint8 diffRate);
    // ===========================================

    // ========== 修复：见点奖递进式层数逻辑 ==========
    function _distSee(address _u, address _r, uint256 _a, uint8 _d) internal {
        if (_r == address(0) || _d > 15) return;
        User storage ru = users[_r];
        
        // 递进式层数：推1拿3层，推2拿6层，推3拿9层，推4拿12层，推5拿15层
        uint8 maxD;
        if (ru.directCount >= 5) maxD = 15;
        else if (ru.directCount >= 4) maxD = 12;
        else if (ru.directCount >= 3) maxD = 9;
        else if (ru.directCount >= 2) maxD = 6;
        else if (ru.directCount >= 1) maxD = 3;
        else maxD = 0;
        
        if (_d <= maxD && _canClaim(_r)) {
            uint256 see = _a * SEE_RATE / 100 / 15;
            users[_r].energy -= see;
            users[_r].pendingSOL += see;  // 存入余额，不直接转账
        }
        if (ru.referrer != address(0)) _distSee(_u, ru.referrer, _a, _d + 1);
    }
    // ==============================================

    // ========== 删除冗余的 _findDAO() 函数 ==========
    // 原函数已删除，DAO补贴直接分配给固定DAO地址
    // ================================================

    // ========== 修改：_updateTeam只更新团队业绩和等级，不分配管理奖 ==========
    // 管理奖分配已移到_distMgr函数中，基于动态分币部分计算
    function _updateTeam(address _u, uint256 _a) internal {
        User storage u = users[_u];
        u.teamInvest += _a;
        uint256 small = _calcSmallTeam(_u);
        uint8 newLvl = 0;
        for (uint8 i = 0; i < mgrThresh.length; i++) {
            if (small >= mgrThresh[i] * 1 ether) newLvl = i + 1;
        }
        if (newLvl > u.level) { u.level = newLvl; }
        // 管理奖分配已移到_distMgr函数中
        _updateDLevel(_u);
        if (u.referrer != address(0)) _updateTeam(u.referrer, _a);
    }
    // ===========================================================================

    function _calcSmallTeam(address _u) internal view returns (uint256) {
        if (users[_u].children.length() == 0) return 0;
        uint256 total = users[_u].teamInvest;
        uint256 maxChild = 0;
        for (uint i = 0; i < users[_u].children.length(); i++) {
            uint256 child = users[users[_u].children.at(i)].teamInvest;
            if (child > maxChild) maxChild = child;
        }
        return total > maxChild ? total - maxChild : 0;
    }

    // ========== D等级基于线下有入金用户数量 ==========
    function _updateDLevel(address _u) internal {
        User storage u = users[_u];
        uint8 newD = 0;
        for (uint8 i = 0; i < 8; i++) {
            if (u.validAddressCount >= dLevelThresh[i]) {
                newD = i + 1;
            }
        }
        if (newD > u.dLevel) {
            u.dLevel = newD;
            emit DLevelUpdated(_u, newD, u.validAddressCount);
            
            // ========== 新增：同步D等级到Stake合约 ==========
            if (stakeContract != address(0)) {
                IDQMiningStake(stakeContract).registerDLevel(_u, newD);
            }
            // ==============================================
        }
    }
    
    // 用户首次入金时，更新其所有上级（线下所有有入金用户数量统计）
    function _updateValidAddressCount(address _u) internal {
        address cur = users[_u].referrer;
        while (cur != address(0)) {
            users[cur].validAddressCount++;
            _updateDLevel(cur);  // 更新D等级
            cur = users[cur].referrer;
        }
    }
    
    event DLevelUpdated(address indexed u, uint8 dLevel, uint256 validCount);
    // ====================================================

    function _canClaim(address _u) internal view returns (bool) {
        if (isBlacklisted[_u]) return false;
        uint256 bal = dqCard.balanceOf(_u);
        if (bal == 0) return true;
        uint256 maxT = 0;
        for (uint i = 0; i < bal; i++) {
            uint256 t = dqCard.cardType(dqCard.tokenOfOwnerByIndex(_u, i));
            if (t > maxT) maxT = t;
        }
        return users[_u].directCount >= nodeReq[maxT];
    }

    function buyNode(uint256 _t) external nonReentrant {
        require(_t >= 1 && _t <= 3, "!t");
        require(nodePrices[_t] > 0, "!price");
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), nodePrices[_t]);
        dqCard.mintByOwner(msg.sender, _t);
        address ref = users[msg.sender].referrer;
        if (ref != address(0)) IERC20(USDT).safeTransfer(ref, nodePrices[_t] * 10 / 100);
        IERC20(USDT).safeTransfer(FOUNDATION, nodePrices[_t] * 90 / 100);
    }

    function addToBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = true; }
    function removeFromBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = false; }

    function approveRouter() external onlyOwner {
        IERC20(SOL).approve(ROUTER, type(uint256).max);
        IERC20(address(dqToken)).approve(ROUTER, type(uint256).max);
    }

    function swapSOLForDQ(uint256 _s, uint256 _minDq) external nonReentrant returns (uint256) {
        require(_s > 0, "!a");
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _s);
        uint256 buyFee = _s * 90 / 100;
        uint256 swapAmt = _s - buyFee;
        IERC20(SOL).approve(ROUTER, swapAmt);
        address[] memory p = new address[](2);
        p[0] = SOL;
        p[1] = address(dqToken);
        uint256 dqAmt = IPancakeRouter02(ROUTER).getAmountsOut(swapAmt, p)[1];
        require(dqAmt >= _minDq, "!slip");
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(swapAmt, _minDq, p, msg.sender, block.timestamp + 300);
        IERC20(SOL).safeTransfer(BUY_FEE, buyFee);
        emit SwapSOLForDQ(msg.sender, _s, dqAmt);
        return dqAmt;
    }

    function addLiquidityForUser(uint256 _s, uint256 _minLp) external nonReentrant returns (uint256) {
        require(_s > 0 && stakeContract != address(0), "!a");
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _s);
        address[] memory p = new address[](2);
        p[0] = SOL;
        p[1] = address(dqToken);
        uint256 dqAmt = IPancakeRouter02(ROUTER).getAmountsOut(_s / 2, p)[1];
        IERC20(SOL).approve(ROUTER, _s / 2);
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(_s / 2, _minLp, p, address(this), block.timestamp + 300);
        (, , uint256 lp) = IPancakeRouter02(ROUTER).addLiquidity(SOL, address(dqToken), IERC20(SOL).balanceOf(address(this)), dqToken.balanceOf(address(this)), 0, 0, address(this), block.timestamp + 300);
        require(lp >= _minLp, "!slip");
        IDQMiningStake(stakeContract).addLP(msg.sender, lp, block.timestamp);
        emit SwapAndAddLP(msg.sender, _s, dqAmt, lp);
        return lp;
    }

    /// @notice 卖DQ换SOL，合约内直接销毁DQ，从合约SOL池给用户
    /// @param _dq 卖出的DQ数量
    /// @param _minSol 最少得到的SOL数量（滑点保护）
    /// @return solOut 用户实际得到的SOL数量
    /// @dev 卖出逻辑：94%销毁 + 6%手续费，用户得到94%对应的SOL
    /// 例如：卖100 DQ -> 94 DQ销毁，6 DQ手续费，用户得到94 DQ对应的SOL
    function sellDQForSOL(uint256 _dq, uint256 _minSol) external nonReentrant returns (uint256 solOut) {
        require(_dq > 0, "!zero");
        
        // 1. 从用户转入DQ
        dqToken.transferFrom(msg.sender, address(this), _dq);
        
        // 2. 94%销毁到黑洞地址
        uint256 burnAmount = _dq * 94 / 100;
        dqToken.burn(burnAmount);
        
        // 3. 6%手续费转给分配合约（单币质押50% + 手续费地址50%）
        uint256 feeAmount = _dq * 6 / 100;
        if (stakeContract != address(0)) {
            dqToken.transfer(stakeContract, feeAmount);
            IDQMiningStake(stakeContract).distDQFee(feeAmount);
        }
        
        // 4. 从PancakeSwap获取94% DQ对应多少SOL（只查价格，不实际交易）
        address[] memory path = new address[](2);
        path[0] = address(dqToken);
        path[1] = SOL;
        
        uint256 dqForPrice = _dq * 94 / 100;
        uint256[] memory amounts = IPancakeRouter02(ROUTER).getAmountsOut(dqForPrice, path);
        solOut = amounts[1];
        
        require(solOut >= _minSol, "!slip");
        require(IERC20(SOL).balanceOf(address(this)) >= solOut, "!sol");
        
        // 5. 从合约SOL池转给用户（94%对应的SOL）
        IERC20(SOL).safeTransfer(msg.sender, solOut);
        
        emit SellDQ(msg.sender, _dq, solOut, burnAmount, feeAmount);
    }
    
    event SellDQ(address indexed user, uint256 dqAmount, uint256 solOut, uint256 burned, uint256 fee);

    function claimLP() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimLP(msg.sender); }
    function claimNft() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimNft(msg.sender); }
    function claimDTeam() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimD(msg.sender); }
    function claimFee() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimFee(msg.sender); }
    function claimPartnerDQ() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimPdq(msg.sender); }
    function claimPartnerBNB() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).claimPbnb(msg.sender); }
    function withdraw(uint256 _a) external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).withdraw(msg.sender, _a); }
    function removeLP() external nonReentrant { if (stakeContract != address(0)) IDQMiningStake(stakeContract).rmLP(msg.sender); }
    function mineBlock() external nonReentrant onlyOwner { if (stakeContract != address(0)) IDQMiningStake(stakeContract).mine(); }

    function stakeDQ(uint256 _amount, uint _periodIndex) external nonReentrant {
        if (stakeContract != address(0)) {
            dqToken.transferFrom(msg.sender, stakeContract, _amount);
            IDQMiningStake(stakeContract).stake(msg.sender, _amount, _periodIndex);
        }
    }

    function unstakeDQ(uint _periodIndex) external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).unstake(msg.sender, _periodIndex);
    }

    function claimStakeReward(uint _periodIndex) external nonReentrant {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).clmS(msg.sender, _periodIndex);
    }

    function distributeFeeToLP(uint256 _amount) external {
        if (_amount > 0 && stakeContract != address(0)) {
            IERC20(SOL).safeTransfer(stakeContract, _amount);
            IDQMiningStake(stakeContract).distLP(_amount);
        }
    }

    function distributeFeeToNFT(uint256 _amount) external {
        if (_amount > 0 && stakeContract != address(0)) IDQMiningStake(stakeContract).distNFT(_amount);
    }

    // distributeFeeToDTeam已删除，团队奖励改为D等级分红，在mine函数中自动处理

    // 保留原有函数，但建议使用 nextPhase()
    function advancePhase() external onlyOwner { currentPhase++; }

    function adminWithdrawDQ(uint256 _a) external onlyOwner { dqToken.transfer(OWNER, _a); }
    function adminWithdrawSOL(uint256 _a) external onlyOwner { IERC20(SOL).safeTransfer(OWNER, _a); }

    function getUser(address _u) external view returns (
        address referrer, 
        uint256 directCount, 
        uint8 level, 
        uint256 totalInvest, 
        uint256 teamInvest, 
        uint256 energy, 
        uint8 dLevel,
        uint256 validAddressCount,
        uint256 pendingSOL
    ) {
        User storage us = users[_u];
        return (us.referrer, us.directCount, us.level, us.totalInvest, us.teamInvest, us.energy, us.dLevel, us.validAddressCount, us.pendingSOL);
    }
    
    // ========== 动态奖励提现功能 ==========
    // 查询待提现余额
    function getPendingSOL(address _u) external view returns (uint256) {
        return users[_u].pendingSOL;
    }
    
    // 用户提现动态奖励（扣10%手续费）
    function claimReward() external nonReentrant {
        User storage u = users[msg.sender];
        require(u.pendingSOL > 0, "!bal");
        require(!isBlacklisted[msg.sender], "bl");
        
        uint256 amount = u.pendingSOL;
        u.pendingSOL = 0;
        
        // 计算10%手续费
        uint256 fee = amount * WITHDRAW_FEE / 100;
        uint256 userAmount = amount - fee;
        
        // 手续费分配：40% NFT，30% 合伙人，30% 基金会
        uint256 feeNft = fee * FEE_NODE_RATE / 100;
        uint256 feePartner = fee * FEE_PARTNER_RATE / 100;
        uint256 feeFoundation = fee * FEE_FOUNDATION_RATE / 100;
        
        // 累计到奖励池
        nftPendingSOL += feeNft;
        partnerPendingSOL += feePartner;
        
        // 基金会直接转账
        IERC20(SOL).safeTransfer(FOUNDATION, feeFoundation);
        
        // 用户到账
        IERC20(SOL).safeTransfer(msg.sender, userAmount);
        
        emit ClaimReward(msg.sender, userAmount, fee);
    }
    
    // NFT持有者领取SOL奖励（通过Stake合约，需支付BNB手续费）
    function claimNftSOL() external payable nonReentrant {
        require(msg.value >= CLAIM_BNB_FEE, "!bnb");  // 需支付BNB手续费
        require(stakeContract != address(0), "!stake");
        uint256 amount = nftPendingSOL;
        require(amount > 0, "!bal");
        nftPendingSOL = 0;
        IERC20(SOL).safeTransfer(stakeContract, amount);
        IDQMiningStake(stakeContract).distNFT{value: msg.value}(amount);
    }
    
    // 合伙人领取SOL奖励（需支付BNB手续费）
    function claimPartnerSOL() external payable nonReentrant {
        require(msg.value >= CLAIM_BNB_FEE, "!bnb");  // 需支付BNB手续费
        uint256 amount = partnerPendingSOL;
        require(amount > 0, "!bal");
        partnerPendingSOL = 0;
        // 合伙人地址固定，BNB转到基金会
        address partnerAddr = IDQMiningStake(stakeContract).PARTNER();
        IERC20(SOL).safeTransfer(partnerAddr, amount);
        payable(FOUNDATION).transfer(msg.value);  // BNB给基金会
        emit ClaimPartnerSOL(partnerAddr, amount);
    }
    
    // 查询BNB余额
    function getBnbBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    event ClaimReward(address indexed user, uint256 amount, uint256 fee);
    event ClaimPartnerSOL(address indexed partner, uint256 amount);
    event ClaimPartnerBNB(address indexed partner, uint256 amount);
    // ======================================

    function getTeamSize(address _u) external view returns (uint256) { return users[_u].children.length(); }

    receive() external payable {}
}
