/**
 * ================================================
 *              Wagmi Web3 配置
 * ================================================
 */

import { http, createConfig } from 'wagmi';
import { mainnet, bsc, bscTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});

export const SUPPORTED_CHAIN_IDS = [bscTestnet.id, bsc.id, mainnet.id] as const;
