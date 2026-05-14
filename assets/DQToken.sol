// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IDQMiningStake 接口
 * @notice 用于调用DQMiningStake的addPendingBurn函数
 */
interface IDQMiningStake {
    function addPendingBurn(uint256 amount) external;
}

/**
 * @title DQToken v6.0
 * @notice DQ代币合约 - 支持交易手续费和销毁机制
 * 
 * 功能：
 * 1. 买入（从交易对转出）：
 *    - 90%销毁到黑洞地址
 *    - 6%作为手续费转给主合约（单币质押用户50% + 手续费地址50%）
 *    - 4%到用户账上
 * 2. 卖出（转入交易对）：
 *    - 6%作为手续费转给主合约（单币质押用户50% + 手续费地址50%）
 *    - 94%进入交易对（用户得到94%对应的SOL）
 *    - 合约自动从底池销毁94%的DQ
 * 3. 白名单地址转账免手续费
 * 4. 黑名单地址禁止交易
 * 5. 通缩99%后可停止销毁
 * 
 * 买入示例（买100 DQ）：
 * - 销毁：90 DQ → 黑洞地址
 * - 手续费：6 DQ → 主合约分配（单币质押用户3 DQ + 手续费地址3 DQ）
 * - 用户得到：4 DQ
 * 
 * 卖出示例（卖100 DQ）：
 * - 手续费：6 DQ → 主合约分配（单币质押用户3 DQ + 手续费地址3 DQ）
 * - 进入底池：94 DQ → 用户得到94 DQ对应的SOL
 * - 从底池销毁：94 DQ → 黑洞地址（通缩）
 */
