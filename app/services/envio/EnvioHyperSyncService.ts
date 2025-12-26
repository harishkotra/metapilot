/**
 * Envio Client Service for Base Sepolia
 * Client-side service that calls server-side API routes for HyperSync integration
 */

import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry,
  EnvioQueryResponse 
} from '@/types/envio';

/**
 * Client-side Envio service that communicates with server-side API routes
 * Implements caching and rate limiting to reduce API calls
 */
export class EnvioClientService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeout = 60000; // 60 seconds cache
  private readonly minRequestInterval = 5000; // Minimum 5 seconds between requests
  private lastRequestTimes: Map<string, number> = new Map();

  constructor() {
    console.log('🚀 Initializing Envio Client Service...');
    console.log('📡 Using server-side API routes for HyperSync integration');
    console.log('⚡ Cache timeout: 60s, Min request interval: 5s');
  }

  /**
   * Check if we should make a request or use cache
   */
  private shouldMakeRequest(cacheKey: string): boolean {
    const now = Date.now();
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📋 Using cached data for: ${cacheKey}`);
      return false;
    }
    
    // Check rate limiting
    const lastRequest = this.lastRequestTimes.get(cacheKey);
    if (lastRequest && (now - lastRequest) < this.minRequestInterval) {
      console.log(`⏳ Rate limited, skipping request for: ${cacheKey}`);
      return false;
    }
    
    return true;
  }

  /**
   * Get cached data if available
   */
  private getCachedData(cacheKey: string): any {
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store data in cache and update request time
   */
  private setCachedData(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    this.lastRequestTimes.set(cacheKey, Date.now());
  }

  /**
   * Check if service is available (always true for client service)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Query permission grants via API route
   */
  async queryPermissionGrants(userAddress: string): Promise<EnvioQueryResponse<EnvioPermissionGrant[]>> {
    const cacheKey = `permissions_${userAddress}`;
    
    // Check if we should use cache or make new request
    if (!this.shouldMakeRequest(cacheKey)) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          loading: false,
        };
      }
    }

    try {
      console.log(`🔍 Querying permission grants for: ${userAddress}`);

      const response = await fetch(`/api/envio/permissions?userAddress=${encodeURIComponent(userAddress)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch permissions');
      }

      const result = await response.json();
      console.log(`✅ Found ${result.data?.length || 0} permission grants (${result.mode} mode)`);

      // Cache the result
      this.setCachedData(cacheKey, result.data || []);

      return {
        data: result.data || [],
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query permission grants:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error querying permissions'),
      };
    }
  }

  /**
   * Query agent executions via API route
   */
  async queryAgentExecutions(userAddress: string): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    const cacheKey = `executions_${userAddress}`;
    
    // Check if we should use cache or make new request
    if (!this.shouldMakeRequest(cacheKey)) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          loading: false,
        };
      }
    }

    try {
      console.log(`🔍 Querying agent executions for: ${userAddress}`);

      const response = await fetch(`/api/envio/executions?userAddress=${encodeURIComponent(userAddress)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch executions');
      }

      const result = await response.json();
      console.log(`✅ Found ${result.data?.length || 0} agent executions (${result.mode} mode)`);

      // Cache the result
      this.setCachedData(cacheKey, result.data || []);

      return {
        data: result.data || [],
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query agent executions:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error querying executions'),
      };
    }
  }

  /**
   * Query spend entries for a specific permission
   */
  async querySpendEntries(permissionId: string): Promise<EnvioQueryResponse<EnvioSpendEntry[]>> {
    try {
      console.log(`🔍 Querying spend entries for permission: ${permissionId}`);

      // For now, return empty array as we need specific permission tracking
      // In a real implementation, this would call a dedicated API route
      const spendEntries: EnvioSpendEntry[] = [];

      return {
        data: spendEntries,
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query spend entries:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error querying spend entries'),
      };
    }
  }

  /**
   * Query recent activity
   */
  async queryRecentActivity(userAddress: string, limit: number = 50): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    const executions = await this.queryAgentExecutions(userAddress);
    
    // Limit results and sort by most recent
    if (executions.data) {
      executions.data = executions.data
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
        .slice(0, limit);
    }
    
    return executions;
  }

  /**
   * Query analytics data
   */
  async queryPermissionAnalytics(userAddress: string): Promise<EnvioQueryResponse<{
    permissions: EnvioPermissionGrant[];
    spendEntries: EnvioSpendEntry[];
  }>> {
    try {
      const [permissionsResult, executionsResult] = await Promise.all([
        this.queryPermissionGrants(userAddress),
        this.queryAgentExecutions(userAddress),
      ]);

      return {
        data: {
          permissions: permissionsResult.data || [],
          spendEntries: [], // Convert from executions when implemented
        },
        loading: false,
        error: permissionsResult.error || executionsResult.error,
      };

    } catch (error) {
      return {
        data: { permissions: [], spendEntries: [] },
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Subscribe to real-time updates via polling (reduced frequency)
   */
  subscribeToUpdates(userAddress: string, callback: (data: any) => void): () => void {
    console.log(`🔄 Setting up Envio subscription for: ${userAddress}`);
    console.log(`⏰ Polling interval: 30 seconds (reduced from 10s)`);
    
    // Set up polling for real-time updates with reduced frequency
    const interval = setInterval(async () => {
      try {
        const [permissions, executions] = await Promise.all([
          this.queryPermissionGrants(userAddress),
          this.queryAgentExecutions(userAddress),
        ]);

        callback({
          permissions: permissions.data || [],
          executions: executions.data || [],
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('❌ Subscription update failed:', error);
      }
    }, 30000); // Increased from 10 seconds to 30 seconds

    // Return cleanup function
    return () => {
      console.log('🔄 Cleaning up Envio subscription');
      clearInterval(interval);
    };
  }

  /**
   * Clear cache and refetch all data
   */
  async refetchAll(): Promise<void> {
    console.log('🔄 Clearing Envio cache...');
    this.cache.clear();
  }

  /**
   * Get Base Sepolia network status via API route (cached)
   */
  async getNetworkStatus(): Promise<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
  }> {
    const cacheKey = 'network_status';
    
    // Check if we should use cache or make new request
    if (!this.shouldMakeRequest(cacheKey)) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      console.log('🔍 Querying network status...');

      const response = await fetch('/api/envio/network');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch network status');
      }

      const result = await response.json();
      console.log(`✅ Network status retrieved (${result.mode} mode):`, result.data);

      // Cache the result
      this.setCachedData(cacheKey, result.data);

      return result.data;

    } catch (error) {
      console.error('❌ Failed to get network status:', error);
      return {
        blockNumber: Math.floor(Date.now() / 1000), // Use timestamp as fallback
        gasPrice: '1000000000',
        chainId: 84532,
      };
    }
  }
}

// Export singleton instance
export const envioClientService = new EnvioClientService();