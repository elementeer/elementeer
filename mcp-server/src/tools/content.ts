import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

export function registerContentTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_template_data
  // ------------------------------------------------------------------ //
  server.tool(
    'get_template_data',
    'Get the raw Elementor JSON data (_elementor_data) for a template. Returns the full widget/section tree.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, site_id }) => {
      const client = getClient(site_id);
      const result = await client.getTemplateData(id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.elementor_data, null, 2),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // update_template_data
  // ------------------------------------------------------------------ //
  server.tool(
    'update_template_data',
    'Replace the Elementor JSON data for a template. Overwrites _elementor_data entirely — use with caution.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      elementor_data: z
        .string()
        .describe('JSON-encoded Elementor data array (the full widget tree as a JSON string)'),
      site_id: z.string().optional().describe('Site ID from config'),
      note: z.string().optional()
        .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
        .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ id, elementor_data, site_id, note, consent }) => {
      let parsed: unknown[];
      try {
        parsed = JSON.parse(elementor_data) as unknown[];
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: elementor_data must be valid JSON. Could not parse the provided string.',
            },
          ],
          isError: true,
        };
      }

      if (!Array.isArray(parsed)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: elementor_data must be a JSON array (the top-level Elementor data is always an array of sections/containers).',
            },
          ],
          isError: true,
        };
      }

      const client = getClient(site_id);
      const toolName = 'update_template_data';
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
          params: { id, elementor_data },
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
      await client.updateTemplateData(id, parsed);

      return {
        content: [
          {
            type: 'text',
            text: `Updated Elementor data for template [${id}]. ${parsed.length} top-level element(s) written.`,
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // extract_sections
  // ------------------------------------------------------------------ //
  server.tool(
    'extract_sections',
    'Extract a flat list of top-level sections/containers from a template\'s Elementor data, with their IDs, types, and column counts. Useful for auditing layout structure without loading the full data.',
    {
      id: z.number().int().positive().describe('Template post ID'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, site_id }) => {
      const client = getClient(site_id);
      const result = await client.getTemplateData(id);
      const data = result.elementor_data;

      if (!Array.isArray(data) || data.length === 0) {
        return {
          content: [{ type: 'text', text: 'Template has no Elementor data.' }],
        };
      }

      interface ElementorElement {
        id?: string;
        elType?: string;
        widgetType?: string;
        elements?: ElementorElement[];
        settings?: Record<string, unknown>;
      }

      const sections = (data as ElementorElement[]).map((el, index) => {
        const children = Array.isArray(el.elements) ? el.elements : [];
        return {
          index,
          id: el.id ?? null,
          elType: el.elType ?? 'unknown',
          child_count: children.length,
          // For sections, children are columns; for containers, children are widgets
          children_types: [...new Set(children.map((c) => c.elType ?? c.widgetType ?? 'unknown'))],
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sections, null, 2),
          },
        ],
      };
    },
  );

  // ------------------------------------------------------------------ //
  // create_page
  // ------------------------------------------------------------------ //
  server.tool(
    'create_page',
    'Create a new WordPress page. Optionally make it Elementor-ready.',
    {
      title: z.string().min(1).describe('Page title'),
      content: z.string().optional().describe('Page content (HTML)'),
      status: z.enum(['draft', 'publish', 'pending', 'private']).default('draft').describe('Page status'),
      parent: z.number().int().nonnegative().optional().describe('Parent page ID'),
      elementor_ready: z.boolean().default(false).describe('Set Elementor edit mode to builder and initialize empty Elementor data'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ title, content, status, parent, elementor_ready, site_id }) => {
      const client = getClient(site_id);
      const result = await client.createPage({
        title,
        content: content || '',
        status,
        parent,
        elementor_ready,
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
  // create_post
  // ------------------------------------------------------------------ //
  server.tool(
    'create_post',
    'Create a new WordPress post with optional categories and tags.',
    {
      title: z.string().min(1).describe('Post title'),
      content: z.string().optional().describe('Post content (HTML)'),
      status: z.enum(['draft', 'publish', 'pending', 'private']).default('draft').describe('Post status'),
      categories: z.array(z.number().int().positive()).optional().describe('Category IDs'),
      tags: z.array(z.string()).optional().describe('Tag names'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ title, content, status, categories, tags, site_id }) => {
      const client = getClient(site_id);
      const result = await client.createPost({
        title,
        content: content || '',
        status,
        categories,
        tags,
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
  // update_post_meta
  // ------------------------------------------------------------------ //
  server.tool(
    'update_post_meta',
    'Update post meta: slug, excerpt, or featured image ID.',
    {
      id: z.number().int().positive().describe('Post ID'),
      slug: z.string().optional().describe('URL slug (post_name)'),
      excerpt: z.string().optional().describe('Post excerpt'),
      featured_image_id: z.number().int().nonnegative().optional().describe('Featured image media ID (0 to remove)'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, slug, excerpt, featured_image_id, site_id }) => {
      const client = getClient(site_id);
      const result = await client.updatePostMeta({
        id,
        slug,
        excerpt,
        featured_image_id,
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
  // delete_post
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_post',
    'Delete a post (move to trash or permanently delete).',
    {
      id: z.number().int().positive().describe('Post ID'),
      force: z.boolean().default(false).describe('Permanently delete instead of moving to trash'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ id, force, site_id }) => {
      const client = getClient(site_id);
      const result = await client.deletePost({ id, force });

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
  // list_taxonomies
  // ------------------------------------------------------------------ //
  server.tool(
    'list_taxonomies',
    'List all registered taxonomies with their labels and properties.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.listTaxonomies();

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
  // create_term
  // ------------------------------------------------------------------ //
  server.tool(
    'create_term',
    'Create a new term in a taxonomy (category, tag, etc.).',
    {
      taxonomy: z.string().describe('Taxonomy name (e.g., "category", "post_tag")'),
      name: z.string().min(1).describe('Term name'),
      slug: z.string().optional().describe('Term slug (auto-generated from name if omitted)'),
      parent: z.number().int().nonnegative().optional().describe('Parent term ID'),
      description: z.string().optional().describe('Term description'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ taxonomy, name, slug, parent, description, site_id }) => {
      const client = getClient(site_id);
      const result = await client.createTerm({
        taxonomy,
        name,
        slug,
        parent,
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
  // update_term
  // ------------------------------------------------------------------ //
  server.tool(
    'update_term',
    'Update an existing term.',
    {
      taxonomy: z.string().describe('Taxonomy name'),
      id: z.number().int().positive().describe('Term ID'),
      name: z.string().optional().describe('New term name'),
      slug: z.string().optional().describe('New term slug'),
      parent: z.number().int().nonnegative().optional().describe('New parent term ID'),
      description: z.string().optional().describe('New term description'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ taxonomy, id, name, slug, parent, description, site_id }) => {
      const client = getClient(site_id);
      const result = await client.updateTerm({
        taxonomy,
        id,
        name,
        slug,
        parent,
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
  // delete_term
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_term',
    'Delete a term from a taxonomy.',
    {
      taxonomy: z.string().describe('Taxonomy name'),
      id: z.number().int().positive().describe('Term ID'),
      force: z.boolean().default(false).describe('Force delete even if term has posts'),
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ taxonomy, id, force, site_id }) => {
      const client = getClient(site_id);
      const result = await client.deleteTerm({ taxonomy, id, force });

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
  // list_post_types
  // ------------------------------------------------------------------ //
  server.tool(
    'list_post_types',
    'List all registered post types with their properties.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.listPostTypes();

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
