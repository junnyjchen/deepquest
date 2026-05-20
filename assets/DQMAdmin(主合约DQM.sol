// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";

// DQMAdmin - 独立管理合约（不继承DQMCore，减少合约大小）
// 通过接口调用DQMCore的函数
interface IDQMCoreAdmin {
    function dqToken() external view returns (address);
    function dqCard() external view returns (address);
    function stakeContract() external view returns (address);
    function setDQToken(address _addr) external;
    function setDQCard(address _addr) external;
    function setStakeContract(address _a) external;
    function setFoundation(address _addr) external;
    function setFeeAddr(address _addr) external;
    function setNodeUSDTReceiver(address _addr) external;
    function setSlippage(uint256 _s) external;
    function importUser(address _u, address _r) external;
    function importUsers(address[] calldata _u, address[] calldata _r) external;
    function importNodes(address[] calldata _u, uint8[] calldata _t) external;
    function setNodesLevel(address[] calldata _u, uint8[] calldata _lvl) external;
    function setNodesDLevel(address[] calldata _u, uint8[] calldata _lvl) external;
    function depositForUser(address _user, uint256 _a) external;
    function manualAddLP(address _user, uint256 _a) external;
    function addToBlacklist(address _u) external;
    function removeFromBlacklist(address _u) external;
    function advancePhase() external;
    function currentPhase() external view returns (uint256);
}

interface IDQTokenAdmin {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IDQMiningStakeAdmin {
    function setEnergyMul(uint256 _m) external;
    function mine() external;
    function withdraw(address _u, uint256 _a) external;
    function setUserNodeLevel(address _u, uint8 _lvl) external;
    function registerDLevel(address _user, uint8 _level) external;
}

contract DQMAdmin is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public constant OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    address public constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    
    IDQMCoreAdmin public core;
    
    event CoreUpdated(address indexed core);
    
    modifier onlyOwner() { require(msg.sender == OWNER, "!owner"); _; }
    
    constructor(address _core) {
        core = IDQMCoreAdmin(_core);
    }
    
    function setCore(address _core) external onlyOwner {
        core = IDQMCoreAdmin(_core);
        emit CoreUpdated(_core);
    }
    
    // ==================== 合约配置 ====================
    
    function setDQToken(address _addr) external onlyOwner { core.setDQToken(_addr); }
    function setDQCard(address _addr) external onlyOwner { core.setDQCard(_addr); }
    
    function setStakeContract(address _a) external onlyOwner { 
        core.setStakeContract(_a);
        IDQMiningStakeAdmin(_a).setEnergyMul(3);  // ENERGY_MUL = 3
    }
    
    function setFoundation(address _addr) external onlyOwner { core.setFoundation(_addr); }
    function setFeeAddr(address _addr) external onlyOwner { core.setFeeAddr(_addr); }
    function setNodeUSDTReceiver(address _addr) external onlyOwner { core.setNodeUSDTReceiver(_addr); }
    function setSlippage(uint256 _s) external onlyOwner { core.setSlippage(_s); }
    
    // ==================== 数据导入 ====================
    
    function importUser(address _u, address _r) external onlyOwner { core.importUser(_u, _r); }
    function importUsers(address[] calldata _u, address[] calldata _r) external onlyOwner { core.importUsers(_u, _r); }
    function importNodes(address[] calldata _u, uint8[] calldata _t) external onlyOwner { core.importNodes(_u, _t); }
    function setNodesLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner { core.setNodesLevel(_u, _lvl); }
    function setNodesDLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner { core.setNodesDLevel(_u, _lvl); }
    
    // ==================== 管理员操作 ====================
    
    function depositForUser(address _user, uint256 _a) external onlyOwner { core.depositForUser(_user, _a); }
    function manualAddLP(address _user, uint256 _a) external onlyOwner { core.manualAddLP(_user, _a); }
    function addToBlacklist(address _u) external onlyOwner { core.addToBlacklist(_u); }
    function removeFromBlacklist(address _u) external onlyOwner { core.removeFromBlacklist(_u); }
    function advancePhase() external onlyOwner { core.advancePhase(); }
    
    // ==================== 用户操作 ====================
    
    function withdraw(uint256 _a) external nonReentrant {
        address sc = core.stakeContract();
        require(sc != address(0), "!stake");
        IDQMiningStakeAdmin(sc).withdraw(msg.sender, _a);
    }
    
    // ==================== 爆块触发 ====================
    
    function mineBlock() external nonReentrant onlyOwner {
        address sc = core.stakeContract();
        if (sc != address(0)) IDQMiningStakeAdmin(sc).mine();
    }
    
    // ==================== 授权路由 ====================
    
    function approveRouter() external onlyOwner {
        address dq = core.dqToken();
        require(dq != address(0), "!dqToken");
        IDQTokenAdmin(dq).approve(ROUTER, type(uint256).max);
        IERC20(SOL).approve(ROUTER, type(uint256).max);
    }
    
    // ==================== 管理员提取 ====================
    
    function adminWithdrawDQ(uint256 _a) external onlyOwner {
        IDQTokenAdmin(core.dqToken()).transfer(OWNER, _a);
    }
    
    function adminWithdrawSOL(uint256 _a) external onlyOwner {
        IERC20(SOL).safeTransfer(OWNER, _a);
    }
    
    function adminWithdrawLP(address _lpToken, uint256 _a) external onlyOwner {
        require(_lpToken != address(0) && _a > 0);
        IERC20(_lpToken).safeTransfer(OWNER, _a);
    }
    
    function adminWithdrawAnyToken(address _token, uint256 _a) external onlyOwner {
        IERC20(_token).safeTransfer(OWNER, _a);
    }
    
    // ==================== 查询 ====================
    
    function currentPhase() external view returns (uint256) { return core.currentPhase(); }
}
