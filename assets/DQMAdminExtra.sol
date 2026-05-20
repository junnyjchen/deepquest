// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// DQMAdminExtra - 管理员扩展工具合约（可选部署）
// 包含不常用的管理员工具函数，如BNB提取等
// 这是一个独立合约，不继承DQMCore，部署后大小更小
contract DQMAdminExtra {
    address public immutable OWNER;
    
    event WithdrawBNB(address indexed to, uint256 amount);
    
    modifier onlyOwner() { require(msg.sender == OWNER, "!owner"); _; }
    
    constructor() {
        OWNER = 0x274aCc6397349F21179ed6258A54B2a11B28faF5;
    }
    
    // ==================== BNB提取 ====================
    
    function withdrawBNB(address payable _to, uint256 _amount) external onlyOwner {
        (bool success,) = _to.call{value: _amount}("");
        require(success);
        emit WithdrawBNB(_to, _amount);
    }
    
    // ==================== 接收BNB ====================
    
    receive() external payable {}
}
