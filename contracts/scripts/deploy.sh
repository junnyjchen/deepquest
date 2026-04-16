#!/bin/bash
# DeepQuest DeFi - 部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
NETWORK="${1:-devnet}"
PROGRAM_ID="${2:-DQProject111111111111111111111111111111111}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DeepQuest DeFi Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查环境
check_dependencies() {
    echo -e "${YELLOW}[1/6] 检查依赖...${NC}"
    
    # 检查 Rust
    if ! command -v rustc &> /dev/null; then
        echo -e "${RED}错误: 未安装 Rust${NC}"
        exit 1
    fi
    
    # 检查 Solana CLI
    if ! command -v solana &> /dev/null; then
        echo -e "${RED}错误: 未安装 Solana CLI${NC}"
        exit 1
    fi
    
    # 检查 Anchor
    if ! command -v anchor &> /dev/null; then
        echo -e "${RED}错误: 未安装 Anchor CLI${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 所有依赖已安装${NC}"
}

# 配置网络
setup_network() {
    echo -e "${YELLOW}[2/6] 配置网络: $NETWORK${NC}"
    
    case $NETWORK in
        devnet)
            RPC_URL="https://api.devnet.solana.com"
            ;;
        testnet)
            RPC_URL="https://api.testnet.solana.com"
            ;;
        mainnet-beta)
            RPC_URL="https://api.mainnet-beta.solana.com"
            ;;
        *)
            echo -e "${RED}错误: 未知的网络 $NETWORK${NC}"
            exit 1
            ;;
    esac
    
    solana config set --url $RPC_URL
    echo -e "${GREEN}✓ 网络配置完成${NC}"
}

# 检查钱包
check_wallet() {
    echo -e "${YELLOW}[3/6] 检查钱包...${NC}"
    
    WALLET=$(solana-keygen pubkey)
    BALANCE=$(solana balance)
    
    echo -e "  钱包地址: $WALLET"
    echo -e "  余额: $BALANCE"
    
    # 检查余额
    if [ "$NETWORK" = "mainnet-beta" ]; then
        MIN_BALANCE=5
    else
        MIN_BALANCE=2
    fi
    
    echo $BALANCE | grep -qE "^[0-9]+(\.[0-9]+)? SOL"
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 钱包余额格式不正确${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 钱包检查完成${NC}"
}

# 构建程序
build_program() {
    echo -e "${YELLOW}[4/6] 构建程序...${NC}"
    
    cd "$(dirname "$0")"
    
    # 更新 Program ID
    sed -i "s/declare_id\!(\".*\")/declare_id\!(\"$PROGRAM_ID\")/" src/lib.rs
    
    # 构建
    anchor build
    
    echo -e "${GREEN}✓ 程序构建完成${NC}"
}

# 部署程序
deploy_program() {
    echo -e "${YELLOW}[5/6] 部署程序...${NC}"
    
    if [ "$NETWORK" = "mainnet-beta" ]; then
        echo -e "${YELLOW}⚠️ 警告: 即将部署到主网!${NC}"
        read -p "确认继续? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo -e "${RED}部署已取消${NC}"
            exit 0
        fi
    fi
    
    anchor deploy --provider.cluster $NETWORK
    
    echo -e "${GREEN}✓ 程序部署完成${NC}"
}

# 初始化合约
initialize_contract() {
    echo -e "${YELLOW}[6/6] 初始化合约...${NC}"
    
    # DQ 价格: 1 DQ = 1 SOL = 1,000,000,000 lamports
    DQ_PRICE=1000000000
    
    echo -e "  DQ Price: $DQ_PRICE lamports (1 SOL per DQ)"
    
    # 创建初始化脚本并执行
    cat > scripts/temp_init.ts << 'EOF'
import * as anchor from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";

async function main() {
  const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
  const wallet = Keypair.fromSeed(
    require("fs").readFileSync(process.env.KEYPAIR_PATH || "./keypair.json")
  );
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    {}
  );
  
  const program = new anchor.Program(
    require("../target/idl/dq_project.json"),
    new anchor.web3.PublicKey(process.env.PROGRAM_ID || "DQProject111111111111111111111111111111111"),
    provider
  );
  
  const dqPrice = new anchor.BN(process.env.DQ_PRICE || "1000000000");
  
  console.log("Initializing DQProject with price:", dqPrice.toString());
  
  try {
    const tx = await program.methods
      .initialize(dqPrice)
      .rpc();
    
    console.log("Initialized! Transaction:", tx);
  } catch (e) {
    console.log("Initialize error:", e.message);
  }
}

main().then(() => process.exit(0));
EOF
    
    RPC_URL=$RPC_URL PROGRAM_ID=$PROGRAM_ID KEYPAIR_PATH=~/.config/solana/id.json \
    ts-node scripts/temp_init.ts
    
    rm -f scripts/temp_init.ts
    
    echo -e "${GREEN}✓ 合约初始化完成${NC}"
}

# 显示完成信息
show_completion() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署完成!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  网络: ${YELLOW}$NETWORK${NC}"
    echo -e "  Program ID: ${YELLOW}$PROGRAM_ID${NC}"
    echo -e "  钱包地址: ${YELLOW}$WALLET${NC}"
    echo ""
    echo -e "  Explorer: ${YELLOW}https://explorer.solana.com/address/$PROGRAM_ID?cluster=$NETWORK${NC}"
    echo ""
}

# 主流程
main() {
    check_dependencies
    setup_network
    check_wallet
    build_program
    deploy_program
    initialize_contract
    show_completion
}

# 执行
main
