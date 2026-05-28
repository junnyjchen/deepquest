// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DQMiningStakeMine - 爆块合约
 * @dev 从底池提取DQ进行每日爆块销毁和分配
 * 
 * 机制：
 * 1. 1000亿DQ全部在底池
 * 2. 每日释放底池剩余DQ的1.3%
 * 3. 销毁率从80%递减到30%
 * 4. 剩余部分分配给LP质押者、节点卡等
 */
contract DQMiningStakeMine is Ownable, ReentrancyGuard {
    
    IERC20 public dqToken;
    address public stakeCore;      // 质押核心合约
    address public foundation;     // 基金会
    address public founder;        // 创始人/合伙人地址 (0x803B79B608455808C2f752c588804c3F5bF676a3)
    address public dLevelPool;     // D等级池
    
    // 爆块参数
    uint256 public constant DAILY_RELEASE_RATE = 13; // 1.3% (基点)
    uint256 public constant MAX_BURN_RATE = 8000;    // 初始销毁率 80%
    uint256 public constant MIN_BURN_RATE = 3000;    // 最低销毁率 30%
    uint256 public constant BURN_DECAY_RATE = 50;    // 每天递减 0.5%
    
    // 分配比例 (基点)
    uint256 public lpRatio = 6000;      // LP质押 60%
    uint256 public nodeRatio = 1500;    // 节点卡 15%
    uint256 public dLevelRatio = 1400;  // D等级 14%
    uint256 public foundationRatio = 500; // 基金会 5%
    uint256 public founderRatio = 600;  // 创始人 6%
    
    // 状态
    uint256 public lastMineTime;        // 上次爆块时间
    uint256 public totalMined;          // 累计爆块数量
    uint256 public totalBurned;         // 累计销毁数量
    uint256 public totalDistributed;    // 累计分配数量
    uint256 public mineDays;            // 爆块天数
    uint256 public initialTotalSupply;  // 初始总量（如1000亿）
    
    // 事件
    event InitialSupplySet(uint256 initialSupply);
    
    // 事件
    event Mined(
        uint256 releaseAmount,
        uint256 burnAmount,
        uint256 distributeAmount,
        uint256 burnRate,
        uint256 timestamp
    );
    event Distributed(
        address indexed to,
        uint256 amount,
        string category
    );
    event AddressesUpdated(
        address stakeCore,
        address foundation,
        address founder,
        address dLevelPool
    );
    event LPRewardNotified(uint256 amount, bool success);
    event NodeRewardNotified(uint256 amount, bool success);
    event DLevelRewardNotified(uint256 amount, bool success);
    
    modifier onlyStakeCore() {
        require(msg.sender == stakeCore || msg.sender == owner(), "!core");
        _;
    }
    
    constructor(
        address _dqToken,
        address _stakeCore,
        address _foundation,
        address _founder
    ) Ownable(msg.sender) {
        dqToken = IERC20(_dqToken);
        stakeCore = _stakeCore;
        foundation = _foundation;
        founder = _founder;
        lastMineTime = block.timestamp;
    }
    
    /**
     * @dev 设置D等级池地址
     */
    function setDLevelPool(address _dLevelPool) external onlyOwner {
        dLevelPool = _dLevelPool;
    }
    
    /**
     * @dev 设置初始总量（如1000亿DQ）
     * @param _initialTotalSupply 初始总量（带18位小数）
     */
    function setInitialTotalSupply(uint256 _initialTotalSupply) external onlyOwner {
        require(initialTotalSupply == 0, "Already set");
        initialTotalSupply = _initialTotalSupply;
        emit InitialSupplySet(_initialTotalSupply);
    }
    
    /**
     * @dev 设置合伙人地址 (创始人6%接收地址)
     */
    function setPartnerAddress(address _partner) external onlyOwner {
        founder = _partner;
    }
    
    /**
     * @dev 设置地址
     */
    function setAddresses(
        address _stakeCore,
        address _foundation,
        address _founder,
        address _dLevelPool
    ) external onlyOwner {
        stakeCore = _stakeCore;
        foundation = _foundation;
        founder = _founder;
        dLevelPool = _dLevelPool;
        emit AddressesUpdated(_stakeCore, _foundation, _founder, _dLevelPool);
    }
    
    /**
     * @dev 设置分配比例
     */
    function setRatios(
        uint256 _lp,
        uint256 _node,
        uint256 _dLevel,
        uint256 _foundation,
        uint256 _founder
    ) external onlyOwner {
        require(_lp + _node + _dLevel + _foundation + _founder == 10000, "Invalid ratios");
        lpRatio = _lp;
        nodeRatio = _node;
        dLevelRatio = _dLevel;
        foundationRatio = _foundation;
        founderRatio = _founder;
    }
    
    /**
     * @dev 执行爆块 - 任何人都可以调用
     * 释放量 = (初始总量 - 已爆块量) × 1.3%
     */
    function mine() external nonReentrant {
        // 检查初始总量已设置
        require(initialTotalSupply > 0, "Initial supply not set");
        
        // 检查时间 (至少间隔1天)
        require(block.timestamp >= lastMineTime + 1 days, "Too early");
        
        // 计算剩余未爆块量
        uint256 remaining = initialTotalSupply - totalMined;
        if (remaining == 0) {
            lastMineTime = block.timestamp;
            return;
        }
        
        // 计算释放量 (剩余量的1.3%)
        uint256 releaseAmount = remaining * DAILY_RELEASE_RATE / 10000;
        if (releaseAmount == 0) {
            lastMineTime = block.timestamp;
            return;
        }
        
        // 确保释放量不超过剩余量
        if (releaseAmount > remaining) {
            releaseAmount = remaining;
        }
        
        // 计算当前销毁率
        uint256 burnRate = _getCurrentBurnRate();
        
        // 计算销毁量和分配量
        uint256 burnAmount = releaseAmount * burnRate / 10000;
        uint256 distributeAmount = releaseAmount - burnAmount;
        
        // 更新状态
        lastMineTime = block.timestamp;
        totalMined += releaseAmount;
        totalBurned += burnAmount;
        totalDistributed += distributeAmount;
        mineDays++;
        
        // 准备分配地址和金额
        address[] memory recipients = new address[](5);
        uint256[] memory amounts = new uint256[](5);
        
        recipients[0] = stakeCore;     // LP质押
        amounts[0] = distributeAmount * lpRatio / 10000;
        
        recipients[1] = address(this); // 节点卡 (暂存)
        amounts[1] = distributeAmount * nodeRatio / 10000;
        
        recipients[2] = dLevelPool;    // D等级
        amounts[2] = distributeAmount * dLevelRatio / 10000;
        
        recipients[3] = foundation;    // 基金会
        amounts[3] = distributeAmount * foundationRatio / 10000;
        
        recipients[4] = founder;       // 创始人
        amounts[4] = distributeAmount * founderRatio / 10000;
        
        // 调用DQT的批量分配函数
        // 注意：DQT需要有burnFromPool和distributeFromPool函数
        _executeMine(burnAmount, recipients, amounts);
        
        emit Mined(releaseAmount, burnAmount, distributeAmount, burnRate, block.timestamp);
    }
    
    /**
     * @dev 内部执行爆块 - 调用DQT从底池提取
     */
    function _executeMine(
        uint256 burnAmount,
        address[] memory recipients,
        uint256[] memory amounts
    ) internal {
        // 这里需要DQT合约提供接口
        // 由于DQT是我们自己的合约，我们假设它有batchDistributeFromPool函数
        
        // 方案：直接调用DQT的batchDistributeFromPool
        // DQT.batchDistributeFromPool(recipients, amounts, burnAmount);
        
        // 由于类型限制，我们分开调用
        // 1. 先销毁
        if (burnAmount > 0) {
            // 调用DQT.burnFromPool(burnAmount)
            (bool success, ) = address(dqToken).call(
                abi.encodeWithSignature("burnFromPool(uint256)", burnAmount)
            );
            require(success, "Burn failed");
        }
        
        // 2. 再分配
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0 && recipients[i] != address(0)) {
                (bool success, ) = address(dqToken).call(
                    abi.encodeWithSignature("distributeFromPool(address,uint256)", recipients[i], amounts[i])
                );
                require(success, "Distribute failed");
                
                emit Distributed(recipients[i], amounts[i], _getCategory(i));
            }
        }
        
        // 3. 通知stakeCore分配LP奖励给用户（stakeCore内部有用户LP数据）
        if (amounts[0] > 0) {
            (bool success, ) = stakeCore.call(
                abi.encodeWithSignature("distributeLPReward(uint256)", amounts[0])
            );
            // 如果调用失败，记录但不回滚（DQ已经在stakeCore中）
            emit LPRewardNotified(amounts[0], success);
        }
        
        // 4. 通知stakeCore分配节点卡奖励
        if (amounts[1] > 0) {
            (bool success, ) = stakeCore.call(
                abi.encodeWithSignature("distributeNodeReward(uint256)", amounts[1])
            );
            emit NodeRewardNotified(amounts[1], success);
        }
        
        // 5. 通知stakeCore分配D等级奖励
        if (amounts[2] > 0) {
            (bool success, ) = stakeCore.call(
                abi.encodeWithSignature("distributeDRankReward(uint256)", amounts[2])
            );
            emit DLevelRewardNotified(amounts[2], success);
        }
    }
    
    /**
     * @dev 获取当前销毁率
     */
    function _getCurrentBurnRate() internal view returns (uint256) {
        uint256 rate = MAX_BURN_RATE - (mineDays * BURN_DECAY_RATE);
        if (rate < MIN_BURN_RATE) {
            rate = MIN_BURN_RATE;
        }
        return rate;
    }
    
    /**
     * @dev 获取分类名称
     */
    function _getCategory(uint256 index) internal pure returns (string memory) {
        if (index == 0) return "LP";
        if (index == 1) return "Node";
        if (index == 2) return "DLevel";
        if (index == 3) return "Foundation";
        if (index == 4) return "Founder";
        return "Unknown";
    }
    
    /**
     * @dev 查询下次爆块信息
     */
    function getNextMineInfo() external view returns (
        uint256 nextMineTime,
        uint256 currentBurnRate,
        uint256 estimatedRelease,
        uint256 estimatedBurn,
        uint256 estimatedDistribute
    ) {
        nextMineTime = lastMineTime + 1 days;
        currentBurnRate = _getCurrentBurnRate();
        
        // 查询底池余额
        (bool success, bytes memory data) = address(dqToken).staticcall(
            abi.encodeWithSignature("poolBalance()")
        );
        uint256 poolBalance = success ? abi.decode(data, (uint256)) : 0;
        
        estimatedRelease = poolBalance * DAILY_RELEASE_RATE / 10000;
        estimatedBurn = estimatedRelease * currentBurnRate / 10000;
        estimatedDistribute = estimatedRelease - estimatedBurn;
    }
    
    /**
     * @dev 获取爆块信息 (供Admin调用)
     */
    function getMineInfo() external view returns (
        uint256 releaseAmount,
        uint256 currentBurnRate,
        uint256 nextBurnRate,
        bool canMine
    ) {
        currentBurnRate = _getCurrentBurnRate();
        nextBurnRate = currentBurnRate > MIN_BURN_RATE ? currentBurnRate - BURN_DECAY_RATE : MIN_BURN_RATE;
        canMine = block.timestamp >= lastMineTime + 1 days;
        
        uint256 poolBalance = getPoolBalance();
        releaseAmount = poolBalance * DAILY_RELEASE_RATE / 10000;
    }
    
    /**
     * @dev 查询底池余额
     */
    function getPoolBalance() public view returns (uint256) {
        (bool success, bytes memory data) = address(dqToken).staticcall(
            abi.encodeWithSignature("poolBalance()")
        );
        return success ? abi.decode(data, (uint256)) : 0;
    }
    
    /**
     * @dev 节点卡奖励提取 (由节点卡合约调用)
     */
    function withdrawNodeReward(address to, uint256 amount) external {
        // 这里需要验证调用者是节点卡相关合约
        // 简化实现：owner或stakeCore可调用
        require(msg.sender == owner() || msg.sender == stakeCore, "Not authorized");
        require(dqToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        dqToken.transfer(to, amount);
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }
    }
    
    receive() external payable {}
}
