# DQProject 智能合约

## 项目概述

**DQProject** 是一个基于币安智能链 (BSC) 的 DeFi 量化平台智能合约。

| 项目 | 信息 |
|------|------|
| 代币名称 | DQ (DeepQuest Token) |
| 代币总量 | 1000 亿 (1,000,000,000,000) |
| 合约标准 | ERC20 |
| 网络 | BSC (币安智能链) |

---

## BSC 重要地址

| 名称 | 地址 | 说明 |
|------|------|------|
| **BEP20 代币** | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` | 入金/出金代币 |
| **PancakeSwap V2 Router** | `0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6` | DEX 交易所 |
| **WBNB** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | Wrapped BNB |

---

## 核心功能概览

| 功能 | 说明 |
|------|------|
| BEP20 入金 | 使用 BEP20 代币换取 DQ |
| BEP20 出金 | 销毁 DQ，换回 BEP20 代币 |
| DQ 质押 | 锁仓 DQ，获取分红收益 |
| 节点 NFT | 购买 A/B/C 级节点卡牌 |
| 动态奖励 | 推荐奖励、见点奖、管理奖 |
| 爆块机制 | 每日释放并分配代币 |

---

## 兑换机制

### 入金 (swapBEP20ForDQ)

```
用户 ──BEP20──▶ 合约
               ├──30%──▶ LP质押池
               └──70%──▶ 运营池
               ◀──DQ─── 铸造给用户
```

**参数:**
- 输入: BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)
- 输出: DQ 代币 (1:1 兑换，可调整价格)

### 出金 (swapDQForBEP20)

```
用户 ──DQ──▶ 合约 ──燃烧──▶ 销毁
          ├──6%手续费──┬──50%──▶ 质押分红池(DQ)
          │           └──50%──▶ 运营池
          └──94%──▶ BEP20 ──▶ 用户
```

**参数:**
- 输入: DQ 代币
- 输出: BEP20 代币 (扣除 6% 手续费)

---

## 质押系统

### 质押周期

| 周期 | 年化收益 |
|------|----------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

### 分红来源

质押分红来自 **出金手续费的 50%**

---

## 节点 NFT

### 卡牌类型

| 类型 | 价格 (BNB) | 分红权重 | 上限 |
|------|------------|----------|------|
| A 级 | 500 | 4/15 | 3000 张 |
| B 级 | 1000 | 5/15 | 1000 张 |
| C 级 | 3000 | 6/15 | 300 张 |

### 资金分配

- 60% → LP 质押池
- 15% → 节点 NFT 分红池
- 25% → 运营池

---

## 爆块机制

每日触发一次，分配新铸造的 DQ 代币。

### 分配比例

- LP 质押池: 60%
- NFT 分红: 15%
- 基金会: 5%
- 团队: 14%
- 合伙人: 6%

### 燃烧机制

- 初始燃烧率: 80%
- 每日递减: 5%
- 最低燃烧率: 30%

---

## 动态奖励

### 分配比例

- 直推奖励: 30%
- 见点奖: 15% (15 层)
- 管理奖: 30% (级差)
- DAO 补贴: 10% (级差)
- 保险池: 7%
- 运营池: 8%

### 提现手续费分配

- 节点: 40%
- 合伙人: 30%
- 运营: 30%

---

## 核心函数

### 兑换函数

```solidity
// 入金: BEP20 → DQ
function swapBEP20ForDQ(uint256 _tokenAmount) external

// 出金: DQ → BEP20 (扣除6%手续费)
function swapDQForBEP20(uint256 _dqAmount, uint256 _minOut) external
```

### 质押函数

```solidity
// 质押 DQ
// _periodIndex: 0=30天, 1=90天, 2=180天, 3=360天
function stakeDQ(uint256 _amount, uint _periodIndex) external

// 解质押
function unstakeDQ(uint _periodIndex) external
```

### 节点函数

```solidity
// 购买节点 NFT (支付 BNB)
function buyNode(uint256 _type) external payable
// _type: 1=A级, 2=B级, 3=C级
```

### 分红领取

```solidity
function claimLp() external          // LP 分红
function claimNft() external         // NFT 分红
function claimDTeam() external       // D 级团队分红
function claimFee() external         // 手续费分红
function withdraw() external         // 动态奖金
function claimPartnerDQ() external   // 合伙人 DQ 分红
function claimPartnerBNB() external  // 合伙人 BNB 分红
```

### 管理函数

```solidity
function setPrice(uint256 _newPrice) external onlyOwner  // 设置 DQ 价格
function blockMining() external onlyOwner               // 触发爆块
function addInitialNodes(address[] calldata _users, uint8[] calldata _types) external onlyOwner
```

---

## 视图函数

```solidity
function getUser(address _user) external view returns (...)
function getCurrentMaxInvest() external view returns (uint256)
function getContractBalance() external view returns (uint256)
function getBEP20Balance() external view returns (uint256)
function getPrice() external view returns (uint256)
function getStakeInfo(address _user) external view returns (...)
```

---

## 合约状态变量

| 变量 | 说明 |
|------|------|
| `dqToken` | DQ 代币合约地址 |
| `dqCard` | NFT 卡牌合约地址 |
| `dqPrice` | DQ 价格 (1 DQ = x BEP20) |
| `BEP20_TOKEN` | 入金/出金代币地址 |
| `totalLPShares` | LP 总份额 |
| `operationPool` | 运营池余额 |
| `partnerCount` | 合伙人数量 |

---

## 事件列表

| 事件 | 说明 |
|------|------|
| `SwapBEP20ForDQ` | 入金事件 |
| `SwapDQForBEP20` | 出金事件 |
| `StakeDQ` | 质押事件 |
| `UnstakeDQ` | 解质押事件 |
| `BuyNode` | 购买节点事件 |
| `BlockMining` | 爆块事件 |
| `ClaimLp` | 领取 LP 分红 |
| `ClaimNft` | 领取 NFT 分红 |
| `LevelUp` | 升级事件 |
| `PriceUpdated` | 价格更新事件 |

---

## 部署后配置

1. **设置 DQ 价格**
```javascript
// 1 DQ = 1 BEP20
await contract.setPrice(ethers.utils.parseEther("1"));
```

2. **确保合约有 BEP20 余额用于出金**

---

## 合约地址汇总

| 合约 | 地址 |
|------|------|
| DQProject | `<部署后填写>` |
| DQToken | `<自动生成>` |
| DQCard | `<自动生成>` |
| BEP20_TOKEN | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` |
| PancakeSwap Router | `0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |

---

## 文件信息

- 合约文件: `/contracts/src/DQProject.sol`
- 文档文件: `/docs/TUTORIAL.md`
- 合约行数: 1032 行
- Solidity 版本: 0.8.17
