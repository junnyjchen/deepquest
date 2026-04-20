# DQProject 智能合约部署教程

## 项目概述

**DQProject** 是一个基于币安智能链 (BSC) 的 DeFi 量化平台智能合约。

### 代币信息
- **代币名称**: DQ (DeepQuest Token)
- **代币总量**: 1000 亿 (1,000,000,000,000)
- **合约标准**: ERC20
- **网络**: BSC (币安智能链)

---

## BSC 重要地址

| 名称 | 地址 | 说明 |
|------|------|------|
| **BEP20 代币** | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` | 入金/出金使用的代币 |
| **PancakeSwap V2 Router** | `0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6` | BSC 上的 DEX 交易所 |
| **WBNB** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | Wrapped BNB |

---

## 核心功能

### 1. BEP20 代币入金 → DQ

用户使用 **BEP20 代币 (0x570A5D26f7765Ecb712C0924E4De545B89fD43dF)** 质押换取 DQ 代币。

**资金分配:**
- 30% → LP 质押池
- 70% → 运营池

**代码调用:**
```javascript
// 先授权 BEP20 代币
const bep20Token = "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF";
await bep20TokenContract.approve(contractAddress, amount);

// 兑换 DQ
await contract.swapBEP20ForDQ(ethers.utils.parseEther("1000"));
```

### 2. DQ 出金 → BEP20 代币

用户销毁 DQ 代币，合约将 BEP20 代币转给用户。

**手续费:** 6% (50% 质押分红 + 50% 运营)

```javascript
// 兑换 1000 DQ 为 BEP20 代币
await contract.swapDQForBEP20(
  ethers.utils.parseEther("1000"),
  0  // 最小输出
);
```

### 3. DQ 质押系统

**质押周期:**
| 周期 | 收益 |
|------|------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

**分红来源:** 出金手续费的 50% 分配给质押者

```javascript
// 质押
await contract.stakeDQ(ethers.utils.parseEther("1000"), 0); // 30天

// 解质押
await contract.unstakeDQ(0);
```

### 4. 节点 NFT 购买

使用 BNB 购买节点卡牌。

```javascript
// 购买节点卡 (A=500, B=1000, C=3000 BNB)
await contract.buyNode(1, { value: ethers.utils.parseEther("500") });
```

---

## 资金流程图

```
┌─────────────────────────────────────────────────────────────┐
│                         入金流程                              │
│                                                             │
│   用户 ──BEP20──▶ 合约                                      │
│              │                                              │
│              ├──30%──▶ LP质押池                              │
│              │                                              │
│              └──70%──▶ 运营池                                │
│                                                             │
│              ◀──── DQ 代币 ◀──── 铸造                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         出金流程                              │
│                                                             │
│   用户 ──DQ──▶ 合约 ──燃烧──▶ 销毁                           │
│              │                                              │
│              ├──6%手续费──┬──50%──▶ 质押分红池               │
│              │            │                                 │
│              │            └──50%──▶ 运营池                   │
│              │                                              │
│              └──94%──▶ BEP20 代币 ──▶ 用户                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 合约配置

### 常量地址

```solidity
// BEP20 代币地址 (入金/出金)
address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;

// PancakeSwap DEX
address public constant PANCAKE_ROUTER = 0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6;

// WBNB
address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

// DQ 价格 (1 DQ = 1 BEP20 代币)
uint256 public dqPrice = 1 ether;
```

---

## 核心函数列表

| 函数 | 说明 |
|------|------|
| `swapBEP20ForDQ(_tokenAmount)` | BEP20 代币入金 → DQ |
| `swapDQForBEP20(_dqAmount, _minOut)` | DQ 出金 → BEP20 代币 |
| `stakeDQ(_amount, _periodIndex)` | 质押 DQ (30/90/180/360天) |
| `unstakeDQ(_periodIndex)` | 解质押 |
| `buyNode(_type)` | 购买节点 NFT (A/B/C级) |
| `claimLp()` | 领取 LP 分红 |
| `claimNft()` | 领取 NFT 分红 |
| `claimFee()` | 领取手续费分红 |
| `withdraw()` | 领取动态奖金 |
| `setPrice(_newPrice)` | 设置 DQ 价格 |

---

## 常见问题

### Q1: 出金时 BEP20 代币从哪里来?

**答**: 
- 用户入金时，BEP20 代币进入合约
- 出金时，从合约持有的 BEP20 余额中转给用户
- **注意**: 合约需要有足够的 BEP20 余额才能出金

### Q2: 如何确保合约有足够的 BEP20 出金?

**答**: 
- 需要有足够的用户入金来支撑出金
- 或者项目方定期向合约转入 BEP20 代币

### Q3: 质押分红从哪里来?

**答**: 出金手续费的 50% 分配给质押者，以 DQ 代币形式铸造。

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
