import { Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import { SecurityDepositPool__factory, SecurityDepositPool } from '@hell-month/security-deposit-sdk';
import { getWalletClient, getPublicClient } from '@wagmi/core';
import { config } from './config';

// Contract addresses from environment variables
export const CONTRACT_ADDRESSES = {
  SECURITY_DEPOSIT_POOL: process.env.NEXT_PUBLIC_SECURITY_DEPOSIT_POOL_ADDRESS || '',
  USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1'),
} as const;

/**
 * Validates that required contract addresses are configured
 * @throws Error if required addresses are missing
 */
export function validateContractAddresses(): void {
  if (!CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL) {
    throw new Error(
      'NEXT_PUBLIC_SECURITY_DEPOSIT_POOL_ADDRESS environment variable is required'
    );
  }
  
  if (!CONTRACT_ADDRESSES.USDT) {
    throw new Error(
      'NEXT_PUBLIC_USDT_ADDRESS environment variable is required'
    );
  }
  
  // Validate addresses are valid Ethereum addresses (basic check)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL)) {
    throw new Error('Invalid Security Deposit Pool contract address format');
  }
  
  if (!addressRegex.test(CONTRACT_ADDRESSES.USDT)) {
    throw new Error('Invalid USDT contract address format');
  }
}

// Standard ERC20 ABI for USDT contract interactions
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
] as const;

/**
 * Creates a SecurityDepositPool contract instance
 * @param signerOrProvider - Ethers signer or provider
 * @returns SecurityDepositPool contract instance
 */
export function getSecurityDepositPoolContract(
  signerOrProvider: JsonRpcSigner | BrowserProvider
): SecurityDepositPool {
  if (!CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL) {
    throw new Error(
      'Security Deposit Pool contract address not configured. Please set NEXT_PUBLIC_SECURITY_DEPOSIT_POOL_ADDRESS environment variable.'
    );
  }
  
  return SecurityDepositPool__factory.connect(
    CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL,
    signerOrProvider
  );
}

/**
 * Creates a USDT contract instance
 * @param signerOrProvider - Ethers signer or provider
 * @returns USDT contract instance
 */
export function getUSDTContract(signerOrProvider: JsonRpcSigner | BrowserProvider): Contract {
  return new Contract(CONTRACT_ADDRESSES.USDT, ERC20_ABI, signerOrProvider);
}

/**
 * Contract interaction utilities for SecurityDepositPool
 * 
 * @example
 * ```typescript
 * // Create contract utils instance
 * const contractUtils = await createContractUtils();
 * 
 * // Check if user has deposited
 * const hasDeposited = await contractUtils.hasDeposited(userAddress);
 * 
 * // Get required deposit amount
 * const depositAmount = await contractUtils.getFlatDepositAmount();
 * 
 * // Approve USDT spending
 * const approveTx = await contractUtils.approveUSDT(depositAmount);
 * await approveTx.wait();
 * 
 * // Make deposit
 * const depositTx = await contractUtils.deposit();
 * await depositTx.wait();
 * ```
 */
export class SecurityDepositPoolUtils {
  private contract: SecurityDepositPool;
  private usdtContract: Contract;

  constructor(signerOrProvider: JsonRpcSigner | BrowserProvider) {
    // Validate contract addresses before creating instances
    validateContractAddresses();
    
    this.contract = getSecurityDepositPoolContract(signerOrProvider);
    this.usdtContract = getUSDTContract(signerOrProvider);
  }

