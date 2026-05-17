/**
 * 格式化 client/config/contracts.ts 中的 ABI
 * 将展开的多行 JSON 格式压缩为每条目单行 + 中文注释
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../client/config/contracts.ts');

// ─── 工具：提取变量对应的 JSON 数组字符串 ─────────────────────────────────
function extractABIJson(content, varName) {
  const marker = `export const ${varName} = [`;
  const start = content.indexOf(marker);
  if (start === -1) return null;
  let depth = 0, i = start + marker.length - 1;
  while (i < content.length) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') { if (--depth === 0) return content.slice(start + marker.length - 1, i + 1); }
    i++;
  }
  return null;
}

// ─── 工具：提取 export const X 之前的 JSDoc 注释块 ───────────────────────
function extractJSDocBefore(content, varName) {
  const marker = `export const ${varName} = [`;
  const idx = content.indexOf(marker);
  if (idx === -1) return '';
  const before = content.slice(0, idx);
  const docEnd = before.lastIndexOf('*/');
  if (docEnd === -1) return '';
  const docStart = before.lastIndexOf('/**', docEnd);
  if (docStart === -1) return '';
  return before.slice(docStart, docEnd + 2).trimStart();
}

// ─── 注释映射（按 name:stateMutability 或 name:event）───────────────────
const COMMENTS = {
  // ── DQPROJECT ──
  'constructor:nonpayable': null,   // 无注释，使用 section header 即可
  'ClaimReward:event':        '// 事件：用户领取动态奖励（amount=到账金额，fee=手续费）',
  'Deposit:event':            '// 事件：用户入金（u=用户，a=金额）',
  'Register:event':           '// 事件：用户注册（u=用户，r=推荐人）',
  'ReinvestSOL:event':        '// 事件：用户复投（amount=复投金额，energyAdded=增加的能量值）',
  'SellDQ:event':             '// 事件：卖出 DQ（d=DQ数量，s=获得SOL，b=销毁量，f=手续费）',
  'SwapAndAddLP:event':       '// 事件：换 DQ 并加 LP（s=SOL，d=DQ，l=LP数量）',
  'WithdrawBNB:event':        '// 事件：owner 提取 BNB（to=收款地址，amount=金额）',
  'allUsers:view':            '// 所有注册用户数组（index → address）',
  'authorized:view':          '// 授权地址查询（true = 已被授权）',
  'BURN_STOP_THRESHOLD:view': '// 通缩停止阈值（达到后不再销毁 DQ）',
  'BUY_FEE:view':             '// 买入手续费接收/分配地址',
  'CLAIM_BNB_FEE:view':       '// 领取手续费收益时需支付的 BNB 数量',
  'currentPhase:view':        '// 当前阶段编号',
  'DAILY_LIMIT:view':         '// 基础日限额（每阶段可上调）',
  'dailyDeposit:view':        '// 用户今日已入金额（用于日限额统计）',
  'DAO:view':                 '// DAO 地址',
  'DAO_RATE:view':            '// DAO 补贴费率（千分比）',
  'depositWhiteList:view':    '// 入金白名单（true = 不受日限额限制）',
  'DIRECT_RATE:view':         '// 直推奖励费率（千分比）',
  'dqCard:view':              '// DQCard NFT 合约地址',
  'dqToken:view':             '// DQToken 代币合约地址',
  'ENERGY_MUL:view':          '// 能量倍数（入金 × ENERGY_MUL = 能量）',
  'FEE_FOUNDATION_RATE:view': '// 提现手续费中分配给基金会的比例',
  'FEE_NODE_RATE:view':       '// 提现手续费中分配给 NFT 节点的比例',
  'FEE_PARTNER_RATE:view':    '// 提现手续费中分配给合伙人的比例',
  'FOUNDATION:view':          '// 基金会地址',
  'getAllUsersLength:view':    '// 获取注册用户总数',
  'getDailyLimit:view':       '// 计算当前阶段的日限额（含 phase step，上限 200 ether）',
  'getPendingSOL:view':       '// 查询用户待提现动态奖励余额',
  'getTeamSize:view':         '// 获取用户的团队规模（直接/间接下级总数）',
  'getUser:view':             '// 获取用户基础信息：推荐人、直推数、节点等级、总入金',
  'getUserStake:view':        '// 获取用户质押数据：团队业绩、能量、待提现 SOL',
  'INITIAL_SUPPLY:view':      '// DQ 初始发行量',
  'INS:view':                 '// 保险地址',
  'INS_RATE:view':            '// 保险费率（千分比）',
  'INVEST_MIN:view':          '// 最小入金额（单位 wei）',
  'isBlacklisted:view':       '// 黑名单状态（true = 禁止操作）',
  'MGR_RATE:view':            '// 管理奖池分配费率（千分比）',
  'nftPendingSOL:view':       '// NFT 节点累计待分发的 SOL',
  'nodePrices:view':          '// 节点卡价格表（index: 0~3）',
  'OP:view':                  '// 运营地址',
  'OP_RATE:view':             '// 运营费率（千分比）',
  'OWNER:view':               '// 合约 owner 地址',
  'partnerPendingSOL:view':   '// 合伙人累计待分发的 SOL',
  'PHASE_STEP:view':          '// 每阶段日限额增加步长',
  'ROUTER:view':              '// PancakeSwap Router 地址',
  'SEE_RATE:view':            '// 见点奖励费率（千分比）',
  'SLIPPAGE:view':            '// 兑换滑点参数（千分比，如 10 = 1%）',
  'SOL:view':                 '// SOL 代币合约地址',
  'STAKE_OP:view':            '// 质押运营地址',
  'stakeContract:view':       '// 绑定的质押合约地址',
  'startTime:view':           '// 合约启动时间戳',
  'WITHDRAW_FEE:view':        '// 提现手续费费率（千分比）',
  'addToBlacklist:nonpayable':      '// 加入黑名单（owner）',
  'adminWithdrawDQ:nonpayable':     '// owner 提走合约内 DQ（谨慎使用）',
  'adminWithdrawSOL:nonpayable':    '// owner 提走合约内 SOL（谨慎使用）',
  'advancePhase:nonpayable':        '// 手动推进阶段（owner）',
  'approveRouter:nonpayable':       '// 授权 Router 进行 SOL/DQ 兑换操作（owner）',
  'buyNode:nonpayable':             '// 购买节点卡（_t=卡牌类型，用 SOL 支付）',
  'claimDTeam:nonpayable':          '// 领取 D 等级团队奖励',
  'claimFee:nonpayable':            '// 领取手续费分红',
  'claimLP:nonpayable':             '// 领取 LP 分红',
  'claimNft:nonpayable':            '// 领取 NFT 分红',
  'claimPartnerBNB:nonpayable':     '// 领取合伙人 BNB 奖励',
  'claimPartnerDQ:nonpayable':      '// 领取合伙人 DQ 奖励',
  'claimReward:nonpayable':         '// 用户提现动态奖励（扣 WITHDRAW_FEE；以 SOL 支付给用户）',
  'claimStakeReward:nonpayable':    '// 领取单币质押奖励（_periodIndex=质押周期索引）',
  'depositForUser:nonpayable':      '// 管理员代用户入金',
  'depositSOL:nonpayable':          '// 用户入金（转入 SOL；需已注册）',
  'distributeFeeToNFT:nonpayable':  '// 将手续费 SOL 分配到 NFT 分红池',
  'grantAuth:nonpayable':           '// 授权地址（owner；被授权地址可代理部分操作）',
  'importUser:nonpayable':          '// 导入单个用户推荐关系（owner）',
  'mineBlock:nonpayable':           '// 触发挖矿结算（owner）',
  'register:nonpayable':            '// 用户注册推荐人（需未注册；_r=推荐人地址）',
  'reinvest:nonpayable':            '// 复投：将待提现奖励重新入金（_a=复投金额）',
  'removeFromBlacklist:nonpayable': '// 移出黑名单（owner）',
  'revokeAuth:nonpayable':          '// 撤销授权（owner）',
  'sellDQForSOL:nonpayable':        '// 卖出 DQ 换 SOL（94% 销毁 + 6% 手续费；返回 solOut）',
  'setDepositWhiteList:nonpayable': '// 设置入金白名单（owner；白名单用户不受日限额限制）',
  'setDQCard:nonpayable':           '// 设置/更换 DQCard 合约地址（owner）',
  'setDQToken:nonpayable':          '// 设置/更换 DQToken 合约地址（owner）',
  'setFoundation:nonpayable':       '// 设置基金会地址（owner）',
  'setSlippage:nonpayable':         '// 设置兑换滑点（owner；千分比）',
  'setStakeContract:nonpayable':    '// 设置绑定的质押合约地址（owner）',
  'setUserDLevel:nonpayable':       '// 设置用户 D 等级（owner；_lvl=0~7）',
  'setUserLevel:nonpayable':        '// 设置用户节点等级（owner；_lvl=0~6）',
  'stakeDQ:nonpayable':             '// 质押 DQ（_amount=数量，_periodIndex=周期索引）',
  'unstakeDQ:nonpayable':           '// 解押 DQ（_periodIndex=对应质押周期）',
  'withdraw:nonpayable':            '// 用户提现（转发到质押合约）',
  'withdrawBNB:nonpayable':         '// owner 提走合约内 BNB（_to=收款地址，_amount=金额）',
  'withdrawLP:nonpayable':          '// 提走 LP（转发到质押合约）',
  'withdrawLPByM:nonpayable':       '// 管理员代提 LP',
  'withdrawSOL:nonpayable':         '// 用户提现 SOL（_amount=金额）',
  // receive / fallback
  'receive:payable':          '// ========== 兜底：接收 BNB ==========',

  // ── DQSTAKE ──
  // DQSTAKE events (may share names with DQPROJECT)
  'EnergyChanged:event':      '// 事件：用户能量变化（u=用户，e=新能量值）',
  'Stake:event':              '// 事件：质押 DQ（u=用户，a=数量，i=周期索引）',
  'TeamInvestChanged:event':  '// 事件：团队业绩变化（u=用户，v=新业绩值）',
  'Unstake:event':            '// 事件：解押 DQ（u=用户，a=数量，i=周期索引）',
  // DQSTAKE view
  'BD:view':                  '// 基础日收益率分子（BD/MB = 日收益率）',
  'CLAIM_GAS_FEE:view':       '// 领取手续费收益时需支付的 BNB 数量',
  'DQ_CARD:view':             '// DQCard NFT 合约地址',
  'DQ_TOKEN:view':            '// DQToken 代币合约地址',
  'D_LEVEL_RATE:view':        '// D 等级奖励分配比例（千分比）',
  'F180:view':                '// 180 天锁定期系数（质押收益加成）',
  'F60:view':                 '// 60 天锁定期系数（质押收益加成）',
  'FOUNDATION_RATE:view':     '// 手续费分配给基金会的比例（千分比）',
  'IB:view':                  '// 初始区块奖励参数',
  'LP_RATE:view':             '// LP 分红费率（千分比）',
  'MB:view':                  '// 基础日收益率分母（BD/MB = 日收益率）',
  'NFT_RATE:view':            '// NFT 节点分红费率（千分比）',
  'PARTNER:view':             '// 合伙人分配合约/地址',
  'RT:view':                  '// 滚动周期时长（秒）',
  'SP:view':                  '// 合伙人费率相关参数',
  'br:view':                  '// 区块奖励参数',
  'claimGasFee:view':         '// 领取时支付 BNB gas 费（payable；需支付 CLAIM_GAS_FEE）',
  'dLevelAccReward:view':     '// D 等级全局累计奖励（index=dLevel）',
  'dLevelCount:view':         '// 当前各 D 等级人数（index=dLevel）',
  'dLevelRewardDebt:view':    '// 用户 D 等级奖励债（用于差额计算）',
  'dc:view':                  '// 用户直推人数',
  'dd:view':                  '// 用户直推业绩',
  'dl:view':                  '// 用户 D 等级（0~7）',
  'dq:view':                  '// 用户当前 DQ 质押数量',
  'energyMul:view':           '// 当前能量倍数（可由 owner 调整）',
  'fA:view':                  '// 手续费累计分配额（用于分红结算）',
  'feeRecipient:view':        '// 手续费接收地址',
  'fp:view':                  '// 手续费分配参数',
  'getChild:view':            '// 查询用户指定索引的直接下级地址',
  'getChildCount:view':       '// 查询用户直接下级数量',
  'getDLevel:view':           '// 查询用户 D 等级（0~7）',
  'getDLevelReward:view':     '// 查询用户待领取 D 等级奖励',
  'getEnergy:view':           '// 查询用户当前能量值',
  'getStk:view':              '// 查询用户质押信息（按 periodIndex）',
  'getTeamInvest:view':       '// 查询用户团队业绩',
  'getValidAddressCount:view':'// 查询用户有效直推地址数量',
  'isB:view':                 '// 是否在黑名单',
  'isDLevel:view':            '// 是否达到 D 等级（bool）',
  'lA:view':                  '// LP 全局累计奖励（用于 LP 分红结算）',
  'lF:view':                  '// LP 分红快照（用于计算待领取）',
  'lpD:view':                 '// 用户 LP 分红债（已领取快照）',
  'lpPair:view':              '// LP 代币合约地址（SOL-DQ 交易对）',
  'lpS:view':                 '// 用户 LP 份额',
  'lpT:view':                 '// LP 全局总份额',
  'lt:view':                  '// LP 时间戳参数',
  'mc:view':                  '// 主合约地址（DQProject）',
  'mgrRates:view':            '// 管理奖励费率阶梯（index: 0~5）',
  'mgrThresh:view':           '// 管理奖励业绩阈值（index: 0~5）',
  'miningContract:view':      '// 主合约地址（DQProject）',
  'nA:view':                  '// NFT 全局累计奖励（用于 NFT 分红结算）',
  'nD0:view':                 '// D0 等级全局快照参数',
  'nD1:view':                 '// D1 等级全局快照参数',
  'nD2:view':                 '// D2+ 等级全局快照参数',
  'nodeReq:view':             '// 节点达标直推要求（index: 0~3）',
  'pBA:view':                 '// 合伙人 BNB 全局累计奖励',
  'pBD:view':                 '// 用户合伙人 BNB 分红债',
  'pDA:view':                 '// 合伙人 DQ 全局累计奖励',
  'pDD:view':                 '// 用户合伙人 DQ 分红债',
  'releasedSupply:view':      '// 已释放的 DQ 数量（挖矿释放）',
  'sA:view':                  '// 单币质押全局累计奖励（用于质押收益结算）',
  'sAmt:view':                '// 用户各周期质押数量（index=periodIndex）',
  'sDebt:view':               '// 用户各周期质押奖励债（index=periodIndex）',
  'tLP:view':                 '// 全局 LP 总份额快照参数',
  'tS:view':                  '// 全局单币质押总量',
  'userDLevel:view':          '// 用户 D 等级映射',
  'userDirectSales:view':     '// 用户直推业绩映射',
  'userEnergy:view':          '// 用户能量映射',
  'userLevel:view':           '// 用户节点等级映射',
  'userPendingSOL:view':      '// 用户待提现 SOL 映射',
  'userReferrer:view':        '// 用户推荐人映射',
  'userTeamInvest:view':      '// 用户团队业绩映射',
  'userTotalInvest:view':     '// 用户总入金映射',
  'userValidAddressCount:view':'// 用户有效直推地址数映射',
  // DQSTAKE write
  'addChild:nonpayable':          '// 添加用户下级关系（仅主合约调用）',
  'addDirectSales:nonpayable':    '// 增加用户直推业绩（仅主合约调用）',
  'addEnergy:nonpayable':         '// 增加用户能量（仅主合约调用；_u=用户，_a=增量）',
  'addLP:nonpayable':             '// 增加用户 LP 份额（仅主合约调用）',
  'addPendingSOL:nonpayable':     '// 增加用户待提现 SOL（仅主合约调用）',
  'addTeamInvest:nonpayable':     '// 增加用户团队业绩（仅主合约调用）',
  'claimDLevelReward:nonpayable': '// 领取 D 等级奖励',
  'claimLPReward:nonpayable':     '// 领取 LP 分红（_u=用户）',
  'claimNFTReward:nonpayable':    '// 领取 NFT 分红（_u=用户）',
  'claimPartnerReward:nonpayable':'// 领取合伙人奖励（_u=用户）',
  'initialize:nonpayable':        '// 初始化合约参数（owner）',
  'mineBlockStake:nonpayable':    '// 触发质押合约挖矿结算（owner）',
  'setDLevel:nonpayable':         '// 设置用户 D 等级（owner；_lvl=0~7）',
  'setEnergyMul:nonpayable':      '// 设置能量倍数（owner）',
  'setMiningContract:nonpayable': '// 设置主合约地址（owner）',
  'setValidAddress:nonpayable':   '// 设置用户有效直推数（owner）',
  'stake:nonpayable':             '// 用户质押 DQ（_a=数量，_p=周期索引）',
  'subEnergy:nonpayable':         '// 减少用户能量（仅主合约调用）',
  'subPendingSOL:nonpayable':     '// 减少用户待提现 SOL（仅主合约调用）',
  'unstake:nonpayable':           '// 用户解押 DQ（_p=周期索引）',
  'withdrawBNB:nonpayable_stake': '// owner 提走合约内 BNB',
  'withdrawDQ:nonpayable':        '// owner 提走合约内 DQ（谨慎使用）',
  'withdrawSOL:nonpayable_stake': '// owner 提走合约内 SOL（谨慎使用）',
};

