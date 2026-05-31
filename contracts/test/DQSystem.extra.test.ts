/**
 * DQ 系统扩展测试 — 需求文档全流程覆盖 (Suite 7–12)
 *
 * 覆盖范围：
 *  7.  DQC 节点NFT购买 — buyCard / mintBatch / 售罄 / L等级自动设置
 *  8.  DQMCore 管理员功能 — importUsers / adminEnergy / changeReferrer / setUserLevel
 *  9.  管理奖级差制分配 — S2/S3 差额奖励 / 无能量跳过
 *  10. D等级爆块奖励 — mine() → distributeDRankReward → claimDRankReward
 *  11. LP权益授权与奖励 — authorizeLPEquity / claimLPEquityReward
 *  12. 每日入金限制 — 非白名单累计限额 / 白名单豁免 / advancePhase 扩容
 */

import { expect } from "chai";
import { artifacts, ethers, network } from "hardhat";
import type { Contract, Signer } from "ethers";

// ===================== 固定 BSC 地址 =====================
const ADDRS = {
  OWNER:      "0x274aCc6397349F21179ed6258A54B2a11B28faF5",
  SOL:        "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  USDT:       "0x55d398326f99059fF775485246999027B3197955",
  ROUTER:     "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  FOUNDATION: "0xA0f045cde45ca1aeE2033356170B46A1fF3b7202",
  PARTNER:    "0x803B79B608455808C2f752c588804c3F5bF676a3",
  FIXED_NODE: "0x822682A54C454e938374e9690420cdFA264A18Aa",
};

const E = (n: string | number) => ethers.parseEther(String(n));

async function setCode(address: string, artifactName: string) {
  const artifact = await artifacts.readArtifact(artifactName);
  await network.provider.send("hardhat_setCode", [address, artifact.deployedBytecode]);
  return ethers.getContractAt(artifactName, address);
}

async function impersonate(address: string): Promise<Signer> {
  await network.provider.send("hardhat_setBalance", [address, "0x56BC75E2D63100000"]);
  await network.provider.send("hardhat_impersonateAccount", [address]);
  return ethers.getSigner(address);
}

async function advanceTime(seconds: number) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
}

// =========================================================
// ====  TEST SUITE 7: DQC 节点 NFT 购买流程  ===============
// =========================================================

