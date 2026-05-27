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
    function lpDebt(address _u) external view returns (uint256);
    function lpEquityDebt(address _u) external view returns (uint256);
    function coreContract() external view returns (address);
    function dqToken() external view returns (address);
    function FOUNDATION() external view returns (address);
    function PARTNER() external view returns (address);
    function FIXED_NODE() external view returns (address);
    function CLAIM_FEE() external view returns (uint256);
}

interface IDQMCoreForVault {
    function getUserEnergy(address _user) external view returns (uint256);
    function subEnergy(address _user, uint256 _amount) external;
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
    
    mapping(address => mapping(uint8 => uint256)) public sAmt;       // 用户质押金额 [user][level]
    mapping(address => mapping(uint8 => uint256)) public stakeTime;  // 质押时间
    mapping(address => mapping(uint8 => uint256)) public sDebt;      // 质押奖励债务
    uint256[4] public tS;                   // 各周期总质押
    uint256[4] public sA;                   // 各周期累计奖励
    uint256 public totalSellFee;            // 未分配的卖出税
    
    // ============ 事件 ============
    
    event Staked(address indexed user, uint8 level, uint256 amount);
    event Unstaked(address indexed user, uint8 level, uint256 amount);
    event SellFeeDistributed(uint256 amount);
    event StakeRewardClaimed(address indexed user, uint8 level, uint256 amount);
    event LPRewardClaimed(address indexed user, uint256 reward);
    
    // ============ 修饰符 ============
    
    modifier onlyCore() {
        require(msg.sender == stakeCore, "!core");
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
    
    // ============ LP奖励领取 ============
    
    /**
     * @notice 用户领取LP奖励
     * @dev 同时支持LP质押和LP权益授权两种方式
     */
    function claimLPReward() external nonReentrant {
        IDQMiningStakeCore core = IDQMiningStakeCore(stakeCore);
        
        uint256 userLP = core.getLP(msg.sender);
        uint256 userEquity = core.getLPEquity(msg.sender);
        require(userLP > 0 || userEquity > 0, "!lp");
        
        uint256 _tLP = core.totalLP();
        uint256 _totalLPEquity = core.totalLPEquitySupply();
        require(_tLP > 0 || _totalLPEquity > 0, "!total");
        
        // 检查能量 - 没有能量不能领取奖励
        uint256 userE = IDQMCoreForVault(coreContract).getUserEnergy(msg.sender);
        require(userE > 0, "!energy");
        
        uint256 lA = core.lpAccumulator();
        uint256 totalReward = 0;
        
        // 计算LP质押奖励
        if (userLP > 0 && _tLP > 0) {
            uint256 pendingLP = userLP * lA / _tLP;
            uint256 rewardLP = pendingLP - core.lpDebt(msg.sender);
            if (rewardLP > 0) {
                // 更新债务（通过Core合约）
                IDQMiningStakeCore(stakeCore); // 只读，债务更新需要回调
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
        
        // 扣除10%手续费
        uint256 fee = totalReward * CLAIM_FEE / 10000;
        uint256 actualReward = totalReward - fee;
        
        // 扣减能量
        IDQMCoreForVault(coreContract).subEnergy(msg.sender, actualReward);
        
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
        emit LPRewardClaimed(msg.sender, actualReward);
    }
    
    // ============ 单币质押 ============
    
    /**
     * @notice 用户质押DQ
     * @param _level 质押周期等级 0=30天, 1=90天, 2=180天, 3=360天
     * @param _amount 质押数量
     */
    function stake(uint8 _level, uint256 _amount) external nonReentrant {
        require(_level < 4, "!level");
        require(_amount > 0, "!amount");
        
        IERC20(dqToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        sAmt[msg.sender][_level] += _amount;
        tS[_level] += _amount;
        stakeTime[msg.sender][_level] = block.timestamp;
        
        emit Staked(msg.sender, _level, _amount);
    }
    
    /**
     * @notice 用户解押
     * @param _level 质押周期等级
     * @param _amount 解押数量
     */
    function unstake(uint8 _level, uint256 _amount) external nonReentrant {
        require(_level < 4, "!level");
        require(sAmt[msg.sender][_level] >= _amount, "!balance");
        
        uint256 st = stakeTime[msg.sender][_level];
        require(block.timestamp >= st + stakeDurations[_level], "!time");
        
        sAmt[msg.sender][_level] -= _amount;
        tS[_level] -= _amount;
        
        IERC20(dqToken).safeTransfer(msg.sender, _amount);
        
        emit Unstaked(msg.sender, _level, _amount);
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
    function distributeSellFeeFromCore(uint256 _amount) external {
        require(msg.sender == stakeCore, "!core");
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
        require(_level < 4, "!level");
        require(sAmt[msg.sender][_level] > 0, "!stake");
        
        uint256 reward = sAmt[msg.sender][_level] * sA[_level] / tS[_level] - sDebt[msg.sender][_level];
        
        if (reward > 0) {
            sDebt[msg.sender][_level] = sAmt[msg.sender][_level] * sA[_level] / tS[_level];
            IERC20(dqToken).safeTransfer(msg.sender, reward);
            emit StakeRewardClaimed(msg.sender, _level, reward);
        }
    }
    
    /**
     * @notice 查询用户单币质押信息
     */
    function getStakeInfo(address _user) external view returns (
        uint256[4] memory amounts,
        uint256[4] memory times,
        uint256[4] memory pendingRewards
    ) {
        for (uint8 i = 0; i < 4; i++) {
            amounts[i] = sAmt[_user][i];
            times[i] = stakeTime[_user][i];
            if (tS[i] > 0 && sAmt[_user][i] > 0) {
                pendingRewards[i] = sAmt[_user][i] * sA[i] / tS[i] - sDebt[_user][i];
            }
        }
    }
    
    /**
     * @notice 设置质押周期权重（管理员）
     */
    function setStakeWeights(uint256[4] calldata _weights) external onlyOwner {
        stakeWeights = _weights;
    }
    
    receive() external payable {}
}
