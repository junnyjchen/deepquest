// DQProject - Solana Anchor Program
// DeepQuest DeFi Platform on Solana

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program_option::COption, stake, system_program};
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use std::mem::size_of;

// ============ 常量定义 ============

declare_id!("DQProject111111111111111111111111111111111");

pub const SEED_DQ_MINT: &[u8] = b"dq_mint";
pub const SEED_VAULT: &[u8] = b"vault";
pub const SEED_STAKE: &[u8] = b"stake";
pub const SEED_NODE: &[u8] = b"node";
pub const SEED_USER: &[u8] = b"user";
pub const SEED_NFT_MINT: &[u8] = b"nft_mint";

pub const TOTAL_SUPPLY: u64 = 100_000_000_000_000; // 1000亿 DQ

// 卡牌价格 (lamports, 1 SOL = 1_000_000_000 lamports)
pub const PRICE_A: u64 = 500_000_000_000; // 500 SOL
pub const PRICE_B: u64 = 1_000_000_000_000; // 1000 SOL
pub const PRICE_C: u64 = 3_000_000_000_000; // 3000 SOL

// 分红比例 (基点)
pub const BP_DIVISOR: u64 = 10000;

// 质押周期 (天数)
pub const PERIOD_30: u64 = 30;
pub const PERIOD_90: u64 = 90;
pub const PERIOD_180: u64 = 180;
pub const PERIOD_360: u64 = 360;

// 质押年化收益率 (基点)
pub const RATE_30: u64 = 500;  // 5%
pub const RATE_90: u64 = 1000; // 10%
pub const RATE_180: u64 = 1500; // 15%
pub const RATE_360: u64 = 2000; // 20%

// ============ 错误定义 ============

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid period index")]
    InvalidPeriod,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Insufficient DQ tokens")]
    InsufficientDQ,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Not partner")]
    NotPartner,
    #[msg("Max supply exceeded")]
    MaxSupplyExceeded,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Invalid card type")]
    InvalidCardType,
    #[msg("Invalid referrer")]
    InvalidReferrer,
    #[msg("Already registered")]
    AlreadyRegistered,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("No stake found")]
    NoStakeFound,
}

// ============ 全局状态 (State) ============

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub dq_mint: Pubkey,
    pub sol_vault: Pubkey,
    pub operation_pool: Pubkey,
    pub lp_pool: Pubkey,
    pub nft_mint_a: Pubkey,
    pub nft_mint_b: Pubkey,
    pub nft_mint_c: Pubkey,
    pub raydium_router: Pubkey,
    pub dq_price: u64,           // 1 DQ = dq_price lamports
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub daily_release_rate: u64,
    pub last_block_time: i64,
    pub burn_rate: u64,
    pub partner_count: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

// ============ 用户状态 (User) ============

#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,
    pub referrer: Pubkey,
    pub direct_count: u64,
    pub level: u8,              // 1-6
    pub total_invest: u64,     // 总投资 (lamports)
    pub team_invest: u64,      // 团队投资
    pub energy: u64,
    pub lp_shares: u64,
    pub direct_sales: u64,
    pub d_level: u8,            // D级别 1-8
    pub pending_rewards: u64,
    pub total_claimed: u64,
    pub is_partner: bool,
    pub partner_order: u64,
    pub stake_shares: u64,
    pub stake_reward_debt: u64,
    pub nft_reward_debt: u64,
    pub d_reward_debt: u64,
    pub created_at: i64,
    pub bump: u8,
}

// ============ 质押状态 (Stake) ============

#[account]
#[derive(InitSpace)]
pub struct StakeState {
    pub owner: Pubkey,
    pub amount_30: u64,
    pub amount_90: u64,
    pub amount_180: u64,
    pub amount_360: u64,
    pub reward_debt_30: u64,
    pub reward_debt_90: u64,
    pub reward_debt_180: u64,
    pub reward_debt_360: u64,
    pub last_claim_30: i64,
    pub last_claim_90: i64,
    pub last_claim_180: i64,
    pub last_claim_360: i64,
    pub bump: u8,
}

