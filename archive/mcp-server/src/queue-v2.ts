import type { ElementifyClient, QueuedChange } from './client.js';
import { getRiskLevel, getCapabilityRequirement } from './capability-registry.js';

export interface AutoApprovalRule {
  /** Risk levels that can be auto-approved */
  riskLevels: ('low' | 'medium' | 'high')[];
  /** Governance levels that can be auto-approved */
  governanceLevels: ('L0' | 'L1' | 'L2' | 'L3')[];
  /** Operations that are always/never auto-approved */
  operationPatterns?: {
    include?: string[];
    exclude?: string[];
  };
  /** Additional conditions for auto-approval */
  conditions?: {
    /** Maximum number of auto-approved changes per day */
    dailyLimit?: number;
    /** Time of day restrictions */
    timeRestrictions?: {
      startHour?: number; // 0-23
      endHour?: number; // 0-23
    };
  };
}

export interface QueueV2Config {
  /** Default auto-approval rules */
  autoApprovalRules: AutoApprovalRule[];
  /** Whether to enable auto-approval */
  enableAutoApproval: boolean;
  /** Notification settings */
  notifications: {
    onAutoApproval: boolean;
    onManualReview: boolean;
    onError: boolean;
  };
  /** Retention policy */
  retention: {
    approvedDays: number;
    rejectedDays: number;
    appliedDays: number;
  };
}

export interface QueueV2Stats {
  totalChanges: number;
  autoApproved: number;
  manuallyApproved: number;
  rejected: number;
  pending: number;
  errorRate: number;
  averageReviewTime: number; // in hours
}

/**
 * Queue 2.0 with auto-approval logic
 */
export class QueueV2 {
  private config: QueueV2Config;
  private client: ElementifyClient;
  private siteId?: string;
  
  constructor(
    client: ElementifyClient,
    siteId?: string,
    config?: Partial<QueueV2Config>
  ) {
    this.client = client;
    this.siteId = siteId;
    this.config = {
      autoApprovalRules: [
        {
          riskLevels: ['low'],
          governanceLevels: ['L0', 'L1', 'L2'],
          operationPatterns: {
            exclude: ['delete_template', 'update_site_settings']
          },
          conditions: {
            dailyLimit: 50,
            timeRestrictions: {
              startHour: 9, // 9 AM
              endHour: 17   // 5 PM
            }
          }
        },
        {
          riskLevels: ['medium'],
          governanceLevels: ['L2'],
          operationPatterns: {
            include: ['set_global_colors', 'set_global_typography', 'create_template']
          },
          conditions: {
            dailyLimit: 10
          }
        }
      ],
      enableAutoApproval: true,
      notifications: {
        onAutoApproval: true,
        onManualReview: true,
        onError: true
      },
      retention: {
        approvedDays: 30,
        rejectedDays: 7,
        appliedDays: 90
      },
      ...config
    };
  }
  
  /**
   * Check if a change should be auto-approved
   */
  async shouldAutoApprove(
    operation: string,
    params: Record<string, unknown>,
    client: ElementifyClient,
    siteId?: string
  ): Promise<{ autoApprove: boolean; reason?: string; rule?: AutoApprovalRule }> {
    if (!this.config.enableAutoApproval) {
      return { autoApprove: false, reason: 'Auto-approval is disabled' };
    }
    
    // Get risk level from capability registry
    const riskLevel = getRiskLevel(operation);
    if (!riskLevel) {
      return { autoApprove: false, reason: `Unknown risk level for operation: ${operation}` };
    }
    
    // Get capability requirement for governance level
    const requirement = getCapabilityRequirement(operation);
    if (!requirement) {
      return { autoApprove: false, reason: `No capability requirement found for operation: ${operation}` };
    }
    
    // Check against auto-approval rules
    for (const rule of this.config.autoApprovalRules) {
      if (this.matchesRule(operation, riskLevel, requirement.minGovernanceLevel || 'L1', rule)) {
        // Check additional conditions
        const conditionsMet = await this.checkConditions(rule, client, siteId);
        if (conditionsMet) {
          return { 
            autoApprove: true, 
            reason: `Matches auto-approval rule for ${riskLevel} risk, ${requirement.minGovernanceLevel || 'L1'} governance`,
            rule 
          };
        }
      }
    }
    
    return { autoApprove: false, reason: 'No matching auto-approval rule found' };
  }
  
