/**
 * Smart Account Transaction Service
 * Handles gasless transactions using ERC-7715 permissions
 */

import { SmartAccountService } from '@/services/wallet/SmartAccountService';

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  permissionId?: string; // Required for gasless execution
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  blockNumber?: number;
  isGasless?: boolean;
}

export class TransactionService {
  private smartAccountService: SmartAccountService;

  constructor(smartAccountService: SmartAccountService) {
    this.smartAccountService = smartAccountService;
  }

  /**
   * Execute a gasless transaction using ERC-7715 permissions
   */
  async executeTransaction(request: TransactionRequest): Promise<TransactionResult> {
    if (!this.smartAccountService.isInitialized()) {
      throw new Error('Smart Account not initialized');
    }

    try {
      console.log('🚀 Executing gasless transaction via Smart Account...');
      console.log('📋 Transaction request:', {
        to: request.to,
        value: request.value,
        data: request.data,
        permissionId: request.permissionId,
      });

      // Execute gasless transaction using Smart Account
      const result = await this.smartAccountService.executeWithPermission({
        to: request.to as any,
        value: request.value ? this.parseValueToWei(request.value) : undefined,
        data: request.data as any,
        permissionId: request.permissionId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Gasless transaction failed');
      }

      console.log('✅ Gasless transaction executed:', result.txHash);
      console.log(`🔗 View on BaseScan: https://sepolia-explorer.base.org/tx/${result.txHash}`);

      return {
        hash: result.txHash!,
        status: 'confirmed',
        gasUsed: '0', // Gasless transaction
        isGasless: true,
      };

    } catch (error) {
      console.error('❌ Gasless transaction failed:', error);
      throw new Error(`Gasless transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a simple ETH transfer transaction
   */
  createETHTransfer(to: string, amountInEth: string, permissionId: string): TransactionRequest {
    const valueInWei = this.ethToWei(amountInEth);
    
    return {
      to,
      value: `0x${valueInWei.toString(16)}`,
      permissionId,
    };
  }

  /**
   * Create an ERC-20 token transfer transaction
   */
  createTokenTransfer(tokenAddress: string, to: string, amount: string, permissionId: string): TransactionRequest {
    // ERC-20 transfer function signature: transfer(address,uint256)
    const functionSignature = '0xa9059cbb';
    
    // Encode parameters (simplified - in production use a proper ABI encoder)
    const toAddress = to.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const amountHex = parseInt(amount).toString(16).padStart(64, '0'); // Convert to hex and pad
    
    const data = functionSignature + toAddress + amountHex;
    
    return {
      to: tokenAddress,
      data,
      permissionId,
    };
  }

  /**
   * Convert ETH to Wei safely
   */
  private ethToWei(eth: string): bigint {
    const ethAmount = parseFloat(eth);
    if (isNaN(ethAmount) || ethAmount < 0) {
      throw new Error(`Invalid ETH amount: ${eth}`);
    }
    return BigInt(Math.floor(ethAmount * 1e18));
  }

  /**
   * Parse value string to Wei, handling both hex and decimal formats
   */
  private parseValueToWei(value: string): bigint {
    // If it's already a hex value (starts with 0x), convert directly
    if (value.startsWith('0x')) {
      return BigInt(value);
    }
    
    // Otherwise, treat as decimal ETH amount and convert to Wei
    return this.ethToWei(value);
  }
}

// Create transaction service factory that takes Smart Account service
export function createTransactionService(smartAccountService: SmartAccountService): TransactionService {
  return new TransactionService(smartAccountService);
}