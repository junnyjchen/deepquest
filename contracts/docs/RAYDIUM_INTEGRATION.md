# Raydium DEX 集成指南

## 概述

本指南说明如何将 DeepQuest DeFi 合约与 Raydium DEX 集成，实现真正的链上代币兑换。

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        DQProject Program                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   SWAP SOL   │→ │   RAYDIUM   │→ │  Swap Instruction    │   │
│  │   FOR DQ     │  │   Router    │  │  CPI Call            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         ↑                                                    │
│         │                                                    │
│  ┌──────┴──────┐                                             │
│  │ User's SOL  │                                             │
│  │ Account     │                                             │
│  └─────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Raydium DEX                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Pool State  │  │ AMM Program  │  │ Token Vaults         │ │
│  │  (Accounts)  │  │              │  │ (SOL/DQ LP)          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Raydium V2 关键信息

### 官方资源
- **Raydium Router**: `CAMMCzo5YL8w3VFFTF9UPMM3o4fsv9qTgHRk4zf3igUv`
- **AmmProgram**: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- **官方文档**: https://docs.raydium.io/

### 代币标准
- **SPL Token**: 标准代币接口
- **Token Vault**: 存储流动性池代币

## 集成步骤

### 步骤 1: 获取流动性池信息

```typescript
import { PublicKey } from "@solana/web3.js";

// Raydium 流动性池地址
interface LiquidityPool {
  id: PublicKey;           // 池子 ID
  baseMint: PublicKey;      // 基础代币 (SOL)
  quoteMint: PublicKey;     // 报价代币 (DQ)
  baseVault: PublicKey;     // 基础代币保险库
  quoteVault: PublicKey;    // 报价代币保险库
  authority: PublicKey;     // 授权地址
}

// DQ/SOL 池 (需要先在 Raydium 创建)
export const DQ_SOL_POOL: LiquidityPool = {
  id: new PublicKey("YOUR_POOL_ID"),
  baseMint: new PublicKey("So11111111111111111111111111111111111111112"), // SOL
  quoteMint: new PublicKey("DQ_MINT_ADDRESS"),
  baseVault: new PublicKey("POOL_BASE_VAULT"),
  quoteVault: new PublicKey("POOL_QUOTE_VAULT"),
  authority: new PublicKey("RAYDIUM_AUTHORITY"),
};
```

### 步骤 2: 实现 CPI 调用

修改合约添加 Raydium CPI:

```rust
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
    pubkey::Pubkey,
};

// Raydium Router 地址
const RAYDIUM_ROUTER: Pubkey = Pubkey::new_from_array([
    0xC1, 0xAM, 0xMC, 0xzo, 0x5Y, 0xL8, 0xw3, 0xVF,
    0xFT, 0xF9, 0xUP, 0xMM, 0x3o, 0x4f, 0sv, 0x9q,
    0xTg, 0xHR, 0x4k, 0x4z, 0xf3, 0xi, 0xgU, 0xv,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

/// 通过 Raydium 进行 SOL -> DQ 交换
fn raydium_swap_sol_for_dq(
    accounts: &SwapSolForDq,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    // 构建 Raydium swap 指令
    let raydium_instruction = build_raydium_swap_instruction(
        RAYDIUM_ROUTER,
        accounts.user.to_account_info(),
        accounts.sol_vault.to_account_info(),
        accounts.dq_mint.to_account_info(),
        // ... 其他必要账户
        amount_in,
        min_amount_out,
    )?;

    // 调用 Raydium
    invoke(
        &raydium_instruction,
        &[
            // 账户列表
        ],
    )?;

    Ok(())
}

/// 构建 Raydium swap 指令
fn build_raydium_swap_instruction(
    program_id: Pubkey,
    user: AccountInfo,
    // ... 其他参数
    amount_in: u64,
    min_amount_out: u64,
) -> Result<Instruction> {
    // 参考 Raydium SDK 文档构建指令
    let accounts = vec![
        AccountMeta::new(user.key(), true),
        // ... 其他账户
    ];

    let data = encode_swap_data(amount_in, min_amount_out);

    Ok(Instruction {
        program_id,
        accounts,
        data,
    })
}
```

### 步骤 3: 前端集成

