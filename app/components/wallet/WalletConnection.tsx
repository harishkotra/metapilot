/**
 * Wallet connection component with connect/disconnect functionality
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { SmartAccountInfo, ConnectionError } from '@/types/wallet';
import { ErrorRecoveryService } from '@/services/wallet';
import { NetworkSwitcher } from './NetworkSwitcher';

interface WalletConnectionProps {
  className?: string;
}

/**
 * Main wallet connection component
 */
export function WalletConnection({ className = '' }: WalletConnectionProps) {
  const { 
    connectionState, 
    isConnecting, 
    error, 
    connect, 
    disconnect, 
    clearError 
  } = useWallet();

  const [showAccountSelector, setShowAccountSelector] = useState(false);

  /**
   * Handle connection button click
   */
  const handleConnect = async () => {
    clearError();
    await connect();
  };

  /**
   * Handle disconnect button click
   */
  const handleDisconnect = async () => {
    await disconnect();
  };

  /**
   * Handle error retry
   */
  const handleRetry = async () => {
    if (error && error.retryAction) {
      try {
        await error.retryAction();
        clearError();
      } catch (err) {
        console.error('Retry failed:', err);
      }
    } else {
      await handleConnect();
    }
  };

  /**
   * Render connection button
   */
  const renderConnectionButton = () => {
    if (connectionState.isConnected) {
      return (
        <button
          onClick={handleDisconnect}
          className="btn-secondary"
          disabled={isConnecting}
        >
          Disconnect
        </button>
      );
    }

    return (
      <button
        onClick={handleConnect}
        className="btn-primary"
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  };

  /**
   * Render Smart Account info
   */
  const renderAccountInfo = () => {
    if (!connectionState.smartAccount) return null;

    const { address, chainId, implementation } = connectionState.smartAccount;

    return (
      <div className="card mt-4">
        <h3 className="text-lg font-semibold mb-3">Connected Account</h3>
        
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium text-gray-600">Address:</label>
            <AddressDisplay address={address} />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Network:</label>
            <NetworkDisplay chainId={chainId} />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Type:</label>
            <span className="ml-2 text-sm">{implementation} Smart Account</span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render error message with recovery options
   */
  const renderError = () => {
    if (!error) return null;

    const strategy = ErrorRecoveryService.getRecoveryStrategy(error, handleRetry);

    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4 mt-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-error-800">
              {error.message}
            </h3>
            <p className="mt-1 text-sm text-error-700">
              {strategy.userGuidance}
            </p>
            {strategy.canRecover && (
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  className="text-sm bg-error-100 hover:bg-error-200 text-error-800 px-3 py-1 rounded"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={clearError}
              className="text-error-400 hover:text-error-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`wallet-connection ${className}`}>
      <div className="text-center">
        {renderConnectionButton()}
      </div>
      
      {renderError()}
      <NetworkSwitcher className="mt-4" />
      {renderAccountInfo()}
    </div>
  );
}

/**
 * Component for displaying Smart Account address with copy functionality
 */
interface AddressDisplayProps {
  address: string;
}

function AddressDisplay({ address }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span 
        className="font-mono text-sm cursor-pointer hover:text-primary-600"
        onClick={handleCopy}
        title={address}
      >
        {truncatedAddress}
      </span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-gray-600"
        title="Copy address"
      >
        {copied ? (
          <svg className="h-4 w-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * Component for displaying network information
 */
interface NetworkDisplayProps {
  chainId: string;
}

function NetworkDisplay({ chainId }: NetworkDisplayProps) {
  // Convert hex chainId to decimal if needed
  const numericChainId = chainId.startsWith('0x') 
    ? parseInt(chainId, 16) 
    : parseInt(chainId, 10);

  const getNetworkName = (chainId: string): string => {
    const numericId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
      
    switch (numericId) {
      case 1:
        return 'Ethereum Mainnet';
      case 11155111:
        return 'Sepolia';
      case 84532:
        return 'Base Sepolia';
      case 8453:
        return 'Base';
      case 10:
        return 'Optimism';
      case 42161:
        return 'Arbitrum One';
      case 2810:
        return 'Morph Holesky';
      default:
        return `Chain ${numericId}`;
    }
  };

  return (
    <span className="ml-2 text-sm">
      {getNetworkName(chainId)}
    </span>
  );
}