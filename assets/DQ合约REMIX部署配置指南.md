# DQ 合约 REMIX IDE 部署配置指南

## 一、部署地址总览

### 已部署合约地址（BSC主网）

| 合约 | 地址 |
|------|------|
| DQT (DQ代币) | `0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55` |
| DQCard (NFT卡) | `0x7CE9bbb974dedf191e99964278ff9d9d955a8E7C` |
| DQPAIR (交易对) | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` |
| DQLPMigrator (LP迁移) | `0x8eB742d12488f6689831599e8B12d66090BFE69c` |
| DQMAdmin (管理) | `0x526E617614F36C3AAe32a1baD65bEa2427f1f767` |
| DQMCore (核心) | `0x65767e3564f6060Ce0844B23aB6A5B2ed4019491` |
| DQMiningStakeCore (质押核心) | `0x40c62053Ee493911C4f517a9824ba12AE74A9cd4` |
| DQMiningStakeMine (爆块) | `0xCcFdD942093AEeD0f41CC16c2834602b6548F8ea` |
| DQMiningStakeVault (质押金库) | `0xF879Cb65dD6f741242cB654180eBD0d770029b25` |

### 常规地址

| 名称 | 地址 | 合约中变量 |
|------|------|-----------|
| 合伙人地址 | `0x803B79B608455808C2f752c588804c3F5bF676a3` | PARTNER / partnerAddr / founder |
| 买入DQ手续费地址 | `0x1850933c0d64db3A56476F5Bdc4191BCFd242e30` | FEE_RECEIVER / taxReceiver |
| 基金会 | `0xA0f045cde45ca1aeE2033356170B46A1fF3b7202` | FOUNDATION / foundation |
| 运营 | `0x4bE56C5390869A3236F8545462896eB1E423D0d5` | operAddr |
| 保险池 | `0x2db993B862969040Cd971Df8Fd2a2C80EC285203` | insureAddr |
| DAO组织 | `0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852` | daoAddr |
| 交易手续费 | `0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967` | feeAddr / sellFeeReceiver |
| 节点爆块接收地址 | `0x822682A54C454e938374e9690420cdFA264A18Aa` | FIXED_NODE / fixedNodeAddr |
| 节点收款USDT地址 | `0x49931c11577754066a3d7db28760f8C292b4091b` | nodeUSDTReceiver |
| 超级管理员OWNER | `0x274aCc6397349F21179ed6258A54B2a11B28faF5` | OWNER |

### BSC公共合约地址

| 名称 | 地址 | 用途 |
|------|------|------|
| USDT (BSC) | `0x55d398326f99059fF775485246999027B3197955` | USDT代币 |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 包装BNB |
| PancakeSwap Router V2 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | DEX路由 |
| PancakeSwap Factory | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` | DEX工厂 |
| SOL代币 | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` | 项目SOL代币 |

---

## 二、REMIX IDE 环境准备

### 2.1 打开 REMIX

访问 https://remix.ethereum.org

### 2.2 导入合约文件

1. 在左侧文件浏览器中，右键点击 `contracts` 文件夹 → **Import File**
2. 依次导入8个 .sol 文件：
   - `DQT.sol`
   - `DQC.sol`（即DQCard）
   - `DQMCore.sol`
   - `DQMiningStakeCore.sol`
   - `DQMiningStakeVault.sol`
   - `DQMiningStakeMine.sol`
   - `DQMAdmin.sol`
   - `DQLPMigrator.sol`

### 2.3 安装 OpenZeppelin 依赖

方法一（推荐）：在 Remix 中使用 GitHub 导入
- 合约中的 `@openzeppelin/contracts/...` 导入会自动从 GitHub 解析
- Remix 默认支持 `@openzeppelin/contracts` 前缀，无需手动安装

方法二：手动上传
- 如自动导入失败，从 https://github.com/OpenZeppelin/openzeppelin-contracts/releases/tag/v5.6.1 下载 v5.6.1 源码
- 在 Remix 中创建 `@openzeppelin/contracts/` 目录结构并上传对应文件

### 2.4 编译配置

1. 点击左侧 **Solidity Compiler** 图标
2. 设置编译器版本：**0.8.35**（支持 Cancun EVM）
3. 开启 **Enable optimization**：设为 **200 runs**
4. EVM Version：选择 **cancun**
5. 逐个编译每个合约文件，确保无报错

---

## 三、部署顺序与构造函数参数

> **关键原则**：先部署无依赖合约 → 再部署有依赖合约 → 最后配置互相引用

### 部署顺序总览

```
第1步: DQT.sol        （无依赖，构造函数无参数）
第2步: DQC.sol        （无依赖，构造函数无参数，owner硬编码）
第3步: DQMCore.sol    （无依赖，构造函数无参数）
第4步: DQMiningStakeCore.sol  （构造函数无参数，地址后续设置）
第5步: DQMiningStakeVault.sol （构造函数需传6个地址参数！）
第6步: DQMiningStakeMine.sol  （构造函数需传4个地址参数）
第7步: DQMAdmin.sol   （构造函数无参数）
第8步: DQLPMigrator.sol （构造函数无参数）
```

---

### 第1步：部署 DQT

**构造函数**：无参数
```
constructor() ERC20("DQ Token", "DQ") Ownable(msg.sender)
```

**REMIX 操作**：
1. Deploy 面板选择 `DQT`
2. 确保构造函数参数为空
3. 点击 **Deploy**
4. 记录部署地址 → `DQT_ADDRESS`

**部署后配置**（按顺序）：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setTaxReceiver` | `0x1850933c0d64db3A56476F5Bdc4191BCFd242e30` | 买入手续费地址 |
| 2 | `setSellFeeReceiver` | `0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967` | 卖出手续费地址 |