  /**
   * Check if a user has already deposited
   * @param userAddress - User's wallet address
   * @returns Promise<boolean> - True if user has deposited
   */
  async hasDeposited(userAddress: string): Promise<boolean> {
    try {
      return await this.contract.hasDeposited(userAddress);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error while checking deposit status. Please check your connection.');
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Rate limited while checking deposit status. Please wait and try again.');
        } else if (error.message.includes('invalid address')) {
          throw new Error('Invalid wallet address provided.');
        } else {
          throw new Error('Failed to check deposit status. Please try again.');
        }
      }
      throw new Error('Failed to check deposit status');
    }
  }

  /**
   * Get the flat deposit amount required
   * @returns Promise<bigint> - Deposit amount in wei
   */
  async getFlatDepositAmount(): Promise<bigint> {
    try {
      return await this.contract.flatDepositAmount();
    } catch (error) {
      console.error('Error getting deposit amount:', error);
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error while getting deposit amount. Please check your connection.');
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Rate limited while getting deposit amount. Please wait and try again.');
        } else {
          throw new Error('Failed to get deposit amount from contract. Please try again.');
        }
      }
      throw new Error('Failed to get deposit amount');
    }
  }

  /**
   * Approve USDT spending for the security deposit pool
   * @param amount - Amount to approve (in wei)
   * @returns Promise<any> - Transaction response
   */
  async approveUSDT(amount: bigint) {
    try {
      const tx = await this.usdtContract.approve(
        CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL,
        amount
      );
      return tx;
    } catch (error) {
      console.error('Error approving USDT:', error);
      if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          throw new Error('User rejected the approval transaction.');
        } else if (error.message.includes('insufficient funds') || error.message.includes('balance')) {
          throw new Error('Insufficient ETH balance for gas fees.');
        } else if (error.message.includes('gas') || error.message.includes('Gas')) {
          throw new Error('Gas estimation failed. Please try again with higher gas settings.');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during approval. Please check your connection.');
        } else if (error.message.includes('nonce')) {
          throw new Error('Transaction nonce error. Please reset your wallet account.');
        } else {
          throw new Error('Failed to approve USDT spending. Please try again.');
        }
      }
      throw new Error('Failed to approve USDT spending');
    }
  }

  /**
   * Check USDT allowance for the security deposit pool
   * @param userAddress - User's wallet address
   * @returns Promise<bigint> - Current allowance amount
   */
  async getUSDTAllowance(userAddress: string): Promise<bigint> {
    try {
      return await this.usdtContract.allowance(
        userAddress,
        CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL
      );
    } catch (error) {
      console.error('Error checking USDT allowance:', error);
      throw new Error('Failed to check USDT allowance');
    }
  }

  /**
   * Make a deposit to the security deposit pool
   * @returns Promise<any> - Transaction response
   */
  async deposit() {
    try {
      const tx = await this.contract.deposit();
      return tx;
    } catch (error) {
      console.error('Error making deposit:', error);
      if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          throw new Error('User rejected the deposit transaction.');
        } else if (error.message.includes('insufficient funds') || error.message.includes('balance')) {
          throw new Error('Insufficient ETH balance for gas fees.');
        } else if (error.message.includes('gas') || error.message.includes('Gas')) {
          throw new Error('Gas estimation failed. Please try again with higher gas settings.');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during deposit. Please check your connection.');
        } else if (error.message.includes('allowance') || error.message.includes('ERC20: insufficient allowance')) {
          throw new Error('USDT allowance insufficient. Please approve USDT spending first.');
        } else if (error.message.includes('already deposited')) {
          throw new Error('You have already made a deposit to this contract.');
        } else if (error.message.includes('reverted') || error.message.includes('execution reverted')) {
          throw new Error('Transaction was reverted by the contract. Please check contract conditions.');
        } else if (error.message.includes('nonce')) {
          throw new Error('Transaction nonce error. Please reset your wallet account.');
        } else {
          throw new Error('Failed to make deposit. Please try again.');
        }
      }
      throw new Error('Failed to make deposit');
    }
  }

  /**
   * Get user's USDT balance
   * @param userAddress - User's wallet address
   * @returns Promise<bigint> - USDT balance in wei
   */
  async getUSDTBalance(userAddress: string): Promise<bigint> {
    try {
      return await this.usdtContract.balanceOf(userAddress);
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      throw new Error('Failed to get USDT balance');
    }
  }

  /**
   * Get the course finalized time
   * @returns Promise<bigint> - Course finalized timestamp
   */
  async getCourseFinalizedTime(): Promise<bigint> {
    try {
      return await this.contract.courseFinalizedTime();
    } catch (error) {
      console.error('Error getting course finalized time:', error);
      throw new Error('Failed to get course finalized time');
    }
  }
}

/**
 * Convert wagmi wallet client to ethers provider
 * @param walletClient - Wagmi wallet client
 * @returns BrowserProvider - Ethers browser provider
 */
function walletClientToProvider(walletClient: {
  chain: { id: number; name: string; contracts?: Record<string, unknown> };
  transport: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
}): BrowserProvider {
  const { chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: (chain.contracts as { ensRegistry?: { address: string } })?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  return provider;
}

/**
 * Utility function to create contract utils instance from wagmi context
 * This will be used with RainbowKit's wallet connection
 */
export async function createContractUtils(): Promise<SecurityDepositPoolUtils> {
  try {
    const walletClient = await getWalletClient(config);
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }
    
    const provider = walletClientToProvider(walletClient);
    const signer = await provider.getSigner();
    return new SecurityDepositPoolUtils(signer);
  } catch (error) {
    console.error('Error creating contract utils:', error);
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      } else if (error.message.includes('Wallet not connected')) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      } else {
        throw new Error('Failed to initialize contract connection. Please try again.');
      }
    }
    throw error;
  }
}

/**
 * Create a read-only contract utils instance for checking deposit status
 * This can be used without wallet connection
 */
export async function createReadOnlyContractUtils(): Promise<SecurityDepositPoolUtils> {
  try {
    const publicClient = getPublicClient(config);
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    // Create a read-only provider using the public client
    const provider = new BrowserProvider(publicClient.transport);
    return new SecurityDepositPoolUtils(provider);
  } catch (error) {
    console.error('Error creating read-only contract utils:', error);
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      } else if (error.message.includes('Public client not available')) {
        throw new Error('Unable to connect to blockchain network. Please try again.');
      } else {
        throw new Error('Failed to initialize read-only contract connection. Please try again.');
      }
    }
    throw error;
  }
}