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
### 3.5 节点供应量配置
---配置节点最大供应量 
	修改ABC卡数量上限

## 四、用户等级系统

### 4.1 L等级 (管理奖等级 - S1~S6)
```
L等级用于管理奖分配，与团队业绩挂钩：

┌─────────┬────────────┬────────┬─────────────────────────────┐
│  等级   │  团队业绩   │ 管理奖 │           说明              │
├─────────┼────────────┼────────┼─────────────────────────────┤
│   S1    │ >= 100 SOL │   5%   │ 购买A卡或业绩达标自动升级   │
│   S2    │ >= 200 SOL │  10%   │ 购买B卡或业绩达标自动升级   │
│   S3    │ >= 600 SOL │  15%   │ 购买C卡或业绩达标自动升级   │
│   S4    │ >= 2000 SOL│  20%   │ 团队业绩自动升级            │
│   S5    │ >= 6000 SOL│  25%   │ 团队业绩自动升级            │
│   S6    │ >= 20000 SOL│  30%   │ 团队业绩自动升级            │
└─────────┴────────────┴────────┴─────────────────────────────┘
```

### 4.2 L等级自动升级流程 (入金时触发)
```
用户入金: onDeposit(user, amount)
         ↓
更新团队业绩: _updateTeamSalesAndUpgrade(user, amount)
         ↓
遍历上级链:
  for (上级 = userReferrer[user]; 上级 != address(0); 上级 = userReferrer[上级])
         ↓
  更新团队业绩:
    teamSales[上级] += amount
         ↓
  检查自动升级: _checkAndAutoUpgrade(上级)
         ↓
  根据业绩匹配等级:
    if (业绩 >= 20000) → S6
    else if (业绩 >= 6000) → S5
    else if (业绩 >= 2000) → S4
    else if (业绩 >= 600) → S3
    else if (业绩 >= 200) → S2
    else if (业绩 >= 100) → S1
         ↓
  只有升级时才更新（不降级）:
    if (newLevel > currentLevel)
      userLevel[上级] = newLevel
         ↓
  事件: TeamSalesUpdated, LevelChanged, AutoUpgraded
```

### 4.3 L等级管理员批量检查
```
管理员调用: checkAndUpgradeUsers(users[])
         ↓
遍历用户列表:
  _checkAndAutoUpgrade(user)
         ↓
检查团队业绩是否达标并升级
```

### 4.4 L等级手动调整 (管理员)
```
admin调用: setUserNodeLevel(user, level)
         ↓
userNodeLevel[user] = level
         ↓
事件: LevelChanged(user, level)
```

### 4.5 D等级 (团队奖等级 - D1~D8)
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

### 4.6 D等级升级流程 (自动)
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

### 4.7 D等级手动调整 (管理员)
```
admin调用: registerDLevel(user, level)
         ↓
如果之前有等级:
  dLevelCount[旧等级-1]--
         ↓
设置新等级:
  userDLevel[user] = level
  dLevelCount[level-1]++
         ↓
设置初始奖励debt (防止领取之前累积的奖励):
  dLevelRewardDebt[user] = dLevelAccReward[level-1] / dLevelCount[level-1]
  isDLevel[level][user] = true
```

### 4.8 D等级奖励分配 (爆块时)
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

#### 入金触发六方分配:
```
入金 1 SOL → 0.5 SOL 进入奖励池
                │
                ├─────────────────────────────────────────────────────┐
                │         │         │         │         │           │
              30%       15%       30%       10%        8%          7%
           (直推奖)  (见点奖)  (管理奖)   (DAO)     (运营)      (保险)
           0.15 SOL  0.075SOL  0.15 SOL  0.05 SOL   0.04 SOL   0.035 SOL
                │         │         │         │         │           │
                │         │         │         ↓         ↓           ↓
                │         │         │    直接转账   直接转账    直接转账
                │         │         │    (不扣能量) (不扣能量)  (不扣能量)
                ↓         ↓         ↓
            扣能量     扣能量    扣能量
```

#### 分配比例说明:
| 分配项 | 比例 | 金额(1SOL入金) | 说明 |
|--------|------|---------------|------|
| 直推奖 | 30% | 0.15 SOL | 扣能量，待领取 |
| 见点奖 | 15% | 0.075 SOL | 1%×15代，扣能量，待领取 |
| 管理奖 | 30% | 0.15 SOL | 级差制，扣能量，待领取 |
| DAO | 10% | 0.05 SOL | **直接转账，不扣能量** |
| 运营 | 8% | 0.04 SOL | **直接转账，不扣能量** |
| 保险 | 7% | 0.035 SOL | **直接转账，不扣能量** |

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
  - 分配时检查能量，有能量才能分配，同时扣能量
  - 没有能量则跳过，不分配
         ↓
