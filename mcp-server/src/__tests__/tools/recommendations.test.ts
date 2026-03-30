import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildRecommendations, registerRecommendationTools } from '../../tools/recommendations.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

// ------------------------------------------------------------------ //
// Fixtures
// ------------------------------------------------------------------ //

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-03-29T00:00:00Z',
    wordpress: { version: '6.4', language: 'en_US', timezone: 'UTC', is_multisite: false, site_name: 'Test', site_tagline: '', admin_url: 'https://x.com/wp-admin/' },
    elementor: { version: '3.20', pro: true, pro_version: '3.20', active_kit_id: 1 },
    brand: { logo_set: true, logo_id: 5, global_colors_count: 8, global_typography_count: 4 },
    theme_builder: {
      header:        [{ id: 10, title: 'Header', status: 'publish' }],
      footer:        [{ id: 11, title: 'Footer', status: 'publish' }],
      single:        [],
      'single-post': [],
      'single-page': [],
      archive:       [],
      search:        [],
      'error-404':   [{ id: 12, title: '404', status: 'publish' }],
      popup:         [],
    },
    template_library: { total: 8, by_type: { container: 8 }, uncategorized: 2, published: 6, draft: 2 },
    pages: { elementor_total: 5, by_post_type: { page: 5 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 8, classified: { seo: ['seo-by-rank-math'] }, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator', 'editor'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: null,
    site_purpose: null,
    brand_notes: null,
    target_audience: null,
    primary_language: null,
    set_at: null,
    ...overrides,
  };
}

// ------------------------------------------------------------------ //
// Rule engine unit tests (no MCP, no mocks)
// ------------------------------------------------------------------ //

describe('buildRecommendations — rule engine', () => {
  it('returns empty list for a fully configured site', () => {
    const recs = buildRecommendations(makeAssessment(), makeContext());
    expect(recs).toHaveLength(0);
  });

  it('generates set_logo recommendation when logo is missing', () => {
    const recs = buildRecommendations(
      makeAssessment({ brand: { logo_set: false, logo_id: null, global_colors_count: 8, global_typography_count: 4 } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'set_logo')).toBe(true);
    expect(recs.find((r) => r.id === 'set_logo')!.priority).toBe(1);
  });

  it('generates global colors + typography recommendations when both missing', () => {
    const recs = buildRecommendations(
      makeAssessment({ brand: { logo_set: true, logo_id: 1, global_colors_count: 0, global_typography_count: 0 } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'define_global_colors')).toBe(true);
    expect(recs.some((r) => r.id === 'define_global_typography')).toBe(true);
  });

  it('generates header + footer recommendations when Theme Builder is empty', () => {
    const emptyTB = {
      header: [], footer: [], single: [], 'single-post': [], 'single-page': [],
      archive: [], search: [], 'error-404': [], popup: [],
    };
    const recs = buildRecommendations(makeAssessment({ theme_builder: emptyTB }), makeContext());
    expect(recs.some((r) => r.id === 'create_header_template')).toBe(true);
    expect(recs.some((r) => r.id === 'create_footer_template')).toBe(true);
  });

  it('generates single post template rec when posts exist but no single template', () => {
    const recs = buildRecommendations(
      makeAssessment({ pages: { elementor_total: 6, by_post_type: { page: 5, post: 1 } } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'create_single_post_template')).toBe(true);
  });

  it('does NOT generate single post rec when no posts exist', () => {
    const recs = buildRecommendations(makeAssessment(), makeContext());
    expect(recs.some((r) => r.id === 'create_single_post_template')).toBe(false);
  });

  it('generates categorize_templates rec when uncategorized > 5', () => {
    const recs = buildRecommendations(
      makeAssessment({ template_library: { total: 30, by_type: { container: 30 }, uncategorized: 12, published: 30, draft: 0 } }),
      makeContext(),
    );
    const rec = recs.find((r) => r.id === 'categorize_templates');
    expect(rec).toBeDefined();
    expect(rec!.automated).toBe(true);
    expect(rec!.tools).toContain('audit_library');
  });

  it('does NOT generate categorize_templates rec when uncategorized <= 5', () => {
    const recs = buildRecommendations(makeAssessment({ template_library: { total: 10, by_type: {}, uncategorized: 4, published: 10, draft: 0 } }), makeContext());
    expect(recs.some((r) => r.id === 'categorize_templates')).toBe(false);
  });

  it('generates performance rec when CSS is internal', () => {
    const recs = buildRecommendations(
      makeAssessment({ performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: false } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'switch_css_to_external')).toBe(true);
  });

  it('generates SEO plugin rec when no SEO plugin detected', () => {
    const recs = buildRecommendations(
      makeAssessment({ plugins: { active_count: 5, classified: {}, woocommerce: false, multilingual: false } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'install_seo_plugin')).toBe(true);
  });

  it('generates WooCommerce template rec when WC active and no shop template', () => {
    const recs = buildRecommendations(
      makeAssessment({ plugins: { active_count: 10, classified: { woocommerce: ['woocommerce'] }, woocommerce: true, multilingual: false } }),
      makeContext(),
    );
    expect(recs.some((r) => r.id === 'create_woocommerce_templates')).toBe(true);
  });

  it('returns only automated recs for ai-agent role', () => {
    const recs = buildRecommendations(
      makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
        template_library: { total: 30, by_type: {}, uncategorized: 15, published: 30, draft: 0 },
      }),
      makeContext({ user_role: 'ai-agent' }),
    );
    expect(recs.every((r) => r.automated)).toBe(true);
    // set_logo is now automated (via set_site_logo); define_global_colors and categorize_templates also ARE
    expect(recs.some((r) => r.id === 'set_logo')).toBe(true);
    expect(recs.some((r) => r.id === 'define_global_colors')).toBe(true);
    expect(recs.some((r) => r.id === 'categorize_templates')).toBe(true);
  });

  it('returns recommendations sorted by priority', () => {
    const recs = buildRecommendations(
      makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
        theme_builder: { header: [], footer: [], single: [], 'single-post': [], 'single-page': [], archive: [], search: [], 'error-404': [], popup: [] },
        performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: true },
      }),
      makeContext(),
    );
    const priorities = recs.map((r) => r.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });
});

