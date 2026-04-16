# Solana Anchor 合约开发 - IDE 配置指南

## 支持的 IDE

| IDE | 推荐程度 | 说明 |
|-----|---------|------|
| **VS Code** | ⭐⭐⭐⭐⭐ | 轻量、插件丰富、最流行 |
| **IntelliJ IDEA** | ⭐⭐⭐⭐ | 需要 Rust 插件 |
| **Gitpod** | ⭐⭐⭐⭐ | 云端开箱即用 |
| **GitHub Codespaces** | ⭐⭐⭐ | 云端集成 GitHub |

---

## 方案一：VS Code（推荐）

### 1.1 安装 VS Code

下载地址: https://code.visualstudio.com/

### 1.2 安装 Rust 相关插件

打开 VS Code，按 `Ctrl+Shift+X` 打开扩展面板，搜索并安装：

| 插件 | 说明 |
|------|------|
| **rust-analyzer** | Rust 语言服务器 (必须) |
| **CodeLLDB** | Rust 调试器 (必须) |
| **Even Better TOML** | TOML 文件支持 |
| **crates** | Rust 依赖版本检查 |
| **Prettier - Code formatter** | 代码格式化 |

### 1.3 配置设置

按 `Ctrl+,` 打开设置，添加以下配置:

```json
{
  // Rust 设置
  "rust-analyzer.linkedProjects": [
    "./Cargo.toml"
  ],
  "rust-analyzer.cargo.features": ["devnet"],
  "rust-analyzer.procMacro.enable": true,
  
  // 格式化
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "rust-lang.rust-analyzer",
  
  // 文件
  "files.associations": {
    "*.toml": "toml"
  },
  
  // 终端
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

### 1.4 创建项目

```bash
# 方式一：使用 Anchor CLI 创建
cd /workspace/projects
anchor init dq-project

# 方式二：复制现有项目
cp -r contracts dq-project
cd dq-project
```

### 1.5 项目结构

```
dq-project/
├── Anchor.toml          # Anchor 配置
├── Cargo.toml           # Rust 依赖
├── programs/
│   └── dq_project/
│       └── src/
│           └── lib.rs  # 主程序
├── tests/
│   └── dq_project.ts   # 测试
└── target/              # 编译输出
```

### 1.6 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `F5` | 运行测试/调试 |
| `Ctrl+Shift+B` | 构建项目 |
| `F12` | 跳转到定义 |
| `Ctrl+点击` | 跳转到定义 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Ctrl+Shift+O` | 大纲/符号列表 |

### 1.7 调试

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Tests",
      "cargo": {
        "args": "test"
      },
      "preLaunchTask": "Build Rust",
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Program",
      "cargo": {
        "args": "build --release"
      },
      "preLaunchTask": "Build Release",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

---

## 方案二：IntelliJ IDEA / RustRover

### 2.1 安装

| IDE | 下载地址 |
|-----|---------|
| IntelliJ IDEA Ultimate | https://www.jetbrains.com/idea/ |
| RustRover | https://www.jetbrains.com/rust/ |

### 2.2 安装插件

- **Rust** (内置于 RustRover)
- **TOML** (内置于 IDEA Ultimate)
- **Markdown** (内置)

### 2.3 配置 Rust SDK

1. `File` → `Project Structure` → `Platform Settings` → `SDKs`
2. 点击 `+` → `Add Rust`
3. 选择 Rust 安装路径: `~/.rustup/toolchains/stable-x86_64-unknown-linux-gnu`

### 2.4 配置 Anchor 项目

1. `File` → `Open` → 选择 `Cargo.toml`
2. IDEA 会自动识别为 Rust 项目

### 2.5 常用功能

| 功能 | 快捷键 |
|------|--------|
| 运行测试 | `Ctrl+Shift+F10` |
| 构建 | `Ctrl+F9` |
| 查找用法 | `Alt+F7` |
| 重构 | `Ctrl+Alt+Shift+T` |

---

## 方案三：Gitpod（云端）

### 3.1 优点

- ✅ 无需本地安装
- ✅ 开箱即用
- ✅ 预装 Rust 和 Solana CLI
- ✅ 共享配置

### 3.2 创建 `.gitpod.yml`

```yaml
image: gitpod/workspace-rust:1.70

tasks:
  - name: Setup Solana
    init: |
      sh -c "$(curl -sSfL 'https://release.solana.com/stable/install')"
      export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
      rustc --version
      solana --version
    command: |
      export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
      
ports:
  - port: 8899
    onOpen: open-preview
  - port: 8900
    onOpen: open-preview

vscode:
  extensions:
    - rust-lang.rust-analyzer
    - vadimcn.vscode-lldb
    - bungip.better-toml
```

### 3.3 启动 Gitpod

访问: https://gitpod.io/new#

```
Repository: https://github.com/YOUR_USERNAME/dq-project
```

---

## 方案四：GitHub Codespaces

### 4.1 创建 `.devcontainer/devcontainer.json`

