/**
 * Custom hook for wallet connection management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ConnectionState, 
  ConnectionResult, 
  ConnectionError 
} from '@/types/wallet';
import { WalletManager } from '@/services/wallet';

interface UseWalletReturn {
  connectionState: ConnectionState;
  isConnecting: boolean;
  error: ConnectionError | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: string) => Promise<void>;
  clearError: () => void;
}

// Create a single global wallet manager instance
let globalWalletManager: WalletManager | null = null;

export function getWalletManager(): WalletManager {
  if (!globalWalletManager) {
    globalWalletManager = new WalletManager();
  }
  return globalWalletManager;
}

/**
 * Hook for managing wallet connection state and operations
 */
export function useWallet(): UseWalletReturn {
  const walletManager = getWalletManager();
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => 
    walletManager.getConnectionState()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<ConnectionError | null>(null);

  // Subscribe to connection state changes
  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setConnectionState(newState);
    };

    walletManager.subscribeToStateChanges(handleStateChange);

    // Check current state immediately
    const currentState = walletManager.getConnectionState();
    setConnectionState(currentState);

    // Try to restore connection on mount
    const restoreConnection = async () => {
      try {
        await walletManager.restoreConnection();
        
        // Force state refresh after restoration attempt
        const updatedState = walletManager.getConnectionState();
        setConnectionState(updatedState);
      } catch (err) {
        // Ignore restoration errors
      }
    };

    restoreConnection();

    // Don't cleanup the global wallet manager
    return () => {
      // No cleanup needed for global manager
    };
  }, [walletManager]);

  /**
   * Connect to wallet
   */
  const connect = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const result: ConnectionResult = await walletManager.initializeConnection();
      
      if (result.success) {
        // Force state refresh after successful connection
        const newState = walletManager.getConnectionState();
        setConnectionState(newState);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError({
        code: 'UNKNOWN_ERROR' as any,
        message: 'Connection failed',
        details: err instanceof Error ? err.message : 'Unknown error',
        recoverable: true,
      });
    } finally {
      setIsConnecting(false);
    }
  }, [walletManager, isConnecting]);

  /**
   * Disconnect from wallet
   */
  const disconnect = useCallback(async () => {
    try {
      await walletManager.disconnect();
      
      // Force state refresh after disconnection
      const newState = walletManager.getConnectionState();
      setConnectionState(newState);
      
      setError(null);
    } catch (err) {
      // Ignore disconnect errors
    }
  }, [walletManager]);

  /**
   * Switch to a different network
   */
  const switchNetwork = useCallback(async (chainId: string) => {
    try {
      const result = await walletManager.switchNetwork(chainId);
      
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError({
        code: 'NETWORK_ERROR' as any,
        message: 'Network switch failed',
        details: err instanceof Error ? err.message : 'Unknown error',
        recoverable: true,
      });
    }
  }, [walletManager]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connectionState,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    clearError,
  };
}