/**
 * Core wallet manager for MetaMask Smart Account integration
 */

import { 
  ConnectionState, 
  ConnectionResult, 
  NetworkResult, 
  SmartAccountInfo, 
  SmartAccountImplementation,
  ConnectionError,
  ConnectionErrorCode 
} from '@/types/wallet';
import { WalletManager as IWalletManager } from './types';
import { NetworkValidator } from './NetworkValidator';
import { ConnectionStateService } from './ConnectionStateService';
import { SmartAccountService } from './SmartAccountService';

/**
 * Main wallet manager that orchestrates MetaMask Smart Account connections
 */
export class WalletManager implements IWalletManager {
  private smartAccountService: SmartAccountService;
  private networkValidator: NetworkValidator;
  private stateService: ConnectionStateService;
  private isInitialized = false;

  constructor() {
    this.smartAccountService = new SmartAccountService();
    this.networkValidator = new NetworkValidator();
    this.stateService = new ConnectionStateService();
    
    // Check if we have a valid stored connection state
    const storedState = this.stateService.loadConnectionState();
    if (storedState && storedState.isConnected && storedState.smartAccount) {
      this.isInitialized = true;
    }
  }

  /**
   * Initialize connection to MetaMask Smart Account
   */
  async initializeConnection(): Promise<ConnectionResult> {
    try {
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.MetaMaskNotInstalled,
            'MetaMask is not installed',
            'Please install MetaMask browser extension to continue'
          )
        };
      }

      // Get the current network first
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Validate network support
      if (!this.networkValidator.isNetworkSupported(chainId)) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.NetworkUnsupported,
            'Network not supported',
            this.networkValidator.getUnsupportedNetworkMessage(chainId)
          )
        };
      }

      // Initialize Smart Account
      const result = await this.smartAccountService.initializeSmartAccount();
      
      if (!result.success) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.NetworkError,
            'Smart Account initialization failed',
            result.error || 'Unknown error'
          )
        };
      }

      // Create Smart Account info
      const smartAccount: SmartAccountInfo = {
        address: result.address!,
        chainId: chainId,
        implementation: SmartAccountImplementation.Hybrid,
        isDeployed: true,
      };

      // Get network info
      const networkInfo = this.networkValidator.getNetworkInfo(chainId);

      // Update connection state
      const connectionState: ConnectionState = {
        isConnected: true,
        smartAccount,
        network: networkInfo,
        lastConnected: new Date(),
        autoReconnect: true,
        sessionId: this.generateSessionId(),
      };

      this.stateService.saveConnectionState(connectionState);
      this.isInitialized = true;

      return {
        success: true,
        smartAccount,
      };

    } catch (error) {
      console.error('Connection failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          return {
            success: false,
            error: this.createConnectionError(
              ConnectionErrorCode.UserRejected,
              'Connection was rejected',
              'User rejected the connection request'
            )
          };
        }
      }

      return {
        success: false,
        error: this.createConnectionError(
          ConnectionErrorCode.NetworkError,
          'Connection failed',
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      };
    }
  }

  /**
   * Disconnect from wallet and clear state
   */
  async disconnect(): Promise<void> {
    try {
      await this.smartAccountService.disconnect();
      this.stateService.clearConnectionState();
      this.isInitialized = false;
    } catch (error) {
      // Still clear state even if disconnect fails
      this.stateService.clearConnectionState();
      this.isInitialized = false;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    const state = this.stateService.getCurrentState();
    return state || {
      isConnected: false,
      smartAccount: null,
      network: null,
      lastConnected: null,
      autoReconnect: false,
      sessionId: null,
    };
  }

  /**
   * Attempt to restore previous connection
   */
  async restoreConnection(): Promise<ConnectionResult> {
    try {
      const storedState = this.stateService.loadConnectionState();
      
      if (!storedState || !storedState.autoReconnect || !storedState.isConnected) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.UnknownError,
            'No stored connection to restore',
            'Please connect your wallet'
          )
        };
      }

      // Check if connection is expired
      if (this.stateService.isConnectionExpired()) {
        this.stateService.clearConnectionState();
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.UnknownError,
            'Connection expired',
            'Please reconnect your wallet'
          )
        };
      }

      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        this.stateService.clearConnectionState();
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.MetaMaskNotInstalled,
            'MetaMask is not installed',
            'Please install MetaMask browser extension to continue'
          )
        };
      }

      // Try to initialize Smart Account
      const smartAccountResult = await this.smartAccountService.initializeSmartAccount();
      if (smartAccountResult.success) {
        this.isInitialized = true;
        return {
          success: true,
          smartAccount: storedState.smartAccount!,
        };
      } else {
        this.stateService.clearConnectionState();
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.NetworkError,
            'Failed to restore Smart Account',
            'Please reconnect your wallet'
          )
        };
      }

    } catch (error) {
      this.stateService.clearConnectionState();
      return {
        success: false,
        error: this.createConnectionError(
          ConnectionErrorCode.NetworkError,
          'Failed to restore connection',
          'Please reconnect your wallet'
        )
      };
    }
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId: string): Promise<NetworkResult> {
    try {
      if (!this.isInitialized || typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.NetworkError,
            'Wallet not connected',
            'Please connect your wallet first'
          )
        };
      }

      // Validate target network
      if (!this.networkValidator.isNetworkSupported(chainId)) {
        return {
          success: false,
          error: this.createConnectionError(
            ConnectionErrorCode.NetworkUnsupported,
            'Network not supported',
            this.networkValidator.getUnsupportedNetworkMessage(chainId)
          )
        };
      }

      // Request network switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });

      // Update connection state with new network
      const networkInfo = this.networkValidator.getNetworkInfo(chainId);
      if (networkInfo) {
        this.stateService.updateConnectionState({
          network: networkInfo,
        });
      }

      return {
        success: true,
        network: networkInfo || undefined,
      };

    } catch (error) {
      console.error('Network switch failed:', error);
      
      return {
        success: false,
        error: this.createConnectionError(
          ConnectionErrorCode.NetworkError,
          'Failed to switch network',
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      };
    }
  }

  /**
   * Check if wallet is currently connected
   */
  isConnected(): boolean {
    const state = this.getConnectionState();
    return state.isConnected && 
           state.smartAccount !== null && 
           (this.smartAccountService.isInitialized() || this.isInitialized);
  }

  /**
   * Get current Smart Account address
   */
  getCurrentAddress(): string | null {
    const state = this.getConnectionState();
    return state.smartAccount?.address || null;
  }

  /**
   * Get Smart Account service for advanced operations
   */
  getSmartAccountService(): SmartAccountService {
    return this.smartAccountService;
  }

  /**
   * Subscribe to connection state changes
   */
  subscribeToStateChanges(callback: (state: ConnectionState) => void): void {
    this.stateService.subscribeToStateChanges(callback);
  }

  /**
   * Create a standardized connection error
   */
  private createConnectionError(
    code: ConnectionErrorCode,
    message: string,
    details?: string
  ): ConnectionError {
    const recoverable = code !== ConnectionErrorCode.MetaMaskNotInstalled;
    
    return {
      code,
      message,
      details,
      recoverable,
      retryAction: recoverable ? async () => { 
        await this.initializeConnection(); 
      } : undefined,
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stateService.destroy();
    this.smartAccountService.disconnect().catch(() => {});
  }
}