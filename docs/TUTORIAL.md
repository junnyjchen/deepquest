# DQProject 智能合约教程

## 概述

DQProject 是一个基于 **Solana 区块链**的 DeFi 量化平台智能合约。使用 Anchor 框架开发，实现了代币兑换、质押分红、节点购买等功能。

---

## 技术架构

| 项目 | 技术选型 |
|------|----------|
| **公链** | Solana |
| **开发框架** | Anchor (Rust) |
| **代币标准** | SPL Token |
| **DEX** | Raydium V2 |
| **NFT 标准** | Metaplex (SPL Token) |
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
| **价格锚定** | 1 DQ = dq_price lamports (可调) |

---

## 核心地址

| 合约/程序 | Solana 地址 |
|-----------|-------------|
| **DQProject Program** | `DQProject111111111111111111111111111111111` |
| **DQ Token Mint** | PDA: `state.dq_mint` |
| **SOL Vault** | PDA: `sol_vault` |
| **Raydium V2** | (待配置) |

---

## 账户结构

### 全局状态 (GlobalState)

```rust
pub struct GlobalState {
    pub admin: Pubkey,           // 管理员地址
    pub dq_mint: Pubkey,         // DQ 代币 Mint
    pub sol_vault: Pubkey,      // SOL 托管账户
    pub operation_pool: Pubkey, // 运营池
    pub lp_pool: Pubkey,        // LP 质押池
    pub nft_mint_a/b/c: Pubkey,  // NFT 卡牌 Mint
    pub raydium_router: Pubkey,  // Raydium 路由
    pub dq_price: u64,          // DQ 价格 (lamports)
    pub total_supply: u64,       // 总量
    pub circulating_supply: u64,// 流通量
    pub daily_release_rate: u64,// 日释放率 (基点)
    pub last_block_time: i64,   // 上次爆块时间
    pub burn_rate: u64,         // 燃烧率 (基点)
    pub partner_count: u64,     // 合伙人数量
}
```

### 用户状态 (UserState)

```rust
pub struct UserState {
    pub owner: Pubkey,           // 用户地址
    pub referrer: Pubkey,       // 推荐人
    pub direct_count: u64,      // 直推人数
    pub level: u8,               // 等级 (1-6)
    pub total_invest: u64,      // 总投资 (lamports)
    pub team_invest: u64,       // 团队投资
    pub energy: u64,             // 能量值
    pub lp_shares: u64,         // LP 份额
    pub direct_sales: u64,       // 直推销售额
    pub d_level: u8,             // D级别 (1-8)
    pub pending_rewards: u64,   // 待领取奖励
    pub is_partner: bool,       // 是否合伙人
    pub stake_shares: u64,      // 质押份额
}
```

---

## 核心功能

### 1. 初始化

**指令:** `initialize(dq_price: u64)`

```typescript
// 初始化全局状态
await program.methods
  .initialize(new anchor.BN(1000000000)) // 1 DQ = 1 SOL
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

---

### 2. 注册

**指令:** `register(referrer: Pubkey)`

```typescript
// 用户注册
await program.methods
  .register(referrerPublicKey)
  .accounts({
    owner: user.publicKey,
    userState: userStatePda,
    referrer: referrerPublicKey,
    referrerState: referrerStatePda,
    admin: adminStatePda,
  })
  .signers([user])
  .rpc();
```

---

### 3. 入金: SOL → DQ

**指令:** `swap_sol_for_dq(amount: u64)`

```
用户 ──SOL──▶ SOL Vault
                │
                ├── 30% ──▶ LP 质押池
                │
                └── 70% ──▶ 运营池
                           │
                           └── 铸造 DQ ──▶ 用户
```

```typescript
// 将 SOL 兑换为 DQ
await program.methods
  .swapSolForDq(new anchor.BN(amount)) // lamports
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

---

### 4. 出金: DQ → SOL (通过 Raydium DEX)

**指令:** `swap_dq_for_sol(dq_amount: u64, min_out: u64)`

```
用户 ──DQ──▶ 合约
              │
              └── 通过 Raydium DEX 兑换 SOL
                           │
                           ├── 6% 手续费
                           │       ├── 50% ──▶ 质押分红池 (DQ)
                           │       └── 50% ──▶ 运营池
                           │
                           └── (94%) ──▶ 用户
```

