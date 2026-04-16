# BSC → Solana 架构迁移指南

## 迁移概览

| 项目 | BSC/EVM (旧) | Solana (新) |
|------|--------------|-------------|
| **编程语言** | Solidity ^0.8.17 | Rust 2021 |
| **开发框架** | Hardhat + OpenZeppelin | Anchor 0.30.0 |
| **代币标准** | ERC20 / BEP20 | SPL Token |
| **NFT 标准** | ERC721 | SPL Token (Metaplex) |
| **状态存储** | 链上 mapping | Anchor Accounts |
| **程序模型** | 单合约 | Programs + PDAs |
| **账户模型** | 地址 + Storage | PDA + Accounts |
| **DEX 集成** | PancakeSwap | Raydium V2 |
| **交易费用** | $0.20-$5.00 | $0.001-$0.10 |
| **确认时间** | ~15秒 | ~400ms |

---

## 核心概念对比

### 1. 账户模型

#### BSC (EVM)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract DQProject {
    // 普通地址
    address public admin;
    
    // Mapping 存储
    mapping(address => User) public users;
    
    struct User {
        uint256 totalInvest;
        uint256 pendingRewards;
        uint256 lpShares;
    }
}
```

#### Solana (Anchor)

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,           // 用户公钥
    pub total_invest: u64,
    pub pending_rewards: u64,
    pub lp_shares: u64,
    pub bump: u8,               // PDA bump (用于签名)
}

#[derive(Accounts)]
pub struct UserAccounts<'info> {
    #[account(
        init,                    // 创建新账户
        payer = owner,          // 支付租金
        space = 8 + size_of::<UserState>(), // 空间大小
        seeds = [b"user", owner.key().as_ref()], // PDA 种子
        bump                     // bump
    )]
    pub user_state: Account<'info, UserState>,
}
```

---

### 2. 代币交互

#### BSC (OpenZeppelin)

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DQProject {
    using SafeERC20 for IERC20;
    
    IERC20 public dqToken;
    
    function deposit(uint256 amount) external {
        // 转账代币
        dqToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // 更新状态
        users[msg.sender].totalInvest += amount;
    }
    
    function withdraw(uint256 amount) external {
        require(users[msg.sender].pendingRewards >= amount);
        
        users[msg.sender].pendingRewards -= amount;
        
        // 转账代币
        dqToken.safeTransfer(msg.sender, amount);
    }
}
```

#### Solana (Anchor SPL)

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, MintTo, Burn, Transfer};

#[derive(Accounts)]
pub struct SwapSolForDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn swap_sol_for_dq(ctx: Context<SwapSolForDq>, amount: u64) -> Result<()> {
    // 铸造代币给用户
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.dq_mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.sol_vault.to_account_info(),
            },
            &[&[SEED_SOL_VAULT, &[state.sol_vault_bump]]],
        ),
        dq_amount,
    )?;
    
    Ok(())
}
```

---

### 3. 原生代币 (SOL) 处理

#### BSC

```solidity
function deposit() external payable {
    require(msg.value >= minimum);
    users[msg.sender].totalInvest += msg.value;
}

function withdraw(uint256 amount) external {
    require(address(this).balance >= amount);
    payable(msg.sender).transfer(amount);
}
```

#### Solana

```rust
// SOL 直接存储在账户的 lamports 中
#[derive(Accounts)]
pub struct BuyNode<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,  // PDA，存储 SOL
    
    #[account(mut)]
    pub user_lamports: AccountInfo<'info>, // 用户 SOL 账户
}

pub fn buy_node(ctx: Context<BuyNode>, card_type: u8) -> Result<()> {
    // 扣除用户 SOL
    **ctx.accounts.user_lamports.try_borrow_mut_lamports()? -= price;
    // 转入合约 vault
    **ctx.accounts.sol_vault.try_borrow_mut_lamports()? += price;
    
    Ok(())
}
```

---

### 4. PDA (Program Derived Address)

#### BSC (无 PDA)

```solidity
// 普通地址
address public admin = 0x123...;

// 无法程序签名，必须私钥控制
```

#### Solana (Anchor PDA)

```rust
// PDA 由程序控制，无需私钥
#[account(
    seeds = [b"sol_vault"],
    bump
)]
pub sol_vault: AccountInfo<'info>,

// 使用 PDA 签名 (CPI 调用)
CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    MintTo { ... },
    &[&[SEED_SOL_VAULT, &[vault_bump]]], // 使用 bump 签名
)
```

