/**
 * ERC-7715 Advanced Permission type definitions
 */

export interface ERC7715Permission {
  id: string;
  tokenAddress: string;
  maxSpendAmount: string;
  startTime: Date;
  endTime: Date;
  allowedContracts: string[];
  status: PermissionStatus;
  grantedAt: Date;
  transactionHash?: string;
  smartAccountPermissionId?: string; // Maps to SmartAccountService permission ID
}

export type PermissionStatus = 'active' | 'expired' | 'revoked' | 'pending';

export interface PermissionRequest {
  tokenAddress: string;
  maxSpendAmount: string;
  startTime: Date;
  endTime: Date;
  allowedContracts: string[];
}

export interface SpendTracking {
  permissionId: string;
  totalSpent: string;
  remainingAllowance: string;
  spendEntries: SpendEntry[];
}

export interface SpendEntry {
  timestamp: Date;
  amount: string;
  transactionHash: string;
  remainingAfter: string;
}