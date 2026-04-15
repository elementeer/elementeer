/**
 * Smoke tests: MCP server initializes and registers all expected tools.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../tools/index.js';
import type { ElementifyClient } from '../../client.js';
import { REGISTERED_TOOL_NAMES } from '../../product-tiers.js';

const EXPECTED_TOOLS = [...REGISTERED_TOOL_NAMES] as const;

describe('MCP server smoke tests', () => {
  let server: McpServer;
  let registeredTools: string[];

  beforeEach(() => {
    server = new McpServer({ name: 'elementify-mcp', version: '0.1.0' });
    registeredTools = [];

    // Spy on tool() to capture all registrations
    const originalTool = server.tool.bind(server);
    // @ts-expect-error — intentionally replacing with a spy
    server.tool = (name: string, ...rest: unknown[]) => {
      registeredTools.push(name);
      return (originalTool as (...args: unknown[]) => unknown)(name, ...rest);
    };

    const mockGetClient = (): ElementifyClient => {
      return {
        listTemplates: async () => ({ templates: [], total: 0, total_pages: 1 }),
        getTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
        createTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
        updateTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
        deleteTemplate: async () => ({ deleted: true, id: 1 }),
        duplicateTemplate: async () => ({ id: 2, title: '', type: 'page', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
        getTemplateData: async () => ({ id: 1, elementor_data: [] }),
        updateTemplateData: async () => ({ id: 1, updated: true }),
        getSiteInfo: async () => ({ name: '', url: '', wp_version: '', elementor_version: null, elementor_pro: false, activation_mode: 'standalone-free', template_count: 0, capabilities: [] }),
        getLogo: async () => ({ logo_id: null, logo_url: null, set: false }),
        setLogo: async () => ({ logo_id: 1, logo_url: null, updated: true as const }),
        getGlobalStyles: async () => ({ kit_id: 1, system_colors: [], custom_colors: [], system_typography: [], custom_typography: [] }),
        setGlobalColors: async () => ({ kit_id: 1, slot: 'system_colors', colors: [], updated: true as const }),
        setGlobalTypography: async () => ({ kit_id: 1, slot: 'system_typography', typography: [], updated: true as const }),
        getSiteContext: async () => ({ user_role: null, site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: null }),
        setSiteContext: async (ctx: object) => ({ ...ctx, set_at: '' }),
        importLibraryAsset: async () => ({
          imported: true as const,
          import_mode: 'manual-import' as const,
          source: { kind: 'elementify-premium' as const, asset_id: 'premium-service-section-stack' },
          template: { id: 41, title: 'Premium Import', type: 'section', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] },
        }),
        assessSite: async () => ({
          assessed_at: '', wordpress: { version: '', language: '', timezone: '', is_multisite: false, site_name: '', site_tagline: '', admin_url: '' },
          elementor: { version: null, pro: false, pro_version: null, active_kit_id: null },
          brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
          theme_builder: {}, template_library: { total: 0, by_type: {}, uncategorized: 0, published: 0, draft: 0 },
          pages: { elementor_total: 0, by_post_type: {} }, performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: false },
          plugins: { active_count: 0, classified: {}, woocommerce: false, multilingual: false },
          custom_post_types: [], user_roles: [], issues: [], issues_count: { critical: 0, warning: 0, info: 0 },
        }),
        listElementorPages: async () => ({ posts: [], total: 0, total_pages: 1 }),
        getPageData: async () => ({ post_id: 1, post_title: '', post_type: 'page', element_count: 0, elementor_data: [] }),
        updatePageData: async () => ({ id: 1, updated: true as const }),
        sideloadImage: async () => ({ id: 1, url: 'https://example.com/img.jpg', mime_type: 'image/jpeg', title: 'Test' }),
        createThemeBuilderTemplate: async () => ({ id: 1, title: '', type: 'header', status: 'publish', conditions: ['include/general'] }),
        listChanges: async () => ({ changes: [], total: 0 }),
        createChange: async () => ({ id: 'chg_1', created_at: '', status: 'pending' as const, operation: 'set_global_colors', params: {}, note: null, before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
        getChange: async () => ({ id: 'chg_1', created_at: '', status: 'approved' as const, operation: 'set_global_colors', params: {}, note: null, before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
        updateChangeStatus: async () => ({ id: 'chg_1', created_at: '', status: 'approved' as const, operation: 'set_global_colors', params: {}, note: null, before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
        deleteChange: async () => ({ deleted: true as const, id: 'chg_1' }),
      } as unknown as ElementifyClient;
    };

    registerAllTools(server, mockGetClient);
  });

  it('initializes without throwing', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(McpServer);
  });

  it('registers all expected tools', () => {
    for (const toolName of EXPECTED_TOOLS) {
      expect(registeredTools).toContain(toolName);
    }
  });

  it(`registers exactly ${EXPECTED_TOOLS.length} tools (no missing, no unexpected duplicates)`, () => {
    // Each tool should be registered exactly once
    const counts = registeredTools.reduce(
      (acc, name) => {
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const name of EXPECTED_TOOLS) {
      expect(counts[name], `Tool "${name}" should be registered exactly once`).toBe(1);
    }

    expect(registeredTools.length).toBe(EXPECTED_TOOLS.length);
  });

  it.each(EXPECTED_TOOLS)('tool "%s" is registered', (toolName) => {
    expect(registeredTools).toContain(toolName);
  });
});
