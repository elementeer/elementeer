/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
import { z } from 'zod';
import type {
  RebuildStrategy,
  Recommendation,
  RecommendationEngineReport,
  SiteAssessment,
  SiteContext,
  StrategyCritique,
} from './client.js';

const rebuildStrategySchema = z.object({
  strategyId: z.enum([
    'brand-foundation-first',
    'destination-first',
    'theme-builder-first',
    'content-expansion-first',
  ]),
  label: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.array(z.string().min(1)).min(1),
  orderedSteps: z.array(z.string().min(1)).min(1),
  requiredCapabilities: z.array(z.enum([
    'global-styles',
    'page-composition',
    'theme-builder',
    'woocommerce-templates',
    'multilingual-workflows',
    'change-review',
  ])),
  fallbackStrategies: z.array(z.string().min(1)),
});

const strategyCritiqueSchema = z.object({
  verdict: z.enum(['solid', 'caution', 'blocked']),
  summary: z.string().min(1),
  concerns: z.array(z.string().min(1)),
  suggestedAdjustments: z.array(z.string().min(1)),
});

interface PlanningSnapshot {
  siteName: string;
  role: SiteContext['user_role'];
  destinationLabel: string;
  compatibilitySummary: string;
  capabilityWarnings: string[];
  issueCounts: SiteAssessment['issues_count'];
  topRecommendations: Array<Pick<Recommendation, 'id' | 'title' | 'category' | 'priority'>>;
}

export interface PlanningAiProvider {
  critique(snapshot: PlanningSnapshot, strategy: RebuildStrategy): Promise<StrategyCritique>;
  plan(snapshot: PlanningSnapshot, fallback: RebuildStrategy): Promise<RebuildStrategy>;
}

function buildPlanningSnapshot(
  assessment: SiteAssessment,
  context: SiteContext,
  report: RecommendationEngineReport,
): PlanningSnapshot {
  return {
    siteName: assessment.wordpress.site_name,
    role: context.user_role,
    destinationLabel: report.destination.label,
    compatibilitySummary: report.compatibilitySummary,
    capabilityWarnings: report.capabilityWarnings,
    issueCounts: assessment.issues_count,
    topRecommendations: report.recommendations.slice(0, 5).map((recommendation: Recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      category: recommendation.category,
      priority: recommendation.priority,
    })),
  };
}

function recommendationIds(report: RecommendationEngineReport): Set<string> {
  return new Set(
    report.recommendations.map((recommendation: Recommendation) => recommendation.id),
  );
}