describe("7. DQC 节点NFT购买流程", function () {
  let ownerSigner: Signer;
  let buyer: Signer;
  let treasury: Signer;
  let usdtToken: Contract;
  let dqCard: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [, buyer, treasury] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    // 在 USDT 固定地址注入 MockERC20Token
    usdtToken = await setCode(ADDRS.USDT, "MockERC20Token");
    await usdtToken.initialize("USDT", "USDT", 18);

    // 部署 DQCard（构造函数硬编码 Ownable(ADDRS.OWNER)）
    dqCard = await ethers.deployContract("DQCard");
    await dqCard.waitForDeployment();

    // 设置 treasury
    await dqCard.connect(ownerSigner).setTreasury(await treasury.getAddress());

    // 铸 USDT 给 buyer
    await usdtToken.mint(await buyer.getAddress(), E("10000"));
  });

  it("mintBatchByOwner: owner 批量铸造 NFT", async () => {
    const buyerAddr = await buyer.getAddress();
    await dqCard.connect(ownerSigner).mintBatchByOwner(
      [buyerAddr, buyerAddr],
      [1, 2]   // A卡 + B卡
    );
    expect(await dqCard.balanceOf(buyerAddr)).to.equal(2);
    expect(await dqCard.totalA()).to.equal(1);
    expect(await dqCard.totalB()).to.equal(1);
    expect(await dqCard.cardType(1)).to.equal(1);
    expect(await dqCard.cardType(2)).to.equal(2);
  });

  it("buyCard: 购买 A卡 — 500 USDT 转入 treasury，NFT 铸造成功", async () => {
    const buyerAddr  = await buyer.getAddress();
    const treasuryAddr = await treasury.getAddress();

    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("500"));
    await dqCard.connect(buyer).buyCard(1);

    expect(await dqCard.balanceOf(buyerAddr)).to.equal(1);
    expect(await usdtToken.balanceOf(treasuryAddr)).to.equal(E("500"));
    expect(await dqCard.totalA()).to.equal(1);
    expect(await dqCard.userNodePerformance(buyerAddr)).to.equal(E("500"));
  });

  it("buyCard: B卡 — 1500 USDT，NFT 铸造成功", async () => {
    const buyerAddr = await buyer.getAddress();
    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("1500"));
    await dqCard.connect(buyer).buyCard(2);

    expect(await dqCard.balanceOf(buyerAddr)).to.equal(1);
    expect(await dqCard.totalB()).to.equal(1);
    expect(await usdtToken.balanceOf(await treasury.getAddress())).to.equal(E("1500"));
  });

  it("buyCard: C卡 — 5000 USDT，NFT 铸造成功", async () => {
    const buyerAddr = await buyer.getAddress();
    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("5000"));
    await dqCard.connect(buyer).buyCard(3);

    expect(await dqCard.balanceOf(buyerAddr)).to.equal(1);
    expect(await dqCard.totalC()).to.equal(1);
  });

  it("buyCard: 无效卡类型 0 或 4 revert", async () => {
    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("1000"));
    await expect(dqCard.connect(buyer).buyCard(4)).to.be.revertedWith("invalid type");
    await expect(dqCard.connect(buyer).buyCard(0)).to.be.revertedWith("invalid type");
  });

  it("buyCard: A卡售罄后 revert", async () => {
    await dqCard.connect(ownerSigner).setMaxA(0);
    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("500"));
    await expect(dqCard.connect(buyer).buyCard(1)).to.be.revertedWith("A card sold out");
  });

  it("setMaxA/B/C: 管理员修改上限生效", async () => {
    await dqCard.connect(ownerSigner).setMaxA(5);
    await dqCard.connect(ownerSigner).setMaxB(3);
    await dqCard.connect(ownerSigner).setMaxC(1);
    expect(await dqCard.MAX_A()).to.equal(5);
    expect(await dqCard.MAX_B()).to.equal(3);
    expect(await dqCard.MAX_C()).to.equal(1);
  });

  it("buyCard: 购买 A卡后自动设置 S等级 = S1 (stakeCore)", async () => {
    const dqToken = await ethers.deployContract("MockERC20Token");
    await dqToken.waitForDeployment();
    await dqToken.initialize("DQ", "DQ", 18);

    const stakeCore = await ethers.deployContract("DQMiningStakeCore");
    await stakeCore.waitForDeployment();

    // 设置 stakeCore 的 dqToken 和 dqCard 地址
    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(),
      await dqCard.getAddress(),   // _dc = dqCard 地址，使 setUserLevel 可被 dqCard 调用
      ethers.ZeroAddress
    );

    // 配置 dqCard 使用 stakeCore
    await dqCard.connect(ownerSigner).setStakeContract(await stakeCore.getAddress());

    const buyerAddr = await buyer.getAddress();
    await usdtToken.connect(buyer).approve(await dqCard.getAddress(), E("500"));
    await dqCard.connect(buyer).buyCard(1);   // A卡 → S1

    expect(await stakeCore.userLevel(buyerAddr)).to.equal(1);   // S1
  });

  it("mintByOwner: owner 身份可调用 (onlyM)", async () => {
    const buyerAddr = await buyer.getAddress();
    await dqCard.connect(ownerSigner).mintByOwner(buyerAddr, 2);  // B卡
    expect(await dqCard.balanceOf(buyerAddr)).to.equal(1);
    expect(await dqCard.totalB()).to.equal(1);
  });
});

// =========================================================
// ====  TEST SUITE 8: DQMCore 管理员功能  ==================
// =========================================================

