# DeepQuest DeFi Platform

基于 Solana 区块链的 DeFi 量化平台智能合约。

## 项目简介

DeepQuest 是一个去中心化金融量化平台，部署在 Solana 区块链上。平台提供以下核心功能：

- **代币兑换**: SOL ↔ DQ (通过 Raydium DEX)
- **质押分红**: DQ 质押获得被动收益
- **节点NFT**: 购买节点卡牌获得额外权益
- **推荐奖励**: 邀请好友获得奖励分成

## 技术栈

- **语言**: Rust
- **框架**: Anchor 0.30.0
- **代币标准**: SPL Token
- **NFT标准**: SPL Token (Metaplex 兼容)
- **DEX**: Raydium V2
- **Program ID**: DQProject111111111111111111111111111111111

## 代币参数

| 参数 | 值 |
|------|-----|
| 代币名称 | DeepQuest |
| 代币符号 | DQ |
| 总供应量 | 1000 亿 (9位小数) |
| 价格锚定 | 1 DQ = 1,000,000,000 lamports (1 SOL) |

## 质押周期

| 周期 | 年化收益率 | 最短锁定期 |
|------|-----------|-----------|
| 30天 | 5% | 30天 |
| 90天 | 10% | 90天 |
| 180天 | 15% | 180天 |
| 360天 | 20% | 360天 |

## 节点卡牌

| 类型 | 价格 | LP分配 | NFT份额 | 运营份额 |
|------|------|--------|---------|---------|
| A | 500 SOL | 60% | 15% | 25% |
| B | 1000 SOL | 60% | 15% | 25% |
| C | 3000 SOL | 60% | 15% | 25% |

## 项目结构

```
contracts/
├── Anchor.toml           # Anchor 配置文件
├── Cargo.toml           # Rust 依赖
├── package.json         # Node.js 依赖
├── ts/                  # TypeScript SDK
│   ├── sdk.ts          # 主 SDK
│   └── types.ts        # 类型定义
├── src/                 # Rust 合约源码
│   └── lib.rs          # 主程序
├── tests/               # 测试文件
│   └── dq_project.ts   # Anchor 测试
├── idl/                 # IDL 文件
│   └── dq_project.json
└── docs/               # 文档
    ├── DEPLOYMENT.md   # 部署指南
    ├── RAYDIUM_INTEGRATION.md  # DEX 集成
    └── API_REFERENCE.md # API 参考
```

## 快速开始

### 环境要求

- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.30.0+
- Node.js 18+

### 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 安装 Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# 安装项目依赖
cd contracts
yarn install
```

### 本地开发

```bash
# 启动本地验证器
solana-test-validator

# 运行测试
anchor test

# 构建程序
anchor build
```

### 测试网部署

```bash
# 配置测试网
solana config set --url devnet

# 获取测试 SOL
solana airdrop 2

# 部署
anchor deploy --provider.cluster devnet

# 初始化
# 使用 scripts/initialize.ts 或 SDK
```

## 使用 SDK

```typescript
import * as anchor from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { DQProjectSDK } from "./ts/sdk";

// 初始化
const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.fromSeed(/* 你的种子 */);
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
const sdk = new DQProjectSDK(provider);

// 初始化合约
await sdk.initialize(new anchor.BN(1_000_000_000)); // 1 DQ = 1 SOL

// 注册用户
await sdk.register(PublicKey.default); // 无推荐人
await sdk.register(referrerPublicKey);   // 有推荐人

// SOL 换 DQ
await sdk.swapSolForDq(new anchor.BN(1_000_000_000)); // 1 SOL

// 质押 DQ
await sdk.stakeDq(new anchor.BN(100_000_000_000), 0); // 100 DQ, 30天

// 购买节点
await sdk.buyNode(1); // 购买 A 类节点

// 领取奖励
await sdk.claimLpReward();
await sdk.claimStakeReward(0);
```

## 主要指令

| 指令 | 描述 | 权限 |
|------|------|------|
| `initialize` | 初始化合约 | Admin |
| `register` | 注册用户 | Public |
| `swap_sol_for_dq` | SOL 换 DQ | Public |
| `swap_dq_for_sol` | DQ 换 SOL | Public |
| `stake_dq` | 质押 DQ | Public |
| `unstake_dq` | 解除质押 | Public |
| `buy_node` | 购买节点 | Public |
| `block_mining` | 爆块分红 | Admin |
| `claim_*` | 领取奖励 | Public |
| `pause` | 暂停合约 | Admin |
| `unpause` | 恢复合约 | Admin |
| `set_price` | 设置价格 | Admin |

## 合约安全

- **PDA 派生**: 所有关键账户使用 Program Derived Address
- **权限验证**: 所有修改操作需要管理员签名
- **紧急暂停**: 支持紧急暂停所有交易
- **输入验证**: 严格的参数检查和边界验证
- **代币安全**: 使用 SPL Token 标准，支持代币冻结

## 文档

- [部署指南](./docs/DEPLOYMENT.md)
- [Raydium 集成](./docs/RAYDIUM_INTEGRATION.md)
- [API 参考](./docs/API_REFERENCE.md)

## 浏览器

- **Solana Explorer**: https://explorer.solana.com/
- **Solana FM**: https://solana.fm/

## 许可证

MIT License

## 联系方式

- 官方网站: https://deepquest.io
- Discord: https://discord.gg/deepquest
- Twitter: @DeepQuestDeFi
