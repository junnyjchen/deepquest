# DeepQuest (DQ) 智能合约系统文档

## 概述

DeepQuest 是一个基于 BSC (币安智能链) 的 DeFi 量化平台，核心机制包括：

- **SOL 进 SOL 出**：使用 BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF) 入金和出金
- **LP 质押分红**：50% 入金资金进入 LP 质押池，通过爆块机制分配分红
- **节点 NFT 系统**：必须先购买节点 NFT 才能参与入金
- **动态奖金机制**：直推、见点、管理奖、DAO 补贴等

## 合约架构

```
DQProject (主合约)
├── DQToken (ERC20) - DQ 代币，1000亿总量
└── DQCard (ERC721) - 节点 NFT 卡牌
```

## 核心机制

### 1. 入金制度 (SOL 进)

**入金上限 (前期控进)**：
- 1-10 天：每天 1000 个地址，每个地址 1 SOL
- 11-20 天：每天 1500 个地址，1-5 SOL
- 21-30 天：每天 2000 个地址，1-5 SOL
- 31 天后：1-5 SOL/地址，每 15 天增加 10 SOL，直至 200 SOL

**入金分配**：
- 50% 进入 **动态分币池**
- 50% 进入 **LP 质押池**

### 2. 入金前置条件 (重要)

> **两项关键变更**：
> 1. **基金会账号优先**：基金会钱包优先分配
> 2. **节点其次**：其他入金账号按节点顺序分配
> 3. **入金账号必须在节点下面**：用户的推荐人必须已购买节点

**具体逻辑**：
```
用户要入金，必须同时满足：
1. 用户自己已购买节点 NFT
2. 用户的推荐人已购买节点 NFT
```

**注册规则**：
- 新用户注册时，推荐人必须已购买节点
- 推荐人必须是已注册用户

**入金流程**：
```
1. 购买节点 NFT → 成为"节点会员"
2. 寻找已购买节点的上线推荐
3. 完成注册（推荐人也必须有节点）
4. 入金（双方都必须是节点会员）
```

### 3. LP 质押分币机制

**爆块机制**：
- 每天 23:00 爆块，释放 1.3% 的 DQ
- 80% 销毁至黑洞，每天递减 0.5%，最低 30%
- 剩余 20% DQ 分配：

| 分配对象 | 比例 |
|---------|------|
| LP 质押者 | 60% |
| 节点 NFT | 15% |
| 基金会 | 5% |
| 合伙人 | 6% |
| 团队奖励 | 14% |

**节点 NFT 权益**：

| 卡牌 | 价格 | 铸造上限 | 分币权重 | 赠送级别 | 提现手续费 |
|-----|------|---------|---------|---------|-----------|
| A | 500 BEP20 | 1000 张 | 4% | S1 | 10% |
| B | 1500 BEP20 | 500 张 | 5% | S2 | 15% |
| C | 5000 BEP20 | 100 张 | 6% | S3 | 15% |

### 4. DQ 交易规则

- **只能卖出，不能买入**
- **卖出手续费**：6%
  - 50% 分给 LP 质押者
  - 50% 进入运营池
- **卖出即销毁**：DQ 通缩 99%
- **销毁触发**：当 DQ 总量的 99% 被销毁后，停止销毁机制

### 5. 单币质押

**质押周期与分红**：

| 周期 | 手续费分红比例 |
|-----|--------------|
| 30 天 | 6% 手续费的 5% |
| 90 天 | 6% 手续费的 10% |
| 180 天 | 6% 手续费的 15% |
| 360 天 | 6% 手续费的 20% |

### 6. 动态奖金机制 (50% 入金)

**分配结构**：

| 奖金类型 | 比例 | 说明 |
|---------|------|------|
| 直推奖 | 30% | 直接推荐人获得 |
| 见点奖 | 15% | 1-15 层见点 |
| 管理奖 | 30% | 级差制，5%-30% |
| DAO 补贴 | 10% | 高级别补贴低级别 |
| 保险池 | 7% | 回购 DQ 并销毁 |
| 运营池 | 8% | 平台运营 |

**管理奖级别**：

| 级别 | 小区业绩要求 | 分红比例 |
|-----|-------------|---------|
| S1 | 100 SOL | 5% |
| S2 | 200 SOL | 10% |
| S3 | 600 SOL | 15% |
| S4 | 2000 SOL | 20% |
| S5 | 6000 SOL | 25% |
| S6 | 20000 SOL | 30% |