领取时:
  - 已在分配时扣能量，直接领取
  - 只检查余额 userPendingSOL[user]
         ↓
         ↓
示例: S6用户拿30%, S5用户拿差5%
```

#### 6.1.4 DAO分配 (DAO_RATE = 10%)
```
onDeposit(from, amount)
         ↓
daoReward = amount × 10%
         ↓
直接转账: daoAddr.call{value: daoReward}("")
         ↓
特点: 不扣能量，即时到账
事件: RewardDistributed(daoAddr, 4, daoReward)
```

#### 6.1.5 运营分配 (OPER_RATE = 8%)
```
onDeposit(from, amount)
         ↓
operReward = amount × 8%
         ↓
直接转账: operAddr.call{value: operReward}("")
         ↓
特点: 不扣能量，即时到账
事件: RewardDistributed(operAddr, 5, operReward)
```

#### 6.1.6 保险分配 (INSURE_RATE = 7%)
```
onDeposit(from, amount)
         ↓
insureReward = amount × 7%
         ↓
直接转账: insureAddr.call{value: insureReward}("")
         ↓
特点: 不扣能量，即时到账
事件: RewardDistributed(insureAddr, 6, insureReward)
```

### 6.2 奖励领取 (withdrawSOL)
```
用户调用: withdrawSOL()
         ↓
说明: 能量已在分配时扣除，领取时直接转账
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
每个等级分得 1.75% (14%÷8)
    ↓
每个等级内所有地址平均分配这1.75%
    ↓
    D1: 30个有效地址 → 升级考核条件
        D1等级内所有地址平均分D1的1.75%
    D2: 120个有效地址 → 升级考核条件
        D2等级内所有地址平均分D2的1.75%
    ...
    D8: 30000个有效地址 → 升级考核条件
        D8等级内所有地址平均分D8的1.75%

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
  计算: 
    rewardPerUser = dLevelAccReward[等级-1] / dLevelCount[等级-1]
    reward = rewardPerUser - dLevelRewardDebt[用户]
      ↓
  说明: 该等级内所有地址平均分配这1.75%
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
  分成两半（各3%）:
  ├─────────────────────────────────────┐
  │  50%（3%）→ 手续费地址              │
  │  50%（3%）→ 单币质押用户分配        │
  └─────────────────────────────────────┘
       ↓
单币质押分红分配:
  distributeSellFee(3%)
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

### 9.1 买入 (用户用SOL买DQ)
```
用户支付SOL → PancakeSwap → SOL进入底池
         ↓
PancakeSwap计算可转出DQ数量（假设100 DQ）
         ↓
DQ从底池转出时触发买入税：
  ┌─────────────────────────────────────────────────────────┐
  │  从底池销毁: 90% DQ (90 DQ) → 底池 → 0xdead           │
  │  从底池转手续费: 6% DQ (6 DQ) → 底池 → taxReceiver     │
  │  用户收到: 4% DQ (4 DQ) → 底池 → 用户                 │
  └─────────────────────────────────────────────────────────┘
         ↓
底池变化:
  SOL: +用户支付的SOL
  DQ: -100 DQ (90销毁 + 6手续费 + 4给用户)
         ↓
示例: 用户用1 SOL买入
  → SOL: 底池 +1 SOL
  → DQ: 底池 -100 DQ (其中90销毁, 6手续费, 4给用户)
  → 用户收到: 4 DQ
```

### 9.2 卖出 (用户用DQ换SOL)
```
用户支付DQ → PancakeSwap → DQ从用户转出
         ↓
Step 1: 扣6%手续费
  ┌─────────────────────────────────────────────────────────┐
  │  3% DQ → 用户 → stakeCoreContract (单币质押分红)       │
  │  3% DQ → 用户 → sellFeeReceiver                        │
  └─────────────────────────────────────────────────────────┘
         ↓
Step 2: 剩余94%进入底池
  ┌─────────────────────────────────────────────────────────┐
  │  94 DQ → 用户 → 底池                                    │
  └─────────────────────────────────────────────────────────┘
         ↓
Step 3: PancakeSwap计算并转出SOL给用户
  用户获得: 底池对应94 DQ价值的SOL
         ↓
Step 4: 从底池销毁94%（流通量>1%时）
  ┌─────────────────────────────────────────────────────────┐
  │  94 DQ → 底池 → 0xdead       另外再销毁94                 │
  └─────────────────────────────────────────────────────────┘
         ↓
底池变化:
  SOL: -用户获得的SOL
  DQ: +94 DQ - 94 DQ = 0 DQ (进入后立即销毁)
         ↓
示例: 用户卖出100 DQ
  → 手续费: 6 DQ (3%质押 + 3%手续费地址)
  → 进入底池: 94 DQ
  → 用户获得: 底池对应94 DQ价值的SOL
  → 从底池销毁: 94 DQ (流通量>1%时)
  → 底池DQ净变化: 0
```

