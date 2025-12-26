/**
 * Network switching component for unsupported networks
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { NetworkValidator } from '@/services/wallet';

interface NetworkSwitcherProps {
  className?: string;
}

/**
 * Component for switching to supported networks
 */
export function NetworkSwitcher({ className = '' }: NetworkSwitcherProps) {
  const { connectionState, switchNetwork } = useWallet();
  const [isSwitching, setIsSwitching] = useState(false);
  const networkValidator = new NetworkValidator();

  // Check if current network is supported
  const currentChainId = connectionState.network?.chainId;
  const isCurrentNetworkSupported = currentChainId ? 
    networkValidator.isNetworkSupported(currentChainId) : false;

  // Get supported networks
  const supportedNetworks = networkValidator.getSupportedNetworks();

  /**
   * Handle network switch
   */
  const handleNetworkSwitch = async (chainId: string) => {
    setIsSwitching(true);
    try {
      await switchNetwork(chainId);
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't show if current network is supported or no connection
  if (isCurrentNetworkSupported || !connectionState.isConnected) {
    return null;
  }

  return (
    <div className={`network-switcher ${className}`}>
      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-warning-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-warning-800">
              Unsupported Network
            </h3>
            <p className="mt-1 text-sm text-warning-700">
              Your current network is not supported. Please switch to a supported network to use MetaPilot.
            </p>
            <div className="mt-3">
              <div className="text-sm font-medium text-warning-800 mb-2">
                Supported Networks:
              </div>
              <div className="space-y-2">
                {supportedNetworks.map((network) => (
                  <button
                    key={network.chainId}
                    onClick={() => handleNetworkSwitch(network.chainId)}
                    disabled={isSwitching}
                    className="block w-full text-left px-3 py-2 text-sm bg-warning-100 hover:bg-warning-200 text-warning-800 rounded border border-warning-300 disabled:opacity-50"
                  >
                    <div className="font-medium">{network.name}</div>
                    <div className="text-xs text-warning-600">
                      Chain ID: {network.chainId}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}