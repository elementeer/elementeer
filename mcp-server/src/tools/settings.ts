import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerSettingsTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_site_settings
  // ------------------------------------------------------------------ //
  server.tool(
    'get_site_settings',
    'Get WordPress core settings: blog name, tagline, homepage, posts page, permalink structure, timezone, date/time formats, and start of week.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const settings = await client.getSiteSettings();

      const lines = [
        `Blog name: ${settings.blogname}`,
        `Tagline: ${settings.description}`,
        `Homepage: ${settings.homepage ? `${settings.homepage.title} (ID: ${settings.homepage.id})` : 'Not set'}`,
        `Posts page: ${settings.posts_page ? `${settings.posts_page.title} (ID: ${settings.posts_page.id})` : 'Not set'}`,
        `Permalink structure: ${settings.permalink || 'Plain'}`,
        `Timezone: ${settings.timezone}`,
        `Date format: ${settings.date_format}`,
        `Time format: ${settings.time_format}`,
        `Week starts on: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.start_of_week]}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // update_site_settings
  // ------------------------------------------------------------------ //
  server.tool(
    'update_site_settings',
    'Update WordPress core settings. You can change blog name, tagline, homepage, posts page, or permalink structure.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      blogname: z.string().optional().describe('New blog name'),
      description: z.string().optional().describe('New tagline'),
      homepage: z.number().optional().describe('Page ID to set as homepage (0 to reset to latest posts)'),
      posts_page: z.number().optional().describe('Page ID to set as posts page (0 to clear)'),
      permalink: z.string().optional().describe('Permalink structure (e.g., "/%postname%/")'),
    },
    async ({ site_id, ...updates }) => {
      const client = getClient(site_id);
      const result = await client.updateSiteSettings(updates);

      const lines = [
        `Updated fields: ${result.updated.join(', ') || 'none'}`,
        `New settings:`,
        `  Blog name: ${result.settings.blogname}`,
        `  Tagline: ${result.settings.description}`,
        `  Homepage: ${result.settings.homepage ? `${result.settings.homepage.title} (ID: ${result.settings.homepage.id})` : 'Not set'}`,
        `  Posts page: ${result.settings.posts_page ? `${result.settings.posts_page.title} (ID: ${result.settings.posts_page.id})` : 'Not set'}`,
        `  Permalink: ${result.settings.permalink || 'Plain'}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}