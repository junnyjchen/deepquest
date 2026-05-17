/**
 * DeepQuest 合约 ABI 配置
 * 
 * 合约地址（最新）：
 * 主合约（DQMining）：0x732B7f9EF6381120458D49CF4aaaF9a4B780c008
 * 质押合约（DQMiningStake）：0x8F0fb2E3Dd7564C8fCa82050934A576Ecdf74006
 * 
 * ABI 来源：assets/DQMining.sol (基于合约源码生成)
 */

export const DQ_CONTRACT_ADDRESS = '0x8c4284226390F918ee59A719C6A78ca8a969A95e';
export const DQSTAKE_CONTRACT_ADDRESS = '0x852b10818443913d30b0494a9486ba0BbD1aA8A8';

export const DQSTAKE_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimNft", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimDTeam", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPdq", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimPbnb", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClaimFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "Withdraw", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Stk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "p", "type": "uint256" }], "name": "Unstk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "ClmStk", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "r", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "b", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "Mine", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "GasFeePaid", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "FoundationDistributed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "oldLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "newLevel", "type": "uint8" }], "name": "DLevelRegistered", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "DLevelRewardClaimed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "sol", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "dq", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "feeRate", "type": "uint256" }], "name": "WithdrawnLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ForceRemoveLP", "type": "event" },
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "dq", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "dc", "outputs": [{ "internalType": "contract IDQCard", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "mc", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "miningContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "claimGasFee", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "feeRecipient", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_RECEIVER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "LP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lpPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "NFT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "RT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "IB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MB", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "F60", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "F180", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PARTNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "D_LEVEL_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }, { "internalType": "address", "name": "", "type": "address" }], "name": "isDLevel", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userDLevel", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dLevelRewardDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelAccReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "INITIAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "releasedSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "SP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "tS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lpT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "tLP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pDA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pBA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pDD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pBD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "br", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "lt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "fA", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "lF", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "fp", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD0", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD1", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nD2", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dd", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dl", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sAmt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "sDebt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isB", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_60DAYS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_61_180DAYS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "FEE_180PLUS", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "WITHDRAW_FEE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_pair", "type": "address" }], "name": "setLpPair", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint8", "name": "_newLevel", "type": "uint8" }], "name": "setDLevelByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setDQCard", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_fee", "type": "uint256" }], "name": "setClaimGasFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setFeeRecipient", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "a", "type": "address" }], "name": "setM", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "bool", "name": "s", "type": "bool" }], "name": "bl", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setMiningContract", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint8", "name": "_newLevel", "type": "uint8" }], "name": "registerDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "withdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "forceRemoveLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimDLevelReward", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getDLevelReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distNFT", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "t", "type": "uint256" }], "name": "addLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "distLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "withdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "adminWithdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimD", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPdq", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }], "name": "claimPbnb", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "a", "type": "uint256" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "clmS", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "mine", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "u", "type": "address" }, { "internalType": "uint256", "name": "i", "type": "uint256" }], "name": "getStk", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPartnerReward", "outputs": [{ "internalType": "uint256", "name": "dqReward", "type": "uint256" }, { "internalType": "uint256", "name": "solReward", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "withdrawBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distDQFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "addPendingBurn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "stateMutability": "payable", "type": "receive" }
];

