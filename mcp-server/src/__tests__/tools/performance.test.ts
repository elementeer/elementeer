import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPerformanceFreeTools, registerPerformanceAdvancedTools } from '../../tools/performance.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    flushElementorCache: vi.fn().mockResolvedValue({
      flushed: true,
      message: 'Elementor CSS cache cleared.',
    }),
    getPerformanceReport: vi.fn().mockResolvedValue({
      css_method: 'external',
      dom_size: { average_nodes: 0, note: 'DOM size analysis requires page scanning (not implemented).' },
      asset_optimization: {
        elementor_css_print_method: 'external',
        elementor_optimized_css: false,
        elementor_optimized_js: false,
        minify_css: false,
        async_loading: false,
      },
      cache_status: { elementor_cache: 'active', cache_dir: '/var/www/wp-content/uploads/elementor/css' },
      elementor_status: '3.21.0',
      elementor_pro: false,
    }),
    optimizeElementorAssets: vi.fn().mockResolvedValue({
      optimized: true,
      message: 'Elementor cache cleared. Further optimizations require manual configuration.',
      suggestions: ['Consider using a caching plugin (e.g., WP Rocket, W3 Total Cache).'],
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('performance tools', () => {
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
  });

  async function callTool(name: string, args: Record<string, unknown> = {}) {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`${name} not registered`);
    return handler(args) as Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  describe('free tools', () => {
    beforeEach(() => {
      registerPerformanceFreeTools(server, getClient);
    });

    it('registers flush_elementor_cache tool', () => {
      expect(toolHandlers.has('flush_elementor_cache')).toBe(true);
    });

    it('registers get_performance_report tool', () => {
      expect(toolHandlers.has('get_performance_report')).toBe(true);
    });

    describe('flush_elementor_cache', () => {
      it('calls flushElementorCache on the client', async () => {
        await callTool('flush_elementor_cache', {});
        expect(client.flushElementorCache).toHaveBeenCalled();
      });

      it('passes site_id to getClient', async () => {
        await callTool('flush_elementor_cache', { site_id: 'staging' });
        expect(getClient).toHaveBeenCalledWith('staging');
      });

      it('returns the success message', async () => {
        const result = await callTool('flush_elementor_cache', {});
        const text = result.content[0]!.text;
        expect(text).toBe('Elementor CSS cache cleared.');
      });
    });

    describe('get_performance_report', () => {
      it('calls getPerformanceReport on the client', async () => {
        await callTool('get_performance_report', {});
        expect(client.getPerformanceReport).toHaveBeenCalled();
      });

      it('passes site_id to getClient', async () => {
        await callTool('get_performance_report', { site_id: 'staging' });
        expect(getClient).toHaveBeenCalledWith('staging');
      });

      it('formats performance report correctly', async () => {
        const result = await callTool('get_performance_report', {});
        const text = result.content[0]!.text;
        expect(text).toContain('CSS printing method: external');
        expect(text).toContain('DOM size: DOM size analysis requires page scanning (not implemented).');
        expect(text).toContain('Asset optimization:');
        expect(text).toContain('Elementor CSS print method: external');
        expect(text).toContain('Optimized CSS: No');
        expect(text).toContain('Optimized JS: No');
        expect(text).toContain('Minify CSS: No');
        expect(text).toContain('Async loading: No');
        expect(text).toContain('Cache status:');
        expect(text).toContain('Elementor cache: active');
        expect(text).toContain('Elementor: 3.21.0');
      });

      it('handles missing elementor status', async () => {
        vi.mocked(client.getPerformanceReport).mockResolvedValueOnce({
          css_method: 'none',
          dom_size: { average_nodes: 0, note: 'No data.' },
          asset_optimization: {
            elementor_css_print_method: 'none',
            elementor_optimized_css: false,
            elementor_optimized_js: false,
            minify_css: false,
            async_loading: false,
          },
          cache_status: { elementor_cache: 'inactive', cache_dir: null },
          elementor_status: null,
          elementor_pro: false,
        });
        const result = await callTool('get_performance_report', {});
        const text = result.content[0]!.text;
        expect(text).toContain('Elementor: Not detected');
      });
    });
  });

  describe('advanced tools', () => {
    beforeEach(() => {
      registerPerformanceAdvancedTools(server, getClient);
    });

    it('registers optimize_elementor_assets tool', () => {
      expect(toolHandlers.has('optimize_elementor_assets')).toBe(true);
    });

    describe('optimize_elementor_assets', () => {
      it('calls optimizeElementorAssets on the client', async () => {
        await callTool('optimize_elementor_assets', {});
        expect(client.optimizeElementorAssets).toHaveBeenCalled();
      });

      it('passes site_id to getClient', async () => {
        await callTool('optimize_elementor_assets', { site_id: 'staging' });
        expect(getClient).toHaveBeenCalledWith('staging');
      });

      it('returns optimization result with suggestions', async () => {
        const result = await callTool('optimize_elementor_assets', {});
        const text = result.content[0]!.text;
        expect(text).toContain('Elementor cache cleared. Further optimizations require manual configuration.');
        expect(text).toContain('Suggestions:');
        expect(text).toContain('• Consider using a caching plugin (e.g., WP Rocket, W3 Total Cache).');
      });

      it('handles empty suggestions', async () => {
        vi.mocked(client.optimizeElementorAssets).mockResolvedValueOnce({
          optimized: true,
          message: 'Cache cleared.',
          suggestions: [],
        });
        const result = await callTool('optimize_elementor_assets', {});
        const text = result.content[0]!.text;
        expect(text).toBe('Cache cleared.');
        expect(text).not.toContain('Suggestions:');
      });
    });
  });
});