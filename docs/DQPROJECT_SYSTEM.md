# DQProject 智能合约制度需求文档

> 版本：v4.0（精简版）
> 最后更新：2024年
> 区块链：BSC (Binance Smart Chain)
> Solidity版本：^0.8.17

---

## 一、核心机制概述

DQProject 是一个基于 BSC 链的 DeFi 智能合约项目，包含以下核心功能：

| 模块 | 说明 |
|------|------|
| SOL进SOL出 | 用户使用 BNB 充值，通过合约兑换 |
| LP质押分红 | 50%入金进入LP池，按权重分红 |
| 节点NFT系统 | A/B/C三种卡牌，不同权益 |
| 动态奖金 | 直推、见点、管理奖、DAO等 |
| 单币质押 | DQ代币锁仓获取分红 |
| 地址限制 | 管理员可限制地址领取奖励 |

---

## 二、入金机制

### 2.1 SOL进SOL出

```
入金范围：1 SOL - 200 SOL
```

| 阶段 | 时间 | 单地址每日上限 |
|------|------|----------------|
| 第一阶段 | 1-10天 | 10 SOL |
| 第二阶段 | 11-20天 | 20 SOL |
| 第三阶段 | 21-30天 | 30 SOL |
| 第四阶段 | 31天+ | 每月增加5 SOL，最高200 SOL |

### 2.2 入金分成

用户每笔入金金额分配：

```
┌─────────────────────────────────────┐
│            100% 入金金额             │
├─────────────────┬───────────────────┤
│   50% 动态分币  │     50% LP质押     │
└─────────────────┴───────────────────┘
```

### 2.3 入金前置条件

| 条件类型 | 要求 |
|----------|------|
| **首次入金** | 用户必须是节点（A/B/C卡） |
| **后续入金** | 用户必须在节点关系链下（不要求直推是节点） |
| **注册** | 推荐人必须是节点 |

```
关系链验证：
用户A(节点) → 用户B(节点) → 用户C(新用户)
                              ↓
                       C可以注册（B是节点）
                       C首次入金需要自己是节点
                       C后续入金只需在节点关系链下
```

---

## 三、LP质押分币机制

### 3.1 代币分配

| 池子 | 分配比例 | 说明 |
|------|----------|------|
| LP质押池 | 60% | 按LP份额分配 |
| 节点NFT池 | 15% | 按卡牌类型分配 |
| 基金会 | 5% | 归属合约所有者 |
| 合伙人池 | 6% | 50席合伙人平分 |
| 团队奖励池 | 14% | D1-D8按级别分配 |

### 3.2 爆块机制

```
触发条件：每天至少执行一次
释放比例：1.3% (每日)
```

**销毁规则**：
- 爆块产出 DQ 代币的 80% 立即销毁
- 销毁比例每日递减 0.5%（80% → 79.5% → 79%...）
- 最低销毁比例：30%（不再递减）

### 3.3 LP质押规则

| 项目 | 说明 |
|------|------|
| 最小质押 | 无限制 |
| 收益计算 | 按LP份额占比分配 |
| 收益领取 | 随时可领 |

**LP份额计算**：
- 每笔入金的 50% 进入 LP 池
- 购买节点金额的 60% 进入 LP 池
- LP份额 = 用户累计 LP 投入 / 总 LP 份额

---

## 四、节点NFT系统

### 4.1 卡牌类型

| 卡牌 | 价格 | 数量上限 | 达标线要求 | 自身等级 |
|------|------|----------|------------|----------|
| A卡 | 500 BNB | 1000张 | 5条线 | S1 |
| B卡 | 1000 BNB | 500张 | 10条线 | S2 |
| C卡 | 3000 BNB | 100张 | 20条线 | S3 |

### 4.2 达标线计算

**达标线定义**：直接下级中有入金记录的用户数 = 1条达标线

```
示例：
用户A（B卡持有者，有10条达标线要求）

下级结构：
├── 用户B（已入金）→ 1条线 ✓
├── 用户C（未入金）→ 0条线 ✗
├── 用户D（已入金）→ 1条线 ✓
│   └── 用户E（已入金）→ 不计入A的达标线（只计算直接下级）
├── 用户F（已入金）→ 1条线 ✓
└── 用户G（已入金）→ 1条线 ✓

用户A当前达标线：4条
达标状态：未达标（4 < 10）
```

