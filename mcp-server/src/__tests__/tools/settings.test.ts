import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSettingsTools } from '../../tools/settings.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getSiteSettings: vi.fn().mockResolvedValue({
      blogname: 'Test Site',
      description: 'Just a test',
      homepage: { id: 2, title: 'Home', url: 'https://example.com/' },
      posts_page: null,
      permalink: '/%postname%/',
      timezone: 'UTC',
      date_format: 'F j, Y',
      time_format: 'g:i a',
      start_of_week: 1,
    }),
    updateSiteSettings: vi.fn().mockResolvedValue({
      updated: ['blogname'],
      settings: { blogname: 'New Site Name' },
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('settings tools', () => {
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

    registerSettingsTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}) {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`${name} not registered`);
    return handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  describe('get_site_settings', () => {
    it('registers get_site_settings tool', () => {
      expect(toolHandlers.has('get_site_settings')).toBe(true);
    });

    it('calls getSiteSettings on the client', async () => {
      await callTool('get_site_settings', {});
      expect(client.getSiteSettings).toHaveBeenCalled();
    });

    it('passes site_id to getClient', async () => {
      await callTool('get_site_settings', { site_id: 'staging' });
      expect(getClient).toHaveBeenCalledWith('staging');
    });

    it('formats settings output correctly', async () => {
      const result = await callTool('get_site_settings', {});
      const text = result.content[0]!.text;
      expect(text).toContain('Blog name: Test Site');
      expect(text).toContain('Tagline: Just a test');
      expect(text).toContain('Homepage: Home (ID: 2)');
      expect(text).toContain('Posts page: Not set');
      expect(text).toContain('Permalink structure: /%postname%/');
      expect(text).toContain('Timezone: UTC');
      expect(text).toContain('Date format: F j, Y');
      expect(text).toContain('Time format: g:i a');
      expect(text).toContain('Week starts on: Monday');
    });

    it('handles missing homepage gracefully', async () => {
      vi.mocked(client.getSiteSettings).mockResolvedValueOnce({
        blogname: 'Site',
        description: '',
        homepage: null,
        posts_page: null,
        permalink: '',
        timezone: 'UTC',
        date_format: 'Y-m-d',
        time_format: 'H:i',
        start_of_week: 0,
      });
      const result = await callTool('get_site_settings', {});
      const text = result.content[0]!.text;
      expect(text).toContain('Homepage: Not set');
      expect(text).toContain('Week starts on: Sunday');
    });
  });

  describe('update_site_settings', () => {
    it('registers update_site_settings tool', () => {
      expect(toolHandlers.has('update_site_settings')).toBe(true);
    });

    it('calls updateSiteSettings with correct parameters', async () => {
      await callTool('update_site_settings', {
        blogname: 'New Site Name',
        homepage: 2,
      });
      expect(client.updateSiteSettings).toHaveBeenCalledWith({
        blogname: 'New Site Name',
        homepage: 2,
      });
    });

    it('returns updated fields summary', async () => {
      vi.mocked(client.updateSiteSettings).mockResolvedValueOnce({
        updated: ['blogname', 'homepage'],
        settings: {
          blogname: 'New Site Name',
          description: 'Just a test',
          homepage: { id: 2, title: 'Home', url: 'https://example.com/' },
          posts_page: null,
          permalink: '/%postname%/',
          timezone: 'UTC',
          date_format: 'F j, Y',
          time_format: 'g:i a',
          start_of_week: 1,
        },
      });
      const result = await callTool('update_site_settings', {
        blogname: 'New Site Name',
        homepage: 2,
      });
      const text = result.content[0]!.text;
      expect(text).toContain('Updated fields: blogname, homepage');
      expect(text).toContain('Blog name: New Site Name');
    });

    it('handles partial updates', async () => {
      vi.mocked(client.updateSiteSettings).mockResolvedValueOnce({
        updated: ['description'],
        settings: {
          blogname: 'Test Site',
          description: 'Updated tagline',
          homepage: null,
          posts_page: null,
          permalink: '/%postname%/',
          timezone: 'UTC',
          date_format: 'F j, Y',
          time_format: 'g:i a',
          start_of_week: 1,
        },
      });
      await callTool('update_site_settings', { description: 'Updated tagline' });
      expect(client.updateSiteSettings).toHaveBeenCalledWith({
        description: 'Updated tagline',
      });
    });
  });
});