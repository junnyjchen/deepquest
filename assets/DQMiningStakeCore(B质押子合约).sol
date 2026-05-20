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
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function cardType(uint256 tokenId) external view returns (uint256);
    function totalA() external view returns (uint256);
    function totalB() external view returns (uint256);
    function totalC() external view returns (uint256);
    function PRICE_A() external pure returns (uint256);
    function PRICE_B() external pure returns (uint256);
    function PRICE_C() external pure returns (uint256);
}

contract DQMiningStakeCore is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public DQ_TOKEN;
    address public DQ_CARD;
    address public constant FOUNDATION = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public constant PARTNER = 0x803B79B608455808C2f752c588804c3F5bF676a3;
    address public mc;
    address public miningContract;
    address public lpPair;
    IDQToken public dq;
    IDQCard public dc;

    uint256 public constant RT = 13;
    uint256 public constant IB = 8000;
    uint256 public constant MB = 3000;
    uint256 public constant BD = 50;
    uint256 public constant F60 = 20;
    uint256 public constant F180 = 10;
    uint256 public constant INITIAL_SUPPLY = 1000 * 10**8 * 10**18;
    uint256 public releasedSupply;

    uint256[4] public sA;           // 各周期累计奖励（DQ）
    uint256[4] public tS;           // 各周期总质押量
    uint256 public lA;
    uint256 public tLP;
    mapping(address => uint256) public lpS;
    mapping(address => uint256) public lpD;
    mapping(address => uint256) public lpT;
    uint256[3] public nA;
    mapping(address => uint256[3]) public userNftF;
    uint256[8] public dLevelCount;
    uint256[8] public dLevelAccReward;
    mapping(uint8 => mapping(address => bool)) public isDLevel;
    mapping(address => uint8) public userDLevel;
    mapping(address => uint256) public dLevelRewardDebt;
    uint256 public pDA;
    uint256 public pBA;
    mapping(address => uint256) public userPDD;
    mapping(address => uint256) public userPBD;
    mapping(address => uint256) public nD0;
    mapping(address => uint256) public nD1;
    mapping(address => uint256) public nD2;
    uint256 public br = IB;
    uint256 public lt;
    mapping(address => uint256) public userEnergy;
    mapping(address => uint8) public userNodeLevel;  // 用户节点等级(S1-S6)
    mapping(address => uint256) public userTeamInvest;
    mapping(address => uint256) public userPendingSOL;
    mapping(address => uint256) public userDirectSales;
    mapping(address => uint256) public userLPRemovalFee;
    mapping(address => address) public userReferrer;
    mapping(address => EnumerableSet.AddressSet) internal userChildren;
    mapping(address => bool) public isB;
    uint256 public energyMul = 3;
    uint256[6] public mgrThresh = [100, 200, 600, 2000, 6000, 20000];
    uint8[6] public mgrRates = [5, 10, 15, 20, 25, 30];

    // 奖励明细记录
    struct RewardRecord {
        uint8 rewardType;      // 1=直推 2=见点 3=管理 4=LP 5=节点 6=D等级 7=DQ分红
        uint256 amount;        // 金额
        address fromUser;      // 来源用户
        uint256 timestamp;     // 时间
        uint8 tokenType;       // 0=SOL, 1=DQ
    }
    mapping(address => RewardRecord[]) public userRewardRecords;  // 用户奖励明细

    // DQ爆块明细记录
    struct DQRewardRecord {
        uint256 periodIndex;   // 周期索引
        uint256 amount;        // DQ数量
        uint256 timestamp;     // 时间
    }
    mapping(address => DQRewardRecord[]) public userDQRewardRecords;  // DQ爆块明细
    mapping(address => mapping(uint => uint256)) public sAmt;
    mapping(address => mapping(uint => uint256)) public sDebt;

    // ============ 质押记录单独追踪 ============
    struct StakeRecord {
        uint256 amount;       // 质押金额
        uint256 startTime;    // 质押开始时间
        uint256 duration;     // 质押周期（秒）
        uint256 rewardDebt;   // 奖励债务
        bool active;          // 是否有效
    }
    mapping(address => StakeRecord[]) public stakeRecords;  // 用户 -> 质押记录列表
    mapping(address => mapping(uint256 => uint256)) public userPendingDQ;  // 用户待领取DQ奖励(质押)
    mapping(address => uint256) public userBlockDQ;  // 用户待领取DQ爆块奖励(LP/节点/D等级)
    
    // 质押周期配置（秒）：0=30天，1=90天，2=180天，3=360天
    // 奖励权重：5%、10%、15%、20%
    uint256[4] public stakeDurations = [30 days, 90 days, 180 days, 360 days];
    uint256[4] public stakeWeights = [5, 10, 15, 20];  // 百分比

    modifier onlyMining() { require(msg.sender == miningContract, "!m"); _; }
    modifier onlyOwner() { require(msg.sender == OWNER, "!o"); _; }
    modifier onlyM() { require(msg.sender == mc, "!op"); _; }

    event EnergyChanged(address indexed u, uint256 e);
    event TeamInvestChanged(address indexed u, uint256 v);
    event Stake(address indexed u, uint256 a, uint i);
    event Unstake(address indexed u, uint256 a, uint i);
    event LPRemoved(address indexed u, uint256 a);

    constructor() {}

    // ============ 设置函数 ============
    function setLpPair(address _pair) external onlyOwner {
        require(lpPair == address(0), "set");
        lpPair = _pair;
    }
    function setAddresses(address _dq, address _dc, address _lpPair) external onlyOwner {
        if (_dq != address(0)) { dq = IDQToken(_dq); DQ_TOKEN = _dq; }
        if (_dc != address(0)) { dc = IDQCard(_dc); DQ_CARD = _dc; }
        if (lpPair == address(0) && _lpPair != address(0)) lpPair = _lpPair;
    }
    function setMiningContract(address _addr) external onlyOwner { miningContract = _addr; }
    function setM(address a) external onlyOwner { mc = a; }
    function setEnergyMul(uint256 _m) external { require(msg.sender == miningContract || msg.sender == OWNER, "!auth"); energyMul = _m; }
    function bl(address u, bool s) external onlyOwner { isB[u] = s; }

    // ============ 用户管理 ============
    function registerUser(address _u, address _r) external {
        userReferrer[_u] = _r;
        if (_r != address(0)) userChildren[_r].add(_u);
    }
    function importUser(address _u, address _r, uint256, uint256, uint8, uint256) external onlyMining {
        userReferrer[_u] = _r;
        if (_r != address(0)) userChildren[_r].add(_u);
    }
    function updateTeam(address _u, uint256 _a) external { userTeamInvest[_u] = _a; }
    function setEnergy(address _u, uint256 _e) external onlyMining { userEnergy[_u] = _e; emit EnergyChanged(_u, _e); }

    // ============ 奖励明细记录 ============
    function _recordReward(address _user, uint8 _type, uint256 _amount, address _from, uint8 _tokenType) internal {
        if (_amount > 0) {
            userRewardRecords[_user].push(RewardRecord({
                rewardType: _type,
                amount: _amount,
                fromUser: _from,
                timestamp: block.timestamp,
                tokenType: _tokenType
            }));
        }
    }

    function _recordDQReward(address _user, uint256 _periodIndex, uint256 _amount) internal {
        if (_amount > 0) {
            userDQRewardRecords[_user].push(DQRewardRecord({
                periodIndex: _periodIndex,
                amount: _amount,
                timestamp: block.timestamp
            }));
        }
    }

    function getUserRewardCount(address _user) external view returns (uint256) {
        return userRewardRecords[_user].length;
    }

    function getUserRewardRecord(address _user, uint256 _index) external view returns (uint8, uint256, address, uint256, uint8) {
        RewardRecord memory r = userRewardRecords[_user][_index];
        return (r.rewardType, r.amount, r.fromUser, r.timestamp, r.tokenType);
    }

    function getUserDQRewardCount(address _user) external view returns (uint256) {
        return userDQRewardRecords[_user].length;
    }

    function getUserDQRewardRecord(address _user, uint256 _index) external view returns (uint256, uint256, uint256) {
        DQRewardRecord memory r = userDQRewardRecords[_user][_index];
        return (r.periodIndex, r.amount, r.timestamp);
    }
    function addEnergy(address _u, uint256 _a) external { userEnergy[_u] += _a; emit EnergyChanged(_u, userEnergy[_u]); }
    function subEnergy(address _u, uint256 _a) external onlyMining { userEnergy[_u] = _a > userEnergy[_u] ? 0 : userEnergy[_u] - _a; emit EnergyChanged(_u, userEnergy[_u]); }
    function getEnergy(address _u) external view returns (uint256) { return userEnergy[_u]; }
    function addTeamInvest(address _u, uint256 _a) external { userTeamInvest[_u] += _a; emit TeamInvestChanged(_u, userTeamInvest[_u]); }
    function getTeamInvest(address _u) external view returns (uint256) { return userTeamInvest[_u]; }
    function getDLevel(address _u) external view returns (uint8) { return userDLevel[_u]; }
    function setPendingSOL(address _u, uint256 _p) external onlyMining { userPendingSOL[_u] = _p; }
    function addPendingSOL(address _u, uint256 _a) external onlyMining { userPendingSOL[_u] += _a; }
    function subPendingSOL(address _u, uint256 _a) external onlyMining { userPendingSOL[_u] = _a > userPendingSOL[_u] ? 0 : userPendingSOL[_u] - _a; }
    function getPendingSOL(address _u) external view returns (uint256) { return userPendingSOL[_u]; }
    function addDirectSales(address _u, uint256 _a) external { userDirectSales[_u] += _a; }
    function getDirectSales(address _u) external view returns (uint256) { return userDirectSales[_u]; }
    function addChild(address _p, address _c) external onlyMining { userChildren[_p].add(_c); }
    function getChildCount(address _u) external view returns (uint256) { return userChildren[_u].length(); }
    function getChild(address _u, uint256 _i) external view returns (address) { return userChildren[_u].at(_i); }
    function setUserNodeLevel(address _u, uint8 _lvl) external onlyM { userNodeLevel[_u] = _lvl; }

    // ============ 动态分币 ============
    function distReward(address _u, uint256 _a) external {
        if (_a == 0) return;
        address ref = userReferrer[_u];
        if (ref == address(0)) return;
        _distDirect(_u, ref, _a);
        _distMgr(_u, _a * 30 / 100);
        _distSee(_u, ref, _a * 1 / 100, 1);
    }
    // 直推奖励：不需要考核，有能量就能拿
    function _distDirect(address _from, address _ref, uint256 _dyn) internal {
        uint256 direct = _dyn * 30 / 100;
        if (userEnergy[_ref] >= direct) {
            userEnergy[_ref] -= direct;
            userPendingSOL[_ref] += direct;
            _recordReward(_ref, 1, direct, _from, 0);  // 1=直推奖, 0=SOL
        }
    }
    function _distMgr(address _u, uint256 _mgrPool) internal {
        address cur = userReferrer[_u];
        uint8 prevRate;
        for (uint8 lvl = 1; lvl <= 6; lvl++) {
            if (cur == address(0)) break;
            uint8 curLvl = userNodeLevel[cur];  // 直接使用注册等级
            if (curLvl > 0 && lvl >= curLvl) {
                uint8 curRate = mgrRates[curLvl - 1];
                uint8 diffRate = curRate > prevRate ? curRate - prevRate : 0;
                uint256 mgrR = _mgrPool * diffRate / 100;
                if (mgrR > 0 && userEnergy[cur] >= mgrR) {
                    userEnergy[cur] -= mgrR;
                    userPendingSOL[cur] += mgrR;
                    _recordReward(cur, 3, mgrR, _u, 0);  // 3=管理奖, 0=SOL
                }
                prevRate = curRate;
            }
            cur = userReferrer[cur];
        }
    }
    function _distSee(address _u, address _ref, uint256 _seePool, uint8 _d) internal {
        if (_d > 15 || _ref == address(0)) return;
        uint256 ds = userDirectSales[_ref];
        // V5: 取消有效地址考核，只检查直推数和能量
        if (ds >= 1 && _d <= 3 && userEnergy[_ref] >= _seePool) {
            userEnergy[_ref] -= _seePool;
            userPendingSOL[_ref] += _seePool;
            _recordReward(_ref, 2, _seePool, _u, 0);  // 2=见点奖, 0=SOL
        } else if (ds >= 2 && _d <= 6 && userEnergy[_ref] >= _seePool) {
            userEnergy[_ref] -= _seePool;
            userPendingSOL[_ref] += _seePool;
            _recordReward(_ref, 2, _seePool, _u, 0);  // 2=见点奖, 0=SOL
        } else if (ds >= 3 && _d <= 9 && userEnergy[_ref] >= _seePool) {
            userEnergy[_ref] -= _seePool;
            userPendingSOL[_ref] += _seePool;
            _recordReward(_ref, 2, _seePool, _u, 0);  // 2=见点奖, 0=SOL
        } else if (ds >= 4 && _d <= 12 && userEnergy[_ref] >= _seePool) {
            userEnergy[_ref] -= _seePool;
            userPendingSOL[_ref] += _seePool;
            _recordReward(_ref, 2, _seePool, _u, 0);  // 2=见点奖, 0=SOL
        } else if (ds >= 5 && _d <= 15 && userEnergy[_ref] >= _seePool) {
            userEnergy[_ref] -= _seePool;
            userPendingSOL[_ref] += _seePool;
            _recordReward(_ref, 2, _seePool, _u, 0);  // 2=见点奖, 0=SOL
        }
        _distSee(_u, userReferrer[_ref], _seePool, _d + 1);
    }
    function _calcSmallTeam(address _u) internal view returns (uint256) {
        uint256 total = userTeamInvest[_u];
        uint256 maxChild;
        for (uint256 i; i < userChildren[_u].length(); i++) {
            uint256 child = userTeamInvest[userChildren[_u].at(i)];
            if (child > maxChild) maxChild = child;
        }
        return total > maxChild ? total - maxChild : 0;
    }
    function _getRequiredLevel(uint256 _team) internal view returns (uint8) {
        for (uint8 i = 6; i >= 1; i--) {
            if (_team >= mgrThresh[i - 1]) return i;
        }
        return 0;
    }

    // ============ LP管理 ============
    function addLP(address _u, uint256 _a, uint256 _t) external onlyM {
        lpS[_u] += _a;
        lpT[_u] = _t > lpT[_u] ? _t : lpT[_u];
        tLP += _a;
    }
    function distLP(uint256 _f) external onlyM { if (_f != 0 && tLP != 0) lA += _f * 1e12 / tLP; }
    function claimLP(address _u) external onlyM {
        if (lpS[_u] == 0) return;
        uint256 r = lA * lpS[_u] / 1e12 - lpD[_u];
        if (r > 0) { lpD[_u] = lA * lpS[_u] / 1e12; userBlockDQ[_u] += r; _recordReward(_u, 4, r, address(0), 1); }  // 4=LP奖励, 1=DQ
    }
    function withdrawLP(address _u) external onlyM {
        require(!isB[_u] && lpS[_u] > 0, "!lp");
        lpS[_u] = 0; lpD[_u] = 0; lpT[_u] = 0;
    }
    function getLP(address _u) external view returns (uint256) {
        return lpS[_u];
    }
    function subTotalLP(uint256 _a) external onlyM {
        require(tLP >= _a, "!tLP");
        tLP -= _a;
    }
    function forceRemoveLP(address _u) external onlyOwner {
        uint256 amount = lpS[_u];
        require(amount > 0, "!lp");
        lpS[_u] = 0; lpD[_u] = 0; lpT[_u] = 0;
        tLP -= amount;
    }
    function getUserLPRemovalFee(address _u) external view returns (uint256) { return userLPRemovalFee[_u]; }
    function clearUserLPRemovalFee(address _u) external onlyMining { userLPRemovalFee[_u] = 0; }

    // ============ NFT奖励 ============
    function distNFT(uint256 _f) external payable onlyM {
        if (_f == 0) return;
        uint256 s0 = dc.totalA() * dc.PRICE_A();
        uint256 s1 = dc.totalB() * dc.PRICE_B();
        uint256 s2 = dc.totalC() * dc.PRICE_C();
        if (s0 > 0) nA[0] += _f * 1e12 / s0;
        if (s1 > 0) nA[1] += _f * 1e12 / s1;
        if (s2 > 0) nA[2] += _f * 1e12 / s2;
    }
    function claimNft(address _u) external onlyM {
        uint256 cnt = dc.balanceOf(_u);
        uint256 reward;
        for (uint256 i; i < cnt; i++) {
            uint256 t = dc.cardType(dc.tokenOfOwnerByIndex(_u, i));
            if (t == 1) reward += nA[0] - userNftF[_u][0];
            else if (t == 2) reward += nA[1] - userNftF[_u][1];
            else if (t == 3) reward += nA[2] - userNftF[_u][2];
        }
        if (reward > 0) {
            userNftF[_u][0] = nA[0]; userNftF[_u][1] = nA[1]; userNftF[_u][2] = nA[2];
            userBlockDQ[_u] += reward;
            _recordReward(_u, 5, reward, address(0), 1);  // 5=节点奖励, 1=DQ
        }
    }
    function claimFee(address _u) external onlyM {
        uint256 cnt = dc.balanceOf(_u);
        uint256 reward;
        for (uint256 i; i < cnt; i++) {
            uint256 t = dc.cardType(dc.tokenOfOwnerByIndex(_u, i));
            if (t == 1) reward += nD0[_u];
            else if (t == 2) reward += nD1[_u];
            else if (t == 3) reward += nD2[_u];
        }
        if (reward > 0) { nD0[_u] = 0; nD1[_u] = 0; nD2[_u] = 0; userBlockDQ[_u] += reward; _recordReward(_u, 5, reward, address(0), 1); }  // 5=节点奖励, 1=DQ
    }

    // ============ D等级奖励 ============
    function registerDLevel(address _user, uint8 _newLevel) external onlyM {
        if (_newLevel == 0) return;
        if (userDLevel[_user] > 0) isDLevel[userDLevel[_user]][_user] = false;
        userDLevel[_user] = _newLevel;
        isDLevel[_newLevel][_user] = true;
        dLevelCount[_newLevel - 1]++;
    }
    function claimD(address _u) external onlyM {
        uint8 lvl = userDLevel[_u];
        if (lvl == 0 || dLevelCount[lvl - 1] == 0) return;
        uint256 reward = dLevelAccReward[lvl - 1] - dLevelRewardDebt[_u];
        if (reward > 0) { dLevelRewardDebt[_u] = dLevelAccReward[lvl - 1]; userBlockDQ[_u] += reward; _recordReward(_u, 6, reward, address(0), 1); }  // 6=D等级奖励, 1=DQ
    }
    function getDLevelReward(address _u) external view returns (uint256) {
        uint8 lvl = userDLevel[_u];
        return lvl == 0 ? 0 : dLevelAccReward[lvl - 1] - dLevelRewardDebt[_u];
    }

    // ============ 质押 ============
    // 质押DQ，创建单独记录
    function stake(address _u, uint256 _a, uint _i) external onlyM {
        require(_i < 4, "!i");
        require(_a > 0, "!a");
        
        // 更新汇总数据
        sAmt[_u][_i] += _a;
        tS[_i] += _a;
        
        // 创建单独质押记录
        stakeRecords[_u].push(StakeRecord({
            amount: _a,
            startTime: block.timestamp,
            duration: stakeDurations[_i],
            rewardDebt: sAmt[_u][_i] * sA[_i] / 1e12,
            active: true
        }));
        
        emit Stake(_u, _a, _i);
    }
    
    // 解押：只能解押已到期的记录
    function unstake(address _u, uint _recordIndex) external onlyM {
        require(_recordIndex < stakeRecords[_u].length, "!idx");
        StakeRecord storage record = stakeRecords[_u][_recordIndex];
        require(record.active, "!active");
        require(record.amount > 0, "!amt");
        
        // 检查是否到期
        require(block.timestamp >= record.startTime + record.duration, "!time");
        
        uint256 amt = record.amount;
        uint256 periodIndex = _getPeriodIndex(record.duration);
        
        // 先领取待领取的奖励
        uint256 pending = sAmt[_u][periodIndex] * sA[periodIndex] / 1e12 - sDebt[_u][periodIndex];
        if (pending > 0) {
            sDebt[_u][periodIndex] = sAmt[_u][periodIndex] * sA[periodIndex] / 1e12;
            userPendingDQ[_u][periodIndex] += pending;
        }
        
        // 更新汇总数据
        sAmt[_u][periodIndex] -= amt;
        tS[periodIndex] -= amt;
        sDebt[_u][periodIndex] = sAmt[_u][periodIndex] * sA[periodIndex] / 1e12;
        
        // 标记记录无效
        record.active = false;
        record.amount = 0;
        
        // DQ返还用户
        IERC20(DQ_TOKEN).safeTransfer(_u, amt);
        emit Unstake(_u, amt, periodIndex);
    }
    
    // 根据时长获取周期索引
    function _getPeriodIndex(uint256 _duration) internal pure returns (uint) {
        if (_duration == 30 days) return 0;
        if (_duration == 90 days) return 1;
        if (_duration == 180 days) return 2;
        return 3;  // 360 days
    }
    
    // 领取质押奖励（DQ）
    function clmS(address _u, uint _i) external onlyM {
        require(!isB[_u], "bl");
        require(_i < 4, "!i");
        
        // 领取汇总奖励
        uint256 p = sAmt[_u][_i] * sA[_i] / 1e12 - sDebt[_u][_i];
        if (p > 0) {
            sDebt[_u][_i] = sAmt[_u][_i] * sA[_i] / 1e12;
            userPendingDQ[_u][_i] += p;
            _recordReward(_u, 7, p, address(0), 1);  // 7=DQ分红, 1=DQ
        }
    }
    
    // 提取待领取DQ奖励
    function withdrawDQReward(address _u, uint _i) external onlyM {
        require(_i < 4, "!i");
        uint256 amt = userPendingDQ[_u][_i];
        if (amt > 0) {
            userPendingDQ[_u][_i] = 0;
            IERC20(DQ_TOKEN).safeTransfer(_u, amt);
        }
    }
    
    // 提取待领取DQ爆块奖励(LP/节点/D等级)
    function withdrawBlockDQ(address _u) external onlyM {
        uint256 amt = userBlockDQ[_u];
        if (amt > 0) {
            userBlockDQ[_u] = 0;
            IERC20(DQ_TOKEN).safeTransfer(_u, amt);
        }
    }
    
    // 查询用户质押记录数量
    function getStakeRecordCount(address _u) external view returns (uint256) {
        return stakeRecords[_u].length;
    }
    
    // 查询用户质押记录详情
    function getStakeRecord(address _u, uint256 _idx) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint256 pendingReward,
        bool active,
        bool canUnstake
    ) {
        require(_idx < stakeRecords[_u].length, "!idx");
        StakeRecord storage record = stakeRecords[_u][_idx];
        uint256 periodIndex = _getPeriodIndex(record.duration);
        uint256 pending = record.amount * sA[periodIndex] / 1e12 - record.rewardDebt;
        return (
            record.amount,
            record.startTime,
            record.duration,
            pending,
            record.active,
            record.duration == 0 || block.timestamp >= record.startTime + record.duration
        );
    }
    
    // 查询汇总质押信息（兼容旧接口）
    function getStk(address _u, uint _i) external view returns (uint256, uint256) {
        uint256 pending = sAmt[_u][_i] * sA[_i] / 1e12 - sDebt[_u][_i];
        uint256 totalPending = pending + userPendingDQ[_u][_i];
        return (sAmt[_u][_i], totalPending);
    }
    
    // 查询待领取DQ
    function getPendingDQ(address _u, uint _i) external view returns (uint256) {
        return userPendingDQ[_u][_i];
    }

    // ============ DQ费用分配 ============
    // 分配卖出DQ手续费（6%的一半给质押池）
    // 按权重加权分配：30天5%、90天10%、180天15%、360天20%
    function distDQFee(uint256 _amount) external onlyM {
        if (_amount == 0) return;
        
        // 计算总权重质押量 = Σ(质押量 × 权重)
        uint256 totalWeightedStake;
        for (uint256 i; i < 4; i++) {
            totalWeightedStake += tS[i] * stakeWeights[i];
        }
        
        if (totalWeightedStake == 0) {
            // 没有质押，全部给合伙人
            IERC20(DQ_TOKEN).safeTransfer(PARTNER, _amount);
            return;
        }
        
        // 按权重分配给各周期（DQ保留在合约，等用户领取时转出）
        for (uint256 i; i < 4; i++) {
            if (tS[i] > 0) {
                // 该周期应得奖励 = 总奖励 × (质押量×权重 / 总权重质押量)
                uint256 reward = _amount * tS[i] * stakeWeights[i] / totalWeightedStake;
                sA[i] += reward * 1e12 / tS[i];
            }
        }
        // DQ保留在合约，用户领取时claimStakeReward转给用户
    }

    // ============ 提取 ============
    function withdraw(address _u, uint256 _a) external onlyM {
        require(_a <= userPendingSOL[_u], "!bal");
        userPendingSOL[_u] -= _a;
        IERC20(SOL).safeTransfer(_u, _a);
    }
    function withdrawSOL(uint256 _amount) external onlyOwner {
        IERC20(SOL).safeTransfer(OWNER, _amount);
    }
    function withdrawDQ(uint256 _amount) external onlyOwner {
        IERC20(DQ_TOKEN).safeTransfer(OWNER, _amount);
    }

    // ============ 合伙人 ============
    function distP(uint256 _f) external onlyM { if (_f != 0) pDA += _f * 1e12; }
    function claimPdq(address _u) external onlyM {
        uint256 r = pDA / 1e12 - userPDD[_u];
        if (r > 0) { userPDD[_u] = pDA / 1e12; userPendingSOL[_u] += r; }
    }

    receive() external payable {}
}
