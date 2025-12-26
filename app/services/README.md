# Services Directory

This directory contains all external service integrations for MetaPilot.

## Structure

- `wallet/` - MetaMask Smart Account integration
- `permissions/` - ERC-7715 permission management
- `agent/` - AI agent execution logic
- `envio/` - GraphQL indexing queries

## Guidelines

- All blockchain interactions must go through this layer
- Services must handle errors gracefully
- Comprehensive logging for all operations
- No UI logic in services