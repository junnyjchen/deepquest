// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
interface IPancakeRouter02 {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}
interface IDQToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
}
interface IDQCard {
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function cardType(uint256 tokenId) external view returns (uint256);
    function getCardPrice(uint256 _type) external pure returns (uint256);
    function mintByOwner(address to, uint256 _type) external;
    function totalA() external view returns (uint256);
    function totalB() external view returns (uint256);
    function totalC() external view returns (uint256);
    function PRICE_A() external pure returns (uint256);
    function PRICE_B() external pure returns (uint256);
    function PRICE_C() external pure returns (uint256);
}
contract DQProject is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    IDQToken public constant dqToken = IDQToken(0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B);
    IDQCard public constant dqCard = IDQCard(0x1857aCeDf9b73163D791eb2F0374a328416291a1);
    address public constant PANCAKE_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant USDT_TOKEN = 0x55d398326f99059fF775485246999027B3197955;
    address public constant SOL_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant BUY_FEE_ADDRESS = 0x1850933c0d64db3A56476F5Bdc4191BCFd242e30;
    address public constant dqSolPair = 0x8d2b33bED72ab353bB69547efb9DA51E3517e6c0;
    address public constant foundationAddress = 0xA0f045cde45ca1aeE2033356170B46A1fF3b7202;
    address public constant operationAddress = 0x4bE56C5390869A3236F8545462896eB1E423D0d5;
    address public constant insuranceAddress = 0x2db993B862969040Cd971Df8Fd2a2C80EC285203;
    address public constant daoAddress = 0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852;
    address public constant swapFeeAddress = 0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967;
    mapping(uint256 => uint256) public dailyDepositCount;
    uint256 public constant EARLY_PHASE_END = 30 days;
    uint256 public constant EARLY_DAY10_LIMIT = 1000;
    uint256 public constant EARLY_DAY20_LIMIT = 1500;
    uint256 public constant EARLY_DAY30_LIMIT = 2000;
    struct LPRecord {
        uint256 amount;
        uint256 depositTime;
    }
    mapping(address => LPRecord[]) public userLPRecords;
    uint256 public totalLPTokenShares;
    uint256 public constant INVEST_MIN = 1 ether;
    uint256 public INVEST_MAX_START = 10 ether;
    uint256 public INVEST_MAX_STEP = 10 ether;
    uint256 public INVEST_MAX_FINAL = 200 ether;
    uint256 public PHASE_DURATION = 15 days;
    uint256 public startTime;
    uint256[7] public levelRates = [0, 5, 10, 15, 20, 25, 30];
    uint256[8] public dThresholds = [30, 120, 360, 1000, 4000, 10000, 15000, 30000];
    uint256 public dailyReleaseRate = 13;
    uint256 public burnRate = 80;
    uint256 public constant MIN_BURN_RATE = 30;
    uint256 public constant BURN_DECREMENT = 5;
    uint256 public lastBlockTime;
    uint256[] public stakePeriods = [30, 90, 180, 360];
    uint256[] public stakeRates = [5, 10, 15, 20];
    mapping(uint => uint256) public stakeFeeAccPerShare;
    mapping(uint => uint256) public totalStaked;
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
        uint256 directSales;
        uint8 dLevel;
        uint256 dRewardDebt;
        uint256[3] nftRewardDebt;
        EnumerableSet.AddressSet children;
    }
    mapping(address => User) internal _users;
    address[] public allUsers;
    mapping(address => bool) public isBlacklisted;
    address[] public partnerList;
    mapping(address => bool) public isPartner;
    uint256 public partnerCount;
    uint256 public partnerDQAccPerShare;
    mapping(address => uint256) public partnerDQDebt;
    uint256 public partnerBNBAccPerShare;
    mapping(address => uint256) public partnerBNBDebt;
    uint256 public lpPool;
    uint256 public totalLPShares;
    uint256 public lpAccPerShare;
    uint256[3] public nftAccPerShare;
    uint256[8] public dTotalUsers;
    uint256[8] public dAccPerShare;
    uint256[3] public feeAccPerShare;
    mapping(uint256 => uint256) public lastFeePerShare;
    uint256 public operationPool;
    uint256 public feePool;
    struct Stake {
        uint256 amount;
        uint256 rewardDebt;
    }
    mapping(address => mapping(uint => Stake)) public stakes;
    event Register(address indexed user, address indexed referrer);
    event Deposit(address indexed user, uint256 amount);
    event LevelUp(address indexed user, uint8 newLevel);
    event DLevelUp(address indexed user, uint8 newDLevel);
    event ReferralReward(address indexed from, address indexed to, uint256 amount);
    event Withdraw(address indexed user, uint256 amount, uint256 fee);
    event BlockMining(uint256 release, uint256 burn, uint256 timestamp);
    event ClaimLp(address indexed user, uint256 amount);
    event ClaimNft(address indexed user, uint256 amount);
    event ClaimDTeam(address indexed user, uint256 amount);
    event ClaimPartnerDQ(address indexed user, uint256 amount);
    event ClaimPartnerBNB(address indexed user, uint256 amount);
    event ClaimFee(address indexed user, uint256 amount);
    event BuyNode(address indexed user, uint256 cardType, uint256 amount);
    event StakeDQ(address indexed user, uint256 amount, uint256 period);
    event UnstakeDQ(address indexed user, uint256 amount, uint256 period);
    event SwapSOLForDQ(address indexed user, uint256 solAmount, uint256 dqAmount);
    event SwapDQForSOL(address indexed user, uint256 dqAmount, uint256 solAmount, uint256 fee);
    event PairSet(address indexed pair);
    event PartnerAdded(address indexed user, uint256 order);
    event InitialNodesAdded(address[] users, uint8[] cardTypes);
    constructor() {
        startTime = block.timestamp;
        lastBlockTime = block.timestamp;
        _users[owner()].referrer = address(0);
        allUsers.push(owner());
    }
    modifier onlyRegistered() {
        require(_users[msg.sender].referrer != address(0) || msg.sender == owner(), "not registered");
        _;
    }
    function approveRouter() external onlyOwner {
        IERC20(SOL_TOKEN).approve(PANCAKE_ROUTER, type(uint256).max);
    }
    function swapSOLForDQ(uint256 _solAmount, uint256 _minDqOut) external nonReentrant {
        require(_solAmount > 0, "amount must be > 0");
        require(dqSolPair != address(0), "pair not set");
        IERC20(SOL_TOKEN).transferFrom(msg.sender, address(this), _solAmount);
        address[] memory path = new address[](2);
        path[0] = SOL_TOKEN;
        path[1] = address(dqToken);
        uint256[] memory amounts = IPancakeRouter02(PANCAKE_ROUTER).getAmountsOut(_solAmount, path);
        uint256 dqAmount = amounts[1];
        require(dqAmount >= _minDqOut, "slippage too high");
        uint256 buyFeeDQ = dqAmount * 90 / 100;
        uint256 userDqAmount = dqAmount - buyFeeDQ;
        dqToken.transfer(BUY_FEE_ADDRESS, buyFeeDQ);
        uint256 lpShare = _solAmount * 30 / 100;
        uint256 operationShare = _solAmount * 70 / 100;
        lpPool += lpShare;
        lpAccPerShare += lpShare * 1e12 / (totalLPShares > 0 ? totalLPShares : 1);
        operationPool += operationShare;
        dqToken.transfer(msg.sender, userDqAmount);
        emit SwapSOLForDQ(msg.sender, _solAmount, dqAmount);
    }
    function swapDQForSOL(uint256 _dqAmount, uint256 _minSolOut) external nonReentrant {
        require(_dqAmount > 0, "amount must be > 0");
        require(dqSolPair != address(0), "pair not set");
        require(dqToken.balanceOf(msg.sender) >= _dqAmount, "insufficient DQ");
        dqToken.transferFrom(msg.sender, address(this), _dqAmount);
        address[] memory path = new address[](2);
        path[0] = address(dqToken);
        path[1] = SOL_TOKEN;
        uint256[] memory amounts = IPancakeRouter02(PANCAKE_ROUTER).getAmountsOut(_dqAmount, path);
        uint256 solOut = amounts[1];
        require(solOut >= _minSolOut, "slippage too high");
        uint256 fee = solOut * 6 / 100;
        uint256 userOut = solOut - fee;
        dqToken.burn(_dqAmount);
        uint256 stakeFee = fee * 50 / 100;
        uint256 feePoolShare = fee * 50 / 100;
        _distributeStakeFeeSOL(stakeFee);
        IERC20(SOL_TOKEN).safeTransfer(swapFeeAddress, feePoolShare);
        IERC20(SOL_TOKEN).safeTransfer(msg.sender, userOut);
        emit SwapDQForSOL(msg.sender, _dqAmount, userOut, fee);
    }
    function register(address _referrer) external {
        require(_referrer != address(0) && _referrer != msg.sender, "invalid referrer");
        require(_users[msg.sender].referrer == address(0), "already registered");
        require(_users[_referrer].referrer != address(0) || _referrer == owner(), "referrer not registered");
        _users[msg.sender].referrer = _referrer;
        _users[_referrer].directCount++;
        _users[_referrer].children.add(msg.sender);
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
    function depositSOL(uint256 _solAmount) external nonReentrant onlyRegistered {
        require(_solAmount >= INVEST_MIN && _solAmount <= getCurrentMaxInvest(), "amount out of range");
        IERC20(SOL_TOKEN).safeTransferFrom(msg.sender, address(this), _solAmount);
        User storage user = _users[msg.sender];
        if (user.totalInvest == 0) {
            require(dqCard.balanceOf(msg.sender) > 0, "must be node for first deposit");
            _checkAndIncrementDailyCount();
        }
        user.totalInvest += _solAmount;
        user.energy += _solAmount * 3;
        uint256 half = _solAmount / 2;
        uint256 userLPShares = _solAmount;
        user.lpShares += userLPShares;
        totalLPShares += userLPShares;
        userLPRecords[msg.sender].push(LPRecord({amount: userLPShares, depositTime: block.timestamp}));
        uint256 currentLpAccPerShare = lpAccPerShare;
        uint256 userOldTotal = user.lpShares - userLPShares;
        user.lpRewardDebt = userOldTotal * currentLpAccPerShare / 1e12;
        uint256 lpAdd = half * 1e12 / totalLPShares;
        lpAccPerShare += lpAdd;
        address referrer = user.referrer;
        if (referrer != address(0)) {
            uint256 directReward = _solAmount * levelRates[user.level] / 100;
            IERC20(SOL_TOKEN).safeTransfer(referrer, directReward);
            emit ReferralReward(msg.sender, referrer, directReward);
            _users[referrer].directSales += _solAmount;
            _updateTeamInvestAndLevel(referrer, _solAmount);
        }
        emit Deposit(msg.sender, _solAmount);
    }
    function _checkAndIncrementDailyCount() internal {
        uint256 elapsed = block.timestamp - startTime;
        uint256 day = elapsed / 1 days + 1;
        if (day <= 30) {
            uint256 limit = day <= 10 ? EARLY_DAY10_LIMIT : (day <= 20 ? EARLY_DAY20_LIMIT : EARLY_DAY30_LIMIT);
            require(dailyDepositCount[day] < limit, "daily deposit limit reached");
            dailyDepositCount[day]++;
        }
    }
    function _updateTeamInvestAndLevel(address user, uint256 amount) internal {
        uint256 userTeamInvest = _users[user].teamInvest + amount;
        _users[user].teamInvest = userTeamInvest;
        uint8 newDLevel = 0;
        for (uint8 i = 0; i < dThresholds.length; i++) {
            if (userTeamInvest >= dThresholds[i] * 1 ether) newDLevel = i + 1;
            else break;
        }
        if (newDLevel > _users[user].dLevel) {
            for (uint8 l = _users[user].dLevel; l < newDLevel; l++) dTotalUsers[l]++;
            _users[user].dLevel = newDLevel;
            emit DLevelUp(user, newDLevel);
        }
        address parent = _users[user].referrer;
        if (parent != address(0)) _updateTeamInvestAndLevel(parent, amount);
    }
    function _distributeStakeFeeSOL(uint256 totalFee) internal {
        if (totalFee == 0) return;
        for (uint i = 0; i < stakePeriods.length; i++) {
            if (totalStaked[stakePeriods[i]] > 0) {
                uint256 perShare = totalFee * 1e12 / totalStaked[stakePeriods[i]];
                stakeFeeAccPerShare[stakePeriods[i]] += perShare;
            }
        }
    }
    function _distributeNftFee(uint256 totalFee) internal {
        if (totalFee == 0) return;
        feePool += totalFee;
        uint256[3] memory shares;
        shares[0] = dqCard.totalA() * dqCard.PRICE_A();
        shares[1] = dqCard.totalB() * dqCard.PRICE_B();
        shares[2] = dqCard.totalC() * dqCard.PRICE_C();
        for (uint i = 0; i < 3; i++) {
            if (shares[i] > 0) {
                uint256 perShare = totalFee * 1e12 / shares[i];
                feeAccPerShare[i] += perShare;
            }
        }
    }
    function withdraw(uint256 _amount) external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        User storage user = _users[msg.sender];
        require(_amount > 0 && _amount <= user.energy / 2, "invalid withdraw amount");
        user.energy -= _amount * 2;
        uint256 fee = _amount * 6 / 100;
        uint256 userOut = _amount - fee;
        uint256 stakeFee = fee * 50 / 100;
        uint256 nftFee = fee * 50 / 100;
        _distributeStakeFeeSOL(stakeFee);
        _distributeNftFee(nftFee);
        IERC20(SOL_TOKEN).safeTransfer(msg.sender, userOut);
        emit Withdraw(msg.sender, _amount, fee);
    }
    function mineBlock() external nonReentrant onlyOwner {
        uint256 elapsed = block.timestamp - lastBlockTime;
        uint256 blocks = elapsed / 1 days;
        if (blocks == 0) return;
        lastBlockTime = block.timestamp;
        uint256 totalRelease;
        uint256 totalBurn;
        for (uint b = 0; b < blocks; b++) {
            uint256 currentBurnRate = burnRate > MIN_BURN_RATE ? burnRate - b * BURN_DECREMENT : MIN_BURN_RATE;
            if (currentBurnRate < MIN_BURN_RATE) currentBurnRate = MIN_BURN_RATE;
            uint256 contractDQ = dqToken.balanceOf(address(this));
            uint256 releaseBase = contractDQ * dailyReleaseRate / 1000;
            uint256 releaseAmount = releaseBase * (100 - currentBurnRate) / 100;
            uint256 burnAmount = releaseBase - releaseAmount;
            totalRelease += releaseAmount;
            totalBurn += burnAmount;
            dqToken.burn(burnAmount);
            uint256 lpPoolDQ = releaseAmount * 16 / 100;
            uint256 nftPoolDQ = releaseAmount * 12 / 100;
            uint256 dTeamPoolDQ = releaseAmount * 12 / 100;
            uint256 partnerPoolDQ = releaseAmount * 10 / 100;
            if (totalLPShares > 0) lpAccPerShare += lpPoolDQ * 1e12 / totalLPShares;
            uint256[3] memory nftShares;
            nftShares[0] = dqCard.totalA() * dqCard.PRICE_A();
            nftShares[1] = dqCard.totalB() * dqCard.PRICE_B();
            nftShares[2] = dqCard.totalC() * dqCard.PRICE_C();
            for (uint i = 0; i < 3; i++) {
                if (nftShares[i] > 0) nftAccPerShare[i] += nftPoolDQ * 1e12 / nftShares[i];
            }
            for (uint i = 0; i < 8; i++) {
                if (dTotalUsers[i] > 0) dAccPerShare[i] += dTeamPoolDQ * 1e12 / 8 / dTotalUsers[i];
            }
            if (partnerCount > 0) partnerDQAccPerShare += partnerPoolDQ * 1e12 / partnerCount;
        }
        if (burnRate > MIN_BURN_RATE) {
            uint256 newBurnRate = burnRate - blocks * BURN_DECREMENT;
            burnRate = newBurnRate > MIN_BURN_RATE ? newBurnRate : MIN_BURN_RATE;
        }
        emit BlockMining(totalRelease, totalBurn, block.timestamp);
    }
    function getTeamInvest(address user) public view returns (uint256) { return _users[user].teamInvest; }
    function getTeamSize(address user) public view returns (uint256) { return _users[user].children.length(); }
    function addPartner(address _partner) external onlyOwner {
        require(_partner != address(0), "zero address");
        require(!isPartner[_partner], "already partner");
        isPartner[_partner] = true;
        partnerList.push(_partner);
        partnerCount++;
        emit PartnerAdded(_partner, partnerCount);
    }
    function claimLp() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        User storage user = _users[msg.sender];
        require(user.lpShares > 0, "no lp shares");
        uint256 pending = user.lpShares * lpAccPerShare / 1e12 - user.lpRewardDebt;
        require(pending > 0, "no pending rewards");
        user.lpRewardDebt = user.lpShares * lpAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimLp(msg.sender, pending);
    }
    function claimNft() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        uint256 balance = dqCard.balanceOf(msg.sender);
        require(balance > 0, "no nft");
        uint256 totalPending = 0;
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            uint256 shares = dqCard.getCardPrice(ctype);
            uint256 pending = shares * nftAccPerShare[typeIndex] / 1e12 - _users[msg.sender].nftRewardDebt[typeIndex];
            if (pending > 0) {
                totalPending += pending;
                _users[msg.sender].nftRewardDebt[typeIndex] = shares * nftAccPerShare[typeIndex] / 1e12;
            }
        }
        require(totalPending > 0, "no pending rewards");
        dqToken.transfer(msg.sender, totalPending);
        emit ClaimNft(msg.sender, totalPending);
    }
    function claimDTeam() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        User storage user = _users[msg.sender];
        require(user.dLevel > 0, "no d level");
        uint256 levelIndex = user.dLevel - 1;
        uint256 pending = dAccPerShare[levelIndex] / 1e12 - user.dRewardDebt;
        require(pending > 0, "no pending");
        user.dRewardDebt = dAccPerShare[levelIndex] / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimDTeam(msg.sender, pending);
    }
    function claimPartnerDQ() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerDQAccPerShare / 1e12 - partnerDQDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerDQDebt[msg.sender] = partnerDQAccPerShare / 1e12;
        dqToken.transfer(msg.sender, pending);
        emit ClaimPartnerDQ(msg.sender, pending);
    }
    function claimPartnerBNB() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        require(isPartner[msg.sender], "not partner");
        uint256 pending = partnerBNBAccPerShare / 1e12 - partnerBNBDebt[msg.sender];
        require(pending > 0, "no pending");
        partnerBNBDebt[msg.sender] = partnerBNBAccPerShare / 1e12;
        IERC20(SOL_TOKEN).safeTransfer(msg.sender, pending);
        emit ClaimPartnerBNB(msg.sender, pending);
    }
    function claimFee() external nonReentrant {
        require(!isBlacklisted[msg.sender], "blacklisted");
        uint256 totalPending = 0;
        uint256 balance = dqCard.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = dqCard.tokenOfOwnerByIndex(msg.sender, i);
            uint256 ctype = dqCard.cardType(tokenId);
            uint256 typeIndex = ctype - 1;
            uint256 pending = feeAccPerShare[typeIndex] - lastFeePerShare[tokenId];
            if (pending > 0) {
                totalPending += pending;
                lastFeePerShare[tokenId] = feeAccPerShare[typeIndex];
            }
        }
        require(totalPending > 0, "no pending fee");
        IERC20(SOL_TOKEN).safeTransfer(msg.sender, totalPending);
        emit ClaimFee(msg.sender, totalPending);
    }
    function buyNode(uint256 _type) external nonReentrant {
        require(_type >= 1 && _type <= 3, "invalid type");
        uint256 price = dqCard.getCardPrice(_type);
        require(price > 0, "price not set");
        IERC20(USDT_TOKEN).safeTransferFrom(msg.sender, address(this), price);
        dqCard.mintByOwner(msg.sender, _type);
        address referrer = _users[msg.sender].referrer;
        if (referrer != address(0)) {
            uint256 referrerReward = price * 10 / 100;
            _users[referrer].pendingRewards += referrerReward;
            emit ReferralReward(msg.sender, referrer, referrerReward);
        }
        IERC20(USDT_TOKEN).safeTransfer(foundationAddress, price);
        User storage user = _users[msg.sender];
        if (_type == 1 && user.level < 1) user.level = 1;
        else if (_type == 2 && user.level < 2) user.level = 2;
        else if (_type == 3 && user.level < 3) user.level = 3;
        emit BuyNode(msg.sender, _type, price);
    }
    function addInitialNodes(address[] calldata _usersArr, uint8[] calldata _cardTypes) external onlyOwner {
        require(_usersArr.length == _cardTypes.length, "length mismatch");
        for (uint i = 0; i < _usersArr.length; i++) {
            address userAddr = _usersArr[i];
            uint8 cardType = _cardTypes[i];
            require(_users[userAddr].referrer != address(0) || userAddr == owner(), "user not registered");
            dqCard.mintByOwner(userAddr, cardType);
            if (cardType == 1 && _users[userAddr].level < 1) _users[userAddr].level = 1;
            else if (cardType == 2 && _users[userAddr].level < 2) _users[userAddr].level = 2;
            else if (cardType == 3 && _users[userAddr].level < 3) _users[userAddr].level = 3;
        }
        emit InitialNodesAdded(_usersArr, _cardTypes);
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
            require(dqToken.balanceOf(address(this)) >= pending, "insufficient DQ reserve");
            dqToken.transfer(_user, pending);
        }
    }
    function removeLP() external nonReentrant {
        User storage user = _users[msg.sender];
        require(user.lpShares > 0, "no LP to remove");
        LPRecord[] storage records = userLPRecords[msg.sender];
        require(records.length > 0, "no LP records");
        uint256 earliestTime = records[0].depositTime;
        for (uint i = 1; i < records.length; i++) {
            if (records[i].depositTime < earliestTime) earliestTime = records[i].depositTime;
        }
        uint256 lockDays = (block.timestamp - earliestTime) / 1 days;
        uint256 feeRate = lockDays < 60 ? 20 : (lockDays < 180 ? 10 : 0);
        uint256 lpAmount = user.lpShares;
        uint256 fee = lpAmount * feeRate / 100;
        uint256 userOut = lpAmount - fee;
        delete userLPRecords[msg.sender];
        user.lpShares = 0;
        totalLPShares -= lpAmount;
        if (fee > 0) {
            uint256 nftFee = fee * 40 / 100;
            uint256 partnerFee = fee * 30 / 100;
            uint256 operationFee = fee * 30 / 100;
            feePool += nftFee;
            if (partnerCount > 0) partnerBNBAccPerShare += partnerFee * 1e12 / partnerCount;
            IERC20(SOL_TOKEN).safeTransfer(operationAddress, operationFee);
        }
        if (userOut > 0) IERC20(SOL_TOKEN).safeTransfer(msg.sender, userOut);
        emit UnstakeDQ(msg.sender, lpAmount, fee);
    }
    function addToBlacklist(address _user) external onlyOwner { isBlacklisted[_user] = true; }
    function removeFromBlacklist(address _user) external onlyOwner { isBlacklisted[_user] = false; }
    function adminWithdrawDQ(uint256 amount) external onlyOwner {
        dqToken.transfer(owner(), amount);
    }
    function adminWithdrawSOL(uint256 amount) external onlyOwner {
        IERC20(SOL_TOKEN).safeTransfer(owner(), amount);
    }
    function getUser(address _user) external view returns (
        address referrer, uint256 directCount, uint8 level, uint256 totalInvest, 
        uint256 teamInvest, uint256 energy, uint256 lpShares, uint8 dLevel
    ) {
        User storage u = _users[_user];
        return (u.referrer, u.directCount, u.level, u.totalInvest, u.teamInvest, u.energy, u.lpShares, u.dLevel);
    }
    receive() external payable {}
}
