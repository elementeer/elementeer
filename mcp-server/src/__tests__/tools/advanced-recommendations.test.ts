import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedRecommendationTools } from '../../tools/advanced-recommendations.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-10T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Advanced Tool Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: {
      version: '3.20.0',
      pro: true,
      pro_version: '3.20.0',
      active_kit_id: 1,
    },
    brand: {
      logo_set: true,
      logo_id: 10,
      global_colors_count: 4,
      global_typography_count: 2,
    },
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], 'error-404': [] },
    template_library: { total: 8, by_type: { section: 8 }, uncategorized: 1, published: 8, draft: 0 },
    pages: { elementor_total: 4, by_post_type: { page: 4 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 3, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: 'agency',
    site_purpose: 'corporate',
    brand_notes: 'Clear premium positioning.',
    target_audience: 'B2B teams',
    primary_language: 'en',
    set_at: '2026-04-10T00:00:00Z',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('advanced recommendation tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);
    handlers = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      handlers.set(args[0] as string, args[args.length - 1] as any);
      return server as any;
    });

    registerAdvancedRecommendationTools(server, getClient);
  });

  it('renders additive Advanced recommendation tracks', async () => {
    const handler = handlers.get('get_advanced_recommendations');
    if (!handler) throw new Error('get_advanced_recommendations not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Advanced Recommendations');
    expect(text).toContain('Foundation Dependencies');
    expect(text).toContain('Brand Adaptation');
    expect(text).toContain('Premium Library');
    expect(text).toContain('Upgrade Guidance');
    expect(text).toContain('Productivity Layer');
  });

  it('filters to a single workflow track when requested', async () => {
    const handler = handlers.get('get_advanced_recommendations');
    if (!handler) throw new Error('get_advanced_recommendations not registered');

    const result = await handler({ workflow_track: 'premium-library' });
    const text = result.content[0]!.text;

    expect(text).toContain('Premium Library');
    expect(text).not.toContain('Brand Adaptation');
  });

  it('renders an honest upgrade path plan', async () => {
    const handler = handlers.get('plan_advanced_upgrade_path');
    if (!handler) throw new Error('plan_advanced_upgrade_path not registered');

    const result = await handler({
      current_tier: 'advanced',
      scenario: 'premium-rollout',
      target_surface: 'page',
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Advanced Upgrade Path');
    expect(text).toContain('Recommended stack profile:');
    expect(text).toContain('Recommended addon profile:');
    expect(text).toContain('Complexity Tradeoff');
  });
});
