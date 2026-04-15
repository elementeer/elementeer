import type {
  AddonProfileId,
  CapabilityMatrix,
  Recommendation,
  RecommendationEngineInput,
  RecommendationEngineReport,
  SiteContext,
  StackProfileId,
} from './client.js';
import { buildRecommendationReport } from './recommendations.js';

export type AdvancedWorkflowTrack =
  | 'brand-adaptation'
  | 'premium-library'
  | 'critique'
  | 'governed-operations'
  | 'creator-depth'
  | 'upgrade-guidance'
  | 'productivity';

export type AdvancedUpgradeTarget =
  | 'keep-current-stack'
  | 'baseline-correction'
  | 'elementor-pro'
  | 'elementify-advanced'
  | 'supported-pro-addon-profile';

export interface AdvancedUpgradePlan {
  currentTier: 'free' | 'advanced';
  scenario: 'deep-relaunch' | 'migration' | 'premium-rollout' | 'critique-repair';
  targetSurface: 'page' | 'theme-builder' | 'mixed';
  recommendedStackProfile: StackProfileId;
  recommendedAddonProfile: AddonProfileId;
  isUpgradeNeeded: boolean;
  recommendedUpgradeTarget: AdvancedUpgradeTarget;
  reason: string;
  lighterAlternativeConsidered: string;
  complexityTradeoff: string;
  confidence: 'high' | 'medium';
  supportingRecommendations: string[];
}

export interface AdvancedRecommendation extends Recommendation {
  workflowTrack: AdvancedWorkflowTrack;
  tierRationale: string;
}

export interface AdvancedRecommendationReport {
  destination: RecommendationEngineReport['destination'];
  compatibilitySummary: string;
  capabilityWarnings: string[];
  foundationRecommendations: Recommendation[];
  advancedRecommendations: AdvancedRecommendation[];
  notes: string[];
}

function hasCapability(
  capabilityMatrix: CapabilityMatrix,
  capabilityId: string,
): boolean {
  return capabilityMatrix.capabilities.some(
    (capability) => capability.id === capabilityId && capability.available,
  );
}

function sortRecommendations<T extends Recommendation>(recommendations: T[]): T[] {
  return recommendations.sort((left, right) => left.priority - right.priority);
}

function applyRoleFilters(
  recommendations: AdvancedRecommendation[],
  context: SiteContext,
): AdvancedRecommendation[] {
  const role = context.user_role;

  if (role === 'ai-agent') {
    return sortRecommendations(recommendations.filter((recommendation) => recommendation.automated));
  }

  if (role === 'site-owner') {
    return sortRecommendations(
      recommendations.filter((recommendation) => recommendation.workflowTrack !== 'governed-operations'),
    );
  }

  return sortRecommendations(recommendations);
}

