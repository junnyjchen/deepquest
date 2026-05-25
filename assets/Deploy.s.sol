// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./DQT.sol";
import "./DQC.sol";
import "./DQMCore.sol";
import "./DQMiningStakeCore.sol";
import "./DQMiningStakeMine.sol";
import "./DQMAdmin.sol";
import "./DQLPMigrator.sol";

/**
 * @title DQ 质押系统部署脚本
 * @notice 部署所有合约并设置权限
 * @dev 使用 forge script script/Deploy.s.sol --rpc-url $BSC_RPC --broadcast
 */
contract DeployScript is Script {
    // 固定地址
    address constant PARTNER_ADDRESS = 0x803B79B608455808C2f752c588804c3F5bF676a3;  // 合伙人/创始人
    address constant FEE_RECEIVER = 0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967;   // 手续费地址
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("========================================");
        console.log("DQ Staking System V2 Deployment");
        console.log("========================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Partner:", PARTNER_ADDRESS);
        console.log("FeeReceiver:", FEE_RECEIVER);
        
        // ===== 1. 部署 DQT =====
        console.log("\n=== Deploying DQT ===");
        DQT dqToken = new DQT();
        console.log("DQT:", address(dqToken));
        
        // ===== 2. 部署 DQC (NFT节点卡) =====
        console.log("\n=== Deploying DQC ===");
        DQC dqc = new DQC();
        console.log("DQC:", address(dqc));
        
        // ===== 3. 部署 DQMCore =====
        console.log("\n=== Deploying DQMCore ===");
        DQMCore core = new DQMCore();
        console.log("DQMCore:", address(core));
        
        // ===== 4. 部署 DQMiningStakeCore =====
        console.log("\n=== Deploying DQMiningStakeCore ===");
        DQMiningStakeCore stakeCore = new DQMiningStakeCore(
            address(dqToken),
            address(core),
            address(dqc)
        );
        console.log("DQMiningStakeCore:", address(stakeCore));
        
        // ===== 5. 部署 DQMiningStakeMine =====
        console.log("\n=== Deploying DQMiningStakeMine ===");
        DQMiningStakeMine mining = new DQMiningStakeMine(
            address(dqToken),
            address(stakeCore),
            address(core)
        );
        console.log("DQMiningStakeMine:", address(mining));
        
        // ===== 6. 部署 DQMAdmin =====
        console.log("\n=== Deploying DQMAdmin ===");
        DQMAdmin admin = new DQMAdmin(
            address(dqToken),
            address(core),
            address(stakeCore),
            address(mining),
            address(dqc)
        );
        console.log("DQMAdmin:", address(admin));
        
        // ===== 7. 设置权限 =====
        console.log("\n=== Setting Permissions ===");
        
        // DQT 授权
        dqToken.setMiningContract(address(mining));
        dqToken.setStakeCoreContract(address(stakeCore));  // 单币质押在stakeCore里
        dqToken.setMinter(address(mining), true);
        dqToken.setMinter(address(stakeCore), true);
        dqToken.setTaxReceiver(FEE_RECEIVER);  // 手续费地址
        
        // Core 设置质押合约
        core.setStakeCore(address(stakeCore));
        core.setMining(address(mining));
        core.setAdminContract(address(admin));
        
        // StakeCore 设置爆块合约
        // 注意: D等级逻辑在stakeCore内部实现，不需要单独的DLevelPool合约
        stakeCore.setMining(address(mining));
        stakeCore.setDLevelPool(address(stakeCore));  // D等级池就是stakeCore本身
        
        // Mining 设置D等级池和合伙人地址
        // 注意: dLevelPool指向stakeCore，D等级分配逻辑在stakeCore中
        mining.setDLevelPool(address(stakeCore));  // D等级池就是stakeCore
        mining.setPartnerAddress(PARTNER_ADDRESS);
        
        // 设置初始总量 (1000亿 DQ = 1000 * 10^8 * 10^18)
        uint256 initialSupply = 1000 * 10 ** 8 * 10 ** 18;  // 1000亿
        mining.setInitialTotalSupply(initialSupply);
        console.log("Initial supply set: 1000 billion DQ");
        
        // DQC 授权
        dqc.setStakeCore(address(stakeCore));
        
        console.log("Permissions set!");
        
        // ===== 8. 部署迁移合约 =====
        console.log("\n=== Deploying DQLPMigrator ===");
        DQLPMigrator migrator = new DQLPMigrator();
        console.log("DQLPMigrator:", address(migrator));
        
        // StakeCore 设置迁移合约
        stakeCore.setMigratorContract(address(migrator));
        core.setMigratorContract(address(migrator));
        
        vm.stopBroadcast();
        
        // ===== 输出部署信息 =====
        console.log("\n========================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("DQT:", address(dqToken));
        console.log("DQC:", address(dqc));
        console.log("DQMCore:", address(core));
        console.log("DQMiningStakeCore:", address(stakeCore));
        console.log("DQMiningStakeMine:", address(mining));
        console.log("DQMAdmin:", address(admin));
        console.log("DQLPMigrator:", address(migrator));
        console.log("========================================");
        console.log("\nNEXT STEPS:");
        console.log("1. 在PancakeSwap添加流动性，创建Pool");
        console.log("2. 调用 dqToken.setPool(pairAddress)");
        console.log("3. 导入用户关系数据");
        console.log("4. 导入用户等级数据");
        console.log("5. 用户迁移LP质押");
        console.log("========================================");
    }
}
