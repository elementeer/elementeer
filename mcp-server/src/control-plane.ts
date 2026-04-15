import type {
  ControlIntent,
  PipelinePathPlan,
  RecommendationEngineReport,
  SiteAssessment,
} from './client.js';

export function buildPipelinePathPlan(
  intent: ControlIntent,
  assessment: SiteAssessment,
  report: RecommendationEngineReport,
): PipelinePathPlan {
  const hasBrandGaps = report.recommendations.some((recommendation) =>
    ['set_logo', 'define_global_colors', 'define_global_typography'].includes(recommendation.id),
  );
  const hasDestinationRisk = report.recommendations.some((recommendation) =>
    recommendation.id === 'unlock_theme_builder_capability',
  );

  switch (intent) {
    case 'adapt-to-brand':
      return {
        intent,
        label: 'Adapt to brand',
        summary: 'Prioritize brand alignment and global style stabilization before broader composition work.',
        suggestedTools: [
          'set_site_context',
          'get_global_styles',
          'set_global_colors',
          'set_global_typography',
          'extract_design_tokens',
          'get_recommendations',
        ],
        rationale: hasBrandGaps
          ? ['Brand recommendations are still active, so brand primitives should move first.']
          : ['Global styles are already present, so this path focuses on refining and validating them.'],
        gates: ['Confirm logo, colors, and typography before composing or rewriting major page sections.'],
      };

    case 'optimize-for-existing-destination':
      return {
        intent,
        label: 'Optimize for current destination',
        summary: 'Work with the current Elementor/plugin profile and resolve capability limits before advanced structure work.',
        suggestedTools: [
          'get_destination_capabilities',
          'get_recommendations',
          'plan_rebuild_strategy',
          'validate_elementor_write',
        ],
        rationale: hasDestinationRisk
          ? ['The current destination profile exposes capability warnings that should be handled first.']
          : ['The destination already supports the core workflows, so the path stays conservative and validation-heavy.'],
        gates: ['Do not schedule Theme Builder-heavy work until destination warnings are cleared or accepted.'],
      };

    case 'rebuild-with-minimal-plugins':
      return {
        intent,
        label: 'Rebuild with minimal plugins',
        summary: 'Keep the stack lean by preferring core Elementor workflows and only escalating when capability gaps block delivery.',
        suggestedTools: [
          'get_destination_capabilities',
          'get_recommendations',
          'plan_rebuild_strategy',
          'compose_page_from_templates',
          'validate_elementor_write',
        ],
        rationale: [
          'This path favors current core capabilities before introducing plugin-assisted workflows.',
          report.compatibilitySummary,
        ],
        gates: ['Pause when a recommendation requires unsupported capability instead of silently adding plugin coupling.'],
      };

    case 'rebuild-close-to-source':
    default:
      return {
        intent,
        label: 'Rebuild close to source',
        summary: `Preserve the current site structure of ${assessment.wordpress.site_name} while improving reliability step by step.`,
        suggestedTools: [
          'assess_site',
          'get_site_fingerprint',
          'get_recommendations',
          'plan_rebuild_strategy',
          'validate_elementor_write',
        ],
        rationale: [
          'This path starts with the observed site state and keeps changes constrained to validated increments.',
        ],
        gates: ['Validate each structural write before applying the next composition or template change.'],
      };
  }
}
