import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerPerformanceFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // flush_elementor_cache
  // ------------------------------------------------------------------ //
  server.tool(
    'flush_elementor_cache',
    'Flush Elementor CSS cache. Clears generated CSS files and forces regeneration on next page load.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.flushElementorCache();

      return {
        content: [{ type: 'text', text: result.message }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // get_performance_report
  // ------------------------------------------------------------------ //
  server.tool(
    'get_performance_report',
    'Get a performance report for the site: CSS printing method, DOM size estimate, asset optimization status, cache status, and Elementor version.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const report = await client.getPerformanceReport();

      const lines = [
        `CSS printing method: ${report.css_method}`,
        `DOM size: ${report.dom_size.average_nodes > 0 ? `${report.dom_size.average_nodes} nodes` : report.dom_size.note}`,
        `Asset optimization:`,
        `  • Elementor CSS print method: ${report.asset_optimization.elementor_css_print_method}`,
        `  • Optimized CSS: ${report.asset_optimization.elementor_optimized_css ? 'Yes' : 'No'}`,
        `  • Optimized JS: ${report.asset_optimization.elementor_optimized_js ? 'Yes' : 'No'}`,
        `  • Minify CSS: ${report.asset_optimization.minify_css ? 'Yes' : 'No'}`,
        `  • Async loading: ${report.asset_optimization.async_loading ? 'Yes' : 'No'}`,
        `Cache status:`,
        `  • Elementor cache: ${report.cache_status.elementor_cache}`,
        `Elementor: ${report.elementor_status ?? 'Not detected'}${report.elementor_pro ? ' (Pro)' : ''}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}

export function registerPerformanceAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // optimize_elementor_assets
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_elementor_assets',
    'Optimize Elementor assets (Advanced tier). Clears cache and suggests further optimizations.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.optimizeElementorAssets();

      const lines = [
        result.message,
        ...(result.suggestions.length > 0 ? ['Suggestions:', ...result.suggestions.map(s => `  • ${s}`)] : []),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}

// Backwards compatibility: keep original registrar that registers all tools.
export function registerPerformanceTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerPerformanceFreeTools(server, getClient);
  registerPerformanceAdvancedTools(server, getClient);
}