describe("8. DQMCore 管理员功能", function () {
  let ownerSigner: Signer;
  let referrer: Signer;
  let userA: Signer;
  let userB: Signer;

  let solToken: Contract;
  let router: Contract;
  let lpPair: Contract;
  let dqToken: Contract;
  let stakeCore: Contract;
  let core: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [, referrer, userA, userB] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCode(ADDRS.SOL, "MockERC20Token");
    router   = await setCode(ADDRS.ROUTER, "MockPancakeRouterFull");
    lpPair   = await ethers.deployContract("MockPairToken");
    dqToken  = await ethers.deployContract("MockERC20Token");
    await lpPair.waitForDeployment();
    await dqToken.waitForDeployment();
    await lpPair.initialize("LP", "LP");
    await dqToken.initialize("DQ", "DQ", 18);
    await solToken.initialize("SOL", "SOL", 18);
    await router.initialize(await lpPair.getAddress());

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    core      = await ethers.deployContract("DQMCore");
    await stakeCore.waitForDeployment();
    await core.waitForDeployment();

    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await referrer.getAddress());
    await core.connect(ownerSigner).setINS(await referrer.getAddress());
    await core.connect(ownerSigner).setOP(await referrer.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0);

    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await referrer.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await referrer.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await referrer.getAddress());

    for (const sig of [referrer, userA, userB]) {
      await solToken.mint(await sig.getAddress(), E("100"));
    }
  });

  it("importUsers: 批量导入用户推荐关系", async () => {
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();
    const userBAddr = await userB.getAddress();

    await core.connect(ownerSigner).importUsers(
      [userAAddr, userBAddr],
      [refAddr, userAAddr]
    );

    const [refA] = await core.getUser(userAAddr);
    const [refB] = await core.getUser(userBAddr);
    expect(refA).to.equal(refAddr);
    expect(refB).to.equal(userAAddr);
  });

  it("adminSetEnergy: 直接设置用户能量", async () => {
    const userAAddr = await userA.getAddress();
    await core.connect(userA).register(ADDRS.OWNER);
    await core.connect(ownerSigner).adminSetEnergy(userAAddr, E("50"));
    expect(await core.userEnergy(userAAddr)).to.equal(E("50"));
  });

  it("adminAddEnergy: 累加用户能量", async () => {
    const userAAddr = await userA.getAddress();
    await core.connect(userA).register(ADDRS.OWNER);
    await core.connect(ownerSigner).adminSetEnergy(userAAddr, E("10"));
    await core.connect(ownerSigner).adminAddEnergy(userAAddr, E("5"));
    expect(await core.userEnergy(userAAddr)).to.equal(E("15"));
  });

  it("adminSubEnergy: 减少能量，夹到 0", async () => {
    const userAAddr = await userA.getAddress();
    await core.connect(userA).register(ADDRS.OWNER);
    await core.connect(ownerSigner).adminSetEnergy(userAAddr, E("10"));

    await core.connect(ownerSigner).adminSubEnergy(userAAddr, E("6"));
    expect(await core.userEnergy(userAAddr)).to.equal(E("4"));

    // 超额减少 → 夹到 0
    await core.connect(ownerSigner).adminSubEnergy(userAAddr, E("100"));
    expect(await core.userEnergy(userAAddr)).to.equal(0n);
  });

  it("changeReferrer: 无下线时成功修改推荐人", async () => {
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();
    const userBAddr = await userB.getAddress();

    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(refAddr);
    await core.connect(userB).register(ADDRS.OWNER);   // userB 注册成为新推荐人

    // userA 无下线，可修改推荐人
    await core.connect(ownerSigner).changeReferrer(userAAddr, userBAddr);

    const [newRef] = await core.getUser(userAAddr);
    expect(newRef).to.equal(userBAddr);
  });

  it("changeReferrer: 有下线时 revert", async () => {
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();

    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(refAddr);
    await core.connect(userB).register(userAAddr);   // userB 是 userA 的下线

    await expect(
      core.connect(ownerSigner).changeReferrer(userAAddr, ADDRS.OWNER)
    ).to.be.revertedWith("user has children");
  });

  it("setUserLevel: 只升不降（DQMCore 内部等级）", async () => {
    const userAAddr = await userA.getAddress();
    await core.connect(userA).register(ADDRS.OWNER);

    await core.connect(ownerSigner).setUserLevel(userAAddr, 2);
    // getUser 返回 (referrer, directCount, level, totalInvest, childrenCount)
    const [, , lvl1] = await core.getUser(userAAddr);
    expect(lvl1).to.equal(2);

    // 尝试降级 → 不生效
    await core.connect(ownerSigner).setUserLevel(userAAddr, 1);
    const [, , lvl2] = await core.getUser(userAAddr);
    expect(lvl2).to.equal(2);
  });

  it("depositForUser: 管理员代入金，totalInvest 正确记录", async () => {
    const userAAddr = await userA.getAddress();
    await core.connect(userA).register(ADDRS.OWNER);

    // 给 OWNER 铸造 SOL 并 approve
    await solToken.mint(ADDRS.OWNER, E("1"));
    await solToken.connect(ownerSigner).approve(await core.getAddress(), E("1"));
    await core.connect(ownerSigner).depositForUser(userAAddr, E("1"));

    const [, , , totalInvest] = await core.getUser(userAAddr);
    expect(totalInvest).to.equal(E("1"));
  });

  it("batchSetDepositWhiteList: 批量设置白名单", async () => {
    const addrs = [await userA.getAddress(), await userB.getAddress()];
    await core.connect(ownerSigner).batchSetDepositWhiteList(addrs, true);
    expect(await core.depositWhiteList(addrs[0])).to.be.true;
    expect(await core.depositWhiteList(addrs[1])).to.be.true;
  });
});

