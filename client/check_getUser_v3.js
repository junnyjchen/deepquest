/* global require */
const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    const mainContractAddr = "0xF5E7b93059A9EEa53191CC0ab9326cA3D87fF6a6";
    const userAddr = "0x9b23a19a5614F8777b67fF018B17AB658613b907";

    const mainAbi = [
        "function getUser(address user) view returns (address, uint256, uint256, uint256)"
    ];

    const mainContract = new ethers.Contract(mainContractAddr, mainAbi, provider);

    try {
        const u = await mainContract.getUser(userAddr);
        console.log("getUser return:", u.map(v => v.toString()));
    } catch (e) {
        console.log("getUser error:", e.message);
    }
}

main();
