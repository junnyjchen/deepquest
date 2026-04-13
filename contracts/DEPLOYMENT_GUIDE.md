# DeepQuest 智能合约部署指南

## 目录

1. [概述](#概述)
2. [合约架构](#合约架构)
3. [部署前准备](#部署前准备)
4. [部署步骤](#部署步骤)
5. [部署后配置](#部署后配置)
6. [合约交互](#合约交互)
7. [安全注意事项](#安全注意事项)

---

## 概述

本文档详细说明 DeepQuest 智能合约在 BSC（币安智能链）上的部署流程。

### 合约信息

| 属性 | 值 |
|------|-----|
| 代币名称 | DQ (DeepQuest Token) |
| 兑换对 | DQ ↔ USDT |
| USDT 合约地址 | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |
| 编译器版本 | Solidity 0.8.17 |

### 核心功能

| 功能 | 说明 |
|------|------|
| 质押 | DQ 代币质押，周期 30/90/180/360 天 |
| 节点 NFT | USDT 购买 A/B/C 级节点卡牌 |
| 兑换 | DQ ↔ USDT 双向兑换 |
| 推广奖励 | 直推奖励、团队奖励、管理奖 |
| 合伙人 | 满足条件自动升级合伙人 |

---

## 合约架构

### 合约组成

```
┌─────────────────────────────────────────┐
│            DQProject (主合约)            │
│  ├── DQToken (代币)                     │
│  │   └── 100万亿 DQ 代币                │
│  └── DQCard (NFT)                       │
│      ├── A级: 3000张, 500 USDT          │
│      ├── B级: 1000张, 1000 USDT         │
│      └── C级: 300张, 3000 USDT          │
└─────────────────────────────────────────┘
```

### 资金分配规则

#### 购买节点 NFT (USDT 支付)

| 用途 | 比例 | 分配方式 |
|------|------|----------|
| LP 质押池 | 60% | 按 LP 份额分红 |
| 节点 NFT | 15% | 按卡牌权重分红 |
| 运营池 | 25% | 项目方支配 |

#### 爆块奖励 (每日一次)

| 用途 | 比例 | 分配方式 |
|------|------|----------|
| LP 质押池 | 60% | 按 LP 份额分红 |
| 节点 NFT | 15% | 按卡牌权重分红 |
| 基金会 | 5% | 合约所有者 |
| 团队奖励 | 14% | 按 D 等级分红 |
| 合伙人 | 6% | 合伙人平均分配 |

#### 动态提现手续费 (10%)

| 用途 | 比例 | 分配方式 |
|------|------|----------|
| 节点 | 40% | 卡牌持有者领取 |
| 合伙人 | 30% | 合伙人平均分配 |
| 运营 | 30% | 项目方支配 |

#### 质押分红 (DQ 卖出 6% 手续费)

| 质押周期 | 分红比例 |
|----------|----------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

---

## 部署前准备

### 1. 环境要求

```bash
# Node.js >= 16.0.0
node --version

# pnpm 或 npm
pnpm --version
```

### 2. 安装依赖

```bash
cd contracts

# 复制环境变量
cp .env.example .env

# 编辑 .env 文件，填入你的私钥和 API Key
vim .env
```

### 3. 配置 .env 文件

```env
# BSC Network RPC URLs
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545

# Deployer Private Key (with 0x prefix)
PRIVATE_KEY=0x YOUR_PRIVATE_KEY_HERE

# BSCScan API Key (for contract verification)
BSCSCAN_API_KEY=YOUR_BSCSCAN_API_KEY
```

### 4. 获取 BSCScan API Key

1. 访问 https://bscscan.com
2. 登录账户
3. 进入 API Keys 页面
4. 创建新的 API Key

### 5. 确保足够余额

部署需要支付 Gas 费用，建议准备：

| 网络 | 建议余额 |
|------|----------|
| BSC Mainnet | 0.5+ BNB |
| BSC Testnet | 1+ BNB (测试币) |

---

## 部署步骤

### 方式一：使用 Hardhat (推荐)

#### 1. 安装依赖

```bash
cd contracts
pnpm install
```

#### 2. 编译合约

```bash
pnpm compile
```

#### 3. 部署到测试网

```bash
pnpm deploy:bscTestnet
```

#### 4. 部署到主网

```bash
pnpm deploy:bscMainnet
```

#### 5. 验证合约

```bash
pnpm verify --network bscMainnet <CONTRACT_ADDRESS>
```

### 方式二：使用 Remix IDE

#### 1. 访问 Remix

访问 https://remix.ethereum.org

#### 2. 创建项目

1. 创建新文件 `DQToken.sol`
2. 复制 `contracts/DQToken.sol` 内容

3. 创建新文件 `DQCard.sol`
4. 复制 `contracts/DQCard.sol` 内容

5. 创建新文件 `DQProject.sol`
6. 复制 `contracts/DQProject.sol` 内容

#### 3. 编译

1. 选择编译器版本 0.8.17
2. 勾选 "Auto compile"
3. 确认无错误

#### 4. 部署

1. 选择 "Injected Provider" (MetaMask)
2. 选择 DQProject 合约
3. 点击 "Deploy"
4. 确认 MetaMask 交易

### 方式三：使用 Truffle

```bash
# 安装
npm install -g truffle

# 初始化
truffle init

# 复制合约文件到 contracts 目录

# 编译
truffle compile

# 部署
truffle migrate --network bscMainnet
```

---

## 部署后配置

### 1. 记录合约地址

部署成功后，记录以下地址：

| 合约 | 地址 |
|------|------|
| DQProject | `0x...` |
| DQToken | `0x...` (从 DQProject 获取) |

### 2. 更新前端配置

更新 `client/utils/constants.ts` 或相关配置文件：

```typescript
export const CONTRACT_ADDRESS = '0xYOUR_DQPROJECT_ADDRESS';
export const USDT_ADDRESS = '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF';
export const BSC_CHAIN_ID = 56;
```

### 3. 更新 ABI

复制 `contracts/abi.ts` 中的 ABI 到前端项目。

### 4. 初始化节点 (可选)

```javascript
// 添加初始节点
await dqProject.addInitialNodes(
  ['0x...', '0x...'],  // 用户地址数组
  [1, 2, 3]            // 卡牌类型数组
);
```

### 5. 设置 DQ 价格 (可选)

```javascript
// 设置初始兑换价格 (1 DQ = 1 USDT)
await dqProject.setDQPrice(ethers.utils.parseUnits('1', 18));
```

---

## 合约交互

### 前端交互示例

```typescript
import { ethers } from 'ethers';
import { DQPROJECT_ABI } from './abi';

const CONTRACT_ADDRESS = '0xYOUR_DQPROJECT_ADDRESS';
const USDT_ADDRESS = '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF';

// 连接钱包
const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();

// 创建合约实例
const dqProject = new ethers.Contract(CONTRACT_ADDRESS, DQPROJECT_ABI, signer);

// 注册
await dqProject.register('0x推荐人地址');

// 入金 (USDT)
await dqProject.deposit(ethers.utils.parseUnits('100', 18));

// 购买节点 NFT
await dqProject.buyNode(1);  // 1=A级, 2=B级, 3=C级

// 质押 DQ
await dqProject.stakeDQ(ethers.utils.parseUnits('1000', 18), 1);  // 90天

// 领取 LP 分红
await dqProject.claimLp();

// 领取 NFT 分红
await dqProject.claimNft();

// 兑换 DQ → USDT
await dqProject.swapDQForUSDT(ethers.utils.parseUnits('1000', 18));

// 兑换 USDT → DQ
await dqProject.swapUSDTForDQ(ethers.utils.parseUnits('1000', 18));

// 触发爆块 (管理员)
await dqProject.blockMining();
```

### 管理员操作

```typescript
// 添加初始节点
await dqProject.addInitialNodes(['0x...'], [1]);

// 设置 DQ 价格
await dqProject.setDQPrice(ethers.utils.parseUnits('1.5', 18));

// 紧急提现 USDT
await dqProject.emergencyWithdrawUSDT(amount);

// 紧急提现 BNB
await dqProject.emergencyWithdrawETH();
```

---

## 安全注意事项

### 部署安全

1. **私钥安全**
   - 绝对不要将私钥提交到 Git
   - 使用硬件钱包或冷钱包进行主网部署
   - 考虑使用多签钱包作为合约所有者

2. **测试网验证**
   - 先在测试网充分测试所有功能
   - 测试各种边界条件
   - 检查所有权限设置

3. **合约验证**
   - 在 BSCScan 上验证合约源代码
   - 确认编译版本和设置正确

### 运营安全

1. **权限控制**
   - 定期检查合约所有者地址
   - 考虑设置时间锁

2. **资金监控**
   - 监控大额交易
   - 设置异常交易警报

3. **紧急预案**
   - 保留暂停合约的能力
   - 准备好应急响应流程

### 推荐做法

1. **分阶段部署**
   - 先部署测试网
   - 审计通过后部署主网
   - 从小额度开始运营

2. **专业审计**
   - 部署前进行合约审计
   - 修复所有发现的问题

3. **备份**
   - 备份所有部署脚本和配置文件
   - 记录所有合约地址

---

## 常见问题

### Q: 部署失败怎么办？

A: 检查以下内容：
- 私钥是否正确
- RPC 是否可访问
- 账户余额是否足够
- Gas Price 是否合适

### Q: 如何确认合约已正确部署？

A: 在 BSCScan 上：
1. 搜索合约地址
2. 确认合约字节码与源代码匹配
3. 测试合约读写功能

### Q: USDT 代币余额不足怎么办？

A: 合约需要 USDT 作为：
- 用户入金资金
- 节点购买资金
- 兑换流动性

确保合约有足够的 USDT 流动性。

---

## 技术支持

如有问题，请联系开发团队。
