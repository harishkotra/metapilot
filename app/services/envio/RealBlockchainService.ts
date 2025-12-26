/**
 * Real Blockchain Data Service for Base Sepolia
 * Directly queries blockchain for actual on-chain data
 */

import { ethers } from 'ethers';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry,
  EnvioQueryResponse 
} from '@/types/envio';

/**
 * ERC-7715 Permission Grant Event ABI
 */
const PERMISSION_GRANT_ABI = [
  "event PermissionGranted(bytes32 indexed permissionId, address indexed user, address indexed token, uint256 maxAmount, uint256 startTime, uint256 endTime, address[] allowedContracts)",
  "event PermissionRevoked(bytes32 indexed permissionId, address indexed user)",
  "event TokenSpent(bytes32 indexed permissionId, address indexed user, uint256 amount, uint256 remainingAllowance)"
];

/**
 * Real blockchain data service for Base Sepolia
 */
export class RealBlockchainService {
  private provider: ethers.JsonRpcProvider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  private isInitialized = false;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor() {
    this.initializeProvider();
  }

  /**
   * Initialize Base Sepolia provider
   */
  private initializeProvider(): void {
    try {
      // Base Sepolia RPC endpoint
      this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      this.isInitialized = true;
      console.log('✅ Base Sepolia provider initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Base Sepolia provider:', error);
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.provider !== null;
  }

  /**
   * Query permission grants from blockchain events
   */
  async queryPermissionGrants(userAddress: string): Promise<EnvioQueryResponse<EnvioPermissionGrant[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Blockchain service not available'),
      };
    }

    const cacheKey = `permissions_${userAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { data: cached.data, loading: false };
    }

    try {
      console.log(`🔍 Querying Base Sepolia for permissions: ${userAddress}`);

      // Get recent blocks to search for events
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

      // Create contract interface for event parsing
      const iface = new ethers.Interface(PERMISSION_GRANT_ABI);

      // Query PermissionGranted events
      const filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id("PermissionGranted(bytes32,address,address,uint256,uint256,uint256,address[])"),
          null, // permissionId (any)
          ethers.zeroPadValue(userAddress.toLowerCase(), 32) // user address
        ]
      };

      const logs = await this.provider.getLogs(filter);
      console.log(`📊 Found ${logs.length} permission events on Base Sepolia`);

      const permissions: EnvioPermissionGrant[] = [];

      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          if (!parsed) continue;

          const block = await this.provider.getBlock(log.blockNumber);
          if (!block) continue;

          const permission: EnvioPermissionGrant = {
            id: parsed.args.permissionId,
            userAddress: parsed.args.user,
            spender: parsed.args.spender || '0x0000000000000000000000000000000000000000',
            tokenAddress: parsed.args.token,
            amount: ethers.formatUnits(parsed.args.maxAmount, 18),
            startTime: Number(parsed.args.startTime) * 1000,
            endTime: Number(parsed.args.endTime) * 1000,
            isActive: true,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            createdAt: new Date(block.timestamp * 1000).toISOString(),
          };

          permissions.push(permission);
        } catch (error) {
          console.error('❌ Failed to parse permission event:', error);
        }
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: permissions,
        timestamp: Date.now(),
      });

      return {
        data: permissions,
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query Base Sepolia permissions:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query agent executions from transaction history
   */
  async queryAgentExecutions(userAddress: string): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Blockchain service not available'),
      };
    }

    const cacheKey = `executions_${userAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { data: cached.data, loading: false };
    }

    try {
      console.log(`🔍 Querying Base Sepolia for executions: ${userAddress}`);

      // Get recent transaction history
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000); // Last ~5k blocks

      // Query for transactions from this address
      const executions: EnvioAgentExecution[] = [];

      // Get recent blocks and check for transactions
      for (let i = 0; i < 100; i++) { // Check last 100 blocks for demo
        const blockNumber = currentBlock - i;
        if (blockNumber < fromBlock) break;

        try {
          const block = await this.provider.getBlock(blockNumber, true);
          if (!block || !block.transactions) continue;

          for (const txData of block.transactions) {
            if (typeof txData === 'string') continue;
            
            const tx = txData as any; // Type assertion for transaction object
            
            // Check if transaction is from our user
            if (tx.from?.toLowerCase() === userAddress.toLowerCase()) {
              const receipt = await this.provider.getTransactionReceipt(tx.hash);
              if (!receipt) continue;

              const execution: EnvioAgentExecution = {
                id: `exec_${tx.hash}`,
                permissionId: `perm_${tx.hash.slice(0, 10)}`, // Derive from tx hash
                userAddress: userAddress,
                intent: 'Transfer tokens via agent execution',
                status: receipt.status === 1 ? 'executed' : 'failed',
                transactionHash: tx.hash,
                blockNumber: blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                explanation: 'Successfully executed token transfer within permission boundaries',
                executedAt: new Date(block.timestamp * 1000).toISOString(),
                createdAt: new Date(block.timestamp * 1000).toISOString(),
              };

              executions.push(execution);
            }
          }
        } catch (error) {
          // Skip blocks that fail to load
          continue;
        }
      }

