import type { ElementifyClient } from './client.js';
import type { CapabilityId } from '@elementify/shared';

export interface GovernanceRule {
  /** Minimum governance level required */
  minGovernanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
  /** Required capabilities */
  requiredCapabilities?: CapabilityId[];
  /** Risk level of the operation */
  riskLevel: 'low' | 'medium' | 'high';
  /** Whether human review is required */
  requiresHumanReview: boolean;
  /** Maximum frequency (changes per day) */
  maxFrequency?: number;
  /** Time restrictions */
  timeRestrictions?: {
    startHour?: number; // 0-23
    endHour?: number; // 0-23
  };
}

export interface GovernanceConfig {
  /** Default governance level for the site */
  defaultGovernanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
  /** Operation-specific rules */
  operationRules: Record<string, GovernanceRule>;
  /** User role mappings */
  userRoles: Record<string, {
    governanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
    capabilities: CapabilityId[];
  }>;
  /** Auto-escalation rules */
  autoEscalation: {
    /** Escalate after X failed attempts */
    failedAttempts: number;
    /** Escalate for high-risk operations */
    highRiskOperations: boolean;
    /** Escalate during off-hours */
    offHoursEscalation: boolean;
  };
}

export interface GovernanceDecision {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Required governance level */
  requiredGovernanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
  /** Required capabilities */
  requiredCapabilities: CapabilityId[];
  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high';
  /** Whether human review is required */
  requiresHumanReview: boolean;
  /** Reason for decision */
  reason: string;
  /** Suggested alternatives if not allowed */
  alternatives?: string[];
}

export interface PermissionCheck {
  /** User ID */
  userId: string;
  /** Operation being performed */
  operation: string;
  /** Parameters for the operation */
  params: Record<string, unknown>;
  /** Current governance level */
  currentGovernanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
  /** User capabilities */
  userCapabilities: CapabilityId[];
}

/**
 * Governance and Permissions System (INFRA-005)
 * 
 * Manages access control, risk assessment, and approval workflows
 * based on governance levels and user capabilities.
 */
export class GovernanceSystem {
  private client: ElementifyClient;
  private config: GovernanceConfig;
  private siteId: string;

  constructor(
    client: ElementifyClient,
    siteId: string,
    config?: Partial<GovernanceConfig>
  ) {
    this.client = client;
    this.siteId = siteId;
    this.config = {
      defaultGovernanceLevel: 'L2',
      operationRules: {},
      userRoles: {},
      autoEscalation: {
        failedAttempts: 3,
        highRiskOperations: true,
        offHoursEscalation: false,
      },
      ...config,
    };
  }

  /**
   * Check if an operation is allowed
   */
  async checkPermission(check: PermissionCheck): Promise<GovernanceDecision> {
    const { userId, operation, params, currentGovernanceLevel, userCapabilities } = check;
    
    // Get rule for this operation
    const rule = this.config.operationRules[operation] || this.getDefaultRule(operation);
    
    // Check governance level
    const governanceAllowed = this.checkGovernanceLevel(
      currentGovernanceLevel,
      rule.minGovernanceLevel
    );
    
    // Check capabilities
    const capabilitiesAllowed = this.checkCapabilities(
      userCapabilities,
      rule.requiredCapabilities || []
    );
    
    // Check time restrictions
    const timeAllowed = this.checkTimeRestrictions(rule.timeRestrictions);
    
    // Determine if allowed
    const allowed = governanceAllowed && capabilitiesAllowed && timeAllowed;
    
    // Build decision
    const decision: GovernanceDecision = {
      allowed,
      requiredGovernanceLevel: rule.minGovernanceLevel,
      requiredCapabilities: rule.requiredCapabilities || [],
      riskLevel: rule.riskLevel,
      requiresHumanReview: rule.requiresHumanReview,
      reason: this.buildReason(
        allowed,
        governanceAllowed,
        capabilitiesAllowed,
        timeAllowed,
        rule
      ),
    };
    
    // Suggest alternatives if not allowed
    if (!allowed) {
      decision.alternatives = this.suggestAlternatives(operation, rule);
    }
    
    return decision;
  }

  /**
   * Check governance level
   */
  private checkGovernanceLevel(
    current: 'L0' | 'L1' | 'L2' | 'L3',
    required: 'L0' | 'L1' | 'L2' | 'L3'
  ): boolean {
    const levels = { L0: 0, L1: 1, L2: 2, L3: 3 };
    return levels[current] >= levels[required];
  }

  /**
   * Check capabilities
   */
  private checkCapabilities(
    userCapabilities: CapabilityId[],
    requiredCapabilities: CapabilityId[]
  ): boolean {
    if (requiredCapabilities.length === 0) {
      return true;
    }
    
    return requiredCapabilities.every(capability =>
      userCapabilities.includes(capability)
    );
  }

