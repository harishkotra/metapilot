# Envio Integration

This directory contains the complete Envio blockchain indexing integration for MetaPilot.

## What is Envio?

Envio is a real-time blockchain indexing service that monitors and indexes on-chain events. For MetaPilot, it provides:

- **Real-time Data**: Live indexing of ERC-7715 permission grants and revocations
- **Transaction Tracking**: Complete audit trail of all agent executions
- **Spend Monitoring**: Accurate tracking of token spend amounts and remaining allowances
- **Analytics**: Historical data for performance analysis and optimization

## Architecture

### Services

1. **EnvioService.ts** - Real GraphQL client using Apollo Client
2. **MockEnvioService.ts** - Development mock service with sample data
3. **index.ts** - Unified service with automatic fallback to mock data
4. **EnvioSyncService.ts** - Data synchronization between local and indexed data

### Components

1. **EnvioDataViewer.tsx** - Comprehensive blockchain data visualization
2. **useEnvio.ts** - React hook for accessing Envio data

## Configuration

### Environment Variables

```bash
# Required for real Envio integration
ENVIO_GRAPHQL_ENDPOINT=https://your-envio-indexer.com/graphql

# Leave empty to use mock service for development
ENVIO_GRAPHQL_ENDPOINT=
```

### GraphQL Schema

The Envio indexer expects the following GraphQL schema:

```graphql
type PermissionGrant {
  id: String!
  userAddress: String!
  tokenAddress: String!
  maxSpendAmount: String!
  startTime: String!
  endTime: String!
  allowedContracts: [String!]!
  transactionHash: String!
  blockNumber: Int!
  timestamp: String!
}

type AgentExecution {
  id: String!
  userAddress: String!
  permissionId: String!
  actionType: String!
  tokenAddress: String!
  amount: String!
  transactionHash: String!
  gasUsed: Int!
  blockNumber: Int!
  timestamp: String!
  status: String!
}

type SpendEntry {
  id: String!
  permissionId: String!
  amount: String!
  transactionHash: String!
  blockNumber: Int!
  timestamp: String!
  remainingAllowance: String!
}
```

## Usage

### Basic Usage

```typescript
import { envioService } from '@/services/envio';

// Query permissions for a user
const permissions = await envioService.queryPermissionGrants(userAddress);

// Query agent executions
const executions = await envioService.queryAgentExecutions(userAddress);

// Query spend entries for a permission
const spendEntries = await envioService.querySpendEntries(permissionId);
```

### React Hook Usage

```typescript
import { useEnvio } from '@/hooks/useEnvio';

function MyComponent() {
  const { 
    data, 
    loading, 
    error, 
    mode, 
    refetch 
  } = useEnvio(userAddress);

  return (
    <div>
      <p>Mode: {mode}</p>
      <p>Permissions: {data.permissions.length}</p>
      <p>Executions: {data.executions.length}</p>
    </div>
  );
}
```

### Data Synchronization

```typescript
import { envioSyncService } from '@/services/envio/EnvioSyncService';

// Initialize with services
envioSyncService.setServices(permissionManager, agentExecutor);

// Manual sync
const status = await envioSyncService.syncWithEnvio(userAddress);

// Auto-sync every 30 seconds
const stopAutoSync = envioSyncService.startAutoSync(userAddress, 30000);
```

## Features

### Automatic Fallback

The service automatically falls back to mock data when:
- `ENVIO_GRAPHQL_ENDPOINT` is not configured
- The Envio service is unavailable
- GraphQL queries fail

### Real-time Updates

- WebSocket subscriptions for live data updates (when available)
- Polling fallback for real-time updates
- Automatic cache invalidation and refresh

### Data Consistency

- Automatic synchronization between local and indexed data
- Validation of data consistency
- Error reporting for sync issues

### Analytics

- Spending analytics across all permissions
- Execution success rates and performance metrics
- Historical trend analysis
- Gas usage optimization insights

## Development

### Mock Data

The mock service provides realistic sample data for development:

```typescript
// Add mock permission
envioService.addMockPermission({
  id: 'perm_1',
  userAddress: '0x...',
  tokenAddress: '0x...',
  maxSpendAmount: '1000',
  // ... other fields
});
```

### Testing

```bash
# Run tests
npm test

# Test with real Envio endpoint
ENVIO_GRAPHQL_ENDPOINT=https://test-indexer.com/graphql npm test
```

## Production Deployment

### Envio Indexer Setup

1. Deploy Envio indexer for Base Sepolia network
2. Configure indexing for ERC-7715 events
3. Set up GraphQL endpoint with proper CORS
4. Configure authentication if required

### Environment Configuration

```bash
# Production
ENVIO_GRAPHQL_ENDPOINT=https://prod-indexer.com/graphql

# Staging
ENVIO_GRAPHQL_ENDPOINT=https://staging-indexer.com/graphql
```

### Monitoring

- Monitor indexer health and sync status
- Set up alerts for indexing delays
- Track query performance and error rates
- Monitor data consistency between local and indexed data

## Troubleshooting

### Common Issues

1. **"Envio service not available"**
   - Check `ENVIO_GRAPHQL_ENDPOINT` configuration
   - Verify indexer is running and accessible
   - Check network connectivity

2. **"GraphQL query failed"**
   - Verify GraphQL schema matches expected format
   - Check authentication and CORS settings
   - Review indexer logs for errors

3. **"Data sync failed"**
   - Check local service initialization
   - Verify user address format
   - Review sync service logs

### Debug Mode

Enable debug logging:

```typescript
// Enable debug mode
localStorage.setItem('envio_debug', 'true');

// Check sync status
console.log(envioSyncService.getSyncStatus());
```

## Security Considerations

- All GraphQL queries are read-only
- No sensitive data is transmitted to Envio
- User addresses are the only identifying information
- All transaction data is already public on blockchain

## Performance

- Queries are cached using Apollo Client
- Automatic batching of multiple requests
- Efficient pagination for large datasets
- Background sync to minimize UI blocking