// ─── 格式化单条 ABI 入口 ────────────────────────────────────────────────────
function formatEntry(entry) {
  return JSON.stringify(entry);
}

// ─── 获取注释 ───────────────────────────────────────────────────────────────
function getComment(entry, abiName) {
  const name = entry.name ?? '';
  const type = entry.type;
  const mut = entry.stateMutability ?? '';

  if (type === 'constructor') return null; // 无注释
  if (type === 'receive') return '// ========== 兜底：接收 BNB ==========';

  let key;
  if (type === 'event') key = `${name}:event`;
  else if (mut === 'view' || mut === 'pure') key = `${name}:view`;
  else key = `${name}:nonpayable`;

  // DQSTAKE 中 withdrawBNB / withdrawSOL 与 DQPROJECT 同名但行为不同
  if (abiName === 'DQSTAKE_ABI' && name === 'withdrawBNB') key = 'withdrawBNB:nonpayable_stake';
  if (abiName === 'DQSTAKE_ABI' && name === 'withdrawSOL') key = 'withdrawSOL:nonpayable_stake';

  return COMMENTS[key] ?? null;
}

// ─── 判断是否是 view/pure ───────────────────────────────────────────────────
function isViewOrPure(entry) {
  return entry.stateMutability === 'view' || entry.stateMutability === 'pure';
}

