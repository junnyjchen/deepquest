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
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
// BSC 主网配置
const BSC_CHAIN_ID = 56;

// ============ 旧合约地址 ============
const DQMCORE = "0x85f20cD995e36C19419AfB71559a7234a153EF2f";
const STAKECORE = "0xF8045E6521d38670b139799c99bc5744FB6C7411";
const VAULT = "0x101d8D4c2f199787e7EA74ADE3d73ED4025ac8e5";
const DQT = "0xc5ea8123C7595536b3F8C55A4B4AA717c9CfcbB7";
const ADMIN = "0x4091Cd5f945A52543ce80c2dA94fAc91C367D6ca";
const MINE = "0x377CdAf2dACF3a233af8a2F52c98fcB1eFC135eC";

// ============ ABI ============
const DQMCORE_ABI = [
    "function referrer(address) view returns (address)",
    "function getUserLevel(address) view returns (uint8)",
    "function energy(address) view returns (uint256)",
    "function currentPhase() view returns (uint256)",
    "function currentDepositLimit() view returns (uint256)",
    "function depositWhitelist(address) view returns (bool)",
    "event Register(address indexed user, address indexed referrer)",
    "event Deposit(address indexed user, uint256 amount, uint256 lpAmount, uint256 energy)",
];

const STAKECORE_ABI = [
    "function getLP(address) view returns (uint256)",
    "function getLPEquity(address) view returns (uint256)",
    "function lpStakeTime(address) view returns (uint256)",
    "function directCount(address) view returns (uint256)",
    "function userDirectSales(address) view returns (uint256)",
    "function userNodeLevel(address) view returns (uint8)",
    "function totalLP() view returns (uint256)",
    "function totalLPEquitySupply() view returns (uint256)",
    "event ReferrerSet(address indexed user, address indexed referrer)",
];