// =========================================================
// ====  TEST SUITE 9: 管理奖级差制分配 (_distMgr)  =========
// =========================================================

describe("9. 管理奖级差制分配 (_distMgr)", function () {
  let ownerSigner: Signer;
  let s3user: Signer;     // 推荐链最顶端，设为 S3
  let referrer: Signer;   // 中间层，设为 S2
  let userA: Signer;      // 入金方

  let solToken: Contract;
  let router: Contract;
  let lpPair: Contract;
  let dqToken: Contract;
  let stakeCore: Contract;
  let core: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [, referrer, userA, , s3user] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCode(ADDRS.SOL, "MockERC20Token");
    router   = await setCode(ADDRS.ROUTER, "MockPancakeRouterFull");
    lpPair   = await ethers.deployContract("MockPairToken");
    dqToken  = await ethers.deployContract("MockERC20Token");
    await lpPair.waitForDeployment();
    await dqToken.waitForDeployment();
    await lpPair.initialize("LP", "LP");
    await dqToken.initialize("DQ", "DQ", 18);
    await solToken.initialize("SOL", "SOL", 18);
    await router.initialize(await lpPair.getAddress());

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    core      = await ethers.deployContract("DQMCore");
    await stakeCore.waitForDeployment();
    await core.waitForDeployment();

    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await referrer.getAddress());
    await core.connect(ownerSigner).setINS(await referrer.getAddress());
    await core.connect(ownerSigner).setOP(await referrer.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0);

    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await referrer.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await referrer.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await referrer.getAddress());

    for (const sig of [referrer, userA, s3user]) {
      await solToken.mint(await sig.getAddress(), E("100"));
    }
  });

  it("S2 上级获得管理奖：差额 10% × mgrPool", async () => {
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();

    // 注册链：OWNER ← referrer ← userA
    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(refAddr);

    // referrer 入金 1 SOL → stakeCore.userEnergy[referrer] += 0.5*3 = 1.5
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    // 设置 referrer S等级 = 2（S2，mgrRates[1]=10）
    await stakeCore.connect(ownerSigner).setUserLevel(refAddr, 2);

    const pendingBefore = await stakeCore.userPendingSOL(refAddr);

    // userA 入金 1 SOL
    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const pendingAfter = await stakeCore.userPendingSOL(refAddr);
    const gained = pendingAfter - pendingBefore;

    // dyn=0.5 SOL
    // direct = 0.5 * 30% = 0.15
    // see(depth=1) = 0.5 * 1% = 0.005
    // mgr(S2, diff=10%) = 0.15 * 10/100 = 0.015
    // total = 0.17 SOL
    expect(gained).to.equal(E("0.17"));
  });

  it("级差制：S3 只比 S2 多获得差额 5% 管理奖 + see 奖", async () => {
    const s3Addr    = await s3user.getAddress();
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();

    // 注册链：OWNER ← s3user ← referrer ← userA
    await core.connect(s3user).register(ADDRS.OWNER);
    await core.connect(referrer).register(s3Addr);
    await core.connect(userA).register(refAddr);

    // s3user 和 referrer 各入金 1 SOL 获取能量
    await solToken.connect(s3user).approve(await core.getAddress(), E("1"));
    await core.connect(s3user).deposit(E("1"));
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    // 设置等级：referrer=S2 (10%), s3user=S3 (15%)
    await stakeCore.connect(ownerSigner).setUserLevel(refAddr, 2);
    await stakeCore.connect(ownerSigner).setUserLevel(s3Addr, 3);

    const s3Before = await stakeCore.userPendingSOL(s3Addr);

    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const s3After = await stakeCore.userPendingSOL(s3Addr);
    const s3Gain  = s3After - s3Before;

    // s3user 收到：
    //   see(depth=2) = 0.005
    //   mgr 差额(S3 15% - S2 10% = 5%) = 0.15 * 5/100 = 0.0075
    //   total = 0.0125
    expect(s3Gain).to.equal(E("0.0125"));
  });

  it("无能量时跳过管理奖分配（referrer 能量为 0）", async () => {
    const refAddr   = await referrer.getAddress();
    const userAAddr = await userA.getAddress();

    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(refAddr);

    // referrer 不入金（stakeCore.userEnergy[referrer] = 0），但设 S2
    await stakeCore.connect(ownerSigner).setUserLevel(refAddr, 2);

    const pendingBefore = await stakeCore.userPendingSOL(refAddr);

    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const pendingAfter = await stakeCore.userPendingSOL(refAddr);
    // 能量 = 0，所有奖励跳过
    expect(pendingAfter).to.equal(pendingBefore);
  });

  it("mgrRates 数组正确初始化：[5, 10, 15, 20, 25, 30]", async () => {
    for (let i = 0; i < 6; i++) {
      const rate = await stakeCore.mgrRates(i);
      expect(rate).to.equal([5, 10, 15, 20, 25, 30][i]);
    }
  });
});

