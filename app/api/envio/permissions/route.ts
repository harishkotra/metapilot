/**
 * API Route: /api/envio/permissions
 * Server-side Envio HyperSync integration for permission grants
 */

import { NextRequest, NextResponse } from 'next/server';

// Server-side HyperSync client import
let HypersyncClient: any = null;

try {
  // Only available on server-side after npm install
  const hypersyncModule = require('@envio-dev/hypersync-client');
  HypersyncClient = hypersyncModule.HypersyncClient;
} catch (error) {
  console.warn('⚠️ HyperSync client not available:', error);
}

/**
 * ERC-7715 Permission contract addresses and event signatures for Base Sepolia
 */
const ERC7715_CONTRACTS = {
  PERMISSION_MANAGER: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Example ERC-20 contract for demo
};

const EVENT_SIGNATURES = {
  TOKEN_APPROVAL: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
};

/**
 * GET /api/envio/permissions?userAddress=0x...
 * Query permission grants for a user address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 API: Querying permissions for ${userAddress}`);

    // Check if HyperSync is available
    if (!HypersyncClient) {
      console.log('📋 HyperSync not available - returning sample data');
      
      // Return sample data when HyperSync is not available
      const samplePermissions = [
        {
          id: 'perm_sample_1',
          userAddress: userAddress.toLowerCase(),
          spender: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
          tokenAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
          amount: '1000000000000000000', // 1 token in wei
          startTime: Date.now() - 3600000, // 1 hour ago
          endTime: Date.now() + 86400000, // 24 hours from now
          isActive: true,
          transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 12345678,
          createdAt: new Date().toISOString(),
        }
      ];

      return NextResponse.json({
        data: samplePermissions,
        loading: false,
        mode: 'sample',
      });
    }

    // Initialize HyperSync client
    const apiToken = process.env.ENVIO_API_TOKEN;
    const hypersyncUrl = process.env.ENVIO_HYPERSYNC_URL || 'https://base-sepolia.hypersync.xyz';

    if (!apiToken) {
      return NextResponse.json(
        { error: 'ENVIO_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    console.log(`🚀 Initializing HyperSync client for ${hypersyncUrl}`);

    const client = new HypersyncClient({
      url: hypersyncUrl,
      apiToken: apiToken,
    });

    // Create query for ERC-20 Approval events (proxy for ERC-7715 permissions)
    const query = {
      fromBlock: 0,
      logs: [
        {
          address: [ERC7715_CONTRACTS.PERMISSION_MANAGER],
          topics: [
            [EVENT_SIGNATURES.TOKEN_APPROVAL],
            [`0x000000000000000000000000${userAddress.slice(2)}`], // owner (user)
          ],
        },
      ],
      fieldSelection: {
        log: [
          'Address',
          'Topic0',
          'Topic1', 
          'Topic2',
          'Topic3',
          'Data',
          'BlockNumber',
          'TransactionHash',
          'LogIndex',
        ],
      },
    };

    console.log('📊 Executing HyperSync query...');
    const response = await client.get(query);
    console.log(`✅ HyperSync response received:`, response);

    // Transform logs to permission grants
    const permissions = response.data?.logs?.map((log: any) => ({
      id: `perm_${log.transactionHash}_${log.logIndex}`,
      userAddress: userAddress.toLowerCase(),
      spender: `0x${log.topic2?.slice(26)}` || '0x0000000000000000000000000000000000000000',
      tokenAddress: log.address?.toLowerCase() || ERC7715_CONTRACTS.PERMISSION_MANAGER.toLowerCase(),
      amount: '1000000000000000000', // 1 token in wei
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: Date.now() + 86400000, // 24 hours from now
      isActive: true,
      transactionHash: log.transactionHash || `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
      blockNumber: parseInt(log.blockNumber || '0'),
      createdAt: new Date().toISOString(),
    })) || [];

    console.log(`✅ Found ${permissions.length} permission grants`);

    return NextResponse.json({
      data: permissions,
      loading: false,
      mode: 'hypersync',
    });

  } catch (error) {
    console.error('❌ API Error querying permissions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to query permissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}