import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedWorkflowTools } from '../../tools/advanced-workflows.js';
import type { ElementifyClient, SiteAssessment, SiteContext } from '../../client.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-10T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Advanced Creator Tool Test',
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
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], 'error-404': [] },
    template_library: { total: 8, by_type: { section: 8 }, uncategorized: 1, published: 8, draft: 0 },
    pages: { elementor_total: 4, by_post_type: { page: 4 } },
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
    brand_notes: 'Clear premium positioning.',
    target_audience: 'B2B teams',
    primary_language: 'en',
    set_at: '2026-04-10T00:00:00Z',
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
        asset_id: 'premium-theme-foundation-header',
        asset_title: 'Premium Theme Foundation Header',
        reference: 'premium-catalog:premium-theme-foundation-header',
      },
      template: {
        id: 701,
        title: 'Premium Theme Foundation Header — Local Import',
        type: 'section',
        status: 'draft',
        author: 1,
        date: '',
        modified: '',
        categories: [],
        tags: [],
        shortcode: '[elementor-template id="701"]',
      },
    }),
    getTemplateData: vi.fn().mockResolvedValue({
      id: 701,
      elementor_data: [{ id: 'header', elements: [] }],
    }),
    getPageData: vi.fn().mockResolvedValue({
      post_id: 55,
      post_title: 'Current Home',
      post_type: 'page',
      element_count: 1,
      elementor_data: [{ id: 'page-root', elements: [] }],
    }),
    createTemplate: vi.fn().mockResolvedValue({
      id: 702,
      title: 'Deep Relaunch Snapshot — Current Home',
      type: 'page',
      status: 'draft',
      author: 1,
      date: '',
      modified: '',
      categories: [],
      tags: [],
      shortcode: '[elementor-template id="702"]',
    }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 702, updated: true }),
    updatePageData: vi.fn().mockResolvedValue({ id: 55, updated: true }),
    createThemeBuilderTemplate: vi.fn().mockResolvedValue({
      id: 990,
      title: 'Advanced Header',
      type: 'header',
      status: 'publish',
      conditions: ['include/general'],
    }),
    getTemplate: vi.fn().mockResolvedValue({
      id: 42,
      title: 'Critique Target',
      type: 'section',
      status: 'draft',
      author: 1,
      date: '',
      modified: '',
      categories: [],
      tags: [],
      shortcode: '[elementor-template id="42"]',
    }),
    createChange: vi.fn().mockResolvedValue({
      id: 'chg_advanced_follow_up',
      created_at: '2026-04-10T00:00:00Z',
      status: 'pending',
      operation: 'advanced_workflow_follow_up',
      params: {},
      note: 'Advanced workflow follow-up',
      before_state: {},
      reviewed_at: null,
      review_note: null,
      applied_at: null,
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('advanced workflow tools', () => {
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

    registerAdvancedWorkflowTools(server, getClient);
  });

  it('registers the Advanced scenario front door', async () => {
    const handler = handlers.get('route_advanced_scenario');
    if (!handler) throw new Error('route_advanced_scenario not registered');

    const result = await handler({
      scenario: 'migration',
      user_posture: 'technical',
      target_surface: 'theme-builder',
      source_template_id: 42,
      theme_builder_type: 'header',
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Advanced Scenario Route');
    expect(text).toContain('Advanced Migration Route');
    expect(text).toContain('Recommended workflow: migration-rollout');
    expect(text).toContain('## Project Profile Applied');
    expect(text).toContain('## Layout Risk Signals');
    expect(text).toContain('## Supporting Workflows');
    expect(text).toContain('## Productivity Layer');
    expect(text).toContain('advanced_creator_mode({');
  });

  it('renders a planning-only advanced workflow', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'critique-repair-loop',
      source_template_id: 42,
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Advanced Creator Mode');
    expect(text).toContain('PLAN');
    expect(text).toContain('Write mode:');
    expect(text.toLowerCase()).toContain('critique');
    expect(text).toContain('## Action Presets');
    expect(text).toContain('validate_elementor_write({');
    expect(text).toContain('## Workflow Applications');
    expect(text).toContain('## Productivity Layer');
  });

  it('supports planning for deep relaunch workflows', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'deep-relaunch',
      target_page_id: 55,
      theme_builder_type: 'header',
    });
    const text = result.content[0]!.text;

    expect(text).toContain('Workflow: Advanced deep relaunch');
    expect(text).toContain('PLAN');
    expect(text).toContain('## Operative Handoffs');
    expect(text).toContain('save_full_page_as_template({');
  });

  it('can execute a bounded deep relaunch slice', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'deep-relaunch',
      target_page_id: 55,
      theme_builder_type: 'header',
      auto_execute: true,
      queue_follow_up: true,
    });
    const text = result.content[0]!.text;

    expect(client.getPageData).toHaveBeenCalledWith({ id: 55 });
    expect(client.createTemplate).toHaveBeenCalledOnce();
    expect(client.updateTemplateData).toHaveBeenCalledOnce();
    expect(client.createThemeBuilderTemplate).toHaveBeenCalledOnce();
    expect(client.getTemplate).toHaveBeenCalledWith(990);
    expect(text).toContain('EXECUTE');
    expect(text).toContain('Saved preservation snapshot template');
    expect(text).toContain('Created bounded deep relaunch slice');
    expect(text).toContain('Theme Builder Result');
    expect(text).toContain('Quality Loop');
  });

  it('can execute a Theme Builder rollout from a premium asset', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'theme-builder-rollout',
      premium_asset_id: 'premium-theme-foundation-header',
      theme_builder_type: 'header',
      title: 'Advanced Header',
      auto_execute: true,
    });
    const text = result.content[0]!.text;

    expect(client.importLibraryAsset).toHaveBeenCalledOnce();
    expect(client.createThemeBuilderTemplate).toHaveBeenCalledOnce();
    expect(client.getTemplate).toHaveBeenCalledWith(990);
    expect(text).toContain('Imported Premium Asset');
    expect(text).toContain('Theme Builder Result');
    expect(text).toContain('Quality Loop');
    expect(text).toContain('## Operative Handoffs');
    expect(text).toContain('wizard_theme_builder({');
  });

  it('can execute a critique and repair loop with a governed follow-up', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'critique-repair-loop',
      source_template_id: 42,
      auto_execute: true,
      queue_follow_up: true,
    });
    const text = result.content[0]!.text;

    expect(client.getTemplate).toHaveBeenCalledOnce();
    expect(client.createChange).toHaveBeenCalledOnce();
    expect(text).toContain('EXECUTE');
    expect(text).toContain('Quality Loop');
    expect(text).toContain('Governed Follow-Up');
    expect(text).toContain('Critique verdict: caution');
    expect(text).toContain('queue_change({');
  });

  it('routes advanced auto execution into approval queue when requested', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'deep-relaunch',
      target_page_id: 55,
      theme_builder_type: 'header',
      auto_execute: true,
      write_mode: 'approval-first',
    });
    const text = result.content[0]!.text;

    expect(client.createChange).toHaveBeenCalledOnce();
    expect(client.getPageData).not.toHaveBeenCalled();
    expect(text).toContain('Write mode: approval-first');
    expect(text).toContain('## Approval Queue');
    expect(text).toContain('Queued the Advanced workflow as an approval-first bundle instead of executing live.');
  });

  it('keeps theme-builder rollout in draft mode for draft-first execution', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    await handler({
      workflow: 'theme-builder-rollout',
      source_template_id: 42,
      theme_builder_type: 'header',
      auto_execute: true,
      write_mode: 'draft-first',
    });

    expect(client.createThemeBuilderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('can execute a bounded migration slice', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    const result = await handler({
      workflow: 'migration-rollout',
      source_template_id: 42,
      theme_builder_type: 'header',
      auto_execute: true,
      queue_follow_up: true,
    });
    const text = result.content[0]!.text;

    expect(client.getTemplateData).toHaveBeenCalledWith(42);
    expect(client.createThemeBuilderTemplate).toHaveBeenCalledOnce();
    expect(client.getTemplate).toHaveBeenCalledWith(990);
    expect(text).toContain('EXECUTE');
    expect(text).toContain('Loaded source template 42 for the first bounded migration slice.');
    expect(text).toContain('Created bounded migration slice');
    expect(text).toContain('Theme Builder Result');
    expect(text).toContain('Quality Loop');
  });

  it('still blocks deep relaunch execution without the bounded slice inputs', async () => {
    const handler = handlers.get('advanced_creator_mode');
    if (!handler) throw new Error('advanced_creator_mode not registered');

    await expect(() =>
      handler({
        workflow: 'deep-relaunch',
        auto_execute: true,
      })
    ).rejects.toThrow(/target_page_id/i);
  });
});
