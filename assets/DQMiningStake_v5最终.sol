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
contract DQMiningStake is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    IDQToken public constant dq = IDQToken(0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B);
    IDQCard public constant dc = IDQCard(0x1857aCeDf9b73163D791eb2F0374a328416291a1);
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant OP = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public mc;
    uint256 public constant LP = 60;
    uint256 public constant NFT = 15;
    uint256 public constant TM = 14;
    uint256 public constant PT = 6;
    uint256 public constant RT = 13;
    uint256 public constant IB = 80;
    uint256 public constant MB = 30;
    uint256 public constant BD = 5;
    uint256 public constant F60 = 20;
    uint256 public constant F180 = 10;
    uint256 public constant MP = 50;
    uint256[] public SP = [30, 90, 180, 360];
    uint256[4] public sA;
    uint256[4] public tS;
    uint256 public pc;
    address[] public pL;
    mapping(address => bool) public isP;
    uint256 public pDA;
    mapping(address => uint256) public pDD;
    uint256 public pBA;
    mapping(address => uint256) public pBD;
    uint256[8] public dT;
    uint256[8] public dA;
    uint256 public br = IB;
    uint256 public lt;
    uint256 public lA;
    uint256[3] public nA;
    uint256[3] public fA;
    mapping(uint256 => uint256) public lF;
    uint256 public fp;
    uint256 public tLP;
    mapping(address => uint256) public lpS;
    mapping(address => uint256) public lpD;
    mapping(address => uint256) public lpT;
    mapping(address => uint256) public nD0;
    mapping(address => uint256) public nD1;
    mapping(address => uint256) public nD2;
    mapping(address => uint256) public dd;
    mapping(address => uint8) public dl;
    mapping(address => uint256[4]) public sAmt;
    mapping(address => uint256[4]) public sDebt;
    mapping(address => bool) public isB;
    event ClaimLP(address indexed u, uint256 a);
    event ClaimNft(address indexed u, uint256 a);
    event ClaimDTeam(address indexed u, uint256 a);
    event ClaimPdq(address indexed u, uint256 a);
    event ClaimPbnb(address indexed u, uint256 a);
    event ClaimFee(address indexed u, uint256 a);
    event RmLP(address indexed u, uint256 a, uint256 f);
    event Withdraw(address indexed u, uint256 a, uint256 f);
    event Stk(address indexed u, uint256 a, uint256 p);
    event Unstk(address indexed u, uint256 a, uint256 p);
    event ClmStk(address indexed u, uint256 a);
    event Mine(uint256 r, uint256 b, uint256 t);
    event PAdd(address indexed u, uint256 o);
    modifier onlyO() { require(msg.sender == OWNER, "!o"); _; }
    modifier onlyM() { require(msg.sender == mc, "!m"); _; }
    constructor() { lt = block.timestamp; }
    function setM(address a) external onlyO { mc = a; }
    function bl(address u, bool s) external onlyO { isB[u] = s; }
    function addP(address p) external onlyO { require(!isP[p] && pc < MP, "!inv"); isP[p] = true; pL.push(p); pc++; emit PAdd(p, pc); }
    function addLP(address u, uint256 a, uint256 t) external onlyM {
        uint256 o = lpS[u];
        lpS[u] += a; tLP += a;
        if (lpT[u] == 0 || t < lpT[u]) lpT[u] = t;
        if (o > 0) lpD[u] = o * lA / 1e12;
    }
    function distLP(uint256 f) external onlyM { if (f == 0 || tLP == 0) return; lA += f * LP / 100 * 1e12 / tLP; }
    function distNFT(uint256 f) external onlyM {
        if (f == 0) return;
        uint256 p = f * NFT / 100;
        uint256 s0 = dc.totalA() * dc.PRICE_A();
        uint256 s1 = dc.totalB() * dc.PRICE_B();
        uint256 s2 = dc.totalC() * dc.PRICE_C();
        if (s0 > 0) nA[0] += p * 1e12 / s0;
        if (s1 > 0) nA[1] += p * 1e12 / s1;
        if (s2 > 0) nA[2] += p * 1e12 / s2;
    }
    function distD(uint256 f) external onlyM {
        if (f == 0) return;
        uint256 p = f * TM / 100;
        for (uint i = 0; i < 8; i++) { if (dT[i] > 0) dA[i] += p * 1e12 / 8 / dT[i]; }
    }
    function distP(uint256 f) external onlyM { if (f == 0 || pc == 0) return; pBA += f * 1e12 / pc; }
    function claimLP(address u) external onlyM {
        require(!isB[u], "bl"); require(lpS[u] > 0, "!lp");
        uint256 p = lpS[u] * lA / 1e12 - lpD[u];
        require(p > 0, "!p"); lpD[u] = lpS[u] * lA / 1e12; dq.transfer(u, p); emit ClaimLP(u, p);
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
        require(tot > 0, "!p"); dq.transfer(u, tot); emit ClaimNft(u, tot);
    }
    function claimD(address u) external onlyM {
        require(!isB[u], "bl"); require(dl[u] > 0, "!d");
        uint256 p = dA[dl[u] - 1] / 1e12 - dd[u];
        require(p > 0, "!p"); dd[u] = dA[dl[u] - 1] / 1e12; dq.transfer(u, p); emit ClaimDTeam(u, p);
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
        require(tot > 0, "!p"); IERC20(SOL).safeTransfer(u, tot); emit ClaimFee(u, tot);
    }
    function claimPdq(address u) external onlyM {
        require(!isB[u], "bl"); require(isP[u], "!p");
        uint256 p = pDA / 1e12 - pDD[u];
        require(p > 0, "!p"); pDD[u] = pDA / 1e12; dq.transfer(u, p); emit ClaimPdq(u, p);
    }
    function claimPbnb(address u) external onlyM {
        require(!isB[u], "bl"); require(isP[u], "!p");
        uint256 p = pBA / 1e12 - pBD[u];
        require(p > 0, "!p"); pBD[u] = pBA / 1e12; IERC20(SOL).safeTransfer(u, p); emit ClaimPbnb(u, p);
    }
    function withdraw(address u, uint256 a) external onlyM {
        require(!isB[u], "bl"); require(a > 0, "!inv");
        uint256 fee = a * 10 / 100;
        _df(fee * 40 / 100);
        if (pc > 0) pBA += fee * 30 / 100 * 1e12 / pc;
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
        uint256 d = (block.timestamp - lpT[u]) / 86400;
        uint256 fr = d < 60 ? F60 : (d < 180 ? F180 : 0);
        uint256 lp = lpS[u]; uint256 fee = lp * fr / 100;
        lpS[u] = 0; tLP -= lp;
        if (fee > 0) { _df(fee * 40 / 100); if (pc > 0) pBA += fee * 30 / 100 * 1e12 / pc; IERC20(SOL).safeTransfer(OP, fee * 30 / 100); }
        if (lp > fee) IERC20(SOL).safeTransfer(u, lp - fee);
        emit RmLP(u, lp, fee);
    }
    function stake(address u, uint256 a, uint i) external onlyM {
        require(i < 4 && a > 0, "!inv"); require(!isB[u], "bl");
        _cs(u, i); sAmt[u][i] += a; tS[i] += a; sDebt[u][i] = sAmt[u][i] * sA[i] / 1e12;
        emit Stk(u, a, SP[i]);
    }
    function unstake(address u, uint i) external onlyM {
        require(!isB[u], "bl"); _cs(u, i);
        uint256 amt = sAmt[u][i]; require(amt > 0, "!stk");
        sAmt[u][i] = 0; tS[i] -= amt; dq.transfer(u, amt); emit Unstk(u, amt, SP[i]);
    }
    function clmS(address u, uint i) external onlyM { require(!isB[u], "bl"); _cs(u, i); }
    function _cs(address u, uint i) internal {
        uint256 a = sAmt[u][i];
        uint256 p = a * sA[i] / 1e12 - sDebt[u][i];
        if (p > 0) { sDebt[u][i] = a * sA[i] / 1e12; dq.transfer(u, p); emit ClmStk(u, p); }
    }
    function mine() external onlyM {
        uint256 e = block.timestamp - lt; uint256 b = e / 86400;
        if (b == 0) return; lt = block.timestamp;
        uint256 totR; uint256 totB;
        for (uint k = 0; k < b; k++) {
            uint256 cbr = br > MB ? br - k * BD : MB;
            uint256 rel = dq.balanceOf(address(this)) * RT / 1000;
            uint256 ra = rel * (100 - cbr) / 100;
            uint256 ba = rel - ra;
            totR += ra; totB += ba; dq.burn(ba);
            if (tLP > 0) lA += ra * LP / 100 * 1e12 / tLP;
            uint256 np = ra * NFT / 100;
            uint256 s0 = dc.totalA() * dc.PRICE_A();
            uint256 s1 = dc.totalB() * dc.PRICE_B();
            uint256 s2 = dc.totalC() * dc.PRICE_C();
            if (s0 > 0) nA[0] += np * 1e12 / s0;
            if (s1 > 0) nA[1] += np * 1e12 / s1;
            if (s2 > 0) nA[2] += np * 1e12 / s2;
            if (pc > 0) pDA += ra * PT / 100 * 1e12 / pc;
        }
        if (br > MB) { br = br - b * BD; if (br < MB) br = MB; }
        emit Mine(totR, totB, block.timestamp);
    }
    function getLP(address u) external view returns (uint256, uint256) { uint256 p = lpS[u] * lA / 1e12 - lpD[u]; return (lpS[u], p); }
    function getStk(address u, uint i) external view returns (uint256, uint256) { uint256 p = sAmt[u][i] * sA[i] / 1e12 - sDebt[u][i]; return (sAmt[u][i], p); }
    receive() external payable {}
}
