'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createReadOnlyContractUtils, createContractUtils, CONTRACT_ADDRESSES } from './contracts';

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
  const [error, setError] = useState<string | null>(null);

  // Function to check deposit status for connected wallet
  const checkDepositStatus = useCallback(async (userAddress: string) => {
    try {
      setDepositCheckError(null);
      
      // Use fallback contract address from environment if needed
      if (!CONTRACT_ADDRESSES.SECURITY_DEPOSIT_POOL) {
        throw new Error('Security deposit pool contract address not configured');
      }

      const contractUtils = await createReadOnlyContractUtils();
      const deposited = await contractUtils.hasDeposited(userAddress);
      setHasDeposited(deposited);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      
      // Handle different types of errors with fallback scenarios
      if (error instanceof Error) {
        if (error.message.includes('contract address not configured')) {
          setDepositCheckError('Contract configuration error. Please check environment variables.');
        } else if (error.message.includes('network')) {
          setDepositCheckError('Network error. Please check your connection.');
        } else {
          setDepositCheckError('Unable to check deposit status. Will retry automatically.');
        }
      } else {
        setDepositCheckError('Unknown error occurred while checking deposit status.');
      }
      
      // Set hasDeposited to null to indicate unknown status
      setHasDeposited(null);
    }
  }, []);

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

  // Check if user is on Ethereum mainnet
  useEffect(() => {
    if (isConnected && chainId !== mainnet.id) {
      setShowNetworkPrompt(true);
    } else {
      setShowNetworkPrompt(false);
    }
  }, [isConnected, chainId]);

  // Handle deposit status polling based on wallet connection and network
  useEffect(() => {
    if (isConnected && address && chainId === mainnet.id) {
      // Start polling when wallet is connected and on correct network
      startDepositStatusPolling(address);
    } else {
      // Stop polling and reset state when wallet disconnects or wrong network
      stopDepositStatusPolling();
      setHasDeposited(null);
      setDepositCheckError(null);
    }

    // Cleanup on unmount
    return () => {
      stopDepositStatusPolling();
    };
  }, [isConnected, address, chainId, startDepositStatusPolling, stopDepositStatusPolling]);

  const handleSwitchToMainnet = () => {
    switchChain({ chainId: mainnet.id });
  };

  // Handle USDT approval transaction
  const handleApprove = useCallback(async () => {
    if (!address) return;
    
    try {
      setApprovalStatus('pending');
      setError(null);
      
      const contractUtils = await createContractUtils();
      
      // Get the required deposit amount
      const depositAmount = await contractUtils.getFlatDepositAmount();
      
      // Initiate USDT approval transaction
      const approveTx = await contractUtils.approveUSDT(depositAmount);
      
      // Wait for transaction confirmation
      await approveTx.wait();
      
      setApprovalStatus('approved');
    } catch (error) {
      console.error('Approval transaction failed:', error);
      setApprovalStatus('failed');
      
      // Handle different types of errors with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          // User rejected transaction - don't show error popup
          setApprovalStatus('idle');
          return;
        } else if (error.message.includes('insufficient funds')) {
          setError('Insufficient USDT balance to complete approval.');
        } else if (error.message.includes('gas')) {
          setError('Transaction failed due to gas issues. Please try again with higher gas settings.');
        } else if (error.message.includes('network')) {
          setError('Network error occurred. Please check your connection and try again.');
        } else {
          setError('Approval transaction failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred during approval. Please try again.');
      }
    }
  }, [address]);

  // Close error popup
  const closeErrorPopup = useCallback(() => {
    setError(null);
  }, []);

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
                  <p className="text-yellow-400 mb-2">Please switch to Ethereum Mainnet</p>
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
                  onClick={handleSwitchToMainnet}
                  className="w-full py-3 px-6 bg-yellow-600 text-white rounded-lg font-medium border-2 border-yellow-600 hover:bg-yellow-700 transition-colors"
                >
                  Switch to Ethereum Mainnet
                </button>
              )}

              {isConnected && !showNetworkPrompt && (
                <div className="space-y-3">
                  {/* Deposit status display */}
                  {hasDeposited === true && (
                    <div className="text-center">
                      <p className="text-green-400 text-lg font-medium">Deposited</p>
                      <p className="text-sm text-gray-400">You have already paid the security deposit</p>
                    </div>
                  )}
                  
                  {hasDeposited === false && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-yellow-400">Deposit Required</p>
                        <p className="text-sm text-gray-400">You need to complete the deposit process</p>
                      </div>
                      
                      {/* Approve button */}
                      <button
                        onClick={handleApprove}
                        disabled={approvalStatus === 'pending' || approvalStatus === 'approved'}
                        className={`w-full py-3 px-6 rounded-lg font-medium border-2 transition-colors flex items-center justify-center ${
                          approvalStatus === 'approved'
                            ? 'bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed'
                            : approvalStatus === 'pending'
                            ? 'bg-gray-600 text-white border-gray-600 cursor-not-allowed'
                            : 'bg-white text-black border-white hover:bg-gray-100'
                        }`}
                      >
                        {approvalStatus === 'pending' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </>
                        ) : approvalStatus === 'approved' ? (
                          'Approved'
                        ) : (
                          'Approve USDT'
                        )}
                      </button>
                      
                      {/* Deposit button (placeholder for now, will be implemented in next task) */}
                      <button
                        disabled={approvalStatus !== 'approved'}
                        className={`w-full py-3 px-6 rounded-lg font-medium border-2 transition-colors ${
                          approvalStatus === 'approved'
                            ? 'bg-white text-black border-white hover:bg-gray-100'
                            : 'bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed'
                        }`}
                      >
                        Deposit
                      </button>
                    </div>
                  )}
                  
                  {hasDeposited === null && !depositCheckError && (
                    <div className="text-center">
                      <p className="text-blue-400">Checking deposit status...</p>
                      <p className="text-sm text-gray-400">Please wait while we verify your deposit</p>
                    </div>
                  )}
                  
                  {depositCheckError && (
                    <div className="text-center">
                      <p className="text-red-400">Error checking deposit status</p>
                      <p className="text-sm text-gray-400">{depositCheckError}</p>
                      <p className="text-xs text-gray-500 mt-1">Retrying automatically every 30 seconds</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Error popup */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md mx-4">
            <div className="text-center space-y-4">
              <div className="text-red-400 text-lg font-medium">Transaction Error</div>
              <p className="text-gray-300 text-sm">{error}</p>
              <button
                onClick={closeErrorPopup}
                className="w-full py-2 px-4 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
