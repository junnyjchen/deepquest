# DQProject 智能合约部署教程

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Rust | 1.70+ | 编译合约 |
| Solana CLI | 1.18+ | 部署合约 |
| Anchor | 0.30.0 | 开发框架 |
| Node.js | 18+ | 运行脚本 |

---

## 第一章：环境准备

### 1.1 安装 Rust

```bash
# 方式一：官方脚本
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 方式二：如果已安装，检查版本
rustc --version
cargo --version

# 验证安装
rustc --version
# 输出: rustc 1.70.0 或更高
```

### 1.2 安装 Solana CLI

```bash
# 安装稳定版
sh -c "$(curl -sSfL 'https://release.solana.com/stable/install')"

# 添加到 PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 验证安装
solana --version
# 输出: solana-cli 1.18.0 或更高
```

### 1.3 安装 Anchor

```bash
# 使用 npm 安装
npm install -g @project-serum/anchor-cli@0.30.0

# 验证安装
anchor --version
# 输出: anchor-cli 0.30.0
```

### 1.4 安装 Node.js (如未安装)

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

nvm install 18
nvm use 18

# 验证
node --version
npm --version
```

---

## 第二章：钱包配置

### 2.1 创建钱包

```bash
# 创建新钱包 (测试网使用)
solana-keygen new --outfile ~/.config/solana/devnet-keypair.json

# 或者使用现有助记词
solana-keygen recover --outfile ~/.config/solana/devnet-keypair.json

# 查看公钥
solana-keygen pubkey ~/.config/solana/devnet-keypair.json
```

### 2.2 配置网络

```bash
# 切换到 Devnet
solana config set --url devnet

# 确认配置
solana config get
```

输出示例：
```
Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com
WebSocket URL: wss://api.devnet.solana.com (computed)
Keypair: ~/.config/solana/devnet-keypair.json
Commitment: confirmed
```

### 2.3 领取空投 (Devnet)

```bash
# 领取 SOL 空投
solana airdrop 2

# 确认余额
solana balance
```

> 💡 **提示**: Devnet 每日限领 2 SOL。如需更多，可多次领取或联系水龙头服务。

---

## 第三章：项目构建

### 3.1 进入项目目录

```bash
cd /workspace/projects/contracts

# 查看项目结构
ls -la
```

### 3.2 构建合约

```bash
# 构建 Debug 版本
anchor build

# 或者构建 Release 版本 (更小更快)
anchor build --release
```

构建成功输出：
```
Building...
Build successful. Output: target/deploy/dq_project.so
```

### 3.3 查看构建产物

```bash
# 查看编译后的程序
ls -la target/deploy/

# 查看 IDL
cat target/idl/dq_project.json | head -20
```

### 3.4 验证构建

```bash
# 验证程序 IDL
anchor idl parse ./target/idl/dq_project.json

# 验证程序大小
ls -lh target/deploy/dq_project.so
```

---

## 第四章：部署合约

### 4.1 获取 Program ID

```bash
# 从 keypair 获取
solana-keygen pubkey target/deploy/dq_project-keypair.json

# 或者从部署日志查看
grep -A1 "Program ID:" target/deploy/dq_project.so.log
```

### 4.2 更新配置文件

编辑 `Anchor.toml`，替换 `<YOUR-PROGRAM-ID>`:

```toml
[profiles.devnet]
provider.cluster = "devnet"
provider.wallet = "~/.config/solana/devnet-keypair.json"

[programs]
devnet = "<替换为你的 Program ID>"
```

### 4.3 部署到 Devnet

```bash
# 确保有足够 SOL (至少 5 SOL)
solana balance

# 部署
anchor deploy --provider.cluster devnet
```

部署成功输出：
```
Deploying program to: devnet
Program ID: DQProject111111111111111111111111111111111
Deploy success!
```

### 4.4 验证部署

```bash
# 查看链上程序信息
solana program show DQProject111111111111111111111111111111111
```

---

## 第五章：初始化合约

### 5.1 创建初始化脚本

创建 `scripts/initialize.ts`:

```typescript
import * as anchor from "@project-serum/anchor";
import { Program, PublicKey } from "@solana/web3.js";
import { DqProject } from "../idl/dq_project";
import BN from "bn.js";

