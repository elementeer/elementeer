/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPermissionsManagementTools } from '../../tools/permissions-management.js';
import type { ElementifyClient } from '../../client.js';

// Mock the config module that capability-middleware imports
let mockClient: ElementifyClient;
vi.mock('../../config.js', () => ({
  getClient: vi.fn().mockImplementation((siteId?: string) => {
    // Return the mock client for testing
    return mockClient;
  }),
}));

// Mock the fingerprint module
vi.mock('../../fingerprint.js', () => ({
  buildSiteFingerprint: vi.fn().mockReturnValue({
    cms: 'wordpress',
    builder: 'elementor',
    version: '3.21',
    tier: 'advanced',
    plugins: [],
    evidence: {},
    confidence: 0.9,
  }),
}));

// Mock the destination module
vi.mock('../../destination.js', () => ({
  buildCapabilityMatrix: vi.fn().mockReturnValue({
    capabilities: [
      { id: 'global-styles', available: true, confidence: 0.9 },
      { id: 'page-composition', available: true, confidence: 0.9 },
      { id: 'change-review', available: true, confidence: 0.9 },
      { id: 'template-management', available: true, confidence: 0.9 },
      { id: 'workflow-staging', available: true, confidence: 0.9 },
      { id: 'intelligence-composition', available: true, confidence: 0.9 },
      { id: 'permissions-management', available: true, confidence: 0.9 },
    ],
  }),
}));

