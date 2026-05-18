const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    const mainContractAddr = "0xF5E7b93059A9EEa53191CC0ab9326cA3D87fF6a6";
    const solTokenAddr = "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF";
    const userAddr = "0x9b23a19a5614F8777b67fF018B17AB658613b907";

    const mainAbi = [
        "function getUser(address user) view returns (address, uint256, uint8, uint256)",
        "function dailyDeposit(address user) view returns (uint256)",
        "function getDailyLimit() view returns (uint256)",
        "function depositWhiteList(address user) view returns (bool)",
        "function isBlacklisted(address user) view returns (bool)",
        "function depositSOL(uint256 amount) external"
    ];

    const erc20Abi = [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
    ];

    const mainContract = new ethers.Contract(mainContractAddr, mainAbi, provider);
    const solContract = new ethers.Contract(solTokenAddr, erc20Abi, provider);

    const results = {};

    try { results.getUser = (await mainContract.getUser(userAddr)).map(v => v.toString()); } catch (e) { results.getUser = e.message; }
    try { results.dailyDeposit = (await mainContract.dailyDeposit(userAddr)).toString(); } catch (e) { results.dailyDeposit = e.message; }
    try { results.getDailyLimit = (await mainContract.getDailyLimit()).toString(); } catch (e) { results.getDailyLimit = e.message; }
    try { results.depositWhiteList = await mainContract.depositWhiteList(userAddr); } catch (e) { results.depositWhiteList = e.message; }
    try { results.isBlacklisted = await mainContract.isBlacklisted(userAddr); } catch (e) { results.isBlacklisted = e.message; }
    try { results.solAllowance = (await solContract.allowance(userAddr, mainContractAddr)).toString(); } catch (e) { results.solAllowance = e.message; }
    try { results.solBalance = (await solContract.balanceOf(userAddr)).toString(); } catch (e) { results.solBalance = e.message; }

    try {
        await mainContract.depositSOL.staticCall(ethers.parseEther("1"), { from: userAddr });
        results.staticCall = "Success";
    } catch (e) {
        results.staticCall = "Reverted: " + (e.reason || e.message);
    }

    console.log(JSON.stringify(results, null, 2));
}

main();
