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
  chain: { id: number; name: string; contracts?: { ensRegistry?: { address: string } } };
  transport: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
}): BrowserProvider {
  const { chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }, network);
  return provider;
}

/**
 * Utility function to create contract utils instance from wagmi context
 * This will be used with RainbowKit's wallet connection
 */
export async function createContractUtils(): Promise<SecurityDepositPoolUtils> {
  const walletClient = await getWalletClient(config);
  if (!walletClient) {
    throw new Error('Wallet not connected');
  }
  
  const provider = walletClientToProvider(walletClient);
  const signer = await provider.getSigner();
  return new SecurityDepositPoolUtils(signer);
}

/**
 * Create a read-only contract utils instance for checking deposit status
 * This can be used without wallet connection
 */
export async function createReadOnlyContractUtils(): Promise<SecurityDepositPoolUtils> {
  const publicClient = getPublicClient(config);
  if (!publicClient) {
    throw new Error('Public client not available');
  }
  
  // Create a read-only provider using the public client
  const provider = new BrowserProvider(publicClient.transport);
  return new SecurityDepositPoolUtils(provider);
}