---

### 第2步：部署 DQC (DQCard)

**构造函数**：无参数（owner 硬编码为 `0x274aCc6397349F21179ed6258A54B2a11B28faF5`）
```
constructor() ERC721("DQ Card", "DQC") Ownable(0x274aCc6397349F21179ed6258A54B2a11B28faF5)
```

**REMIX 操作**：
1. Deploy 面板选择 `DQCard`
2. 确保构造函数参数为空
3. 点击 **Deploy**
4. 记录部署地址 → `DQC_ADDRESS`

**部署后配置**：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setTreasury` | 节点收款USDT地址: `0x49931c11577754066a3d7db28760f8C292b4091b` | NFT购买USDT收款地址 |

---

### 第3步：部署 DQMCore

**构造函数**：无参数
```
constructor()  // 初始化 OWNER 为推荐人，startTime = block.timestamp
```

**REMIX 操作**：
1. Deploy 面板选择 `DQMCore`
2. 点击 **Deploy**
3. 记录部署地址 → `CORE_ADDRESS`

**部署后配置**：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setAddresses` | `DQT_ADDRESS`, `DQC_ADDRESS`, `STAKE_ADDRESS` | 设置合约引用（STAKE_ADDRESS 在第4步部署后填入） |

> ⚠️ 注意：`setAddresses` 需要质押核心地址，应等第4步部署后再调用。可先跳过，最后统一配置。

---

### 第4步：部署 DQMiningStakeCore

**构造函数**：无参数
```
constructor()  // 地址通过 setter 函数后续配置
```

**REMIX 操作**：
1. Deploy 面板选择 `DQMiningStakeCore`
2. 点击 **Deploy**
3. 记录部署地址 → `STAKE_CORE_ADDRESS`

**部署后配置**：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setAddresses` | `DQT_ADDRESS`, `DQC_ADDRESS`, `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | DQ地址、NFT地址、LP Pair地址 |
| 2 | `setCoreContract` | `CORE_ADDRESS` | DQMCore地址 |
| 3 | `setMiningContract` | `MINE_ADDRESS` | 爆块合约地址（第6步部署后填入） |
| 4 | `setDaoAddr` | `0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852` | DAO地址 |
| 5 | `setOperAddr` | `0x4bE56C5390869A3236F8545462896eB1E423D0d5` | 运营地址 |
| 6 | `setInsureAddr` | `0x2db993B862969040Cd971Df8Fd2a2C80EC285203` | 保险池地址 |
| 7 | `setNodeRewardMode` | `false`, `0x822682A54C454e938374e9690420cdFA264A18Aa` | 节点奖励模式：false=给NFT持有者，true=给固定地址 |

