import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, OutputCritique } from '../client.js';
import { getIntegrations } from '../config.js';
import { buildCapabilityMatrix } from '../destination.js';
import { resolveElementorSource } from '../elementor-source.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import {
  createOpenAiOutputCritiqueProvider,
  critiqueElementorOutput,
} from '../output-critique.js';
import { buildRecommendationReport } from '../recommendations.js';
import { buildImportReport } from '../validation.js';

export function registerOutputCritiqueTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'critique_elementor_output',
    'Critique an Elementor payload against structural validation and destination capability signals. Supports existing templates, pages, or raw JSON payloads. Uses deterministic critique by default and optionally an AI critique provider when ai_planning_enabled and openai_api_key are configured.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      source_type: z.enum(['template', 'page', 'raw']).describe('Where to read Elementor data from'),
      source_id: z.number().int().positive().optional().describe('Template or page ID when source_type is template or page'),
      elementor_data: z.string().optional().describe('JSON-encoded Elementor data when source_type is raw'),
      title: z.string().optional().describe('Optional label used for raw payload critiques'),
      prefer_ai: z.boolean().optional().default(true).describe('Allow the feature-flagged AI critique provider when configured'),
    },
    async ({ site_id, source_type, source_id, elementor_data, title, prefer_ai }) => {
      const client = getClient(site_id);
      const resolved = await resolveElementorSource({
        client,
        sourceType: source_type,
        sourceId: source_id,
        elementorData: elementor_data,
        title,
      });

      if (!resolved.ok) {
        return {
          content: [{ type: 'text', text: resolved.error }],
          isError: true,
        };
      }

      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const recommendationReport = buildRecommendationReport({
        assessment,
        context,
        fingerprint,
        capabilityMatrix,
      });
      const importReport = buildImportReport({
        sourceType: resolved.payload.sourceType,
        sourceRef: resolved.payload.sourceRef,
        title: resolved.payload.title,
        elementorData: resolved.payload.elementorData,
      });
      const integrations = getIntegrations();
      const allowAi = prefer_ai ?? true;
      const provider = allowAi && integrations.ai_planning_enabled && integrations.openai_api_key
        ? createOpenAiOutputCritiqueProvider(integrations.openai_api_key)
        : undefined;
      const result = await critiqueElementorOutput({
        report: importReport,
        recommendationReport,
        preferAi: allowAi,
        provider,
      });

      const lines: string[] = [
        `Elementor Output Critique — ${importReport.sourceRef}`,
        `Mode: ${result.mode}`,
        `Verdict: ${result.critique.verdict}`,
        '',
        result.critique.summary,
      ];

      if (result.critique.concerns.length > 0) {
        lines.push('');
        lines.push('## Concerns');
        lines.push(...result.critique.concerns.map((concern: OutputCritique['concerns'][number]) => `  - ${concern}`));
      }

      if (result.critique.repairSteps.length > 0) {
        lines.push('');
        lines.push('## Repair Steps');
        lines.push(...result.critique.repairSteps.map((step: OutputCritique['repairSteps'][number]) => `  - ${step}`));
      }

      if (result.critique.validationBasis.length > 0) {
        lines.push('');
        lines.push('## Validation Basis');
        lines.push(...result.critique.validationBasis.map((basis: OutputCritique['validationBasis'][number]) => `  - ${basis}`));
      }

      if (result.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        lines.push(...result.notes.map((note: string) => `  - ${note}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