```typescript
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { DQProjectSDK } from "./sdk";
import {
  LiquidityPool,
  RouteInfo,
  SwapMode,
} from "./types/raydium";

class RaydiumIntegration {
  private sdk: DQProjectSDK;
  private connection: Connection;

  constructor(sdk: DQProjectSDK, connection: Connection) {
    this.sdk = sdk;
    this.connection = connection;
  }

  /**
   * 获取最优兑换路径
   */
  async getSwapRoute(
    amountIn: number,
    tokenIn: PublicKey,
    tokenOut: PublicKey,
    slippage: number = 0.5
  ): Promise<RouteInfo> {
    // 调用 Raydium API 获取路由
    const response = await fetch("https://api.raydium.io/v2/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputMint: tokenIn.toString(),
        outputMint: tokenOut.toString(),
        amount: amountIn,
        slippageBps: Math.floor(slippage * 100),
      }),
    });

    return await response.json();
  }

  /**
   * 执行兑换
   */
  async executeSwap(
    route: RouteInfo,
    wallet: Keypair
  ): Promise<string> {
    // 构建交易
    const transaction = new Transaction();

    // 1. 创建 DQ 代币账户 (如果不存在)
    const userDqAccount = await this.sdk.getUserTokenAccount(wallet.publicKey);
    // ...

    // 2. 添加兑换指令
    // ... (使用 Raydium SDK)

    // 3. 发送交易
    const signature = await this.connection.sendTransaction(transaction, [wallet]);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  /**
   * 获取池子信息
   */
  async getPoolInfo(poolId: PublicKey): Promise<LiquidityPool | null> {
    const response = await fetch(
      `https://api.raydium.io/v2/pools/${poolId.toString()}`
    );
    
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * 计算预估输出
   */
  calculateOutputAmount(
    amountIn: number,
    poolInfo: LiquidityPool
  ): number {
    // 使用 AMM 公式: x * y = k
    const reserveIn = poolInfo.baseReserve;
    const reserveOut = poolInfo.quoteReserve;
    
    const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    const fee = amountOut * 0.0025; // 0.25% 手续费
    
    return amountOut - fee;
  }
}
```

### 步骤 4: 监控和健康检查

```typescript
class RaydiumHealthMonitor {
  private sdk: DQProjectSDK;
  private poolId: PublicKey;

  constructor(sdk: DQProjectSDK, poolId: PublicKey) {
    this.sdk = sdk;
    this.poolId = poolId;
  }

  /**
   * 检查池子健康状态
   */
  async checkPoolHealth(): Promise<{
    isHealthy: boolean;
    tvl: number;
    volume24h: number;
    price: number;
  }> {
    const poolInfo = await this.getPoolInfo();
    
    if (!poolInfo) {
      return {
        isHealthy: false,
        tvl: 0,
        volume24h: 0,
        price: 0,
      };
    }

    const tvl = poolInfo.tvl || 0;
    const volume24h = poolInfo.volume24h || 0;
    const price = Number(poolInfo.price) || 0;

    // 健康检查标准
    const isHealthy = tvl > 100_000 && // TVL > 100K
                      volume24h > 10_000 && // 日交易量 > 10K
                      price > 0;

    return { isHealthy, tvl, volume24h, price };
  }

  /**
   * 备用方案: 使用合约内部价格
   */
  getFallbackPrice(): anchor.BN {
    // 当 Raydium 池不可用时使用合约价格
    return new anchor.BN(1_000_000_000); // 1 DQ = 1 SOL
  }

  /**
   * 异步监控任务
   */
  startMonitoring(intervalMs: number = 60000) {
    setInterval(async () => {
      const health = await this.checkPoolHealth();
      
      if (!health.isHealthy) {
        console.warn("⚠️ Raydium pool health check failed:", health);
        // 触发告警
        await this.alert("Pool unhealthy");
      }
    }, intervalMs);
  }

  private async alert(message: string) {
    // 发送告警 (email, discord, etc.)
    console.error("ALERT:", message);
  }
}
```

## 完整集成示例

```typescript
import * as anchor from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DQProjectSDK } from "./sdk";
import { RaydiumIntegration } from "./raydium";

async function main() {
  // 1. 初始化
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const wallet = Keypair.fromSeed(/* 你的种子 */);
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  
  const sdk = new DQProjectSDK(provider);
  const raydium = new RaydiumIntegration(sdk, connection);

  // 2. 检查池子状态
  const health = await raydium.checkPoolHealth();
  
  if (health.isHealthy) {
    // 3. 获取兑换路由
    const route = await raydium.getSwapRoute(
      1 * 1_000_000_000, // 1 SOL
      new PublicKey("So11111111111111111111111111111111111111112"), // SOL
      await sdk.getDqMint(),
      0.5 // 0.5% 滑点
    );

    // 4. 执行兑换
    const tx = await raydium.executeSwap(route, wallet);
    console.log("Swap successful:", tx);
  } else {
    // 使用备用方案
    console.log("Using fallback: Direct contract swap");
    await sdk.swapSolForDq(new anchor.BN(1_000_000_000));
  }
}

main();
```

## 注意事项

1. **滑点设置**: 建议设置 0.5% - 1% 滑点，防止 MEV 攻击
2. **价格监控**: 实时监控池子状态，设置告警
3. **备用方案**: 合约内设置备用价格机制
4. **Gas 费用**: Solana 交易费用很低，但大额交易需要更多 Compute Units
5. **重试机制**: 网络波动时需要重试逻辑

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Swap 失败 | 检查池子余额和滑点设置 |
| 价格偏差大 | 可能是池子被攻击，切换备用方案 |
| CPI 调用失败 | 检查账户顺序和权限 |
| 交易超时 | 增加超时时间和重试次数 |