// =========================================================
// ====  TEST SUITE 10: D等级爆块奖励  ======================
// =========================================================

describe("10. D等级爆块奖励 (distributeDRankReward / claimDRankReward)", function () {
  let deployer: Signer;
  let ownerSigner: Signer;
  let d1User: Signer;
  let stranger: Signer;

  let dqToken: Contract;
  let stakeCore: Contract;
  let coreMock: Contract;
  let mine: Contract;

  const INITIAL_SUPPLY = E("100000000000");

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [deployer, d1User, stranger] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    dqToken  = await ethers.deployContract("MockERC20Token");
    coreMock = await ethers.deployContract("MockDQMCoreForStake");
    await dqToken.waitForDeployment();
    await coreMock.waitForDeployment();
    await dqToken.initialize("DQ", "DQ", 18);

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    await stakeCore.waitForDeployment();

    mine = await ethers.deployContract("DQMiningStakeMine", [
      await dqToken.getAddress(),
      await stakeCore.getAddress(),
      ADDRS.FOUNDATION,
      ADDRS.PARTNER,
    ]);
    await mine.waitForDeployment();

    await mine.connect(deployer).setInitialTotalSupply(INITIAL_SUPPLY);
    await mine.connect(deployer).setDLevelPool(await stakeCore.getAddress());
    await stakeCore.connect(ownerSigner).setMiningContract(await mine.getAddress());
    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await coreMock.getAddress());

    // 铸 DQ 给 mine（底池）
    await dqToken.mint(await mine.getAddress(), INITIAL_SUPPLY);

    // 注册 d1User 为 D1 等级
    await stakeCore.connect(ownerSigner).registerDLevel(await d1User.getAddress(), 1);
  });

  it("注册 D1 等级后 dLevelCount[0] = 1，userDLevel = 1", async () => {
    expect(await stakeCore.dLevelCount(0)).to.equal(1);
    expect(await stakeCore.userDLevel(await d1User.getAddress())).to.equal(1);
  });

  it("爆块后 dLevelAccReward[0] 增加", async () => {
    const accBefore = await stakeCore.dLevelAccReward(0);
    await advanceTime(24 * 3600 + 60);
    await mine.mine();
    const accAfter = await stakeCore.dLevelAccReward(0);
    expect(accAfter).to.be.gt(accBefore);
  });

  it("claimDRankReward: D1 用户领取后 DQ 余额增加", async () => {
    await advanceTime(24 * 3600 + 60);
    await mine.mine();

    const acc = await stakeCore.dLevelAccReward(0);
    expect(acc).to.be.gt(0n);

    const d1Addr  = await d1User.getAddress();
    const dqBefore = await dqToken.balanceOf(d1Addr);
    await stakeCore.connect(d1User).claimDRankReward();
    const dqAfter  = await dqToken.balanceOf(d1Addr);

    // 只有 1 个 D1 用户，得到全部 acc / 1 = acc
    expect(dqAfter - dqBefore).to.equal(acc);
  });

  it("claimDRankReward: 重复领取后余额不再增加", async () => {
    await advanceTime(24 * 3600 + 60);
    await mine.mine();

    await stakeCore.connect(d1User).claimDRankReward();
    const balAfterFirst = await dqToken.balanceOf(await d1User.getAddress());

    // 第二次：debt 已更新，reward = 0，函数静默返回
    await stakeCore.connect(d1User).claimDRankReward();
    const balAfterSecond = await dqToken.balanceOf(await d1User.getAddress());

    expect(balAfterSecond).to.equal(balAfterFirst);
  });

  it("未注册 D等级用户 claimDRankReward revert", async () => {
    await advanceTime(24 * 3600 + 60);
    await mine.mine();
    await expect(stakeCore.connect(stranger).claimDRankReward())
      .to.be.revertedWith("!dLevel");
  });

  it("多次爆块累积后一次性领取", async () => {
    // 爆块 3 次
    for (let i = 0; i < 3; i++) {
      await advanceTime(24 * 3600 + 60);
      await mine.mine();
    }

    const acc = await stakeCore.dLevelAccReward(0);

    const d1Addr   = await d1User.getAddress();
    const dqBefore = await dqToken.balanceOf(d1Addr);
    await stakeCore.connect(d1User).claimDRankReward();
    const dqAfter  = await dqToken.balanceOf(d1Addr);

    expect(dqAfter - dqBefore).to.equal(acc);
  });
});

