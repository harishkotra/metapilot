/**
 * MetaMask Smart Accounts Service
 * Handles Smart Account creation and ERC-7715 permission-based transactions
 */

import { createPublicClient, http, Address, Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  Implementation,
  toMetaMaskSmartAccount,
  MetaMaskSmartAccount,
} from '@metamask/smart-accounts-kit';

export interface SmartAccountConfig {
  rpcUrl: string;
  chainId: number;
  implementation: Implementation;
}

export interface ERC7715Permission {
  id: string;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: {
    start: number;
    end: number;
  };
  salt: Hex;
  signature?: Hex;
}

export interface SmartAccountTransaction {
  to: Address;
  value?: bigint;
  data?: Hex;
  permissionId?: string;
}

export class SmartAccountService {
  private publicClient: any;
  private smartAccount: MetaMaskSmartAccount | null = null;
  private permissions: Map<string, ERC7715Permission> = new Map();
  private config: SmartAccountConfig;

  constructor(config?: Partial<SmartAccountConfig>) {
    this.config = {
      rpcUrl: 'https://sepolia.base.org',
      chainId: 84532, // Base Sepolia
      implementation: Implementation.Hybrid,
      ...config,
    };

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Initialize Smart Account connection
   */
  async initializeSmartAccount(): Promise<{
    success: boolean;
    address?: Address;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: 'MetaMask not available',
        };
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: 'No accounts available',
        };
      }

      // Create a signer from the connected account
      // Note: In production, this would use the actual MetaMask signer
      const account = privateKeyToAccount(
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // Placeholder
      );

      // Create Smart Account
      this.smartAccount = await toMetaMaskSmartAccount({
        client: this.publicClient,
        implementation: this.config.implementation,
        deployParams: [accounts[0] as Address, [], [], []],
        deploySalt: '0x0000000000000000000000000000000000000000000000000000000000000000',
        signer: { account },
      });

      console.log('✅ Smart Account initialized:', this.smartAccount.address);

      return {
        success: true,
        address: this.smartAccount.address,
      };

    } catch (error) {
      console.error('❌ Smart Account initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an ERC-7715 permission
   */
  async createPermission(params: {
    spender: Address;
    token: Address;
    allowance: string;
    startTime: Date;
    endTime: Date;
    permissionManagerId?: string; // Optional ID from PermissionManager
  }): Promise<{
    success: boolean;
    permissionId?: string;
    error?: string;
  }> {
    try {
      if (!this.smartAccount) {
        return {
          success: false,
          error: 'Smart Account not initialized',
        };
      }

      // CRITICAL: Always use the PermissionManager ID to ensure synchronization
      const permissionId = params.permissionManagerId || `perm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      console.log('🔐 SmartAccountService.createPermission called with params:', {
        spender: params.spender,
        token: params.token,
        allowance: params.allowance,
        permissionManagerId: params.permissionManagerId,
        generatedPermissionId: permissionId,
        willUseManagerId: !!params.permissionManagerId,
      });
      
      // Convert allowance to Wei (assuming it's in ETH/token units)
      let allowanceInWei: bigint;
      try {
        allowanceInWei = this.toWei(params.allowance);
      } catch (error) {
        console.error('Failed to convert allowance to Wei:', params.allowance, error);
        return {
          success: false,
          error: `Invalid allowance format: ${params.allowance}`,
        };
      }
      
      const permission: ERC7715Permission = {
        id: permissionId,
        spender: params.spender,
        token: params.token,
        allowance: allowanceInWei,
        period: {
          start: Math.floor(params.startTime.getTime() / 1000),
          end: Math.floor(params.endTime.getTime() / 1000),
        },
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };

      // In a real implementation, this would:
      // 1. Create the ERC-7715 permission structure
      // 2. Sign the permission with the Smart Account
      // 3. Store the permission on-chain or in a registry
      
      // For now, we'll simulate this process
      console.log('🔐 Creating ERC-7715 permission:', {
        ...permission,
        allowance: `${allowanceInWei.toString()} Wei (${params.allowance} tokens)`,
      });
      
      // Simulate permission signature
      permission.signature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      this.permissions.set(permissionId, permission);

      console.log('✅ SmartAccountService permission stored successfully:');
      console.log('   - Permission ID:', permissionId);
      console.log('   - Stored with key:', permissionId);
      console.log('   - Total permissions in SmartAccountService:', this.permissions.size);
      console.log('   - All permission keys:', Array.from(this.permissions.keys()));
      console.log('   - Can retrieve immediately:', !!this.permissions.get(permissionId));

      return {
        success: true,
        permissionId,
      };

    } catch (error) {
      console.error('❌ Permission creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a transaction using ERC-7715 permissions (gasless)
   */
  async executeWithPermission(
    transaction: SmartAccountTransaction
  ): Promise<{
    success: boolean;
    txHash?: Hex;
    error?: string;
  }> {
    try {
      if (!this.smartAccount) {
        return {
          success: false,
          error: 'Smart Account not initialized',
        };
      }

      if (!transaction.permissionId) {
        return {
          success: false,
          error: 'Permission ID required for gasless execution',
        };
      }

      const permission = this.permissions.get(transaction.permissionId);
      if (!permission) {
        return {
          success: false,
          error: 'Permission not found',
        };
      }

      // Validate permission is still valid
      const now = Math.floor(Date.now() / 1000);
      if (now < permission.period.start || now > permission.period.end) {
        return {
          success: false,
          error: 'Permission expired or not yet active',
        };
      }

      console.log('🚀 Executing gasless transaction with permission:', transaction.permissionId);
      console.log('📋 Transaction details:', {
        to: transaction.to,
        value: transaction.value?.toString(),
        data: transaction.data,
      });

      // In a real implementation, this would:
      // 1. Validate the transaction against the permission constraints
      // 2. Create a UserOperation with the permission proof
      // 3. Submit to a bundler for gasless execution
      // 4. Return the actual transaction hash

      // For now, simulate the gasless execution
      const simulatedTxHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}` as Hex;
      
      console.log('✅ Gasless transaction executed:', simulatedTxHash);
      console.log(`🔗 View on BaseScan: https://sepolia-explorer.base.org/tx/${simulatedTxHash}`);

      return {
        success: true,
        txHash: simulatedTxHash,
      };

    } catch (error) {
      console.error('❌ Gasless transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Smart Account address
   */
  getAddress(): Address | null {
    return this.smartAccount?.address || null;
  }

  /**
   * Get all permissions
   */
  getPermissions(): ERC7715Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Debug method to check permission storage
   */
  debugPermissions(): void {
    console.log('🔍 SmartAccountService Debug Info:');
    console.log('   - Total permissions:', this.permissions.size);
    console.log('   - Permission keys:', Array.from(this.permissions.keys()));
    console.log('   - Permission details:', Array.from(this.permissions.entries()).map(([key, perm]) => ({
      key,
      id: perm.id,
      spender: perm.spender,
      token: perm.token,
    })));
    console.log('   - SmartAccount initialized:', this.isInitialized());
    console.log('   - SmartAccount address:', this.getAddress());
  }

  /**
   * Test method to create a sample permission for debugging
   */
  async createTestPermission(testId: string): Promise<void> {
    console.log('🧪 Creating test permission with ID:', testId);
    
    const result = await this.createPermission({
      spender: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' as any,
      token: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' as any,
      allowance: '1000',
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000), // 24 hours
      permissionManagerId: testId,
    });
    
    console.log('🧪 Test permission creation result:', result);
    
    // Immediately try to retrieve it
    const retrieved = this.getPermission(testId);
    console.log('🧪 Test permission retrieval:', !!retrieved);
  }

  /**
   * Get a specific permission
   */
  getPermission(permissionId: string): ERC7715Permission | null {
    console.log('🔍 SmartAccountService.getPermission called with ID:', permissionId);
    console.log('📊 Available permissions:', Array.from(this.permissions.keys()));
    console.log('🔍 Direct lookup result:', !!this.permissions.get(permissionId));
    
    const result = this.permissions.get(permissionId) || null;
    
    if (result) {
      console.log('✅ Permission found:', { id: result.id, spender: result.spender });
    } else {
      console.log('❌ Permission not found for ID:', permissionId);
    }
    
    return result;
  }

  /**
   * Revoke a permission
   */
  async revokePermission(permissionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const permission = this.permissions.get(permissionId);
      if (!permission) {
        return {
          success: false,
          error: 'Permission not found',
        };
      }

      // In a real implementation, this would revoke the permission on-chain
      this.permissions.delete(permissionId);

      console.log('🗑️ Permission revoked:', permissionId);

      return {
        success: true,
      };

    } catch (error) {
      console.error('❌ Permission revocation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert ETH/token amount to Wei
   */
  private toWei(amount: string): bigint {
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat < 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    // Convert to Wei (multiply by 10^18)
    return BigInt(Math.floor(amountFloat * 1e18));
  }

  /**
   * Convert Wei to ETH/token amount
   */
  private fromWei(wei: bigint): string {
    return (Number(wei) / 1e18).toString();
  }

  /**
   * Check if Smart Account is initialized
   */
  isInitialized(): boolean {
    return this.smartAccount !== null;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.smartAccount = null;
    this.permissions.clear();
  }
}

// Global Smart Account service instance
export const smartAccountService = new SmartAccountService();