// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DQ 数据迁移合约
 * @notice 用于将旧合约的用户数据、关系、LP迁移到新合约
 * 
 * 迁移顺序：
 * 1. 导入用户关系数据（推荐关系）
 * 2. 导入用户等级数据（S1-S6）
 * 3. 用户自助导入LP和能量
 * 
 * 注意：奖励数据不迁移，用户需在旧合约领取
 */
contract DQLPMigrator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ 地址配置 ============
    address public lpPair;           // LP代币地址
    address public newStakeCore;     // 新质押合约
    address public newCore;          // 新用户核心合约
    address public oldStakeCore;     // 旧质押合约（查询能量）
    address public oldCore;          // 旧用户核心合约（查询关系）

    // ============ 导入状态 ============
    bool public userRelationsImported;   // 用户关系是否已导入
    bool public userLevelsImported;      // 用户等级是否已导入
    
    // ============ 迁移记录 ============
    mapping(address => bool) public hasMigratedLP;
    mapping(address => uint256) public migratedLPAmount;
    mapping(address => uint256) public migratedEnergy;
    
    uint256 public totalMigratedLP;
    uint256 public totalMigratedUsers;

    // ============ 事件 ============
    event AddressesSet(address lpPair, address newStakeCore, address newCore, address oldStakeCore, address oldCore);
    event UserRelationsImported(uint256 count);
    event UserLevelsImported(uint256 count);
    event LPMigrated(address indexed user, uint256 lpAmount, uint256 energy);

    // ============ 修饰器 ============
    modifier whenRelationsImported() {
        require(userRelationsImported, "User relations not imported");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // ============ 管理函数 ============

    /**
     * @notice 设置所有合约地址
     */
    function setAddresses(
        address _lpPair,
        address _newStakeCore,
        address _newCore,
        address _oldStakeCore,
        address _oldCore
    ) external onlyOwner {
        lpPair = _lpPair;
        newStakeCore = _newStakeCore;
        newCore = _newCore;
        oldStakeCore = _oldStakeCore;
        oldCore = _oldCore;
        emit AddressesSet(_lpPair, _newStakeCore, _newCore, _oldStakeCore, _oldCore);
    }

    // ============ 步骤1: 导入用户关系 ============

    /**
     * @notice 批量导入用户关系数据
     * @param _users 用户地址数组
     * @param _referrers 推荐人地址数组
     * @dev 只能调用一次，且必须在LP导入前完成
     */
    function importUserRelations(
        address[] calldata _users,
        address[] calldata _referrers
    ) external onlyOwner {
        require(!userRelationsImported, "Already imported");
        require(_users.length == _referrers.length, "Length mismatch");
        require(_users.length > 0, "Empty array");

        // 调用新用户核心合约导入关系
        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            address referrer = _referrers[i];
            
            if (user != address(0) && referrer != address(0)) {
                // 调用DQMCore的导入函数
                IDQMCore(newCore).importUserRelation(user, referrer);
            }
        }

        userRelationsImported = true;
        emit UserRelationsImported(_users.length);
    }

    // ============ 步骤2: 导入用户等级 ============

    /**
     * @notice 批量导入用户等级数据
     * @param _users 用户地址数组
     * @param _levels 等级数组 (1-6 对应 S1-S6)
     * @dev 可以多次调用，等级会被覆盖
     */
    function importUserLevels(
        address[] calldata _users,
        uint8[] calldata _levels
    ) external onlyOwner whenRelationsImported {
        require(_users.length == _levels.length, "Length mismatch");
        require(_users.length > 0, "Empty array");

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            uint8 level = _levels[i];
            
            if (user != address(0) && level >= 1 && level <= 6) {
                // 调用质押合约导入等级
                IDQMiningStakeCore(newStakeCore).importUserLevel(user, level);
            }
        }

        userLevelsImported = true;
        emit UserLevelsImported(_users.length);
    }

    // ============ 步骤3: 用户导入LP ============

    /**
     * @notice 用户迁移LP（自动查询能量）
     * @param _lpAmount 迁移的LP数量
     * @dev 用户需先授权LP给本合约
     */
    function migrateLP(uint256 _lpAmount) 
        external 
        nonReentrant 
        whenRelationsImported 
    {
        require(!hasMigratedLP[msg.sender], "Already migrated LP");
        require(_lpAmount > 0, "Zero amount");
        require(lpPair != address(0), "LP pair not set");
        require(newStakeCore != address(0), "New stake core not set");

        // 查询旧合约的能量
        uint256 energy = IDQMiningStakeCore(oldStakeCore).userEnergy(msg.sender);

        _migrateLP(msg.sender, _lpAmount, energy);
    }

    /**
     * @notice 用户迁移LP（指定能量）
     * @param _lpAmount 迁移的LP数量
     * @param _energy 用户的能量值
     * @dev 用于旧合约能量查询不准确的情况
     */
    function migrateLPWithEnergy(uint256 _lpAmount, uint256 _energy) 
        external 
        nonReentrant 
        whenRelationsImported 
    {
        require(!hasMigratedLP[msg.sender], "Already migrated LP");
        require(_lpAmount > 0, "Zero amount");

        _migrateLP(msg.sender, _lpAmount, _energy);
    }

    /**
     * @notice 管理员批量迁移LP（用户已将LP转到新合约）
     * @param _users 用户地址数组
     * @param _lpAmounts LP数量数组
     * @param _energies 能量数组
     * @dev 用于用户自己转LP到新合约，管理员记录数据
     */
    function batchMigrateLP(
        address[] calldata _users,
        uint256[] calldata _lpAmounts,
        uint256[] calldata _energies
    ) external onlyOwner whenRelationsImported {
        require(_users.length == _lpAmounts.length, "Length mismatch");
        require(_users.length == _energies.length, "Length mismatch");

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            uint256 amount = _lpAmounts[i];
            uint256 energy = _energies[i];

            if (!hasMigratedLP[user] && amount > 0) {
                _migrateLP(user, amount, energy);
            }
        }
    }

    // ============ 内部函数 ============

    function _migrateLP(address _user, uint256 _lpAmount, uint256 _energy) internal {
        // 从用户钱包转入LP
        IERC20(lpPair).safeTransferFrom(_user, newStakeCore, _lpAmount);

        // 调用新合约记录LP和能量
        IDQMiningStakeCore(newStakeCore).migrateLP(_user, _lpAmount, _energy);

        // 记录状态
        hasMigratedLP[_user] = true;
        migratedLPAmount[_user] = _lpAmount;
        migratedEnergy[_user] = _energy;
        totalMigratedLP += _lpAmount;
        totalMigratedUsers++;

        emit LPMigrated(_user, _lpAmount, _energy);
    }

    // ============ 查询函数 ============

    /**
     * @notice 查询用户迁移信息
     */
    function getMigrationInfo(address _user) 
        external 
        view 
        returns (
            bool migrated,
            uint256 lpAmount,
            uint256 energy,
            uint256 oldEnergy
        ) 
    {
        migrated = hasMigratedLP[_user];
        lpAmount = migratedLPAmount[_user];
        energy = migratedEnergy[_user];
        oldEnergy = oldStakeCore != address(0) 
            ? IDQMiningStakeCore(oldStakeCore).userEnergy(_user) 
            : 0;
    }

    /**
     * @notice 批量查询用户迁移信息
     */
    function getBatchMigrationInfo(address[] calldata _users)
        external
        view
        returns (
            bool[] memory migrated,
            uint256[] memory lpAmounts,
            uint256[] memory energies
        )
    {
        uint256 len = _users.length;
        migrated = new bool[](len);
        lpAmounts = new uint256[](len);
        energies = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            migrated[i] = hasMigratedLP[_users[i]];
            lpAmounts[i] = migratedLPAmount[_users[i]];
            energies[i] = migratedEnergy[_users[i]];
        }
    }

    /**
     * @notice 获取迁移统计
     */
    function getMigrationStats() external view returns (
        uint256 _totalMigratedLP,
        uint256 _totalMigratedUsers,
        bool _relationsImported,
        bool _levelsImported
    ) {
        return (totalMigratedLP, totalMigratedUsers, userRelationsImported, userLevelsImported);
    }
}

// ============ 接口定义 ============

interface IDQMCore {
    function importUserRelation(address _user, address _referrer) external;
}

interface IDQMiningStakeCore {
    function userEnergy(address) external view returns (uint256);
    function importUserLevel(address _user, uint8 _level) external;
    function migrateLP(address _user, uint256 _lpAmount, uint256 _energy) external;
}
