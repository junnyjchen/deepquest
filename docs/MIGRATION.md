# BSC → Solana 架构迁移指南

## 迁移概览

| 项目 | BSC/EVM (旧) | Solana (新) |
|------|--------------|-------------|
| **编程语言** | Solidity | Rust |
| **开发框架** | Hardhat + OpenZeppelin | Anchor Framework |
| **代币标准** | ERC20 / BEP20 | SPL Token |
| **NFT 标准** | ERC721 | SPL Token (Metaplex) |
| **状态存储** | 链上 storage | Anchor Accounts |
| **程序模型** | 单合约 | Programs + PDAs |
| **DEX 集成** | PancakeSwap | Raydium |
| **代币类型** | 跨链桥映射 | 原生 SPL |

---

## 核心差异对比

### 1. 代币模型

#### BSC (ERC20/BEP20)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DQToken is ERC20 {
    constructor() ERC20("DQ Token", "DQ") {
        _mint(msg.sender, 100_000_000_000 * 10**18);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

#### Solana (SPL Token)

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

#[account]
pub struct GlobalState {
    pub dq_mint: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        seeds = [b"dq_mint"],
        bump,
        mint::decimals = 9,
        mint::authority = global_state,
    )]
    pub dq_mint: Account<'info, Mint>,
}
```

---

### 2. 状态存储

#### BSC (Storage Mapping)

```solidity
contract DQProject {
    mapping(address => User) public users;
    
    struct User {
        uint256 totalInvest;
        uint256 pendingRewards;
        uint256 lpShares;
    }
}
```

#### Solana (Anchor Accounts)

```rust
#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,
    pub total_invest: u64,
    pub pending_rewards: u64,
    pub lp_shares: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct UserAccounts<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + size_of::<UserState>(),
        seeds = [b"user", owner.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
}
```

---

### 3. 函数调用

#### BSC (同步调用)

```solidity
// 同步执行
function deposit(uint256 amount) external payable {
    // 直接修改状态
    users[msg.sender].totalInvest += amount;
    // 直接转账
    payable(address(this)).transfer(msg.value);
}
```

#### Solana (CPI 调用)

```rust
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // 使用 CPI 转账 SOL
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? += amount;
    
    // 更新状态
    ctx.accounts.user_state.total_invest += amount;
    
    Ok(())
}
```

---

### 4. PDA (Program Derived Address)

#### BSC (无内部账户)

```solidity
// 使用普通地址
address public admin = 0x123...;
```

#### Solana (PDA 安全账户)

```rust
#[account(
    init,
    payer = admin,
    seeds = [b"vault"],
    bump,
)]
pub vault: AccountInfo<'info>, // PDA, 无法外部签名

// 程序签名
CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    token::Transfer { ... },
    &[&[SEED_VAULT, &[vault_bump]]], // 使用 PDA bump 签名
)
```

---

## 迁移清单

### 智能合约

- [x] 创建 Anchor 项目结构
- [x] 定义全局状态 (GlobalState)
- [x] 定义用户状态 (UserState)
- [x] 实现 SOL → DQ 兑换
- [x] 实现 DQ → SOL 兑换 (Raydium)
- [x] 实现质押功能
- [x] 实现节点购买
- [x] 实现爆块机制
- [x] 实现合伙人机制
- [ ] 集成 Raydium CPI
- [ ] 集成 Metaplex NFT
- [ ] 第三方审计

### 前端

- [ ] 切换钱包适配器 (ethers → web3.js/solana-web3.js)
- [ ] 更新代币交互逻辑
- [ ] 更新 NFT 铸造/转账
- [ ] 更新 UI 显示 (lamports ↔ SOL)

### 后端 (如需要)

- [ ] 更新索引服务
- [ ] 更新事件监听
- [ ] 更新 API 接口

---

## 重要注意事项

### 1. lamports vs SOL

```typescript
// Solana 使用 lamports (1 SOL = 1,000,000,000 lamports)
const LAMPORTS_PER_SOL = 1_000_000_000;

// 转换
const sol = lamports / LAMPORTS_PER_SOL;
const lamports = sol * LAMPORTS_PER_SOL;
```

### 2. 小数位数

```rust
// DQ 代币 9 位小数
#[account(mint::decimals = 9)]
pub dq_mint: Account<'info, Mint>,
```

### 3. 错误处理

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Invalid amount")]
    InvalidAmount,
}
```

---

## 后续优化

1. **Raydium 集成**: 完善 DQ/SOL 交易对流动性
2. **Metaplex 集成**: 完善 NFT 元数据和 Candy Machine
3. **Wormhole 集成**: 支持跨链资产
4. **Helius RPC**: 使用高性能 RPC 节点
5. **稀释性验证**: 完善价格机制
