/**
 * React hook for Envio blockchain data integration
 */

import { useState, useEffect, useCallback } from 'react';
import { envioService } from '@/services/envio';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry 
} from '@/types/envio';

interface EnvioData {
  permissions: EnvioPermissionGrant[];
  executions: EnvioAgentExecution[];
  spendEntries: EnvioSpendEntry[];
  analytics: {
    totalSpent: number;
    activePermissions: number;
    successfulExecutions: number;
    recentActivity: EnvioAgentExecution[];
  };
}

interface UseEnvioReturn {
  data: EnvioData;
  loading: boolean;
  error: Error | null;
  mode: 'hypersync' | 'mock';
  refetch: () => Promise<void>;
  subscribeToUpdates: (callback: (data: any) => void) => () => void;
}

/**
 * Hook for accessing Envio blockchain data
 */
export function useEnvio(userAddress?: string): UseEnvioReturn {
  const [data, setData] = useState<EnvioData>({
    permissions: [],
    executions: [],
    spendEntries: [],
    analytics: {
      totalSpent: 0,
      activePermissions: 0,
      successfulExecutions: 0,
      recentActivity: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Calculate analytics from raw data
   */
  const calculateAnalytics = useCallback((
    permissions: EnvioPermissionGrant[],
    executions: EnvioAgentExecution[],
    spendEntries: EnvioSpendEntry[]
  ) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const activePermissions = permissions.filter(p => {
      const endTime = new Date(p.endTime);
      return endTime > now;
    }).length;

    const recentExecutions = executions.filter(e => {
      const execTime = new Date(e.executedAt);
      return execTime > oneDayAgo;
    });

    const successfulExecutions = recentExecutions.filter(e => 
      e.status === 'executed'
    ).length;

    const totalSpent = spendEntries.reduce((sum, entry) => {
      return sum + parseFloat(entry.amount || '0');
    }, 0);

    return {
      totalSpent,
      activePermissions,
      successfulExecutions,
      recentActivity: recentExecutions.slice(0, 10), // Last 10 activities
    };
  }, []);

  /**
   * Fetch all Envio data
   */
  const fetchData = useCallback(async () => {
    if (!userAddress) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📊 Fetching Envio data for ${userAddress} (${envioService.getMode()} mode)`);

      // Fetch all data in parallel
      const [permissionsResult, executionsResult, analyticsResult] = await Promise.all([
        envioService.queryPermissionGrants(userAddress),
        envioService.queryAgentExecutions(userAddress),
        envioService.queryPermissionAnalytics(userAddress),
      ]);

      // Handle errors
      if (permissionsResult.error) {
        throw permissionsResult.error;
      }
      if (executionsResult.error) {
        throw executionsResult.error;
      }
      if (analyticsResult.error) {
        throw analyticsResult.error;
      }

      const permissions = permissionsResult.data || [];
      const executions = executionsResult.data || [];
      const spendEntries = analyticsResult.data?.spendEntries || [];

      // Calculate analytics
      const analytics = calculateAnalytics(permissions, executions, spendEntries);

      setData({
        permissions,
        executions,
        spendEntries,
        analytics,
      });

      console.log(`✅ Envio data loaded: ${permissions?.length || 0} permissions, ${executions?.length || 0} executions`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Envio data');
      setError(error);
      console.error('❌ Failed to fetch Envio data:', error);
    } finally {
      setLoading(false);
    }
  }, [userAddress, calculateAnalytics]);

  /**
   * Subscribe to real-time updates
   */
  const subscribeToUpdates = useCallback((callback: (data: any) => void) => {
    if (!userAddress) {
      return () => {};
    }

    console.log('🔄 Subscribing to Envio updates');
    
    return envioService.subscribeToUpdates(userAddress, (updateData) => {
      console.log('📡 Received Envio update:', updateData);
      
      // Update local state with new data
      if (updateData.permissions && updateData.executions) {
        const analytics = calculateAnalytics(
          updateData.permissions,
          updateData.executions,
          data.spendEntries // Keep existing spend entries for now
        );

        setData(prevData => ({
          ...prevData,
          permissions: updateData.permissions,
          executions: updateData.executions,
          analytics,
        }));
      }

      // Call external callback
      callback(updateData);
    });
  }, [userAddress, calculateAnalytics, data.spendEntries]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await envioService.refetchAll();
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    if (userAddress) {
      fetchData();
    }
  }, [userAddress, fetchData]);

  return {
    data,
    loading,
    error,
    mode: envioService.getMode(),
    refetch,
    subscribeToUpdates,
  };
}

/**
 * Hook for querying specific permission spend entries
 */
export function usePermissionSpendEntries(permissionId?: string) {
  const [spendEntries, setSpendEntries] = useState<EnvioSpendEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpendEntries = useCallback(async () => {
    if (!permissionId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await envioService.querySpendEntries(permissionId);
      
      if (result.error) {
        throw result.error;
      }

      setSpendEntries(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch spend entries');
      setError(error);
      console.error('❌ Failed to fetch spend entries:', error);
    } finally {
      setLoading(false);
    }
  }, [permissionId]);

  useEffect(() => {
    if (permissionId) {
      fetchSpendEntries();
    }
  }, [permissionId, fetchSpendEntries]);

  return {
    spendEntries,
    loading,
    error,
    refetch: fetchSpendEntries,
  };
}