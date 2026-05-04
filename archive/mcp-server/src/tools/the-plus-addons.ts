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
 * Determine if an add‑on is The Plus Addons (Free or Pro).
 */
function isThePlusAddons(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('the-plus-addons');
}

/**
 * Find the The Plus Addons entry in an add‑on list.
 */
function findThePlusAddons(addons: Array<Addon>) {
  return addons.find(isThePlusAddons);
}

export function registerThePlusAddonsFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_the_plus_addons (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_the_plus_addons',
    'Detect The Plus Addons for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const tpa = findThePlusAddons(addons);

        if (!tpa) {
          return {
            content: [{
              type: 'text',
              text: '# The Plus Addons Detection\n\n**The Plus Addons**: Not detected.\n\nThe Plus Addons for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const tpaDetailed = detailed.find(isThePlusAddons);
        const widgetCount = tpaDetailed?.widgets.length ?? 0;

        const lines = [
          '# The Plus Addons Detection',
          `**Detected**: ${tpa.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${tpa.plugin_name}`,
          `**Version**: ${tpa.version ?? 'unknown'}`,
          `**Tier**: ${tpa.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (tpa.active) {
          lines.push('\n## Status');
          lines.push('The Plus Addons is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('The Plus Addons is installed but not active.');
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
            text: `# Error\n\nFailed to detect The Plus Addons: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_the_plus_addons_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_the_plus_addons_widgets',
    'List all The Plus Addons widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const tpaDetailed = detailed.find(isThePlusAddons);

        if (!tpaDetailed || !tpaDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# The Plus Addons Widgets\n\nThe Plus Addons not detected or not active.',
            }],
          };
        }

        const widgets = tpaDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# The Plus Addons Widgets',
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
            text: `# Error\n\nFailed to list The Plus Addons widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerThePlusAddonsAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_the_plus_addons_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_the_plus_addons_usage',
    'Scan pages for tp-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for tp-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# The Plus Addons Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for tp-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze The Plus Addons usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_the_plus_addons_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_the_plus_addons_config',
    'Suggest deactivating unused The Plus Addons widgets based on site-wide usage.',
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
            text: '# The Plus Addons Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize The Plus Addons config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_the_plus_addons (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_the_plus_addons',
    'Guided setup recommendations for The Plus Addons.',
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
            text: '# The Plus Addons Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring The Plus Addons based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run The Plus Addons wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}