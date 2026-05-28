/**
 * DeepQuest 合约配置
 *
 * ABI 来源：assets 目录下对应的 txt 文件。
 * 完整 ABI 导出见 ./contractAbis。
 */

// 主合约地址
export const CONTRACT_ADDRESSES = {
  DQPROJECT: {
    address: '0xb74857877858E0181C44C22Ab01Ec61772A20B72',
    name: 'DQMCore'
  },
  DQSTAKE: {
    address: '0xCB00E0BC748e79f6441BABe1aB6c6bcD75d5c621',
    name: 'DQStakeCore'
  },
  DQSTAKEMINE: {
    address: '0x39C44Dea9e946BD14ac0504879a84077Ad69DeE6',
    name: 'DQStakeMine'
  },
  DQSTAKEVAULT: {
    address: '0xF3D93557E235a8fA53b82D9CC440E2D661cCdec7',
    name: 'DQStakeVault'
  },
  DQTOKEN: {
    address: '0xf0C9eB94298134f9290f3258e07DcB0716f8891F',
    name: 'DQToken'
  },
  DQCARD: {
    address: '0x68077b4A505CD010734915dccC22d87296c9793D',
    name: 'DQCard'
  },
  SOL: {
    address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    name: 'SOL'
  }
};

export {
  DQPROJECT_ABI,
  DQSTAKE_ABI,
  DQSTAKEMINE_ABI,
  DQSTAKEVAULT_ABI,
  DQTOKEN_ABI,
  DQCARD_ABI
} from './contractAbis';
