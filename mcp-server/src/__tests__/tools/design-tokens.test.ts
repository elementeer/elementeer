import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildDesignTokenReport } from '../../design-tokens.js';
import { registerDesignTokenTools } from '../../tools/design-tokens.js';
import type { ElementifyClient, GlobalStylesData, SiteAssessment } from '../../client.js';

function makeStylesData(overrides: Partial<GlobalStylesData> = {}): GlobalStylesData {
  return {
    kit_id: 42,
    system_colors: [
      { _id: 'primary', title: 'Primary', color: '#1A56DB' },
      { _id: 'text', title: 'Text', color: '#111827' },
    ],
    custom_colors: [
      { _id: 'brand-teal', title: 'Brand Teal', color: '#0D9488' },
    ],
    system_typography: [
      {
        _id: 'primary',
        title: 'Primary',
        typography_font_family: 'Inter',
        typography_font_weight: '400',
        typography_font_size: { unit: 'px', size: 16 },
        typography_line_height: { unit: 'em', size: 1.6 },
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
      site_name: 'Design Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: { version: '3.20', pro: true, pro_version: '3.20', active_kit_id: 42 },
    brand: { logo_set: true, logo_id: 5, global_colors_count: 3, global_typography_count: 1 },
    theme_builder: { header: [], footer: [] },
    template_library: { total: 3, by_type: { section: 3 }, uncategorized: 0, published: 3, draft: 0 },
    pages: { elementor_total: 2, by_post_type: { page: 2 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 5, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getGlobalStyles: vi.fn().mockResolvedValue(makeStylesData()),
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildDesignTokenReport', () => {
  it('extracts color and typography tokens from global styles', () => {
    const report = buildDesignTokenReport(makeStylesData(), makeAssessment());

    expect(report.colors).toHaveLength(3);
    expect(report.typography[0]!.fontFamily).toBe('Inter');
    expect(report.spacing[0]!.pixels).toBe(8);
  });

  it('falls back gracefully when no typography is defined', () => {
    const report = buildDesignTokenReport(
      makeStylesData({ system_typography: [], custom_typography: [] }),
      makeAssessment(),
    );

    expect(report.spacing[1]!.pixels).toBe(16);
    expect(report.notes.some((note) => note.includes('16px baseline'))).toBe(true);
  });
});

describe('extract_design_tokens tool', () => {
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

    registerDesignTokenTools(server, getClient);
  });

  it('registers and renders a token report', async () => {
    const handler = handlers.get('extract_design_tokens');
    if (!handler) throw new Error('extract_design_tokens not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Design Token Report');
    expect(text).toContain('## Colors');
    expect(text).toContain('Brand Teal');
    expect(text).toContain('## Spacing Hints');
  });
});
