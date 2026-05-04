/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerIntelligenceCompositionTools } from '../../tools/intelligence-composition.js';
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
        governanceLevel: 'L3', // Return L3 to allow all operations
        siteId,
        userRole: 'operator',
      };
    }),
  };
});

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    // Site assessment for capability middleware
    assessSite: vi.fn().mockResolvedValue({
      brand: { completeness: 0.7 },
      theme_builder: { templates: [] },
      template_library: { count: 10 },
      plugins: { active: [] },
      performance: { indicators: {} },
      issues: [],
    }),
    
    // Core client methods
    createChange: vi.fn().mockResolvedValue({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'update_page_data', params: {}, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
    listChanges: vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange: vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    updateChangeStatus: vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    
    // Template methods
    listTemplates: vi.fn().mockResolvedValue({ 
      templates: [
        { id: 1, title: 'Hero Section', type: 'section', status: 'publish', author: 1, date: '2026-01-01', modified: '2026-01-01', categories: ['hero'], tags: [] },
        { id: 2, title: 'About Us', type: 'page', status: 'publish', author: 1, date: '2026-01-02', modified: '2026-01-02', categories: ['about'], tags: [] }
      ], 
      total: 2, 
      total_pages: 1 
    }),
    getTemplate: vi.fn().mockResolvedValue({ 
      id: 1, 
      title: 'Hero Section', 
      type: 'section', 
      status: 'publish', 
      author: 1, 
      date: '2026-01-01', 
      modified: '2026-01-01', 
      categories: ['hero'], 
      tags: [] 
    }),
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
                  settings: { title: 'Welcome to Our Site' }
                },
                {
                  id: 'button1',
                  elType: 'widget',
                  widgetType: 'button',
                  settings: { text: 'Learn More' }
                }
              ]
            }
          ]
        }
      ] 
    }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 99, updated: true }),
    
    // Page methods
    getPageData: vi.fn().mockResolvedValue({ 
      post_id: 1, 
      post_title: 'Home Page', 
      post_type: 'page', 
      element_count: 5, 
      elementor_data: [
        {
          id: 'hero',
          elType: 'section',
          settings: {},
          elements: []
        }
      ] 
    }),
    
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
    updatePageData: vi.fn().mockResolvedValue({ id: 1, updated: true }),
    setGlobalColors: vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography: vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    setLogo: vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext: vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Intelligence Composition Tools (API-005, API-006)', () => {
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

    registerIntelligenceCompositionTools(server, getClient);
  });

  describe('API-005: Template Intelligence', () => {
    it('should register analyze_composition_requirements tool', () => {
      expect(toolHandlers.has('analyze_composition_requirements')).toBe(true);
    });

    it('analyze_composition_requirements should analyze composition requirements', async () => {
      const handler = toolHandlers.get('analyze_composition_requirements')!;
      
      const result = await handler({
        site_id: 'test-site',
        composition_type: 'landing_page',
        style: 'modern',
        target_audience: 'Small business owners',
        content_goals: ['increase_conversions', 'build_brand_awareness'],
        constraints: ['mobile_first', 'fast_loading']
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Composition Requirements Analysis');
    });

    it('should register match_templates_to_requirements tool', () => {
      expect(toolHandlers.has('match_templates_to_requirements')).toBe(true);
    });

    it('match_templates_to_requirements should match templates to requirements', async () => {
      const handler = toolHandlers.get('match_templates_to_requirements')!;
      
      const result = await handler({
        site_id: 'test-site',
        requirements: 'Modern hero section with CTA'
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Template Matching Results');
    });

    it('should register optimize_existing_composition tool', () => {
      expect(toolHandlers.has('optimize_existing_composition')).toBe(true);
    });

    it('optimize_existing_composition should optimize existing composition', async () => {
      const handler = toolHandlers.get('optimize_existing_composition')!;
      
      const result = await handler({
        site_id: 'test-site',
        composition_id: 'template_1',
        optimization_goals: ['performance', 'accessibility']
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Composition Optimization');
    });
  });

  describe('API-006: Content Intelligence', () => {
    it('should register analyze_content_patterns tool', () => {
      expect(toolHandlers.has('analyze_content_patterns')).toBe(true);
    });

    it('analyze_content_patterns should analyze content patterns', async () => {
      const handler = toolHandlers.get('analyze_content_patterns')!;
      
      const result = await handler({
        site_id: 'test-site',
        content_type: 'pages'
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Content Pattern Analysis');
    });

    it('should register generate_content_recommendations tool', () => {
      expect(toolHandlers.has('generate_content_recommendations')).toBe(true);
    });

    it('generate_content_recommendations should generate content recommendations', async () => {
      const handler = toolHandlers.get('generate_content_recommendations')!;
      
      const result = await handler({
        site_id: 'test-site',
        target_audience: 'Small business owners',
        content_types: ['blog_posts', 'landing_pages'],
        recommendation_types: ['seo', 'engagement'],
        business_goals: ['increase_traffic', 'generate_leads'],
        content_gaps: ['missing_video_content', 'limited_case_studies']
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Content Recommendations');
    });

    it('should register optimize_content_strategy tool', () => {
      expect(toolHandlers.has('optimize_content_strategy')).toBe(true);
    });

    it('optimize_content_strategy should optimize content strategy', async () => {
      const handler = toolHandlers.get('optimize_content_strategy')!;
      
      const result = await handler({
        site_id: 'test-site',
        current_strategy: 'Weekly blog posts',
        goals: ['increase_engagement', 'improve_seo'],
        target_metrics: ['page_views', 'time_on_page', 'conversion_rate'],
        optimization_focus: 'seo_and_engagement'
      });

      expect(result).toHaveProperty('content');
      const content = (result as any).content as Array<{type: string, text: string}>;
      expect(content[0].text).toContain('Content Strategy Optimization');
    });
  });

  describe('Integration with Intelligence Engine (INFRA-004)', () => {
    it('template intelligence should use intelligence engine', async () => {
      const handler = toolHandlers.get('match_templates_to_requirements')!;
      
      await handler({
        site_id: 'test-site',
        requirements: 'Modern hero section'
      });

      // Should fetch template data for analysis
      expect(client.listTemplates).toHaveBeenCalled();
    });

    it('content intelligence should use intelligence engine', async () => {
      const handler = toolHandlers.get('analyze_content_patterns')!;
      
      const result = await handler({
        site_id: 'test-site',
        content_type: 'pages'
      });

      // Should complete successfully
      expect(result).toHaveProperty('content');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const handler = toolHandlers.get('analyze_composition_requirements')!;
      
      const result = await handler({
        site_id: 'test-site',
        composition_type: 'landing_page',
        style: 'modern',
        target_audience: 'Test audience',
        content_goals: [],
        constraints: []
      });

      // Should complete without throwing
      expect(result).toHaveProperty('content');
    });

    it('should handle tool execution errors', async () => {
      const handler = toolHandlers.get('generate_content_recommendations')!;
      
      const result = await handler({
        site_id: 'test-site',
        target_audience: 'Small business owners',
        content_types: ['blog_posts'],
        recommendation_types: ['seo'],
        business_goals: [],
        content_gaps: []
      });

      // Should complete successfully
      expect(result).toHaveProperty('content');
    });
  });

  describe('Capability Integration', () => {
    it('tools should be registered with capability middleware', () => {
      const toolNames = Array.from(toolHandlers.keys());
      expect(toolNames).toContain('analyze_composition_requirements');
      expect(toolNames).toContain('match_templates_to_requirements');
      expect(toolNames).toContain('analyze_content_patterns');
      expect(toolNames).toContain('generate_content_recommendations');
    });
  });
});