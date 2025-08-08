import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, mainnet } from 'wagmi/chains';

if (!process.env.NEXT_PUBLIC_CHAIN_ID) {
  throw new Error(`NEXT_PUBLIC_CHAIN_ID`)
}

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID)

export const config = getDefaultConfig({
  appName: 'Security Deposit Pool',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains: [chainId === 1 ? mainnet : baseSepolia],
  ssr: true,
});