> ⚠️ `setMiningContract` 需要爆块合约地址，应等第6步部署后再调用。

---

### 第5步：部署 DQMiningStakeVault ⚠️ 构造函数有参数

**构造函数**：6个地址参数
```
constructor(
    address _stakeCore,      // DQMiningStakeCore地址
    address _dqToken,        // DQT地址
    address _coreContract,   // DQMCore地址
    address _foundation,     // 基金会地址
    address _partner,        // 合伙人地址
    address _fixedNode       // 固定节点地址
) Ownable(msg.sender)
```

**REMIX 操作**：
1. Deploy 面板选择 `DQMiningStakeVault`
2. 在构造函数参数框中填入（用逗号分隔）：
```
0x40c62053Ee493911C4f517a9824ba12AE74A9cd4,0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55,0x65767e3564f6060Ce0844B23aB6A5B2ed4019491,0xA0f045cde45ca1aeE2033356170B46A1fF3b7202,0x803B79B608455808C2f752c588804c3F5bF676a3,0x822682A54C454e938374e9690420cdFA264A18Aa
```

即：
```
STAKE_CORE_ADDRESS, DQT_ADDRESS, CORE_ADDRESS, FOUNDATION, PARTNER, FIXED_NODE
```

展开为实际值：
```
_stakeCore:       0x40c62053Ee493911C4f517a9824ba12AE74A9cd4
_dqToken:         0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55
_coreContract:    0x65767e3564f6060Ce0844B23aB6A5B2ed4019491
_foundation:      0xA0f045cde45ca1aeE2033356170B46A1fF3b7202
_partner:         0x803B79B608455808C2f752c588804c3F5bF676a3
_fixedNode:       0x822682A54C454e938374e9690420cdFA264A18Aa
```

3. 点击 **Deploy**
4. 记录部署地址 → `VAULT_ADDRESS`

---

### 第6步：部署 DQMiningStakeMine ⚠️ 构造函数有参数

**构造函数**：4个地址参数
```
constructor(
    address _dqToken,      // DQT地址
    address _stakeCore,    // DQMiningStakeCore地址
    address _foundation,   // 基金会地址
    address _founder       // 合伙人/创始人地址
) Ownable(msg.sender)
```

**REMIX 操作**：
1. Deploy 面板选择 `DQMiningStakeMine`
2. 在构造函数参数框中填入：
```
0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55,0x40c62053Ee493911C4f517a9824ba12AE74A9cd4,0xA0f045cde45ca1aeE2033356170B46A1fF3b7202,0x803B79B608455808C2f752c588804c3F5bF676a3
```

即：
```
_dqToken:     0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55
_stakeCore:   0x40c62053Ee493911C4f517a9824ba12AE74A9cd4
_foundation:  0xA0f045cde45ca1aeE2033356170B46A1fF3b7202
_founder:     0x803B79B608455808C2f752c588804c3F5bF676a3
```

3. 点击 **Deploy**
4. 记录部署地址 → `MINE_ADDRESS`

