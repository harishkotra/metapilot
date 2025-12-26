/**
 * Trust Dashboard - Main interface for monitoring agent activity and permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { PermissionManager } from '@/services/permissions/PermissionManager';
import { AgentExecutor, AgentExecution, AgentIntent } from '@/services/agent/AgentExecutor';
import { ERC7715Permission, SpendTracking } from '@/types/permissions';

interface TrustDashboardProps {
  permissionManager: PermissionManager;
  agentExecutor: AgentExecutor;
  envioData?: {
    permissions: any[];
    executions: any[];
    spendEntries: any[];
    analytics: {
      totalSpent: number;
      activePermissions: number;
      successfulExecutions: number;
      recentActivity: any[];
    };
  };
  envioLoading?: boolean;
  envioError?: Error | null;
  envioMode?: 'hypersync' | 'mock';
  className?: string;
}

type TabType = 'overview' | 'permissions' | 'activity' | 'executions' | 'schedules' | 'debug';

/**
 * Trust Dashboard for monitoring agent activity and permissions
 */
export function TrustDashboard({ 
  permissionManager, 
  agentExecutor, 
  envioData,
  envioLoading = false,
  envioError = null,
  envioMode = 'mock',
  className = '' 
}: TrustDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [permissions, setPermissions] = useState<ERC7715Permission[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [schedules, setSchedules] = useState<Array<{ id: string; intent: AgentIntent; nextExecution: Date }>>([]);
  const [spendTracking, setSpendTracking] = useState<Map<string, SpendTracking>>(new Map());
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Refresh data
  const refreshData = () => {
    console.log('🔄 TrustDashboard refreshing data...');
    
    const allPermissions = permissionManager.getPermissions();
    setPermissions(allPermissions);
    console.log('📋 Loaded permissions:', allPermissions.length);
    
    const allExecutions = agentExecutor.getExecutions();
    setExecutions(allExecutions);
    console.log('⚡ Loaded executions:', allExecutions.length);

    const activeSchedules = agentExecutor.getActiveSchedules();
    setSchedules(activeSchedules);
    console.log('⏰ Loaded schedules:', activeSchedules.length);
    console.log('⏰ Schedule details:', activeSchedules);

    // Get debug info for schedules
    const debug = agentExecutor.getScheduleDebugInfo();
    setDebugInfo(debug);
    console.log('🐛 Debug info:', debug);

    const tracking = new Map<string, SpendTracking>();
    allPermissions.forEach(permission => {
      const spend = permissionManager.getSpendTracking(permission.id);
      if (spend) {
        tracking.set(permission.id, spend);
      }
    });
    setSpendTracking(tracking);
    console.log('💰 Loaded spend tracking for', tracking.size, 'permissions');
  };

  useEffect(() => {
    refreshData();
    
    // Refresh every 10 seconds
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [permissionManager, agentExecutor]);

  const getSystemStatus = () => {
    const activePermissions = permissions.filter(p => p.status === 'active');
    const recentFailures = executions.filter(e => 
      e.status === 'failed' && 
      Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    const expiringSoon = activePermissions.filter(p => 
      p.endTime.getTime() - Date.now() < 24 * 60 * 60 * 1000
    );

    if (recentFailures.length > 0) {
      return { status: 'error', message: `${recentFailures.length} recent failures`, color: 'red' };
    }
    if (expiringSoon.length > 0) {
      return { status: 'warning', message: `${expiringSoon.length} permissions expiring soon`, color: 'yellow' };
    }
    if (activePermissions.length === 0) {
      return { status: 'inactive', message: 'No active permissions', color: 'gray' };
    }
    return { status: 'healthy', message: 'All systems operational', color: 'green' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className={`trust-dashboard ${className}`}>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🛡️ Trust Dashboard</h2>
            <p className="text-gray-600">Monitor your AI agents and permissions</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Base Sepolia Status */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              envioError ? 'bg-red-100 text-red-800' :
              envioLoading ? 'bg-yellow-100 text-yellow-800' :
              envioMode === 'hypersync' ? 'bg-green-100 text-green-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              📊 Base Sepolia: {envioMode} {envioLoading && '(loading...)'}
            </div>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${systemStatus.color}-100 text-${systemStatus.color}-800`}>
              {systemStatus.message}
            </div>
            <button onClick={refreshData} className="btn-secondary">
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {/* Base Sepolia Data Summary */}
        {envioData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">
              📊 Blockchain Data (via Envio HyperSync indexer)
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-600">Indexed Permissions</div>
                <div className="text-lg font-bold text-blue-600">{envioData.permissions.length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Indexed Executions</div>
                <div className="text-lg font-bold text-green-600">{envioData.executions.length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Total Spend (Indexed)</div>
                <div className="text-lg font-bold text-purple-600">{envioData.analytics.totalSpent.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Recent Activity</div>
                <div className="text-lg font-bold text-orange-600">{envioData.analytics.recentActivity.length}</div>
              </div>
            </div>
          </div>
        )}
        
        {envioError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-800 mb-1">
              ⚠️ Base Sepolia Indexing Error
            </div>
            <div className="text-sm text-red-700">
              {envioError.message}. Using local data only.
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'permissions', label: '🔐 Permissions' },
          { id: 'schedules', label: '⏰ Schedules' },
          { id: 'activity', label: '📈 Activity' },
          { id: 'executions', label: '⚡ Executions' },
          { id: 'debug', label: '🔧 Debug' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          permissions={permissions} 
          executions={executions} 
          schedules={schedules}
          spendTracking={spendTracking} 
        />
      )}
      
      {activeTab === 'permissions' && (
        <PermissionsTab 
          permissions={permissions} 
          spendTracking={spendTracking}
          onRevoke={(id) => {
            permissionManager.revokePermission(id).then(refreshData);
          }}
        />
      )}

      {activeTab === 'schedules' && (
        <SchedulesTab 
          schedules={schedules}
          permissionManager={permissionManager}
          onStopSchedule={(id) => {
            console.log('🛑 TrustDashboard: Stopping schedule:', id);
            const success = agentExecutor.stopSchedule(id);
            if (success) {
              console.log('✅ Schedule stopped successfully');
            } else {
              console.log('❌ Failed to stop schedule');
            }
            refreshData();
          }}
        />
      )}
      
      {activeTab === 'activity' && (
        <ActivityTab executions={executions} />
      )}
      
      {activeTab === 'executions' && (
        <ExecutionsTab executions={executions} />
      )}

      {activeTab === 'debug' && (
        <DebugTab debugInfo={debugInfo} onRefresh={refreshData} />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  permissions, 
  executions, 
  schedules,
  spendTracking 
}: { 
  permissions: ERC7715Permission[];
  executions: AgentExecution[];
  schedules: Array<{ id: string; intent: AgentIntent; nextExecution: Date }>;
  spendTracking: Map<string, SpendTracking>;
}) {
  const activePermissions = permissions.filter(p => p.status === 'active');
  const recentExecutions = executions.filter(e => 
    Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
  );
  const successfulExecutions = recentExecutions.filter(e => e.status === 'executed');

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-600">{activePermissions.length}</div>
          <div className="text-sm text-gray-600">Active Permissions</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{schedules.length}</div>
          <div className="text-sm text-gray-600">Active Schedules</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{successfulExecutions.length}</div>
          <div className="text-sm text-gray-600">Executions (24h)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Array.from(spendTracking.values()).reduce((sum, track) => 
              sum + parseFloat(track.totalSpent), 0
            ).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Spent</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">
            {permissions.filter(p => p.status === 'expired').length}
          </div>
          <div className="text-sm text-gray-600">Expired Permissions</div>
        </div>
      </div>

      {/* Active Schedules Preview */}
      {schedules.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">⏰ Active Schedules</h3>
          <div className="space-y-3">
            {schedules.slice(0, 3).map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium">{schedule.intent.description}</div>
                  <div className="text-sm text-gray-600">
                    {schedule.intent.schedule?.frequency} • Amount: {schedule.intent.amount}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-600">Next run:</div>
                  <div className="font-medium">{schedule.nextExecution.toLocaleString()}</div>
                </div>
              </div>
            ))}
            {schedules.length > 3 && (
              <div className="text-center text-sm text-gray-500">
                +{schedules.length - 3} more schedules
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📈 Recent Activity</h3>
        {recentExecutions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentExecutions.slice(0, 5).map(execution => (
              <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    execution.status === 'executed' ? 'bg-green-500' :
                    execution.status === 'failed' ? 'bg-red-500' :
                    execution.status === 'blocked' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <div className="font-medium">{execution.intent.description}</div>
                    <div className="text-sm text-gray-600">
                      {execution.timestamp.toLocaleString()}
                      {execution.intent.schedule?.type === 'recurring' && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {execution.intent.schedule.frequency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{execution.intent.amount}</div>
                  <div className="text-sm text-gray-600 capitalize">{execution.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Permissions Tab Component
function PermissionsTab({ 
  permissions, 
  spendTracking,
  onRevoke 
}: { 
  permissions: ERC7715Permission[];
  spendTracking: Map<string, SpendTracking>;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {permissions.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">No permissions created yet</p>
        </div>
      ) : (
        permissions.map(permission => {
          const tracking = spendTracking.get(permission.id);
          const spentPercentage = tracking ? 
            (parseFloat(tracking.totalSpent) / parseFloat(permission.maxSpendAmount)) * 100 : 0;

          return (
            <div key={permission.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      permission.status === 'active' ? 'bg-green-100 text-green-800' :
                      permission.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                      permission.status === 'revoked' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {permission.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      Created {permission.grantedAt.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Token Address</div>
                      <div className="text-gray-600 font-mono">{permission.tokenAddress}</div>
                    </div>
                    <div>
                      <div className="font-medium">Max Spend</div>
                      <div className="text-gray-600">{permission.maxSpendAmount}</div>
                    </div>
                    <div>
                      <div className="font-medium">Time Window</div>
                      <div className="text-gray-600">
                        {permission.startTime.toLocaleDateString()} - {permission.endTime.toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Allowed Contracts</div>
                      <div className="text-gray-600">{permission.allowedContracts.length} contracts</div>
                    </div>
                  </div>

                  {tracking && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Spend Usage</span>
                        <span>{tracking.totalSpent} / {permission.maxSpendAmount}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {permission.status === 'active' && (
                  <button
                    onClick={() => onRevoke(permission.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ executions }: { executions: AgentExecution[] }) {
  return (
    <div className="space-y-4">
      {executions.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">No agent activity yet</p>
        </div>
      ) : (
        executions.map(execution => (
          <div key={execution.id} className="card">
            <div className="flex items-start space-x-4">
              <div className={`w-4 h-4 rounded-full mt-1 ${
                execution.status === 'executed' ? 'bg-green-500' :
                execution.status === 'failed' ? 'bg-red-500' :
                execution.status === 'blocked' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{execution.intent.description}</h4>
                  <span className="text-sm text-gray-600">
                    {execution.timestamp.toLocaleString()}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  Amount: {execution.intent.amount} | Status: {execution.status}
                </div>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Explanation:</strong> {execution.explanation}
                </div>
                
                {execution.transactionHash && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">TX: </span>
                    <a 
                      href={`https://sepolia-explorer.base.org/tx/${execution.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-mono"
                    >
                      {execution.transactionHash.slice(0, 10)}...{execution.transactionHash.slice(-8)}
                    </a>
                    <span className="ml-2 text-gray-400">↗ View on BaseScan</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Executions Tab Component
function ExecutionsTab({ executions }: { executions: AgentExecution[] }) {
  const [filter, setFilter] = useState<AgentExecution['status'] | 'all'>('all');
  
  const filteredExecutions = filter === 'all' 
    ? executions 
    : executions.filter(e => e.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex space-x-2">
        {['all', 'executed', 'failed', 'blocked', 'pending'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-3 py-1 rounded text-sm ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Executions List */}
      {filteredExecutions.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">No executions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExecutions.map(execution => (
            <div key={execution.id} className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="font-medium">{execution.intent.description}</div>
                  <div className="text-sm text-gray-600">{execution.timestamp.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm">
                    <span className="font-medium">Amount:</span> {execution.intent.amount}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-1 capitalize ${
                      execution.status === 'executed' ? 'text-green-600' :
                      execution.status === 'failed' ? 'text-red-600' :
                      execution.status === 'blocked' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                </div>
                <div>
                  {execution.decision.confidence > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Confidence:</span> {execution.decision.confidence}%
                    </div>
                  )}
                  {execution.gasUsed && (
                    <div className="text-sm">
                      <span className="font-medium">Gas:</span> {execution.gasUsed}
                    </div>
                  )}
                </div>
              </div>
              
              {execution.decision.reasoning && (
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                  <strong>AI Reasoning:</strong> {execution.decision.reasoning}
                </div>
              )}
              
              {execution.transactionHash && (
                <div className="mt-3 p-3 bg-green-50 rounded text-sm">
                  <strong>Transaction:</strong>{' '}
                  <a 
                    href={`https://sepolia-explorer.base.org/tx/${execution.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono"
                  >
                    {execution.transactionHash.slice(0, 10)}...{execution.transactionHash.slice(-8)}
                  </a>
                  <span className="ml-2 text-gray-400">↗ View on BaseScan</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Schedules Tab Component
function SchedulesTab({ 
  schedules, 
  onStopSchedule,
  permissionManager,
}: { 
  schedules: Array<{ id: string; intent: AgentIntent; nextExecution: Date }>;
  onStopSchedule: (id: string) => void;
  permissionManager?: any; // Add permission manager to check status
}) {
  const getTimeUntilNext = (nextExecution: Date): string => {
    const now = new Date();
    const diff = nextExecution.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Overdue';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getPermissionStatus = (permissionId: string) => {
    if (!permissionManager) return { status: 'unknown', color: 'gray' };
    
    const permission = permissionManager.getPermission(permissionId);
    if (!permission) return { status: 'not found', color: 'red' };
    
    const statusColors = {
      'active': 'green',
      'expired': 'orange',
      'revoked': 'red',
      'pending': 'yellow',
    };
    
    return {
      status: permission.status,
      color: statusColors[permission.status as keyof typeof statusColors] || 'gray',
    };
  };

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-6xl mb-4">⏰</div>
          <h3 className="text-lg font-semibold mb-2">No Active Schedules</h3>
          <p className="text-gray-500 mb-4">
            Create agent commands with time-based language to set up recurring executions
          </p>
          <div className="text-sm text-gray-400">
            Examples: "Buy ETH daily", "Rebalance weekly", "DCA every 2 hours"
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              ⏰ Active Schedules ({schedules.length})
            </h3>
            <p className="text-blue-700 text-sm">
              These agent commands will execute automatically based on their schedule. 
              Each execution is still subject to permission validation and AI decision-making.
            </p>
          </div>

          {schedules.map(schedule => {
            const permissionStatus = getPermissionStatus(schedule.intent.permissionId);
            const timeRemaining = getTimeUntilNext(schedule.nextExecution);
            const isOverdue = timeRemaining === 'Overdue';
            
            return (
              <div key={schedule.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${
                        permissionStatus.status === 'active' ? 'bg-purple-500 animate-pulse' : 
                        permissionStatus.status === 'expired' ? 'bg-orange-500' :
                        permissionStatus.status === 'revoked' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <h4 className="font-semibold text-lg">{schedule.intent.description}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>
                            Runs {schedule.intent.schedule?.frequency}
                            {schedule.intent.schedule?.interval && schedule.intent.schedule.interval > 1 && 
                              ` (every ${schedule.intent.schedule.interval} ${schedule.intent.schedule.frequency?.replace('ly', 's')})`
                            }
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            permissionStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                            permissionStatus.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                            permissionStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Permission: {permissionStatus.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-gray-700">Amount</div>
                        <div className="text-gray-600">{schedule.intent.amount}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Token</div>
                        <div className="text-gray-600 font-mono">
                          {schedule.intent.tokenAddress.slice(0, 8)}...
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Contract</div>
                        <div className="text-gray-600 font-mono">
                          {schedule.intent.contractAddress.slice(0, 8)}...
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Permission</div>
                        <div className="text-gray-600">
                          {schedule.intent.permissionId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      isOverdue ? 'bg-red-50 border border-red-200' : 'bg-purple-50'
                    }`}>
                      <div>
                        <div className={`font-medium ${isOverdue ? 'text-red-800' : 'text-purple-800'}`}>
                          Next Execution
                        </div>
                        <div className={isOverdue ? 'text-red-700' : 'text-purple-700'}>
                          {schedule.nextExecution.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${isOverdue ? 'text-red-600' : 'text-purple-600'}`}>
                          Time remaining
                        </div>
                        <div className={`font-bold ${isOverdue ? 'text-red-800' : 'text-purple-800'}`}>
                          {timeRemaining}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        console.log('🛑 Stop button clicked for schedule:', schedule.id);
                        onStopSchedule(schedule.id);
                      }}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      title="Stop this recurring schedule"
                    >
                      🛑 Stop Schedule
                    </button>
                    {permissionStatus.status !== 'active' && (
                      <div className="text-xs text-gray-500 text-center">
                        Will auto-stop due to {permissionStatus.status} permission
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="card bg-gray-50">
            <h4 className="font-medium text-gray-800 mb-2">
              💡 How Scheduling Works
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Schedules are detected from natural language in your agent commands</li>
              <li>• Each scheduled execution goes through the same AI evaluation process</li>
              <li>• Executions are still subject to permission boundaries and market conditions</li>
              <li>• Schedules persist across browser sessions and will resume automatically</li>
              <li>• You can stop any schedule at any time using the "Stop Schedule" button</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Debug Tab Component
function DebugTab({ 
  debugInfo, 
  onRefresh 
}: { 
  debugInfo: any;
  onRefresh: () => void;
}) {
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(onRefresh, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, onRefresh]);

  return (
    <div className="space-y-4">
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">🔧 Schedule Debug Information</h3>
            <p className="text-yellow-700 text-sm">
              Real-time debugging information for scheduled agent executions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh (2s)</span>
            </label>
            <button onClick={onRefresh} className="btn-secondary text-sm">
              🔄 Refresh Now
            </button>
            <button 
              onClick={() => {
                // Access the agentExecutor through window for testing
                if ((window as any).agentExecutor) {
                  (window as any).agentExecutor.createTestSchedule();
                  setTimeout(onRefresh, 1000); // Refresh after 1 second
                }
              }}
              className="btn-primary text-sm"
            >
              🧪 Create Test Schedule
            </button>
          </div>
        </div>
        
        <div className="text-sm text-yellow-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
        
        <div className="mt-3 p-3 bg-yellow-100 rounded-lg text-sm text-yellow-800">
          <strong>💡 How to test scheduling:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>First create a permission in the "Permissions" tab</li>
            <li>Then create an agent command with "every minute" in the "Agent Commands" tab</li>
            <li>Or click "Create Test Schedule" above to create a test schedule</li>
            <li>Watch the console logs (F12) and this debug panel for activity</li>
          </ol>
        </div>
      </div>

      {debugInfo ? (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="card">
            <h4 className="font-semibold mb-3">📊 Schedule Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{debugInfo.totalSchedules}</div>
                <div className="text-sm text-blue-700">Total Schedules</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{debugInfo.activeTimeouts}</div>
                <div className="text-sm text-green-700">Active Timeouts</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {debugInfo.schedules.filter((s: any) => s.isActive).length}
                </div>
                <div className="text-sm text-purple-700">Active Schedules</div>
              </div>
            </div>
          </div>

          {/* Detailed Schedule Information */}
          <div className="card">
            <h4 className="font-semibold mb-3">📋 Schedule Details</h4>
            {debugInfo.schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No schedules found</p>
            ) : (
              <div className="space-y-3">
                {debugInfo.schedules.map((schedule: any, index: number) => (
                  <div key={schedule.id || index} className="p-3 border rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Description</div>
                        <div className="text-gray-600">{schedule.description}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Frequency</div>
                        <div className="text-gray-600">{schedule.frequency}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Next Execution</div>
                        <div className="text-gray-600">{schedule.nextExecution}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Time Until Next</div>
                        <div className={`font-medium ${
                          schedule.timeUntilNext === 'overdue' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {schedule.timeUntilNext}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Status</div>
                        <div className={`font-medium ${
                          schedule.isActive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Browser Console Instructions */}
          <div className="card bg-gray-50">
            <h4 className="font-semibold mb-3">🔍 Console Debugging</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>To see detailed logs:</strong> Open your browser's Developer Tools (F12) and check the Console tab.
              </p>
              <p>
                <strong>Look for these log messages:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>⏰ Setting up recurring schedule for:</code> - When a schedule is created</li>
                <li><code>⏰ [timestamp] Executing scheduled intent:</code> - When a scheduled execution runs</li>
                <li><code>📊 [timestamp] Scheduled execution result:</code> - Execution results</li>
                <li><code>⏰ Next execution scheduled for:</code> - When next execution is scheduled</li>
              </ul>
              <p className="mt-3">
                <strong>If you don't see these logs:</strong> The scheduling system may not be working properly. 
                Try creating a new agent command with "every minute" to test.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500">Loading debug information...</p>
        </div>
      )}
    </div>
  );
}