export function buildDeterministicRebuildStrategy(
  assessment: SiteAssessment,
  context: SiteContext,
  report: RecommendationEngineReport,
): RebuildStrategy {
  const activeIds = recommendationIds(report);

  if (
    activeIds.has('set_logo')
    || activeIds.has('define_global_colors')
    || activeIds.has('define_global_typography')
  ) {
    return {
      strategyId: 'brand-foundation-first',
      label: 'Brand foundation first',
      summary: 'Stabilize the core brand system before expanding template coverage or content composition.',
      rationale: [
        'The recommendation set still includes missing brand primitives.',
        'Templates and page composition become more reliable once global styles are stable.',
      ],
      orderedSteps: [
        'set_logo',
        'define_global_colors',
        'define_global_typography',
        ...report.recommendations
          .filter((recommendation: Recommendation) => !['set_logo', 'define_global_colors', 'define_global_typography'].includes(recommendation.id))
          .slice(0, 3)
          .map((recommendation: Recommendation) => recommendation.id),
      ],
      requiredCapabilities: ['global-styles'],
      fallbackStrategies: ['content-expansion-first'],
    };
  }

  if (activeIds.has('unlock_theme_builder_capability')) {
    return {
      strategyId: 'destination-first',
      label: 'Destination capability first',
      summary: 'Resolve destination and Theme Builder capability limits before taking on advanced structure work.',
      rationale: [
        report.compatibilitySummary,
        ...report.capabilityWarnings.slice(0, 2),
      ],
      orderedSteps: [
        'unlock_theme_builder_capability',
        ...report.recommendations
          .filter((recommendation: Recommendation) => recommendation.id !== 'unlock_theme_builder_capability')
          .slice(0, 3)
          .map((recommendation: Recommendation) => recommendation.id),
      ],
      requiredCapabilities: ['change-review'],
      fallbackStrategies: ['brand-foundation-first', 'content-expansion-first'],
    };
  }

  if (activeIds.has('create_header_template') || activeIds.has('create_footer_template')) {
    return {
      strategyId: 'theme-builder-first',
      label: 'Theme Builder first',
      summary: 'Lock in the global header/footer structure before broadening content work.',
      rationale: [
        'Core Theme Builder surfaces are still missing.',
        'A stable site shell reduces duplicate effort across pages and posts.',
      ],
      orderedSteps: [
        'create_header_template',
        'create_footer_template',
        ...report.recommendations
          .filter((recommendation: Recommendation) => !['create_header_template', 'create_footer_template'].includes(recommendation.id))
          .slice(0, 3)
          .map((recommendation: Recommendation) => recommendation.id),
      ],
      requiredCapabilities: ['theme-builder', 'change-review'],
      fallbackStrategies: ['content-expansion-first'],
    };
  }

  const roleLabel = context.user_role ?? 'current operator';

  return {
    strategyId: 'content-expansion-first',
    label: 'Content expansion first',
    summary: `The current baseline is stable enough to let ${roleLabel} extend page coverage and composition next.`,
    rationale: [
      'Core brand and destination blockers are not dominant in the recommendation set.',
      'The remaining work is mostly about expanding templates, composition, and operational polish.',
    ],
    orderedSteps: report.recommendations
      .slice(0, 4)
      .map((recommendation: Recommendation) => recommendation.id),
    requiredCapabilities: ['page-composition', 'change-review'],
    fallbackStrategies: ['brand-foundation-first'],
  };
}

export function buildDeterministicStrategyCritique(
  report: RecommendationEngineReport,
  strategy: RebuildStrategy,
): StrategyCritique {
  const concerns: string[] = [];
  const suggestedAdjustments: string[] = [];
  let verdict: StrategyCritique['verdict'] = 'solid';

  if (
    strategy.requiredCapabilities.includes('theme-builder')
    && report.capabilityWarnings.some((warning: string) => warning.includes('Elementor Pro is not detected'))
  ) {
    verdict = 'blocked';
    concerns.push('The strategy depends on Theme Builder capability, but Elementor Pro is not currently detected.');
    suggestedAdjustments.push('Resolve destination capability before scheduling header, footer, archive, or WooCommerce template work.');
  }

  const highPriorityRecommendationIds = report.recommendations
    .filter((recommendation: Recommendation) => recommendation.priority <= 2)
    .map((recommendation: Recommendation) => recommendation.id);
  const missingPrioritySteps = highPriorityRecommendationIds.filter(
    (recommendationId: string) => !strategy.orderedSteps.includes(recommendationId),
  );

  if (missingPrioritySteps.length > 0 && verdict !== 'blocked') {
    verdict = 'caution';
    concerns.push(`The strategy skips active high-priority recommendations: ${missingPrioritySteps.join(', ')}.`);
    suggestedAdjustments.push('Pull the highest-priority active recommendations earlier in the ordered steps.');
  }

  if (report.capabilityWarnings.length > 0 && verdict === 'solid') {
    verdict = 'caution';
    concerns.push(report.capabilityWarnings[0]!);
    suggestedAdjustments.push('Keep the destination warnings visible during rollout and validate after each major step.');
  }

  return {
    verdict,
    summary: verdict === 'solid'
      ? 'The proposed sequence is aligned with the current destination profile and recommendation state.'
      : verdict === 'caution'
        ? 'The strategy is usable, but it should be tightened against the current capability and priority signals.'
        : 'The strategy is currently blocked by destination capability constraints.',
    concerns,
    suggestedAdjustments,
  };
}

