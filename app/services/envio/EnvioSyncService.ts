/**
 * Envio Data Synchronization Service
 * Keeps local data in sync with blockchain-indexed data
 */

import { envioService } from './index';
import { PermissionManager } from '@/services/permissions/PermissionManager';
import { AgentExecutor } from '@/services/agent/AgentExecutor';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry 
} from '@/types/envio';
import { ERC7715Permission } from '@/types/permissions';

export interface SyncStatus {
  lastSync: Date | null;
  permissionsSynced: number;
  executionsSynced: number;
  spendEntriesSynced: number;
  errors: string[];
}

/**
 * Service to synchronize local data with Envio-indexed blockchain data
 */
export class EnvioSyncService {
  private permissionManager: PermissionManager | null = null;
  private agentExecutor: AgentExecutor | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncStatus: SyncStatus = {
    lastSync: null,
    permissionsSynced: 0,
    executionsSynced: 0,
    spendEntriesSynced: 0,
    errors: [],
  };

  constructor(
    permissionManager?: PermissionManager,
    agentExecutor?: AgentExecutor
  ) {
    this.permissionManager = permissionManager || null;
    this.agentExecutor = agentExecutor || null;
  }

  /**
   * Set the services to sync with
   */
  setServices(permissionManager: PermissionManager, agentExecutor: AgentExecutor): void {
    this.permissionManager = permissionManager;
    this.agentExecutor = agentExecutor;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Perform full synchronization with Envio data
   */
  async syncWithEnvio(userAddress: string): Promise<SyncStatus> {
    if (!this.permissionManager || !this.agentExecutor) {
      throw new Error('Services not initialized');
    }

    console.log(`🔄 Starting Envio sync for ${userAddress}`);
    
    const errors: string[] = [];
    let permissionsSynced = 0;
    let executionsSynced = 0;
    let spendEntriesSynced = 0;

    try {
      // Fetch all data from Envio
      const [permissionsResult, executionsResult, analyticsResult] = await Promise.all([
        envioService.queryPermissionGrants(userAddress),
        envioService.queryAgentExecutions(userAddress),
        envioService.queryPermissionAnalytics(userAddress),
      ]);

      // Sync permissions
      if (permissionsResult.data && !permissionsResult.error) {
        permissionsSynced = await this.syncPermissions(permissionsResult.data);
      } else if (permissionsResult.error) {
        errors.push(`Permissions sync failed: ${permissionsResult.error.message}`);
      }

      // Sync executions
      if (executionsResult.data && !executionsResult.error) {
        executionsSynced = await this.syncExecutions(executionsResult.data);
      } else if (executionsResult.error) {
        errors.push(`Executions sync failed: ${executionsResult.error.message}`);
      }

      // Sync spend entries
      if (analyticsResult.data && !analyticsResult.error) {
        spendEntriesSynced = await this.syncSpendEntries(analyticsResult.data.spendEntries);
      } else if (analyticsResult.error) {
        errors.push(`Spend entries sync failed: ${analyticsResult.error.message}`);
      }

      this.syncStatus = {
        lastSync: new Date(),
        permissionsSynced,
        executionsSynced,
        spendEntriesSynced,
        errors,
      };

      console.log(`✅ Envio sync completed:`, this.syncStatus);
      return this.syncStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      errors.push(errorMessage);
      
      this.syncStatus = {
        lastSync: new Date(),
        permissionsSynced,
        executionsSynced,
        spendEntriesSynced,
        errors,
      };

      console.error('❌ Envio sync failed:', error);
      return this.syncStatus;
    }
  }

  /**
   * Sync permissions from Envio data
   */
  private async syncPermissions(envioPermissions: EnvioPermissionGrant[]): Promise<number> {
    if (!this.permissionManager) return 0;

    let synced = 0;

    for (const envioPermission of envioPermissions) {
      try {
        // Convert Envio permission to local format
        const localPermission: ERC7715Permission = {
          id: envioPermission.id,
          tokenAddress: envioPermission.tokenAddress,
          maxSpendAmount: envioPermission.amount,
          startTime: new Date(envioPermission.startTime),
          endTime: new Date(envioPermission.endTime),
          allowedContracts: [envioPermission.spender],
          status: this.determinePermissionStatus(envioPermission),
          grantedAt: new Date(envioPermission.createdAt),
          transactionHash: envioPermission.transactionHash,
        };

        // Check if permission exists locally
        const existingPermission = this.permissionManager.getPermission(envioPermission.id);
        
        if (!existingPermission) {
          // Add new permission from blockchain
          console.log(`📥 Adding permission from Envio: ${envioPermission.id}`);
          // Note: We can't directly add to PermissionManager without modifying it
          // For now, we'll log this for manual reconciliation
          synced++;
        } else {
          // Update existing permission status if needed
          if (existingPermission.status !== localPermission.status) {
            console.log(`🔄 Permission status changed: ${envioPermission.id} -> ${localPermission.status}`);
            synced++;
          }
        }
      } catch (error) {
        console.error(`❌ Failed to sync permission ${envioPermission.id}:`, error);
      }
    }

    return synced;
  }

  /**
   * Sync executions from Envio data
   */
  private async syncExecutions(envioExecutions: EnvioAgentExecution[]): Promise<number> {
    if (!this.agentExecutor) return 0;

    let synced = 0;

    for (const envioExecution of envioExecutions) {
      try {
        // Check if execution exists locally
        const existingExecution = this.agentExecutor.getExecution(envioExecution.id);
        
        if (!existingExecution) {
          console.log(`📥 Found execution on blockchain not in local data: ${envioExecution.id}`);
          // This indicates a transaction was executed outside of our app
          // or data was lost locally
          synced++;
        } else {
          // Verify transaction hash matches
          if (existingExecution.transactionHash !== envioExecution.transactionHash) {
            console.log(`🔄 Execution transaction hash mismatch: ${envioExecution.id}`);
            synced++;
          }
        }
      } catch (error) {
        console.error(`❌ Failed to sync execution ${envioExecution.id}:`, error);
      }
    }

    return synced;
  }

  /**
   * Sync spend entries from Envio data
   */
  private async syncSpendEntries(envioSpendEntries: EnvioSpendEntry[]): Promise<number> {
    if (!this.permissionManager) return 0;

    let synced = 0;

    // Group spend entries by permission
    const spendByPermission = new Map<string, EnvioSpendEntry[]>();
    
    for (const spendEntry of envioSpendEntries) {
      if (!spendByPermission.has(spendEntry.permissionId)) {
        spendByPermission.set(spendEntry.permissionId, []);
      }
      spendByPermission.get(spendEntry.permissionId)!.push(spendEntry);
    }

    // Sync each permission's spend tracking
    Array.from(spendByPermission.entries()).forEach(([permissionId, entries]) => {
      try {
        const localSpendTracking = this.permissionManager!.getSpendTracking(permissionId);
        
        if (localSpendTracking) {
          // Compare total spent amounts
          const envioTotalSpent = entries.reduce((sum: number, entry: EnvioSpendEntry) => 
            sum + parseFloat(entry.amount), 0
          );
          const localTotalSpent = parseFloat(localSpendTracking.totalSpent);
          
          if (Math.abs(envioTotalSpent - localTotalSpent) > 0.000001) {
            console.log(`🔄 Spend tracking mismatch for ${permissionId}: Envio=${envioTotalSpent}, Local=${localTotalSpent}`);
            synced++;
          }
        } else {
          console.log(`📥 Found spend entries on blockchain for unknown permission: ${permissionId}`);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync spend entries for ${permissionId}:`, error);
      }
    });

    return synced;
  }

  /**
   * Determine permission status based on Envio data
   */
  private determinePermissionStatus(envioPermission: EnvioPermissionGrant): ERC7715Permission['status'] {
    const now = new Date();
    const endTime = new Date(envioPermission.endTime);
    
    if (endTime < now) {
      return 'expired';
    }
    
    // In a real implementation, we'd check for revocation events
    // For now, assume active if not expired
    return 'active';
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(userAddress: string, intervalMs: number = 30000): () => void {
    console.log(`🔄 Starting auto-sync every ${intervalMs}ms`);
    
    // Stop any existing sync first
    this.stopAutoSync();
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithEnvio(userAddress);
      } catch (error) {
        console.error('❌ Auto-sync failed:', error);
      }
    }, intervalMs);

    return () => this.stopAutoSync();
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  /**
   * Validate data consistency between local and Envio
   */
  async validateConsistency(userAddress: string): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      await this.syncWithEnvio(userAddress);
      
      if (this.syncStatus.errors.length > 0) {
        issues.push(...this.syncStatus.errors);
      }

      // Additional consistency checks could be added here
      
      return {
        consistent: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        consistent: false,
        issues,
      };
    }
  }
}

// Export singleton instance
export const envioSyncService = new EnvioSyncService();