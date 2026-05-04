import type { ElementifyClient } from './client.js';
import type { EnvironmentType, EnvironmentConfig } from './environment-config.js';
import { getEnvironmentByType } from './environment-config.js';

export interface EnvironmentContext {
  currentEnvironment: EnvironmentType;
  availableEnvironments: EnvironmentConfig[];
  userId?: string;
  sessionId?: string;
}

export interface EnvironmentData {
  environmentId: string;
  entityType: string;
  entityId: number;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Environment-aware client that wraps the base ElementifyClient
 * with environment-specific behavior
 */
export class EnvironmentClient {
  private baseClient: ElementifyClient;
  private context: EnvironmentContext;
  
  constructor(
    baseClient: ElementifyClient,
    initialEnvironment: EnvironmentType = 'production'
  ) {
    this.baseClient = baseClient;
    this.context = {
      currentEnvironment: initialEnvironment,
      availableEnvironments: [
        getEnvironmentByType('draft')!,
        getEnvironmentByType('staging')!,
        getEnvironmentByType('production')!,
      ],
    };
  }
  
  /**
   * Get current environment context
   */
  getContext(): EnvironmentContext {
    return { ...this.context };
  }

  /**
   * Get current environment type
   */
  getCurrentEnvironment(): EnvironmentType {
    return this.context.currentEnvironment;
  }

  /**
   * Check if promotion is allowed between environments
   */
  canPromote(source: EnvironmentType, target: EnvironmentType): boolean {
    // Valid promotion paths:
    // draft -> staging
    // staging -> production
    const validPaths = [
      ['draft', 'staging'],
      ['staging', 'production'],
    ];
    
    return validPaths.some(([s, t]) => s === source && t === target);
  }

