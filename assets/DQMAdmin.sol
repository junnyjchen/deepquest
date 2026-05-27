// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DQM Admin V2
 * @notice 管理合约 - 统一管理所有合约
 * 
 * 功能:
 * 1. 合约配置管理
 * 2. 用户数据导入
 * 3. 代币转入底池
 * 4. 爆块触发
 * 5. 管理员提取
 */
contract DQMAdmin is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 常量地址 ============
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    
    // ============ 合约引用 ============
    address public dqToken;
    address public dqCard;
    address public coreContract;
    address public stakeContract;
    address public mineContract;
    
    // ============ 事件 ============
    event ContractsUpdated(address dqToken, address dqCard, address core, address stake, address mine);
    event TransferToPool(address indexed pool, uint256 amount);
    event MineTriggered(uint256 timestamp);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER, "!owner");
        _;
    }
    
    // ============ 构造函数 ============
    constructor() {}
    
    // ============ 合约配置 ============
    
    /**
     * @notice 设置所有合约地址
     */
    function setContracts(
        address _dqToken,
        address _dqCard,
        address _core,
        address _stake,
        address _mine
    ) external onlyOwner {
        if (_dqToken != address(0)) dqToken = _dqToken;
        if (_dqCard != address(0)) dqCard = _dqCard;
        if (_core != address(0)) coreContract = _core;
        if (_stake != address(0)) stakeContract = _stake;
        if (_mine != address(0)) mineContract = _mine;
        
        emit ContractsUpdated(dqToken, dqCard, coreContract, stakeContract, mineContract);
    }
    
    /**
     * @notice 设置DQToken的adminContract
     */
    function initDQToken() external onlyOwner {
        IDQTokenAdmin(dqToken).setAdminContract(address(this));
    }
    
    /**
     * @notice 设置各合约的adminContract
     */
    function initAllContracts() external onlyOwner {
        // 设置DQToken
        IDQTokenAdmin(dqToken).setAdminContract(address(this));
        
        // 设置DQMCore
        IDQMCoreAdmin(coreContract).setAdminContract(address(this));
        
        // 设置DQMiningStakeCore
        IDQMiningStakeAdmin(stakeContract).setAdminContract(address(this));
        
        // 设置DQMiningStakeMine
        IDQMiningStakeAdmin(mineContract).setAdminContract(address(this));
        
        // 设置DQCard
        IDQCardAdmin(dqCard).setAdminContract(address(this));
        IDQCardAdmin(dqCard).setStakeContract(stakeContract);
    }
    
    // ============ 用户数据导入 ============
    
    /**
     * @notice 批量导入用户（传入单个用户即为单个导入）
     */
    function importUsers(address[] calldata _users, address[] calldata _referrers) external onlyOwner {
        IDQMCoreAdmin(coreContract).importUsers(_users, _referrers);
    }
    
    /**
     * @notice 设置用户节点等级
     */
    function setUserNodeLevel(address[] calldata _users, uint8[] calldata _levels) external onlyOwner {
        require(_users.length == _levels.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMiningStakeAdmin(stakeContract).setUserNodeLevel(_users[i], _levels[i]);
        }
    }
    
    /**
     * @notice 设置用户D等级
     */
    function setUserDLevel(address[] calldata _users, uint8[] calldata _levels) external onlyOwner {
        require(_users.length == _levels.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMiningStakeAdmin(stakeContract).registerDLevel(_users[i], _levels[i]);
        }
    }
    
    /**
     * @notice 批量设置用户L等级 (S1-S6对应1-6)
     */
    function batchSetUserLevel(address[] calldata _users, uint8[] calldata _levels) external onlyOwner {
        require(_users.length == _levels.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMiningStakeAdmin(stakeContract).setUserLevel(_users[i], _levels[i]);
        }
    }
    
    /**
     * @notice 批量增加用户能量(StakeCore)
     */
    function batchAddEnergy(address[] calldata _users, uint256[] calldata _amounts) external onlyOwner {
        require(_users.length == _amounts.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMiningStakeAdmin(stakeContract).addEnergy(_users[i], _amounts[i]);
        }
    }
    
    /**
     * @notice 批量设置用户能量(StakeCore)
     */
    function batchSetEnergy(address[] calldata _users, uint256[] calldata _amounts) external onlyOwner {
        require(_users.length == _amounts.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMiningStakeAdmin(stakeContract).setEnergy(_users[i], _amounts[i]);
        }
    }
    
    /**
     * @notice 批量增加用户能量(DQMCore)
     */
    function batchAdminAddEnergy(address[] calldata _users, uint256[] calldata _amounts) external onlyOwner {
        require(_users.length == _amounts.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMCoreAdmin(coreContract).adminAddEnergy(_users[i], _amounts[i]);
        }
    }
    
    /**
     * @notice 批量设置用户能量(DQMCore)
     */
    function batchAdminSetEnergy(address[] calldata _users, uint256[] calldata _amounts) external onlyOwner {
        require(_users.length == _amounts.length, "length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            IDQMCoreAdmin(coreContract).adminSetEnergy(_users[i], _amounts[i]);
        }
    }
    
    /**
     * @notice 同步用户数据到质押合约
     */
    function syncUserToStake(
        address _user,
        address _referrer,
        uint256 _directCount,
        uint8 _nodeLevel,
        uint256 _energy
    ) external onlyOwner {
        IDQMiningStakeAdmin(stakeContract).registerUser(_user, _referrer);
        if (_directCount > 0) IDQMiningStakeAdmin(stakeContract).addDirectSales(_user, _directCount);
        if (_nodeLevel > 0) IDQMiningStakeAdmin(stakeContract).setUserNodeLevel(_user, _nodeLevel);
        if (_energy > 0) IDQMiningStakeAdmin(stakeContract).setEnergy(_user, _energy);
    }
    
    // ============ DQ转入底池 ============
    
    /**
     * @notice 将DQ转入底池
     * @param _pool 底池地址
     * @param _amount 数量
     */
    function transferDQToPool(address _pool, uint256 _amount) external onlyOwner {
        require(dqToken != address(0), "!dqToken");
        require(_pool != address(0), "!pool");
        
        // 从DQToken转入底池
        IDQTokenAdmin(dqToken).transfer(_pool, _amount);
        
        emit TransferToPool(_pool, _amount);
    }
    
    /**
     * @notice 设置交易对地址
     */
    function setPair(address _pair, bool _status) external onlyOwner {
        IDQTokenAdmin(dqToken).setPair(_pair, _status);
    }
    
    /**
     * @notice 设置底池地址（用于爆块）
     */
    function setPool(address _pool) external onlyOwner {
        IDQTokenAdmin(dqToken).setPool(_pool);
    }
    
    /**
     * @notice 设置爆块合约地址
     */
    function setMiningContract(address _mining) external onlyOwner {
        IDQTokenAdmin(dqToken).setMiningContract(_mining);
    }
    
    /**
     * @notice 设置免税地址
     */
    function setExcluded(address _account, bool _status) external onlyOwner {
        IDQTokenAdmin(dqToken).setExcluded(_account, _status);
    }
    
    // ============ 爆块触发 ============
    
    /**
     * @notice 触发爆块
     */
    function mineBlock() external nonReentrant onlyOwner {
        require(mineContract != address(0), "!mine");
        IDQMiningStakeAdmin(mineContract).mine();
        emit MineTriggered(block.timestamp);
    }
    
    // ============ 管理员提取 ============
    
    /**
     * @notice 提取DQ
     */
    function adminWithdrawDQ(uint256 _amount) external onlyOwner {
        IDQTokenAdmin(dqToken).transfer(OWNER, _amount);
    }
    
    /**
     * @notice 提取SOL
     */
    function adminWithdrawSOL(uint256 _amount) external onlyOwner {
        IERC20(SOL).safeTransfer(OWNER, _amount);
    }
    
    /**
     * @notice 提取USDT
     */
    function adminWithdrawUSDT(uint256 _amount) external onlyOwner {
        IERC20(USDT).safeTransfer(OWNER, _amount);
    }
    
    /**
     * @notice 提取LP代币
     */
    function adminWithdrawLP(address _lpToken, uint256 _amount) external onlyOwner {
        require(_lpToken != address(0) && _amount > 0);
        IERC20(_lpToken).safeTransfer(OWNER, _amount);
    }
    
    /**
     * @notice 提取任意代币
     */
    function adminWithdrawAnyToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(OWNER, _amount);
    }
    
    /**
     * @notice 提取BNB
     */
    function adminWithdrawBNB(uint256 _amount) external onlyOwner {
        (bool success, ) = payable(OWNER).call{value: _amount}("");
        require(success, "transfer failed");
    }
    
    // ============ 授权路由 ============
    
    /**
     * @notice 授权路由器操作代币
     */
    function approveRouter() external onlyOwner {
        require(dqToken != address(0), "!dqToken");
        IDQTokenAdmin(dqToken).approve(ROUTER, type(uint256).max);
        IERC20(SOL).approve(ROUTER, type(uint256).max);
    }
    
    // ============ 查询 ============
    
    /**
     * @notice 查询爆块信息
     */
    function getMineInfo() external view returns (
        uint256 releaseAmount,
        uint256 currentBurnRate,
        uint256 nextBurnRate,
        bool canMine
    ) {
        return IDQMiningStakeAdmin(mineContract).getMineInfo();
    }
    
    receive() external payable {}
}

