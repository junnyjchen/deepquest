# DQ 质押奖励系统 V2 - 合约说明

## 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                         DQT Token (1000亿)                        │
│                            ↓ 全部进底池                           │
├─────────────────────────────────────────────────────────────────┤
│                          底池 (Pair)                              │
│                    1000亿 DQ + BNB 流动性                         │
│                            ↓                                      │
│                   每日释放 1.3% (爆块)                             │
│                   ─────────────────────                           │
│                   ↓              ↓                                │
│              销毁 (80%→30%)    分配 (20%→70%)                      │
│                                  ↓                                │
│              ┌──────┬──────┬──────┬──────┐                        │
│              ↓      ↓      ↓      ↓      ↓                        │
│             LP    节点卡  D等级  基金会  创始人                     │
│            60%    15%    14%     5%     6%                        │
└─────────────────────────────────────────────────────────────────┘
```

## 合约列表

| 合约 | 文件 | 说明 |
|------|------|------|
| DQT | DQT.sol | 代币合约，1000亿全部进底池，支持从底池销毁/分配 |
| DQMCore | DQMCore.sol | 用户核心合约，注册/入金/SOL提取 |
| DQMiningStakeCore | DQMiningStakeCore.sol | 质押核心，三奖分配(LP/管理/见点) |
| DQMiningStakeMine | DQMiningStakeMine.sol | 爆块合约，每日从底池提取销毁和分配 |
| DQC | DQC.sol | NFT节点卡合约 |
| DQMAdmin | DQMAdmin.sol | 管理合约 |

## 核心机制

### 1. DQT - 代币合约

**1000亿全部进底池**
```solidity
// 部署后初始化
dqToken.initPool(pairAddress); // 将1000亿全部转入底池
dqToken.setMiningContract(miningAddress); // 授权爆块合约操作
```

**从底池销毁和分配**
```solidity
// 爆块合约调用
dqToken.burnFromPool(amount);           // 销毁
dqToken.distributeFromPool(to, amount); // 分配
dqToken.batchDistributeFromPool([...], [...], burnAmount); // 批量
```

### 2. 每日爆块

**释放规则**
- 每天释放底池剩余 DQ 的 1.3%
- 销毁率从 80% 开始，每天递减 0.5%，最低 30%

**销毁分配比例**
| 天数 | 销毁率 | 分配率 |
|------|--------|--------|
| 第1天 | 80% | 20% |
| 第100天 | 30% | 70% |
| 第100+天 | 30% | 70% |

**分配去向**
| 接收方 | 比例 |
|--------|------|
| LP质押者 | 60% |
| 节点卡 | 15% |
| D等级 | 14% |
| 基金会 | 5% |
| 创始人 | 6% |

### 3. 三奖分配

**直推奖 30%**
- 有能量即可领取

**见点奖 1% × 15代**
| 代数 | 直推数要求 |
|------|-----------|
| 1代 | ≥1 |
| 2-5代 | ≥3 |
| 6-10代 | ≥5 |
| 11-15代 | ≥10 |

**管理奖 30% 级差制**
| 等级 | 直推 | 团队业绩 | 级差 |
|------|------|---------|------|
| S1 | 10 | 10万 | - |
| S2 | 20 | 50万 | 10% |
| S3 | 30 | 100万 | 10% |
| S4 | 50 | 500万 | 10% |
| S5 | 80 | 1000万 | 10% |
| S6 | 100 | 5000万 | 10% |

### 4. SOL提取问题解决

```solidity
// 用户发起提取
core.withdrawSOL(user, amount);

// 内部流程：
// 1. core 记录提取请求
// 2. stakeCore.transferSOLToUser() 执行转账
// 3. 或者管理员直接调用 stakeCore.withdrawSOLDirect()
```

## 部署流程

```bash
# 1. 安装依赖
forge install OpenZeppelin/openzeppelin-contracts

# 2. 编译
forge build

# 3. 部署 (按顺序)
forge script script/Deploy.s.sol:DeployScript --rpc-url $BSC_RPC --broadcast

# 4. 部署后初始化
# 4.1 创建底池 (通过工厂创建Pair)
# 4.2 初始化DQT底池
dqToken.initPool(pairAddress);
dqToken.setMiningContract(miningAddress);

# 4.3 设置各合约地址
admin.setAddresses(...);
```

## 关键函数调用权限

| 函数 | 调用者 |
|------|--------|
| DQT.initPool | owner |
| DQT.setMiningContract | owner |
| DQT.burnFromPool | miningContract / owner |
| DQT.distributeFromPool | miningContract / owner |
| Mining.mine | 任何人 |
| Core.withdrawSOL | 用户自己 |
| StakeCore.transferSOLToUser | core合约 |
| StakeCore.withdrawSOLDirect | owner |

## 事件列表

### DQT
- PoolSet(address pool)
- MiningContractSet(address mining)
- PoolInitialized(address pool, uint256 amount)
- BurnedFromPool(uint256 amount)
- DistributedFromPool(address to, uint256 amount)

### DQMiningStakeMine
- Mined(releaseAmount, burnAmount, distributeAmount, burnRate, timestamp)
- Distributed(address to, uint256 amount, string category)

## 注意事项

1. **底池初始化只能执行一次** - `initPool` 只能调用一次
2. **爆块间隔** - 每天只能爆块一次
3. **销毁递减** - 销毁率每天递减 0.5%，最低 30%
4. **底池余额** - 随着爆块进行，底池 DQ 会逐渐减少，价格上涨
