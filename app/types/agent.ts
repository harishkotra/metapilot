/**
 * AI Agent and execution type definitions
 */

export interface AgentExecution {
  id: string;
  timestamp: Date;
  userIntent: string;
  permissionId: string;
  actionType: AgentActionType;
  status: ExecutionStatus;
  transactionHash?: string;
  gasUsed?: number;
  explanation: string;
  reasoning: string;
  marketContext?: MarketContext;
}

export type AgentActionType = 'swap' | 'transfer' | 'approve' | 'stake' | 'unstake';
export type ExecutionStatus = 'pending' | 'success' | 'failed' | 'blocked';

export interface MarketContext {
  tokenPrices: Record<string, string>;
  gasPrice: string;
  blockNumber: number;
  timestamp: Date;
}

export interface GaiaLLMRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GaiaLLMResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}