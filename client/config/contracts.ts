/**
 * ========================================
 * 主合约：DQMining_v11 (Genesis)
 * 地址：0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E
 * 链上验证：https://bscscan.com/address/0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E#code
 * ========================================
 * 
 * 【主要 API】
 * - register(address _r) - 用户注册（参数：推荐人地址）
 * - depositSOL(uint256 _a) - SOL 入金（参数：金额）
 * - getUser(address _u) - 查询用户信息
 * - getTeamSize(address _u) - 团队人数
 * - allUsers(uint256) - 获取所有用户地址（按索引）
 * 
 * - buyNode(uint256 _t) - 购买节点（参数：节点类型）
 * - stakeDQ(uint256 _amount, uint256 _periodIndex) - 质押 DQ
 * - unstakeDQ(uint256 _periodIndex) - 解押 DQ
 * - claimDTeam() - 领取 D 代币团队奖励
 * - claimFee() - 领取手续费奖励
 * - claimLP() - 领取 LP 奖励
 * - claimNft() - 领取 NFT 奖励
 * - claimStakeReward(uint256 _periodIndex) - 领取质押奖励
 * 
 * - swapSOLForDQ(uint256 _s, uint256 _minDq) - SOL 兑换 DQ
 * - sellDQForSOL(uint256 _d, uint256 _minSol) - DQ 卖出换 SOL
 * - withdraw(uint256 _a) - 提现 SOL
 * - mineBlock() - 挖矿产出
 * 
 * 【事件 Events】
 * - Deposit(u, a) - 入金事件
 * - Register(u, r) - 注册事件
 * - SellDQ(u, d, s, f) - 卖出 DQ 事件
 * - SwapAndAddLP(u, s, d, l) - 兑换并添加 LP 事件
 * - SwapSOLForDQ(u, s, d) - SOL 兑换 DQ 事件
 * - WhiteListSet(u, s) - 白名单设置事件
 * 
 * 【用户信息结构 getUser() 返回 7 个字段】
 * - [0] referrer: address - 推荐人地址
 * - [1] directCount: uint256 - 直推人数
 * - [2] level: uint8 - 节点等级
 * - [3] totalInvest: uint256 - 总投资额
 * - [4] teamInvest: uint256 - 团队投资额
 * - [5] : uint256 - 能量值
 * - [6] : uint8 - D等级
 */

import dqmigGenesisAbi from './dqmig-abigenesis.json';

export const CONTRACT_ADDRESSES = {
  // 主合约 DQMining_v11 (Genesis)
  DQPROJECT: {
    address: '0x2f05163B2A4db48Ac9223897b5a01aA0158F0A6E',
    name: 'DQMiningGenesis'
  },
  // 质押合约 DQMiningStake
  DQSTAKE: {
    address: '0x666197e39dB9bA342De02aE969Ea76EdE6709823',
    name: 'DQMiningStake'
  }
};

// 主合约 ABI（从链上获取）
export const DQPROJECT_ABI = dqmigGenesisAbi as any[];

// 质押合约 ABI（需要提供）
export const DQSTAKE_ABI = [
  // 待补充质押合约 ABI
];

export default CONTRACT_ADDRESSES;
