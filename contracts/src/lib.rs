// DQProject - Solana Anchor Program
// DeepQuest DeFi Platform on Solana
// Program ID: DQProject111111111111111111111111111111111

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program_option::COption, stake, system_program};
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};
use std::mem::size_of;

// ============ Program ID ============

declare_id!("DQProject111111111111111111111111111111111");

// ============ 种子常量 ============

pub const SEED_ADMIN: &[u8] = b"admin";
pub const SEED_DQ_MINT: &[u8] = b"dq_mint";
pub const SEED_SOL_VAULT: &[u8] = b"sol_vault";
pub const SEED_LP_POOL: &[u8] = b"lp_pool";
pub const SEED_NFT_POOL: &[u8] = b"nft_pool";
pub const SEED_TEAM_POOL: &[u8] = b"team_pool";
pub const SEED_PARTNER_POOL: &[u8] = b"partner_pool";
pub const SEED_USER: &[u8] = b"user";
pub const SEED_STAKE: &[u8] = b"stake";
pub const SEED_NODE: &[u8] = b"node";
pub const SEED_NFT_MINT: &[u8] = b"nft_mint";

// ============ 全局常量 ============

// 代币总量 (9位小数)
pub const TOTAL_SUPPLY: u64 = 100_000_000_000_000; // 1000亿 DQ

// LP 分数换算
pub const LP_SHARES_MULTIPLIER: u64 = 1_000_000_000;

// 卡牌价格 (lamports)
pub const PRICE_A: u64 = 500_000_000_000;  // 500 SOL
pub const PRICE_B: u64 = 1_000_000_000_000; // 1000 SOL
pub const PRICE_C: u64 = 3_000_000_000_000; // 3000 SOL

// 质押周期 (天数)
pub const PERIOD_30: u64 = 30;
pub const PERIOD_90: u64 = 90;
pub const PERIOD_180: u64 = 180;
pub const PERIOD_360: u64 = 360;

// 质押年化收益率 (基点, 10000 = 100%)
pub const RATE_30: u64 = 500;   // 5%
pub const RATE_90: u64 = 1000;  // 10%
pub const RATE_180: u64 = 1500; // 15%
pub const RATE_360: u64 = 2000; // 20%

// 爆块参数
pub const DAILY_RELEASE_RATE: u64 = 13;  // 1.3%
pub const INITIAL_BURN_RATE: u64 = 8000; // 80%
pub const MIN_BURN_RATE: u64 = 3000;    // 30%
pub const BURN_DECREMENT: u64 = 500;    // 每次降低 5%

// 合伙人要求
pub const PARTNER_INVEST_REQUIRE: u64 = 5_000_000_000_000; // 5000 SOL
pub const PARTNER_SALES_20: u64 = 30_000_000_000_000;      // 前20名: 30000 SOL
pub const PARTNER_SALES_AFTER: u64 = 50_000_000_000_000;  // 20名后: 50000 SOL
pub const MAX_PARTNERS: u64 = 50;

// 分红权重
pub const NFT_WEIGHT_A: u64 = 4;
pub const NFT_WEIGHT_B: u64 = 5;
pub const NFT_WEIGHT_C: u64 = 6;

// ============ 错误定义 ============

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: not admin")]
    Unauthorized,
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
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("No stake found")]
    NoStakeFound,
    #[msg("Too early to mine")]
    TooEarlyToMine,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Partner limit reached")]
    PartnerLimitReached,
    #[msg("Investment requirement not met")]
    InvestRequirementNotMet,
    #[msg("Sales requirement not met")]
    SalesRequirementNotMet,
    #[msg("Invalid NFT metadata")]
    InvalidNftMetadata,
}

// ============ 全局状态 (GlobalState) ============

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub dq_mint: Pubkey,
    pub sol_vault: Pubkey,
    pub lp_pool: Pubkey,
    pub nft_pool: Pubkey,
    pub team_pool: Pubkey,
    pub partner_pool: Pubkey,
    pub nft_mint_a: Pubkey,
    pub nft_mint_b: Pubkey,
    pub nft_mint_c: Pubkey,
    pub raydium_router: Pubkey,
    pub dq_price: u64,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub daily_release_rate: u64,
    pub last_block_time: i64,
    pub burn_rate: u64,
    pub partner_count: u64,
    pub bump: u8,
    pub sol_vault_bump: u8,
}

// ============ 用户状态 (UserState) ============

