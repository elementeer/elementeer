/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerAdvancedMediaTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // audit_unused_media
  // ------------------------------------------------------------------ //
  server.tool(
    'audit_unused_media',
    'Audit the media library for potentially unused attachments. Returns media items that are older than a specified number of days and optionally smaller than a size threshold. This is a heuristic audit — actual usage in posts/pages is not checked.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      older_than_days: z.number().int().positive().default(90).describe('Consider media older than this many days'),
      min_size_kb: z.number().int().positive().optional().describe('Optional minimum file size in KB (media smaller than this are considered more likely unused)'),
      limit: z.number().int().positive().max(100).default(20).describe('Maximum number of results to return'),
    },
    async ({ site_id, older_than_days, min_size_kb, limit }) => {
      const client = getClient(site_id);
      
      // Get all media (paginated) - we'll fetch up to a few pages to get enough data
      const allMedia: any[] = [];
      let page = 1;
      const perPage = 50; // max allowed by API
      
      while (allMedia.length < 200 && page <= 5) { // reasonable limit
        const result = await client.listMedia({
          page,
          per_page: perPage,
        });
        
        if (!result.media || result.media.length === 0) {
          break;
        }
        
        allMedia.push(...result.media);
        
        if (result.media.length < perPage) {
          break;
        }
        
        page++;
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - older_than_days);
      const cutoffISO = cutoffDate.toISOString();
      
      // Filter media
      const potentiallyUnused = allMedia.filter((item) => {
        // Older than cutoff
        if (item.date > cutoffISO) {
          return false;
        }
        
        // Optional size filter
        if (min_size_kb !== undefined) {
          const fileSizeKb = (item.metadata?.filesize || 0) / 1024;
          if (fileSizeKb >= min_size_kb) {
            return false;
          }
        }
        
        // Additional heuristics could be added here:
        // - Check if alt text is empty (maybe placeholder)
        // - Check if title is generic (e.g., "image", "img")
        // - Check if mime type is common placeholder (e.g., image/png)
        
        return true;
      });
      
      // Sort by date (oldest first)
      potentiallyUnused.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Limit results
      const results = potentiallyUnused.slice(0, limit);
      
      // Calculate summary stats
      const totalMedia = allMedia.length;
      const unusedCount = potentiallyUnused.length;
      const percentage = totalMedia > 0 ? Math.round((unusedCount / totalMedia) * 100) : 0;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: {
                total_media_scanned: totalMedia,
                potentially_unused_count: unusedCount,
                percentage_of_library: percentage,
                cutoff_days: older_than_days,
                cutoff_date: cutoffISO,
                size_filter_kb: min_size_kb || 'none',
              },
              media: results.map((item) => ({
                id: item.id,
                title: item.title,
                date: item.date,
                mime_type: item.mime_type,
                url: item.url,
                sizes: Object.keys(item.sizes || {}).length,
                alt_text: item.alt_text || '(empty)',
                caption: item.caption || '(empty)',
                file_size_kb: Math.round((item.metadata?.filesize || 0) / 1024),
              })),
              notes: [
                'This audit uses heuristics based on age and optional file size.',
                'It does NOT check actual usage in posts/pages (requires deeper WordPress integration).',
                'Consider reviewing each item before deletion.',
              ],
            }, null, 2),
          },
        ],
      };
    },
  );
}