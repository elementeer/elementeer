import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { buildImportReport } from '../validation.js';
import type { ImportReport } from '../client.js';
import { resolveElementorSource } from '../elementor-source.js';

export function registerValidationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'validate_elementor_write',
    'Build a structural validation report for Elementor data before applying it to a template or page. Supports existing templates, existing pages, or raw JSON payloads. This is an honest structural harness, not a full visual import automation runner.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      source_type: z.enum(['template', 'page', 'raw']).describe('Where to read Elementor data from'),
      source_id: z.number().int().positive().optional().describe('Template or page ID when source_type is template or page'),
      elementor_data: z.string().optional().describe('JSON-encoded Elementor data when source_type is raw'),
      title: z.string().optional().describe('Optional label used for raw payload reports'),
    },
    async ({ site_id, source_type, source_id, elementor_data, title }) => {
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

      const report = buildImportReport({
        sourceType: resolved.payload.sourceType,
        sourceRef: resolved.payload.sourceRef,
        title: resolved.payload.title,
        elementorData: resolved.payload.elementorData,
      });

      const lines: string[] = [
        `Elementor Write Validation — ${report.sourceRef}`,
        '',
        '## Summary',
        `  Title: ${report.templateMetadata.title ?? '(unknown)'}`,
        `  Result: ${report.validationResult}`,
        `  Top-level elements: ${report.templateMetadata.topLevelCount}`,
        `  Widget count: ${report.templateMetadata.widgetCount}`,
        `  Automated coverage: ${report.automatedCoverage}`,
        '',
        '## Structural Notes',
        ...report.structuralNotes.map((note: ImportReport['structuralNotes'][number]) => `  - ${note}`),
      ];

      if (report.warnings.length > 0) {
        lines.push('');
        lines.push('## Warnings');
        lines.push(...report.warnings.map((warning: ImportReport['warnings'][number]) => `  - ${warning}`));
      }

      lines.push('');
      lines.push('## Next Steps');
      lines.push(...report.nextStepHints.map((hint: ImportReport['nextStepHints'][number]) => `  - ${hint}`));
      lines.push('');
      lines.push('## Smoke Test Plan');
      lines.push(`  Readiness: ${report.smokeTestPlan.readiness}`);
      lines.push(
        `  Environment targets: ${report.smokeTestPlan.environmentTargets.join(' | ')}`,
      );
      lines.push(`  Prepared hooks: ${report.smokeTestPlan.preparedHooks.join(', ')}`);
      lines.push(...report.smokeTestPlan.checklist.map((step) => `  - ${step}`));

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
