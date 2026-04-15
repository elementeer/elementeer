import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildSiteFingerprint } from '../../fingerprint.js';
import { registerFingerprintTools } from '../../tools/fingerprint.js';
import type {
  ElementifyClient,
  SiteAssessment,
  SiteFingerprintSignal,
} from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Fingerprint Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: {
      version: '3.20.0',
      pro: true,
      pro_version: '3.20.0',
      active_kit_id: 42,
    },
    brand: {
      logo_set: true,
      logo_id: 1,
      global_colors_count: 4,
      global_typography_count: 4,
    },
    theme_builder: {
      header: [{ id: 10, title: 'Header', status: 'publish' }],
      footer: [{ id: 11, title: 'Footer', status: 'publish' }],
      single: [],
      'single-post': [],
      'single-page': [],
      archive: [],
      search: [],
      'error-404': [],
      popup: [],
    },
    template_library: {
      total: 8,
      by_type: { container: 8 },
      uncategorized: 1,
      published: 7,
      draft: 1,
    },
    pages: {
      elementor_total: 5,
      by_post_type: { page: 4, post: 1 },
    },
    performance: {
      css_print_method: 'external',
      optimized_dom: true,
      load_fa4_shim: false,
    },
    plugins: {
      active_count: 8,
      classified: { woocommerce: ['woocommerce'] },
      woocommerce: true,
      multilingual: false,
    },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildSiteFingerprint', () => {
  it('classifies a site with Elementor pages and theme builder coverage as elementor', () => {
    const fingerprint = buildSiteFingerprint(makeAssessment());

    expect(fingerprint.cms).toBe('wordpress');
    expect(fingerprint.builder).toBe('elementor');
    expect(fingerprint.elementorDetected).toBe(true);
    expect(fingerprint.themeBuilderCoverage).toBe(2);
    expect(fingerprint.elementorPageCount).toBe(5);
  });

  it('adds notes when Elementor is active but no pages or theme builder templates exist', () => {
    const fingerprint = buildSiteFingerprint(makeAssessment({
      theme_builder: {
        header: [],
        footer: [],
        single: [],
        'single-post': [],
        'single-page': [],
        archive: [],
        search: [],
        'error-404': [],
        popup: [],
      },
      pages: { elementor_total: 0, by_post_type: {} },
      performance: { css_print_method: 'internal', optimized_dom: false, load_fa4_shim: false },
    }));

    expect(fingerprint.builder).toBe('mixed');
    expect(fingerprint.notes).toContain(
      'Elementor is active, but no published Theme Builder templates were detected.',
    );
    expect(fingerprint.notes).toContain(
      'Elementor is active, but no Elementor-managed pages were detected.',
    );
    expect(fingerprint.notes).toContain(
      'Elementor CSS print method is internal, which suggests performance tuning opportunities.',
    );
  });

  it('includes evidence-rich signals for core platform detection', () => {
    const fingerprint = buildSiteFingerprint(makeAssessment());
    const signalKeys = fingerprint.signals.map(
      (signal: SiteFingerprintSignal) => signal.key,
    );

    expect(signalKeys).toContain('cms_wordpress');
    expect(signalKeys).toContain('elementor_active');
    expect(signalKeys).toContain('woocommerce');
    expect(
      fingerprint.signals.every(
        (signal: SiteFingerprintSignal) => signal.evidence.length > 0,
      ),
    ).toBe(true);
  });
});

describe('get_site_fingerprint tool', () => {
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

    registerFingerprintTools(server, getClient);
  });

  it('registers get_site_fingerprint and renders summary with signals', async () => {
    const handler = handlers.get('get_site_fingerprint');
    if (!handler) {
      throw new Error('get_site_fingerprint not registered');
    }

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(client.assessSite).toHaveBeenCalled();
    expect(text).toContain('Site Fingerprint');
    expect(text).toContain('Builder: elementor');
    expect(text).toContain('## Signals');
    expect(text).toContain('Elementor active');
    expect(text).toContain('WooCommerce: yes');
  });
});
