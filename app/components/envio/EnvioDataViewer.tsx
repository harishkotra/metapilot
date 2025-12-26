/**
 * Envio Data Viewer - Comprehensive blockchain data visualization
 */

'use client';

import { useState, useEffect } from 'react';
import { useEnvio } from '@/hooks/useEnvio';
import { envioSyncService, SyncStatus } from '@/services/envio/EnvioSyncService';
import { realBlockchainService } from '@/services/envio/RealBlockchainService';
import { 
  EnvioPermissionGrant, 
  EnvioAgentExecution, 
  EnvioSpendEntry 
} from '@/types/envio';

interface EnvioDataViewerProps {
  userAddress?: string;
  className?: string;
}

/**
 * Component to display comprehensive Envio blockchain data
 */
export function EnvioDataViewer({ userAddress, className = '' }: EnvioDataViewerProps) {
  const { 
    data: envioData, 
    loading, 
    error, 
    mode, 
    refetch 
  } = useEnvio(userAddress);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'executions' | 'analytics'>('overview');

  // Get sync status
  useEffect(() => {
    const status = envioSyncService.getSyncStatus();
    setSyncStatus(status);
  }, [envioData]);

  const handleManualSync = async () => {
    if (!userAddress) return;
    
    try {
      const status = await envioSyncService.syncWithEnvio(userAddress);
      setSyncStatus(status);
      await refetch();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (!userAddress) {
    return (
      <div className={`envio-data-viewer ${className}`}>
        <div className="card text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">Envio Blockchain Indexing</h3>
          <p className="text-gray-600">
            Connect your wallet to view indexed blockchain data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`envio-data-viewer ${className}`}>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">📊 Blockchain Data (via Envio HyperSync)</h2>
            <p className="text-gray-600">
              Real-time indexed data from Base Sepolia via server-side HyperSync API
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              error ? 'bg-red-100 text-red-800' :
              loading ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              🔗 HyperSync Active
            </div>
            <button
              onClick={handleManualSync}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? '🔄 Syncing...' : '🔄 Sync Now'}
            </button>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">
                Last Sync: {syncStatus.lastSync ? syncStatus.lastSync.toLocaleString() : 'Never'}
              </div>
              <div className="text-xs text-gray-500">
                Auto-sync every 30 seconds
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-600">{syncStatus.permissionsSynced}</div>
                <div className="text-gray-600">Permissions Synced</div>
              </div>
              <div>
                <div className="font-medium text-green-600">{syncStatus.executionsSynced}</div>
                <div className="text-gray-600">Executions Synced</div>
              </div>
              <div>
                <div className="font-medium text-purple-600">{syncStatus.spendEntriesSynced}</div>
                <div className="text-gray-600">Spend Entries Synced</div>
              </div>
            </div>
            {syncStatus.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <div className="font-medium text-red-800">Sync Errors:</div>
                <ul className="text-red-700 list-disc list-inside">
                  {syncStatus.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 border-red-200 mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-red-600 text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Envio Connection Error</h3>
              <p className="text-red-700">{error.message}</p>
              <p className="text-red-600 text-sm mt-1">
                Falling back to local data. Check your ENVIO_GRAPHQL_ENDPOINT configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'permissions', label: '🔐 Permissions' },
          { id: 'executions', label: '⚡ Executions' },
          { id: 'analytics', label: '📈 Analytics' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Network Status */}
      <NetworkStatus />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <EnvioOverview envioData={envioData} loading={loading} />
      )}
      
      {activeTab === 'permissions' && (
        <EnvioPermissions permissions={envioData.permissions} loading={loading} />
      )}
      
      {activeTab === 'executions' && (
        <EnvioExecutions executions={envioData.executions} loading={loading} />
      )}
      
      {activeTab === 'analytics' && (
        <EnvioAnalytics envioData={envioData} loading={loading} />
      )}
    </div>
  );
}

