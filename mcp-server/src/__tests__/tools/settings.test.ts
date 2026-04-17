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
    // Governance methods
    createChange: vi.fn().mockResolvedValue({ 
      id: 'chg_settings_test', 
      created_at: '2026-03-30T10:00:00+00:00', 
      status: 'pending', 
      operation: 'update_site_settings', 
      params: {}, 
      note: '', 
      before_state: null, 
      reviewed_at: null, 
      review_note: null, 
      applied_at: null 
    }),
    listChanges: vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange: vi.fn().mockResolvedValue({ id: 'chg_settings_test', status: 'approved' }),
    updateChangeStatus: vi.fn().mockResolvedValue({ id: 'chg_settings_test', status: 'approved' }),
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

    it('queues change for review (governance level L2)', async () => {
      await callTool('update_site_settings', {
        blogname: 'New Site Name',
        homepage: 2,
      });
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'update_site_settings',
        params: {
          blogname: 'New Site Name',
          homepage: 2,
        },
        note: 'Auto-queued by governance level L2',
      });
      // Should NOT call updateSiteSettings directly
      expect(client.updateSiteSettings).not.toHaveBeenCalled();
    });

    it('includes note in queued change when provided', async () => {
      await callTool('update_site_settings', {
        blogname: 'Updated',
        note: 'Custom note for review',
      });
      expect(client.createChange).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Custom note for review',
        })
      );
    });

    it('returns queued change summary', async () => {
      const result = await callTool('update_site_settings', {
        blogname: 'Test',
      });
      const text = result.content[0]!.text;
      expect(text).toContain('🟡 Change queued for review (governance level L2)');
      expect(text).toContain('ID: chg_settings_test');
      expect(text).toContain('Operation: update_site_settings');
      expect(text).toContain('Next steps:');
    });

    it('handles partial updates in queued params', async () => {
      await callTool('update_site_settings', { description: 'Updated tagline' });
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'update_site_settings',
        params: {
          description: 'Updated tagline',
        },
        note: 'Auto-queued by governance level L2',
      });
    });
  });
});