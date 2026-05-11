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
    function distNFT(uint256 _fee) external;
    function distD(uint256 _fee) external;
    function distP(uint256 _fee) external;
    function claimLP(address _u) external;
    function claimNft(address _u) external;
    function claimD(address _u) external;
    function claimFee(address _u) external;
    function claimPdq(address _u) external;
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
    IDQCard public constant dqCard = IDQCard(0x1857aCeDf9b73163D791eb2F0374a328416291a1);
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public constant STAKE_OP = 0x7cc3260b1E4e1d830A6a92A3b2F77257fbab169F;
    address public constant INS = 0x2db993B862969040Cd971Df8Fd2a2C80EC285203;
    address public constant BUY_FEE = 0x1850933c0d64db3A56476F5Bdc4191BCFd242e30;

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

    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;
        uint256 directSales;
        uint8 dLevel;
        EnumerableSet.AddressSet children;
    }

    mapping(address => User) internal users;
    address[] public allUsers;

    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public dailyDeposit;
    mapping(address => bool) public depositWhiteList;

    event Register(address indexed u, address indexed r);
    event Deposit(address indexed u, uint256 a);
    event WhiteListSet(address indexed u, bool s);
    event SwapSOLForDQ(address indexed u, uint256 s, uint256 d);
    event SwapAndAddLP(address indexed u, uint256 s, uint256 d, uint256 l);
    event SellDQ(address indexed u, uint256 d, uint256 s, uint256 f);

    modifier onlyOwner() { require(msg.sender == OWNER, "!owner"); _; }
    modifier onlyReg() { require(users[msg.sender].referrer != address(0) || msg.sender == OWNER, "!reg"); _; }

    constructor() {
        startTime = block.timestamp;
        users[OWNER].referrer = address(0);
        allUsers.push(OWNER);
    }

    function setStakeContract(address _a) external onlyOwner { stakeContract = _a; }
    function setDepositWhiteList(address _u, bool _s) external onlyOwner { depositWhiteList[_u] = _s; emit WhiteListSet(_u, _s); }

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
        emit Deposit(msg.sender, _a);
    }

    function _swapAndAddLP(address _u, uint256 _a) internal {
        address[] memory p = new address[](2);
        p[0] = SOL;
        p[1] = address(dqToken);
        uint256 dqAmt = IPancakeRouter02(ROUTER).getAmountsOut(_a, p)[1];
        IERC20(SOL).approve(ROUTER, _a);
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(_a, dqAmt / 2, p, address(this), block.timestamp + 300);
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
            IERC20(SOL).safeTransfer(ref, direct);
            users[ref].directSales += _a;
        }
        _distSee(_u, ref, _a, 1);
        address dao = _findDAO(ref);
        if (dao != address(0) && _canClaim(dao)) {
            uint256 daoR = _a * DAO_RATE / 100;
            users[dao].energy -= daoR;
            IERC20(SOL).safeTransfer(dao, daoR);
        }
        IERC20(SOL).safeTransfer(INS, _a * INS_RATE / 100);
        IERC20(SOL).safeTransfer(OP, _a * OP_RATE / 100);
    }

    function _distSee(address _u, address _r, uint256 _a, uint8 _d) internal {
        if (_r == address(0) || _d > 15) return;
        User storage ru = users[_r];
        uint8 maxD = ru.directCount >= 5 ? 15 : (ru.directCount >= 1 ? 3 : 0);
        if (_d <= maxD && _canClaim(_r)) {
            uint256 see = _a * SEE_RATE / 100 / 15;
            users[_r].energy -= see;
            IERC20(SOL).safeTransfer(_r, see);
        }
        if (ru.referrer != address(0)) _distSee(_u, ru.referrer, _a, _d + 1);
    }

    function _findDAO(address _u) internal view returns (address) {
        User storage u = users[_u];
        if (u.level >= 6 || u.level >= 3) return _u;
        if (u.referrer != address(0)) return _findDAO(u.referrer);
        return address(0);
    }

    function _updateTeam(address _u, uint256 _a) internal {
        User storage u = users[_u];
        u.teamInvest += _a;
        uint256 small = _calcSmallTeam(_u);
        uint8 newLvl = 0;
        for (uint8 i = 0; i < mgrThresh.length; i++) {
            if (small >= mgrThresh[i] * 1 ether) newLvl = i + 1;
        }
        if (newLvl > u.level) { u.level = newLvl; }
        if (u.level > 0 && _canClaim(_u)) {
            uint256 mgrR = _a * mgrRates[u.level - 1] / 100;
            if (mgrR > 0) { users[_u].energy -= mgrR; IERC20(SOL).safeTransfer(_u, mgrR); }
        }
        _updateDLevel(_u);
        if (u.referrer != address(0)) _updateTeam(u.referrer, _a);
    }

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

    function _updateDLevel(address _u) internal {
        User storage u = users[_u];
        uint8 newD = 0;
        for (uint8 i = 0; i < 8; i++) {
            if (u.directCount >= (i == 0 ? 30 : i == 1 ? 120 : i == 2 ? 360 : i == 3 ? 1000 : i == 4 ? 4000 : i == 5 ? 10000 : i == 6 ? 15000 : 30000)) newD = i + 1;
        }
        if (newD > u.dLevel) u.dLevel = newD;
    }

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
        IPancakeRouter02(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(_s / 2, dqAmt / 2, p, address(this), block.timestamp + 300);
        (, , uint256 lp) = IPancakeRouter02(ROUTER).addLiquidity(SOL, address(dqToken), IERC20(SOL).balanceOf(address(this)), dqToken.balanceOf(address(this)), 0, 0, address(this), block.timestamp + 300);
        require(lp >= _minLp, "!slip");
        IDQMiningStake(stakeContract).addLP(msg.sender, lp, block.timestamp);
        emit SwapAndAddLP(msg.sender, _s, dqAmt, lp);
        return lp;
    }

    function sellDQForSOL(uint256 _d, uint256 _minSol) external nonReentrant returns (uint256) {
        require(_d > 0, "!a");
        dqToken.transferFrom(msg.sender, address(this), _d);
        dqToken.burn(_d);
        uint256 solBal = IERC20(SOL).balanceOf(address(this));
        require(solBal > 0, "!sol");
        uint256 solOut = solBal * _d / dqToken.totalSupply();
        require(solOut >= _minSol, "!slip");
        uint256 fee = solOut * 6 / 100;
        uint256 stakeFee = fee * 50 / 100;
        uint256 opFee = fee - stakeFee;
        if (stakeFee > 0 && stakeContract != address(0)) {
            IERC20(SOL).safeTransfer(stakeContract, stakeFee);
            IDQMiningStake(stakeContract).distLP(stakeFee);
        }
        IERC20(SOL).safeTransfer(STAKE_OP, opFee);
        IERC20(SOL).safeTransfer(msg.sender, solOut - fee);
        emit SellDQ(msg.sender, _d, solOut - fee, fee);
        return solOut - fee;
    }

    // 代理到质押合约
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

    function distributeFeeToDTeam(uint256 _amount) external {
        if (_amount > 0 && stakeContract != address(0)) IDQMiningStake(stakeContract).distD(_amount);
    }

    function advancePhase() external onlyOwner { currentPhase++; }

    function adminWithdrawDQ(uint256 _a) external onlyOwner { dqToken.transfer(OWNER, _a); }
    function adminWithdrawSOL(uint256 _a) external onlyOwner { IERC20(SOL).safeTransfer(OWNER, _a); }

    function getUser(address _u) external view returns (address, uint256, uint8, uint256, uint256, uint256, uint8) {
        User storage us = users[_u];
        return (us.referrer, us.directCount, us.level, us.totalInvest, us.teamInvest, us.energy, us.dLevel);
    }

    function getTeamSize(address _u) external view returns (uint256) { return users[_u].children.length(); }

    receive() external payable {}
}