### 4.3 节点权益

| 权益 | A卡 | B卡 | C卡 |
|------|-----|-----|-----|
| 节点NFT分红权重 | 4% | 5% | 6% |
| 提现手续费分红 | 10% | 15% | 15% |
| 自身等级 | S1 | S2 | S3 |
| 达标要求 | 5条线 | 10条线 | 20条线 |

### 4.4 节点达标检查

**领取NFT分红条件**：

```solidity
function claimNft() external {
    // 1. 检查地址是否被限制
    require(!restrictedAddresses[msg.sender], "address restricted");

    // 2. 检查节点是否达标
    uint256 required = getRequiredQualifiedLines(msg.sender);
    uint256 current = getQualifiedLines(msg.sender);
    require(current >= required, "node not qualified");

    // 3. 计算并发放分红
    // ...
}
```

---

## 五、动态奖金机制

### 5.1 分配比例（50%动态部分 = 100%）

| 奖金类型 | 比例 | 说明 |
|----------|------|------|
| 直推奖 | 30% | 直接推荐人获得 |
| 见点奖 | 15% | 向上1-15层按规则分配 |
| 管理奖 | 30% | 级差制，按团队业绩晋升 |
| DAO组织补贴 | 10% | 满足条件的管理者获得 |
| 保险池 | 7% | 回购DQ并销毁 |
| 运营池 | 8% | 合约运营费用 |

### 5.2 直推奖

```
用户A入金100 SOL
推荐人B获得：100 × 50% × 30% = 15 SOL
```

### 5.3 见点奖

**规则**：根据推荐人数确定最大层数

| 直推人数 | 最大见点层数 |
|----------|--------------|
| 1人 | 3层 |
| 2人 | 6层 |
| 3人 | 9层 |
| 4人 | 12层 |
| 5人+ | 15层 |

**示例**（5人直推，最大15层）：
- 每层获得：入金额 × 50% × 15% / 15 = 入金额 × 0.5%
- 每层分配给该层内所有符合条件的用户

### 5.4 管理奖（级差制）

**晋升条件**：

| 等级 | 小区业绩要求 | 分红比例 |
|------|-------------|----------|
| S1 | 100 SOL | 5% |
| S2 | 200 SOL | 10% |
| S3 | 600 SOL | 15% |
| S4 | 2000 SOL | 20% |
| S5 | 6000 SOL | 25% |
| S6 | 20000 SOL | 30% |

**计算规则**：
- 去除最大区，其他小区业绩累计
- 差额分配（例：S1→S2，差额5%）

### 5.5 能量值系统

```
能量值 = 入金额 × 3
```

| 规则 | 说明 |
|------|------|
| 获得 | 每次入金增加能量值 |
| 消耗 | 领取动态奖金时扣除 |
| 限制 | 能量值不足时无法领取动态奖金 |
| 复投 | 能量值耗尽需复投才可继续领取 |

---

## 六、单币质押

### 6.1 质押周期

| 周期 | 分红比例 | 说明 |
|------|----------|------|
| 30天 | 5% | 短期质押 |
| 90天 | 10% | 中期质押 |
| 180天 | 15% | 长期质押 |
| 360天 | 20% | 超长期质押 |

### 6.2 质押分红来源

```
DQ卖出手续费（6%）的分配：
├── 50% → 单币质押池
│   ├── 30天质押者：5%
│   ├── 90天质押者：10%
│   ├── 180天质押者：15%
│   └── 360天质押者：20%
└── 50% → 运营池
```

### 6.3 赎回规则

- 锁定期满后随时可赎回
- 赎回时同时领取分红

---

## 七、合伙人机制

### 7.1 合伙人池

```
合伙人数量：50席
分配方式：平均分配
```

### 7.2 合伙人准入条件

| 席位数 | 直推业绩要求 | 自身投资要求 |
|--------|-------------|-------------|
| 前20席 | 30000 SOL | 5000 SOL |
| 后30席 | 50000 SOL | 5000 SOL |

### 7.3 合伙人权益

| 权益 | 比例 |
|------|------|
| DQ代币分红 | 6% 中的平均分配 |
| BNB分红（来自提现手续费） | 30% 中的平均分配 |

---

## 八、团队奖励（D1-D8）

### 8.1 晋升条件

