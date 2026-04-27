# DQProject 合约部署与使用指南

## 📋 目录
1. [部署前准备](#1-部署前准备)
2. [合约部署](#2-合约部署)
3. [初始配置](#3-初始配置)
4. [初始节点用户添加](#4-初始节点用户添加)
5. [合伙人白名单配置](#5-合伙人白名单配置)
6. [地址限制管理](#6-地址限制管理)
7. [用户入金顺序](#7-用户入金顺序)
8. [日常运营操作](#8-日常运营操作)
9. [常用API查询](#9-常用api查询)

---

## 1. 部署前准备

### 1.1 确认环境
```bash
# 确保已安装 Node.js >= 16
node --version

# 安装依赖
cd /workspace/projects/contracts
npm install
```

### 1.2 配置 .env 文件
```bash
# 创建 .env 文件
cat > .env << EOF
BSC_RPC_URL=https://bsc-dataseed.binance.org/
PRIVATE_KEY=你的私钥
FOUNDATION_WALLET=基金会钱包地址
ETHERSCAN_API_KEY=你的API密钥（可选）
EOF
```

### 1.3 编译合约
```bash
npx hardhat compile
```

---

## 2. 合约部署

### 2.1 部署脚本
创建 `scripts/deploy.js`:
```javascript
const hre = require("hardhat");

async function main() {
  const FOUNDATION_WALLET = process.env.FOUNDATION_WALLET;
  
  console.log("Deploying DQProject Simplified...");
  
  const DQProject = await hre.ethers.getContractFactory("DQProjectSimplified");
  const contract = await DQProject.deploy(FOUNDATION_WALLET);
  
  await contract.deployed();
  console.log("DQProject deployed to:", contract.address);
  
  // 记录部署信息
  console.log({
    address: contract.address,
    foundationWallet: FOUNDATION_WALLET,
    timestamp: new Date().toISOString()
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 2.2 执行部署
```bash
npx hardhat run scripts/deploy.js --network bsc
```

### 2.3 部署输出示例
```
Deploying DQProject Simplified...
DQProject deployed to: 0x1234...abcd
{
  address: "0x1234...abcd",
  foundationWallet: "0x5678...efgh",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

---

## 3. 初始配置

### 3.1 确认合约状态
```javascript
// 连接合约
const contract = await ethers.getContractAt(
  "DQProjectSimplified", 
  "0x合约地址"
);

// 查看初始状态
const owner = await contract.owner();
const startTime = await contract.startTime();
const foundationWallet = await contract.foundationWallet();

console.log({ owner, startTime, foundationWallet });
```

### 3.2 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `startTime` | 合约启动时间 | 部署时 |
| `investMin` | 最小入金 | 0.1 BNB |
| `investMaxStart` | 初始最大入金 | 10 BNB |
| `investMaxFinal` | 最终最大入金 | 200 BNB |
| `dailyReleaseRate` | 日释放率 | 1.3% |
| `burnRate` | 初始销毁率 | 80% |

---

## 4. 初始节点用户添加

### ⚠️ 重要：添加顺序

**必须先添加节点用户，再让普通用户注册！**

### 4.1 创建初始节点列表

准备 `initial-nodes.json`:
```json
{
  "foundation": [
    {
      "address": "0xOwner地址",
      "cardType": 3,
      "referrer": "0x0000000000000000000000000000000000000000"
    }
  ],
  "teamA": [
    {
      "address": "0x节点A地址",
      "cardType": 1,
      "referrer": "0xOwner地址"
    },
    {
      "address": "0x节点B地址",
      "cardType": 2,
      "referrer": "0xOwner地址"
    },
    {
      "address": "0x节点C地址",
      "cardType": 3,
      "referrer": "0xOwner地址"
    }
  ]
}
```

### 4.2 批量添加初始节点脚本
```javascript
// scripts/add-initial-nodes.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const contract = await ethers.getContractAt(
    "DQProjectSimplified",
    "0x合约地址"
  );
  
  const initialNodes = JSON.parse(
    fs.readFileSync("./initial-nodes.json", "utf8")
  );
  
  // 先添加基金会节点
  console.log("Adding foundation node...");
  for (const node of initialNodes.foundation) {
    await contract.addInitialNode(
      node.address,
      node.referrer,
      node.cardType,
      { gasLimit: 500000 }
    );
    console.log(`  Added: ${node.address} (Type ${node.cardType})`);
  }
  
  // 批量添加团队节点（分批次，每批20个）
  const BATCH_SIZE = 20;
  for (const group of ["teamA", "teamB", "teamC"]) {
    if (!initialNodes[group]) continue;
    
    const nodes = initialNodes[group];
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const addresses = batch.map(n => n.address);
      const types = batch.map(n => n.cardType);
      
      await contract.addInitialNodeBatch(addresses, types, { gasLimit: 1000000 });
      console.log(`Added batch ${Math.floor(i / BATCH_SIZE) + 1}: ${addresses.length} nodes`);
    }
  }
  
  console.log("Initial nodes added successfully!");
  
  // 验证添加结果
  const totalNodes = await contract.getTotalNodes();
  console.log(`Total nodes: ${totalNodes}`);
}

main().catch(console.error);
```

### 4.3 执行添加
```bash
npx hardhat run scripts/add-initial-nodes.js --network bsc
```

### 4.4 节点添加后验证
```javascript
// 查询节点信息
const nodeInfo = await contract.getNodeInfo("0x节点地址");
console.log({
  cardType: nodeInfo.cardType.toString(),
  cardCount: nodeInfo.cardCount.toString(),
  qualifiedLines: nodeInfo.qualifiedLines.toString(),
  requiredLines: nodeInfo.requiredLines.toString(),
  isQualified: nodeInfo.isQualified
});

// 查看各类型节点数量
const stats = await contract.getNodeStats();
console.log({
  totalA: stats.totalA.toString(),
  totalB: stats.totalB.toString(),
  totalC: stats.totalC.toString()
});
```

---

## 5. 合伙人白名单配置

### 5.1 合伙人要求
| 席位 | 直推销售额要求 | 节点要求 |
|------|---------------|---------|
| 前20席 | 30,000 BNB | A/B/C任一 |
| 后30席 | 50,000 BNB | A/B/C任一 |

### 5.2 添加合伙人
```javascript
// 单个添加
await contract.addPartner("0x合伙人地址", { gasLimit: 200000 });

// 批量添加
const partners = [
  "0x地址1",
  "0x地址2",
  "0x地址3"
];
await contract.addPartnerBatch(partners, { gasLimit: 500000 });
```

### 5.3 验证合伙人
```javascript
const isPartner = await contract.isPartner("0x地址");
const partnerCount = await contract.partnerCount();
console.log({ isPartner, partnerCount });
```

---

## 6. 地址限制管理

### 6.1 限制地址
```javascript
// 限制单个地址
await contract.restrictAddress("0x被限制地址", { gasLimit: 100000 });

// 批量限制
const addresses = ["0x地址1", "0x地址2"];
await contract.restrictAddressBatch(addresses, { gasLimit: 300000 });
```

### 6.2 解除限制
```javascript
await contract.unrestrictAddress("0x地址", { gasLimit: 100000 });
```

### 6.3 查询限制状态
```javascript
const isRestricted = await contract.isRestricted("0x地址");
const restrictedCount = await contract.getRestrictedCount();
console.log({ isRestricted, restrictedCount });
```

### 6.4 被限制地址的影响
| 功能 | 限制后影响 |
|------|-----------|
| 领取LP分红 | ❌ 禁止 |
| 领取NFT分红 | ❌ 禁止 |
| 领取团队分红 | ❌ 禁止 |
| 领取合伙人收益 | ❌ 禁止 |
| 领取动态奖金 | ❌ 禁止 |
| 出金提现 | ❌ 禁止 |
| DQ换BEP20 | ❌ 禁止 |

---

## 7. 用户入金顺序

### 7.1 入金流程图
```
┌─────────────────────────────────────────────────────────────┐
│                      用户注册流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. [推荐人必须是节点]                                       │
│     └── 用户A 推荐 用户B                                     │
│         └── 推荐人A必须是A/B/C卡持有者                        │
│                                                             │
│  2. [注册]                                                  │
│     └── register(referrer)                                  │
│         └── 用户B注册成功，成为用户A的直接下线                │
│                                                             │
│  3. [首次入金]                                              │
│     └── 用户B必须是节点（A/B/C卡）                            │
│         └── deposit(amount)                                 │
│                                                             │
│  4. [后续入金]                                              │
│     └── 用户B可以是任意用户（只需在节点关系链下）              │
│         └── deposit(amount)                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 入金条件检查
```javascript
// 查询用户入金状态
const canDeposit = await contract.canDeposit("0x用户地址");
console.log({ canDeposit });

// 查询推荐人是否为节点
const referrer = await contract.getUserReferrer("0x用户地址");
const referrerHasNode = await contract.hasNodeInUpline(referrer);
console.log({ referrer, referrerHasNode });
```

### 7.3 入金限制规则
| 条件 | 要求 | 说明 |
|------|------|------|
| 注册推荐人 | 必须是节点 | A/B/C任一卡牌 |
| 首次入金 | 自身必须是节点 | 用户需先购买节点 |
| 后续入金 | 在节点关系链下 | 不要求直推是节点 |
| 入金上限 | 动态递增 | 初始10BNB，每15天+10BNB |

### 7.4 用户入金示例
```javascript
// 检查入金条件
const userStatus = await contract.getDepositStatus("0x用户地址");
console.log({
  isRegistered: userStatus.isRegistered,
  hasDeposited: userStatus.hasDeposited,
  hasNode: userStatus.hasNode,
  canDeposit: userStatus.canDeposit,
  currentMax: hre.ethers.utils.formatEther(userStatus.currentMax)
});

// 执行入金
await contract.deposit(hre.ethers.utils.parseEther("1"), { value: hre.ethers.utils.parseEther("1") });
```

---

## 8. 日常运营操作

### 8.1 爆块操作（每日）
```javascript
// 执行爆块 - 分配当日收益
await contract.blockMining({ gasLimit: 500000 });
console.log("Block mining executed!");
```

### 8.2 紧急操作
```javascript
// 暂停合约
await contract.pause({ gasLimit: 200000 });

// 恢复合约
await contract.unpause({ gasLimit: 200000 });

// 提取BNB（紧急）
await contract.adminWithdrawBNB(amount, { gasLimit: 100000 });

// 提取BEP20代币
await contract.adminWithdrawBEP20(amount, { gasLimit: 100000 });
```

### 8.3 配置调整
```javascript
// 调整入金上限参数（谨慎使用）
await contract.updateInvestParams(
  ethers.utils.parseEther("0.1"),  // min
  ethers.utils.parseEther("15"),    // startMax
  ethers.utils.parseEther("200"),   // finalMax
  86400 * 15,                       // 15天
  { gasLimit: 200000 }
);
```

---

## 9. 常用API查询

### 9.1 合约信息
```javascript
// 合约余额
const bnbBalance = await contract.getContractBalance();
const bep20Balance = await contract.getBEP20Balance();

// 节点统计
const nodeStats = await contract.getNodeStats();

// 合伙人统计
const partnerCount = await contract.partnerCount();

// 限制地址统计
const restrictedCount = await contract.getRestrictedCount();
```

### 9.2 用户信息
```javascript
// 完整用户信息
const userInfo = await contract.getFullUserInfo("0x地址");
console.log({
  referrer: userInfo.referrer,
  totalInvest: ethers.utils.formatEther(userInfo.totalInvest),
  directCount: userInfo.directCount.toString(),
  level: userInfo.level.toString(),
  energy: ethers.utils.formatEther(userInfo.energy),
  lpShares: userInfo.lpShares.toString()
});

// 节点达标状态
const nodeInfo = await contract.getNodeInfo("0x地址");
console.log({
  cardType: nodeInfo.cardType.toString(),
  qualifiedLines: nodeInfo.qualifiedLines.toString(),
  requiredLines: nodeInfo.requiredLines.toString(),
  isQualified: nodeInfo.isQualified
});

// 领取待结算收益
const pending = await contract.getPendingRewards("0x地址");
console.log({
  lpPending: ethers.utils.formatEther(pending.lpPending),
  nftPending: ethers.utils.formatEther(pending.nftPending),
  teamPending: ethers.utils.formatEther(pending.teamPending),
  dynamicPending: ethers.utils.formatEther(pending.dynamicPending)
});
```

### 9.3 节点达标查询
```javascript
// 检查达标状态
const qualified = await contract.checkNodeQualified("0x地址");
console.log({
  isQualified: qualified.qualified,
  currentLines: qualified.currentLines.toString(),
  requiredLines: qualified.requiredLines.toString()
});
```

---

## 📞 故障排除

### 问题1：入金失败 "no node in upline"
**原因**: 推荐人的上线没有节点
**解决**: 确保推荐人购买了A/B/C任一节点卡

### 问题2：入金失败 "first deposit requires node"
**原因**: 用户首次入金但自身不是节点
**解决**: 用户需先购买节点卡，再进行首次入金

### 问题3：领取分红失败 "node not qualified"
**原因**: 节点未达标（直推入金线不够）
**解决**: 发展下线，达到所需达标线（5/10/20条）

### 问题4：领取分红失败 "address restricted"
**原因**: 地址被限制
**解决**: 联系管理员执行 `unrestrictAddress`

---

## 📊 运营数据看板

建议每日记录以下数据：

| 指标 | 命令 | 记录时间 |
|------|------|---------|
| 合约BNB余额 | `getContractBalance()` | 每日00:00 |
| 合约BEP20余额 | `getBEP20Balance()` | 每日00:00 |
| 节点总数 | `getTotalNodes()` | 每日00:00 |
| 合伙人总数 | `partnerCount()` | 每日00:00 |
| 限制地址数 | `getRestrictedCount()` | 每日00:00 |
| 最后爆块时间 | `lastBlockTime()` | 每日00:00 |