  /**
   * Promote changes between environments
   */
  async promoteTo(
    targetEnvironment: EnvironmentType,
    options?: {
      autoApprove?: boolean;
      note?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const sourceEnvironment = this.context.currentEnvironment;
    
    if (!this.canPromote(sourceEnvironment, targetEnvironment)) {
      return {
        success: false,
        message: `Cannot promote from ${sourceEnvironment} to ${targetEnvironment}`,
      };
    }
    
    console.log(`[EnvironmentClient] Promoting from ${sourceEnvironment} to ${targetEnvironment}`, options);
    
    return { success: true };
  }
  
  /**
   * Switch to a different environment
   */
  switchEnvironment(environmentType: EnvironmentType): EnvironmentContext {
    const env = getEnvironmentByType(environmentType);
    if (!env) {
      throw new Error(`Unknown environment type: ${environmentType}`);
    }
    
    this.context.currentEnvironment = environmentType;
    return this.getContext();
  }
  
  /**
   * Get environment-specific data key
   */
  private getEnvironmentKey(baseKey: string): string {
    return `${baseKey}::${this.context.currentEnvironment}`;
  }
  
  /**
   * Get draft-specific data key (for user/session isolation)
   */
  private getDraftKey(baseKey: string): string {
    if (this.context.currentEnvironment !== 'draft') {
      return this.getEnvironmentKey(baseKey);
    }
    
    // For draft environment, include user/session context
    const userPart = this.context.userId ? `:user:${this.context.userId}` : '';
    const sessionPart = this.context.sessionId ? `:session:${this.context.sessionId}` : '';
    return `${baseKey}::draft${userPart}${sessionPart}`;
  }
  
  /**
   * Check if current environment is read-only
   */
  isReadOnly(): boolean {
    const env = getEnvironmentByType(this.context.currentEnvironment);
    return env?.readOnly || false;
  }
  
  /**
   * Check if operation is allowed in current environment
   */
  async checkEnvironmentPermission(operation: string): Promise<{ allowed: boolean; reason?: string }> {
    // For now, simple check based on environment type
    // This should be enhanced with capability-based checks
    if (this.isReadOnly() && this.isWriteOperation(operation)) {
      return {
        allowed: false,
        reason: `Environment "${this.context.currentEnvironment}" is read-only`,
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Determine if operation is a write operation
   */
  private isWriteOperation(operation: string): boolean {
    const writeOperations = [
      'update_page_data',
      'create_template',
      'update_template_data',
      'delete_template',
      'set_global_colors',
      'set_global_typography',
      'set_site_logo',
      'update_site_settings',
      'save_page_section_as_template',
      'save_full_page_as_template',
      'compose_page_from_templates',
      'queue_change',
      'apply_change',
    ];
    
    return writeOperations.includes(operation);
  }
  
  /**
   * Proxy method calls to base client with environment context
   */
  async callWithEnvironment<T>(
    method: keyof ElementifyClient,
    args: any[] = []
  ): Promise<T> {
    // Check environment permissions
    const permission = await this.checkEnvironmentPermission(method as string);
    if (!permission.allowed) {
      throw new Error(`Environment permission denied: ${permission.reason}`);
    }
    
    // For now, just proxy to base client
    // In a full implementation, this would handle environment-specific data storage
    const client = this.baseClient as any;
    return client[method](...args);
  }
  
  /**
   * Get environment-specific data
   */
  async getEnvironmentData(
    _entityType: string,
    _entityId: number
  ): Promise<EnvironmentData | null> {
    // In a real implementation, this would query environment-specific storage
    // For now, return null to indicate no environment-specific data
    return null;
  }
  
  /**
   * Save environment-specific data
   */
  async saveEnvironmentData(
    _entityType: string,
    _entityId: number,
    _data: Record<string, unknown>
  ): Promise<void> {
    if (this.isReadOnly()) {
      throw new Error(`Cannot save data in read-only environment: ${this.context.currentEnvironment}`);
    }
    
    // In a real implementation, this would save to environment-specific storage
    // For now, just log
    console.log(`[EnvironmentClient] Saving ${_entityType}:${_entityId} to ${this.context.currentEnvironment}`);
  }
  
  /**
   * Promote data from one environment to another
   */
  async promoteData(
    sourceEnvironment: EnvironmentType,
    targetEnvironment: EnvironmentType,
    entityType: string,
    entityId: number
  ): Promise<boolean> {
    // Check if promotion is allowed
    const sourceEnv = getEnvironmentByType(sourceEnvironment);
    const targetEnv = getEnvironmentByType(targetEnvironment);
    
    if (!sourceEnv || !targetEnv) {
      throw new Error(`Invalid environment: ${sourceEnvironment} -> ${targetEnvironment}`);
    }
    
    if (sourceEnv.promotionTarget !== targetEnvironment) {
      throw new Error(`Promotion not allowed from ${sourceEnvironment} to ${targetEnvironment}`);
    }
    
    // In a real implementation, this would copy data between environment storage
    // For now, just log
    console.log(`[EnvironmentClient] Promoting ${entityType}:${entityId} from ${sourceEnvironment} to ${targetEnvironment}`);
    
    return true;
  }
  
  /**
   * Get promotion history
   */
  async getPromotionHistory(
    _entityType?: string,
    _entityId?: number,
    _limit = 50
  ): Promise<Array<{
    source: EnvironmentType;
    target: EnvironmentType;
    entityType: string;
    entityId: number;
    timestamp: Date;
    userId?: string;
  }>> {
    // In a real implementation, this would query promotion history
    // For now, return empty array
    return [];
  }

  /**
   * Get environment status
   */
  getEnvironmentStatus(environment: EnvironmentType): {
    environment: EnvironmentType;
    lastRefresh?: Date;
    changeCount: number;
    userCount?: number;
    storageUsed?: number;
  } {
    return {
      environment,
      changeCount: 0,
    };
  }

  /**
   * Compare environments
   */
  compareEnvironments(source: EnvironmentType, target: EnvironmentType): {
    differences: Array<{ type: string; description: string }>;
    conflicts: Array<{ type: string; description: string }>;
    summary: string;
  } {
    return {
      differences: [],
      conflicts: [],
      summary: `Comparison between ${source} and ${target}`,
    };
  }
  
  /**
   * Refresh staging environment from production
   */
  async refreshStagingFromProduction(): Promise<boolean> {
    if (this.context.currentEnvironment !== 'staging') {
      throw new Error('Can only refresh staging environment');
    }
    
    // In a real implementation, this would copy production data to staging
    console.log('[EnvironmentClient] Refreshing staging environment from production');
    
    return true;
  }
  
  /**
   * Clean up old draft data
   */
  async cleanupOldDrafts(maxAgeDays = 7): Promise<number> {
    // In a real implementation, this would delete old draft data
    console.log(`[EnvironmentClient] Cleaning up drafts older than ${maxAgeDays} days`);
    
    return 0;
  }

  /**
   * Delegate template operations with environment context
   */
  async listTemplates(options?: any): Promise<any> {
    // Add environment context to the operation
    const envOptions = {
      ...options,
      environment: this.context.currentEnvironment,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
    };
    
    return this.baseClient.listTemplates(envOptions);
  }

  /**
   * Create a change with environment context
   */
  async createChange(change: any): Promise<any> {
    // Add environment context to the change
    const envChange = {
      ...change,
      environment: this.context.currentEnvironment,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
    };
    
    return this.baseClient.createChange(envChange);
  }
}

/**
 * Create environment-aware client wrapper
 */
export function createEnvironmentClient(
  baseClient: ElementifyClient,
  initialEnvironment: EnvironmentType = 'production'
): EnvironmentClient {
  return new EnvironmentClient(baseClient, initialEnvironment);
}

/**
 * Environment middleware for tool registration
 */
export function withEnvironmentCheck<
  Args extends Record<string, unknown>,
  Result
>(
  handler: (args: Args, client: EnvironmentClient, siteId?: string) => Promise<Result>
): (args: Args & { site_id?: string; environment?: EnvironmentType }) => Promise<Result> {
  return async (args) => {
    const { site_id, environment, ...restArgs } = args;
    
    // Get base client
    const { getClient } = await import('./config.js');
    const baseClient = getClient(site_id);
    
    // Create environment client
    const envClient = createEnvironmentClient(baseClient, environment || 'production');
    
    // Execute handler with environment client
    return handler(restArgs as Args, envClient, site_id);
  };
}