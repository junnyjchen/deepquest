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
contract DQMiningStake is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    IDQToken public constant dq = IDQToken(0xeD82B38bE28bB1552d0792b978e4361aEf46283e);
    IDQCard public dc;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public mc;
    address public miningContract;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    uint256 public constant FOUNDATION_RATE = 5;
    uint256 public claimGasFee = 0.00005 ether;
    address public feeRecipient = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant FEE_RECEIVER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    uint256 public constant LP = 60;
    address public lpPair;
    uint256 public constant NFT = 15;
    uint256 public constant PT = 6;
    uint256 public constant RT = 13;
    uint256 public constant IB = 80;
    uint256 public constant MB = 30;
    uint256 public constant BD = 5;
    uint256 public constant F60 = 20;
    uint256 public constant F180 = 10;
    address public constant PARTNER = 0x803B79B608455808C2f752c588804c3F5bF676a3;
    uint256 public constant D_LEVEL_RATE = 175;
    uint256[8] public dLevelCount;
    mapping(uint8 => mapping(address => bool)) public isDLevel;
    mapping(address => uint8) public userDLevel;
    mapping(address => uint256) public dLevelRewardDebt;
    uint256[8] public dLevelAccReward;
    uint256 public constant INITIAL_SUPPLY = 1000 * 10**8 * 10**18;
    uint256 public releasedSupply;
    function setLpPair(address _pair) external onlyO {
        lpPair = _pair;
    }
    uint256[] public SP = [30, 90, 180, 360];
    uint256[4] public sA;
    uint256[4] public tS;
    mapping(address => uint256) public lpS;
    mapping(address => uint256) public lpD;
    mapping(address => uint256) public lpT;
    uint256 public lA;
    uint256 public tLP;
    uint256 public pDA;
    uint256 public pBA;
    uint256 public pDD;
    uint256 public pBD;
    uint256[8] public dT;
    uint256[8] public dA;
    uint256 public br = IB;
    uint256 public lt;
    uint256[3] public nA;
    uint256[3] public fA;
    mapping(uint256 => uint256) public lF;
    uint256 public fp;
    mapping(address => uint256) public nD0;
    mapping(address => uint256) public nD1;
    mapping(address => uint256) public nD2;
    mapping(address => uint256) public dd;
    mapping(address => uint8) public dl;
    mapping(address => uint256[4]) public sAmt;
    mapping(address => uint256[4]) public sDebt;
    mapping(address => bool) public isB;
    event ClaimNft(address indexed u, uint256 a);
    event ClaimDTeam(address indexed u, uint256 a);
    event ClaimPdq(address indexed u, uint256 a);
    event ClaimPbnb(address indexed u, uint256 a);
    event ClaimFee(address indexed u, uint256 a);
    event Withdraw(address indexed u, uint256 a, uint256 f);
    event Stk(address indexed u, uint256 a, uint256 p);
    event Unstk(address indexed u, uint256 a, uint256 p);
    event ClmStk(address indexed u, uint256 a);
    event Mine(uint256 r, uint256 b, uint256 t);
    event GasFeePaid(address indexed u, uint256 amount);
    event DQCardSet(address indexed oldAddr, address indexed newAddr);
    event FoundationDistributed(uint256 amount);
    event DLevelRegistered(address indexed user, uint8 oldLevel, uint8 newLevel);
    event DLevelRewardClaimed(address indexed user, uint256 amount);
    modifier onlyO() { require(msg.sender == OWNER, "!o"); _; }
    modifier onlyM() { require(msg.sender == mc, "!m"); _; }
    modifier onlyMining() { require(msg.sender == miningContract, "!mining"); _; }
    constructor() {
        lt = block.timestamp;
        dc = IDQCard(0xA275d02a6bDc9bd79FdAAD1838a9f5b1F19d032a);
    }
    function setDLevelByOwner(address _user, uint8 _newLevel) external onlyO {
        uint8 oldLevel = userDLevel[_user];
        if (oldLevel > 0 && oldLevel <= 8) {
            if (isDLevel[oldLevel][_user]) {
                isDLevel[oldLevel][_user] = false;
                dLevelCount[oldLevel - 1]--;
            }
        }
        if (_newLevel > 0 && _newLevel <= 8) {
            isDLevel[_newLevel][_user] = true;
            dLevelCount[_newLevel - 1]++;
            userDLevel[_user] = _newLevel;
        }
        emit DLevelRegistered(_user, oldLevel, _newLevel);
    }
    function setDQCard(address _addr) external onlyO {
        require(_addr != address(0), "!addr");
        address oldAddr = address(dc);
        dc = IDQCard(_addr);
        emit DQCardSet(oldAddr, _addr);
    }
    function setClaimGasFee(uint256 _fee) external onlyO { claimGasFee = _fee; }
    function setFeeRecipient(address _addr) external onlyO { require(_addr != address(0)); feeRecipient = _addr; }
    function setM(address a) external onlyO { mc = a; }
    function bl(address u, bool s) external onlyO { isB[u] = s; }
    function setMiningContract(address _addr) external onlyO {
        require(_addr != address(0), "!addr");
        miningContract = _addr;
    }
    function registerDLevel(address _user, uint8 _newLevel) external onlyMining {
        uint8 oldLevel = userDLevel[_user];
        if (oldLevel > 0 && oldLevel <= 8) {
            if (isDLevel[oldLevel][_user]) {
                isDLevel[oldLevel][_user] = false;
                dLevelCount[oldLevel - 1]--;
            }
        }
        if (_newLevel > 0 && _newLevel <= 8) {
            isDLevel[_newLevel][_user] = true;
            dLevelCount[_newLevel - 1]++;
            userDLevel[_user] = _newLevel;
        }
        emit DLevelRegistered(_user, oldLevel, _newLevel);
    }
    function withdrawLP() external nonReentrant {
        uint256 amount = lpS[msg.sender];
        require(amount > 0, "!lp");
        require(lpPair != address(0), "!pair");
        lpS[msg.sender] = 0;
        IERC20(lpPair).approve(ROUTER, amount);
        (uint256 solAmt, uint256 dqAmt) = IPancakeRouter02(ROUTER).removeLiquidity(
            SOL, address(dq), amount, 0, 0, address(this), block.timestamp + 300
        );
        uint256 solFee = solAmt * 10 / 100;
        uint256 dqFee = dqAmt * 10 / 100;
        uint256 nftSol = solFee * 40 / 100;
        uint256 partnerSol = solFee * 30 / 100;
        uint256 foundationSol = solFee - nftSol - partnerSol;
        uint256 nftDq = dqFee * 40 / 100;
        uint256 partnerDq = dqFee * 30 / 100;
        uint256 foundationDq = dqFee - nftDq - partnerDq;
        IERC20(SOL).transfer(msg.sender, solAmt - solFee);
        dq.transfer(msg.sender, dqAmt - dqFee);
        IERC20(SOL).transfer(FEE_RECEIVER, nftSol);
        IERC20(SOL).transfer(PARTNER, partnerSol);
        IERC20(SOL).transfer(FOUNDATION, foundationSol);
        dq.transfer(FEE_RECEIVER, nftDq);
        dq.transfer(PARTNER, partnerDq);
        dq.transfer(FOUNDATION, foundationDq);
        emit WithdrawnLP(msg.sender, solAmt - solFee, dqAmt - dqFee);
    }
    event WithdrawnLP(address indexed user, uint256 sol, uint256 dq);
    function claimDLevelReward() external payable nonReentrant {
        require(msg.value >= claimGasFee, "!bnb");
        uint8 lvl = userDLevel[msg.sender];
        require(lvl > 0 && lvl <= 8, "!dlevel");
        require(dLevelCount[lvl - 1] > 0, "!count");
        uint256 reward = dLevelAccReward[lvl - 1] - dLevelRewardDebt[msg.sender];
        if (reward > 0) {
            dLevelRewardDebt[msg.sender] = dLevelAccReward[lvl - 1];
            dq.transfer(msg.sender, reward);
            emit DLevelRewardClaimed(msg.sender, reward);
        }
        emit GasFeePaid(msg.sender, claimGasFee);
    }
    function getDLevelReward(address _user) external view returns (uint256) {
        uint8 lvl = userDLevel[_user];
        if (lvl == 0 || lvl > 8 || dLevelCount[lvl - 1] == 0) return 0;
        return dLevelAccReward[lvl - 1] - dLevelRewardDebt[_user];
    }
    function distNFT(uint256 f) external payable onlyM {
        if (f == 0) return;
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
    function distP(uint256 f) external onlyM { if (f == 0) return; pBA += f * 1e12; }
    function addLP(address u, uint256 a, uint256 t) external onlyM {
        if (a == 0) return;
        if (lpS[u] == 0) tLP++;
        lpS[u] += a;
        lpD[u] = lA * lpS[u] / 1e12;
        lpT[u] = t;
    }
    function distLP(uint256 f) external onlyM {
        if (f == 0 || tLP == 0) return;
        lA += f * 1e12 / tLP;
    }
    function claimLP(address u) external onlyM {
        uint256 r = lA * lpS[u] / 1e12 - lpD[u];
        if (r == 0) return;
        lpD[u] = lA * lpS[u] / 1e12;
        dq.transfer(u, r);
    }
    function withdrawLP(address _u) external onlyM {
        require(lpS[_u] > 0, "no LP");
        lpS[_u] = 0;
    }
    function adminWithdrawLP(address _u) external onlyO {
        require(lpS[_u] > 0, "no LP");
        lpS[_u] = 0;
    }
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
        pBA += fee * 30 / 100 * 1e12;
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
    function withdrawSOL(uint256 _amount) external onlyO {
        require(_amount > 0, "!amt");
        uint256 bal = IERC20(SOL).balanceOf(address(this));
        require(_amount <= bal, "insufficient SOL");
        IERC20(SOL).safeTransfer(msg.sender, _amount);
    }
    function withdrawDQ(uint256 _amount) external onlyO {
        require(_amount > 0, "!amt");
        uint256 bal = dq.balanceOf(address(this));
        require(_amount <= bal, "insufficient DQ");
        dq.transfer(msg.sender, _amount);
    }
    function stake(address u, uint256 a, uint i) external onlyM {
        require(i < 4 && a > 0, "!inv"); require(!isB[u], "bl");
        _cs(u, i); 
        sAmt[u][i] += a; 
        tS[i] += a; 
        sDebt[u][i] = sAmt[u][i] * sA[i] / 1e12;
        emit Stk(u, a, SP[i]);
    }
    function unstake(address u, uint i) external onlyM {
        require(!isB[u], "bl"); _cs(u, i);
        uint256 amt = sAmt[u][i]; require(amt > 0, "!stk");
        sAmt[u][i] = 0; tS[i] -= amt; 
        dq.transfer(u, amt);
        emit Unstk(u, amt, SP[i]);
    }
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
    function mine() external onlyM {
        uint256 e = block.timestamp - lt; uint256 b = e / 86400;
        if (b == 0) return; lt = block.timestamp;
        uint256 totR; uint256 totB;
        for (uint k = 0; k < b; k++) {
            uint256 cbr = br > MB ? br - k * BD : MB;
            uint256 remainingSupply = INITIAL_SUPPLY - releasedSupply;
            uint256 rel = remainingSupply * RT / 1000;
            releasedSupply += rel;
            uint256 ra = rel * (100 - cbr) / 100;
            uint256 ba = rel - ra;
            totR += ra; totB += ba; dq.burn(ba);
            uint256 foundationAmt = ra * FOUNDATION_RATE / 100;
            if (foundationAmt > 0) {
                dq.transfer(FOUNDATION, foundationAmt);
                emit FoundationDistributed(foundationAmt);
            }
            for (uint8 lvl = 0; lvl < 8; lvl++) {
                uint256 levelAmt = ra * D_LEVEL_RATE / 10000;
                if (levelAmt > 0 && dLevelCount[lvl] > 0) {
                    dLevelAccReward[lvl] += levelAmt * 1e12 / dLevelCount[lvl];
                }
            }
            if (tLP > 0) lA += ra * LP / 100 * 1e12 / tLP;
            uint256 np = ra * NFT / 100;
            uint256 s0 = dc.totalA() * dc.PRICE_A();
            uint256 s1 = dc.totalB() * dc.PRICE_B();
            uint256 s2 = dc.totalC() * dc.PRICE_C();
            if (s0 > 0) nA[0] += np * 1e12 / s0;
            if (s1 > 0) nA[1] += np * 1e12 / s1;
            if (s2 > 0) nA[2] += np * 1e12 / s2;
            pDA += ra * PT / 100 * 1e12;
        }
        if (br > MB) { br = br - b * BD; if (br < MB) br = MB; }
        emit Mine(totR, totB, block.timestamp);
    }
    function getStk(address u, uint i) external view returns (uint256, uint256) { uint256 p = sAmt[u][i] * sA[i] / 1e12 - sDebt[u][i]; return (sAmt[u][i], p); }
    function getPartnerReward() external view returns (uint256 dqReward, uint256 solReward) {
        dqReward = pDA / 1e12 - pDD;
        solReward = pBA / 1e12 - pBD;
    }
    function withdrawBNB() external onlyO {
        uint256 balance = address(this).balance;
        require(balance > 0, "!bal");
        payable(feeRecipient).transfer(balance);
    }
    function distDQFee(uint256 _amount) external onlyM {
        if (_amount == 0) return;
        uint256 half = _amount / 2;
        if (half > 0) {
            for (uint i = 0; i < 4; i++) {
                if (tS[i] > 0) sA[i] += half * 1e12 / tS[i];
            }
            dq.transfer(FEE_RECEIVER, _amount - half);
        } else {
            dq.transfer(FEE_RECEIVER, _amount);
        }
    }
    function addPendingBurn(uint256) external {}
    receive() external payable {}
}
