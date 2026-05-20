// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "./DQMCore.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
contract DQMAdmin is DQMCore {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    event BurnFromDQT(address indexed from, uint256 amount);
    event ReinvestSOL(address indexed user, uint256 amount, uint256 energyAdded);
    event WithdrawBNB(address indexed to, uint256 amount);
    function setDQToken(address _addr) external onlyOwner { dqToken = IDQToken(_addr); }
    function setDQCard(address _addr) external onlyOwner { dqCard = IDQCard(_addr); }
    function setStakeContract(address _a) external onlyOwner override { 
        stakeContract = _a; 
        IDQMiningStake(_a).setEnergyMul(ENERGY_MUL);
    }
    function setFoundation(address _addr) external onlyOwner { FOUNDATION = _addr; }
    function setFeeAddr(address _addr) external onlyOwner { feeAddr = _addr; }
    function setNodeUSDTReceiver(address _addr) external onlyOwner { require(_addr != address(0)); nodeUSDTReceiver = _addr; }
    function setSlippage(uint256 _s) external onlyOwner { SLIPPAGE = _s; }
    function importUser(address _u, address _r) external onlyOwner {
        require(users[_u].referrer == address(0));
        users[_u].referrer = _r;
        allUsers.push(_u);
        if (_r != address(0) && users[_r].referrer != address(0)) {
            users[_r].directCount++;
            users[_r].children.add(_u);
        }
        if (stakeContract != address(0)) {
            User storage u = users[_u];
            IDQMiningStake(stakeContract).importUser(_u, _r, u.totalInvest, 0, u.level, 0);
        }
        emit Register(_u, _r);
    }

    function setNodesLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length);
        for (uint i = 0; i < _u.length; i++) users[_u[i]].level = _lvl[i];
    }
    function setNodesDLevel(address[] calldata _u, uint8[] calldata _lvl) external onlyOwner {
        require(_u.length == _lvl.length);
        for (uint i = 0; i < _u.length; i++) {
            if (stakeContract != address(0)) IDQMiningStake(stakeContract).registerDLevel(_u[i], _lvl[i]);
        }
    }
    function importUsers(address[] calldata _u, address[] calldata _r) external onlyOwner {
        require(_u.length == _r.length);
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer == address(0)) {
                users[_u[i]].referrer = _r[i];
                allUsers.push(_u[i]);
                if (_r[i] != address(0) && users[_r[i]].referrer != address(0)) {
                    users[_r[i]].directCount++;
                    users[_r[i]].children.add(_u[i]);
                }
                if (stakeContract != address(0)) {
                    User storage u = users[_u[i]];
                    IDQMiningStake(stakeContract).importUser(_u[i], _r[i], u.totalInvest, 0, u.level, 0);
                }
                emit Register(_u[i], _r[i]);
            }
        }
    }
    function importNodes(address[] calldata _u, uint8[] calldata _t) external onlyOwner {
        require(_u.length == _t.length);
        for (uint i = 0; i < _u.length; i++) {
            if (users[_u[i]].referrer == address(0)) {
                users[_u[i]].referrer = OWNER;
                allUsers.push(_u[i]);
                emit Register(_u[i], OWNER);
            }
            if (_t[i] >= 1 && _t[i] <= 3) {
                dqCard.mintByOwner(_u[i], _t[i]);
                users[_u[i]].level = _t[i];
            }
        }
    }
    function addToBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = true; }
    function removeFromBlacklist(address _u) external onlyOwner { isBlacklisted[_u] = false; }
    function depositForUser(address _user, uint256 _a) external onlyOwner {
        require(_a >= INVEST_MIN);
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _deposit(_user, _a);
    }
    function manualAddLP(address _user, uint256 _a) external onlyOwner {
        require(_user != address(0) && _a > 0);
        IERC20(SOL).safeTransferFrom(msg.sender, address(this), _a);
        _swapAndAddLP(_user, _a);
    }
    function burnDQ(uint256 _amount) external onlyOwner {
        require(_amount > 0);
        uint256 bal = dqToken.balanceOf(address(this));
        require(bal >= _amount);
        IDQToken(address(dqToken)).burn(_amount);
        emit BurnFromDQT(msg.sender, _amount);
    }
    function withdraw(uint256 _a) external nonReentrant {
        require(stakeContract != address(0));
        IDQMiningStake(stakeContract).withdraw(msg.sender, _a);
    }
    function approveRouter() external onlyOwner {
        require(address(dqToken) != address(0));
        dqToken.approve(ROUTER, type(uint256).max);
        IERC20(SOL).approve(ROUTER, type(uint256).max);
    }
    function advancePhase() external onlyOwner { currentPhase++; }
    function adminWithdrawDQ(uint256 _a) external onlyOwner { dqToken.transfer(OWNER, _a); }
    function adminWithdrawSOL(uint256 _a) external onlyOwner { IERC20(SOL).safeTransfer(OWNER, _a); }
    function adminWithdrawLP(address _lpToken, uint256 _a) external onlyOwner {
        require(_lpToken != address(0) && _a > 0);
        IERC20(_lpToken).safeTransfer(OWNER, _a);
    }
    function adminWithdrawAnyToken(address _token, uint256 _a) external onlyOwner {
        IERC20(_token).safeTransfer(OWNER, _a);
    }
    function withdrawBNB(address payable _to, uint256 _amount) external onlyOwner {
        (bool success,) = _to.call{value: _amount}("");
        require(success);
        emit WithdrawBNB(_to, _amount);
    }
    function mineBlock() external nonReentrant onlyOwner {
        if (stakeContract != address(0)) IDQMiningStake(stakeContract).mine();
    }
}
