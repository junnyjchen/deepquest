# DQProject 智能合约部署教程

## 目录
1. [项目概述](#项目概述)
2. [合约架构](#合约架构)
3. [核心功能](#核心功能)
4. [部署前准备](#部署前准备)
5. [部署步骤](#部署步骤)
6. [验证部署](#验证部署)
7. [常见问题](#常见问题)

---

## 项目概述

**DQProject** 是一个基于币安智能链 (BSC) 的 DeFi 量化平台智能合约。

### 代币信息
- **代币名称**: DQ (DeepQuest Token)
- **代币总量**: 1000 亿 (1,000,000,000,000)
- **合约标准**: ERC20
- **网络**: BSC (币安智能链)

### 核心机制
1. **BNB/WBNB 进 DQ 出**: 用户使用 BNB 或 WBNB 购买 DQ 代币
2. **DQ 可赎回**: 通过 PancakeSwap 将 DQ 兑换回 BNB
3. **质押分红**: 质押 DQ 获取分红收益
4. **节点系统**: 购买 NFT 节点卡牌获得额外收益

---

## 合约架构

### 合约组成
```
DQProject.sol
├── DQToken          - DQ 代币 (ERC20)
├── DQCard           - NFT 节点卡牌 (ERC721)
└── DQProject        - 主合约
    ├── 用户系统
    ├── 质押系统
    ├── 分红系统
    └── DEX 集成
```

### BSC 重要地址

| 名称 | 地址 | 说明 |
|------|------|------|
| **PancakeSwap V2 Router** | `0x10ed43c718714eb63d5aA4B43D3f6452Bc7F4ce6` | BSC 上最大的 DEX 交易所 |
| **WBNB** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | Wrapped BNB，BNB 的 ERC20 包装版本 |

### 关于地址 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF

⚠️ **注意**: 地址 `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` 是 **WBNB** (Wrapped BNB) 的合约地址，不是 SOL。

- **WBNB** = Wrapped BNB，是 BNB 的代币化版本，用于在智能合约中使用
- **BNB** = BNB，是 BSC 的原生代币，用于支付 gas 费
- 在合约中操作时，通常使用 WBNB 进行交易

### 合约依赖
- `@openzeppelin/contracts`: v4.9.0
  - ERC20, ERC721, ERC721Enumerable
  - Ownable, ReentrancyGuard
  - EnumerableSet, SafeERC20

---

## 核心功能

### 1. BNB/WBNB → DQ 兑换 (入金)

用户将 BNB 或 WBNB 发送到合约，换取 DQ 代币。

**资金分配:**
- 30% → LP 质押池
- 70% → 运营池

**代码调用 - 发送 BNB:**
```javascript
// 发送 BNB 兑换 DQ (自动铸币)
await contract.swapBNBForDQ({ value: ethers.utils.parseEther("1.0") });
```

**代码调用 - 使用 WBNB:**
```javascript
// 先授权 WBNB
const wbnb = await contract.WBNB();
await wbnb.approve(contract.address, ethers.utils.parseEther("1000"));

// 使用 WBNB 兑换 DQ
await contract.swapWBNBForDQ(ethers.utils.parseEther("1000"));
```

### 2. DQ → BNB 赎回 (PancakeSwap)

用户销毁 DQ 代币，合约通过 PancakeSwap DEX 将 DQ 兑换为 BNB 转给用户。

**流程:**
1. 用户调用 `swapDQForBNB()`
2. 合约通过 PancakeSwap 将 DQ 换成 WBNB
3. WBNB 转为 BNB 转给用户 (扣除 6% 手续费)

**手续费分配:**
- 50% → 质押分红池
- 50% → 运营池

**代码调用:**
```javascript
// 兑换 1000 DQ 为 BNB (设置 1% 滑点)
const minOut = ethers.utils.parseEther("990"); // 约 1% 滑点容差
await contract.swapDQForBNB(
  ethers.utils.parseEther("1000"),
  minOut
);
```

### 3. DQ 质押系统

用户质押 DQ 代币，按周期获得分红。

**质押周期:**
| 周期 | 年化收益 | 总收益 |
|------|----------|--------|
| 30 天 | 5% | 5% |
| 90 天 | 10% | 10% |
| 180 天 | 15% | 15% |
| 360 天 | 20% | 20% |

**代码调用:**
```javascript
// 质押 1000 DQ，30天周期 (periodIndex = 0)
await contract.stakeDQ(
  ethers.utils.parseEther("1000"),
  0  // periodIndex: 0=30天, 1=90天, 2=180天, 3=360天
);

// 解除质押
await contract.unstakeDQ(0);
```

### 4. 节点 NFT 购买

使用 BNB 购买节点卡牌，获得节点分红权益。

**卡牌类型:**
| 类型 | 价格 (BNB) | 分红权重 | 铸造上限 |
|------|-------------|----------|----------|
| A 级 | 500 | 4/15 | 3000 张 |
| B 级 | 1000 | 5/15 | 1000 张 |
| C 级 | 3000 | 6/15 | 300 张 |

**资金分配:**
- 60% → LP 质押池
- 15% → 节点 NFT 分红池
- 25% → 运营池

**代码调用:**
```javascript
// 购买 A 级节点卡 (发送 500 BNB)
await contract.buyNode(1, { value: ethers.utils.parseEther("500") });
// 1=A级, 2=B级, 3=C级
```

### 5. 分红领取

各角色可领取不同类型的分红:

```javascript
// 领取 LP 分红
await contract.claimLp();

// 领取节点分红
await contract.claimNft();

// 领取 D 级团队分红
await contract.claimDTeam();

// 领取合伙人 DQ 分红
await contract.claimPartnerDQ();

// 领取合伙人 BNB 手续费分红
await contract.claimPartnerBNB();

// 领取质押分红
await contract.claimFee();

// 领取动态奖金
await contract.withdraw();
```

### 6. 爆块机制

每日触发一次，铸造并分配代币:

**分配比例:**
- LP 质押池: 60%
- NFT 分红: 15%
- 基金会: 5%
- 团队: 14%
- 合伙人: 6%

**燃烧比例:**
初始 80%，每日递减 5%，最低 30%

```javascript
// 触发爆块 (每日一次)
await contract.blockMining();
```

---

## PancakeSwap DEX 说明

### 什么是 PancakeSwap?

PancakeSwap 是 BSC 上最大的去中心化交易所 (DEX)，类似于以太坊上的 Uniswap。

**主要功能:**
- 代币兑换 (Swap)
- 流动性提供 (Liquidity)
- 质押 (Staking)
- 彩票
- NFT 市场

**路由合约地址:**
```
0x10ed43c718714eb63d5aA4B43D3f6452Bc7F4ce6
```

### 合约如何与 PancakeSwap 交互

**兑换路径 (Path):**
```
DQ → WBNB → BNB
```

**过程:**
1. 合约持有 DQ 代币
2. 调用 PancakeSwap Router 的 `swapExactTokensForETHSupportingFeeOnTransferTokens`
3. Router 自动将 DQ 换成 WBNB，再换成 BNB
4. 合约收到 BNB

### 为什么选择 PancakeSwap?

| 对比 | PancakeSwap | Uniswap |
|------|-------------|---------|
| 网络 | BSC | Ethereum |
| Gas 费 | 低 (~$0.1) | 高 (~$10-50) |
| 交易速度 | 快 (~3秒) | 慢 (~15秒) |
| 流动性 | 高 | 高 |

---

## 部署前准备

### 1. 环境要求
- Node.js >= 16
- npm 或 yarn
- 钱包私钥 (带 BNB 用于部署)

### 2. 安装依赖

```bash
cd contracts
npm install
```

### 3. 配置环境变量

创建 `contracts/.env` 文件:

```env
PRIVATE_KEY=你的私钥
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=你的BscScan API Key
```

### 4. 编译合约

```bash
npx hardhat compile
```

---

## 部署步骤

### 1. 部署到 BSC 主网

```bash
npx hardhat run scripts/deploy.js --network bscMainnet
```

### 2. 部署脚本示例

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("开始部署 DQProject...");

  // 部署主合约
  const DQProject = await hre.ethers.getContractFactory("DQProject");
  const contract = await DQProject.deploy();
  await contract.deployed();

  console.log("DQProject 部署成功!");
  console.log("合约地址:", contract.address);

  // 保存部署信息
  const fs = require("fs");
  const deployment = {
    address: contract.address,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
  };
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. 部署后配置

部署完成后需要:

1. **配置 DQ 价格** (可选)
```javascript
// 设置 DQ 价格 (1 DQ = 1 BNB)
await contract.setPrice(ethers.utils.parseEther("1"));
```

2. **为合约添加初始流动性** (用于 DQ 赎回)
```javascript
// 将部分 DQ 和 BNB 添加到 PancakeSwap LP
// 这是为了让 swapDQForBNB 能够正常工作
```

---

## 验证部署

### 1. 验证合约

```bash
npx hardhat verify --network bscMainnet <合约地址>
```

### 2. 检查合约状态

```javascript
// 获取合约 BNB 余额
const balance = await hre.ethers.provider.getBalance(contract.address);
console.log("合约 BNB 余额:", hre.ethers.utils.formatEther(balance));

// 获取 DQ 代币地址
const dqToken = await contract.dqToken();
console.log("DQ Token:", dqToken);

// 获取 DQ 发行量
const dqTotal = await dqToken.totalSupply();
console.log("DQ 总量:", hre.ethers.utils.formatEther(dqTotal));

// 获取 DQ 价格
const price = await contract.getPrice();
console.log("DQ 价格:", hre.ethers.utils.formatEther(price));

// 获取 PancakeSwap Router
const router = await contract.PANCAKE_ROUTER();
console.log("PancakeSwap Router:", router);

// 获取 WBNB 地址
const wbnb = await contract.WBNB();
console.log("WBNB:", wbnb);
```

### 3. 测试兑换功能

```javascript
// 测试 BNB → DQ
const signer = await hre.ethers.getSigner();
await contract.connect(signer).swapBNBForDQ({ value: hre.ethers.utils.parseEther("0.1") });

// 检查用户 DQ 余额
const dqToken = await contract.dqToken();
const dqBalance = await dqToken.balanceOf(signer.address);
console.log("用户 DQ 余额:", hre.ethers.utils.formatEther(dqBalance));
```

---

## 常见问题

### Q1: 为什么使用 PancakeSwap 而不是 Uniswap?

**答**: 
- PancakeSwap 部署在 BSC 上，Gas 费低
- Uniswap 部署在以太坊主网上，Gas 费高
- 两者都是 DEX，功能类似

### Q2: WBNB 和 BNB 的区别是什么?

**答**:
- **BNB**: BSC 的原生代币，用于支付 Gas 费
- **WBNB**: BNB 的 ERC20 包装版本，用于智能合约交互
- 1 WBNB = 1 BNB，随时可以 1:1 互换

### Q3: PancakeSwap Router 地址是什么?

**答**: 
```
0x10ed43c718714eb63d5aA4B43D3f6452Bc7F4ce6 (PancakeSwap V2 Router)
```

### Q4: 如何设置 DQ 的初始价格?

**答**: 使用 `setPrice()` 函数:
```javascript
// 1 DQ = 0.0001 BNB
await contract.setPrice(ethers.utils.parseUnits("0.0001", "ether"));
```

### Q5: 质押分红从哪里来?

**答**: 来源于 DQ 赎回时的 6% 手续费分配。

### Q6: 合约安全吗?

**答**: 
- 使用了 `ReentrancyGuard` 防重入
- 使用了 OpenZeppelin 最新版库
- 关键操作设置了访问控制
- 建议上线前进行专业审计

### Q7: 地址 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF 是什么?

**答**: 这是 WBNB 的合约地址，不是 SOL。

---

## 合约地址

部署后请更新以下地址:

| 合约 | 地址 | 用途 |
|------|------|------|
| DQProject | `<部署后填写>` | 主合约 |
| DQToken | `<自动生成>` | DQ 代币 |
| DQCard | `<自动生成>` | NFT 卡牌 |
| PancakeSwap Router | `0x10ed43c...` | DEX 交易所 |
| WBNB | `0xbb4CdB9C...` | BNB 包装代币 |

---

## 更新日志

### v2.0.0 (2024-01-01)
- ✅ 使用 BNB/WBNB 进行质押入金
- ✅ 使用 PancakeSwap DEX 进行 DQ 赎回
- ✅ 新增 DQ 单币质押系统
- ✅ 更新代币总量为 1000 亿
- ✅ 使用 PancakeSwap V2 Router (BSC)
- ✅ WBNB 地址: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
