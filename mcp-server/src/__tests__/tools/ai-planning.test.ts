import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import {
  buildDeterministicRebuildStrategy,
  buildDeterministicStrategyCritique,
} from '../../ai-planning.js';
import { buildCapabilityMatrix } from '../../destination.js';
import { buildSiteFingerprint } from '../../fingerprint.js';
import { buildRecommendationReport } from '../../recommendations.js';
import { registerAiPlanningTools } from '../../tools/ai-planning.js';
import type { ElementifyClient, RebuildStrategy, SiteAssessment, SiteContext } from '../../client.js';

vi.mock('axios', () => {
  const mockPost = vi.fn();
  return {
    default: { post: mockPost },
    post: mockPost,
  };
});

vi.mock('../../config.js', () => ({
  getIntegrations: vi.fn().mockReturnValue({}),
}));

import { getIntegrations } from '../../config.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.4',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'AI Planning Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: { version: '3.20', pro: false, pro_version: null, active_kit_id: 1 },
    brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], 'error-404': [] },
    template_library: { total: 8, by_type: { section: 8 }, uncategorized: 2, published: 8, draft: 0 },
    pages: { elementor_total: 3, by_post_type: { page: 3, post: 1 } },
    performance: { css_print_method: 'internal', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 4, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 2, info: 0 },
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

describe('deterministic AI planning fallback', () => {
  it('chooses brand-foundation-first when brand primitives are missing', () => {
    const assessment = makeAssessment();
    const context = makeContext();
    const strategy = buildDeterministicRebuildStrategy(
      assessment,
      context,
      makeReport(assessment, context),
    );

    expect(strategy.strategyId).toBe('brand-foundation-first');
    expect(strategy.orderedSteps).toContain('set_logo');
  });

  it('blocks a theme-builder strategy when capability is unavailable', () => {
    const assessment = makeAssessment({
      brand: { logo_set: true, logo_id: 1, global_colors_count: 4, global_typography_count: 4 },
    });
    const context = makeContext();
    const report = makeReport(assessment, context);
    const strategy: RebuildStrategy = {
      strategyId: 'theme-builder-first',
      label: 'Theme Builder first',
      summary: 'Start with header and footer.',
      rationale: ['Test'],
      orderedSteps: ['create_header_template', 'create_footer_template'],
      requiredCapabilities: ['theme-builder'],
      fallbackStrategies: ['destination-first'],
    };

    const critique = buildDeterministicStrategyCritique(report, strategy);
    expect(critique.verdict).toBe('blocked');
  });

  it('keeps destination-first usable while theme-builder capability is still missing', () => {
    const assessment = makeAssessment({
      brand: { logo_set: true, logo_id: 1, global_colors_count: 4, global_typography_count: 4 },
    });
    const context = makeContext();
    const report = makeReport(assessment, context);
    const strategy = buildDeterministicRebuildStrategy(assessment, context, report);
    const critique = buildDeterministicStrategyCritique(report, strategy);

    expect(strategy.strategyId).toBe('destination-first');
    expect(strategy.requiredCapabilities).not.toContain('theme-builder');
    expect(critique.verdict).not.toBe('blocked');
  });
});

describe('AI planning tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);
    handlers = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      handlers.set(args[0] as string, args[args.length - 1] as any);
      return server as any;
    });

    vi.mocked(getIntegrations).mockReturnValue({});
    vi.mocked(axios.post).mockReset();

    registerAiPlanningTools(server, getClient);
  });

  it('returns a deterministic rebuild strategy when AI planning is disabled', async () => {
    const handler = handlers.get('plan_rebuild_strategy');
    if (!handler) throw new Error('plan_rebuild_strategy not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Mode: deterministic');
    expect(text).toContain('## Strategy JSON');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('uses the OpenAI provider when feature flag and key are configured', async () => {
    vi.mocked(getIntegrations).mockReturnValue({
      ai_planning_enabled: true,
      openai_api_key: 'sk-test',
    });
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              strategyId: 'destination-first',
              label: 'Destination first',
              summary: 'Resolve destination constraints first.',
              rationale: ['Capability warnings are active.'],
              orderedSteps: ['unlock_theme_builder_capability', 'define_global_colors'],
              requiredCapabilities: ['theme-builder', 'change-review'],
              fallbackStrategies: ['brand-foundation-first'],
            }),
          },
        }],
      },
    });

    const handler = handlers.get('plan_rebuild_strategy');
    if (!handler) throw new Error('plan_rebuild_strategy not registered');

    const result = await handler({});
    const text = result.content[0]!.text;

    expect(text).toContain('Mode: ai-assisted');
    expect(text).toContain('Destination first');
    expect(axios.post).toHaveBeenCalled();
  });

  it('critiques a supplied strategy and validates JSON input', async () => {
    const handler = handlers.get('critique_rebuild_strategy');
    if (!handler) throw new Error('critique_rebuild_strategy not registered');

    const result = await handler({
      strategy_json: JSON.stringify({
        strategyId: 'theme-builder-first',
        label: 'Theme Builder first',
        summary: 'Start with header and footer.',
        rationale: ['Test'],
        orderedSteps: ['create_header_template', 'create_footer_template'],
        requiredCapabilities: ['theme-builder'],
        fallbackStrategies: ['destination-first'],
      }),
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Verdict: blocked');
    expect(text).toContain('Theme Builder capability');
  });

  it('returns an error for invalid strategy_json', async () => {
    const handler = handlers.get('critique_rebuild_strategy');
    if (!handler) throw new Error('critique_rebuild_strategy not registered');

    const result = await handler({ strategy_json: '{"invalid":true}' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('valid RebuildStrategy');
  });
});