function buildAdvancedRecommendations(input: RecommendationEngineInput): AdvancedRecommendation[] {
  const { assessment, context, capabilityMatrix, validationWarnings = [] } = input;
  const recommendations: AdvancedRecommendation[] = [];
  const hasThemeBuilderCapability = hasCapability(capabilityMatrix, 'theme-builder');

  const add = (recommendation: AdvancedRecommendation, condition: boolean): void => {
    if (condition) {
      recommendations.push(recommendation);
    }
  };

  add(
    {
      id: 'run_brand_adaptation_pass',
      priority: 1,
      category: 'brand',
      workflowTrack: 'brand-adaptation',
      title: 'Run a brand adaptation pass',
      description: 'The site already has enough brand foundation to move beyond setup and into a structured adaptation pass. Extract tokens and generate a brand adaptation plan before broad template or page work continues.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['extract_design_tokens', 'plan_brand_adaptation'],
      blocked_by: assessment.brand.global_colors_count === 0 || assessment.brand.global_typography_count === 0
        ? ['define_global_colors', 'define_global_typography']
        : [],
      tierRationale: 'This is where Advanced turns a configured site into a guided adaptation workflow instead of stopping at setup.',
    },
    assessment.brand.global_colors_count > 0
      && assessment.brand.global_typography_count > 0
      && (assessment.template_library.total > 0 || assessment.pages.elementor_total > 0),
  );

  add(
    {
      id: 'activate_premium_library_flow',
      priority: 2,
      category: 'library',
      workflowTrack: 'premium-library',
      title: 'Activate the premium library flow for faster reuse',
      description: 'The current site is ready for curated premium starters. Browse the premium catalog, inspect a likely asset, then import it locally so it can be adapted in the current Elementor Library.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: [
        'list_premium_library_assets',
        'inspect_premium_library_asset',
        'plan_premium_library_usage',
        'import_premium_library_asset',
      ],
      blocked_by: assessment.brand.global_colors_count === 0 || assessment.brand.global_typography_count === 0
        ? ['define_global_colors', 'define_global_typography']
        : [],
      tierRationale: 'Premium-library execution is one of the clearest workflow upgrades from Free to Advanced.',
    },
    assessment.template_library.total >= 3,
  );

  add(
    {
      id: 'run_output_critique_loop',
      priority: validationWarnings.length > 0 ? 1 : 3,
      category: 'content',
      workflowTrack: 'critique',
      title: 'Run an output critique loop before rollout',
      description: validationWarnings.length > 0
        ? 'Validation already surfaced warnings. Use output critique to turn those warnings into repair steps before applying broader page or template changes.'
        : 'Use critique on important template or page outputs before rollout so Advanced workflows improve quality, not just speed.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['validate_elementor_write', 'critique_elementor_output'],
      blocked_by: [],
      tierRationale: 'Advanced should add confidence and repair guidance, not only generation depth.',
    },
    validationWarnings.length > 0 || assessment.template_library.total > 0 || assessment.pages.elementor_total > 0,
  );

  add(
    {
      id: 'move_structural_work_into_governed_queue',
      priority: 2,
      category: 'structure',
      workflowTrack: 'governed-operations',
      title: 'Move structural changes into the governed change queue',
      description: 'This site has enough structural complexity that major template or page updates should be staged, reviewed, and applied through the queue instead of going straight to write operations.',
      impact: 'medium',
      effort: 'medium',
      automated: true,
      tools: ['queue_change', 'list_change_queue', 'review_change', 'apply_change'],
      blocked_by: [],
      tierRationale: 'Governed operations are part of the Advanced productivity promise for agencies and higher-trust workflows.',
    },
    (context.user_role === 'agency' || context.user_role === 'ai-agent')
      && (assessment.template_library.total >= 10 || hasThemeBuilderCapability),
  );

  add(
    {
      id: 'expand_creator_depth_with_media_support',
      priority: 3,
      category: 'content',
      workflowTrack: 'creator-depth',
      title: 'Expand creator depth with richer media support',
      description: 'The current site is ready for deeper creation flows. Use stock search, sideloading, or AI imagery where it materially improves layout quality or execution speed.',
      impact: 'medium',
      effort: 'medium',
      automated: false,
      tools: ['search_stock_images', 'sideload_stock_image', 'generate_ai_image'],
      blocked_by: [],
      tierRationale: 'Advanced should feel like a faster, stronger creation environment rather than only a policy layer.',
    },
    assessment.pages.elementor_total > 0 || assessment.template_library.total > 0,
  );

  add(
    {
      id: 'shape_honest_upgrade_path',
      priority: hasThemeBuilderCapability ? 3 : 2,
      category: 'structure',
      workflowTrack: 'upgrade-guidance',
      title: 'Shape the next upgrade path honestly',
      description: hasThemeBuilderCapability
        ? 'Use Advanced upgrade guidance to decide whether the next real step is to keep the current stack, add one curated pro addon profile, or deepen the current workflow path without stack inflation.'
        : 'The current scenario may need stronger builder capability. Use Advanced upgrade guidance to distinguish Elementor Pro needs from workflow-depth needs before making the stack heavier.',
      impact: 'medium',
      effort: 'low',
      automated: true,
      tools: ['plan_advanced_upgrade_path', 'get_destination_capabilities'],
      blocked_by: [],
      tierRationale: 'Advanced should explain stack shaping and paid-step boundaries clearly instead of turning upgrades into generic upsell behavior.',
    },
    assessment.pages.elementor_total > 0 || assessment.template_library.total > 0 || validationWarnings.length > 0,
  );

  add(
    {
      id: 'activate_productivity_pass',
      priority: 3,
      category: 'content',
      workflowTrack: 'productivity',
      title: 'Activate a productivity pass for reuse and governed follow-up',
      description: 'Use Advanced workflow layering to preserve reusable slices, shape bounded variants, and turn cautionary critique into explicit next actions instead of leaving operators with only advice.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['advanced_creator_mode', 'save_full_page_as_template', 'queue_change'],
      blocked_by: [],
      tierRationale: 'Advanced should reduce work through stronger reuse-light, variant, and follow-up behavior rather than only adding deeper tools.',
    },
    assessment.template_library.total > 0 || assessment.pages.elementor_total > 0,
  );

  return applyRoleFilters(recommendations, context);
}

