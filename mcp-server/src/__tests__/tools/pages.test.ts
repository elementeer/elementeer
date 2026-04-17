import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPageTools } from '../../tools/pages.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    createChange:         vi.fn().mockResolvedValue({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'update_page_data', params: {}, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
    listChanges:          vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange:            vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    updateChangeStatus:   vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn().mockResolvedValue({ id: 99, title: '', type: 'container', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn(),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 99, updated: true }),
    getSiteInfo: vi.fn(),
    listElementorPages: vi.fn().mockResolvedValue({ posts: [], total: 0, total_pages: 1 }),
    getPageData: vi.fn().mockResolvedValue({ post_id: 1, post_title: 'Test Page', post_type: 'page', element_count: 0, elementor_data: [] }),
    updatePageData: vi.fn().mockResolvedValue({ id: 1, updated: true }),
    setGlobalColors:      vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography:  vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    setLogo:              vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext:       vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Page tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerPageTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  // ------------------------------------------------------------------ //
  // list_elementor_pages
  // ------------------------------------------------------------------ //
  describe('list_elementor_pages', () => {
    it('calls listElementorPages with correct params', async () => {
      vi.mocked(client.listElementorPages).mockResolvedValueOnce({ posts: [], total: 0, total_pages: 1 });

      await callTool('list_elementor_pages', { post_type: 'post', per_page: 10, page: 2 });

      expect(client.listElementorPages).toHaveBeenCalledWith({ post_type: 'post', per_page: 10, page: 2 });
    });

    it('formats page list output with totals and rows', async () => {
      vi.mocked(client.listElementorPages).mockResolvedValueOnce({
        posts: [
          { id: 5, title: 'Home', slug: 'home', post_type: 'page', status: 'publish', url: 'https://example.com/', modified: '2024-01-01' },
          { id: 6, title: 'About', slug: 'about', post_type: 'page', status: 'publish', url: 'https://example.com/about', modified: '2024-01-02' },
        ],
        total: 2,
        total_pages: 1,
      });

      const result = await callTool('list_elementor_pages', {});
      const text = result.content[0]!.text;

      expect(text).toContain('2 total');
      expect(text).toContain('[5]');
      expect(text).toContain('Home');
      expect(text).toContain('[6]');
      expect(text).toContain('About');
    });
  });

  // ------------------------------------------------------------------ //
  // get_page_data
  // ------------------------------------------------------------------ //
  describe('get_page_data', () => {
    it('calls getPageData with no extract and returns full data', async () => {
      const elementorData = [{ id: 'abc', elType: 'container', elements: [] }];
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 42,
        post_title: 'My Page',
        post_type: 'page',
        element_count: 1,
        elementor_data: elementorData,
      });

      const result = await callTool('get_page_data', { id: 42 });
      const text = result.content[0]!.text;

      expect(client.getPageData).toHaveBeenCalledWith({ id: 42, extract: undefined, index: undefined });
      expect(text).toContain('"My Page"');
      expect(text).toContain('1 top-level elements');
      expect(text).toContain('"abc"');
    });

    it('formats extract=all summary correctly', async () => {
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 10,
        post_title: 'Landing Page',
        post_type: 'page',
        element_count: 2,
        elements: [
          { index: 0, id: 'el1', elType: 'container', children: 3, data: {} },
          { index: 1, id: 'el2', elType: 'section', children: 1, data: {} },
        ],
      });

      const result = await callTool('get_page_data', { id: 10, extract: 'all' });
      const text = result.content[0]!.text;

      expect(text).toContain('"Landing Page"');
      expect(text).toContain('[0]');
      expect(text).toContain('container');
      expect(text).toContain('3 children');
      expect(text).toContain('[1]');
      expect(text).toContain('section');
      expect(text).toContain('Use extract="section"');
    });

    it('returns single element when extract=section with index', async () => {
      const element = { id: 'sec1', elType: 'container', elements: [] };
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 10,
        post_title: 'Landing Page',
        index: 0,
        element,
      });

      const result = await callTool('get_page_data', { id: 10, extract: 'section', index: 0 });
      const text = result.content[0]!.text;

      expect(text).toContain('Section [0]');
      expect(text).toContain('"Landing Page"');
      expect(text).toContain('"sec1"');
    });
  });

  // ------------------------------------------------------------------ //
  // update_page_data
  // ------------------------------------------------------------------ //
  describe('update_page_data', () => {
    it('queues change for governance L2', async () => {
      const data = [{ id: 'c1', elType: 'container', elements: [] }];
      vi.mocked(client.createChange).mockResolvedValueOnce({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'update_page_data', params: { id: 42, elementor_data: data }, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null });

      const result = await callTool('update_page_data', { id: 42, elementor_data: data });

      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'update_page_data',
        params: { id: 42, elementor_data: data },
        note: 'Auto-queued by governance level L2',
      });
      expect(client.updatePageData).not.toHaveBeenCalled();
      expect(result.content[0]!.text).toContain('Change queued for review');
      expect(result.content[0]!.text).toContain('chg_test');
    });

    it('passes site_id to getClient', async () => {
      vi.mocked(client.createChange).mockResolvedValueOnce({ 
        id: 'chg_test', 
        created_at: '2026-03-30T10:00:00+00:00', 
        status: 'pending', 
        operation: 'update_page_data', 
        params: { id: 7, elementor_data: [] }, 
        note: 'Auto-queued by governance level L2', 
        before_state: null, 
        reviewed_at: null, 
        review_note: null, 
        applied_at: null 
      });

      await callTool('update_page_data', { id: 7, elementor_data: [], site_id: 'prod' });

      expect(getClient).toHaveBeenCalledWith('prod');
      expect(client.createChange).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------ //
  // compose_page_from_templates
  // ------------------------------------------------------------------ //
  describe('compose_page_from_templates', () => {
    const tpl1Elements = [
      { id: 'a', elType: 'container', elements: [] },
      { id: 'b', elType: 'container', elements: [] },
    ];
    const tpl2Elements = [
      { id: 'c', elType: 'container', elements: [] },
    ];

    it('merges all sections from two templates into a new template', async () => {
      vi.mocked(client.createChange).mockResolvedValueOnce({ 
        id: 'chg_test', 
        created_at: '2026-03-30T10:00:00+00:00', 
        status: 'pending', 
        operation: 'compose_page_from_templates', 
        params: { 
          sources: [{ template_id: 10 }, { template_id: 20 }],
          save_as_template: { title: 'PAGE_Composed', template_type: 'page', status: 'publish' },
          write_to_page: undefined
        }, 
        note: 'Page composition auto-queued by governance level L2', 
        before_state: null, 
        reviewed_at: null, 
        review_note: null, 
        applied_at: null 
      });

      const result = await callTool('compose_page_from_templates', {
        sources: [{ template_id: 10 }, { template_id: 20 }],
        save_as_template: { title: 'PAGE_Composed', template_type: 'page', status: 'publish' },
      });

      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'compose_page_from_templates',
        params: { 
          sources: [{ template_id: 10 }, { template_id: 20 }],
          save_as_template: { title: 'PAGE_Composed', template_type: 'page', status: 'publish' },
          write_to_page: undefined
        },
        note: 'Page composition auto-queued by governance level L2',
      });
      expect(client.getTemplateData).not.toHaveBeenCalled();
      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updateTemplateData).not.toHaveBeenCalled();
      const text = result.content[0]!.text;
      expect(text).toContain('Page composition queued for review');
      expect(text).toContain('chg_test');
      expect(text).toContain('PAGE_Composed');
    });

    it('respects section indices per source', async () => {
      vi.mocked(client.createChange).mockResolvedValueOnce({ 
        id: 'chg_test', 
        created_at: '2026-03-30T10:00:00+00:00', 
        status: 'pending', 
        operation: 'compose_page_from_templates', 
        params: { 
          sources: [{ template_id: 10, sections: [1] }, { template_id: 20 }],
          save_as_template: { title: 'Filtered', template_type: 'page', status: 'publish' },
          write_to_page: undefined
        }, 
        note: 'Auto-queued by governance level L2', 
        before_state: null, 
        reviewed_at: null, 
        review_note: null, 
        applied_at: null 
      });

      await callTool('compose_page_from_templates', {
        sources: [{ template_id: 10, sections: [1] }, { template_id: 20 }],
        save_as_template: { title: 'Filtered' },
      });

      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'compose_page_from_templates',
        params: { 
          sources: [{ template_id: 10, sections: [1] }, { template_id: 20 }],
          save_as_template: { title: 'Filtered' },
          write_to_page: undefined
        },
        note: 'Page composition auto-queued by governance level L2',
      });
      expect(client.getTemplateData).not.toHaveBeenCalled();
      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updateTemplateData).not.toHaveBeenCalled();
    });

    it('writes to page when write_to_page is set', async () => {
      vi.mocked(client.createChange).mockResolvedValueOnce({ 
        id: 'chg_test', 
        created_at: '2026-03-30T10:00:00+00:00', 
        status: 'pending', 
        operation: 'compose_page_from_templates', 
        params: { 
          sources: [{ template_id: 10 }],
          save_as_template: undefined,
          write_to_page: { page_id: 55 }
        }, 
        note: 'Page composition auto-queued by governance level L2', 
        before_state: null, 
        reviewed_at: null, 
        review_note: null, 
        applied_at: null 
      });

      const result = await callTool('compose_page_from_templates', {
        sources: [{ template_id: 10 }],
        write_to_page: { page_id: 55 },
      });

      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'compose_page_from_templates',
        params: { 
          sources: [{ template_id: 10 }],
          save_as_template: undefined,
          write_to_page: { page_id: 55 }
        },
        note: 'Page composition auto-queued by governance level L2',
      });
      expect(client.getTemplateData).not.toHaveBeenCalled();
      expect(client.updatePageData).not.toHaveBeenCalled();
      expect(result.content[0]!.text).toContain('Page composition queued for review');
      expect(result.content[0]!.text).toContain('chg_test');
    });

    it('returns error if neither save_as_template nor write_to_page is set', async () => {
      const result = await callTool('compose_page_from_templates', {
        sources: [{ template_id: 10 }],
      }) as { content: Array<{ text: string }>; isError?: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('specify at least one');
    });
  });

  // ------------------------------------------------------------------ //
  // save_page_section_as_template
  // ------------------------------------------------------------------ //
  describe('save_page_section_as_template', () => {
    it('calls getPageData → createTemplate → updateTemplateData in correct sequence', async () => {
      const element = { id: 'hero', elType: 'container', elements: [] };
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 20,
        post_title: 'Source Page',
        index: 1,
        element,
      });
      vi.mocked(client.createChange).mockResolvedValueOnce({
        id: 'chg_test',
        created_at: '2026-03-30T10:00:00+00:00',
        status: 'pending',
        operation: 'save_page_section_as_template',
        params: {
          page_id: 20,
          section_index: 1,
          template_title: 'SECTION_Hero',
          template_type: 'container',
          status: 'publish'
        },
        note: 'Template "SECTION_Hero" auto-queued by governance level L2',
        before_state: null,
        reviewed_at: null,
        review_note: null,
        applied_at: null
      });

      const result = await callTool('save_page_section_as_template', {
        page_id: 20,
        section_index: 1,
        template_title: 'SECTION_Hero',
        template_type: 'container',
        status: 'publish',
      });

      expect(client.getPageData).toHaveBeenCalledWith({ id: 20, extract: 'section', index: 1 });
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'save_page_section_as_template',
        params: {
          page_id: 20,
          section_index: 1,
          template_title: 'SECTION_Hero',
          template_type: 'container',
          status: 'publish'
        },
        note: 'Template "SECTION_Hero" auto-queued by governance level L2',
      });
      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updateTemplateData).not.toHaveBeenCalled();

      const text = result.content[0]!.text;
      expect(text).toContain('Template creation queued for review');
      expect(text).toContain('chg_test');
      expect(text).toContain('SECTION_Hero');
    });

    it('throws if element at index does not exist', async () => {
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 20,
        post_title: 'Source Page',
        index: 5,
        element: undefined,
      });

      await expect(
        callTool('save_page_section_as_template', {
          page_id: 20,
          section_index: 5,
          template_title: 'SECTION_Missing',
        })
      ).rejects.toThrow('No element at index 5');

      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updateTemplateData).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------ //
  // save_full_page_as_template
  // ------------------------------------------------------------------ //
  describe('save_full_page_as_template', () => {
    it('copies entire elementor_data from page to new template', async () => {
      const elementorData = [
        { id: 'a', elType: 'container', elements: [] },
        { id: 'b', elType: 'container', elements: [] },
      ];
      vi.mocked(client.getPageData).mockResolvedValueOnce({
        post_id: 30,
        post_title: 'Full Page',
        post_type: 'page',
        element_count: 2,
        elementor_data: elementorData,
      });
      vi.mocked(client.createChange).mockResolvedValueOnce({
        id: 'chg_test',
        created_at: '2026-03-30T10:00:00+00:00',
        status: 'pending',
        operation: 'save_full_page_as_template',
        params: {
          page_id: 30,
          template_title: 'PAGE_Full',
          status: 'publish'
        },
        note: 'Page template "PAGE_Full" auto-queued by governance level L2',
        before_state: null,
        reviewed_at: null,
        review_note: null,
        applied_at: null
      });

      const result = await callTool('save_full_page_as_template', {
        page_id: 30,
        template_title: 'PAGE_Full',
        status: 'publish',
      });

      expect(client.getPageData).not.toHaveBeenCalled();
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'save_full_page_as_template',
        params: {
          page_id: 30,
          template_title: 'PAGE_Full',
          status: 'publish'
        },
        note: 'Page template "PAGE_Full" auto-queued by governance level L2',
      });
      expect(client.createTemplate).not.toHaveBeenCalled();
      expect(client.updateTemplateData).not.toHaveBeenCalled();

      const text = result.content[0]!.text;
      expect(text).toContain('queued for review');
      expect(text).toContain('chg_test');
      expect(text).toContain('PAGE_Full');
    });
  });
});
