# DQProject 合约对比分析

## 精简版 vs 原版 (v3.3)

### 核心差异

| 功能 | 原版 (v3.3) | 精简版 |
|------|------------|--------|
| **代码行数** | 1741行 | ~1100行 |
| **入金机制** | 复杂的前期控进 | 简化动态上限 |
| **LP质押** | 复合质押池 | 简化LP份额 |
| **单币质押** | 完整实现 | 简化版 |

---

## ✅ 精简版新增/保留的核心功能

### 1. 节点达标限制 ✅
```solidity
function checkNodeQualified(address _user) public view returns (
    bool qualified, 
    uint256 currentLines, 
    uint256 requiredLines
)
```
- **A卡**: 需要5条达标线
- **B卡**: 需要10条达标线
- **C卡**: 需要20条达标线
- **达标定义**: 直接子节点中有用户完成入金 = 1条线

### 2. 地址限制功能 ✅
```solidity
mapping(address => bool) public restrictedAddresses;

function restrictAddress(address _user) external onlyOwner
function unrestrictAddress(address _user) external onlyOwner
function getRestrictedCount() external view returns (uint256)
```
- 限制后无法领取任何奖励
- 限制期间收益转入运营池

### 3. 入金节点关系链 ✅
```solidity
modifier onlyCanDeposit() {
    require(_hasNodeInUpline(msg.sender), "no node in upline");
    if (!_users[msg.sender].hasDeposited) {
        require(_users[msg.sender].hasNode, "first deposit requires node");
    }
}
```
- 注册: 推荐人必须是节点
- 首次入金: 用户必须是节点
- 后续入金: 只要在节点关系链下即可

### 4. 节点达标检查 ✅
```solidity
function getNodeInfo(address _user) external view returns (
    uint256 cardType,
    uint256 cardCount,
    uint256 qualifiedLines,
    uint256 requiredLines,
    bool isQualified
)
```

---

## 📊 完整功能对照表

| 功能模块 | 原版 | 精简版 | 说明 |
|---------|------|--------|------|
| **注册** | ✅ | ✅ | 推荐人必须是节点 |
| **购买节点** | ✅ | ✅ | A/B/C三种卡牌 |
| **入金** | ✅ | ✅ | 50%动态+50%LP |
| **出金** | ✅ | ✅ | 6%手续费 |
| **节点达标** | ✅ | ✅ | 5/10/20条线 |
| **地址限制** | ✅ | ✅ | 禁止领取奖励 |
| **动态奖金** | ✅ | ✅ | 直推30%+见点15%+管理30% |
| **LP质押分红** | ✅ | ✅ | 按份额分配 |
| **NFT分红** | ✅ | ✅ | 需达标才能领取 |
| **团队分红** | ✅ | ✅ | D1-D8分级 |
| **合伙人** | ✅ | ✅ | 白名单管理 |
| **单币质押** | ✅ | ✅ | 30/90/180/360天 |
| **爆块机制** | ✅ | ✅ | 1.3%日释放 |
| **BEP20兑换** | ✅ | ✅ | 买卖DQ |

---

## 🔧 简化内容

### 1. 入金上限机制简化
原版有复杂的前期控进逻辑：
```javascript
// 原版: 分阶段控制
if (phase < 2) return INVEST_MIN;
if (phase < 4) return 15 ether;
// ...
```

简化版: 动态递增
```javascript
uint256 max = INVEST_MAX_START + phase * INVEST_MAX_STEP;
if (max > INVEST_MAX_FINAL) max = INVEST_MAX_FINAL;
```

### 2. LP质押简化
- 原版: 有完整的LPStake结构（amount, startTime, rewardDebt）
- 精简版: 直接用份额计算（totalLPShares, lpAccPerShare）

### 3. 单币质押简化
- 原版: 有完整的质押周期锁定逻辑
- 精简版: 简化了质押/解除质押的流程

---

## 📝 部署参数

### 构造函数参数
```javascript
constructor(address _foundationWallet)
```
- `_foundationWallet`: 基金会钱包地址（接收5%爆块分红）

### 合约地址
```
BEP20代币: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
主合约:    待部署
```

---

## 🎯 与原版制度对比

| 制度要求 | 精简版实现 |
|---------|-----------|
| SOL进SOL出 | ✅ BEP20代币入金/出金 |
| 50%动态+50%LP | ✅ deposit函数 |
| 节点达标5/10/20线 | ✅ checkNodeQualified |
| 地址限制 | ✅ restrictAddress |
| 首次入金需节点 | ✅ onlyCanDeposit |
| 节点关系链入金 | ✅ _hasNodeInUpline |
| 能量值6倍 | ✅ user.energy += amount * 6 |
| 动态奖金扣能量值 | ✅ 直接扣减energy |

---

## ⚠️ 注意事项

1. **部署前**需设置 `foundationWallet`（基金会钱包）
2. **部署后**需通过 `addPartnerBatch` 添加合伙人白名单
3. **节点达标**是领取NFT分红的前提条件
4. **地址限制**会阻止所有奖励领取和DQ卖出
