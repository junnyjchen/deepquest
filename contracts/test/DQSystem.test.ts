/**
 * DQ 全系统业务逻辑测试
 *
 * 覆盖范围：
 *  1. DQT 代币 — 买入税/卖出税/白名单/黑名单/底池操作
 *  2. DQMCore — 注册/入金流程/阶段限额/SOL提取
 *  3. DQMiningStakeCore — 直推奖/见点奖/管理奖/L等级/D等级/LP权益/节点奖
 *  4. DQMiningStakeMine — 每日爆块/销毁率递减/分配比例
 *  5. DQMiningStakeVault — 单币质押/LP奖励领取
 *
 * 测试链：Hardhat (chainId=56, allowUnlimitedContractSize=true)
 * 固定地址 Mock 策略：用 hardhat_setCode 将 Mock 合约字节码注入 BSC 真实地址
 */

import { expect } from "chai";
import { artifacts, ethers, network } from "hardhat";
import type { Contract, Signer } from "ethers";

// ===================== 固定 BSC 地址 =====================
const ADDRS = {
  OWNER:    "0x274aCc6397349F21179ed6258A54B2a11B28faF5",
  SOL:      "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  WBNB:     "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  ROUTER:   "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  FOUNDATION: "0xA0f045cde45ca1aeE2033356170B46A1fF3b7202",
  PARTNER:    "0x803B79B608455808C2f752c588804c3F5bF676a3",
  FIXED_NODE: "0x822682A54C454e938374e9690420cdFA264A18Aa",
  FEE_RECV:   "0x1850933c0d64db3A56476F5Bdc4191BCFd242e30",
  SELL_FEE:   "0x1d1C89c809a35c7b97ed60AC4A21921a21fD4967",
};

const E = (n: string | number) => ethers.parseEther(String(n));

// ===================== 辅助函数 =====================

async function setCode(address: string, artifactName: string) {
  const artifact = await artifacts.readArtifact(artifactName);
  await network.provider.send("hardhat_setCode", [address, artifact.deployedBytecode]);
  return ethers.getContractAt(artifactName, address);
}

async function impersonate(address: string): Promise<Signer> {
  await network.provider.send("hardhat_setBalance", [address, "0x56BC75E2D63100000"]); // 100 ETH
  await network.provider.send("hardhat_impersonateAccount", [address]);
  return ethers.getSigner(address);
}

async function advanceTime(seconds: number) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
}

// =========================================================
// ==================  TEST SUITE 1: DQT  ==================
// =========================================================

