# DQProject 智能合约完整教程

## 概述

DQProject 是一个基于 **Solana 区块链**的 DeFi 量化平台智能合约。使用 Anchor Framework 开发，实现了代币兑换、质押分红、节点购买等完整功能。

---

## 技术架构

| 项目 | 技术选型 |
|------|----------|
| **公链** | Solana |
| **开发语言** | Rust |
| **开发框架** | Anchor 0.30.0 |
| **代币标准** | SPL Token |
| **NFT 标准** | SPL Token (Metaplex 兼容) |
| **DEX** | Raydium V2 |
| **程序 ID** | `DQProject111111111111111111111111111111111` |

---

## 代币信息

| 属性 | 值 |
|------|-----|
| **代币名称** | DQ (DeepQuest Token) |
| **代币符号** | DQ |
| **代币总量** | 1,000,000,000,000 (1000亿) |
| **小数位数** | 9 |
| **入金代币** | SOL (原生 SOL) |
| **出金代币** | SOL (通过 Raydium DEX) |
| **初始价格** | 1 DQ = 1,000,000,000 lamports (1 SOL) |

---

## 质押周期与收益率

| period_index | 周期 | 年化收益率 |
|--------------|------|-----------|
| 0 | 30 天 | 5% |
| 1 | 90 天 | 10% |
| 2 | 180 天 | 15% |
| 3 | 360 天 | 20% |

---

## 节点卡牌

| 卡牌类型 | 价格 (SOL) | 权重 | LP分配 | NFT池 | 运营 |
|---------|-----------|------|--------|-------|------|
| A 级 | 500 | 4 | 60% | 15% | 25% |
| B 级 | 1000 | 5 | 60% | 15% | 25% |
| C 级 | 3000 | 6 | 60% | 15% | 25% |

---

## 爆块机制

每 24 小时执行一次，分发 DQ 代币奖励：

| 分配对象 | 比例 |
|----------|------|
| LP 质押池 | 60% |
| NFT 分红池 | 15% |
| 基金会 | 5% |
| 团队池 | 14% |
| 合伙人池 | 6% |

---

## 账户 PDA 地址

| 账户 | 种子 | 说明 |
|------|------|------|
| GlobalState | `global_state` | 全局配置 |
| LpPool | `lp_pool` | LP 质押池 |
| NftPool | `nft_pool` | NFT 分红池 |
| TeamPool | `team_pool` | 团队分红池 |
| PartnerPool | `partner_pool` | 合伙人池 |
| DqMint | `dq_mint` | DQ 代币 Mint |
| SolVault | `sol_vault` | SOL 托管账户 |
| NftMintA/B/C | `nft_mint` + type | NFT 卡牌 Mint |

---

## TypeScript SDK 使用

### 初始化

```typescript
import * as anchor from "@project-serum/anchor";
import { Program, PublicKey } from "@solana/web3.js";
import { DqProject } from "./idl/dq_project";

const programID = new PublicKey("DQProject111111111111111111111111111111111");

const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
const program = new Program<DqProject>(idl, programID, provider);
```

### 获取 PDA

```typescript
import { PublicKey } from "@solana/web3.js";

const [globalState] = await PublicKey.findProgramAddress(
  [Buffer.from("global_state")],
  programID
);

const [solVault] = await PublicKey.findProgramAddress(
  [Buffer.from("sol_vault")],
  programID
);

const [dqMint] = await PublicKey.findProgramAddress(
  [Buffer.from("dq_mint")],
  programID
);

// 用户相关 PDA
const [userState] = await PublicKey.findProgramAddress(
  [Buffer.from("user"), userPublicKey.toBuffer()],
  programID
);

const [stakeState] = await PublicKey.findProgramAddress(
  [Buffer.from("stake"), userPublicKey.toBuffer()],
  programID
);
```

---

## 核心功能 API

### 1. 初始化合约

```typescript
// 初始化全局状态
await program.methods
  .initialize(new anchor.BN(1_000_000_000)) // 1 DQ = 1 SOL
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
    lpPool: lpPoolPda,
    nftPool: nftPoolPda,
    teamPool: teamPoolPda,
    partnerPool: partnerPoolPda,
    dqMint: dqMintPda,
    solVault: solVaultPda,
    nftMintA: nftMintAPda,
    nftMintB: nftMintBPda,
    nftMintC: nftMintCPda,
  })
  .signers([admin])
  .rpc();
```

