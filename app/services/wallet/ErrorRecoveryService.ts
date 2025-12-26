/**
 * Error recovery strategies for wallet connection failures
 */

import { 
  ConnectionErrorCode, 
  ErrorRecoveryStrategy, 
  ConnectionError 
} from '@/types/wallet';

/**
 * Service for handling connection error recovery
 */
export class ErrorRecoveryService {
  private static readonly RETRY_DELAYS = {
    [ConnectionErrorCode.NetworkError]: 2000,
    [ConnectionErrorCode.UserRejected]: 0,
    [ConnectionErrorCode.NetworkUnsupported]: 0,
    [ConnectionErrorCode.SmartAccountUnavailable]: 5000,
    [ConnectionErrorCode.MetaMaskNotInstalled]: 0,
    [ConnectionErrorCode.UnknownError]: 3000,
  };

  /**
   * Get recovery strategy for a specific error
   */
  static getRecoveryStrategy(
    error: ConnectionError,
    retryCallback: () => Promise<void>
  ): ErrorRecoveryStrategy {
    switch (error.code) {
      case ConnectionErrorCode.MetaMaskNotInstalled:
        return {
          canRecover: false,
          userGuidance: 'Please install MetaMask browser extension to continue. Visit metamask.io to download.',
        };

      case ConnectionErrorCode.UserRejected:
        return {
          canRecover: true,
          recoveryAction: retryCallback,
          userGuidance: 'Connection was cancelled. Click "Connect Wallet" to try again.',
          retryDelay: this.RETRY_DELAYS[error.code],
        };

      case ConnectionErrorCode.NetworkUnsupported:
        return {
          canRecover: true,
          recoveryAction: async () => {
            // This would trigger network switching UI
            console.log('Triggering network switch UI');
          },
          userGuidance: error.details || 'Please switch to a supported network (Sepolia or Base Sepolia).',
        };

      case ConnectionErrorCode.SmartAccountUnavailable:
        return {
          canRecover: true,
          recoveryAction: retryCallback,
          userGuidance: 'Smart Account features are not available. Please ensure you have a compatible wallet setup.',
          retryDelay: this.RETRY_DELAYS[error.code],
        };

      case ConnectionErrorCode.NetworkError:
        return {
          canRecover: true,
          recoveryAction: retryCallback,
          userGuidance: 'Network connection failed. Please check your internet connection and try again.',
          retryDelay: this.RETRY_DELAYS[error.code],
        };

      case ConnectionErrorCode.UnknownError:
      default:
        return {
          canRecover: true,
          recoveryAction: retryCallback,
          userGuidance: 'An unexpected error occurred. Please try connecting again.',
          retryDelay: this.RETRY_DELAYS[ConnectionErrorCode.UnknownError],
        };
    }
  }

  /**
   * Execute recovery action with proper error handling
   */
  static async executeRecovery(strategy: ErrorRecoveryStrategy): Promise<boolean> {
    if (!strategy.canRecover || !strategy.recoveryAction) {
      return false;
    }

    try {
      // Apply retry delay if specified
      if (strategy.retryDelay && strategy.retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
      }

      await strategy.recoveryAction();
      return true;
    } catch (error) {
      console.error('Recovery action failed:', error);
      return false;
    }
  }

  /**
   * Get user-friendly error message with guidance
   */
  static getErrorMessage(error: ConnectionError): string {
    const strategy = this.getRecoveryStrategy(error, async () => {});
    return strategy.userGuidance;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: ConnectionError): boolean {
    const strategy = this.getRecoveryStrategy(error, async () => {});
    return strategy.canRecover;
  }

  /**
   * Get retry delay for error type
   */
  static getRetryDelay(errorCode: ConnectionErrorCode): number {
    return this.RETRY_DELAYS[errorCode] || 0;
  }
}