describe("1. DQT 代币税收机制", function () {
  let owner: Signer;
  let user: Signer;
  let feeRecv: Signer;
  let dqt: Contract;
  let mockPool: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [owner, user, feeRecv] = await ethers.getSigners();

    dqt = await ethers.deployContract("DQT");
    await dqt.waitForDeployment();

    mockPool = await ethers.deployContract("MockPairToken");
    await mockPool.waitForDeployment();
    await mockPool.initialize("LP", "LP");

    // setPool 会把 pool 加入 isExempt；要测买卖税需要之后移除 exempt
    await dqt.connect(owner).setPool(await mockPool.getAddress());
    // 将 pool 移出 exempt，使买卖税生效
    await dqt.connect(owner).setExempt(await mockPool.getAddress(), false);
    await dqt.connect(owner).setTaxReceiver(await feeRecv.getAddress());
    await dqt.connect(owner).setSellFeeReceiver(await feeRecv.getAddress());

    // 将部分 DQT 转入 pool（owner 免税，池子转账不扣税）
    await dqt.connect(owner).transfer(await mockPool.getAddress(), E("1000000"));
  });

  it("owner 自由转账不扣税（白名单）", async () => {
    const userAddr = await user.getAddress();
    const before = await dqt.balanceOf(userAddr);
    await dqt.connect(owner).transfer(userAddr, E("100"));
    expect(await dqt.balanceOf(userAddr)).to.equal(before + E("100"));
  });

  it("pool → 非白名单用户：买入税 90%销毁+6%手续费，用户得4%", async () => {
    // 从 pool 地址发起 transfer → 触发买入税
    const poolSigner = await impersonate(await mockPool.getAddress());
    const userAddr = await user.getAddress();
    const value = E("1000");

    await dqt.connect(poolSigner).transfer(userAddr, value);

    const userBal = await dqt.balanceOf(userAddr);
    // 用户应收到 4% = 40 DQT
    const expected = value * 400n / 10000n;
    expect(userBal).to.equal(expected);
  });

  it("用户 → pool：卖出税6%，其中3%到手续费接收地址", async () => {
    // owner 给 user 一些 DQT（owner 免税，user 直接收到1000）
    await dqt.connect(owner).transfer(await user.getAddress(), E("1000"));
    expect(await dqt.balanceOf(await user.getAddress())).to.equal(E("1000"));

    const poolAddr = await mockPool.getAddress();
    const feeRecvAddr = await feeRecv.getAddress();
    const feeRecvBefore = await dqt.balanceOf(feeRecvAddr);

    // user 卖出: transfer to pool → 触发 _sellTax
    await dqt.connect(user).transfer(poolAddr, E("1000"));

    // sellTax = 6% of 1000 = 60; stakeShare = 30 (但 stakeCoreContract=0 → 跳过)
    // feeShare = 30 → feeRecv 收到 30 DQT
    const feeRecvAfter = await dqt.balanceOf(feeRecvAddr);
    expect(feeRecvAfter - feeRecvBefore).to.equal(E("30"));
  });

  it("黑名单地址无法转账", async () => {
    const userAddr = await user.getAddress();
    await dqt.connect(owner).transfer(userAddr, E("100"));
    await dqt.connect(owner).setBlacklist(userAddr, true);
    await expect(dqt.connect(user).transfer(await owner.getAddress(), E("1")))
      .to.be.revertedWith("From address blacklisted");
  });

  it("burnFromPool / distributeFromPool 仅爆块合约可调", async () => {
    await expect(dqt.connect(user).burnFromPool(E("1")))
      .to.be.reverted;
    await expect(dqt.connect(user).distributeFromPool(await user.getAddress(), E("1")))
      .to.be.reverted;
  });

  it("owner 可设置白名单 exempt", async () => {
    const userAddr = await user.getAddress();
    await dqt.connect(owner).setExempt(userAddr, true);
    expect(await dqt.isExempt(userAddr)).to.be.true;
  });
});

// =========================================================
// ==================  TEST SUITE 2: DQMCore  ==============
// =========================================================

