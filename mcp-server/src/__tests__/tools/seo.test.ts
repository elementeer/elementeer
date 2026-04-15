import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSeoTools } from '../../tools/seo.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getSeoMeta: vi.fn().mockResolvedValue({
      post_id: 123,
      plugin: 'rankmath',
      title: 'Sample SEO Title',
      description: 'Sample meta description',
      focus_keyword: 'sample keyword',
    }),
    updateSeoMeta: vi.fn().mockResolvedValue({
      post_id: 123,
      plugin: 'rankmath',
      updated: ['title', 'description'],
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('seo tools', () => {
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

    registerSeoTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}) {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`${name} not registered`);
    return handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  describe('get_seo_meta', () => {
    it('registers get_seo_meta tool', () => {
      expect(toolHandlers.has('get_seo_meta')).toBe(true);
    });

    it('calls getSeoMeta on the client with post_id', async () => {
      await callTool('get_seo_meta', { post_id: 123 });
      expect(client.getSeoMeta).toHaveBeenCalledWith({ post_id: 123 });
    });

    it('passes site_id to getClient', async () => {
      await callTool('get_seo_meta', { site_id: 'staging', post_id: 123 });
      expect(getClient).toHaveBeenCalledWith('staging');
    });

    it('formats SEO meta output correctly', async () => {
      const result = await callTool('get_seo_meta', { post_id: 123 });
      const text = result.content[0]!.text;
      expect(text).toContain('Post ID: 123');
      expect(text).toContain('Detected plugin: rankmath');
      expect(text).toContain('SEO title: Sample SEO Title');
      expect(text).toContain('Meta description: Sample meta description');
      expect(text).toContain('Focus keyword: sample keyword');
    });

    it('handles empty meta fields', async () => {
      vi.mocked(client.getSeoMeta).mockResolvedValueOnce({
        post_id: 456,
        plugin: '',
        title: '',
        description: '',
        focus_keyword: '',
      });
      const result = await callTool('get_seo_meta', { post_id: 456 });
      const text = result.content[0]!.text;
      expect(text).toContain('Detected plugin: none');
      expect(text).toContain('SEO title: (empty)');
      expect(text).toContain('Meta description: (empty)');
      expect(text).toContain('Focus keyword: (empty)');
    });
  });

  describe('update_seo_meta', () => {
    it('registers update_seo_meta tool', () => {
      expect(toolHandlers.has('update_seo_meta')).toBe(true);
    });

    it('calls updateSeoMeta with correct parameters', async () => {
      await callTool('update_seo_meta', {
        post_id: 123,
        title: 'New Title',
        description: 'New Description',
        focus_keyword: 'new keyword',
      });
      expect(client.updateSeoMeta).toHaveBeenCalledWith({
        post_id: 123,
        title: 'New Title',
        description: 'New Description',
        focus_keyword: 'new keyword',
      });
    });

    it('handles partial updates', async () => {
      await callTool('update_seo_meta', {
        post_id: 123,
        title: 'Only title updated',
      });
      expect(client.updateSeoMeta).toHaveBeenCalledWith({
        post_id: 123,
        title: 'Only title updated',
      });
    });

    it('returns updated fields summary', async () => {
      vi.mocked(client.updateSeoMeta).mockResolvedValueOnce({
        post_id: 123,
        plugin: 'yoast',
        updated: ['title', 'focus_keyword'],
      });
      const result = await callTool('update_seo_meta', {
        post_id: 123,
        title: 'New Title',
        focus_keyword: 'new',
      });
      const text = result.content[0]!.text;
      expect(text).toContain('Post ID: 123');
      expect(text).toContain('Plugin: yoast');
      expect(text).toContain('Updated fields: title, focus_keyword');
    });

    it('handles no updates', async () => {
      vi.mocked(client.updateSeoMeta).mockResolvedValueOnce({
        post_id: 123,
        plugin: 'rankmath',
        updated: [],
      });
      const result = await callTool('update_seo_meta', { post_id: 123 });
      const text = result.content[0]!.text;
      expect(text).toContain('Updated fields: none');
    });
  });
});