/**
 * Network validation service for EIP-7702 and Smart Account compatibility
 */

import { NetworkInfo } from '@/types/wallet';
import { NetworkValidator as INetworkValidator } from './types';
import { NETWORK_CONFIG, SUPPORTED_CHAIN_IDS } from '@/lib/constants';

/**
 * Validates network compatibility for MetaPilot Smart Account operations
 */
export class NetworkValidator implements INetworkValidator {
  private supportedNetworks: Map<string, NetworkInfo>;

  constructor() {
    this.supportedNetworks = new Map();
    this.initializeSupportedNetworks();
  }

  /**
   * Initialize the supported networks configuration
   */
  private initializeSupportedNetworks(): void {
    // Convert NETWORK_CONFIG to NetworkInfo format
    Object.entries(NETWORK_CONFIG).forEach(([chainId, config]) => {
      const networkInfo: NetworkInfo = {
        chainId,
        name: config.name,
        rpcUrl: config.rpcUrl,
        blockExplorer: config.blockExplorer,
        supportsEIP7702: config.isEIP7702Compatible,
        supportsERC7715: config.isEIP7702Compatible, // ERC-7715 requires EIP-7702
      };
      this.supportedNetworks.set(chainId, networkInfo);
    });
  }

  /**
   * Check if a network is supported by MetaPilot
   */
  isNetworkSupported(chainId: string): boolean {
    // Convert hex chainId to decimal if needed
    const numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
    
    // Check if chainId is in our supported list
    if (!SUPPORTED_CHAIN_IDS.includes(numericChainId)) {
      return false;
    }

    // Check if network configuration exists
    const networkInfo = this.supportedNetworks.get(numericChainId.toString());
    if (!networkInfo) {
      return false;
    }

    // Must support both EIP-7702 and ERC-7715
    return networkInfo.supportsEIP7702 && networkInfo.supportsERC7715;
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): NetworkInfo[] {
    return Array.from(this.supportedNetworks.values()).filter(
      network => network.supportsEIP7702 && network.supportsERC7715
    );
  }

  /**
   * Validate Smart Account support on a specific network
   */
  async validateSmartAccountSupport(chainId: string): Promise<boolean> {
    try {
      // Convert hex chainId to decimal if needed
      const numericChainId = chainId.startsWith('0x') 
        ? parseInt(chainId, 16) 
        : parseInt(chainId, 10);
      
      // First check if network is in our supported list
      if (!this.isNetworkSupported(chainId)) {
        return false;
      }

      const networkInfo = this.supportedNetworks.get(numericChainId.toString());
      if (!networkInfo) {
        return false;
      }

      // For now, we rely on our configuration
      // In a production environment, this could make RPC calls to verify
      // EIP-7702 and Smart Account contract deployment status
      return networkInfo.supportsEIP7702 && networkInfo.supportsERC7715;
    } catch (error) {
      console.error('Error validating Smart Account support:', error);
      return false;
    }
  }

  /**
   * Get network information by chain ID
   */
  getNetworkInfo(chainId: string): NetworkInfo | null {
    // Convert hex chainId to decimal if needed
    const numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
    
    return this.supportedNetworks.get(numericChainId.toString()) || null;
  }

  /**
   * Get the default supported network (first in the list)
   */
  getDefaultNetwork(): NetworkInfo | null {
    const supportedNetworks = this.getSupportedNetworks();
    return supportedNetworks.length > 0 ? supportedNetworks[0] : null;
  }

  /**
   * Check if a network supports EIP-7702 specifically
   */
  supportsEIP7702(chainId: string): boolean {
    // Convert hex chainId to decimal if needed
    const numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
    
    const networkInfo = this.supportedNetworks.get(numericChainId.toString());
    return networkInfo?.supportsEIP7702 || false;
  }

  /**
   * Check if a network supports ERC-7715 specifically
   */
  supportsERC7715(chainId: string): boolean {
    // Convert hex chainId to decimal if needed
    const numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
    
    const networkInfo = this.supportedNetworks.get(numericChainId.toString());
    return networkInfo?.supportsERC7715 || false;
  }

  /**
   * Get user-friendly error message for unsupported networks
   */
  getUnsupportedNetworkMessage(chainId: string): string {
    // Convert hex chainId to decimal if needed
    const numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
    
    const networkInfo = this.getNetworkInfo(chainId);
    
    if (!networkInfo) {
      return `Network with chain ID ${chainId} (${numericChainId}) is not supported. Please switch to Base Sepolia for the MetaPilot demo.`;
    }

    if (!networkInfo.supportsEIP7702) {
      return `${networkInfo.name} does not support EIP-7702, which is required for Smart Accounts. Please switch to Base Sepolia.`;
    }

    if (!networkInfo.supportsERC7715) {
      return `${networkInfo.name} does not support ERC-7715 Advanced Permissions. Please switch to Base Sepolia.`;
    }

    return `${networkInfo.name} is not currently supported. Please switch to Base Sepolia for the MetaPilot demo.`;
  }

  /**
   * Get list of supported network names for user guidance
   */
  getSupportedNetworkNames(): string[] {
    return this.getSupportedNetworks().map(network => network.name);
  }
}