// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDQMiningStakeCore {
    function getLP(address _u) external view returns (uint256);
    function getLPEquity(address _u) external view returns (uint256);
    function totalLP() external view returns (uint256);
    function totalLPEquitySupply() external view returns (uint256);
    function lpAccumulator() external view returns (uint256);
    function lpRewardDebt(address _u) external view returns (uint256);
    function lpEquityDebt(address _u) external view returns (uint256);
    function updateLPDebt(address _user) external;
    function coreContract() external view returns (address);
    function dqToken() external view returns (address);
    function FOUNDATION() external view returns (address);
    function PARTNER() external view returns (address);
    function FIXED_NODE() external view returns (address);
    function CLAIM_FEE() external view returns (uint256);
}

interface IDQMCoreForVault {
    function getUserEnergy(address _user) external view returns (uint256);
    function isBlacklisted(address _user) external view returns (bool);
}

/**
 * @title DQMiningStakeVault
 * @notice DQ质押系统 - LP奖励领取 + 单币质押模块
 * @dev 从DQMiningStakeCore拆分出来，以符合24KB部署限制
 */
contract DQMiningStakeVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 常量 ============
    
    uint256 public constant CLAIM_FEE = 1000; // 10% (basis points)
    
    // ============ 不可变引用 ============
    
    address public immutable stakeCore;    // DQMiningStakeCore合约地址
    address public immutable dqToken;      // DQ代币地址
    address public immutable coreContract; // DQMCore合约地址
    address public immutable FOUNDATION;
    address public immutable PARTNER;
    address public immutable FIXED_NODE;
    
    // ============ 单币质押状态 ============
    
    // 质押周期：0=30天, 1=90天, 2=180天, 3=360天
    uint256[4] public stakeDurations = [30 days, 90 days, 180 days, 360 days];
    uint256[4] public stakeWeights = [1, 2, 4, 8]; // 质押权重
    
    // 单条质押记录
    struct StakeRecord {
        uint256 amount;       // 质押数量
        uint256 startTime;    // 质押开始时间
        uint256 debt;         // 奖励债务（领取时更新）
        bool    active;       // 是否有效（未解押）
    }
    
    mapping(address => mapping(uint8 => StakeRecord[])) public stakeRecords;  // 用户质押记录 [user][level][index]
    uint256[4] public tS;                   // 各周期总质押
    uint256[4] public sA;                   // 各周期累计奖励
    uint256 public totalSellFee;            // 未分配的卖出税
    
    // 累计领取记录
    mapping(address => uint256) public totalLPRewardClaimed;     // LP奖励累计领取
    mapping(address => uint256) public totalStakeRewardClaimed;  // 质押奖励累计领取
    
    // 管理合约
    address public adminContract;
    
    // ============ 事件 ============
    
    event Staked(address indexed user, uint8 level, uint256 amount);
    event Unstaked(address indexed user, uint8 level, uint256 amount);
    event SellFeeDistributed(uint256 amount);
    event StakeRewardClaimed(address indexed user, uint8 level, uint256 amount);
    event LPRewardClaimed(address indexed user, uint256 reward);
    
    // ============ 修饰符 ============
    
    modifier onlyCore() {
        require(msg.sender == coreContract || msg.sender == owner() || msg.sender == adminContract, "!core");
        _;
    }
    
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || msg.sender == adminContract, "!auth");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _stakeCore,
        address _dqToken,
        address _coreContract,
        address _foundation,
        address _partner,
        address _fixedNode
    ) Ownable(msg.sender) {
        require(_stakeCore != address(0) && _dqToken != address(0), "!zero");
        stakeCore = _stakeCore;
        dqToken = _dqToken;
        coreContract = _coreContract;
        FOUNDATION = _foundation;
        PARTNER = _partner;
        FIXED_NODE = _fixedNode;
    }
    
    function setAdminContract(address _addr) external onlyOwner {
        adminContract = _addr;
    }
    
    // ============ LP奖励领取 ============
    
    /**
     * @notice 用户领取LP奖励
     * @dev 同时支持LP质押和LP权益授权两种方式
     */
    function claimLPReward() external nonReentrant {
        require(!IDQMCoreForVault(coreContract).isBlacklisted(msg.sender), "blacklisted");
        IDQMiningStakeCore core = IDQMiningStakeCore(stakeCore);
        
        uint256 userLP = core.getLP(msg.sender);
        uint256 userEquity = core.getLPEquity(msg.sender);
        require(userLP > 0 || userEquity > 0, "!lp");
        
        uint256 _tLP = core.totalLP();
        uint256 _totalLPEquity = core.totalLPEquitySupply();
        require(_tLP > 0 || _totalLPEquity > 0, "!total");
        
        uint256 lA = core.lpAccumulator();
        uint256 totalReward = 0;
        
        // 计算LP质押奖励
        if (userLP > 0 && _tLP > 0) {
            uint256 pendingLP = userLP * lA / _tLP;
            uint256 rewardLP = pendingLP - core.lpRewardDebt(msg.sender);
            if (rewardLP > 0) {
                totalReward += rewardLP;
            }
        }
        
        // 计算LP权益奖励
        if (userEquity > 0 && _totalLPEquity > 0) {
            uint256 pendingEquity = userEquity * lA / _totalLPEquity;
            uint256 rewardEquity = pendingEquity - core.lpEquityDebt(msg.sender);
            if (rewardEquity > 0) {
                totalReward += rewardEquity;
            }
        }
        
        require(totalReward > 0, "!reward");

        // 更新LP债务（防止重复领取）
        core.updateLPDebt(msg.sender);
        
        // 扣除10%手续费
        uint256 fee = totalReward * CLAIM_FEE / 10000;
        uint256 actualReward = totalReward - fee;
        
        // 手续费三方分配：30%基金会、30%合伙人、40%固定节点
        if (fee > 0) {
            uint256 foundationShare = fee * 30 / 100;
            uint256 partnerShare = fee * 30 / 100;
            uint256 nodeShare = fee - foundationShare - partnerShare;
            
            IERC20(dqToken).safeTransfer(FOUNDATION, foundationShare);
            IERC20(dqToken).safeTransfer(PARTNER, partnerShare);
            IERC20(dqToken).safeTransfer(FIXED_NODE, nodeShare);
        }
        
        IERC20(dqToken).safeTransfer(msg.sender, actualReward);
        totalLPRewardClaimed[msg.sender] += actualReward;
        emit LPRewardClaimed(msg.sender, actualReward);
    }
    
    // ============ 单币质押 ============
    
    /**
     * @notice 用户质押DQ
     * @param _level 质押周期等级 0=30天, 1=90天, 2=180天, 3=360天
     * @param _amount 质押数量
     */
    function stake(uint8 _level, uint256 _amount) external nonReentrant {
        require(!IDQMCoreForVault(coreContract).isBlacklisted(msg.sender), "blacklisted");
        require(_level < 4, "!level");
        require(_amount > 0, "!amount");
        
        IERC20(dqToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        // 新增一条独立记录
        stakeRecords[msg.sender][_level].push(StakeRecord({
            amount: _amount,
            startTime: block.timestamp,
            debt: sA[_level],  // 当前累积器值作为债务快照
            active: true
        }));
        
        tS[_level] += _amount;
        
        emit Staked(msg.sender, _level, _amount);
    }
    
    /**
     * @notice 用户解押（按记录索引）
     * @param _level 质押周期等级
     * @param _index 质押记录索引
     */
    function unstake(uint8 _level, uint256 _index) external nonReentrant {
        require(!IDQMCoreForVault(coreContract).isBlacklisted(msg.sender), "blacklisted");
        require(_level < 4, "!level");
        
        StakeRecord[] storage records = stakeRecords[msg.sender][_level];
        require(_index < records.length, "!index");
        StakeRecord storage record = records[_index];
        require(record.active, "!active");
        
        require(block.timestamp >= record.startTime + stakeDurations[_level], "!time");
        
        // 先领取该笔未领奖励
        if (tS[_level] > 0) {
            uint256 pending = record.amount * sA[_level] / tS[_level] - record.debt;
            if (pending > 0) {
                IERC20(dqToken).safeTransfer(msg.sender, pending);
            }
        }
        
        // 标记为无效并减少总量
        record.active = false;
        tS[_level] -= record.amount;
        
        IERC20(dqToken).safeTransfer(msg.sender, record.amount);
        
        emit Unstaked(msg.sender, _level, record.amount);
    }
    
    /**
     * @notice 接收卖出税分红（由DQT或Core调用）
     * @dev 按时间等级加权分配给单币质押用户
     */
    function distributeSellFee(uint256 _amount) external {
        require(msg.sender == dqToken || msg.sender == stakeCore, "!caller");
        require(_amount > 0, "!amount");
        
        uint256 totalWeight = 0;
        for (uint8 i = 0; i < 4; i++) {
            totalWeight += tS[i] * stakeWeights[i];
        }
        
        if (totalWeight > 0) {
            for (uint8 i = 0; i < 4; i++) {
                if (tS[i] > 0) {
                    uint256 weight = tS[i] * stakeWeights[i];
                    uint256 share = _amount * weight / totalWeight;
                    sA[i] += share;
                }
            }
        } else {
            totalSellFee += _amount;
        }
        
        emit SellFeeDistributed(_amount);
    }
    
    /**
     * @notice 从Core合约接收卖出税并分配
     * @dev 由Core合约的distributeSellFee代理函数调用
     */
    function distributeSellFeeFromCore(uint256 _amount) external onlyCore {
        require(_amount > 0, "!amount");
        
        uint256 totalWeight = 0;
        for (uint8 i = 0; i < 4; i++) {
            totalWeight += tS[i] * stakeWeights[i];
        }
        
        if (totalWeight > 0) {
            for (uint8 i = 0; i < 4; i++) {
                if (tS[i] > 0) {
                    uint256 weight = tS[i] * stakeWeights[i];
                    uint256 share = _amount * weight / totalWeight;
                    sA[i] += share;
                }
            }
        } else {
            totalSellFee += _amount;
        }
        
        emit SellFeeDistributed(_amount);
    }
    
    /**
     * @notice 用户领取单币质押奖励
     * @param _level 质押周期等级
     */
    function claimStakeReward(uint8 _level) external nonReentrant {
        require(!IDQMCoreForVault(coreContract).isBlacklisted(msg.sender), "blacklisted");
        require(_level < 4, "!level");
        require(tS[_level] > 0, "!total");
        
        StakeRecord[] storage records = stakeRecords[msg.sender][_level];
        uint256 totalReward = 0;
        
        for (uint256 i = 0; i < records.length; i++) {
            StakeRecord storage record = records[i];
            if (!record.active) continue;
            
            uint256 pending = record.amount * sA[_level] / tS[_level] - record.debt;
            if (pending > 0) {
                totalReward += pending;
                record.debt = record.amount * sA[_level] / tS[_level];
            }
        }
        
        require(totalReward > 0, "!reward");
        
        IERC20(dqToken).safeTransfer(msg.sender, totalReward);
        totalStakeRewardClaimed[msg.sender] += totalReward;
        emit StakeRewardClaimed(msg.sender, _level, totalReward);
    }
    
    /**
     * @notice 查询用户单币质押信息
     */
    function getStakeInfo(address _user) external view returns (
        uint256[4] memory amounts,
        uint256[4] memory pendingRewards,
        uint256 recordCount
    ) {
        recordCount = 0;
        for (uint8 i = 0; i < 4; i++) {
            StakeRecord[] storage records = stakeRecords[_user][i];
            for (uint256 j = 0; j < records.length; j++) {
                if (records[j].active) {
                    amounts[i] += records[j].amount;
                    if (tS[i] > 0) {
                        uint256 pending = records[j].amount * sA[i] / tS[i] - records[j].debt;
                        if (pending > 0) pendingRewards[i] += pending;
                    }
                }
            }
            recordCount += records.length;
        }
    }
    
    /**
     * @notice 查询用户某等级的所有质押记录详情
     */
    function getStakeRecords(address _user, uint8 _level) external view returns (
        uint256[] memory amounts,
        uint256[] memory startTimes,
        bool[] memory actives,
        uint256[] memory pendingRewards
    ) {
        require(_level < 4, "!level");
        StakeRecord[] storage records = stakeRecords[_user][_level];
        uint256 len = records.length;
        
        amounts = new uint256[](len);
        startTimes = new uint256[](len);
        actives = new bool[](len);
        pendingRewards = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            amounts[i] = records[i].amount;
            startTimes[i] = records[i].startTime;
            actives[i] = records[i].active;
            if (records[i].active && tS[_level] > 0) {
                uint256 pending = records[i].amount * sA[_level] / tS[_level] - records[i].debt;
                pendingRewards[i] = pending;
            }
        }
    }
    
    /**
     * @notice 设置质押周期权重（管理员）
     */
    function setStakeWeights(uint256[4] calldata _weights) external onlyOwnerOrAdmin {
        stakeWeights = _weights;
    }
    
    /**
     * @notice 管理员批量导入质押记录（用于旧系统数据迁移）
     * @param _users 用户地址数组
     * @param _levels 质押周期等级数组 (0=30天, 1=90天, 2=180天, 3=360天)
     * @param _amounts 质押数量数组
     * @param _startTimes 质押开始时间数组（unix时间戳）
     */
    function batchImportStake(
        address[] calldata _users,
        uint8[] calldata _levels,
        uint256[] calldata _amounts,
        uint256[] calldata _startTimes
    ) external onlyOwnerOrAdmin {
        require(_users.length == _levels.length && _users.length == _amounts.length && _users.length == _startTimes.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            require(_levels[i] < 4, "!level");
            require(_amounts[i] > 0, "!amount");
            
            stakeRecords[_users[i]][_levels[i]].push(StakeRecord({
                amount: _amounts[i],
                startTime: _startTimes[i],
                debt: sA[_levels[i]],
                active: true
            }));
            
            tS[_levels[i]] += _amounts[i];
            
            emit Staked(_users[i], _levels[i], _amounts[i]);
        }
    }

    /**
     * @notice 提取合约资产（管理员）
     */
    function withdrawToken(address _token, address _to, uint256 _amount) external onlyOwnerOrAdmin {
        require(_to != address(0), "!zero");
        if (_token == address(0)) {
            payable(_to).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }
    
    receive() external payable {}
}
