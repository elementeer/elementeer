import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernanceSystem } from '../../governance-system.js';
import type { ElementifyClient } from '../../client.js';

// Mock the underlying client
const mockClient = {
  createChange: vi.fn(),
  listChanges: vi.fn(),
  getChange: vi.fn(),
  updateChangeStatus: vi.fn(),
} as unknown as ElementifyClient;

describe('Governance System (INFRA-005)', () => {
  let governance: GovernanceSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    governance = new GovernanceSystem(mockClient, 'test-site');
  });

  describe('Permission Checking', () => {
    it('should allow low-risk operations with L1 governance', async () => {
      const decision = await governance.checkPermission({
        userId: 'user-123',
        operation: 'list_templates',
        params: {},
        currentGovernanceLevel: 'L1',
        userCapabilities: [],
      });

      expect(decision.allowed).toBe(true);
      expect(decision.riskLevel).toBe('low');
      expect(decision.requiresHumanReview).toBe(false);
    });

    it('should deny high-risk operations without sufficient governance', async () => {
      const decision = await governance.checkPermission({
        userId: 'user-123',
        operation: 'delete_template',
        params: { id: 123 },
        currentGovernanceLevel: 'L1',
        userCapabilities: [],
      });

      expect(decision.allowed).toBe(false);
      expect(decision.riskLevel).toBe('high');
      expect(decision.requiresHumanReview).toBe(true);
      expect(decision.reason).toContain('requires governance level L3 or higher');
    });

    it('should check required capabilities', async () => {
      // Add operation rule requiring specific capability
      governance.addOperationRule('set_global_colors', {
        minGovernanceLevel: 'L2',
        requiredCapabilities: ['global-styles'],
        riskLevel: 'medium',
        requiresHumanReview: true,
      });

      const decision1 = await governance.checkPermission({
        userId: 'user-123',
        operation: 'set_global_colors',
        params: { colors: [] },
        currentGovernanceLevel: 'L2',
        userCapabilities: [], // Missing required capability
      });

      expect(decision1.allowed).toBe(false);
      expect(decision1.reason).toContain('requires capabilities: global-styles');

      const decision2 = await governance.checkPermission({
        userId: 'user-123',
        operation: 'set_global_colors',
        params: { colors: [] },
        currentGovernanceLevel: 'L2',
        userCapabilities: ['global-styles'], // Has required capability
      });

      expect(decision2.allowed).toBe(true);
    });

    it('should respect time restrictions', async () => {
      governance.addOperationRule('batch_update', {
        minGovernanceLevel: 'L2',
        riskLevel: 'high',
        requiresHumanReview: true,
        timeRestrictions: {
          startHour: 9, // 9 AM
          endHour: 17, // 5 PM
        },
      });

      // Mock Date to return 8 AM
      const mockDate = new Date('2026-04-19T08:00:00Z');
      vi.spyOn(global, 'Date', 'get').mockReturnValue(mockDate as any);

      const decision = await governance.checkPermission({
        userId: 'user-123',
        operation: 'batch_update',
        params: {},
        currentGovernanceLevel: 'L3',
        userCapabilities: [],
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('outside allowed time window');

      // Restore Date
      vi.restoreAllMocks();
    });
  });

  describe('User Role Management', () => {
    it('should get default user role', () => {
      const role = governance.getUserRole('new-user');
      expect(role.governanceLevel).toBe('L2');
      expect(role.capabilities).toEqual([]);
    });

    it('should update and retrieve user role', () => {
      governance.updateUserRole('admin-user', {
        governanceLevel: 'L3',
        capabilities: ['global-styles', 'page-composition', 'template-management'],
      });

      const role = governance.getUserRole('admin-user');
      expect(role.governanceLevel).toBe('L3');
      expect(role.capabilities).toContain('global-styles');
      expect(role.capabilities).toContain('page-composition');
    });
  });

  describe('Operation Rule Management', () => {
    it('should add and retrieve operation rules', () => {
      governance.addOperationRule('custom_operation', {
        minGovernanceLevel: 'L2',
        requiredCapabilities: ['custom-capability'],
        riskLevel: 'medium',
        requiresHumanReview: false,
      });

      const rules = governance.getOperationRules();
      expect(rules['custom_operation']).toBeDefined();
      expect(rules['custom_operation'].minGovernanceLevel).toBe('L2');
      expect(rules['custom_operation'].requiredCapabilities).toEqual(['custom-capability']);
    });

    it('should remove operation rules', () => {
      governance.addOperationRule('temp_operation', {
        minGovernanceLevel: 'L1',
        riskLevel: 'low',
        requiresHumanReview: false,
      });

      expect(governance.getOperationRules()['temp_operation']).toBeDefined();
      
      governance.removeOperationRule('temp_operation');
      expect(governance.getOperationRules()['temp_operation']).toBeUndefined();
    });
  });

  describe('Auto-Escalation', () => {
    it('should auto-escalate after failed attempts', () => {
      const shouldEscalate = governance.shouldAutoEscalate('any_operation', 3);
      expect(shouldEscalate).toBe(true);
    });

    it('should not auto-escalate before failed attempt threshold', () => {
      const shouldEscalate = governance.shouldAutoEscalate('any_operation', 2);
      expect(shouldEscalate).toBe(false);
    });

    it('should auto-escalate high-risk operations', () => {
      governance.addOperationRule('high_risk_op', {
        minGovernanceLevel: 'L3',
        riskLevel: 'high',
        requiresHumanReview: true,
      });

      const shouldEscalate = governance.shouldAutoEscalate('high_risk_op', 0);
      expect(shouldEscalate).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const originalConfig = governance.getConfig();
      expect(originalConfig.defaultGovernanceLevel).toBe('L2');

      governance.updateConfig({
        defaultGovernanceLevel: 'L3',
        autoEscalation: {
          failedAttempts: 5,
          highRiskOperations: false,
          offHoursEscalation: true,
        },
      });

      const updatedConfig = governance.getConfig();
      expect(updatedConfig.defaultGovernanceLevel).toBe('L3');
      expect(updatedConfig.autoEscalation.failedAttempts).toBe(5);
      expect(updatedConfig.autoEscalation.highRiskOperations).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return governance statistics', () => {
      const stats = governance.getStats();
      expect(stats).toHaveProperty('totalChecks');
      expect(stats).toHaveProperty('allowed');
      expect(stats).toHaveProperty('denied');
      expect(stats).toHaveProperty('autoEscalated');
      expect(stats).toHaveProperty('byRiskLevel');
      expect(stats).toHaveProperty('byGovernanceLevel');
    });
  });

  describe('Alternative Suggestions', () => {
    it('should suggest alternatives for denied operations', async () => {
      const decision = await governance.checkPermission({
        userId: 'user-123',
        operation: 'delete_template',
        params: { id: 123 },
        currentGovernanceLevel: 'L1',
        userCapabilities: [],
      });

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives?.length).toBeGreaterThan(0);
      expect(decision.alternatives?.[0]).toContain('update_template');
    });

    it('should suggest requesting elevation', async () => {
      governance.addOperationRule('elevated_op', {
        minGovernanceLevel: 'L3',
        riskLevel: 'medium',
        requiresHumanReview: true,
      });

      const decision = await governance.checkPermission({
        userId: 'user-123',
        operation: 'elevated_op',
        params: {},
        currentGovernanceLevel: 'L2',
        userCapabilities: [],
      });

      expect(decision.alternatives).toContain('Request elevation to governance level L3');
    });
  });
});