### 2. 注册用户

```typescript
await program.methods
  .register(referrerPublicKey)
  .accounts({
    owner: user.publicKey,
    userState: userStatePda,
    referrer: referrerPublicKey,
    referrerState: referrerStatePda,
    admin: admin.publicKey,
  })
  .signers([user])
  .rpc();
```

### 3. 入金: SOL → DQ

```typescript
await program.methods
  .swapSolForDq(new anchor.BN(1_000_000_000)) // 1 SOL
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    userState: userStatePda,
    dqMint: dqMintPda,
    solVault: solVaultPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

### 4. 出金: DQ → SOL

```typescript
await program.methods
  .swapDqForSol(
    new anchor.BN(1_000_000_000), // DQ 数量
    new anchor.BN(900_000_000)    // 最小收到 SOL (防止滑点)
  )
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    dqMint: dqMintPda,
    solVault: solVaultPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

### 5. 质押 DQ

```typescript
await program.methods
  .stakeDq(
    new anchor.BN(100_000_000_000), // 质押 100 DQ
    0                                // 30 天周期
  )
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    stakeState: stakeStatePda,
    stakeAccount: stakeAccountPda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

### 6. 提取质押

```typescript
await program.methods
  .unstakeDq(0) // 提取 30 天周期质押
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    stakeState: stakeStatePda,
    stakeAccount: stakeAccountPda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

### 7. 领取质押分红

```typescript
await program.methods
  .claimStakeReward(0) // 领取 30 天周期分红
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    stakeState: stakeStatePda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

### 8. 购买节点 NFT

```typescript
await program.methods
  .buyNode(1) // 购买 A 级节点
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    userState: userStatePda,
    solVault: solVaultPda,
    userLamports: userAccount,
    lpPool: lpPoolPda,
    nftPool: nftPoolPda,
    nftMintA: nftMintAPda,
    nftMintB: nftMintBPda,
    nftMintC: nftMintCPda,
    userNftAccount: userNftPda,
  })
  .signers([user])
  .rpc();
```

### 9. 爆块

```typescript
await program.methods
  .blockMining()
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
    dqMint: dqMintPda,
    solVault: solVaultPda,
    lpPool: lpPoolPda,
    nftPool: nftPoolPda,
    teamPool: teamPoolPda,
    partnerPool: partnerPoolPda,
    fundAccount: fundAccount,
  })
  .signers([admin])
  .rpc();
```

### 10. 领取各项奖励

```typescript
// 领取 LP 分红
await program.methods
  .claimLpReward()
  .accounts({ ... })
  .signers([user])
  .rpc();

// 领取 NFT 分红
await program.methods
  .claimNftReward()
  .accounts({ ... })
  .signers([user])
  .rpc();

// 领取团队分红
await program.methods
  .claimTeamReward()
  .accounts({ ... })
  .signers([user])
  .rpc();

// 领取合伙人奖励
await program.methods
  .claimPartnerReward()
  .accounts({ ... })
  .signers([user])
  .rpc();

// 领取推荐奖励
await program.methods
  .claimReferralReward()
  .accounts({ ... })
  .signers([user])
  .rpc();
```

### 11. 管理员功能

```typescript
// 设置 DQ 价格
await program.methods
  .setPrice(new anchor.BN(1_200_000_000)) // 1 DQ = 1.2 SOL
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
  })
  .signers([admin])
  .rpc();

// 设置 Raydium Router
await program.methods
  .setRaydiumRouter(raydiumRouterPublicKey)
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
  })
  .signers([admin])
  .rpc();

// 提取 SOL
await program.methods
  .adminWithdrawSol(new anchor.BN(1_000_000_000))
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
    solVault: solVaultPda,
  })
  .signers([admin])
  .rpc();

// 铸造 DQ (仅限管理员)
await program.methods
  .adminMintDq(userPublicKey, new anchor.BN(100_000_000_000))
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
    dqMint: dqMintPda,
    solVault: solVaultPda,
    toTokenAccount: userTokenPda,
  })
  .signers([admin])
  .rpc();
