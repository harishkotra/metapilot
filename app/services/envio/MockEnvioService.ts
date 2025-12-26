/**
 * Mock Envio service for development and demo purposes
 */

import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry,
  EnvioQueryResponse 
} from '@/types/envio';

/**
 * Mock implementation of Envio GraphQL service for development
 */
export class MockEnvioService {
  private mockPermissions: EnvioPermissionGrant[] = [];
  private mockExecutions: EnvioAgentExecution[] = [];
  private mockSpendEntries: EnvioSpendEntry[] = [];

  /**
   * Mock query for permission grants
   */
  async queryPermissionGrants(userAddress: string): Promise<EnvioQueryResponse<EnvioPermissionGrant[]>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      data: this.mockPermissions.filter(p => p.userAddress.toLowerCase() === userAddress.toLowerCase()),
      loading: false,
    };
  }

  /**
   * Mock query for agent executions
   */
  async queryAgentExecutions(userAddress: string): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      data: this.mockExecutions.filter(e => e.userAddress.toLowerCase() === userAddress.toLowerCase()),
      loading: false,
    };
  }

  /**
   * Mock query for spend entries
   */
  async querySpendEntries(permissionId: string): Promise<EnvioQueryResponse<EnvioSpendEntry[]>> {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      data: this.mockSpendEntries.filter(s => s.permissionId === permissionId),
      loading: false,
    };
  }

  /**
   * Add mock permission grant (for testing)
   */
  addMockPermission(permission: EnvioPermissionGrant): void {
    this.mockPermissions.push(permission);
  }

  /**
   * Add mock execution (for testing)
   */
  addMockExecution(execution: EnvioAgentExecution): void {
    this.mockExecutions.push(execution);
  }

  /**
   * Add mock spend entry (for testing)
   */
  addMockSpendEntry(spendEntry: EnvioSpendEntry): void {
    this.mockSpendEntries.push(spendEntry);
  }

  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.mockPermissions = [];
    this.mockExecutions = [];
    this.mockSpendEntries = [];
  }
}

// Export singleton instance
export const mockEnvioService = new MockEnvioService();