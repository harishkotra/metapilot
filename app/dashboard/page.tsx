/**
 * MetaPilot Dashboard Page
 * Main application interface after wallet connection
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, getWalletManager } from '@/hooks/useWallet';
import { PermissionComposer } from '@/components/permissions/PermissionComposer';
import { AgentIntentInput } from '@/components/agent/AgentIntentInput';
import { TrustDashboard } from '@/components/dashboard/TrustDashboard';
import { EnvioDataViewer } from '@/components/envio/EnvioDataViewer';
import { PermissionManager } from '@/services/permissions/PermissionManager';
import { AgentExecutor } from '@/services/agent/AgentExecutor';

export default function DashboardPage() {
  const router = useRouter();
  const { connectionState, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<'permissions' | 'agent' | 'dashboard' | 'envio'>('permissions');
  const [permissionManager, setPermissionManager] = useState<PermissionManager | null>(null);
  const [agentExecutor, setAgentExecutor] = useState<AgentExecutor | null>(null);

  // Redirect to home if not connected
  useEffect(() => {
    if (!connectionState.isConnected) {
      router.push('/');
    }
  }, [connectionState.isConnected, router]);

  // Initialize services when wallet is connected
  useEffect(() => {
    if (connectionState.isConnected) {
      const walletManager = getWalletManager();
      
      const permManager = new PermissionManager(walletManager);
      const agentExec = new AgentExecutor(permManager, walletManager);
      setPermissionManager(permManager);
      setAgentExecutor(agentExec);
    }
  }, [connectionState.isConnected]);

  // Handle disconnect
  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  // Show loading if not connected
  if (!connectionState.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-primary-600">🤖</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">MetaPilot Dashboard</h1>
                <p className="text-sm text-gray-500">AI-Powered Wallet Automation</p>
              </div>
            </div>

            {/* Wallet Info and Disconnect */}
            <div className="flex items-center space-x-4">
              {/* Wallet Address */}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {connectionState.smartAccount?.address.slice(0, 6)}...{connectionState.smartAccount?.address.slice(-4)}
                </div>
                <div className="text-xs text-gray-500">
                  {connectionState.network?.name || 'Base Sepolia'}
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'permissions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔐 Permissions
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agent'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 Agent Commands
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Trust Dashboard
            </button>
            <button
              onClick={() => setActiveTab('envio')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'envio'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Blockchain Data
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'permissions' && permissionManager && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Agent Permissions</h2>
              <p className="text-gray-600">
                Grant fine-grained, time-bound permissions to AI agents for safe automation.
              </p>
            </div>
            <PermissionComposer 
              permissionManager={permissionManager}
              onPermissionCreated={() => {
                // Auto-switch to agent tab after creating permission
                setActiveTab('agent');
              }}
            />
          </div>
        )}

        {activeTab === 'agent' && agentExecutor && permissionManager && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent Commands</h2>
              <p className="text-gray-600">
                Give natural language instructions to your AI agent for automated execution.
              </p>
            </div>
            <AgentIntentInput 
              agentExecutor={agentExecutor}
              permissionManager={permissionManager}
              onCommandCreated={() => {
                // Auto-switch to dashboard tab after execution
                setActiveTab('dashboard');
              }}
            />
          </div>
        )}

        {activeTab === 'dashboard' && agentExecutor && permissionManager && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Trust Dashboard</h2>
              <p className="text-gray-600">
                Monitor your agent's activities, permissions, and execution history.
              </p>
            </div>
            <TrustDashboard 
              agentExecutor={agentExecutor} 
              permissionManager={permissionManager}
            />
          </div>
        )}

        {activeTab === 'envio' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Blockchain Data</h2>
              <p className="text-gray-600">
                Real-time blockchain data and transaction monitoring via Envio indexing.
              </p>
            </div>
            <EnvioDataViewer userAddress={connectionState.smartAccount?.address} />
          </div>
        )}
      </main>
    </div>
  );
}