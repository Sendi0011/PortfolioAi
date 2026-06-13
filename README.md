# PortfolioAI

**Autonomous DeFi Portfolio Management with AI Agents**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-blue?logo=nextjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue?logo=tailwindcss)](https://tailwindcss.com)
[![MetaMask](https://img.shields.io/badge/MetaMask-Smart_Accounts-orange?logo=metamask)](https://metamask.io)

> **Real-world autonomous DeFi portfolio manager powered by AI agents, real market data, and gasless execution**

## Overview

PortfolioAI is a production-ready autonomous DeFi portfolio management application that combines AI-driven decision making with cutting-edge blockchain technology. The system uses a multi-agent architecture where specialized AI agents coordinate to analyze markets, make rebalancing decisions, and execute transactions autonomously.

### Key Features

- **🤖 Multi-Agent Architecture** - Specialized AI agents for Oracle, Strategy, and Execution
- **🧠 Venice AI Integration** - Advanced market analysis and decision-making
- **💰 Real Market Data** - Live price feeds from CoinGecko API
- **⛓️ On-Chain Integration** - Real blockchain balance queries using Viem
- **🚀 Smart Account Management** - MetaMask Smart Accounts Kit (EIP-7702)
- **⚡ Gasless Transactions** - 1Shot Relayer with USDC gas payments
- **💎 Premium Research** - x402 paywall for enhanced market insights
- **🎭 Agent Debates** - Bull vs Bear AI debates for uncertain decisions
- **📊 Real-time Monitoring** - Live portfolio tracking and agent activity feeds

### Agent Pipeline

```
OracleAgent → StrategyAgent → ExecutorAgent
     ↓             ↓             ↓
Market Data   AI Decision   On-Chain Execution
```

1. **OracleAgent**: Fetches live market data and generates AI-powered market analysis
2. **StrategyAgent**: Makes rebalancing decisions using Venice AI, triggers debates on uncertainty
3. **ExecutorAgent**: Autonomously purchases research and executes trades via gasless relayer

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MetaMask** browser extension
- **Venice AI API Key** from [venice.ai](https://venice.ai)
- **Base Sepolia ETH** for initial wallet setup

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/portfolioai.git
cd portfolioai

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys and configuration
```

### Environment Configuration

Create your `.env.local` file with the following variables:

```env
# AI & API Configuration
VENICE_API_KEY=your_venice_api_key_here
VENICE_TEXT_MODEL=zai-org-glm-5.1
VENICE_IMAGE_MODEL=nano-banana-pro

# Blockchain Configuration  
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Feature Flags
NEXT_PUBLIC_USE_MOCK_PRICE_FEED=false  # Set to true for development
NEXT_PUBLIC_USE_MOCK_RELAYER=false     # Set to true when 1Shot unavailable

# Premium Research (Optional)
RESEARCH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b8D73a5e7d6c9ca1e7

# Webhook Configuration (Development)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
WEBHOOK_SECRET=your_webhook_secret
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Production Deployment

```bash
npm run build
npm start
```

## Architecture

### Core Technologies

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Blockchain**: Viem for Ethereum interactions, MetaMask Smart Accounts Kit
- **AI/ML**: Venice AI for market analysis and decision-making  
- **Data Sources**: CoinGecko API for real-time market data
- **Infrastructure**: 1Shot Relayer for gasless transaction execution

### System Components

#### 1. Agent Coordination Layer
```typescript
// Multi-agent pipeline with autonomous coordination
const pipeline = [
  { agent: 'oracle', role: 'data_collection' },
  { agent: 'strategy', role: 'decision_making' },  
  { agent: 'executor', role: 'transaction_execution' }
]
```

#### 2. Smart Account Management (EIP-7702)
```typescript
// Upgrade EOA to Smart Account with enhanced capabilities
const smartAccount = await upgradeToSmartAccount(userAddress)
await grantRebalancePermission(smartAccount, maxAmount)
```

#### 3. Real-time Market Data Integration
```typescript
// Live price feeds from multiple sources
const prices = await fetchRealPrices(['ethereum', 'bitcoin', 'usd-coin'])
const balances = await queryOnChainBalances(smartAccount, tokens)
```

#### 4. AI-Powered Decision Making
```typescript
// Venice AI analysis and reasoning
const analysis = await veniceChat(marketAnalysisPrompt, currentMarketData)
const decision = await generateRebalanceStrategy(analysis, portfolio)
```

#### 5. Premium Research System (x402 Protocol)
```typescript
// Paywall-gated premium content
const research = await purchaseResearch(token, paymentSignature)
const enhancedDecision = await incorporateResearch(decision, research)
```

### Data Flow Architecture

```
External APIs → Oracle Agent → Strategy Agent → Executor Agent → Blockchain
     ↓              ↓             ↓              ↓           ↓
CoinGecko API → Market Data → AI Analysis → Transaction → On-Chain Execution
     ↑              ↑             ↑              ↑           ↑
Venice AI ← Real-time UI ← State Store ← Agent Events ← Transaction Status
```

## Features

### 🤖 Autonomous Agent System
- **Multi-Agent Coordination**: Specialized agents for data collection, strategy, and execution
- **Agent-to-Agent Transactions**: Autonomous research purchases between AI agents  
- **Real-time Decision Making**: Continuous market monitoring and portfolio optimization
- **Debate System**: Bull vs Bear AI debates triggered on uncertain decisions

### 🧠 Advanced AI Integration
- **Venice AI Analysis**: Comprehensive market analysis and sentiment evaluation
- **Dynamic Strategy Selection**: Choose between Conservative, Aggressive, or Balanced AI personalities
- **Research-Informed Decisions**: Premium market research integration for enhanced trading
- **Visual AI**: AI-generated portfolio charts and data visualizations

### ⚡ Cutting-Edge Blockchain Tech
- **Smart Account Upgrade**: MetaMask Smart Accounts Kit with EIP-7702 support
- **Gasless Transactions**: 1Shot Relayer with USDC gas payments
- **Real On-Chain Data**: Live blockchain balance queries using Viem
- **Permission Management**: ERC-7715 permission system for autonomous operations

### 💰 Real Market Integration
- **Live Price Feeds**: Real-time market data from CoinGecko API
- **On-Chain Balance Queries**: Direct blockchain balance verification
- **Premium Research**: x402 paywall system for enhanced market insights  
- **Fallback Systems**: Mock data fallbacks for development stability

### 📊 Professional UI/UX
- **Real-time Activity Feeds**: Live agent events and transaction status
- **Interactive Dashboards**: Portfolio visualization and performance tracking
- **Research Purchase Flow**: Seamless premium content acquisition
- **Transaction Monitoring**: Real-time execution status and confirmations

## 🛠️ Development

### Project Structure

```
├── app/
│   ├── api/agent/          # Agent pipeline endpoints
│   │   ├── oracle/         # Market data + Venice analysis
│   │   ├── strategy/       # Rebalance decision logic  
│   │   ├── execute/        # 1Shot transaction execution
│   │   └── run/            # Orchestrate full pipeline
│   ├── dashboard/          # Main portfolio UI
│   └── page.tsx            # Landing/connection page
├── lib/
│   ├── metamask.ts         # Smart Accounts Kit integration
│   ├── venice.ts           # Venice AI client
│   ├── oneshot.ts          # 1Shot Relayer client
│   └── store.ts            # In-memory state management
└── components/             # React UI components
```

## API Reference

### Agent Endpoints

#### Oracle Agent
```typescript
GET /api/agent/oracle
// Returns: Market data, AI analysis, and price information
{
  prices: { ETH: 3200, USDC: 1.0, BTC: 45000 },
  analysis: "Market showing bullish momentum...",
  dataSource: "real CoinGecko" | "mock x402"
}
```

#### Strategy Agent  
```typescript
POST /api/agent/strategy
// Body: { prices, balances, targets }
// Returns: Rebalancing decision with AI reasoning
{
  action: "BUY" | "SELL" | "HOLD",
  confidence: 85,
  reasoning: "Venice AI market analysis...",
  debate?: { bull: "...", bear: "...", verdict: "..." }
}
```

#### Executor Agent
```typescript
POST /api/agent/execute  
// Body: { action, amount, token }
// Returns: Transaction execution status
{
  status: "success" | "pending" | "failed",
  txHash?: "0x...",
  relayerStatus: "completed" | "processing"
}
```

#### Agent Pipeline
```typescript
POST /api/agent/run
// Executes full 3-agent pipeline
// Returns: Complete pipeline execution results
```

### Data & State Management

#### Application State
```typescript
GET/POST /api/state
// Manages global application state including agent status
```

#### Premium Research
```typescript
GET /api/research?token=ETH
// Returns: HTTP 402 challenge or premium research content
// Headers: x-payment for EIP-712 signature verification
```

### Webhook Integration

#### 1Shot Relayer Webhooks
```typescript
POST /api/webhook/1shot
// Receives real-time transaction status updates
// Body: { status, txHash, gasUsed, relayerId }
```

### Testing

```bash
# Type checking
npm run typecheck

# Linting  
npm run lint

# Build
npm run build
```


## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | ✅ | Venice AI API key |
| `NEXT_PUBLIC_CHAIN_ID` | ✅ | Network ID (84532 = Base Sepolia) |
| `NEXT_PUBLIC_RPC_URL` | ✅ | Base Sepolia RPC endpoint |
| `NEXT_PUBLIC_USDC_ADDRESS` | ✅ | USDC token contract address |
| `WEBHOOK_BASE_URL` | ⚠️ | Ngrok URL for webhook testing |
| `WEBHOOK_SECRET` | ⚠️ | HMAC secret for webhook security |
| `NEXT_PUBLIC_USE_MOCK_PRICE_FEED` | 🔧 | Enable mock data for development |

### Network Configuration

**Base Sepolia Testnet**:
- Chain ID: `84532`
- RPC: `https://sepolia.base.org`  
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Block Explorer: [https://sepolia.basescan.org](https://sepolia.basescan.org)



## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for the DeFi hackathon. Showcasing the future of autonomous portfolio management.*
```bash
npm run build
npm start
```

## Architecture

### Core Technologies

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Blockchain**: Viem for Ethereum interactions, MetaMask Smart Accounts Kit
- **AI/ML**: Venice AI for market analysis and decision-making  
- **Data Sources**: CoinGecko API for real-time market data
- **Infrastructure**: 1Shot Relayer for gasless transaction execution

### System Components

#### 1. Agent Coordination Layer
```typescript
// Multi-agent pipeline with autonomous coordination
const pipeline = [
  { agent: 'oracle', role: 'data_collection' },
  { agent: 'strategy', role: 'decision_making' },  
  { agent: 'executor', role: 'transaction_execution' }
]
```

#### 2. Smart Account Management (EIP-7702)
```typescript
// Upgrade EOA to Smart Account with enhanced capabilities
const smartAccount = await upgradeToSmartAccount(userAddress)
await grantRebalancePermission(smartAccount, maxAmount)
```

#### 3. Real-time Market Data Integration
```typescript
// Live price feeds from multiple sources
const prices = await fetchRealPrices(['ethereum', 'bitcoin', 'usd-coin'])
const balances = await queryOnChainBalances(smartAccount, tokens)
```

#### 4. AI-Powered Decision Making
```typescript
// Venice AI analysis and reasoning
const analysis = await veniceChat(marketAnalysisPrompt, currentMarketData)
const decision = await generateRebalanceStrategy(analysis, portfolio)
```

#### 5. Premium Research System (x402 Protocol)
```typescript
// Paywall-gated premium content
const research = await purchaseResearch(token, paymentSignature)
const enhancedDecision = await incorporateResearch(decision, research)
```

### Data Flow Architecture

```
External APIs → Oracle Agent → Strategy Agent → Executor Agent → Blockchain
     ↓              ↓             ↓              ↓           ↓
CoinGecko API → Market Data → AI Analysis → Transaction → On-Chain Execution
     ↑              ↑             ↑              ↑           ↑
Venice AI ← Real-time UI ← State Store ← Agent Events ← Transaction Status
```

## Features

### 🤖 Autonomous Agent System
- **Multi-Agent Coordination**: Specialized agents for data collection, strategy, and execution
- **Agent-to-Agent Transactions**: Autonomous research purchases between AI agents  
- **Real-time Decision Making**: Continuous market monitoring and portfolio optimization
- **Debate System**: Bull vs Bear AI debates triggered on uncertain decisions

### 🧠 Advanced AI Integration
- **Venice AI Analysis**: Comprehensive market analysis and sentiment evaluation
- **Dynamic Strategy Selection**: Choose between Conservative, Aggressive, or Balanced AI personalities
- **Research-Informed Decisions**: Premium market research integration for enhanced trading
- **Visual AI**: AI-generated portfolio charts and data visualizations

### ⚡ Cutting-Edge Blockchain Tech
- **Smart Account Upgrade**: MetaMask Smart Accounts Kit with EIP-7702 support
- **Gasless Transactions**: 1Shot Relayer with USDC gas payments
- **Real On-Chain Data**: Live blockchain balance queries using Viem
- **Permission Management**: ERC-7715 permission system for autonomous operations

### 💰 Real Market Integration
- **Live Price Feeds**: Real-time market data from CoinGecko API
- **On-Chain Balance Queries**: Direct blockchain balance verification
- **Premium Research**: x402 paywall system for enhanced market insights  
- **Fallback Systems**: Mock data fallbacks for development stability

### 📊 Professional UI/UX
- **Real-time Activity Feeds**: Live agent events and transaction status
- **Interactive Dashboards**: Portfolio visualization and performance tracking
- **Research Purchase Flow**: Seamless premium content acquisition
- **Transaction Monitoring**: Real-time execution status and confirmations

## API Reference

### Agent Endpoints

#### Oracle Agent
```typescript
GET /api/agent/oracle
// Returns: Market data, AI analysis, and price information
{
  prices: { ETH: 3200, USDC: 1.0, BTC: 45000 },
  analysis: "Market showing bullish momentum...",
  dataSource: "real CoinGecko" | "mock x402"
}
```

#### Strategy Agent  
```typescript
POST /api/agent/strategy
// Body: { prices, balances, targets }
// Returns: Rebalancing decision with AI reasoning
{
  action: "BUY" | "SELL" | "HOLD",
  confidence: 85,
  reasoning: "Venice AI market analysis...",
  debate?: { bull: "...", bear: "...", verdict: "..." }
}
```

#### Executor Agent
```typescript
POST /api/agent/execute  
// Body: { action, amount, token }
// Returns: Transaction execution status
{
  status: "success" | "pending" | "failed",
  txHash?: "0x...",
  relayerStatus: "completed" | "processing"
}
```

#### Agent Pipeline
```typescript
POST /api/agent/run
// Executes full 3-agent pipeline
// Returns: Complete pipeline execution results
```

### Data & State Management

#### Application State
```typescript
GET/POST /api/state
// Manages global application state including agent status
```

#### Premium Research
```typescript
GET /api/research?token=ETH
// Returns: HTTP 402 challenge or premium research content
// Headers: x-payment for EIP-712 signature verification
```

### Webhook Integration

#### 1Shot Relayer Webhooks
```typescript
POST /api/webhook/1shot
// Receives real-time transaction status updates
// Body: { status, txHash, gasUsed, relayerId }
```

## Development

### Project Structure

```
portfolioai/
├── app/                          # Next.js App Router
│   ├── api/agent/               # Agent pipeline endpoints
│   │   ├── oracle/              # Market data + Venice AI analysis  
│   │   ├── strategy/            # Rebalancing decision logic
│   │   ├── execute/             # Transaction execution via 1Shot
│   │   ├── debate/              # Bull vs Bear AI debates
│   │   ├── transfer/            # Token transfer operations
│   │   └── run/                 # Full pipeline orchestration
│   ├── api/research/            # Premium research endpoints
│   ├── api/state/               # Application state management
│   ├── api/webhook/             # External webhook handlers
│   ├── chat/                    # AI chat interface
│   ├── dashboard/               # Main portfolio dashboard  
│   ├── research/                # Research access page
│   └── globals.css              # Global styles and animations
├── components/                   # React components
│   ├── AgentActivityFeed.tsx    # Real-time agent events
│   ├── AgentChat.tsx           # AI chat interface
│   ├── DebateCard.tsx          # Bull vs Bear debates
│   ├── PortfolioPieChart.tsx   # Venice AI charts
│   ├── ResearchPaywall.tsx     # x402 payment flow
│   ├── StrategyMarketplace.tsx # Agent selection
│   ├── TransferCard.tsx        # Token transfers
│   └── TxStatusBadge.tsx       # Transaction status
├── lib/                         # Core business logic
│   ├── metamask.ts             # Smart Accounts Kit integration
│   ├── venice.ts               # Venice AI client & prompts
│   ├── oneshot.ts              # 1Shot Relayer client
│   ├── x402.ts                 # Premium research payments
│   └── store.ts                # In-memory state management
└── public/                      # Static assets
```

### Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js | 14.2 | React-based web framework |
| **Language** | TypeScript | 5.7 | Type-safe development |
| **Styling** | Tailwind CSS | 3.4 | Utility-first CSS framework |
| **Blockchain** | Viem | 2.21 | Ethereum client library |
| **Smart Accounts** | MetaMask Kit | 0.3 | EIP-7702 implementation |
| **AI** | Venice AI | - | Market analysis & reasoning |
| **HTTP Client** | Axios | 1.7 | API requests |
| **Real-time** | EventSource | 3.0 | Server-sent events |

### Development Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting and code style
npm run lint

# Production build
npm run build

# Production server
npm start
```

### Testing & Debugging

#### Local Testing with Mock Data
```env
NEXT_PUBLIC_USE_MOCK_PRICE_FEED=true
NEXT_PUBLIC_USE_MOCK_RELAYER=true
```

#### Production Testing with Real Data  
```env
NEXT_PUBLIC_USE_MOCK_PRICE_FEED=false
NEXT_PUBLIC_USE_MOCK_RELAYER=false
```

#### Webhook Testing with Ngrok
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Add ngrok URL to .env.local
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VENICE_API_KEY` | ✅ | Venice AI API key | - |
| `VENICE_TEXT_MODEL` | ⚠️ | Venice text model | `zai-org-glm-5.1` |
| `VENICE_IMAGE_MODEL` | ⚠️ | Venice image model | `nano-banana-pro` |
| `NEXT_PUBLIC_CHAIN_ID` | ✅ | Network ID (84532 = Base Sepolia) | - |
| `NEXT_PUBLIC_RPC_URL` | ✅ | Base Sepolia RPC endpoint | - |
| `NEXT_PUBLIC_USDC_ADDRESS` | ✅ | USDC token contract address | - |
| `NEXT_PUBLIC_USE_MOCK_PRICE_FEED` | 🔧 | Enable mock price data | `false` |
| `NEXT_PUBLIC_USE_MOCK_RELAYER` | 🔧 | Enable mock relayer | `false` |
| `RESEARCH_WALLET_ADDRESS` | ⚠️ | Research payment recipient | - |
| `WEBHOOK_BASE_URL` | ⚠️ | Ngrok URL for webhook testing | - |
| `WEBHOOK_SECRET` | ⚠️ | HMAC secret for webhook security | - |

**Legend**: ✅ Required | ⚠️ Optional | 🔧 Development

### Network Configuration

**Base Sepolia Testnet**:
- Chain ID: `84532`
- RPC: `https://sepolia.base.org`  
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Block Explorer: [basescan.org](https://sepolia.basescan.org)

### Smart Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| USDC Token | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Gas payments & transfers |
| WETH | `0x4200000000000000000000000000000000000006` | Wrapped ETH |

## Deployment

### Production Environment

1. **Vercel** (Recommended)
```bash
npm install -g vercel
vercel --prod
```

2. **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

3. **Manual Deployment**
```bash
npm run build
npm start
```

### Environment Setup for Production

Ensure all required environment variables are set in your deployment platform:

- Venice AI API key with sufficient credits
- Valid Base Sepolia RPC endpoint  
- Webhook URL (if using transaction status updates)
- Research wallet address (if using premium features)

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Test locally with both mock and real data modes
5. Submit a pull request

### Code Standards

- **TypeScript**: Use strict typing, avoid `any`
- **Components**: Use functional components with hooks
- **Styling**: Tailwind CSS with semantic class names
- **API Routes**: RESTful design with proper error handling
- **Commits**: Follow conventional commit format

### Testing Guidelines

- Test with mock data for stability
- Test with real data for production readiness
- Verify agent coordination works end-to-end
- Check webhook integration with ngrok

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the code comments and API reference
- **Issues**: Open GitHub issues for bugs and feature requests
- **Discord**: Join our development community (link coming soon)

---

**Built for the future of autonomous finance** 🚀

*PortfolioAI demonstrates the potential of AI agents in DeFi, combining real market data, advanced AI reasoning, and cutting-edge blockchain technology to create a truly autonomous portfolio management system.*