// ─── 格式化整个 ABI 数组 ─────────────────────────────────────────────────────
function formatABI(entries, abiName) {
  // 按逻辑顺序重排：constructor → event → view/pure → nonpayable/payable → receive
  const order = (e) => {
    if (e.type === 'constructor') return 0;
    if (e.type === 'event') return 1;
    if (e.type === 'function' && isViewOrPure(e)) return 2;
    if (e.type === 'function') return 3;
    if (e.type === 'receive' || e.type === 'fallback') return 4;
    return 5;
  };
  const sorted = [...entries].sort((a, b) => order(a) - order(b));

  const lines = [];
  let inConstructor = false;
  let inEvents = false;
  let inView = false;
  let inWrite = false;

  for (const entry of sorted) {
    const { type, stateMutability: mut } = entry;

    // 章节分隔注释
    if (type === 'constructor' && !inConstructor) {
      lines.push('  // ========== 部署 ==========');
      inConstructor = true;
    } else if (type === 'event' && !inEvents) {
      lines.push('');
      lines.push('  // ========== 事件 ==========');
      inEvents = true;
    } else if (type === 'function' && isViewOrPure(entry) && !inView) {
      lines.push('');
      lines.push('  // ========== 读取（view）==========');
      inView = true;
    } else if (type === 'function' && !isViewOrPure(entry) && !inWrite) {
      lines.push('');
      lines.push('  // ========== 写操作（nonpayable / payable）==========');
      inWrite = true;
    } else if (type === 'receive') {
      lines.push('');
    }

    // 条目注释
    const comment = getComment(entry, abiName);
    if (comment && type !== 'receive') {
      lines.push(`  ${comment}`);
    }

    // 条目本身
    lines.push(`  ${formatEntry(entry)},`);
  }

  // 移除最后一个逗号
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.replace(/,$/, '');
  }

  return lines.join('\n');
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────
const content = readFileSync(filePath, 'utf8');

