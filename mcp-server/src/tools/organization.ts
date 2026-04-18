/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import type { ElementifyTemplate } from '@elementify/shared';


export function registerOrganizationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_by_type
  // ------------------------------------------------------------------ //
  server.tool(
    'list_by_type',
    'List all Elementor templates grouped by their type (page, section, container, etc).',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      status: z
        .enum(['publish', 'draft', 'private', 'trash', 'any'])
        .optional()
        .default('publish')
        .describe('Template status filter'),
    },
    async ({ site_id, status }) => {
      const client = getClient(site_id);
      const effectiveStatus = status === 'any' ? undefined : status;

      // Fetch all pages (up to 100 per page — aggregate if needed)
      const first = await client.listTemplates({ status: effectiveStatus, per_page: 100, page: 1 });
      let templates = first.templates;

      for (let page = 2; page <= first.total_pages; page++) {
        const more = await client.listTemplates({ status: effectiveStatus, per_page: 100, page });
        templates = templates.concat(more.templates);
      }

      // Group by type
      const grouped: Record<string, ElementifyTemplate[]> = {};
      for (const t of templates) {
        if (!grouped[t.type]) grouped[t.type] = [];
        grouped[t.type]!.push(t);
      }

      const lines: string[] = [`Total: ${templates.length} templates\n`];
      for (const [type, list] of Object.entries(grouped).sort()) {
        lines.push(`${type.toUpperCase()} (${list.length})`);
        for (const t of list) {
          lines.push(`  [${t.id}] ${t.title} — ${t.status}`);
        }
        lines.push('');
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // set_category
  // ------------------------------------------------------------------ //
  server.tool(
    'set_category',
    'Set (replace) the categories on an Elementor template.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      categories: z
        .array(z.string().min(1))
        .min(1)
        .describe('Category slugs to assign (replaces existing categories)'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, categories, site_id }) => {
      const client = getClient(site_id);
      const t = await client.updateTemplate(id, { categories });

      return {
        content: [
          {
            type: 'text',
            text: `Template [${t.id}] "${t.title}" — categories set to: ${t.categories.join(', ') || '(none)'}`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // set_tags
  // ------------------------------------------------------------------ //
  server.tool(
    'set_tags',
    'Set (replace) the tags on an Elementor template.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      tags: z.array(z.string().min(1)).describe('Tags to assign (replaces existing tags, pass [] to clear)'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, tags, site_id }) => {
      const client = getClient(site_id);
      const t = await client.updateTemplate(id, { tags });

      return {
        content: [
          {
            type: 'text',
            text: `Template [${t.id}] "${t.title}" — tags set to: ${t.tags.join(', ') || '(none)'}`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // audit_library
  // ------------------------------------------------------------------ //
  server.tool(
    'audit_library',
    'Audit the Elementor template library and report: total counts by type and status, templates without categories, draft templates, and templates not modified in >90 days.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);

      // Collect all templates across statuses
      const statuses = ['publish', 'draft', 'private'] as const;
      let allTemplates: ElementifyTemplate[] = [];

      for (const status of statuses) {
        try {
          const first = await client.listTemplates({ status, per_page: 100, page: 1 });
          let batch = first.templates;
          for (let p = 2; p <= first.total_pages; p++) {
            const more = await client.listTemplates({ status, per_page: 100, page: p });
            batch = batch.concat(more.templates);
          }
          allTemplates = allTemplates.concat(batch);
        } catch {
          // status may return 0 results, that's fine
        }
      }

      const now = Date.now();
      const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const noCategory: ElementifyTemplate[] = [];
      const drafts: ElementifyTemplate[] = [];
      const stale: ElementifyTemplate[] = [];

      for (const t of allTemplates) {
        byType[t.type] = (byType[t.type] ?? 0) + 1;
        byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

        if (t.categories.length === 0) noCategory.push(t);
        if (t.status === 'draft') drafts.push(t);

        const modifiedMs = new Date(t.modified).getTime();
        if (!isNaN(modifiedMs) && now - modifiedMs > NINETY_DAYS_MS) {
          stale.push(t);
        }
      }

      const lines: string[] = [
        `=== Elementor Library Audit ===`,
        `Total templates: ${allTemplates.length}`,
        '',
        '-- By Type --',
        ...Object.entries(byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => `  ${type}: ${count}`),
        '',
        '-- By Status --',
        ...Object.entries(byStatus)
          .sort()
          .map(([status, count]) => `  ${status}: ${count}`),
        '',
        `-- No Categories (${noCategory.length}) --`,
        ...noCategory.map((t) => `  [${t.id}] ${t.title} (${t.type})`),
        '',
        `-- Draft Templates (${drafts.length}) --`,
        ...drafts.map((t) => `  [${t.id}] ${t.title} (${t.type})`),
        '',
        `-- Stale >90 days (${stale.length}) --`,
        ...stale.map((t) => `  [${t.id}] ${t.title} — last modified ${t.modified}`),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
