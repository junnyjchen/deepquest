# DeepQuest 运营操作指南

## 目录

1. [系统登录](#1-系统登录)
2. [仪表盘](#2-仪表盘)
3. [用户管理](#3-用户管理)
4. [入金记录](#4-入金记录)
5. [合伙人管理](#5-合伙人管理)
6. [资金池管理](#6-资金池管理)
7. [节点申请管理](#7-节点申请管理)
8. [卡牌管理](#8-卡牌管理)
9. [操作日志](#9-操作日志)
10. [合约配置](#10-合约配置)
11. [智能合约部署](#11-智能合约部署)
12. [API 接口参考](#12-api-接口参考)

---

## 1. 系统登录

### 访问系统

- 访问地址：`https://your-domain.com`
- 输入管理员用户名和密码

### 默认测试账号

- 用户名：`admin`
- 密码：`admin123`

### 登录成功

- 登录成功后自动跳转到仪表盘页面
- 管理员信息存储在浏览器本地缓存中

---

## 2. 仪表盘

### 功能说明

仪表盘展示系统的核心运营数据，包括：

| 数据项 | 说明 |
|--------|------|
| Total Users | 系统中注册用户总数 |
| Total Deposit | 所有用户累计投资总额 |
| Today Deposit | 今日新增投资总额 |
| Total Withdraw | 所有用户累计提现总额 |

### 奖励分布

展示各类奖励的分配情况：
- Direct Rewards：直推奖励
- Node Rewards：节点奖励
- Management Rewards：管理奖励
- DAO Rewards：DAO奖励

### 其他统计

- Partners：合伙人总数
- Cards：NFT卡牌总数
- Pool Balance：资金池总余额

---

## 3. 用户管理

### 核心概念

> **BSC区块链DAPP标准**：用户通过钱包授权登录，无需传统注册流程。用户身份以钱包地址为唯一标识。

### BSC钱包地址格式

- **格式**：以太坊格式（Ethereum-compatible）
- **前缀**：`0x`
- **长度**：42位（0x + 40位十六进制）
- **示例**：`0x1234567890abcdef1234567890abcdef12345678`

### 用户识别方式

| 传统Web应用 | BSC区块链DAPP |
|-------------|--------------|
| 用户名/邮箱 | 钱包地址（0x...） |
| 密码登录 | 钱包签名授权 |
| 用户ID | Wallet Address |
| 注册时间 | 首次链上交互时间 |

### 查看用户列表

- 展示所有同步到数据库的用户
- 支持按钱包地址搜索
- 支持按等级筛选
- 支持按是否合伙人筛选

### 同步用户（SYNC FROM CHAIN）

由于用户数据存储在BSC区块链上，管理后台需要从链上同步用户数据：

**步骤：**
1. 点击右上角「SYNC FROM CHAIN」按钮
2. 在弹出框中输入BSC钱包地址
3. 点击「SYNC」确认同步
4. 系统将从BSC区块链获取用户数据并存储到数据库

**说明：**
- 首次同步会创建用户记录
- 后续同步会更新用户最新数据
- 用户所有链上操作（投资、奖励等）都通过钱包地址关联

### 用户详情

点击用户卡片可查看详细信息：
- **钱包地址**（主标识，BSC格式）
- 推荐人地址
- 当前等级（S1-S6）
- 累计投资额
- 团队投资额
- 能量值
- LP份额
- 是否合伙人

### 子页面

- **入金记录**：该用户的链上投资历史
- **奖励记录**：该用户获得的各类奖励
- **提现记录**：该用户的链上提现历史
- **团队成员**：该用户的直接推荐人列表

---

## 4. 入金记录

### 功能说明

展示所有用户的链上投资记录

### 筛选条件

- 按状态筛选：pending / completed / failed
- 按日期范围筛选
- 按钱包地址搜索

### 状态说明

| 状态 | 说明 |
|------|------|
| pending | 处理中（链上确认中） |
| completed | 已完成 |
| failed | 失败 |

---

## 5. 合伙人管理

### 功能说明

管理平台的合伙人用户

### 合伙人信息

- 用户钱包地址
- 合伙人序号
- 个人投资额
- 直推销售额
- DQ奖励累计
- BNB奖励累计
- 状态（active / removed）

### 操作

- 可查看合伙人详情
- 可更新合伙人状态

---

## 6. 资金池管理

### 资金池类型

| 池名称 | 说明 |
|--------|------|
| management | 管理池 |
| dao | DAO池 |
| insurance | 保险池 |
| operation | 运营池 |
| fee | 手续费池 |

### 功能

- 查看各池余额
- 查看累计分发金额
- 手动调整池余额

---

## 7. 节点申请管理

### 功能说明

管理用户提交的节点申请，包括节点合伙人（Node Partner）和节点委托人（Node Delegate）申请。

### 申请类型

| 类型 | 说明 |
|------|------|
| node_partner | 节点合伙人 |
| node_delegate | 节点委托人 |

### 申请状态

| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 已通过 |
| rejected | 已拒绝 |

### 审核申请流程

1. 进入「节点申请管理」页面
2. 点击待审核的申请卡片展开详情
3. 点击底部「REVIEW」按钮
4. 填写审核备注（可选）
5. 选择 APPROVE（通过）或 REJECT（拒绝）

---

## 8. 卡牌管理

### 功能说明

管理 NFT 节点卡牌类型和价格配置

### 卡牌等级

| 等级 | 价格(USDT) | LP比例 | 节点比例 | 运营比例 |
|------|-----------|--------|----------|----------|
| A | 高 | 60% | 15% | 25% |
| B | 中 | 60% | 15% | 25% |
| C | 低 | 60% | 15% | 25% |

### 操作

- 查看各等级卡牌配置
- 更新卡牌价格
- 查看卡牌销售统计

---

## 9. 操作日志

### 功能说明

记录所有管理员的操作行为

### 日志类型（颜色标识）

| 类型 | 颜色 | 说明 |
|------|------|------|
| create | 绿色 | 创建操作 |
| update | 青色 | 更新操作 |
| delete | 红色 | 删除操作 |
| login | 金色 | 登录操作 |
| mint | 紫色 | 铸造操作 |
| withdraw | 橙色 | 提现操作 |

---

## 10. 合约配置

### 功能说明

管理系统中的合约参数配置

### 配置类别

| 类别 | 说明 |
|------|------|
| investment | 投资相关参数 |
| reward | 奖励相关参数 |
| partner | 合伙人相关参数 |
| card | 卡牌相关参数 |
| system | 系统参数 |

### 质押周期配置

| 周期 | 默认分红比例 |
|------|-------------|
| 30天 | 5% |
| 90天 | 10% |
| 180天 | 15% |
| 360天 | 20% |

---

## 11. 智能合约部署

### 概述

DeepQuest 系统使用以下智能合约：

| 合约 | 链 | 用途 |
|------|-----|------|
| DQ Token | Solana | 平台代币 |
| LP Pool | BSC | 流动性质押池 |
| Node NFT | BSC | 节点权益NFT |

### 代币信息

| 属性 | 值 |
|------|-----|
| 代币名称 | DQ (DeepQuest Token) |
| 合约链 | Solana |
| SOL 合约地址 | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |

### 部署前准备

1. **钱包准备**
   - 准备部署钱包（需有足够 BNB/SOL 支付 Gas）
   - 推荐使用硬件钱包或安全的钱包
   - 分离管理员权限和操作权限

2. **环境确认**
   - BSC Mainnet Chain ID: 56
   - RPC 节点：https://bsc-dataseed.binance.org/
   - 区块浏览器：https://bscscan.com

3. **参数配置**
   - 质押周期配置
   - 奖励比例配置
   - 节点卡牌价格配置
   - 资金池分配比例

### 部署步骤

#### 1. 部署 DQ Token 合约（Solana）

```bash
# 使用 Solana CLI 或 Anchor 框架部署
anchor build
anchor deploy --provider.cluster mainnet
```

#### 2. 部署 LP Pool 合约（BSC）

```bash
# 使用 Hardhat 或 Truffle 部署
npx hardhat compile
npx hardhat deploy --network bscMainnet
```

#### 3. 部署 Node NFT 合约（BSC）

```bash
npx hardhat compile
npx hardhat deploy --tags NodeNFT --network bscMainnet
```

#### 4. 配置合约参数

```bash
# 设置质押周期
node scripts/config-staking.js

# 设置节点价格
node scripts/config-nodes.js

# 设置奖励比例
node scripts/config-rewards.js
```

### 部署后验证

1. **合约验证**
   - 在 BSCScan 上验证合约源代码
   - 确认合约字节码与源代码匹配

2. **功能测试**
   - 测试质押功能
   - 测试奖励分发
   - 测试节点购买
   - 测试兑换功能

3. **安全审计**
   - 合约代码审计
   - 权限控制检查
   - 经济模型验证

### 合约交互

#### 连接钱包

```javascript
// 使用 ethers.js 连接 BSC
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();
```

#### 质押 DQ

```javascript
const stakingContract = new ethers.Contract(
  STAKING_ADDRESS,
  STAKING_ABI,
  signer
);

// 质押 100 DQ，锁定期 90 天
await stakingContract.stake(
  ethers.utils.parseUnits("100", 18),
  90
);
```

#### 购买节点 NFT

```javascript
const nodeContract = new ethers.Contract(
  NODE_ADDRESS,
  NODE_ABI,
  signer
);

// 购买 A 级节点卡（价格以 USDT 计算）
await nodeContract.buyNode(A_CARD_TYPE, { value: PRICE });
```

### 监控与维护

1. **链上监控**
   - 监控大额交易
   - 监控异常行为
   - 监控 Gas 价格

2. **资金池管理**
   - 定期检查 LP 池余额
   - 监控奖励分发状态
   - 及时补充流动性

3. **应急响应**
   - 暂停合约功能（如发现漏洞）
   - 启动保险池赔付
   - 联系安全团队

---

## 12. API 接口参考

### 基础信息

- Base URL: `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1`
- 所有请求需在 Header 中添加 `Content-Type: application/json`

### 用户管理 API

#### 获取用户列表

```
GET /api/v1/users
```

Query 参数：
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `search`: 钱包地址搜索
- `level`: 等级筛选

#### 同步用户（从链上）

```
POST /api/v1/users/sync
```

Body 参数：
- `wallet_address`: BSC钱包地址（必填，格式：0x + 40位十六进制）

#### 批量同步用户

```
POST /api/v1/users/sync/batch
```

Body 参数：
- `wallet_addresses`: BSC钱包地址数组（最多100个）

### 质押 API

#### 获取质押记录

```
GET /api/v1/dapp/stakes/:address
```

#### 创建质押

```
POST /api/v1/dapp/stakes
```

Body 参数：
- `wallet_address`: string - 钱包地址
- `amount`: string - 质押数量
- `period`: number - 质押周期（30/90/180/360）

### 节点 API

#### 获取卡牌列表

```
GET /api/v1/cards
```

#### 获取用户节点

```
GET /api/v1/dapp/nodes/:address
```

#### 购买节点

```
POST /api/v1/dapp/nodes
```

Body 参数：
- `wallet_address`: string - 钱包地址
- `card_type`: string - 卡牌类型（A/B/C）
- `amount`: string - 购买金额（USDT）

### 团队 API

#### 获取团队数据

```
GET /api/v1/dapp/team/:address
```

### 仪表盘 API

#### 获取统计数据

```
GET /api/v1/dashboard
```

---

## BSC区块链DAPP开发标准说明

### BSC简介

- **全称**：Binance Smart Chain（币安智能链）
- **兼容**：以太坊虚拟机（EVM）
- **地址格式**：以太坊格式（0x开头）

### 用户身份标识

在传统Web应用中，用户通过用户名/邮箱+密码登录。而在BSC区块链DAPP中：

1. **钱包地址作为用户ID**
   - 每个用户在BSC链上有一个唯一的钱包地址
   - 地址格式：以太坊格式（如 `0x7cH3JkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPq`）

2. **签名授权替代密码**
   - 用户通过钱包（如 MetaMask、Trust Wallet、BNB Wallet）进行签名授权
   - 无需注册，直接使用钱包交互

3. **数据存储策略**
   - **链上数据**：投资、奖励、质押等核心业务数据存储在智能合约中
   - **链下数据**：索引数据、缓存、用户偏好等可存储在数据库中
   - 管理后台从链上同步用户数据到本地数据库

### 典型用户流程

```
用户端DAPP (BSC)        管理后台            BSC区块链
      |                    |                   |
      |-- 1. 钱包连接 ---->|                   |
      |                    |-- 2. 同步用户 -->|
      |                    |<-- 用户信息 ----|
      |<-- 显示用户面板 --|                   |
      |                    |                   |
      |-- 3. 用户发起投资 ->                   |
      |                    |-- 记录交易 ------|
      |                    |                   |-- 4. 链上交易确认
      |<-- 5. 显示交易结果|                   |
```

### BSC链配置

- **Chain ID**: 56 (主网) / 97 (测试网)
- **RPC**: https://bsc-dataseed.binance.org/ (主网)
- **区块浏览器**: https://bscscan.com/

---

## 常见问题

### Q: BSC钱包地址格式是什么？

A: BSC使用以太坊格式地址，以 `0x` 开头，后面跟40位十六进制字符，共42位。

### Q: 为什么需要同步用户？

A: BSC区块链DAPP中，用户数据主要存储在链上合约中。管理后台需要同步这些数据以便进行管理和分析。

### Q: 如何确认钱包地址是否正确？

A: BSC钱包地址格式为 `0x` + 40位十六进制字符（0-9, a-f, A-F）。系统会进行格式校验。

### Q: 同步失败怎么办？

A: 检查钱包地址格式是否正确，或检查网络连接是否正常。

### Q: 如何部署智能合约？

A: 参考本文档第11节「智能合约部署」，按步骤进行部署和配置。

---

## 技术支持

如有问题，请联系技术支持团队。