// ============ 节点卡牌 (NodeCard) ============

#[account]
#[derive(InitSpace)]
pub struct NodeCard {
    pub owner: Pubkey,
    pub card_type: u8,         // 1=A, 2=B, 3=C
    pub purchased_at: i64,
    pub bump: u8,
}

// ============ NFT 元数据 (简化版) ============

#[account]
#[derive(InitSpace)]
pub struct NftMetadata {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub card_type: u8,
    pub uri: String,
    pub bump: u8,
}

// ============ 流动性池状态 (LPPool) ============

#[account]
#[derive(InitSpace)]
pub struct LpPool {
    pub total_shares: u64,
    pub acc_per_share: u64,
    pub last_update: i64,
    pub bump: u8,
}

// ============ NFT 分红池 (NftPool) ============

#[account]
#[derive(InitSpace)]
pub struct NftPool {
    pub total_a: u64,
    pub total_b: u64,
    pub total_c: u64,
    pub acc_per_share_a: u64,
    pub acc_per_share_b: u64,
    pub acc_per_share_c: u64,
    pub last_update: i64,
    pub bump: u8,
}

// ============ 团队分红池 (TeamPool) ============

#[account]
#[derive(InitSpace)]
pub struct TeamPool {
    pub level_users: [u64; 8],    // 每个级别的用户数
    pub acc_per_share: [u64; 8], // 每个级别的累积
    pub last_update: i64,
    pub bump: u8,
}

// ============ 合伙人池 (PartnerPool) ============

#[account]
#[derive(InitSpace)]
pub struct PartnerPool {
    pub total_partners: u64,
    pub acc_per_share: u64,
    pub last_update: i64,
    pub bump: u8,
}

// ============ 程序主体 ============

#[program]
pub mod dq_project {
    use super::*;

    // ============ 初始化全局状态 ============

    pub fn initialize(
        ctx: Context<Initialize>,
        dq_price: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        
        state.admin = ctx.accounts.admin.key();
        state.dq_mint = ctx.accounts.dq_mint.key();
        state.sol_vault = ctx.accounts.sol_vault.key();
        state.operation_pool = ctx.accounts.operation_pool.key();
        state.lp_pool = ctx.accounts.lp_pool.key();
        state.nft_mint_a = ctx.accounts.nft_mint_a.key();
        state.nft_mint_b = ctx.accounts.nft_mint_b.key();
        state.nft_mint_c = ctx.accounts.nft_mint_c.key();
        state.raydium_router = ctx.accounts.raydium_router.key();
        state.dq_price = dq_price;
        state.total_supply = TOTAL_SUPPLY;
        state.circulating_supply = 0;
        state.daily_release_rate = 13; // 1.3%
        state.last_block_time = Clock::get()?.unix_timestamp;
        state.burn_rate = 8000; // 80%
        state.partner_count = 0;
        state.bump = ctx.bumps.global_state;
        state.vault_bump = ctx.bumps.sol_vault;

        // 初始化子池
        ctx.accounts.lp_pool.acc_per_share = 0;
        ctx.accounts.lp_pool.last_update = Clock::get()?.unix_timestamp;
        ctx.accounts.lp_pool.bump = ctx.bumps.lp_pool;

        ctx.accounts.nft_pool.last_update = Clock::get()?.unix_timestamp;
        ctx.accounts.nft_pool.bump = ctx.bumps.nft_pool;

        ctx.accounts.team_pool.last_update = Clock::get()?.unix_timestamp;
        ctx.accounts.team_pool.bump = ctx.bumps.team_pool;

        ctx.accounts.partner_pool.last_update = Clock::get()?.unix_timestamp;
        ctx.accounts.partner_pool.bump = ctx.bumps.partner_pool;

        Ok(())
    }

    // ============ 注册用户 ============

