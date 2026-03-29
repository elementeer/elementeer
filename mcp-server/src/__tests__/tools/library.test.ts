import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLibraryTools } from '../../tools/library.js';
import type { ElementifyClient } from '../../client.js';
import { ElementifyApiError } from '../../client.js';

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'My Template',
    type: 'page' as const,
    status: 'publish' as const,
    author: 1,
    date: '2025-01-01T00:00:00',
    modified: '2025-06-01T00:00:00',
    categories: [],
    tags: [],
    shortcode: '[elementor-template id="1"]',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    listTemplates: vi.fn().mockResolvedValue({ templates: [], total: 0, total_pages: 1 }),
    getTemplate: vi.fn().mockResolvedValue(makeTemplate()),
    createTemplate: vi.fn().mockResolvedValue(makeTemplate()),
    updateTemplate: vi.fn().mockResolvedValue(makeTemplate()),
    deleteTemplate: vi.fn().mockResolvedValue({ deleted: true, id: 1 }),
    duplicateTemplate: vi.fn().mockResolvedValue(makeTemplate({ id: 2, title: 'Copy of My Template' })),
    getTemplateData: vi.fn().mockResolvedValue({ id: 1, elementor_data: [] }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 1, updated: true }),
    getSiteInfo: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Library tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    // Capture tool handlers as they are registered
    toolHandlers = new Map();
    const originalTool = server.tool.bind(server);
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      // The callback is always the last argument
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return (originalTool as (...a: Parameters<typeof server.tool>) => ReturnType<typeof server.tool>)(...args);
    });

    registerLibraryTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }> }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('list_templates', () => {
    it('calls listTemplates with correct params', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [makeTemplate({ id: 5, title: 'Hero', type: 'section' })],
        total: 1,
        total_pages: 1,
      });

      await callTool('list_templates', {
        type: 'section',
        status: 'publish',
        search: 'Hero',
        page: 1,
        per_page: 10,
      });

      expect(client.listTemplates).toHaveBeenCalledWith({
        type: 'section',
        status: 'publish',
        search: 'Hero',
        category: undefined,
        page: 1,
        per_page: 10,
      });
    });

    it('returns formatted text with template count', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({
        templates: [makeTemplate({ id: 1, title: 'Page A' })],
        total: 1,
        total_pages: 1,
      });

      const result = await callTool('list_templates', { page: 1, per_page: 20 });
      expect(result.content[0]!.text).toContain('Found 1 template(s)');
      expect(result.content[0]!.text).toContain('[1] Page A');
    });

    it('passes site_id to getClient', async () => {
      vi.mocked(client.listTemplates).mockResolvedValueOnce({ templates: [], total: 0, total_pages: 1 });
      await callTool('list_templates', { site_id: 'site-b', page: 1, per_page: 20 });
      expect(getClient).toHaveBeenCalledWith('site-b');
    });
  });

  describe('get_template', () => {
    it('calls getTemplate with the given ID', async () => {
      await callTool('get_template', { id: 42 });
      expect(client.getTemplate).toHaveBeenCalledWith(42);
    });

    it('returns JSON with template fields', async () => {
      vi.mocked(client.getTemplate).mockResolvedValueOnce(makeTemplate({ id: 42, title: 'Landing Page' }));
      const result = await callTool('get_template', { id: 42 });
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.id).toBe(42);
      expect(parsed.title).toBe('Landing Page');
      expect(parsed).toHaveProperty('has_elementor_data');
    });

    it('surfaces ElementifyApiError for not found', async () => {
      vi.mocked(client.getTemplate).mockRejectedValueOnce(
        new ElementifyApiError('not_found', 'Template not found.', 404),
      );
      await expect(callTool('get_template', { id: 999 })).rejects.toThrow('Template not found.');
    });
  });

  describe('rename_template', () => {
    it('calls updateTemplate with new title', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(makeTemplate({ id: 7, title: 'New Name' }));
      await callTool('rename_template', { id: 7, title: 'New Name' });
      expect(client.updateTemplate).toHaveBeenCalledWith(7, { title: 'New Name' });
    });

    it('returns confirmation text with new title', async () => {
      vi.mocked(client.updateTemplate).mockResolvedValueOnce(makeTemplate({ id: 7, title: 'New Name' }));
      const result = await callTool('rename_template', { id: 7, title: 'New Name' });
      expect(result.content[0]!.text).toContain('New Name');
      expect(result.content[0]!.text).toContain('[7]');
    });
  });

  describe('bulk_rename', () => {
    it('applies new title to each ID via updateTemplate', async () => {
      vi.mocked(client.updateTemplate)
        .mockResolvedValueOnce(makeTemplate({ id: 1, title: 'Alpha' }))
        .mockResolvedValueOnce(makeTemplate({ id: 2, title: 'Beta' }));

      const result = await callTool('bulk_rename', {
        renames: [
          { id: 1, title: 'Alpha' },
          { id: 2, title: 'Beta' },
        ],
      });

      expect(client.updateTemplate).toHaveBeenCalledTimes(2);
      expect(client.updateTemplate).toHaveBeenCalledWith(1, { title: 'Alpha' });
      expect(client.updateTemplate).toHaveBeenCalledWith(2, { title: 'Beta' });
      expect(result.content[0]!.text).toContain('2 succeeded');
    });

    it('reports partial failures without throwing', async () => {
      vi.mocked(client.updateTemplate)
        .mockResolvedValueOnce(makeTemplate({ id: 1, title: 'Alpha' }))
        .mockRejectedValueOnce(new ElementifyApiError('not_found', 'Template 2 not found.', 404));

      const result = await callTool('bulk_rename', {
        renames: [
          { id: 1, title: 'Alpha' },
          { id: 2, title: 'Beta' },
        ],
      });

      expect(result.content[0]!.text).toContain('1 succeeded');
      expect(result.content[0]!.text).toContain('1 failed');
      expect(result.content[0]!.text).toContain('[2] FAILED');
    });

    it('applies prefix rename to all IDs when using renames array with common prefix pattern', async () => {
      vi.mocked(client.updateTemplate)
        .mockResolvedValueOnce(makeTemplate({ id: 10, title: 'v2 - Hero' }))
        .mockResolvedValueOnce(makeTemplate({ id: 11, title: 'v2 - Footer' }))
        .mockResolvedValueOnce(makeTemplate({ id: 12, title: 'v2 - Header' }));

      await callTool('bulk_rename', {
        renames: [
          { id: 10, title: 'v2 - Hero' },
          { id: 11, title: 'v2 - Footer' },
          { id: 12, title: 'v2 - Header' },
        ],
      });

      expect(client.updateTemplate).toHaveBeenCalledTimes(3);
      expect(client.updateTemplate).toHaveBeenCalledWith(10, { title: 'v2 - Hero' });
      expect(client.updateTemplate).toHaveBeenCalledWith(11, { title: 'v2 - Footer' });
      expect(client.updateTemplate).toHaveBeenCalledWith(12, { title: 'v2 - Header' });
    });
  });

  describe('delete_template', () => {
    it('calls deleteTemplate with the given ID', async () => {
      await callTool('delete_template', { id: 5 });
      expect(client.deleteTemplate).toHaveBeenCalledWith(5);
    });

    it('returns confirmation text', async () => {
      const result = await callTool('delete_template', { id: 5 });
      expect(result.content[0]!.text).toContain('[5]');
      expect(result.content[0]!.text).toContain('Deleted');
    });
  });

  describe('duplicate_template', () => {
    it('calls duplicateTemplate with id and optional title', async () => {
      vi.mocked(client.duplicateTemplate).mockResolvedValueOnce(makeTemplate({ id: 99, title: 'My Copy' }));
      await callTool('duplicate_template', { id: 1, title: 'My Copy' });
      expect(client.duplicateTemplate).toHaveBeenCalledWith(1, 'My Copy');
    });

    it('returns new template id in response text', async () => {
      vi.mocked(client.duplicateTemplate).mockResolvedValueOnce(makeTemplate({ id: 99, title: 'Copy of My Template' }));
      const result = await callTool('duplicate_template', { id: 1 });
      expect(result.content[0]!.text).toContain('[99]');
      expect(result.content[0]!.text).toContain('Copy of My Template');
    });
  });
});
