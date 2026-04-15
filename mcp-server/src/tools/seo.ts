import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerSeoTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_seo_meta
  // ------------------------------------------------------------------ //
  server.tool(
    'get_seo_meta',
    'Get SEO meta (title, description, focus keyword) for a post/page. Auto-detects active SEO plugin: Yoast SEO, Rank Math, SEOPress, or All‑In‑One SEO.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      post_id: z.number().describe('Post or page ID'),
    },
    async ({ site_id, post_id }) => {
      const client = getClient(site_id);
      const meta = await client.getSeoMeta({ post_id });

      const lines = [
        `Post ID: ${meta.post_id}`,
        `Detected plugin: ${meta.plugin || 'none'}`,
        `SEO title: ${meta.title || '(empty)'}`,
        `Meta description: ${meta.description || '(empty)'}`,
        `Focus keyword: ${meta.focus_keyword || '(empty)'}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // update_seo_meta
  // ------------------------------------------------------------------ //
  server.tool(
    'update_seo_meta',
    'Update SEO meta (title, description, focus keyword) for a post/page. Works with the active SEO plugin.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      post_id: z.number().describe('Post or page ID'),
      title: z.string().optional().describe('New SEO title (leave empty to keep unchanged)'),
      description: z.string().optional().describe('New meta description (leave empty to keep unchanged)'),
      focus_keyword: z.string().optional().describe('New focus keyword (leave empty to keep unchanged)'),
    },
    async ({ site_id, post_id, title, description, focus_keyword }) => {
      const client = getClient(site_id);
      const result = await client.updateSeoMeta({
        post_id,
        title,
        description,
        focus_keyword,
      });

      const lines = [
        `Post ID: ${result.post_id}`,
        `Plugin: ${result.plugin}`,
        `Updated fields: ${result.updated.join(', ') || 'none'}`,
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}