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
| **入金代币 (BEP20)** | `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` | 用户用于质押入金的代币 |
| **PancakeSwap V2 Router** | `0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6` | BSC 上的 DEX 交易所 |
| **WBNB** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | Wrapped BNB，用于 DEX 交易 |

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

### 2. BNB 入金 → DQ

也可以直接使用 BNB 进行入金。

```javascript
await contract.swapBNBForDQ({ value: ethers.utils.parseEther("1.0") });
```

### 3. DQ 出金 → BNB (PancakeSwap)

用户销毁 DQ 代币，合约通过 PancakeSwap 将 DQ 兑换为 BNB 转给用户。

**手续费:** 6% (50% 质押分红 + 50% 运营)

```javascript
// 兑换 1000 DQ 为 BNB
await contract.swapDQForBNB(
  ethers.utils.parseEther("1000"),
  0  // 最小输出
);
```

### 4. DQ 质押系统

**质押周期:**
| 周期 | 收益 |
|------|------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

```javascript
// 质押
await contract.stakeDQ(ethers.utils.parseEther("1000"), 0); // 30天

// 解质押
await contract.unstakeDQ(0);
```

### 5. 节点 NFT 购买

```javascript
// 购买节点卡 (A=500, B=1000, C=3000 BNB)
await contract.buyNode(1, { value: ethers.utils.parseEther("500") });
```

---

## 合约配置

### 常量地址

```solidity
// 入金代币地址
address public constant BEP20_TOKEN = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;

// PancakeSwap DEX
address public constant PANCAKE_ROUTER = 0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6;

// WBNB (用于 DEX 交易)
address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

// DQ 价格 (1 DQ = 1 BEP20)
uint256 public dqPrice = 1 ether;
```

---

## 常见问题

### Q1: BEP20 代币地址是什么?

**答**: `0x570A5D26f7765Ecb712C0924E4De545B89fD43dF` 是用户用于质押入金的 BEP20 代币合约地址。

### Q2: 如何设置 DQ 价格?

```javascript
// 1 DQ = 0.0001 BEP20 代币
await contract.setPrice(ethers.utils.parseUnits("0.0001", "ether"));
```

### Q3: 出金时的手续费分配?

- 50% → 质押分红池
- 50% → 运营池

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
