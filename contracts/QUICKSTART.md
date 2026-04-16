# DeepQuest DeFi - Solana Contracts

基于 Solana 区块链的 DeFi 量化平台智能合约。

## 快速开始

```bash
# 安装依赖
yarn install

# 编译
anchor build

# 测试
anchor test

# 部署
./scripts/deploy.sh devnet
```

## 项目结构

```
contracts/
├── src/lib.rs           # 合约主程序 (2031 行)
├── ts/
│   ├── sdk.ts          # TypeScript SDK (769 行)
│   └── types.ts        # 类型定义
├── tests/dq_project.ts  # 测试用例 (413 行)
├── idl/dq_project.json  # IDL 定义
├── docs/                # 文档
│   ├── DEPLOYMENT.md    # 部署指南
│   ├── API_REFERENCE.md # API 参考
│   └── RAYDIUM_INTEGRATION.md
├── scripts/deploy.sh    # 部署脚本
├── Dockerfile           # Docker 配置
├── Anchor.toml          # Anchor 配置
├── Cargo.toml           # Rust 依赖
└── package.json         # Node 依赖
```

## 核心功能

| 功能 | 说明 |
|------|------|
| 代币兑换 | SOL ↔ DQ (Raydium DEX) |
| 质押分红 | 30/90/180/360 天周期 |
| 节点 NFT | A/B/C 三种卡牌 |
| 推荐奖励 | 多级邀请分红 |
| 紧急暂停 | 安全保护机制 |

## 技术参数

- **Program ID**: DQProject111111111111111111111111111111111
- **代币**: DQ (1000亿, 9位小数)
- **价格**: 1 DQ = 1 SOL
- **框架**: Anchor 0.30.0 + Rust

## 文档

- [README](./README.md) - 完整项目说明
- [部署指南](./docs/DEPLOYMENT.md) - 详细部署步骤
- [API 参考](./docs/API_REFERENCE.md) - 指令和参数说明
- [Raydium 集成](./docs/RAYDIUM_INTEGRATION.md) - DEX 集成指南