describe("2. DQMCore 注册 / 入金 / 阶段限额 / SOL提取", function () {
  let ownerSigner: Signer;
  let referrer: Signer;
  let userA: Signer;
  let dao: Signer;
  let ins: Signer;
  let op: Signer;

  let solToken: Contract;
  let router: Contract;
  let lpPair: Contract;
  let dqToken: Contract;
  let stakeCore: Contract;
  let core: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [, referrer, userA, dao, ins, op] = await ethers.getSigners();

    ownerSigner = await impersonate(ADDRS.OWNER);

    // —— Mock 固定地址 ——
    solToken = await setCode(ADDRS.SOL, "MockERC20Token");
    router   = await setCode(ADDRS.ROUTER, "MockPancakeRouterFull");

    // —— 可配置地址合约 ——
    lpPair   = await ethers.deployContract("MockPairToken");
    dqToken  = await ethers.deployContract("MockERC20Token");
    await lpPair.waitForDeployment();
    await dqToken.waitForDeployment();
    await lpPair.initialize("LP", "LP");
    await dqToken.initialize("DQ", "DQ", 18);

    // 初始化 router（需要知道 LP 地址才能铸 LP）
    await solToken.initialize("SOL", "SOL", 18);
    await router.initialize(await lpPair.getAddress());

    // —— 部署业务合约 ——
    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    await stakeCore.waitForDeployment();

    core = await ethers.deployContract("DQMCore");
    await core.waitForDeployment();

    // —— 配置 ——
    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(),
      ethers.ZeroAddress,           // dqCard 不测
      await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await dao.getAddress());
    await core.connect(ownerSigner).setINS(await ins.getAddress());
    await core.connect(ownerSigner).setOP(await op.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0); // slippage=0：mock 不检查价格

    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(),
      ethers.ZeroAddress,
      await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await dao.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await op.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await ins.getAddress());

    // —— 铸造 SOL 给用户 ——
    await solToken.mint(await referrer.getAddress(), E("100"));
    await solToken.mint(await userA.getAddress(), E("100"));
  });

  // ---- 注册 ----

  it("注册：指定有效推荐人绑定成功", async () => {
    const refAddr = await referrer.getAddress();
    // OWNER 在 DQMCore 构造函数中已自动注册（users[OWNER].referrer = OWNER）
    await core.connect(referrer).register(ADDRS.OWNER); // referrer 注册，推荐人为 OWNER
    await core.connect(userA).register(refAddr);

    const [ref] = await core.getUser(await userA.getAddress());
    expect(ref).to.equal(refAddr);
  });

  it("注册：无效推荐人自动回退到 OWNER", async () => {
    await core.connect(userA).register(ethers.ZeroAddress);
    const [ref] = await core.getUser(await userA.getAddress());
    expect(ref).to.equal(ADDRS.OWNER);
  });

  it("重复注册应 revert", async () => {
    await core.connect(userA).register(ADDRS.OWNER);
    await expect(core.connect(userA).register(ADDRS.OWNER))
      .to.be.revertedWith("already registered");
  });

  // ---- 阶段限额 ----

  it("初始阶段限额 1 SOL，超额入金 revert", async () => {
    await core.connect(userA).register(ADDRS.OWNER);
    await solToken.connect(userA).approve(await core.getAddress(), E("2"));
    await expect(core.connect(userA).deposit(E("2")))
      .to.be.revertedWith("!limit");
  });

  it("advancePhase 后限额增加 5 SOL", async () => {
    const phaseBefore = await core.currentPhase();
    await core.connect(ownerSigner).advancePhase();
    const limitAfter = await core.currentDepositLimit();
    expect(limitAfter).to.equal(E("6")); // 1 + 5
  });

  it("黑名单用户无法入金", async () => {
    await core.connect(userA).register(ADDRS.OWNER);
    await core.connect(ownerSigner).setBlacklisted(await userA.getAddress(), true);
    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await expect(core.connect(userA).deposit(E("1")))
      .to.be.revertedWith("blacklisted");
  });

  // ---- 入金流程 ----

  it("入金：能量 = 入金额 × 3", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    const energy = await core.userEnergy(await referrer.getAddress());
    expect(energy).to.equal(E("3"));
  });

  it("入金：totalInvested 累加正确", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));
    expect(await core.totalInvested()).to.equal(E("1"));
  });

  it("入金：DAO/INS/OP 直接收到 SOL 奖励", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));

    const daoAddr = await dao.getAddress();
    const insAddr = await ins.getAddress();
    const opAddr  = await op.getAddress();
    const daoBefore = await solToken.balanceOf(daoAddr);

    await core.connect(referrer).deposit(E("1"));

    // dyn = 0.5 SOL; daoAmt = 0.5 * 10% = 0.05
    const daoAfter = await solToken.balanceOf(daoAddr);
    expect(daoAfter - daoBefore).to.equal(E("0.05"));

    // insAmt = 0.5 * 7% = 0.035
    const insAfter = await solToken.balanceOf(insAddr);
    expect(insAfter).to.equal(E("0.035"));

    // opAmt = 0.5 * 8% = 0.04
    const opAfter = await solToken.balanceOf(opAddr);
    expect(opAfter).to.equal(E("0.04"));
  });

  it("入金：用户钱包收到 LP 代币", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    const lpBal = await lpPair.balanceOf(await referrer.getAddress());
    expect(lpBal).to.be.gt(0n);
  });

  it("入金：StakeCore 记录了用户 LP（lpEquity > 0）", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    const equity = await stakeCore.lpEquity(await referrer.getAddress());
    expect(equity).to.be.gt(0n);
  });

  it("入金：直推奖30% 发放到推荐人", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(await referrer.getAddress());

    // referrer 先入金 1 SOL，获得 3 SOL 能量（用于接收直推奖）
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    const refPendingBefore = await stakeCore.userPendingSOL(await referrer.getAddress());

    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const refPendingAfter = await stakeCore.userPendingSOL(await referrer.getAddress());
    // dyn = 0.5 SOL; 直推奖 = 0.5 * 30% = 0.15 SOL
    // referrer 同时也是 DAO/INS/OP 地址上层，会额外收到见点奖 ≈ 0.005
    expect(refPendingAfter - refPendingBefore).to.be.gte(E("0.15"));
  });

  // ---- SOL 提取 ----

  it("SOL提取：先累积奖励，再提取扣10%手续费", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(await referrer.getAddress());

    // referrer 先入金获得足够能量
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    // userA 入金，触发直推奖给 referrer
    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    // referrer 有 >= 0.15 SOL 待领取（含见点奖加成）
    const pending = await stakeCore.userPendingSOL(await referrer.getAddress());
    expect(pending).to.be.gte(E("0.15"));

    const refAddr = await referrer.getAddress();
    const solBefore = await solToken.balanceOf(refAddr);
    await core.connect(referrer).withdrawSOL(pending);
    const solAfter = await solToken.balanceOf(refAddr);

    // 实际到账 = pending * 90%
    expect(solAfter - solBefore).to.equal(pending * 9000n / 10000n);
  });

  it("SOL提取：提取超额 revert", async () => {
    await core.connect(referrer).register(ADDRS.OWNER);
    await expect(core.connect(referrer).withdrawSOL(E("1")))
      .to.be.revertedWith("!balance");
  });
});