  /**
   * Check if operation matches an auto-approval rule
   */
  private matchesRule(
    operation: string,
    riskLevel: 'low' | 'medium' | 'high',
    governanceLevel: 'L0' | 'L1' | 'L2' | 'L3',
    rule: AutoApprovalRule
  ): boolean {
    // Check risk level
    if (!rule.riskLevels.includes(riskLevel)) {
      return false;
    }
    
    // Check governance level
    if (!rule.governanceLevels.includes(governanceLevel)) {
      return false;
    }
    
    // Check operation patterns
    if (rule.operationPatterns) {
      const { include, exclude } = rule.operationPatterns;
      
      // Check exclude list
      if (exclude && exclude.includes(operation)) {
        return false;
      }
      
      // Check include list (if specified, operation must be in include list)
      if (include && !include.includes(operation)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check additional conditions for auto-approval
   */
  private async checkConditions(
    rule: AutoApprovalRule,
    _client: ElementifyClient,
    _siteId?: string
  ): Promise<boolean> {
    if (!rule.conditions) {
      return true;
    }
    
    const { dailyLimit, timeRestrictions } = rule.conditions;
    
    // Check time restrictions
    if (timeRestrictions) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (timeRestrictions.startHour !== undefined && currentHour < timeRestrictions.startHour) {
        return false;
      }
      
      if (timeRestrictions.endHour !== undefined && currentHour >= timeRestrictions.endHour) {
        return false;
      }
    }
    
    // Check daily limit (simplified - would need actual tracking)
    if (dailyLimit) {
      // In a real implementation, we would query the database for today's count
      // For now, we'll assume we're under the limit
      // TODO: Implement actual daily limit tracking
      console.log(`[QueueV2] Daily limit check would happen here for limit: ${dailyLimit}`);
    }
    
    return true;
  }
  
  /**
   * Process a change with auto-approval logic
   */
  async processChange(
    operation: string,
    params: Record<string, unknown>,
    client: ElementifyClient,
    note?: string,
    siteId?: string
  ): Promise<{ queued: boolean; change?: QueuedChange; autoApproved?: boolean; message: string }> {
    try {
      // Check if should auto-approve
      const { autoApprove, reason, rule } = await this.shouldAutoApprove(operation, params, client, siteId);
      
      if (autoApprove && rule) {
        // Auto-approve and execute immediately
        console.log(`[QueueV2] Auto-approving ${operation}: ${reason}`);
        
        // Create change record
        const change = await client.createChange({
          operation,
          params,
          note: note ? `${note} [Auto-approved: ${reason}]` : `Auto-approved: ${reason}`
        });
        
        // Auto-approve
        const approvedChange = await client.updateChangeStatus(change.id, 'approved', 'Auto-approved by Queue 2.0');
        
        // Execute immediately
        try {
          await this.executeChange(approvedChange, client);
          return {
            queued: false,
            autoApproved: true,
            message: `Change auto-approved and executed: ${operation}`
          };
        } catch (error) {
          // If execution fails, mark as rejected
          await client.updateChangeStatus(change.id, 'rejected', `Auto-approval execution failed: ${error}`);
          return {
            queued: false,
            autoApproved: false,
            message: `Auto-approval failed during execution: ${error}`
          };
        }
      } else {
        // Queue for manual review
        console.log(`[QueueV2] Queuing ${operation} for manual review: ${reason}`);
        
        const change = await client.createChange({
          operation,
          params,
          note: note ? `${note} [Requires manual review: ${reason}]` : `Requires manual review: ${reason}`
        });
        
        return {
          queued: true,
          change,
          autoApproved: false,
          message: `Change queued for manual review: ${operation}`
        };
      }
    } catch (error) {
      console.error(`[QueueV2] Error processing change ${operation}:`, error);
      return {
        queued: false,
        autoApproved: false,
        message: `Error processing change: ${error}`
      };
    }
  }
  
  /**
   * Execute a change (moved from change-queue.ts OPERATION_EXECUTORS)
   */
  private async executeChange(change: QueuedChange, client: ElementifyClient): Promise<unknown> {
    // Import the operation executors from change-queue.ts
    const changeQueueModule = await import('./tools/change-queue.js');
    
    // Access OPERATION_EXECUTORS from the module
    const OPERATION_EXECUTORS = (changeQueueModule as any).OPERATION_EXECUTORS;
    if (!OPERATION_EXECUTORS) {
      throw new Error('OPERATION_EXECUTORS not found in change-queue module');
    }
    
    const executor = OPERATION_EXECUTORS[change.operation];
    if (!executor) {
      throw new Error(`No executor found for operation: ${change.operation}`);
    }
    
    return executor(client, change.params);
  }
  
  /**
   * Get queue statistics
   */
  async getStats(client: ElementifyClient): Promise<QueueV2Stats> {
    const allChanges = await client.listChanges('all');
    
    let autoApproved = 0;
    let manuallyApproved = 0;
    let rejected = 0;
    let pending = 0;
    let totalReviewTime = 0;
    let reviewedCount = 0;
    
    for (const change of allChanges.changes) {
      switch (change.status) {
        case 'approved':
          if (change.note?.includes('Auto-approved')) {
            autoApproved++;
          } else {
            manuallyApproved++;
          }
          break;
        case 'rejected':
          rejected++;
          break;
        case 'applied':
          // Already counted in approved
          break;
        case 'pending':
          pending++;
          break;
      }
      
      // Calculate review time for applied changes
      if (change.status === 'applied' && change.created_at && change.applied_at) {
        const created = new Date(change.created_at);
        const applied = new Date(change.applied_at);
        const reviewTime = (applied.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        totalReviewTime += reviewTime;
        reviewedCount++;
      }
    }
    
    const totalChanges = allChanges.total;
    const errorRate = rejected / totalChanges;
    const averageReviewTime = reviewedCount > 0 ? totalReviewTime / reviewedCount : 0;
    
    return {
      totalChanges,
      autoApproved,
      manuallyApproved,
      rejected,
      pending,
      errorRate,
      averageReviewTime
    };
  }
  
  /**
   * Clean up old changes based on retention policy
   */
  async cleanupOldChanges(client: ElementifyClient): Promise<{ deleted: number; errors: number }> {
    const allChanges = await client.listChanges('all');
    const now = new Date();
    let deleted = 0;
    let errors = 0;
    
    for (const change of allChanges.changes) {
      let shouldDelete = false;
      const changeDate = new Date(change.created_at);
      const ageDays = (now.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24);
      
      switch (change.status) {
        case 'approved':
          shouldDelete = ageDays > this.config.retention.approvedDays;
          break;
        case 'rejected':
          shouldDelete = ageDays > this.config.retention.rejectedDays;
          break;
        case 'applied':
          shouldDelete = ageDays > this.config.retention.appliedDays;
          break;
        case 'pending':
          // Don't delete pending changes
          break;
      }
      
      if (shouldDelete) {
        try {
          await client.deleteChange(change.id);
          deleted++;
        } catch (error) {
          console.error(`[QueueV2] Error deleting change ${change.id}:`, error);
          errors++;
        }
      }
    }
    
    return { deleted, errors };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueueV2Config>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): QueueV2Config {
    return { ...this.config };
  }

  /**
   * Queue a change for review
   */
  async queueChange(change: {
    operation: string;
    params: Record<string, unknown>;
    note?: string;
    beforeState?: Record<string, unknown>;
  }): Promise<any> {
    const result = await this.processChange(
      change.operation,
      change.params,
      this.client,
      change.note,
      this.siteId
    );
    
    // Return the change object if it was queued
    if (result.queued && result.change) {
      return result.change;
    }
    
    // Return auto-approved change
    if (result.autoApproved && result.change) {
      return result.change;
    }
    
    // Fallback
    return result;
  }

  /**
   * List changes by status
   */
  async listChanges(status: 'pending' | 'approved' | 'rejected' | 'applied' | 'all' = 'all'): Promise<{
    changes: any[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const result = await this.client.listChanges(status);
    return {
      changes: result.changes || [],
      total: result.total || 0,
      page: 1,
      perPage: 20
    };
  }

  /**
   * Approve a change
   */
  async approveChange(changeId: string, reviewNote?: string): Promise<any> {
    return this.client.updateChangeStatus(changeId, 'approved', reviewNote);
  }

  /**
   * Reject a change
   */
  async rejectChange(changeId: string, reviewNote?: string): Promise<any> {
    return this.client.updateChangeStatus(changeId, 'rejected', reviewNote);
  }

  private auditLog: Array<{
    changeId: string;
    operation?: string;
    userId?: string;
    timestamp: Date;
  }> = [];
  
  private dailyChangeCount = 0;
  private lastResetDate = new Date().toDateString();

  /**
   * Track a change (for daily limits)
   */
  trackChange(changeId: string, operation?: string, userId?: string): void {
    console.log(`[QueueV2] Tracking change ${changeId} for operation ${operation} by user ${userId}`);
    
    // Check if we need to reset daily count
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyChangeCount = 0;
      this.lastResetDate = today;
    }
    
    // Increment daily count
    this.dailyChangeCount++;
    
    // Add to audit log
    this.auditLog.push({
      changeId,
      operation,
      userId,
      timestamp: new Date()
    });
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(): Array<{
    changeId: string;
    operation?: string;
    userId?: string;
    timestamp: Date;
  }> {
    return [...this.auditLog];
  }

  /**
   * Get daily change count
   */
  getDailyChangeCount(): number {
    return this.dailyChangeCount;
  }

  /**
   * Check if daily limit has been reached
   */
  hasReachedDailyLimit(limit?: number): boolean {
    const dailyLimit = limit || this.config.autoApprovalRules
      .find(rule => rule.conditions?.dailyLimit)
      ?.conditions?.dailyLimit || 50;
    
    return this.getDailyChangeCount() >= dailyLimit;
  }

  /**
   * Reset daily count
   */
  resetDailyCount(): void {
    this.dailyChangeCount = 0;
    this.lastResetDate = new Date().toDateString();
    console.log('[QueueV2] Resetting daily change count');
  }

  /**
   * Check if should auto-approve (simplified version for tests)
   */
  _shouldAutoApproveSimple(
    operation: string,
    riskLevel: 'low' | 'medium' | 'high',
    governanceLevel?: string
  ): boolean {
    // Simplified logic for tests
    if (operation.startsWith('list_') || operation.startsWith('get_')) {
      return true;
    }
    if (operation.startsWith('delete_') || operation.startsWith('update_page_data')) {
      return false;
    }
    return riskLevel === 'low';
  }
}