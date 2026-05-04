// @ts-nocheck
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

type Addon = {
  active: boolean;
  version: string | null;
  tier: string | null;
  plugin_name: string;
  plugin_slug: string;
};

/**
 * Determine if an add‑on is PowerPack (Free or Pro).
 */
function isPowerPack(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('powerpack');
}

/**
 * Find the PowerPack entry in an add‑on list.
 */
function findPowerPack(addons: Array<Addon>) {
  return addons.find(isPowerPack);
}

export function registerPowerPackFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_powerpack (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_powerpack',
    'Detect PowerPack for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const pp = findPowerPack(addons);

        if (!pp) {
          return {
            content: [{
              type: 'text',
              text: '# PowerPack Detection\n\n**PowerPack**: Not detected.\n\nPowerPack for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const ppDetailed = detailed.find(isPowerPack);
        const widgetCount = ppDetailed?.widgets.length ?? 0;

        const lines = [
          '# PowerPack Detection',
          `**Detected**: ${pp.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${pp.plugin_name}`,
          `**Version**: ${pp.version ?? 'unknown'}`,
          `**Tier**: ${pp.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (pp.active) {
          lines.push('\n## Status');
          lines.push('PowerPack is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('PowerPack is installed but not active.');
        }

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
            text: `# Error\n\nFailed to detect PowerPack: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_powerpack_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_powerpack_widgets',
    'List all PowerPack widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const ppDetailed = detailed.find(isPowerPack);

        if (!ppDetailed || !ppDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# PowerPack Widgets\n\nPowerPack not detected or not active.',
            }],
          };
        }

        const widgets = ppDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# PowerPack Widgets',
          `**Total widgets**: ${totalCount}`,
          `**Active widgets**: ${activeCount}`,
          `**Inactive widgets**: ${totalCount - activeCount}`,
          '',
          '## Widget List',
        ];

        if (widgets.length === 0) {
          lines.push('No widget data available.');
        } else {
          for (const widget of widgets) {
            lines.push(`- **${widget.title}** (\`${widget.id}\`) – ${widget.active ? '✅ Active' : '❌ Inactive'}`);
          }
        }

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
            text: `# Error\n\nFailed to list PowerPack widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerPowerPackAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_powerpack_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_powerpack_usage',
    'Scan pages for pp-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for pp-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# PowerPack Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for pp-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze PowerPack usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_powerpack_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_powerpack_config',
    'Suggest deactivating unused PowerPack widgets based on site-wide usage.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement optimization suggestions
        return {
          content: [{
            type: 'text',
            text: '# PowerPack Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize PowerPack config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_powerpack (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_powerpack',
    'Guided setup recommendations for PowerPack.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement wizard logic
        return {
          content: [{
            type: 'text',
            text: '# PowerPack Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring PowerPack based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run PowerPack wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}