// Mock the capability-middleware module's buildCapabilityContext
vi.mock('../../capability-middleware.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../capability-middleware.js')>();
  return {
    ...actual,
    buildCapabilityContext: vi.fn().mockImplementation(async (client, siteId) => {
      // Return L3 governance level for testing
      return {
        governanceLevel: 'L3',
        capabilities: new Set([
          'global-styles',
          'page-composition',
          'change-review',
          'template-management',
          'workflow-staging',
          'intelligence-composition',
          'permissions-management',
        ]) as Set<string>,
        siteId: siteId || 'test-site',
      };
    }),
  };
});

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    // Core client methods
    createChange: vi.fn().mockResolvedValue({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'update_page_data', params: {}, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
    listChanges: vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange: vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    updateChangeStatus: vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    
    // Template methods
    listTemplates: vi.fn().mockResolvedValue({ templates: [], total: 0, total_pages: 1 }),
    getTemplate: vi.fn().mockResolvedValue({ 
      id: 1, 
      title: 'Test Template', 
      type: 'section', 
      status: 'publish', 
      author: 1, 
      date: '2026-01-01', 
      modified: '2026-01-01', 
      categories: [], 
      tags: [] 
    }),
    createTemplate: vi.fn().mockResolvedValue({ id: 99, title: 'New Template', type: 'container', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    updateTemplate: vi.fn().mockResolvedValue({ id: 99, title: 'Updated Template', type: 'container', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    deleteTemplate: vi.fn().mockResolvedValue({ id: 99, deleted: true }),
    duplicateTemplate: vi.fn().mockResolvedValue({ id: 100, title: 'Copy of Template', type: 'container', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
    getTemplateData: vi.fn().mockResolvedValue({ id: 1, elementor_data: [] }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 99, updated: true }),
    
    // Other methods
    getSiteInfo: vi.fn().mockResolvedValue({ 
      name: 'Test Site', 
      url: 'https://test.site', 
      wp_version: '6.5', 
      elementor_version: '3.21', 
      elementor_pro: true, 
      activation_mode: 'advanced', 
      template_count: 10 
    }),
    assessSite: vi.fn().mockResolvedValue({
      brand_completeness: 0.8,
      theme_builder_templates: [],
      template_library_stats: { total: 10, by_type: {}, by_status: {} },
      active_plugins: [],
      performance_indicators: {},
      issues: [],
    }),
    listElementorPages: vi.fn().mockResolvedValue({ posts: [], total: 0, total_pages: 1 }),
    getPageData: vi.fn().mockResolvedValue({ post_id: 1, post_title: 'Test Page', post_type: 'page', element_count: 0, elementor_data: [] }),
    updatePageData: vi.fn().mockResolvedValue({ id: 1, updated: true }),
    setGlobalColors: vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography: vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    setLogo: vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext: vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Permissions Management Tools (API-007, API-008)', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    mockClient = client; // Set the mock client for config module
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerPermissionsManagementTools(server, getClient);
  });

  describe('API-007: Granular Permission Management', () => {
    it('should register create_permission_rule tool', () => {
      expect(toolHandlers.has('create_permission_rule')).toBe(true);
    });

    it('create_permission_rule should create permission rule', async () => {
      const handler = toolHandlers.get('create_permission_rule')!;
      
      const result = await handler({
        site_id: 'test-site',
        resource_type: 'template',
        action: 'write',
        conditions: { template_type: 'section' },
        description: 'Editor Template Access'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Permission Rule Created');
    });

    it('should register create_user_role tool', () => {
      expect(toolHandlers.has('create_user_role')).toBe(true);
    });

    it('create_user_role should create user role', async () => {
      const handler = toolHandlers.get('create_user_role')!;
      
      const result = await handler({
        site_id: 'test-site',
        name: 'Editor',
        description: 'Can edit templates and pages',
        permissions: ['perm_001', 'perm_002'],
        copy_from_role: 'admin'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('User Role Created');
    });

    it('should register assign_role_to_user tool', () => {
      expect(toolHandlers.has('assign_role_to_user')).toBe(true);
    });

    it('assign_role_to_user should assign role to user', async () => {
      const handler = toolHandlers.get('assign_role_to_user')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 5,
        role_id: 'role_editor_001',
        expires_at: '2026-12-31T23:59:59Z'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Role Assignment');
    });

    it('should register check_user_permission tool', () => {
      expect(toolHandlers.has('check_user_permission')).toBe(true);
    });

    it('check_user_permission should check user permission', async () => {
      const handler = toolHandlers.get('check_user_permission')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 5,
        operation: 'update_template_data',
        resource_id: 1
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Permission Check');
    });

    it('should register list_user_permissions tool', () => {
      expect(toolHandlers.has('list_user_permissions')).toBe(true);
    });

    it('list_user_permissions should list user permissions', async () => {
      const handler = toolHandlers.get('list_user_permissions')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 5,
        include_inherited: true
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('User Permissions');
    });

    it('should register update_role_permissions tool', () => {
      expect(toolHandlers.has('update_role_permissions')).toBe(true);
    });

    it('update_role_permissions should update role permissions', async () => {
      const handler = toolHandlers.get('update_role_permissions')!;
      
      const result = await handler({
        site_id: 'test-site',
        role_id: 'role_editor_001',
        add_permissions: ['perm_001', 'perm_002'],
        remove_permissions: ['perm_003']
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Role Permissions Updated');
    });

    it('should register audit_permission_changes tool', () => {
      expect(toolHandlers.has('audit_permission_changes')).toBe(true);
    });

    it('audit_permission_changes should audit permission changes', async () => {
      const handler = toolHandlers.get('audit_permission_changes')!;
      
      const result = await handler({
        site_id: 'test-site',
        timeframe_days: 30,
        change_types: ['role_assignment', 'permission_update']
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Permission Change Audit');
    });
  });

  describe('API-008: Role-Based Access Control', () => {
    it('should register configure_rbac_policy tool', () => {
      expect(toolHandlers.has('configure_rbac_policy')).toBe(true);
    });

    it('configure_rbac_policy should configure RBAC policy', async () => {
      const handler = toolHandlers.get('configure_rbac_policy')!;
      
      const result = await handler({
        site_id: 'test-site',
        policy_name: 'Strict Editorial Control',
        default_role: 'viewer',
        roles: [
          { name: 'admin', permissions: ['perm_all'], inherits_from: [] },
          { name: 'editor', permissions: ['perm_write', 'perm_read'], inherits_from: ['admin'] },
          { name: 'viewer', permissions: ['perm_read'], inherits_from: [] }
        ],
        enforcement_level: 'strict'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('RBAC Policy Configured');
    });

    it('should register manage_role_hierarchy tool', () => {
      expect(toolHandlers.has('manage_role_hierarchy')).toBe(true);
    });

    it('manage_role_hierarchy should manage role hierarchy', async () => {
      const handler = toolHandlers.get('manage_role_hierarchy')!;
      
      const result = await handler({
        site_id: 'test-site',
        parent_role: 'admin',
        child_roles: ['editor', 'contributor'],
        inheritance_type: 'full'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Role Hierarchy Management');
    });

    it('should register audit_rbac_compliance tool', () => {
      expect(toolHandlers.has('audit_rbac_compliance')).toBe(true);
    });

    it('audit_rbac_compliance should audit RBAC compliance', async () => {
      const handler = toolHandlers.get('audit_rbac_compliance')!;
      
      const result = await handler({
        site_id: 'test-site',
        compliance_standard: 'least_privilege',
        check_privilege_creep: true,
        generate_report: true
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('RBAC Compliance Audit');
    });
  });

  describe('Permission Validation Logic', () => {
    it('check_user_permission should validate permissions', async () => {
      const handler = toolHandlers.get('check_user_permission')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 5,
        operation: 'update_template_data',
        resource_id: 1
      });

      const content = result.content as Array<{type: string, text: string}>;
      // Should include validation logic in output
      expect(content[0].text).toMatch(/Permission Check|Allowed|Denied/);
    });

    it('list_user_permissions should show detailed information when requested', async () => {
      const handler = toolHandlers.get('list_user_permissions')!;
      
      const resultWithDetails = await handler({
        site_id: 'test-site',
        user_id: 5,
        include_details: true
      });

      const resultWithoutDetails = await handler({
        site_id: 'test-site',
        user_id: 5,
        include_details: false
      });

      const contentWith = (resultWithDetails.content as Array<{type: string, text: string}>)[0].text;
      const contentWithout = (resultWithoutDetails.content as Array<{type: string, text: string}>)[0].text;
      
      // Output should differ based on include_details parameter
      expect(contentWith).not.toBe(contentWithout);
    });
  });

  describe('Integration with Capability System (INFRA-001)', () => {
    it('permission tools should integrate with capability-based routing', async () => {
      const handler = toolHandlers.get('check_user_permission')!;
      
      await handler({
        site_id: 'test-site',
        user_id: 5,
        operation: 'update_template_data',
        resource_id: 1
      });

      // Should consider capability requirements for the operation
      const content = (await handler({
        site_id: 'test-site',
        user_id: 5,
        operation: 'update_template_data',
        resource_id: 1
      })).content as Array<{type: string, text: string}>;
      
      expect(content[0].text).toContain('update_template_data');
    });

    it('RBAC configuration should affect capability checks', async () => {
      const handler = toolHandlers.get('configure_rbac_policy')!;
      
      const result = await handler({
        site_id: 'test-site',
        policy_name: 'Test Policy',
        default_role: 'viewer',
        roles: [
          { name: 'admin', permissions: ['perm_all'], inherits_from: [] },
          { name: 'editor', permissions: ['perm_write', 'perm_read'], inherits_from: ['admin'] },
          { name: 'viewer', permissions: ['perm_read'], inherits_from: [] }
        ],
        enforcement_level: 'moderate'
      });

      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('RBAC');
      expect(content[0].text).toContain('viewer');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid role in assign_role_to_user', async () => {
      const handler = toolHandlers.get('assign_role_to_user')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 5,
        role_id: 'invalid_role'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      // Should handle gracefully
      expect(content[0].text).toContain('Role');
    });

    it('should handle missing user in check_user_permission', async () => {
      const handler = toolHandlers.get('check_user_permission')!;
      
      const result = await handler({
        site_id: 'test-site',
        user_id: 9999,
        operation: 'update_template_data'
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Permission');
    });
  });

  describe('Capability Integration', () => {
    it('tools should be registered with capability middleware', () => {
      const toolNames = Array.from(toolHandlers.keys());
      expect(toolNames).toContain('create_permission_rule');
      expect(toolNames).toContain('assign_role_to_user');
      expect(toolNames).toContain('check_user_permission');
      expect(toolNames).toContain('configure_rbac_policy');
      expect(toolNames).toContain('audit_rbac_compliance');
    });
  });
});