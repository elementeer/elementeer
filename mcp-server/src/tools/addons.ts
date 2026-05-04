// @ts-nocheck
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerAddonTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_active_addons (Free)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_active_addons',
    'List all active Elementor add‑on plugins detected by the adapter framework.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const addons = await client.listActiveAddons();

      if (addons.length === 0) {
        return {
          content: [{ type: 'text', text: 'No active Elementor add‑ons detected.' }],
        };
      }

      const lines = [
        `Active Elementor add‑ons (${addons.length}):`,
        '',
        ...addons.map((addon, idx) => {
          const version = addon.version ? `v${addon.version}` : 'version unknown';
          const tier = addon.tier ? ` (${addon.tier})` : '';
          return `${idx + 1}. ${addon.plugin_name} ${version}${tier}`;
        }),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}