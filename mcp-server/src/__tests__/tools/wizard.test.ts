import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWizardTools } from '../../tools/wizard.js';
import type { ElementifyClient, SiteAssessment, GlobalStylesData } from '../../client.js';
import type { ElementifyTemplate, ElementifyTemplateList } from '@elementify/shared';

// ------------------------------------------------------------------ //
// Fixtures
// ------------------------------------------------------------------ //

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-03-29T00:00:00Z',
    wordpress: { version: '6.4', language: 'en_US', timezone: 'UTC', is_multisite: false, site_name: 'Test Site', site_tagline: '', admin_url: 'https://x.com/wp-admin/' },
    elementor: { version: '3.20', pro: true, pro_version: '3.20', active_kit_id: 1 },
    brand: { logo_set: false, logo_id: null, global_colors_count: 0, global_typography_count: 0 },
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], 'single-page': [], archive: [], search: [], 'error-404': [], popup: [] },
    template_library: { total: 5, by_type: { container: 5 }, uncategorized: 0, published: 5, draft: 0 },
    pages: { elementor_total: 2, by_post_type: { page: 2 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 5, classified: {}, woocommerce: false, multilingual: false },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeStyles(overrides: Partial<GlobalStylesData> = {}): GlobalStylesData {
  return {
    kit_id: 1,
    system_colors: [],
    custom_colors: [],
    system_typography: [],
    custom_typography: [],
    ...overrides,
  };
}

function makeTemplate(id: number, title: string, tags: string[] = [], categories: string[] = []): ElementifyTemplate {
  return { id, title, type: 'container', status: 'publish', author: 1, date: '', modified: '', tags, categories };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    listTemplates: vi.fn().mockResolvedValue({ templates: [], total: 0, total_pages: 1 } as ElementifyTemplateList),
    getTemplate: vi.fn(),
    createTemplate: vi.fn().mockResolvedValue(makeTemplate(99, 'New')),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn().mockResolvedValue({ id: 1, elementor_data: [{ id: 'el1', elType: 'container', elements: [] }] }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 99, updated: true }),
    getSiteInfo: vi.fn(),
    getLogo: vi.fn().mockResolvedValue({ logo_id: null, logo_url: null, set: false }),
    setLogo: vi.fn().mockResolvedValue({ logo_id: 10, logo_url: 'https://example.com/logo.png', updated: true }),
    assessSite: vi.fn().mockResolvedValue(makeAssessment()),
    getGlobalStyles: vi.fn().mockResolvedValue(makeStyles()),
    setGlobalColors: vi.fn().mockImplementation(async (colors) => ({ kit_id: 1, slot: 'system_colors', colors, updated: true })),
    setGlobalTypography: vi.fn().mockImplementation(async (typography) => ({ kit_id: 1, slot: 'system_typography', typography, updated: true })),
    getSiteContext: vi.fn(),
    setSiteContext: vi.fn(),
    listElementorPages: vi.fn(),
    getPageData: vi.fn(),
    updatePageData: vi.fn().mockResolvedValue({ id: 5, updated: true }),
    createThemeBuilderTemplate: vi.fn().mockResolvedValue({ id: 200, title: 'Main Header', type: 'header', status: 'publish', conditions: ['include/general'] }),
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

describe('wizard tools', () => {
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

    registerWizardTools(server, getClient);
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const h = handlers.get(name);
    if (!h) throw new Error(`"${name}" not registered`);
    return h(args);
  };

  // ---------------------------------------------------------------- //
  // set_site_logo
  // ---------------------------------------------------------------- //
  describe('set_site_logo', () => {
    it('calls setLogo with media_id', async () => {
      const result = await call('set_site_logo', { media_id: 10 });
      expect(client.setLogo).toHaveBeenCalledWith(10);
      expect(result.content[0]!.text).toContain('Logo set');
      expect(result.content[0]!.text).toContain('10');
    });

    it('shows logo URL in output when available', async () => {
      const result = await call('set_site_logo', { media_id: 10 });
      expect(result.content[0]!.text).toContain('example.com/logo.png');
    });

    it('passes site_id to getClient', async () => {
      await call('set_site_logo', { media_id: 10, site_id: 'prod' });
      expect(getClient).toHaveBeenCalledWith('prod');
    });
  });

  // ---------------------------------------------------------------- //
  // wizard_brand_setup
  // ---------------------------------------------------------------- //
  describe('wizard_brand_setup', () => {
    it('returns dry-run plan when auto_execute is false', async () => {
      const result = await call('wizard_brand_setup', {
        auto_execute: false,
        colors: [{ title: 'Primary', color: '#1A56DB' }],
      });
      const text = result.content[0]!.text;
      expect(text).toContain('DRY RUN');
      expect(text).toContain('auto_execute=true');
      expect(client.setGlobalColors).not.toHaveBeenCalled();
    });

    it('executes all steps when auto_execute is true', async () => {
      const result = await call('wizard_brand_setup', {
        auto_execute: true,
        logo_media_id: 10,
        colors: [
          { title: 'Primary',   color: '#1A56DB' },
          { title: 'Secondary', color: '#F3F4F6' },
        ],
        typography: [{ title: 'Primary', font_family: 'Inter', font_size: 16 }],
      });
      const text = result.content[0]!.text;
      expect(client.setLogo).toHaveBeenCalledWith(10);
      expect(client.setGlobalColors).toHaveBeenCalled();
      expect(client.setGlobalTypography).toHaveBeenCalled();
      expect(text).toContain('EXECUTE');
      expect(text).toContain('Brand setup complete');
    });

    it('shows nothing-to-do when no brand data provided', async () => {
      const result = await call('wizard_brand_setup', {});
      expect(result.content[0]!.text).toContain('Nothing to do');
    });

    it('shows current state in output', async () => {
      const result = await call('wizard_brand_setup', {
        colors: [{ title: 'Primary', color: '#000' }],
      });
      const text = result.content[0]!.text;
      expect(text).toContain('Current State');
      expect(text).toContain('not set');
    });

    it('shows warning when existing colors will be replaced', async () => {
      vi.mocked(client.getGlobalStyles).mockResolvedValueOnce(makeStyles({
        system_colors: [{ _id: 'primary', title: 'Primary', color: '#ff0000' }],
      }));
      const result = await call('wizard_brand_setup', {
        auto_execute: false,
        colors: [{ title: 'Primary', color: '#1A56DB' }],
      });
      expect(result.content[0]!.text).toContain('replaces existing');
    });
  });

  // ---------------------------------------------------------------- //
  // creator_mode
  // ---------------------------------------------------------------- //
  describe('creator_mode', () => {
    it('returns error if neither save_as_template nor write_to_page provided', async () => {
      const result = await call('creator_mode', { sections: ['hero'] });
      expect(result.isError).toBe(true);
    });

    it('matches sections to templates by title keywords', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [
          makeTemplate(1, 'SECTION_Hero Banner', [], []),
          makeTemplate(2, 'SECTION_Features Grid', [], []),
          makeTemplate(3, 'COMP_Pricing Table', ['pricing'], []),
        ],
        total: 3,
        total_pages: 1,
      });

      const result = await call('creator_mode', {
        sections: ['hero', 'pricing'],
        dry_run: true,
        save_as_template: { title: 'Test' },
      });

      const text = result.content[0]!.text;
      expect(text).toContain('"hero" →');
      expect(text).toContain('SECTION_Hero Banner');
      expect(text).toContain('"pricing" →');
    });

    it('dry_run does not call createTemplate or updatePageData', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [makeTemplate(1, 'SECTION_Hero')],
        total: 1, total_pages: 1,
      });

      await call('creator_mode', {
        sections: ['hero'],
        dry_run: true,
        save_as_template: { title: 'Test' },
      });

      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updatePageData).not.toHaveBeenCalled();
    });

    it('composes and saves template when not dry_run', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [
          makeTemplate(1, 'SECTION_Hero'),
          makeTemplate(2, 'SECTION_Features'),
        ],
        total: 2, total_pages: 1,
      });
      vi.mocked(client.getTemplateData)
        .mockResolvedValueOnce({ id: 1, elementor_data: [{ id: 'h', elType: 'container', elements: [] }] })
        .mockResolvedValueOnce({ id: 2, elementor_data: [{ id: 'f', elType: 'container', elements: [] }] });
      vi.mocked(client.createTemplate).mockResolvedValueOnce(makeTemplate(99, 'Composed Page'));

      const result = await call('creator_mode', {
        sections: ['hero', 'features'],
        save_as_template: { title: 'Composed Page', template_type: 'page', status: 'draft' },
      });

      expect(client.createTemplate).toHaveBeenCalledWith({ title: 'Composed Page', type: 'page', status: 'draft' });
      expect(client.updateTemplateData).toHaveBeenCalledWith(99, [
        { id: 'h', elType: 'container', elements: [] },
        { id: 'f', elType: 'container', elements: [] },
      ]);
      expect(result.content[0]!.text).toContain('Composed Page');
    });

    it('writes to page when write_to_page is set', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [makeTemplate(5, 'SECTION_Hero')],
        total: 1, total_pages: 1,
      });

      await call('creator_mode', {
        sections: ['hero'],
        write_to_page: { page_id: 55 },
      });

      expect(client.updatePageData).toHaveBeenCalledWith(55, expect.any(Array));
    });

    it('keeps composed section order stable for regression coverage', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [
          makeTemplate(1, 'SECTION_Hero'),
          makeTemplate(2, 'SECTION_Features'),
          makeTemplate(3, 'SECTION_CTA'),
        ],
        total: 3,
        total_pages: 1,
      });
      vi.mocked(client.getTemplateData)
        .mockResolvedValueOnce({ id: 1, elementor_data: [{ id: 'hero', elType: 'container', elements: [] }] })
        .mockResolvedValueOnce({ id: 2, elementor_data: [{ id: 'features', elType: 'container', elements: [] }] })
        .mockResolvedValueOnce({ id: 3, elementor_data: [{ id: 'cta', elType: 'container', elements: [] }] });

      await call('creator_mode', {
        sections: ['hero', 'features', 'cta'],
        write_to_page: { page_id: 77 },
      });

      expect(client.updatePageData).toHaveBeenCalledWith(77, [
        { id: 'hero', elType: 'container', elements: [] },
        { id: 'features', elType: 'container', elements: [] },
        { id: 'cta', elType: 'container', elements: [] },
      ]);
    });

    it('shows guidance when no templates match', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 });

      const result = await call('creator_mode', {
        sections: ['hero', 'pricing'],
        save_as_template: { title: 'Test' },
      });

      const text = result.content[0]!.text;
      expect(text).toContain('no match found');
      expect(text).toContain('save_page_section_as_template');
    });
  });

  // ---------------------------------------------------------------- //
  // wizard_theme_builder
  // ---------------------------------------------------------------- //
  describe('wizard_theme_builder', () => {
    it('calls createThemeBuilderTemplate with correct type and conditions', async () => {
      const result = await call('wizard_theme_builder', {
        type: 'header',
        title: 'Main Header',
        conditions: 'all',
        status: 'publish',
      });

      expect(client.createThemeBuilderTemplate).toHaveBeenCalledWith({
        title: 'Main Header',
        type: 'header',
        elementor_data: undefined,
        conditions: 'all',
        status: 'publish',
      });

      const text = result.content[0]!.text;
      expect(text).toContain('Template created');
      expect(text).toContain('200');
      expect(text).toContain('header');
    });

    it('dry_run does NOT call createThemeBuilderTemplate', async () => {
      const result = await call('wizard_theme_builder', {
        type: 'footer',
        title: 'Main Footer',
        dry_run: true,
      });

      expect(client.createThemeBuilderTemplate).not.toHaveBeenCalled();
      const text = result.content[0]!.text;
      expect(text).toContain('Dry run complete');
      expect(text).toContain('footer');
    });

    it('source_template_id causes getTemplateData to be called', async () => {
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({
        id: 5,
        elementor_data: [{ id: 'el1', elType: 'section', elements: [] }],
      });

      await call('wizard_theme_builder', {
        type: 'header',
        title: 'Copied Header',
        source_template_id: 5,
      });

      expect(client.getTemplateData).toHaveBeenCalledWith(5);
      expect(client.createThemeBuilderTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          elementor_data: [{ id: 'el1', elType: 'section', elements: [] }],
        }),
      );
    });

    it('source_template_id with dry_run does NOT call getTemplateData', async () => {
      await call('wizard_theme_builder', {
        type: 'header',
        title: 'Dry Header',
        source_template_id: 5,
        dry_run: true,
      });

      expect(client.getTemplateData).not.toHaveBeenCalled();
      expect(client.createThemeBuilderTemplate).not.toHaveBeenCalled();
    });

    it('sections causes listTemplates and getTemplateData to be called', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [
          makeTemplate(10, 'SECTION_Header Nav', ['header', 'nav'], []),
        ],
        total: 1,
        total_pages: 1,
      });
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({
        id: 10,
        elementor_data: [{ id: 'nav', elType: 'container', elements: [] }],
      });

      await call('wizard_theme_builder', {
        type: 'header',
        title: 'Composed Header',
        sections: ['header'],
      });

      expect(client.listTemplates).toHaveBeenCalledWith({ status: 'publish', per_page: 100 });
      expect(client.getTemplateData).toHaveBeenCalledWith(10);
    });

    it('output contains template ID and conditions', async () => {
      const result = await call('wizard_theme_builder', {
        type: 'header',
        title: 'Test Header',
      });

      const text = result.content[0]!.text;
      expect(text).toContain('200');
      expect(text).toContain('include/general');
    });

    it('shows blank template message when no sections or source provided', async () => {
      const result = await call('wizard_theme_builder', {
        type: 'header',
        title: 'Blank Header',
      });

      const text = result.content[0]!.text;
      expect(text).toContain('blank template');
    });
  });
});