export function buildAdvancedRecommendationReport(
  input: RecommendationEngineInput,
): AdvancedRecommendationReport {
  const foundationReport = buildRecommendationReport(input);
  const advancedRecommendations = buildAdvancedRecommendations(input);
  const foundationRecommendations = sortRecommendations(
    foundationReport.recommendations.filter((recommendation) => recommendation.priority <= 2).slice(0, 5),
  );

  return {
    destination: foundationReport.destination,
    compatibilitySummary: foundationReport.compatibilitySummary,
    capabilityWarnings: foundationReport.capabilityWarnings,
    foundationRecommendations,
    advancedRecommendations,
    notes: [
      'Advanced recommendations are additive to the Free foundation and should not replace core setup or validation guidance.',
      'Use Advanced tracks when the local site is ready for deeper workflows, stronger critique, or premium asset usage.',
      'Upgrade guidance should remain scenario-led and ecosystem-honest instead of becoming generic upsell logic.',
    ],
  };
}

export function buildAdvancedUpgradePlan(params: {
  assessment: RecommendationEngineInput['assessment'];
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
  currentTier: 'free' | 'advanced';
  scenario: 'deep-relaunch' | 'migration' | 'premium-rollout' | 'critique-repair';
  targetSurface: 'page' | 'theme-builder' | 'mixed';
  currentStackProfile?: StackProfileId;
  currentAddonProfile?: AddonProfileId;
}): AdvancedUpgradePlan {
  const hasThemeBuilderCapability = hasCapability(params.capabilityMatrix, 'theme-builder');
  const structuralScenario =
    params.scenario === 'deep-relaunch' || params.scenario === 'migration' || params.targetSurface === 'theme-builder';
  const premiumScenario = params.scenario === 'premium-rollout';

  const recommendedStackProfile: StackProfileId =
    structuralScenario ? 'asp-3-deep-relaunch-migration'
      : premiumScenario ? 'asp-2-advanced-premium-addon'
      : 'asp-1-advanced-productivity-baseline';

  const recommendedAddonProfile: AddonProfileId =
    premiumScenario ? 'conversion-pro'
      : params.context.site_purpose === 'community'
        ? 'content-system-pro'
        : 'none';

  if (structuralScenario && !hasThemeBuilderCapability) {
    return {
      currentTier: params.currentTier,
      scenario: params.scenario,
      targetSurface: params.targetSurface,
      recommendedStackProfile,
      recommendedAddonProfile: 'none',
      isUpgradeNeeded: true,
      recommendedUpgradeTarget: 'elementor-pro',
      reason: 'This scenario needs stronger structural Elementor-native capability before the deeper workflow path can stay efficient and honest.',
      lighterAlternativeConsidered: 'Keep the current stack and stay page-first for the next slice, but that would leave the structural gap unresolved.',
      complexityTradeoff: 'Adds builder and Theme Builder capability, but also increases stack depth and operational surface.',
      confidence: 'high',
      supportingRecommendations: [
        'Keep the first slice bounded even after upgrading.',
        'Do not add extra pro addons until the structural capability gap is actually closed.',
      ],
    };
  }

  if (params.currentTier === 'free' && (premiumScenario || params.scenario === 'critique-repair' || structuralScenario)) {
    return {
      currentTier: params.currentTier,
      scenario: params.scenario,
      targetSurface: params.targetSurface,
      recommendedStackProfile,
      recommendedAddonProfile,
      isUpgradeNeeded: true,
      recommendedUpgradeTarget: 'elementify-advanced',
      reason: 'The current scenario benefits more from workflow reduction, critique depth, and guided execution than from adding isolated builder features alone.',
      lighterAlternativeConsidered: 'Stay in Free and use narrower manual steps, but that keeps more orchestration work on the operator.',
      complexityTradeoff: 'Adds a deeper workflow layer with more structured guidance, but keeps the stack more focused than broad addon inflation.',
      confidence: 'high',
      supportingRecommendations: [
        'Keep addon expansion minimal until the workflow gap is clear.',
        structuralScenario
          ? 'Re-check Elementor Pro only if the structural target still exceeds the current builder capability.'
          : 'Use the scenario-first Advanced path before adding more stack pieces.',
      ],
    };
  }

  if (premiumScenario && recommendedAddonProfile !== 'none') {
    return {
      currentTier: params.currentTier,
      scenario: params.scenario,
      targetSurface: params.targetSurface,
      recommendedStackProfile,
      recommendedAddonProfile,
      isUpgradeNeeded: true,
      recommendedUpgradeTarget: 'supported-pro-addon-profile',
      reason: 'A curated pro addon profile would reduce friction in this premium rollout path more directly than broad stack expansion.',
      lighterAlternativeConsidered: 'Stay on the current Advanced baseline only, but expect more manual assembly and adaptation work.',
      complexityTradeoff: 'Adds one curated premium addon profile, so support and maintenance grow slightly.',
      confidence: 'medium',
      supportingRecommendations: [
        'Keep the addon choice singular and scenario-fit.',
        'Do not stack multiple addon profiles by default.',
      ],
    };
  }

  return {
    currentTier: params.currentTier,
    scenario: params.scenario,
    targetSurface: params.targetSurface,
    recommendedStackProfile,
    recommendedAddonProfile,
    isUpgradeNeeded: false,
    recommendedUpgradeTarget: 'keep-current-stack',
    reason: 'The current Advanced-oriented stack is already sufficient for the next bounded slice.',
    lighterAlternativeConsidered: 'A smaller baseline correction is still possible, but not necessary for this scenario right now.',
    complexityTradeoff: 'Keeps the stack leaner and avoids plugin inflation, but expects you to use the deeper workflow layer well.',
    confidence: 'high',
    supportingRecommendations: [
      'Prefer stronger workflow execution before adding more stack.',
      'Only add a pro addon profile when a concrete scenario gap becomes repeatable.',
    ],
  };
}

export function groupAdvancedRecommendationsByTrack(
  recommendations: AdvancedRecommendation[],
): Array<{
  track: AdvancedWorkflowTrack;
  items: AdvancedRecommendation[];
}> {
  const order: AdvancedWorkflowTrack[] = [
    'brand-adaptation',
    'premium-library',
    'critique',
    'governed-operations',
    'creator-depth',
    'upgrade-guidance',
    'productivity',
  ];

  return order
    .map((track) => ({
      track,
      items: recommendations.filter((recommendation) => recommendation.workflowTrack === track),
    }))
    .filter((group) => group.items.length > 0);
}