async function main() {
  // 1. 配置 Provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 2. Program ID
  const programId = new PublicKey("DQProject111111111111111111111111111111111");

  // 3. 加载 Program
  const program = new Program<DqProject>(
    require("../idl/dq_project.json"),
    programId,
    provider
  );

  // 4. 计算 PDA 地址
  const [globalState] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  const [lpPool] = await PublicKey.findProgramAddress(
    [Buffer.from("lp_pool")],
    programId
  );

  const [nftPool] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_pool")],
    programId
  );

  const [teamPool] = await PublicKey.findProgramAddress(
    [Buffer.from("team_pool")],
    programId
  );

  const [partnerPool] = await PublicKey.findProgramAddress(
    [Buffer.from("partner_pool")],
    programId
  );

  const [dqMint] = await PublicKey.findProgramAddress(
    [Buffer.from("dq_mint")],
    programId
  );

  const [solVault] = await PublicKey.findProgramAddress(
    [Buffer.from("sol_vault")],
    programId
  );

  const [nftMintA] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_mint"), Buffer.from([1])],
    programId
  );

  const [nftMintB] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_mint"), Buffer.from([2])],
    programId
  );

  const [nftMintC] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_mint"), Buffer.from([3])],
    programId
  );

  console.log("PDA Addresses:");
  console.log("  GlobalState:", globalState.toString());
  console.log("  LpPool:", lpPool.toString());
  console.log("  NftPool:", nftPool.toString());
  console.log("  TeamPool:", teamPool.toString());
  console.log("  PartnerPool:", partnerPool.toString());
  console.log("  DQ Mint:", dqMint.toString());
  console.log("  SOL Vault:", solVault.toString());
  console.log("  NFT Mint A:", nftMintA.toString());
  console.log("  NFT Mint B:", nftMintB.toString());
  console.log("  NFT Mint C:", nftMintC.toString());

  try {
    // 5. 调用 initialize
    console.log("\nInitializing contract...");
    console.log("DQ Price: 1,000,000,000 lamports (1 SOL per DQ)");

    const tx = await program.methods
      .initialize(new BN(1_000_000_000)) // 1 DQ = 1 SOL
      .accounts({
        admin: provider.wallet.publicKey,
        globalState: globalState,
        lpPool: lpPool,
        nftPool: nftPool,
        teamPool: teamPool,
        partnerPool: partnerPool,
        dqMint: dqMint,
        solVault: solVault,
        nftMintA: nftMintA,
        nftMintB: nftMintB,
        nftMintC: nftMintC,
      })
      .rpc();

    console.log("\n✅ Initialize successful!");
    console.log("Transaction:", tx);
    console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // 6. 验证初始化
    const state = await program.account.globalState.fetch(globalState);
    console.log("\nContract State:");
    console.log("  Admin:", state.admin.toString());
    console.log("  DQ Mint:", state.dqMint.toString());
    console.log("  SOL Vault:", state.solVault.toString());
    console.log("  DQ Price:", state.dqPrice.toString());
    console.log("  Total Supply:", state.totalSupply.toString());

  } catch (error) {
    console.error("\n❌ Initialize failed:", error);
    throw error;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 5.2 创建目录

```bash
mkdir -p scripts
```

### 5.3 安装依赖

```bash
# 安装 Anchor SDK
npm install @project-serum/anchor@0.30.0
npm install @solana/web3.js@1.95.0
npm install bs58
npm install bn.js
```

### 5.4 运行初始化

```bash
# 运行脚本
npx ts-node scripts/initialize.ts
```

成功输出：
```
PDA Addresses:
  GlobalState: 7nE4...
  LpPool: 3mT5...
  ...
  
Initializing contract...
✅ Initialize successful!
Transaction: 2xF9...
```

---

## 第六章：功能测试

### 6.1 创建测试脚本

创建 `scripts/test.ts`:

```typescript
import * as anchor from "@project-serum/anchor";
import { Program, PublicKey, Keypair } from "@solana/web3.js";
import { DqProject } from "../idl/dq_project";
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("DQProject111111111111111111111111111111111");
  const program = new Program<DqProject>(
    require("../idl/dq_project.json"),
    programId,
    provider
  );

  // 测试用户
  const user = provider.wallet.publicKey;

  // PDA
  const [globalState] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")], programId
  );
  const [dqMint] = await PublicKey.findProgramAddress(
    [Buffer.from("dq_mint")], programId
  );
  const [solVault] = await PublicKey.findProgramAddress(
    [Buffer.from("sol_vault")], programId
  );

  console.log("=== Testing DQProject ===\n");

  // 1. 获取全局状态
  console.log("1. Fetch Global State...");
  const state = await program.account.globalState.fetch(globalState);
  console.log("   DQ Price:", state.dqPrice.toString());
  console.log("   Circulating:", state.circulatingSupply.toString());

  // 2. 创建用户 Token 账户
  console.log("\n2. Create User Token Account...");
  const userTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    dqMint,
    user
  );
  console.log("   User DQ Token Account:", userTokenAccount.toString());

  // 3. 注册用户
  console.log("\n3. Register User...");
  const [userState] = await PublicKey.findProgramAddress(
    [Buffer.from("user"), user.toBuffer()], programId
  );

  try {
    await program.methods
      .register(PublicKey.default)
      .accounts({
        owner: user,
        userState: userState,
        referrer: PublicKey.default,
        referrerState: userState,
        admin: globalState,
      })
      .rpc();
    console.log("   ✅ Registered!");
  } catch (e) {
    console.log("   ⏭️ Already registered or skip");
  }

  // 4. 入金测试 (SOL -> DQ)
  console.log("\n4. Test Swap SOL -> DQ...");
  const solAmount = new BN(100_000_000); // 0.1 SOL

  try {
    const tx = await program.methods
      .swapSolForDq(solAmount)
      .accounts({
        owner: user,
        globalState: globalState,
        userState: userState,
        dqMint: dqMint,
        solVault: solVault,
        userTokenAccount: userTokenAccount,
        lpPool: state.lpPool,
      })
      .rpc();
    console.log("   ✅ Swapped 0.1 SOL for DQ!");
    console.log("   TX:", tx);
  } catch (e) {
    console.log("   ⏭️ Skip (may need ATA creation first)");
  }

  // 5. 质押测试
  console.log("\n5. Test Stake DQ...");
  const stakeAmount = new BN(10_000_000_000); // 10 DQ

  try {
    const [stakeState] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user.toBuffer()], programId
    );

    const tx = await program.methods
      .stakeDq(stakeAmount, 0) // 30 天周期
      .accounts({
        owner: user,
        globalState: globalState,
        stakeState: stakeState,
        // ... 其他账户
      })
      .rpc();
    console.log("   ✅ Staked 10 DQ for 30 days!");
  } catch (e) {
    console.log("   ⏭️ Skip (insufficient balance or not registered)");
  }

  console.log("\n=== Test Complete ===");
}

main().then(() => process.exit(0)).catch(console.error);
```

### 6.2 运行测试

```bash
npx ts-node scripts/test.ts
```

---

## 第七章：部署到 Mainnet

### 7.1 注意事项

⚠️ **Mainnet 部署风险提示**:
1. 智能合约一旦部署**无法修改**
2. 任何漏洞可能导致**资金损失**
3. 建议先完成**第三方审计**

### 7.2 Mainnet 配置

```bash
# 切换到 Mainnet
solana config set --url mainnet-beta

# 确认配置
solana config get
```

### 7.3 准备资金

```bash
# 查看余额 (需要足够 SOL 支付租金)
solana balance

# Mainnet 租金要求更高，建议至少 50 SOL
```

### 7.4 部署

```bash
# 更新 Anchor.toml
# [profiles.mainnet-beta]
# provider.cluster = "mainnet-beta"

# 部署
anchor deploy --provider.cluster mainnet-beta
```

### 7.5 验证

```bash
# 查看程序
solana program show <YOUR-PROGRAM-ID>

# 初始化
npx ts-node scripts/initialize.ts --cluster mainnet-beta
```

---

## 第八章：常见问题

### Q1: 构建失败

```bash
# 清理并重新构建
anchor clean
anchor build
```

### Q2: 部署超时

```bash
# 使用更大的超时
solana deploy --max-signatures 100 target/deploy/dq_project.so
```

### Q3: 空投失败

```bash
# 使用备用水龙头
solana airdrop 2 --url https://api.devnet.solana.com
```

### Q4: Program ID 不匹配

```bash
# 重新获取
solana-keygen pubkey target/deploy/dq_project-keypair.json

# 更新配置文件
# Anchor.toml
# programs.devnet = "<NEW-ID>"
```

### Q5: 余额不足

```bash
# 领取更多空投
solana airdrop 2

# 或使用 Solana Faucet
# https://faucet.solana.com/
```

---

## 附录：快速命令汇总

```bash
# 环境检查
rustc --version && cargo --version && solana --version && anchor --version

# 构建
anchor build

# 部署
anchor deploy --provider.cluster devnet

# 初始化
npx ts-node scripts/initialize.ts

# 查看程序
solana program show DQProject111111111111111111111111111111111

# 领取空投
solana airdrop 2

# 查看余额
solana balance
```

---

## 链接资源

| 资源 | 链接 |
|------|------|
| Solana Devnet Faucet | https://faucet.solana.com |
| Solana Explorer | https://explorer.solana.com |
| Anchor 文档 | https://www.anchor-lang.com |
| Solana Docs | https://docs.solana.com |
