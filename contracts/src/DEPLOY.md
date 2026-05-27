# DQ 质押系统 V2 部署指南

## 方案A：PancakeSwap 标准池子

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    部署顺序                                  │
├─────────────────────────────────────────────────────────────┤
│  1. DQT (代币)     → 1000亿                                 │
│  2. DQC (NFT)      → 节点卡                                 │
│  3. DQMCore        → 用户核心                               │
│  4. DQMiningStakeCore → 质押核心                           │
│  5. DQMiningStakeMine  → 爆块合约                          │
│  6. DQMAdmin       → 管理合约                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 第一步：部署合约

```bash
# 设置环境变量
export PRIVATE_KEY=你的私钥
export BSC_RPC=https://bsc-dataseed1.binance.org

# 编译
forge build

# 部署
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $BSC_RPC \
    --broadcast \
    --verify
```

**记录部署地址：**
```
DQT: 0x...
DQC: 0x...
DQMCore: 0x...
DQMiningStakeCore: 0x...
DQMiningStakeMine: 0x...
DQMAdmin: 0x...
```

---

## 第二步：在 PancakeSwap 创建池子

### 方式1：前端操作（推荐新手）

1. 打开 [PancakeSwap 添加流动性](https://pancakeswap.finance/add)
2. 选择 DQT 代币（粘贴合约地址）
3. 选择 BNB
4. 输入数量：
   - DQT: 100,000,000,000 (1000亿)
   - BNB: 你想添加的数量
5. 确认交易
6. **记录 Pair 合约地址**

### 方式2：代码操作

```javascript
const { ethers } = require("ethers");

// BSC 主网
const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

async function createPool() {
    const [signer] = await ethers.getSigners();
    
    // DQT 合约
    const dqt = await ethers.getContractAt("DQT", "DQT_ADDRESS");
    
    // Router 合约
    const router = await ethers.getContractAt("IRouter", ROUTER);
    
    // 1. 授权
    const totalSupply = await dqt.totalSupply();
    await dqt.approve(ROUTER, totalSupply);
    console.log("Approved");
    
    // 2. 添加流动性
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const tx = await router.addLiquidityETH(
        dqt.target,
        totalSupply,           // 1000亿 DQT
        0,                     // 最小 DQT
        0,                     // 最小 BNB
        signer.address,
        deadline,
        { value: ethers.parseEther("100") }  // 100 BNB
    );
    
    await tx.wait();
    console.log("Liquidity added!");
    
    // 3. 获取 Pair 地址
    const factory = await ethers.getContractAt("IFactory", FACTORY);
    const pairAddress = await factory.getPair(dqt.target, WBNB);
    console.log("Pair Address:", pairAddress);
    
    // 4. 设置 Pool
    await dqt.setPool(pairAddress);
    console.log("Pool set!");
    
    return pairAddress;
}
```

---

## 第三步：设置 Pool 地址

```javascript
// 获取 Pair 地址
const factory = await ethers.getContractAt("IFactory", FACTORY);
const pairAddress = await factory.getPair(DQT_ADDRESS, WBNB);
console.log("Pair:", pairAddress);

// 设置 Pool
await dqt.setPool(pairAddress);
console.log("Pool set!");
```

---

## 第四步：验证设置

```javascript
// 检查 Pool 地址
const pool = await dqt.pool();
console.log("Pool:", pool);

// 检查 Pool 余额
const poolBalance = await dqt.balanceOf(pool);
console.log("Pool Balance:", ethers.formatUnits(poolBalance, 18), "DQ");

// 检查爆块合约权限
const mining = await dqt.miningContract();
console.log("Mining Contract:", mining);
```

---

## 第五步：开始爆块

```javascript
// 爆块合约调用
const mining = await ethers.getContractAt("DQMiningStakeMine", MINING_ADDRESS);

// 执行爆块（每日一次）
await mining.mine();
console.log("Mining executed!");
```

---

## 完整流程图

```
部署合约
    │
    ▼
┌─────────────────────────────────────────┐
│ PancakeSwap 添加流动性                    │
│ ├── 存入 1000亿 DQT                      │
│ ├── 存入 100 BNB                         │
│ └── 获得 LP 代币                         │
└─────────────────────────────────────────┘
    │
    ▼
获取 Pair 地址
    │ factory.getPair(DQT, WBNB)
    │
    ▼
设置 Pool
    │ dqt.setPool(pairAddress)
    │
    ▼
┌─────────────────────────────────────────┐
│ 每日爆块                                  │
│                                         │
│ mining.mine()                           │
│     │                                   │
│     ├── dqt.burnFromPool(销毁量)        │
│     │   └── _transfer(pool, dead)      │
│     │   └── pair.sync()                │
│     │                                   │
│     └── dqt.distributeFromPool(分配量)  │
│         └── _transfer(pool, user)      │
│         └── pair.sync()                │
└─────────────────────────────────────────┘
```

---

## AVE/DexScreener 自动识别

使用标准 PancakeSwap Pool 后：

| 平台 | 状态 |
|------|------|
| AVE.ai | ✅ 自动识别 |
| DexScreener | ✅ 自动识别 |
| 1inch | ✅ 自动识别 |
| CoinGecko | ⚠️ 需手动提交 |

---

## 合约地址模板

```bash
# 复制并填入实际地址
export DQT=0x...
export DQC=0x...
export DQMCore=0x...
export DQMiningStakeCore=0x...
export DQMiningStakeMine=0x...
export DQMAdmin=0x...
export PAIR=0x...
```

---

## 常见问题

### Q: 为什么要调用 pair.sync()？
A: 因为 DQT 直接修改了 Pair 的余额，需要通知 Pair 更新储备值。

### Q: LP 持有者会受影响吗？
A: 会。每次爆块销毁会导致 DQ 数量减少，但 BNB 数量不变，所以 DQ 价格会上涨。

### Q: 用户可以正常交易吗？
A: 可以。使用标准 PancakeSwap Pool，交易不受影响。

### Q: 爆块频率？
A: 每日一次，任何人都可以调用 mine()。