contract DQToken is ERC20, Ownable {
    
    // ============ 状态变量 ============
    
    /// @notice 买入销毁率（90%）
    uint256 public constant BUY_BURN_RATE = 90;
    
    /// @notice 买入手续费率（6%）
    uint256 public constant BUY_FEE_RATE = 6;
    
    /// @notice 卖出销毁率（0% - 卖出不直接销毁，而是从底池销毁）
    uint256 public constant SELL_BURN_RATE = 0;
    
    /// @notice 卖出手续费率（6%）
    uint256 public constant SELL_FEE_RATE = 6;
    
    /// @notice 卖出进入交易对比例（94%）
    uint256 public constant SELL_TO_PAIR_RATE = 94;
    
    /// @notice 总发行量
    uint256 public constant TOTAL_SUPPLY = 100_000_000_000 * 10**18; // 1000亿
    
    /// @notice 已销毁总量
    uint256 public burnedSupply;
    
    /// @notice 通缩目标（总量的99%）
    uint256 public constant BURN_TARGET = TOTAL_SUPPLY * 99 / 100;
    
    /// @notice 是否开启买入手续费/销毁
    bool public buyFeeEnabled = true;
    
    /// @notice 是否开启卖出手续费/销毁
    bool public sellFeeEnabled = true;
    
    /// @notice 交易对地址映射
    mapping(address => bool) public isPair;
    
    /// @notice 白名单（免手续费）
    mapping(address => bool) public isExcluded;
    
    /// @notice 黑名单（禁止交易）
    mapping(address => bool) public isBlacklisted;
    
    /// @notice 买入手续费接收地址（主合约/单币质押合约）
    address public buyFeeReceiver;
    
    /// @notice 卖出手续费分配地址（主合约/单币质押合约）
    address public sellFeeReceiver;
    
    /// @notice DQMiningStake合约地址（用于记录待销毁）
    address public miningStake;
    
    /// @notice 黑洞地址
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============ 事件 ============
    
    event BuyFee(address indexed user, uint256 amount, uint256 burnAmount, uint256 feeAmount, uint256 netAmount);
    event SellFee(address indexed user, uint256 amount, uint256 feeAmount, uint256 pairAmount, uint256 burnFromPool);
    event Burned(uint256 amount, uint256 totalBurned);
    event PairUpdated(address indexed pair, bool status);
    event ExcludedUpdated(address indexed account, bool status);
    event BlacklistedUpdated(address indexed account, bool status);
    event BuyFeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event SellFeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event FeeStatusChanged(bool buyFee, bool sellFee);
    
    // ============ 构造函数 ============
    
    constructor(
        address _owner,
        address _buyFeeReceiver,
        address _sellFeeReceiver
    ) ERC20("DQ Token", "DQ") Ownable(_owner) {
        require(_buyFeeReceiver != address(0), "Invalid buy fee receiver");
        require(_sellFeeReceiver != address(0), "Invalid sell fee receiver");
        
        buyFeeReceiver = _buyFeeReceiver;
        sellFeeReceiver = _sellFeeReceiver;
        
        // 铸造总量到部署者
        _mint(_owner, TOTAL_SUPPLY);
        
        // 部署者和手续费接收地址加入白名单
        isExcluded[_owner] = true;
        isExcluded[_buyFeeReceiver] = true;
        isExcluded[_sellFeeReceiver] = true;
        isExcluded[address(this)] = true;
        
        emit ExcludedUpdated(_owner, true);
        emit ExcludedUpdated(_buyFeeReceiver, true);
        emit ExcludedUpdated(_sellFeeReceiver, true);
        emit ExcludedUpdated(address(this), true);
    }
    
    // ============ 核心转账逻辑 ============
    
    /**
     * @notice 重写transfer函数，实现手续费逻辑
     * @dev 白名单逻辑：
     *      - 白名单地址与交易对之间转账：免手续费（主合约添加流动性等操作）
     *      - 普通地址与交易对之间转账：扣手续费（PancakeSwap交易）
     *      - 白名单地址与普通地址之间转账：免手续费
     */
    function _update(address from, address to, uint256 amount) internal override {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted address");
        require(amount > 0, "Amount must be > 0");
        
        // 白名单地址免手续费（包括与交易对的交互）
        // 这样主合约可以免税添加流动性
        if (isExcluded[from] || isExcluded[to]) {
            super._update(from, to, amount);
            return;
        }
        
        // 买入：从交易对转出（普通用户）
        if (isPair[from] && buyFeeEnabled) {
            _processBuyTransfer(from, to, amount);
            return;
        }
        
        // 卖出：转入交易对（普通用户）
        if (isPair[to] && sellFeeEnabled) {
            _processSellTransfer(from, to, amount);
            return;
        }
        
        // 普通转账：无手续费
        super._update(from, to, amount);
    }
    
    /**
     * @notice 处理买入转账（90%销毁 + 6%手续费 + 4%到用户）
     * @dev 用户从交易对买DQ
     * 示例：买100 DQ
     * - 销毁：90 DQ → 黑洞地址
     * - 手续费：6 DQ → 主合约（单币质押用户50% + 手续费地址50%）
     * - 用户得到：4 DQ
     */
    function _processBuyTransfer(address from, address to, uint256 amount) internal {
        // 计算：90%销毁 + 6%手续费 + 4%到用户
        uint256 burnAmount = amount * BUY_BURN_RATE / 100;      // 90 DQ
        uint256 feeAmount = amount * BUY_FEE_RATE / 100;        // 6 DQ
        uint256 netAmount = amount - burnAmount - feeAmount;    // 4 DQ
        
        // 用户得到4%
        if (netAmount > 0) {
            super._update(from, to, netAmount);
        }
        
        // 90%销毁到黑洞地址
        if (burnAmount > 0 && burnedSupply < BURN_TARGET) {
            super._update(from, BURN_ADDRESS, burnAmount);
            burnedSupply += burnAmount;
            emit Burned(burnAmount, burnedSupply);
        } else if (burnAmount > 0) {
            // 通缩达到99%后，销毁部分转给手续费接收地址
            super._update(from, buyFeeReceiver, burnAmount);
        }
        
        // 6%转给分配地址（主合约/单币质押合约）
        if (feeAmount > 0) {
            super._update(from, buyFeeReceiver, feeAmount);
        }
        
        emit BuyFee(to, amount, burnAmount, feeAmount, netAmount);
    }
    
    /**
     * @notice 处理卖出转账（6%手续费 + 94%进交易对，记录待销毁）
     * @dev 用户卖DQ到交易对
     * 示例：卖100 DQ
     * - 手续费：6 DQ → 主合约（单币质押用户50% + 手续费地址50%）
     * - 进入底池：94 DQ → 用户得到94 DQ对应的SOL
     * - 记录待销毁：94 DQ → 由DQMiningStake合约持有LP，定期执行销毁
     */
    function _processSellTransfer(address from, address to, uint256 amount) internal {
        // 计算：6%手续费 + 94%交易对
        uint256 feeAmount = amount * SELL_FEE_RATE / 100;        // 6 DQ
        uint256 pairAmount = amount * SELL_TO_PAIR_RATE / 100;   // 94 DQ
        
        // 交易对收到94%（用户得到94 DQ对应的SOL）
        if (pairAmount > 0) {
            super._update(from, to, pairAmount);
        }
        
        // 6%转给分配地址（主合约/单币质押合约）
        if (feeAmount > 0) {
            super._update(from, sellFeeReceiver, feeAmount);
        }
        
        // 记录待销毁数量（由DQMiningStake合约执行销毁）
        if (pairAmount > 0 && burnedSupply < BURN_TARGET && miningStake != address(0)) {
            IDQMiningStake(miningStake).addPendingBurn(pairAmount);
        }
        
        emit SellFee(from, amount, feeAmount, pairAmount, pairAmount);
    }
    
    // ============ 管理函数 ============
    
    /**
     * @notice 设置交易对地址
     * @param _pair 交易对地址
     * @param _status 是否为交易对
     */
    function setPair(address _pair, bool _status) external onlyOwner {
        require(_pair != address(0), "Invalid pair address");
        isPair[_pair] = _status;
        emit PairUpdated(_pair, _status);
    }
    
    /**
     * @notice 批量设置交易对
     */
    function setPairs(address[] calldata _pairs, bool _status) external onlyOwner {
        for (uint256 i = 0; i < _pairs.length; i++) {
            isPair[_pairs[i]] = _status;
            emit PairUpdated(_pairs[i], _status);
        }
    }
    
    /**
     * @notice 设置白名单（免手续费）
     */
    function setExcluded(address _account, bool _status) external onlyOwner {
        isExcluded[_account] = _status;
        emit ExcludedUpdated(_account, _status);
    }
    
    /**
     * @notice 批量设置白名单
     */
    function setExcludedBatch(address[] calldata _accounts, bool _status) external onlyOwner {
        for (uint256 i = 0; i < _accounts.length; i++) {
            isExcluded[_accounts[i]] = _status;
            emit ExcludedUpdated(_accounts[i], _status);
        }
    }
    
    /**
     * @notice 设置黑名单
     */
    function setBlacklisted(address _account, bool _status) external onlyOwner {
        isBlacklisted[_account] = _status;
        emit BlacklistedUpdated(_account, _status);
    }
    
    /**
     * @notice 设置买入手续费分配地址（主合约/单币质押合约）
     */
    function setBuyFeeReceiver(address _buyFeeReceiver) external onlyOwner {
        require(_buyFeeReceiver != address(0), "Invalid address");
        address oldReceiver = buyFeeReceiver;
        buyFeeReceiver = _buyFeeReceiver;
        
        // 新地址加入白名单
        isExcluded[_buyFeeReceiver] = true;
        emit ExcludedUpdated(_buyFeeReceiver, true);
        emit BuyFeeReceiverUpdated(oldReceiver, _buyFeeReceiver);
    }
    
    /**
     * @notice 设置卖出手续费分配地址（主合约/单币质押合约）
     */
    function setSellFeeReceiver(address _sellFeeReceiver) external onlyOwner {
        require(_sellFeeReceiver != address(0), "Invalid address");
        address oldReceiver = sellFeeReceiver;
        sellFeeReceiver = _sellFeeReceiver;
        
        // 新地址加入白名单
        isExcluded[_sellFeeReceiver] = true;
        emit ExcludedUpdated(_sellFeeReceiver, true);
        emit SellFeeReceiverUpdated(oldReceiver, _sellFeeReceiver);
    }
    
    /**
     * @notice 设置DQMiningStake合约地址（用于记录待销毁数量）
     */
    function setMiningStake(address _miningStake) external onlyOwner {
        require(_miningStake != address(0), "Invalid address");
        miningStake = _miningStake;
        // 加入白名单
        isExcluded[_miningStake] = true;
        emit ExcludedUpdated(_miningStake, true);
    }
    
    /**
     * @notice 设置手续费开关
     */
    function setFeeStatus(bool _buyFee, bool _sellFee) external onlyOwner {
        buyFeeEnabled = _buyFee;
        sellFeeEnabled = _sellFee;
        emit FeeStatusChanged(_buyFee, _sellFee);
    }
    
    /**
     * @notice 用户销毁自己的代币
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        burnedSupply += amount;
        emit Burned(amount, burnedSupply);
    }
    
    /**
     * @notice 管理员销毁指定地址代币
     */
    function burnFrom(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
        burnedSupply += amount;
        emit Burned(amount, burnedSupply);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 获取实际流通量（总量 - 已销毁）
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - balanceOf(BURN_ADDRESS);
    }
    
    /**
     * @notice 获取剩余可销毁量
     */
    function remainingBurnable() external view returns (uint256) {
        if (burnedSupply >= BURN_TARGET) return 0;
        return BURN_TARGET - burnedSupply;
    }
    
    /**
     * @notice 检查是否已达到通缩目标
     */
    function isBurnTargetReached() external view returns (bool) {
        return burnedSupply >= BURN_TARGET;
    }
    
    /**
     * @notice 计算买入实际到账数量
     * @param amount 购买数量
     * @return burnAmount 销毁数量（90%）
     * @return feeAmount 手续费数量（6%）
     * @return netAmount 实际到账数量（4%）
     */
    function calculateBuyOutput(uint256 amount) external pure returns (
        uint256 burnAmount,
        uint256 feeAmount,
        uint256 netAmount
    ) {
        burnAmount = amount * BUY_BURN_RATE / 100;
        feeAmount = amount * BUY_FEE_RATE / 100;
        netAmount = amount - burnAmount - feeAmount;
    }
    
    /**
     * @notice 计算卖出实际到账数量
     * @param amount 卖出数量
     * @return feeAmount 手续费数量（6%）
     * @return pairAmount 交易对收到数量（94%）
     * @return burnAmount 从底池销毁数量（94%）
     */
    function calculateSellOutput(uint256 amount) external pure returns (
        uint256 feeAmount,
        uint256 pairAmount,
        uint256 burnAmount
    ) {
        feeAmount = amount * SELL_FEE_RATE / 100;
        pairAmount = amount * SELL_TO_PAIR_RATE / 100;
        burnAmount = pairAmount;  // 销毁量等于进入底池量
    }
}
