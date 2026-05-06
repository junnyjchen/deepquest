/**
 * DeepQuest 合约 ABI 配置
 * DQ主合约地址：0xD6C7f9a6460034317294c52FDc056C548fbd0040
 * DQCard合约：0x1857aCeDf9b73163D791eb2F0374a328416291a1
 * DQToken合约地址：0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B
 */

export const DQ_CONTRACT_ADDRESS = '0xD6C7f9a6460034317294c52FDc056C548fbd0040';
export const DQCARD_CONTRACT_ADDRESS = '0x1857aCeDf9b73163D791eb2F0374a328416291a1';
export const DQTOKEN_CONTRACT_ADDRESS = '0x96e5B90115d41849F8F558Ef3A2eB627C6DF734B';

// 主合约 ABI（核心方法）
export const DQ_ABI = [
  // 注册用户
  {
    "inputs": [
      { "internalType": "address", "name": "_referrer", "type": "address" }
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
    // 用户注册事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "referrer", "type": "address" }
    ],
    "name": "Register",
    "type": "event"
  },
  // 存款
  {
    "inputs": [
      { "internalType": "uint256", "name": "_solAmount", "type": "uint256" }
    ],
    "name": "depositSOL",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 提款
  {
    "inputs": [
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 获取用户信息
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "_users",
    "outputs": [
      { "internalType": "address", "name": "referrer", "type": "address" },
      { "internalType": "uint256", "name": "directCount", "type": "uint256" },
      { "internalType": "uint8", "name": "level", "type": "uint8" },
      { "internalType": "uint256", "name": "totalInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "teamInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "energy", "type": "uint256" },
      { "internalType": "uint256", "name": "lpShares", "type": "uint256" },
      { "internalType": "uint256", "name": "lpRewardDebt", "type": "uint256" },
      { "internalType": "uint256", "name": "pendingRewards", "type": "uint256" },
      { "internalType": "uint256", "name": "directSales", "type": "uint256" },
      { "internalType": "uint8", "name": "dLevel", "type": "uint8" },
      { "internalType": "uint256", "name": "dRewardDebt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取当前最大投资额
  {
    "inputs": [],
    "name": "getCurrentMaxInvest",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 用户是否已注册
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "isUserRegistered",
    "outputs": [
      { "internalType": "bool", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取用户推荐人
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getUserReferrer",
    "outputs": [
      { "internalType": "address", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 初始节点添加（管理员）
  {
    "inputs": [
      { "internalType": "address[]", "name": "users", "type": "address[]" },
      { "internalType": "uint8[]", "name": "cardTypes", "type": "uint8[]" }
    ],
    "name": "initialNodesAdded",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// DQCard 合约 ABI
export const DQCARD_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "cardType",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_type", "type": "uint256" }
    ],
    "name": "getCardPrice",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "_type", "type": "uint256" }
    ],
    "name": "mintByOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalA",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalB",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalC",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取所有用户数量
  {
    "inputs": [],
    "name": "allUsersLength",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取指定索引的用户地址
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "allUsers",
    "outputs": [
      { "internalType": "address", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取用户完整信息（新版本接口）
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getUser",
    "outputs": [
      { "internalType": "address", "name": "referrer", "type": "address" },
      { "internalType": "uint256", "name": "directCount", "type": "uint256" },
      { "internalType": "uint8", "name": "level", "type": "uint8" },
      { "internalType": "uint256", "name": "totalInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "teamInvest", "type": "uint256" },
      { "internalType": "uint256", "name": "energy", "type": "uint256" },
      { "internalType": "uint256", "name": "lpShares", "type": "uint256" },
      { "internalType": "uint8", "name": "dLevel", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// DQToken 合约 ABI (继承 ERC20 + Ownable)
export const DQTOKEN_ABI = [
  // transfer
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [
      { "internalType": "bool", "type": "bool" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // balanceOf
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // burn (任何人都可以销毁自己的代币)
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // burnFrom (onlyOwner，可以销毁任意地址的代币)
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burnFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
