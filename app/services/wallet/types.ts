/**
 * Service interface definitions for wallet connection
 */

import { 
  ConnectionState, 
  ConnectionResult, 
  NetworkResult, 
  NetworkInfo, 
  SmartAccountInfo,
  StateChangeCallback 
} from '@/types/wallet';

/**
 * Main wallet manager interface for orchestrating connections
 */
export interface WalletManager {
  initializeConnection(): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
  restoreConnection(): Promise<ConnectionResult>;
  switchNetwork(chainId: string): Promise<NetworkResult>;
}

/**
 * Network validation service interface
 */
export interface NetworkValidator {
  isNetworkSupported(chainId: string): boolean;
  getSupportedNetworks(): NetworkInfo[];
  validateSmartAccountSupport(chainId: string): Promise<boolean>;
}

/**
 * Connection state persistence service interface
 */
export interface ConnectionStateService {
  saveConnectionState(state: ConnectionState): void;
  loadConnectionState(): ConnectionState | null;
  clearConnectionState(): void;
  subscribeToStateChanges(callback: StateChangeCallback): void;
}