const VAULT_ABI = [
    "function sAmt(address, uint8) view returns (uint256)",
    "function stakeTime(address, uint8) view returns (uint256)",
    "event Staked(address indexed user, uint8 level, uint256 amount)",
    "event Unstaked(address indexed user, uint8 level, uint256 amount)",
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// ============ 主逻辑 ============
async function main() {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    
    // 测试连接
    const network = await provider.getNetwork();
    console.log(`已连接 BSC, chainId: ${network.chainId}`);

    const core = new ethers.Contract(DQMCORE, DQMCORE_ABI, provider);
    const stake = new ethers.Contract(STAKECORE, STAKECORE_ABI, provider);
    const vault = new ethers.Contract(VAULT, VAULT_ABI, provider);
    const dqt = new ethers.Contract(DQT, ERC20_ABI, provider);

    const outputDir = path.join(__dirname, "export");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ===== Step 1: 收集用户地址 =====
    console.log("\n===== Step 1: 从事件日志获取所有用户地址 =====");
    const users = await collectUserAddresses(provider, core, vault);
    console.log(`共找到 ${users.size} 个唯一用户地址`);
    const userArray = [...users];
    fs.writeFileSync(path.join(outputDir, "user_addresses.txt"), userArray.join("\n"));

    // ===== Step 2: 读取 DQMCore 用户数据 =====
    console.log("\n===== Step 2: 读取 DQMCore 用户数据 =====");
    const coreData = [];
    for (let i = 0; i < userArray.length; i++) {
        const addr = userArray[i];
        try {
            const [ref, level, en, wl] = await Promise.all([
                core.referrer(addr),
                core.getUserLevel(addr),
                core.energy(addr),
                core.depositWhitelist(addr),
            ]);
            coreData.push({
                address: addr,
                referrer: ref === ethers.ZeroAddress ? "" : ref,
                userLevel: Number(level),
                energy: en.toString(),
                depositWhitelist: wl,
            });
        } catch (e) {
            console.log(`  读取 ${addr} 失败: ${e.message}`);
            coreData.push({ address: addr, referrer: "", userLevel: 0, energy: "0", depositWhitelist: false });
        }
        if ((i + 1) % 20 === 0 || i + 1 === userArray.length) {
            console.log(`  进度: ${i + 1}/${userArray.length}`);
        }
    }
    saveJSON(path.join(outputDir, "core_data.json"), coreData);
    saveCSV(path.join(outputDir, "core_data.csv"),
        ["address", "referrer", "userLevel", "energy", "depositWhitelist"],
        coreData.map(d => [d.address, d.referrer, d.userLevel, d.energy, d.depositWhitelist ? 1 : 0]));

    // ===== Step 3: 读取 StakeCore 用户数据 =====
    console.log("\n===== Step 3: 读取 StakeCore 用户数据 =====");
    const stakeData = [];
    for (let i = 0; i < userArray.length; i++) {
        const addr = userArray[i];
        try {
            const [lp, equity, time, count, sales, nodeLevel] = await Promise.all([
                stake.getLP(addr),
                stake.getLPEquity(addr),
                stake.lpStakeTime(addr),
                stake.directCount(addr),
                stake.userDirectSales(addr),
                stake.userNodeLevel(addr),
            ]);
            stakeData.push({
                address: addr,
                userLP: lp.toString(),
                lpEquity: equity.toString(),
                lpStakeTime: time.toString(),
                directCount: count.toString(),
                userDirectSales: sales.toString(),
                userNodeLevel: Number(nodeLevel),
            });
        } catch (e) {
            console.log(`  读取 ${addr} 失败: ${e.message}`);
            stakeData.push({ address: addr, userLP: "0", lpEquity: "0", lpStakeTime: "0", directCount: "0", userDirectSales: "0", userNodeLevel: 0 });
        }
        if ((i + 1) % 20 === 0 || i + 1 === userArray.length) {
            console.log(`  进度: ${i + 1}/${userArray.length}`);
        }
    }
    saveJSON(path.join(outputDir, "stake_data.json"), stakeData);
    saveCSV(path.join(outputDir, "stake_data.csv"),
        ["address", "userLP", "lpEquity", "lpStakeTime", "directCount", "userDirectSales", "userNodeLevel"],
        stakeData.map(d => [d.address, d.userLP, d.lpEquity, d.lpStakeTime, d.directCount, d.userDirectSales, d.userNodeLevel]));

    // ===== Step 4: 读取 Vault 质押记录 =====
    console.log("\n===== Step 4: 读取 Vault 质押记录 =====");
    const vaultData = [];
    for (let i = 0; i < userArray.length; i++) {
        const addr = userArray[i];
        for (let level = 0; level < 4; level++) {
            try {
                const amt = await vault.sAmt(addr, level);
                if (amt > 0n) {
                    const time = await vault.stakeTime(addr, level);
                    vaultData.push({
                        address: addr,
                        level: level,
                        amount: amt.toString(),
                        startTime: time.toString(),
                    });
                }
            } catch (e) {
                // ignore
            }
        }
        if ((i + 1) % 50 === 0 || i + 1 === userArray.length) {
            console.log(`  进度: ${i + 1}/${userArray.length} (质押记录: ${vaultData.length}条)`);
        }
    }
    saveJSON(path.join(outputDir, "vault_stake_data.json"), vaultData);
    saveCSV(path.join(outputDir, "vault_stake_data.csv"),
        ["address", "level", "amount", "startTime"],
        vaultData.map(d => [d.address, d.level, d.amount, d.startTime]));

    // ===== Step 5: 读取全局配置 =====
    console.log("\n===== Step 5: 读取全局配置 =====");
    const [phase, limit, vaultDQ, totalLP, totalEquity] = await Promise.all([
        core.currentPhase(),
        core.currentDepositLimit(),
        dqt.balanceOf(VAULT),
        stake.totalLP(),
        stake.totalLPEquitySupply(),
    ]);
    const config = {
        currentPhase: Number(phase),
        currentDepositLimit: limit.toString(),
        vaultDQBalance: ethers.formatEther(vaultDQ) + " DQ",
        stakeTotalLP: totalLP.toString(),
        stakeTotalLPEquity: totalEquity.toString(),
    };
    fs.writeFileSync(path.join(outputDir, "global_config.json"), JSON.stringify(config, null, 2));
    console.log("全局配置:", JSON.stringify(config, null, 2));

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

// 收集用户地址
async function collectUserAddresses(provider, core, vault) {
    const users = new Set();
    const currentBlock = 102098485;
    // 从部署合约的block开始，如果知道可以修改这里减少扫描范围
    const fromBlock = 101254223; // 约70天

    console.log(`扫描事件日志: block ${fromBlock} ~ ${currentBlock}`);
    console.log("（如果知道合约部署的起始block，可以修改 fromBlock 加速扫描）");

    const BATCH = 2000;
    let lastLog = 0;
    for (let start = fromBlock; start <= currentBlock; start += BATCH) {
        const end = Math.min(start + BATCH - 1, currentBlock);
        
      
        // 分别查询，单独处理错误，不吞掉错误信息
        const fetchWithRetry = async (contract, eventName) => {
            try {
                return await contract.queryFilter(contract.filters[eventName](), start, end);
            } catch (e) {
                console.log(`  ⚠ block ${start}-${end} 查询 ${eventName} 失败: ${e.message}`);
                return [];
            }
        };

        const [registerLogs, depositLogs, stakedLogs] = await Promise.all([
            fetchWithRetry(core, "Register"),
            fetchWithRetry(core, "Deposit"),
            fetchWithRetry(vault, "Staked"),
        ]);

        for (const log of registerLogs) {
            if (log.args?.user) users.add(log.args.user.toLowerCase());
        }
        for (const log of depositLogs) {
            if (log.args?.user) users.add(log.args.user.toLowerCase());
        }
        for (const log of stakedLogs) {
            if (log.args?.user) users.add(log.args.user.toLowerCase());
        }

        if (users.size > lastLog + 50 || end >= currentBlock) {
            console.log(`  block ${end}: 已收集 ${users.size} 个地址`);
            lastLog = users.size;
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

    // 1. 推荐关系 batchImportReferrers
    const referrerUsers = coreData.filter(d => d.referrer && d.referrer !== "");
    generateBatchFile(importDir, "batchReferrers", referrerUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const refs = batch.map(d => d.referrer);
        return {
            func: "batchImportReferrers",
            params: { _users: addrs, _referrers: refs },
        };
    });

    // 2. 用户等级 batchSetUserLevel
    const levelUsers = coreData.filter(d => d.userLevel > 0);
    generateBatchFile(importDir, "batchUserLevel", levelUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const levels = batch.map(d => d.userLevel);
        return {
            func: "batchSetUserLevel",
            params: { _users: addrs, _levels: levels },
        };
    });

    // 3. 能量 batchAddEnergy
    const energyUsers = coreData.filter(d => d.energy !== "0");
    generateBatchFile(importDir, "batchEnergy", energyUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.energy);
        return {
            func: "batchAddEnergy",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 4. 直推金额 batchSetDirectSales
    const salesUsers = stakeData.filter(d => d.userDirectSales !== "0");
    generateBatchFile(importDir, "batchDirectSales", salesUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.userDirectSales);
        return {
            func: "batchSetDirectSales",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 5. 直推人数 batchSetDirectCount
    const countUsers = stakeData.filter(d => d.directCount !== "0");
    generateBatchFile(importDir, "batchDirectCount", countUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const counts = batch.map(d => d.directCount);
        return {
            func: "batchSetDirectCount",
            params: { _users: addrs, _counts: counts },
        };
    });

    // 6. LP batchRecordLP
    const lpUsers = stakeData.filter(d => d.userLP !== "0");
    generateBatchFile(importDir, "batchLP", lpUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const amounts = batch.map(d => d.userLP);
        return {
            func: "batchRecordLP",
            params: { _users: addrs, _amounts: amounts },
        };
    });

    // 7. LP质押时间 batchSetLPStakeTime
    const timeUsers = stakeData.filter(d => d.lpStakeTime !== "0");
    generateBatchFile(importDir, "batchLPStakeTime", timeUsers, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const times = batch.map(d => d.lpStakeTime);
        return {
            func: "batchSetLPStakeTime",
            params: { _users: addrs, _times: times },
        };
    });

    // 8. DQ质押记录 batchImportStake
    generateBatchFile(importDir, "batchStake", vaultData, 50, (batch) => {
        const addrs = batch.map(d => d.address);
        const levels = batch.map(d => d.level);
        const amounts = batch.map(d => d.amount);
        const times = batch.map(d => d.startTime);
        return {
            func: "batchImportStake",
            params: { _users: addrs, _levels: levels, _amounts: amounts, _startTimes: times },
        };
    });

    console.log(`\n导入文件已生成在: ${importDir}/`);
    console.log("每个文件夹内包含可直接复制到Remix的参数");
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
        content += `函数: ${formatted.func}\n`;
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
