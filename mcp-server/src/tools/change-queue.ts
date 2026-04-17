import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ElementifyClient,
  QueuedChange,
  GlobalColor,
  GlobalTypographyEntry,
  CreateTemplateInput,
  SiteContext,
} from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

// ------------------------------------------------------------------ //
// Operation executor map
// Maps operation names to client method calls using the stored params.
// ------------------------------------------------------------------ //
type Executor = (client: ElementifyClient, params: Record<string, unknown>) => Promise<unknown>;

const OPERATION_EXECUTORS: Record<string, Executor> = {
  set_global_colors: (c, p) =>
    c.setGlobalColors(
      p['colors'] as GlobalColor[],
      ((p['slot'] as string) ?? 'system') as 'system' | 'custom',
    ),
  set_global_typography: (c, p) =>
    c.setGlobalTypography(
      p['typography'] as GlobalTypographyEntry[],
      ((p['slot'] as string) ?? 'system') as 'system' | 'custom',
    ),
  update_template_data: (c, p) =>
    c.updateTemplateData(p['template_id'] as number, p['elementor_data'] as unknown[]),
  update_page_data: (c, p) =>
    c.updatePageData(p['page_id'] as number, p['elementor_data'] as unknown[]),
  create_template: (c, p) =>
    c.createTemplate(p as unknown as CreateTemplateInput),
  set_site_logo: (c, p) =>
    c.setLogo(p['media_id'] as number),
  set_site_context: (c, p) =>
    c.setSiteContext(p as Partial<Omit<SiteContext, 'set_at'>>),
  flush_elementor_cache: (c, _p) =>
    c.flushElementorCache(),
  optimize_elementor_assets: (c, _p) =>
    c.optimizeElementorAssets(),
  update_seo_meta: (c, p) =>
    c.updateSeoMeta(p as { post_id: number; title?: string; description?: string; focus_keyword?: string }),
  update_site_settings: (c, p) =>
    c.updateSiteSettings(p as { blogname?: string; description?: string; homepage?: number; posts_page?: number; permalink?: string }),
  // Page tools
  save_page_section_as_template: async (c, p) => {
    const page_id = p['page_id'] as number;
    const section_index = p['section_index'] as number;
    const template_title = p['template_title'] as string;
    const template_type = ((p['template_type'] as string) ?? 'container') as 'page' | 'section' | 'container' | 'widget';
    const status = ((p['status'] as string) ?? 'publish') as 'publish' | 'draft';
    
    // Extract section
    const pageData = await c.getPageData({ id: page_id, extract: 'section', index: section_index });
    const element = pageData.element;
    if (!element) throw new Error(`No element at index ${section_index}`);
    
    // Create template
    const created = await c.createTemplate({
      title: template_title,
      type: template_type,
      status: status,
    });
    
    // Write element as template data
    await c.updateTemplateData(created.id, [element]);
    return { id: created.id, title: created.title };
  },
  save_full_page_as_template: async (c, p) => {
    const page_id = p['page_id'] as number;
    const template_title = p['template_title'] as string;
    const status = (p['status'] as string) ?? 'publish';
    
    const pageData = await c.getPageData({ id: page_id });
    const created = await c.createTemplate({
      title: template_title,
      type: 'page',
      status: status as 'publish' | 'draft',
    });
    await c.updateTemplateData(created.id, pageData.elementor_data);
    return { id: created.id, title: created.title };
  },
  compose_page_from_templates: async (c, p) => {
    const sources = p['sources'] as Array<{ template_id: number; sections?: number[] }>;
    const save_as_template = p['save_as_template'] as { title: string; template_type?: string; status?: string } | undefined;
    const write_to_page = p['write_to_page'] as { page_id: number } | undefined;
    
    if (!save_as_template && !write_to_page) {
      throw new Error('Must specify at least one of save_as_template or write_to_page');
    }
    
    // Collect sections from all source templates
    const composed: unknown[] = [];
    for (const src of sources) {
      const tplData = await c.getTemplateData(src.template_id);
      const elements = tplData.elementor_data as unknown[];
      if (!Array.isArray(elements) || elements.length === 0) continue;
      
      if (src.sections && src.sections.length > 0) {
        const picked = src.sections.map(i => elements[i]).filter(Boolean);
        composed.push(...picked);
      } else {
        composed.push(...elements);
      }
    }
    
    if (composed.length === 0) {
      throw new Error('Nothing to compose — all sources were empty or all indices were out of range.');
    }
    
    const results: string[] = [];
    
    // Save as template
    if (save_as_template) {
      const created = await c.createTemplate({
        title: save_as_template.title,
        type: (save_as_template.template_type ?? 'page') as 'page' | 'section' | 'container' | 'widget',
        status: (save_as_template.status ?? 'publish') as 'publish' | 'draft',
      });
      await c.updateTemplateData(created.id, composed);
      results.push(`Saved as template: "${save_as_template.title}" (ID: ${created.id})`);
    }
    
    // Write to page
    if (write_to_page) {
      await c.updatePageData(write_to_page.page_id, composed);
      results.push(`Written to page ${write_to_page.page_id}`);
    }
    
    return { results };
  },
  // Import operations (L2)
  import_external_data: (c, p) =>
    c.importExternalData({
      format: p['format'] as 'csv' | 'json' | 'xml',
      data: p['data'] as string,
      post_type: p['post_type'] as string,
      field_mapping: p['field_mapping'] as Record<string, string> | undefined,
      duplicate_detection: p['duplicate_detection'] as 'title' | 'slug' | 'sku' | 'none',
      dry_run: p['dry_run'] as boolean,
    }),
  // Delete operations (L3)
  delete_template: (c, p) =>
    c.deleteTemplate(p['id'] as number),
  delete_post: (c, p) =>
    c.deletePost({ id: p['id'] as number, force: p['force'] as boolean | undefined }),
  delete_menu: (c, p) =>
    c.deleteMenu(p['id'] as number),
  delete_menu_item: (c, p) =>
    c.deleteMenuItem(p['id'] as number),
  delete_term: (c, p) =>
    c.deleteTerm({ taxonomy: p['taxonomy'] as string, id: p['id'] as number, force: p['force'] as boolean | undefined }),
  delete_media: (c, p) =>
    c.deleteMedia(p['id'] as number, p['force'] as boolean | undefined),
};

