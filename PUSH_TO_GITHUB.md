# DeepQuest DeFi Platform

基于 Solana 区块链的 DeFi 量化平台。

## 项目结构

```
deepquest/
├── client/          # React Native 前端 (Expo)
├── server/          # Express.js 后端
├── contracts/        # Solana Anchor 智能合约
└── docs/            # 文档
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev

# 运行测试
pnpm test
```

## 技术栈

- **前端**: React Native + Expo + TypeScript
- **后端**: Express.js + TypeScript
- **区块链**: Solana + Anchor (Rust)
- **数据库**: Supabase (PostgreSQL)
- **样式**: Tailwind CSS

## GitHub 推送

```bash
git remote set-url origin https://github.com/junnyjchen/deepquest.git
git push -u origin main --force
```

## 许可证

MIT License