// ============ 接口定义 ============

interface IDQTokenAdmin {
    function setAdminContract(address _addr) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function setPair(address _pair, bool _status) external;
    function setExcluded(address _account, bool _status) external;
    function setPool(address _pool) external;
    function setMiningContract(address _mining) external;
    function poolBalance() external view returns (uint256);
    function burnFromPool(uint256 amount) external;
    function distributeFromPool(address to, uint256 amount) external;
}

interface IDQMCoreAdmin {
    function setAdminContract(address _addr) external;
    function importUsers(address[] calldata _users, address[] calldata _referrers) external;
    function adminSetEnergy(address _user, uint256 _energy) external;
    function adminAddEnergy(address _user, uint256 _amount) external;
}

interface IDQMiningStakeAdmin {
    function setAdminContract(address _addr) external;
    function registerUser(address _user, address _referrer) external;
    function addDirectSales(address _user, uint256 _amount) external;
    function setUserNodeLevel(address _user, uint8 _level) external;
    function setUserLevel(address _user, uint8 _level) external;
    function setEnergy(address _user, uint256 _energy) external;
    function addEnergy(address _user, uint256 _amount) external;
    function registerDLevel(address _user, uint8 _level) external;
    function mine() external;
    function getMineInfo() external view returns (
        uint256 releaseAmount,
        uint256 currentBurnRate,
        uint256 nextBurnRate,
        bool canMine
    );
}

interface IDQCardAdmin {
    function setAdminContract(address _addr) external;
    function setStakeContract(address _addr) external;
}
