'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);

  // Check if user is on Ethereum mainnet
  useEffect(() => {
    if (isConnected && chainId !== mainnet.id) {
      setShowNetworkPrompt(true);
    } else {
      setShowNetworkPrompt(false);
    }
  }, [isConnected, chainId]);

  const handleSwitchToMainnet = () => {
    switchChain({ chainId: mainnet.id });
  };

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
                  <p className="text-sm text-gray-400">You're currently on the wrong network</p>
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
                  <p className="text-green-400">Ready to proceed with deposit</p>
                  {/* Future deposit buttons will go here */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
