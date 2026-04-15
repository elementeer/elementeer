import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildSiteFingerprint } from '../../fingerprint.js';
import {
  buildCapabilityMatrix,
  buildDestinationProfile,
} from '../../destination.js';
import { registerDestinationTools } from '../../tools/destination.js';
import type {
  Capability,
  ElementifyClient,
  SiteAssessment,
} from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Destination Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: {
      version: '3.20.0',
      pro: false,
      pro_version: null,
      active_kit_id: 1,
    },
    brand: {
      logo_set: true,
      logo_id: 1,
      global_colors_count: 4,
      global_typography_count: 4,
    },
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
    template_library: {
      total: 5,
      by_type: { container: 5 },
      uncategorized: 0,
      published: 5,
      draft: 0,
    },
    pages: {
      elementor_total: 3,
      by_post_type: { page: 3 },
    },
    performance: {
      css_print_method: 'external',
      optimized_dom: true,
      load_fa4_shim: false,
    },
    plugins: {
      active_count: 4,
      classified: {},
      woocommerce: false,
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

describe('destination profile and capability matrix', () => {
  it('classifies plain Elementor installs as elementor-free', () => {
    const assessment = makeAssessment();
    const fingerprint = buildSiteFingerprint(assessment);
    const destination = buildDestinationProfile(assessment, fingerprint);

    expect(destination.kind).toBe('elementor-free');
  });

  it('classifies Elementor Pro installs as elementor-pro', () => {
    const assessment = makeAssessment({
      elementor: { version: '3.20.0', pro: true, pro_version: '3.20.0', active_kit_id: 1 },
    });
    const fingerprint = buildSiteFingerprint(assessment);
    const destination = buildDestinationProfile(assessment, fingerprint);

    expect(destination.kind).toBe('elementor-pro');
  });

  it('classifies plugin-assisted Elementor when helper plugins are present without Pro', () => {
    const assessment = makeAssessment({
      plugins: {
        active_count: 6,
        classified: { multilingual: ['polylang'] },
        woocommerce: false,
        multilingual: true,
      },
    });
    const fingerprint = buildSiteFingerprint(assessment);
    const destination = buildDestinationProfile(assessment, fingerprint);

    expect(destination.kind).toBe('plugin-assisted-elementor');
  });

  it('builds capability warnings when WooCommerce lacks Elementor Pro support', () => {
    const assessment = makeAssessment({
      plugins: {
        active_count: 6,
        classified: { woocommerce: ['woocommerce'] },
        woocommerce: true,
        multilingual: false,
      },
    });
    const fingerprint = buildSiteFingerprint(assessment);
    const matrix = buildCapabilityMatrix(assessment, fingerprint);

    expect(
      matrix.capabilities.find(
        (capability: Capability) => capability.id === 'woocommerce-templates',
      )?.available,
    ).toBe(false);
    expect(matrix.warnings).toContain(
      'WooCommerce is active, but WooCommerce template workflows may need Elementor Pro.',
    );
  });
});

describe('get_destination_capabilities tool', () => {
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

    registerDestinationTools(server, getClient);
  });

  it('renders a destination profile and capability matrix summary', async () => {
    const handler = handlers.get('get_destination_capabilities');
    if (!handler) {
      throw new Error('get_destination_capabilities not registered');
    }

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(client.assessSite).toHaveBeenCalled();
    expect(text).toContain('Destination Capabilities');
    expect(text).toContain('## Destination Profile');
    expect(text).toContain('## Capability Matrix');
    expect(text).toContain('page-composition');
  });

  it('can append an experimental research preview on demand', async () => {
    const handler = handlers.get('get_destination_capabilities');
    if (!handler) {
      throw new Error('get_destination_capabilities not registered');
    }

    const result = await handler({ include_research: true });
    const text = result.content[0]!.text;

    expect(text).toContain('## Research Preview');
    expect(text).toContain('Experimental only');
  });
});
