import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerCharityTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_charity_status (CHARITY-001)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_charity_status',
    'Detect active charity/donation plugin (GiveWP, Charitable). Returns plugin name, version, form count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getCharityStatus();

        const lines: string[] = [
          '# Charity Status',
          `**Charity plugin available**: ${status.charity_available ? 'Yes' : 'No'}`,
        ];

        if (status.charity_available) {
          lines.push(`**Plugin**: ${status.plugin}`);
          lines.push(`**Version**: ${status.version}`);
          lines.push(`**Form count**: ${status.form_count}`);
        } else {
          lines.push('\nNo active charity plugin detected (GiveWP or Charitable).');
          lines.push('Consider installing a donation plugin for fundraising.');
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
            text: `❌ Error getting charity status: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_charity_forms (CHARITY-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_charity_forms',
    'List donation forms from the active charity plugin with pagination. Includes title, goal, raised amount, donor count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
    },
    async ({ site_id, page, per_page }) => {
      try {
        const client = getClient(site_id);
        const forms = await client.listCharityForms({ page, per_page });

        const lines: string[] = [
          '# Donation Forms',
          `**Total forms**: ${forms.total}`,
          `**Page**: ${forms.page} of ${forms.total_pages}`,
          `**Per page**: ${forms.per_page}`,
        ];

        if (forms.forms.length === 0) {
          lines.push('\nNo donation forms found.');
        } else {
          lines.push('\n## Forms');
          lines.push('| ID | Title | Goal | Raised | Donors | URL |');
          lines.push('|----|-------|------|--------|--------|-----|');
          for (const form of forms.forms.slice(0, 20)) {
            const goal = form.goal ? `$${form.goal}` : '—';
            const raised = form.raised ? `$${form.raised}` : '—';
            lines.push(`| ${form.id} | ${form.title.substring(0, 40)}${form.title.length > 40 ? '…' : ''} | ${goal} | ${raised} | ${form.donor_count ?? '—'} | ${form.url.substring(0, 30)}… |`);
          }
          if (forms.forms.length > 20) {
            lines.push(`| … ${forms.forms.length - 20} more … |`);
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
            text: `❌ Error listing charity forms: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_charity_stats (CHARITY-002 extended)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_charity_stats',
    'Get overall donation statistics: total raised, donor count, average donation, total donations.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const stats = await client.getCharityStats();

        const lines: string[] = [
          '# Charity Donation Statistics',
          `**Total raised**: $${stats.total_raised.toFixed(2)}`,
          `**Donor count**: ${stats.donor_count}`,
          `**Average donation**: $${stats.average_donation.toFixed(2)}`,
          `**Total donations**: ${stats.total_donations}`,
        ];

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
            text: `❌ Error getting charity stats: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}