const SUPPORTED_OPERATIONS = Object.keys(OPERATION_EXECUTORS).join(', ');

// ------------------------------------------------------------------ //
// Display helper
// ------------------------------------------------------------------ //
function formatChange(c: QueuedChange): string[] {
  const icon: Record<string, string> = {
    pending:  '🟡',
    approved: '✅',
    rejected: '❌',
    applied:  '🔵',
  };
  const lines: string[] = [];
  lines.push(`${icon[c.status] ?? '⚪'} [${c.id}] ${c.operation}`);
  lines.push(`   Status: ${c.status}  •  Created: ${c.created_at}`);
  if (c.note)        lines.push(`   Note: ${c.note}`);
  if (c.review_note) lines.push(`   Review note: ${c.review_note}`);
  if (c.applied_at)  lines.push(`   Applied: ${c.applied_at}`);
  lines.push(`   Params: ${JSON.stringify(c.params).slice(0, 200)}`);
  if (c.before_state) {
    lines.push(`   Before: ${JSON.stringify(c.before_state).slice(0, 120)}`);
  }
  return lines;
}

// ------------------------------------------------------------------ //
// Tool registration
// ------------------------------------------------------------------ //
export function registerChangeQueueTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ---------------------------------------------------------------- //
  // queue_change
  // ---------------------------------------------------------------- //
  server.tool(
    'queue_change',
    `Queue a write operation for human review before it is applied. Use this instead of calling write tools directly when changes should go through a review workflow. Supported operations: ${SUPPORTED_OPERATIONS}.`,
    {
      operation:    z.string()
                     .describe(`The operation to queue. One of: ${SUPPORTED_OPERATIONS}`),
      params:       z.record(z.unknown())
                     .describe('Parameters for the operation (same as you would pass to the tool directly)'),
      note:         z.string().optional()
                     .describe('Reason for this change — shown to the reviewer'),
      before_state: z.record(z.unknown()).optional()
                     .describe('Optional snapshot of current state for diff display (e.g. current colors before changing them)'),
      site_id:      z.string().optional(),
      consent:      z.boolean().optional()
                     .describe('Explicit consent required for L3 operations. Must be true if governance level is L3.'),
    },
    async ({ operation, params, note, before_state, site_id, consent }) => {
      if (!OPERATION_EXECUTORS[operation]) {
        return {
          content: [{
            type: 'text' as const,
            text: `Operation "${operation}" is not supported for queuing.\n\nSupported operations: ${SUPPORTED_OPERATIONS}`,
          }],
        };
      }

      const level = GOVERNANCE_LEVELS[operation] || 'L0';
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text' as const,
            text: `Operation "${operation}" requires explicit consent (governance level L3). Please provide consent: true to queue this change.`,
          }],
        };
      }

      const client = getClient(site_id);
      const change = await client.createChange({ operation, params, note, before_state });

      const lines = [
        `🟡 Change queued for review`,
        `   ID: ${change.id}`,
        `   Operation: ${change.operation}`,
        note ? `   Note: ${note}` : '',
        '',
        'Next steps:',
        '  1. review_change(change_id, "approve") — approve it',
        '  2. apply_change(change_id)             — execute it on the site',
        '  Or: review_change(change_id, "reject") to discard.',
        '',
        'Use list_change_queue to see all pending changes.',
      ].filter(Boolean);

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // list_change_queue
  // ---------------------------------------------------------------- //
  server.tool(
    'list_change_queue',
    'List queued changes awaiting review or previously processed. Useful for site owners to see what an AI agent has proposed before any changes are made live.',
    {
      status:  z.enum(['pending', 'approved', 'rejected', 'applied', 'all'])
                .optional().default('pending'),
      site_id: z.string().optional(),
    },
    async ({ status, site_id }) => {
      const client = getClient(site_id);
      const filter = status ?? 'pending';
      const result = await client.listChanges(filter);

      if (result.total === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No ${filter !== 'all' ? filter + ' ' : ''}changes in queue.`,
          }],
        };
      }

      const lines = [
        `Change Queue — ${result.total} change(s) [filter: ${filter}]`,
        '',
      ];

      for (const change of result.changes) {
        lines.push(...formatChange(change));
        lines.push('');
      }

      if (filter === 'pending') {
        lines.push('Use review_change(id, "approve") or review_change(id, "reject") to process.');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // review_change
  // ---------------------------------------------------------------- //
  server.tool(
    'review_change',
    'Approve or reject a queued change. Approving marks it as ready to execute — use apply_change afterward. Rejecting discards it permanently.',
    {
      change_id: z.string().describe('The change ID from queue_change or list_change_queue'),
      action:    z.enum(['approve', 'reject'])
                  .describe('"approve" marks it ready to apply; "reject" discards it'),
      reason:    z.string().optional().describe('Optional note explaining the decision'),
      site_id:   z.string().optional(),
    },
    async ({ change_id, action, reason, site_id }) => {
      const client    = getClient(site_id);
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const change    = await client.updateChangeStatus(change_id, newStatus, reason);

      const icon = action === 'approve' ? '✅' : '❌';
      const lines = [
        `${icon} Change ${action}d — ${change.id}`,
        `   Operation: ${change.operation}`,
        `   Status: ${change.status}`,
        reason ? `   Reason: ${reason}` : '',
        '',
        action === 'approve'
          ? 'Now use apply_change to execute this change on the site.'
          : 'Change has been rejected and will not be applied.',
      ].filter(Boolean);

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // apply_change
  // ---------------------------------------------------------------- //
  server.tool(
    'apply_change',
    'Execute an approved queued change. The change must have status "approved". Re-runs the stored operation with its original params against the live site, then marks it as "applied".',
    {
      change_id: z.string().describe('The change ID to apply (must be approved first)'),
      site_id:   z.string().optional(),
    },
    async ({ change_id, site_id }) => {
      const client = getClient(site_id);

      const change = await client.getChange(change_id);

      if (change.status !== 'approved') {
        return {
          content: [{
            type: 'text' as const,
            text: [
              `Cannot apply change ${change_id}: status is "${change.status}" (must be "approved").`,
              '',
              'Use review_change(change_id, "approve") first.',
            ].join('\n'),
          }],
        };
      }

      const executor = OPERATION_EXECUTORS[change.operation];
      if (!executor) {
        return {
          content: [{
            type: 'text' as const,
            text: `Cannot apply change ${change_id}: operation "${change.operation}" has no executor.\n\nSupported: ${SUPPORTED_OPERATIONS}`,
          }],
        };
      }

      let result: unknown;
      try {
        result = await executor(client, change.params);
      } catch (e) {
        return {
          content: [{
            type: 'text' as const,
            text: `Failed to apply change ${change_id}: ${(e as Error).message}`,
          }],
        };
      }

      // Mark as applied in the queue
      await client.updateChangeStatus(change_id, 'applied');

      const lines = [
        `🔵 Change applied — ${change.id}`,
        `   Operation: ${change.operation}`,
        `   Result: ${JSON.stringify(result).slice(0, 200)}`,
        '',
        'Change has been marked as applied in the queue.',
      ];

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}