---

### 5. 函数可见性

#### BSC

```solidity
// 状态变量
uint256 public totalSupply;     // 自动生成 getter

// 函数
function deposit() external {}       // 外部调用
function withdraw() public {}        // 公开
function _internal() private {}      // 私有
function _update() internal {}      // 内部
```

#### Solana

```rust
#[program]
pub mod dq_project {
    // 所有函数都是公开的，通过 Context 权限控制
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // 检查签名者
        require!(ctx.accounts.admin.is_signer, ErrorCode::Unauthorized);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,  // 必须是签名者
}
```

---

### 6. 错误处理

#### BSC

```solidity
require(amount > 0, "Invalid amount");
require(balance >= amount, "Insufficient balance");
```

#### Solana

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.user_token_account.amount >= amount,
        ErrorCode::InsufficientBalance
    );
    Ok(())
}
```

---

### 7. 事件

#### BSC

```solidity
event Transfer(address indexed from, address indexed to, uint256 amount);
event Stake(address indexed user, uint256 amount, uint8 period);

emit Stake(msg.sender, amount, period);
```

#### Solana

```rust
#[event]
pub struct StakeDQEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub period_index: u8,
    pub timestamp: i64,
}

pub fn stake_dq(ctx: Context<StakeDq>, amount: u64, period_index: u8) -> Result<()> {
    emit!(StakeDQEvent {
        user: ctx.accounts.owner.key(),
        amount,
        period_index,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
```

---

## 迁移清单

### 智能合约

| 任务 | 状态 |
|------|------|
| [x] 创建 Anchor 项目结构 | ✅ |
| [x] 定义全局状态 (GlobalState) | ✅ |
| [x] 定义用户状态 (UserState) | ✅ |
| [x] 定义质押状态 (StakeState) | ✅ |
| [x] 实现 SOL → DQ 兑换 | ✅ |
| [x] 实现 DQ → SOL 兑换 | ✅ |
| [x] 实现质押功能 (30/90/180/360天) | ✅ |
| [x] 实现节点购买 | ✅ |
| [x] 实现爆块机制 | ✅ |
| [x] 实现合伙人机制 | ✅ |
| [x] 实现各项分红领取 | ✅ |
| [x] 管理员功能 | ✅ |
| [ ] 集成 Raydium CPI | 待完成 |
| [ ] 集成 Metaplex NFT | 待完成 |
| [ ] 第三方审计 | 待完成 |

### 前端

| 任务 | 状态 |
|------|------|
| [ ] 切换钱包适配器 | 待完成 |
| [ ] 更新代币交互逻辑 | 待完成 |
| [ ] 更新 NFT 铸造/转账 | 待完成 |
| [ ] 更新 UI 显示 | 待完成 |
| [ ] 集成 Solana 交易签名 | 待完成 |

### 后端

| 任务 | 状态 |
|------|------|
| [ ] 更新事件监听 | 待完成 |
| [ ] 更新 API 接口 | 待完成 |
| [ ] 更新数据索引 | 待完成 |

---

## 重要差异总结

### 1. lamports vs ETH

```typescript
// Solana: 1 SOL = 1,000,000,000 lamports
const LAMPORTS_PER_SOL = 1_000_000_000;

// BSC: 1 ETH = 10^18 wei
const WEI_PER_ETH = BigInt(1e18);
```

### 2. 小数位数

```rust
// DQ 代币: 9 位小数
#[account(mint::decimals = 9)]
pub dq_mint: Account<'info, Mint>,

// NFT: 0 位小数
#[account(mint::decimals = 0)]
pub nft_mint: Account<'info, Mint>,
```

### 3. 账户租金

```rust
// Solana 账户需要租金 (2 年最低)
// Anchor 自动处理
space = 8 + size_of::<UserState>()
```

### 4. CPI (Cross-Program Invocation)

```rust
// Solana 程序可以互相调用
CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    token::Transfer { ... }
)
```

---

## 后续优化建议

1. **Raydium 集成**: 实现 DQ/SOL 交易对流动性
2. **Metaplex 集成**: 完善 NFT 元数据和 Candy Machine
3. **Wormhole 集成**: 支持跨链资产 (ETH, BSC 等)
4. **Helius RPC**: 使用高性能 RPC 节点
5. **稀释性验证**: 完善价格机制和风控
6. **升级机制**: 实现可升级的合约逻辑
