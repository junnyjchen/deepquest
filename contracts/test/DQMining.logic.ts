import { expect } from "chai";
import { artifacts, ethers, network } from "hardhat";
import type { Contract } from "ethers";

const ADDRS = {
  OWNER: "0x274aCc6397349F21179ed6258A54B2a11B28faF5",
  DQTOKEN: "0xeD82B38bE28bB1552d0792b978e4361aEf46283e",
  DQCARD: "0xA275d02a6bDc9bd79FdAAD1838a9f5b1F19d032a",
  SOL: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
};

const ONE = ethers.parseEther("1");
const HALF = ethers.parseEther("0.5");
const QUARTER = ethers.parseEther("0.25");
const DIRECT_REWARD = ethers.parseEther("0.15");
const SEE_REWARD = ethers.parseEther("0.005");

async function setCodeAt(address: string, artifactName: string) {
  const artifact = await artifacts.readArtifact(artifactName);
  await network.provider.send("hardhat_setCode", [address, artifact.deployedBytecode]);
  return ethers.getContractAt(artifactName, address);
}

async function impersonate(address: string) {
  await network.provider.send("hardhat_setBalance", [address, "0x3635C9ADC5DEA00000"]); // 1000 ETH
  await network.provider.send("hardhat_impersonateAccount", [address]);
  return ethers.getSigner(address);
}

describe("DQMining asset logic", function () {
  let dqMining: Contract;
  let dqToken: Contract;
  let dqCard: Contract;
  let solToken: Contract;
  let router: Contract;
  let stake: Contract;
  let ownerSigner: any;
  let deployer: any;
  let referrer: any;
  let user: any;

  async function approveAndDeposit(signer: any, amount = ONE) {
    await solToken.connect(signer).approve(await dqMining.getAddress(), amount);
    await dqMining.connect(signer).depositSOL(amount);
  }

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");

    [deployer, referrer, user] = await ethers.getSigners();

    dqToken = await setCodeAt(ADDRS.DQTOKEN, "MockERC20Token");
    dqCard = await setCodeAt(ADDRS.DQCARD, "MockDQCard");
    solToken = await setCodeAt(ADDRS.SOL, "MockERC20Token");
    router = await setCodeAt(ADDRS.ROUTER, "MockPancakeRouter");

    await dqToken.initialize("DeepQuest", "DQ", 18);
    await solToken.initialize("Mock SOL", "SOL", 18);

    const stakeFactory = await ethers.getContractFactory("MockDQMiningStake");
    stake = await stakeFactory.deploy();
    await stake.waitForDeployment();

    const miningFactory = await ethers.getContractFactory("DQMining");
    dqMining = await miningFactory.deploy();
    await dqMining.waitForDeployment();

    ownerSigner = await impersonate(ADDRS.OWNER);
    await dqMining.connect(ownerSigner).setStakeContract(await stake.getAddress());

    for (const account of [ADDRS.OWNER, await referrer.getAddress(), await user.getAddress()]) {
      await solToken.mint(account, ethers.parseEther("10"));
    }
  });

  it("严格按合约逻辑：注册成功后，入金会更新团队数据、奖励和 LP 记录", async function () {
    await dqMining.connect(referrer).register(ADDRS.OWNER);
    await dqMining.connect(user).register(await referrer.getAddress());

    await approveAndDeposit(ownerSigner);
    await approveAndDeposit(referrer);
    await approveAndDeposit(user);

    const userData = await dqMining.getUser(await user.getAddress());
    const referrerData = await dqMining.getUser(await referrer.getAddress());
    const ownerData = await dqMining.getUser(ADDRS.OWNER);

    expect(userData[0]).to.equal(await referrer.getAddress());
    expect(userData[3]).to.equal(ONE); // totalInvest
    expect(userData[5]).to.equal(ethers.parseEther("3")); // energy = amount * 3

    expect(referrerData[1]).to.equal(1n); // directCount
    expect(referrerData[4]).to.equal(ONE); // teamInvest
    expect(referrerData[8]).to.equal(DIRECT_REWARD + SEE_REWARD); // pendingSOL

    expect(ownerData[8]).to.equal(DIRECT_REWARD + SEE_REWARD + SEE_REWARD);
    expect(await stake.lpS(await user.getAddress())).to.equal(QUARTER);
    expect(await dqMining.dailyDeposit(await user.getAddress())).to.equal(ONE);
  });

  it("能复现合约逻辑问题：上级无 NFT 且 energy 为 0 时，首笔下级入金会触发 Panic(0x11)", async function () {
    await dqMining.connect(referrer).register(ADDRS.OWNER);
    await dqMining.connect(user).register(await referrer.getAddress());

    await solToken.connect(user).approve(await dqMining.getAddress(), ONE);

    await expect(dqMining.connect(user).depositSOL(ONE)).to.be.revertedWithPanic(0x11);
  });

  it("严格按日限额逻辑：同一地址当天第二次入金 1 SOL 会被 !lim 拒绝", async function () {
    await dqMining.connect(referrer).register(ADDRS.OWNER);
    await dqMining.connect(user).register(await referrer.getAddress());

    await approveAndDeposit(ownerSigner);
    await approveAndDeposit(referrer);
    await approveAndDeposit(user);

    await solToken.connect(user).approve(await dqMining.getAddress(), ONE);
    await expect(dqMining.connect(user).depositSOL(ONE)).to.be.revertedWith("!lim");
  });

  it("严格按注册逻辑：不允许自引用、未注册推荐人和重复注册", async function () {
    await expect(dqMining.connect(user).register(await user.getAddress())).to.be.revertedWith("!inv");
    await expect(dqMining.connect(user).register(await referrer.getAddress())).to.be.revertedWith("!rref");

    await dqMining.connect(referrer).register(ADDRS.OWNER);
    await dqMining.connect(user).register(await referrer.getAddress());

    await expect(dqMining.connect(user).register(await referrer.getAddress())).to.be.revertedWith("!inv");
  });

  afterEach(async function () {
    await network.provider.send("hardhat_stopImpersonatingAccount", [ADDRS.OWNER]);
  });
});
