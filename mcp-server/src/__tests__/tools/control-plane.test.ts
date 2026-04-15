import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildCapabilityMatrix } from '../../destination.js';
import { buildSiteFingerprint } from '../../fingerprint.js';
import { buildPipelinePathPlan } from '../../control-plane.js';
import { buildRecommendationReport } from '../../recommendations.js';
import { registerControlPlaneTools } from '../../tools/control-plane.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.4',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Control Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: { version: '3.20', pro: false, pro_version: null, active_kit_id: 1 },
    brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
    theme_builder: { header: [], footer: [] },
    template_library: { total: 4, by_type: { section: 4 }, uncategorized: 0, published: 4, draft: 0 },
    pages: { elementor_total: 2, by_post_type: { page: 2 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 4, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 1, info: 0 },
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

function makeReport(assessment: SiteAssessment, context: SiteContext) {
  const fingerprint = buildSiteFingerprint(assessment);
  const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
  return buildRecommendationReport({ assessment, context, fingerprint, capabilityMatrix });
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildPipelinePathPlan', () => {
  it('builds a brand-first path for adapt-to-brand intent', () => {
    const assessment = makeAssessment();
    const context = makeContext();
    const plan = buildPipelinePathPlan('adapt-to-brand', assessment, makeReport(assessment, context));

    expect(plan.suggestedTools[0]).toBe('set_site_context');
    expect(plan.gates[0]).toContain('logo');
  });
});

describe('control-plane tool', () => {
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

    registerControlPlaneTools(server, getClient);
  });

  it('suggests a deterministic tool path for an intent', async () => {
    const handler = handlers.get('suggest_pipeline_path');
    if (!handler) throw new Error('suggest_pipeline_path not registered');

    const result = await handler({ intent: 'optimize-for-existing-destination' });
    const text = result.content[0]!.text;

    expect(text).toContain('Pipeline Path');
    expect(text).toContain('get_destination_capabilities');
    expect(text).toContain('## Gates');
  });
});
