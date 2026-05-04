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
 * Determine if an add‑on is ElementsKit (Free or Pro).
 */
function isElementsKit(addon: Addon): boolean {
  return addon.plugin_slug.startsWith('elementskit');
}

/**
 * Find the ElementsKit entry in an add‑on list.
 */
function findElementsKit(addons: Array<Addon>) {
  return addons.find(isElementsKit);
}

export function registerElementsKitFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_elementskit (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_elementskit',
    'Detect ElementsKit for Elementor (Free/Pro), version, tier, and widget count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const ek = findElementsKit(addons);

        if (!ek) {
          return {
            content: [{
              type: 'text',
              text: '# ElementsKit Detection\n\n**ElementsKit**: Not detected.\n\nElementsKit for Elementor is not installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const ekDetailed = detailed.find(isElementsKit);
        const widgetCount = ekDetailed?.widgets.length ?? 0;

        const lines = [
          '# ElementsKit Detection',
          `**Detected**: ${ek.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${ek.plugin_name}`,
          `**Version**: ${ek.version ?? 'unknown'}`,
          `**Tier**: ${ek.tier ?? 'unknown'}`,
          `**Widget count**: ${widgetCount}`,
        ];

        if (ek.active) {
          lines.push('\n## Status');
          lines.push('ElementsKit is active and ready.');
        } else {
          lines.push('\n## Status');
          lines.push('ElementsKit is installed but not active.');
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
            text: `# Error\n\nFailed to detect ElementsKit: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_elementskit_widgets (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_elementskit_widgets',
    'List all ElementsKit widgets with activation status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const ekDetailed = detailed.find(isElementsKit);

        if (!ekDetailed || !ekDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# ElementsKit Widgets\n\nElementsKit not detected or not active.',
            }],
          };
        }

        const widgets = ekDetailed.widgets;
        const activeCount = widgets.filter(w => w.active).length;
        const totalCount = widgets.length;

        const lines = [
          '# ElementsKit Widgets',
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
            text: `# Error\n\nFailed to list ElementsKit widgets: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerElementsKitAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_elementskit_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_elementskit_usage',
    'Scan pages for ekit-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for ekit-* widgets
        // This requires fetching each page's Elementor data and counting widget types.
        // For now, return a placeholder.
        return {
          content: [{
            type: 'text',
            text: '# ElementsKit Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for ekit-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze ElementsKit usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // optimize_elementskit_config (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_elementskit_config',
    'Suggest deactivating unused ElementsKit widgets based on site-wide usage.',
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
            text: '# ElementsKit Configuration Optimization\n\nThis feature is not yet implemented. It will analyze widget usage and suggest deactivating unused widgets to improve performance.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to optimize ElementsKit config: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_elementskit (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_elementskit',
    'Guided setup recommendations for ElementsKit.',
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
            text: '# ElementsKit Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring ElementsKit based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run ElementsKit wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}