// 提取文件头（到 DQPROJECT_ABI 之前）
const dqProjectMarker = 'export const DQPROJECT_ABI = [';
const dqProjectStart = content.indexOf(dqProjectMarker);
const fileHeader = content.slice(0, dqProjectStart);

// 提取 DQCARD_ABI 之前的注释 + DQCARD_ABI 的全部内容
const dqcardMarker = '/**\n * DQCard NFT';
const dqcardStart = content.indexOf(dqcardMarker);
const dqcardSection = dqcardStart !== -1 ? content.slice(dqcardStart) : '';

// 提取 DQSTAKE_ABI 的 JSDoc
const dqstakeDoc = extractJSDocBefore(content, 'DQSTAKE_ABI');

// 解析 DQPROJECT_ABI
const dqProjectJson = extractABIJson(content, 'DQPROJECT_ABI');
const dqProjectDoc = extractJSDocBefore(content, 'DQPROJECT_ABI');
const dqProjectEntries = JSON.parse(dqProjectJson);

// 解析 DQSTAKE_ABI
const dqStakeJson = extractABIJson(content, 'DQSTAKE_ABI');
const dqStakeEntries = JSON.parse(dqStakeJson);

// 组装输出
const output = [
  fileHeader,
  dqProjectDoc,
  `export const DQPROJECT_ABI = [\n${formatABI(dqProjectEntries, 'DQPROJECT_ABI')}\n];\n`,
  '\n',
  dqstakeDoc,
  `export const DQSTAKE_ABI = [\n${formatABI(dqStakeEntries, 'DQSTAKE_ABI')}\n];\n`,
  '\n',
  dqcardSection,
].join('');

writeFileSync(filePath, output, 'utf8');

const newContent = readFileSync(filePath, 'utf8');
const lineCount = newContent.split('\n').length;
console.log(`✅ 格式化完成，共 ${lineCount} 行`);
console.log(`   DQPROJECT_ABI: ${dqProjectEntries.length} 条`);
console.log(`   DQSTAKE_ABI:   ${dqStakeEntries.length} 条`);