export function createOpenAiPlanningProvider(
  apiKey: string,
  model = 'gpt-4o-mini',
): PlanningAiProvider {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  return {
    async plan(snapshot: PlanningSnapshot, fallback: RebuildStrategy): Promise<RebuildStrategy> {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a bounded planning assistant. Improve the fallback rebuild strategy using only the snapshot provided. Return JSON only and do not invent capabilities.',
            },
            {
              role: 'user',
              content: JSON.stringify({ snapshot, fallback }),
            },
          ],
        },
        { headers, timeout: 45_000 },
      );
      const raw = (response.data as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content;
      return rebuildStrategySchema.parse(JSON.parse(raw ?? '{}'));
    },

    async critique(snapshot: PlanningSnapshot, strategy: RebuildStrategy): Promise<StrategyCritique> {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a bounded critique assistant. Evaluate the proposed rebuild strategy against the snapshot. Return JSON only and do not invent capabilities or site facts.',
            },
            {
              role: 'user',
              content: JSON.stringify({ snapshot, strategy }),
            },
          ],
        },
        { headers, timeout: 45_000 },
      );
      const raw = (response.data as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content;
      return strategyCritiqueSchema.parse(JSON.parse(raw ?? '{}'));
    },
  };
}

export async function planRebuildStrategy(options: {
  assessment: SiteAssessment;
  context: SiteContext;
  preferAi: boolean;
  provider?: PlanningAiProvider;
  report: RecommendationEngineReport;
}): Promise<{ mode: 'deterministic' | 'ai-assisted' | 'ai-fallback'; notes: string[]; strategy: RebuildStrategy }> {
  const snapshot = buildPlanningSnapshot(options.assessment, options.context, options.report);
  const fallback = buildDeterministicRebuildStrategy(
    options.assessment,
    options.context,
    options.report,
  );

  if (!options.preferAi || !options.provider) {
    return {
      mode: 'deterministic',
      notes: ['AI planning is disabled or unavailable, so the deterministic fallback strategy was used.'],
      strategy: fallback,
    };
  }

  try {
    const strategy = await options.provider.plan(snapshot, fallback);
    return {
      mode: 'ai-assisted',
      notes: ['AI planning is enabled; the strategy was validated against the shared contract before use.'],
      strategy,
    };
  } catch (error) {
    return {
      mode: 'ai-fallback',
      notes: [`AI planning failed and fell back to deterministic mode: ${(error as Error).message}`],
      strategy: fallback,
    };
  }
}

export async function critiqueRebuildStrategy(options: {
  assessment: SiteAssessment;
  context: SiteContext;
  preferAi: boolean;
  provider?: PlanningAiProvider;
  report: RecommendationEngineReport;
  strategy: RebuildStrategy;
}): Promise<{ critique: StrategyCritique; mode: 'deterministic' | 'ai-assisted' | 'ai-fallback'; notes: string[] }> {
  const snapshot = buildPlanningSnapshot(options.assessment, options.context, options.report);
  const fallback = buildDeterministicStrategyCritique(options.report, options.strategy);

  if (!options.preferAi || !options.provider) {
    return {
      critique: fallback,
      mode: 'deterministic',
      notes: ['AI critique is disabled or unavailable, so the deterministic critique was used.'],
    };
  }

  try {
    const critique = await options.provider.critique(snapshot, options.strategy);
    return {
      critique,
      mode: 'ai-assisted',
      notes: ['AI critique is enabled; the critique payload was validated before use.'],
    };
  } catch (error) {
    return {
      critique: fallback,
      mode: 'ai-fallback',
      notes: [`AI critique failed and fell back to deterministic mode: ${(error as Error).message}`],
    };
  }
}

export { rebuildStrategySchema, strategyCritiqueSchema };
