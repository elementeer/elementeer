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
 * Determine if an add‑on is the Crocoblock suite.
 */
function isCrocoblock(addon: Addon): boolean {
  return addon.plugin_slug === 'crocoblock-suite';
}

/**
 * Find the Crocoblock entry in an add‑on list.
 */
function findCrocoblock(addons: Array<Addon>) {
  return addons.find(isCrocoblock);
}

export function registerCrocoblockFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_crocoblock (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_crocoblock',
    'Detect Crocoblock suite (Jet plugins) and return suite profile.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const addons = await client.listActiveAddons();
        const crocoblock = findCrocoblock(addons);

        if (!crocoblock) {
          return {
            content: [{
              type: 'text',
              text: '# Crocoblock Detection\n\n**Crocoblock suite**: Not detected.\n\nNo Jet plugins (JetEngine, JetElements, etc.) are installed or activated.',
            }],
          };
        }

        const detailed = await client.listActiveAddonsDetailed();
        const cbDetailed = detailed.find(isCrocoblock);
        const pluginCount = Object.keys(cbDetailed?.capabilities ?? {}).length; // approximate

        const lines = [
          '# Crocoblock Suite Detection',
          `**Detected**: ${crocoblock.active ? 'Yes' : 'No'}`,
          `**Plugin**: ${crocoblock.plugin_name}`,
          `**Version**: ${crocoblock.version ?? 'unknown'}`,
          `**Tier**: ${crocoblock.tier ?? 'unknown'}`,
          `**Active Jet plugins**: ${pluginCount}`,
        ];

        if (crocoblock.active) {
          lines.push('\n## Status');
          lines.push('Crocoblock suite is active.');
        } else {
          lines.push('\n## Status');
          lines.push('Crocoblock suite is installed but not active.');
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
            text: `# Error\n\nFailed to detect Crocoblock suite: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_jet_post_types (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_jet_post_types',
    'List custom post types created by JetEngine.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const cbDetailed = detailed.find(isCrocoblock);

        if (!cbDetailed || !cbDetailed.active) {
          return {
            content: [{
              type: 'text',
              text: '# JetEngine Post Types\n\nCrocoblock suite not detected or JetEngine not active.',
            }],
          };
        }

        const postTypes = cbDetailed.post_types;
        const total = postTypes.length;

        const lines = [
          '# JetEngine Custom Post Types',
          `**Total CPTs**: ${total}`,
          '',
          '## Post Type List',
        ];

        if (total === 0) {
          lines.push('No custom post types defined in JetEngine.');
        } else {
          for (const pt of postTypes) {
            lines.push(`- **${pt.label}** (\`${pt.slug}\`)`);
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
            text: `# Error\n\nFailed to list JetEngine post types: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_jet_listings (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_jet_listings',
    'List JetEngine listing template configurations.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement fetching JetEngine listings
        return {
          content: [{
            type: 'text',
            text: '# JetEngine Listings\n\nThis feature is not yet implemented. It will retrieve JetEngine listing template configurations.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to list JetEngine listings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerCrocoblockAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_jet_usage (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_jet_usage',
    'Scan pages for jet-* widget usage across the site.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement page scanning for jet-* widgets
        return {
          content: [{
            type: 'text',
            text: '# Jet Plugin Usage Analysis\n\nThis feature is not yet implemented. It will scan up to ' + limit + ' pages for jet-* widget usage and report frequency.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze Jet usage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_jet_query_builders (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_jet_query_builders',
    'Retrieve JetSmartFilters query configurations.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        // TODO: implement fetching JetSmartFilters query builders
        return {
          content: [{
            type: 'text',
            text: '# JetSmartFilters Query Builders\n\nThis feature is not yet implemented. It will retrieve query builder configurations from JetSmartFilters.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to get Jet query builders: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_crocoblock (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_crocoblock',
    'Guided setup recommendations for the Crocoblock suite.',
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
            text: '# Crocoblock Wizard\n\nThis feature is not yet implemented. It will provide step‑by‑step recommendations for configuring the Crocoblock suite based on your site needs.',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run Crocoblock wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}