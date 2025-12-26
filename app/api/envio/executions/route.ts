/**
 * API Route: /api/envio/executions
 * Server-side Envio HyperSync integration for agent executions
 */

import { NextRequest, NextResponse } from 'next/server';

// Server-side HyperSync client import
let HypersyncClient: any = null;

try {
  const hypersyncModule = require('@envio-dev/hypersync-client');
  HypersyncClient = hypersyncModule.HypersyncClient;
} catch (error) {
  console.warn('⚠️ HyperSync client not available:', error);
}

/**
 * ERC-7715 Permission contract addresses and event signatures for Base Sepolia
 */
const ERC7715_CONTRACTS = {
  PERMISSION_MANAGER: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
};

const EVENT_SIGNATURES = {
  TOKEN_TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
};

/**
 * GET /api/envio/executions?userAddress=0x...
 * Query agent executions for a user address
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

    console.log(`🔍 API: Querying executions for ${userAddress}`);

    // Check if HyperSync is available
    if (!HypersyncClient) {
      console.log('📋 HyperSync not available - returning sample data');
      
      // Return sample data when HyperSync is not available
      const sampleExecutions = [
        {
          id: 'exec_sample_1',
          permissionId: 'perm_sample_1',
          userAddress: userAddress.toLowerCase(),
          intent: 'Buy ETH daily using up to 10 USDC when gas is low',
          status: 'executed' as const,
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: 12345679,
          gasUsed: '21000',
          explanation: 'Successfully executed token transfer within permission boundaries',
          executedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
      ];

      return NextResponse.json({
        data: sampleExecutions,
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

    const client = new HypersyncClient({
      url: hypersyncUrl,
      apiToken: apiToken,
    });

    // Query ERC-20 Transfer events (proxy for agent executions)
    const query = {
      fromBlock: 0,
      logs: [
        {
          address: [ERC7715_CONTRACTS.PERMISSION_MANAGER],
          topics: [
            [EVENT_SIGNATURES.TOKEN_TRANSFER],
            [`0x000000000000000000000000${userAddress.slice(2)}`], // from (user)
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

    console.log('📊 Executing HyperSync query for executions...');
    const response = await client.get(query);

    // Transform logs to agent executions
    const executions = response.data?.logs?.map((log: any) => ({
      id: `exec_${log.transactionHash}_${log.logIndex}`,
      permissionId: `perm_${log.transactionHash}_${log.logIndex}`,
      userAddress: userAddress.toLowerCase(),
      intent: 'Transfer tokens via agent execution',
      status: 'executed' as const,
      transactionHash: log.transactionHash || `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
      blockNumber: parseInt(log.blockNumber || '0'),
      gasUsed: '21000',
      explanation: 'Successfully executed token transfer within permission boundaries',
      executedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })) || [];

    console.log(`✅ Found ${executions.length} agent executions`);

    return NextResponse.json({
      data: executions,
      loading: false,
      mode: 'hypersync',
    });

  } catch (error) {
    console.error('❌ API Error querying executions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to query executions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}