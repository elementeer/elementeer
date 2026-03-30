import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGlobalStylesTools } from '../../tools/global-styles.js';
import type { ElementifyClient, GlobalStylesData } from '../../client.js';

function makeStylesData(overrides: Partial<GlobalStylesData> = {}): GlobalStylesData {
  return {
    kit_id: 42,
    system_colors: [
      { _id: 'primary',   title: 'Primary',   color: '#1A56DB' },
      { _id: 'secondary', title: 'Secondary', color: '#F3F4F6' },
      { _id: 'text',      title: 'Text',      color: '#111827' },
      { _id: 'accent',    title: 'Accent',    color: '#6EC1E4' },
    ],
    custom_colors: [],
    system_typography: [
      { _id: 'primary', title: 'Primary', typography_font_family: 'Inter', typography_font_weight: '400', typography_font_size: { unit: 'px', size: 16 } },
    ],
    custom_typography: [],
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
    getSiteInfo: vi.fn(),
    assessSite: vi.fn(),
    getGlobalStyles: vi.fn().mockResolvedValue(makeStylesData()),
    setGlobalColors: vi.fn().mockImplementation(async (colors, slot) => ({
      kit_id: 42,
      slot: slot === 'custom' ? 'custom_colors' : 'system_colors',
      colors: colors.map((c: { id?: string; title: string; color: string }) => ({ _id: c.id ?? c.title.toLowerCase(), title: c.title, color: c.color })),
      updated: true,
    })),
    setGlobalTypography: vi.fn().mockImplementation(async (typography, slot) => ({
      kit_id: 42,
      slot: slot === 'custom' ? 'custom_typography' : 'system_typography',
      typography: typography.map((t: { id?: string; title: string }) => ({ _id: t.id ?? t.title.toLowerCase(), title: t.title })),
      updated: true,
    })),
    getSiteContext: vi.fn(),
    setSiteContext: vi.fn(),
    listElementorPages: vi.fn(),
    getPageData: vi.fn(),
    updatePageData: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('global styles tools', () => {
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

    registerGlobalStylesTools(server, getClient);
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const h = handlers.get(name);
    if (!h) throw new Error(`"${name}" not registered`);
    return h(args) as Promise<{ content: Array<{ text: string }> }>;
  };

  // ---------------------------------------------------------------- //
  // get_global_styles
  // ---------------------------------------------------------------- //
  describe('get_global_styles', () => {
    it('calls getGlobalStyles', async () => {
      await call('get_global_styles', {});
      expect(client.getGlobalStyles).toHaveBeenCalled();
    });

    it('shows system colors in output', async () => {
      const result = await call('get_global_styles', {});
      const text = result.content[0]!.text;
      expect(text).toContain('Kit ID: 42');
      expect(text).toContain('[primary]');
      expect(text).toContain('#1A56DB');
      expect(text).toContain('Accent');
    });

    it('shows "(none defined)" when system_colors is empty', async () => {
      vi.mocked(client.getGlobalStyles).mockResolvedValueOnce(makeStylesData({ system_colors: [], custom_colors: [] }));
      const result = await call('get_global_styles', {});
      const text = result.content[0]!.text;
      expect(text).toContain('(none defined)');
    });

    it('passes site_id to getClient', async () => {
      await call('get_global_styles', { site_id: 'prod' });
      expect(getClient).toHaveBeenCalledWith('prod');
    });
  });

  // ---------------------------------------------------------------- //
  // set_global_colors
  // ---------------------------------------------------------------- //
  describe('set_global_colors', () => {
    it('calls setGlobalColors with colors and slot', async () => {
      const colors = [
        { id: 'primary', title: 'Primary', color: '#1A56DB' },
        { id: 'accent',  title: 'Accent',  color: '#6EC1E4' },
      ];
      await call('set_global_colors', { colors, slot: 'system' });
      expect(client.setGlobalColors).toHaveBeenCalledWith(colors, 'system');
    });

    it('defaults slot to system', async () => {
      await call('set_global_colors', {
        colors: [{ title: 'Primary', color: '#000000' }],
      });
      expect(client.setGlobalColors).toHaveBeenCalledWith(
        expect.any(Array),
        'system',
      );
    });

    it('shows written colors in output', async () => {
      const result = await call('set_global_colors', {
        colors: [{ id: 'primary', title: 'Primary', color: '#1A56DB' }],
      });
      const text = result.content[0]!.text;
      expect(text).toContain('1 color(s) written');
      expect(text).toContain('#1A56DB');
      expect(text).toContain('cache cleared');
    });

    it('can write to custom slot', async () => {
      await call('set_global_colors', {
        colors: [{ title: 'Brand Teal', color: '#0D9488' }],
        slot: 'custom',
      });
      expect(client.setGlobalColors).toHaveBeenCalledWith(expect.any(Array), 'custom');
    });
  });

  // ---------------------------------------------------------------- //
  // set_global_typography
  // ---------------------------------------------------------------- //
  describe('set_global_typography', () => {
    it('calls setGlobalTypography with entries and slot', async () => {
      const typography = [
        { id: 'primary', title: 'Primary', font_family: 'Inter', font_size: 16, font_weight: '400', line_height: 1.6 },
      ];
      await call('set_global_typography', { typography, slot: 'system' });
      expect(client.setGlobalTypography).toHaveBeenCalledWith(typography, 'system');
    });

    it('shows written typography in output', async () => {
      const result = await call('set_global_typography', {
        typography: [{ id: 'primary', title: 'Primary', font_family: 'Inter' }],
      });
      const text = result.content[0]!.text;
      expect(text).toContain('1 typography entry');
      expect(text).toContain('cache cleared');
    });

    it('defaults slot to system', async () => {
      await call('set_global_typography', {
        typography: [{ title: 'Heading', font_family: 'Playfair Display' }],
      });
      expect(client.setGlobalTypography).toHaveBeenCalledWith(expect.any(Array), 'system');
    });
  });

  // ---------------------------------------------------------------- //
  // Recommendation integration: colors + typography are now automated
  // ---------------------------------------------------------------- //
  it('set_global_colors and set_global_typography are the automated tools for brand recs', () => {
    // These tool names must exist (registered by registerGlobalStylesTools)
    expect(handlers.has('get_global_styles')).toBe(true);
    expect(handlers.has('set_global_colors')).toBe(true);
    expect(handlers.has('set_global_typography')).toBe(true);
  });
});
