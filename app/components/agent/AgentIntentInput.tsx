/**
 * Agent Intent Input - Natural language interface for agent commands
 */

'use client';

import { useState } from 'react';
import { AgentIntent, AgentExecutor } from '@/services/agent/AgentExecutor';
import { ERC7715Permission } from '@/types/permissions';
import { PermissionManager } from '@/services/permissions/PermissionManager';

interface AgentIntentInputProps {
  agentExecutor: AgentExecutor;
  permissionManager: PermissionManager;
  onCommandCreated?: () => void;
  className?: string;
}

/**
 * Natural language interface for submitting agent intents
 */
export function AgentIntentInput({ agentExecutor, permissionManager, onCommandCreated, className = '' }: AgentIntentInputProps) {
  const [description, setDescription] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('');
  const [amount, setAmount] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get permissions from the permission manager
  const permissions = permissionManager ? permissionManager.getPermissions() : [];
  const activePermissions: ERC7715Permission[] = permissions.filter((p: ERC7715Permission) => p.status === 'active');

  const handlePermissionChange = (permissionId: string) => {
    setSelectedPermission(permissionId);
    
    // Auto-select the first allowed contract
    if (permissionId) {
      const permission = activePermissions.find((p: any) => p.id === permissionId);
      if (permission && permission.allowedContracts.length > 0) {
        setContractAddress(permission.allowedContracts[0]);
      }
    } else {
      setContractAddress('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPermission || !amount || !contractAddress || !description.trim()) {
      return;
    }

    const permission = activePermissions.find((p: any) => p.id === selectedPermission);
    if (!permission) {
      return;
    }

    setIsSubmitting(true);

    try {
      const intent: AgentIntent = {
        description: description.trim(),
        tokenAddress: permission.tokenAddress,
        amount,
        contractAddress,
        permissionId: selectedPermission,
      };

      // Use agentExecutor to process the intent
      const execution = await agentExecutor.processIntent(intent);
      
      // Show result
      if (execution.status === 'executed') {
        const baseScanUrl = `https://sepolia-explorer.base.org/tx/${execution.transactionHash}`;
        alert(`🎉 Agent executed successfully!\n\n💡 AI Reasoning: ${execution.decision.reasoning}\n\n📋 Result: ${execution.explanation}\n\n🔗 View on BaseScan: ${baseScanUrl}`);
      } else if (execution.status === 'blocked') {
        alert(`🚫 Agent blocked execution:\n\n💡 AI Reasoning: ${execution.decision.reasoning}\n\n📋 Explanation: ${execution.explanation}`);
      } else if (execution.status === 'failed') {
        alert(`❌ Execution failed:\n\n📋 Error: ${execution.explanation}`);
      }
      
      // Reset form and notify parent
      setDescription('');
      setAmount('');
      setContractAddress('');
      
      if (onCommandCreated) {
        onCommandCreated();
      }
    } catch (error) {
      console.error('Failed to submit intent:', error);
      alert('❌ Failed to process agent intent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExampleIntents = () => [
    "Buy ETH every minute using up to 10 USDC when gas is low",
    "Swap 5 USDC to ETH weekly if price drops below $2000",
    "Rebalance portfolio by selling 2 ETH for USDC every 3 days",
    "DCA into ETH with 20 USDC hourly when network congestion is low",
  ];

  if (activePermissions.length === 0) {
    return (
      <div className={`agent-intent-input ${className}`}>
        <div className="card text-center">
          <h3 className="text-lg font-semibold mb-2">🤖 AI Agent Commands</h3>
          <p className="text-gray-600 mb-4">
            Create permissions first to enable AI agent automation
          </p>
          <div className="text-sm text-gray-500">
            Permissions allow agents to execute transactions on your behalf within defined limits
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`agent-intent-input ${className}`}>
      <div className="card">
        <h3 className="text-xl font-bold mb-4">🤖 AI Agent Commands</h3>
        <p className="text-gray-600 mb-6">
          Tell your AI agent what to do in natural language. It will evaluate conditions and execute within your permissions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Natural Language Intent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What should your agent do?
            </label>
            <textarea
              className="input w-full h-24 resize-none"
              placeholder="Describe what you want your agent to do..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            
            {/* Example Intents */}
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-2">Example commands:</div>
              <div className="flex flex-wrap gap-2">
                {getExampleIntents().map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setDescription(example)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permission Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Use Permission
            </label>
            <select
              className="input w-full"
              value={selectedPermission}
              onChange={(e) => handlePermissionChange(e.target.value)}
              required
            >
              <option value="">Select a permission...</option>
              {activePermissions.map((permission: ERC7715Permission) => (
                <option key={permission.id} value={permission.id}>
                  {permission.tokenAddress.slice(0, 8)}... - Max: {permission.maxSpendAmount}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.000001"
              className="input w-full"
              placeholder="10 (must be within permission limits)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Amount to spend - must be less than your permission's max spend limit
            </p>
          </div>

          {/* Contract Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Contract
            </label>
            {selectedPermission ? (
              <select
                className="input w-full"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                required
              >
                <option value="">Select a contract...</option>
                {(() => {
                  const permission = activePermissions.find((p: ERC7715Permission) => p.id === selectedPermission);
                  return permission?.allowedContracts.map((contract: string, index: number) => (
                    <option key={index} value={contract}>
                      {contract.slice(0, 8)}...{contract.slice(-6)} 
                      {index === 0 ? ' (Primary)' : ''}
                    </option>
                  )) || [];
                })()}
              </select>
            ) : (
              <input
                type="text"
                className="input w-full"
                placeholder="Select a permission first"
                disabled
                value=""
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              Choose from the contracts allowed in your selected permission
            </p>
          </div>

          {/* Permission Preview */}
          {selectedPermission && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                🛡️ Permission Constraints
              </h4>
              {(() => {
                const permission = activePermissions.find((p: ERC7715Permission) => p.id === selectedPermission);
                if (!permission) return null;
                
                const requestedAmount = parseFloat(amount || '0');
                const maxAllowed = parseFloat(permission.maxSpendAmount);
                const isWithinLimit = requestedAmount <= maxAllowed;
                
                return (
                  <div>
                    <ul className="text-sm text-blue-700 space-y-1 mb-3">
                      <li>• Token: {permission.tokenAddress}</li>
                      <li>• Max Spend: {permission.maxSpendAmount}</li>
                      <li>• Valid Until: {permission.endTime.toLocaleDateString()}</li>
                      <li>• Allowed Contracts: {permission.allowedContracts.length}</li>
                    </ul>
                    
                    {amount && (
                      <div className={`p-2 rounded text-sm ${
                        isWithinLimit 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isWithinLimit ? (
                          <span>✅ Amount {amount} is within permission limit ({permission.maxSpendAmount})</span>
                        ) : (
                          <span>❌ Amount {amount} exceeds permission limit ({permission.maxSpendAmount})</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedPermission || !amount || !contractAddress || !description.trim()}
            className="btn-primary w-full"
          >
            {isSubmitting ? '🤖 Agent Evaluating...' : '🚀 Submit to Agent'}
          </button>
        </form>

        {/* How It Works */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">
            🧠 How AI Agent Works
          </h4>
          <ol className="text-sm text-gray-600 space-y-1 mb-4">
            <li>1. Agent analyzes your intent and current market conditions</li>
            <li>2. Validates the action against your permission boundaries</li>
            <li>3. Makes an intelligent decision with explainable reasoning</li>
            <li>4. Executes only if conditions are favorable and within limits</li>
            <li>5. Provides transparent explanation of all decisions</li>
          </ol>
          
          <div className="border-t pt-3">
            <h5 className="text-sm font-medium text-purple-800 mb-2">
              ⏰ Automatic Scheduling
            </h5>
            <p className="text-sm text-purple-700 mb-2">
              Use time-based language to create recurring executions:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-purple-100 p-2 rounded">
                <strong>"every minute"</strong> → Runs every 60 seconds
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>"daily"</strong> → Runs every 24 hours
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>"weekly"</strong> → Runs every 7 days
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>"hourly"</strong> → Runs every hour
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>"every 3 days"</strong> → Custom intervals
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>"every 5 minutes"</strong> → Custom minute intervals
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}