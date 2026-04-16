/**
 * DQProject TypeScript SDK
 * DeepQuest DeFi Platform on Solana
 * 
 * 使用方法:
 * import { DQProjectSDK } from './ts/sdk';
 * const sdk = new DQProjectSDK(provider, programId);
 * await sdk.initialize(price);
 */

// ============ 类型定义 ============

export interface GlobalState {
  admin: string;
  dqMint: string;
  solVault: string;
  lpPool: string;
  nftPool: string;
  teamPool: string;
  partnerPool: string;
  nftMintA: string;
  nftMintB: string;
  nftMintC: string;
  raydiumRouter: string;
  dqPrice: anchor.BN;
  totalSupply: anchor.BN;
  circulatingSupply: anchor.BN;
  dailyReleaseRate: anchor.BN;
  lastBlockTime: anchor.BN;
  burnRate: anchor.BN;
  partnerCount: anchor.BN;
  emergencyPause: boolean;
  freezeUntil: anchor.BN;
  bump: number;
  solVaultBump: number;
}

export interface UserState {
  owner: string;
  referrer: string;
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
  lastClaimTime: anchor.BN;
  bump: number;
}

export interface StakeState {
  owner: string;
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
  totalStaked30: anchor.BN;
  totalStaked90: anchor.BN;
  totalStaked180: anchor.BN;
  totalStaked360: anchor.BN;
  bump: number;
}

export interface LpPool {
  totalShares: anchor.BN;
  accPerShare: anchor.BN;
  lastUpdate: anchor.BN;
  totalStaked: anchor.BN;
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

const SEED_ADMIN = "admin";
const SEED_DQ_MINT = "dq_mint";
const SEED_SOL_VAULT = "sol_vault";
const SEED_LP_POOL = "lp_pool";
const SEED_NFT_POOL = "nft_pool";
const SEED_TEAM_POOL = "team_pool";
const SEED_PARTNER_POOL = "partner_pool";
const SEED_USER = "user";
const SEED_STAKE = "stake";
const SEED_NFT_MINT = "nft_mint";

const LAMPORTS_PER_SOL = 1_000_000_000;
const DQ_DECIMALS = 9;

// 卡牌价格
export const CARD_PRICES = {
  A: 500 * LAMPORTS_PER_SOL,   // 500 SOL
  B: 1000 * LAMPORTS_PER_SOL,  // 1000 SOL
  C: 3000 * LAMPORTS_PER_SOL,  // 3000 SOL
};

// 质押周期
export const STAKE_PERIODS = {
  DAYS_30: 0,
  DAYS_90: 1,
  DAYS_180: 2,
  DAYS_360: 3,
};

// 年化收益率 (基点)
export const STAKE_RATES = {
  [STAKE_PERIODS.DAYS_30]: 500,   // 5%
  [STAKE_PERIODS.DAYS_90]: 1000,  // 10%
  [STAKE_PERIODS.DAYS_180]: 1500, // 15%
  [STAKE_PERIODS.DAYS_360]: 2000, // 20%
};

// ============ SDK 类 ============

export class DQProjectSDK {
  private provider: anchor.AnchorProvider;
  private program: anchor.Program<DqProject>;
  private programId: PublicKey;

  constructor(
    provider: anchor.AnchorProvider,
    programId: PublicKey = new PublicKey("DQProject111111111111111111111111111111111")
  ) {
    this.provider = provider;
    this.programId = programId;
    this.program = new anchor.Program<DqProject>(
      require("../idl/dq_project.json"),
      programId,
      provider
    );
  }

  // ============ PDA 派生 ============

  async getGlobalState(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      this.programId
    );
    return address;
  }

