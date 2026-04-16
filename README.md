# DQProject - DeepQuest DeFi Platform

## 项目概览

DQProject 是一个基于 **Solana 区块链**的 DeFi 量化平台，包含智能合约和 Web 管理后台。

---

## 技术架构

### 智能合约 (Solana)

| 项目 | 技术选型 |
|------|----------|
| **公链** | Solana |
| **语言** | Rust |
| **框架** | Anchor 0.30.0 |
| **代币** | SPL Token |
| **NFT** | SPL Token (Metaplex) |
| **DEX** | Raydium V2 |
| **Program ID** | `DQProject111111111111111111111111111111111` |

### Web 管理后台 (可选)

| 项目 | 技术选型 |
|------|----------|
| **前端** | Expo + React Native |
| **后端** | Express.js |
| **样式** | TailwindCSS |

---

## 智能合约目录结构

```
contracts/
├── src/
│   └── lib.rs                 # Anchor/Rust 主程序
├── Cargo.toml                  # Rust 依赖
├── Anchor.toml                 # Anchor 配置
├── idl/
│   └── dq_project.json        # IDL 定义
├── tests/                     # 测试文件
├── scripts/                   # 部署脚本
└── README.md                  # 合约说明
```

---

## 代币信息

| 属性 | 值 |
|------|-----|
| **代币名称** | DQ (DeepQuest Token) |
| **代币总量** | 1,000,000,000,000 (1000亿) |
| **小数位数** | 9 |
| **入金代币** | SOL |
| **价格** | 1 DQ = 1,000,000,000 lamports (1 SOL) |

---

## 核心功能

### 1. 代币兑换

| 方向 | 说明 |
|------|------|
| **入金** | SOL → DQ (30% LP, 70% 运营) |
| **出金** | DQ → SOL (通过 Raydium DEX, 6% 手续费) |

### 2. 质押分红

| 周期 | 年化收益率 |
|------|-----------|
| 30 天 | 5% |
| 90 天 | 10% |
| 180 天 | 15% |
| 360 天 | 20% |

### 3. 节点卡牌

| 类型 | 价格 | 权重 |
|------|------|------|
| A 级 | 500 SOL | 4 |
| B 级 | 1000 SOL | 5 |
| C 级 | 3000 SOL | 6 |

### 4. 爆块机制

每 24 小时分发 DQ 奖励：

| 分配 | 比例 |
|------|------|
| LP 池 | 60% |
| NFT 池 | 15% |
| 基金会 | 5% |
| 团队池 | 14% |
| 合伙人池 | 6% |

---

## 文档

- [智能合约教程](./docs/TUTORIAL.md) - 完整的 API 和使用指南
- [迁移指南](./docs/MIGRATION.md) - BSC → Solana 迁移说明

---

## 开发指南

### 环境准备

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Solana CLI
sh -c "$(curl -sSfL 'https://release.solana.com/stable/install')"

# 安装 Anchor
npm install -g @project-serum/anchor-cli
```

### 构建

```bash
cd contracts
anchor build
```

### 部署

```bash
# 切换到 devnet
solana config set --url devnet

# 部署
anchor deploy
```

### 测试

```bash
anchor test
```

---

## 重要地址 (Devnet)

| 合约/程序 | 地址 |
|-----------|------|
| **DQProject Program** | `DQProject111111111111111111111111111111111` |
| **DQ Token** | (部署后生成) |
| **SOL Vault** | (部署后生成) |

---

## Web 管理后台

如需部署 Web 管理后台，参考以下目录：

```
client/    # Expo + React Native 前端
server/    # Express.js 后端
```

---

## 许可证

MIT
