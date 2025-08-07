'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createReadOnlyContractUtils, createContractUtils, CONTRACT_ADDRESSES } from './contracts';
import { ErrorPopup } from './components/ErrorPopup';

// Loading spinner component for buttons
const LoadingSpinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg 
    className={`animate-spin -ml-1 mr-3 ${className}`} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Action buttons component with proper state management
interface ActionButtonsProps {
  approvalStatus: 'idle' | 'pending' | 'approved' | 'failed';
  depositStatus: 'idle' | 'pending' | 'success' | 'failed';
  onApprove: () => void;
  onDeposit: () => void;
}

const ActionButtons = ({ approvalStatus, depositStatus, onApprove, onDeposit }: ActionButtonsProps) => {
  // Determine button states based on transaction states
  const isApprovalPending = approvalStatus === 'pending';
  const isApprovalCompleted = approvalStatus === 'approved';
  const isDepositPending = depositStatus === 'pending';
  const isAnyTransactionPending = isApprovalPending || isDepositPending;
  
  // Approve button state logic
  const isApproveButtonDisabled = isAnyTransactionPending || isApprovalCompleted;
  const approveButtonText = isApprovalPending 
    ? 'Approving...' 
    : isApprovalCompleted 
    ? 'Approved' 
    : 'Approve USDT';
  
  // Deposit button state logic  
  const isDepositButtonDisabled = !isApprovalCompleted || isDepositPending;
  const depositButtonText = isDepositPending ? 'Depositing...' : 'Deposit';
  
  // Button styling based on state
  const getButtonClassName = (isDisabled: boolean, isPending: boolean) => {
    const baseClasses = "w-full py-3 px-6 rounded-lg font-medium border-2 transition-colors flex items-center justify-center";
    
    if (isDisabled && !isPending) {
      // Disabled state (not pending)
      return `${baseClasses} bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed`;
    } else if (isPending) {
      // Loading state
      return `${baseClasses} bg-gray-600 text-white border-gray-600 cursor-not-allowed`;
    } else {
      // Active state
      return `${baseClasses} bg-white text-black border-white hover:bg-gray-100`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-yellow-400">Deposit Required</p>
        <p className="text-sm text-gray-400">You need to complete the deposit process</p>
      </div>
      
      {/* Approve button */}
      <button
        onClick={onApprove}
        disabled={isApproveButtonDisabled}
        className={getButtonClassName(isApproveButtonDisabled, isApprovalPending)}
        aria-label={`Approve USDT spending - ${isApproveButtonDisabled ? 'disabled' : 'enabled'}`}
      >
        {isApprovalPending && <LoadingSpinner className="h-5 w-5 text-white" />}
        {approveButtonText}
      </button>
      
      {/* Deposit button */}
      <button
        onClick={onDeposit}
        disabled={isDepositButtonDisabled}
        className={getButtonClassName(isDepositButtonDisabled, isDepositPending)}
        aria-label={`Make deposit - ${isDepositButtonDisabled ? 'disabled' : 'enabled'}`}
      >
        {isDepositPending && <LoadingSpinner className="h-5 w-5 text-white" />}
        {depositButtonText}
      </button>
    </div>
  );
};

export default function Home() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);
  const [hasDeposited, setHasDeposited] = useState<boolean | null>(null);
  const [depositCheckError, setDepositCheckError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Approval transaction state
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'pending' | 'approved' | 'failed'>('idle');
  
  // Deposit transaction state
  const [depositStatus, setDepositStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Function to check approval status for connected wallet
  const checkApprovalStatus = useCallback(async (userAddress: string) => {
    try {
      const contractUtils = await createReadOnlyContractUtils();
      
      // Get required deposit amount and current allowance
      const [depositAmount, currentAllowance] = await Promise.all([
        contractUtils.getFlatDepositAmount(),
        contractUtils.getUSDTAllowance(userAddress)
      ]);
      
      // Check if current allowance is sufficient for deposit
      const isApproved = currentAllowance >= depositAmount;
      
      console.log('Approval check:', {
        userAddress,
        depositAmount: depositAmount.toString(),
        currentAllowance: currentAllowance.toString(),
        isApproved,
        currentApprovalStatus: approvalStatus
      });
      
      // Only update approval status if it's currently idle or failed
      // Don't override pending or successful states from transactions
      if (approvalStatus === 'idle' || approvalStatus === 'failed') {
        setApprovalStatus(isApproved ? 'approved' : 'idle');
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
      // Don't set approval status to failed for checking errors
      // This allows the user to still attempt approval
    }
  }, [approvalStatus]);

  // Function to check deposit status for connected wallet with enhanced error handling
  const checkDepositStatus = useCallback(async (userAddress: string, isRetry = false) => {
    try {
      setDepositCheckError(null);
      setNetworkError(null);
      
      // Use fallback contract address from environment if needed
      if (!CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL) {
        throw new Error('Security deposit pool contract address not configured');
      }

      const contractUtils = await createReadOnlyContractUtils();
      const deposited = await contractUtils.hasDeposited(userAddress);
      setHasDeposited(deposited);
      
      // Reset retry count on successful check
      setRetryCount(0);
      
      // If user hasn't deposited, check approval status
      if (!deposited) {
        await checkApprovalStatus(userAddress);
      }
    } catch (error) {
      console.error('Error checking deposit status:', error);
      
      // Handle different types of errors with enhanced recovery mechanisms
      if (error instanceof Error) {
        if (error.message.includes('contract address not configured')) {
          setDepositCheckError('Contract configuration error. Please check environment variables.');
          setNetworkError('Configuration Error');
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
          const networkErrorMsg = 'Network connection issue. Please check your internet connection.';
          setDepositCheckError(networkErrorMsg);
          setNetworkError('Network Error');
          
          // Implement exponential backoff for network errors
          if (!isRetry && retryCount < 3) {
            const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              checkDepositStatus(userAddress, true);
            }, backoffDelay);
          }
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          setDepositCheckError('Too many requests. Please wait a moment before trying again.');
          setNetworkError('Rate Limited');
        } else if (error.message.includes('chain') || error.message.includes('unsupported')) {
          setDepositCheckError('Unsupported network. Please ensure you are connected to the correct network.');
          setNetworkError('Network Mismatch');
        } else {
          setDepositCheckError('Unable to check deposit status. Will retry automatically.');
          setNetworkError('Unknown Error');
        }
      } else {
        setDepositCheckError('Unknown error occurred while checking deposit status.');
        setNetworkError('Unknown Error');
      }
      
      // Set hasDeposited to null to indicate unknown status
      setHasDeposited(null);
    }
  }, [checkApprovalStatus, retryCount]);

  // Start polling for deposit status every 30 seconds
  const startDepositStatusPolling = useCallback((userAddress: string) => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Check immediately
    checkDepositStatus(userAddress);

    // Set up 30-second polling
    pollingIntervalRef.current = setInterval(() => {
      checkDepositStatus(userAddress);
    }, 30000); // 30 seconds
  }, [checkDepositStatus]);

  // Stop polling when component unmounts or wallet disconnects
  const stopDepositStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Check if user is on Base Sepolia
  useEffect(() => {
    if (isConnected && chainId !== baseSepolia.id) {
      setShowNetworkPrompt(true);
    } else {
      setShowNetworkPrompt(false);
    }
  }, [isConnected, chainId]);

  // Handle deposit status polling based on wallet connection and network
  useEffect(() => {
    if (isConnected && address && chainId === baseSepolia.id) {
      // Start polling when wallet is connected and on correct network
      startDepositStatusPolling(address);
    } else {
      // Stop polling and reset state when wallet disconnects or wrong network
      stopDepositStatusPolling();
      setHasDeposited(null);
      setDepositCheckError(null);
      // Reset approval status when wallet disconnects or network changes
      setApprovalStatus('idle');
      setDepositStatus('idle');
    }

    // Cleanup on unmount
    return () => {
      stopDepositStatusPolling();
    };
  }, [isConnected, address, chainId, startDepositStatusPolling, stopDepositStatusPolling]);

  const handleSwitchToBaseSepolia = () => {
    switchChain({ chainId: baseSepolia.id });
  };

  // Handle USDT approval transaction with enhanced error handling
  const handleApprove = useCallback(async () => {
    if (!address) return;
    
    try {
      setApprovalStatus('pending');
      setError(null);
      setNetworkError(null);
      
      const contractUtils = await createContractUtils();
      
      // Get the required deposit amount
      const depositAmount = await contractUtils.getFlatDepositAmount();
      
      // Check user's USDT balance before attempting approval
      const userBalance = await contractUtils.getUSDTBalance(address);
      if (userBalance < depositAmount) {
        setApprovalStatus('failed');
        setError('Insufficient USDT balance. You need more USDT to complete the deposit.');
        return;
      }
      
      // Initiate USDT approval transaction
      const approveTx = await contractUtils.approveUSDT(depositAmount);
      
      // Wait for transaction confirmation
      await approveTx.wait();
      
      setApprovalStatus('approved');
      
      // Verify approval status after transaction
      await checkApprovalStatus(address);
    } catch (error) {
      console.error('Approval transaction failed:', error);
      setApprovalStatus('failed');
      
      // Handle different types of errors with enhanced user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          // User rejected transaction - don't show error popup, just reset status
          setApprovalStatus('idle');
          return;
        } else if (error.message.includes('insufficient funds') || error.message.includes('balance')) {
          setError('Insufficient USDT balance. Please ensure you have enough USDT in your wallet.');
        } else if (error.message.includes('gas') || error.message.includes('Gas')) {
          setError('Transaction failed due to gas issues. Try increasing gas limit or gas price in your wallet.');
        } else if (error.message.includes('network') || error.message.includes('Network') || error.message.includes('timeout')) {
          setError('Network error occurred. Please check your connection and try again.');
          setNetworkError('Network Error');
        } else if (error.message.includes('nonce') || error.message.includes('replacement')) {
          setError('Transaction nonce error. Please reset your wallet account or try again.');
        } else if (error.message.includes('reverted') || error.message.includes('execution reverted')) {
          setError('Transaction was reverted by the contract. Please check contract conditions and try again.');
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else {
          setError('Approval transaction failed. Please check your wallet and try again.');
        }
      } else {
        setError('An unexpected error occurred during approval. Please try again.');
      }
    }
  }, [address, checkApprovalStatus]);

  // Handle deposit transaction with enhanced error handling
  const handleDeposit = useCallback(async () => {
    if (!address || approvalStatus !== 'approved') return;
    
    try {
      setDepositStatus('pending');
      setError(null);
      setNetworkError(null);
      
      const contractUtils = await createContractUtils();
      
      // Double-check approval status before deposit
      const depositAmount = await contractUtils.getFlatDepositAmount();
      const currentAllowance = await contractUtils.getUSDTAllowance(address);
      
      if (currentAllowance < depositAmount) {
        setDepositStatus('failed');
        setError('USDT allowance is insufficient. Please approve USDT spending again.');
        setApprovalStatus('idle'); // Reset approval status so user can re-approve
        return;
      }
      
      // Check user's USDT balance before attempting deposit
      const userBalance = await contractUtils.getUSDTBalance(address);
      if (userBalance < depositAmount) {
        setDepositStatus('failed');
        setError('Insufficient USDT balance. You need more USDT to complete the deposit.');
        return;
      }
      
      // Call the deposit function on the security deposit contract
      const depositTx = await contractUtils.deposit();
      
      // Wait for transaction confirmation
      await depositTx.wait();
      
      setDepositStatus('success');
      
      // Update the deposit status immediately to reflect the successful deposit
      setHasDeposited(true);
      
    } catch (error) {
      console.error('Deposit transaction failed:', error);
      setDepositStatus('failed');
      
      // Handle different types of errors with enhanced user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          // User rejected transaction - don't show error popup, just reset status
          setDepositStatus('idle');
          return;
        } else if (error.message.includes('insufficient funds') || error.message.includes('balance')) {
          setError('Insufficient USDT balance. Please ensure you have enough USDT in your wallet.');
        } else if (error.message.includes('gas') || error.message.includes('Gas')) {
          setError('Transaction failed due to gas issues. Try increasing gas limit or gas price in your wallet.');
        } else if (error.message.includes('network') || error.message.includes('Network') || error.message.includes('timeout')) {
          setError('Network error occurred. Please check your connection and try again.');
          setNetworkError('Network Error');
        } else if (error.message.includes('allowance') || error.message.includes('ERC20: insufficient allowance')) {
          setError('USDT allowance insufficient. Please approve USDT spending again.');
          setApprovalStatus('idle'); // Reset approval status so user can re-approve
        } else if (error.message.includes('nonce') || error.message.includes('replacement')) {
          setError('Transaction nonce error. Please reset your wallet account or try again.');
        } else if (error.message.includes('reverted') || error.message.includes('execution reverted')) {
          setError('Transaction was reverted by the contract. You may have already deposited or there may be a contract issue.');
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (error.message.includes('already deposited')) {
          setError('You have already made a deposit to this contract.');
          setHasDeposited(true); // Update UI to reflect deposit status
        } else {
          setError('Deposit transaction failed. Please check your wallet and try again.');
        }
      } else {
        setError('An unexpected error occurred during deposit. Please try again.');
      }
    }
  }, [address, approvalStatus]);

  // Close error popup
  const closeErrorPopup = useCallback(() => {
    setError(null);
    setNetworkError(null);
  }, []);

  // Retry failed transactions
  const retryTransaction = useCallback(() => {
    setError(null);
    setNetworkError(null);
    
    if (approvalStatus === 'failed') {
      handleApprove();
    } else if (depositStatus === 'failed') {
      handleDeposit();
    }
  }, [approvalStatus, depositStatus, handleApprove, handleDeposit]);

  // Manual retry for deposit status check
  const retryDepositStatusCheck = useCallback(() => {
    if (address) {
      setRetryCount(0);
      checkDepositStatus(address);
    }
  }, [address, checkDepositStatus]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-medium">Security Deposit Pool</h1>

          <div className="space-y-4">
            {/* Wallet connection status */}
            <div className="text-center">
              {!isConnected ? (
                <p className="text-gray-300 mb-4">Connect your wallet to continue</p>
              ) : showNetworkPrompt ? (
                <div className="space-y-2">
                  <p className="text-yellow-400 mb-2">Please switch to Base Sepolia</p>
                  <p className="text-sm text-gray-400">You&apos;re currently on the wrong network</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-green-400 mb-2">Wallet Connected</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="flex justify-center">
                <ConnectButton />
              </div>

              {isConnected && showNetworkPrompt && (
                <button
                  onClick={handleSwitchToBaseSepolia}
                  className="w-full py-3 px-6 bg-yellow-600 text-white rounded-lg font-medium border-2 border-yellow-600 hover:bg-yellow-700 transition-colors"
                >
                  Switch to Base Sepolia
                </button>
              )}

              {isConnected && !showNetworkPrompt && (
                <div className="space-y-3">
                  {/* Deposit status display */}
                  {hasDeposited === true && (
                    <div className="text-center">
                      <p className="text-green-400 text-lg font-medium">
                        {depositStatus === 'success' ? 'Deposit Successful!' : 'Deposited'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {depositStatus === 'success' 
                          ? 'Your security deposit has been successfully processed'
                          : 'You have already paid the security deposit'
                        }
                      </p>
                    </div>
                  )}
                  
                  {hasDeposited === false && (
                    <ActionButtons
                      approvalStatus={approvalStatus}
                      depositStatus={depositStatus}
                      onApprove={handleApprove}
                      onDeposit={handleDeposit}
                    />
                  )}
                  
                  {hasDeposited === null && !depositCheckError && (
                    <div className="text-center">
                      <p className="text-blue-400">Checking deposit status...</p>
                      <p className="text-sm text-gray-400">Please wait while we verify your deposit</p>
                    </div>
                  )}
                  
                  {depositCheckError && (
                    <div className="text-center space-y-3">
                      <div>
                        <p className="text-red-400">Error checking deposit status</p>
                        <p className="text-sm text-gray-400">{depositCheckError}</p>
                        {networkError && (
                          <p className="text-xs text-yellow-400 mt-1">Error Type: {networkError}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {retryCount > 0 ? `Retry attempt ${retryCount}/3` : 'Retrying automatically every 30 seconds'}
                        </p>
                      </div>
                      <button
                        onClick={retryDepositStatusCheck}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Retry Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Error popup */}
      <ErrorPopup 
        error={error} 
        onClose={closeErrorPopup} 
        onRetry={retryTransaction}
        showRetry={approvalStatus === 'failed' || depositStatus === 'failed'}
      />
    </div>
  );
}
