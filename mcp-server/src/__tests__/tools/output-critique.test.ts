import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { buildDeterministicOutputCritique } from '../../output-critique.js';
import { buildCapabilityMatrix } from '../../destination.js';
import { buildSiteFingerprint } from '../../fingerprint.js';
import { buildRecommendationReport } from '../../recommendations.js';
import { buildImportReport } from '../../validation.js';
import { registerOutputCritiqueTools } from '../../tools/output-critique.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

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
      site_name: 'Critique Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: { version: '3.20', pro: false, pro_version: null, active_kit_id: 1 },
    brand: { logo_set: true, logo_id: 1, global_colors_count: 4, global_typography_count: 4 },
    theme_builder: { header: [], footer: [] },
    template_library: { total: 3, by_type: { section: 3 }, uncategorized: 0, published: 3, draft: 0 },
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
    getTemplate: vi.fn().mockResolvedValue({
      id: 42,
      title: 'Homepage Hero',
      type: 'container',
      status: 'publish',
      author: 1,
      date: '',
      modified: '',
      categories: [],
      tags: [],
    }),
    getTemplateData: vi.fn().mockResolvedValue({
      id: 42,
      elementor_data: [{ id: 'root', elType: 'container', elements: [] }],
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildDeterministicOutputCritique', () => {
  it('returns caution when validation or capability warnings exist', () => {
    const report = buildImportReport({
      sourceType: 'raw',
      sourceRef: 'raw:test',
      title: 'Payload',
      elementorData: [{ elements: [{}] }],
    });
    const assessment = makeAssessment();
    const context = makeContext();
    const fingerprint = buildSiteFingerprint(assessment);
    const matrix = buildCapabilityMatrix(assessment, fingerprint);
    const recommendationReport = buildRecommendationReport({
      assessment,
      context,
      fingerprint,
      capabilityMatrix: matrix,
    });
    const critique = buildDeterministicOutputCritique({ report, recommendationReport });

    expect(critique.verdict).toBe('caution');
    expect(critique.repairSteps.length).toBeGreaterThan(0);
  });
});

describe('critique_elementor_output tool', () => {
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
    registerOutputCritiqueTools(server, getClient);
  });

  it('returns a deterministic critique by default', async () => {
    const handler = handlers.get('critique_elementor_output');
    if (!handler) throw new Error('critique_elementor_output not registered');

    const result = await handler({ source_type: 'template', source_id: 42 });
    const text = result.content[0]!.text;

    expect(text).toContain('Elementor Output Critique');
    expect(text).toContain('Mode: deterministic');
    expect(text).toContain('## Repair Steps');
  });

  it('uses the AI critique provider when feature flag and key are configured', async () => {
    vi.mocked(getIntegrations).mockReturnValue({
      ai_planning_enabled: true,
      openai_api_key: 'sk-test',
    });
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              verdict: 'solid',
              summary: 'The payload is ready for a smoke test.',
              concerns: [],
              repairSteps: ['Run the smoke-test checklist.'],
              validationBasis: ['Structural validation: pass'],
            }),
          },
        }],
      },
    });

    const handler = handlers.get('critique_elementor_output');
    if (!handler) throw new Error('critique_elementor_output not registered');

    const result = await handler({ source_type: 'template', source_id: 42 });
    const text = result.content[0]!.text;

    expect(text).toContain('Mode: ai-assisted');
    expect(text).toContain('ready for a smoke test');
  });
});
