/**
 * Quick network switching component for common networks
 */

'use client';

import { useState } from 'react';

interface QuickNetworkSwitchProps {
  onNetworkSwitch: (chainId: string) => Promise<void>;
  className?: string;
}

interface NetworkOption {
  chainId: number;
  hexChainId: string;
  name: string;
  isTestnet: boolean;
}

const QUICK_NETWORKS: NetworkOption[] = [
  { chainId: 84532, hexChainId: '0x14a34', name: 'Base Sepolia', isTestnet: true },
];

/**
 * Component for quickly switching between common supported networks
 */
export function QuickNetworkSwitch({ onNetworkSwitch, className = '' }: QuickNetworkSwitchProps) {
  const [switching, setSwitching] = useState<string | null>(null);

  const handleNetworkSwitch = async (network: NetworkOption) => {
    setSwitching(network.hexChainId);
    try {
      await onNetworkSwitch(network.hexChainId);
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className={`quick-network-switch ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-3">
          Quick Network Switch
        </h4>
        <p className="text-xs text-blue-600 mb-3">
          MetaPilot currently supports Base Sepolia testnet:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_NETWORKS.map((network) => (
            <button
              key={network.chainId}
              onClick={() => handleNetworkSwitch(network)}
              disabled={switching === network.hexChainId}
              className="flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-blue-50 border border-blue-200 rounded text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{network.name}</span>
                <span className="text-xs text-blue-600">
                  Chain ID: {network.chainId}
                </span>
              </div>
              {network.isTestnet && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Testnet
                </span>
              )}
              {switching === network.hexChainId && (
                <div className="ml-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}