| 等级 | 有效用户数 | 说明 |
|------|-----------|------|
| D1 | 30人 | 初级 |
| D2 | 120人 | |
| D3 | 360人 | |
| D4 | 1000人 | |
| D5 | 4000人 | |
| D6 | 10000人 | |
| D7 | 15000人 | |
| D8 | 30000人 | 最高级 |

**有效用户**：下级中有入金记录的用户

### 8.2 分配规则

```
每日团队奖励池（14%的一部分）
├── 每级平均分配：14% / 8 = 1.75%
└── 同级内按人数平均
```

---

## 九、地址限制功能

### 9.1 功能说明

管理员可以限制特定地址领取任何奖励。

### 9.2 影响范围

被限制的地址无法：

| 功能 | 状态 |
|------|------|
| 领取直推奖 | ❌ 被限制 |
| 领取见点奖 | ❌ 被限制 |
| 领取管理奖 | ❌ 被限制 |
| 领取DAO补贴 | ❌ 被限制 |
| 领取NFT分红 | ❌ 被限制 |
| 领取LP分红 | ❌ 被限制 |
| 领取合伙人分红 | ❌ 被限制 |
| 领取团队奖励 | ❌ 被限制 |
| 提现奖励 | ❌ 被限制 |
| 正常入金 | ✅ 允许 |
| 注册推荐 | ✅ 允许 |

### 9.3 管理函数

```solidity
// 限制地址
function restrictAddress(address _addr) external onlyOwner {
    restrictedAddresses[_addr] = true;
}

// 解除限制
function unrestrictAddress(address _addr) external onlyOwner {
    restrictedAddresses[_addr] = false;
}

// 查询限制状态
function isRestricted(address _addr) external view returns (bool) {
    return restrictedAddresses[_addr];
}
```

---

## 十、DQ代币经济模型

### 10.1 代币信息

| 项目 | 值 |
|------|-----|
| 代币名称 | DQ Token |
| 符号 | DQ |
| 总供应量 | 1000亿 (100,000,000,000) |
| 精度 | 18 |

### 10.2 DQ交易规则

| 规则 | 说明 |
|------|------|
| 只能卖出 | DQ只能卖出，不能买入 |
| 卖出手续费 | 6% |
| 卖出即销毁 | 卖出后代币直接销毁 |
| 价格机制 | 与BNB池动态定价 |

### 10.3 LP移除规则

| 锁定期 | 手续费 |
|--------|--------|
| 60天内 | 20% |
| 61-180天 | 10% |
| 181天后 | 0% |

---

## 十一、合约地址配置

### 11.1 BSC主网配置

| 项目 | 地址 |
|------|------|
| BNB代币(WBNB) | 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c |
| BEP20代币 | 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF |
| PancakeSwap Router | 0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6 |
| 基金会钱包 | 部署时指定 |

### 11.2 链配置

```
ChainId: 56 (BSC Mainnet)
```

---

## 十二、核心查询函数

### 12.1 用户信息

```solidity
function getUser(address _user) external view returns (
    address referrer,
    uint256 directCount,
    uint8 level,
    uint256 totalInvest,
    uint256 teamInvest,
    uint256 energy,
    uint256 lpShares,
    uint256 pendingRewards,
    uint8 dLevel
);
```

### 12.2 节点信息

```solidity
function getNodeInfo(address _user) external view returns (
    uint256 cardType,      // 最高卡牌类型 (0=无, 1=A, 2=B, 3=C)
    uint256 cardCount,     // 卡牌数量
    uint256 qualifiedLines, // 当前达标线
    uint256 requiredLines,  // 要求达标线
    bool isQualified        // 是否达标
);
```

### 12.3 其他查询

```solidity
// 查询地址是否被限制
function isRestricted(address _addr) external view returns (bool);

// 查询合伙人信息
function isPartner(address _addr) external view returns (bool);

// 查询当前最大入金限额
function getCurrentMaxInvest() external view returns (uint256);

// 查询质押信息
function getStakeInfo(address _user) external view returns (
    uint256[] memory amounts,
    uint256[] memory pendingRewards
);
```

---

## 十三、管理员函数

