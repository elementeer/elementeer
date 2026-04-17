import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

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
      note: z.string().optional()
           .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
           .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, note, consent, ...updates }) => {
      const client = getClient(site_id);
      const toolName = 'update_site_settings';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: updates,
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
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