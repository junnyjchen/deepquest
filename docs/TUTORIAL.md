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

### 核心机制
1. **SOL 进 DQ 出**: 用户使用 ETH/SOL 购买 DQ 代币
2. **DQ 可赎回**: 通过 Uniswap 将 DQ 兑换回 ETH/SOL
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

### 合约依赖
- `@openzeppelin/contracts`: v4.x
  - ERC20, ERC721, ERC721Enumerable
  - Ownable, ReentrancyGuard
  - EnumerableSet, SafeERC20

---

## 核心功能

### 1. SOL/ETH → DQ 兑换

用户将 ETH/SOL 发送到合约，换取 DQ 代币。

**资金分配:**
- 30% → LP 质押池
- 70% → 运营池

**代码调用:**
```javascript
// 发送 ETH 兑换 DQ
await contract.swapSolForDQ({ value: ethers.utils.parseEther("1.0") });
```

### 2. DQ → SOL/ETH 赎回 (Uniswap)

用户销毁 DQ 代币，合约通过 Uniswap DEX 将 DQ 兑换为 ETH 转给用户。

**流程:**
1. 用户授权 DQ 给主合约
2. 调用 `swapDQForSol()`
3. 合约通过 Uniswap 将 DQ 换成 WETH
4. WETH 转给用户 (扣除 6% 手续费)

**手续费分配:**
- 50% → 质押分红池
- 50% → 运营池

**代码调用:**
```javascript
// 兑换 1000 DQ 为 ETH
await contract.swapDQForSol(
  ethers.utils.parseEther("1000"),
  0  // 最小输出设为0，实际应计算滑点
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

使用 ETH/SOL 购买节点卡牌，获得节点分红权益。

**卡牌类型:**
| 类型 | 价格 (USDT) | 分红权重 | 铸造上限 |
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
// 购买 A 级节点卡 (发送对应 ETH)
await contract.buyNode(1);  // 1=A级, 2=B级, 3=C级
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

// 领取合伙人 ETH 手续费分红
await contract.claimPartnerETH();

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

## 部署前准备

### 1. 环境要求
- Node.js >= 16
- npm 或 yarn
- 钱包私钥 (带 BNB 用于部署)

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件:

```env
PRIVATE_KEY=你的私钥
BSC_RPC_URL=https://bsc-dataseed.binance.org/
ETHERSCAN_API_KEY=你的Etherscan API Key
```

### 4. 编译合约

```bash
npx hardhat compile
```

---

## 部署步骤

### 1. 部署到 BSC 主网

```bash
npx hardhat run scripts/deploy.js --network bsc
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

1. **配置价格** (可选)
```javascript
// 设置 DQ 价格 (1 DQ = 1 ETH)
await contract.setPrice(ethers.utils.parseEther("1"));
```

2. **授权 Uniswap Router** (用于 DQ 赎回)
```javascript
// 先将 DQ 转入合约
const dqToken = await contract.dqToken();
await dqToken.approve(uniswapRouter, ethers.constants.MaxUint256);
```

---

## 验证部署

### 1. 验证合约

```bash
npx hardhat verify --network bsc <合约地址>
```

### 2. 检查合约状态

```javascript
// 获取合约余额
const balance = await hre.ethers.provider.getBalance(contract.address);
console.log("合约 ETH 余额:", hre.ethers.utils.formatEther(balance));

// 获取 DQ 代币地址
const dqToken = await contract.dqToken();
console.log("DQ Token:", dqToken);

// 获取 DQ 发行量
const dqTotal = await dqToken.totalSupply();
console.log("DQ 总量:", hre.ethers.utils.formatEther(dqTotal));

// 获取 DQ 价格
const price = await contract.getPrice();
console.log("DQ 价格:", hre.ethers.utils.formatEther(price));
```

### 3. 测试兑换功能

```javascript
// 测试 SOL → DQ
const signer = await hre.ethers.getSigner();
await contract.connect(signer).swapSolForDQ({ value: hre.ethers.utils.parseEther("0.1") });

// 检查用户 DQ 余额
const dqBalance = await dqToken.balanceOf(signer.address);
console.log("用户 DQ 余额:", hre.ethers.utils.formatEther(dqBalance));
```

---

## 常见问题

### Q1: Uniswap DEX 需要什么配置?

**答**: 合约已内置 Uniswap V2 Router 地址:
- Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` (Uniswap V2)
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

### Q2: 如何设置 DQ 的初始价格?

**答**: 使用 `setPrice()` 函数:
```javascript
// 1 DQ = 0.0001 ETH (考虑初始价格较低)
await contract.setPrice(ethers.utils.parseUnits("0.0001", "wei"));
```

### Q3: 质押分红从哪里来?

**答**: 来源于 DQ 赎回时的 6% 手续费分配。

### Q4: 合约安全吗?

**答**: 
- 使用了 `ReentrancyGuard` 防重入
- 使用了 OpenZeppelin 最新版库
- 关键操作设置了访问控制

### Q5: 如何升级合约?

**答**: 当前版本不支持升级，建议:
1. 部署新合约
2. 迁移代币和用户数据
3. 通知用户切换地址

---

## 合约地址

部署后请更新以下地址:

| 合约 | 地址 | 用途 |
|------|------|------|
| DQProject | `<部署后填写>` | 主合约 |
| DQToken | `<自动生成>` | DQ 代币 |
| DQCard | `<自动生成>` | NFT 卡牌 |

---

## 更新日志

### v2.0.0 (2024-01-01)
- ✅ 新增 SOL/ETH → DQ 兑换功能
- ✅ 新增 DQ → Uniswap → ETH 赎回功能
- ✅ 新增 DQ 单币质押系统
- ✅ 新增 Uniswap DEX 集成
- ✅ 更新代币总量为 1000 亿