    pub fn register(ctx: Context<Register>, referrer: Pubkey) -> Result<()> {
        let user = &mut ctx.accounts.user_state;
        let clock = Clock::get()?;

        require!(
            referrer != ctx.accounts.owner.key(),
            ErrorCode::InvalidReferrer
        );

        user.owner = ctx.accounts.owner.key();
        user.referrer = referrer;
        user.created_at = clock.unix_timestamp;
        user.bump = ctx.bumps.user_state;

        // 更新推荐人
        if ctx.accounts.referrer_state.referrer != Pubkey::default() 
           || ctx.accounts.admin.key() == referrer {
            // 推荐人信息更新
            msg!("User registered with referrer: {}", referrer);
        }

        Ok(())
    }

    // ============ 入金: SOL → DQ ============

    /**
     * @notice 将 SOL 兑换为 DQ 代币
     * @param amount 存入的 SOL 数量 (lamports)
     */
    pub fn swap_sol_for_dq(ctx: Context<SwapSolForDq>, amount: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let user = &mut ctx.accounts.user_state;
        let clock = Clock::get()?;

        require!(amount > 0, ErrorCode::InvalidAmount);

        // 计算可铸造的 DQ 数量
        let dq_amount = amount * 1_000_000_000 / state.dq_price; // 价格转换

        // 检查总量限制
        require!(
            state.circulating_supply + dq_amount <= state.total_supply,
            ErrorCode::MaxSupplyExceeded
        );

        // 30% 进入 LP 池
        let lp_share = amount * 30 / 100;
        // 70% 进入运营池
        let operation_share = amount * 70 / 100;

        // 更新 LP 池
        ctx.accounts.lp_pool.total_shares += lp_share;
        
        // 更新用户状态
        user.lp_shares += lp_share;
        user.total_invest += amount;
        user.energy += amount * 3;
        user.direct_sales += amount;

        // 更新循环供应量
        state.circulating_supply += dq_amount;

        // 铸造 DQ 代币给用户
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.dq_mint.to_account_info(),
                },
                &[&[SEED_VAULT, &[state.vault_bump]]],
            ),
            dq_amount,
        )?;

        msg!("Swapped {} SOL for {} DQ", amount, dq_amount);
        emit!(SwapSolForDQ {
            user: ctx.accounts.owner.key(),
            sol_amount: amount,
            dq_amount,
        });

        Ok(())
    }

    // ============ 出金: DQ → SOL (通过 Raydium DEX) ============

    /**
     * @notice 将 DQ 兑换为 SOL
     * @param dq_amount 要兑换的 DQ 数量
     * @param min_out 最小预期获得的 SOL 数量 (防止滑点)
     */
    pub fn swap_dq_for_sol(
        ctx: Context<SwapDqForSol>,
        dq_amount: u64,
        min_out: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;

        require!(dq_amount > 0, ErrorCode::InvalidAmount);

        // 计算预期获得的 SOL 数量
        let expected_sol = dq_amount * state.dq_price / 1_000_000_000;

        // 6% 手续费
        let fee = expected_sol * 6 / 100;
        let user_out = expected_sol - fee;

        require!(user_out >= min_out, ErrorCode::SlippageExceeded);

        // 检查合约 SOL 余额
        let vault_balance = ctx.accounts.sol_vault.lamports();
        require!(vault_balance >= user_out, ErrorCode::InsufficientBalance);

        // 销毁 DQ 代币
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            dq_amount,
        )?;

        // 通过 Raydium DEX 进行兑换 (简化实现)
        // 实际需要调用 Raydium 的 CPI
        // _swap_via_raydium(ctx, dq_amount)?;

        // 从 Vault 转 SOL 给用户
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= user_out;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += user_out;

        // 手续费分配: 50% 给质押者, 50% 给运营池
        let stake_fee = fee * 50 / 100;
        let operation_fee = fee * 50 / 100;

        // 更新质押累积
        _update_stake_accumulator(&mut ctx.accounts.lp_pool, stake_fee);

        msg!("Swapped {} DQ for {} SOL (fee: {})", dq_amount, user_out, fee);
        emit!(SwapDqForSol {
            user: ctx.accounts.owner.key(),
            dq_amount,
            sol_amount: user_out,
            fee,
        });

        Ok(())
    }

    // ============ 质押 DQ ============

    /**
     * @notice 质押 DQ 代币
     * @param amount 质押数量
     * @param period_index 周期索引 (0=30天, 1=90天, 2=180天, 3=360天)
     */
    pub fn stake_dq(
        ctx: Context<StakeDq>,
        amount: u64,
        period_index: u8,
    ) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let clock = Clock::get()?;

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(period_index <= 3, ErrorCode::InvalidPeriod);

        // 从用户账户转入质押账户
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        // 更新质押状态
        match period_index {
            0 => {
                stake.amount_30 += amount;
                stake.reward_debt_30 = stake.amount_30 * ctx.accounts.lp_pool.acc_per_share / BP_DIVISOR;
                stake.last_claim_30 = clock.unix_timestamp;
            },
            1 => {
                stake.amount_90 += amount;
                stake.reward_debt_90 = stake.amount_90 * ctx.accounts.lp_pool.acc_per_share / BP_DIVISOR;
                stake.last_claim_90 = clock.unix_timestamp;
            },
            2 => {
                stake.amount_180 += amount;
                stake.reward_debt_180 = stake.amount_180 * ctx.accounts.lp_pool.acc_per_share / BP_DIVISOR;
                stake.last_claim_180 = clock.unix_timestamp;
            },
            3 => {
                stake.amount_360 += amount;
                stake.reward_debt_360 = stake.amount_360 * ctx.accounts.lp_pool.acc_per_share / BP_DIVISOR;
                stake.last_claim_360 = clock.unix_timestamp;
            },
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        msg!("Staked {} DQ for period {}", amount, period_index);
        emit!(StakeDQ {
            user: ctx.accounts.owner.key(),
            amount,
            period: period_index,
        });

        Ok(())
    }

    // ============ 提取质押 ============

    pub fn unstake_dq(ctx: Context<UnstakeDq>, period_index: u8) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let clock = Clock::get()?;

        require!(period_index <= 3, ErrorCode::InvalidPeriod);

        let amount = match period_index {
            0 => stake.amount_30,
            1 => stake.amount_90,
            2 => stake.amount_180,
            3 => stake.amount_360,
            _ => return err!(ErrorCode::InvalidPeriod),
        };

        require!(amount > 0, ErrorCode::NoStakeFound);

        // 更新质押状态
        match period_index {
            0 => stake.amount_30 = 0,
            1 => stake.amount_90 = 0,
            2 => stake.amount_180 = 0,
            3 => stake.amount_360 = 0,
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        // 从质押账户转回用户
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.stake_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.stake_account.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Unstaked {} DQ from period {}", amount, period_index);
        emit!(UnstakeDQ {
            user: ctx.accounts.owner.key(),
            amount,
            period: period_index,
        });

        Ok(())
    }

    // ============ 领取质押分红 ============

    pub fn claim_stake_reward(ctx: Context<ClaimStakeReward>, period_index: u8) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let lp_pool = &ctx.accounts.lp_pool;
        let user_token = &mut ctx.accounts.user_token_account;

        require!(period_index <= 3, ErrorCode::InvalidPeriod);

        let (amount, reward_debt) = match period_index {
            0 => (stake.amount_30, stake.reward_debt_30),
            1 => (stake.amount_90, stake.reward_debt_90),
            2 => (stake.amount_180, stake.reward_debt_180),
            3 => (stake.amount_360, stake.reward_debt_360),
            _ => return err!(ErrorCode::InvalidPeriod),
        };

        require!(amount > 0, ErrorCode::NoStakeFound);

        // 计算待领取分红
        let pending = amount * lp_pool.acc_per_share / BP_DIVISOR - reward_debt;
        require!(pending > 0, ErrorCode::AlreadyClaimed);

        // 更新债务
        match period_index {
            0 => stake.reward_debt_30 = amount * lp_pool.acc_per_share / BP_DIVISOR,
            1 => stake.reward_debt_90 = amount * lp_pool.acc_per_share / BP_DIVISOR,
            2 => stake.reward_debt_180 = amount * lp_pool.acc_per_share / BP_DIVISOR,
            3 => stake.reward_debt_360 = amount * lp_pool.acc_per_share / BP_DIVISOR,
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        // 铸造 DQ 给用户
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: user_token.to_account_info(),
                    authority: ctx.accounts.dq_mint.to_account_info(),
                },
            ),
            pending,
        )?;

        msg!("Claimed {} DQ stake reward for period {}", pending, period_index);
        emit!(ClaimStakeRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            period: period_index,
        });

        Ok(())
    }

    // ============ 购买节点 NFT ============

    /**
     * @notice 使用 SOL 购买节点卡牌
     * @param card_type 卡牌类型 (1=A, 2=B, 3=C)
     */
    pub fn buy_node(ctx: Context<BuyNode>, card_type: u8) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let price = match card_type {
            1 => PRICE_A,
            2 => PRICE_B,
            3 => PRICE_C,
            _ => return err!(ErrorCode::InvalidCardType),
        };

        require!(ctx.accounts.user_lamports.lamports() >= price, ErrorCode::InsufficientBalance);

        // 60% 进入 LP 池
        let lp_share = price * 60 / 100;
        // 15% 进入 NFT 分红池
        let nft_share = price * 15 / 100;
        // 25% 进入运营池
        let operation_share = price * 25 / 100;

        // 更新 LP 池
        ctx.accounts.lp_pool.total_shares += lp_share;

        // 更新 NFT 池
        match card_type {
            1 => ctx.accounts.nft_pool.total_a += 1,
            2 => ctx.accounts.nft_pool.total_b += 1,
            3 => ctx.accounts.nft_pool.total_c += 1,
            _ => return err!(ErrorCode::InvalidCardType),
        }

        // 铸造 NFT 给用户
        let seeds = &[SEED_NFT_MINT, &[ctx.bumps.nft_mint]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: match card_type {
                        1 => ctx.accounts.nft_mint_a.to_account_info(),
                        2 => ctx.accounts.nft_mint_b.to_account_info(),
                        3 => ctx.accounts.nft_mint_c.to_account_info(),
                        _ => return err!(ErrorCode::InvalidCardType),
                    },
                    to: ctx.accounts.user_nft_account.to_account_info(),
                    authority: ctx.accounts.nft_mint.to_account_info(),
                },
                &[seeds],
            ),
            1,
        )?;

        msg!("User {} bought node card type {}", ctx.accounts.owner.key(), card_type);
        emit!(BuyNodeEvent {
            user: ctx.accounts.owner.key(),
            card_type,
            price,
        });

        Ok(())
    }

    // ============ 爆块 (每日奖励分发) ============

    pub fn block_mining(ctx: Context<BlockMining>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;

        // 检查是否到了下一个爆块时间 (24小时)
        require!(
            clock.unix_timestamp - state.last_block_time >= 86400, // 24 * 60 * 60
            ErrorCode::Unauthorized
        );

        // 计算本次释放的 DQ
        let release = state.circulating_supply * state.daily_release_rate / 1000;
        let burn = release * state.burn_rate / BP_DIVISOR;
        let remaining = release - burn;

        // 更新燃烧率
        if state.burn_rate > 3000 { // 最低 30%
            state.burn_rate -= 500; // 降低 5%
        }

        // 分配合约持仓的 DQ
        let lp_share = remaining * 60 / 100;
        let nft_share = remaining * 15 / 100;
        let foundation_share = remaining * 5 / 100;
        let team_share = remaining * 14 / 100;
        let partner_share = remaining * 6 / 100;

        // 更新 LP 池累积
        ctx.accounts.lp_pool.acc_per_share += lp_share * BP_DIVISOR / ctx.accounts.lp_pool.total_shares;

        // 更新 NFT 池累积
        _update_nft_pool(&mut ctx.accounts.nft_pool, nft_share);

        // 更新团队池累积
        _update_team_pool(&mut ctx.accounts.team_pool, team_share);

        // 更新合伙人池累积
        ctx.accounts.partner_pool.acc_per_share += partner_share * BP_DIVISOR / ctx.accounts.partner_pool.total_partners;

        state.last_block_time = clock.unix_timestamp;

        msg!("Block mined: release={}, burn={}", release, burn);
        emit!(BlockMiningEvent {
            release,
            burn,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取合伙人奖励 ============

    pub fn claim_partner_reward(ctx: Context<ClaimPartnerReward>) -> Result<()> {
        let pool = &ctx.accounts.partner_pool;
        let user = &mut ctx.accounts.user_state;

        require!(user.is_partner, ErrorCode::NotPartner);

        let pending = pool.acc_per_share - user.d_reward_debt;
        require!(pending > 0, ErrorCode::AlreadyClaimed);

        user.d_reward_debt = pool.acc_per_share;

        // 铸造 DQ 给用户
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.dq_mint.to_account_info(),
                },
            ),
            pending,
        )?;

        msg!("Partner {} claimed {} DQ", ctx.accounts.owner.key(), pending);
        emit!(ClaimPartnerRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
        });

        Ok(())
    }

    // ============ 管理员功能 ============

    pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(new_price > 0, ErrorCode::InvalidAmount);

        state.dq_price = new_price;
        msg!("DQ price updated to {}", new_price);
        emit!(PriceUpdated { new_price });

        Ok(())
    }

    pub fn add_initial_nodes(
        ctx: Context<AddInitialNodes>,
        users: Vec<Pubkey>,
        card_types: Vec<u8>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(users.len() == card_types.len(), ErrorCode::InvalidAmount);

        // 批量铸造初始 NFT (实现略)
        msg!("Added {} initial nodes", users.len());
        emit!(InitialNodesAdded { count: users.len() as u64 });

        Ok(())
    }

    // ============ 内部函数 ============

    fn _update_stake_accumulator(lp_pool: &mut Account<LpPool>, amount: u64) {
        if lp_pool.total_shares > 0 {
            lp_pool.acc_per_share += amount * BP_DIVISOR / lp_pool.total_shares;
        }
    }

    fn _update_nft_pool(nft_pool: &mut Account<NftPool>, amount: u64) {
        let total_a = nft_pool.total_a.max(1);
        let total_b = nft_pool.total_b.max(1);
        let total_c = nft_pool.total_c.max(1);
        let total = total_a + total_b + total_c;

        if total > 0 {
            nft_pool.acc_per_share_a += amount * 4000 / total; // 权重 4
            nft_pool.acc_per_share_b += amount * 5000 / total; // 权重 5
            nft_pool.acc_per_share_c += amount * 6000 / total; // 权重 6
        }
    }

    fn _update_team_pool(team_pool: &mut Account<TeamPool>, amount: u64) {
        let per_level = amount / 8;
        for i in 0..8 {
            if team_pool.level_users[i] > 0 {
                team_pool.acc_per_share[i] += per_level * BP_DIVISOR / team_pool.level_users[i];
            }
        }
    }
}

