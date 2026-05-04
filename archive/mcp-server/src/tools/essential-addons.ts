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
 * Determine if an add‑on is Essential Addons (Free or Pro).
 */
function isEssentialAddons(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('essential-addons');
}

/**
 * Find the Essential Addons entry in an add‑on list.
 */
function findEssentialAddons(addons: Array<Addon>) {
  return addons.find(isEssentialAddons);
}

export function registerEssentialAddonsFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_essential_addons (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_essential_addons',
    'Detect Essential Addons for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const ea = findEssentialAddons(addons);

        if (!ea) {
          return {
            content: [{
              type: 'text',
              text: '# Essential Addons Detection\n\n**Essential Addons**: Not detected.\n\nEssential Addons for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const eaDetailed = detailed.find(isEssentialAddons);
        const widgetCount = eaDetailed?.widgets.length ?? 0;

        const lines = [
          '# Essential Addons Detection',
          `**Detected**: ${ea.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${ea.plugin_name}`,
          `**Version**: ${ea.version ?? 'unknown'}`,
          `**Tier**: ${ea.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (ea.active) {
          lines.push('\n## Status');
          lines.push('Essential Addons is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('Essential Addons is installed but not active.');
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
            text: `# Error\n\nFailed to detect Essential Addons: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_ea_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_ea_widgets',
    'List all Essential Addons widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const eaDetailed = detailed.find(isEssentialAddons);

        if (!eaDetailed || !eaDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# Essential Addons Widgets\n\nEssential Addons not detected or not active.',
            }],
          };
        }

        const widgets = eaDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# Essential Addons Widgets',
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
            text: `# Error\n\nFailed to list Essential Addons widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerEssentialAddonsAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_ea_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_ea_usage',
    'Scan pages for eael-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for eael-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# Essential Addons Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for eael-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze EA usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_ea_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_ea_config',
    'Suggest deactivating unused EA widgets based on site-wide usage.',
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
            text: '# Essential Addons Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize EA config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_essential_addons (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_essential_addons',
    'Guided setup recommendations for Essential Addons.',
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
            text: '# Essential Addons Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring Essential Addons based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run EA wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}