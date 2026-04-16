# 更新日志

## v2.0.0 - 完整版 Solana 合约

### 新增功能

#### 1. 完整的错误处理系统
- 18+ 自定义错误代码
- 详细的错误信息
- 分类: 权限、金额、余额、状态、参数等

#### 2. 紧急暂停机制
- `pause()` - 暂停所有合约操作
- `unpause()` - 恢复合约
- 自动设置冻结时间

#### 3. 配置管理
- `ConfigState` - 全局配置
- 可配置的滑点、最小金额等参数

#### 4. LP 质押池
- `LpPool` - LP 份额池
- `acc_per_share` - 累积收益计算
- 自动复利计算

#### 5. NFT 分红池
- `NftPool` - NFT 持币分红
- 支持 A/B/C 三种卡牌
- 不同权重计算

#### 6. 团队池
- `TeamPool` - 8 级团队分红
- 按等级分配收益

#### 7. 合伙人池
- `PartnerPool` - 合伙人专属分红
- `is_partner` 标记

#### 8. Raydium DEX 集成预留
- `raydium_router` 字段
- `_do_raydium_swap_sol_for_dq()` 预留方法
- 可扩展的 CPI 调用结构

### 安全增强

#### 1. 权限控制
- 管理员唯一性验证
- 签名验证
- PDA 派生验证

#### 2. 状态检查
- 紧急暂停检查
- 余额验证
- 供应量上限检查

#### 3. 数值安全
- 最小/最大金额限制
- 滑点保护
- 燃烧率范围限制

### 文档完善

#### 1. API 参考
- 完整指令文档
- 参数说明
- 前置条件
- 状态变更

#### 2. 部署指南
- 环境配置
- 测试网部署
- 主网部署
- 验证步骤

#### 3. Raydium 集成指南
- 架构设计
- CPI 调用实现
- 前端集成示例
- 健康监控

### SDK 增强

#### 1. TypeScript SDK
- 完整的类型定义
- 便捷的交易方法
- 计算辅助函数
- 查询工具

#### 2. 单元测试
- 初始化测试
- 注册测试
- 交易测试
- 质押测试
- 奖励测试
- 管理员测试

### DevOps

#### 1. Docker 配置
- 多阶段构建
- docker-compose
- 环境变量配置

#### 2. 部署脚本
- 一键部署
- 网络配置
- 钱包检查
- 自动初始化

### 合约参数

| 参数 | 值 | 说明 |
|------|-----|------|
| TOTAL_SUPPLY | 100,000,000,000,000 | 1000亿 DQ (9位小数) |
| DQ_PRICE | 1,000,000,000 | 1 DQ = 1 SOL |
| PRICE_A | 500,000,000,000 | A类节点 500 SOL |
| PRICE_B | 1,000,000,000,000 | B类节点 1000 SOL |
| PRICE_C | 3,000,000,000,000 | C类节点 3000 SOL |
| MIN_STAKE | 1,000,000,000 | 最小质押 1 DQ |
| SWAP_FEE | 6% | 兑换手续费 |
| BURNRATE_INITIAL | 80% | 初始燃烧率 |
| BURNRATE_MIN | 30% | 最小燃烧率 |

### 事件日志

| 事件 | 说明 |
|------|------|
| InitializeEvent | 初始化事件 |
| PauseEvent | 暂停事件 |
| RegisterEvent | 注册事件 |
| SwapSolForDQEvent | SOL换DQ事件 |
| SwapDqForSolEvent | DQ换SOL事件 |
| StakeDQEvent | 质押事件 |
| UnstakeDQEvent | 解除质押事件 |
| BuyNodeEvent | 购买节点事件 |
| BlockMiningEvent | 爆块事件 |
| ClaimRewardEvent | 领取奖励事件 |
| PriceUpdatedEvent | 价格更新事件 |

---

## v1.0.0 - 基础版本

- 基础代币兑换
- 简单质押功能
- 基本用户注册