#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,
    pub referrer: Pubkey,
    pub direct_count: u64,
    pub level: u8,
    pub total_invest: u64,
    pub team_invest: u64,
    pub energy: u64,
    pub lp_shares: u64,
    pub direct_sales: u64,
    pub d_level: u8,
    pub pending_rewards: u64,
    pub total_claimed: u64,
    pub is_partner: bool,
    pub partner_order: u64,
    pub stake_shares: u64,
    pub lp_reward_debt: u64,
    pub nft_reward_debt: u64,
    pub d_reward_debt: u64,
    pub created_at: i64,
    pub bump: u8,
}

// ============ 质押状态 (StakeState) ============

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

// ============ LP 池状态 (LpPool) ============

#[account]
#[derive(InitSpace)]
pub struct LpPool {
    pub total_shares: u64,
    pub acc_per_share: u64,
    pub last_update: i64,
    pub bump: u8,
}

// ============ NFT 池状态 (NftPool) ============

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

// ============ 团队池状态 (TeamPool) ============

#[account]
#[derive(InitSpace)]
pub struct TeamPool {
    pub level_users: [u64; 8],
    pub acc_per_share: [u64; 8],
    pub last_update: i64,
    pub bump: u8,
}

// ============ 合伙人池状态 (PartnerPool) ============

#[account]
#[derive(InitSpace)]
pub struct PartnerPool {
    pub total_partners: u64,
    pub acc_per_share: u64,
    pub last_update: i64,
    pub bump: u8,
}

// ============ 节点卡牌 (NodeCard) ============

#[account]
#[derive(InitSpace)]
pub struct NodeCard {
    pub owner: Pubkey,
    pub card_type: u8,
    pub purchased_at: i64,
    pub card_index: u64,
    pub bump: u8,
}

// ============ NFT 元数据 (NftMetadata) ============

#[account]
#[derive(InitSpace)]
pub struct NftMetadata {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub card_type: u8,
    pub card_index: u64,
    pub uri: String,
    pub bump: u8,
}

// ============ 代币账户状态 (TokenAccountState) ============

#[account]
#[derive(InitSpace)]
pub struct TokenAccountState {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

// ============ 程序主体 ============

#[program]
pub mod dq_project {
    use super::*;

    // ============ 初始化全局状态 ============