  async getLpPool(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_LP_POOL)],
      this.programId
    );
    return address;
  }

  async getNftPool(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_NFT_POOL)],
      this.programId
    );
    return address;
  }

  async getTeamPool(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_TEAM_POOL)],
      this.programId
    );
    return address;
  }

  async getPartnerPool(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_PARTNER_POOL)],
      this.programId
    );
    return address;
  }

  async getSolVault(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_SOL_VAULT)],
      this.programId
    );
    return address;
  }

  async getDqMint(): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_DQ_MINT)],
      this.programId
    );
    return address;
  }

  async getUserState(user: PublicKey): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_USER), user.toBuffer()],
      this.programId
    );
    return address;
  }

  async getStakeState(user: PublicKey): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_STAKE), user.toBuffer()],
      this.programId
    );
    return address;
  }

  async getNftMint(cardType: number): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from(SEED_NFT_MINT), Buffer.from([cardType])],
      this.programId
    );
    return address;
  }

  async getUserTokenAccount(user: PublicKey): Promise<PublicKey> {
    const mint = await this.getDqMint();
    return anchor.utils.token.associatedAddress({ mint, owner: user });
  }

  async getUserNftAccount(user: PublicKey, cardType: number): Promise<PublicKey> {
    const mint = await this.getNftMint(cardType);
    return anchor.utils.token.associatedAddress({ mint, owner: user });
  }

  // ============ 查询方法 ============

  async getGlobalStateData(): Promise<GlobalState | null> {
    try {
      const address = await this.getGlobalState();
      return await this.program.account.globalState.fetch(address);
    } catch (e) {
      return null;
    }
  }

  async getUserStateData(user: PublicKey): Promise<UserState | null> {
    try {
      const address = await this.getUserState(user);
      return await this.program.account.userState.fetch(address);
    } catch (e) {
      return null;
    }
  }

  async getStakeStateData(user: PublicKey): Promise<StakeState | null> {
    try {
      const address = await this.getStakeState(user);
      return await this.program.account.stakeState.fetch(address);
    } catch (e) {
      return null;
    }
  }

  async getLpPoolData(): Promise<LpPool | null> {
    try {
      const address = await this.getLpPool();
      return await this.program.account.lpPool.fetch(address);
    } catch (e) {
      return null;
    }
  }

  async getSolVaultBalance(): Promise<number> {
    const vault = await this.getSolVault();
    return await this.provider.connection.getBalance(vault);
  }

  // ============ 计算方法 ============

  /**
   * 计算 SOL 换 DQ 的数量
   */
  calculateDqFromSol(solAmount: number, dqPrice: anchor.BN): anchor.BN {
    const lamports = new anchor.BN(solAmount * LAMPORTS_PER_SOL);
    return lamports.mul(new anchor.BN(10 ** DQ_DECIMALS)).div(dqPrice);
  }

  /**
   * 计算 DQ 换 SOL 的数量
   */
  calculateSolFromDq(dqAmount: anchor.BN, dqPrice: anchor.BN): anchor.BN {
    return dqAmount.mul(dqPrice).div(new anchor.BN(10 ** DQ_DECIMALS));
  }

  /**
   * 计算质押年化收益
   */
  calculateAnnualReward(stakeAmount: anchor.BN, periodIndex: number): anchor.BN {
    const rate = STAKE_RATES[periodIndex] || 0;
    return stakeAmount.mul(new anchor.BN(rate)).div(new anchor.BN(10000));
  }

  /**
   * 计算每日释放量
   */
  calculateDailyRelease(circulatingSupply: anchor.BN, releaseRate: anchor.BN): anchor.BN {
    return circulatingSupply.mul(releaseRate).div(new anchor.BN(1000));
  }

  // ============ 交易方法 ============

  /**
   * 初始化合约
   */
  async initialize(dqPrice: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();
    const lpPool = await this.getLpPool();
    const nftPool = await this.getNftPool();
    const teamPool = await this.getTeamPool();
    const partnerPool = await this.getPartnerPool();
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const nftMintA = await this.getNftMint(1);
    const nftMintB = await this.getNftMint(2);
    const nftMintC = await this.getNftMint(3);

    return await this.program.methods
      .initialize(dqPrice)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
        lpPool,
        nftPool,
        teamPool,
        partnerPool,
        dqMint,
        solVault,
        nftMintA,
        nftMintB,
        nftMintC,
      })
      .rpc();
  }

  /**
   * 注册用户
   */
  async register(referrer: PublicKey): Promise<string> {
    const userState = await this.getUserState(this.provider.wallet.publicKey);
    const globalState = await this.getGlobalState();

    return await this.program.methods
      .register(referrer)
      .accounts({
        owner: this.provider.wallet.publicKey,
        userState,
        globalState,
      })
      .rpc();
  }

  /**
   * SOL 换 DQ
   */
  async swapSolForDq(amount: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();
    const userState = await this.getUserState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .swapSolForDq(amount)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        userState,
        dqMint,
        solVault,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * DQ 换 SOL
   */
  async swapDqForSol(dqAmount: anchor.BN, minOut: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .swapDqForSol(dqAmount, minOut)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        dqMint,
        solVault,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * 质押 DQ
   * @param amount 质押数量
   * @param periodIndex 周期索引 (0=30天, 1=90天, 2=180天, 3=360天)
   */
  async stakeDq(amount: anchor.BN, periodIndex: number): Promise<string> {
    const globalState = await this.getGlobalState();
    const stakeState = await this.getStakeState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .stakeDq(amount, periodIndex)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        stakeState,
        dqMint,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * 解除质押
   */
  async unstakeDq(periodIndex: number): Promise<string> {
    const globalState = await this.getGlobalState();
    const stakeState = await this.getStakeState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .unstakeDq(periodIndex)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        stakeState,
        dqMint,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * 领取质押奖励
   */
  async claimStakeReward(periodIndex: number): Promise<string> {
    const globalState = await this.getGlobalState();
    const stakeState = await this.getStakeState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .claimStakeReward(periodIndex)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        stakeState,
        dqMint,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * 购买节点 NFT
   * @param cardType 卡牌类型 (1=A, 2=B, 3=C)
   */
  async buyNode(cardType: number): Promise<string> {
    const globalState = await this.getGlobalState();
    const userState = await this.getUserState(this.provider.wallet.publicKey);
    const solVault = await this.getSolVault();
    const lpPool = await this.getLpPool();
    const nftPool = await this.getNftPool();
    const nftMintA = await this.getNftMint(1);
    const nftMintB = await this.getNftMint(2);
    const nftMintC = await this.getNftMint(3);
    const userNftAccount = await this.getUserNftAccount(this.provider.wallet.publicKey, cardType);

    return await this.program.methods
      .buyNode(cardType)
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        userState,
        solVault,
        lpPool,
        nftPool,
        nftMintA,
        nftMintB,
        nftMintC,
        userNftAccount,
      })
      .rpc();
  }

  /**
   * 领取 LP 奖励
   */
  async claimLpReward(): Promise<string> {
    const globalState = await this.getGlobalState();
    const userState = await this.getUserState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);
    const lpPool = await this.getLpPool();

    return await this.program.methods
      .claimLpReward()
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        userState,
        dqMint,
        solVault,
        userTokenAccount,
        lpPool,
      })
      .rpc();
  }

  /**
   * 领取推荐奖励
   */
  async claimReferralReward(): Promise<string> {
    const globalState = await this.getGlobalState();
    const userState = await this.getUserState(this.provider.wallet.publicKey);
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const userTokenAccount = await this.getUserTokenAccount(this.provider.wallet.publicKey);

    return await this.program.methods
      .claimReferralReward()
      .accounts({
        owner: this.provider.wallet.publicKey,
        globalState,
        userState,
        dqMint,
        solVault,
        userTokenAccount,
      })
      .rpc();
  }

  /**
   * 爆块 (管理员)
   */
  async blockMining(fundAccount: PublicKey): Promise<string> {
    const globalState = await this.getGlobalState();
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const lpPool = await this.getLpPool();
    const nftPool = await this.getNftPool();
    const teamPool = await this.getTeamPool();
    const partnerPool = await this.getPartnerPool();

    return await this.program.methods
      .blockMining()
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
        dqMint,
        solVault,
        lpPool,
        nftPool,
        teamPool,
        partnerPool,
        fundAccount,
      })
      .rpc();
  }

  // ============ 管理员方法 ============

  /**
   * 暂停合约
   */
  async pause(reason: string): Promise<string> {
    const globalState = await this.getGlobalState();

    return await this.program.methods
      .pause(reason)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
      })
      .rpc();
  }

  /**
   * 解除暂停
   */
  async unpause(): Promise<string> {
    const globalState = await this.getGlobalState();

    return await this.program.methods
      .unpause()
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
      })
      .rpc();
  }

  /**
   * 设置 DQ 价格
   */
  async setPrice(newPrice: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();

    return await this.program.methods
      .setPrice(newPrice)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
      })
      .rpc();
  }

  /**
   * 设置 Raydium 路由
   */
  async setRaydiumRouter(router: PublicKey): Promise<string> {
    const globalState = await this.getGlobalState();

    return await this.program.methods
      .setRaydiumRouter(router)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
      })
      .rpc();
  }

  /**
   * 管理员提款 SOL
   */
  async adminWithdrawSol(amount: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();
    const solVault = await this.getSolVault();

    return await this.program.methods
      .adminWithdrawSol(amount)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
        solVault,
      })
      .rpc();
  }

  /**
   * 管理员铸造 DQ
   */
  async adminMintDq(to: PublicKey, amount: anchor.BN): Promise<string> {
    const globalState = await this.getGlobalState();
    const dqMint = await this.getDqMint();
    const solVault = await this.getSolVault();
    const toTokenAccount = anchor.utils.token.associatedAddress({ mint: dqMint, owner: to });

    return await this.program.methods
      .adminMintDq(to, amount)
      .accounts({
        admin: this.provider.wallet.publicKey,
        globalState,
        dqMint,
        solVault,
        toTokenAccount,
      })
      .rpc();
  }

  // ============ 工具方法 ============

  /**
   * 等待交易确认
   */
  async waitForSignature(signature: string, timeout: number = 30000): Promise<void> {
    const blockhash = await this.provider.connection.getLatestBlockhash();
    await this.provider.connection.confirmTransaction(
      {
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  }

  /**
   * 获取用户概览
   */
  async getUserOverview(wallet: PublicKey): Promise<{
    userState: UserState | null;
    stakeState: StakeState | null;
    tokenBalance: number;
  }> {
    const userState = await this.getUserStateData(wallet);
    const stakeState = await this.getStakeStateData(wallet);
    
    let tokenBalance = 0;
    try {
      const tokenAccount = await this.getUserTokenAccount(wallet);
      const balance = await this.provider.connection.getTokenAccountBalance(tokenAccount);
      tokenBalance = Number(balance.value.amount) / (10 ** DQ_DECIMALS);
    } catch (e) {
      // Token account may not exist
    }

    return { userState, stakeState, tokenBalance };
  }

  /**
   * 格式化 DQ 数量
   */
  formatDq(amount: anchor.BN): string {
    return (Number(amount) / (10 ** DQ_DECIMALS)).toLocaleString();
  }

  /**
   * 格式化 SOL 数量
   */
  formatSol(lamports: anchor.BN): string {
    return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);
  }
}

// 导出类型
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

// 类型别名
type DqProject = any; // 实际从 IDL 生成

export default DQProjectSDK;
