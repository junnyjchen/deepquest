/**
 * DeepQuest 合约 ABI 配置
 * 
 * 合约地址（最新）：

 * 
 * ABI 来源：assets/DQMining.sol (基于合约源码生成)
 */

export const DQ_CONTRACT_ADDRESS = '0x662A86A10e2b01403F3d5Ec80cf352f87ed33E95';
export const DQSTAKE_CONTRACT_ADDRESS = '0x41632c8598780d96653ab543C4a2CB0c5Eb8267c';


export const DQ_ABI = [
  // ========== 部署 ==========
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},

  // ========== 事件 ==========
  // 事件：event BurnFromDQT(address from, uint256 amount)
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BurnFromDQT","type":"event"},
  // 事件：用户领取动态奖励（amount=到账金额，fee=手续费）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"ClaimReward","type":"event"},
  // 事件：用户入金（u=用户，a=金额）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"Deposit","type":"event"},
  // 事件：用户注册（u=用户，r=推荐人）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":true,"internalType":"address","name":"r","type":"address"}],"name":"Register","type":"event"},
  // 事件：用户复投（amount=复投金额，energyAdded=增加的能量值）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"energyAdded","type":"uint256"}],"name":"ReinvestSOL","type":"event"},
  // 事件：卖出 DQ（d=DQ数量，s=获得SOL，b=销毁量，f=手续费）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"b","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"f","type":"uint256"}],"name":"SellDQ","type":"event"},
  // 事件：换 DQ 并加 LP（s=SOL，d=DQ，l=LP数量）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"l","type":"uint256"}],"name":"SwapAndAddLP","type":"event"},
  // 事件：owner 提取 BNB（to=收款地址，amount=金额）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"WithdrawBNB","type":"event"},

  // ========== 读取（view）==========
  // 所有注册用户数组（index → address）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 授权地址查询（true = 已被授权）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"authorized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 通缩停止阈值（达到后不再销毁 DQ）
  {"inputs":[],"name":"BURN_STOP_THRESHOLD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 买入手续费接收/分配地址
  {"inputs":[],"name":"BUY_FEE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 领取手续费收益时需支付的 BNB 数量
  {"inputs":[],"name":"CLAIM_BNB_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 当前阶段编号
  {"inputs":[],"name":"currentPhase","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 基础日限额（每阶段可上调）
  {"inputs":[],"name":"DAILY_LIMIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户今日已入金额（用于日限额统计）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dailyDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // DAO 地址
  {"inputs":[],"name":"DAO","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // DAO 补贴费率（千分比）
  {"inputs":[],"name":"DAO_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 入金白名单（true = 不受日限额限制）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"depositWhiteList","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 直推奖励费率（千分比）
  {"inputs":[],"name":"DIRECT_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // DQCard NFT 合约地址
  {"inputs":[],"name":"dqCard","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // DQToken 代币合约地址
  {"inputs":[],"name":"dqToken","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 能量倍数（入金 × ENERGY_MUL = 能量）
  {"inputs":[],"name":"ENERGY_MUL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 提现手续费中分配给基金会的比例
  {"inputs":[],"name":"FEE_FOUNDATION_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 提现手续费中分配给 NFT 节点的比例
  {"inputs":[],"name":"FEE_NODE_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 提现手续费中分配给合伙人的比例
  {"inputs":[],"name":"FEE_PARTNER_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function feeAddr() → (address) [view]
  {"inputs":[],"name":"feeAddr","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 基金会地址
  {"inputs":[],"name":"FOUNDATION","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 获取注册用户总数
  {"inputs":[],"name":"getAllUsersLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 计算当前阶段的日限额（含 phase step，上限 200 ether）
  {"inputs":[],"name":"getDailyLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户待提现动态奖励余额
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getPendingSOL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取用户的团队规模（直接/间接下级总数）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamSize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取用户基础信息：推荐人、直推数、节点等级、总入金
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getUser","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint8","name":"level","type":"uint8"},{"internalType":"uint256","name":"totalInvest","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 获取用户质押数据：团队业绩、能量、待提现 SOL
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getUserStake","outputs":[{"internalType":"uint256","name":"teamInvest","type":"uint256"},{"internalType":"uint256","name":"energy","type":"uint256"},{"internalType":"uint256","name":"pendingSOL","type":"uint256"}],"stateMutability":"view","type":"function"},
  // DQ 初始发行量
  {"inputs":[],"name":"INITIAL_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 保险地址
  {"inputs":[],"name":"INS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 保险费率（千分比）
  {"inputs":[],"name":"INS_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 最小入金额（单位 wei）
  {"inputs":[],"name":"INVEST_MIN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 黑名单状态（true = 禁止操作）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 管理奖池分配费率（千分比）
  {"inputs":[],"name":"MGR_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // NFT 节点累计待分发的 SOL
  {"inputs":[],"name":"nftPendingSOL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 节点卡价格表（index: 0~3）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nodePrices","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 运营地址
  {"inputs":[],"name":"OP","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 运营费率（千分比）
  {"inputs":[],"name":"OP_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 合约 owner 地址
  {"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 合伙人累计待分发的 SOL
  {"inputs":[],"name":"partnerPendingSOL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 每阶段日限额增加步长
  {"inputs":[],"name":"PHASE_STEP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // PancakeSwap Router 地址
  {"inputs":[],"name":"ROUTER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 见点奖励费率（千分比）
  {"inputs":[],"name":"SEE_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function SELL_FEE() → (uint256) [view]
  {"inputs":[],"name":"SELL_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 兑换滑点参数（千分比，如 10 = 1%）
  {"inputs":[],"name":"SLIPPAGE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // SOL 代币合约地址
  {"inputs":[],"name":"SOL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 质押运营地址
  {"inputs":[],"name":"STAKE_OP","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 绑定的质押合约地址
  {"inputs":[],"name":"stakeContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 合约启动时间戳
  {"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 提现手续费费率（千分比）
  {"inputs":[],"name":"WITHDRAW_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},

  // ========== 写操作（nonpayable / payable）==========
  // 加入黑名单（owner）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"addToBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 DQ（谨慎使用）
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"adminWithdrawDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 SOL（谨慎使用）
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"adminWithdrawSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 手动推进阶段（owner）
  {"inputs":[],"name":"advancePhase","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 授权 Router 进行 SOL/DQ 兑换操作（owner）
  {"inputs":[],"name":"approveRouter","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 购买节点卡（_t=卡牌类型，用 SOL 支付）
  {"inputs":[{"internalType":"uint256","name":"_t","type":"uint256"}],"name":"buyNode","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 D 等级团队奖励
  {"inputs":[],"name":"claimDTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取手续费分红
  {"inputs":[],"name":"claimFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 LP 分红
  {"inputs":[],"name":"claimLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 NFT 分红
  {"inputs":[],"name":"claimNft","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取合伙人 BNB 奖励
  {"inputs":[],"name":"claimPartnerBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取合伙人 DQ 奖励
  {"inputs":[],"name":"claimPartnerDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提现动态奖励（扣 WITHDRAW_FEE；以 SOL 支付给用户）
  {"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取单币质押奖励（_periodIndex=质押周期索引）
  {"inputs":[{"internalType":"uint256","name":"_periodIndex","type":"uint256"}],"name":"claimStakeReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function createLPFromBalance(address _user, uint256 _a) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"createLPFromBalance","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 管理员代用户入金
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"depositForUser","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户入金（转入 SOL；需已注册）
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"depositSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 将手续费 SOL 分配到 NFT 分红池
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"distributeFeeToNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function importNodes(address[] _u, uint8[] _t) [nonpayable]
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"uint8[]","name":"_t","type":"uint8[]"}],"name":"importNodes","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 导入单个用户推荐关系（owner）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"address","name":"_r","type":"address"}],"name":"importUser","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function importUsers(address[] _u, address[] _r) [nonpayable]
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"address[]","name":"_r","type":"address[]"}],"name":"importUsers","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function manualAddLP(address _user, uint256 _a) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"manualAddLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 触发挖矿结算（owner）
  {"inputs":[],"name":"mineBlock","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function receiveBurn(uint256 _amount) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"receiveBurn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户注册推荐人（需未注册；_r=推荐人地址）
  {"inputs":[{"internalType":"address","name":"_r","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 移出黑名单（owner）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"removeFromBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 卖出 DQ 换 SOL（94% 销毁 + 6% 手续费；返回 solOut）
  {"inputs":[{"internalType":"uint256","name":"_dq","type":"uint256"}],"name":"sellDQForSOL","outputs":[{"internalType":"uint256","name":"solOut","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  // 设置/更换 DQCard 合约地址（owner）
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setDQCard","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置/更换 DQToken 合约地址（owner）
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setDQToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setFeeAddr(address _addr) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setFeeAddr","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置基金会地址（owner）
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setFoundation","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setNodesDLevel(address[] _u, uint8[] _lvl) [nonpayable]
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"uint8[]","name":"_lvl","type":"uint8[]"}],"name":"setNodesDLevel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setNodesLevel(address[] _u, uint8[] _lvl) [nonpayable]
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"uint8[]","name":"_lvl","type":"uint8[]"}],"name":"setNodesLevel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setReferrer(address _u, address _r) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"address","name":"_r","type":"address"}],"name":"setReferrer","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置兑换滑点（owner；千分比）
  {"inputs":[{"internalType":"uint256","name":"_s","type":"uint256"}],"name":"setSlippage","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置绑定的质押合约地址（owner）
  {"inputs":[{"internalType":"address","name":"_a","type":"address"}],"name":"setStakeContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置用户 D 等级（owner；_lvl=0~7）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint8","name":"_lvl","type":"uint8"}],"name":"setUserDLevel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置用户节点等级（owner；_lvl=0~6）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint8","name":"_lvl","type":"uint8"}],"name":"setUserLevel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 质押 DQ（_amount=数量，_periodIndex=周期索引）
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_periodIndex","type":"uint256"}],"name":"stakeDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 解押 DQ（_periodIndex=对应质押周期）
  {"inputs":[{"internalType":"uint256","name":"_periodIndex","type":"uint256"}],"name":"unstakeDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提现（转发到质押合约）
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 BNB（_to=收款地址，_amount=金额）
  {"inputs":[{"internalType":"address payable","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},

  {"stateMutability":"payable","type":"receive"}
];

export const DQSTAKE_ABI = [
  // ========== 部署 ==========
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},

  // ========== 事件 ==========
  // 事件：用户领取动态奖励（amount=到账金额，fee=手续费）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"ClaimReward","type":"event"},
  // 事件：用户入金（u=用户，a=金额）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"Deposit","type":"event"},
  // 事件：用户能量变化（u=用户，e=新能量值）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"e","type":"uint256"}],"name":"EnergyChanged","type":"event"},
  // 事件：event LPRemoved(address u, uint256 a)
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"LPRemoved","type":"event"},
  // 事件：质押 DQ（u=用户，a=数量，i=周期索引）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"i","type":"uint256"}],"name":"Stake","type":"event"},
  // 事件：团队业绩变化（u=用户，v=新业绩值）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"v","type":"uint256"}],"name":"TeamInvestChanged","type":"event"},
  // 事件：解押 DQ（u=用户，a=数量，i=周期索引）
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"i","type":"uint256"}],"name":"Unstake","type":"event"},

  // ========== 读取（view）==========
  // 基础日收益率分子（BD/MB = 日收益率）
  {"inputs":[],"name":"BD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 区块奖励参数
  {"inputs":[],"name":"br","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 领取手续费收益时需支付的 BNB 数量
  {"inputs":[],"name":"CLAIM_GAS_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 领取时支付 BNB gas 费（payable；需支付 CLAIM_GAS_FEE）
  {"inputs":[],"name":"claimGasFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // D 等级奖励分配比例（千分比）
  {"inputs":[],"name":"D_LEVEL_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户直推人数
  {"inputs":[],"name":"dc","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 用户直推业绩
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dd","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户 D 等级（0~7）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dl","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // D 等级全局累计奖励（index=dLevel）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"dLevelAccReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 当前各 D 等级人数（index=dLevel）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"dLevelCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户 D 等级奖励债（用于差额计算）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dLevelRewardDebt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户当前 DQ 质押数量
  {"inputs":[],"name":"dq","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // DQCard NFT 合约地址
  {"inputs":[],"name":"DQ_CARD","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // DQToken 代币合约地址
  {"inputs":[],"name":"DQ_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 当前能量倍数（可由 owner 调整）
  {"inputs":[],"name":"energyMul","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 180 天锁定期系数（质押收益加成）
  {"inputs":[],"name":"F180","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 60 天锁定期系数（质押收益加成）
  {"inputs":[],"name":"F60","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 手续费接收地址
  {"inputs":[],"name":"feeRecipient","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 基金会地址
  {"inputs":[],"name":"FOUNDATION","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 手续费分配给基金会的比例（千分比）
  {"inputs":[],"name":"FOUNDATION_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 手续费分配参数
  {"inputs":[],"name":"fp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户指定索引的直接下级地址
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"getChild","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 查询用户直接下级数量
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getChildCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function getDirectSales(address _u) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getDirectSales","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户 D 等级（0~7）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getDLevel","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // 查询用户待领取 D 等级奖励
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getDLevelReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户当前能量值
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getEnergy","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function getPartnerReward(address _u) → (uint256 dqReward, uint256 solReward) [view]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getPartnerReward","outputs":[{"internalType":"uint256","name":"dqReward","type":"uint256"},{"internalType":"uint256","name":"solReward","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户待提现动态奖励余额
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getPendingSOL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户质押信息（按 periodIndex）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"getStk","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户团队业绩
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function getUserLPRemovalFee(address _u) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getUserLPRemovalFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 查询用户有效直推地址数量
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getValidAddressCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 初始区块奖励参数
  {"inputs":[],"name":"IB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // DQ 初始发行量
  {"inputs":[],"name":"INITIAL_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 是否在黑名单
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isB","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // 是否达到 D 等级（bool）
  {"inputs":[{"internalType":"uint8","name":"","type":"uint8"},{"internalType":"address","name":"","type":"address"}],"name":"isDLevel","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // LP 全局累计奖励（用于 LP 分红结算）
  {"inputs":[],"name":"lA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // LP 分红快照（用于计算待领取）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lF","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // LP 分红费率（千分比）
  {"inputs":[],"name":"LP_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户 LP 分红债（已领取快照）
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // LP 代币合约地址（SOL-DQ 交易对）
  {"inputs":[],"name":"lpPair","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 用户 LP 份额
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // LP 全局总份额
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // LP 时间戳参数
  {"inputs":[],"name":"lt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 基础日收益率分母（BD/MB = 日收益率）
  {"inputs":[],"name":"MB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 主合约地址（DQProject）
  {"inputs":[],"name":"mc","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 管理奖励费率阶梯（index: 0~5）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"mgrRates","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // 管理奖励业绩阈值（index: 0~5）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"mgrThresh","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 主合约地址（DQProject）
  {"inputs":[],"name":"miningContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // NFT 全局累计奖励（用于 NFT 分红结算）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // D0 等级全局快照参数
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD0","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // D1 等级全局快照参数
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD1","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // D2+ 等级全局快照参数
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD2","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // NFT 节点分红费率（千分比）
  {"inputs":[],"name":"NFT_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 节点卡价格表（index: 0~3）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nodePrices","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 节点达标直推要求（index: 0~3）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nodeReq","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 合约 owner 地址
  {"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 合伙人分配合约/地址
  {"inputs":[],"name":"PARTNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 合伙人 BNB 全局累计奖励
  {"inputs":[],"name":"pBA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 合伙人 DQ 全局累计奖励
  {"inputs":[],"name":"pDA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function pendingBurnAmount() → (uint256) [view]
  {"inputs":[],"name":"pendingBurnAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 已释放的 DQ 数量（挖矿释放）
  {"inputs":[],"name":"releasedSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // PancakeSwap Router 地址
  {"inputs":[],"name":"ROUTER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 滚动周期时长（秒）
  {"inputs":[],"name":"RT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 单币质押全局累计奖励（用于质押收益结算）
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"sA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户各周期质押数量（index=periodIndex）
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"sAmt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户各周期质押奖励债（index=periodIndex）
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"sDebt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // SOL 代币合约地址
  {"inputs":[],"name":"SOL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 合伙人费率相关参数
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"SP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 全局 LP 总份额快照参数
  {"inputs":[],"name":"tLP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 全局单币质押总量
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户直推业绩映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userDirectSales","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户 D 等级映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userDLevel","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // 用户能量映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userEnergy","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户节点等级映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userLevel","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // 读取：function userLPRemovalFee(address) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userLPRemovalFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function userNftF(address, uint256) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userNftF","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function userPBD(address) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userPBD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 读取：function userPDD(address) → (uint256) [view]
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userPDD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户待提现 SOL 映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userPendingSOL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户推荐人映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userReferrer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  // 用户团队业绩映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userTeamInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户总入金映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userTotalInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  // 用户有效直推地址数映射
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userValidAddressCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},

  // ========== 写操作（nonpayable / payable）==========
  // 添加用户下级关系（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_p","type":"address"},{"internalType":"address","name":"_c","type":"address"}],"name":"addChild","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 增加用户直推业绩（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"addDirectSales","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 增加用户能量（仅主合约调用；_u=用户，_a=增量）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"addEnergy","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 增加用户 LP 份额（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"},{"internalType":"uint256","name":"_t","type":"uint256"}],"name":"addLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function addPendingBurn(uint256 _amount) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"addPendingBurn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 增加用户待提现 SOL（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"addPendingSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 增加用户团队业绩（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"addTeamInvest","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function adminWithdrawLP(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"adminWithdrawLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function bl(address u, bool s) [nonpayable]
  {"inputs":[{"internalType":"address","name":"u","type":"address"},{"internalType":"bool","name":"s","type":"bool"}],"name":"bl","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function claimD(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimD","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 D 等级奖励
  {"inputs":[],"name":"claimDLevelReward","outputs":[],"stateMutability":"payable","type":"function"},
  // 领取手续费分红
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 LP 分红
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取 NFT 分红
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimNft","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function claimPbnb(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimPbnb","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function claimPdq(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimPdq","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 领取单币质押奖励（_periodIndex=质押周期索引）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"claimStakeReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function clearUserLPRemovalFee(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"clearUserLPRemovalFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function clmS(address _u, uint256 _i) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"clmS","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function distDQFee(uint256 _amount) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"distDQFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function distLP(uint256 _f) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_f","type":"uint256"}],"name":"distLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function distNFT(uint256 _f) [payable]
  {"inputs":[{"internalType":"uint256","name":"_f","type":"uint256"}],"name":"distNFT","outputs":[],"stateMutability":"payable","type":"function"},
  // 方法：function distP(uint256 _f) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_f","type":"uint256"}],"name":"distP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function distReward(address _u, uint256 _a) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"distReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function forceRemoveLP(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"forceRemoveLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 导入单个用户推荐关系（owner）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"address","name":"_r","type":"address"},{"internalType":"uint256","name":"_total","type":"uint256"},{"internalType":"uint256","name":"_team","type":"uint256"},{"internalType":"uint8","name":"_level","type":"uint8"},{"internalType":"uint256","name":"_energy","type":"uint256"}],"name":"importUser","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function mine() [nonpayable]
  {"inputs":[],"name":"mine","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function notifyLPRemoved(address _u, uint256 _amount) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"notifyLPRemoved","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function registerDLevel(address _user, uint8 _newLevel) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint8","name":"_newLevel","type":"uint8"}],"name":"registerDLevel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function registerUser(address _u, address _r) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"address","name":"_r","type":"address"}],"name":"registerUser","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function removeChild(address _p, address _c) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_p","type":"address"},{"internalType":"address","name":"_c","type":"address"}],"name":"removeChild","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setAddresses(address _dq, address _dc, address _lpPair) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_dq","type":"address"},{"internalType":"address","name":"_dc","type":"address"},{"internalType":"address","name":"_lpPair","type":"address"}],"name":"setAddresses","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setClaimGasFee(uint256 _fee) [nonpayable]
  {"inputs":[{"internalType":"uint256","name":"_fee","type":"uint256"}],"name":"setClaimGasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setDLevelByOwner(address _user, uint8 _newLevel) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint8","name":"_newLevel","type":"uint8"}],"name":"setDLevelByOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置/更换 DQCard 合约地址（owner）
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setDQCard","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setEnergy(address _u, uint256 _e) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_e","type":"uint256"}],"name":"setEnergy","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置能量倍数（owner）
  {"inputs":[{"internalType":"uint256","name":"_m","type":"uint256"}],"name":"setEnergyMul","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setFeeRecipient(address _addr) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setFeeRecipient","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setLpPair(address _pair) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_pair","type":"address"}],"name":"setLpPair","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setM(address a) [nonpayable]
  {"inputs":[{"internalType":"address","name":"a","type":"address"}],"name":"setM","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置主合约地址（owner）
  {"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"setMiningContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setPendingSOL(address _u, uint256 _p) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_p","type":"uint256"}],"name":"setPendingSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function setTeamInvest(address _u, uint256 _v) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_v","type":"uint256"}],"name":"setTeamInvest","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 设置用户有效直推数（owner）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_c","type":"uint256"}],"name":"setValidAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户质押 DQ（_a=数量，_p=周期索引）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"},{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 减少用户能量（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"subEnergy","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function subPendingBurn(address _u, uint256 _amount) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"subPendingBurn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 减少用户待提现 SOL（仅主合约调用）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"subPendingSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户解押 DQ（_p=周期索引）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function updateTeam(address _u, uint256 _a) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"updateTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 方法：function updateValidAddress(address _u) [nonpayable]
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"updateValidAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 用户提现（转发到质押合约）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 BNB
  {"inputs":[],"name":"withdrawBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 DQ（谨慎使用）
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawDQ","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 提走 LP（转发到质押合约）
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"withdrawLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // 管理员代提 LP
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"withdrawLPByM","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // owner 提走合约内 SOL（谨慎使用）
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},

  {"stateMutability":"payable","type":"receive"}
];

// Card NFT ABI (完整定义，基于 DQCard.sol 源码生成)
export const DQCARD_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }], "name": "ApprovalForAll", "type": "event" },
  // ========== ERC721 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }, { "name": "data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "operator", "type": "address" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== ERC721Enumerable ==========
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "index", "type": "uint256" }], "name": "tokenOfOwnerByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "index", "type": "uint256" }], "name": "tokenByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 卡牌常量 ==========
  { "inputs": [], "name": "CARD_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "CARD_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "CARD_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalA", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalB", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalC", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "uint256" }], "name": "cardType", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 管理函数 ==========
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxA", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxC", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "_type", "type": "uint256" }], "name": "mintByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "to", "type": "address[]" }, { "name": "_types", "type": "uint256[]" }], "name": "mintBatchByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== 查询函数 ==========
  { "inputs": [{ "name": "_type", "type": "uint256" }], "name": "getCardPrice", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// Token ABI (完整定义，基于 DQToken.sol 源码生成)
export const DQTOKEN_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "burnAmount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "netAmount", "type": "uint256" }], "name": "BuyFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "pairAmount", "type": "uint256" }, { "indexed": false, "name": "burnFromPool", "type": "uint256" }], "name": "SellFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "totalBurned", "type": "uint256" }], "name": "Burned", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "pair", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "PairUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "ExcludedUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "BlacklistedUpdated", "type": "event" },
  // ========== ERC20 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "decimals", "outputs": [{ "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 常量 ==========
  { "inputs": [], "name": "BUY_BURN_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BUY_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SELL_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SELL_TO_PAIR_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BURN_ADDRESS", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "burnedSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BURN_TARGET", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "buyFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "sellFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isPair", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isExcluded", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "buyFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "sellFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "miningStake", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  // ========== 管理函数 ==========
  { "inputs": [{ "name": "_pair", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setPair", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_pairs", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setPairs", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setExcluded", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_accounts", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setExcludedBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setBlacklisted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_buyFeeReceiver", "type": "address" }], "name": "setBuyFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_sellFeeReceiver", "type": "address" }], "name": "setSellFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_miningStake", "type": "address" }], "name": "setMiningStake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_buyFee", "type": "bool" }, { "name": "_sellFee", "type": "bool" }], "name": "setFeeStatus", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "account", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== 查询函数 ==========
  { "inputs": [], "name": "circulatingSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "remainingBurnable", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "isBurnTargetReached", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateBuyOutput", "outputs": [{ "name": "burnAmount", "type": "uint256" }, { "name": "feeAmount", "type": "uint256" }, { "name": "netAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateSellOutput", "outputs": [{ "name": "feeAmount", "type": "uint256" }, { "name": "pairAmount", "type": "uint256" }, { "name": "burnAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" }
];

// AVE 交易对合约 ABI（Pancake/Uniswap V2 Pair）
export const AVE_PAIR_ABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

// 补充导出：交易对地址、代币地址、Card地址（需从链上或配置获取）
export const AVE_PAIR_ADDRESS = '0x0ff62e392ee9582a84f73f3a37b387d8efd58e2d'; // PancakeSwap Pair 地址（需配置）
export const DQTOKEN_CONTRACT_ADDRESS = '0x58eb34119dC1c5631e74DEeAAf8e6cF120F9D0b8'; // DQToken 地址（需配置）
export const DQCARD_CONTRACT_ADDRESS = '0x5dCe053D791A319AD5f4c352A3A630139Bd55B01'; // DQCard 地址（需配置）
