import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAssessmentTools } from '../../tools/assessment.js';
import type { ElementifyClient, SiteAssessment } from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-03-29T00:00:00Z',
    wordpress: { version: '6.4.2', language: 'en_US', timezone: 'UTC', is_multisite: false, site_name: 'Test Site', site_tagline: 'Just a test', admin_url: 'https://example.com/wp-admin/' },
    elementor: { version: '3.20.0', pro: true, pro_version: '3.20.0', active_kit_id: 42 },
    brand: { logo_set: true, logo_id: 10, global_colors_count: 8, global_typography_count: 4 },
    theme_builder: {
      header: [{ id: 101, title: 'Main Header', status: 'publish' }],
      footer: [{ id: 102, title: 'Main Footer', status: 'publish' }],
      single: [], 'single-post': [], 'single-page': [], archive: [], search: [], 'error-404': [], popup: [],
    },
    template_library: { total: 30, by_type: { container: 20, widget: 10 }, uncategorized: 3, published: 28, draft: 2 },
    pages: { elementor_total: 15, by_post_type: { page: 12, post: 3 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 12, classified: { seo: ['seo-by-rank-math'], cache: ['litespeed-cache'] }, woocommerce: false, multilingual: false },
    custom_post_types: [{ name: 'portfolio', label: 'Portfolio', rest: true }],
    user_roles: ['administrator', 'editor', 'subscriber'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

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
    listElementorPages: vi.fn(),
    getPageData: vi.fn(),
    updatePageData: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('assess_site tool', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);
    toolHandlers = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerAssessmentTools(server, getClient);
  });

  async function callTool(args: Record<string, unknown> = {}) {
    const handler = toolHandlers.get('assess_site');
    if (!handler) throw new Error('assess_site not registered');
    return handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  it('registers assess_site tool', () => {
    expect(toolHandlers.has('assess_site')).toBe(true);
  });

  it('calls assessSite on the client', async () => {
    await callTool({});
    expect(client.assessSite).toHaveBeenCalled();
  });

  it('passes site_id to getClient', async () => {
    await callTool({ site_id: 'staging' });
    expect(getClient).toHaveBeenCalledWith('staging');
  });

  it('includes site name and stack info in output', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('Test Site');
    expect(text).toContain('WordPress 6.4.2');
    expect(text).toContain('Elementor 3.20.0');
    expect(text).toContain('Pro');
  });

  it('shows brand completeness', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('Logo:');
    expect(text).toContain('Global colors: 8');
    expect(text).toContain('Global typography: 4');
  });

  it('shows theme builder templates', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('header: "Main Header"');
    expect(text).toContain('footer: "Main Footer"');
    expect(text).toContain('single: — none');
  });

  it('renders issues when present', async () => {
    vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
      issues: [
        { severity: 'warning', code: 'no_logo', message: 'No site logo is set.' },
        { severity: 'info', code: 'css_internal_embedding', message: 'CSS embedded inline.' },
      ],
      issues_count: { critical: 0, warning: 1, info: 1 },
    }));

    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('1 warnings');
    expect(text).toContain('[no_logo]');
    expect(text).toContain('[css_internal_embedding]');
  });

  it('shows "No issues detected" when issues array is empty', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('No issues detected');
  });

  it('shows custom post types', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('portfolio');
    expect(text).toContain('Portfolio');
  });

  it('shows classified plugins', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('seo:');
    expect(text).toContain('seo-by-rank-math');
    expect(text).toContain('cache:');
  });

  it('marks missing logo with warning symbol', async () => {
    vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
      brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
    }));

    const result = await callTool({});
    const text = result.content[0]!.text;
    expect(text).toContain('NOT SET');
    expect(text).toContain('Global colors: ⚠ none');
  });

  it('keeps core output sections in a stable order for regression safety', async () => {
    const result = await callTool({});
    const text = result.content[0]!.text;

    const stackIndex = text.indexOf('## Stack');
    const brandIndex = text.indexOf('## Brand');
    const themeBuilderIndex = text.indexOf('## Theme Builder');
    const templateLibraryIndex = text.indexOf('## Template Library');
    const pagesIndex = text.indexOf('## Elementor Pages');
    const performanceIndex = text.indexOf('## Performance');
    const pluginsIndex = text.indexOf('## Plugins (classified)');
    const customPostTypesIndex = text.indexOf('## Custom Post Types');
    const issuesIndex = text.indexOf('## Issues');

    expect(stackIndex).toBeGreaterThan(-1);
    expect(brandIndex).toBeGreaterThan(stackIndex);
    expect(themeBuilderIndex).toBeGreaterThan(brandIndex);
    expect(templateLibraryIndex).toBeGreaterThan(themeBuilderIndex);
    expect(pagesIndex).toBeGreaterThan(templateLibraryIndex);
    expect(performanceIndex).toBeGreaterThan(pagesIndex);
    expect(pluginsIndex).toBeGreaterThan(performanceIndex);
    expect(customPostTypesIndex).toBeGreaterThan(pluginsIndex);
    expect(issuesIndex).toBeGreaterThan(customPostTypesIndex);
  });
});
