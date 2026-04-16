# DQProject 智能合约教程

## 概述

DQProject 是一个基于 **Solana 生态系统**的 DeFi 量化平台智能合约。合约实现了代币兑换、质押分红、节点购买等功能。

---

## 链配置

| 配置项 | 值 |
|--------|-----|
| **公链** | Solana (通过 Wormhole 跨链桥与 EVM 兼容) |
| **代币标准** | SPL Token (Solana) / ERC20 (EVM 映射) |
| **DEX** | Raydium V2 |
| **跨链桥** | Wormhole |

---

## 代币信息

| 属性 | 值 |
|------|-----|
| **代币名称** | DQ (DeepQuest Token) |
| **代币总量** | 1,000,000,000,000 (1000亿) DQ |
| **入金代币** | wSOL (Wrapped SOL) |
| **出金代币** | wSOL (通过 Raydium DEX 兑换) |
| **价格锚定** | 1 DQ = 1 wSOL (可调) |

---

## 核心地址

### Solana 生态

| 合约/程序 | Solana 地址 |
|-----------|-------------|
| **wSOL** | `So111n112n111mcAAm2iGkKK1m1ZLiC9GByGG3KQYK3J9` |
| **Raydium V2 AMM** | (待配置) |
| **Wormhole Core** | (待配置) |

### EVM 映射地址 (BSC)

| 合约/程序 | BSC 地址 |
|-----------|----------|
| **wSOL (跨链映射)** | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |

---

## 核心功能

### 1. 代币兑换

#### 入金: wSOL → DQ

```
用户 ──wSOL──▶ 合约
                │
                ├── 30% ──▶ LP 质押池
                │
                └── 70% ──▶ 运营池
                           │
                           └── 铸造 DQ ──▶ 用户
```

**合约调用:**
```javascript
// 调用合约存入 wSOL，获得 DQ
await contract.swapWSOLForDQ({ value: amount });
```

**参数:**
- `amount`: wSOL 数量 (以 wei 为单位)

**返回:**
- 用户获得 `amount / dqPrice` 数量的 DQ

---

#### 出金: DQ → wSOL (通过 Raydium DEX)

```
用户 ──DQ──▶ 合约
              │
              └── 通过 Raydium DEX 兑换 wSOL
                           │
                           ├── 6% 手续费
                           │       ├── 50% ──▶ 质押分红池 (DQ)
                           │       └── 50% ──▶ 运营池
                           │
                           └── (100% - 6%) ──▶ 用户
```

**合约调用:**
```javascript
// 调用合约销毁 DQ，获得 wSOL
await contract.swapDQForWSOL(dqAmount, minOut);
```

**参数:**
- `dqAmount`: 要兑换的 DQ 数量
- `minOut`: 最小预期收到的 wSOL 数量 (防止滑点)

**返回:**
- 用户收到 `dqAmount * dqPrice * 94%` 的 wSOL

---

### 2. 质押分红

用户质押 DQ 代币，根据锁仓周期获得分红收益。

#### 质押周期

| 周期 | 年化收益率 |
|------|-----------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

#### 合约调用

**质押 DQ:**
```javascript
// stakeDQ(amount, periodIndex)
// periodIndex: 0=30天, 1=90天, 2=180天, 3=360天
await contract.stakeDQ(amount, 0);
```

**提取 DQ:**
```javascript
// unstakeDQ(periodIndex)
await contract.unstakeDQ(0);
```

**领取分红:**
```javascript
// 分红自动结算到用户钱包 (以 DQ 形式)
```

---

### 3. 节点购买

使用 wSOL 购买 NFT 节点卡牌。

#### 卡牌类型

| 卡牌 | 价格 | 资金分配 |
|------|------|----------|
| **A 级** | 500 wSOL | LP 60% / NFT 15% / 运营 25% |
| **B 级** | 1000 wSOL | LP 60% / NFT 15% / 运营 25% |
| **C 级** | 3000 wSOL | LP 60% / NFT 15% / 运营 25% |

#### 合约调用

```javascript
// buyNode(cardType) - cardType: 1=A, 2=B, 3=C
await contract.buyNode(1, { value: 500 ether });
```

---

### 4. 合伙人机制

满足以下条件可成为合伙人:

| 条件 | 要求 |
|------|------|
| **投资额** | ≥ 5000 wSOL |
| **直推销售额 (前20名)** | ≥ 30000 wSOL |
| **直推销售额 (20名后)** | ≥ 50000 wSOL |

**合伙人福利:**
- 分享动态收益的 30%
- 分享节点手续费的 30%

---

## 爆块机制

每 24 小时执行一次爆块，分发 DQ 代币奖励:

| 分配 | 比例 |
|------|------|
| LP 质押池 | 60% |
| NFT 分红池 | 15% |
| 基金会 | 5% |
| 团队 | 14% |
| 合伙人 | 6% |

**合约调用:**
```javascript
await contract.blockMining();
```

---

## 跨链交互流程

### Solana → BSC (入金)

```
1. 用户在 Solana 存入 wSOL
2. 通过 Wormhole 跨链桥锁定 wSOL
3. Wormhole 在 BSC 上铸造等量的映射代币
4. 用户将映射代币转入 DQProject 合约
5. 合约铸造 DQ 给用户
```

### BSC → Solana (出金)

```
1. 用户调用 swapDQForWSOL() 销毁 DQ
2. 合约通过 Wormhole 发送 DQ 到 Solana
3. Raydium DEX 执行 DQ → wSOL 兑换
4. Wormhole 将 wSOL 跨链回 BSC
5. 合约将 wSOL 转给用户
```

---

## 管理员功能

```javascript
// 设置 DQ 价格
await contract.setPrice(1 ether); // 1 DQ = 1 wSOL

// 设置 Raydium Router
await contract.setRaydiumRouter(routerAddress);

// 设置 Wormhole 跨链桥
await contract.setWormholeBridge(bridgeAddress);

// 提取合约余额
await contract.adminWithdrawWSOL(amount);
await contract.adminWithdrawDQ(amount);
```

---

## 事件列表

| 事件 | 说明 |
|------|------|
| `SwapWSOLForDQ` | wSOL 兑换 DQ (入金) |
| `SwapDQForWSOL` | DQ 兑换 wSOL (出金) |
| `PriceUpdated` | 价格更新 |
| `StakeDQ` | DQ 质押 |
| `UnstakeDQ` | DQ 提取 |
| `BuyNode` | 购买节点 |
| `ClaimLp` | 领取 LP 分红 |
| `ClaimNft` | 领取 NFT 分红 |
| `ClaimDTeam` | 领取团队分红 |
| `PartnerAdded` | 合伙人加入 |

---

## 部署注意事项

1. **跨链桥配置**: 需要先部署并配置 Wormhole 跨链桥
2. **DEX 流动性**: 需要在 Raydium 上添加 DQ/wSOL 交易对
3. **初始流动性**: 建议初始注入 LP 流动性
4. **价格调整**: 管理员可根据市场情况调整 DQ 价格

---

## 安全建议

1. **跨链安全**: Wormhole 跨链需验证签名
2. **滑点保护**: 出金时设置合理的 `minOut`
3. **流动性**: 确保合约有足够的 wSOL 余额支撑出金
4. **权限控制**: 管理员地址使用多签钱包
