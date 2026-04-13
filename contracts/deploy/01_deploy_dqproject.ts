import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("========================================");
  log("Deploying DQProject Contracts...");
  log("Network: " + network.name);
  log("Deployer: " + deployer);
  log("========================================");

  // 部署主合约
  const dqProject = await deploy("DQProject", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 3
  });

  log("DQProject deployed to: " + dqProject.address);

  // 获取部署的 DQToken 和 DQCard 地址
  const dqTokenAddress = await hre.ethers.getContractAddress([deployer, deployments.get("DQProject").then(d => d.implementation || d.address)]);
  const dqCardAddress = dqProject.address; // 主合约包含所有功能

  log("========================================");
  log("Deployment Summary:");
  log("========================================");
  log("DQProject: " + dqProject.address);
  log("Network: " + network.name);
  log("Chain ID: " + network.config.chainId);
  log("Block Explorer: " + (network.name === "bscMainnet" ? "https://bscscan.com" : "https://testnet.bscscan.com"));
  log("========================================");
};

export default func;
func.tags = ["DQProject", "main"];
