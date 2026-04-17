import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

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
      note: z.string().optional()
           .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
           .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'flush_elementor_cache';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: {},
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
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
    'Get a comprehensive performance and health report: CSS printing method, DOM size, asset optimization, cache status, Elementor version, PHP info, object cache, autoloaded options, database stats, enqueued assets, and render-blocking resources.',
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
        ``,
        `## PHP Information`,
        `  • Version: ${report.php_info.version}`,
        `  • Memory limit: ${report.php_info.memory_limit}`,
        `  • Max execution time: ${report.php_info.max_execution_time}s`,
        `  • Upload max filesize: ${report.php_info.upload_max_filesize}`,
        `  • Post max size: ${report.php_info.post_max_size}`,
        `  • OPcache enabled: ${report.php_info.opcache_enabled ? 'Yes' : 'No'}`,
        `  • End-of-life: ${report.php_info.eol ? '⚠️ PHP version is outdated' : 'OK'}`,
        ``,
        `## Object Cache`,
        `  • Enabled: ${report.object_cache.enabled ? 'Yes' : 'No'}`,
        `  • Type: ${report.object_cache.type}`,
        `  • Redis: ${report.object_cache.redis ? 'Yes' : 'No'}`,
        `  • Memcached: ${report.object_cache.memcached ? 'Yes' : 'No'}`,
        `  • APC: ${report.object_cache.apc ? 'Yes' : 'No'}`,
        ``,
        `## Autoloaded Options`,
        `  • Count: ${report.autoloaded_options.count}`,
        `  • Size: ${report.autoloaded_options.size_human}`,
        `  • Note: ${report.autoloaded_options.note}`,
        ``,
        `## Database Stats`,
        `  • Total size: ${report.database_stats.total_size_human}`,
        `  • Data size: ${report.database_stats.data_size_bytes} bytes`,
        `  • Index size: ${report.database_stats.index_size_bytes} bytes`,
        `  • Table count: ${report.database_stats.table_count}`,
        `  • Query cache: ${report.database_stats.has_query_cache ? 'Yes' : 'No'}`,
        `  • Engine: ${report.database_stats.engine}`,
        ``,
        `## Enqueued Assets`,
        `  • Scripts: ${report.enqueued_assets.scripts}`,
        `  • Styles: ${report.enqueued_assets.styles}`,
        `  • External scripts: ${report.enqueued_assets.external_scripts}`,
        `  • External styles: ${report.enqueued_assets.external_styles}`,
        `  • Total: ${report.enqueued_assets.total}`,
        ``,
        `## Render-blocking Resources`,
        `  • Count: ${report.render_blocking_resources.count}`,
        `  • Note: ${report.render_blocking_resources.note}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
   );

   // ------------------------------------------------------------------ //
   // clean_database (HEALTH-004)
   // ------------------------------------------------------------------ //
   server.tool(
     'clean_database',
     'Clean database bloat: revisions, expired transients, spam comments. L2 governance: auto-queues changes.',
     {
       site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
       preview: z.boolean().default(true).describe('Preview mode (true = count only, false = execute cleanup)'),
       note: z.string().optional().describe('Optional note for queued changes'),
       consent: z.boolean().optional().describe('Explicit consent required for L3 operations'),
     },
     async ({ site_id, preview, note, consent }) => {
       const client = getClient(site_id);
       const toolName = 'clean_database';
       const level = GOVERNANCE_LEVELS[toolName] || 'L0';
       
       // L3 requires explicit consent
       if (level === 'L3' && consent !== true) {
         return {
           content: [{
             type: 'text',
             text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
           }],
         };
       }
       
       // L2 always queues regardless of write_mode
       if (level === 'L2' || level === 'L3') {
         const change = await client.createChange({
           operation: toolName,
           params: { preview },
           note: note || `Auto-queued by governance level ${level}`,
         });

         const lines = [
           `🟡 Change queued for review (governance level ${level})`,
           `   ID: ${change.id}`,
           `   Operation: ${toolName}`,
           note ? `   Note: ${note}` : '',
           `   Preview mode: ${preview ? 'Yes' : 'No'}`,
           '',
           'To apply this change, use `review_change` with action "approve" and then `apply_change`.',
         ];

         return {
           content: [{ type: 'text', text: lines.join('\n') }],
         };
       }

       // L0/L1 execute directly
       const result = await client.cleanDatabase(preview);
       const lines = [
         preview ? '# Database Cleanup Preview' : '# Database Cleanup Executed',
         `**Revisions**: ${result.stats.revisions}`,
         `**Expired transients**: ${result.stats.transients}`,
         `**Spam comments**: ${result.stats.spam_comments}`,
         `**Total items**: ${result.stats.total}`,
         `**Message**: ${result.message}`,
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
      note: z.string().optional()
           .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
           .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'optimize_elementor_assets';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: {},
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
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

  // ------------------------------------------------------------------ //
  // get_cache_recommendation (HEALTH-005)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_cache_recommendation',
    'Hosting-aware cache plugin recommendation. Detects hosting environment and suggests optimal caching strategy.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.getCacheRecommendation();

      const lines = [
        '# Cache Plugin Recommendation',
        `**Hosting**: ${result.hosting}`,
        `**Server**: ${result.server}`,
        `**Detected server software**: ${result.detected_server_software}`,
        '',
        result.should_install
          ? `**Recommended plugin**: ${result.recommended_plugin}`
          : '**Recommendation**: Do NOT install a separate cache plugin',
        `**Reason**: ${result.reason}`,
        '',
        result.should_install
          ? 'You can install the recommended plugin via WordPress admin → Plugins → Add New.'
          : 'Your hosting provider includes built-in caching. Adding another plugin may cause conflicts.',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // diagnose_issue (HEALTH-006)
  // ------------------------------------------------------------------ //
  server.tool(
    'diagnose_issue',
    'Guided troubleshooting for common issues: slow pages, white screen, 500 errors, plugin conflicts.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      symptom: z.enum(['slow_page', 'white_screen', '500_error', 'plugin_conflict']).describe('Type of issue to diagnose'),
    },
    async ({ site_id, symptom }) => {
      const client = getClient(site_id);
      const result = await client.diagnoseIssue(symptom);

      const lines = [
        `# ${result.title}`,
        `**Symptom**: ${result.symptom}`,
        '',
        '## Diagnostic Steps',
        ...result.steps.map(step => {
          const stepLines = [
            `**${step.step}. ${step.action}**`,
            `   Command: ${step.command}`,
            `   Expected: ${step.expected}`,
          ];
          if (step.risk) {
            stepLines.push(`   Risk: ${step.risk} (${step.risk === 'low' ? 'safe to try' : 'requires caution'})`);
          }
          return stepLines.join('\n');
        }),
        '',
        `**Note**: ${result.note}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // read_error_log (HEALTH-006 helper)
  // ------------------------------------------------------------------ //
  server.tool(
    'read_error_log',
    'Read WordPress debug.log file for recent errors. Requires WP_DEBUG_LOG enabled.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      lines: z.number().int().min(1).max(1000).default(50).describe('Number of recent lines to read'),
    },
    async ({ site_id, lines }) => {
      const client = getClient(site_id);
      const result = await client.readErrorLog(lines);

      if (!result.exists) {
        return {
          content: [{ type: 'text', text: result.message || 'debug.log not found. Enable WP_DEBUG_LOG in wp-config.php.' }],
        };
      }

      const linesOutput = [
        `# Error Log (${result.recent_lines} of ${result.total_lines} lines)`,
        '',
        ...result.entries.map((entry, i) => `${i + 1}. ${entry}`),
        '',
        `Total entries: ${result.entries.length}`,
      ];

      return {
        content: [{ type: 'text', text: linesOutput.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // test_plugin_conflict (HEALTH-006 helper, L2 governance)
  // ------------------------------------------------------------------ //
  server.tool(
    'test_plugin_conflict',
    'Safely test plugin conflicts by deactivating/reactivating plugins via REST API. L2 governance auto-queues changes.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      plugin_slug: z.string().describe('Plugin slug (e.g., "akismet", "woocommerce")'),
      action: z.enum(['deactivate', 'reactivate']).describe('Action to perform'),
      note: z.string().optional().describe('Optional note for queued changes'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations'),
    },
    async ({ site_id, plugin_slug, action, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'test_plugin_conflict';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: { plugin_slug, action },
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          `   Plugin: ${plugin_slug}`,
          `   Action: ${action}`,
          note ? `   Note: ${note}` : '',
          '',
          'To apply this change, use `review_change` with action "approve" and then `apply_change`.',
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      }

      // L0/L1 execute directly (simulated for safety)
      const result = await client.testPluginConflict(plugin_slug, action);
      const lines = [
        `# Plugin Conflict Test`,
        `**Plugin**: ${result.plugin}`,
        `**Action**: ${result.action}`,
        `**Simulated**: ${result.simulated ? 'Yes' : 'No'}`,
        `**Message**: ${result.message}`,
        `**Note**: ${result.note}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // generate_critical_css (PERF-006)
  // ------------------------------------------------------------------ //
  server.tool(
    'generate_critical_css',
    'Generate critical CSS for a page or site-wide. Analyzes page HTML, extracts above‑the‑fold styles, and inlines them.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page_id: z.number().optional().describe('Page ID (optional, generates for whole site if omitted)'),
      note: z.string().optional().describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, page_id, note, consent }) => {
      try {
        const client = getClient(site_id);
        const result = await client.generateCriticalCss(page_id);

        const lines: string[] = [
          '# Critical CSS Generated',
          `**Page**: ${page_id ? `ID ${page_id}` : 'Site-wide'}`,
          `**CSS size**: ${result.css_size || 'unknown'} bytes`,
          `**Selectors extracted**: ${result.selectors || 'unknown'}`,
          `**Saved bytes**: ${result.saved_bytes || 'unknown'}`,
          '',
          '## Usage',
          '1. Add the generated CSS to your theme\'s custom CSS or via a plugin.',
          '2. Test page load performance before and after.',
        ];

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error generating critical CSS: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
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