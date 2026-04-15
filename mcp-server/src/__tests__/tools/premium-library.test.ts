import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPremiumLibraryTools } from '../../tools/premium-library.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Premium Tool Test',
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
    theme_builder: { header: [], footer: [] },
    template_library: {
      total: 4,
      by_type: { section: 4 },
      uncategorized: 0,
      published: 4,
      draft: 0,
    },
    pages: {
      elementor_total: 2,
      by_post_type: { page: 2 },
    },
    performance: {
      css_print_method: 'external',
      optimized_dom: true,
      load_fa4_shim: false,
    },
    plugins: {
      active_count: 3,
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

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: 'agency',
    site_purpose: 'corporate',
    brand_notes: null,
    target_audience: null,
    primary_language: 'en',
    set_at: '2026-04-09T00:00:00Z',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    importLibraryAsset: vi.fn().mockResolvedValue({
      imported: true,
      import_mode: 'manual-import',
      source: {
        kind: 'elementify-premium',
        asset_id: 'premium-service-section-stack',
        asset_title: 'Premium Service Section Stack',
        reference: 'premium-catalog:premium-service-section-stack',
      },
      template: {
        id: 401,
        title: 'Premium Service Section Stack — Local Import',
        shortcode: '[elementor-template id="401"]',
      },
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('plan_premium_library_usage tool', () => {
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

    registerPremiumLibraryTools(server, getClient);
  });

  it('renders a local-site premium library usage plan', async () => {
    const handler = handlers.get('plan_premium_library_usage');
    if (!handler) throw new Error('plan_premium_library_usage not registered');

    const result = await handler({
      asset_id: 'premium-service-section-stack',
      target_type: 'section-starter',
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Premium Library Usage Plan');
    expect(text).toContain('Import mode: manual-import');
    expect(text).toContain('Selected asset title: Premium Service Section Stack');
    expect(text).toContain('## Guardrails');
    expect(text).toContain('Collection: Service pages');
    expect(text).toContain('Curation level: Featured');
  });
});

describe('list_premium_library_assets tool', () => {
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

    registerPremiumLibraryTools(server, getClient);
  });

  it('renders the curated catalog list', async () => {
    const handler = handlers.get('list_premium_library_assets');
    if (!handler) throw new Error('list_premium_library_assets not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Premium Library Catalog');
    expect(text).toContain('Premium Hero Conversion Stack');
    expect(text).toContain('### Conversion systems');
    expect(text).toContain('### Theme Builder structure');
    expect(text).toContain('Curation: Signature');
    expect(text).toContain('## Catalog');
  });
});

describe('inspect_premium_library_asset tool', () => {
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

    registerPremiumLibraryTools(server, getClient);
  });

  it('renders a premium asset inspection report', async () => {
    const handler = handlers.get('inspect_premium_library_asset');
    if (!handler) throw new Error('inspect_premium_library_asset not registered');

    const result = await handler({ asset_id: 'premium-theme-foundation-header' });
    const text = result.content[0]!.text;

    expect(text).toContain('Premium Library Inspection');
    expect(text).toContain('Premium Theme Foundation Header');
    expect(text).toContain('Collection: Theme Builder structure');
    expect(text).toContain('Signals:');
    expect(text).toContain('## Workflow');
  });
});

describe('import_premium_library_asset tool', () => {
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

    registerPremiumLibraryTools(server, getClient);
  });

  it('imports a curated premium asset into the local Elementor Library', async () => {
    const handler = handlers.get('import_premium_library_asset');
    if (!handler) throw new Error('import_premium_library_asset not registered');

    const result = await handler({ asset_id: 'premium-service-section-stack' });
    const text = result.content[0]!.text;

    expect(client.importLibraryAsset).toHaveBeenCalledOnce();
    expect(text).toContain('Premium Library Import');
    expect(text).toContain('Local template id: 401');
    expect(text).toContain('library/import seam');
    expect(text).toContain('## Next Steps');
    expect(text).toContain('Collection: Service pages');
  });
});