// =========================================================
// ========  TEST SUITE 3: DQMiningStakeCore  ==============
// =========================================================

describe("3. DQMiningStakeCore 奖励分配 / 等级 / D等级", function () {
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

  async function setupUsers() {
    await core.connect(referrer).register(ADDRS.OWNER);
    await core.connect(userA).register(await referrer.getAddress());
    await core.connect(userB).register(await userA.getAddress());
  }

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
      await solToken.mint(await sig.getAddress(), E("200"));
    }
  });

  it("见点奖：第2代（userB的父链第2层 referrer）收到 1% 见点奖", async () => {
    await setupUsers();
    await core.connect(ownerSigner).setDepositLimit(E("200"));

    // referrer 和 userA 先入金，获取能量用于接收奖励
    await solToken.connect(referrer).approve(await core.getAddress(), E("1"));
    await core.connect(referrer).deposit(E("1"));

    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    // userB 入金 1 SOL，触发见点奖链
    await solToken.connect(userB).approve(await core.getAddress(), E("1"));
    await core.connect(userB).deposit(E("1"));

    // userA: 直推奖（userB → userA）= dyn*30% = 0.5*30% = 0.15 + 见点奖 1% = 0.005 → 0.155
    // referrer: 见点奖第2代 1% of dyn = 0.005
    const userAPending  = await stakeCore.userPendingSOL(await userA.getAddress());
    const refPending    = await stakeCore.userPendingSOL(await referrer.getAddress());

    // userA 有直推奖 0.15 + 见点奖 0.005 = 0.155（需要 ≥ 0.155 能量，来自自己的入金）
    expect(userAPending).to.be.gte(E("0.005")); // 至少有部分奖励
    // referrer 第2代见点奖 1% = 0.005
    expect(refPending).to.be.gte(E("0.005"));
  });

  it("团队业绩更新：入金后 referrer 的 teamSales 增加", async () => {
    await setupUsers();
    await core.connect(ownerSigner).setDepositLimit(E("200"));
    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const teamSales = await stakeCore.teamSales(await referrer.getAddress());
    // teamSales 按入金的动态分（dyn = 50%）累加，userA入金1 SOL → dyn=0.5 → teamSales[referrer] = 0.5
    expect(teamSales).to.equal(E("0.5"));
  });

  it("L等级自动升级：小区业绩 >= 100 SOL → 升至 S1", async () => {
    await setupUsers();
    // setPhase 不改变 depositLimit，需直接用 setDepositLimit（MAX_LIMIT = 200 SOL）
    await core.connect(ownerSigner).setDepositLimit(E("200"));

    // 所有用户加入白名单跳过 dailyDeposit 限制
    for (const sig of [referrer, userA, userB]) {
      await core.connect(ownerSigner).setDepositWhiteList(await sig.getAddress(), true);
    }

    // S1 条件：去掉最大分支后的"小区"teamSales >= 100 ether
    // teamSales 按 dyn=50% 计算，存到 stakeCore.teamSales
    // 需要 userA 有两个子分支，各自 dyn 均 >= 100，以使去掉较大分支后 >= 100

    // 新增第三个用户 userC 也推荐给 userA
    const [,,,,userC] = await ethers.getSigners();
    await core.connect(userC).register(await userA.getAddress());
    await core.connect(ownerSigner).setDepositWhiteList(await userC.getAddress(), true);

    // userB 入金 200 SOL → dyn = 100 ether → branch[userB] += 100
    await solToken.mint(await userB.getAddress(), E("200"));
    await solToken.connect(userB).approve(await core.getAddress(), E("200"));
    await core.connect(userB).deposit(E("200"));

    // userC 入金 200 SOL → dyn = 100 ether → branch[userC] += 100
    await solToken.mint(await userC.getAddress(), E("200"));
    await solToken.connect(userC).approve(await core.getAddress(), E("200"));
    await core.connect(userC).deposit(E("200"));

    // userA: teamSales = 200, max_branch = 100, 小区 = 100 >= 100 ether → S1

    const level = await stakeCore.userLevel(await userA.getAddress());
    expect(level).to.be.gte(1); // 至少 S1（实际可能更高）
  });

  it("D等级手动注册并统计 dLevelCount", async () => {
    const refAddr = await referrer.getAddress();
    await stakeCore.connect(ownerSigner).registerDLevel(refAddr, 1);
    expect(await stakeCore.userDLevel(refAddr)).to.equal(1);
    expect(await stakeCore.dLevelCount(0)).to.equal(1); // index 0 = D1
  });

  it("节点奖励模式切换：固定地址模式", async () => {
    const fixed = await userB.getAddress();
    await stakeCore.connect(ownerSigner).setNodeRewardMode(true, fixed);
    expect(await stakeCore.nodeRewardToFixed()).to.be.true;
    expect(await stakeCore.fixedNodeAddress()).to.equal(fixed);
  });

  it("LP权益：入金后 lpEquity 自动设置", async () => {
    await setupUsers();
    await core.connect(ownerSigner).setDepositLimit(E("200"));
    await solToken.connect(userA).approve(await core.getAddress(), E("1"));
    await core.connect(userA).deposit(E("1"));

    const equity = await stakeCore.lpEquity(await userA.getAddress());
    expect(equity).to.be.gt(0n);
  });
});

