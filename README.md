# MetaPilot

**AI-Powered Wallet Automation Studio for MetaMask Smart Accounts**

MetaPilot is a cutting-edge decentralized application that enables users to grant fine-grained, revocable permissions to AI agents for executing on-chain transactions. Built on the principles of user custody and control, MetaPilot eliminates confirmation fatigue while maintaining the highest security standards through ERC-7715 Advanced Permissions.

## 🎯 Core Value Proposition

- **Eliminate Confirmation Fatigue**: Replace repetitive wallet popups with one-time permission grants
- **Maintain Full Custody**: Users never give up control of their assets
- **Transparent Automation**: Every AI decision is explainable and auditable
- **Risk Management**: Least-privilege permissions with automatic expiration

### Screenshots

<img width="3808" height="2396" alt="screencapture-localhost-3000-2025-12-27-01_29_33" src="https://github.com/user-attachments/assets/57126571-7315-4252-9daf-61a95315f411" />
<img width="3808" height="2672" alt="screencapture-localhost-3000-dashboard-2025-12-27-01_28_34" src="https://github.com/user-attachments/assets/5994adc4-3d82-44c6-9bd4-940c6324b7e8" />
<img width="3808" height="2396" alt="screencapture-localhost-3000-dashboard-2025-12-27-01_28_28" src="https://github.com/user-attachments/assets/020293bd-8ee9-4c83-ad43-f5f20d64534e" />
<img width="3808" height="2396" alt="screencapture-localhost-3000-dashboard-2025-12-27-01_28_21" src="https://github.com/user-attachments/assets/e59888ce-f9dd-412d-b980-53ba6a3a0c1f" />
<img width="3808" height="2488" alt="screencapture-localhost-3000-dashboard-2025-12-27-01_28_15" src="https://github.com/user-attachments/assets/1c9b6d24-d70a-4cfb-8042-3d12cee1ff7a" />

## 🏗️ Architecture Overview

### Frontend Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19+ with functional components and hooks
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context + useReducer for complex state

### Blockchain Integration
- **Wallet**: MetaMask Smart Accounts Kit
- **Permissions**: ERC-7715 Advanced Permissions standard
- **Networks**: EIP-7702 compatible chains (Base Sepolia)
- **Transaction Execution**: Gasless transactions via Smart Accounts

### AI Integration
- **Provider**: Gaia nodes with OpenAI-compatible Chat Completions API
- **Reasoning**: Structured prompts with permission context
- **Explanations**: Human-readable decision explanations
- **Fallback**: Graceful degradation when AI is unavailable

### Data & Indexing
- **Indexer**: Envio HyperSync for blockchain data
- **Usage**: Real-time GraphQL queries for transaction monitoring
- **Caching**: Optimized data fetching with rate limiting
- **Analytics**: Comprehensive spending and usage analytics

## 🔧 Key Integrations

### 1. MetaMask Smart Accounts Kit
- **Purpose**: Gasless transaction execution with ERC-7715 permissions
- **Implementation**: `@metamask/smart-accounts-kit`
- **Features**:
  - Smart Account creation and management
  - EIP-7702 network compatibility validation
  - Gasless transaction bundling
  - Permission-based execution

### 2. ERC-7715 Advanced Permissions
- **Purpose**: Fine-grained, time-bound permission management
- **Implementation**: Custom SmartAccountService with ERC-7715 compliance
- **Features**:
  - Token-specific spending limits
  - Time-window restrictions
  - Contract interaction boundaries
  - Automatic expiration handling

### 3. Envio HyperSync
- **Purpose**: Real-time blockchain data indexing and monitoring
- **Implementation**: Direct HyperSync client integration
- **API Endpoint**: `https://base-sepolia.hypersync.xyz`
- **Features**:
  - Permission grant indexing
  - Transaction execution monitoring
  - Real-time network status
  - Historical data analysis

### 4. Gaia LLM Integration
- **Purpose**: AI-powered transaction decision making
- **Implementation**: OpenAI-compatible Chat Completions API
- **Features**:
  - Natural language intent parsing
  - Market context analysis
  - Risk assessment and reasoning
  - Explainable AI decisions

### 5. Base Sepolia Network
- **Purpose**: EIP-7702 compatible testnet for Smart Account operations
- **RPC Endpoint**: `https://sepolia.base.org`
- **Features**:
  - Smart Account deployment
  - Gasless transaction execution
  - Real-time blockchain monitoring
  - BaseScan integration for transaction tracking

## 🚀 Features

### Permission Management
- **Visual Permission Composer**: Intuitive UI for creating ERC-7715 permissions
- **Time-bound Permissions**: Automatic expiration with configurable durations
- **Spending Limits**: Token-specific amount restrictions
- **Contract Restrictions**: Whitelist of allowed interaction contracts
- **Real-time Monitoring**: Live permission status and usage tracking

### AI Agent Automation
- **Natural Language Interface**: Plain English transaction commands
- **Intelligent Scheduling**: "Daily", "weekly", "every minute" parsing
- **Market Context Awareness**: Gas price and network congestion analysis
- **Risk Assessment**: Automated safety checks before execution
- **Explainable Decisions**: Human-readable reasoning for every action

### Trust Dashboard
- **Execution History**: Complete log of all agent transactions
- **Permission Overview**: Active permissions with usage statistics
- **Schedule Management**: View and control recurring automations
- **Real-time Monitoring**: Live updates of agent activities
- **Emergency Controls**: Instant permission revocation and schedule stopping