```typescript
// 将 DQ 兑换为 SOL
await program.methods
  .swapDqForSol(
    new anchor.BN(dqAmount),  // DQ 数量
    new anchor.BN(minOut)     // 最小收到 SOL
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

---

### 5. 质押 DQ

**指令:** `stake_dq(amount: u64, period_index: u8)`

#### 质押周期

| period_index | 周期 | 年化收益率 |
|--------------|------|-----------|
| 0 | 30 天 | 5% |
| 1 | 90 天 | 10% |
| 2 | 180 天 | 15% |
| 3 | 360 天 | 20% |

```typescript
// 质押 DQ
await program.methods
  .stakeDq(
    new anchor.BN(amount), // 质押数量
    0                      // period_index (30天)
  )
  .accounts({
    owner: user.publicKey,
    stakeState: stakePda,
    stakeAccount: stakeTokenPda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

---

### 6. 提取质押

**指令:** `unstake_dq(period_index: u8)`

```typescript
// 提取质押
await program.methods
  .unstakeDq(0) // period_index
  .accounts({
    owner: user.publicKey,
    stakeState: stakePda,
    stakeAccount: stakeTokenPda,
    userTokenAccount: userTokenPda,
  })
  .signers([user])
  .rpc();
```

---

### 7. 领取质押分红

**指令:** `claim_stake_reward(period_index: u8)`

```typescript
// 领取分红
await program.methods
  .claimStakeReward(0)
  .accounts({
    owner: user.publicKey,
    stakeState: stakePda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    lpPool: lpPoolPda,
  })
  .signers([user])
  .rpc();
```

---

### 8. 购买节点 NFT

**指令:** `buy_node(card_type: u8)`

#### 卡牌类型

| card_type | 名称 | 价格 (SOL) | LP | NFT池 | 运营 |
|-----------|------|-----------|-----|-------|------|
| 1 | A 级 | 500 | 60% | 15% | 25% |
| 2 | B 级 | 1000 | 60% | 15% | 25% |
| 3 | C 级 | 3000 | 60% | 15% | 25% |

```typescript
// 购买 A 级节点
await program.methods
  .buyNode(1)
  .accounts({
    owner: user.publicKey,
    globalState: statePda,
    nftMint: nftAuthorityPda,
    nftMintA: nftMintAPda,
    nftMintB: nftMintBPda,
    nftMintC: nftMintCPda,
    userNftAccount: userNftPda,
    userLamports: userAccount,
    lpPool: lpPoolPda,
    nftPool: nftPoolPda,
  })
  .signers([user])
  .rpc();
```

---

### 9. 爆块 (每日奖励分发)

**指令:** `block_mining()`

#### 分配比例

| 分配对象 | 比例 |
|----------|------|
| LP 质押池 | 60% |
| NFT 分红池 | 15% |
| 基金会 | 5% |
| 团队池 | 14% |
| 合伙人池 | 6% |

```typescript
// 触发爆块
await program.methods
  .blockMining()
  .accounts({
    globalState: statePda,
    lpPool: lpPoolPda,
    nftPool: nftPoolPda,
    teamPool: teamPoolPda,
    partnerPool: partnerPoolPda,
    admin: admin.publicKey,
  })
  .signers([admin])
  .rpc();
```

---

### 10. 领取合伙人奖励

**指令:** `claim_partner_reward()`

```typescript
// 领取合伙人奖励
await program.methods
  .claimPartnerReward()
  .accounts({
    owner: user.publicKey,
    userState: userStatePda,
    dqMint: dqMintPda,
    userTokenAccount: userTokenPda,
    partnerPool: partnerPoolPda,
  })
  .signers([user])
  .rpc();
```

---

## 管理员功能

### 设置 DQ 价格

```typescript
await program.methods
  .setPrice(new anchor.BN(newPrice))
  .accounts({
    admin: admin.publicKey,
    globalState: statePda,
  })
  .signers([admin])
  .rpc();
```

---

## 事件列表

| 事件 | 说明 |
|------|------|
| `SwapSolForDQ` | SOL 兑换 DQ (入金) |
| `SwapDqForSol` | DQ 兑换 SOL (出金) |
| `StakeDQ` | DQ 质押 |
| `UnstakeDQ` | DQ 提取 |
| `ClaimStakeReward` | 领取质押分红 |
| `BuyNode` | 购买节点 |
| `BlockMining` | 爆块分发 |
| `ClaimPartnerReward` | 领取合伙人奖励 |
| `PriceUpdated` | 价格更新 |

---

## 部署指南

### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Anchor
npm install -g @project-serum/anchor-cli

# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. 构建程序

```bash
cd contracts
anchor build
```

### 3. 部署

```bash
# 切换到 devnet
solana config set --url devnet

# 部署
anchor deploy --provider.cluster devnet
```

### 4. IDL 生成

```bash
anchor idl init <PROGRAM_ID> --filepath target/idl/dq_project.json
```

---

## 安全建议

1. **权限控制**: 管理员使用硬件钱包
2. **多签**: 重要操作使用多签钱包
3. **审计**: 部署前完成第三方审计
4. **测试**: 充分测试各场景
5. **监控**: 部署后持续监控异常交易
