# DQ代币质押系统 - 用户逻辑与数据流

---

## 一、注册流程

### 1.1 用户注册 (DQMCore.sol)
```
用户调用: register(referrer)
         ↓
校验: 用户未注册 + 推荐人已注册
         ↓
记录:
  - users[user].referrer = referrer
  - users[referrer].directCount++
  - users[referrer].children.add(user)
  - allUsers.push(user)
         ↓
事件: Register(user, referrer)
```

### 1.2 管理员导入用户 (DQMCore.sol)
```
admin调用: importUser(user, referrer) 或 importUsers(users[], referrers[])
         ↓
校验: 用户未注册
         ↓
批量记录用户关系
         ↓
事件: Register(user, referrer)
```

---

## 二、分享推荐流程

### 2.1 推荐关系建立
```
用户A (推荐人)          用户B (被推荐人)
     │                       │
     │──── register(A) ────>│
     │                       ↓
     │              users[B].referrer = A
     │              users[A].directCount++
     │              users[A].children.add(B)
```

### 2.2 推荐码生成
```
用户地址 → Base58编码 → 推荐码
0x803B... → 简化为易读字符串
```

---

## 三、购买节点NFT (DQC.sol)

### 3.1 节点卡类型
```
┌─────────┬───────────┬─────────┬────────────┬──────────────────┐
│  卡片   │   价格    │  数量   │  赠送L等级  │    手续费分配    │
├─────────┼───────────┼─────────┼────────────┼──────────────────┤
│   A卡   │  500 USDT │  1000张 │    S1      │  10%SOL的10%加权 │
│   B卡   │ 1500 USDT │   500张 │    S2      │  10%SOL的15%加权 │
│   C卡   │ 5000 USDT │   100张 │    S3      │  10%SOL的15%加权 │
└─────────┴───────────┴─────────┴────────────┴──────────────────┘
```

### 3.2 购买节点流程 (buyCard)
```
用户调用: buyCard(cardType){value: USDT}
         ↓
cardType:
  0 = A卡 (500 USDT)
  1 = B卡 (1500 USDT)
  2 = C卡 (5000 USDT)
         ↓
校验:
  - msg.value >= 卡价
  - 该类型卡未售罄
         ↓
转账:
  USDT → nodeUSDTReceiver (0x274aCc6397...)
         ↓
铸造NFT:
  _mintCard(user, cardType)
         ↓
更新用户节点业绩:
  userNodePerformance[user] += price
         ↓
根据卡类型设置L等级:
  A卡 → userNodeLevel[user] = 1 (S1)
  B卡 → userNodeLevel[user] = 2 (S2)
  C卡 → userNodeLevel[user] = 3 (S3)
         ↓
事件: CardMinted(user, tokenId, cardType)
```

### 3.3 节点卡NFT转移
```
用户转移NFT时 (ERC721 _beforeTokenTransfer):
         ↓
原持有者:
  userNodePerformance[from] -= price
         ↓
新持有者:
  userNodePerformance[to] += price
  (自动继承节点业绩和对应L等级权益)
```

### 3.4 节点卡权益
```
1. 获得L等级 (用于管理奖分配):
   - A卡: S1级 (可拿5%管理奖)
   - B卡: S2级 (可拿10%管理奖)
   - C卡: S3级 (可拿15%管理奖)

2. 节点NFT分币 (爆块奖励15%):
   - 按持卡数量加权分配

3. 手续费加权分红:
   - 入金10%SOL手续费中加权分配
```

---

## 四、用户等级系统

### 4.1 L等级 (管理奖等级 - S1~S6)
```
L等级用于管理奖分配，与团队业绩挂钩：

┌─────────┬────────────┬────────┬─────────────────────────────┐
│  等级   │  团队业绩   │ 管理奖 │           说明              │
├─────────┼────────────┼────────┼─────────────────────────────┤
│   S1    │ >= 100 SOL │   5%   │ 购买A卡直接获得             │
│   S2    │ >= 200 SOL │  10%   │ 购买B卡直接获得             │
│   S3    │ >= 600 SOL │  15%   │ 购买C卡直接获得             │
│   S4    │ >= 2000 SOL│  20%   │ 团队业绩自动升级            │
│   S5    │ >= 6000 SOL│  25%   │ 团队业绩自动升级            │
│   S6    │ >= 20000 SOL│  30%   │ 团队业绩自动升级            │
└─────────┴────────────┴────────┴─────────────────────────────┘
```

