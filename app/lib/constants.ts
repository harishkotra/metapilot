/**
 * Application constants for MetaPilot
 */

// Supported blockchain networks (EIP-7702 compatible)
// Currently focused on Base Sepolia for initial demo
export const SUPPORTED_CHAIN_IDS = process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS
  ?.split(',')
  .map(id => parseInt(id.trim(), 10)) || [84532]; // Default to Base Sepolia only

// Network configurations - Base Sepolia as primary demo network
export const NETWORK_CONFIG = {
  84532: {
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia-explorer.base.org',
    isEIP7702Compatible: true,
  },
} as const;

// Permission validation constants
export const PERMISSION_LIMITS = {
  MIN_SPEND_AMOUNT: '0.001', // Minimum spend amount in ETH
  MAX_SPEND_AMOUNT: '1000', // Maximum spend amount in ETH
  MIN_DURATION_HOURS: 1, // Minimum permission duration
  MAX_DURATION_DAYS: 365, // Maximum permission duration
  MAX_ALLOWED_CONTRACTS: 10, // Maximum number of allowed contracts
} as const;

// Agent execution constants
export const AGENT_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  EXECUTION_TIMEOUT_MS: 30000,
  MAX_GAS_PRICE_GWEI: 100,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  GAIA_LLM: process.env.GAIA_LLM_ENDPOINT || 'http://localhost:3001',
  ENVIO_GRAPHQL: process.env.ENVIO_GRAPHQL_ENDPOINT || '', // Empty means use mock service
} as const;

// UI constants
export const UI_CONFIG = {
  TOAST_DURATION_MS: 5000,
  POLLING_INTERVAL_MS: 5000,
  DEBOUNCE_DELAY_MS: 300,
} as const;