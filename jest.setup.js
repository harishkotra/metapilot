import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS = '11155111';
process.env.GAIA_LLM_ENDPOINT = 'http://localhost:3001';
process.env.ENVIO_GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Mock MetaMask Smart Accounts Kit
jest.mock('@metamask/smart-accounts-kit', () => ({
  SmartAccountsKit: jest.fn(),
  createSmartAccountsKit: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));