### 9.2.1 卖出手续费配置
```
管理员调用: setSellFeeRate(rate)
         ↓
参数范围: 6 - 80 (代表6% - 80%)
         ↓
默认值: 6 (6%)
         ↓
示例:
  setSellFeeRate(6)   → 6%手续费（默认）
  setSellFeeRate(10)  → 10%手续费
  setSellFeeRate(50)  → 50%手续费
  setSellFeeRate(80)  → 80%手续费（最大）
         ↓
查询当前费率:
  sellFeeRate() → 返回当前费率
```

### 9.2.2 DQ卖出手续费分配逻辑
```
卖出手续费 = amount × sellFeeRate / 100

分配:
  50% → 单币质押用户分红 (stakeCoreContract.distributeSellFee)
  50% → 手续费接收地址 (sellFeeReceiver)

示例: 卖出100 DQ，费率6%
  手续费: 6 DQ
  ├─ 3 DQ → 质押分红
  └─ 3 DQ → sellFeeReceiver
```


### 9.3 关键说明
```
注意：合约DQ余额>1%时，卖出买入停止销毁 DQ
买入时:
  - 进入底池: 用户的SOL
  - 从底池出: 100% DQ (90%销毁 + 6%手续费 + 4%给用户)
  - 底池DQ减少，底池SOL增加

卖出时:
  - 进入底池: 94% DQ (扣6%手续费后)
  - 从底池销毁: 94% DQ (合约DQ余额>1%时)
  - 底池DQ净变化: 0
  - 底池SOL减少（用户获得）
  - K值保持不变（DQ不变，SOL减少，价格上升）
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

## 十一、LP权益授权管理

### 11.1 功能说明

用户可以授权LP给爆块合约，获得LP权益，从而参与爆块奖励分配。

**两种LP权益来源**：
| 来源 | 说明 | 记录位置 |
|------|------|---------|
| 入金自动质押 | 用户入金SOL时，50%自动添加LP并质押 | lpS[user] |
| 钱包LP授权 | 用户授权钱包里持有的LP参与爆块奖励 | lpEquity[user] |

### 11.2 查询LP权益

```
用户调用: getLPEquityInfo(user)
      ↓
返回:
  - stakedLP: 已质押的LP（入金时自动质押）
  - equityLP: 已授权的钱包LP
  - totalEquity: 总LP权益 = stakedLP + equityLP
  - walletLP: 钱包LP余额
```

### 11.3 操作流程

```
用户授权钱包LP权益:
  用户调用: authorizeLPEquity(amount)
      ↓
      校验: 钱包LP余额 >= amount
      ↓
      记录: lpEquity[user] += amount
            totalLPEquity += amount
      ↓
      用户获得LP权益，参与爆块奖励分配

用户取消LP权益:
  用户调用: cancelLPEquity(amount)
      ↓
      清除: lpEquity[user] -= amount
             totalLPEquity -= amount
      ↓
      用户不再获得LP权益部分的爆块奖励
```

### 11.4 LP质押 vs LP权益

| 对比项 | LP质押 | LP权益授权 |
|--------|--------|-----------|
| 来源 | 入金时自动质押 | 用户手动授权钱包LP |
| LP位置 | 转入合约 | 用户钱包 |
| 可随时取出 | 否（有手续费） | 是（一键取消） |
| 参与爆块奖励 | 是 | 是 |
| 领取奖励函数 | claimLPReward() | claimLPReward() |

### 11.5 注意事项

- 入金时LP已自动质押，无需重复添加权益
- 用户可同时有LP质押和LP权益，两者奖励合并计算
- 取消LP权益不涉及LP转账，仅清除权益记录
- LP权益授权后，用户仍可在PancakeSwap操作LP

---

## 十二、数据总览

### 12.1 奖励分配比例
```
入金 100% SOL:
├─ 50% 动态分币
│  ├─ 直推奖: 30% (扣能量，待领取)
│  ├─ 见点奖: 15% (1%×15代，扣能量，待领取)
│  ├─ 管理奖: 30% (级差制，扣能量，待领取)
│  ├─ DAO: 10% (直接转账，不扣能量)
│  ├─ 运营: 8% (直接转账，不扣能量)
│  └─ 保险: 7% (直接转账，不扣能量)
│
└─ 50% LP质押