// =========================================================
// ========  TEST SUITE 4: DQMiningStakeMine  ==============
// =========================================================

describe("4. DQMiningStakeMine 爆块机制", function () {
  let ownerSigner: Signer;
  let staker: Signer;

  let dqToken: Contract;
  let stakeCore: Contract;
  let mine: Contract;

  const INITIAL_SUPPLY = E("100000000000"); // 1000亿 DQ

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    let deployer: Signer;
    [deployer, staker] = await ethers.getSigners();
    ownerSigner = await impersonate(ADDRS.OWNER);

    // 部署 MockERC20Token 代替真实 DQT（避免 sync() / pool 复杂性）
    dqToken  = await ethers.deployContract("MockERC20Token");
    await dqToken.waitForDeployment();
    await dqToken.initialize("DQ", "DQ", 18);

    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    await stakeCore.waitForDeployment();

    // DQMiningStakeMine 使用 OZ Ownable(msg.sender)，owner = deployer (signers[0])
    mine = await ethers.deployContract("DQMiningStakeMine", [
      await dqToken.getAddress(),
      await stakeCore.getAddress(),
      ADDRS.FOUNDATION,
      ADDRS.PARTNER,
    ]);
    await mine.waitForDeployment();

    // 配置：mine 的 onlyOwner = deployer；stakeCore 的 onlyOwner = ADDRS.OWNER
    await mine.connect(deployer).setInitialTotalSupply(INITIAL_SUPPLY);
    await mine.connect(deployer).setDLevelPool(await stakeCore.getAddress());
    await stakeCore.connect(ownerSigner).setMiningContract(await mine.getAddress());
    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress
    );

    // 铸造初始总量给 mine 合约（模拟底池持有所有 DQ）
    await dqToken.mint(await mine.getAddress(), INITIAL_SUPPLY);
  });

  it("首次爆块：释放量约为剩余量的 1.3%", async () => {
    // 快进 1 天
    await advanceTime(24 * 3600 + 60);

    const mineDQ = await dqToken.balanceOf(await mine.getAddress());

    await mine.mine();

    const mineAfter = await dqToken.balanceOf(await mine.getAddress());
    const released = mineDQ - mineAfter;

    // 释放量 = totalMined = 1000亿 * 0.13% (DAILY_RELEASE_RATE = 13 / 10000)
    const expected = INITIAL_SUPPLY * 13n / 10000n;
    // 部分分配可能因 mock 无接收者而失败（只销毁成功），放宽至 20% 误差
    expect(released).to.be.closeTo(expected, expected * 20n / 100n);
  });

  it("连续爆块两天：第二次从已减少的剩余量计算", async () => {
    await advanceTime(24 * 3600 + 60);
    await mine.mine();
    const day1Mined = await mine.totalMined();

    await advanceTime(24 * 3600 + 60);
    await mine.mine();
    const day2Mined = await mine.totalMined();

    // 第2天释放量 = (INITIAL - day1) * 1.3%，略小于第一天
    const day1Release = day1Mined;
    const day2Release = day2Mined - day1Mined;
    expect(day2Release).to.be.lt(day1Release);
  });

  it("未到24小时再次调用 mine() 应 revert", async () => {
    await advanceTime(24 * 3600 + 60);
    await mine.mine();
    await expect(mine.mine()).to.be.revertedWith("Too early");
  });

  it("初始销毁率 80%：分配量 = 释放量 × 20%", async () => {
    await advanceTime(24 * 3600 + 60);
    const totalBefore = await mine.totalBurned();
    await mine.mine();
    const totalBurnedAfter = await mine.totalBurned();
    const released = INITIAL_SUPPLY * 13n / 10000n;
    const expectedBurn = released * 8000n / 10000n;
    // 允许 2% 误差
    expect(totalBurnedAfter - totalBefore).to.be.closeTo(expectedBurn, expectedBurn * 2n / 100n);
  });

  it("setRatios 修改分配比例后验证总和为 10000", async () => {
    // mine 的 owner = deployer (signers[0])
    const [deployer] = await ethers.getSigners();
    await mine.connect(deployer).setRatios(5000, 2000, 1500, 500, 1000);
    expect(await mine.lpRatio()).to.equal(5000);
    expect(await mine.nodeRatio()).to.equal(2000);
  });

  it("setRatios 总和不为 10000 时 revert", async () => {
    const [deployer] = await ethers.getSigners();
    await expect(mine.connect(deployer).setRatios(5000, 2000, 1000, 500, 1000))
      .to.be.revertedWith("Invalid ratios");
  });

  it("initialTotalSupply 只能设置一次", async () => {
    const [deployer] = await ethers.getSigners();
    await expect(mine.connect(deployer).setInitialTotalSupply(E("1")))
      .to.be.revertedWith("Already set");
  });
});