**部署后配置**：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setDLevelPool` | `STAKE_CORE_ADDRESS` | D等级池地址（质押核心合约自身处理D等级分配） |
| 2 | `setInitialTotalSupply` | `100000000000000000000000000000` | 初始总量1000亿DQ（18位小数） |

---

### 第7步：部署 DQMAdmin

**构造函数**：无参数
```
constructor()  // 无状态初始化
```

**REMIX 操作**：
1. Deploy 面板选择 `DQMAdmin`
2. 点击 **Deploy**
3. 记录部署地址 → `ADMIN_ADDRESS`

---

### 第8步：部署 DQLPMigrator

**构造函数**：无参数
```
constructor()  // 无状态初始化
```

**REMIX 操作**：
1. Deploy 面板选择 `DQLPMigrator`
2. 点击 **Deploy**
3. 记录部署地址 → `MIGRATOR_ADDRESS`

**部署后配置**（按顺序）：

| # | 函数 | 参数 | 说明 |
|---|------|------|------|
| 1 | `setOldLP` | 旧LP地址 | A合约的LP代币地址 |
| 2 | `setNewLP` | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | 新LP地址（当前交易对） |
| 3 | `setNewStakeContract` | `STAKE_CORE_ADDRESS` | 新质押合约地址 |
| 4 | `setMigrationRate` | `10000` | 汇率1:1 |
| 5 | `toggleMigration` | `true` | 开启迁移 |

---

## 四、合约间互相配置（核心步骤）

> 所有合约已部署完毕，现在需要互相设置引用地址。**严格按照以下顺序操作！**

### 4.1 配置 DQT 合约

在 REMIX 中加载已部署的 DQT 合约实例，依次调用：

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setPool` | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | 设置底池（DQPAIR），同时自动设为免税 |
| 2 | `setMiningContract` | `MINE_ADDRESS` | 设置爆块合约，自动免税 |
| 3 | `setStakeCoreContract` | `STAKE_CORE_ADDRESS` | 设置质押核心合约，自动免税 |
| 4 | `setAdminContract` | `ADMIN_ADDRESS` | 设置管理合约，自动获得免税+minter权限 |
| 5 | `setExempt` | `CORE_ADDRESS`, `true` | DQMCore免税 |
| 6 | `setExempt` | `VAULT_ADDRESS`, `true` | DQMiningStakeVault免税 |
| 7 | `setExempt` | `MIGRATOR_ADDRESS`, `true` | 迁移合约免税 |
| 8 | `setExempt` | `0x274aCc6397349F21179ed6258A54B2a11B28faF5`, `true` | OWNER免税（如尚未设置） |

> ⚠️ **关于 `DQT.setRouter()`**：DQT 合约中的 `router` 变量虽然已声明，但在当前代码中**从未被使用**。买卖税检测完全基于 `pool`（Pair地址），不需要 Router 地址。**无需调用 `setRouter()`**。PancakeSwap Router 地址 `0x10ED43C718714eb63d5aA57B78B54704E256024E` 已作为常量硬编码在 DQMCore 和 DQMAdmin 中，无需重复设置。

### 4.2 配置 DQC (DQCard) 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setAdminContract` | `ADMIN_ADDRESS` | 管理合约 |
| 2 | `setStakeContract` | `STAKE_CORE_ADDRESS` | 质押合约（NFT购买时自动设L等级） |
| 3 | `setMiningContract` | `MINE_ADDRESS` | 爆块合约 |

### 4.3 配置 DQMCore 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setAddresses` | `DQT_ADDRESS`, `DQC_ADDRESS`, `STAKE_CORE_ADDRESS` | 设置三大合约引用 |
| 2 | `setAdminContract` | `ADMIN_ADDRESS` | 管理合约 |
| 3 | `setPool` | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | 底池地址 |
| 4 | `setMigratorContract` | `MIGRATOR_ADDRESS` | 迁移合约 |

### 4.4 配置 DQMiningStakeCore 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setAddresses` | `DQT_ADDRESS`, `DQC_ADDRESS`, `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | 设置DQ/NFT/Pair |
| 2 | `setCoreContract` | `CORE_ADDRESS` | DQMCore引用 |
| 3 | `setMiningContract` | `MINE_ADDRESS` | 爆块合约 |
| 4 | `setAdminContract` | `ADMIN_ADDRESS` | 管理合约 |
| 5 | `setDaoAddr` | `0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852` | DAO地址 |
| 6 | `setOperAddr` | `0x4bE56C5390869A3236F8545462896eB1E423D0d5` | 运营地址 |
| 7 | `setInsureAddr` | `0x2db993B862969040Cd971Df8Fd2a2C80EC285203` | 保险池地址 |
| 8 | `setNodeRewardMode` | `false`, `0x822682A54C454e938374e9690420cdFA264A18Aa` | 节点奖励模式 |
| 9 | `setLpPair` | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | LP Pair地址 |
| 10 | `setLpRouter` | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | PancakeSwap V2 Router（用户移除LP时调用removeLiquidity） |
| 11 | `setDLevelPool` | `0x40c62053Ee493911C4f517a9824ba12AE74A9cd4` | D等级池 = StakeCore自身 |
| 12 | `setMigratorContract` | `MIGRATOR_ADDRESS` | 迁移合约 |

