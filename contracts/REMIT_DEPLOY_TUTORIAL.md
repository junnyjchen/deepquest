# Remix IDE 部署合约完整教程

## 目录

1. [Remix IDE 简介](#1-remix-ide-简介)
2. [准备工作](#2-准备工作)
3. [创建合约文件](#3-创建合约文件)
4. [编译合约](#4-编译合约)
5. [部署到 BSC 测试网](#5-部署到-bsc-测试网)
6. [部署到 BSC 主网](#6-部署到-bsc-主网)
7. [验证合约](#7-验证合约)
8. [节点操作教程](#8-节点操作教程)

---

## 1. Remix IDE 简介

### 什么是 Remix IDE

| 特点 | 说明 |
|------|------|
| **类型** | 浏览器在线 IDE |
| **无需安装** | 直接在浏览器中使用 |
| **支持网络** | Ethereum, BSC, Polygon 等 EVM 兼容链 |
| **费用** | 完全免费 |
| **网址** | https://remix.ethereum.org |

### Remix IDE 界面介绍

```
┌─────────────────────────────────────────────────────────────────┐
│  [File Explorer]  [Solidity Compiler]  [Deploy & Run]  [GitHub] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐   ┌─────────────────────────────────────────┐  │
│   │ WORKSPACE   │   │                                           │  │
│   │            │   │              编辑器区域                    │  │
│   │ contracts/ │   │                                           │  │
│   │  ├ DQ.sol  │   │                                           │  │
│   │  └ NFT.sol │   │                                           │  │
│   │            │   │                                           │  │
│   │ scripts/   │   │                                           │  │
│   └─────────────┘   └─────────────────────────────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [Terminal]                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 准备工作

### 2.1 安装 MetaMask 钱包

1. **安装 MetaMask 浏览器扩展**
   - Chrome: https://chrome.google.com/webstore/detail/metamask
   - Firefox: https://addons.mozilla.org/firefox/browser/addon/ether-metamask/
   - Edge: https://microsoftedge.microsoft.com/addons/detail/imetamask

2. **创建或导入钱包**
   ```
   Chrome 右上角 → 点击狐狸图标 → "Get Started" → "Create a Wallet"
   ```

3. **设置网络为 BSC**
   
   点击 MetaMask 右上角头像 → Settings → Networks → Add Network

   **BSC Mainnet（主网）:**
   | 字段 | 值 |
   |------|-----|
   | Network Name | BSC Mainnet |
   | New RPC URL | https://bsc-dataseed.binance.org |
   | Chain ID | 56 |
   | Currency Symbol | BNB |
   | Block Explorer URL | https://bscscan.com |

   **BSC Testnet（测试网）:**
   | 字段 | 值 |
   |------|-----|
   | Network Name | BSC Testnet |
   | New RPC URL | https://data-seed-prebsc-1-s1.binance.org:8545 |
   | Chain ID | 97 |
   | Currency Symbol | BNB |
   | Block Explorer URL | https://testnet.bscscan.com |

### 2.2 获取测试币

1. 切换 MetaMask 到 **BSC Testnet** 网络
2. 访问水龙头：https://testnet.binance.org/faucet-smart
3. 粘贴你的钱包地址
4. 点击 "Give Me BNB"
5. 等待 1 BNB 到账

### 2.3 获取主网 BNB

| 方式 | 说明 |
|------|------|
| Binance 购买 | 购买 BNB 后提现到钱包地址 |
| 朋友转账 | 从其他钱包转入 |

---

## 3. 创建合约文件

### 3.1 访问 Remix IDE

打开浏览器访问：https://remix.ethereum.org

### 3.2 创建工作区

1. 点击左侧 **File Explorer** 图标
2. 点击 **Create a New File**（文件夹图标）
3. 输入文件名：`DQProject.sol`

### 3.3 复制合约代码

将以下完整合约代码粘贴到编辑器中：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title DQProject Smart Contract
 * @notice DeepQuest DeFi Platform - BSC Network
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ---------- DQ 代币 ----------
contract DQToken is ERC20 {
    constructor() ERC20("DQ Token", "DQ") {
        _mint(address(this), 100_000_000_000 * 10**18);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ---------- NFT 卡牌 ----------
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    uint256 public constant CARD_A = 1;
    uint256 public constant CARD_B = 2;
    uint256 public constant CARD_C = 3;
    
    uint256 public constant MAX_A = 3000;
    uint256 public constant MAX_B = 1000;
    uint256 public constant MAX_C = 300;
    
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    
    uint256 public constant PRICE_A = 500 ether;
    uint256 public constant PRICE_B = 1000 ether;
    uint256 public constant PRICE_C = 3000 ether;
    
    mapping(uint256 => uint256) public cardType;
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    
    constructor() ERC721("DQ Card", "DQC") {}
    
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    
    function mintBatchByOwner(address[] calldata to, uint256[] calldata _types) external onlyOwner {
        require(to.length == _types.length, "length mismatch");
        for (uint i = 0; i < to.length; i++) {
            _mintCard(to[i], _types[i]);
        }
    }
    
    function _mintCard(address to, uint256 _type) internal {
        require(_type >= CARD_A && _type <= CARD_C, "invalid type");
        
        if (_type == CARD_A) {
            require(totalA < MAX_A, "A sold out");
            totalA++;
        } else if (_type == CARD_B) {
            require(totalB < MAX_B, "B sold out");
            totalB++;
        } else {
            require(totalC < MAX_C, "C sold out");
            totalC++;
        }
        
        uint256 tokenId = totalSupply() + 1;
        _safeMint(to, tokenId);
        cardType[tokenId] = _type;
        _holderTokens[to].add(tokenId);
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (from != address(0)) {
            _holderTokens[from].remove(tokenId);
        }
        if (to != address(0)) {
            _holderTokens[to].add(tokenId);
        }
    }
    
    function getCardPrice(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return PRICE_A;
        if (_type == CARD_B) return PRICE_B;
        return PRICE_C;
    }
}

// ---------- 主合约 ----------
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    DQToken public dqToken;
    DQCard public dqCard;
    
    address public constant USDT_ADDRESS = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    
    uint256 public dqPrice = 1 ether;

    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;

    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];

    struct User {
        address referrer;
        uint256 directCount;
        uint8 level;
        uint256 totalInvest;
        uint256 teamInvest;
        uint256 energy;
        uint256 lpShares;
        uint256 lpRewardDebt;
        uint256 pendingRewards;
        uint256 totalMgmtClaimed;
        uint256 totalDaoClaimed;
        uint8 dLevel;
        uint256 dRewardDebt;
        uint256[3] nftRewardDebt;
        uint256 directSales;
        EnumerableSet.AddressSet children;
    }

    mapping(address => User) public users;
    address[] public allUsers;

    address[] public partnerList;
    mapping(address => bool) public isPartner;
    uint256 public partnerCount;
    uint256 public partnerDQRewardDebt;
    uint256 public partnerDQAccPerShare;
    mapping(address => uint256) public partnerDQDebt;
    uint256 public partnerSolAccPerShare;
    mapping(address => uint256) public partnerSolDebt;

    uint256 public managementPool;
    uint256 public daoPool;
    uint256 public insurancePool;
    uint256 public operationPool;
    uint256 public feePool;
    uint256 public lpPool;

    uint256 public totalLPShares;
    uint256 public lpAccPerShare;

    uint256[3] public nftTotalShares;
    uint256[3] public nftAccPerShare;

    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;

    uint256 public lastBlockTime;
    uint256 public dailyReleaseRate = 13;
    uint256 public burnRate = 80;
    uint256 public constant MIN_BURN_RATE = 30;
    uint256 public constant BURN_DECREMENT = 5;

    uint256[3] public feeAccPerShare;
    mapping(uint256 => uint256) public lastFeePerShare;

    struct Stake {
        uint256 amount;
        uint256 rewardDebt;
    }
    mapping(address => mapping(uint => Stake)) public stakes;
    uint256[] public stakePeriods = [30, 90, 180, 360];
    uint256[] public stakeRates = [5, 10, 15, 20];
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalStaked;

    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount);
    event LevelUp(address indexed user, uint8 newLevel);
    event DLevelUp(address indexed user, uint8 newDLevel);
    event ReferralReward(address indexed from, address indexed to, uint256 amount);
    event NodeReward(address indexed user, uint256 amount);
    event ManagementReward(address indexed user, uint256 amount);
    event DaoReward(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount, uint256 fee);
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    event ClaimLp(address indexed user, uint256 amount);
    event ClaimNft(address indexed user, uint256 amount);
    event ClaimDTeam(address indexed user, uint256 amount);
    event ClaimFee(address indexed user, uint256 amount);
    event InitialNodesAdded(address[] users, uint8[] cardTypes);
    event PartnerAdded(address indexed user, uint256 order);
    event ClaimPartnerDQ(address indexed user, uint256 amount);
    event ClaimPartnerSol(address indexed user, uint256 amount);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event StakeDQ(address indexed user, uint256 amount, uint256 period);
    event UnstakeDQ(address indexed user, uint256 amount, uint256 period);
    event SwapDQForUSDT(address indexed user, uint256 dqAmount, uint256 usdtAmount);
    event SwapUSDTForDQ(address indexed user, uint256 usdtAmount, uint256 dqAmount);
    event PriceUpdated(uint256 newPrice);

    constructor() {
        dqToken = new DQToken();
        dqCard = new DQCard();
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        users[owner()].referrer = address(0);
        allUsers.push(owner());
    }

    modifier onlyRegistered() {
        require(users[msg.sender].referrer != address(0) || msg.sender == owner(), "not registered");
        _;
    }

    function register(address _referrer) external {
        require(_referrer != address(0) && _referrer != msg.sender, "invalid referrer");
        require(users[msg.sender].referrer == address(0), "already registered");
        require(users[_referrer].referrer != address(0) || _referrer == owner(), "referrer not registered");

        users[msg.sender].referrer = _referrer;
        users[_referrer].directCount++;
        users[_referrer].children.add(msg.sender);
        allUsers.push(msg.sender);

        emit Register(msg.sender, _referrer);
    }

    function getCurrentMaxInvest() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        uint256 phase = elapsed / PHASE_DURATION;
        uint256 max = INVEST_MAX_START + phase * INVEST_MAX_STEP;
        if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
        return max;
    }

    function deposit(uint256 amount) external nonReentrant onlyRegistered {
        require(amount >= INVEST_MIN && amount <= getCurrentMaxInvest(), "amount out of range");

        IERC20(USDT_ADDRESS).safeTransferFrom(msg.sender, address(this), amount);

        uint256 half = amount / 2;

        User storage user = users[msg.sender];
        user.totalInvest += amount;
        user.energy += amount * 3;
        user.lpShares += half;
        totalLPShares += half;
        lpPool += half;

        address referrer = user.referrer;
        if (referrer != address(0)) {
            users[referrer].directSales += amount;
        }

        _distributeDynamic(msg.sender, half);
        _updateTeamInvest(msg.sender, amount);
        _checkLevelUp(msg.sender);
        _checkDLevel(msg.sender);
        _checkAndAddPartner(msg.sender);

        emit Deposit(msg.sender, amount);
    }

    function _checkAndAddPartner(address _user) internal {
        if (isPartner[_user]) return;
        if (partnerCount >= 50) return;

        User storage user = users[_user];
        uint256 investReq = 5000 ether;
        if (user.totalInvest < investReq) return;

        uint256 salesReq;
        if (partnerCount < 20) {
            salesReq = 30000 ether;
        } else {
            salesReq = 50000 ether;
        }
        if (user.directSales < salesReq) return;

        isPartner[_user] = true;
        partnerList.push(_user);
        partnerCount++;
        emit PartnerAdded(_user, partnerCount);
    }

    function addInitialNodes(address[] calldata _users, uint8[] calldata _cardTypes) external onlyOwner {
        require(_users.length == _cardTypes.length, "length mismatch");
        for (uint i = 0; i < _users.length; i++) {
            address user = _users[i];
            uint8 cardType = _cardTypes[i];
            require(users[user].referrer != address(0) || user == owner(), "user not registered");
            dqCard.mintByOwner(user, cardType);
            if (cardType == 1 && users[user].level < 1) {
                users[user].level = 1;
                emit LevelUp(user, 1);
            } else if (cardType == 2 && users[user].level < 2) {
                users[user].level = 2;
                emit LevelUp(user, 2);
            } else if (cardType == 3 && users[user].level < 3) {
                users[user].level = 3;
                emit LevelUp(user, 3);
            }
        }
        emit InitialNodesAdded(_users, _cardTypes);
    }

    function _distributeDynamic(address _user, uint256 _half) internal {
        uint256 directShare = _half * 30 / 100;
        uint256 nodeShare = _half * 15 / 100;
        uint256 mgmtShare = _half * 30 / 100;
        uint256 daoShare = _half * 10 / 100;
        uint256 insuranceShare = _half * 7 / 100;
        uint256 operationShare = _half * 8 / 100;

        address referrer = users[_user].referrer;
        if (referrer != address(0)) {
            users[referrer].pendingRewards += directShare;
            emit ReferralReward(_user, referrer, directShare);
        } else {
            operationPool += directShare;
        }

        _distributeNode(_user, nodeShare);
        _distributeManagement(_user, mgmtShare);
        _distributeDAO(_user, daoShare);

        insurancePool += insuranceShare;
        operationPool += operationShare;
    }

    function _distributeNode(address _user, uint256 _totalNode) internal {
        uint256 perLayer = _totalNode / 15;
        uint256 remaining = _totalNode - perLayer * 15;
        insurancePool += remaining;

        address current = users[_user].referrer;
        uint256 layer = 1;
        while (current != address(0) && layer <= 15) {
            uint256 maxLayer = users[current].directCount * 3;
            if (maxLayer > 15) maxLayer = 15;
            if (layer <= maxLayer) {
                users[current].pendingRewards += perLayer;
                emit NodeReward(current, perLayer);
            } else {
                insurancePool += perLayer;
            }
            current = users[current].referrer;
            layer++;
        }
        while (layer <= 15) {
            insurancePool += perLayer;
            layer++;
        }
    }

    function _distributeManagement(address _user, uint256 _totalMgmt) internal {
        address current = users[_user].referrer;
        uint256 lastRate = 0;
        while (current != address(0)) {
            uint8 level = users[current].level;
            uint256 rate = levelRates[level];
            if (rate > lastRate) {
                uint256 delta = rate - lastRate;
                uint256 reward = _totalMgmt * delta / 30;
                users[current].pendingRewards += reward;
                emit ManagementReward(current, reward);
                lastRate = rate;
            }
            current = users[current].referrer;
        }
        if (lastRate < 30) {
            uint256 remaining = _totalMgmt * (30 - lastRate) / 30;
            insurancePool += remaining;
        }
    }

    function _distributeDAO(address _user, uint256 _totalDao) internal {
        address current = users[_user].referrer;
        uint256 lastRate = 0;
        while (current != address(0)) {
            uint8 level = users[current].level;
            uint256 daoRate = 0;
            if (level >= 6) daoRate = 10;
            else if (level >= 3) daoRate = 5;
            
            if (daoRate > lastRate) {
                uint256 delta = daoRate - lastRate;
                uint256 reward = _totalDao * delta / 10;
                users[current].pendingRewards += reward;
                emit DaoReward(current, reward);
                lastRate = daoRate;
            }
            current = users[current].referrer;
        }
        if (lastRate < 10) {
            uint256 remaining = _totalDao * (10 - lastRate) / 10;
            operationPool += remaining;
        }
    }

    function _updateTeamInvest(address _user, uint256 _amount) internal {
        address current = _user;
        while (current != address(0)) {
            users[current].teamInvest += _amount;
            current = users[current].referrer;
        }
    }

    function _checkLevelUp(address _user) internal {
        User storage user = users[_user];
        uint256 maxChild = 0;
        uint256 sumOthers = 0;
        address[] memory children = user.children.values();
        for (uint i = 0; i < children.length; i++) {
            uint256 childTeam = users[children[i]].teamInvest;
            if (childTeam > maxChild) maxChild = childTeam;
            sumOthers += childTeam;
        }
        uint256 smallArea = sumOthers - maxChild;
        uint8 newLevel = 0;
        if (smallArea >= 20000 ether) newLevel = 6;
        else if (smallArea >= 6000 ether) newLevel = 5;
        else if (smallArea >= 2000 ether) newLevel = 4;
        else if (smallArea >= 600 ether) newLevel = 3;
        else if (smallArea >= 200 ether) newLevel = 2;
        else if (smallArea >= 100 ether) newLevel = 1;
        
        if (newLevel > user.level) {
            user.level = newLevel;
            emit LevelUp(_user, newLevel);
        }
    }

    function _checkDLevel(address _user) internal {
        User storage user = users[_user];
        uint256 effective = _getEffectiveCount(_user);
        uint8 newD = 0;
        for (uint8 i = 0; i < 8; i++) {
            if (effective >= dThresholds[i]) newD = i + 1;
            else break;
        }
        if (newD != user.dLevel) {
            if (user.dLevel > 0) dTotalUsers[user.dLevel - 1]--;
            if (newD > 0) dTotalUsers[newD - 1]++;
            user.dLevel = newD;
            emit DLevelUp(_user, newD);
        }
    }

    function _getEffectiveCount(address _user) internal view returns (uint256) {
        uint256 count = 0;
        address[] memory children = users[_user].children.values();
        for (uint i = 0; i < children.length; i++) {
            if (users[children[i]].totalInvest > 0) count++;
        }
        return count;
    }

    function withdraw() external nonReentrant {
        User storage user = users[msg.sender];
        uint256 amount = user.pendingRewards;
        require(amount > 0, "no pending rewards");
        require(user.energy >= amount, "insufficient energy");

        user.energy -= amount;
        user.pendingRewards = 0;

        uint256 fee = amount * 10 / 100;
        uint256 userOut = amount - fee;
        
        uint256 nodeFee = fee * 40 / 100;
        uint256 partnerFee = fee * 30 / 100;
        uint256 operationFee = fee * 30 / 100;
        
        feePool += nodeFee;
        if (partnerCount > 0 && partnerFee > 0) {
            partnerSolAccPerShare += partnerFee * 1e12 / partnerCount;
        }
        operationPool += operationFee;

        IERC20(USDT_ADDRESS).safeTransfer(msg.sender, userOut);
        emit Withdraw(msg.sender, userOut, fee);
    }

    function blockMining() external nonReentrant {
        require(block.timestamp >= lastBlockTime + 1 days, "too early");

        uint256 totalSupply = dqToken.totalSupply();
        uint256 release = totalSupply * dailyReleaseRate / 1000;
        uint256 burn = release * burnRate / 100;
        dqToken.burn(burn);

        if (burnRate > MIN_BURN_RATE) {
            burnRate -= BURN_DECREMENT;
            if (burnRate < MIN_BURN_RATE) burnRate = MIN_BURN_RATE;
        }

        uint256 remaining = release - burn;

        uint256 lpShare = remaining * 60 / 100;
        uint256 nftShare = remaining * 15 / 100;
        uint256 foundationShare = remaining * 5 / 100;
        uint256 teamShare = remaining * 14 / 100;
        uint256 partnerShare = remaining * 6 / 100;

        if (totalLPShares > 0) {
            lpAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        _updateNftAcc(nftShare);
        
        if (foundationShare > 0) {
            dqToken.transfer(owner(), foundationShare);
        }
        
        _updateTeamAcc(teamShare);
        if (partnerCount > 0 && partnerShare > 0) {
            partnerDQAccPerShare += partnerShare * 1e12 / partnerCount;
        }

        lastBlockTime = block.timestamp;
        emit BlockMining(release, burn, block.timestamp);
    }

    function _updateNftAcc(uint256 _nftShare) internal {
        uint256[3] memory totals = [dqCard.totalA(), dqCard.totalB(), dqCard.totalC()];
        uint256[3] memory weights = [4, 5, 6];
        uint256 totalWeight = 15;
        for (uint i = 0; i < 3; i++) {
            if (totals[i] > 0) {
                uint256 shareForType = _nftShare * weights[i] / totalWeight;
                nftAccPerShare[i] += shareForType * 1e12 / totals[i];
            }
            nftTotalShares[i] = totals[i];
        }
    }

    function _updateTeamAcc(uint256 _teamShare) internal {
        uint256 perLevelShare = _teamShare / 8;
        for (uint i = 0; i < 8; i++) {
            if (dTotalUsers[i] > 0) {
                dAccPerShare[i] += perLevelShare * 1e12 / dTotalUsers[i];
            }
        }
    }

    function claimLp() external nonReentrant {
        User storage user = users[msg.sender];
        uint256 pending = user.lpShares * lpAccPerShare / 1e12 - user.lpRewardDebt;
        require(pending > 0, "no pending");
        user.lpRewardDebt = user.lpShares * lpAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimLp(msg.sender, pending);
    }

    function claimNft() external nonReentrant {
        User storage user = users[msg.sender];
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint8 ctype = uint8(dqCard.cardType(tokenId));
            uint256 typeIndex = ctype - 1;
            uint256 pending = nftAccPerShare[typeIndex] / 1e12 - user.nftRewardDebt[typeIndex];
            totalPending += pending;
            user.nftRewardDebt[typeIndex] = nftAccPerShare[typeIndex] / 1e12;
        }
        require(totalPending > 0, "no pending");
        dqToken.transfer(msg.sender, totalPending);
        emit ClaimNft(msg.sender, totalPending);
    }

    function claimDTeam() external nonReentrant {
        User storage user = users[msg.sender];
        require(user.dLevel > 0, "no d level");
        uint256 levelIndex = user.dLevel - 1;
        uint256 pending = dAccPerShare[levelIndex] / 1e12 - user.dRewardDebt;
        require(pending > 0, "no pending");
        user.dRewardDebt = dAccPerShare[levelIndex] / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimDTeam(msg.sender, pending);
    }

    function claimPartnerDQ() external nonReentrant {
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerDQAccPerShare / 1e12 - partnerDQDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerDQDebt[msg.sender] = partnerDQAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimPartnerDQ(msg.sender, pending);
    }

    function claimPartnerUSDT() external nonReentrant {
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerSolAccPerShare / 1e12 - partnerSolDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerSolDebt[msg.sender] = partnerSolAccPerShare / 1e12;
        IERC20(USDT_ADDRESS).safeTransfer(msg.sender, pending);
        emit ClaimPartnerSol(msg.sender, pending);
    }

    function claimFee() external nonReentrant {
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint8 ctype = uint8(dqCard.cardType(tokenId));
            uint256 typeIndex = ctype - 1;
            uint256 pending = feeAccPerShare[typeIndex] - lastFeePerShare[tokenId];
            if (pending > 0) {
                totalPending += pending;
                lastFeePerShare[tokenId] = feeAccPerShare[typeIndex];
            }
        }
        require(totalPending > 0, "no pending fee");
        IERC20(USDT_ADDRESS).safeTransfer(msg.sender, totalPending);
        emit ClaimFee(msg.sender, totalPending);
    }

    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        
        uint256 price = DQCard(dqCard).getCardPrice(_type);
        require(price > 0, "price not set");
        
        IERC20(USDT_ADDRESS).safeTransferFrom(msg.sender, address(this), price);
        dqCard.mintByOwner(msg.sender, _type);
        
        uint256 lpShare = price * 60 / 100;
        uint256 nftShare = price * 15 / 100;
        uint256 operationShare = price * 25 / 100;
        
        lpPool += lpShare;
        lpAccPerShare += lpShare * 1e12 / (totalLPShares > 0 ? totalLPShares : 1);
        
        uint256[3] memory weights = [4, 5, 6];
        uint256 totalWeight = 15;
        uint256 typeIndex = _type - 1;
        if (dqCard.totalA() + dqCard.totalB() + dqCard.totalC() > 0) {
            uint256 shareForType = nftShare * weights[typeIndex] / totalWeight;
            uint256[] memory totals = new uint256[](3);
            totals[0] = dqCard.totalA();
            totals[1] = dqCard.totalB();
            totals[2] = dqCard.totalC();
            uint256 totalNfts = totals[0] + totals[1] + totals[2];
            if (totalNfts > 0) {
                feeAccPerShare[typeIndex] += shareForType * 1e12 / totals[typeIndex];
            }
        }
        
        operationPool += operationShare;
        
        User storage user = users[msg.sender];
        if (_type == 1 && user.level < 1) {
            user.level = 1;
            emit LevelUp(msg.sender, 1);
        } else if (_type == 2 && user.level < 2) {
            user.level = 2;
            emit LevelUp(msg.sender, 2);
        } else if (_type == 3 && user.level < 3) {
            user.level = 3;
            emit LevelUp(msg.sender, 3);
        }
        
        emit BuyNode(msg.sender, _type, price);
    }

    function stakeDQ(uint256 _amount, uint _periodIndex) external nonReentrant {
        require(_periodIndex < stakePeriods.length, "invalid period");
        require(_amount > 0, "amount must be > 0");
        
        uint period = stakePeriods[_periodIndex];
        Stake storage s = stakes[msg.sender][period];
        
        _claimFeeStake(msg.sender, period);
        dqToken.transferFrom(msg.sender, address(this), _amount);
        
        s.amount += _amount;
        totalStaked[period] += _amount;
        s.rewardDebt = s.amount * stakeFeeAccPerShare[period] / 1e12;
        
        emit StakeDQ(msg.sender, _amount, period);
    }

    function unstakeDQ(uint _periodIndex) external nonReentrant {
        uint period = stakePeriods[_periodIndex];
        Stake storage s = stakes[msg.sender][period];
        require(s.amount > 0, "no stake");
        
        _claimFeeStake(msg.sender, period);
        
        uint256 amount = s.amount;
        s.amount = 0;
        totalStaked[period] -= amount;
        
        dqToken.transfer(msg.sender, amount);
        emit UnstakeDQ(msg.sender, amount, period);
    }

    function _claimFeeStake(address _user, uint _period) internal {
        Stake storage s = stakes[_user][_period];
        uint256 pending = s.amount * stakeFeeAccPerShare[_period] / 1e12 - s.rewardDebt;
        if (pending > 0) {
            s.rewardDebt = s.amount * stakeFeeAccPerShare[_period] / 1e12;
            dqToken.transfer(_user, pending);
        }
    }

    function swapDQForUSDT(uint256 _dqAmount) external nonReentrant {
        require(_dqAmount > 0, "amount must be > 0");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        
        uint256 usdtAmount = _dqAmount * dqPrice / 1 ether;
        require(IERC20(USDT_ADDRESS).balanceOf(address(this)) >= usdtAmount, "insufficient USDT");
        
        uint256 fee = usdtAmount * 6 / 100;
        uint256 userOut = usdtAmount - fee;
        
        dqToken.burn(_dqAmount);
        
        uint256 stakeFee = fee * 50 / 100;
        uint256 operationFee = fee * 50 / 100;
        
        _distributeStakeFee(stakeFee);
        operationPool += operationFee;
        
        IERC20(USDT_ADDRESS).safeTransfer(msg.sender, userOut);
        emit SwapDQForUSDT(msg.sender, _dqAmount, userOut);
    }

    function swapUSDTForDQ(uint256 _usdtAmount) external nonReentrant {
        require(_usdtAmount > 0, "amount must be > 0");
        require(IERC20(USDT_ADDRESS).balanceOf(msg.sender) >= _usdtAmount, "insufficient USDT");
        
        uint256 dqAmount = _usdtAmount * 1 ether / dqPrice;
        
        uint256 lpShare = _usdtAmount * 30 / 100;
        uint256 operationShare = _usdtAmount * 70 / 100;
        
        IERC20(USDT_ADDRESS).safeTransferFrom(msg.sender, address(this), _usdtAmount);
        
        lpPool += lpShare;
        if (totalLPShares > 0) {
            lpAccPerShare += lpShare * 1e12 / totalLPShares;
        }
        
        operationPool += operationShare;
        dqToken.mint(msg.sender, dqAmount);
        emit SwapUSDTForDQ(msg.sender, _usdtAmount, dqAmount);
    }

    function _distributeStakeFee(uint256 _feeAmount) internal {
        for (uint i = 0; i < stakePeriods.length; i++) {
            uint period = stakePeriods[i];
            if (totalStaked[period] > 0) {
                uint256 share = _feeAmount * stakeRates[i] / 100;
                stakeFeeAccPerShare[period] += share * 1e12 / totalStaked[period];
            }
        }
    }

    function setDQPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "price must be > 0");
        dqPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    function getUserInfo(address _user) external view returns (
        uint256 totalInvest, uint256 teamInvest, uint8 level, uint256 energy,
        uint256 lpShares, uint8 dLevel, uint256 pendingRewards, uint256 directSales, bool partnerStatus
    ) {
        User storage u = users[_user];
        return (u.totalInvest, u.teamInvest, u.level, u.energy, u.lpShares, u.dLevel, 
                u.pendingRewards, u.directSales, isPartner[_user]);
    }

    function getPendingLp(address _user) external view returns (uint256) {
        return users[_user].lpShares * lpAccPerShare / 1e12 - users[_user].lpRewardDebt;
    }

    function getPendingNft(address _user) external view returns (uint256) {
        uint256 total = 0;
        uint256 balance = dqCard.balanceOf(_user);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(_user, i);
            uint8 ctype = uint8(dqCard.cardType(tokenId));
            uint256 typeIndex = ctype - 1;
            total += nftAccPerShare[typeIndex] / 1e12 - users[_user].nftRewardDebt[typeIndex];
        }
        return total;
    }

    function getPendingDTeam(address _user) external view returns (uint256) {
        if (users[_user].dLevel == 0) return 0;
        uint256 levelIndex = users[_user].dLevel - 1;
        return dAccPerShare[levelIndex] / 1e12 - users[_user].dRewardDebt;
    }

    function getPartnerPendingDQ(address _user) external view returns (uint256) {
        if (!isPartner[_user]) return 0;
        return partnerDQAccPerShare / 1e12 - partnerDQDebt[_user];
    }

    function getPartnerPendingUSDT(address _user) external view returns (uint256) {
        if (!isPartner[_user]) return 0;
        return partnerSolAccPerShare / 1e12 - partnerSolDebt[_user];
    }

    function getStakeInfo(address _user, uint _periodIndex) external view returns (uint256 amount, uint256 pending) {
        uint period = stakePeriods[_periodIndex];
        Stake storage s = stakes[_user][period];
        uint256 pendingReward = s.amount * stakeFeeAccPerShare[period] / 1e12 - s.rewardDebt;
        return (s.amount, pendingReward);
    }

    function getSwapQuote(uint256 _dqAmount) external view returns (uint256) {
        return _dqAmount * dqPrice / 1 ether;
    }

    function emergencyWithdrawUSDT(uint256 amount) external onlyOwner {
        IERC20(USDT_ADDRESS).safeTransfer(owner(), amount);
    }

    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
```

### 3.4 保存文件

按 `Ctrl + S`（Windows）或 `Cmd + S`（Mac）保存文件。

---

## 4. 编译合约

### 4.1 打开编译器

1. 点击左侧 **Solidity Compiler** 图标（第二个图标）
2. 或按快捷键 `Ctrl + Shift + D`

### 4.2 配置编译器

| 设置项 | 值 |
|--------|-----|
| Compiler | 0.8.17+ |
| Language | Solidity |
| EVM Version | Default |

### 4.3 编译步骤

1. 确保文件 `DQProject.sol` 已被选中
2. 点击 **Compile DQProject.sol**
3. 等待编译完成

### 4.4 编译成功标志

```
✓ Compilation successful
✓ No warnings
```

### 4.5 处理错误

如果出现错误：

| 错误类型 | 解决方法 |
|----------|----------|
| License Error | 在文件顶部添加 `// SPDX-License-Identifier: MIT` |
| Import Error | 确保所有 OpenZeppelin 导入正确 |
| Type Error | 检查变量类型是否匹配 |

---

## 5. 部署到 BSC 测试网

### 5.1 打开部署面板

1. 点击左侧 **Deploy & Run Transactions** 图标（第三个图标）
2. 或按快捷键 `Ctrl + Alt + D`

### 5.2 配置部署环境

1. **选择 Environment**
2. 点击 **Injected Provider - MetaMask**
3. MetaMask 会弹出，点击 **连接**

### 5.3 选择网络

在 MetaMask 中切换到 **BSC Testnet** 网络

### 5.4 选择合约

1. 在 Contract 下拉框中选择 **DQProject**
2. 确认构造函数不需要参数（`() No parameter`）

### 5.5 执行部署

1. 点击 **Deploy** 按钮
2. MetaMask 会弹出，显示 Gas 费用
3. 点击 **确认**
4. 等待交易确认（约 5-10 秒）

### 5.6 部署成功

```
✅ Transaction confirmed
✅ Block: 12345678
✅ Gas Used: 3,500,000
```

### 5.7 记录合约地址

在 Remix 控制台或 BSCScan 上复制合约地址：

1. 点击交易哈希
2. 跳转到 BSCScan
3. 复制 **To** 地址（合约地址）

---

## 6. 部署到 BSC 主网

### 6.1 安全检查

| 检查项 | 状态 |
|--------|------|
| 已在测试网验证通过 | ☐ |
| 私钥备份完成 | ☐ |
| MetaMask 切换到主网 | ☐ |
| BNB 余额充足（>= 0.5 BNB） | ☐ |

### 6.2 切换到主网

在 MetaMask 中：
1. 点击网络下拉菜单
2. 选择 **BSC Mainnet**
3. 确认余额充足

### 6.3 部署步骤

**与测试网相同，重复 5.2 - 5.7 步骤**

### 6.4 记录主网合约地址

```
✅ 主网 DQProject 合约地址: 0x...
```

---

## 7. 验证合约

### 7.1 在 BSCScan 上验证

#### 方式一：Remix 自动验证

1. 在 Remix Deploy 面板
2. 点击合约地址旁边的 **BSCScan** 图标
3. 按提示完成验证

#### 方式二：手动验证

1. 访问 https://bscscan.com
2. 搜索你的合约地址
3. 点击 **Contract** → **Verify and Publish**
4. 填写验证信息：

| 字段 | 值 |
|------|-----|
| Contract Address | 你的合约地址 |
| Compiler Type | Solidity (Single File) |
| Compiler Version | 0.8.17 |
| Optimization | Yes (200 runs) |
| Contract Code | 粘贴 DQProject.sol 全部代码 |

5. 点击 **Verify**
6. 等待验证完成

---

## 8. 节点操作教程

### 8.1 连接 Remix 与已部署合约

1. 在 Remix **Deploy & Run** 面板
2. 选择 **At Address**
3. 粘贴合约地址
4. 点击 **At Address**

### 8.2 批量添加初始节点

#### 操作步骤

1. **展开合约面板**
   - 找到 `addInitialNodes` 函数

2. **准备用户地址列表**
   ```
   示例：
   [
     "0x1234567890123456789012345678901234567890",
     "0x2345678901234567890123456789012345678901",
     "0x3456789012345678901234567890123456789012"
   ]
   ```

3. **准备卡牌类型列表**
   ```
   示例：
   [1, 2, 3]
   - 1 = A级节点（500 USDT）
   - 2 = B级节点（1000 USDT）
   - 3 = C级节点（3000 USDT）
   ```

4. **执行操作**
   - 在 `_users` 输入框输入用户地址数组
   - 在 `_cardTypes` 输入框输入卡牌类型数组
   - 点击 **transact**
   - MetaMask 确认交易

#### 重要提示

```
⚠️ 用户必须先注册（调用过 register）
⚠️ 每次最多 50 个（建议分批执行）
⚠️ 只有合约 Owner 才能执行此操作
```

### 8.3 添加单个节点

#### 操作步骤

1. 找到 `buyNode` 函数
2. 输入参数：
   - `_type`: 1（A级）、2（B级）、3（C级）
3. 点击 **transact**
4. MetaMask 确认交易

```
示例：
用户购买 B级节点（1000 USDT）
_type = 2
```

### 8.4 查询节点信息

#### 查询用户等级

```
在 Remix 合约面板：

1. 找到 getUserInfo 函数
2. 输入用户地址
3. 点击 call
4. 查看返回结果中的 level 值
```

返回结果解读：

```
0: totalInvest (uint256)
1: teamInvest (uint256)
2: level (uint8)     ← 用户等级 0-6
3: energy (uint256)
4: lpShares (uint256)
5: dLevel (uint8)    ← D等级 0-8
6: pendingRewards (uint256)
7: directSales (uint256)
8: partnerStatus (bool) ← 是否合伙人
```

#### 查询卡牌统计

```
1. 找到 dqCard 合约
2. 在 At Address 输入框粘贴 DQCard 地址
3. 点击 At Address

可用查询函数：
- totalA() → A级总发行
- totalB() → B级总发行
- totalC() → C级总发行
- PRICE_A() → A级价格
- PRICE_B() → B级价格
- PRICE_C() → C级价格
```

### 8.5 更新用户等级的方法

#### 方法一：购买节点（自动升级）

```
用户调用 buyNode(卡牌类型)
合约自动升级用户等级

规则：
- 购买A级节点 → 用户等级 >= 1
- 购买B级节点 → 用户等级 >= 2
- 购买C级节点 → 用户等级 >= 3
```

#### 方法二：管理员批量发放

```
Owner 调用 addInitialNodes
合约自动升级用户等级

规则同上
```

#### 方法三：入金自动升级

```
用户调用 deposit(金额)
合约根据团队业绩自动升级

规则：
- 团队小区域 >= 100 BNB → 等级 1
- 团队小区域 >= 200 BNB → 等级 2
- 团队小区域 >= 600 BNB → 等级 3
- 团队小区域 >= 2000 BNB → 等级 4
- 团队小区域 >= 6000 BNB → 等级 5
- 团队小区域 >= 20000 BNB → 等级 6
```

### 8.6 常见问题

| 问题 | 解决方案 |
|------|----------|
| 节点添加失败 | 检查用户是否已注册 |
| 交易超时 | 提高 Gas 费用重试 |
| 余额不足 | 充值 BNB 到钱包 |
| 找不到函数 | 确认合约地址正确 |

---

## 附录：快速参考卡片

### Remix IDE 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + S | 保存文件 |
| Ctrl + C | 复制 |
| Ctrl + V | 粘贴 |
| Ctrl + Z | 撤销 |
| Ctrl + / | 注释/取消注释 |
| Ctrl + Shift + D | 打开编译器 |
| Ctrl + Alt + D | 打开部署面板 |

### 常用函数速查

| 函数 | 用途 | 调用者 |
|------|------|--------|
| register | 注册用户 | 用户 |
| deposit | 入金 | 用户 |
| buyNode | 购买节点 | 用户 |
| stakeDQ | 质押 DQ | 用户 |
| withdraw | 提现 | 用户 |
| claimLp | 领取 LP 分红 | 用户 |
| claimNft | 领取 NFT 分红 | 用户 |
| addInitialNodes | 批量添加节点 | Owner |
| blockMining | 爆块奖励 | Owner |

### BSCScan 链接格式

| 环境 | BSCScan 链接 |
|------|-------------|
| 测试网 | https://testnet.bscscan.com/address/ |
| 主网 | https://bscscan.com/address/ |

### 网络参数

| 网络 | Chain ID | RPC URL |
|------|----------|---------|
| BSC Mainnet | 56 | https://bsc-dataseed.binance.org |
| BSC Testnet | 97 | https://data-seed-prebsc-1-s1.binance.org:8545 |

---

## 技术支持

如有问题请检查：

1. MetaMask 是否已连接
2. 网络是否正确切换
3. 余额是否充足
4. 合约地址是否正确