### 4.2 L等级升级流程 (自动)
```
管理员调用: checkAndUpgradeLevels()
         ↓
遍历所有用户:
  计算团队业绩 (totalTeamSales[user])
         ↓
根据业绩匹配等级:
  if (业绩 >= 20000) → S6
  else if (业绩 >= 6000) → S5
  else if (业绩 >= 2000) → S4
  else if (持B卡) → S2
  else if (持A卡) → S1
         ↓
更新: userNodeLevel[user] = newLevel
         ↓
事件: LevelChanged(user, newLevel)
```

### 4.3 L等级手动调整 (管理员)
```
admin调用: setUserNodeLevel(user, level)
         ↓
userNodeLevel[user] = level
         ↓
事件: LevelChanged(user, level)
```

### 4.4 D等级 (团队奖等级 - D1~D8)
```
D等级用于爆块团队奖分配(14%)，按有效地址数(入金地址)升级：

┌─────────┬───────────────┬──────────────┬─────────────────────────┐
│  等级   │  有效地址数    │ 团队奖份额   │          说明           │
├─────────┼───────────────┼──────────────┼─────────────────────────┤
│   D1    │    >= 30      │   1.75%      │ 达到30人自动升级        │
│   D2    │    >= 120     │   1.75%      │ 达到120人自动升级       │
│   D3    │    >= 360     │   1.75%      │ 达到360人自动升级       │
│   D4    │    >= 1000    │   1.75%      │ 达到1000人自动升级      │
│   D5    │    >= 4000    │   1.75%      │ 达到4000人自动升级      │
│   D6    │    >= 10000   │   1.75%      │ 达到10000人自动升级     │
│   D7    │    >= 15000   │   1.75%      │ 达到15000人自动升级     │
│   D8    │    >= 30000   │   1.75%      │ 达到30000人自动升级     │
└─────────┴───────────────┴──────────────┴─────────────────────────┘

注: 有效地址 = 有入金SOL记录的地址
    每个等级平均分该等级的1.75%
```

### 4.5 D等级升级流程 (自动)
```
管理员或合约调用: checkDLevelUpgrade(user)
         ↓
计算用户的团队有效地址数:
  countValidAddresses(userReferrer链)
         ↓
根据地址数匹配D等级:
  if (地址数 >= 30000) → D8
  else if (地址数 >= 15000) → D7
  else if (地址数 >= 10000) → D6
  else if (地址数 >= 4000) → D5
  else if (地址数 >= 1000) → D4
  else if (地址数 >= 360) → D3
  else if (地址数 >= 120) → D2
  else if (地址数 >= 30) → D1
  else → 无等级
         ↓
更新:
  if (新等级 > 当前等级):
    dLevelCount[旧等级-1]--  (如果有)
    dLevelCount[新等级-1]++
    userDLevel[user] = 新等级
    isDLevel[新等级][user] = true
```

### 4.6 D等级手动调整 (管理员)
```
admin调用: registerDLevel(user, level)
         ↓
如果之前有等级:
  dLevelCount[旧等级-1]--
         ↓
设置新等级:
  userDLevel[user] = level
  dLevelCount[level-1]++
  isDLevel[level][user] = true
```

### 4.7 D等级奖励分配 (爆块时)
```
爆块可分配部分 × 14% → D等级池
         ↓
平均分给各等级:
  D1用户: (池×14%÷8) ÷ D1人数
  D2用户: (池×14%÷8) ÷ D2人数
  ...
  D8用户: (池×14%÷8) ÷ D8人数
         ↓
用户领取:
  claimDRankReward()
      ↓
  计算: pending = dLevelAccReward[D等级] - dLevelRewardDebt
      ↓
  更新债务: dLevelRewardDebt = dLevelAccReward
      ↓
  DQ转账给用户
```

---

## 五、入金流程 (DQMCore.sol)

### 3.1 用户入金
```
用户调用: deposit(){value: SOL}
         ↓
校验:
  - msg.value >= 1 SOL
  - 用户已注册
  - 底池已设置
  - 未被黑名单
  - 金额 <= 当前阶段限制
  - 每日只能入金一次
         ↓
记录:
  - dailyDeposit[user] = 今天时间戳
  - users[user].totalInvest += amount
  - totalInvested += amount
         ↓
能量计算:
  energyToAdd = amount × 3
  userEnergy[user] += energyToAdd
         ↓
资金分配 (50% + 50%):
```

