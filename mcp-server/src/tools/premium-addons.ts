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
 * Determine if an add‑on is Premium Addons (Free or Pro).
 */
function isPremiumAddons(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('premium-addons');
}

/**
 * Find the Premium Addons entry in an add‑on list.
 */
function findPremiumAddons(addons: Array<Addon>) {
  return addons.find(isPremiumAddons);
}

export function registerPremiumAddonsFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_premium_addons (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_premium_addons',
    'Detect Premium Addons for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const pa = findPremiumAddons(addons);

        if (!pa) {
          return {
            content: [{
              type: 'text',
              text: '# Premium Addons Detection\n\n**Premium Addons**: Not detected.\n\nPremium Addons for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const paDetailed = detailed.find(isPremiumAddons);
        const widgetCount = paDetailed?.widgets.length ?? 0;

        const lines = [
          '# Premium Addons Detection',
          `**Detected**: ${pa.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${pa.plugin_name}`,
          `**Version**: ${pa.version ?? 'unknown'}`,
          `**Tier**: ${pa.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (pa.active) {
          lines.push('\n## Status');
          lines.push('Premium Addons is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('Premium Addons is installed but not active.');
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
            text: `# Error\n\nFailed to detect Premium Addons: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_premium_addons_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_premium_addons_widgets',
    'List all Premium Addons widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const paDetailed = detailed.find(isPremiumAddons);

        if (!paDetailed || !paDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# Premium Addons Widgets\n\nPremium Addons not detected or not active.',
            }],
          };
        }

        const widgets = paDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# Premium Addons Widgets',
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
            text: `# Error\n\nFailed to list Premium Addons widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerPremiumAddonsAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_premium_addons_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_premium_addons_usage',
    'Scan pages for premium-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for premium-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# Premium Addons Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for premium-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze Premium Addons usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_premium_addons_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_premium_addons_config',
    'Suggest deactivating unused Premium Addons widgets based on site-wide usage.',
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
            text: '# Premium Addons Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize Premium Addons config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_premium_addons (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_premium_addons',
    'Guided setup recommendations for Premium Addons.',
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
            text: '# Premium Addons Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring Premium Addons based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run Premium Addons wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}