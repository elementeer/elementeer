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
  set_logo: (c, p) =>
    c.setLogo(p['attachment_id'] as number),
  set_site_context: (c, p) =>
    c.setSiteContext(p as Partial<Omit<SiteContext, 'set_at'>>),
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
    },
    async ({ operation, params, note, before_state, site_id }) => {
      if (!OPERATION_EXECUTORS[operation]) {
        return {
          content: [{
            type: 'text' as const,
            text: `Operation "${operation}" is not supported for queuing.\n\nSupported operations: ${SUPPORTED_OPERATIONS}`,
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