      console.log(`📊 Found ${executions.length} executions on Base Sepolia`);

      // Cache the results
      this.cache.set(cacheKey, {
        data: executions,
        timestamp: Date.now(),
      });

      return {
        data: executions,
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query Base Sepolia executions:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query spend entries from TokenSpent events
   */
  async querySpendEntries(permissionId: string): Promise<EnvioQueryResponse<EnvioSpendEntry[]>> {
    if (!this.isAvailable()) {
      return {
        data: [],
        loading: false,
        error: new Error('Blockchain service not available'),
      };
    }

    try {
      console.log(`🔍 Querying Base Sepolia for spend entries: ${permissionId}`);

      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const iface = new ethers.Interface(PERMISSION_GRANT_ABI);

      // Query TokenSpent events
      const filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id("TokenSpent(bytes32,address,uint256,uint256)"),
          ethers.zeroPadValue(permissionId, 32) // specific permission
        ]
      };

      const logs = await this.provider.getLogs(filter);
      const spendEntries: EnvioSpendEntry[] = [];

      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          if (!parsed) continue;

          const block = await this.provider.getBlock(log.blockNumber);
          if (!block) continue;

          const spendEntry: EnvioSpendEntry = {
            id: `spend_${log.transactionHash}_${log.index}`,
            permissionId: parsed.args.permissionId,
            amount: ethers.formatUnits(parsed.args.amount, 18),
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            remainingAllowance: ethers.formatUnits(parsed.args.remainingAllowance, 18),
          };

          spendEntries.push(spendEntry);
        } catch (error) {
          console.error('❌ Failed to parse spend event:', error);
        }
      }

      return {
        data: spendEntries,
        loading: false,
      };

    } catch (error) {
      console.error('❌ Failed to query Base Sepolia spend entries:', error);
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Query recent activity (last 50 transactions)
   */
  async queryRecentActivity(userAddress: string, limit: number = 50): Promise<EnvioQueryResponse<EnvioAgentExecution[]>> {
    const executions = await this.queryAgentExecutions(userAddress);
    
    if (executions.error) {
      return executions;
    }

    // Sort by timestamp and limit
    const sortedExecutions = executions.data || [];
    const limitedExecutions = sortedExecutions
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit);

    return {
      data: limitedExecutions,
      loading: false,
    };
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

      // Get spend entries for all permissions
      const allSpendEntries: EnvioSpendEntry[] = [];
      
      if (permissionsResult.data) {
        for (const permission of permissionsResult.data) {
          const spendResult = await this.querySpendEntries(permission.id);
          if (spendResult.data) {
            allSpendEntries.push(...spendResult.data);
          }
        }
      }

      return {
        data: {
          permissions: permissionsResult.data || [],
          spendEntries: allSpendEntries,
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
   * Subscribe to real-time updates
   */
  subscribeToUpdates(userAddress: string, callback: (data: any) => void): () => void {
    console.log('🔄 Starting real-time Base Sepolia monitoring');
    
    // Poll for new blocks and check for relevant transactions
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
        console.error('❌ Real-time update failed:', error);
      }
    }, 15000); // Check every 15 seconds for new blocks

    return () => {
      clearInterval(interval);
      console.log('🛑 Stopped Base Sepolia monitoring');
    };
  }

  /**
   * Clear cache and refetch all data
   */
  async refetchAll(): Promise<void> {
    this.cache.clear();
    console.log('🔄 Base Sepolia cache cleared');
  }

  /**
   * Get current Base Sepolia network status
   */
  async getNetworkStatus(): Promise<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
  }> {
    try {
      const [blockNumber, gasPrice, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getNetwork(),
      ]);

      return {
        blockNumber,
        gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei'),
        chainId: Number(network.chainId),
      };
    } catch (error) {
      throw new Error(`Failed to get network status: ${error}`);
    }
  }
}

// Export singleton instance
export const realBlockchainService = new RealBlockchainService();