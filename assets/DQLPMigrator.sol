// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DQLPMigrator - LP迁移合约
 * @dev 用户授权 → 合约划扣旧LP → 合约发放新LP
 * 
 * 流程：
 * 1. 管理员设置旧LP地址 (A合约的LP)
 * 2. 管理员设置新LP地址 (B合约的LP)
 * 3. 管理员往合约转入新LP作为迁移池
 * 4. 用户授权迁移合约操作旧LP
 * 5. 用户调用 migrate() 或 migrateAndStake()
 */
contract DQLPMigrator is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 常量 ============
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    uint256 public constant RATE_DENOMINATOR = 10000;
    
    // ============ 合约地址 ============
    address public oldLP;              // 旧LP (A合约的LP)
    address public newLP;              // 新LP (B合约的LP)
    address public newStakeContract;   // 新质押合约
    address public adminContract;
    
    // ============ 配置 ============
    uint256 public migrationRate = 10000;  // 汇率，默认1:1
    bool public migrationActive = false;
    
    // ============ 数据 ============
    mapping(address => uint256) public migratedAmount;  // 用户已迁移数量
    
    // ============ 事件 ============
    event MigrationToggled(bool active);
    event OldLPSet(address oldLP);
    event NewLPSet(address newLP);
    event RateSet(uint256 rate);
    event Migrated(address indexed user, uint256 oldAmount, uint256 newAmount);
    event MigratedAndStaked(address indexed user, uint256 oldAmount, uint256 newAmount);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(msg.sender == OWNER, "!owner");
        _;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @notice 设置旧LP地址 (A合约的LP)
     */
    function setOldLP(address _lp) external onlyOwner {
        require(_lp != address(0), "!zero");
        oldLP = _lp;
        emit OldLPSet(_lp);
    }
    
    /**
     * @notice 设置新LP地址 (B合约的LP)
     */
    function setNewLP(address _lp) external onlyOwner {
        require(_lp != address(0), "!zero");
        newLP = _lp;
        emit NewLPSet(_lp);
    }
    
    /**
     * @notice 设置新质押合约地址
     */
    function setNewStakeContract(address _contract) external onlyOwner {
        newStakeContract = _contract;
    }
    
    /**
     * @notice 设置管理员合约
     */
    function setAdminContract(address _admin) external onlyOwner {
        adminContract = _admin;
    }
    
    /**
     * @notice 设置迁移汇率
     * @param _rate 汇率基数，10000=1:1
     *        例如: 10000 = 旧LP×1 = 新LP
     *              8000  = 旧LP×0.8 = 新LP
     */
    function setMigrationRate(uint256 _rate) external onlyOwner {
        require(_rate > 0 && _rate <= RATE_DENOMINATOR, "!rate");
        migrationRate = _rate;
        emit RateSet(_rate);
    }
    
    /**
     * @notice 开启/关闭迁移
     */
    function toggleMigration(bool _active) external onlyOwner {
        migrationActive = _active;
        emit MigrationToggled(_active);
    }
    
    // ============ 用户迁移函数 ============
    
    /**
     * @notice 迁移LP
     * @dev 用户授权后，合约划扣旧LP，发放新LP
     * @param _amount 要迁移的旧LP数量
     */
    function migrate(uint256 _amount) external nonReentrant {
        require(migrationActive, "!active");
        require(oldLP != address(0) && newLP != address(0), "!set");
        require(_amount > 0, "!amount");
        
        // 1. 从用户划扣旧LP
        IERC20(oldLP).safeTransferFrom(msg.sender, address(this), _amount);
        
        // 2. 计算新LP数量
        uint256 newLPAmount = _amount * migrationRate / RATE_DENOMINATOR;
        require(newLPAmount > 0, "!convert");
        
        // 3. 检查合约有新LP
        uint256 contractBalance = IERC20(newLP).balanceOf(address(this));
        require(contractBalance >= newLPAmount, "!balance");
        
        // 4. 记录
        migratedAmount[msg.sender] += _amount;
        
        // 5. 发放新LP给用户
        IERC20(newLP).safeTransfer(msg.sender, newLPAmount);
        
        emit Migrated(msg.sender, _amount, newLPAmount);
    }
    
    /**
     * @notice 迁移并自动质押
     * @dev 迁移后自动质押到新合约
     * @param _amount 要迁移的旧LP数量
     */
    function migrateAndStake(uint256 _amount) external nonReentrant {
        require(migrationActive, "!active");
        require(oldLP != address(0) && newLP != address(0), "!set");
        require(newStakeContract != address(0), "!stake");
        require(_amount > 0, "!amount");
        
        // 1. 划扣旧LP
        IERC20(oldLP).safeTransferFrom(msg.sender, address(this), _amount);
        
        // 2. 计算新LP
        uint256 newLPAmount = _amount * migrationRate / RATE_DENOMINATOR;
        require(newLPAmount > 0, "!convert");
        
        uint256 contractBalance = IERC20(newLP).balanceOf(address(this));
        require(contractBalance >= newLPAmount, "!balance");
        
        // 3. 记录
        migratedAmount[msg.sender] += _amount;
        
        // 4. 授权并质押到新合约
        IERC20(newLP).forceApprove(newStakeContract, newLPAmount);
        
        (bool success, ) = newStakeContract.call(
            abi.encodeWithSignature("migrateLP(address,uint256)", msg.sender, newLPAmount)
        );
        
        // 质押失败则直接发放
        if (!success) {
            IERC20(newLP).safeTransfer(msg.sender, newLPAmount);
        }
        
        emit MigratedAndStaked(msg.sender, _amount, newLPAmount);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 查询用户已迁移数量
     */
    function getUserMigrated(address _user) external view returns (uint256) {
        return migratedAmount[_user];
    }
    
    /**
     * @notice 查询配置
     */
    function getConfig() external view returns (
        address _oldLP,
        address _newLP,
        uint256 rate,
        bool active,
        uint256 newLPBalance
    ) {
        _oldLP = oldLP;
        _newLP = newLP;
        rate = migrationRate;
        active = migrationActive;
        newLPBalance = newLP != address(0) 
            ? IERC20(newLP).balanceOf(address(this)) 
            : 0;
    }
    
    // ============ 提取函数 ============
    
    /**
     * @notice 提取意外转入的代币
     */
    function withdrawToken(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_token != oldLP && _token != newLP, "!withdraw");
        IERC20(_token).safeTransfer(_to, _amount);
    }
    
    receive() external payable {}
}
