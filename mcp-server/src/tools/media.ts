import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerMediaTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_media
  // ------------------------------------------------------------------ //
  server.tool(
    'list_media',
    'List media attachments from the WordPress media library with pagination and filtering.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      page: z.number().int().positive().default(1).describe('Page number'),
      per_page: z.number().int().positive().max(100).default(20).describe('Items per page (max 100)'),
      search: z.string().optional().describe('Search term for media titles'),
      mime_type: z.string().optional().describe('Filter by MIME type (e.g., "image/jpeg", "application/pdf")'),
    },
    async ({ site_id, page, per_page, search, mime_type }) => {
      const client = getClient(site_id);
      const result = await client.listMedia({
        page,
        per_page,
        search,
        mime_type,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // get_media
  // ------------------------------------------------------------------ //
  server.tool(
    'get_media',
    'Get details of a single media attachment, including all available image sizes.',
    {
      id: z.number().int().positive().describe('Media attachment ID'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, site_id }) => {
      const client = getClient(site_id);
      const result = await client.getMedia(id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // update_media
  // ------------------------------------------------------------------ //
  server.tool(
    'update_media',
    'Update media metadata: alt text, title, caption, description.',
    {
      id: z.number().int().positive().describe('Media attachment ID'),
      alt_text: z.string().optional().describe('Alt text for accessibility'),
      title: z.string().optional().describe('Attachment title'),
      caption: z.string().optional().describe('Caption (post_excerpt)'),
      description: z.string().optional().describe('Description (post_content)'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, alt_text, title, caption, description, site_id }) => {
      const client = getClient(site_id);
      const result = await client.updateMedia(id, {
        alt_text,
        title,
        caption,
        description,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // delete_media
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_media',
    'Delete a media attachment (move to trash or permanently delete with force=true).',
    {
      id: z.number().int().positive().describe('Media attachment ID'),
      force: z.boolean().default(false).describe('Permanently delete instead of moving to trash'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, force, site_id }) => {
      const client = getClient(site_id);
      const result = await client.deleteMedia(id, force);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}