> **`setLpPair` 和 `setLpRouter` 说明**：
> - `setLpPair` → 传入 DQ/WBNB 交易对地址 `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc`，即 LP Token 合约地址
> - `setLpRouter` → 传入 PancakeSwap V2 Router 地址 `0x10ED43C718714eb63d5aA57B78B54704E256024E`，用于用户 `withdrawLP()` 时调用 `removeLiquidity` 拆分LP
>
> REMIX 操作：在已加载的 **DQMiningStakeCore** 合约实例中，找到 `setLpPair` 和 `setLpRouter`，分别填入对应地址点击 transact

> **`setDLevelPool` 详细说明**：
>
> D等级(D1-D8)是用户的团队等级，根据团队中有效入金地址数自动升级：
> - D1: 30人 | D2: 120人 | D3: 360人 | D4: 1000人 | D5: 4000人 | D6: 10000人 | D7: 15000人 | D8: 30000人
>
> 爆块时，14%的DQ分配给D等级用户，流程是：
> 1. `DQMiningStakeMine.mine()` → 调用 `DQT.distributeFromPool(dLevelPool, amount)` **将DQ代币转给 dLevelPool 地址**
> 2. 然后调用 `DQMiningStakeCore.distributeDRankReward(amount)` **更新内部账本**（按8个等级平均累加 `dLevelAccReward[i]`）
> 3. 用户调用 `claimDRankReward()` 从 StakeCore 余额中领取
>
> 因此 `dLevelPool` **必须设为 DQMiningStakeCore 自身地址**，这样：
> - DQ代币先转到 StakeCore 合约余额中
> - `distributeDRankReward` 更新账本后，用户 `claimDRankReward` 才能从该余额中转出
>
> **REMIX 操作**：在 DQMiningStakeCore 合约中调用 `setDLevelPool`，填入 `0x40c62053Ee493911C4f517a9824ba12AE74A9cd4`

### 4.5 配置 DQMiningStakeVault 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | （无需额外配置） | - | 构造函数已传入所有 immutable 参数 |

> Vault 的 stakeCore/dqToken/coreContract/FOUNDATION/PARTNER/FIXED_NODE 都是 immutable，在构造函数中设置。owner 为部署者。

### 4.6 配置 DQMiningStakeMine 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setDLevelPool` | `0x40c62053Ee493911C4f517a9824ba12AE74A9cd4` | D等级池 = StakeCore地址（与4.4节说明相同） |
| 2 | `setInitialTotalSupply` | `100000000000000000000000000000` | 1000亿DQ（10^8 * 10^18 * 1000） |

> ⚠️ `setInitialTotalSupply` 只能调用一次！确保值正确：`100000000000000000000000000000`（即 1000 × 10^8 × 10^18）
>
> **Mine 合约 `setDLevelPool` 说明**：
> 爆块时 Mine 合约通过 `DQT.distributeFromPool(dLevelPool, amount)` 将 D等级14% 的 DQ 代币直接转给此地址，然后调用 `StakeCore.distributeDRankReward(amount)` 更新账本。所以此地址也必须设为 **DQMiningStakeCore** 的地址 `0x40c62053Ee493911C4f517a9824ba12AE74A9cd4`，与 4.4 节中 StakeCore 的 `setDLevelPool` 保持一致。

### 4.7 配置 DQMAdmin 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setContracts` | `DQT_ADDRESS`, `DQC_ADDRESS`, `CORE_ADDRESS`, `STAKE_CORE_ADDRESS`, `MINE_ADDRESS` | 设置所有合约引用 |
| 2 | `initAllContracts` | （无参数） | 一键初始化所有合约的adminContract和DQC的stakeContract |

