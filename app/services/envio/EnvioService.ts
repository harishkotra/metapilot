/**
 * Real Envio GraphQL service for blockchain data indexing
 * Indexes ERC-7715 permissions, agent executions, and spend tracking
 */

import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry,
  EnvioQueryResponse 
} from '@/types/envio';
import { API_ENDPOINTS } from '@/lib/constants';

/**
 * GraphQL queries for Envio indexer
 */
const PERMISSION_GRANTS_QUERY = gql`
  query GetPermissionGrants($userAddress: String!) {
    permissionGrants(where: { userAddress: $userAddress }) {
      id
      userAddress
      tokenAddress
      maxSpendAmount
      startTime
      endTime
      allowedContracts
      transactionHash
      blockNumber
      timestamp
    }
  }
`;

const AGENT_EXECUTIONS_QUERY = gql`
  query GetAgentExecutions($userAddress: String!) {
    agentExecutions(where: { userAddress: $userAddress }) {
      id
      userAddress
      permissionId
      actionType
      tokenAddress
      amount
      transactionHash
      gasUsed
      blockNumber
      timestamp
      status
    }
  }
`;

const SPEND_ENTRIES_QUERY = gql`
  query GetSpendEntries($permissionId: String!) {
    spendEntries(where: { permissionId: $permissionId }) {
      id
      permissionId
      amount
      transactionHash
      blockNumber
      timestamp
      remainingAllowance
    }
  }
`;

const RECENT_ACTIVITY_QUERY = gql`
  query GetRecentActivity($userAddress: String!, $limit: Int = 50) {
    agentExecutions(
      where: { userAddress: $userAddress }
      orderBy: timestamp
      orderDirection: desc
      first: $limit
    ) {
      id
      userAddress
      permissionId
      actionType
      tokenAddress
      amount
      transactionHash
      gasUsed
      blockNumber
      timestamp
      status
    }
  }
`;

const PERMISSION_ANALYTICS_QUERY = gql`
  query GetPermissionAnalytics($userAddress: String!) {
    permissionGrants(where: { userAddress: $userAddress }) {
      id
      tokenAddress
      maxSpendAmount
      startTime
      endTime
    }
    spendEntries(where: { userAddress: $userAddress }) {
      id
      permissionId
      amount
      timestamp
    }
  }
`;

/**
 * Real Envio GraphQL service implementation with Apollo Client
 */
export class EnvioService {
  private client: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize Apollo Client for Envio GraphQL endpoint
   */
  private initializeClient(): void {
    const endpoint = API_ENDPOINTS.ENVIO_GRAPHQL;
    
    if (!endpoint) {
      console.warn('⚠️ ENVIO_GRAPHQL_ENDPOINT not configured, using mock data');
      return;
    }

    try {
      const httpLink = createHttpLink({
        uri: endpoint,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.client = new ApolloClient({
        link: httpLink,
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                permissionGrants: {
                  merge: false, // Always replace cached data
                },
                agentExecutions: {
                  merge: false,
                },
                spendEntries: {
                  merge: false,
                },
              },
            },
          },
        }),
        defaultOptions: {
          watchQuery: {
            errorPolicy: 'all',
            fetchPolicy: 'cache-and-network',
          },
          query: {
            errorPolicy: 'all',
            fetchPolicy: 'cache-first',
          },
        },
      });

      this.isInitialized = true;
      console.log('✅ Envio GraphQL client initialized:', endpoint);
    } catch (error) {
      console.error('❌ Failed to initialize Envio client:', error);
    }
  }

  /**
   * Check if Envio service is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Query permission grants for a user
   */
  async queryPermissionGrants(userAddress: string): Promise<EnvioQueryResponse<EnvioPermissionGrant[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Envio service not available'),
      };
    }

    try {
      const result = await this.client!.query({
        query: PERMISSION_GRANTS_QUERY,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'cache-and-network',
      });

      return {
        data: result.data.permissionGrants || [],
        loading: result.loading,
        error: result.error,
      };
    } catch (error) {
      console.error('❌ Failed to query permission grants:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query agent executions for a user
   */
  async queryAgentExecutions(userAddress: string): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Envio service not available'),
      };
    }

    try {
      const result = await this.client!.query({
        query: AGENT_EXECUTIONS_QUERY,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'cache-and-network',
      });

      return {
        data: result.data.agentExecutions || [],
        loading: result.loading,
        error: result.error,
      };
    } catch (error) {
      console.error('❌ Failed to query agent executions:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query spend entries for a permission
   */
  async querySpendEntries(permissionId: string): Promise<EnvioQueryResponse<EnvioSpendEntry[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Envio service not available'),
      };
    }

    try {
      const result = await this.client!.query({
        query: SPEND_ENTRIES_QUERY,
        variables: { permissionId },
        fetchPolicy: 'cache-and-network',
      });

      return {
        data: result.data.spendEntries || [],
        loading: result.loading,
        error: result.error,
      };
    } catch (error) {
      console.error('❌ Failed to query spend entries:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query recent activity for dashboard
   */
  async queryRecentActivity(userAddress: string, limit: number = 50): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Envio service not available'),
      };
    }

    try {
      const result = await this.client!.query({
        query: RECENT_ACTIVITY_QUERY,
        variables: { 
          userAddress: userAddress.toLowerCase(),
          limit,
        },
        fetchPolicy: 'cache-and-network',
      });

      return {
        data: result.data.agentExecutions || [],
        loading: result.loading,
        error: result.error,
      };
    } catch (error) {
      console.error('❌ Failed to query recent activity:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query analytics data for permissions and spending
   */
  async queryPermissionAnalytics(userAddress: string): Promise<EnvioQueryResponse<{
    permissions: EnvioPermissionGrant[];
    spendEntries: EnvioSpendEntry[];
  }>> {
    if (!this.isAvailable()) {
      return {
        data: { permissions: [], spendEntries: [] },
        loading: false,
        error: new Error('Envio service not available'),
      };
    }

    try {
      const result = await this.client!.query({
        query: PERMISSION_ANALYTICS_QUERY,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'cache-and-network',
      });

      return {
        data: {
          permissions: result.data.permissionGrants || [],
          spendEntries: result.data.spendEntries || [],
        },
        loading: result.loading,
        error: result.error,
      };
    } catch (error) {
      console.error('❌ Failed to query permission analytics:', error);
      return {
        data: { permissions: [], spendEntries: [] },
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Subscribe to real-time updates (WebSocket)
   */
  subscribeToUpdates(userAddress: string, callback: (data: any) => void): () => void {
    if (!this.isAvailable()) {
      console.warn('⚠️ Envio subscriptions not available');
      return () => {};
    }

    // For now, we'll use polling instead of WebSocket subscriptions
    // In a real implementation, this would use GraphQL subscriptions
    const interval = setInterval(async () => {
      try {
        const [permissions, executions] = await Promise.all([
          this.queryPermissionGrants(userAddress),
          this.queryAgentExecutions(userAddress),
        ]);

        callback({
          permissions: permissions.data,
          executions: executions.data,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('❌ Subscription update failed:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }

  /**
   * Clear cache and refetch all data
   */
  async refetchAll(): Promise<void> {
    if (this.client) {
      await this.client.clearStore();
      console.log('🔄 Envio cache cleared');
    }
  }
}

// Export singleton instance
export const envioService = new EnvioService();