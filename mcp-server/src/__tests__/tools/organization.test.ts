import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerOrganizationTools } from '../../tools/organization.js';
import type { ElementifyClient } from '../../client.js';
import type { ElementifyTemplate } from '@elementify/shared';

function makeTemplate(overrides: Partial<ElementifyTemplate> = {}): ElementifyTemplate {
  return {
    id: 1,
    title: 'My Template',
    type: 'page',
    status: 'publish',
    author: 1,
    date: '2025-01-01T00:00:00',
    modified: '2025-06-01T00:00:00',
    categories: ['hero'],
    tags: [],
    shortcode: '[elementor-template id="1"]',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    listTemplates: vi.fn().mockResolvedValue({ templates: [], total: 0, total_pages: 1 }),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn().mockResolvedValue(makeTemplate()),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn(),
    updateTemplateData: vi.fn(),
    getSiteInfo: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Organization tools', () => {
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
      // The callback is always the last argument
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerOrganizationTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }> }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('list_by_type', () => {
    it('fetches all templates and groups them by type in output', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [
          makeTemplate({ id: 1, title: 'Page A', type: 'page' }),
          makeTemplate({ id: 2, title: 'Page B', type: 'page' }),
          makeTemplate({ id: 3, title: 'Hero', type: 'section' }),
        ],
        total: 3,
        total_pages: 1,
      });

      const result = await callTool('list_by_type', { status: 'publish' });
      const text = result.content[0]!.text;

      expect(text).toContain('PAGE');
      expect(text).toContain('SECTION');
      expect(text).toContain('[1] Page A');
      expect(text).toContain('[3] Hero');
    });

    it('passes effective status to listTemplates', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 });
      await callTool('list_by_type', { status: 'draft' });
      expect(client.listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
      );
    });

    it('omits status param when status is "any"', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 });
      await callTool('list_by_type', { status: 'any' });
      expect(client.listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined }),
      );
    });

    it('paginates through multiple pages', async () => {
      vi.mocked(client.listTemplates)
        .mockResolvedValueOnce({
          templates: [makeTemplate({ id: 1 })],
          total: 2,
          total_pages: 2,
        })
        .mockResolvedValueOnce({
          templates: [makeTemplate({ id: 2, type: 'section' })],
          total: 2,
          total_pages: 2,
        });

      const result = await callTool('list_by_type', { status: 'publish' });
      expect(client.listTemplates).toHaveBeenCalledTimes(2);
      expect(result.content[0]!.text).toContain('Total: 2 templates');
    });
  });

  describe('audit_library', () => {
    it('identifies templates with no categories', async () => {
      vi.mocked(client.listTemplates)
        .mockResolvedValueOnce({
          templates: [
            makeTemplate({ id: 1, title: 'Categorized', categories: ['hero'], status: 'publish' }),
            makeTemplate({ id: 2, title: 'Uncategorized', categories: [], status: 'publish' }),
          ],
          total: 2,
          total_pages: 1,
        })
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 }) // draft
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 }); // private

      const result = await callTool('audit_library');
      const text = result.content[0]!.text;

      expect(text).toContain('No Categories (1)');
      expect(text).toContain('[2] Uncategorized');
      // [1] Categorized may appear in other sections (e.g. Stale) — only assert the No Categories section
      const noCatSection = text.split('-- No Categories')[1]?.split('--')[0] ?? '';
      expect(noCatSection).not.toContain('[1] Categorized');
    });

    it('identifies draft templates', async () => {
      vi.mocked(client.listTemplates)
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 }) // publish
        .mockResolvedValueOnce({
          templates: [makeTemplate({ id: 5, title: 'WIP Hero', status: 'draft' })],
          total: 1,
          total_pages: 1,
        }) // draft
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 }); // private

      const result = await callTool('audit_library');
      const text = result.content[0]!.text;

      expect(text).toContain('Draft Templates (1)');
      expect(text).toContain('[5] WIP Hero');
    });

    it('includes template counts by type and status in output', async () => {
      vi.mocked(client.listTemplates)
        .mockResolvedValueOnce({
          templates: [
            makeTemplate({ type: 'page', status: 'publish' }),
            makeTemplate({ id: 2, type: 'section', status: 'publish' }),
          ],
          total: 2,
          total_pages: 1,
        })
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 })
        .mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 });

      const result = await callTool('audit_library');
      const text = result.content[0]!.text;

      expect(text).toContain('Total templates: 2');
      expect(text).toContain('By Type');
      expect(text).toContain('page: 1');
      expect(text).toContain('section: 1');
    });
  });

  describe('set_category', () => {
    it('calls updateTemplate with categories array', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(
        makeTemplate({ id: 3, categories: ['landing', 'hero'] }),
      );

      await callTool('set_category', { id: 3, categories: ['landing', 'hero'] });

      expect(client.updateTemplate).toHaveBeenCalledWith(3, {
        categories: ['landing', 'hero'],
      });
    });

    it('returns confirmation with new categories', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(
        makeTemplate({ id: 3, title: 'My Page', categories: ['landing'] }),
      );

      const result = await callTool('set_category', { id: 3, categories: ['landing'] });
      expect(result.content[0]!.text).toContain('landing');
      expect(result.content[0]!.text).toContain('[3]');
    });
  });

  describe('set_tags', () => {
    it('calls updateTemplate with tags array', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(
        makeTemplate({ id: 4, tags: ['promo', 'seasonal'] }),
      );

      await callTool('set_tags', { id: 4, tags: ['promo', 'seasonal'] });

      expect(client.updateTemplate).toHaveBeenCalledWith(4, {
        tags: ['promo', 'seasonal'],
      });
    });

    it('handles empty tags array (clear tags)', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(makeTemplate({ id: 4, tags: [] }));

      await callTool('set_tags', { id: 4, tags: [] });
      expect(client.updateTemplate).toHaveBeenCalledWith(4, { tags: [] });
    });

    it('returns confirmation with tag list', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(
        makeTemplate({ id: 4, title: 'Promo', tags: ['promo'] }),
      );

      const result = await callTool('set_tags', { id: 4, tags: ['promo'] });
      expect(result.content[0]!.text).toContain('promo');
    });
  });
});