// ------------------------------------------------------------------ //
// MCP tool tests
// ------------------------------------------------------------------ //

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn(),
    updateTemplateData: vi.fn(),
    getSiteInfo: vi.fn(),
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    setSiteContext: vi.fn().mockImplementation(async (ctx) => ({ ...makeContext(), ...ctx, set_at: '2026-03-29T00:00:00Z' })),
    listElementorPages: vi.fn(),
    getPageData: vi.fn(),
    updatePageData: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('recommendation MCP tools', () => {
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

    registerRecommendationTools(server, getClient);
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const h = handlers.get(name);
    if (!h) throw new Error(`Tool "${name}" not registered`);
    return h(args) as Promise<{ content: Array<{ text: string }> }>;
  };

  describe('set_site_context', () => {
    it('calls setSiteContext with provided fields', async () => {
      await call('set_site_context', { user_role: 'freelancer', site_purpose: 'corporate' });
      expect(client.setSiteContext).toHaveBeenCalledWith({ user_role: 'freelancer', site_purpose: 'corporate' });
    });

    it('shows saved context in output', async () => {
      const result = await call('set_site_context', { user_role: 'agency', site_purpose: 'ecommerce' });
      const text = result.content[0]!.text;
      expect(text).toContain('agency');
      expect(text).toContain('ecommerce');
    });
  });

  describe('get_site_context', () => {
    it('shows "not set" message when context is empty', async () => {
      const result = await call('get_site_context', {});
      const text = result.content[0]!.text;
      expect(text).toContain('No site context');
    });

    it('shows context when set_at is present', async () => {
      vi.mocked(client.getSiteContext).mockResolvedValueOnce({
        user_role: 'freelancer', site_purpose: 'portfolio', brand_notes: 'Modern',
        target_audience: 'Designers', primary_language: 'en', set_at: '2026-03-29T00:00:00Z',
      });
      const result = await call('get_site_context', {});
      const text = result.content[0]!.text;
      expect(text).toContain('freelancer');
      expect(text).toContain('portfolio');
    });
  });

  describe('get_recommendations', () => {
    it('calls assessSite and getSiteContext', async () => {
      await call('get_recommendations', {});
      expect(client.assessSite).toHaveBeenCalled();
      expect(client.getSiteContext).toHaveBeenCalled();
    });

    it('returns "no recommendations" for a clean site', async () => {
      const result = await call('get_recommendations', {});
      const text = result.content[0]!.text;
      expect(text).toContain('No recommendations');
    });

    it('returns recommendations when issues exist', async () => {
      vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
      }));
      const result = await call('get_recommendations', {});
      const text = result.content[0]!.text;
      expect(text).toContain('set_logo');
      expect(text).toContain('define_global_colors');
    });

    it('filters by category', async () => {
      vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
        performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: false },
      }));
      const result = await call('get_recommendations', { category: 'performance' });
      const text = result.content[0]!.text;
      expect(text).toContain('switch_css_to_external');
      expect(text).not.toContain('set_logo');
    });

    it('automated_only filter removes non-automated recs', async () => {
      vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
        performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: false },
        template_library: { total: 30, by_type: {}, uncategorized: 15, published: 30, draft: 0 },
      }));
      const result = await call('get_recommendations', { automated_only: true });
      const text = result.content[0]!.text;
      // set_logo is now automated (via set_site_logo tool)
      expect(text).toContain('set_logo');
      // switch_css_to_external is NOT automated — should not appear
      expect(text).not.toContain('switch_css_to_external');
      expect(text).toContain('categorize_templates');
    });

    it('respects max_results', async () => {
      vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
        brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
        theme_builder: { header: [], footer: [], single: [], 'single-post': [], 'single-page': [], archive: [], search: [], 'error-404': [], popup: [] },
        performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: true },
        plugins: { active_count: 5, classified: {}, woocommerce: false, multilingual: false },
      }));
      const result = await call('get_recommendations', { max_results: 2 });
      const text = result.content[0]!.text;
      const count = (text.match(/^##/gm) ?? []).length;
      expect(count).toBeLessThanOrEqual(2);
    });
  });
});
