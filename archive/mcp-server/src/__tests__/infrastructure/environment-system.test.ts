/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvironmentClient } from '../../environment-client.js';
import type { ElementifyClient } from '../../client.js';

// Mock the underlying client
const mockClient = {
  createChange: vi.fn(),
  listChanges: vi.fn(),
  getChange: vi.fn(),
  updateChangeStatus: vi.fn(),
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  getTemplateData: vi.fn(),
  updateTemplateData: vi.fn(),
  getSiteInfo: vi.fn(),
  listElementorPages: vi.fn(),
  getPageData: vi.fn(),
  updatePageData: vi.fn(),
  setGlobalColors: vi.fn(),
  setGlobalTypography: vi.fn(),
  setLogo: vi.fn(),
  setSiteContext: vi.fn(),
} as unknown as ElementifyClient;

describe('Environment System (INFRA-002)', () => {
  let envClient: EnvironmentClient;

  beforeEach(() => {
    vi.clearAllMocks();
    envClient = new EnvironmentClient(mockClient);
  });

  describe('Environment Switching', () => {
    it('should initialize with default environment', () => {
      expect(envClient.getCurrentEnvironment()).toBe('production');
    });

    it('should switch to staging environment', () => {
      envClient.switchEnvironment('staging');
      expect(envClient.getCurrentEnvironment()).toBe('staging');
    });

    it('should switch to draft environment with user isolation', () => {
      envClient.switchEnvironment('draft', { userId: 'user-123', sessionId: 'session-456' });
      expect(envClient.getCurrentEnvironment()).toBe('draft');
    });

    it('should throw error for invalid environment', () => {
      expect(() => envClient.switchEnvironment('invalid' as any)).toThrow();
    });
  });

  describe('Data Isolation', () => {
    it('should prefix operations with environment context', () => {
      envClient.switchEnvironment('staging');
      // The client should use environment-aware operations
      expect(envClient.getCurrentEnvironment()).toBe('staging');
    });

    it('should maintain separate contexts for different environments', () => {
      envClient.switchEnvironment('staging');
      const stagingEnv = envClient.getCurrentEnvironment();
      
      envClient.switchEnvironment('draft', { userId: 'user-123' });
      const draftEnv = envClient.getCurrentEnvironment();
      
      expect(stagingEnv).toBe('staging');
      expect(draftEnv).toBe('draft');
      expect(stagingEnv).not.toBe(draftEnv);
    });
  });

  describe('Environment Promotion', () => {
    it('should validate promotion paths', () => {
      // Valid promotions
      expect(envClient.canPromote('draft', 'staging')).toBe(true);
      expect(envClient.canPromote('staging', 'production')).toBe(true);
      
      // Invalid promotions
      expect(envClient.canPromote('production', 'staging')).toBe(false);
      expect(envClient.canPromote('draft', 'production')).toBe(false);
    });

    it('should promote changes between environments', async () => {
      envClient.switchEnvironment('draft', { userId: 'user-123' });
      
      // Simulate creating changes in draft
      const mockChanges = [{ id: 'chg1', operation: 'update_template' }];
      vi.mocked(mockClient.listChanges).mockResolvedValue({ changes: mockChanges, total: 1 });
      
      // Promote to staging
      const result = await envClient.promoteTo('staging', { autoApprove: true });
      
      expect(result.success).toBe(true);
      expect(result.promotedChanges).toHaveLength(1);
    });
  });

  describe('Environment Status', () => {
    it('should get environment status', () => {
      const status = envClient.getEnvironmentStatus('staging');
      expect(status).toHaveProperty('environment');
      expect(status).toHaveProperty('lastRefresh');
      expect(status).toHaveProperty('changeCount');
    });

    it('should compare environments', () => {
      const comparison = envClient.compareEnvironments('staging', 'production');
      expect(comparison).toHaveProperty('differences');
      expect(comparison).toHaveProperty('conflicts');
      expect(comparison).toHaveProperty('summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle promotion failures', async () => {
      vi.mocked(mockClient.listChanges).mockRejectedValue(new Error('API Error'));
      
      envClient.switchEnvironment('draft');
      const result = await envClient.promoteTo('staging');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid environment operations', () => {
      expect(() => envClient.switchEnvironment('invalid' as any)).toThrow('Invalid environment');
    });
  });

  describe('Integration with Client Operations', () => {
    it('should delegate template operations with environment context', async () => {
      envClient.switchEnvironment('staging');
      
      await envClient.listTemplates({ type: 'section' });
      
      // Should call underlying client with environment context
      expect(mockClient.listTemplates).toHaveBeenCalled();
    });

    it('should track environment-specific changes', async () => {
      envClient.switchEnvironment('draft', { userId: 'user-123' });
      
      const mockChange = { id: 'chg_draft_1', operation: 'create_template' };
      vi.mocked(mockClient.createChange).mockResolvedValue(mockChange);
      
      const change = await envClient.createChange({
        operation: 'create_template',
        params: { title: 'Draft Template' }
      });
      
      expect(change.id).toContain('draft');
      expect(mockClient.createChange).toHaveBeenCalled();
    });
  });
});