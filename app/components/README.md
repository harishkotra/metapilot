# Components Directory

This directory contains all React UI components for MetaPilot.

## Structure

- `wallet/` - Wallet connection and account display components
- `permissions/` - Permission creation and management UI
- `agent/` - Agent execution and monitoring components
- `common/` - Shared UI components (buttons, modals, etc.)

## Guidelines

- All components must be functional components with TypeScript
- Use React hooks for state management
- No direct blockchain calls from components
- All blockchain interactions go through services layer