import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildBrandAdaptationPlan } from '../../brand-adaptation.js';
import { buildDesignTokenReport } from '../../design-tokens.js';
import { registerBrandAdaptationTools } from '../../tools/brand-adaptation.js';
import type { ElementifyClient, GlobalStylesData, SiteAssessment, SiteContext } from '../../client.js';

function makeStylesData(overrides: Partial<GlobalStylesData> = {}): GlobalStylesData {
  return {
    kit_id: 42,
    system_colors: [{ _id: 'primary', title: 'Primary', color: '#1A56DB' }],
    custom_colors: [],
    system_typography: [
      {
        _id: 'primary',
        title: 'Primary',
        typography_font_family: 'Inter',
        typography_font_size: { size: 16 },
      },
    ],
    custom_typography: [],
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.4',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Brand Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: { version: '3.20', pro: true, pro_version: '3.20', active_kit_id: 42 },
    brand: { logo_set: true, logo_id: 1, global_colors_count: 1, global_typography_count: 1 },
    theme_builder: { header: [], footer: [] },
    template_library: { total: 2, by_type: { section: 2 }, uncategorized: 0, published: 2, draft: 0 },
    pages: { elementor_total: 1, by_post_type: { page: 1 } },
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
    brand_notes: 'Use a clearer enterprise blue and calmer spacing rhythm.',
    target_audience: null,
    primary_language: 'en',
    set_at: '2026-04-09T00:00:00Z',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getGlobalStyles: vi.fn().mockResolvedValue(makeStylesData()),
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildBrandAdaptationPlan', () => {
  it('creates a deterministic adaptation plan from tokens and context', () => {
    const tokenReport = buildDesignTokenReport(makeStylesData(), makeAssessment());
    const plan = buildBrandAdaptationPlan({
      assessment: makeAssessment(),
      context: makeContext(),
      tokenReport,
    });

    expect(plan.targetBrandSummary).toContain('enterprise blue');
    expect(plan.tokenAnchors[0]).toContain('Primary');
    expect(plan.suggestedActions.length).toBeGreaterThan(0);
  });
});

describe('plan_brand_adaptation tool', () => {
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

    registerBrandAdaptationTools(server, getClient);
  });

  it('renders a brand adaptation plan', async () => {
    const handler = handlers.get('plan_brand_adaptation');
    if (!handler) throw new Error('plan_brand_adaptation not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Brand Adaptation Plan');
    expect(text).toContain('## Token Anchors');
    expect(text).toContain('## Guardrails');
  });
});
