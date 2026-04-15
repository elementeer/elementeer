import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ControlIntent, ElementifyClient, PipelinePathPlan } from '../client.js';
import { buildPipelinePathPlan } from '../control-plane.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import { buildRecommendationReport } from '../recommendations.js';

export function registerControlPlaneTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'suggest_pipeline_path',
    'Suggest a narrow control-plane path for a specific product intent. This does not replace existing routes or wizards; it only maps an intent to the next deterministic tool path.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      intent: z.enum([
        'rebuild-close-to-source',
        'rebuild-with-minimal-plugins',
        'optimize-for-existing-destination',
        'adapt-to-brand',
      ]).describe('The high-level intent to steer the next workflow path'),
    },
    async ({ site_id, intent }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const report = buildRecommendationReport({
        assessment,
        context,
        fingerprint,
        capabilityMatrix,
      });
      const plan = buildPipelinePathPlan(intent as ControlIntent, assessment, report);

      const lines: string[] = [
        `Pipeline Path — ${plan.label}`,
        '',
        plan.summary,
        '',
        '## Suggested Tools',
        ...plan.suggestedTools.map((tool: string, index: number) => `  ${index + 1}. ${tool}`),
      ];

      if (plan.rationale.length > 0) {
        lines.push('');
        lines.push('## Rationale');
        lines.push(...plan.rationale.map((item: string) => `  - ${item}`));
      }

      if (plan.gates.length > 0) {
        lines.push('');
        lines.push('## Gates');
        lines.push(...plan.gates.map((gate: PipelinePathPlan['gates'][number]) => `  - ${gate}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
