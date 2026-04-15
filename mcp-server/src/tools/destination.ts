import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildResearchResolutionPreview } from '../research/integration.js';

export function registerDestinationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'get_destination_capabilities',
    'Build a destination profile and first capability matrix from the current site assessment and fingerprint. Summarizes what the current Elementor destination likely supports and where fallback handling is still needed.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      include_research: z.boolean().optional().default(false).describe('Append an experimental research-only preview for limited or missing capabilities'),
    },
    async ({ site_id, include_research }) => {
      const client = getClient(site_id);
      const assessment = await client.assessSite();
      const fingerprint = buildSiteFingerprint(assessment);
      const matrix = buildCapabilityMatrix(assessment, fingerprint);

      const lines: string[] = [
        `Destination Capabilities — ${assessment.wordpress.site_name}`,
        '',
        '## Destination Profile',
        `  Kind: ${matrix.destination.kind}`,
        `  Label: ${matrix.destination.label}`,
        `  Elementor detected: ${matrix.destination.elementorDetected ? 'yes' : 'no'}`,
        `  Elementor Pro: ${matrix.destination.elementorPro ? 'yes' : 'no'}`,
        `  Active plugin categories: ${matrix.destination.activePluginCategories.length > 0 ? matrix.destination.activePluginCategories.join(', ') : '(none)'}`,
        '',
        '## Capability Matrix',
      ];

      for (const capability of matrix.capabilities) {
        lines.push(
          `  - ${capability.id}: ${capability.available ? 'available' : 'limited'} [${capability.source}]`,
        );
        for (const note of capability.notes) {
          lines.push(`    Note: ${note}`);
        }
      }

      lines.push('');
      lines.push('## Compatibility Summary');
      lines.push(`  ${matrix.compatibilitySummary}`);

      if (matrix.warnings.length > 0) {
        lines.push('');
        lines.push('## Warnings');
        for (const warning of matrix.warnings) {
          lines.push(`  - ${warning}`);
        }
      }

      if (include_research) {
        const preview = buildResearchResolutionPreview(matrix);

        lines.push('');
        lines.push('## Research Preview');
        lines.push('  Experimental only — this does not change product policy or generation behavior.');
        lines.push(`  ${preview.summary}`);

        for (const resolution of preview.resolutions) {
          lines.push(`  - ${resolution.capabilityId}: ${resolution.selected.label} [${resolution.selected.mode}]`);
          if (resolution.selected.pluginId) {
            lines.push(`    Plugin: ${resolution.selected.pluginId}`);
          }
          for (const rationale of resolution.selected.rationale) {
            lines.push(`    Why: ${rationale}`);
          }
        }
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