> `initAllContracts` 会自动调用：
> - DQT.setAdminContract(ADMIN_ADDRESS)
> - DQMCore.setAdminContract(ADMIN_ADDRESS)
> - DQMiningStakeCore.setAdminContract(ADMIN_ADDRESS)
> - DQMiningStakeMine.setAdminContract(ADMIN_ADDRESS)
> - DQCard.setAdminContract(ADMIN_ADDRESS)
> - DQCard.setStakeContract(STAKE_CORE_ADDRESS)

### 4.8 配置 DQLPMigrator 合约

| 顺序 | 函数 | 参数 | 说明 |
|------|------|------|------|
| 1 | `setAdminContract` | `ADMIN_ADDRESS` | 管理合约 |
| 2 | `setOldLP` | 旧LP地址 | 根据实际情况填入 |
| 3 | `setNewLP` | `0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc` | 当前交易对LP地址 |
| 4 | `setNewStakeContract` | `STAKE_CORE_ADDRESS` | 新质押合约 |
| 5 | `setMigrationRate` | `10000` | 1:1 汇率 |
| 6 | `toggleMigration` | `true` | 开启迁移 |

---

## 五、初始化底池（关键步骤）

> 合约部署完毕后，需要将 DQT 总量转入 PancakeSwap 底池

### 5.1 创建 PancakeSwap 交易对

如果 DQPAIR 尚未创建，需要先在 PancakeSwap 上创建 DQ/WBNB 交易对：
- 通过 PancakeSwap Factory (`0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`) 调用 `createPair(DQT_ADDRESS, WBNB_ADDRESS)`
- 或通过 PancakeSwap 网页界面添加初始流动性

### 5.2 转入初始流动性

1. DQT 部署时铸造了 1000 亿 DQ 到部署者地址
2. 在 PancakeSwap 添加 DQ/WBNB 初始流动性
3. 获得 LP Token 地址即为 DQPAIR

### 5.3 设置底池

在 DQT 合约调用：
```
setPool(DQPAIR_ADDRESS)    // 或 setPair(DQPAIR_ADDRESS, true)
```

在 DQMCore 合约调用：
```
setPool(DQPAIR_ADDRESS)
```

---

## 六、REMIX 操作技巧

### 6.1 加载已部署合约

1. 在 Deploy 面板，切换环境为 **Injected Provider - MetaMask**
2. 选择 **BSC Mainnet**
3. 在 "At Address" 输入框中填入已部署合约地址
4. 点击 **At Address** 按钮
5. 即可在 REMIX 中调用该合约的读写函数

### 6.2 一次性配置脚本

如果合约刚部署、所有地址都是新的，可通过 DQMAdmin 一次性配置：