```json
{
  "name": "Solana Anchor Dev",
  "image": "mcr.microsoft.com/vscode/devcontainers/rust:latest",
  
  "features": {
    "ghcr.io/devcontainers/features/node:18": {},
    "ghcr.io/solana-labs/solana-devcontainer:latest": {}
  },
  
  "forwardPorts": [8899, 8900],
  
  "postCreateCommand": "rustc --version && solana --version && anchor --version",
  
  "extensions": [
    "rust-lang.rust-analyzer",
    "vadimcn.vscode-lldb"
  ]
}
```

### 4.2 启动 Codespaces

1. GitHub 仓库 → `Code` → `Create codespace on main`
2. 等待环境创建完成

---

## VS Code 完整配置示例

### 文件: `.vscode/settings.json`

```json
{
  "rust-analyzer.linkedProjects": ["./Cargo.toml"],
  "rust-analyzer.cargo.features": ["devnet"],
  "rust-analyzer.procMacro.enable": true,
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.imports.prefixes": [
    "crate",
    "self",
    "super",
    "package"
  ],
  
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "rust-lang.rust-analyzer",
  "editor.rulers": [100],
  
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true,
    "editor.insertSpaces": true,
    "editor.tabSize": 4
  },
  
  "[toml]": {
    "editor.defaultFormatter": "bungip.better-toml",
    "editor.formatOnSave": true
  },
  
  "files.associations": {
    "*.toml": "toml"
  },
  
  "search.exclude": {
    "**/target": true,
    "**/node_modules": true
  },
  
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

### 文件: `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Release",
      "type": "shell",
      "command": "anchor build --release",
      "group": "build",
      "problemMatcher": ["$rustc"]
    },
    {
      "label": "Deploy",
      "type": "shell",
      "command": "anchor deploy",
      "group": "build",
      "dependsOn": ["Build Release"]
    },
    {
      "label": "Test",
      "type": "shell",
      "command": "anchor test",
      "group": "test"
    },
    {
      "label": "Run IDL",
      "type": "shell",
      "command": "anchor idl parse ./target/idl/dq_project.json",
      "group": "none"
    }
  ]
}
```

### 文件: `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Anchor Build",
      "type": "shell",
      "command": "anchor build",
      "problemMatcher": ["$rustc"],
      "group": "build"
    },
    {
      "name": "Anchor Deploy",
      "type": "shell",
      "command": "anchor deploy",
      "group": "build",
      "dependsOn": ["Anchor Build"]
    },
    {
      "name": "Anchor Test",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeArgs": ["test"],
      "runtimeExecutable": "npx",
      "preLaunchTask": "Build Release",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 常用开发工具

### 代码片段 (VS Code Snippets)

创建 `.vscode/dq-project.code-snippets`:

```json
{
  "Anchor Account": {
    "prefix": "acc",
    "body": [
      "#[account]",
      "#[derive(InitSpace)]",
      "pub struct ${1:Name} {",
      "    pub owner: Pubkey,",
      "    pub bump: u8,",
      "}",
      "",
      "#[derive(Accounts)]",
      "pub struct ${1:Name}Accounts<'info> {",
      "    #[account(mut)]",
      "    pub owner: Signer<'info>,",
      "}",
    ],
    "description": "Anchor Account Template"
  },
  
  "Anchor Instruction": {
    "prefix": "fn",
    "body": [
      "pub fn ${1:name}(ctx: Context<${2:Name}Accounts>) -> Result<()> {",
      "    $0",
      "    Ok(())",
      "}"
    ],
    "description": "Anchor Instruction Template"
  },
  
  "Anchor Error": {
    "prefix": "err",
    "body": [
      "#[error_code]",
      "pub enum ErrorCode {",
      "    #[msg(\"${1:Error message}\")]",
      "    ${2:ErrorName},",
      "}"
    ],
    "description": "Anchor Error Definition"
  },
  
  "Anchor Event": {
    "prefix": "emit",
    "body": [
      "#[event]",
      "pub struct ${1:Name}Event {",
      "    pub user: Pubkey,",
      "    pub amount: u64,",
      "    pub timestamp: i64,",
      "}",
      "",
      "emit!(${1:Name}Event {",
      "    user: ctx.accounts.owner.key(),",
      "    amount,",
      "    timestamp: Clock::get()?.unix_timestamp,",
      "});"
    ],
    "description": "Anchor Event Template"
  }
}
```

---

## 快速开始

### 一键启动开发环境

```bash
# 1. 安装 VS Code
code --version

# 2. 安装插件
code --install-extension rust-lang.rust-analyzer
code --install-extension vadimcn.vscode-lldb
code --install-extension bungip.better-toml

# 3. 打开项目
code /workspace/projects/contracts

# 4. 构建
anchor build

# 5. 测试
anchor test
```

---

## 资源链接

| 资源 | 链接 |
|------|------|
| VS Code 下载 | https://code.visualstudio.com/ |
| Rust Analyzer | https://rust-analyzer.github.io/ |
| Anchor 官方示例 | https://github.com/project-serum/anchor/examples |
| Solana 程序示例 | https://github.com/solana-labs/solana-program-library |
