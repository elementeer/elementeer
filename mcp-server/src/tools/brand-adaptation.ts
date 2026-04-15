import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BrandAdaptationPlan, ElementifyClient } from '../client.js';
import { buildBrandAdaptationPlan } from '../brand-adaptation.js';
import { buildDesignTokenReport } from '../design-tokens.js';

export function registerBrandAdaptationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'plan_brand_adaptation',
    'Build a deterministic brand-adaptation plan from the current Elementor kit, site context, and extracted design tokens. Useful before changing layout styling or adapting an imported structure to a target brand.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      brand_brief: z.string().optional().describe('Optional target brand summary to override stored site context notes'),
    },
    async ({ site_id, brand_brief }) => {
      const client = getClient(site_id);
      const [styles, assessment, context] = await Promise.all([
        client.getGlobalStyles(),
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const tokenReport = buildDesignTokenReport(styles, assessment);
      const plan = buildBrandAdaptationPlan({
        assessment,
        context,
        tokenReport,
        brandBrief: brand_brief,
      });

      const lines: string[] = [
        `Brand Adaptation Plan — ${assessment.wordpress.site_name}`,
        '',
        plan.targetBrandSummary,
        '',
        '## Token Anchors',
        ...plan.tokenAnchors.map((anchor: BrandAdaptationPlan['tokenAnchors'][number]) => `  - ${anchor}`),
        '',
        '## Suggested Actions',
        ...plan.suggestedActions.map((action: BrandAdaptationPlan['suggestedActions'][number]) => `  - ${action}`),
        '',
        '## Guardrails',
        ...plan.guardrails.map((guardrail: BrandAdaptationPlan['guardrails'][number]) => `  - ${guardrail}`),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