  /**
   * Check time restrictions
   */
  private checkTimeRestrictions(
    timeRestrictions?: GovernanceRule['timeRestrictions']
  ): boolean {
    if (!timeRestrictions) {
      return true;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (timeRestrictions.startHour !== undefined && currentHour < timeRestrictions.startHour) {
      return false;
    }
    
    if (timeRestrictions.endHour !== undefined && currentHour >= timeRestrictions.endHour) {
      return false;
    }
    
    return true;
  }

  /**
   * Get default rule for an operation
   */
  private getDefaultRule(operation: string): GovernanceRule {
    // Determine risk level based on operation type
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let requiresHumanReview = false;
    
    if (operation.startsWith('list_') || operation.startsWith('get_')) {
      riskLevel = 'low';
      requiresHumanReview = false;
    } else if (operation.startsWith('update_') || operation.startsWith('set_')) {
      riskLevel = 'medium';
      requiresHumanReview = true;
    } else if (operation.startsWith('delete_') || operation.startsWith('create_')) {
      riskLevel = 'high';
      requiresHumanReview = true;
    }
    
    return {
      minGovernanceLevel: riskLevel === 'low' ? 'L1' : riskLevel === 'medium' ? 'L2' : 'L3',
      riskLevel,
      requiresHumanReview,
    };
  }

  /**
   * Build reason for decision
   */
  private buildReason(
    allowed: boolean,
    governanceAllowed: boolean,
    capabilitiesAllowed: boolean,
    timeAllowed: boolean,
    rule: GovernanceRule
  ): string {
    if (allowed) {
      return `Operation allowed${rule.requiresHumanReview ? ' (requires human review)' : ''}`;
    }
    
    const reasons: string[] = [];
    
    if (!governanceAllowed) {
      reasons.push(`requires governance level ${rule.minGovernanceLevel} or higher`);
    }
    
    if (!capabilitiesAllowed && rule.requiredCapabilities?.length) {
      reasons.push(`requires capabilities: ${rule.requiredCapabilities.join(', ')}`);
    }
    
    if (!timeAllowed) {
      reasons.push('outside allowed time window');
    }
    
    return `Operation denied: ${reasons.join('; ')}`;
  }

  /**
   * Suggest alternatives
   */
  private suggestAlternatives(operation: string, rule: GovernanceRule): string[] {
    const alternatives: string[] = [];
    
    // Suggest lower-risk operations
    if (rule.riskLevel === 'high') {
      if (operation.startsWith('delete_')) {
        alternatives.push(`Use ${operation.replace('delete_', 'update_')} with status=draft instead`);
      }
      if (operation.startsWith('create_')) {
        alternatives.push(`Use draft mode first with ${operation}_draft`);
      }
    }
    
    // Suggest requesting higher permissions
    if (rule.minGovernanceLevel !== 'L0') {
      alternatives.push(`Request elevation to governance level ${rule.minGovernanceLevel}`);
    }
    
    // Suggest scheduling for later if time-restricted
    if (rule.timeRestrictions) {
      alternatives.push('Schedule operation during allowed hours');
    }
    
    return alternatives;
  }

  /**
   * Record a permission check for audit
   */
  async recordAudit(
    userId: string,
    operation: string,
    decision: GovernanceDecision,
    params?: Record<string, unknown>
  ): Promise<void> {
    // In a real implementation, this would write to an audit log
    console.log(`[GovernanceSystem] Audit: user=${userId}, operation=${operation}, allowed=${decision.allowed}, reason=${decision.reason}`);
  }

  /**
   * Get user role
   */
  getUserRole(userId: string): {
    governanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
    capabilities: CapabilityId[];
  } {
    return this.config.userRoles[userId] || {
      governanceLevel: this.config.defaultGovernanceLevel,
      capabilities: [],
    };
  }

  /**
   * Update user role
   */
  updateUserRole(
    userId: string,
    role: {
      governanceLevel: 'L0' | 'L1' | 'L2' | 'L3';
      capabilities: CapabilityId[];
    }
  ): void {
    this.config.userRoles[userId] = role;
  }

  /**
   * Add operation rule
   */
  addOperationRule(operation: string, rule: GovernanceRule): void {
    this.config.operationRules[operation] = rule;
  }

  /**
   * Remove operation rule
   */
  removeOperationRule(operation: string): void {
    delete this.config.operationRules[operation];
  }

  /**
   * Get all operation rules
   */
  getOperationRules(): Record<string, GovernanceRule> {
    return { ...this.config.operationRules };
  }

  /**
   * Check if operation should be auto-escalated
   */
  shouldAutoEscalate(
    operation: string,
    failedAttempts: number,
    currentTime?: Date
  ): boolean {
    const rule = this.config.operationRules[operation];
    
    // Check failed attempts
    if (failedAttempts >= this.config.autoEscalation.failedAttempts) {
      return true;
    }
    
    // Check high-risk operations
    if (this.config.autoEscalation.highRiskOperations && rule?.riskLevel === 'high') {
      return true;
    }
    
    // Check off-hours
    if (this.config.autoEscalation.offHoursEscalation && currentTime) {
      const hour = currentTime.getHours();
      const isOffHours = hour < 9 || hour >= 17; // 9 AM to 5 PM
      if (isOffHours) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get governance statistics
   */
  getStats(): {
    totalChecks: number;
    allowed: number;
    denied: number;
    autoEscalated: number;
    byRiskLevel: Record<'low' | 'medium' | 'high', number>;
    byGovernanceLevel: Record<'L0' | 'L1' | 'L2' | 'L3', number>;
  } {
    // In a real implementation, this would query actual statistics
    return {
      totalChecks: 0,
      allowed: 0,
      denied: 0,
      autoEscalated: 0,
      byRiskLevel: { low: 0, medium: 0, high: 0 },
      byGovernanceLevel: { L0: 0, L1: 0, L2: 0, L3: 0 },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GovernanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GovernanceConfig {
    return { ...this.config };
  }
}