// =========================================================
// ====  TEST SUITE 11: LP权益授权与奖励领取  ===============
// =========================================================

describe("11. LP权益授权与奖励领取", function () {
  let deployer: Signer;
  let ownerSigner: Signer;
  let alice: Signer;
  let stranger: Signer;

  let solToken: Contract;
  let router: Contract;
  let lpPair: Contract;
  let dqToken: Contract;
  let stakeCore: Contract;
  let mine: Contract;
  let core: Contract;

  const INITIAL_SUPPLY = E("100000000000");

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [deployer, alice, stranger] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCode(ADDRS.SOL, "MockERC20Token");
    router   = await setCode(ADDRS.ROUTER, "MockPancakeRouterFull");
    lpPair   = await ethers.deployContract("MockPairToken");
    dqToken  = await ethers.deployContract("MockERC20Token");
    await lpPair.waitForDeployment();
    await dqToken.waitForDeployment();
    await lpPair.initialize("LP", "LP");
    await dqToken.initialize("DQ", "DQ", 18);
    await solToken.initialize("SOL", "SOL", 18);
    await router.initialize(await lpPair.getAddress());

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    core      = await ethers.deployContract("DQMCore");
    mine      = await ethers.deployContract("DQMiningStakeMine", [
      await dqToken.getAddress(),
      await stakeCore.getAddress(),
      ADDRS.FOUNDATION,
      ADDRS.PARTNER,
    ]);
    await stakeCore.waitForDeployment();
    await core.waitForDeployment();
    await mine.waitForDeployment();

    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await alice.getAddress());
    await core.connect(ownerSigner).setINS(await alice.getAddress());
    await core.connect(ownerSigner).setOP(await alice.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0);

    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setMiningContract(await mine.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await alice.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await alice.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await alice.getAddress());

    await mine.connect(deployer).setInitialTotalSupply(INITIAL_SUPPLY);
    await mine.connect(deployer).setDLevelPool(await stakeCore.getAddress());

    await dqToken.mint(await mine.getAddress(), INITIAL_SUPPLY);
    await solToken.mint(await alice.getAddress(), E("10"));
  });

  it("入金后 lpEquity 自动设置（stakeCore.lpEquity > 0）", async () => {
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    const equity = await stakeCore.lpEquity(await alice.getAddress());
    expect(equity).to.be.gt(0n);
  });

  it("authorizeLPEquity: 额外铸造钱包 LP 后重新授权，权益增加或持平", async () => {
    const aliceAddr = await alice.getAddress();
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    const equityBefore = await stakeCore.lpEquity(aliceAddr);

    // 模拟 alice 在市场获取了更多 LP（mint 到钱包）
    await lpPair.mint(aliceAddr, E("5"));
    await stakeCore.connect(alice).authorizeLPEquity();

    const equityAfter = await stakeCore.lpEquity(aliceAddr);
    // 权益取 min(walletLP, userLP)，额外 LP 不超过 userLP 上限
    expect(equityAfter).to.be.gte(equityBefore);
  });

  it("爆块后 lA 增加，LP 权益待领取奖励 > 0", async () => {
    const aliceAddr = await alice.getAddress();
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    expect(await stakeCore.lpEquity(aliceAddr)).to.be.gt(0n);

    await advanceTime(24 * 3600 + 60);
    const lABefore = await stakeCore.lA();
    await mine.mine();
    const lAAfter = await stakeCore.lA();

    expect(lAAfter).to.be.gt(lABefore);

    const pending = await stakeCore.getLPEquityPending(aliceAddr);
    expect(pending).to.be.gt(0n);
  });

  it("claimLPEquityReward: 爆块后领取，DQ 余额增加", async () => {
    const aliceAddr = await alice.getAddress();
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    await advanceTime(24 * 3600 + 60);
    await mine.mine();

    const dqBefore = await dqToken.balanceOf(aliceAddr);
    await stakeCore.connect(alice).claimLPEquityReward();
    const dqAfter  = await dqToken.balanceOf(aliceAddr);

    expect(dqAfter).to.be.gt(dqBefore);
  });

  it("claimLPEquityReward: 重复领取后余额不再增加", async () => {
    const aliceAddr = await alice.getAddress();
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    await advanceTime(24 * 3600 + 60);
    await mine.mine();

    await stakeCore.connect(alice).claimLPEquityReward();
    const balAfterFirst = await dqToken.balanceOf(aliceAddr);

    // 再次领取 reward=0 → revert "!reward"
    await expect(stakeCore.connect(alice).claimLPEquityReward())
      .to.be.revertedWith("!reward");

    expect(await dqToken.balanceOf(aliceAddr)).to.equal(balAfterFirst);
  });

  it("无 LP 权益的地址 claimLPEquityReward revert", async () => {
    await expect(stakeCore.connect(stranger).claimLPEquityReward())
      .to.be.revertedWith("!equity");
  });

  it("getLPEquityInfo: 入金后 equityLP > 0，totalEquity = staked + equity", async () => {
    const aliceAddr = await alice.getAddress();
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    const [stakedLP, equityLP, totalEquity, walletLP] =
      await stakeCore.getLPEquityInfo(aliceAddr);

    // 入金后 equityLP 自动设置（由 deposit 流程写入 lpEquity[user]）
    expect(equityLP).to.be.gt(0n);
    // 总权益 = stakedLP + equityLP（此时 stakedLP = 0，未显式质押 LP）
    expect(totalEquity).to.equal(stakedLP + equityLP);
  });
});

