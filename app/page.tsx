/**
 * MetaPilot Landing Page
 * Entry point for wallet connection
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { WalletConnection } from '@/components/wallet/WalletConnection';

export default function HomePage() {
  const router = useRouter();
  const { connectionState, isConnecting } = useWallet();

  // Redirect to dashboard when connected
  useEffect(() => {
    if (connectionState.isConnected) {
      router.push('/dashboard');
    }
  }, [connectionState.isConnected, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              MetaPilot
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              AI-powered wallet automation studio for MetaMask Smart Accounts. 
              Grant fine-grained permissions to AI agents for safe, transparent automation.
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Connection Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started</h2>
          <p className="text-lg text-gray-600">
            Connect your MetaMask Smart Account to begin automating your transactions
          </p>
        </div>
        
        <WalletConnection />
      </div>
    </div>
  );
}