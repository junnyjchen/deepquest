import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { DqProject } from "./types/dq_project";

export {
  Program,
  anchor,
  PublicKey,
};

export type DqProjectProgram = Program<DqProject>;

// ============ 账户类型 ============

export interface GlobalState {
  admin: anchor.web3.PublicKey;
  dqMint: anchor.web3.PublicKey;
  solVault: anchor.web3.PublicKey;
  lpPool: anchor.web3.PublicKey;
  nftPool: anchor.web3.PublicKey;
  teamPool: anchor.web3.PublicKey;
  partnerPool: anchor.web3.PublicKey;
  nftMintA: anchor.web3.PublicKey;
  nftMintB: anchor.web3.PublicKey;
  nftMintC: anchor.web3.PublicKey;
  raydiumRouter: anchor.web3.PublicKey;
  dqPrice: anchor.BN;
  totalSupply: anchor.BN;
  circulatingSupply: anchor.BN;
  dailyReleaseRate: anchor.BN;
  lastBlockTime: anchor.BN;
  burnRate: anchor.BN;
  partnerCount: anchor.BN;
  bump: number;
  solVaultBump: number;
}

export interface UserState {
  owner: anchor.web3.PublicKey;
  referrer: anchor.web3.PublicKey;
  directCount: anchor.BN;
  level: number;
  totalInvest: anchor.BN;
  teamInvest: anchor.BN;
  energy: anchor.BN;
  lpShares: anchor.BN;
  directSales: anchor.BN;
  dLevel: number;
  pendingRewards: anchor.BN;
  totalClaimed: anchor.BN;
  isPartner: boolean;
  partnerOrder: anchor.BN;
  stakeShares: anchor.BN;
  lpRewardDebt: anchor.BN;
  nftRewardDebt: anchor.BN;
  dRewardDebt: anchor.BN;
  createdAt: anchor.BN;
  bump: number;
}

export interface StakeState {
  owner: anchor.web3.PublicKey;
  amount30: anchor.BN;
  amount90: anchor.BN;
  amount180: anchor.BN;
  amount360: anchor.BN;
  rewardDebt30: anchor.BN;
  rewardDebt90: anchor.BN;
  rewardDebt180: anchor.BN;
  rewardDebt360: anchor.BN;
  lastClaim30: anchor.BN;
  lastClaim90: anchor.BN;
  lastClaim180: anchor.BN;
  lastClaim360: anchor.BN;
  bump: number;
}

export interface LpPool {
  totalShares: anchor.BN;
  accPerShare: anchor.BN;
  lastUpdate: anchor.BN;
  bump: number;
}

export interface NftPool {
  totalA: anchor.BN;
  totalB: anchor.BN;
  totalC: anchor.BN;
  accPerShareA: anchor.BN;
  accPerShareB: anchor.BN;
  accPerShareC: anchor.BN;
  lastUpdate: anchor.BN;
  bump: number;
}

// ============ 常量 ============

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const TOTAL_SUPPLY = new anchor.BN(100_000_000_000_000);
export const PRICE_A = new anchor.BN(500_000_000_000);
export const PRICE_B = new anchor.BN(1_000_000_000_000);
export const PRICE_C = new anchor.BN(3_000_000_000_000);
export const PERIOD_30 = 0;
export const PERIOD_90 = 1;
export const PERIOD_180 = 2;
export const PERIOD_360 = 3;

// ============ 种子 ============

export const SEED_GLOBAL_STATE = Buffer.from("global_state");
export const SEED_LP_POOL = Buffer.from("lp_pool");
export const SEED_NFT_POOL = Buffer.from("nft_pool");
export const SEED_TEAM_POOL = Buffer.from("team_pool");
export const SEED_PARTNER_POOL = Buffer.from("partner_pool");
export const SEED_DQ_MINT = Buffer.from("dq_mint");
export const SEED_SOL_VAULT = Buffer.from("sol_vault");
export const SEED_NFT_MINT = Buffer.from("nft_mint");
export const SEED_USER = Buffer.from("user");
export const SEED_STAKE = Buffer.from("stake");