卖出 DQ 100%:
├─ 手续费: 6% DQ
│  ├─ 50% (3%) → 单币质押分红
│  └─ 50% (3%) → sellFeeReceiver
├─ 销毁: 94% DQ (流通量>1%时)
└─ 用户获得: 底池对应SOL (根据AMM计算)

爆块可分配部分 100%:
├─ LP质押/权益: 60% (LP质押和LP权益授权用户共同分配)
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
手续费地址:       0x1850933c0d64db3A56476F5Bdc4191BCFd242e30
固定节点地址:     0x822682A54C454e938374e9690420cdFA264A18Aa
Owner地址:        0x274aCc6397349F21179ed6258A54B2a11B28faF5
基金会地址:       0xA0f045cde45ca1aeE2033356170B46A1fF3b7202
DAO地址:          0x27b84FC9eb5C3a19585093aD6D11292cbbaB5852
保险地址:         0x2db993B862969040Cd971Df8Fd2a2C80EC285203
运营地址:         0x4bE56C5390869A3236F8545462896eB1E423D0d5
```

---

## 十三、管理员功能清单

### 13.1 用户能量管理
| 功能 | 函数 | 说明 |
|------|------|------|
| 设置用户能量 | `adminSetEnergy(user, energy)` | 直接设置用户能量值 |
| 增加用户能量 | `adminAddEnergy(user, amount)` | 增加指定数量能量 |
| 减少用户能量 | `adminSubEnergy(user, amount)` | 减少指定数量能量 |

### 13.2 黑名单功能
| 功能 | 函数 | 说明 |
|------|------|------|
| 设置黑名单 | `setBlacklisted(user, status)` | true=拉黑, false=解除 |
| 效果 | - | 黑名单用户无法入金、无法领取奖励、无法交易 |

### 13.3 入金限制阶段
| 功能 | 函数 | 说明 |
|------|------|------|
| 设置当前阶段 | `setPhase(phase)` | 设置入金上限 |
| 升级阶段 | `advancePhase()` | 入金上限+5 SOL，直到200封顶 |

**入金上限规则**：
```
初始阶段: 1 SOL/天
每次升级: +5 SOL
封顶上限: 200 SOL/天

阶段示例:
阶段1: 1 SOL
阶段2: 5 SOL (管理员第一次操作)
阶段3: 10 SOL (5+5)
阶段4: 15 SOL (10+5)
...
阶段40: 200 SOL (封顶)
```

> 注意：每次管理员操作，入金上限增加5 SOL，直到达到200 SOL封顶

### 13.4 节点分配模式开关
| 功能 | 函数 | 说明 |
|------|------|------|
| 设置节点奖励模式 | `setNodeRewardMode(toFixed, fixedAddress)` | true=给固定地址, false=给节点NFT持有者 |

```
模式A: toFixed=false → 节点奖励分配给NFT持有者
模式B: toFixed=true, fixedAddress=0x8226... → 节点奖励全给固定地址
```

### 13.5 批量导入用户关系
| 功能 | 函数 | 说明 |
|------|------|------|
| 批量导入用户 | `importUsers(users[], referrers[])` | 传入单个用户即为单个导入 |

```solidity
// 单个导入
address[] memory users = new address[](1);
address[] memory referrers = new address[](1);
users[0] = 0xUser;
referrers[0] = 0xReferrer;
importUsers(users, referrers);

// 批量导入
importUsers([user1, user2], [referrer1, referrer2]);
```

### 13.6 批量配置用户等级
| 功能 | 函数 | 说明 |
|------|------|------|
| 批量设置节点等级 | `setUserNodeLevel(users[], levels[])` | 设置用户节点等级(S1-S6) |

### 13.7 批量导入节点
| 功能 | 函数 | 说明 |
|------|------|------|
| 批量设置 | `setUserNodeLevel(users[], levels[])` | 传入单个用户即为单个设置 |

### 13.8 提取合约资产
| 功能 | 函数 | 说明 |
|------|------|------|
| 提取代币 | `withdrawToken(token, to, amount)` | 提取任意代币（LP/SOL/DQ等） |
| 参数说明 | token=address(0) 表示提取SOL | 任意owner权限地址可调用 |

```solidity
// 提取SOL
withdrawToken(address(0), to, 1 ether);

// 提取DQ
withdrawToken(DQ地址, to, 100 * 10**18);

// 提取LP
withdrawToken(LP地址, to, amount);
```

### 13.9 修改推荐人
| 功能 | 函数 | 说明 |
|------|------|------|
| 修改推荐人 | `changeReferrer(user, newReferrer)` | 仅限无下线的用户 |

```
条件检查:
1. 用户已注册
2. 新推荐人已注册
3. 用户无下线（children.length == 0）
```
### 13.10 修改节点供应上限
管理员修改ABC卡供应量上限

