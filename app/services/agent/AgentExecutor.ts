/**
 * AI Agent Execution Service
 * Handles agent decision-making and execution using Gaia LLM nodes
 */

import { PermissionManager } from '@/services/permissions/PermissionManager';
import { WalletManager } from '@/services/wallet/WalletManager';

export interface AgentIntent {
  description: string;
  tokenAddress: string;
  amount: string;
  contractAddress: string;
  permissionId: string;
  schedule?: AgentSchedule; // Add scheduling information
}

export interface AgentSchedule {
  type: 'once' | 'recurring';
  frequency?: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  interval?: number; // e.g., every 2 hours, every 3 days
  nextExecution?: Date;
  isActive: boolean;
}

export interface AgentDecision {
  shouldExecute: boolean;
  reasoning: string;
  confidence: number;
  riskAssessment: string;
}

export interface AgentExecution {
  id: string;
  intent: AgentIntent;
  decision: AgentDecision;
  status: 'pending' | 'executed' | 'failed' | 'blocked';
  transactionHash?: string;
  timestamp: Date;
  explanation: string;
  gasUsed?: string;
  error?: string;
}

export interface MarketContext {
  gasPrice: string;
  tokenPrice: string;
  networkCongestion: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export class AgentExecutor {
  private permissionManager: PermissionManager;
  private walletManager: WalletManager;
  private gaiaEndpoint: string;
  private gaiaApiKey: string;
  private executions: Map<string, AgentExecution> = new Map();
  private activeSchedules: Map<string, NodeJS.Timeout> = new Map();
  private scheduledIntents: Map<string, AgentIntent> = new Map();

  constructor(
    permissionManager: PermissionManager,
    walletManager: WalletManager,
    gaiaEndpoint?: string,
    gaiaApiKey?: string
  ) {
    this.permissionManager = permissionManager;
    this.walletManager = walletManager;
    this.gaiaEndpoint = gaiaEndpoint || process.env.GAIA_LLM_ENDPOINT || '';
    this.gaiaApiKey = gaiaApiKey || process.env.GAIA_LLM_API_KEY || '';
    
    console.log('🤖 AgentExecutor initialized');
    console.log('🔧 Debug: AgentExecutor available at window.agentExecutor');
    
    this.loadPersistedExecutions();
    // DON'T automatically load and start schedules - they should be manually started
    this.loadPersistedSchedulesWithoutStarting();
    
    // Clean up any schedules with invalid permissions on startup
    this.cleanupInvalidSchedules();
  }

  /**
   * Process a user intent and potentially execute it
   */
  async processIntent(intent: AgentIntent): Promise<AgentExecution> {
    // Validate wallet connection first
    if (!this.walletManager.isConnected()) {
      const execution: AgentExecution = {
        id: this.generateExecutionId(),
        intent,
        decision: { shouldExecute: false, reasoning: 'Wallet not connected', confidence: 0, riskAssessment: 'high' },
        status: 'failed',
        timestamp: new Date(),
        explanation: 'Cannot execute: Wallet not connected. Please connect your wallet first.',
        error: 'Wallet not connected'
      };
      
      this.executions.set(execution.id, execution);
      this.persistExecutions();
      return execution;
    }
    
    const executionId = this.generateExecutionId();
    
    // Parse natural language for scheduling
    const schedule = this.parseScheduleFromDescription(intent.description);
    intent.schedule = schedule;
    
    console.log('🔍 Parsed schedule for:', intent.description);
    console.log('🔍 Schedule type:', schedule.type);
    console.log('🔍 Schedule frequency:', schedule.frequency);
    console.log('🔍 Schedule isActive:', schedule.isActive);
    
    const execution: AgentExecution = {
      id: executionId,
      intent,
      decision: { shouldExecute: false, reasoning: '', confidence: 0, riskAssessment: '' },
      status: 'pending',
      timestamp: new Date(),
      explanation: '',
    };

    try {
      console.log('🤖 Processing agent intent:', intent);
      
      // If this is a recurring intent, set up the schedule
      if (schedule.type === 'recurring' && schedule.frequency) {
        console.log('🔄 Setting up recurring schedule...');
        this.scheduleRecurringIntent(intent);
        execution.explanation = `Scheduled to run ${schedule.frequency}. First execution will be evaluated now.`;
      } else {
        console.log('🔄 Not a recurring schedule, executing once');
      }
      
      // Step 1: Validate permission boundaries
      const isWithinBounds = this.permissionManager.validateAction(
        intent.permissionId,
        intent.tokenAddress,
        intent.amount,
        intent.contractAddress
      );

      console.log('🔍 Permission validation result:', isWithinBounds);

      if (!isWithinBounds) {
        execution.status = 'blocked';
        execution.explanation = 'Action blocked: Exceeds permission boundaries';
        execution.decision.reasoning = 'The requested action would violate one or more permission constraints (spend limit, time window, or contract restrictions)';
        this.executions.set(executionId, execution);
        this.persistExecutions();
        return execution;
      }

      // Step 2: Gather market context
      const marketContext = await this.gatherMarketContext();

      // Step 3: Query Gaia LLM for decision
      const decision = await this.queryGaiaLLM(intent, marketContext);
      execution.decision = decision;

      // Step 4: Execute if approved
      if (decision.shouldExecute) {
        await this.executeTransaction(execution);
      } else {
        execution.status = 'blocked';
        execution.explanation = `Agent declined to execute: ${decision.reasoning}`;
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.explanation = `Execution failed: ${execution.error}`;
    }

    this.executions.set(executionId, execution);
    this.persistExecutions();
    return execution;
  }

  /**
   * Get all executions with optional status filter
   */
  getExecutions(status?: AgentExecution['status']): AgentExecution[] {
    const allExecutions = Array.from(this.executions.values());
    
    if (status) {
      return allExecutions.filter(e => e.status === status);
    }
    
    return allExecutions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get a specific execution by ID
   */
  getExecution(id: string): AgentExecution | null {
    return this.executions.get(id) || null;
  }

  /**
   * Debug method to check current state
   */
  debugState(): void {
    console.log('🔍 AgentExecutor Debug State:');
    console.log('   - Scheduled intents:', this.scheduledIntents.size);
    console.log('   - Active schedules:', this.getActiveSchedules().length);
    console.log('   - Scheduled intent keys:', Array.from(this.scheduledIntents.keys()));
    
    // Also debug the SmartAccountService
    const smartAccountService = this.walletManager.getSmartAccountService();
    if (smartAccountService.isInitialized()) {
      smartAccountService.debugPermissions();
    } else {
      console.log('   - SmartAccountService not initialized');
    }
  }

  /**
   * Get all active schedules (excluding those with revoked permissions)
   */
  getActiveSchedules(): Array<{ id: string; intent: AgentIntent; nextExecution: Date }> {
    console.log('🔍 Getting active schedules...');
    console.log('🔍 scheduledIntents size:', this.scheduledIntents.size);
    console.log('🔍 activeSchedules size:', this.activeSchedules.size);
    
    // Log all scheduled intents for debugging
    Array.from(this.scheduledIntents.entries()).forEach(([id, intent]) => {
      console.log(`🔍 Schedule ${id}: "${intent.description}", frequency: ${intent.schedule?.frequency}, active: ${intent.schedule?.isActive}`);
    });
    
    const schedules = Array.from(this.scheduledIntents.entries())
      .filter(([id, intent]) => {
        // Check if the schedule is active
        if (!intent.schedule?.isActive) {
          console.log(`🔍 Filtering out inactive schedule: ${id}`);
          return false;
        }
        
        // Check if the parent permission is still active
        const permission = this.permissionManager.getPermission(intent.permissionId);
        if (!permission || permission.status !== 'active') {
          console.log(`🔍 Filtering out schedule with inactive permission: ${id} (permission: ${permission?.status || 'not found'})`);
          
          // Auto-stop schedules with revoked/expired permissions
          this.stopSchedule(id);
          return false;
        }
        
        return true;
      })
      .map(([id, intent]) => {
        console.log(`🔍 Including active schedule ${id}: ${intent.description}`);
        return {
          id,
          intent,
          nextExecution: intent.schedule?.nextExecution || new Date(),
        };
      });
    
    console.log('🔍 Returning', schedules.length, 'active schedules');
    return schedules;
  }

  /**
   * Get debug information about schedules
   */
  getScheduleDebugInfo(): {
    totalSchedules: number;
    activeTimeouts: number;
    schedules: Array<{
      id: string;
      description: string;
      frequency: string;
      nextExecution: string;
      timeUntilNext: string;
      isActive: boolean;
    }>;
  } {
    const schedules = Array.from(this.scheduledIntents.entries()).map(([id, intent]) => {
      const nextExecution = intent.schedule?.nextExecution || new Date();
      const timeUntilNext = nextExecution.getTime() - Date.now();
      
      return {
        id,
        description: intent.description,
        frequency: intent.schedule?.frequency || 'unknown',
        nextExecution: nextExecution.toLocaleString(),
        timeUntilNext: timeUntilNext > 0 ? `${Math.round(timeUntilNext / 1000)}s` : 'overdue',
        isActive: intent.schedule?.isActive || false,
      };
    });

    return {
      totalSchedules: this.scheduledIntents.size,
      activeTimeouts: this.activeSchedules.size,
      schedules,
    };
  }

  /**
   * Stop all active schedules (called when wallet disconnects)
   */
  /**
   * Clean up schedules with invalid permissions
   */
  private cleanupInvalidSchedules(): void {
    console.log('🧹 Cleaning up schedules with invalid permissions...');
    
    const schedulesToRemove: string[] = [];
    
    Array.from(this.scheduledIntents.entries()).forEach(([id, intent]) => {
      const permission = this.permissionManager.getPermission(intent.permissionId);
      
      if (!permission || permission.status !== 'active') {
        console.log(`🧹 Marking schedule for removal: ${id} (permission: ${permission?.status || 'not found'})`);
        schedulesToRemove.push(id);
      }
    });
    
    // Remove invalid schedules
    schedulesToRemove.forEach(id => {
      this.stopSchedule(id);
    });
    
    if (schedulesToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${schedulesToRemove.length} invalid schedules`);
    } else {
      console.log('🧹 No invalid schedules found');
    }
  }

  /**
   * Stop all active schedules (called when wallet disconnects)
   */
  stopAllSchedules(): void {
    console.log('🛑 Stopping all active schedules due to wallet disconnect...');
    
    // Clear all active timeouts
    Array.from(this.activeSchedules.entries()).forEach(([scheduleId, timeout]) => {
      clearTimeout(timeout);
      console.log(`🛑 Stopped schedule: ${scheduleId}`);
    });
    
    // Clear all schedules
    this.activeSchedules.clear();
    this.scheduledIntents.clear();
    
    // Clear persisted schedules
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metapilot_schedules');
    }
    
    console.log('✅ All schedules stopped and cleared');
  }

  /**
   * Emergency: Clear all schedules and localStorage (for debugging stuck states)
   */
  emergencyCleanup(): void {
    console.log('🚨 EMERGENCY: Clearing all schedules and storage...');
    
    // Stop all active schedules
    this.stopAllSchedules();
    
    // Clear executions as well
    this.executions.clear();
    
    // Clear ALL localStorage related to agent
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metapilot_schedules');
      localStorage.removeItem('metapilot_executions');
      localStorage.removeItem('metapilot_connection_state');
      console.log('🧹 Cleared all localStorage');
    }
    
    console.log('✅ Emergency cleanup completed');
  }

  /**
   * Test method to create a simple recurring schedule for debugging
   */
  createTestSchedule(): Promise<AgentExecution> {
    // Try to use an existing permission if available
    const existingPermissions = this.permissionManager.getPermissions();
    const activePermission = existingPermissions.find(p => p.status === 'active');
    
    const testIntent: AgentIntent = {
      description: "Test schedule every minute",
      tokenAddress: activePermission?.tokenAddress || "0x0000000000000000000000000000000000000000",
      amount: "0.001", // Small test amount
      contractAddress: activePermission?.allowedContracts[0] || "0x0000000000000000000000000000000000000000",
      permissionId: activePermission?.id || "test_permission",
      schedule: {
        type: 'recurring',
        frequency: 'minutely',
        interval: 1,
        nextExecution: new Date(Date.now() + 60000), // 1 minute from now
        isActive: true,
      }
    };

    console.log('🧪 Creating test schedule for debugging...');
    console.log('🧪 Test intent:', testIntent);
    
    if (!activePermission) {
      console.warn('⚠️ No active permissions found. Test schedule may fail validation.');
    }
    
    return this.processIntent(testIntent);
  }

  /**
   * Stop a scheduled intent
   */
  stopSchedule(intentId: string): boolean {
    console.log(`🛑 Attempting to stop schedule: ${intentId}`);
    
    // Clear any active timeout
    const timeout = this.activeSchedules.get(intentId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeSchedules.delete(intentId);
      console.log(`🛑 Cleared active timeout for schedule: ${intentId}`);
    }
    
    // Remove from scheduled intents (this is the main schedule storage)
    const intent = this.scheduledIntents.get(intentId);
    if (intent) {
      // Mark schedule as inactive
      if (intent.schedule) {
        intent.schedule.isActive = false;
      }
      
      // Remove from scheduled intents
      this.scheduledIntents.delete(intentId);
      this.persistSchedules();
      console.log(`🛑 Stopped and removed schedule: ${intentId}`);
      return true;
    }
    
    console.log(`⚠️ Schedule not found: ${intentId}`);
    return false;
  }

  /**
   * Parse natural language description to detect scheduling frequency
   */
  private parseScheduleFromDescription(description: string): AgentSchedule {
    const lowerDesc = description.toLowerCase();
    
    // Check for minute-based patterns first
    if (lowerDesc.includes('every minute') || lowerDesc.includes('per minute')) {
      return {
        type: 'recurring',
        frequency: 'minutely',
        interval: 1,
        nextExecution: this.calculateNextExecution('minutely', 1),
        isActive: true,
      };
    }
    
    // Check for recurring patterns
    if (lowerDesc.includes('daily') || lowerDesc.includes('every day')) {
      return {
        type: 'recurring',
        frequency: 'daily',
        interval: 1,
        nextExecution: this.calculateNextExecution('daily', 1),
        isActive: true,
      };
    }
    
    if (lowerDesc.includes('weekly') || lowerDesc.includes('every week')) {
      return {
        type: 'recurring',
        frequency: 'weekly',
        interval: 1,
        nextExecution: this.calculateNextExecution('weekly', 1),
        isActive: true,
      };
    }
    
    if (lowerDesc.includes('hourly') || lowerDesc.includes('every hour')) {
      return {
        type: 'recurring',
        frequency: 'hourly',
        interval: 1,
        nextExecution: this.calculateNextExecution('hourly', 1),
        isActive: true,
      };
    }
    
    if (lowerDesc.includes('monthly') || lowerDesc.includes('every month')) {
      return {
        type: 'recurring',
        frequency: 'monthly',
        interval: 1,
        nextExecution: this.calculateNextExecution('monthly', 1),
        isActive: true,
      };
    }
    
    // Check for specific intervals (e.g., "every 2 hours", "every 3 days", "every 5 minutes")
    const intervalMatch = lowerDesc.match(/every (\d+) (minute|hour|day|week|month)s?/);
    if (intervalMatch) {
      const interval = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2];
      let frequency: AgentSchedule['frequency'];
      
      switch (unit) {
        case 'minute':
          frequency = 'minutely';
          break;
        case 'hour':
          frequency = 'hourly';
          break;
        case 'day':
          frequency = 'daily';
          break;
        case 'week':
          frequency = 'weekly';
          break;
        case 'month':
          frequency = 'monthly';
          break;
        default:
          frequency = 'daily';
      }
      
      return {
        type: 'recurring',
        frequency,
        interval,
        nextExecution: this.calculateNextExecution(frequency, interval),
        isActive: true,
      };
    }
    
    // Default to one-time execution
    return {
      type: 'once',
      isActive: false,
    };
  }

  /**
   * Calculate next execution time based on frequency and interval
   */
  private calculateNextExecution(frequency: AgentSchedule['frequency'], interval: number): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'minutely':
        return new Date(now.getTime() + (interval * 60 * 1000));
      case 'hourly':
        return new Date(now.getTime() + (interval * 60 * 60 * 1000));
      case 'daily':
        return new Date(now.getTime() + (interval * 24 * 60 * 60 * 1000));
      case 'weekly':
        return new Date(now.getTime() + (interval * 7 * 24 * 60 * 60 * 1000));
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + interval);
        return nextMonth;
      default:
        return new Date(now.getTime() + (60 * 1000)); // Default to 1 minute
    }
  }

  /**
   * Set up recurring execution for an intent
   */
  private scheduleRecurringIntent(intent: AgentIntent): void {
    if (!intent.schedule || intent.schedule.type !== 'recurring' || !intent.schedule.frequency) {
      console.log('❌ Cannot schedule intent - invalid schedule configuration:', intent.schedule);
      return;
    }

    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store the intent for recurring execution
    this.scheduledIntents.set(scheduleId, intent);
    
    console.log(`⏰ Setting up recurring schedule for: "${intent.description}"`);
    console.log(`⏰ Schedule ID: ${scheduleId}`);
    console.log(`⏰ Frequency: ${intent.schedule.frequency}, Interval: ${intent.schedule.interval}`);
    console.log(`⏰ Next execution: ${intent.schedule.nextExecution?.toLocaleString()}`);
    console.log(`⏰ Total scheduled intents now: ${this.scheduledIntents.size}`);
    
    const executeRecurring = async () => {
      try {
        console.log(`⏰ [${new Date().toLocaleString()}] Executing scheduled intent: ${intent.description}`);
        
        // Execute the intent directly without creating a new schedule
        const execution = await this.executeIntentDirectly(intent);
        
        console.log(`📊 [${new Date().toLocaleString()}] Scheduled execution result: ${execution.status}`);
        
        // Schedule the next execution if still active
        if (intent.schedule && intent.schedule.isActive && intent.schedule.frequency) {
          const nextExecution = this.calculateNextExecution(intent.schedule.frequency, intent.schedule.interval || 1);
          intent.schedule.nextExecution = nextExecution;
          
          const timeUntilNext = nextExecution.getTime() - Date.now();
          
          console.log(`⏰ [${new Date().toLocaleString()}] Scheduling next execution for: ${nextExecution.toLocaleString()}`);
          console.log(`⏰ Time until next execution: ${Math.round(timeUntilNext / 1000)} seconds`);
          
          if (timeUntilNext > 0) {
            const timeout = setTimeout(executeRecurring, timeUntilNext);
            this.activeSchedules.set(scheduleId, timeout);
            this.persistSchedules();
            
            console.log(`⏰ Next execution scheduled successfully`);
          } else {
            console.log(`⚠️ Next execution time is in the past, scheduling immediately`);
            setTimeout(executeRecurring, 1000); // Execute in 1 second
          }
        } else {
          console.log(`🛑 Schedule is no longer active, stopping recurring execution`);
        }
        
      } catch (error) {
        console.error('❌ Scheduled execution failed:', error);
        
        // Still schedule next execution even if this one failed
        if (intent.schedule && intent.schedule.isActive && intent.schedule.frequency) {
          const nextExecution = this.calculateNextExecution(intent.schedule.frequency, intent.schedule.interval || 1);
          intent.schedule.nextExecution = nextExecution;
          
          const timeUntilNext = nextExecution.getTime() - Date.now();
          
          console.log(`⏰ Rescheduling after error for: ${nextExecution.toLocaleString()}`);
          
          if (timeUntilNext > 0) {
            const timeout = setTimeout(executeRecurring, timeUntilNext);
            this.activeSchedules.set(scheduleId, timeout);
            this.persistSchedules();
          }
        }
      }
    };
    
    // Calculate time until first execution
    const timeUntilNext = intent.schedule.nextExecution 
      ? intent.schedule.nextExecution.getTime() - Date.now()
      : 0;
    
    console.log(`⏰ Time until first execution: ${Math.round(timeUntilNext / 1000)} seconds`);
    
    if (timeUntilNext > 0) {
      const timeout = setTimeout(executeRecurring, timeUntilNext);
      this.activeSchedules.set(scheduleId, timeout);
      this.persistSchedules();
      
      console.log(`⏰ Scheduled intent "${intent.description}" to run ${intent.schedule.frequency}`);
      console.log(`⏰ First execution: ${intent.schedule.nextExecution?.toLocaleString()}`);
    } else {
      // Execute immediately if time has passed
      console.log(`⏰ Executing immediately (time has passed)`);
      setTimeout(executeRecurring, 1000); // Small delay to avoid blocking
    }
  }

  /**
   * Execute an intent directly without scheduling logic
   */
  private async executeIntentDirectly(intent: AgentIntent): Promise<AgentExecution> {
    // Validate wallet connection first
    if (!this.walletManager.isConnected()) {
      const execution: AgentExecution = {
        id: this.generateExecutionId(),
        intent,
        decision: { shouldExecute: false, reasoning: 'Wallet not connected', confidence: 0, riskAssessment: 'high' },
        status: 'failed',
        timestamp: new Date(),
        explanation: 'Cannot execute scheduled intent: Wallet not connected.',
        error: 'Wallet not connected'
      };
      
      this.executions.set(execution.id, execution);
      this.persistExecutions();
      return execution;
    }
    
    const executionId = this.generateExecutionId();
    
    const execution: AgentExecution = {
      id: executionId,
      intent,
      decision: { shouldExecute: false, reasoning: '', confidence: 0, riskAssessment: '' },
      status: 'pending',
      timestamp: new Date(),
      explanation: '',
    };

    try {
      console.log('🤖 Executing scheduled intent:', intent.description);
      
      // Step 1: Validate permission boundaries
      const isWithinBounds = this.permissionManager.validateAction(
        intent.permissionId,
        intent.tokenAddress,
        intent.amount,
        intent.contractAddress
      );

      console.log('🔍 Permission validation result:', isWithinBounds);

      if (!isWithinBounds) {
        execution.status = 'blocked';
        execution.explanation = 'Action blocked: Exceeds permission boundaries';
        execution.decision.reasoning = 'The requested action would violate one or more permission constraints (spend limit, time window, or contract restrictions)';
        this.executions.set(executionId, execution);
        this.persistExecutions();
        return execution;
      }

      // Step 2: Gather market context
      const marketContext = await this.gatherMarketContext();

      // Step 3: Query Gaia LLM for decision
      const decision = await this.queryGaiaLLM(intent, marketContext);
      execution.decision = decision;

      // Step 4: Execute if approved
      if (decision.shouldExecute) {
        await this.executeTransaction(execution);
      } else {
        execution.status = 'blocked';
        execution.explanation = `Agent declined to execute: ${decision.reasoning}`;
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.explanation = `Execution failed: ${execution.error}`;
    }

    this.executions.set(executionId, execution);
    this.persistExecutions();
    return execution;
  }

  /**
   * Private: Query Gaia LLM for decision making
   */
  private async queryGaiaLLM(intent: AgentIntent, context: MarketContext): Promise<AgentDecision> {
    if (!this.gaiaEndpoint || !this.gaiaApiKey) {
      // Fallback to rule-based decision for demo
      return this.fallbackDecisionMaking(intent, context);
    }

    try {
      const permission = this.permissionManager.getPermission(intent.permissionId);
      const spendTracking = this.permissionManager.getSpendTracking(intent.permissionId);

      const systemPrompt = `You are an AI agent managing cryptocurrency transactions within strict permission boundaries.

PERMISSION CONSTRAINTS:
- Token: ${permission?.tokenAddress}
- Max Spend: ${permission?.maxSpendAmount}
- Remaining: ${spendTracking?.remainingAllowance || '0'}
- Time Window: ${permission?.startTime} to ${permission?.endTime}
- Allowed Contracts: ${permission?.allowedContracts.join(', ')}

CURRENT CONTEXT:
- Gas Price: ${context.gasPrice} gwei
- Token Price: $${context.tokenPrice}
- Network Congestion: ${context.networkCongestion}

You must NEVER exceed permission boundaries. Respond with JSON only:
{
  "shouldExecute": boolean,
  "reasoning": "clear explanation of decision",
  "confidence": number (0-100),
  "riskAssessment": "low|medium|high with explanation"
}`;

      const userPrompt = `Should I execute this transaction?
Intent: ${intent.description}
Amount: ${intent.amount} tokens
Contract: ${intent.contractAddress}`;

      const response = await fetch(`${this.gaiaEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.gaiaApiKey}`,
        },
        body: JSON.stringify({
          model: 'gaia-agent',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gaia LLM request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from Gaia LLM');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Gaia LLM query failed:', error);
      // Fallback to rule-based decision
      return this.fallbackDecisionMaking(intent, context);
    }
  }

  /**
   * Private: Fallback rule-based decision making
   */
  private fallbackDecisionMaking(intent: AgentIntent, context: MarketContext): AgentDecision {
    // Simple rule-based logic for demo
    const gasPrice = parseFloat(context.gasPrice);
    const amount = parseFloat(intent.amount);

    let shouldExecute = true;
    let reasoning = 'Conditions are favorable for execution';
    let confidence = 80;
    let riskAssessment = 'low';

    // Check gas price
    if (gasPrice > 50) {
      shouldExecute = false;
      reasoning = 'Gas price too high for efficient execution';
      confidence = 90;
      riskAssessment = 'high - expensive gas fees';
    }

    // Check amount size
    if (amount > 100) {
      confidence = Math.max(confidence - 20, 50);
      riskAssessment = 'medium - large transaction amount';
    }

    // Check network congestion
    if (context.networkCongestion === 'high') {
      shouldExecute = false;
      reasoning = 'Network congestion too high, transaction may fail or be expensive';
      confidence = 85;
      riskAssessment = 'high - network congestion';
    }

    return {
      shouldExecute,
      reasoning,
      confidence,
      riskAssessment,
    };
  }

  /**
   * Private: Execute the actual transaction using Smart Account (gasless)
   */
  private async executeTransaction(execution: AgentExecution): Promise<void> {
    try {
      console.log('🚀 Executing gasless transaction via Smart Account...');
      console.log('🔍 Looking for permission:', execution.intent.permissionId);
      
      // Get the permission to find the Smart Account permission ID
      const permission = this.permissionManager.getPermission(execution.intent.permissionId);
      if (!permission) {
        console.error('❌ Permission not found in PermissionManager:', execution.intent.permissionId);
        console.log('📊 Available permissions in PermissionManager:', this.permissionManager.getPermissions().map(p => p.id));
        throw new Error(`Permission not found: ${execution.intent.permissionId}`);
      }

      console.log('✅ Found permission in PermissionManager:', {
        id: permission.id,
        smartAccountPermissionId: permission.smartAccountPermissionId,
        status: permission.status,
      });

      // Get the Smart Account service from wallet manager
      const smartAccountService = this.walletManager.getSmartAccountService();
      
      if (!smartAccountService.isInitialized()) {
        throw new Error('Smart Account not initialized');
      }

      // Debug: Check what permissions are available
      smartAccountService.debugPermissions();

      // CRITICAL: Use the original permission ID, not the smartAccountPermissionId
      // The SmartAccountService should have stored the permission with the same ID
      const smartAccountPermissionId = permission.smartAccountPermissionId || permission.id;
      
      console.log('🔍 Looking for Smart Account permission with ID:', smartAccountPermissionId);
      console.log('📊 Available permissions in SmartAccountService:', smartAccountService.getPermissions().map(p => p.id));

      // Verify the permission exists in Smart Account service
      let actualSmartAccountPermission = smartAccountService.getPermission(smartAccountPermissionId);
      let actualPermissionId = smartAccountPermissionId;
      
      if (!actualSmartAccountPermission) {
        console.error('❌ Permission not found in SmartAccountService:', smartAccountPermissionId);
        console.log('🔄 Attempting to find by original permission ID:', permission.id);
        
        // Try to find by original permission ID as fallback
        actualSmartAccountPermission = smartAccountService.getPermission(permission.id);
        if (actualSmartAccountPermission) {
          console.log('✅ Found permission using original ID:', permission.id);
          actualPermissionId = permission.id;
        } else {
          console.error('❌ Permission not found with either ID');
          console.log('📊 Available SmartAccount permissions:', smartAccountService.getPermissions().map(p => ({ id: p.id, spender: p.spender })));
          throw new Error(`Smart Account permission not found: ${smartAccountPermissionId}`);
        }
      }

      console.log('✅ Found Smart Account permission:', {
        id: actualSmartAccountPermission.id,
        spender: actualSmartAccountPermission.spender,
        token: actualSmartAccountPermission.token,
      });

      // Create transaction service with Smart Account
      const { createTransactionService } = await import('@/services/blockchain/TransactionService');
      const transactionService = createTransactionService(smartAccountService);
      
      // Use the permission ID that actually exists in SmartAccountService
      
      // Create a gasless ETH transfer transaction using the Smart Account permission ID
      const txRequest = transactionService.createETHTransfer(
        execution.intent.contractAddress,
        "0.001", // Small amount for demo (0.001 ETH)
        actualPermissionId // Use the actual permission ID that exists
      );
      
      console.log('📋 Transaction request:', txRequest);
      
      const result = await transactionService.executeTransaction(txRequest);
      
      execution.transactionHash = result.hash;
      execution.status = 'executed';
      execution.gasUsed = result.gasUsed || '0';
      execution.explanation = `Successfully executed gasless transaction: ${execution.decision.reasoning}`;

      console.log(`✅ Gasless transaction executed: ${result.hash}`);
      console.log(`🔗 View on BaseScan: https://sepolia-explorer.base.org/tx/${result.hash}`);
      console.log(`⛽ Gas used: ${result.gasUsed} (gasless: ${result.isGasless})`);

      // Record the spend
      this.permissionManager.recordSpend(
        execution.intent.permissionId,
        execution.intent.amount,
        result.hash
      );

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Transaction failed';
      execution.explanation = `Gasless transaction failed: ${execution.error}`;
      console.error('❌ Gasless transaction failed:', error);
      throw error;
    }
  }

  /**
   * Private: Gather current market context
   */
  private async gatherMarketContext(): Promise<MarketContext> {
    // In a real implementation, this would fetch from price APIs, gas trackers, etc.
    return {
      gasPrice: (20 + Math.random() * 80).toFixed(1), // 20-100 gwei
      tokenPrice: (1800 + Math.random() * 400).toFixed(2), // $1800-2200
      networkCongestion: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      timestamp: new Date(),
    };
  }

  /**
   * Private: Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Private: Load executions from localStorage
   */
  private loadPersistedExecutions(): void {
    try {
      const stored = localStorage.getItem('metapilot_executions');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, execData] of Object.entries(data as Record<string, any>)) {
          const execution: AgentExecution = {
            ...execData,
            timestamp: new Date(execData.timestamp),
          };
          this.executions.set(id, execution);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted executions:', error);
    }
  }

  /**
   * Private: Persist executions to localStorage
   */
  private persistExecutions(): void {
    try {
      const data = Object.fromEntries(this.executions);
      localStorage.setItem('metapilot_executions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist executions:', error);
    }
  }

  /**
   * Private: Load schedules from localStorage WITHOUT starting them
   */
  private loadPersistedSchedulesWithoutStarting(): void {
    try {
      const stored = localStorage.getItem('metapilot_schedules');
      if (stored) {
        const data = JSON.parse(stored);
        console.log(`📋 Loading ${Object.keys(data).length} persisted schedules (without starting)...`);
        
        for (const [id, intentData] of Object.entries(data as Record<string, any>)) {
          const intent: AgentIntent = {
            ...intentData,
            schedule: {
              ...intentData.schedule,
              nextExecution: new Date(intentData.schedule?.nextExecution),
            },
          };
          
          // Load the schedule data but don't start it
          this.scheduledIntents.set(id, intent);
          console.log(`📋 Loaded schedule: "${intent.description}" (${intent.schedule?.isActive ? 'active' : 'inactive'})`);
        }
        console.log(`📋 Loaded ${this.scheduledIntents.size} schedules (not started)`);
      } else {
        console.log(`📋 No persisted schedules found`);
      }
    } catch (error) {
      console.error('Failed to load persisted schedules:', error);
    }
  }

  /**
   * Private: Load schedules from localStorage
   */
  private loadPersistedSchedules(): void {
    try {
      const stored = localStorage.getItem('metapilot_schedules');
      if (stored) {
        const data = JSON.parse(stored);
        console.log(`🔄 Loading ${Object.keys(data).length} persisted schedules...`);
        
        for (const [id, intentData] of Object.entries(data as Record<string, any>)) {
          const intent: AgentIntent = {
            ...intentData,
            schedule: {
              ...intentData.schedule,
              nextExecution: new Date(intentData.schedule?.nextExecution),
            },
          };
          
          // Only restore active schedules
          if (intent.schedule?.isActive) {
            console.log(`🔄 Restoring schedule: "${intent.description}" (${intent.schedule.frequency})`);
            this.scheduledIntents.set(id, intent);
            
            // Restart the schedule - but don't create duplicate schedules
            // Clear any existing timeout first
            const existingTimeout = this.activeSchedules.get(id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            
            // Restart the schedule
            this.scheduleRecurringIntent(intent);
          } else {
            console.log(`⏸️ Skipping inactive schedule: "${intent.description}"`);
          }
        }
        console.log(`🔄 Restored ${this.scheduledIntents.size} active schedules`);
      } else {
        console.log(`🔄 No persisted schedules found`);
      }
    } catch (error) {
      console.error('Failed to load persisted schedules:', error);
    }
  }

  /**
   * Private: Persist schedules to localStorage
   */
  private persistSchedules(): void {
    try {
      const data = Object.fromEntries(this.scheduledIntents);
      localStorage.setItem('metapilot_schedules', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist schedules:', error);
    }
  }
}