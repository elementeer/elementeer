import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSiteTools } from '../../tools/site.js';
import type { ElementifyClient } from '../../client.js';
import type { SiteInfo } from '../../client.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpDir: string;

function makeSiteInfo(overrides: Partial<SiteInfo> = {}): SiteInfo {
  return {
    name: 'Test Site',
    url: 'https://test.example.com',
    wp_version: '6.5.0',
    elementor_version: '3.21.0',
    elementor_pro: false,
    activation_mode: 'standalone-free',
    template_count: 12,
    capabilities: ['templates:read', 'templates:write'],
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn(),
    updateTemplateData: vi.fn(),
    getSiteInfo: vi.fn().mockResolvedValue(makeSiteInfo()),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Site tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    // Set up temp config for tests that call listSites / setDefaultSite
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elementify-site-tools-test-'));
    process.env['ELEMENTIFY_CONFIG_PATH'] = path.join(tmpDir, 'config.json');

    const sampleConfig = {
      sites: [
        {
          id: 'site-a',
          name: 'Site A',
          url: 'https://site-a.example.com',
          apiKey: 'ek_aaaa',
          default: true,
        },
        {
          id: 'site-b',
          name: 'Site B',
          url: 'https://site-b.example.com',
          apiKey: 'ek_bbbb',
          default: false,
        },
      ],
    };
    fs.writeFileSync(
      process.env['ELEMENTIFY_CONFIG_PATH']!,
      JSON.stringify(sampleConfig, null, 2),
      'utf-8',
    );

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

    registerSiteTools(server, getClient);
  });

  afterEach(() => {
    delete process.env['ELEMENTIFY_CONFIG_PATH'];
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.resetModules();
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }> }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_site_info', () => {
    it('calls getSiteInfo on the client', async () => {
      await callTool('get_site_info');
      expect(client.getSiteInfo).toHaveBeenCalledOnce();
    });

    it('returns formatted site info text', async () => {
      vi.mocked(client.getSiteInfo).mockResolvedValueOnce(
        makeSiteInfo({ name: 'My Blog', wp_version: '6.5.2', elementor_pro: true }),
      );

      const result = await callTool('get_site_info');
      const text = result.content[0]!.text;

      expect(text).toContain('My Blog');
      expect(text).toContain('6.5.2');
      expect(text).toContain('(Pro)');
      expect(text).toContain('standalone-free');
      expect(text).toContain('Template count: 12');
    });

    it('shows "not detected" when elementor_version is null', async () => {
      vi.mocked(client.getSiteInfo).mockResolvedValueOnce(
        makeSiteInfo({ elementor_version: null }),
      );

      const result = await callTool('get_site_info');
      expect(result.content[0]!.text).toContain('not detected');
    });

    it('passes site_id to getClient', async () => {
      await callTool('get_site_info', { site_id: 'site-b' });
      expect(getClient).toHaveBeenCalledWith('site-b');
    });
  });

  describe('list_sites', () => {
    it('returns all configured sites with IDs and URLs', async () => {
      const result = await callTool('list_sites');
      const text = result.content[0]!.text;

      expect(text).toContain('[site-a]');
      expect(text).toContain('[site-b]');
      expect(text).toContain('https://site-a.example.com');
      expect(text).toContain('https://site-b.example.com');
    });

    it('marks the default site with *', async () => {
      const result = await callTool('list_sites');
      const text = result.content[0]!.text;
      const lines = text.split('\n');

      const defaultLine = lines.find((l) => l.includes('[site-a]'));
      expect(defaultLine).toContain('*');

      const nonDefaultLine = lines.find((l) => l.includes('[site-b]'));
      expect(nonDefaultLine).not.toContain('*');
    });

    it('returns configured count in header', async () => {
      const result = await callTool('list_sites');
      expect(result.content[0]!.text).toContain('2 site(s)');
    });
  });

  describe('switch_site', () => {
    it('updates the default site in config', async () => {
      await callTool('switch_site', { site_id: 'site-b' });

      const saved = JSON.parse(fs.readFileSync(process.env['ELEMENTIFY_CONFIG_PATH']!, 'utf-8'));
      const siteA = saved.sites.find((s: { id: string }) => s.id === 'site-a');
      const siteB = saved.sites.find((s: { id: string }) => s.id === 'site-b');

      expect(siteA.default).toBe(false);
      expect(siteB.default).toBe(true);
    });

    it('returns confirmation text with new default site ID', async () => {
      const result = await callTool('switch_site', { site_id: 'site-b' });
      expect(result.content[0]!.text).toContain('site-b');
      expect(result.content[0]!.text).toContain('Default site switched');
    });

    it('throws when site_id is not found in config', async () => {
      await expect(callTool('switch_site', { site_id: 'ghost' })).rejects.toThrow();
    });
  });
});
