import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, CapabilityId, CapabilityMatrix } from './client.js';
import { 
  getCapabilityRequirement, 
  checkOperationAllowed,
} from './capability-registry.js';

type GovernanceLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface CapabilityContext {
  /** Available capabilities for the current site */
  availableCapabilities: Set<CapabilityId>;
  /** Current governance level */
  governanceLevel: GovernanceLevel;
  /** Site ID for logging */
  siteId?: string;
  /** User role/context */
  userRole?: string;
}

/**
 * Build capability context from site assessment and fingerprint
 */
export async function buildCapabilityContext(
  client: ElementifyClient,
  siteId?: string
): Promise<CapabilityContext> {
  try {
    // Get site assessment to determine capabilities
    const assessment = await client.assessSite();
    
    // Build fingerprint from assessment
    const { buildSiteFingerprint } = await import('./fingerprint.js');
    const fingerprint = buildSiteFingerprint(assessment);
    
    // Build capability matrix
    const { buildCapabilityMatrix } = await import('./destination.js');
    const capabilityMatrix: CapabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
    
    // Convert to Set for efficient lookup
    const availableCapabilities = new Set<CapabilityId>(
      capabilityMatrix.capabilities
        .filter(cap => cap.available)
        .map(cap => cap.id)
    );
    
    // Determine governance level based on product tier
    // For now, default to L2 for Advanced, L1 for Free
    // This should be enhanced with actual user/role detection
    const governanceLevel: GovernanceLevel = 'L2'; // Default to L2 for safety
    
    return {
      availableCapabilities,
      governanceLevel,
      siteId,
      userRole: 'operator', // Default role
    };
  } catch (error) {
    // If we can't determine capabilities, default to most restrictive
    console.warn(`Failed to build capability context: ${error}`);
    return {
      availableCapabilities: new Set(), // No capabilities
      governanceLevel: 'L1', // Most restrictive
      siteId,
      userRole: 'unknown',
    };
  }
}

/**
 * Create capability-checking wrapper for tool handlers
 */
export function withCapabilityCheck<
  Args extends Record<string, unknown>,
  Result
>(
  operation: string,
  handler: (args: Args, client: ElementifyClient, siteId?: string) => Promise<Result>
): (args: Args & { site_id?: string }) => Promise<Result> {
  return async (args) => {
    const { site_id, ...restArgs } = args;
    const client = await import('./config.js').then(m => m.getClient(site_id));
    
    // Build capability context
    const context = await buildCapabilityContext(client, site_id);
    
    // Check if operation is allowed
    const requirement = getCapabilityRequirement(operation);
    if (!requirement) {
      throw new Error(`Capability requirement not found for operation: ${operation}`);
    }
    
    const { allowed, reason } = checkOperationAllowed(
      operation,
      context.availableCapabilities,
      context.governanceLevel
    );
    
    if (!allowed) {
      throw new Error(`Operation not allowed: ${reason}`);
    }
    
    // Log capability check (for auditing)
    console.log(`[Capability] ${operation} allowed for site ${site_id || 'default'}`);
    
    // Execute original handler
    return handler(restArgs as Args, client, site_id);
  };
}

/**
 * Enhanced tool registration with capability checking
 */
export function registerToolWithCapability<
  Args extends Record<string, unknown>
>(
  server: McpServer,
  name: string,
  description: string,
  schema: any,
  handler: (args: Args & { site_id?: string }) => Promise<any>,
  options?: {
    /** Override default capability requirement */
    requiredCapability?: CapabilityId;
    /** Override default risk level */
    riskLevel?: 'low' | 'medium' | 'high';
    /** Override default governance level */
    minGovernanceLevel?: GovernanceLevel;
  }
): void {
  // Get or override capability requirement
  let requirement = getCapabilityRequirement(name);
  if (options) {
    requirement = {
      operation: name,
      requiredCapability: options.requiredCapability || requirement?.requiredCapability || 'global-styles',
      riskLevel: options.riskLevel || requirement?.riskLevel || 'medium',
      minGovernanceLevel: options.minGovernanceLevel || requirement?.minGovernanceLevel,
      requiresWrite: requirement?.requiresWrite || true,
      description: requirement?.description || description,
    };
  }
  
  if (!requirement) {
    throw new Error(`No capability requirement defined for tool: ${name}`);
  }
  
  // Wrap handler with capability check
  const wrappedHandler = withCapabilityCheck(name, async (args: Args, client, siteId) => {
    return handler({ ...args, site_id: siteId } as Args & { site_id?: string });
  });
  
  // Register tool with MCP server
  server.tool(name, description, schema, wrappedHandler);
}

/**
 * Middleware to add capability context to all tool calls
 */
export function createCapabilityMiddleware() {
  return async (context: any, next: () => Promise<any>) => {
    // Extract operation name from context
    const operation = context.operation;
    
    if (operation) {
      // Add capability check here if needed
      // For now, just pass through
      console.log(`[Capability Middleware] Operation: ${operation}`);
    }
    
    return next();
  };
}

/**
 * Utility to check if a capability is available
 */
export function hasCapability(
  context: CapabilityContext,
  capabilityId: CapabilityId
): boolean {
  return context.availableCapabilities.has(capabilityId);
}

/**
 * Get all available capabilities as human-readable list
 */
export function getAvailableCapabilitiesList(context: CapabilityContext): string[] {
  return Array.from(context.availableCapabilities).sort();
}

/**
 * Generate capability report for debugging
 */
export function generateCapabilityReport(context: CapabilityContext): string {
  const capabilities = getAvailableCapabilitiesList(context);
  return `
Capability Report:
-----------------
Site: ${context.siteId || 'unknown'}
Governance Level: ${context.governanceLevel}
User Role: ${context.userRole || 'unknown'}
Available Capabilities (${capabilities.length}):
${capabilities.map(cap => `  • ${cap}`).join('\n')}
  `.trim();
}