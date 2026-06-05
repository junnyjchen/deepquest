/**
 * DQ 旧合约数据导出脚本
 * 
 * 使用方法（在本地电脑运行）：
 * 1. 安装 Node.js (>= 18)
 * 2. npm install ethers
 * 3. node export-data.js
 * 
 * 输出文件在 ./export/ 目录下
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ============ 配置 ============
const BSC_RPC = "https://bsc-dataseed.binance.org/";  // ← 改成你的RPC节点
const FROM_BLOCK = 101250438;  // 合约部署起始区块高度

// ============ 旧合约地址 ============
const DQMCORE    = "0x85f20cD995e36C19419AfB71559a7234a153EF2f";
const STAKECORE  = "0xF8045E6521d38670b139799c99bc5744FB6C7411";
const VAULT      = "0x101d8D4c2f199787e7EA74ADE3d73ED4025ac8e5";
const DQT        = "0xc5ea8123C7595536b3F8C55A4B4AA717c9CfcbB7";
const ADMIN      = "0x4091Cd5f945A52543ce80c2dA94fAc91C367D6ca";
const MINE       = "0x377CdAf2dACF3a233af8a2F52c98fcB1eFC135eC";
const DQPAIR     = "0x540a8eee2be3d8bca4d59af43f15b6f1fc0c979c";

// ============ ABI（根据链上实际ABI） ============

const DQMCORE_ABI = [
    // view 函数
    "function userReferrer(address) view returns (address)",
    "function userEnergy(address) view returns (uint256)",
    "function userEnergyUsed(address) view returns (uint256)",
    "function currentPhase() view returns (uint256)",
    "function currentDepositLimit() view returns (uint256)",
    "function depositWhiteList(address) view returns (bool)",
    "function isBlacklisted(address) view returns (bool)",
    "function getUserTotalInvest(address) view returns (uint256)",
    "function getAvailableEnergy(address) view returns (uint256)",
    "function getEnergyInfo(address) view returns (uint256, uint256, uint256)",
    "function getUser(address) view returns (address referrer, uint256 totalInvest, uint8 level, uint256 energy, uint256 energyUsed)",
    "function getAllUsersCount() view returns (uint256)",
    "function allUsers(uint256) view returns (address)",
    "function getAllUsers(uint256, uint256) view returns (address[])",
    "function dailyDeposit(address) view returns (uint256)",
    "function totalInvested() view returns (uint256)",
    "function totalLPAdded() view returns (uint256)",
    "function totalEnergy() view returns (uint256)",
    "function OWNER() view returns (address)",
    "function adminContract() view returns (address)",
    "function stakeContract() view returns (address)",
    "function dqToken() view returns (address)",
    "function dqCard() view returns (address)",
    "function pool() view returns (address)",
    "function SOL() view returns (address)",
    "function ROUTER() view returns (address)",
    "function WBNB() view returns (address)",
    // events
    "event Register(address indexed user, address indexed referrer)",
    "event Deposit(address indexed user, uint256 amount, uint256 lpAmount, uint256 energy)",
];

const STAKECORE_ABI = [
    // view 函数 - 使用链上实际函数名
    "function lpS(address) view returns (uint256)",
    "function lpD(address) view returns (uint256)",
    "function userLP(address) view returns (uint256)",
    "function lpEquity(address) view returns (uint256)",
    "function lpEquityDebt(address) view returns (uint256)",
    "function lpStakeTime(address) view returns (uint256)",
    "function directCount(address) view returns (uint256)",
    "function userDirectSales(address) view returns (uint256)",
    "function userNodeLevel(address) view returns (uint8)",
    "function userLevel(address) view returns (uint8)",
    "function userReferrer(address) view returns (address)",
    "function teamSales(address) view returns (uint256)",
    "function userDLevel(address) view returns (uint8)",
    "function userBlockDQ(address) view returns (uint256)",
    "function userPendingSOL(address) view returns (uint256)",
    "function getLPEquity(address) view returns (uint256)",
    "function getLPEquityInfo(address) view returns (uint256 stakedLP, uint256 equityLP, uint256 totalEquity, uint256 walletLP)",
    "function getLPEquityPending(address) view returns (uint256)",
    "function calculateLevel(address) view returns (uint8)",
    "function getChildCount(address) view returns (uint256)",
    "function tLP() view returns (uint256)",
    "function lA() view returns (uint256)",
    "function totalLPEquity() view returns (uint256)",
    "function sAmt(address, uint8) view returns (uint256)",
    "function sDebt(address, uint8) view returns (uint256)",
    "function tS(uint256) view returns (uint256)",
    "function sA(uint256) view returns (uint256)",
    "function stakeDurations(uint256) view returns (uint256)",
    "function stakeWeights(uint256) view returns (uint256)",
    "function dLevelRewardDebt(address) view returns (uint256)",
    "function isDLevel(uint8, address) view returns (bool)",
    "function dLevelCount(uint256) view returns (uint256)",
    "function coreContract() view returns (address)",
    "function miningContract() view returns (address)",
    "function adminContract() view returns (address)",
    "function lpPair() view returns (address)",
    "function lpRouter() view returns (address)",
    "function feeReceiver() view returns (address)",
    "function dLevelPool() view returns (address)",
    // events
    "event ReferrerSet(address indexed user, address indexed referrer)",
    "event LPEquityAuthorized(address indexed user, uint256 amount)",
    "event LPEquityCancelled(address indexed user, uint256 amount)",
    "event LPMigrated(address indexed user, uint256 lpAmount, uint256 energy)",
    "event LPStaked(address indexed user, uint256 amount)",
    "event LPUnstaked(address indexed user, uint256 amount)",
    "event LPRecorded(address indexed user, uint256 amount)",
];

const VAULT_ABI = [
    "function sAmt(address, uint8) view returns (uint256)",
    "function stakeTime(address, uint8) view returns (uint256)",
    "function sDebt(address, uint8) view returns (uint256)",
    "function getStakeInfo(address) view returns (uint256[4] amounts, uint256[4] times, uint256[4] pendingRewards)",
    "function getStakeRecordCount(address, uint8) view returns (uint256)",
    "function getStakeRecords(address, uint8) view returns (tuple(uint256 amount, uint256 startTime, uint256 debt, bool active)[])",
    "event Staked(address indexed user, uint8 level, uint256 amount)",
    "event Unstaked(address indexed user, uint8 level, uint256 amount)",
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// ============ 主逻辑 ============
async function main() {
    if (!BSC_RPC) {
        console.error("请先设置 BSC_RPC 变量！");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    
    // 测试连接
    try {
        const network = await provider.getNetwork();
        console.log(`✅ 已连接 BSC, chainId: ${network.chainId}`);
    } catch (e) {
        console.error(`❌ 连接 BSC 失败: ${e.message}`);
        process.exit(1);
    }

    const core = new ethers.Contract(DQMCORE, DQMCORE_ABI, provider);
    const stake = new ethers.Contract(STAKECORE, STAKECORE_ABI, provider);
    const vault = new ethers.Contract(VAULT, VAULT_ABI, provider);
    const dqt = new ethers.Contract(DQT, ERC20_ABI, provider);

    const outputDir = path.join(__dirname, "export");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // // ===== Step 1: 收集用户地址 =====
    // console.log("\n===== Step 1: 获取所有用户地址 =====");
    
    // // 优先用 getAllUsers（DQMCore 链上有这个函数）
    // let userArray = [];
    // try {
    //     const totalUsers = await core.getAllUsersCount();
    //     console.log(`  getAllUsersCount: ${totalUsers}`);
    //     if (totalUsers > 0n) {
    //         const BATCH_SIZE = 100;
    //         for (let i = 0; i < Number(totalUsers); i += BATCH_SIZE) {
    //             const end = Math.min(i + BATCH_SIZE, Number(totalUsers));
    //             const users = await core.getAllUsers(i, end);
    //             for (const u of users) {
    //                 if (u !== ethers.ZeroAddress) userArray.push(u.toLowerCase());
    //             }
    //             console.log(`  进度: ${end}/${totalUsers} 个用户`);
    //         }
    //         console.log(`  从 getAllUsers 获取: ${userArray.length} 个地址`);
    //     }
    // } catch (e) {
    //     console.log(`  getAllUsers 不可用: ${e.message}`);
    // }

    // // 如果 getAllUsers 为空，从事件日志获取
    // if (userArray.length === 0) {
    //     console.log("  getAllUsers 为空，改用事件日志扫描...");
    //     const userSet = await collectUserAddressesFromEvents(provider, core, stake, vault);
    //     userArray = [...userSet];
    // }

    // // 去重
    // userArray = [...new Set(userArray)];
    // console.log(`共找到 ${userArray.length} 个唯一用户地址`);
    // fs.writeFileSync(path.join(outputDir, "user_addresses.txt"), userArray.join("\n"));

    // if (userArray.length === 0) {
    //     console.log("❌ 没有找到任何用户地址，请检查合约地址和区块高度配置！");
    //     process.exit(1);
    // }

    // // ===== Step 2: 读取 DQMCore 用户数据 =====
    // console.log("\n===== Step 2: 读取 DQMCore 用户数据 =====");
    // const coreData = [];
    // for (let i = 0; i < userArray.length; i++) {
    //     const addr = userArray[i];
    //     try {
    //         const [userInfo, wl] = await Promise.all([
    //             core.getUser(addr).catch(() => [ethers.ZeroAddress, 0n, 0, 0n, 0n]),
    //             core.depositWhiteList(addr).catch(() => false),
    //         ]);
    //         const [ref, invest, level, energy, energyUsed] = userInfo;
    //         coreData.push({
    //             address: addr,
    //             referrer: ref === ethers.ZeroAddress ? "" : ref.toLowerCase(),
    //             userLevel: Number(level),
    //             totalInvest: invest.toString(),
    //             energy: energy.toString(),
    //             energyUsed: energyUsed.toString(),
    //             depositWhitelist: wl,
    //         });
    //     } catch (e) {
    //         console.log(`  读取 ${addr} 失败: ${e.message}`);
    //         coreData.push({ address: addr, referrer: "", userLevel: 0, totalInvest: "0", energy: "0", energyUsed: "0", depositWhitelist: false });
    //     }
    //     if ((i + 1) % 20 === 0 || i + 1 === userArray.length) {
    //         console.log(`  进度: ${i + 1}/${userArray.length}`);
    //     }
    // }
    // saveJSON(path.join(outputDir, "core_data.json"), coreData);
    // saveCSV(path.join(outputDir, "core_data.csv"),
    //     ["address", "referrer", "userLevel", "totalInvest", "energy", "energyUsed", "depositWhitelist"],
    //     coreData.map(d => [d.address, d.referrer, d.userLevel, d.totalInvest, d.energy, d.energyUsed, d.depositWhitelist ? 1 : 0]));

    // // ===== Step 3: 读取 StakeCore 用户数据 =====
    // console.log("\n===== Step 3: 读取 StakeCore 用户数据 =====");
    // const stakeData = [];
    // for (let i = 0; i < userArray.length; i++) {
    //     const addr = userArray[i];
    //     try {
    //         const [lpSVal, userLpAmt, equity, time, count, sales, nodeLevel, teamS, lpEquityInfo] = await Promise.all([
    //             stake.lpS(addr).catch(() => 0n),
    //             stake.userLP(addr).catch(() => 0n),
    //             stake.lpEquity(addr).catch(() => 0n),
    //             stake.lpStakeTime(addr).catch(() => 0n),
    //             stake.directCount(addr).catch(() => 0n),
    //             stake.userDirectSales(addr).catch(() => 0n),
    //             stake.userNodeLevel(addr).catch(() => 0n),
    //             stake.teamSales(addr).catch(() => 0n),
    //             stake.getLPEquityInfo(addr).catch(() => [0n, 0n, 0n, 0n]),
    //         ]);
    //         stakeData.push({
    //             address: addr,
    //             lpS: lpSVal.toString(),
    //             userLP: userLpAmt.toString(),
    //             lpEquity: equity.toString(),
    //             lpStakeTime: time.toString(),
    //             directCount: count.toString(),
    //             userDirectSales: sales.toString(),
    //             userNodeLevel: Number(nodeLevel),
    //             teamSales: teamS.toString(),
    //         });
    //     } catch (e) {
    //         console.log(`  读取 ${addr} 失败: ${e.message}`);
    //         stakeData.push({ address: addr, lpS: "0", userLP: "0", lpEquity: "0", lpStakeTime: "0", directCount: "0", userDirectSales: "0", userNodeLevel: 0, teamSales: "0" });
    //     }
    //     if ((i + 1) % 20 === 0 || i + 1 === userArray.length) {
    //         console.log(`  进度: ${i + 1}/${userArray.length}`);
    //     }
    // }
    // saveJSON(path.join(outputDir, "stake_data.json"), stakeData);
    // saveCSV(path.join(outputDir, "stake_data.csv"),
    //     ["address", "lpS", "userLP", "lpEquity", "lpStakeTime", "directCount", "userDirectSales", "userNodeLevel", "teamSales"],
    //     stakeData.map(d => [d.address, d.lpS, d.userLP, d.lpEquity, d.lpStakeTime, d.directCount, d.userDirectSales, d.userNodeLevel, d.teamSales]));

    // ===== Step 4: 读取 Vault 质押记录 =====
    console.log("\n===== Step 4: 读取 Vault 质押记录 =====");
    const vaultData = [];
     const currentBlock = await provider.getBlockNumber();
    const fromBlock = FROM_BLOCK;  // 从合约部署区块开始

    console.log(`  扫描事件日志: block ${fromBlock} ~ ${currentBlock}`);

    const BATCH = 5000;
    let lastLog = 0;
    for (let start = fromBlock; start <= currentBlock; start += BATCH) {
        const end = Math.min(start + BATCH - 1, currentBlock);
        
        try {
            const [StakedLogs] = await Promise.all([
                vault.queryFilter("Staked", start, end).catch(() => []),
            ]);
            for (const log of StakedLogs) {
                const { user, level, amount } = log.args;
                vaultData.push({
                    address: user.toLowerCase(),
                    level: Number(level),
                    amount: amount.toString(),
                    startTime: log.blockNumber,  // 这里用区块号代替时间戳，后续可以再查询一次获取实际时间
                    pendingReward: "0",  // 这个需要额外调用合约函数计算，暂时留空
                });
            }
            if (vaultData.length > lastLog + 50 || end >= currentBlock) {
                console.log(`  block ${end}: 已收集 ${vaultData.length} 条质押记录`);
                lastLog = vaultData.length;
            }
        } catch (e) {
            // ignore
        }
        // if ((start - fromBlock) / BATCH % 50 === 0 || start + BATCH > currentBlock) {
            console.log(`  进度: ${start}/${end}-${start-FROM_BLOCK} (质押记录: ${vaultData.length}条)`);
        // }
    }
    saveJSON(path.join(outputDir, "vault_stake_data.json"), vaultData);
    saveCSV(path.join(outputDir, "vault_stake_data.csv"),
        ["address", "level", "amount", "startTime", "pendingReward"],
        vaultData.map(d => [d.address, d.level, d.amount, d.startTime, d.pendingReward]));
    return;
    // ===== Step 5: 读取全局配置 =====
    // console.log("\n===== Step 5: 读取全局配置 =====");
    // try {
    //     const [vaultDQ, stakeTotalLP, stakeTotalEquity, coreTotalInvested, coreTotalLPAdded] = await Promise.all([
    //         dqt.balanceOf(VAULT).catch(() => 0n),
    //         stake.tLP().catch(() => 0n),
    //         stake.totalLPEquity().catch(() => 0n),
    //         core.totalInvested().catch(() => 0n),
    //         core.totalLPAdded().catch(() => 0n),
    //     ]);
    //     const config = {
    //         vaultDQBalance: ethers.formatEther(vaultDQ) + " DQ",
    //         stakeTotalLP: stakeTotalLP.toString(),
    //         stakeTotalLPEquity: stakeTotalEquity.toString(),
    //         coreTotalInvested: ethers.formatEther(coreTotalInvested) + " SOL",
    //         coreTotalLPAdded: coreTotalLPAdded.toString(),
    //     };
    //     fs.writeFileSync(path.join(outputDir, "global_config.json"), JSON.stringify(config, null, 2));
    //     console.log("全局配置:", JSON.stringify(config, null, 2));
    // } catch (e) {
    //     console.log(`  读取全局配置失败: ${e.message}`);
    // }

    // ===== 完成 =====
    console.log("\n===== 导出完成 =====");
    console.log(`文件保存在: ${outputDir}/`);
    console.log("  user_addresses.txt    - 用户地址列表");
    console.log("  core_data.json/csv    - DQMCore用户数据");
    console.log("  stake_data.json/csv   - StakeCore用户数据");
    console.log("  vault_stake_data.json/csv - Vault质押记录");
    console.log("  global_config.json    - 全局配置");

    // ===== 生成批量导入文件 =====
    console.log("\n===== 生成批量导入文件 =====");
    generateImportFiles(outputDir, coreData, stakeData, vaultData);
}

// 从事件日志收集用户地址（备选方案）
async function collectUserAddressesFromEvents(provider, core, stake, vault) {
    const users = new Set();
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = FROM_BLOCK;  // 从合约部署区块开始

    console.log(`  扫描事件日志: block ${fromBlock} ~ ${currentBlock}`);

    const BATCH = 5000;
    let lastLog = 0;
    for (let start = fromBlock; start <= currentBlock; start += BATCH) {
        const end = Math.min(start + BATCH - 1, currentBlock);
        
        try {
            const [registerLogs] = await Promise.all([
        //  const [registerLogs, depositLogs, stakedLogs, lpAuthLogs, lpStakedLogs] = await Promise.all([
                core.queryFilter("Register", start, end).catch(() => []),
                // core.queryFilter("Deposit", start, end).catch(() => []),
                // vault.queryFilter("Staked", start, end).catch(() => []),
                // stake.queryFilter("LPEquityAuthorized", start, end).catch(() => []),
                // stake.queryFilter("LPStaked", start, end).catch(() => []),
            ]);

            for (const log of registerLogs) {
                if (log.args?.user) users.add(log.args.user.toLowerCase());
            }
            // for (const log of depositLogs) {
            //     if (log.args?.user) users.add(log.args.user.toLowerCase());
            // }
            // for (const log of stakedLogs) {
            //     if (log.args?.user) users.add(log.args.user.toLowerCase());
            // }
            // for (const log of lpAuthLogs) {
            //     if (log.args?.user) users.add(log.args.user.toLowerCase());
            // }
            // for (const log of lpStakedLogs) {
            //     if (log.args?.user) users.add(log.args.user.toLowerCase());
            // }

            if (users.size > lastLog + 50 || end >= currentBlock) {
                console.log(`  block ${end}: 已收集 ${users.size} 个地址`);
                lastLog = users.size;
            }
        } catch (e) {
            console.log(`  block ${start}-${end} 查询失败，跳过`);
        }

        // 避免rate limit
        await new Promise(r => setTimeout(r, 200));
    }

    return users;
}

// 生成批量导入文件（Remix可直接使用的格式）
function generateImportFiles(outputDir, coreData, stakeData, vaultData) {
    const importDir = path.join(outputDir, "import");
    if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });

    // 1. 推荐关系 importUsers（DQMCore的批量导入）
    const referrerUsers = coreData.filter(d => d.referrer && d.referrer !== "");
    generateBatchFile(importDir, "batchReferrers", referrerUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const refs = batch.map(d => d.referrer);
        return {
            func: "importUsers",
            contract: "DQMCore",
            params: { _users: addrs, _referrers: refs },
        };
    });

    // 2. 能量 adminSetEnergy（DQMCore - 逐个调用）
    const energyUsers = coreData.filter(d => d.energy !== "0");
    generateBatchFile(importDir, "batchEnergy", energyUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.energy);
        return {
            func: "adminSetEnergy",
            contract: "DQMCore",
            note: "单个用户操作，需逐个调用: adminSetEnergy(user, amount)",
            params: { addresses: addrs, amounts: amounts },
        };
    });

    // 3. 入金白名单 batchSetDepositWhiteList（DQMCore）
    const wlUsers = coreData.filter(d => d.depositWhitelist);
    generateBatchFile(importDir, "batchWhitelist", wlUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        return {
            func: "batchSetDepositWhiteList",
            contract: "DQMCore",
            params: { _users: addrs, _status: true },
        };
    });

    // 4. 直推金额 batchSetDirectSales（DQMAdmin）
    const salesUsers = stakeData.filter(d => d.userDirectSales !== "0");
    generateBatchFile(importDir, "batchDirectSales", salesUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.userDirectSales);
        return {
            func: "batchSetDirectSales",
            contract: "DQMAdmin",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 5. 直推人数 batchSetDirectCount（DQMAdmin）
    const countUsers = stakeData.filter(d => d.directCount !== "0");
    generateBatchFile(importDir, "batchDirectCount", countUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const counts = batch.map(d => d.directCount);
        return {
            func: "batchSetDirectCount",
            contract: "DQMAdmin",
            params: { _users: addrs, _counts: counts },
        };
    });

    // 6. LP batchRecordLP（DQMAdmin）
    const lpUsers = stakeData.filter(d => d.userLP !== "0" || d.lpS !== "0");
    generateBatchFile(importDir, "batchLP", lpUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        // 优先用 userLP，如果为0则用 lpS
        const amounts = batch.map(d => d.userLP !== "0" ? d.userLP : d.lpS);
        return {
            func: "batchRecordLP",
            contract: "DQMAdmin",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 7. LP质押时间 batchSetLPStakeTime（DQMAdmin）
    const timeUsers = stakeData.filter(d => d.lpStakeTime !== "0");
    generateBatchFile(importDir, "batchLPStakeTime", timeUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const times = batch.map(d => d.lpStakeTime);
        return {
            func: "batchSetLPStakeTime",
            contract: "DQMAdmin",
            params: { _users: addrs, _times: times },
        };
    });

    // 8. 团队业绩 batchSetTeamSales（DQMAdmin）
    const teamSalesUsers = stakeData.filter(d => d.teamSales !== "0");
    generateBatchFile(importDir, "batchTeamSales", teamSalesUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.teamSales);
        return {
            func: "batchSetTeamSales",
            contract: "DQMAdmin",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 9. DQ质押记录 batchImportStake（DQMAdmin/Vault）
    generateBatchFile(importDir, "batchStake", vaultData, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const levels = batch.map(d => d.level);
        const amounts = batch.map(d => d.amount);
        const times = batch.map(d => d.startTime);
        return {
            func: "batchImportStake",
            contract: "DQMAdmin",
            params: { _users: addrs, _levels: levels, _amounts: amounts, _startTimes: times },
        };
    });

    console.log(`\n导入文件已生成在: ${importDir}/`);
    console.log("每个文件包含可直接复制到Remix的参数");
}

function generateBatchFile(dir, name, data, batchSize, formatter) {
    if (data.length === 0) {
        console.log(`  ${name}: 无数据，跳过`);
        return;
    }

    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }

    let content = `${name}: 共${data.length}条, 分${batches.length}批\n\n`;
    
    batches.forEach((batch, idx) => {
        const formatted = formatter(batch);
        content += `=== 第${idx + 1}批 (${batch.length}条) ===\n`;
        content += `合约: ${formatted.contract || "N/A"}\n`;
        content += `函数: ${formatted.func}\n`;
        if (formatted.note) content += `备注: ${formatted.note}\n`;
        for (const [key, val] of Object.entries(formatted.params)) {
            if (Array.isArray(val)) {
                content += `${key}: [${val.join(",")}]\n`;
            } else {
                content += `${key}: ${val}\n`;
            }
        }
        content += "\n";
    });

    fs.writeFileSync(path.join(dir, `${name}.txt`), content);
    console.log(`  ${name}: ${data.length}条, ${batches.length}批`);
}

// 工具函数
function saveJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`  已保存 ${data.length} 条到 ${path.basename(filepath)}`);
}

function saveCSV(filepath, headers, rows) {
    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(row.join(","));
    }
    fs.writeFileSync(filepath, lines.join("\n"));
    console.log(`  已保存 ${rows.length} 条到 ${path.basename(filepath)}`);
}

main().catch(console.error);
