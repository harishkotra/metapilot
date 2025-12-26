/**
 * ERC-7715 Permission Management Service
 * Handles creation, validation, and lifecycle management of agent permissions
 */

import { ERC7715Permission, PermissionRequest, PermissionStatus, SpendTracking } from '@/types/permissions';
import { WalletManager } from '@/services/wallet/WalletManager';

export class PermissionManager {
  private permissions: Map<string, ERC7715Permission> = new Map();
  private spendTracking: Map<string, SpendTracking> = new Map();
  private walletManager: WalletManager;

  constructor(walletManager: WalletManager) {
    this.walletManager = walletManager;
    this.loadPersistedPermissions();
  }

  /**
   * Validate that wallet is connected before operations
   */
  private validateWalletConnection(): void {
    if (!this.walletManager.isConnected()) {
      throw new Error('Wallet not connected. Please connect your wallet to continue.');
    }
  }

  /**
   * Create and request a new ERC-7715 permission via MetaMask
   */
  async createPermission(request: PermissionRequest): Promise<ERC7715Permission> {
    // Validate wallet connection first
    this.validateWalletConnection();
    
    // Validate the permission request
    this.validatePermissionRequest(request);

    // Generate unique permission ID
    const permissionId = this.generatePermissionId();

    // Create the permission object
    const permission: ERC7715Permission = {
      id: permissionId,
      ...request,
      status: 'pending',
      grantedAt: new Date(),
    };

    try {
      // Request permission via MetaMask Smart Account
      const transactionHash = await this.requestMetaMaskPermission(permission);
      
      // Update permission with transaction hash
      permission.transactionHash = transactionHash;
      permission.status = 'active';

      // Store the permission
      this.permissions.set(permissionId, permission);
      
      // Initialize spend tracking
      this.spendTracking.set(permissionId, {
        permissionId,
        totalSpent: '0',
        remainingAllowance: request.maxSpendAmount,
        spendEntries: [],
      });

      // Persist to storage
      this.persistPermissions();

      return permission;
    } catch (error) {
      console.error('Failed to create permission:', error);
      throw new Error(`Permission creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all permissions with optional status filter
   */
  getPermissions(status?: PermissionStatus): ERC7715Permission[] {
    const allPermissions = Array.from(this.permissions.values());
    
    // Update statuses based on current time
    allPermissions.forEach(permission => {
      this.updatePermissionStatus(permission);
    });

    if (status) {
      return allPermissions.filter(p => p.status === status);
    }
    
    return allPermissions;
  }

  /**
   * Get a specific permission by ID
   */
  getPermission(id: string): ERC7715Permission | null {
    const permission = this.permissions.get(id);
    if (permission) {
      this.updatePermissionStatus(permission);
    }
    return permission || null;
  }

  /**
   * Revoke a permission
   */
  async revokePermission(id: string): Promise<void> {
    // Validate wallet connection first
    this.validateWalletConnection();
    
    const permission = this.permissions.get(id);
    if (!permission) {
      throw new Error('Permission not found');
    }

    if (permission.status !== 'active') {
      throw new Error('Can only revoke active permissions');
    }

    try {
      // Revoke via MetaMask (this would be the actual ERC-7715 revocation)
      await this.revokeMetaMaskPermission(permission);
      
      // Update status
      permission.status = 'revoked';
      this.permissions.set(id, permission);
      
      // Persist changes
      this.persistPermissions();
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      throw new Error(`Permission revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if an action is within permission boundaries
   */
  validateAction(permissionId: string, tokenAddress: string, amount: string, contractAddress: string): boolean {
    console.log('🔍 Validating action:', { permissionId, tokenAddress, amount, contractAddress });
    
    const permission = this.getPermission(permissionId);
    if (!permission || permission.status !== 'active') {
      console.log('❌ Permission not found or not active:', { permission: permission?.id, status: permission?.status });
      return false;
    }

    console.log('✅ Permission found:', { 
      id: permission.id, 
      tokenAddress: permission.tokenAddress, 
      maxSpend: permission.maxSpendAmount,
      allowedContracts: permission.allowedContracts 
    });

    // Check token address
    if (permission.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
      console.log('❌ Token address mismatch:', { 
        expected: permission.tokenAddress.toLowerCase(), 
        received: tokenAddress.toLowerCase() 
      });
      return false;
    }

    // Check contract address
    const isContractAllowed = permission.allowedContracts.some(
      addr => addr.toLowerCase() === contractAddress.toLowerCase()
    );
    if (!isContractAllowed) {
      console.log('❌ Contract not allowed:', { 
        contractAddress: contractAddress.toLowerCase(), 
        allowedContracts: permission.allowedContracts.map(addr => addr.toLowerCase()) 
      });
      return false;
    }

    // Check spend limit
    const tracking = this.spendTracking.get(permissionId);
    if (tracking) {
      const totalAfterSpend = parseFloat(tracking.totalSpent) + parseFloat(amount);
      console.log('💰 Spend check:', { 
        currentSpent: tracking.totalSpent, 
        requestedAmount: amount, 
        totalAfterSpend, 
        maxAllowed: permission.maxSpendAmount 
      });
      
      if (totalAfterSpend > parseFloat(permission.maxSpendAmount)) {
        console.log('❌ Spend limit exceeded');
        return false;
      }
    }

    // Check time window
    const now = new Date();
    if (now < permission.startTime || now > permission.endTime) {
      console.log('❌ Time window check failed:', { 
        now: now.toISOString(), 
        startTime: permission.startTime.toISOString(), 
        endTime: permission.endTime.toISOString() 
      });
      return false;
    }

    console.log('✅ All validation checks passed');
    return true;
  }

  /**
   * Record a spend against a permission
   */
  recordSpend(permissionId: string, amount: string, transactionHash: string): void {
    const tracking = this.spendTracking.get(permissionId);
    if (!tracking) {
      throw new Error('Spend tracking not found for permission');
    }

    const newTotalSpent = (parseFloat(tracking.totalSpent) + parseFloat(amount)).toString();
    const newRemainingAllowance = (parseFloat(tracking.remainingAllowance) - parseFloat(amount)).toString();

    tracking.totalSpent = newTotalSpent;
    tracking.remainingAllowance = newRemainingAllowance;
    tracking.spendEntries.push({
      timestamp: new Date(),
      amount,
      transactionHash,
      remainingAfter: newRemainingAllowance,
    });

    this.spendTracking.set(permissionId, tracking);
    this.persistPermissions();
  }

  /**
   * Get spend tracking for a permission
   */
  getSpendTracking(permissionId: string): SpendTracking | null {
    return this.spendTracking.get(permissionId) || null;
  }

  /**
   * Private: Validate permission request parameters
   */
  private validatePermissionRequest(request: PermissionRequest): void {
    // Validate token address
    if (!request.tokenAddress || !this.isValidAddress(request.tokenAddress)) {
      throw new Error('Invalid token address');
    }

    // Validate spend amount
    const amount = parseFloat(request.maxSpendAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid spend amount');
    }

    // Validate time window
    if (request.endTime <= request.startTime) {
      throw new Error('End time must be after start time');
    }

    // Validate contract addresses
    if (!request.allowedContracts.length) {
      throw new Error('At least one contract address is required');
    }

    for (const address of request.allowedContracts) {
      if (!this.isValidAddress(address)) {
        throw new Error(`Invalid contract address: ${address}`);
      }
    }
  }

  /**
   * Private: Generate unique permission ID
   */
  private generatePermissionId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Request permission via MetaMask Smart Account
   */
  private async requestMetaMaskPermission(permission: ERC7715Permission): Promise<string> {
    // Get the Smart Account service from the wallet manager
    const smartAccountService = this.walletManager.getSmartAccountService();
    
    if (!smartAccountService.isInitialized()) {
      throw new Error('Smart Account not initialized');
    }

    // Create ERC-7715 permission using Smart Account service
    const result = await smartAccountService.createPermission({
      spender: permission.allowedContracts[0] as any, // Use first contract as spender
      token: permission.tokenAddress as any,
      allowance: permission.maxSpendAmount,
      startTime: permission.startTime,
      endTime: permission.endTime,
      permissionManagerId: permission.id, // Pass our permission ID to SmartAccountService
    });

    if (!result.success) {
      throw new Error(result.error || 'Permission creation failed');
    }

    console.log('✅ ERC-7715 permission created via Smart Account:', result.permissionId);
    
    // Store the Smart Account permission ID in our permission object for later use
    permission.smartAccountPermissionId = result.permissionId;
    
    console.log('🔗 Permission linking completed:', {
      permissionManagerId: permission.id,
      smartAccountPermissionId: permission.smartAccountPermissionId,
      areEqual: permission.id === permission.smartAccountPermissionId,
    });
    
    // Return a simulated transaction hash for now
    return `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;
  }

  /**
   * Private: Revoke permission via MetaMask
   */
  private async revokeMetaMaskPermission(permission: ERC7715Permission): Promise<void> {
    // This would call the actual ERC-7715 revocation method
    // For now, we'll simulate the revocation
    console.log(`Revoking permission ${permission.id} via MetaMask`);
  }

  /**
   * Private: Simulate MetaMask permission dialog
   */
  private async simulateMetaMaskDialog(permission: ERC7715Permission): Promise<boolean> {
    // In a real implementation, this would trigger the MetaMask dialog
    // For demo purposes, we'll auto-approve with a small delay to simulate user interaction
    
    console.log('🔐 Simulating MetaMask ERC-7715 permission request...');
    console.log('Permission details:', {
      tokenAddress: permission.tokenAddress,
      maxSpendAmount: permission.maxSpendAmount,
      timeWindow: `${permission.startTime.toISOString()} - ${permission.endTime.toISOString()}`,
      allowedContracts: permission.allowedContracts,
    });
    
    // Simulate user thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('✅ Permission approved (auto-approved for demo)');
    return true; // Auto-approve for demo
  }

  /**
   * Private: Update permission status based on current time
   */
  private updatePermissionStatus(permission: ERC7715Permission): void {
    if (permission.status === 'revoked') {
      return; // Don't change revoked status
    }

    const now = new Date();
    if (now > permission.endTime) {
      permission.status = 'expired';
      this.permissions.set(permission.id, permission);
    }
  }

  /**
   * Private: Validate Ethereum address format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Private: Load permissions from localStorage
   */
  private loadPersistedPermissions(): void {
    try {
      const stored = localStorage.getItem('metapilot_permissions');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore permissions
        if (data.permissions) {
          for (const [id, permData] of Object.entries(data.permissions as Record<string, any>)) {
            const permission: ERC7715Permission = {
              ...permData,
              startTime: new Date(permData.startTime),
              endTime: new Date(permData.endTime),
              grantedAt: new Date(permData.grantedAt),
            };
            this.permissions.set(id, permission);
          }
        }

        // Restore spend tracking
        if (data.spendTracking) {
          for (const [id, trackingData] of Object.entries(data.spendTracking as Record<string, any>)) {
            const tracking: SpendTracking = {
              ...trackingData,
              spendEntries: trackingData.spendEntries.map((entry: any) => ({
                ...entry,
                timestamp: new Date(entry.timestamp),
              })),
            };
            this.spendTracking.set(id, tracking);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted permissions:', error);
    }
  }

  /**
   * Private: Persist permissions to localStorage
   */
  private persistPermissions(): void {
    try {
      const data = {
        permissions: Object.fromEntries(this.permissions),
        spendTracking: Object.fromEntries(this.spendTracking),
      };
      localStorage.setItem('metapilot_permissions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist permissions:', error);
    }
  }
}