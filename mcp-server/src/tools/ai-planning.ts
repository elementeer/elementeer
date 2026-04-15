import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, RebuildStrategy } from '../client.js';
import { getIntegrations } from '../config.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import { buildRecommendationReport } from '../recommendations.js';
import {
  createOpenAiPlanningProvider,
  critiqueRebuildStrategy,
  planRebuildStrategy,
  rebuildStrategySchema,
} from '../ai-planning.js';

async function buildPlanningContext(client: ElementifyClient) {
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

  return { assessment, context, report };
}

export function registerAiPlanningTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'plan_rebuild_strategy',
    'Plan a bounded rebuild strategy from current assessment, recommendation, and destination data. Uses a deterministic fallback by default and optionally an OpenAI planning provider only when ai_planning_enabled and openai_api_key are configured.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      prefer_ai: z.boolean().optional().default(true).describe('Allow the feature-flagged AI provider when configured'),
    },
    async ({ site_id, prefer_ai }) => {
      const client = getClient(site_id);
      const integrations = getIntegrations();
      const allowAi = prefer_ai ?? true;
      const provider = allowAi && integrations.ai_planning_enabled && integrations.openai_api_key
        ? createOpenAiPlanningProvider(integrations.openai_api_key)
        : undefined;
      const { assessment, context, report } = await buildPlanningContext(client);
      const result = await planRebuildStrategy({
        assessment,
        context,
        report,
        preferAi: allowAi,
        provider,
      });

      const lines: string[] = [
        `Rebuild Strategy — ${assessment.wordpress.site_name}`,
        `Mode: ${result.mode}`,
        `Destination: ${report.destination.label}`,
        `Strategy: ${result.strategy.label} [${result.strategy.strategyId}]`,
        '',
        result.strategy.summary,
        '',
        '## Rationale',
        ...result.strategy.rationale.map((item: string) => `  - ${item}`),
        '',
        '## Ordered Steps',
        ...result.strategy.orderedSteps.map((step: string, index: number) => `  ${index + 1}. ${step}`),
      ];

      if (result.strategy.requiredCapabilities.length > 0) {
        lines.push('');
        lines.push(`Required capabilities: ${result.strategy.requiredCapabilities.join(', ')}`);
      }

      if (result.strategy.fallbackStrategies.length > 0) {
        lines.push(`Fallback strategies: ${result.strategy.fallbackStrategies.join(', ')}`);
      }

      if (result.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        lines.push(...result.notes.map((note: string) => `  - ${note}`));
      }

      lines.push('');
      lines.push('## Strategy JSON');
      lines.push('```json');
      lines.push(JSON.stringify(result.strategy, null, 2));
      lines.push('```');

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'critique_rebuild_strategy',
    'Critique a proposed rebuild strategy against the current destination and recommendation state. Expects a JSON-encoded strategy matching the plan_rebuild_strategy schema. Uses a deterministic fallback and optionally an OpenAI critique provider only when ai_planning_enabled and openai_api_key are configured.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      strategy_json: z.string().describe('JSON-encoded strategy from plan_rebuild_strategy'),
      prefer_ai: z.boolean().optional().default(true).describe('Allow the feature-flagged AI provider when configured'),
    },
    async ({ site_id, strategy_json, prefer_ai }) => {
      let strategy: RebuildStrategy;

      try {
        strategy = rebuildStrategySchema.parse(JSON.parse(strategy_json));
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: strategy_json must contain a valid RebuildStrategy payload. ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

      const client = getClient(site_id);
      const integrations = getIntegrations();
      const allowAi = prefer_ai ?? true;
      const provider = allowAi && integrations.ai_planning_enabled && integrations.openai_api_key
        ? createOpenAiPlanningProvider(integrations.openai_api_key)
        : undefined;
      const { assessment, context, report } = await buildPlanningContext(client);
      const result = await critiqueRebuildStrategy({
        assessment,
        context,
        report,
        strategy,
        preferAi: allowAi,
        provider,
      });

      const lines: string[] = [
        `Strategy Critique — ${assessment.wordpress.site_name}`,
        `Mode: ${result.mode}`,
        `Verdict: ${result.critique.verdict}`,
        '',
        result.critique.summary,
      ];

      if (result.critique.concerns.length > 0) {
        lines.push('');
        lines.push('## Concerns');
        lines.push(...result.critique.concerns.map((concern: string) => `  - ${concern}`));
      }

      if (result.critique.suggestedAdjustments.length > 0) {
        lines.push('');
        lines.push('## Suggested Adjustments');
        lines.push(...result.critique.suggestedAdjustments.map((adjustment: string) => `  - ${adjustment}`));
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