// Overview Tab
function EnvioOverview({ envioData, loading }: { envioData: any; loading: boolean }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">
            {loading ? '...' : envioData.permissions.length}
          </div>
          <div className="text-sm text-gray-600">Indexed Permissions</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">
            {loading ? '...' : envioData.executions.length}
          </div>
          <div className="text-sm text-gray-600">Indexed Executions</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">
            {loading ? '...' : envioData.analytics.totalSpent.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Spend (Indexed)</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-orange-600">
            {loading ? '...' : envioData.analytics.recentActivity.length}
          </div>
          <div className="text-sm text-gray-600">Recent Activity</div>
        </div>
      </div>

      {/* What is Envio HyperSync */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🚀 What is Envio HyperSync?</h3>
        <div className="space-y-3 text-sm">
          <p>
            <strong>Envio HyperSync</strong> is a high-performance blockchain indexing service that we're using 
            to monitor Base Sepolia in real-time for all MetaPilot-related activity:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Permission Events:</strong> ERC-7715 permission creation and revocation transactions</li>
            <li><strong>Agent Executions:</strong> All transactions executed by AI agents on your behalf</li>
            <li><strong>Spend Tracking:</strong> Token spend amounts and remaining allowances from events</li>
            <li><strong>Gas Usage:</strong> Transaction costs and network congestion metrics</li>
          </ul>
          <p className="text-gray-600">
            This provides a complete, immutable audit trail of all agent activity directly from the blockchain, 
            enabling full transparency and trust in AI-powered wallet automation.
          </p>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-800 font-medium">✅ Envio HyperSync Connected</div>
            <div className="text-green-700 text-sm">
              API Token: {process.env.NEXT_PUBLIC_ENVIO_API_TOKEN ? 'Configured' : 'Server-side configured'} • 
              Endpoint: https://base-sepolia.hypersync.xyz
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {envioData.analytics.recentActivity.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">📈 Recent Blockchain Activity</h3>
          <div className="space-y-3">
            {envioData.analytics.recentActivity.slice(0, 5).map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{activity.actionType || 'EXECUTION'}</div>
                  <div className="text-sm text-gray-600">
                    Block #{activity.blockNumber} • {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{activity.amount}</div>
                  <div className="text-sm text-gray-600">{activity.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Permissions Tab
function EnvioPermissions({ permissions, loading }: { permissions: EnvioPermissionGrant[]; loading: boolean }) {
  if (loading) {
    return <div className="card text-center py-8">Loading indexed permissions...</div>;
  }

  if (permissions.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-lg font-semibold mb-2">No Indexed Permissions</h3>
        <p className="text-gray-600">
          No ERC-7715 permissions found on the blockchain for this address
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissions.map(permission => (
        <div key={permission.id} className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  INDEXED
                </span>
                <span className="text-sm text-gray-600">
                  Block #{permission.blockNumber}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Token Address</div>
                  <div className="text-gray-600 font-mono">{permission.tokenAddress}</div>
                </div>
                <div>
                  <div className="font-medium">Max Spend</div>
                  <div className="text-gray-600">{permission.amount}</div>
                </div>
                <div>
                  <div className="font-medium">Time Window</div>
                  <div className="text-gray-600">
                    {new Date(permission.startTime).toLocaleDateString()} - {new Date(permission.endTime).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Transaction</div>
                  <a 
                    href={`https://sepolia-explorer.base.org/tx/${permission.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono text-xs"
                  >
                    {permission.transactionHash.slice(0, 10)}...{permission.transactionHash.slice(-8)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Executions Tab
function EnvioExecutions({ executions, loading }: { executions: EnvioAgentExecution[]; loading: boolean }) {
  if (loading) {
    return <div className="card text-center py-8">Loading indexed executions...</div>;
  }

  if (executions.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-6xl mb-4">⚡</div>
        <h3 className="text-lg font-semibold mb-2">No Indexed Executions</h3>
        <p className="text-gray-600">
          No agent executions found on the blockchain for this address
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map(execution => (
        <div key={execution.id} className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-medium">{execution.intent}</div>
              <div className="text-sm text-gray-600">
                Block #{execution.blockNumber} • {new Date(execution.executedAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm">
                <span className="font-medium">Gas Used:</span> {execution.gasUsed}
              </div>
              <div className="text-sm">
                <span className="font-medium">Gas Used:</span> {execution.gasUsed.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm">
                <span className="font-medium">Status:</span> 
                <span className={`ml-1 capitalize ${
                  execution.status === 'executed' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {execution.status}
                </span>
              </div>
              <a 
                href={`https://sepolia-explorer.base.org/tx/${execution.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-mono text-xs"
              >
                View Transaction ↗
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Analytics Tab
function EnvioAnalytics({ envioData, loading }: { envioData: any; loading: boolean }) {
  if (loading) {
    return <div className="card text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Spending Analytics */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">💰 Spending Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {envioData.analytics.totalSpent.toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">Total Spent (All Time)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {envioData.analytics.successfulExecutions}
            </div>
            <div className="text-sm text-gray-600">Successful Executions (24h)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {envioData.spendEntries.length}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
        </div>
      </div>

      {/* Permission Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🔐 Permission Status</h3>
        <div className="space-y-3">
          {envioData.permissions.map((permission: EnvioPermissionGrant) => {
            const isExpired = new Date(permission.endTime) < new Date();
            const spentEntries = envioData.spendEntries.filter((entry: EnvioSpendEntry) => 
              entry.permissionId === permission.id
            );
            const totalSpent = spentEntries.reduce((sum: number, entry: EnvioSpendEntry) => 
              sum + parseFloat(entry.amount), 0
            );
            const spentPercentage = (totalSpent / parseFloat(permission.amount)) * 100;

            return (
              <div key={permission.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    Permission {permission.id.slice(0, 8)}...
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Spent: {totalSpent.toFixed(4)} / {permission.amount} ({spentPercentage.toFixed(1)}%)
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Network Status Component
function NetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<{
    blockNumber: number;
    gasPrice: string;
    chainId: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNetworkStatus = async () => {
    setLoading(true);
    try {
      const status = await realBlockchainService.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to fetch network status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkStatus();
    
    // Update every 60 seconds (reduced from 30 seconds)
    const interval = setInterval(fetchNetworkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🌐 Base Sepolia Network Status</h3>
        <button
          onClick={fetchNetworkStatus}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          {loading ? '🔄 Updating...' : '🔄 Refresh'}
        </button>
      </div>
      
      {networkStatus ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              #{networkStatus.blockNumber.toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">Latest Block</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {parseFloat(networkStatus.gasPrice).toFixed(2)} gwei
            </div>
            <div className="text-sm text-green-700">Gas Price</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {networkStatus.chainId}
            </div>
            <div className="text-sm text-purple-700">Chain ID</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          {loading ? 'Loading network status...' : 'Failed to load network status'}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="font-medium text-gray-700 mb-1">🔗 RPC Endpoint</div>
        <div className="text-gray-600 font-mono">https://sepolia.base.org</div>
        <div className="text-gray-500 text-xs mt-1">
          Direct connection to Base Sepolia testnet for real-time blockchain data
        </div>
      </div>
    </div>
  );
}