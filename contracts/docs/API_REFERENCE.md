# DeepQuest DeFi - API 参考手册

## 目录
1. [初始化](#1-初始化)
2. [用户操作](#2-用户操作)
3. [交易操作](#3-交易操作)
4. [质押操作](#4-质押操作)
5. [节点操作](#5-节点操作)
6. [分红操作](#6-分红操作)
7. [管理员操作](#7-管理员操作)

---

## 1. 初始化

### initialize

初始化合约全局状态。

**权限**: 仅管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| dq_price | u64 | DQ 价格 (lamports per DQ) |

**示例**: `initialize(1_000_000_000)` 设置 1 DQ = 1 SOL

**PDA 账户**:
- `global_state`: 全局配置
- `lp_pool`: LP 质押池
- `nft_pool`: NFT 分红池
- `team_pool`: 团队池
- `partner_pool`: 合伙人池
- `dq_mint`: DQ 代币铸造
- `sol_vault`: SOL 金库
- `nft_mint_{a,b,c}`: 三种 NFT 铸造

---

## 2. 用户操作

### register

注册新用户。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| referrer | Pubkey | 推荐人地址 (可选) |

**效果**:
- 创建用户账户
- 更新推荐关系
- 初始化用户状态

**状态变更**:
```rust
user.referrer = referrer;
user.created_at = now;
user.level = 0;
user.total_invest = 0;
```

### pause

暂停合约所有操作。

**权限**: 管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| reason | String | 暂停原因 |

**效果**:
- 设置 `emergency_pause = true`
- 阻止所有交易操作
- 设置 `freeze_until` 时间

### unpause

恢复合约。

**权限**: 管理员

**参数**: 无

**效果**:
- 设置 `emergency_pause = false`
- 清除 `freeze_until`

---

## 3. 交易操作

### swap_sol_for_dq

用 SOL 兑换 DQ。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| amount | u64 | SOL 数量 (lamports) |

**前置条件**:
- 用户 SOL 余额 >= amount
- 全局状态未暂停
- amount >= MIN_INVEST_AMOUNT (1 SOL)

**资金分配**:
- 30% → LP 池
- 70% → DQ 铸造

**状态变更**:
```rust
user.total_invest += amount;
user.energy += amount * 3;
user.direct_sales += amount;
state.circulating_supply += dq_amount;
lp_pool.total_shares += lp_share;
```

### swap_dq_for_sol

用 DQ 兑换 SOL。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| dq_amount | u64 | DQ 数量 (最小单位) |
| min_out | u64 | 最小输出 SOL (lamports) |

**前置条件**:
- 用户 DQ 余额 >= dq_amount
- 金库 SOL 余额 >= 输出金额
- 全局状态未暂停

**费用**: 6% (SWAP_FEE_RATE)

**状态变更**:
```rust
state.circulating_supply -= dq_amount;
// 手续费分配:
// - 50% → LP 池
// - 50% → 运营
```

---

## 4. 质押操作

### stake_dq

质押 DQ 代币。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| amount | u64 | 质押数量 |
| period_index | u8 | 质押周期 (0-3) |

**周期索引**:
| 值 | 周期 | 年化收益率 |
|----|------|-----------|
| 0 | 30天 | 5% |
| 1 | 90天 | 10% |
| 2 | 180天 | 15% |
| 3 | 360天 | 20% |

**前置条件**:
- 用户 DQ 余额 >= amount
- amount >= MIN_STAKE_AMOUNT (1 DQ)
- 全局状态未暂停

**状态变更**:
```rust
stake.amount_{period} += amount;
stake.total_staked_{period} += amount;
stake.reward_debt_{period} = stake.amount * lp_pool.acc_per_share;
lp_pool.total_staked += amount;
```

### unstake_dq

解除质押并领取奖励。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| period_index | u8 | 质押周期 (0-3) |

**前置条件**:
- 该周期有质押余额
- 全局状态未暂停

**效果**:
- 归还质押本金
- 领取应计奖励
- 清零该周期质押

### claim_stake_reward

仅领取质押奖励，不解除质押。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| period_index | u8 | 质押周期 (0-3) |

**前置条件**:
- 该周期有质押余额
- 有可领取奖励

**奖励计算**:
```
pending = stake_amount * lp_pool.acc_per_share - stake.reward_debt
```

---

## 5. 节点操作

### buy_node

购买节点 NFT 卡牌。

**权限**: 公开

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| card_type | u8 | 卡牌类型 (1=A, 2=B, 3=C) |

**卡牌规格**:
| 类型 | 价格 | 权重 |
|------|------|------|
| A | 500 SOL | 4 |
| B | 1000 SOL | 5 |
| C | 3000 SOL | 6 |

**资金分配**:
| 用途 | 比例 |
|------|------|
| LP 质押池 | 60% |
| NFT 分红池 | 15% |
| 运营基金 | 25% |

**效果**:
- 铸造对应类型 NFT
- 更新用户等级
- 更新各池状态

---

## 6. 分红操作

### block_mining

爆块分红 - 分发生态奖励。

**权限**: 管理员

**参数**: 无

**前置条件**:
- 距上次爆块 >= 24小时
- 合约未暂停

**释放机制**:
- 每日释放量 = 流通量 × 1.3%
- 燃烧率从 80% 递减至 30%

**分配比例**:
| 池 | 比例 |
|----|------|
| LP 质押池 | 60% |
| NFT 分红池 | 15% |
| 基金会 | 5% |
| 团队池 | 14% |
| 合伙人池 | 6% |

### claim_lp_reward

领取 LP 质押分红。

**权限**: 公开

**参数**: 无

**奖励计算**:
```rust
pending = user.lp_shares * lp_pool.acc_per_share - user.lp_reward_debt
```

### claim_referral_reward

领取推荐奖励。

**权限**: 公开

**参数**: 无

**前置条件**:
- 有待领取奖励
- 能量充足

### claim_partner_reward

领取合伙人奖励。

**权限**: 合伙人

**参数**: 无

---

## 7. 管理员操作

### set_price

设置 DQ 代币价格。

**权限**: 管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| new_price | u64 | 新价格 (lamports/DQ) |

**范围**: 1 - 10,000,000,000 lamports

### set_raydium_router

设置 Raydium Router 地址。

**权限**: 管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| router | Pubkey | Raydium Router 地址 |

### admin_withdraw_sol

管理员提取 SOL。

**权限**: 管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| amount | u64 | 提取数量 (lamports) |

### admin_mint_dq

管理员铸造 DQ。

**权限**: 管理员

**参数**:
| 名称 | 类型 | 描述 |
|------|------|------|
| to | Pubkey | 目标地址 |
| amount | u64 | 铸造数量 |

---

## 错误代码

| 代码 | 名称 | 描述 |
|------|------|------|
| 0 | Unauthorized | 未授权操作 |
| 1 | Paused | 合约已暂停 |
| 2 | InvalidAmount | 无效金额 |
| 3 | AmountBelowMin | 低于最小金额 |
| 4 | InsufficientBalance | 余额不足 |
| 5 | AlreadyClaimed | 已领取 |
| 6 | NoStakeFound | 无质押记录 |
| 7 | StakeLocked | 质押已锁定 |
| 8 | MaxSupplyExceeded | 超过最大供应 |
| 9 | InvalidPrice | 无效价格 |
| 10 | InvalidPeriod | 无效周期 |
| 11 | InvalidCardType | 无效卡牌类型 |
| 12 | SlippageExceeded | 滑点超限 |

---

## 事件日志

### InitializeEvent
```json
{
  "admin": "Pubkey",
  "dq_price": 1000000000,
  "timestamp": 1699999999
}
```

### SwapSolForDQEvent
```json
{
  "user": "Pubkey",
  "sol_amount": 1000000000,
  "dq_amount": 1000000000,
  "lp_share": 300000000,
  "price": 1000000000,
  "timestamp": 1699999999
}
```

### StakeDQEvent
```json
{
  "user": "Pubkey",
  "amount": 100000000000,
  "period_index": 0,
  "timestamp": 1699999999
}
```

### BuyNodeEvent
```json
{
  "user": "Pubkey",
  "card_type": 1,
  "price": 500000000000,
  "card_index": 1,
  "timestamp": 1699999999
}
```

### BlockMiningEvent
```json
{
  "release": 13000000000,
  "burn": 10400000000,
  "remaining": 2600000000,
  "timestamp": 1699999999
}
```
