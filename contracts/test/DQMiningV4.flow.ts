import { expect } from "chai";
import { artifacts, ethers, network } from "hardhat";
import type { Contract } from "ethers";

const ADDRS = {
  OWNER: "0x274aCc6397349F21179ed6258A54B2a11B28faF5",
  SOL: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  LP: "0x1000000000000000000000000000000000000001",
  PARTNER: "0x803B79B608455808C2f752c588804c3F5bF676a3",
};

const ONE = ethers.parseEther("1");
const SELL_AMOUNT = ethers.parseEther("0.1");
const HUGE_SUPPLY = ethers.parseEther("100000000000");

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

describe("DQMiningV4 flow", function () {
  let ownerSigner: any;
  let user: any;
  let dqMining: Contract;
  let stake: Contract;
  let dqToken: Contract;
  let dqCard: Contract;
  let solToken: Contract;
  let lpToken: Contract;
  let router: Contract;

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");

    [, user] = await ethers.getSigners();

    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCodeAt(ADDRS.SOL, "MockERC20Token");
    lpToken = await setCodeAt(ADDRS.LP, "MockERC20Token");
    router = await setCodeAt(ADDRS.ROUTER, "MockPancakeRouterV3");

    dqToken = await ethers.deployContract("MockERC20Token");
    dqCard = await ethers.deployContract("MockDQCard");
    stake = await ethers.deployContract("DQMiningStakeV3");
    dqMining = await ethers.deployContract("DQMiningV4");

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

    await solToken.mint(await user.getAddress(), ethers.parseEther("10"));
    await dqToken.mint(ADDRS.OWNER, HUGE_SUPPLY);
    await dqToken.mint(await user.getAddress(), ONE);
  });

  it("runs register -> depositSOL -> sellDQForSOL and settles balances", async function () {
    await dqMining.connect(user).register(ADDRS.OWNER);

    const registeredUser = await dqMining.getUser(await user.getAddress());
    expect(registeredUser[0]).to.equal(ADDRS.OWNER);

    await solToken.connect(user).approve(await dqMining.getAddress(), ONE);
    await expect(dqMining.connect(user).depositSOL(ONE)).to.not.be.reverted;

    const userData = await dqMining.getUser(await user.getAddress());
    const userStake = await dqMining.getUserStake(await user.getAddress());

    expect(userData[3]).to.equal(ONE);
    expect(userStake[1]).to.equal(ethers.parseEther("3"));
    expect(await stake.lpS(await user.getAddress())).to.equal(ethers.parseEther("0.25"));
    expect(await lpToken.balanceOf(await user.getAddress())).to.equal(ethers.parseEther("0.25"));

    const fee = SELL_AMOUNT * 6n / 100n;
    const burnAmount = SELL_AMOUNT * 94n / 100n;
    const expectedSolOut = burnAmount * 995n / 1000n;
    const halfFee = fee / 2n;
    const partnerShare = fee - halfFee;

    const userSolBefore = await solToken.balanceOf(await user.getAddress());
    const contractSolBefore = await solToken.balanceOf(await dqMining.getAddress());
    const userDqBefore = await dqToken.balanceOf(await user.getAddress());
    const totalSupplyBefore = await dqToken.totalSupply();
    const feeAddrBefore = await dqToken.balanceOf("0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967");
    const partnerBefore = await dqToken.balanceOf(ADDRS.PARTNER);

    await dqToken.connect(user).approve(await dqMining.getAddress(), SELL_AMOUNT);
    const quotedSol = await dqMining.connect(user).sellDQForSOL.staticCall(SELL_AMOUNT);
    expect(quotedSol).to.equal(expectedSolOut);

    await expect(dqMining.connect(user).sellDQForSOL(SELL_AMOUNT))
      .to.emit(dqMining, "SellDQ")
      .withArgs(await user.getAddress(), SELL_AMOUNT, expectedSolOut, burnAmount, fee);

    expect(await solToken.balanceOf(await user.getAddress())).to.equal(userSolBefore + expectedSolOut);
    expect(await solToken.balanceOf(await dqMining.getAddress())).to.equal(contractSolBefore - expectedSolOut);
    expect(await dqToken.balanceOf(await user.getAddress())).to.equal(userDqBefore - SELL_AMOUNT);
    expect(await dqToken.totalSupply()).to.equal(totalSupplyBefore - burnAmount);
    expect(await dqToken.balanceOf("0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967")).to.equal(feeAddrBefore + halfFee);
    expect(await dqToken.balanceOf(ADDRS.PARTNER)).to.equal(partnerBefore + partnerShare / 2n);
    expect(await dqToken.balanceOf(await stake.getAddress())).to.equal(partnerShare / 2n);
    expect(await dqToken.balanceOf(await dqMining.getAddress())).to.equal(0n);
  });

  afterEach(async function () {
    await network.provider.send("hardhat_stopImpersonatingAccount", [ADDRS.OWNER]);
  });
});