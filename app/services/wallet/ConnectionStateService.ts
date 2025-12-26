/**
 * Connection state persistence and management service
 */

import { ConnectionState, StateChangeCallback } from '@/types/wallet';
import { ConnectionStateService as IConnectionStateService } from './types';

/**
 * Manages connection state persistence and synchronization
 */
export class ConnectionStateService implements IConnectionStateService {
  private static readonly STORAGE_KEY = 'metapilot_connection_state';
  private static readonly STORAGE_VERSION = '1.0';
  
  private subscribers: Set<StateChangeCallback> = new Set();
  private currentState: ConnectionState | null = null;

  constructor() {
    // Initialize with default state
    this.currentState = this.getDefaultState();
    
    // Listen for storage changes from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  /**
   * Get the default connection state
   */
  private getDefaultState(): ConnectionState {
    return {
      isConnected: false,
      smartAccount: null,
      network: null,
      lastConnected: null,
      autoReconnect: false,
      sessionId: null,
    };
  }

  /**
   * Save connection state to secure local storage
   */
  saveConnectionState(state: ConnectionState): void {
    try {
      const stateToSave = {
        ...state,
        version: ConnectionStateService.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          ConnectionStateService.STORAGE_KEY,
          JSON.stringify(stateToSave)
        );
      }

      this.currentState = state;
      this.notifySubscribers(state);
    } catch (error) {
      // Don't throw - gracefully degrade to in-memory state
    }
  }

  /**
   * Load connection state from storage
   */
  loadConnectionState(): ConnectionState | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const stored = localStorage.getItem(ConnectionStateService.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      
      // Validate version compatibility
      if (parsed.version !== ConnectionStateService.STORAGE_VERSION) {
        console.warn('Connection state version mismatch, clearing stored state');
        this.clearConnectionState();
        return null;
      }

      // Validate required fields
      if (!this.isValidConnectionState(parsed)) {
        console.warn('Invalid connection state format, clearing stored state');
        this.clearConnectionState();
        return null;
      }

      // Convert date strings back to Date objects
      const state: ConnectionState = {
        isConnected: parsed.isConnected,
        smartAccount: parsed.smartAccount,
        network: parsed.network,
        lastConnected: parsed.lastConnected ? new Date(parsed.lastConnected) : null,
        autoReconnect: parsed.autoReconnect,
        sessionId: parsed.sessionId,
      };

      this.currentState = state;
      return state;
    } catch (error) {
      console.error('Failed to load connection state:', error);
      this.clearConnectionState();
      return null;
    }
  }

  /**
   * Clear all stored connection data
   */
  clearConnectionState(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ConnectionStateService.STORAGE_KEY);
      }

      const defaultState = this.getDefaultState();
      this.currentState = defaultState;
      this.notifySubscribers(defaultState);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Subscribe to connection state changes
   */
  subscribeToStateChanges(callback: StateChangeCallback): void {
    this.subscribers.add(callback);

    // Immediately notify with current state if available
    if (this.currentState) {
      callback(this.currentState);
    }
  }

  /**
   * Unsubscribe from connection state changes
   */
  unsubscribeFromStateChanges(callback: StateChangeCallback): void {
    this.subscribers.delete(callback);
  }

  /**
   * Get current connection state
   */
  getCurrentState(): ConnectionState | null {
    return this.currentState;
  }

  /**
   * Update specific fields in the connection state
   */
  updateConnectionState(updates: Partial<ConnectionState>): void {
    if (!this.currentState) {
      this.currentState = this.getDefaultState();
    }

    const newState: ConnectionState = {
      ...this.currentState,
      ...updates,
    };

    this.saveConnectionState(newState);
  }

  /**
   * Check if connection state is expired (for auto-reconnect logic)
   */
  isConnectionExpired(): boolean {
    if (!this.currentState?.lastConnected) {
      return true;
    }

    // Consider connection expired after 24 hours
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date().getTime();
    const lastConnected = this.currentState.lastConnected.getTime();

    return (now - lastConnected) > expirationTime;
  }

  /**
   * Validate connection state structure
   */
  private isValidConnectionState(state: any): boolean {
    return (
      typeof state === 'object' &&
      typeof state.isConnected === 'boolean' &&
      typeof state.autoReconnect === 'boolean' &&
      (state.smartAccount === null || typeof state.smartAccount === 'object') &&
      (state.network === null || typeof state.network === 'object') &&
      (state.sessionId === null || typeof state.sessionId === 'string')
    );
  }

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === ConnectionStateService.STORAGE_KEY) {
      const newState = this.loadConnectionState();
      if (newState) {
        this.notifySubscribers(newState);
      }
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(state: ConnectionState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        // Ignore callback errors
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
    this.subscribers.clear();
  }
}