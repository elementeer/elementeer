import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerAllyTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_ally_status (ALLY-001)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_ally_status',
    'Detect Elementor Ally plugin presence, version, tier (Free/Pro/One), and available scan credits. Maps Ally capabilities to enhanced A11Y features.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getAllyStatus();

        const lines: string[] = [
          '# Elementor Ally Status',
          `**Ally available**: ${status.ally_available ? 'Yes' : 'No'}`,
        ];

        if (status.ally_available) {
          lines.push(`**Plugin**: ${status.plugin}`);
          lines.push(`**Version**: ${status.version}`);
          lines.push(`**Tier**: ${status.tier}`);
          if (status.credits_remaining !== null) {
            lines.push(`**Scan credits remaining**: ${status.credits_remaining}`);
          }
          lines.push('');
          lines.push('## Capabilities');
          lines.push(`- **Scan**: ${status.capabilities.scan ? 'Yes' : 'No'}`);
          lines.push(`- **Report**: ${status.capabilities.report ? 'Yes' : 'No'}`);
          lines.push(`- **Basic fixes**: ${status.capabilities.basic_fixes ? 'Yes' : 'No'}`);
          lines.push(`- **AI fixes**: ${status.capabilities.ai_fixes ? 'Yes' : 'No'}`);
          lines.push(`- **Batch scan**: ${status.capabilities.batch_scan ? 'Yes' : 'No'}`);
          lines.push(`- **Scheduled scans**: ${status.capabilities.scheduled_scans ? 'Yes' : 'No'}`);
          lines.push(`- **Custom rules**: ${status.capabilities.custom_rules ? 'Yes' : 'No'}`);
        } else {
          lines.push('\nElementor Ally is not installed or activated.');
          lines.push('Consider installing Elementor Ally for advanced accessibility scanning and AI‑powered fixes.');
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
            text: `❌ Error fetching Ally status: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_ally_scan_results (ALLY-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_ally_scan_results',
    'Fetch Ally scan results merged with built‑in A11Y scanner. Returns a list of scans with issues count, scores, and timestamps.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const results = await client.getAllyScanResults();

        const lines: string[] = [
          '# Ally Scan Results',
          `**Last scan**: ${results.last_scan ?? 'Never'}`,
          `**Available credits**: ${results.available_credits}`,
          `**Total scans**: ${results.scans.length}`,
          '',
        ];

        if (results.scans.length === 0) {
          lines.push('No scan results found.');
        } else {
          lines.push('## Recent Scans');
          for (const scan of results.scans.slice(0, 5)) {
            lines.push(`- **${scan.title}** (${scan.date})`);
            lines.push(`  Issues: ${scan.issues_count}, Score: ${scan.score}`);
            lines.push(`  URL: ${scan.url}`);
            lines.push('');
          }
          if (results.scans.length > 5) {
            lines.push(`... and ${results.scans.length - 5} more scans.`);
          }
        }

        lines.push('');
        lines.push('## Ally Status');
        lines.push(`**Plugin**: ${results.ally_status.plugin}`);
        lines.push(`**Tier**: ${results.ally_status.tier}`);
        lines.push(`**Credits remaining**: ${results.ally_status.credits_remaining}`);

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
            text: `❌ Error fetching Ally scan results: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // trigger_ally_scan (ALLY-003)
  // ------------------------------------------------------------------ //
  server.tool(
    'trigger_ally_scan',
    'Trigger a new Ally accessibility scan (requires Ally Pro/One and sufficient credits). Uses L2 governance for automated queueing.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const result = await client.triggerAllyScan();

        const lines: string[] = [
          '# Ally Scan Trigger',
          `**Triggered**: ${result.triggered ? 'Yes' : 'No'}`,
          `**Scan ID**: ${result.scan_id ?? 'N/A'}`,
          `**Message**: ${result.message}`,
          `**Credits required**: ${result.credits_required}`,
          `**Credits remaining**: ${result.credits_remaining}`,
          '',
          '## Ally Status',
          `**Plugin**: ${result.ally_status.plugin}`,
          `**Tier**: ${result.ally_status.tier}`,
          `**Capabilities**: ${Object.entries(result.ally_status.capabilities).filter(([, v]) => v).map(([k]) => k).join(', ')}`,
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
            text: `❌ Error triggering Ally scan: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // apply_ally_fix (ALLY-003 part 2)
  // ------------------------------------------------------------------ //
  server.tool(
    'apply_ally_fix',
    'Apply an Ally fix to a specific accessibility issue. Supports basic fixes (Free/Pro) and AI fixes (Pro/One). Uses L2 governance for automated queueing.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      scan_id: z.string().describe('Scan ID from scan results'),
      issue_id: z.string().describe('Issue identifier within the scan'),
      fix_type: z.enum(['basic', 'ai']).default('basic').describe('Type of fix to apply'),
    },
    async ({ site_id, scan_id, issue_id, fix_type }) => {
      try {
        const client = getClient(site_id);
        const result = await client.applyAllyFix({ scan_id, issue_id, fix_type });

        const lines: string[] = [
          '# Ally Fix Application',
          `**Fixed**: ${result.fixed ? 'Yes' : 'No'}`,
          `**Message**: ${result.message}`,
          `**Scan ID**: ${result.scan_id}`,
          `**Issue ID**: ${result.issue_id}`,
          `**Fix type**: ${result.fix_type}`,
          '',
          '## Ally Status',
          `**Plugin**: ${result.ally_status.plugin}`,
          `**Tier**: ${result.ally_status.tier}`,
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
            text: `❌ Error applying Ally fix: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}