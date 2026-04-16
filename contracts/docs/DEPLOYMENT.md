# DeepQuest DeFi 合约 - 部署指南

## 目录
1. [环境准备](#1-环境准备)
2. [本地开发](#2-本地开发)
3. [测试网部署](#3-测试网部署)
4. [主网部署](#4-主网部署)
5. [部署后配置](#5-部署后配置)
6. [验证合约](#6-验证合约)

---

## 1. 环境准备

### 1.1 安装 Rust 和 Solana CLI

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana-install update

# 验证安装
rustc --version
solana --version
```

### 1.2 安装 Anchor

```bash
# 安装 Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# 验证安装
anchor --version
```

### 1.3 配置钱包

```bash
# 创建新钱包
solana-keygen new -o ~/solana-wallet.json

# 或导入现有钱包
solana-keygen recover -o ~/solana-wallet.json

# 设置默认钱包
solana config set --keypair ~/solana-wallet.json

# 查看钱包地址
solana-keygen pubkey ~/solana-wallet.json

# 检查余额 (需要 > 2 SOL 用于部署)
solana balance
```

### 1.4 安装项目依赖

```bash
cd contracts
yarn install
```

---

## 2. 本地开发

### 2.1 启动本地验证器

```bash
# 终端 1: 启动本地验证器
solana-test-validator --reset

# 或使用 Anchor 的便捷命令
anchor test --skip-local-validator
```

### 2.2 运行测试

```bash
# 运行所有测试
anchor test

# 运行特定测试文件
anchor test --files tests/dq_project.ts

# 查看详细日志
RUST_LOG=solana_runtime::message_processor=debug anchor test
```

### 2.3 构建程序

```bash
# 构建程序
anchor build

# 生成的程序文件
ls -la target/deploy/
# dq_project.so  - 编译后的程序
# dq_project.json - IDL 文件
```

---

## 3. 测试网部署

### 3.1 配置测试网

```bash
# 切换到测试网
solana config set --url devnet

# 获取测试网 SOL (水龙头)
solana airdrop 2
solana airdrop 2
solana airdrop 2

# 确认余额
solana balance
```

### 3.2 部署到测试网

```bash
# 部署程序
anchor deploy --provider.cluster devnet

# 部署后会显示 Program ID
# 例如: Program Id: DQProject111111111111111111111111111111111
```

### 3.3 更新 Program ID

如果部署到新地址，需要更新配置文件：

```bash
# 编辑 Anchor.toml
vi Anchor.toml

# 修改 program id
[programs]
devnet = "YOUR_NEW_PROGRAM_ID"

# 同时更新 lib.rs 中的 declare_id!
sed -i 's/declare_id!(".*")/declare_id!("YOUR_NEW_PROGRAM_ID")/' src/lib.rs
```

### 3.4 初始化合约

使用 SDK 或 CLI 初始化：

```bash
# 使用脚本初始化
anchor run init-contract --provider.cluster devnet
```

---

## 4. 主网部署

### 4.1 主网准备

```bash
# 切换到主网
solana config set --url mainnet-beta

# 确保钱包有足够的 SOL (至少 5 SOL)
solana balance
```

⚠️ **重要提醒**:
- 主网部署是不可逆的
- 确保私钥安全
- 建议先在测试网充分验证

### 4.2 审计合约

在主网部署前，建议：

1. **代码审计**
   ```bash
   # 运行 Clippy
   cargo clippy --all-targets -- -D warnings
   
   # 运行 fmt 检查
   cargo fmt -- --check
   ```

2. **安全检查**
   ```bash
   # 使用 solana-lint
   cargo install solana-lint
   solana-lint
   ```

3. **第三方审计**
   - 建议使用 Trail of Bits, Certik 等专业审计服务

### 4.3 执行主网部署

```bash
# 部署到主网
anchor deploy --provider.cluster mainnet-beta

# 保存 Program ID
echo "Program ID: $(solana-keygen pubkey target/deploy/dq_project.so)"
```

---

## 5. 部署后配置

### 5.1 创建初始化脚本

```typescript
// scripts/initialize.ts
import * as anchor from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { DQProjectSDK } from "../ts/sdk";

async function main() {
  // 配置
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const wallet = Keypair.fromSeed(/* 你的种子 */);
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  
  const sdk = new DQProjectSDK(provider);
  
  // 初始化 DQ 价格: 1 DQ = 1 SOL = 1,000,000,000 lamports
  const dqPrice = new anchor.BN(1_000_000_000);
  
  console.log("Initializing DQProject...");
  const tx = await sdk.initialize(dqPrice);
  console.log("Initialized! TX:", tx);
}

main().then(() => process.exit(0));
```

### 5.2 设置 Raydium 路由 (可选)

如果集成 Raydium DEX:

```typescript
// 设置 Raydium Router 地址
const raydiumRouter = new PublicKey("RAYDIUM_ROUTER_ADDRESS");
await sdk.setRaydiumRouter(raydiumRouter);
```

### 5.3 创建代币账户

用户需要创建关联代币账户：

```typescript
// 使用 SPL Token 创建关联账户
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const mint = await sdk.getDqMint();
const userATA = await sdk.getUserTokenAccount(userPublicKey);

const instruction = createAssociatedTokenAccountInstruction(
  payer,
  userATA,
  userPublicKey,
  mint
);
```

---

## 6. 验证合约

### 6.1 验证程序

```bash
# 检查程序是否部署
solana program show $(solana-keygen pubkey target/deploy/dq_project.so)

# 查看程序账户
solana account DQProject111111111111111111111111111111111
```

### 6.2 验证 IDL

```bash
# 检查 IDL 是否正确上传
anchor idl fetch DQProject111111111111111111111111111111111
```

### 6.3 运行集成测试

```bash
# 使用测试脚本验证所有功能
anchor test --skip-build
```

---

## 附录: 常用命令

```bash
# 查看程序日志
solana logs DQProject111111111111111111111111111111111

# 查看账户数据
solana account <ACCOUNT_ADDRESS> --output-file account.json --lamports

# 检查交易状态
solana confirm -v <TRANSACTION_SIGNATURE>

# 查看集群信息
solana cluster-version
solana gossip

# 重新部署 (需要先 close)
anchor deploy --provider.cluster devnet --program-id target/deploy/dq_project-keypair.json
```

---

## 故障排除

### 问题: "Error: Instruction missing"

**解决方案**: 确保所有 PDA 账户已正确初始化

### 问题: "Error: Invalid program address"

**解决方案**: 检查 Program ID 是否与 Anchor.toml 中的一致

### 问题: "Error: insufficient funds"

**解决方案**: 增加钱包 SOL 余额

### 问题: "Error: Account not found"

**解决方案**: 确保账户已创建（调用 init 函数）

---

## 联系方式

- 技术支持: support@deepquest.io
- Discord: https://discord.gg/deepquest
- GitHub Issues: https://github.com/deepquest/dq-project/issues
