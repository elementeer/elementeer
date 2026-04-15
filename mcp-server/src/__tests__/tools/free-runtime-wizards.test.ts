import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFreeRuntimeWizardTools } from '../../tools/free-runtime-wizards.js';
import type { ElementifyClient, SiteAssessment, SiteContext, SiteInfo } from '../../client.js';
import type { ElementifyTemplate } from '@elementify/shared';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-12T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Free Runtime Wizard Tool Test',
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
      logo_set: false,
      logo_id: null,
      global_colors_count: 0,
      global_typography_count: 0,
    },
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], search: [], 'error-404': [], popup: [] },
    template_library: { total: 4, by_type: { section: 4 }, uncategorized: 4, published: 4, draft: 0 },
    pages: { elementor_total: 0, by_post_type: { page: 0, post: 0 } },
    performance: { css_print_method: 'internal', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 2, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: 'freelancer',
    site_purpose: 'corporate',
    brand_notes: null,
    target_audience: null,
    primary_language: 'en',
    set_at: '2026-04-12T00:00:00Z',
    ...overrides,
  };
}

function makeSiteInfo(overrides: Partial<SiteInfo> = {}): SiteInfo {
  return {
    name: 'Free Runtime Wizard Tool Test',
    url: 'https://example.com',
    wp_version: '6.5.0',
    elementor_version: null,
    elementor_pro: false,
    activation_mode: 'standalone',
    template_count: 4,
    capabilities: [],
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  const templates: ElementifyTemplate[] = [
    {
      id: 11,
      title: 'SECTION Hero',
      type: 'section',
      status: 'publish',
      shortcode: '[elementor-template id="11"]',
      author: 1,
      date: '2026-04-12T00:00:00Z',
      modified: '2026-04-12T00:00:00Z',
      categories: ['hero'],
      tags: ['hero'],
    },
    {
      id: 12,
      title: 'SECTION Features',
      type: 'section',
      status: 'publish',
      shortcode: '[elementor-template id="12"]',
      author: 1,
      date: '2026-04-12T00:00:00Z',
      modified: '2026-04-12T00:00:00Z',
      categories: ['features'],
      tags: ['features'],
    },
    {
      id: 13,
      title: 'SECTION CTA',
      type: 'section',
      status: 'publish',
      shortcode: '[elementor-template id="13"]',
      author: 1,
      date: '2026-04-12T00:00:00Z',
      modified: '2026-04-12T00:00:00Z',
      categories: ['cta'],
      tags: ['cta'],
    },
  ];

  return {
    getSiteInfo: vi.fn().mockResolvedValue(makeSiteInfo()),
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getSiteContext: vi.fn().mockResolvedValue(makeContext()),
    getGlobalStyles: vi.fn().mockResolvedValue({
      kit_id: 1,
      system_colors: [],
      custom_colors: [],
      system_typography: [],
      custom_typography: [],
    }),
    setSiteContext: vi.fn().mockResolvedValue(makeContext()),
    createChange: vi.fn().mockResolvedValue({
      id: 'chg_123',
      created_at: '2026-04-13T00:00:00Z',
      status: 'pending',
      operation: 'set_site_context',
      params: {},
      note: null,
      before_state: null,
      reviewed_at: null,
      review_note: null,
      applied_at: null,
    }),
    listTemplates: vi.fn().mockResolvedValue({
      templates,
      total: templates.length,
      total_pages: 1,
    }),
    getSiteSettings: vi.fn().mockResolvedValue({
      blogname: 'Test Site',
      description: 'Just another WordPress site',
      homepage: null,
      posts_page: null,
      permalink: '/%postname%/',
      timezone: 'UTC',
      date_format: 'F j, Y',
      time_format: 'g:i a',
      start_of_week: 1,
    }),
    updateSiteSettings: vi.fn().mockResolvedValue({
      updated: ['blogname'],
      settings: {},
    }),
    getSeoMeta: vi.fn().mockResolvedValue({
      post_id: 1,
      plugin: 'none',
      title: '',
      description: '',
      focus_keyword: '',
    }),
    updateSeoMeta: vi.fn().mockResolvedValue({
      post_id: 1,
      plugin: 'none',
      title: '',
      description: '',
      focus_keyword: '',
    }),
    flushElementorCache: vi.fn().mockResolvedValue({
      success: true,
    }),
    getPerformanceReport: vi.fn().mockResolvedValue({
      css_print_method: 'external',
      optimized_dom: true,
      load_fa4_shim: false,
      asset_optimization: 'none',
      cache_status: 'disabled',
    }),
    optimizeElementorAssets: vi.fn().mockResolvedValue({
      success: true,
      changes: [],
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('free runtime wizard tools', () => {
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

    registerFreeRuntimeWizardTools(server, getClient);
  });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const handler = handlers.get(name);
    if (!handler) {
      throw new Error(`"${name}" not registered`);
    }

    return handler(args);
  }

  it('registers the Free runtime wizard family tools', () => {
    expect(handlers.has('wizard_new_site_lite')).toBe(true);
    expect(handlers.has('wizard_stack_bootstrap')).toBe(true);
    expect(handlers.has('wizard_extension_lite')).toBe(true);
    expect(handlers.has('wizard_relaunch_lite')).toBe(true);
    expect(handlers.has('wizard_optimization_lite')).toBe(true);
    expect(handlers.has('run_free_wizard_preset')).toBe(true);
    expect(handlers.has('run_free_guided_transition')).toBe(true);
  });

  it('renders a concrete bootstrap wizard plan', async () => {
    const result = await call('wizard_stack_bootstrap', {
      site_id: 'demo',
      starting_point: 'wordpress_without_elementor',
      user_posture: 'guided',
      depth: 'moderate',
      constraints: ['free_only'],
    });

    const text = result.content[0]!.text;

    expect(getClient).toHaveBeenCalledWith('demo');
    expect(text).toContain('Stack Bootstrap Wizard');
    expect(text).toContain('Routed wizard: stack-bootstrap-wizard');
    expect(text).toContain('wizard_brand_setup');
    expect(text).toContain('creator_mode');
    expect(text).toContain('## Operative Handoffs');
    expect(text).toContain('set_site_context({');
    expect(text).toContain('## Action Presets');
    expect(text).toContain('creator_mode({"sections":["hero","features","cta"]');
    expect(text).toContain('## Profile Applications');
    expect(text).toContain('## Project Profile Applied');
    expect(text).toContain('## Layout Risk Signals');
  });

  it('renders a concrete new-site-lite wizard plan', async () => {
    const result = await call('wizard_new_site_lite', {
      site_id: 'demo',
      starting_point: 'idea_only',
      user_posture: 'guided',
      depth: 'light',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('New Site Lite Wizard');
    expect(text).toContain('Routed wizard: new-site-lite-wizard');
    expect(text).toContain('## Action Presets');
    expect(text).toContain('### New-site context preset');
    expect(text).toContain('Tool: set_site_context');
  });

  it('renders optimization-lite with recommendation-driven phases', async () => {
    const result = await call('wizard_optimization_lite', {
      site_id: 'demo',
      depth: 'moderate',
      user_posture: 'guided',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Optimization Lite Wizard');
    expect(text).toContain('switch_css_to_external');
    expect(text).toContain('audit_library');
    expect(text).toContain('Creator Light');
    expect(text).toContain('explain_recommendation({');
    expect(text).toContain('wizard_brand_setup({"auto_execute":false');
  });

  it('renders extension-lite with scoped extension guidance', async () => {
    const result = await call('wizard_extension_lite', {
      site_id: 'demo',
      depth: 'moderate',
      user_posture: 'assisted',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Extension Lite Wizard');
    expect(text).toContain('Routed wizard: extension-lite-wizard');
    expect(text).toContain('Addon profile:');
    expect(text).toContain('explain_recommendation({');
  });

  it('renders relaunch-lite with an Advanced upgrade signal when the route leans deep', async () => {
    vi.mocked(client.getSiteInfo).mockResolvedValueOnce(makeSiteInfo({
      elementor_version: '3.20.0',
      elementor_pro: true,
    }));
    vi.mocked(client.assessSite).mockResolvedValueOnce(makeAssessment({
      elementor: {
        version: '3.20.0',
        pro: true,
        pro_version: '3.20.0',
        active_kit_id: 1,
      },
      pages: { elementor_total: 3, by_post_type: { page: 3, post: 1 } },
    }));

    const result = await call('wizard_relaunch_lite', {
      site_id: 'demo',
      depth: 'moderate',
      user_posture: 'technical',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Relaunch Lite Wizard');
    expect(text).toContain('get_advanced_recommendations');
    expect(text).toContain('Upgrade signal:');
    expect(text).toContain('save_full_page_as_template({');
    expect(text).toContain('Depends on: get_destination_capabilities');
  });

  it('previews a safe preset without executing it', async () => {
    const result = await call('run_free_wizard_preset', {
      site_id: 'demo',
      wizard: 'optimization-lite',
      preset_id: 'optimization-explain-recommendation',
      mode: 'preview',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Status: preview');
    expect(text).toContain('Tool: explain_recommendation');
    expect(text).toContain('Execution mode: preview_only');
    expect(text).toContain('Preset preview only');
  });

  it('executes a safe bootstrap context preset', async () => {
    const result = await call('run_free_wizard_preset', {
      site_id: 'demo',
      wizard: 'stack-bootstrap',
      starting_point: 'wordpress_without_elementor',
      preset_id: 'bootstrap-context-preset',
      mode: 'execute',
    });

    const text = result.content[0]!.text;

    expect(vi.mocked(client.setSiteContext)).toHaveBeenCalled();
    expect(text).toContain('Status: executed');
    expect(text).toContain('✅ Site context saved from preset.');
  });

  it('routes a bootstrap context preset into approval mode when requested', async () => {
    const result = await call('run_free_wizard_preset', {
      site_id: 'demo',
      wizard: 'stack-bootstrap',
      starting_point: 'wordpress_without_elementor',
      preset_id: 'bootstrap-context-preset',
      mode: 'execute',
      write_mode: 'approval-first',
    });

    const text = result.content[0]!.text;

    expect(vi.mocked(client.createChange)).toHaveBeenCalledOnce();
    expect(vi.mocked(client.setSiteContext)).not.toHaveBeenCalled();
    expect(text).toContain('Write mode: approval-first');
    expect(text).toContain('Approval item: chg_123');
  });

  it('executes a safe brand setup preset in dry-run mode', async () => {
    const result = await call('run_free_wizard_preset', {
      site_id: 'demo',
      wizard: 'stack-bootstrap',
      starting_point: 'idea_only',
      preset_id: 'bootstrap-brand-setup',
      mode: 'execute',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Status: executed');
    expect(text).toContain('Brand Setup Wizard');
    expect(text).toContain('Mode: DRY RUN');
  });

  it('blocks execution for preview-only relaunch preservation presets', async () => {
    const result = await call('run_free_wizard_preset', {
      site_id: 'demo',
      wizard: 'relaunch-lite',
      preset_id: 'relaunch-preserve-preset',
      mode: 'execute',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Status: blocked');
    expect(text).toContain('preview-only');
  });

  it('runs a stack bootstrap guided transition with safe execution', async () => {
    const result = await call('run_free_guided_transition', {
      site_id: 'demo',
      wizard: 'stack-bootstrap',
      starting_point: 'wordpress_without_elementor',
      mode: 'execute',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Stack Bootstrap Wizard — Guided Transition');
    expect(text).toContain('Status: executed');
    expect(text).toContain('Preset: bootstrap-context-preset');
    expect(text).toContain('Preset: bootstrap-brand-setup');
    expect(text).toContain('Preset: bootstrap-creator-light');
    expect(text).toContain('✅ Site context saved from preset.');
    expect(text).toContain('Brand Setup Wizard');
    expect(text).toContain('Creator Mode');
  });

  it('applies project profile defaults to approval and risk output', async () => {
    vi.mocked(client.getSiteContext).mockResolvedValueOnce(makeContext({
      project_profile: {
        editing_mode: 'approval-first',
        copy_density: 'complete',
        layout_priority: 'preserve-copy-completeness',
        change_style: 'adaptive',
        question_policy: 'ask-on-ambiguity',
        notes: 'Ask before trimming.',
      },
    }));

    const result = await call('wizard_new_site_lite', {
      site_id: 'demo',
      starting_point: 'idea_only',
      user_posture: 'guided',
      depth: 'light',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Approval mode: approval-first');
    expect(text).toContain('Risk resolution: ask-before-apply');
    expect(text).toContain('headline_wrap_risk');
    expect(text).toContain('faq_block_density_risk');
  });

  it('runs an optimization guided transition with mixed execution states', async () => {
    const result = await call('run_free_guided_transition', {
      site_id: 'demo',
      wizard: 'optimization-lite',
      mode: 'execute',
    });

    const text = result.content[0]!.text;

    expect(text).toContain('Optimization Lite Wizard — Guided Transition');
    expect(text).toContain('Status: mixed');
    expect(text).toContain('Preset: optimization-explain-recommendation');
    expect(text).toContain('Tool: explain_recommendation');
    expect(text).toContain('Status: preview');
    expect(text).toContain('Preset: optimization-brand-setup');
    expect(text).toContain('Preset: optimization-creator-light');
  });
});