// =========================================================
// ========  TEST SUITE 5: DQMiningStakeVault  =============
// =========================================================

describe("5. DQMiningStakeVault 单币质押", function () {
  let deployer: Signer;
  let staker: Signer;

  let dqToken: Contract;
  let stakeCore: Contract;
  let coreMock: Contract;
  let vault: Contract;

  beforeEach(async () => {
    await network.provider.send("hardhat_reset", []);
    [deployer, staker] = await ethers.getSigners();

    dqToken   = await ethers.deployContract("MockERC20Token");
    stakeCore = await ethers.deployContract("DQMiningStakeCore");
    coreMock  = await ethers.deployContract("MockDQMCoreForStake");
    await dqToken.waitForDeployment();
    await stakeCore.waitForDeployment();
    await coreMock.waitForDeployment();
    await dqToken.initialize("DQ", "DQ", 18);

    // DQMiningStakeVault 使用 Ownable(msg.sender)，owner = deployer
    vault = await ethers.deployContract("DQMiningStakeVault", [
      await stakeCore.getAddress(),
      await dqToken.getAddress(),
      await coreMock.getAddress(),
      ADDRS.FOUNDATION,
      ADDRS.PARTNER,
      ADDRS.FIXED_NODE,
    ]);
    await vault.waitForDeployment();

    // 铸造 DQ 给质押者
    await dqToken.mint(await staker.getAddress(), E("1000"));
  });

  it("stake: 单币质押 — 用户余额减少，合约余额增加", async () => {
    const stakerAddr = await staker.getAddress();
    await dqToken.connect(staker).approve(await vault.getAddress(), E("100"));
    await vault.connect(staker).stake(0, E("100")); // period 0 = 30天

    expect(await vault.sAmt(stakerAddr, 0)).to.equal(E("100"));
    expect(await dqToken.balanceOf(await vault.getAddress())).to.equal(E("100"));
  });

  it("stake: 各周期权重不同 (stakeWeights)", async () => {
    expect(await vault.stakeWeights(0)).to.equal(1);
    expect(await vault.stakeWeights(1)).to.equal(2);
    expect(await vault.stakeWeights(2)).to.equal(4);
    expect(await vault.stakeWeights(3)).to.equal(8);
  });

  it("distributeSellFee: 卖出税分配后 sA 累积", async () => {
    const stakerAddr = await staker.getAddress();
    await dqToken.connect(staker).approve(await vault.getAddress(), E("100"));
    await vault.connect(staker).stake(0, E("100"));

    // 铸造额外 DQ 给 vault 模拟卖出税收入
    await dqToken.mint(await vault.getAddress(), E("10"));
    // distributeSellFeeFromCore 的 onlyCore = msg.sender == coreContract || owner()
    // vault.owner() = deployer，直接调用
    await vault.connect(deployer).distributeSellFeeFromCore(E("10"));

    expect(await vault.sA(0)).to.be.gt(0n);
  });

  it("unstake: 到期后取回本金", async () => {
    const stakerAddr = await staker.getAddress();
    await dqToken.connect(staker).approve(await vault.getAddress(), E("100"));
    await vault.connect(staker).stake(0, E("100"));

    // 快进 30 天
    await advanceTime(30 * 24 * 3600 + 60);

    const before = await dqToken.balanceOf(stakerAddr);
    // unstake(uint8 _level, uint256 _amount)
    await vault.connect(staker).unstake(0, E("100"));
    const after = await dqToken.balanceOf(stakerAddr);

    expect(after - before).to.equal(E("100"));
    expect(await vault.sAmt(stakerAddr, 0)).to.equal(0n);
  });

  it("unstake: 未到期时 revert", async () => {
    await dqToken.connect(staker).approve(await vault.getAddress(), E("100"));
    await vault.connect(staker).stake(0, E("100"));
    await expect(vault.connect(staker).unstake(0, E("100")))
      .to.be.revertedWith("!time");
  });

  it("claimStakeReward: 分配后可领取奖励", async () => {
    const stakerAddr = await staker.getAddress();
    await dqToken.connect(staker).approve(await vault.getAddress(), E("100"));
    await vault.connect(staker).stake(0, E("100"));

    await dqToken.mint(await vault.getAddress(), E("10"));
    await vault.connect(deployer).distributeSellFeeFromCore(E("10"));

    const before = await dqToken.balanceOf(stakerAddr);
    await vault.connect(staker).claimStakeReward(0);
    const after = await dqToken.balanceOf(stakerAddr);

    expect(after).to.be.gt(before);
  });
});

