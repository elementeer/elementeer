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
 * Determine if an add‑on is Ultimate Addons (Free or Pro).
 */
function isUltimateAddons(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('ultimate-elementor');
}

/**
 * Find the Ultimate Addons entry in an add‑on list.
 */
function findUltimateAddons(addons: Array<Addon>) {
  return addons.find(isUltimateAddons);
}

export function registerUltimateAddonsFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_uae (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_uae',
    'Detect Ultimate Addons for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const uae = findUltimateAddons(addons);

        if (!uae) {
          return {
            content: [{
              type: 'text',
              text: '# Ultimate Addons Detection\n\n**Ultimate Addons**: Not detected.\n\nUltimate Addons for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const uaeDetailed = detailed.find(isUltimateAddons);
        const widgetCount = uaeDetailed?.widgets.length ?? 0;

        const lines = [
          '# Ultimate Addons Detection',
          `**Detected**: ${uae.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${uae.plugin_name}`,
          `**Version**: ${uae.version ?? 'unknown'}`,
          `**Tier**: ${uae.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (uae.active) {
          lines.push('\n## Status');
          lines.push('Ultimate Addons is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('Ultimate Addons is installed but not active.');
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
            text: `# Error\n\nFailed to detect Ultimate Addons: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_uae_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_uae_widgets',
    'List all Ultimate Addons widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const uaeDetailed = detailed.find(isUltimateAddons);

        if (!uaeDetailed || !uaeDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# Ultimate Addons Widgets\n\nUltimate Addons not detected or not active.',
            }],
          };
        }

        const widgets = uaeDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# Ultimate Addons Widgets',
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
            text: `# Error\n\nFailed to list Ultimate Addons widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerUltimateAddonsAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_uae_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_uae_usage',
    'Scan pages for uael-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for uael-* widgets
        return {
          content: [{
            type: 'text',
            text: '# Ultimate Addons Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for uael-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze UAE usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_uae (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_uae',
    'Guided setup recommendations for Ultimate Addons.',
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
            text: '# Ultimate Addons Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring Ultimate Addons based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run UAE wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}