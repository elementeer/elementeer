/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTemplateManagementTools } from '../../tools/template-management.js';
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
        availableCapabilities: new Set([
          'global-styles',
          'page-composition', 
          'change-review',
          'template-management',
          'workflow-staging',
          'intelligence-composition',
          'permissions-management',
        ]),
        governanceLevel: 'L3', // Return L3 to allow restore_template_version
        siteId,
        userRole: 'operator',
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
    
    // Site assessment for capability middleware
    assessSite: vi.fn().mockResolvedValue({
      brand: { completeness: 0.7 },
      theme_builder: { templates: [] },
      template_library: { count: 10 },
      plugins: { active: [] },
      performance: { indicators: {} },
      issues: [],
    }),
    
    // Template methods
    listTemplates: vi.fn().mockResolvedValue({ 
      templates: [
        { id: 1, title: 'Hero Section', type: 'section', status: 'publish', author: 1, date: '2026-01-01', modified: '2026-01-01', categories: ['hero'], tags: [] },
        { id: 2, title: 'Features Grid', type: 'section', status: 'publish', author: 1, date: '2026-01-02', modified: '2026-01-02', categories: ['features'], tags: [] },
        { id: 3, title: 'Contact Form', type: 'section', status: 'draft', author: 1, date: '2026-01-03', modified: '2026-01-03', categories: ['contact'], tags: [] }
      ], 
      total: 3, 
      total_pages: 1 
    }),
    getTemplate: vi.fn().mockImplementation((id: number) => 
      Promise.resolve({ 
        id, 
        title: `Template ${id}`, 
        type: 'section', 
        status: 'publish', 
        author: 1, 
        date: '2026-01-01', 
        modified: '2026-01-01', 
        categories: [], 
        tags: [] 
      })
    ),
    createTemplate: vi.fn().mockResolvedValue({ id: 99, title: 'New Template', type: 'container', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    updateTemplate: vi.fn().mockResolvedValue({ id: 99, title: 'Updated Template', type: 'container', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    deleteTemplate: vi.fn().mockResolvedValue({ id: 99, deleted: true }),
    duplicateTemplate: vi.fn().mockResolvedValue({ id: 100, title: 'Copy of Template', type: 'container', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
    getTemplateData: vi.fn().mockResolvedValue({ 
      id: 1, 
      elementor_data: [
        {
          id: 'section1',
          elType: 'section',
          settings: { title: 'Hero Section' },
          elements: [
            {
              id: 'column1',
              elType: 'column',
              settings: {},
              elements: [
                {
                  id: 'heading1',
                  elType: 'widget',
                  widgetType: 'heading',
                  settings: { title: 'Welcome' }
                }
              ]
            }
          ]
        }
      ] 
    }),
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

describe('Template Management Tools (API-001, API-002)', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    mockClient = client; // Set for config mock
    
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerTemplateManagementTools(server, getClient);
  });

  describe('API-001: Enhanced Template Management', () => {
    it('should register list_templates_enhanced tool', () => {
      expect(toolHandlers.has('list_templates_enhanced')).toBe(true);
    });

    it('list_templates_enhanced should call client.listTemplates with filters', async () => {
      const handler = toolHandlers.get('list_templates_enhanced')!;
      
      await handler({
        site_id: 'test-site',
        type: 'section',
        status: 'publish',
        search: 'hero',
        page: 1,
        per_page: 20
      });

      expect(client.listTemplates).toHaveBeenCalledWith({
        type: 'section',
        status: 'publish',
        search: 'hero',
        page: 1,
        per_page: 20
      });
    });

    it('should register get_template_versions tool', () => {
      expect(toolHandlers.has('get_template_versions')).toBe(true);
    });

    it('get_template_versions should return template with revision history', async () => {
      const handler = toolHandlers.get('get_template_versions')!;
      
      const result = await handler({
        site_id: 'test-site',
        template_id: 1
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(client.getTemplate).toHaveBeenCalledWith(1);
    });

    it('should register restore_template_version tool', () => {
      expect(toolHandlers.has('restore_template_version')).toBe(true);
    });

    it('restore_template_version should call getTemplate', async () => {
      const handler = toolHandlers.get('restore_template_version')!;
      
      await handler({
        site_id: 'test-site',
        template_id: 1,
        version: 2,
        restoration_note: 'Restored from version 2'
      });

      expect(client.getTemplate).toHaveBeenCalledWith(1);
    });

    it('should register search_templates_advanced tool', () => {
      expect(toolHandlers.has('search_templates_advanced')).toBe(true);
    });

    it('search_templates_advanced should return search results', async () => {
      const handler = toolHandlers.get('search_templates_advanced')!;
      
      const result = await handler({
        site_id: 'test-site',
        query: 'hero',
        search_fields: ['title', 'content']
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Advanced Template Search');
    });
  });

  describe('API-002: Template Composition and Merging', () => {
    it('should register compose_templates tool', () => {
      expect(toolHandlers.has('compose_templates')).toBe(true);
    });

    it('compose_templates should merge multiple templates', async () => {
      const handler = toolHandlers.get('compose_templates')!;
      
      const result = await handler({
        site_id: 'test-site',
        name: 'Composed Template',
        template_ids: [1, 2]
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Template Composition');
    });

    it('should register merge_template_sections tool', () => {
      expect(toolHandlers.has('merge_template_sections')).toBe(true);
    });

    it('merge_template_sections should merge sections from templates', async () => {
      const handler = toolHandlers.get('merge_template_sections')!;
      
      const result = await handler({
        site_id: 'test-site',
        target_template_id: 1,
        source_sections: [
          { template_id: 2, section_index: 0 }
        ]
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Template Section Merging');
    });

    it('should register extract_template_components tool', () => {
      expect(toolHandlers.has('extract_template_components')).toBe(true);
    });

    it('extract_template_components should extract reusable components', async () => {
      const handler = toolHandlers.get('extract_template_components')!;
      
      const result = await handler({
        site_id: 'test-site',
        template_id: 1,
        component_types: ['hero', 'features']
      });

      expect(result).toHaveProperty('content');
      const content = result.content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Template Component Extraction');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in list_templates_enhanced', async () => {
      vi.mocked(client.listTemplates).mockRejectedValueOnce(new Error('API Error'));
      const handler = toolHandlers.get('list_templates_enhanced')!;
      
      // The error should propagate through the handler
      await expect(handler({
        site_id: 'test-site'
      })).rejects.toThrow('API Error');
    });

    it('should handle missing template in get_template_versions', async () => {
      vi.mocked(client.getTemplate).mockRejectedValueOnce(new Error('Template not found'));
      const handler = toolHandlers.get('get_template_versions')!;
      
      // The error should propagate through the handler
      await expect(handler({
        site_id: 'test-site',
        template_id: 999
      })).rejects.toThrow('Template not found');
    });
  });

  describe('Capability Integration', () => {
    it('tools should be registered with capability middleware', () => {
      // Check that tools are registered (they use withCapabilityCheck internally)
      const toolNames = Array.from(toolHandlers.keys());
      expect(toolNames).toContain('list_templates_enhanced');
      expect(toolNames).toContain('get_template_versions');
      expect(toolNames).toContain('compose_templates');
      expect(toolNames).toContain('merge_template_sections');
    });
  });
});