import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { listSites, setDefaultSite } from '../config.js';

export function registerSiteTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_site_info
  // ------------------------------------------------------------------ //
  server.tool(
    'get_site_info',
    'Get information about a WordPress site running the Elementify plugin: WP version, Elementor version, activation mode, template count, and available capabilities.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const info = await client.getSiteInfo();

      const lines = [
        `Site: ${info.name}`,
        `URL: ${info.url}`,
        `WordPress: ${info.wp_version}`,
        `Elementor: ${info.elementor_version ?? 'not detected'}${info.elementor_pro ? ' (Pro)' : ''}`,
        `Activation mode: ${info.activation_mode}`,
        `Template count: ${info.template_count}`,
        `Capabilities: ${info.capabilities.length > 0 ? info.capabilities.join(', ') : '(none)'}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // list_sites
  // ------------------------------------------------------------------ //
  server.tool(
    'list_sites',
    'List all WordPress sites configured in ~/.elementify/config.json.',
    {},
    async () => {
      const sites = listSites();

      if (sites.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No sites configured. Edit ~/.elementify/config.json to add a site.',
            },
          ],
        };
      }

      const lines = sites.map(
        (s) =>
          `  ${s.default ? '*' : ' '} [${s.id}] ${s.name} — ${s.url} (${s.activationMode ?? 'unknown mode'})`,
      );

      return {
        content: [
          {
            type: 'text',
            text: [`${sites.length} site(s) configured (* = default):`, ...lines].join('\n'),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // switch_site
  // ------------------------------------------------------------------ //
  server.tool(
    'switch_site',
    'Set a different site as the default in ~/.elementify/config.json. All subsequent tool calls will use this site unless site_id is explicitly provided.',
    {
      site_id: z.string().min(1).describe('Site ID to make the default'),
    },
    async ({ site_id }) => {
      setDefaultSite(site_id);

      return {
        content: [
          {
            type: 'text',
            text: `Default site switched to "${site_id}". Future tool calls will use this site.`,
          },
        ],
      };
    },
  );
}
