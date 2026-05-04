import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerVoxelTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_voxel_status (VOXEL-001)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_voxel_status',
    'Detect Voxel directory/community plugin. Returns version, post type count, taxonomy count, product type count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getVoxelStatus();

        const lines: string[] = [
          '# Voxel Status',
          `**Voxel available**: ${status.voxel_available ? 'Yes' : 'No'}`,
        ];

        if (status.voxel_available) {
          lines.push(`**Version**: ${status.version ?? 'Unknown'}`);
          lines.push(`**Post types**: ${status.post_type_count}`);
          lines.push(`**Taxonomies**: ${status.taxonomy_count}`);
          lines.push(`**Product types**: ${status.product_type_count}`);
        } else {
          lines.push('\nVoxel plugin is not detected. Install and activate Voxel for directory/community features.');
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting Voxel status: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_voxel_post_types (VOXEL-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_voxel_post_types',
    'List all Voxel post types with labels and public/editable status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const data = await client.listVoxelPostTypes();

        const lines: string[] = [
          '# Voxel Post Types',
          `**Total**: ${data.total ?? data.post_types?.length ?? 0}`,
        ];

        const types = data.post_types ?? [];
        if (types.length === 0) {
          lines.push('\nNo post types found.');
        } else {
          lines.push('\n| Key | Label | Singular | Public | Editable |');
          lines.push('|-----|-------|----------|--------|----------|');
          for (const pt of types.slice(0, 50)) {
            lines.push(`| ${pt.key} | ${pt.label} | ${pt.singular} | ${pt.is_public ? 'Yes' : 'No'} | ${pt.is_editable ? 'Yes' : 'No'} |`);
          }
          if (types.length > 50) {
            lines.push(`| … ${types.length - 50} more … |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing Voxel post types: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_voxel_post_type (VOXEL-003)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_voxel_post_type',
    'Get detailed information about a specific Voxel post type including its fields.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      post_type: z.string().describe('Voxel post type key (e.g. "profile", "listing")'),
    },
    async ({ site_id, post_type }) => {
      try {
        const client = getClient(site_id);
        const data = await client.getVoxelPostType(post_type);

        if (data.error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${data.error}`,
            }],
          };
        }

        const lines: string[] = [
          `# Post Type: ${data.label} (\`${data.key}\`)`,
          `**Singular**: ${data.singular}`,
          `**Public**: ${data.is_public ? 'Yes' : 'No'}`,
          `**Editable**: ${data.is_editable ? 'Yes' : 'No'}`,
        ];

        const fields = data.fields ?? [];
        if (fields.length > 0) {
          lines.push('\n## Fields');
          lines.push('| Key | Type | Label |');
          lines.push('|-----|------|-------|');
          for (const field of fields.slice(0, 50)) {
            lines.push(`| ${field.key} | ${field.type} | ${field.label} |`);
          }
          if (fields.length > 50) {
            lines.push(`| … ${fields.length - 50} more … |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting Voxel post type: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_voxel_taxonomies (VOXEL-004)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_voxel_taxonomies',
    'List all Voxel taxonomies with labels and associated post types.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const data = await client.listVoxelTaxonomies();

        const lines: string[] = [
          '# Voxel Taxonomies',
          `**Total**: ${data.total ?? data.taxonomies?.length ?? 0}`,
        ];

        const taxonomies = data.taxonomies ?? [];
        if (taxonomies.length === 0) {
          lines.push('\nNo taxonomies found.');
        } else {
          lines.push('\n| Key | Label | Singular | Post Type |');
          lines.push('|-----|-------|----------|-----------|');
          for (const tax of taxonomies.slice(0, 50)) {
            lines.push(`| ${tax.key} | ${tax.label} | ${tax.singular} | ${tax.post_type ?? '—'} |`);
          }
          if (taxonomies.length > 50) {
            lines.push(`| … ${taxonomies.length - 50} more … |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing Voxel taxonomies: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_voxel_product_types (VOXEL-006a — product types)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_voxel_product_types',
    'List all Voxel product types with labels.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const data = await client.listVoxelProductTypes();

        const lines: string[] = [
          '# Voxel Product Types',
          `**Total**: ${data.total ?? data.product_types?.length ?? 0}`,
        ];

        const types = data.product_types ?? [];
        if (types.length === 0) {
          lines.push('\nNo product types found.');
        } else {
          lines.push('\n| Key | Label |');
          lines.push('|-----|-------|');
          for (const pt of types.slice(0, 50)) {
            lines.push(`| ${pt.key} | ${pt.label} |`);
          }
          if (types.length > 50) {
            lines.push(`| … ${types.length - 50} more … |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing Voxel product types: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_voxel_settings (VOXEL-005)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_voxel_settings',
    'Get Voxel plugin settings/configuration.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const data = await client.getVoxelSettings();

        const lines: string[] = [
          '# Voxel Settings',
        ];

        const settings = data.settings ?? {};
        const keys = Object.keys(settings);
        if (keys.length === 0) {
          lines.push('\nNo settings found.');
        } else {
          for (const key of keys.slice(0, 30)) {
            const val = settings[key];
            const display = typeof val === 'string' ? val : JSON.stringify(val);
            lines.push(`- **${key}**: ${display.substring(0, 100)}`);
          }
          if (keys.length > 30) {
            lines.push(`\n… ${keys.length - 30} more settings not shown.`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting Voxel settings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_voxel_health (VOXEL-006)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_voxel_health',
    'Run a health check on the Voxel plugin: REST reachability, table existence, memory usage.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const health = await client.getVoxelHealth();

        const lines: string[] = [
          '# Voxel Health Check',
          `**Healthy**: ${health.healthy ? 'Yes' : 'No'}`,
          `**REST API reachable**: ${health.rest_reachable ? 'Yes' : 'No'}`,
          `**Tables healthy**: ${health.tables_healthy ? 'Yes' : 'No'}`,
          `**Memory usage**: ${health.memory_usage_mb !== null && health.memory_usage_mb !== undefined ? `${health.memory_usage_mb} MB` : 'Unknown'}`,
        ];

        if (health.issues && health.issues.length > 0) {
          lines.push('\n## Issues');
          for (const issue of health.issues) {
            lines.push(`- ${issue}`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error running Voxel health check: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}