### 3.2 资金分配详解
```
入金 1 SOL
     │
     ├─────────────────────────────┐
     │                             │
    50%                          50%
 (0.5 SOL)                     (0.5 SOL)
     │                             │
     ↓                             ↓
 动态分币                    LP质押
     │                             │
     ↓                             ↓
 stakeContract.onDeposit()      _addLiquidity()
     │                             │
     │                      ┌─────┴─────┐
     │                     25%        25%
     │                   (0.125)     (0.125)
     │                      │           │
     │                      ↓           ↓
     │                  保留SOL     用SOL买DQ
     │                                 │
     │                                 ↓
     │                           底池Swap
     │                          (免手续费)
     │                                 │
     │                                 ↓
     │                           DQ + SOL
     │                              │
     │                              ↓
     │                        PancakeSwap
     │                      addLiquidityETH()
     │                              │
     │                              ↓
     │                        LP代币
     │                              │
     │                              ↓
     │                    stakeContract.onLPStake()
     │                              │
     │                              ↓
     │                        用户获得LP
```

### 3.3 入金阶段限制
```
Phase 1: 1 SOL/天
Phase 2: 5 SOL/天
Phase 3: 10 SOL/天
Phase 4: 20 SOL/天
Phase 5: 50 SOL/天
Phase 6: 100 SOL/天
Phase 7: 150 SOL/天
Phase 8: 200 SOL/天

管理员可手动升级阶段
```

---

## 六、领取奖励流程 (DQMiningStakeCore.sol)

### 6.1 动态奖励分配 (onDeposit → DQMiningStakeCore.sol)

#### 入金触发三奖分配:
```
入金 1 SOL → 0.5 SOL 进入奖励池
                │
                ├───────────────────────────────────────┐
                │                   │                   │
              30%                  30%                 40%
           (直推奖)             (见点奖)              (管理奖)
           0.15 SOL             0.15 SOL            0.2 SOL
```

#### 6.1.1 直推奖 (DIRECT_RATE = 30%)
```
onDeposit(from, amount)
         ↓
_distDirect(from, referrer, amount)
         ↓
reward = amount × 30% = 0.15 SOL
         ↓
检查: userEnergy[referrer] >= reward?
     ├─ YES: userEnergy -= reward
     │       userPendingSOL[referrer] += reward
     └─ NO: 跳过 (不拿奖)
         ↓
事件: RewardDistributed(referrer, 1, reward)
```

#### 6.1.2 见点奖 (SEE_RATE = 1%/代, 最多15代)
```
_distSee(user, seePool, depth=1)
         ↓
遍历上级 (最多15代):
  每代奖励 = amount × 1%
         ↓
条件检查:
  深度1-3代: 直推数>=1
  深度4-6代: 直推数>=2
  深度7-9代: 直推数>=3
  深度10-12代: 直推数>=4
  深度13-15代: 直推数>=5
         ↓
检查: userEnergy[上级] >= 每代奖励?
     ├─ YES: userEnergy -= 每代奖励
     │       userPendingSOL[上级] += 每代奖励
     └─ NO:  跳过
```

#### 6.1.3 管理奖 (MGR_RATE = 30%, 级差制)
```
_distMgr(user, mgrPool)
         ↓
遍历上级链:
  根据团队业绩计算等级:
  ┌─────────┬────────────┬────────┐
  │  等级   │ 团队业绩    │ 管理奖  │
  ├─────────┼────────────┼────────┤
  │   S1    │ >= 100 SOL  │   5%   │
  │   S2    │ >= 200 SOL  │  10%   │
  │   S3    │ >= 600 SOL  │  15%   │
  │   S4    │ >= 2000 SOL │  20%   │
  │   S5    │ >= 6000 SOL │  25%   │
  │   S6    │ >= 20000 SOL│  30%   │
  └─────────┴────────────┴────────┘
         ↓
级差分配:
  - 只拿差额部分 (当前等级 - 上一个等级)
  - 必须有能量才能领取
         ↓
示例: S6用户拿30%, S5用户拿差5%
```

### 6.2 奖励领取 (withdrawSOL)
```
用户调用: withdrawSOL()
         ↓
计算: pending = userPendingSOL[user]
         ↓
校验:
  - pending > 0
  - 用户未被黑名单
         ↓
扣除10%手续费:
  fee = pending × 10%
  actual = pending - fee
         ↓
转账:
  - fee → feeReceiver (0x1d1C89c...)
  - actual → user
         ↓
userPendingSOL[user] = 0
         ↓
事件: WithdrawSOL(user, actual)
```

---

## 七、爆块奖励流程 (DQMiningStakeMine.sol)

