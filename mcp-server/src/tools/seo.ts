import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

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
      note: z.string().optional()
           .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
           .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, post_id, title, description, focus_keyword, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'update_seo_meta';
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
          params: { post_id, title, description, focus_keyword },
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