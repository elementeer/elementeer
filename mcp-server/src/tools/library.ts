import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

const TemplateTypeSchema = z.enum([
  'page',
  'section',
  'container',
  'widget',
  'popup',
  'kit',
  'global-widget',
]);

const TemplateStatusSchema = z.enum(['publish', 'draft', 'private', 'trash']);

export function registerLibraryTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_templates
  // ------------------------------------------------------------------ //
  server.tool(
    'list_templates',
    'List Elementor templates from the library. Supports filtering by type, status, and keyword search.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to default site)'),
      type: TemplateTypeSchema.optional().describe('Filter by template type'),
      status: TemplateStatusSchema.optional().describe('Filter by status (default: publish)'),
      search: z.string().optional().describe('Search templates by title keyword'),
      category: z.string().optional().describe('Filter by category slug'),
      page: z.number().int().min(1).optional().default(1).describe('Page number'),
      per_page: z.number().int().min(1).max(100).optional().default(20).describe('Results per page'),
    },
    async ({ site_id, type, status, search, category, page, per_page }) => {
      const client = getClient(site_id);
      const result = await client.listTemplates({ type, status, search, category, page, per_page });

      const rows = result.templates.map((t) =>
        `  [${t.id}] ${t.title} (${t.type}, ${t.status})`,
      );

      return {
        content: [
          {
            type: 'text',
            text: [
              `Found ${result.total} template(s) — page ${page} of ${result.total_pages}`,
              ...rows,
            ].join('\n'),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // get_template
  // ------------------------------------------------------------------ //
  server.tool(
    'get_template',
    'Get details for a single Elementor template by ID.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, site_id }) => {
      const client = getClient(site_id);
      const t = await client.getTemplate(id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: t.id,
                title: t.title,
                type: t.type,
                status: t.status,
                author: t.author,
                date: t.date,
                modified: t.modified,
                categories: t.categories,
                tags: t.tags,
                shortcode: t.shortcode,
                has_elementor_data: !!t.elementor_data,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // create_template
  // ------------------------------------------------------------------ //
  server.tool(
    'create_template',
    'Create a new Elementor template in the library.',
    {
      title: z.string().min(1).describe('Template title'),
      type: TemplateTypeSchema.describe('Template type'),
      status: TemplateStatusSchema.optional().default('draft').describe('Initial publish status'),
      elementor_data: z
        .string()
        .optional()
        .describe('Raw Elementor JSON data string (optional, leave empty for blank template)'),
      categories: z.array(z.string()).optional().default([]).describe('Category slugs to assign'),
      tags: z.array(z.string()).optional().default([]).describe('Tags to assign'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ title, type, status, elementor_data, categories, tags, site_id }) => {
      const client = getClient(site_id);
      const t = await client.createTemplate({ title, type, status, elementor_data, categories, tags });

      return {
        content: [
          {
            type: 'text',
            text: `Created template [${t.id}] "${t.title}" (${t.type}, ${t.status})\nShortcode: ${t.shortcode ?? 'n/a'}`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // update_template
  // ------------------------------------------------------------------ //
  server.tool(
    'update_template',
    'Update metadata (title, status, categories, tags) of an existing Elementor template.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      title: z.string().optional().describe('New title'),
      status: TemplateStatusSchema.optional().describe('New status'),
      categories: z.array(z.string()).optional().describe('Replace category list'),
      tags: z.array(z.string()).optional().describe('Replace tags list'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, title, status, categories, tags, site_id }) => {
      const client = getClient(site_id);
      const t = await client.updateTemplate(id, { title, status, categories, tags });

      return {
        content: [
          {
            type: 'text',
            text: `Updated template [${t.id}] "${t.title}" — status: ${t.status}, modified: ${t.modified}`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // delete_template
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_template',
    'Permanently delete an Elementor template from the library.',
    {
      id: z.number().int().positive().describe('Template post ID to delete'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, site_id }) => {
      const client = getClient(site_id);
      await client.deleteTemplate(id);

      return {
        content: [
          {
            type: 'text',
            text: `Deleted template [${id}] successfully.`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // rename_template
  // ------------------------------------------------------------------ //
  server.tool(
    'rename_template',
    'Rename an Elementor template.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      title: z.string().min(1).describe('New title'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, title, site_id }) => {
      const client = getClient(site_id);
      const t = await client.updateTemplate(id, { title });

      return {
        content: [
          {
            type: 'text',
            text: `Renamed template [${t.id}] to "${t.title}".`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // duplicate_template
  // ------------------------------------------------------------------ //
  server.tool(
    'duplicate_template',
    'Duplicate an Elementor template, optionally giving the copy a new title.',
    {
      id: z.number().int().positive().describe('Source template post ID'),
      title: z.string().optional().describe('Title for the duplicate (defaults to "Copy of [original]")'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, title, site_id }) => {
      const client = getClient(site_id);
      const t = await client.duplicateTemplate(id, title);

      return {
        content: [
          {
            type: 'text',
            text: `Duplicated template [${id}] → new template [${t.id}] "${t.title}".`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // bulk_rename
  // ------------------------------------------------------------------ //
  server.tool(
    'bulk_rename',
    'Rename multiple Elementor templates in one call. Provide an array of {id, title} pairs.',
    {
      renames: z
        .array(
          z.object({
            id: z.number().int().positive().describe('Template post ID'),
            title: z.string().min(1).describe('New title'),
          }),
        )
        .min(1)
        .describe('List of id + new title pairs'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ renames, site_id }) => {
      const client = getClient(site_id);
      const results: string[] = [];
      const errors: string[] = [];

      for (const { id, title } of renames) {
        try {
          const t = await client.updateTemplate(id, { title });
          results.push(`  [${t.id}] → "${t.title}"`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`  [${id}] FAILED: ${msg}`);
        }
      }

      const lines: string[] = [`Bulk rename — ${results.length} succeeded, ${errors.length} failed.`];
      if (results.length > 0) lines.push('Renamed:', ...results);
      if (errors.length > 0) lines.push('Errors:', ...errors);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
