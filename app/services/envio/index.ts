/**
 * Envio service with server-side HyperSync integration
 */

import { envioClientService } from './EnvioHyperSyncService';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry,
  EnvioQueryResponse 
} from '@/types/envio';

/**
 * Unified Envio service using server-side API routes for HyperSync
 */
class UnifiedEnvioService {
  private clientService: typeof envioClientService;

  constructor() {
    this.clientService = envioClientService;
    
    console.log(`📊 Envio service mode: SERVER-SIDE HYPERSYNC`);
    console.log(`🔑 API Token: ${process.env.NEXT_PUBLIC_ENVIO_API_TOKEN ? 'PROVIDED' : 'CONFIGURED SERVER-SIDE'}`);
    console.log(`📡 Using API routes: /api/envio/*`);
  }

  /**
   * Get the current service mode
   */
  getMode(): 'hypersync' | 'mock' {
    return 'hypersync'; // Always hypersync via server-side API
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.clientService.isAvailable();
  }

  /**
   * Query permission grants via server-side API
   */
  async queryPermissionGrants(userAddress: string): Promise<EnvioQueryResponse<EnvioPermissionGrant[]>> {
    return this.clientService.queryPermissionGrants(userAddress);
  }

  /**
   * Query agent executions via server-side API
   */
  async queryAgentExecutions(userAddress: string): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    return this.clientService.queryAgentExecutions(userAddress);
  }

  /**
   * Query spend entries via server-side API
   */
  async querySpendEntries(permissionId: string): Promise<EnvioQueryResponse<EnvioSpendEntry[]>> {
    return this.clientService.querySpendEntries(permissionId);
  }

  /**
   * Query recent activity via server-side API
   */
  async queryRecentActivity(userAddress: string, limit: number = 50): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    return this.clientService.queryRecentActivity(userAddress, limit);
  }

  /**
   * Query analytics data via server-side API
   */
  async queryPermissionAnalytics(userAddress: string): Promise<EnvioQueryResponse<{
    permissions: EnvioPermissionGrant[];
    spendEntries: EnvioSpendEntry[];
  }>> {
    return this.clientService.queryPermissionAnalytics(userAddress);
  }

  /**
   * Subscribe to real-time updates via server-side API
   */
  subscribeToUpdates(userAddress: string, callback: (data: any) => void): () => void {
    return this.clientService.subscribeToUpdates(userAddress, callback);
  }

  /**
   * Clear cache and refetch from server-side API
   */
  async refetchAll(): Promise<void> {
    await this.clientService.refetchAll();
  }

  /**
   * Get Base Sepolia network status via server-side API
   */
  async getNetworkStatus(): Promise<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
  }> {
    return this.clientService.getNetworkStatus();
  }
}

// Export singleton instance
export const envioService = new UnifiedEnvioService();
export { EnvioClientService } from './EnvioHyperSyncService';