**团队 D1-D8 奖励**：

| 级别 | 有效地址要求 | 每人平均分币 |
|-----|-------------|-------------|
| D1 | 30 | 1.75% |
| D2 | 120 | 1.75% |
| D3 | 360 | 1.75% |
| D4 | 1000 | 1.75% |
| D5 | 4000 | 1.75% |
| D6 | 10000 | 1.75% |
| D7 | 15000 | 1.75% |
| D8 | 30000 | 1.75% |

### 7. 能量值系统

- **能量值** = 入金额 × 6
- 能量值为 0 或负数时，无法领取动态奖金
- 每次领取动态奖金时，扣除相应能量值
- 能量值不足时需要复投

### 8. 合伙人制度

- **总席位数**：50 席
- **前 20 席**：5000 SOL + 30000 SOL 直推业绩
- **后 30 席**：5000 SOL + 50000 SOL 直推业绩

### 9. LP 移除规则

| 质押时长 | 手续费 |
|---------|-------|
| 60 天内 | 20% |
| 61-180 天 | 10% |
| 181 天后 | 0% |

## 合约地址

| 合约 | 地址 |
|------|------|
| BEP20 代币 (入金/出金) | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |
| 黑洞地址 | `0x000000000000000000000000000000000000dEaD` |

## 关键函数

### 注册 (必须通过有节点的上线)
```solidity
function register(address _referrer) external
// _referrer: 推荐人地址（推荐人必须已购买节点）
```

### 购买节点
```solidity
function buyNode(uint256 _type) external
// _type: 1=A卡牌, 2=B卡牌, 3=C卡牌
// 购买后 hasNode = true
```

### 入金 (需要自己+推荐人都已购买节点)
```solidity
function deposit(uint256 _amount) external
// _amount: BEP20 代币数量 (最小 1)
// 前置条件：msg.sender.hasNode = true && referrer.hasNode = true
```

### 出金 (DQ 换 BEP20)
```solidity
function withdrawDQ(uint256 _dqAmount, uint256 _minOut) external
// _dqAmount: 要卖出的 DQ 数量
// _minOut: 最小接收的 BEP20 数量 (防滑点)
```

### 爆块 (每日执行)
```solidity
function blockMining() external
```

### 单币质押
```solidity
function stakeSingle(uint256 _amount, uint _periodIndex) external
// _periodIndex: 0=30天, 1=90天, 2=180天, 3=360天

function unstakeSingle(uint256 _periodIndex) external
```

### 领取分红
```solidity
function claimLP() external          // LP 质押分红
function claimNft() external         // NFT 分红
function claimDTeam() external       // D 级团队分红
function claimPartner() external     // 合伙人分红
```

### 查询函数
```solidity
function getUser(address _user) external view returns (...)
// 返回: referrer, directCount, level, dLevel, totalInvest, teamInvest, energy, directSales, hasNode

function canDeposit(address _user) external view returns (bool)
// 检查用户是否可以入金
```

### 管理员函数
```solidity
function setPrice(uint256 _newPrice) external onlyOwner
function setFoundationWallet(address _wallet) external onlyOwner
function adminWithdrawBEP20(uint256 amount) external onlyOwner
```

## 事件列表

| 事件 | 说明 |
|------|------|
| Register | 用户注册 |
| BuyNode | 购买节点 |
| Deposit | 入金 |
| Withdraw | 出金 |
| StakeSingle | 单币质押 |
| UnstakeSingle | 解除质押 |
| BlockMining | 爆块 |
| ClaimLP | 领取 LP 分红 |
| ClaimNft | 领取 NFT 分红 |
| ClaimDTeam | 领取团队分红 |
| ClaimPartner | 领取合伙人分红 |
| LevelUp | 级别晋升 |
| DLevelUp | D 级晋升 |

## 编译信息

- **Solidity 版本**：0.8.17
- **编译成功**：是
- **EVM 版本**：London
- **优化器**：启用，200 次运行

## 合约更新日志

### v3.1 (当前版本)
- ✅ 入金前置条件：用户必须先购买节点 NFT
- ✅ 入金账号必须在节点下面：推荐人必须已购买节点

### v3.0
- ✅ 初始版本
- ✅ 基础入金/出金
- ✅ LP 质押
- ✅ NFT 节点系统
- ✅ 动态奖金

---

*最后更新：2024*
