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
 * Determine if an add‑on is Happy Addons (Free or Pro).
 */
function isHappyAddons(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('happy-elementor-addons');
}

/**
 * Find the Happy Addons entry in an add‑on list.
 */
function findHappyAddons(addons: Array<Addon>) {
  return addons.find(isHappyAddons);
}

export function registerHappyAddonsFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_happy_addons (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_happy_addons',
    'Detect Happy Addons for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const ha = findHappyAddons(addons);

        if (!ha) {
          return {
            content: [{
              type: 'text',
              text: '# Happy Addons Detection\n\n**Happy Addons**: Not detected.\n\nHappy Addons for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const haDetailed = detailed.find(isHappyAddons);
        const widgetCount = haDetailed?.widgets.length ?? 0;

        const lines = [
          '# Happy Addons Detection',
          `**Detected**: ${ha.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${ha.plugin_name}`,
          `**Version**: ${ha.version ?? 'unknown'}`,
          `**Tier**: ${ha.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (ha.active) {
          lines.push('\n## Status');
          lines.push('Happy Addons is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('Happy Addons is installed but not active.');
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
            text: `# Error\n\nFailed to detect Happy Addons: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_happy_addons_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_happy_addons_widgets',
    'List all Happy Addons widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const haDetailed = detailed.find(isHappyAddons);

        if (!haDetailed || !haDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# Happy Addons Widgets\n\nHappy Addons not detected or not active.',
            }],
          };
        }

        const widgets = haDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# Happy Addons Widgets',
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
            text: `# Error\n\nFailed to list Happy Addons widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerHappyAddonsAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_happy_addons_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_happy_addons_usage',
    'Scan pages for happy-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for happy-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# Happy Addons Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for happy-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze Happy Addons usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_happy_addons_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_happy_addons_config',
    'Suggest deactivating unused Happy Addons widgets based on site-wide usage.',
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
            text: '# Happy Addons Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize Happy Addons config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_happy_addons (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_happy_addons',
    'Guided setup recommendations for Happy Addons.',
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
            text: '# Happy Addons Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring Happy Addons based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run Happy Addons wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}