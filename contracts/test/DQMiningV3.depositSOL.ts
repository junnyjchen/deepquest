import { expect } from "chai";
import { artifacts, ethers, network } from "hardhat";
import type { Contract } from "ethers";

const ADDRS = {
  OWNER: "0x274aCc6397349F21179ed6258A54B2a11B28faF5",
  SOL: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  LP: "0x1000000000000000000000000000000000000001",
};

const ONE = ethers.parseEther("1");
const HALF = ethers.parseEther("0.5");
const QUARTER = ethers.parseEther("0.25");

async function setCodeAt(address: string, artifactName: string) {
  const artifact = await artifacts.readArtifact(artifactName);
  await network.provider.send("hardhat_setCode", [address, artifact.deployedBytecode]);
  return ethers.getContractAt(artifactName, address);
}

async function impersonate(address: string) {
  await network.provider.send("hardhat_setBalance", [address, "0x3635C9ADC5DEA00000"]);
  await network.provider.send("hardhat_impersonateAccount", [address]);
  return ethers.getSigner(address);
}

describe("DQMiningV3 depositSOL", function () {
  let ownerSigner: any;
  let referrer: any;
  let user: any;
  let dqMining: Contract;
  let stake: Contract;
  let dqToken: Contract;
  let dqCard: Contract;
  let solToken: Contract;
  let lpToken: Contract;
  let router: Contract;

  async function approveAndDeposit(signer: any, amount = ONE) {
    await solToken.connect(signer).approve(await dqMining.getAddress(), amount);
    await dqMining.connect(signer).depositSOL(amount);
  }

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");

    [, referrer, user] = await ethers.getSigners();

    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCodeAt(ADDRS.SOL, "MockERC20Token");
    lpToken = await setCodeAt(ADDRS.LP, "MockERC20Token");
    router = await setCodeAt(ADDRS.ROUTER, "MockPancakeRouterV3");

    dqToken = await ethers.deployContract("MockERC20Token");
    dqCard = await ethers.deployContract("MockDQCard");
    stake = await ethers.deployContract("DQMiningStakeV3");
    dqMining = await ethers.deployContract("DQMiningV3");

    await dqToken.waitForDeployment();
    await dqCard.waitForDeployment();
    await stake.waitForDeployment();
    await dqMining.waitForDeployment();

    await solToken.initialize("Mock SOL", "SOL", 18);
    await lpToken.initialize("Mock LP", "MLP", 18);
    await dqToken.initialize("DeepQuest", "DQ", 18);
    await router.initialize(ADDRS.LP);

    await dqMining.connect(ownerSigner).setDQToken(await dqToken.getAddress());
    await dqMining.connect(ownerSigner).setDQCard(await dqCard.getAddress());
    await stake.connect(ownerSigner).setAddresses(await dqToken.getAddress(), await dqCard.getAddress(), ADDRS.LP);
    await stake.connect(ownerSigner).setMiningContract(await dqMining.getAddress());
    await stake.connect(ownerSigner).setM(await dqMining.getAddress());
    await dqMining.connect(ownerSigner).setStakeContract(await stake.getAddress());

    for (const account of [ADDRS.OWNER, await referrer.getAddress(), await user.getAddress()]) {
      await solToken.mint(account, ethers.parseEther("10"));
    }
  });

  it("owner 入金会写入 totalInvest、pendingSOL 和 LP 记录", async function () {
    await approveAndDeposit(ownerSigner);

    const ownerData = await dqMining.getUser(ADDRS.OWNER);
    const ownerStake = await dqMining.getUserStake(ADDRS.OWNER);

    expect(ownerData[3]).to.equal(ONE);
    expect(ownerStake[1]).to.equal(ethers.parseEther("3"));
    expect(ownerStake[2]).to.equal(HALF);
    expect(await stake.lpS(ADDRS.OWNER)).to.equal(QUARTER);
    expect(await lpToken.balanceOf(ADDRS.OWNER)).to.equal(QUARTER);
    expect(await dqMining.dailyDeposit(ADDRS.OWNER)).to.equal(ONE);
  });

  it("未注册用户 depositSOL 会被 !reg 拒绝", async function () {
    await solToken.connect(user).approve(await dqMining.getAddress(), ONE);
    await expect(dqMining.connect(user).depositSOL(ONE)).to.be.revertedWith("!reg");
  });

  it("金额低于 INVEST_MIN 会被 !inv 拒绝", async function () {
    await dqMining.connect(user).register(ADDRS.OWNER);
    await solToken.connect(user).approve(await dqMining.getAddress(), HALF);
    await expect(dqMining.connect(user).depositSOL(HALF)).to.be.revertedWith("!inv");
  });

  it("白名单地址可连续两次入金且 dailyDeposit 不累计", async function () {
    await dqMining.connect(ownerSigner).setDepositWhiteList(ADDRS.OWNER, true);

    await approveAndDeposit(ownerSigner);
    await approveAndDeposit(ownerSigner);

    expect(await dqMining.dailyDeposit(ADDRS.OWNER)).to.equal(0n);
    const ownerData = await dqMining.getUser(ADDRS.OWNER);
    expect(ownerData[3]).to.equal(ONE + ONE);
  });

  it("已注册用户首笔入金在无经理等级时也能通过，不再触发 Panic(0x11)", async function () {
    await dqMining.connect(referrer).register(ADDRS.OWNER);
    await dqMining.connect(user).register(await referrer.getAddress());

    await solToken.connect(user).approve(await dqMining.getAddress(), ONE);

    await expect(dqMining.connect(user).depositSOL(ONE)).to.not.be.reverted;

    const userData = await dqMining.getUser(await user.getAddress());
    const userStake = await dqMining.getUserStake(await user.getAddress());

    expect(userData[3]).to.equal(ONE);
    expect(userStake[1]).to.equal(ethers.parseEther("3"));
    expect(userStake[2]).to.equal(HALF);
  });

  afterEach(async function () {
    await network.provider.send("hardhat_stopImpersonatingAccount", [ADDRS.OWNER]);
  });
});