### 7.1 爆块触发
```
任何人可调用: mine()
         ↓
校验:
  - initialTotalSupply > 0
  - 距离上次 >= 1天
         ↓
计算释放量:
  remaining = initialTotalSupply - totalMined
  releaseAmount = remaining × 1.3%
         ↓
计算销毁量:
  burnRate = _getCurrentBurnRate()  // 80% → 每天-0.5% → 最低30%
  burnAmount = releaseAmount × burnRate
  distributeAmount = releaseAmount - burnAmount
         ↓
分配 (从DQT底池提取):
  ┌──────────────────────────────────────────────┐
  │           可分配部分 100%                     │
  │  ┌─────┬─────┬─────┬───────┬────┐           │
  │  │ LP  │节点 │ D等级│基金会 │创始人│           │
  │  │ 60% │ 15% │ 14%  │  5%   │  6%  │           │
  │  └─────┴─────┴─────┴───────┴────┘           │
  └──────────────────────────────────────────────┘
         ↓
DQT.burnFromPool(burnAmount) → 销毁
DQT.distributeFromPool(接收地址, 金额)
         ↓
事件: Mined(release, burn, distribute, rate, time)
```

### 7.2 爆块分配详情
```
LP质押奖励 (60%)
    ↓
stakeCore.distributeLPReward(amount)
    ↓
按LP质押量加权分配给LP用户

节点卡奖励 (15%)
    ↓
可切换模式:
  - 模式A: 分配给NFT持有者
  - 模式B: 全部分配给固定地址 (0x822682A54C454e938374e9690420cdFA264A18Aa)

D等级团队奖励 (14%)
    ↓
dLevelPool → 按有效地址数平均分配
    D1: 30个地址, 各1.75%
    D2: 120个地址, 各1.75%
    ...
    D8: 30000个地址, 各1.75%

基金会 (5%) → 0xA0f045c...

创始人 (6%) → 0x803B79B608455808C2f752c588804c3F5bF676a3
```

### 7.3 用户领取爆块奖励
```
LP用户领取:
  claimLPReward()
      ↓
  计算: pending = 用户LP奖励
      ↓
  stakeCore.withdrawBlockDQ(user)
      ↓
  DQ转账给用户

节点卡持有者领取:
  claimNodeReward(nodeType)
      ↓
  计算: pending = 用户节点奖励
      ↓
  DQ转账给用户

D等级用户领取:
  claimDRankReward()
      ↓
  计算: pending = 用户D等级奖励
      ↓
  DQ转账给用户
```

---

## 八、单币质押流程 (DQMiningStakeCore.sol)

### 8.1 质押DQ
```
用户调用: stakeDQ(amount, level)
         ↓
level可选:
  0: 30天, 权重5%
  1: 90天, 权重10%
  2: 180天, 权重15%
  3: 360天, 权重20%
         ↓
校验:
  - amount > 0
  - level < 4
         ↓
记录:
  sAmt[user][level] += amount
  tS[level] += amount
  stakeTime[user][level] = block.timestamp
         ↓
事件: LPStaked(user, amount)
```

### 8.2 单币质押奖励来源
```
用户卖出DQ时 (DQT.sol):
  卖出税 = 6%
       ↓
  50% → stakeCoreContract.distributeSellFee(3%)
       ↓
  50% → sellFeeReceiver (0x1d1C89c...)
       ↓
单币质押分红分配:
  distributeSellFee(amount)
       ↓
  按权重分配到各周期累计奖励:
  ┌────────────────────────────────────┐
  │  30天: 权重5%  → sA[0] += 5%       │
  │  90天: 权重10% → sA[1] += 10%      │
  │  180天: 权重15%→ sA[2] += 15%      │
  │  360天: 权重20%→ sA[3] += 20%      │
  │           合计 = 50%               │
  └────────────────────────────────────┘
```

### 8.3 领取单币质押奖励
```
用户调用: claimStakeReward(level)
         ↓
计算待领:
  pending = sAmt × sA[level] / tS[level] - sDebt
         ↓
更新债务:
  sDebt[user][level] = sAmt × sA[level] / tS[level]
         ↓
DQ转账给用户
         ↓
事件: StakeRewardClaimed(user, level, amount)
```

---

## 九、DQToken买卖税 (DQT.sol)

### 9.1 买入 (从底池购买)
```
用户 → 底池 (Swap) → 用户
         ↓
底池 → 用户:
  用户支付: 1 DQ价值
  销毁: 90% (0.9 DQ)
  手续费: 6% → taxReceiver
  用户收到: 4% (0.04 DQ)
         ↓
100% = 销毁90% + 手续费6% + 用户4%
```

### 9.2 卖出 (出售给底池)
```
用户 → 底池:
  用户获得: 100% DQ价值 (用户视角)
         ↓
合约内部处理:
  手续费: 6%
    ├─ 50% → stakeCoreContract (单币质押分红)
    └─ 50% → sellFeeReceiver
         ↓
额外销毁: 94%
  ├─ 条件: 流通量 > 总供应量×1%
  └─ 目的地: 0xdead (黑洞地址)
         ↓
实际用户到手 = 100% - 6% - 94% = 0%
(说明: 卖出即销毁100%, 用户获得的是底池的SOL)
```

