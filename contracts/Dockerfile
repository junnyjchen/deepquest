# DeepQuest DeFi - Docker 部署配置

## Dockerfile

```dockerfile
# 构建阶段
FROM rust:1.70 as builder

# 安装 Solana CLI 和 Anchor
RUN curl -sSfL https://release.solana.com/stable/install | sh && \
    mv /root/.local/share/solana/install/active_release/bin/* /usr/local/bin/ && \
    cargo install --git https://github.com/coral-xyz/anchor avm --locked

WORKDIR /app

# 复制依赖文件
COPY Cargo.toml ./
COPY Cargo.lock ./
COPY src ./src

# 构建 Rust 程序
RUN cargo build --release

# 运行阶段
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制编译后的程序
COPY --from=builder /app/target/release/dq_project.so ./target/deploy/
COPY Anchor.toml ./
COPY package.json ./
COPY ts ./ts
COPY idl ./idl

# 安装 Node.js 依赖
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn && \
    yarn install

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["bash"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  # Solana Validator (可选，用于本地测试)
  solana-validator:
    image: solanalabs/solana:edge
    container_name: dq-solana-validator
    ports:
      - "8899:8899"
      - "8900:8900"
    command: >
      solana-test-validator
      --ledger /ledger
      --rpc-port 8899
      --bpf-program DQProject111111111111111111111111111111111 target/deploy/dq_project.so
    volumes:
      - solana-ledger:/ledger
    networks:
      - dq-network

  # 合约服务
  contract-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: dq-contract-service
    environment:
      - RUST_LOG=info
      - SOLANA_NETWORK=devnet
      - ADMIN_KEYPAIR=/keys/admin.json
    ports:
      - "9091:9091"
    volumes:
      - ./keys:/keys:ro
    depends_on:
      - solana-validator
    networks:
      - dq-network

  # 前端服务 (可选)
  frontend:
    image: node:18
    container_name: dq-frontend
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ../client:/app
    command: yarn dev
    networks:
      - dq-network

networks:
  dq-network:
    driver: bridge

volumes:
  solana-ledger:
```

## 使用说明

### 本地构建和测试

```bash
# 构建 Docker 镜像
docker build -t dq-contract:latest .

# 运行容器
docker-compose up -d

# 查看日志
docker-compose logs -f contract-service

# 停止服务
docker-compose down
```

### 生产部署

```bash
# 使用多阶段构建
docker build -t dq-contract:prod --target production .

# 运行
docker run -d \
  --name dq-contract \
  -p 9091:9091 \
  -v /path/to/keys:/keys:ro \
  -e SOLANA_NETWORK=mainnet-beta \
  dq-contract:prod
```

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| RUST_LOG | 日志级别 | info |
| SOLANA_NETWORK | 网络 (devnet/testnet/mainnet-beta) | devnet |
| ADMIN_KEYPAIR | 管理员密钥路径 | - |
| RPC_URL | Solana RPC 节点 | - |

### 健康检查

```bash
# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' dq-contract-service

# 检查 Solana 连接
docker exec dq-contract-service solana-gossip
docker exec dq-contract-service solana cluster-version
```
