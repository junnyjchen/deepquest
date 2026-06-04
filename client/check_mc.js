/**
 * 诊断脚本：检查 DQMiningStakeCore.mc 是否指向 DQMCore 地址
 * 运行: node check_mc.js
 */
/* global require */
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

  const DQ_CORE_ADDR   = "0xb55693887D6e7E902DACa763904093151aE660D1"; // CONTRACT_ADDRESSES.DQPROJECT
  const DQ_STAKE_ADDR  = "0x89853522B8eeA134Fa486d753E693Ee5C8f916d1"; // CONTRACT_ADDRESSES.DQSTAKE

  const stakeAbi = [
    "function mc() view returns (address)",
    "function adminContract() view returns (address)",
    "function lpPair() view returns (address)",
    "function getLP(address) view returns (uint256)",
    "function lpS(address) view returns (uint256)",
  ];

  const coreAbi = [
    "function stakeContract() view returns (address)",
  ];

  const stakeContract = new ethers.Contract(DQ_STAKE_ADDR, stakeAbi, provider);
  const coreContract  = new ethers.Contract(DQ_CORE_ADDR,  coreAbi,  provider);

  console.log("=== DQMCore & DQMiningStakeCore 关键地址诊断 ===\n");

  let mc, adminContract, lpPair, coreStakeAddr;

  try { mc            = await stakeContract.mc();            } catch (e) { mc = "ERROR: " + e.message; }
  try { adminContract = await stakeContract.adminContract(); } catch (e) { adminContract = "ERROR: " + e.message; }
  try { lpPair        = await stakeContract.lpPair();        } catch (e) { lpPair = "ERROR: " + e.message; }
  try { coreStakeAddr = await coreContract.stakeContract();  } catch (e) { coreStakeAddr = "ERROR: " + e.message; }

  console.log("DQMCore (DQPROJECT)  :", DQ_CORE_ADDR);
  console.log("DQStake (DQSTAKE)    :", DQ_STAKE_ADDR);
  console.log("");
  console.log("DQMCore.stakeContract:", coreStakeAddr);
  console.log("  → 应等于 DQSTAKE 地址:", coreStakeAddr === DQ_STAKE_ADDR ? "[OK] 匹配" : "[FAIL] 不匹配！");
  console.log("");
  console.log("DQMiningStakeCore.mc :", mc);
  console.log("  → 应等于 DQMCore 地址:", mc === DQ_CORE_ADDR ? "[OK] 匹配" : "[FAIL] 不匹配！需要管理员调用 setM()");
  console.log("");
  console.log("DQMiningStakeCore.adminContract:", adminContract);
  console.log("DQMiningStakeCore.lpPair       :", lpPair);
  console.log("");

  if (mc !== DQ_CORE_ADDR) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[ISSUE] 问题确认：mc 未设置为 DQMCore 地址");
    console.log("   导致 addLP 调用时 onlyM 鉴权失败（!op）");
    console.log("   入金交易会 revert，lpS[user] 永远为 0");
    console.log("");
    console.log("修复方法：");
    console.log("  用管理员钱包(0x274aCc6397349F21179ed6258A54B2a11B28faF5)");
    console.log("  调用 DQMiningStakeCore.setM(DQMCore地址)：");
    console.log(`  stakeContract.setM("${DQ_CORE_ADDR}")`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}

main().catch(console.error);
