/**
 * Envio GraphQL response type definitions
 */

export interface EnvioPermissionGrant {
  id: string;
  userAddress: string;
  spender: string;
  tokenAddress: string;
  amount: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  transactionHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface EnvioAgentExecution {
  id: string;
  permissionId: string;
  userAddress: string;
  intent: string;
  status: 'pending' | 'executed' | 'failed';
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  explanation: string;
  executedAt: string;
  createdAt: string;
}

export interface EnvioSpendEntry {
  id: string;
  permissionId: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  remainingAllowance: string;
}

export interface EnvioQueryResponse<T> {
  data?: T;
  loading: boolean;
  error?: Error;
}