```solidity
// 基础管理
onlyOwner
├── addInitialNode(address _user, address _referrer, uint8 _cardType)
├── addInitialNodes(address[] calldata _users, uint8[] calldata _cardTypes)
├── addPartner(address _addr)
├── removePartner(address _addr)
├── restrictAddress(address _addr)
├── unrestrictAddress(address _addr)
├── setPrice(uint256 _newPrice)

// 提现管理
├── adminWithdrawBNB(uint256 amount)
├── adminWithdrawDQ(uint256 amount)
├── adminWithdrawBEP20(uint256 amount)
├── adminWithdrawToken(address token, uint256 amount)

// 爆块操作（任何人可调用）
├── blockMining()
```

---

## 十四、事件列表

| 事件 | 说明 |
|------|------|
| Register | 用户注册 |
| Deposit | 用户入金 |
| LevelUp | 等级晋升（S1-S6） |
| DLevelUp | 团队等级晋升（D1-D8） |
| ReferralReward | 直推奖励发放 |
| NodeReward | 见点奖励发放 |
| ManagementReward | 管理奖励发放 |
| DaoReward | DAO奖励发放 |
| Withdraw | 用户提现 |
| BuyNode | 购买节点 |
| ClaimLp | 领取LP分红 |
| ClaimNft | 领取NFT分红 |
| ClaimDTeam | 领取团队奖励 |
| ClaimPartnerDQ | 领取合伙人DQ分红 |
| ClaimPartnerBNB | 领取合伙人BNB分红 |
| ClaimFee | 领取手续费分红 |
| StakeDQ | 质押DQ |
| UnstakeDQ | 赎回DQ |
| BlockMining | 爆块执行 |
| PartnerAdded | 合伙人添加 |

---

## 十五、部署流程

### 15.1 部署前准备

1. 准备 BNB 用于部署 gas
2. 准备 BEP20 代币用于初始流动性
3. 配置 .env 文件

```bash
# .env 配置示例
PRIVATE_KEY=你的私钥
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

### 15.2 部署命令

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network bsc
```

### 15.3 部署后配置

1. **添加初始节点**
```javascript
await contract.addInitialNodes(users, cardTypes);
```

2. **配置合伙人**（如有）
```javascript
await contract.addPartner(partnerAddress);
```

3. **首次爆块**
```javascript
await contract.blockMining();
```

---

## 十六、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | - | 基础框架搭建 |
| v2.0 | - | 添加LP质押机制 |
| v3.0 | - | 添加节点NFT系统 |
| v3.1 | - | 入金前置条件（需节点） |
| v3.2 | - | 节点达标机制（5/10/20条线） |
| v3.3 | - | 合伙人白名单+地址限制 |
| v4.0 | - | 精简版合约，优化代码结构 |

---

## 附录A：智能合约接口

### A.1 核心合约

| 合约 | 说明 |
|------|------|
| DQToken | DQ代币合约（ERC20） |
| DQCard | 节点NFT合约（ERC721） |
| DQProject | 主合约 |

### A.2 合约文件

```
contracts/
├── src/
│   ├── DQToken.sol          # 代币合约
│   ├── DQCard.sol           # NFT合约
│   ├── DQProject.sol        # 主合约（完整版）
│   └── DQProjectSimplified.sol  # 主合约（精简版）
└── abi.ts                   # ABI定义
```

---

## 附录B：数据库表结构

### B.1 核心表

| 表名 | 说明 |
|------|------|
| users | 用户信息 |
| deposits | 入金记录 |
| withdrawals | 提现记录 |
| partners | 合伙人列表 |
| cards | 节点卡牌记录 |
| admin_users | 管理员账户 |
| address_restrictions | 地址限制记录 |
| block_logs | 爆块日志 |

### B.2 用户表结构

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    address VARCHAR(64) UNIQUE NOT NULL,
    referrer VARCHAR(64),
    direct_count INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    total_invest DECIMAL(36,0) DEFAULT 0,
    team_invest DECIMAL(36,0) DEFAULT 0,
    energy DECIMAL(36,0) DEFAULT 0,
    lp_shares DECIMAL(36,0) DEFAULT 0,
    d_level INTEGER DEFAULT 0,
    highest_card_type INTEGER DEFAULT 0,
    is_node_qualified BOOLEAN DEFAULT false,
    qualified_lines INTEGER DEFAULT 0,
    is_restricted BOOLEAN DEFAULT false,
    is_partner BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

*文档结束*
