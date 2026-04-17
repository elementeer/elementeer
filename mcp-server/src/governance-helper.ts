import type { ElementifyClient } from './client.js';
import { GOVERNANCE_LEVELS } from './product-tiers.js';

/**
 * Options for executing a tool with governance enforcement.
 */
export interface GovernanceExecuteOptions {
  /** Tool name (e.g., 'set_global_colors') */
  toolName: string;
  /** Site ID */
  siteId?: string;
  /** Parameters to pass to the tool or queue */
  params: Record<string, unknown>;
  /** Note for queued changes (optional) */
  note?: string;
  /** Write mode - L2 ignores this and always queues */
  writeMode?: 'direct-edit' | 'draft-first' | 'approval-first';
  /** Consent flag required for L3 operations */
  consent?: boolean;
}

/**
 * Result of a tool execution with governance.
 */
export interface GovernanceExecuteResult {
  /** Whether the action was executed or queued */
  status: 'executed' | 'queued' | 'blocked';
  /** Output message */
  message: string;
  /** Result data if executed */
  data?: unknown;
  /** Change ID if queued */
  changeId?: string;
}

/**
 * Execute a tool with governance enforcement.
 * 
 * - L0/L1: Executes directly
 * - L2: Automatically queues for review regardless of write_mode
 * - L3: Requires explicit consent (consent: true) to queue
 * 
 * @param client Elementify client
 * @param executor Function that executes the tool (for L0/L1)
 * @param options Execution options
 * @returns GovernanceExecuteResult
 */
export async function executeWithGovernance(
  client: ElementifyClient,
  executor: (client: ElementifyClient, params: Record<string, unknown>) => Promise<unknown>,
  options: GovernanceExecuteOptions,
): Promise<GovernanceExecuteResult> {
  const { toolName, siteId, params, note, writeMode, consent } = options;
  const level = GOVERNANCE_LEVELS[toolName] || 'L0';

  // L3 requires explicit consent
  if (level === 'L3' && consent !== true) {
    return {
      status: 'blocked',
      message: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
    };
  }

  // L2 always queues regardless of write_mode
  if (level === 'L2' || level === 'L3') {
    try {
      const change = await client.createChange({
        operation: toolName,
        params,
        note: note || `Auto-queued by governance level ${level}`,
      });

      return {
        status: 'queued',
        message: `🟡 Change queued for review (ID: ${change.id}). Use apply_change to execute after approval.`,
        changeId: change.id,
      };
    } catch (error) {
      return {
        status: 'blocked',
        message: `Failed to queue ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // L0/L1: Execute directly
  try {
    const result = await executor(client, params);
    return {
      status: 'executed',
      message: `✅ ${toolName} executed successfully.`,
      data: result,
    };
  } catch (error) {
    return {
      status: 'blocked',
      message: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Helper to create a tool handler with governance enforcement.
 * Use this when registering tools.
 * 
 * Example:
 * ```ts
 * server.tool('set_global_colors', ..., createGovernedHandler(
 *   async (client, params) => client.setGlobalColors(...),
 *   { toolName: 'set_global_colors' }
 * ));
 * ```
 */
export function createGovernedHandler(
  executor: (client: ElementifyClient, params: Record<string, unknown>) => Promise<unknown>,
  toolName: string,
) {
  return async (args: Record<string, unknown> & { site_id?: string; note?: string; consent?: boolean }) => {
    const { site_id, note, consent, ...params } = args;
    // In real usage, we'd get client from context - this is a template
    // Actual implementation would need getClient function
    throw new Error('createGovernedHandler must be integrated with tool registration context');
  };
}