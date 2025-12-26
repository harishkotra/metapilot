/**
 * Permission Composer - Visual UI for creating ERC-7715 Advanced Permissions
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { PermissionRequest } from '@/types/permissions';

interface PermissionComposerProps {
  permissionManager: any; // PermissionManager instance
  onPermissionCreated?: () => void;
  className?: string;
}

/**
 * Visual UI for composing ERC-7715 Advanced Permissions
 */
export function PermissionComposer({ permissionManager, onPermissionCreated, className = '' }: PermissionComposerProps) {
  const { connectionState } = useWallet();
  const [permission, setPermission] = useState<Partial<PermissionRequest>>({
    tokenAddress: '',
    maxSpendAmount: '',
    allowedContracts: [''],
  });
  const [timeWindow, setTimeWindow] = useState({
    duration: '7',
    unit: 'days' as 'hours' | 'days' | 'weeks',
  });

  // Sample data for demo purposes
  const sampleData = {
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    dexAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Sample DEX contract
    amount: '1000', // Increased to 1000 to allow for meaningful transactions
  };

  const fillSampleData = () => {
    setPermission({
      tokenAddress: sampleData.usdcAddress,
      maxSpendAmount: sampleData.amount,
      allowedContracts: [sampleData.dexAddress],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startTime = new Date();
    const endTime = new Date();
    
    // Calculate end time based on duration and unit
    const durationMs = {
      hours: parseInt(timeWindow.duration) * 60 * 60 * 1000,
      days: parseInt(timeWindow.duration) * 24 * 60 * 60 * 1000,
      weeks: parseInt(timeWindow.duration) * 7 * 24 * 60 * 60 * 1000,
    }[timeWindow.unit];
    
    endTime.setTime(startTime.getTime() + durationMs);

    const fullPermission: PermissionRequest = {
      tokenAddress: permission.tokenAddress!,
      maxSpendAmount: permission.maxSpendAmount!,
      startTime,
      endTime,
      allowedContracts: permission.allowedContracts!.filter(addr => addr.trim() !== ''),
    };

    try {
      // Use permissionManager to create the permission
      await permissionManager.createPermission(fullPermission);
      
      // Show success message
      alert('🎉 Permission created successfully!\n\nYour AI agent can now operate within these constraints.');
      
      // Reset form
      setPermission({
        tokenAddress: '',
        maxSpendAmount: '',
        allowedContracts: [''],
      });
      setTimeWindow({
        duration: '7',
        unit: 'days',
      });
      
      // Notify parent component
      if (onPermissionCreated) {
        onPermissionCreated();
      }
    } catch (error) {
      console.error('Failed to create permission:', error);
      alert('❌ Failed to create permission. Please try again.');
    }
  };

  const addContractAddress = () => {
    setPermission(prev => ({
      ...prev,
      allowedContracts: [...(prev.allowedContracts || []), ''],
    }));
  };

  const removeContractAddress = (index: number) => {
    setPermission(prev => ({
      ...prev,
      allowedContracts: prev.allowedContracts?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateContractAddress = (index: number, value: string) => {
    setPermission(prev => ({
      ...prev,
      allowedContracts: prev.allowedContracts?.map((addr, i) => i === index ? value : addr) || [],
    }));
  };

  if (!connectionState.isConnected) {
    return (
      <div className={`permission-composer ${className}`}>
        <div className="card text-center">
          <h3 className="text-lg font-semibold mb-2">Permission Composer</h3>
          <p className="text-gray-600">
            Connect your wallet to create AI agent permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`permission-composer ${className}`}>
      <div className="card">
        <h3 className="text-xl font-bold mb-6">🔐 Create Agent Permission</h3>
        <p className="text-gray-600 mb-6">
          Define what your AI agent can do with fine-grained, time-bound permissions
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sample Data Helper */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-yellow-800">🚀 Quick Start</h4>
                <p className="text-xs text-yellow-700">
                  New to MetaPilot? Use sample data to create your first permission quickly
                </p>
              </div>
              <button
                type="button"
                onClick={fillSampleData}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
              >
                Fill Sample Data
              </button>
            </div>
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Address
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia USDC)"
              value={permission.tokenAddress || ''}
              onChange={(e) => setPermission(prev => ({ ...prev, tokenAddress: e.target.value }))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The ERC-20 token your agent can spend. Try the sample USDC address above for Base Sepolia.
            </p>
          </div>

          {/* Spend Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Spend Amount
            </label>
            <input
              type="number"
              step="0.000001"
              className="input w-full"
              placeholder="1000 (recommended for demo)"
              value={permission.maxSpendAmount || ''}
              onChange={(e) => setPermission(prev => ({ ...prev, maxSpendAmount: e.target.value }))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Total amount the agent can spend during the time window (e.g., 1000 USDC for multiple transactions)
            </p>
          </div>

          {/* Time Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Window
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="1"
                className="input flex-1"
                placeholder="7"
                value={timeWindow.duration}
                onChange={(e) => setTimeWindow(prev => ({ ...prev, duration: e.target.value }))}
                required
              />
              <select
                className="input"
                value={timeWindow.unit}
                onChange={(e) => setTimeWindow(prev => ({ ...prev, unit: e.target.value as any }))}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              How long this permission remains active
            </p>
          </div>

          {/* Allowed Contracts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Contracts
            </label>
            <div className="space-y-2">
              {permission.allowedContracts?.map((address, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24 (Sample DEX)"
                    value={address}
                    onChange={(e) => updateContractAddress(index, e.target.value)}
                  />
                  {permission.allowedContracts!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContractAddress(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addContractAddress}
              className="mt-2 text-sm text-primary-600 hover:text-primary-800"
            >
              + Add Contract Address
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Contracts your agent is allowed to interact with
            </p>
          </div>

          {/* Permission Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              🛡️ What This Agent Can Do
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Spend up to <strong>{permission.maxSpendAmount || '0'}</strong> tokens</li>
              <li>• Active for <strong>{timeWindow.duration} {timeWindow.unit}</strong></li>
              <li>• Can interact with <strong>{permission.allowedContracts?.filter(a => a.trim()).length || 0}</strong> contracts</li>
              <li>• Permission expires automatically</li>
              <li>• You can revoke anytime</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!permission.tokenAddress || !permission.maxSpendAmount}
          >
            Create Permission
          </button>
        </form>
      </div>
    </div>
  );
}