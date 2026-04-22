# DeepQuest (DQ) 智能合约系统文档

## 概述

DeepQuest 是一个基于 BSC (币安智能链) 的 DeFi 量化平台，核心机制包括：

- **SOL 进 SOL 出**：使用 BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF) 入金和出金
- **LP 质押分红**：50% 入金资金进入 LP 质押池，通过爆块机制分配分红
- **节点 NFT 系统**：购买节点 NFT 成为节点会员
- **合伙人白名单**：固定地址列表，收益平均分配
- **地址限制功能**：可限制某地址领取奖励
- **动态奖金机制**：直推、见点、管理奖等

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

### 2. 入金前置条件

| 阶段 | 条件 |
|------|------|
| **注册** | 推荐人必须是节点会员 |
| **首次入金** | 用户必须是节点会员 |
| **后续入金** | 只要在节点下面有关系链即可 |

### 3. 节点达标机制

| 卡牌 | 价格 | 达标线数要求 | 说明 |
|-----|------|------------|------|
| A | 500 BEP20 | **5条线** | 直接子节点中有5个以上用户入金 |
| B | 1500 BEP20 | **10条线** | 直接子节点中有10个以上用户入金 |
| C | 5000 BEP20 | **20条线** | 直接子节点中有20个以上用户入金 |

**奖励规则**：
- ✅ **达标**：可以领取节点NFT的分红
- ❌ **不达标**：只有节点资格，无法领取节点分红

### 4. LP 质押分币机制

**爆块机制**：
- 每天 23:00 爆块，释放 1.3% 的 DQ
- 80% 销毁至黑洞，每天递减 0.5%，最低 30%
- 剩余 20% DQ 分配：

| 分配对象 | 比例 |
|---------|------|
| LP 质押者 | 60% |
| 节点 NFT | 15% (需达标) |
| 基金会 | 5% |
| 合伙人 | 6% (白名单平均分配) |
| 团队奖励 | 14% |

### 5. 合伙人白名单机制 (新增)

> **合伙人收益由固定白名单地址平均分配**

**特点**：
- 由 Owner 添加固定地址列表
- 合伙人收益由白名单地址平均分配
- 合伙人需要满足投资和直推业绩要求

**白名单管理**：
```solidity
// 添加单个地址
function addPartnerWhiteList(address _partner) external onlyOwner

// 批量添加
function addPartnerWhiteListBatch(address[] calldata _partners) external onlyOwner

// 移除地址
function removePartnerWhiteList(address _partner) external onlyOwner
```

**合伙人要求**：
- 总投资 ≥ 5000 BEP20
- 直推业绩 ≥ 30000 BEP20 (前20席) / 50000 BEP20 (后30席)

### 6. 地址限制功能 (新增)

> **可以限制某个地址领取奖励，被限制的地址无法领取任何奖励**

**限制效果**：
- ❌ 无法领取 LP 分红
- ❌ 无法领取 NFT 分红
- ❌ 无法领取团队分红
- ❌ 无法领取合伙人分红
- ❌ 无法卖出 DQ
- ✅ 限制期间的动态奖金收益转入运营池

**管理函数**：
```solidity
// 限制单个地址
function restrictAddress(address _user) external onlyOwner

// 批量限制地址
function restrictAddressBatch(address[] calldata _users) external onlyOwner

// 解除限制
function unrestrictAddress(address _user) external onlyOwner
```

### 7. DQ 交易规则

- **只能卖出，不能买入**
- **卖出手续费**：6%
  - 50% 分给 LP 质押者
  - 50% 进入运营池
- **卖出即销毁**：DQ 通缩 99%

### 8. 单币质押

| 周期 | 手续费分红比例 |
|-----|--------------|
| 30 天 | 6% 手续费的 5% |
| 90 天 | 6% 手续费的 10% |
| 180 天 | 6% 手续费的 15% |
| 360 天 | 6% 手续费的 20% |

### 9. 动态奖金机制 (50% 入金)

| 奖金类型 | 比例 | 说明 |
|---------|------|------|
| 直推奖 | 30% | 直接推荐人获得 |
| 见点奖 | 15% | 1-15 层见点 |
| 管理奖 | 30% | 级差制，5%-30% |
| DAO 补贴 | 10% | 高级别补贴低级别 |
| 保险池 | 7% | 回购 DQ 并销毁 |
| 运营池 | 8% | 平台运营 |

### 10. 能量值系统

- **能量值** = 入金额 × 6
- 能量值为 0 或负数时，无法领取动态奖金
- 被限制地址的动态奖金收益转入运营池

## 合约地址

| 合约 | 地址 |
|------|------|
| BEP20 代币 (入金/出金) | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |
| 黑洞地址 | `0x000000000000000000000000000000000000dEaD` |

## 关键函数

### 合伙人白名单管理
```solidity
function addPartnerWhiteList(address _partner) external onlyOwner
function addPartnerWhiteListBatch(address[] calldata _partners) external onlyOwner
function removePartnerWhiteList(address _partner) external onlyOwner
function getPartnerWhiteList() external view returns (address[] memory)
function getPartnerCount() external view returns (uint256)
```

### 地址限制管理
```solidity
function restrictAddress(address _user) external onlyOwner
function restrictAddressBatch(address[] calldata _users) external onlyOwner
function unrestrictAddress(address _user) external onlyOwner
function isAddressRestricted(address _user) external view returns (bool)
```

### 查询函数
```solidity
function checkNodeQualified(address _user) external view returns (
    bool qualified,
    uint256 currentLines,
    uint256 requiredLines
)
function canDeposit(address _user) external view returns (bool)
```

## 事件列表

| 事件 | 说明 |
|------|------|
| Register | 用户注册 |
| BuyNode | 购买节点 |
| Deposit | 入金 |
| Withdraw | 出金 |
| LineQualified | 节点达标线数更新 |
| ClaimNft | 领取 NFT 分红 |
| ClaimPartner | 领取合伙人分红 |
| AddPartnerWhiteList | 添加合伙人白名单 |
| RemovePartnerWhiteList | 移除合伙人白名单 |
| RestrictAddress | 限制地址领取奖励 |
| UnrestrictAddress | 解除地址限制 |

## 编译信息

- **Solidity 版本**：0.8.17
- **编译成功**：是
- **EVM 版本**：London

## 合约更新日志

### v3.3 (当前版本)

#### 1. 合伙人白名单机制
- ✅ 合伙人由 Owner 添加固定地址列表
- ✅ 合伙人收益由白名单地址平均分配
- ✅ 支持批量添加/移除

#### 2. 地址限制功能
- ✅ 可限制某地址领取奖励
- ✅ 被限制地址无法领取任何奖励
- ✅ 收益转入运营池

### v3.2
- ✅ 节点达标条件：A卡牌5条线、B卡牌10条线、C卡牌20条线
- ✅ 入金规则调整：首次入金需是节点，后续只需在节点下有关系链

### v3.1
- ✅ 入金前置条件：用户必须先购买节点 NFT
- ✅ 入金账号必须在节点下面

### v3.0
- ✅ 初始版本

---

*最后更新：2024*
