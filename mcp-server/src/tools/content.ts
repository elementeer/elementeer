import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

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
    },
    async ({ id, elementor_data, site_id }) => {
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
}