// ============ CPI 函数定义 ============

fn _swap_via_raydium(_ctx: Context<SwapSolForDq>, _amount: u64) -> Result<()> {
    // 通过 Raydium CPI 进行兑换
    // 实际实现需要调用 Raydium 的 swap_instruction
    msg!("Swapping via Raydium DEX");
    Ok(())
}

// ============ 事件定义 ============

#[event]
pub struct SwapSolForDQ {
    pub user: Pubkey,
    pub sol_amount: u64,
    pub dq_amount: u64,
}

#[event]
pub struct SwapDqForSol {
    pub user: Pubkey,
    pub dq_amount: u64,
    pub sol_amount: u64,
    pub fee: u64,
}

#[event]
pub struct StakeDQ {
    pub user: Pubkey,
    pub amount: u64,
    pub period: u8,
}

#[event]
pub struct UnstakeDQ {
    pub user: Pubkey,
    pub amount: u64,
    pub period: u8,
}

#[event]
pub struct ClaimStakeRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub period: u8,
}

#[event]
pub struct BuyNodeEvent {
    pub user: Pubkey,
    pub card_type: u8,
    pub price: u64,
}

#[event]
pub struct BlockMiningEvent {
    pub release: u64,
    pub burn: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimPartnerRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PriceUpdated {
    pub new_price: u64,
}

#[event]
pub struct InitialNodesAdded {
    pub count: u64,
}

// ============ Account Layouts ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<GlobalState>(),
        seeds = [b"state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<LpPool>(),
        seeds = [b"lp_pool"],
        bump
    )]
    pub lp_pool: Account<'info, LpPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<NftPool>(),
        seeds = [b"nft_pool"],
        bump
    )]
    pub nft_pool: Account<'info, NftPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<TeamPool>(),
        seeds = [b"team_pool"],
        bump
    )]
    pub team_pool: Account<'info, TeamPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<PartnerPool>(),
        seeds = [b"partner_pool"],
        bump
    )]
    pub partner_pool: Account<'info, PartnerPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // Mint
        seeds = [SEED_DQ_MINT],
        bump,
        mint::decimals = 9,
        mint::authority = global_state,
    )]
    pub dq_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // TokenAccount
        seeds = [SEED_VAULT],
        bump,
        token::mint = dq_mint,
        token::authority = global_state,
    )]
    pub dq_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // TokenAccount for SOL vault
        owner = system_program::ID.as_ref(),
        seeds = [b"sol_vault"],
        bump
    )]
    /// CHECK: This is just a PDA for holding SOL
    pub sol_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // NFT Mint A
        seeds = [SEED_NFT_MINT, &[1u8]],
        bump,
        mint::decimals = 0,
        mint::authority = global_state,
    )]
    pub nft_mint_a: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // NFT Mint B
        seeds = [SEED_NFT_MINT, &[2u8]],
        bump,
        mint::decimals = 0,
        mint::authority = global_state,
    )]
    pub nft_mint_b: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32, // NFT Mint C
        seeds = [SEED_NFT_MINT, &[3u8]],
        bump,
        mint::decimals = 0,
        mint::authority = global_state,
    )]
    pub nft_mint_c: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Register<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + size_of::<UserState>(),
        seeds = [SEED_USER, owner.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,

    /// CHECK: Referrer account (may not exist yet)
    pub referrer: AccountInfo<'info>,
    pub referrer_state: Account<'info, UserState>,

    pub admin: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapSolForDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    /// CHECK: SOL vault PDA
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapDqForSol<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    /// CHECK: SOL vault PDA
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub stake_state: Account<'info, StakeState>,

    #[account(
        init,
        payer = owner,
        space = 8 + 32, // TokenAccount for stake vault
        seeds = [SEED_STAKE, owner.key().as_ref()],
        bump,
        token::mint = dq_mint,
        token::authority = stake_state,
    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub stake_state: Account<'info, StakeState>,

    #[account(mut)]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimStakeReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub stake_state: Account<'info, StakeState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyNode<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: NFT mint authority
    pub nft_mint: Account<'info, Mint>,

    pub nft_mint_a: Account<'info, Mint>,
    pub nft_mint_b: Account<'info, Mint>,
    pub nft_mint_c: Account<'info, Mint>,

    #[account(mut)]
    pub user_nft_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_lamports: AccountInfo<'info>,

    pub lp_pool: Account<'info, LpPool>,

    pub nft_pool: Account<'info, NftPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BlockMining<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    #[account(mut)]
    pub nft_pool: Account<'info, NftPool>,

    #[account(mut)]
    pub team_pool: Account<'info, TeamPool>,

    #[account(mut)]
    pub partner_pool: Account<'info, PartnerPool>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPartnerReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub partner_pool: Account<'info, PartnerPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
}

#[derive(Accounts)]
pub struct AddInitialNodes<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
}