### Blockchain Data Visualization
- **Real-time Indexing**: Live blockchain data via Envio HyperSync
- **Transaction Monitoring**: Detailed execution logs and status
- **Network Analytics**: Gas prices, block times, and congestion metrics
- **Permission Tracking**: On-chain permission grant and revocation events
- **Spending Analytics**: Comprehensive usage and cost analysis

## 🛠️ Technology Stack

### Core Dependencies
```json
{
  "@metamask/smart-accounts-kit": "Latest",
  "@envio-dev/hypersync-client": "Latest", 
  "next": "16.1.1",
  "react": "19+",
  "typescript": "Latest",
  "tailwindcss": "Latest",
  "viem": "Latest",
  "ethers": "Latest"
}
```

### Development Tools
- **TypeScript**: Strict mode with comprehensive type safety
- **ESLint**: Code quality and consistency enforcement
- **Jest**: Unit and integration testing framework
- **Tailwind CSS**: Utility-first styling framework

## 📁 Project Structure

```
metapilot/
├── app/                          # Next.js App Router
│   ├── components/              # React UI components
│   │   ├── wallet/             # Wallet connection components
│   │   ├── permissions/        # Permission management UI
│   │   ├── agent/              # AI agent interface
│   │   ├── dashboard/          # Trust dashboard components
│   │   └── envio/              # Blockchain data visualization
│   ├── services/               # Business logic layer
│   │   ├── wallet/            # MetaMask Smart Account integration
│   │   ├── permissions/       # ERC-7715 permission management
│   │   ├── agent/             # AI agent execution logic
│   │   ├── envio/             # Blockchain data indexing
│   │   └── blockchain/        # Direct blockchain interactions
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   ├── lib/                    # Shared utilities
│   ├── api/                    # Next.js API routes
│   ├── dashboard/              # Main dashboard page
│   └── globals.css            # Global styles
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## 🔐 Security Architecture

### Permission Security Model
- **Least-Privilege Principle**: Users grant only minimum necessary permissions
- **Fail-Safe Defaults**: System blocks execution when in doubt
- **Comprehensive Validation**: Every action validated against ERC-7715 constraints
- **Audit Trail**: Immutable logging of all permission operations
- **Real-time Monitoring**: Continuous permission status validation

### AI Decision Boundaries
- **Permission Constraints**: AI operates strictly within granted boundaries
- **No Escalation**: Agents cannot expand their own permissions
- **Explainable Reasoning**: All decisions must be auditable
- **Fallback Mechanisms**: Manual execution when AI is uncertain

### Data Security
- **No Private Keys**: Never stored or transmitted
- **Encrypted Storage**: Permission data encrypted at rest
- **Secure Communication**: HTTPS-only API interactions
- **Privacy Protection**: Minimal data collection with user consent

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MetaMask browser extension
- Base Sepolia testnet access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/metapilot.git
   cd metapilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   # Required for blockchain integration
   NEXT_PUBLIC_SUPPORTED_CHAIN_IDS=84532  # Base Sepolia
   
   # Required for AI agent execution (optional)
   GAIA_LLM_ENDPOINT=https://your-gaia-node.com/v1
   GAIA_LLM_API_KEY=your-api-key
   
   # Required for blockchain data indexing
   ENVIO_API_TOKEN=your-envio-api-token
   ```

4. **Start the development server**
   ```bash
   npm run dev -- --webpack
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### MetaMask Setup
1. Install MetaMask browser extension
2. Add Base Sepolia network:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia-explorer.base.org

## 📖 Usage Guide

### 1. Connect Your Wallet
- Click "Connect Wallet" on the landing page
- Approve the MetaMask connection
- Ensure you're on Base Sepolia network

### 2. Create Agent Permissions
- Navigate to the "Permissions" tab
- Fill in token address, spending limit, and time window
- Specify allowed contracts for interaction
- Click "Create Permission" and approve in MetaMask

### 3. Give Agent Commands
- Switch to "Agent Commands" tab
- Enter natural language instructions (e.g., "Buy ETH daily using up to 10 USDC")
- The AI will parse your intent and create scheduled executions
- Monitor progress in real-time

### 4. Monitor Activities
- Use the "Trust Dashboard" to view all agent activities
- See execution history, active schedules, and permission usage
- Stop or modify schedules as needed
- Revoke permissions instantly if required

### 5. View Blockchain Data
- Check the "Blockchain Data" tab for real-time indexing
- Monitor network status, gas prices, and transaction history
- Analyze spending patterns and usage statistics

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run type-check       # TypeScript compilation check
npm run lint             # ESLint code quality check

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Production
npm run build            # Build for production
npm start                # Start production server
```

## 🤝 Contributing

We welcome contributions to MetaPilot! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript strict mode** - no `any` types allowed
3. **Write comprehensive tests** for new functionality
4. **Ensure all tests pass** before submitting
5. **Follow the existing code style** and architecture patterns
6. **Update documentation** for any new features

### Code Standards
- Use functional React components with hooks
- Implement proper error handling and user feedback
- Follow the separation of concerns architecture
- Add comprehensive JSDoc comments for public APIs
- Ensure all blockchain interactions go through service layers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MetaMask Team** for Smart Accounts Kit and EIP-7702 support
- **Envio** for HyperSync blockchain indexing infrastructure
- **Base** for EIP-7702 compatible testnet infrastructure
- **Ethereum Foundation** for ERC-7715 Advanced Permissions standard
- **Gaia** for decentralized AI infrastructure

## 📞 Support

For questions, issues, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/your-username/metapilot/issues)
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join our discussions in GitHub Discussions

---

**MetaPilot** - Empowering users with AI-driven wallet automation while maintaining full custody and control.