```

---

## 事件监听

```typescript
program.addEventListener("SwapSolForDQ", (event) => {
  console.log("SOL -> DQ:", {
    user: event.user.toString(),
    solAmount: event.solAmount.toString(),
    dqAmount: event.dqAmount.toString(),
    lpShare: event.lpShare.toString(),
    timestamp: event.timestamp.toString(),
  });
});

program.addEventListener("SwapDqForSol", (event) => {
  console.log("DQ -> SOL:", {
    user: event.user.toString(),
    dqAmount: event.dqAmount.toString(),
    solAmount: event.solAmount.toString(),
    fee: event.fee.toString(),
    timestamp: event.timestamp.toString(),
  });
});

program.addEventListener("StakeDQ", (event) => {
  console.log("Stake DQ:", {
    user: event.user.toString(),
    amount: event.amount.toString(),
    periodIndex: event.periodIndex,
    timestamp: event.timestamp.toString(),
  });
});

program.addEventListener("BlockMining", (event) => {
  console.log("Block Mining:", {
    release: event.release.toString(),
    burn: event.burn.toString(),
    remaining: event.remaining.toString(),
    timestamp: event.timestamp.toString(),
  });
});
```

---

## 部署指南

### 1. 环境准备

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Solana CLI
sh -c "$(curl -sSfL "https://release.solana.com/stable/install")"

# 安装 Anchor
npm install -g @project-serum/anchor-cli

# 验证安装
anchor --version
solana --version
rustc --version
```

### 2. 配置

```bash
# 切换到 devnet
solana config set --url devnet

# 创建钱包
solana keygen new -o ~/.config/solana/id.json

# 领取空投 (devnet)
solana airdrop 2

# 查看钱包地址
solana pubkey ~/.config/solana/id.json
```

### 3. 构建

```bash
cd contracts

# 构建 Rust 程序
anchor build

# 验证构建
ls -la target/deploy/
```

### 4. 部署

```bash
# 部署程序
anchor deploy

# 获取新的 Program ID
solana program show <PROGRAM_ID>
```

### 5. 初始化

```typescript
// 使用新的 Program ID 更新 Anchor.toml 和 IDL
// 然后运行初始化脚本
npx ts-node scripts/initialize.ts
```

---

## 完整文件结构

```
contracts/
├── Cargo.toml
├── Anchor.toml
├── tsconfig.json
├── package.json
├── src/
│   └── lib.rs                    # 主程序 (Rust)
├── idl/
│   └── dq_project.json          # IDL 定义
├── programs/
│   └── dq_project/
│       └── src/
│           └── lib.rs            # 符号链接到 src/lib.rs
├── tests/
│   └── dq_project.ts             # 测试文件
├── scripts/
│   ├── initialize.ts             # 初始化脚本
│   ├── swap.ts                   # 兑换脚本
│   ├── stake.ts                  # 质押脚本
│   └── buy-node.ts               # 购买节点脚本
└── ts/
    ├── types.ts                 # TypeScript 类型定义
    └── index.ts                  # SDK 入口
```

---

## 错误代码

| 代码 | 名称 | 说明 |
|------|------|------|
| 100 | Unauthorized | 无权限 |
| 101 | InvalidPeriod | 无效周期 |
| 102 | InsufficientBalance | 余额不足 |
| 103 | InsufficientDQ | DQ 代币不足 |
| 104 | AlreadyClaimed | 已领取 |
| 105 | NotPartner | 非合伙人 |
| 106 | MaxSupplyExceeded | 超过最大供应量 |
| 107 | SlippageExceeded | 滑点超限 |
| 108 | InvalidCardType | 无效卡牌类型 |
| 109 | InvalidReferrer | 无效推荐人 |
| 110 | AlreadyRegistered | 已注册 |
| 111 | InvalidAmount | 无效金额 |
| 112 | NoStakeFound | 未找到质押 |
| 113 | TooEarlyToMine | 爆块时间未到 |
| 114 | InvalidPrice | 无效价格 |

---

## 安全建议

1. **权限控制**: 管理员使用硬件钱包，多签管理
2. **资金安全**: 大额资金使用时间锁
3. **代码审计**: 部署前完成第三方审计
4. **测试覆盖**: 充分测试各种边界情况
5. **监控告警**: 实时监控异常交易
6. **紧急预案**: 准备暂停/升级机制
