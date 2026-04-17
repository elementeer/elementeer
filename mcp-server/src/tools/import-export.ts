import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

export function registerImportExportTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // import_external_data
  // ------------------------------------------------------------------ //
  server.tool(
    'import_external_data',
    'Import posts, pages, or products from external data (CSV/JSON/XML) with field mapping and duplicate detection.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      format: z.enum(['csv', 'json', 'xml']).default('json').describe('Data format'),
      data: z.string().describe('Data content as string (CSV text, JSON string, or XML string)'),
      post_type: z.string().default('post').describe('Target post type (post, page, product, etc.)'),
      field_mapping: z.record(z.string(), z.string()).optional().describe('Mapping from source field names to WordPress field names (title, content, excerpt, meta_{key}, etc.)'),
      duplicate_detection: z.enum(['title', 'slug', 'sku', 'none']).default('title').describe('Field to use for duplicate detection'),
      dry_run: z.boolean().default(false).describe('If true, only analyze and report without importing'),
      note: z.string().optional().describe('Optional note for the change queue'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async (args) => {
      try {
        const client = getClient(args.site_id);
        const toolName = 'import_external_data';
        const level = GOVERNANCE_LEVELS[toolName] || 'L0';
        
        // L3 requires explicit consent
        if (level === 'L3' && args.consent !== true) {
          return {
            content: [{
              type: 'text',
              text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
            }],
          };
        }
        
        // For L2/L3, queue the creation
        if (level === 'L2' || level === 'L3') {
          const change = await client.createChange({
            operation: 'import_external_data',
            params: {
              format: args.format,
              data: args.data,
              post_type: args.post_type,
              field_mapping: args.field_mapping,
              duplicate_detection: args.duplicate_detection,
              dry_run: args.dry_run,
            },
            note: args.note || `Import ${args.post_type} from ${args.format} data (${args.data.length} bytes)`,
          });

          const lines = [
            `🟡 External data import queued for review (governance level ${level})`,
            `   ID: ${change.id}`,
            `   Operation: import_external_data`,
            `   Format: ${args.format}`,
            `   Post type: ${args.post_type}`,
            `   Duplicate detection: ${args.duplicate_detection}`,
            `   Data size: ${args.data.length} bytes`,
            args.dry_run ? `   DRY RUN: No changes will be applied until approved and executed.` : '',
            '',
            'Next steps:',
            '  1. review_change(change_id, "approve") — approve the import plan',
            '  2. apply_change(change_id)             — execute the import',
            '  Or: review_change(change_id, "reject") to discard.',
          ].filter(Boolean);

          return {
            content: [{
              type: 'text',
              text: lines.join('\n'),
            }],
          };
        }
        
        // L1 or L0 - direct execution (should not happen as we set L2)
        // For safety, we still queue
        const change = await client.createChange({
          operation: 'import_external_data',
          params: args,
          note: `Import ${args.post_type} from ${args.format} data`,
        });
        
        return {
          content: [{
            type: 'text',
            text: `Import queued (change ID: ${change.id}). This operation requires review before execution.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error queuing external data import: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // mass_export
  // ------------------------------------------------------------------ //
  server.tool(
    'mass_export',
    'Bulk export of posts, pages, or products as CSV/JSON with filters. Supports filtering by post_type, category, date range, status, author, etc. Returns exported data as downloadable content or direct text.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      post_type: z.string().default('post').describe('Post type to export (post, page, product, etc.)'),
      format: z.enum(['csv', 'json']).default('json').describe('Output format'),
      filters: z.object({
        status: z.string().optional().describe('Post status (publish, draft, pending, private, future, trash, any)'),
        category: z.union([z.string(), z.number()]).optional().describe('Category slug or ID'),
        author: z.number().optional().describe('Author user ID'),
        search: z.string().optional().describe('Search term'),
        date_range: z.object({
          start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
          end: z.string().optional().describe('End date (YYYY-MM-DD)'),
        }).optional().describe('Date range filter'),
      }).optional().default({}).describe('Filters to narrow export'),
      limit: z.number().min(1).max(1000).default(100).describe('Maximum number of items to export'),
      offset: z.number().min(0).default(0).describe('Offset for pagination'),
      note: z.string().optional().describe('Optional note for the change queue'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async (args) => {
      try {
        const client = getClient(args.site_id);
        const toolName = 'mass_export';
        const level = GOVERNANCE_LEVELS[toolName] || 'L0';
        
        // Apply defaults (in case validation is bypassed, e.g., in tests)
        const filters = args.filters ?? {};
        const limit = args.limit ?? 100;
        const offset = args.offset ?? 0;
        
        // L3 requires explicit consent
        if (level === 'L3' && args.consent !== true) {
          return {
            content: [{
              type: 'text',
              text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
            }],
          };
        }
        
        // For L2/L3, queue the creation
        if (level === 'L2' || level === 'L3') {
          const change = await client.createChange({
            operation: 'mass_export',
            params: {
              post_type: args.post_type,
              format: args.format,
              filters: filters,
              limit: limit,
              offset: offset,
            },
            note: args.note || `Export ${args.post_type} as ${args.format}`,
          });

          const lines = [
            `🟡 Bulk export queued for review (governance level ${level})`,
            `   ID: ${change.id}`,
            `   Operation: mass_export`,
            `   Post type: ${args.post_type}`,
            `   Format: ${args.format}`,
            `   Limit: ${limit}`,
            `   Offset: ${offset}`,
            filters && Object.keys(filters).length > 0 ? `   Filters: ${JSON.stringify(filters)}` : '',
            '',
            'Next steps:',
            '  1. review_change(change_id, "approve") — approve the export plan',
            '  2. apply_change(change_id)             — execute the export',
            '  Or: review_change(change_id, "reject") to discard.',
          ].filter(Boolean);

          return {
            content: [{
              type: 'text',
              text: lines.join('\n'),
            }],
          };
        }
        
        // L1 or L0 - direct execution (should not happen as we set L2)
        // For safety, we still queue
        const change = await client.createChange({
          operation: 'mass_export',
          params: args,
          note: `Export ${args.post_type} as ${args.format}`,
        });
        
        return {
          content: [{
            type: 'text',
            text: `Export queued (change ID: ${change.id}). This operation requires review before execution.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error queuing bulk export: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}