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
  const depositButtonText = isDepositPending ? 'Processing...' : 'Deposit 73 USDT';

  // Button styling based on state
  const getButtonClassName = (isDisabled: boolean, isPending: boolean, isCompleted: boolean = false) => {
    const baseClasses = "w-full max-w-[300px] py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer";

    if (isCompleted) {
      // Completed state (approved)
      return `${baseClasses} bg-green-600/20 text-green-400 border border-green-600 cursor-not-allowed`;
    } else if (isDisabled && !isPending) {
      // Disabled state (not pending)
      return `${baseClasses} bg-gray-700/50 text-gray-500 border border-gray-700 cursor-not-allowed`;
    } else if (isPending) {
      // Loading state
      return `${baseClasses} bg-blue-600 text-white border border-blue-600 cursor-not-allowed`;
    } else {
      // Active state
      return `${baseClasses} bg-slate-700 text-white border border-slate-600 hover:bg-slate-600 hover:border-slate-500`;
    }
  };

  return (
    <div className="space-y-6" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: `center`
    }}>
      {/* Progress Header */}
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6" style={{
        gap: `4px`,
      }}>
        <div className="flex items-center" style={{
          gap: `4px`,
        }}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isApprovalCompleted ? 'bg-green-600 text-white' :
            isApprovalPending ? 'bg-blue-600 text-white' :
              'bg-gray-700 text-gray-400'
            }`}>
            {isApprovalCompleted ? '✓' : '1'}
          </div>
          <span className={`ml-2 text-sm font-medium ${isApprovalCompleted ? 'text-green-400' :
            isApprovalPending ? 'text-blue-400' :
              'text-gray-400'
            }`}>
            Approve
          </span>
        </div>

        <div className={`w-8 h-0.5 ${isApprovalCompleted ? 'bg-green-600' : 'bg-gray-700'}`}></div>

        <div className="flex items-center" style={{
          gap: `4px`,
        }}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDepositPending ? 'bg-blue-600 text-white' :
            isApprovalCompleted ? 'bg-gray-600 text-white' :
              'bg-gray-700 text-gray-400'
            }`}>
            2
          </div>
          <span className={`ml-2 text-sm font-medium ${isDepositPending ? 'text-blue-400' :
            isApprovalCompleted ? 'text-gray-300' :
              'text-gray-400'
            }`}>
            Deposit
          </span>
        </div>
      </div>

      {/* Approve button */}
      <button
        onClick={onApprove}
        disabled={isApproveButtonDisabled}
        className={`${getButtonClassName(isApproveButtonDisabled, isApprovalPending, isApprovalCompleted)}`}
        aria-label={`Approve USDT spending - ${isApproveButtonDisabled ? 'disabled' : 'enabled'}`}
      >
        {isApprovalPending && <LoadingSpinner className="h-5 w-5 text-white mr-2" />}
        {isApprovalCompleted && (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {approveButtonText}
      </button>

      {/* Deposit button */}
      <button
        onClick={onDeposit}
        disabled={isDepositButtonDisabled}
        className={getButtonClassName(isDepositButtonDisabled, isDepositPending)}
        aria-label={`Make deposit - ${isDepositButtonDisabled ? 'disabled' : 'enabled'}`}
      >
        {isDepositPending && <LoadingSpinner className="h-5 w-5 text-white mr-2" />}
        {/* {!isDepositPending && !isDepositButtonDisabled && (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )} */}
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
      // But don't check during pending transactions to avoid state conflicts
      if (!deposited && approvalStatus !== 'pending' && depositStatus !== 'pending') {
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
        setError(`Insufficient USDT balance. You need at least ${depositAmount / BigInt(1e6)} USDT to complete the deposit.`);
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
        setError(`Insufficient USDT balance. You need at least ${depositAmount / BigInt(1e6)} USDT to complete the deposit.`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="rounded-2xl shadow-2xl p-8" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Security Deposit Pool
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div className="flex justify-center">
              <ConnectButton />
            </div>

            {isConnected && showNetworkPrompt && (
              <button
                onClick={handleSwitchToBaseSepolia}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-xl font-semibold border border-yellow-500 hover:from-yellow-500 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/25"
              >
                Switch to Base Sepolia
              </button>
            )}

            {isConnected && !showNetworkPrompt && (
              <div className="space-y-6" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Deposit Success State */}
                {hasDeposited === true && (
                  <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-800">
                    <span className="text-green-400 text-sm font-medium">
                      ✓ {depositStatus === 'success' ? 'Deposit Complete' : 'Already Deposited'}
                    </span>
                  </div>
                )}

                {/* Action Buttons for Deposit Flow */}
                {hasDeposited === false && (
                  <ActionButtons
                    approvalStatus={approvalStatus}
                    depositStatus={depositStatus}
                    onApprove={handleApprove}
                    onDeposit={handleDeposit}
                  />
                )}

                {/* Loading State */}
                {hasDeposited === null && !depositCheckError && (
                  <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-400 text-sm">Checking status...</span>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {depositCheckError && (
                  <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-800">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-red-400 text-sm">⚠ Connection Error</span>
                    </div>
                    <button
                      onClick={retryDepositStatusCheck}
                      className="px-4 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
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
