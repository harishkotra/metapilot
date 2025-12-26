/**
 * Wallet and Smart Account type definitions for MetaPilot
 */

/**
 * Smart Account information from MetaMask SDK
 */
export interface SmartAccountInfo {
  address: string;
  chainId: string;
  implementation: SmartAccountImplementation;
  isDeployed: boolean;
  balance?: string;
}

/**
 * Types of Smart Account implementations supported
 */
export enum SmartAccountImplementation {
  Hybrid = 'Hybrid',
  MultiSig = 'MultiSig',
  Stateless7702 = 'Stateless7702'
}

/**
 * Complete connection state for the wallet
 */
export interface ConnectionState {
  isConnected: boolean;
  smartAccount: SmartAccountInfo | null;
  network: NetworkInfo | null;
  lastConnected: Date | null;
  autoReconnect: boolean;
  sessionId: string | null;
}

/**
 * Network configuration and compatibility information
 */
export interface NetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  supportsEIP7702: boolean;
  supportsERC7715: boolean;
}

/**
 * Result of a connection attempt
 */
export interface ConnectionResult {
  success: boolean;
  smartAccount?: SmartAccountInfo;
  error?: ConnectionError;
}

/**
 * Result of a network operation
 */
export interface NetworkResult {
  success: boolean;
  network?: NetworkInfo;
  error?: ConnectionError;
}

/**
 * Connection error information with recovery options
 */
export interface ConnectionError {
  code: ConnectionErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

/**
 * Specific error codes for different connection failure scenarios
 */
export enum ConnectionErrorCode {
  MetaMaskNotInstalled = 'METAMASK_NOT_INSTALLED',
  UserRejected = 'USER_REJECTED',
  NetworkUnsupported = 'NETWORK_UNSUPPORTED',
  SmartAccountUnavailable = 'SMART_ACCOUNT_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
  UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Error recovery strategy for different error types
 */
export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  recoveryAction?: () => Promise<void>;
  userGuidance: string;
  retryDelay?: number;
}

/**
 * Callback for connection state changes
 */
export type StateChangeCallback = (state: ConnectionState) => void;

/**
 * Legacy interface for backward compatibility
 */
export interface SmartAccount {
  address: string;
  chainId: number;
  isConnected: boolean;
  balance?: string;
}

export interface WalletConnection {
  account: SmartAccount | null;
  isConnecting: boolean;
  error: string | null;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';