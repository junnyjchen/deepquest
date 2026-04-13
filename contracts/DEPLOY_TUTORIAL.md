# BSC 智能合约部署完整教程

## 目录

1. [环境准备](#1-环境准备)
2. [钱包准备](#2-钱包准备)
3. [项目配置](#3-项目配置)
4. [编译合约](#4-编译合约)
5. [部署到测试网](#5-部署到测试网)
6. [部署到主网](#6-部署到主网)
7. [验证合约](#7-验证合约)
8. [节点操作教程](#8-节点操作教程)

---

## 1. 环境准备

### 1.1 系统要求

| 要求 | 版本 |
|------|------|
| Node.js | >= 16.0.0 |
| pnpm / npm | 最新版本 |

### 1.2 安装 Node.js

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 安装 Node.js 18
nvm install 18
nvm use 18

# 验证安装
node --version  # v18.x.x
npm --version   # 9.x.x
```

### 1.3 安装 pnpm

```bash
npm install -g pnpm

# 验证
pnpm --version
```

---

## 2. 钱包准备

### 2.1 创建部署钱包

**方式一：使用 MetaMask 创建新钱包**

1. 安装 MetaMask 浏览器插件
2. 点击 "Create a new wallet"
3. 设置强密码
4. 保存助记词（12/24 个单词）
5. **务必安全备份助记词！**

**方式二：使用已有钱包**

```bash
# 导出私钥（MetaMask）
# 1. 点击账户头像
# 2. 选择 "Account details"
# 3. 点击 "Export private key"
# 4. 输入密码确认
# 5. 复制私钥（以 0x 开头）
```

### 2.2 获取 BNB 测试币（测试网）

1. 访问水龙头：https://testnet.binance.org/faucet-smart
2. 粘贴钱包地址
3. 点击 "Give me BNB"
4. 等待几秒，1 BNB 到账

### 2.3 获取 BNB 主网币（主网）

| 方式 | 说明 |
|------|------|
| 交易所购买 | Binance、OKX 等购买 BNB |
| 其他用户转账 | 从其他钱包转入 |

---

## 3. 项目配置

### 3.1 进入合约目录

```bash
cd /workspace/projects/contracts
```

### 3.2 安装依赖

```bash
pnpm install
```

### 3.3 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
vim .env
```

### 3.4 填写 .env 配置

```env
# ==================== RPC 配置 ====================
# BSC 主网 RPC
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org

# BSC 测试网 RPC
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545

# ==================== 私钥配置 ====================
# 部署钱包私钥（必须以 0x 开头）
# ⚠️ 警告：不要将这个文件提交到 Git！
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# ==================== API Key ====================
# BSCScan API Key（用于验证合约源代码）
# 申请地址：https://bscscan.com/apis
BSCSCAN_API_KEY=YOUR_BSCSCAN_API_KEY_HERE

# ==================== Gas 报告 ====================
REPORT_GAS=true

# ==================== 价格 API（可选）====================
COINMARKETCAP_API_KEY=YOUR_COINMARKETCAP_API_KEY_HERE
```

### 3.5 获取 BSCScan API Key

1. 访问 https://bscscan.com
2. 登录账户
3. 点击右上角头像 → "API Keys"
4. 点击 "+ Add" 创建新 Key
5. 复制 API Key 到 `.env` 文件

---

## 4. 编译合约

### 4.1 编译所有合约

```bash
pnpm compile
```

### 4.2 预期输出

```
Compiling 3 files with 0.8.17
Compilation finished successfully
```

### 4.3 编译产物

```
contracts/
├── artifacts/
│   └── DQProject.sol/
│       ├── DQProject.json      # ABI 和字节码
│       └── DQToken.json
└── cache/
    └── solidity-files-cache.json
```

---

## 5. 部署到测试网

### 5.1 检查测试网余额

```bash
# 使用 Hardhat 任务检查余额
npx hardhat balance --account 0xYOUR_ADDRESS --network bscTestnet
```

### 5.2 执行部署

```bash
pnpm deploy:bscTestnet
```

### 5.3 预期输出

```
Deploying contracts with account: 0xYOUR_ADDRESS
Account balance: 1.0 BNB

Deploying DQProject...
Transaction hash: 0x...
DQProject deployed to: 0xCONTRACT_ADDRESS

Deployment Summary:
  Network: bscTestnet
  Chain ID: 97
  Block Explorer: https://testnet.bscscan.com
```

### 5.4 记录合约地址

```
✅ DQProject 合约地址: 0x...
```

---

## 6. 部署到主网

### 6.1 安全检查清单

| 检查项 | 状态 |
|--------|------|
| 私钥已正确配置 | ☐ |
| 私钥未提交到 Git | ☐ |
| BNB 余额充足（>= 0.5 BNB） | ☐ |
| BSCScan API Key 已配置 | ☐ |
| 测试网已验证通过 | ☐ |

### 6.2 检查主网余额

```bash
npx hardhat balance --account 0xYOUR_ADDRESS --network bscMainnet
```

### 6.3 执行主网部署

```bash
pnpm deploy:bscMainnet
```

### 6.4 预期输出

```
Deploying contracts with account: 0xYOUR_ADDRESS
Account balance: 2.5 BNB

Deploying DQProject...
Transaction hash: 0xABCD1234...
Gas used: 3,500,000
Gas price: 5 Gwei
Deployment cost: 0.0175 BNB

DQProject deployed to: 0xYOUR_CONTRACT_ADDRESS

Deployment Summary:
  Network: bscMainnet
  Chain ID: 56
  Block Explorer: https://bscscan.com
```

### 6.5 记录合约地址

```
✅ 主网 DQProject 合约地址: 0x...
```

---

## 7. 验证合约

### 7.1 在 BSCScan 上验证

```bash
pnpm verify --network bscMainnet 0xYOUR_CONTRACT_ADDRESS
```

### 7.2 手动验证（通过网页）

1. 访问 https://bscscan.com
2. 搜索合约地址
3. 点击 "Contract" → "Verify and Publish"
4. 选择编译器版本：0.8.17
5. 选择优化：Enabled, runs: 200
6. 粘贴合约代码
7. 点击 "Verify"

### 7.3 验证成功标志

- 合约页面显示 "✅ Contract Verified"
- Read/Write 合约按钮变为绿色

---

## 8. 节点操作教程

### 8.1 管理员操作概述

作为合约所有者（Owner），你可以执行以下节点操作：

| 操作 | 函数 | 说明 |
|------|------|------|
| 批量添加初始节点 | `addInitialNodes` | 给用户批量发放 NFT 卡牌 |
| 更新用户等级 | 链上自动触发 | 用户购买节点时自动升级 |

### 8.2 批量添加初始节点

#### 8.2.1 交互方式

**方式一：使用 Hardhat 脚本**

```bash
npx hardhat run scripts/add-nodes.ts --network bscMainnet
```

**方式二：使用 Remix IDE**

1. 访问 https://remix.ethereum.org
2. 导入合约 ABI
3. 连接钱包
4. 调用 `addInitialNodes` 函数

**方式三：使用 JavaScript/TypeScript SDK**

```typescript
const { ethers } = require('ethers');

// 配置
const CONTRACT_ADDRESS = '0xYOUR_CONTRACT_ADDRESS';
const PRIVATE_KEY = '0xYOUR_PRIVATE_KEY';
const RPC_URL = 'https://bsc-dataseed.binance.org';

const CONTRACT_ABI = [
  "function addInitialNodes(address[] _users, uint8[] _cardTypes)"
];

async function main() {
  // 连接钱包
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // 配置节点数据
  const users = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012'
  ];

  const cardTypes = [1, 2, 3];  // A级、B级、C级

  // 执行批量添加
  console.log('开始添加初始节点...');
  const tx = await contract.addInitialNodes(users, cardTypes);
  console.log('交易哈希:', tx.hash);

  // 等待确认
  await tx.wait();
  console.log('✅ 节点添加成功!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
```

#### 8.2.2 批量添加节点脚本

创建 `scripts/add-nodes.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("===========================================");
  console.log("批量添加初始节点 NFT");
  console.log("===========================================");

  // 获取合约
  const contractAddress = "0xYOUR_CONTRACT_ADDRESS";
  const [deployer] = await ethers.getSigners();
  
  console.log("当前账户:", deployer.address);

  // 合约 ABI
  const abi = [
    "function addInitialNodes(address[] _users, uint8[] _cardTypes)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, deployer);

  // ==================== 配置节点数据 ====================
  // 在这里添加你需要发放节点的用户地址
  
  const nodes: { address: string; cardType: number }[] = [
    // 示例数据，请替换为实际数据
    // { address: "0x...", cardType: 1 },  // A级节点
    // { address: "0x...", cardType: 2 },  // B级节点
    // { address: "0x...", cardType: 3 },  // C级节点
  ];

  // ==================== 从文件读取节点数据 ====================
  // 如果节点数据很多，可以从 JSON 文件读取
  // const nodes = require('./nodes.json');

  if (nodes.length === 0) {
    console.log("❌ 没有配置节点数据！");
    console.log("请在脚本中配置 nodes 数组，或创建 nodes.json 文件。");
    return;
  }

  console.log(`\n准备添加 ${nodes.length} 个节点...`);

  const users: string[] = [];
  const cardTypes: number[] = [];

  for (const node of nodes) {
    users.push(node.address);
    cardTypes.push(node.cardType);
    console.log(`  ${node.address} -> ${getCardName(node.cardType)}`);
  }

  // 执行交易
  console.log("\n⏳ 正在提交交易...");
  
  try {
    const tx = await contract.addInitialNodes(users, cardTypes);
    console.log("📝 交易哈希:", tx.hash);
    
    console.log("⏳ 等待区块确认...");
    const receipt = await tx.wait();
    
    console.log("\n✅ 交易成功!");
    console.log("  区块:", receipt.blockNumber);
    console.log("  Gas 使用:", receipt.gasUsed.toString());
    
    // 遍历事件日志确认
    const iface = new ethers.utils.Interface(abi);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'InitialNodesAdded') {
          console.log("\n📋 事件日志:");
          console.log("  事件名:", parsed.name);
          console.log("  用户数:", parsed.args.users.length);
          console.log("  卡牌类型数:", parsed.args.cardTypes.length);
        }
      } catch (e) {
        // 忽略无法解析的日志
      }
    }

  } catch (error: any) {
    console.error("\n❌ 交易失败!");
    console.error("错误:", error.message);
  }
}

function getCardName(type: number): string {
  switch (type) {
    case 1: return "A级节点";
    case 2: return "B级节点";
    case 3: return "C级节点";
    default: return "未知";
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 8.2.3 批量添加脚本（支持 JSON 配置）

创建 `scripts/nodes.json`:

```json
{
  "nodes": [
    { "address": "0x1234567890123456789012345678901234567890", "cardType": 1, "remark": "VIP用户A" },
    { "address": "0x2345678901234567890123456789012345678901", "cardType": 2, "remark": "VIP用户B" },
    { "address": "0x3456789012345678901234567890123456789012", "cardType": 3, "remark": "钻石用户" }
  ]
}
```

创建 `scripts/batch-add-nodes.ts`:

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("===========================================");
  console.log("批量添加初始节点 NFT (从 JSON 文件)");
  console.log("===========================================\n");

  // 读取节点配置
  const configPath = path.join(__dirname, "nodes.json");
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    console.log("请创建 nodes.json 文件");
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const nodes = config.nodes || [];

  console.log(`找到 ${nodes.length} 个节点配置`);

  if (nodes.length === 0) {
    console.log("❌ 配置为空!");
    return;
  }

  // 获取合约
  const contractAddress = process.env.CONTRACT_ADDRESS || "0xYOUR_CONTRACT_ADDRESS";
  const [deployer] = await ethers.getSigners();
  
  console.log(`合约地址: ${contractAddress}`);
  console.log(`当前账户: ${deployer.address}\n`);

  // 合约 ABI
  const abi = [
    "function addInitialNodes(address[] _users, uint8[] _cardTypes) external",
    "event InitialNodesAdded(address[] users, uint8[] cardTypes)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, deployer);

  // 准备数据
  const users: string[] = [];
  const cardTypes: number[] = [];

  for (const node of nodes) {
    users.push(node.address);
    cardTypes.push(node.cardType);
    const cardName = node.cardType === 1 ? "A" : node.cardType === 2 ? "B" : "C";
    console.log(`  ${node.remark || ""} ${node.address} -> 等级${cardName}`);
  }

  // 批量添加（每批最多 50 个，避免 Gas 限制）
  const BATCH_SIZE = 50;
  let batchIndex = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    batchIndex++;
    const batchUsers = users.slice(i, i + BATCH_SIZE);
    const batchTypes = cardTypes.slice(i, i + BATCH_SIZE);

    console.log(`\n📦 批次 ${batchIndex}: 处理 ${batchUsers.length} 个节点`);

    try {
      const tx = await contract.addInitialNodes(batchUsers, batchTypes);
      console.log(`  📝 交易哈希: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ 成功! 区块: ${receipt.blockNumber}`);
      
    } catch (error: any) {
      console.error(`  ❌ 批次 ${batchIndex} 失败:`);
      console.error(`  错误: ${error.message}`);
      
      // 继续处理下一批次
      console.log("  跳过此批次，继续下一批...");
    }
  }

  console.log("\n===========================================");
  console.log("批量添加完成!");
  console.log("===========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

运行脚本：

```bash
# 设置合约地址
export CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# 运行批量添加
npx hardhat run scripts/batch-add-nodes.ts --network bscMainnet
```

### 8.3 节点等级说明

| 卡牌类型 | 等级 | 价格(USDT) | 最大发行 | 自动升级用户等级 |
|----------|------|-----------|---------|----------------|
| A | 1 | 500 | 3000 | 1 |
| B | 2 | 1000 | 1000 | 2 |
| C | 3 | 3000 | 300 | 3 |

### 8.4 查询节点信息

#### 8.4.1 查询用户节点

```typescript
// 查询用户持有的 NFT 数量
const balance = await dqCard.balanceOf(userAddress);

// 查询用户持有的 NFT 详情
for (let i = 0; i < balance; i++) {
  const tokenId = await dqCard.tokenOfOwnerByIndex(userAddress, i);
  const cardType = await dqCard.cardType(tokenId);
  console.log(`Token #${tokenId}: 类型 ${cardType}`);
}
```

#### 8.4.2 查询卡牌统计

```typescript
const totalA = await dqCard.totalA();  // A级总发行
const totalB = await dqCard.totalB();  // B级总发行
const totalC = await dqCard.totalC();  // C级总发行

console.log(`A级: ${totalA}/3000`);
console.log(`B级: ${totalB}/1000`);
console.log(`C级: ${totalC}/300`);
```

#### 8.4.3 查询用户等级

```typescript
// 获取用户完整信息
const userInfo = await dqProject.getUserInfo(userAddress);
const [
  totalInvest,
  teamInvest,
  level,        // 用户等级 (0-6)
  energy,
  lpShares,
  dLevel,       // D等级 (0-8)
  pendingRewards,
  directSales,
  isPartner     // 是否合伙人
] = userInfo;

console.log(`用户等级: ${level}`);
console.log(`D等级: ${dLevel}`);
console.log(`合伙人: ${isPartner ? '是' : '否'}`);
```

### 8.5 更新用户等级的方法

#### 方法一：购买节点（用户自主操作）

```typescript
// 用户调用此函数购买节点
await dqProject.buyNode(cardType, { value: price });

// 合约自动升级用户等级
// A级节点 -> 用户等级 1
// B级节点 -> 用户等级 2
// C级节点 -> 用户等级 3
```

#### 方法二：管理员批量设置

```typescript
// 管理员调用 addInitialNodes 会同时更新用户等级
await dqProject.addInitialNodes(
  ['0x...'],
  [1]  // A级节点 -> 用户等级自动变为 1
);
```

#### 方法三：通过入金自动升级

```typescript
// 用户入金也会触发等级检查
await dqProject.deposit(usdtAmount);

// 合约根据团队业绩自动升级用户等级
// 规则：
// - 团队小区域 >= 100 BNB -> 等级 1
// - 团队小区域 >= 200 BNB -> 等级 2
// - 团队小区域 >= 600 BNB -> 等级 3
// - 团队小区域 >= 2000 BNB -> 等级 4
// - 团队小区域 >= 6000 BNB -> 等级 5
// - 团队小区域 >= 20000 BNB -> 等级 6
```

### 8.6 常见问题

#### Q: 用户等级和 D 等级有什么区别？

| 属性 | 说明 | 触发条件 |
|------|------|----------|
| 用户等级 (level) | 影响管理奖、社群奖励等 | 团队小区域业绩 |
| D 等级 (dLevel) | 影响团队分红等级 | 有效直推人数 |
| 合伙人 (partner) | 额外 6% 爆块分红 + 30% 手续费 | 个人投资+直推销售 |

#### Q: 如何查看所有合伙人？

```typescript
// 查询合伙人数量
const partnerCount = await dqProject.partnerCount();

// 遍历合伙人列表
for (let i = 0; i < partnerCount; i++) {
  const partner = await dqProject.partnerList(i);
  console.log(`合伙人 ${i + 1}: ${partner}`);
}
```

#### Q: 节点购买失败怎么办？

检查以下内容：
1. USDT 余额是否充足
2. 是否已注册（调用过 register）
3. 卡牌是否已售罄
4. 合约是否暂停

---

## 附录：完整操作脚本

### A. 一键部署脚本

创建 `deploy-full.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "DeepQuest 合约一键部署脚本"
echo "=========================================="

# 读取配置
read -p "请输入合约地址（留空则重新部署）: " CONTRACT_ADDRESS

# 1. 安装依赖
echo "\n📦 1. 安装依赖..."
pnpm install

# 2. 编译
echo "\n🔧 2. 编译合约..."
pnpm compile

# 3. 部署
if [ -z "$CONTRACT_ADDRESS" ]; then
  echo "\n🚀 3. 部署到主网..."
  pnpm deploy:bscMainnet
else
  echo "\n⏭️  跳过部署，使用现有地址: $CONTRACT_ADDRESS"
fi

# 4. 验证
echo "\n✅ 4. 验证合约..."
if [ -z "$CONTRACT_ADDRESS" ]; then
  CONTRACT_ADDRESS=$(cat deployed-address.txt)
fi
pnpm verify --network bscMainnet $CONTRACT_ADDRESS

echo "\n=========================================="
echo "部署完成!"
echo "合约地址: $CONTRACT_ADDRESS"
echo "BSCScan: https://bscscan.com/address/$CONTRACT_ADDRESS"
echo "=========================================="
```

运行：
```bash
chmod +x deploy-full.sh
./deploy-full.sh
```

### B. 常用 Hardhat 命令

```bash
# 查看余额
npx hardhat balance --account 0x... --network bscMainnet

# 发送 BNB
npx hardhat send --from 0x... --to 0x... --amount 0.1 --network bscMainnet

# 调用合约函数
npx hardhat call --network bscMainnet --contract 0x... functionName args

# 发送交易
npx hardhat send --network bscMainnet --contract 0x... functionName args
```

---

## 技术支持

如有问题，请检查：

1. 网络连接是否正常
2. 私钥是否正确
3. 余额是否充足
4. BSCScan API Key 是否有效