```
// 1. 先设置 DQT 的地址（不通过Admin，需直接调用）
DQT.setPool(DQPAIR_ADDRESS)
DQT.setMiningContract(MINE_ADDRESS)
DQT.setStakeCoreContract(STAKE_CORE_ADDRESS)
DQT.setTaxReceiver(0x1850933c0d64db3A56476F5Bdc4191BCFd242e30)
DQT.setSellFeeReceiver(0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967)
// 注意：DQT.setRouter() 无需调用！router变量未使用，买卖税基于pool地址检测

// 2. 设置 Admin 合约引用
DQMAdmin.setContracts(DQT_ADDRESS, DQC_ADDRESS, CORE_ADDRESS, STAKE_CORE_ADDRESS, MINE_ADDRESS)

// 3. 一键初始化所有合约的adminContract
DQMAdmin.initAllContracts()

// 4. 设置其他需要单独配置的地址
DQMCore.setPool(DQPAIR_ADDRESS)
DQMCore.setAddresses(DQT_ADDRESS, DQC_ADDRESS, STAKE_CORE_ADDRESS)
DQMCore.setMigratorContract(MIGRATOR_ADDRESS)

DQMiningStakeCore.setCoreContract(CORE_ADDRESS)
DQMiningStakeCore.setMiningContract(MINE_ADDRESS)
DQMiningStakeCore.setAddresses(DQT_ADDRESS, DQC_ADDRESS, DQPAIR_ADDRESS)
DQMiningStakeCore.setDaoAddr(0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852)
DQMiningStakeCore.setOperAddr(0x4bE56C5390869A3236F8545462896eB1E423D0d5)
DQMiningStakeCore.setInsureAddr(0x2db993B862969040Cd971Df8Fd2a2C80EC285203)
DQMiningStakeCore.setLpPair(DQPAIR_ADDRESS)
DQMiningStakeCore.setLpRouter(PANCAKE_ROUTER)
DQMiningStakeCore.setNodeRewardMode(false, 0x822682A54C454e938374e9690420cdFA264A18Aa)
DQMiningStakeCore.setDLevelPool(STAKE_CORE_ADDRESS)
DQMiningStakeCore.setMigratorContract(MIGRATOR_ADDRESS)

DQMiningStakeMine.setDLevelPool(STAKE_CORE_ADDRESS)
DQMiningStakeMine.setInitialTotalSupply(100000000000000000000000000000)

DQC.setTreasury(0x49931c11577754066a3d7db28760f8C292b4091b)

DQLPMigrator.setNewLP(DQPAIR_ADDRESS)
DQLPMigrator.setNewStakeContract(STAKE_CORE_ADDRESS)
DQLPMigrator.setMigrationRate(10000)
DQLPMigrator.toggleMigration(true)

// 5. 免税地址（重要！否则合约间转账会被扣税）
DQT.setExempt(CORE_ADDRESS, true)
DQT.setExempt(STAKE_CORE_ADDRESS, true)
DQT.setExempt(VAULT_ADDRESS, true)
DQT.setExempt(MINE_ADDRESS, true)
DQT.setExempt(ADMIN_ADDRESS, true)
DQT.setExempt(MIGRATOR_ADDRESS, true)
```

### 6.3 验证配置

部署和配置完成后，逐一验证：

```
// 验证 DQT 配置
DQT.pool() → 应返回 DQPAIR 地址
DQT.miningContract() → 应返回 MINE 地址
DQT.stakeCoreContract() → 应返回 STAKE_CORE 地址
DQT.taxReceiver() → 应返回 0x1850933c0d64db3A56476F5Bdc4191BCFd242e30
DQT.sellFeeReceiver() → 应返回 0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967
DQT.isExempt(DQPAIR) → true
DQT.isExempt(MINE_ADDRESS) → true
DQT.isExempt(STAKE_CORE_ADDRESS) → true

// 验证 DQMiningStakeCore 配置
DQMiningStakeCore.dqToken() → DQT 地址
DQMiningStakeCore.dqCard() → DQC 地址
DQMiningStakeCore.coreContract() → CORE 地址
DQMiningStakeCore.miningContract() → MINE 地址
DQMiningStakeCore.daoAddr() → DAO 地址
DQMiningStakeCore.operAddr() → 运营地址
DQMiningStakeCore.insureAddr() → 保险池地址

// 验证 DQMiningStakeMine 配置
DQMiningStakeMine.initialTotalSupply() → 100000000000000000000000000000
DQMiningStakeMine.dLevelPool() → STAKE_CORE 地址

// 验证 DQMAdmin
DQMAdmin.dqToken() → DQT 地址
DQMAdmin.dqCard() → DQC 地址
DQMAdmin.coreContract() → CORE 地址
DQMAdmin.stakeContract() → STAKE_CORE 地址
DQMAdmin.mineContract() → MINE 地址
```

---

## 七、已部署合约的 REMIX 地址代入值

由于合约已部署，以下为直接可用的配置参数：

```
DQT_ADDRESS      = 0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55
DQC_ADDRESS      = 0x7CE9bbb974dedf191e99964278ff9d9d955a8E7C
DQPAIR_ADDRESS   = 0x06f4596b1e7dc90a5173c5ce742a470e8efacdbc
MIGRATOR_ADDRESS = 0x8eB742d12488f6689831599e8B12d66090BFE69c
ADMIN_ADDRESS    = 0x526E617614F36C3AAe32a1baD65bEa2427f1f767
CORE_ADDRESS     = 0x65767e3564f6060Ce0844B23aB6A5B2ed4019491
STAKE_CORE_ADDRESS = 0x40c62053Ee493911C4f517a9824ba12AE74A9cd4
MINE_ADDRESS     = 0xCcFdD942093AEeD0f41CC16c2834602b6548F8ea
VAULT_ADDRESS    = 0xF879Cb65dD6f741242cB654180eBD0d770029b25
```

