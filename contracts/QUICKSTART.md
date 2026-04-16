# DeepQuest DeFi - Solana 合约完善版

## 合约概览

| 项目 | 值 |
|------|-----|
| Program ID | DQProject111111111111111111111111111111111 |
| 代币 | DQ (1000亿, 9位小数) |
| 语言 | Rust + Anchor 0.30 |
| 状态 | ✅ 完整实现 |

## 核心功能

- ✅ SOL ↔ DQ 兑换
- ✅ DQ 质押分红 (30/90/180/360天)
- ✅ 节点 NFT (A/B/C三种)
- ✅ 推荐奖励
- ✅ 爆块分红
- ✅ 紧急暂停
- ✅ Raydium DEX 预留

## 快速开始

```bash
# 编译
anchor build

# 测试
anchor test

# 部署
./scripts/deploy.sh devnet
```

## 文件结构

```
contracts/
├── src/lib.rs          # 主合约 (2000+ 行)
├── ts/sdk.ts           # TypeScript SDK (700+ 行)
├── tests/              # 测试用例
├── docs/               # 完整文档
├── scripts/deploy.sh   # 部署脚本
└── Dockerfile          # Docker 配置
```

## 文档

- [README](./README.md) - 项目概览
- [部署指南](./docs/DEPLOYMENT.md) - 详细部署步骤
- [API 参考](./docs/API_REFERENCE.md) - 指令说明
- [Raydium 集成](./docs/RAYDIUM_INTEGRATION.md) - DEX 集成
- [更新日志](./CHANGELOG.md) - 版本历史
