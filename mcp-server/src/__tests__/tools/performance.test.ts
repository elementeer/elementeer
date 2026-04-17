import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPerformanceFreeTools, registerPerformanceAdvancedTools } from '../../tools/performance.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    createChange:         vi.fn().mockResolvedValue({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'flush_elementor_cache', params: {}, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
    listChanges:          vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange:            vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    updateChangeStatus:   vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    setGlobalColors:      vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography:  vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    setLogo:              vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext:       vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
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
      php_info: {
        version: '8.2.0',
        memory_limit: '256M',
        max_execution_time: '30',
        upload_max_filesize: '64M',
        post_max_size: '64M',
        opcache_enabled: true,
        eol: false,
      },
      object_cache: {
        enabled: false,
        type: 'none',
        redis: false,
        memcached: false,
        apc: false,
      },
      autoloaded_options: {
        count: 150,
        size_bytes: 102400,
        size_human: '100 KB',
        note: 'OK',
      },
      database_stats: {
        total_size_bytes: 10485760,
        total_size_human: '10 MB',
        data_size_bytes: 8388608,
        index_size_bytes: 2097152,
        table_count: 42,
        has_query_cache: true,
        engine: 'MySQL 8.0',
      },
      enqueued_assets: {
        scripts: 12,
        styles: 8,
        external_scripts: 2,
        external_styles: 1,
        total: 20,
      },
      render_blocking_resources: {
        count: 3,
        resources: [],
        note: 'OK',
      },
    }),
    optimizeElementorAssets: vi.fn().mockResolvedValue({
      optimized: true,
      message: 'Elementor cache cleared. Further optimizations require manual configuration.',
      suggestions: ['Consider using a caching plugin (e.g., WP Rocket, W3 Total Cache).'],
    }),
    cleanDatabase: vi.fn().mockResolvedValue({
      cleaned: true,
      preview: false,
      stats: { revisions: 0, transients: 0, spam_comments: 0, total: 0 },
      message: 'Database cleaned.',
    }),
    getCacheRecommendation: vi.fn().mockResolvedValue({
      hosting: 'generic',
      server: 'Apache',
      recommended_plugin: 'WP Rocket',
      should_install: true,
      reason: 'No caching plugin detected.',
      detected_server_software: 'Apache',
    }),
    diagnoseIssue: vi.fn().mockResolvedValue({
      symptom: 'slow_page',
      title: 'Slow page load',
      steps: [
        { step: 1, action: 'Check plugin count', command: 'wp plugin list', expected: 'Identify resource-heavy plugins', risk: 'Low' },
      ],
      note: 'Diagnosis complete.',
    }),
    readErrorLog: vi.fn().mockResolvedValue({
      exists: true,
      message: 'Log file found.',
      total_lines: 100,
      recent_lines: 50,
      entries: ['[2026-03-30] PHP Notice: Something'],
    }),
    testPluginConflict: vi.fn().mockResolvedValue({
      action: 'deactivate',
      plugin: 'example-plugin',
      simulated: true,
      message: 'Plugin deactivation simulated.',
      note: 'No actual changes made.',
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
      it('queues change for review (governance level L2)', async () => {
        await callTool('flush_elementor_cache', {});
        expect(client.createChange).toHaveBeenCalledWith({
          operation: 'flush_elementor_cache',
          params: {},
          note: 'Auto-queued by governance level L2',
        });
        expect(client.flushElementorCache).not.toHaveBeenCalled();
      });

      it('includes note in queued change when provided', async () => {
        await callTool('flush_elementor_cache', { note: 'Custom note' });
        expect(client.createChange).toHaveBeenCalledWith(
          expect.objectContaining({
            note: 'Custom note',
          })
        );
      });

      it('returns queued change summary', async () => {
        const result = await callTool('flush_elementor_cache', {});
        const text = result.content[0]!.text;
        expect(text).toContain('🟡 Change queued for review (governance level L2)');
        expect(text).toContain('ID: chg_test');
        expect(text).toContain('Operation: flush_elementor_cache');
        expect(text).toContain('Next steps:');
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
          php_info: {
            version: '8.2.0',
            memory_limit: '256M',
            max_execution_time: '30',
            upload_max_filesize: '64M',
            post_max_size: '64M',
            opcache_enabled: true,
            eol: false,
          },
          object_cache: {
            enabled: false,
            type: 'none',
            redis: false,
            memcached: false,
            apc: false,
          },
          autoloaded_options: {
            count: 150,
            size_bytes: 102400,
            size_human: '100 KB',
            note: 'OK',
          },
          database_stats: {
            total_size_bytes: 10485760,
            total_size_human: '10 MB',
            data_size_bytes: 8388608,
            index_size_bytes: 2097152,
            table_count: 42,
            has_query_cache: true,
            engine: 'MySQL 8.0',
          },
          enqueued_assets: {
            scripts: 12,
            styles: 8,
            external_scripts: 2,
            external_styles: 1,
            total: 20,
          },
          render_blocking_resources: {
            count: 3,
            resources: [],
            note: 'OK',
          },
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
      it('queues change for review (governance level L2)', async () => {
        await callTool('optimize_elementor_assets', {});
        expect(client.createChange).toHaveBeenCalledWith({
          operation: 'optimize_elementor_assets',
          params: {},
          note: 'Auto-queued by governance level L2',
        });
        expect(client.optimizeElementorAssets).not.toHaveBeenCalled();
      });

      it('includes note in queued change when provided', async () => {
        await callTool('optimize_elementor_assets', { note: 'Custom note' });
        expect(client.createChange).toHaveBeenCalledWith(
          expect.objectContaining({
            note: 'Custom note',
          })
        );
      });

      it('returns queued change summary', async () => {
        const result = await callTool('optimize_elementor_assets', {});
        const text = result.content[0]!.text;
        expect(text).toContain('🟡 Change queued for review (governance level L2)');
        expect(text).toContain('ID: chg_test');
        expect(text).toContain('Operation: optimize_elementor_assets');
        expect(text).toContain('Next steps:');
      });

      it('passes site_id to getClient', async () => {
        await callTool('optimize_elementor_assets', { site_id: 'staging' });
        expect(getClient).toHaveBeenCalledWith('staging');
      });
    });
  });
});