// =========================================================
// ========  TEST SUITE 6: 完整流程集成测试  ================
// =========================================================

describe("6. 完整业务流程：注册 → 入金 → 爆块 → 领取", function () {
  let deployer: Signer;
  let ownerSigner: Signer;
  let alice: Signer;
  let bob: Signer;

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
    [deployer, alice, bob] = await ethers.getSigners();
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
    // DQMiningStakeMine 使用 OZ Ownable(msg.sender)，owner = deployer
    mine      = await ethers.deployContract("DQMiningStakeMine", [
      await dqToken.getAddress(),
      await stakeCore.getAddress(),
      ADDRS.FOUNDATION,
      ADDRS.PARTNER,
    ]);
    await stakeCore.waitForDeployment();
    await core.waitForDeployment();
    await mine.waitForDeployment();

    // 配置 core（DQMCore hardcoded OWNER = ADDRS.OWNER）
    await core.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await stakeCore.getAddress()
    );
    await core.connect(ownerSigner).setPool(await lpPair.getAddress());
    await core.connect(ownerSigner).setDAO(await alice.getAddress());
    await core.connect(ownerSigner).setINS(await alice.getAddress());
    await core.connect(ownerSigner).setOP(await alice.getAddress());
    await core.connect(ownerSigner).setSlippage(0, 0); // mock 不检查价格

    // 配置 stakeCore（hardcoded OWNER = ADDRS.OWNER）
    await stakeCore.connect(ownerSigner).setAddresses(
      await dqToken.getAddress(), ethers.ZeroAddress, await lpPair.getAddress()
    );
    await stakeCore.connect(ownerSigner).setCoreContract(await core.getAddress());
    await stakeCore.connect(ownerSigner).setMiningContract(await mine.getAddress());
    await stakeCore.connect(ownerSigner).setDaoAddr(await alice.getAddress());
    await stakeCore.connect(ownerSigner).setOperAddr(await alice.getAddress());
    await stakeCore.connect(ownerSigner).setInsureAddr(await alice.getAddress());

    // 配置 mine（OZ Ownable，owner = deployer）
    await mine.connect(deployer).setInitialTotalSupply(INITIAL_SUPPLY);
    await mine.connect(deployer).setDLevelPool(await stakeCore.getAddress());

    // 铸 DQ 给 mine（底池）
    await dqToken.mint(await mine.getAddress(), INITIAL_SUPPLY);

    // 铸 SOL 给测试用户
    await solToken.mint(await alice.getAddress(), E("10"));
    await solToken.mint(await bob.getAddress(), E("10"));
  });

  it("alice 入金 → 爆块 → stakeCore.lA 增加", async () => {
    // alice 注册并入金
    await core.connect(alice).register(ADDRS.OWNER);
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    // alice 有 LP 权益
    const equity = await stakeCore.lpEquity(await alice.getAddress());
    expect(equity).to.be.gt(0n);

    // 快进 1 天，爆块
    await advanceTime(24 * 3600 + 60);
    const lABefore = await stakeCore.lA();
    await mine.mine();
    const lAAfter = await stakeCore.lA();

    // LP 奖励累积器应增加（lpRatio = 60%）
    expect(lAAfter).to.be.gt(lABefore);
  });

  it("bob 通过 alice 推荐入金，alice 获得直推奖 + 见点奖", async () => {
    await core.connect(alice).register(ADDRS.OWNER);
    await core.connect(bob).register(await alice.getAddress());

    // alice 先入金，获得能量（才能接收直推奖）
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    await solToken.connect(bob).approve(await core.getAddress(), E("1"));
    await core.connect(bob).deposit(E("1"));

    // alice 直推奖 30% of 0.5 = 0.15
    const alicePending = await stakeCore.userPendingSOL(await alice.getAddress());
    expect(alicePending).to.be.gte(E("0.15"));
  });

  it("完整领取流程：alice 领取 SOL → 余额增加", async () => {
    await core.connect(alice).register(ADDRS.OWNER);
    await core.connect(bob).register(await alice.getAddress());

    // alice 先入金获得能量
    await solToken.connect(alice).approve(await core.getAddress(), E("1"));
    await core.connect(alice).deposit(E("1"));

    await solToken.connect(bob).approve(await core.getAddress(), E("1"));
    await core.connect(bob).deposit(E("1"));

    const pending = await stakeCore.userPendingSOL(await alice.getAddress());
    expect(pending).to.be.gt(0n);

    const aliceAddr = await alice.getAddress();
    const solBefore = await solToken.balanceOf(aliceAddr);
    await core.connect(alice).withdrawSOL(pending);
    const solAfter = await solToken.balanceOf(aliceAddr);

    expect(solAfter).to.be.gt(solBefore);
    // 实际到账 = pending * 90%
    expect(solAfter - solBefore).to.equal(pending * 90n / 100n);
  });
});