export const DQ_ABI = [
  // ========== 部署 / 事件 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": true, "internalType": "address", "name": "r", "type": "address" }], "name": "Register", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "a", "type": "uint256" }], "name": "Deposit", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "s", "type": "bool" }], "name": "WhiteListSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }], "name": "SwapSOLForDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "l", "type": "uint256" }], "name": "SwapAndAddLP", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "dqAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "solOut", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "burned", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }], "name": "SellDQ", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "oldAddr", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newAddr", "type": "address" }], "name": "DQCardSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }], "name": "NodeLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }], "name": "DLevelSet", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "oldPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newPhase", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newLimit", "type": "uint256" }], "name": "PhaseAdvanced", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }], "name": "ClaimReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "partner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ClaimPartnerSOL", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "partner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ClaimPartnerBNB", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "validCount", "type": "uint256" }], "name": "DLevelUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "level", "type": "uint8" }, { "indexed": false, "internalType": "uint8", "name": "diffRate", "type": "uint8" }], "name": "MgrReward", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "u", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "d", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "s", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "f", "type": "uint256" }], "name": "SellDQ", "type": "event" },

  // ========== 常量 / 状态读取（view）==========
  // 读取合约内置常量 OWNER（权限 owner）
  { "inputs": [], "name": "OWNER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取代币合约地址（DQToken）
  { "inputs": [], "name": "dqToken", "outputs": [{ "internalType": "contract IDQToken", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 NFT 卡牌合约地址（DQCard）
  { "inputs": [], "name": "dqCard", "outputs": [{ "internalType": "contract IDQCard", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 USDT 合约地址
  { "inputs": [], "name": "USDT", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 SOL 合约地址（链上 SOL 代币地址）
  { "inputs": [], "name": "SOL", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 Pancake Router 地址
  { "inputs": [], "name": "ROUTER", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取基金会地址
  { "inputs": [], "name": "FOUNDATION", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取运营地址（OP）
  { "inputs": [], "name": "OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取质押运营地址（STAKE_OP）
  { "inputs": [], "name": "STAKE_OP", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取保险地址（INS）
  { "inputs": [], "name": "INS", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取买入手续费地址（BUY_FEE）
  { "inputs": [], "name": "BUY_FEE", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 DAO 地址
  { "inputs": [], "name": "DAO", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },

  // 读取当前绑定的 stake 合约地址
  { "inputs": [], "name": "stakeContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取最小入金限制
  { "inputs": [], "name": "INVEST_MIN", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取基础日限额
  { "inputs": [], "name": "DAILY_LIMIT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取阶段开始时间（部署时设置）
  { "inputs": [], "name": "startTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取当前阶段
  { "inputs": [], "name": "currentPhase", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取每阶段增加的额度步长
  { "inputs": [], "name": "PHASE_STEP", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取节点价格（index: 0..3）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodePrices", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取节点达标直推要求（index: 0..3）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "nodeReq", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取直推奖励费率
  { "inputs": [], "name": "DIRECT_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取见点奖励费率
  { "inputs": [], "name": "SEE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取 DAO 补贴费率
  { "inputs": [], "name": "DAO_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取保险费率
  { "inputs": [], "name": "INS_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取运营费率
  { "inputs": [], "name": "OP_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取能量倍数
  { "inputs": [], "name": "ENERGY_MUL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖池费率
  { "inputs": [], "name": "MGR_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖阈值（index: 0..5）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取管理奖费率阶梯（index: 0..5）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "mgrRates", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 提现相关：读取提现手续费费率
  { "inputs": [], "name": "WITHDRAW_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给 NFT 的比例
  { "inputs": [], "name": "FEE_NODE_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给合伙人的比例
  { "inputs": [], "name": "FEE_PARTNER_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 提现相关：读取手续费分配给基金会的比例
  { "inputs": [], "name": "FEE_FOUNDATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 领取手续费收益时需支付的 BNB 手续费
  { "inputs": [], "name": "CLAIM_BNB_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取 D 等级阈值表（index: 0..7）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "dLevelThresh", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // 读取黑名单状态
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  // 读取当日入金额度（用于日限额统计）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dailyDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取是否处于白名单（白名单用户不受日限额约束）
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "depositWhiteList", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },

  // 读取所有用户数组（按索引取地址）
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "allUsers", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  // 读取 NFT 节点累计待分发的 SOL
  { "inputs": [], "name": "nftPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 读取合伙人累计待分发的 SOL
  { "inputs": [], "name": "partnerPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 对外可调用方法（写操作 / nonpayable / payable）==========
  // 设置 stake 合约地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_a", "type": "address" }], "name": "setStakeContract", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置入金白名单（owner）：白名单用户不受日限额限制
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "bool", "name": "_s", "type": "bool" }], "name": "setDepositWhiteList", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置/更换 DQCard 合约地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setDQCard", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置基金会地址（owner）
  { "inputs": [{ "internalType": "address", "name": "_addr", "type": "address" }], "name": "setFoundation", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 手动进入下一阶段（owner）：阶段 +1，并触发 PhaseAdvanced 事件
  { "inputs": [], "name": "nextPhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户注册推荐人（需未注册）
  { "inputs": [{ "internalType": "address", "name": "_r", "type": "address" }], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 手动设置单个用户推荐人
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "address", "name": "_r", "type": "address" }], "name": "setReferrer", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量导入用户推荐关系（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "address[]", "name": "_r", "type": "address[]" }], "name": "importUsers", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量设置节点等级 S1-S6（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置单个用户节点等级 S1-S6（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 设置单个用户 D 等级（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }, { "internalType": "uint8", "name": "_lvl", "type": "uint8" }], "name": "setUserDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量设置用户 D 等级（owner）
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_lvl", "type": "uint8[]" }], "name": "setNodesDLevel", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 批量导入节点（owner）：必要时为未注册用户补注册，并按类型铸造卡牌、写入 level
  { "inputs": [{ "internalType": "address[]", "name": "_u", "type": "address[]" }, { "internalType": "uint8[]", "name": "_t", "type": "uint8[]" }], "name": "importNodes", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户入金（SOL 转入合约，产生动态奖励 + LP 逻辑；需已注册）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "depositSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 管理员代用户入金
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "depositForUser", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 购买节点卡（用 USDT 支付，铸造 DQCard，并按规则给推荐人/基金会分配）
  { "inputs": [{ "internalType": "uint256", "name": "_t", "type": "uint256" }], "name": "buyNode", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 加入黑名单（owner）：黑名单用户不能提现/参与等（具体逻辑见合约）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "addToBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 移出黑名单（owner）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "removeFromBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 授权 Router 进行 SOL/DQ 操作（owner）
  { "inputs": [], "name": "approveRouter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用 SOL 兑换 DQ（包含 buyFee；有滑点保护 minDq），返回实际估算/兑换的 DQ 数量
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minDq", "type": "uint256" }], "name": "swapSOLForDQ", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  // 为用户加流动性（SOL 一半换 DQ、一半配对加池；LP 进入 stake 合约），返回 LP 数量
  { "inputs": [{ "internalType": "uint256", "name": "_s", "type": "uint256" }, { "internalType": "uint256", "name": "_minLp", "type": "uint256" }], "name": "addLiquidityForUser", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  // 卖出 DQ 换 SOL（94%销毁 + 6%手续费；从合约 SOL 池出 SOL），返回 solOut
  { "inputs": [{ "internalType": "uint256", "name": "_dq", "type": "uint256" }, { "internalType": "uint256", "name": "_minSol", "type": "uint256" }], "name": "sellDQForSOL", "outputs": [{ "internalType": "uint256", "name": "solOut", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },

  // 领取 LP 分红（转发到 stake 合约）
  { "inputs": [], "name": "claimLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取 NFT 分红（转发到 stake 合约）
  { "inputs": [], "name": "claimNft", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取 D 等级分红（团队奖励）（转发到 stake 合约）
  { "inputs": [], "name": "claimDTeam", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取手续费分红（转发到 stake 合约）
  { "inputs": [], "name": "claimFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取合伙人 DQ 奖励（转发到 stake 合约）
  { "inputs": [], "name": "claimPartnerDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取合伙人 BNB 奖励（转发到 stake 合约）
  { "inputs": [], "name": "claimPartnerBNB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 用户提现（转发到 stake 合约）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 提走 LP（转发到 stake 合约）
  { "inputs": [], "name": "withdrawLP", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 由 owner 触发 stake 合约挖矿结算（转发）
  { "inputs": [], "name": "mineBlock", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 质押 DQ（把 DQ 转到 stake 合约并记录周期）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "stakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 解押 DQ（按周期 index）
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "unstakeDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // 领取单币质押奖励（按周期 index）
  { "inputs": [{ "internalType": "uint256", "name": "_periodIndex", "type": "uint256" }], "name": "claimStakeReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 将手续费（SOL）分配到 NFT 分红池（触发 stake 合约记录）
  { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "distributeFeeToNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // 保留：推进阶段（owner；不触发 PhaseAdvanced 事件）
  { "inputs": [], "name": "advancePhase", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // owner 提走合约内 DQ（应谨慎使用）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawDQ", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // owner 提走合约内 SOL（应谨慎使用）
  { "inputs": [{ "internalType": "uint256", "name": "_a", "type": "uint256" }], "name": "adminWithdrawSOL", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  // ========== 查询方法（view）==========
  // 计算当前阶段日限额（包含 phase step，上限 200 ether）
  { "inputs": [], "name": "getDailyLimit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 获取用户信息（推荐人、直推数、等级、业绩、能量、D等级、有效用户数、待提现余额）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getUser", "outputs": [{ "internalType": "address", "name": "referrer", "type": "address" }, { "internalType": "uint256", "name": "directCount", "type": "uint256" }, { "internalType": "uint8", "name": "level", "type": "uint8" }, { "internalType": "uint256", "name": "totalInvest", "type": "uint256" }, { "internalType": "uint256", "name": "teamInvest", "type": "uint256" }, { "internalType": "uint256", "name": "energy", "type": "uint256" }, { "internalType": "uint8", "name": "dLevel", "type": "uint8" }, { "internalType": "uint256", "name": "validAddressCount", "type": "uint256" }, { "internalType": "uint256", "name": "pendingSOL", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 获取团队规模（下级地址数量）
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getTeamSize", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询用户待提现动态奖励余额
  { "inputs": [{ "internalType": "address", "name": "_u", "type": "address" }], "name": "getPendingSOL", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // 查询合约 BNB 余额
  { "inputs": [], "name": "getBnbBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },

  // ========== 提现 / 分红相关（写操作）==========
  // 用户提现动态奖励（扣 WITHDRAW_FEE；以 SOL 支付给用户，部分手续费进入待分红池/基金会）
  { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // NFT 持有者收取 SOL 分红（需支付 BNB 手续费 msg.value >= CLAIM_BNB_FEE；实际分发在 stake 合约）
  { "inputs": [], "name": "claimNftSOL", "outputs": [], "stateMutability": "payable", "type": "function" },
  // 合伙人领取 SOL 分红（需支付 BNB 手续费；合伙人地址从 stake 合约读取）
  { "inputs": [], "name": "claimPartnerSOL", "outputs": [], "stateMutability": "payable", "type": "function" },

  // ========== 兜底：接收 BNB ==========
  { "stateMutability": "payable", "type": "receive" }
];

// Card NFT ABI (完整定义，基于 DQCard.sol 源码生成)
export const DQCARD_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }, { "indexed": true, "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": true, "name": "approved", "type": "address" }], "name": "ApprovalForAll", "type": "event" },
  // ========== ERC721 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }, { "name": "data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "operator", "type": "address" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== ERC721Enumerable ==========
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "index", "type": "uint256" }], "name": "tokenOfOwnerByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "index", "type": "uint256" }], "name": "tokenByIndex", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 卡牌常量 ==========
  { "inputs": [], "name": "CARD_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "CARD_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "CARD_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalA", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalB", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalC", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_A", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_B", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PRICE_C", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "uint256" }], "name": "cardType", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 管理函数 ==========
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxA", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxB", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_max", "type": "uint256" }], "name": "setMaxC", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "to", "type": "address" }, { "name": "_type", "type": "uint256" }], "name": "mintByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "to", "type": "address[]" }, { "name": "_types", "type": "uint256[]" }], "name": "mintBatchByOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== 查询函数 ==========
  { "inputs": [{ "name": "_type", "type": "uint256" }], "name": "getCardPrice", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// Token ABI (完整定义，基于 DQToken.sol 源码生成)
export const DQTOKEN_ABI = [
  // ========== 事件 ==========
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "burnAmount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "netAmount", "type": "uint256" }], "name": "BuyFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "feeAmount", "type": "uint256" }, { "indexed": false, "name": "pairAmount", "type": "uint256" }, { "indexed": false, "name": "burnFromPool", "type": "uint256" }], "name": "SellFee", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "totalBurned", "type": "uint256" }], "name": "Burned", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "pair", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "PairUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "ExcludedUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "name": "account", "type": "address" }, { "indexed": false, "name": "status", "type": "bool" }], "name": "BlacklistedUpdated", "type": "event" },
  // ========== ERC20 标准 ==========
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "decimals", "outputs": [{ "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  // ========== 常量 ==========
  { "inputs": [], "name": "BUY_BURN_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BUY_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SELL_FEE_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "SELL_TO_PAIR_RATE", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BURN_ADDRESS", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "burnedSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "BURN_TARGET", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "buyFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "sellFeeEnabled", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isPair", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isExcluded", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "", "type": "address" }], "name": "isBlacklisted", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "buyFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "sellFeeReceiver", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "miningStake", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  // ========== 管理函数 ==========
  { "inputs": [{ "name": "_pair", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setPair", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_pairs", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setPairs", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setExcluded", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_accounts", "type": "address[]" }, { "name": "_status", "type": "bool" }], "name": "setExcludedBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_account", "type": "address" }, { "name": "_status", "type": "bool" }], "name": "setBlacklisted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_buyFeeReceiver", "type": "address" }], "name": "setBuyFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_sellFeeReceiver", "type": "address" }], "name": "setSellFeeReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_miningStake", "type": "address" }], "name": "setMiningStake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "_buyFee", "type": "bool" }, { "name": "_sellFee", "type": "bool" }], "name": "setFeeStatus", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "account", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  // ========== 查询函数 ==========
  { "inputs": [], "name": "circulatingSupply", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "remainingBurnable", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "isBurnTargetReached", "outputs": [{ "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateBuyOutput", "outputs": [{ "name": "burnAmount", "type": "uint256" }, { "name": "feeAmount", "type": "uint256" }, { "name": "netAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [{ "name": "amount", "type": "uint256" }], "name": "calculateSellOutput", "outputs": [{ "name": "feeAmount", "type": "uint256" }, { "name": "pairAmount", "type": "uint256" }, { "name": "burnAmount", "type": "uint256" }], "stateMutability": "pure", "type": "function" }
];

// AVE 交易对合约 ABI（Pancake/Uniswap V2 Pair）
export const AVE_PAIR_ABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

// 补充导出：交易对地址、代币地址、Card地址（需从链上或配置获取）
export const AVE_PAIR_ADDRESS = '0x9d85a0Fa616e98bA952fa7a2E21BCB478Efc86E2'; // PancakeSwap Pair 地址（需配置）
export const DQTOKEN_CONTRACT_ADDRESS = '0xeD82B38bE28bB1552d0792b978e4361aEf46283e'; // DQToken 地址（需配置）
export const DQCARD_CONTRACT_ADDRESS = '0xA275d02a6bDc9bd79FdAAD1838a9f5b1F19d032a'; // DQCard 地址（需配置）
