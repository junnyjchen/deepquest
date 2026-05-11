/**
 * DeepQuest 合约配置
 * 合约地址（主网）
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E',
    name: 'DQProject'
  },
  DQSTAKE: {
    address: '0x666197e39dB9bA342De02aE969Ea76EdE6709823',
    name: 'DQMiningStake'
  },
  DQTOKEN: {
    address: '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x1857aCeDf9b73163D791eb2F0374a328416291a1',
    name: 'DQCard'
  }
};

// 主合约 ABI (DQMining_v11)
export const DQPROJECT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":true,"internalType":"address","name":"r","type":"address"}],"name":"Register","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"a","type":"uint256"}],"name":"Deposit","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"}],"name":"SwapSOLForDQ","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"l","type":"uint256"}],"name":"SwapAndAddLP","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"uint256","name":"d","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"s","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"f","type":"uint256"}],"name":"SellDQ","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"u","type":"address"},{"indexed":false,"internalType":"bool","name":"s","type":"bool"}],"name":"WhiteListSet","type":"event"},
  {"inputs":[],"name":"INVEST_MIN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"SOL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"stakeContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"allUsers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getDailyLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"currentPhase","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqToken","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dqCard","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUser","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"directCount","type":"uint256"},{"internalType":"uint8","name":"level","type":"uint8"},{"internalType":"uint256","name":"totalInvest","type":"uint256"},{"internalType":"uint256","name":"teamInvest","type":"uint256"},{"internalType":"uint256","name":"energy","type":"uint256"},{"internalType":"uint256","name":"lpShares","type":"uint256"},{"internalType":"uint8","name":"dLevel","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_r","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"depositSOL","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamSize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"}],"name":"getTeamInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"dailyDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getCurrentMaxInvest","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_a","type":"address"}],"name":"setStakeContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u","type":"address"},{"internalType":"bool","name":"_s","type":"bool"}],"name":"setDepositWhiteList","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"address[]","name":"_r","type":"address[]"}],"name":"importUsers","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"_u","type":"address[]"},{"internalType":"uint8[]","name":"_t","type":"uint8[]"}],"name":"importNodes","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// 质押合约 ABI (DQMiningStake_v5)
export const DQSTAKE_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[],"name":"dq","outputs":[{"internalType":"contract IDQToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"dc","outputs":[{"internalType":"contract IDQCard","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"SOL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"OP","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"mc","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"tLP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"fp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"br","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"lt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"lA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"pc","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"pL","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"pDA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"pBA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"SP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"fA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isP","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isB","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lpT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD0","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD1","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nD2","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dl","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"sAmt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"sDebt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dd","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"sA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"dT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"dA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"lF","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"a","type":"address"}],"name":"setM","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"u","type":"address"},{"internalType":"bool","name":"s","type":"bool"}],"name":"bl","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"p","type":"address"}],"name":"addP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"u","type":"address"},{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"t","type":"uint256"}],"name":"addLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"f","type":"uint256"}],"name":"distLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"f","type":"uint256"}],"name":"distNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"f","type":"uint256"}],"name":"distDT","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimNft","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimDTeam","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimPdq","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimPbnb","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"},{"internalType":"uint256","name":"_p","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_p","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_p","type":"uint256"}],"name":"claimStk","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"rmLP","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_a","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"mine","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pDD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pBD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

// DQToken ABI
export const DQTOKEN_ABI = [
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];
