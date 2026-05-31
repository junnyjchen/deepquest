// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// =========================================================
// DQMiningTestMocks.sol — 全系统测试用 Mock 合约
// 包含：MockERC20Token / MockPairToken / MockDQCard /
//       MockPancakeRouter / MockPancakeRouterV3 /
//       MockPancakeRouterFull / MockRemoveLiquidityRouter /
//       MockDQMiningStake / MockMineContract / MockDQMCore
// =========================================================

interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

contract MockERC20Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool private initialized;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function initialize(string memory _name, string memory _symbol, uint8 _decimals) external {
        require(!initialized, "initialized");
        initialized = true;
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "burn amount exceeds balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    // ── DQT compat: called by DQMiningStakeMine via low-level call ──
    // 模拟 DQT.burnFromPool：从调用者(mine合约)余额销毁
    function burnFromPool(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "burnFromPool: insufficient");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    // 模拟 DQT.distributeFromPool：从调用者(mine合约)余额转给接收方
    function distributeFromPool(address to, uint256 amount) external {
        require(to != address(0), "distributeFromPool: zero addr");
        require(balanceOf[msg.sender] >= amount, "distributeFromPool: insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
    }
}

contract MockDQCard {
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    uint256 public constant PRICE_A = 500 ether;
    uint256 public constant PRICE_B = 1500 ether;
    uint256 public constant PRICE_C = 5000 ether;

    uint256 private nextTokenId;
    mapping(address => uint256[]) private ownedTokens;
    mapping(uint256 => uint256) public cardType;

    function mintByOwner(address to, uint256 _type) external {
        require(_type >= 1 && _type <= 3, "invalid type");
        nextTokenId += 1;
        ownedTokens[to].push(nextTokenId);
        cardType[nextTokenId] = _type;
        if (_type == 1) totalA += 1;
        else if (_type == 2) totalB += 1;
        else totalC += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return ownedTokens[owner].length;
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        return ownedTokens[owner][index];
    }

    function getCardPrice(uint256 _type) external pure returns (uint256) {
        if (_type == 1) return PRICE_A;
        if (_type == 2) return PRICE_B;
        return PRICE_C;
    }
}

contract MockPancakeRouter {
    function getAmountsOut(uint amountIn, address[] calldata path) external pure returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amountIn;
        }
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint,
        address[] calldata path,
        address to,
        uint
    ) external {
        MockERC20Token(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IMintableToken(path[1]).mint(to, amountIn);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint,
        uint,
        address,
        uint
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        MockERC20Token(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        MockERC20Token(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired < amountBDesired ? amountADesired : amountBDesired;
    }
}

contract MockPancakeRouterV3 {
    address public lpToken;
    bool private initialized;

    function initialize(address _lpToken) external {
        require(!initialized, "initialized");
        initialized = true;
        lpToken = _lpToken;
    }

    function getAmountsOut(uint amountIn, address[] calldata path) external pure returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amountIn;
        }
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint,
        address[] calldata path,
        address to,
        uint
    ) external {
        MockERC20Token(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IMintableToken(path[1]).mint(to, amountIn);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint,
        uint,
        address to,
        uint
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        MockERC20Token(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        MockERC20Token(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired < amountBDesired ? amountADesired : amountBDesired;
        if (liquidity > 0) {
            IMintableToken(lpToken).mint(to, liquidity);
        }
    }
}

contract MockDQMiningStake {
    mapping(address => uint256) public lpS;
    mapping(address => uint256) public lpT;
    mapping(address => uint256) public lpD;
    mapping(address => uint8) public dLevels;
    address public partner;

    constructor() {
        partner = address(0xBEEF);
    }

    function distNFT(uint256) external payable {}
    function distP(uint256) external {}
    function addLP(address u, uint256 a, uint256 t) external {
        lpS[u] += a;
        lpT[u] = t;
    }
    function distLP(uint256) external {}
    function claimLP(address) external {}
    function claimNft(address) external {}
    function claimD(address) external {}
    function claimFee(address) external {}
    function claimPdq(address) external {}
    function registerDLevel(address _user, uint8 _level) external { dLevels[_user] = _level; }
    function claimPbnb(address) external {}
    function withdraw(address, uint256) external {}
    function withdrawLP(address _u) external { lpS[_u] = 0; }
    function distDQFee(uint256) external {}
    function PARTNER() external view returns (address) { return partner; }
    function stake(address, uint256, uint) external {}
    function unstake(address, uint) external {}
    function clmS(address, uint) external {}
    function mine() external {}
}

// =========================================================
// MockPairToken: ERC20 with sync() + mint/burn — 用作 LP Pair
// =========================================================
contract MockPairToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool private initialized;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function initialize(string memory _name, string memory _symbol) external {
        require(!initialized, "initialized");
        initialized = true;
        name = _name;
        symbol = _symbol;
    }

    // PancakeSwap Pair 要求的 sync()
    function sync() external {}

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "burn exceeds balance");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

// =========================================================
// MockPancakeRouterFull: 完整 Router mock，供 DQMCore 使用
// swap: 从 caller 取 path[0]，向 to 铸造 path[1]（1:1）
// addLiquidity: 从 caller 取两种代币，向 to 铸造 LP
// removeLiquidity: 向 to 分别转 tokenA / tokenB
// =========================================================
contract MockPancakeRouterFull {
    address public lpToken;
    bool private initialized;

    function initialize(address _lpToken) external {
        require(!initialized, "initialized");
        initialized = true;
        lpToken = _lpToken;
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        external pure returns (uint[] memory amounts)
    {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amountIn; // 1:1 rate
        }
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint,
        address[] calldata path,
        address to,
        uint
    ) external {
        MockERC20Token(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IMintableToken(path[1]).mint(to, amountIn);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint,
        uint,
        address to,
        uint
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        MockERC20Token(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        MockERC20Token(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired < amountBDesired ? amountADesired : amountBDesired;
        if (liquidity > 0) {
            IMintableToken(lpToken).mint(to, liquidity);
        }
    }

    // removeLiquidity 供 DQMiningStakeCore.cancelLPEquity 使用
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256,
        uint256,
        address to,
        uint256
    ) external returns (uint256 amountA, uint256 amountB) {
        // 从 caller 回收 LP
        MockPairToken(lpToken).transferFrom(msg.sender, address(this), liquidity);
        // 向 to 发放等额 tokenA / tokenB
        amountA = liquidity;
        amountB = liquidity;
        IMintableToken(tokenA).mint(to, amountA);
        IMintableToken(tokenB).mint(to, amountB);
    }
}

// =========================================================
// MockMineContract: 供 DQMiningStakeCore 使用
// =========================================================
contract MockMineContract {
    function distributeLPReward(uint256) external {}
    function distributeNodeReward(uint256) external {}
    function distributeDRankReward(uint256) external {}
}

// =========================================================
// MockDQMCoreForStake: 供 DQMiningStakeCore 调用的 DQMCore 接口 mock
// =========================================================
contract MockDQMCoreForStake {
    mapping(address => uint256) public totalInvest;
    mapping(address => bool) public blacklist;

    function setTotalInvest(address user, uint256 amount) external {
        totalInvest[user] = amount;
    }

    function getUserTotalInvest(address user) external view returns (uint256) {
        return totalInvest[user];
    }

    function isBlacklisted(address user) external view returns (bool) {
        return blacklist[user];
    }

    function setReferrer(address, address) external {}
    function getUserEnergy(address) external view returns (uint256) { return 0; }
}