// =========================================================
// ====  TEST SUITE 12: 每日入金限制  =======================
// =========================================================

describe("12. 每日入金限制（depositWhiteList / dailyDeposit）", function () {
  let ownerSigner: Signer;
  let normalUser: Signer;
  let vipUser: Signer;

  let solToken: Contract;
  let router: Contract;
  let lpPair: Contract;
  let dqToken: Contract;
  let stakeCore: Contract;
  let core: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [, normalUser, vipUser] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    solToken = await setCode(ADDRS.SOL, "MockERC20Token");
    router   = await setCode(ADDRS.ROUTER, "MockPancakeRouterFull");
    lpPair   = await ethers.deployContract("MockPairToken");
    dqToken  = await ethers.deployContract("MockERC20Token");
    await lpPair.waitForDeployment();
    await dqToken.waitForDeployment();
    await lpPair.initialize("LP", "LP");
    await dqToken.initialize("DQ", "DQ", 18);
    await solToken.initialize("SOL", "SOL", 18);
    await router.initialize(await lpPair.getAddress());

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    core      = await ethers.deployContract("DQMCore");
    await stakeCore.waitForDeployment();
    await core.waitForDeployment();

    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await normalUser.getAddress());
    await core.connect(ownerSigner).setINS(await normalUser.getAddress());
    await core.connect(ownerSigner).setOP(await normalUser.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0);

    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await normalUser.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await normalUser.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await normalUser.getAddress());

    for (const sig of [normalUser, vipUser]) {
      await solToken.mint(await sig.getAddress(), E("100"));
    }

    // 注册用户（currentDepositLimit = 1 SOL）
    await core.connect(normalUser).register(ADDRS.OWNER);
    await core.connect(vipUser).register(ADDRS.OWNER);
  });

  it("非白名单：首次 1 SOL（最小额）入金成功，dailyDeposit 累计", async () => {
    const normalAddr = await normalUser.getAddress();
    await solToken.connect(normalUser).approve(await core.getAddress(), E("10"));
    await core.connect(normalUser).deposit(E("1"));
    expect(await core.dailyDeposit(normalAddr)).to.equal(E("1"));
  });

  it("非白名单：第一次入金 1 SOL 后，累计第二次 revert '!lim'", async () => {
    await solToken.connect(normalUser).approve(await core.getAddress(), E("10"));
    await core.connect(normalUser).deposit(E("1"));   // OK，恰好等于限额
    // 累计 1+1=2 > 1 → "!lim"
    await expect(core.connect(normalUser).deposit(E("1")))
      .to.be.revertedWith("!lim");
  });

  it("非白名单：单次超过 depositLimit revert '!limit'", async () => {
    await solToken.connect(normalUser).approve(await core.getAddress(), E("10"));
    await expect(core.connect(normalUser).deposit(E("2")))
      .to.be.revertedWith("!limit");
  });

  it("白名单用户：多次入金累计可超过 depositLimit", async () => {
    const vipAddr = await vipUser.getAddress();
    await core.connect(ownerSigner).setDepositWhiteList(vipAddr, true);

    await solToken.connect(vipUser).approve(await core.getAddress(), E("10"));
    await core.connect(vipUser).deposit(E("1"));   // 1 ether == limit，OK
    await core.connect(vipUser).deposit(E("1"));   // 白名单第 2 次，不受累计限制

    expect(await core.totalInvested()).to.be.gte(E("2"));
  });

  it("setDepositWhiteList: 加入/移出白名单状态正确", async () => {
    const normalAddr = await normalUser.getAddress();

    await core.connect(ownerSigner).setDepositWhiteList(normalAddr, true);
    expect(await core.depositWhiteList(normalAddr)).to.be.true;

    await core.connect(ownerSigner).setDepositWhiteList(normalAddr, false);
    expect(await core.depositWhiteList(normalAddr)).to.be.false;
  });

  it("advancePhase: 限额增加 5 SOL，非白名单可入金更多", async () => {
    // 初始 limit = 1 SOL，advancePhase → 6 SOL
    await core.connect(ownerSigner).advancePhase();
    expect(await core.currentDepositLimit()).to.equal(E("6"));

    await solToken.connect(normalUser).approve(await core.getAddress(), E("5"));
    await core.connect(normalUser).deposit(E("5"));   // 5 ≤ 6 → OK
    expect(await core.dailyDeposit(await normalUser.getAddress())).to.equal(E("5"));
  });

  it("setDepositLimit: 直接设置限额不超 MAX_LIMIT", async () => {
    await core.connect(ownerSigner).setDepositLimit(E("50"));
    expect(await core.currentDepositLimit()).to.equal(E("50"));
  });

  it("setDepositLimit: 超 MAX_LIMIT（200 SOL）revert", async () => {
    await expect(
      core.connect(ownerSigner).setDepositLimit(E("201"))
    ).to.be.revertedWith("!max");
  });
});