    pub fn initialize(ctx: Context<Initialize>, dq_price: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;

        state.admin = ctx.accounts.admin.key();
        state.dq_mint = ctx.accounts.dq_mint.key();
        state.sol_vault = ctx.accounts.sol_vault.key();
        state.lp_pool = ctx.accounts.lp_pool.key();
        state.nft_pool = ctx.accounts.nft_pool.key();
        state.team_pool = ctx.accounts.team_pool.key();
        state.partner_pool = ctx.accounts.partner_pool.key();
        state.nft_mint_a = ctx.accounts.nft_mint_a.key();
        state.nft_mint_b = ctx.accounts.nft_mint_b.key();
        state.nft_mint_c = ctx.accounts.nft_mint_c.key();
        state.raydium_router = Pubkey::default();
        state.dq_price = dq_price;
        state.total_supply = TOTAL_SUPPLY;
        state.circulating_supply = 0;
        state.daily_release_rate = DAILY_RELEASE_RATE;
        state.last_block_time = clock.unix_timestamp;
        state.burn_rate = INITIAL_BURN_RATE;
        state.partner_count = 0;
        state.bump = ctx.bumps.global_state;
        state.sol_vault_bump = ctx.bumps.sol_vault;

        // 初始化子池
        ctx.accounts.lp_pool.acc_per_share = 0;
        ctx.accounts.lp_pool.total_shares = 0;
        ctx.accounts.lp_pool.last_update = clock.unix_timestamp;
        ctx.accounts.lp_pool.bump = ctx.bumps.lp_pool;

        ctx.accounts.nft_pool.total_a = 0;
        ctx.accounts.nft_pool.total_b = 0;
        ctx.accounts.nft_pool.total_c = 0;
        ctx.accounts.nft_pool.acc_per_share_a = 0;
        ctx.accounts.nft_pool.acc_per_share_b = 0;
        ctx.accounts.nft_pool.acc_per_share_c = 0;
        ctx.accounts.nft_pool.last_update = clock.unix_timestamp;
        ctx.accounts.nft_pool.bump = ctx.bumps.nft_pool;

        ctx.accounts.team_pool.level_users = [0u64; 8];
        ctx.accounts.team_pool.acc_per_share = [0u64; 8];
        ctx.accounts.team_pool.last_update = clock.unix_timestamp;
        ctx.accounts.team_pool.bump = ctx.bumps.team_pool;

        ctx.accounts.partner_pool.total_partners = 0;
        ctx.accounts.partner_pool.acc_per_share = 0;
        ctx.accounts.partner_pool.last_update = clock.unix_timestamp;
        ctx.accounts.partner_pool.bump = ctx.bumps.partner_pool;

        msg!("DQProject initialized with price: {} lamports per DQ", dq_price);
        emit!(InitializeEvent {
            admin: state.admin,
            dq_price,
            timestamp: clock.unix_timestamp,
        });

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

        // 如果有推荐人，检查推荐人是否已注册
        if referrer != Pubkey::default() {
            require!(
                ctx.accounts.referrer_state.owner == referrer,
                ErrorCode::InvalidReferrer
            );
        }

        user.owner = ctx.accounts.owner.key();
        user.referrer = referrer;
        user.created_at = clock.unix_timestamp;
        user.bump = ctx.bumps.user_state;

        msg!(
            "User {} registered with referrer: {}",
            user.owner,
            referrer
        );
        emit!(RegisterEvent {
            user: ctx.accounts.owner.key(),
            referrer,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 入金: SOL → DQ ============

    pub fn swap_sol_for_dq(ctx: Context<SwapSolForDq>, amount: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let user = &mut ctx.accounts.user_state;
        let clock = Clock::get()?;

        require!(amount > 0, ErrorCode::InvalidAmount);

        // 计算可铸造的 DQ 数量
        // 1 DQ = dq_price lamports
        let dq_amount = amount * 1_000_000_000 / state.dq_price;

        // 检查总量限制
        require!(
            state.circulating_supply + dq_amount <= state.total_supply,
            ErrorCode::MaxSupplyExceeded
        );

        // 30% 进入 LP 池
        let lp_share = amount * 30 / 100;
        // 70% 进入运营池 (实际进入合约余额，用于未来出金)
        // operation_share = amount * 70 / 100

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
        mint_to(
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

        msg!(
            "Swapped {} SOL for {} DQ (price: {} lamports/DQ)",
            amount,
            dq_amount,
            state.dq_price
        );
        emit!(SwapSolForDQEvent {
            user: ctx.accounts.owner.key(),
            sol_amount: amount,
            dq_amount,
            lp_share,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 出金: DQ → SOL (通过 Raydium DEX) ============

    pub fn swap_dq_for_sol(
        ctx: Context<SwapDqForSol>,
        dq_amount: u64,
        min_out: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let user = &mut ctx.accounts.user_state;
        let clock = Clock::get()?;

        require!(dq_amount > 0, ErrorCode::InvalidAmount);
        require!(
            ctx.accounts.user_token_account.amount >= dq_amount,
            ErrorCode::InsufficientDQ
        );

        // 计算预期获得的 SOL 数量
        let expected_sol = dq_amount * state.dq_price / 1_000_000_000;

        // 6% 手续费
        let fee = expected_sol * 6 / 100;
        let user_out = expected_sol - fee;

        require!(user_out >= min_out, ErrorCode::SlippageExceeded);

        // 检查合约 SOL 余额
        let vault_balance = **ctx.accounts.sol_vault.lamports.borrow();
        require!(vault_balance >= user_out, ErrorCode::InsufficientBalance);

        // 销毁 DQ 代币
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            dq_amount,
        )?;

        // 从 Vault 转 SOL 给用户
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= user_out;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += user_out;

        // 更新循环供应量
        state.circulating_supply -= dq_amount;

        // 手续费分配: 50% 给 LP 池, 50% 给运营
        let stake_fee = fee * 50 / 100;
        let operation_fee = fee * 50 / 100;

        // 更新 LP 池累积
        if ctx.accounts.lp_pool.total_shares > 0 {
            ctx.accounts.lp_pool.acc_per_share += stake_fee * LP_SHARES_MULTIPLIER
                / ctx.accounts.lp_pool.total_shares;
        }

        msg!(
            "Swapped {} DQ for {} SOL (fee: {}, operation: {})",
            dq_amount,
            user_out,
            fee,
            operation_fee
        );
        emit!(SwapDqForSolEvent {
            user: ctx.accounts.owner.key(),
            dq_amount,
            sol_amount: user_out,
            fee,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 质押 DQ ============

    pub fn stake_dq(
        ctx: Context<StakeDq>,
        amount: u64,
        period_index: u8,
    ) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let lp_pool = &ctx.accounts.lp_pool;
        let clock = Clock::get()?;

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(period_index <= 3, ErrorCode::InvalidPeriod);
        require!(
            ctx.accounts.user_token_account.amount >= amount,
            ErrorCode::InsufficientDQ
        );

        // 从用户账户转入质押账户
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        // 计算当前质押的应计奖励
        let current_reward_debt = match period_index {
            0 => stake.amount_30 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - stake.reward_debt_30,
            1 => stake.amount_90 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - stake.reward_debt_90,
            2 => stake.amount_180 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - stake.reward_debt_180,
            3 => stake.amount_360 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - stake.reward_debt_360,
            _ => return err!(ErrorCode::InvalidPeriod),
        };

        // 先领取之前的奖励
        if current_reward_debt > 0 {
            mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.dq_mint.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.sol_vault.to_account_info(),
                    },
                    &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
                ),
                current_reward_debt,
            )?;
        }

        // 更新质押状态
        match period_index {
            0 => {
                stake.amount_30 += amount;
                stake.reward_debt_30 = stake.amount_30 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER;
                stake.last_claim_30 = clock.unix_timestamp;
            },
            1 => {
                stake.amount_90 += amount;
                stake.reward_debt_90 = stake.amount_90 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER;
                stake.last_claim_90 = clock.unix_timestamp;
            },
            2 => {
                stake.amount_180 += amount;
                stake.reward_debt_180 = stake.amount_180 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER;
                stake.last_claim_180 = clock.unix_timestamp;
            },
            3 => {
                stake.amount_360 += amount;
                stake.reward_debt_360 = stake.amount_360 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER;
                stake.last_claim_360 = clock.unix_timestamp;
            },
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        msg!(
            "Staked {} DQ for period {}",
            amount,
            match period_index {
                0 => "30 days",
                1 => "90 days",
                2 => "180 days",
                3 => "360 days",
                _ => "unknown",
            }
        );
        emit!(StakeDQEvent {
            user: ctx.accounts.owner.key(),
            amount,
            period_index,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 提取质押 ============

    pub fn unstake_dq(ctx: Context<UnstakeDq>, period_index: u8) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let lp_pool = &ctx.accounts.lp_pool;
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

        // 计算应计奖励
        let pending = amount * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - match period_index {
            0 => stake.reward_debt_30,
            1 => stake.reward_debt_90,
            2 => stake.reward_debt_180,
            3 => stake.reward_debt_360,
            _ => return err!(ErrorCode::InvalidPeriod),
        };

        // 清零质押金额
        match period_index {
            0 => {
                stake.amount_30 = 0;
                stake.reward_debt_30 = 0;
            },
            1 => {
                stake.amount_90 = 0;
                stake.reward_debt_90 = 0;
            },
            2 => {
                stake.amount_180 = 0;
                stake.reward_debt_180 = 0;
            },
            3 => {
                stake.amount_360 = 0;
                stake.reward_debt_360 = 0;
            },
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        // 领取奖励
        if pending > 0 {
            mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.dq_mint.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.sol_vault.to_account_info(),
                    },
                    &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
                ),
                pending,
            )?;
        }

        // 从质押账户转回用户本金
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stake_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.stake_account.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Unstaked {} DQ from period {}", amount, period_index);
        emit!(UnstakeDQEvent {
            user: ctx.accounts.owner.key(),
            amount,
            period_index,
            reward: pending,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取质押分红 ============

    pub fn claim_stake_reward(ctx: Context<ClaimStakeReward>, period_index: u8) -> Result<()> {
        let stake = &mut ctx.accounts.stake_state;
        let lp_pool = &ctx.accounts.lp_pool;
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

        let pending = amount * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER - match period_index {
            0 => stake.reward_debt_30,
            1 => stake.reward_debt_90,
            2 => stake.reward_debt_180,
            3 => stake.reward_debt_360,
            _ => return err!(ErrorCode::InvalidPeriod),
        };

        require!(pending > 0, ErrorCode::AlreadyClaimed);

        // 更新债务
        match period_index {
            0 => stake.reward_debt_30 = stake.amount_30 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER,
            1 => stake.reward_debt_90 = stake.amount_90 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER,
            2 => stake.reward_debt_180 = stake.amount_180 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER,
            3 => stake.reward_debt_360 = stake.amount_360 * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER,
            _ => return err!(ErrorCode::InvalidPeriod),
        }

        // 铸造 DQ 给用户
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
            ),
            pending,
        )?;

        msg!(
            "Claimed {} DQ stake reward for period {}",
            pending,
            period_index
        );
        emit!(ClaimStakeRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            period_index,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 购买节点 NFT ============

    pub fn buy_node(ctx: Context<BuyNode>, card_type: u8) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let user = &mut ctx.accounts.user_state;
        let clock = Clock::get()?;

        let price = match card_type {
            1 => PRICE_A,
            2 => PRICE_B,
            3 => PRICE_C,
            _ => return err!(ErrorCode::InvalidCardType),
        };

        require!(
            **ctx.accounts.user_lamports.borrow() >= price,
            ErrorCode::InsufficientBalance
        );

        // 扣除用户 SOL
        **ctx.accounts.user_lamports.try_borrow_mut_lamports()? -= price;
        // 转入合约 vault
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? += price;

        // 60% 进入 LP 池
        let lp_share = price * 60 / 100;
        // 15% 进入 NFT 分红池
        let nft_share = price * 15 / 100;
        // 25% 进入运营池 (合约余额)

        // 更新 LP 池
        ctx.accounts.lp_pool.total_shares += lp_share;

        // 更新 NFT 池
        let card_index = match card_type {
            1 => {
                ctx.accounts.nft_pool.total_a += 1;
                ctx.accounts.nft_pool.total_a
            },
            2 => {
                ctx.accounts.nft_pool.total_b += 1;
                ctx.accounts.nft_pool.total_b
            },
            3 => {
                ctx.accounts.nft_pool.total_c += 1;
                ctx.accounts.nft_pool.total_c
            },
            _ => return err!(ErrorCode::InvalidCardType),
        };

        // 更新 NFT 池累积
        _update_nft_pool_acc(&mut ctx.accounts.nft_pool, nft_share);

        // 更新用户等级
        let new_level = match card_type {
            1 => if user.level < 1 { 1 } else { user.level },
            2 => if user.level < 2 { 2 } else { user.level },
            3 => if user.level < 3 { 3 } else { user.level },
            _ => user.level,
        };
        user.level = new_level;

        // 铸造 NFT 给用户
        let nft_mint = match card_type {
            1 => &ctx.accounts.nft_mint_a,
            2 => &ctx.accounts.nft_mint_b,
            3 => &ctx.accounts.nft_mint_c,
            _ => return err!(ErrorCode::InvalidCardType),
        };

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: nft_mint.to_account_info(),
                    to: ctx.accounts.user_nft_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[state.sol_vault_bump]]],
            ),
            1,
        )?;

        msg!(
            "User {} bought node card type {} (price: {})",
            ctx.accounts.owner.key(),
            card_type,
            price
        );
        emit!(BuyNodeEvent {
            user: ctx.accounts.owner.key(),
            card_type,
            price,
            card_index,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 爆块 (每日奖励分发) ============

    pub fn block_mining(ctx: Context<BlockMining>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;

        // 检查是否到了下一个爆块时间 (24小时)
        require!(
            clock.unix_timestamp - state.last_block_time >= 86400,
            ErrorCode::TooEarlyToMine
        );

        // 计算本次释放的 DQ
        let release = state.circulating_supply * state.daily_release_rate / 1000;
        let burn = release * state.burn_rate / 10000;
        let remaining = release - burn;

        // 更新燃烧率 (最低 30%)
        if state.burn_rate > MIN_BURN_RATE {
            state.burn_rate -= BURN_DECREMENT;
        }

        // 分配合约持有的 DQ
        let lp_share = remaining * 60 / 100;
        let nft_share = remaining * 15 / 100;
        let foundation_share = remaining * 5 / 100;
        let team_share = remaining * 14 / 100;
        let partner_share = remaining * 6 / 100;

        // 更新 LP 池累积
        if ctx.accounts.lp_pool.total_shares > 0 {
            ctx.accounts.lp_pool.acc_per_share += lp_share * LP_SHARES_MULTIPLIER
                / ctx.accounts.lp_pool.total_shares;
        }

        // 更新 NFT 池累积
        _update_nft_pool_acc(&mut ctx.accounts.nft_pool, nft_share);

        // 更新团队池累积
        _update_team_pool_acc(&mut ctx.accounts.team_pool, team_share);

        // 更新合伙人池累积
        if ctx.accounts.partner_pool.total_partners > 0 && partner_share > 0 {
            ctx.accounts.partner_pool.acc_per_share += partner_share * LP_SHARES_MULTIPLIER
                / ctx.accounts.partner_pool.total_partners;
        }

        // 铸造基金会份额
        if foundation_share > 0 {
            mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.dq_mint.to_account_info(),
                        to: ctx.accounts.fund_account.to_account_info(),
                        authority: ctx.accounts.sol_vault.to_account_info(),
                    },
                    &[&[SEED_SOL_VAULT, &[state.sol_vault_bump]]],
                ),
                foundation_share,
            )?;
        }

        state.last_block_time = clock.unix_timestamp;

        msg!(
            "Block mined: release={}, burn={}, remaining={}",
            release,
            burn,
            remaining
        );
        emit!(BlockMiningEvent {
            release,
            burn,
            remaining,
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
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
            ),
            pending,
        )?;

        msg!(
            "Partner {} claimed {} DQ reward",
            ctx.accounts.owner.key(),
            pending
        );
        emit!(ClaimPartnerRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取 LP 分红 ============

    pub fn claim_lp_reward(ctx: Context<ClaimLpReward>) -> Result<()> {
        let user = &mut ctx.accounts.user_state;
        let lp_pool = &ctx.accounts.lp_pool;

        let pending = user.lp_shares * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER
            - user.lp_reward_debt;

        require!(pending > 0, ErrorCode::AlreadyClaimed);

        user.lp_reward_debt = user.lp_shares * lp_pool.acc_per_share / LP_SHARES_MULTIPLIER;

        // 铸造 DQ 给用户
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
            ),
            pending,
        )?;

        msg!("User {} claimed {} LP reward", ctx.accounts.owner.key(), pending);
        emit!(ClaimLpRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取 NFT 分红 ============

    pub fn claim_nft_reward(ctx: Context<ClaimNftReward>) -> Result<()> {
        let user = &mut ctx.accounts.user_state;
        let nft_pool = &ctx.accounts.nft_pool;
        let clock = Clock::get()?;

        let mut total_pending: u64 = 0;
        let mut total_a: u64 = 0;
        let mut total_b: u64 = 0;
        let mut total_c: u64 = 0;

        // 遍历用户持有的 NFT
        for i in 0..ctx.accounts.user_nft_accounts.len() {
            let nft_account = &ctx.accounts.user_nft_accounts[i];
            if nft_account.amount == 0 {
                continue;
            }

            // 判断是哪个 NFT mint
            let (card_type, acc_per_share) = if nft_account.mint == ctx.accounts.nft_mint_a.key() {
                total_a += nft_account.amount;
                (1u8, nft_pool.acc_per_share_a)
            } else if nft_account.mint == ctx.accounts.nft_mint_b.key() {
                total_b += nft_account.amount;
                (2u8, nft_pool.acc_per_share_b)
            } else if nft_account.mint == ctx.accounts.nft_mint_c.key() {
                total_c += nft_account.amount;
                (3u8, nft_pool.acc_per_share_c)
            } else {
                continue;
            };

            let pending = nft_account.amount * acc_per_share - match card_type {
                1 => user.nft_reward_debt,
                2 => user.nft_reward_debt,
                3 => user.nft_reward_debt,
                _ => 0,
            };
            total_pending += pending;
        }

        require!(total_pending > 0, ErrorCode::AlreadyClaimed);

        // 更新债务
        if total_a > 0 {
            user.nft_reward_debt = nft_pool.acc_per_share_a;
        }
        if total_b > 0 {
            user.nft_reward_debt = nft_pool.acc_per_share_b;
        }
        if total_c > 0 {
            user.nft_reward_debt = nft_pool.acc_per_share_c;
        }

        // 铸造 DQ 给用户
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
            ),
            total_pending,
        )?;

        msg!(
            "User {} claimed {} NFT reward",
            ctx.accounts.owner.key(),
            total_pending
        );
        emit!(ClaimNftRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: total_pending,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取团队分红 ============

    pub fn claim_team_reward(ctx: Context<ClaimTeamReward>) -> Result<()> {
        let user = &mut ctx.accounts.user_state;
        let team_pool = &ctx.accounts.team_pool;
        let clock = Clock::get()?;

        require!(user.d_level > 0, ErrorCode::NotPartner);

        let level_index = (user.d_level - 1) as usize;
        let pending = team_pool.acc_per_share[level_index] - user.d_reward_debt;

        require!(pending > 0, ErrorCode::AlreadyClaimed);

        user.d_reward_debt = team_pool.acc_per_share[level_index];

        // 铸造 DQ 给用户
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
                ),
            pending,
        )?;

        msg!(
            "User {} claimed {} team reward (level {})",
            ctx.accounts.owner.key(),
            pending,
            user.d_level
        );
        emit!(ClaimTeamRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            level: user.d_level,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 领取推荐奖励 ============

    pub fn claim_referral_reward(ctx: Context<ClaimReferralReward>) -> Result<()> {
        let user = &mut ctx.accounts.user_state;

        let pending = user.pending_rewards;
        require!(pending > 0, ErrorCode::AlreadyClaimed);
        require!(
            user.energy >= pending,
            ErrorCode::InsufficientBalance
        );

        user.pending_rewards = 0;
        user.energy -= pending;

        // 铸造 DQ 给用户
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[ctx.accounts.global_state.sol_vault_bump]]],
            ),
            pending,
        )?;

        msg!(
            "User {} claimed {} referral reward",
            ctx.accounts.owner.key(),
            pending
        );
        emit!(ClaimReferralRewardEvent {
            user: ctx.accounts.owner.key(),
            amount: pending,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 管理员: 设置 DQ 价格 ============

    pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(new_price > 0, ErrorCode::InvalidPrice);

        let old_price = state.dq_price;
        state.dq_price = new_price;

        msg!("DQ price updated: {} -> {}", old_price, new_price);
        emit!(PriceUpdatedEvent {
            old_price,
            new_price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 管理员: 设置 Raydium Router ============

    pub fn set_raydium_router(ctx: Context<SetRaydiumRouter>, router: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);

        state.raydium_router = router;

        msg!("Raydium router set to: {}", router);
        emit!(RaydiumRouterSetEvent {
            router,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 管理员: 添加初始节点 ============

    pub fn add_initial_nodes(
        ctx: Context<AddInitialNodes>,
        users: Vec<Pubkey>,
        card_types: Vec<u8>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;

        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(users.len() == card_types.len(), ErrorCode::InvalidAmount);

        for i in 0..users.len() {
            msg!(
                "Initial node {}: user={}, type={}",
                i,
                users[i],
                card_types[i]
            );
        }

        emit!(InitialNodesAddedEvent {
            count: users.len() as u64,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============ 管理员: 提取 SOL ============

    pub fn admin_withdraw_sol(ctx: Context<AdminWithdrawSol>, amount: u64) -> Result<()> {
        let state = &ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(
            **ctx.accounts.sol_vault.lamports.borrow() >= amount,
            ErrorCode::InsufficientBalance
        );

        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.admin.to_account_info().try_borrow_mut_lamports()? += amount;

        msg!("Admin withdrew {} lamports", amount);
        emit!(AdminWithdrawSolEvent {
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 管理员: 铸造 DQ (仅用于初始流动性) ============

    pub fn admin_mint_dq(
        ctx: Context<AdminMintDq>,
        to: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.admin.key() == state.admin, ErrorCode::Unauthorized);
        require!(
            state.circulating_supply + amount <= state.total_supply,
            ErrorCode::MaxSupplyExceeded
        );

        state.circulating_supply += amount;

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.dq_mint.to_account_info(),
                    to: ctx.accounts.to_token_account.to_account_info(),
                    authority: ctx.accounts.sol_vault.to_account_info(),
                },
                &[&[SEED_SOL_VAULT, &[state.sol_vault_bump]]],
            ),
            amount,
        )?;

        msg!("Admin minted {} DQ to {}", amount, to);
        emit!(AdminMintDqEvent {
            to,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============ 内部函数 ============

    fn _update_nft_pool_acc(nft_pool: &mut Account<NftPool>, amount: u64) {
        let total_a = nft_pool.total_a.max(1);
        let total_b = nft_pool.total_b.max(1);
        let total_c = nft_pool.total_c.max(1);

        if total_a > 0 {
            nft_pool.acc_per_share_a += amount * NFT_WEIGHT_A * LP_SHARES_MULTIPLIER / (total_a * 15);
        }
        if total_b > 0 {
            nft_pool.acc_per_share_b += amount * NFT_WEIGHT_B * LP_SHARES_MULTIPLIER / (total_b * 15);
        }
        if total_c > 0 {
            nft_pool.acc_per_share_c += amount * NFT_WEIGHT_C * LP_SHARES_MULTIPLIER / (total_c * 15);
        }
    }

    fn _update_team_pool_acc(team_pool: &mut Account<TeamPool>, amount: u64) {
        let per_level = amount / 8;
        let total: u64 = team_pool.level_users.iter().sum();
        if total > 0 {
            for i in 0..8 {
                if team_pool.level_users[i] > 0 {
                    team_pool.acc_per_share[i] += per_level * LP_SHARES_MULTIPLIER
                        / team_pool.level_users[i];
                }
            }
        }
    }
}

// ============ 事件定义 ============

#[event]
pub struct InitializeEvent {
    pub admin: Pubkey,
    pub dq_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct RegisterEvent {
    pub user: Pubkey,
    pub referrer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SwapSolForDQEvent {
    pub user: Pubkey,
    pub sol_amount: u64,
    pub dq_amount: u64,
    pub lp_share: u64,
    pub timestamp: i64,
}

#[event]
pub struct SwapDqForSolEvent {
    pub user: Pubkey,
    pub dq_amount: u64,
    pub sol_amount: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct StakeDQEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub period_index: u8,
    pub timestamp: i64,
}

#[event]
pub struct UnstakeDQEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub period_index: u8,
    pub reward: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimStakeRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub period_index: u8,
    pub timestamp: i64,
}

#[event]
pub struct BuyNodeEvent {
    pub user: Pubkey,
    pub card_type: u8,
    pub price: u64,
    pub card_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct BlockMiningEvent {
    pub release: u64,
    pub burn: u64,
    pub remaining: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimPartnerRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimLpRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimNftRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimTeamRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub level: u8,
    pub timestamp: i64,
}

#[event]
pub struct ClaimReferralRewardEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PriceUpdatedEvent {
    pub old_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct RaydiumRouterSetEvent {
    pub router: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct InitialNodesAddedEvent {
    pub count: u64,
    pub timestamp: i64,
}

#[event]
pub struct AdminWithdrawSolEvent {
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct AdminMintDqEvent {
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ============ Account Contexts ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<GlobalState>(),
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<LpPool>(),
        seeds = [SEED_LP_POOL],
        bump
    )]
    pub lp_pool: Account<'info, LpPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<NftPool>(),
        seeds = [SEED_NFT_POOL],
        bump
    )]
    pub nft_pool: Account<'info, NftPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<TeamPool>(),
        seeds = [SEED_TEAM_POOL],
        bump
    )]
    pub team_pool: Account<'info, TeamPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + size_of::<PartnerPool>(),
        seeds = [SEED_PARTNER_POOL],
        bump
    )]
    pub partner_pool: Account<'info, PartnerPool>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [SEED_DQ_MINT],
        bump,
        mint::decimals = 9,
        mint::authority = sol_vault,
    )]
    pub dq_mint: Account<'info, Mint>,

    /// CHECK: SOL vault PDA
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [SEED_SOL_VAULT],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,

    /// CHECK: NFT Mint A
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [SEED_NFT_MINT, &[1u8]],
        bump,
        mint::decimals = 0,
        mint::authority = sol_vault,
    )]
    pub nft_mint_a: Account<'info, Mint>,

    /// CHECK: NFT Mint B
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [SEED_NFT_MINT, &[2u8]],
        bump,
        mint::decimals = 0,
        mint::authority = sol_vault,
    )]
    pub nft_mint_b: Account<'info, Mint>,

    /// CHECK: NFT Mint C
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [SEED_NFT_MINT, &[3u8]],
        bump,
        mint::decimals = 0,
        mint::authority = sol_vault,
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

    /// CHECK: Referrer account (may not be initialized)
    pub referrer: AccountInfo<'info>,
    
    /// CHECK: Referrer state
    #[account(
        constraint = referrer_state.owner == referrer.key()
    )]
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

    #[account(mut)]
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
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = owner,
        space = 8 + size_of::<StakeState>(),
        seeds = [SEED_STAKE, owner.key().as_ref()],
        bump
    )]
    pub stake_state: Account<'info, StakeState>,

    #[account(
        init,
        payer = owner,
        space = 8 + size_of::<TokenAccountState>(),
        seeds = [b"stake_token", owner.key().as_ref()],
        bump,
        token::mint = dq_mint,
        token::authority = stake_state,
    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeDq<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub stake_state: Account<'info, StakeState>,

    #[account(mut)]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimStakeReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub stake_state: Account<'info, StakeState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyNode<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_lamports: AccountInfo<'info>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    #[account(mut)]
    pub nft_pool: Account<'info, NftPool>,

    pub nft_mint_a: Account<'info, Mint>,
    pub nft_mint_b: Account<'info, Mint>,
    pub nft_mint_c: Account<'info, Mint>,

    #[account(mut)]
    pub user_nft_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BlockMining<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    #[account(mut)]
    pub nft_pool: Account<'info, NftPool>,

    #[account(mut)]
    pub team_pool: Account<'info, TeamPool>,

    #[account(mut)]
    pub partner_pool: Account<'info, PartnerPool>,

    /// CHECK: Foundation fund account
    pub fund_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimPartnerReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub partner_pool: Account<'info, PartnerPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimLpReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_pool: Account<'info, LpPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimNftReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub nft_mint_a: Account<'info, Mint>,
    pub nft_mint_b: Account<'info, Mint>,
    pub nft_mint_c: Account<'info, Mint>,

    #[account(mut)]
    pub user_nft_accounts: Vec<Account<'info, TokenAccount>>,

    pub nft_pool: Account<'info, NftPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimTeamReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub team_pool: Account<'info, TeamPool>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimReferralReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

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
pub struct SetRaydiumRouter<'info> {
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

#[derive(Accounts)]
pub struct AdminWithdrawSol<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AdminMintDq<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub dq_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub to_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
