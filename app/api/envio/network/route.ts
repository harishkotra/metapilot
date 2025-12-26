/**
 * API Route: /api/envio/network
 * Server-side Envio HyperSync integration for network status
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
 * GET /api/envio/network
 * Get Base Sepolia network status via HyperSync
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Querying network status');

    // Check if HyperSync is available
    if (!HypersyncClient) {
      console.log('📋 HyperSync not available - returning default values');
      
      return NextResponse.json({
        data: {
          blockNumber: Math.floor(Date.now() / 1000), // Use timestamp as fallback
          gasPrice: '1000000000', // 1 gwei
          chainId: 84532, // Base Sepolia
        },
        loading: false,
        mode: 'fallback',
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

    // Query latest block using HyperSync
    const query = {
      fromBlock: 'latest' as any,
      toBlock: 'latest' as any,
      fieldSelection: {
        block: ['number', 'timestamp', 'gasLimit', 'gasUsed'],
      },
    };

    console.log('📊 Executing HyperSync query for network status...');
    const response = await client.get(query);
    const latestBlock = response.data?.blocks?.[0];

    const networkStatus = {
      blockNumber: parseInt(String(latestBlock?.number || '0')),
      gasPrice: '1000000000', // 1 gwei default
      chainId: 84532, // Base Sepolia
    };

    console.log('✅ Network status retrieved:', networkStatus);

    return NextResponse.json({
      data: networkStatus,
      loading: false,
      mode: 'hypersync',
    });

  } catch (error) {
    console.error('❌ API Error querying network status:', error);
    
    // Return fallback values on error
    return NextResponse.json({
      data: {
        blockNumber: Math.floor(Date.now() / 1000),
        gasPrice: '1000000000',
        chainId: 84532,
      },
      loading: false,
      mode: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}