### 9.3 流通量计算
```
circulating = totalSupply() - blacklistBalances - balanceOf(0xdead)

当 circulating <= totalSupply() / 100 时:
  停止卖出即销毁
```

---

## 十、LP移除手续费

### 10.1 移除LP (withdrawLP)
```
用户调用: withdrawLP(lpAmount)
         ↓
计算质押时长:
  stakeTime = block.timestamp - lpStakeTime[user]
         ↓
手续费率:
  < 60天:   20% (SOL和DQ各10%)
  60-180天: 10% (SOL和DQ各5%)
  > 180天:  0%
         ↓
移除流动性:
  Pair.removeLiquidity() → SOL + DQ
         ↓
扣除手续费:
  solFee = amountSOL × rate / 2
  dqFee = amountDQ × rate / 2
         ↓
用户获得:
  userSOL = amountSOL - solFee
  userDQ = amountDQ - dqFee
         ↓
手续费发送:
  → feeReceiver
         ↓
事件: LPWithdrawn(user, lpAmount, totalFee, stakeTime)
```

---

## 十一、LP迁移流程 (DQLPMigrator.sol)

### 11.1 迁移步骤
```
Step 1: 导入用户关系
  admin调用: migrateUsers(users[], referrers[])
      ↓
      DQMCore.importUserRelation(user, referrer)
      ↓
      users[user].referrer = referrer

Step 2: 导入用户等级
  admin调用: migrateUserLevels(userLevels[])
      ↓
      stakeCore.importUserLevel(user, level)
      ↓
      userNodeLevel[user] = level

Step 3: 用户授权并迁移LP
  用户调用: migrateLP(oldLPAmount)
      ↓
      校验:
      - 用户已注册
      - LP已授权给迁移合约
      - 旧LP余额 >= 要迁移数量
      ↓
      从旧Pair转LP到迁移合约
      ↓
      记录能量 (从旧stakeCore获取)
      ↓
      stakeCore.migrateLP(user, lpAmount, energy)
      ↓
      更新新合约:
      - lpS[user] += lpAmount
      - userEnergy[user] = energy
      - lpStakeTime[user] = 当前时间
```

---

## 十二、数据总览

### 12.1 奖励分配比例
```
入金 100% SOL:
├─ 50% 动态分币
│  ├─ 直推奖: 30%
│  ├─ 见点奖: 30% (1%×15代)
│  └─ 管理奖: 40% (级差制)
│
└─ 50% LP质押

卖出 DQ 100%:
├─ 手续费: 6%
│  ├─ 50% → 单币质押分红
│  └─ 50% → feeReceiver
└─ 销毁: 94% (流通量>1%时)

爆块可分配部分 100%:
├─ LP质押: 60%
├─ 节点卡: 15%
├─ D等级: 14%
├─ 基金会: 5%
└─ 创始人: 6%
```

### 12.2 关键地址
```
DQT代币:          (待部署)
DQMCore:          (待部署)
DQMiningStakeCore: (待部署)
DQMiningStakeMine: (待部署)
DQC:              (待部署)
DQMAdmin:         (待部署)
DQLPMigrator:     (待部署)

合伙人/创始人:    0x803B79B608455808C2f752c588804c3F5bF676a3
手续费地址:       0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967
固定节点地址:     0x822682A54C454e938374e9690420cdFA264A18Aa
Owner地址:        0x274aCc6397349F21179ed6258A54B2a11B28faF5
基金会地址:       0xA0f045cde45ca1aeE2033356170B46A1fF3b7202
```

---

## 十三、合约BUG修复说明

### BUG 1: DQT.sol 第254-255行 - 映射名称错误
```solidity
// 错误代码:
require(!blacklist[from], "From address blacklisted");
require(!blacklist[to], "To address blacklisted");

// 修复为:
require(!isBlacklisted[from], "From address blacklisted");
require(!isBlacklisted[to], "To address blacklisted");
```

### BUG 2: DQMiningStakeCore.sol - lpRouter 未定义
```solidity
// 需要添加:
address public lpRouter;

// 需要添加设置函数:
function setLpRouter(address _router) external onlyOwner {
    lpRouter = _router;
}
```

### BUG 3: DQMiningStakeCore.sol - LP移除手续费边界值
```
当前: stakeTime < 180 days → 0手续费
建议: stakeTime >= 180 days → 0手续费 (更精确匹配需求)
```