### DQMiningStakeVault 构造函数参数（如重新部署）

```
0x40c62053Ee493911C4f517a9824ba12AE74A9cd4,0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55,0x65767e3564f6060Ce0844B23aB6A5B2ed4019491,0xA0f045cde45ca1aeE2033356170B46A1fF3b7202,0x803B79B608455808C2f752c588804c3F5bF676a3,0x822682A54C454e938374e9690420cdFA264A18Aa
```

### DQMiningStakeMine 构造函数参数（如重新部署）

```
0x25edC7Bb2abc613e07d26A21e8bC1D799E2E5b55,0x40c62053Ee493911C4f517a9824ba12AE74A9cd4,0xA0f045cde45ca1aeE2033356170B46A1fF3b7202,0x803B79B608455808C2f752c588804c3F5bF676a3
```

---

## 八、地址一致性校验结果

合约硬编码地址与用户提供地址对比：

| 地址名称 | 合约中的值 | 用户提供的值 | 状态 |
|----------|-----------|-------------|------|
| 基金会 FOUNDATION | `0xA0f045cde45ca1aeE2033356170B46A1fF3b7202` | `0xA0f045cde45ca1aeE2033356170B46A1fF3b7202` | ✅ 一致 |
| 合伙人 PARTNER | `0x803B79B608455808C2f752c588804c3F5bF676a3` | `0x803B79B608455808C2f752c588804c3F5bF676a3` | ✅ 一致 |
| 买入DQ手续费 FEE_RECEIVER | `0x1850933c0d64db3A56476F5Bdc4191BCFd242e30` | `0x1850933c0d64db3A56476F5Bdc4191BCFd242e30` | ✅ 一致 |
| 交易手续费 feeAddr | `0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967` | `0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967` | ✅ 一致 |
| 节点爆块接收 FIXED_NODE | `0x822682A54C454e938374e9690420cdFA264A18Aa` | `0x822682A54C454e938374e9690420cdFA264A18Aa` | ✅ 一致 |
| 节点收款USDT nodeUSDTReceiver | `0x49931c11577754066a3d7db28760f8C292b4091b` | `0x49931c11577754066a3d7db28760f8C292b4091b` | ✅ 一致 |
| 超级管理员 OWNER | `0x274aCc6397349F21179ed6258A54B2a11B28faF5` | (隐含) | ✅ 一致 |

> ⚠️ 以下地址需通过 setter 函数设置（合约中未硬编码）：
> - DAO组织 `0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852` → `DQMiningStakeCore.setDaoAddr()`
> - 运营 `0x4bE56C5390869A3236F8545462896eB1E423D0d5` → `DQMiningStakeCore.setOperAddr()`
> - 保险池 `0x2db993B862969040Cd971Df8Fd2a2C80EC285203` → `DQMiningStakeCore.setInsureAddr()`

---

## 九、注意事项

1. **部署账户**：必须使用 `0x274aCc6397349F21179ed6258A54B2a11B28faF5`（OWNER）部署所有合约，否则权限控制会失效
2. **DQMiningStakeVault** 的 immutable 变量在构造函数中设置后不可修改，部署时务必确保参数正确
3. **DQMiningStakeMine.setInitialTotalSupply** 只能调用一次，请确保值正确
4. **免税地址**：务必将所有内部合约地址加入 DQT 白名单，否则合约间 DQ 转账会被扣税
5. **底池同步**：DQT.setPool() 会自动将底池设为免税；如果 DQT 已有 pool 设置，setPair 可以覆盖
6. **DQC 构造函数** owner 硬编码为 `0x274aCc6397349F21179ed6258A54B2a11B28faF5`，不是 msg.sender，部署时注意
