/**
 * Zod validation schemas for MetaPilot
 */

import { z } from 'zod';
import { PERMISSION_LIMITS } from './constants';

// Ethereum address validation
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// Permission request validation
export const permissionRequestSchema = z.object({
  tokenAddress: ethereumAddressSchema,
  maxSpendAmount: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num >= parseFloat(PERMISSION_LIMITS.MIN_SPEND_AMOUNT) && 
               num <= parseFloat(PERMISSION_LIMITS.MAX_SPEND_AMOUNT);
      },
      `Spend amount must be between ${PERMISSION_LIMITS.MIN_SPEND_AMOUNT} and ${PERMISSION_LIMITS.MAX_SPEND_AMOUNT} ETH`
    ),
  startTime: z.date(),
  endTime: z.date(),
  allowedContracts: z
    .array(ethereumAddressSchema)
    .min(1, 'At least one contract address is required')
    .max(PERMISSION_LIMITS.MAX_ALLOWED_CONTRACTS, `Maximum ${PERMISSION_LIMITS.MAX_ALLOWED_CONTRACTS} contracts allowed`),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    const durationHours = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60);
    return durationHours >= PERMISSION_LIMITS.MIN_DURATION_HOURS;
  },
  {
    message: `Permission duration must be at least ${PERMISSION_LIMITS.MIN_DURATION_HOURS} hour(s)`,
    path: ['endTime'],
  }
).refine(
  (data) => {
    const durationDays = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60 * 24);
    return durationDays <= PERMISSION_LIMITS.MAX_DURATION_DAYS;
  },
  {
    message: `Permission duration cannot exceed ${PERMISSION_LIMITS.MAX_DURATION_DAYS} days`,
    path: ['endTime'],
  }
);

// Agent execution validation
export const agentExecutionSchema = z.object({
  userIntent: z.string().min(1, 'User intent is required'),
  permissionId: z.string().min(1, 'Permission ID is required'),
  actionType: z.enum(['swap', 'transfer', 'approve', 'stake', 'unstake']),
});

// Gaia LLM request validation
export const gaiaLLMRequestSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1, 'Message content is required'),
  })).min(1, 'At least one message is required'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
});

// Network validation
export const networkSchema = z.object({
  chainId: z.number().positive(),
  name: z.string().min(1),
  isSupported: z.boolean(),
  isEIP7702Compatible: z.boolean(),
});

// Validation helper functions
export function validateEthereumAddress(address: string): boolean {
  return ethereumAddressSchema.safeParse(address).success;
}

export function validatePermissionRequest(request: unknown): boolean {
  return permissionRequestSchema.safeParse(request).success;
}

export function validateAgentExecution(execution: unknown): boolean {
  return agentExecutionSchema.safeParse(execution).success;
}