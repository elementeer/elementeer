import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, SiteAssessment, SiteInfo } from '../../client.js';
import { registerIntentWizardTools } from '../../tools/intent-wizard.js';

function makeSiteInfo(overrides: Partial<SiteInfo> = {}): SiteInfo {
  return {
    name: 'Test Site',
    url: 'https://test.example.com',
    wp_version: '6.8.0',
    elementor_version: null,
    elementor_pro: false,
    activation_mode: 'standalone-free',
    template_count: 3,
    capabilities: ['site-audit:read'],
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-12T00:00:00Z',
    wordpress: {
      version: '6.8.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Test Site',
      site_tagline: 'Tagline',
      admin_url: 'https://test.example.com/wp-admin',
    },
    elementor: {
      version: null,
      pro: false,
      pro_version: null,
      active_kit_id: null,
    },
    brand: {
      logo_set: false,
      logo_id: null,
      global_colors_count: 0,
      global_typography_count: 0,
    },
    theme_builder: {},
    template_library: {
      total: 3,
      by_type: { section: 1 },
      uncategorized: 1,
      published: 3,
      draft: 0,
    },
    pages: {
      elementor_total: 0,
      by_post_type: {},
    },
    performance: {
      css_print_method: 'internal',
      optimized_dom: false,
      load_fa4_shim: false,
    },
    plugins: {
      active_count: 1,
      classified: {},
      woocommerce: false,
      multilingual: false,
    },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: {
      critical: 0,
      warning: 0,
      info: 0,
    },
    ...overrides,
  };
}

describe('intent wizard tools', () => {
  let server: McpServer;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;
  let client: ElementifyClient;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    toolHandlers = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    client = {
      getSiteInfo: vi.fn().mockResolvedValue(makeSiteInfo()),
      assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    } as unknown as ElementifyClient;

    registerIntentWizardTools(server, () => client);
  });

  async function callTool(name: string, args: Record<string, unknown>) {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool ${name} not registered`);
    return handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  it('registers the front-door tools', () => {
    expect(toolHandlers.has('route_intent_wizard')).toBe(true);
    expect(toolHandlers.has('plan_stack_bootstrap')).toBe(true);
  });

  it('routes the intent wizard through bootstrap guidance', async () => {
    const result = await callTool('route_intent_wizard', {
      origin: 'wordpress_without_elementor',
      intent: 'bootstrap',
      depth: 'moderate',
      user_posture: 'guided',
      constraints: ['free_only'],
      preservation_priorities: ['keep current content'],
    });

    const text = result.content[0]!.text;
    expect(text).toContain('Intent Route — Bootstrap from existing WordPress without Elementor');
    expect(text).toContain('Wizard: stack-bootstrap-wizard');
    expect(text).toContain('Tier: free');
    expect(text).toContain('Stack profile: Brownfield staged transition baseline');
  });

  it('returns a bootstrap checklist for bootstrap planning', async () => {
    const result = await callTool('plan_stack_bootstrap', {
      starting_point: 'idea_only',
      user_posture: 'guided',
      depth: 'light',
    });

    const text = result.content[0]!.text;
    expect(text).toContain('## Bootstrap Checklist');
    expect(text).toContain('Wizard: new-site-lite-wizard');
    expect(text).toContain('Do not add an addon profile yet.');
  });
});
