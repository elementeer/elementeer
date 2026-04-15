import type {
  IntentWizardRoute,
  LayoutRiskSignal,
  ProjectEditingMode,
  ProjectProfile,
  Recommendation,
  RecommendationEngineReport,
  RiskResolutionMode,
  SiteAssessment,
  SiteContext,
} from './client.js';
import { buildCapabilityMatrix } from './destination.js';
import { buildSiteFingerprint } from './fingerprint.js';
import {
  buildLayoutRiskSignals,
  deriveApprovalMode,
  deriveRiskResolutionMode,
  resolveProjectProfile,
} from './project-profile-runtime.js';
import { buildRecommendationReport } from './recommendations.js';

export interface FreeRuntimeWizardPhase {
  id: string;
  label: string;
  goal: string;
  recommendationIds: string[];
  suggestedTools: string[];
  notes: string[];
}

export interface FreeRuntimeWizardAction {
  id: string;
  label: string;
  tool: string;
  reason: string;
  when: string;
  exampleArgs: Record<string, unknown>;
}

export interface FreeRuntimeWizardActionPreset {
  id: string;
  label: string;
  tool: string;
  expectedOutcome: string;
  executionMode: 'safe_execute' | 'preview_only';
  dependsOn: string[];
  args: Record<string, unknown>;
  executionNotes?: string[];
}

export interface FreeRuntimeWizardProfileApplication {
  layer: 'stack' | 'skill' | 'addon';
  label: string;
  summary: string;
  actions: string[];
}

export interface FreeRuntimeWizardPlan {
  kind: 'stack-bootstrap' | 'new-site-lite' | 'optimization-lite' | 'extension-lite' | 'relaunch-lite';
  title: string;
  summary: string;
  route: IntentWizardRoute;
  projectProfileApplied: ProjectProfile;
  layoutRiskSignals: LayoutRiskSignal[];
  riskResolutionMode: RiskResolutionMode;
  approvalMode: ProjectEditingMode;
  immediateActions: string[];
  phases: FreeRuntimeWizardPhase[];
  handoffs: string[];
  operativeHandoffs: FreeRuntimeWizardAction[];
  actionPresets: FreeRuntimeWizardActionPreset[];
  profileApplications: FreeRuntimeWizardProfileApplication[];
  upgradeSignal: string | null;
  recommendationReport: RecommendationEngineReport | null;
}

export type FreeRuntimeWizardKind = FreeRuntimeWizardPlan['kind'];

function buildRuntimePolicy(params: {
  kind: FreeRuntimeWizardKind;
  route: IntentWizardRoute;
  context: SiteContext | null;
}): Pick<
  FreeRuntimeWizardPlan,
  'projectProfileApplied' | 'layoutRiskSignals' | 'riskResolutionMode' | 'approvalMode'
> {
  const projectProfileApplied = resolveProjectProfile(params.context);
  const layoutRiskSignals = buildLayoutRiskSignals({
    kind: params.kind,
    route: params.route,
    profile: projectProfileApplied,
  });

  return {
    projectProfileApplied,
    layoutRiskSignals,
    riskResolutionMode: deriveRiskResolutionMode(projectProfileApplied, layoutRiskSignals),
    approvalMode: deriveApprovalMode(projectProfileApplied, layoutRiskSignals),
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function pickRecommendations(
  report: RecommendationEngineReport | null,
  recommendationIds: string[],
): Recommendation[] {
  if (!report) {
    return [];
  }

  return recommendationIds
    .map((id) => report.recommendations.find((recommendation) => recommendation.id === id))
    .filter((recommendation): recommendation is Recommendation => Boolean(recommendation));
}

function buildReport(
  assessment: SiteAssessment | null,
  context: SiteContext | null,
): RecommendationEngineReport | null {
  if (!assessment || !context) {
    return null;
  }

  const fingerprint = buildSiteFingerprint(assessment);
  const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);

  return buildRecommendationReport({
    assessment,
    context,
    fingerprint,
    capabilityMatrix,
  });
}

function resolveBootstrapSummary(route: IntentWizardRoute): string {
  if (!route.stackReadiness.elementorInstalled) {
    return 'Move from a non-Elementor or incomplete baseline to a safe, support-aware starting stack with a visible first result.';
  }

  return 'Stabilize the current stack, keep plugin growth restrained, and hand the user into the smallest useful first build path.';
}

function buildStackBootstrapPhases(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardPhase[] {
  const foundationRecommendations = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]);
  const firstOutputRecommendations = pickRecommendations(report, [
    'build_first_elementor_page',
    'categorize_templates',
    'tag_templates_by_type',
  ]);

  return [
    {
      id: 'baseline',
      label: 'Baseline and stack decision',
      goal: 'Confirm the smallest sensible baseline stack before extra plugin or upgrade choices enter the picture.',
      recommendationIds: [],
      suggestedTools: [
        'route_intent_wizard',
        'plan_stack_bootstrap',
        'assess_site',
        'get_site_fingerprint',
        'get_destination_capabilities',
        'set_site_context',
        'get_site_settings',
        'get_seo_meta',
      ],
      notes: [
        `Baseline stack: ${route.recommendedStackProfile.baselineStack.join(' -> ')}`,
        route.recommendedAddonProfile.id === 'none'
          ? 'Addon growth stays off by default until the baseline is working.'
          : `Addon profile stays optional and curated: ${route.recommendedAddonProfile.label}.`,
      ],
    },
    {
      id: 'foundation',
      label: 'Brand and site foundation',
      goal: 'Create the smallest visible lift early so the user sees progress and gets a coherent starting point.',
      recommendationIds: foundationRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'wizard_brand_setup',
        'get_global_styles',
        'set_site_logo',
        'set_global_colors',
        'set_global_typography',
      ],
      notes: foundationRecommendations.length > 0
        ? foundationRecommendations.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['Brand foundation already looks present enough to avoid forced rework in this step.'],
    },
    {
      id: 'first-output',
      label: 'First build or transition output',
      goal: 'Land the user in a real first page or reusable structure path instead of stopping at diagnosis.',
      recommendationIds: firstOutputRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'list_elementor_pages',
        'creator_mode',
        'compose_page_from_templates',
        'save_page_section_as_template',
        'update_page_data',
        'validate_elementor_write',
      ],
      notes: firstOutputRecommendations.length > 0
        ? firstOutputRecommendations.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['Use Creator Light to assemble the first page or extract the first reusable section once the baseline is confirmed.'],
    },
  ];
}

function buildOptimizationLitePhases(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardPhase[] {
  const prioritizeRecommendations = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
    'switch_css_to_external',
    'disable_fa4_shim',
    'install_seo_plugin',
  ]);
  const structureRecommendations = pickRecommendations(report, [
    'categorize_templates',
    'tag_templates_by_type',
    'build_first_elementor_page',
  ]);

  return [
    {
      id: 'diagnose',
      label: route.intent === 'clean_up'
        ? 'Diagnose clutter and cleanup priorities'
        : route.intent === 'refresh'
          ? 'Diagnose refresh priorities'
          : 'Diagnose and prioritize',
      goal: route.intent === 'clean_up'
        ? 'Identify the smallest cleanup wins before changing broader structure.'
        : route.intent === 'refresh'
          ? 'Identify the smallest presentation and clarity wins before changing broader structure.'
          : 'Identify the lowest-risk optimization wins before changing structure.',
      recommendationIds: prioritizeRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'get_recommendations',
        'explain_recommendation',
        'assess_site',
        'get_site_fingerprint',
        'get_destination_capabilities',
        'get_performance_report',
        'get_seo_meta',
        'flush_elementor_cache',
      ],
      notes: prioritizeRecommendations.length > 0
        ? prioritizeRecommendations.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['No obvious optimization-only recommendation is currently active, so the flow should stay conservative and evidence-led.'],
    },
    {
      id: 'foundation',
      label: route.intent === 'clean_up'
        ? 'Apply low-risk cleanup fixes'
        : route.intent === 'refresh'
          ? 'Apply low-risk refresh fixes'
          : 'Apply low-risk optimization fixes',
      goal: route.intent === 'clean_up'
        ? 'Reduce clutter and improve hygiene before moving into larger structural changes.'
        : route.intent === 'refresh'
          ? 'Create a visible presentation uplift before moving into larger structural changes.'
          : 'Turn the first optimization loop into visible improvements around brand, clarity, library hygiene, or performance.',
      recommendationIds: structureRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'wizard_brand_setup',
        'audit_library',
        'bulk_rename',
        'set_category',
        'set_tags',
        'validate_elementor_write',
        'get_seo_meta',
        'update_seo_meta',
        'flush_elementor_cache',
        'optimize_elementor_assets',
      ],
      notes: structureRecommendations.length > 0
        ? structureRecommendations.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['Apply only the smallest meaningful fixes and validate after each change.'],
    },
    {
      id: 'iterate',
      label: route.intent === 'clean_up'
        ? 'Iterate into cleanup-safe Creator Light'
        : route.intent === 'refresh'
          ? 'Iterate into refresh-safe Creator Light'
          : 'Iterate into Creator Light',
      goal: route.intent === 'clean_up'
        ? 'Carry cleanup work into small structure improvements without turning it into a deep rebuild.'
        : route.intent === 'refresh'
          ? 'Carry refresh work into small structure improvements without turning it into a deep rebuild.'
          : 'Carry the optimization pass into small content or structure improvements without turning it into a deep rebuild.',
      recommendationIds: [],
      suggestedTools: [
        'creator_mode',
        'compose_page_from_templates',
        'save_page_section_as_template',
        'update_page_data',
      ],
      notes: [
        'Use Creator Light only after the current bottleneck is named clearly.',
        'Keep the loop local, guided, and validation-aware.',
      ],
    },
  ];
}

function buildRelaunchLitePhases(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardPhase[] {
  const preservationRecommendations = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
    'categorize_templates',
  ]);
  const structuralWarnings = pickRecommendations(report, [
    'unlock_theme_builder_capability',
    'create_header_template',
    'create_footer_template',
  ]);

  return [
    {
      id: 'protect',
      label: 'Protect what must stay',
      goal: 'Make preservation priorities explicit before touching structure, pages, or the theme baseline.',
      recommendationIds: preservationRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'route_intent_wizard',
        'assess_site',
        'list_elementor_pages',
        'save_full_page_as_template',
        'save_page_section_as_template',
        'set_site_context',
      ],
      notes: [
        route.preservationPriorities.length > 0
          ? `Preserve first: ${route.preservationPriorities.join(', ')}`
          : 'No explicit preservation priorities were given, so start by naming what must not regress.',
      ],
    },
    {
      id: 'stabilize',
      label: 'Stabilize the baseline',
      goal: 'Use low-risk brand, library, and recommendation work to improve the current site before any deeper rebuild decision.',
      recommendationIds: preservationRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'get_recommendations',
        'explain_recommendation',
        'wizard_brand_setup',
        'audit_library',
        'validate_elementor_write',
      ],
      notes: preservationRecommendations.length > 0
        ? preservationRecommendations.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['Relaunch Lite should still start with visible low-risk improvements rather than a deep reset.'],
    },
    {
      id: 'handoff',
      label: 'Choose the next relaunch boundary',
      goal: 'Decide whether the site should stay in Free relaunch-lite or hand off into Advanced deep relaunch work.',
      recommendationIds: structuralWarnings.map((recommendation) => recommendation.id),
      suggestedTools: [
        'get_destination_capabilities',
        'get_site_fingerprint',
        'get_advanced_recommendations',
      ],
      notes: structuralWarnings.length > 0
        ? structuralWarnings.map(
            (recommendation) => `[${recommendation.id}] ${recommendation.title}`,
          )
        : ['If relaunch scope starts pushing into deeper structural workflows, hand off into Advanced instead of forcing Free to overreach.'],
    },
  ];
}

function buildNewSiteLitePhases(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardPhase[] {
  const foundationRecommendations = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]);
  const firstOutputRecommendations = pickRecommendations(report, [
    'build_first_elementor_page',
    'categorize_templates',
    'tag_templates_by_type',
  ]);

  return [
    {
      id: 'baseline',
      label: 'Confirm new-site baseline',
      goal: 'Turn the idea or brand starting point into the smallest sensible working site baseline.',
      recommendationIds: [],
      suggestedTools: [
        'route_intent_wizard',
        'plan_stack_bootstrap',
        'set_site_context',
        'get_destination_capabilities',
      ],
      notes: [
        `Starting stack: ${route.recommendedStackProfile.baselineStack.join(' -> ')}`,
        'Keep the first site light and coherent before introducing more plugin or structural depth.',
      ],
    },
    {
      id: 'foundation',
      label: 'Lay brand and site foundation',
      goal: 'Create a visible and coherent first baseline for the new site.',
      recommendationIds: foundationRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'wizard_brand_setup',
        'get_global_styles',
        'set_site_logo',
        'set_global_colors',
        'set_global_typography',
      ],
      notes: foundationRecommendations.length > 0
        ? foundationRecommendations.map((recommendation) => `[${recommendation.id}] ${recommendation.title}`)
        : ['Use Brand Setup to shape the first visible baseline even if recommendations are still sparse.'],
    },
    {
      id: 'first-build',
      label: 'Assemble the first site draft',
      goal: 'Land the user in a first guided page draft instead of stopping at stack setup.',
      recommendationIds: firstOutputRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'creator_mode',
        'compose_page_from_templates',
        'save_page_section_as_template',
        'validate_elementor_write',
      ],
      notes: [
        'Use Creator Light for the first page draft.',
        'Keep the first draft small, understandable, and easy to revise.',
      ],
    },
  ];
}

function buildExtensionLitePhases(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardPhase[] {
  const structureRecommendations = pickRecommendations(report, [
    'categorize_templates',
    'tag_templates_by_type',
    'build_first_elementor_page',
  ]);

  return [
    {
      id: 'scope',
      label: 'Scope the extension narrowly',
      goal: 'Choose the smallest useful extension so the site gains value without turning into uncontrolled plugin growth.',
      recommendationIds: [],
      suggestedTools: [
        'route_intent_wizard',
        'get_destination_capabilities',
        'get_recommendations',
      ],
      notes: [
        `Addon profile: ${route.recommendedAddonProfile.label}`,
        route.recommendedAddonProfile.examples.length > 0
          ? `Examples: ${route.recommendedAddonProfile.examples.join(' | ')}`
          : 'No addon profile is required yet.',
      ],
    },
    {
      id: 'prepare',
      label: 'Prepare supporting structure',
      goal: 'Stabilize the library and baseline structure before adding the new capability.',
      recommendationIds: structureRecommendations.map((recommendation) => recommendation.id),
      suggestedTools: [
        'explain_recommendation',
        'audit_library',
        'wizard_brand_setup',
        'validate_elementor_write',
        'get_site_settings',
        'update_site_settings',
        'get_seo_meta',
        'update_seo_meta',
      ],
      notes: [
        'Use recommendation explanation to justify the first extension move.',
        'Keep the extension support-aware and scenario-fit.',
      ],
    },
    {
      id: 'build',
      label: 'Build the first extension draft',
      goal: 'Translate the extension into a first light draft or reusable structure.',
      recommendationIds: [],
      suggestedTools: [
        'creator_mode',
        'compose_page_from_templates',
        'save_full_page_as_template',
        'validate_elementor_write',
      ],
      notes: [
        'Use Creator Light for the first extension-specific draft.',
        'Hand off to Advanced when the extension starts demanding deeper rollout or richer workflow control.',
      ],
    },
  ];
}

function summarizeImmediateActions(phases: FreeRuntimeWizardPhase[]): string[] {
  return phases.map((phase) => `${phase.label}: ${phase.goal}`);
}

function buildProfileApplications(route: IntentWizardRoute): FreeRuntimeWizardProfileApplication[] {
  const stackActions = [
    `Start from the baseline stack: ${route.recommendedStackProfile.baselineStack.join(' -> ')}`,
    route.recommendedStackProfile.upgradePath.length > 0
      ? `Only consider the next stronger layer if the baseline still leaves a real gap: ${route.recommendedStackProfile.upgradePath.join(' | ')}`
      : 'Keep the baseline stable before considering any stronger stack step.',
  ];

  const skillActions = route.recommendedSkillProfile.explanationStyle === 'step_by_step'
    ? [
        'Keep the next decision narrow and sequential.',
        'Prefer one visible result before opening branching choices.',
      ]
    : route.recommendedSkillProfile.explanationStyle === 'branching'
      ? [
          'Show two or three clear branches at each decision point.',
          'Make tradeoffs explicit before moving into execution.',
        ]
      : [
          'Prefer direct operator steps and less hand-holding.',
          'Expose the lower-level tradeoffs and constraints explicitly.',
        ];

  const addonActions = route.recommendedAddonProfile.id === 'none'
    ? [
        'Do not add an addon profile yet.',
        'Prove the baseline path first, then reassess whether one curated addon profile is genuinely needed.',
      ]
    : route.recommendedAddonProfile.id === 'content-marketing-free'
      ? [
          `Treat ${route.recommendedAddonProfile.label} as optional and scenario-justified.`,
          'Shape the first extension around content structure, not around a broad addon rollout.',
          route.recommendedAddonProfile.examples.length > 0
            ? `Keep the addon profile narrow: ${route.recommendedAddonProfile.examples.join(' | ')}`
            : 'Avoid stacking multiple addon profiles.',
        ]
      : route.recommendedAddonProfile.id === 'conversion-free' || route.recommendedAddonProfile.id === 'conversion-pro'
        ? [
            `Treat ${route.recommendedAddonProfile.label} as optional and scenario-justified.`,
            'Use the addon profile to reinforce one conversion path, not to widen the stack indiscriminately.',
            route.recommendedAddonProfile.examples.length > 0
              ? `Keep the addon profile narrow: ${route.recommendedAddonProfile.examples.join(' | ')}`
              : 'Avoid stacking multiple addon profiles.',
          ]
    : [
        `Treat ${route.recommendedAddonProfile.label} as optional and scenario-justified.`,
        route.recommendedAddonProfile.examples.length > 0
          ? `Keep the addon profile narrow: ${route.recommendedAddonProfile.examples.join(' | ')}`
          : 'Avoid stacking multiple addon profiles.',
      ];

  return [
    {
      layer: 'stack',
      label: route.recommendedStackProfile.label,
      summary: route.recommendedStackProfile.summary,
      actions: stackActions,
    },
    {
      layer: 'skill',
      label: route.recommendedSkillProfile.label,
      summary: route.recommendedSkillProfile.summary,
      actions: skillActions,
    },
    {
      layer: 'addon',
      label: route.recommendedAddonProfile.label,
      summary: route.recommendedAddonProfile.summary,
      actions: addonActions,
    },
  ];
}

function resolveCreatorSections(route: IntentWizardRoute): string[] {
  let sections: string[];

  if (route.recommendedAddonProfile.id === 'content-marketing-free') {
    sections = ['hero', 'featured-content', 'latest-posts', 'newsletter', 'cta'];
  } else if (route.recommendedAddonProfile.id === 'conversion-free' || route.recommendedAddonProfile.id === 'conversion-pro') {
    sections = ['hero', 'benefits', 'social-proof', 'faq', 'cta'];
  } else if (route.origin === 'idea_only' || route.origin === 'brand_without_site') {
    sections = ['hero', 'about', 'services', 'cta'];
  } else if (route.intent === 'optimization' || route.intent === 'clean_up' || route.intent === 'refresh') {
    sections = ['hero', 'features', 'cta'];
  } else {
    sections = ['hero', 'features', 'cta'];
  }

  if (route.recommendedSkillProfile.explanationStyle === 'step_by_step' && sections.length > 4) {
    sections = sections.slice(0, 4);
  }

  if (
    route.recommendedSkillProfile.explanationStyle === 'direct_operator'
    && !sections.includes('faq')
    && (route.intent === 'extension' || route.origin === 'idea_only' || route.origin === 'brand_without_site')
  ) {
    sections = [...sections, 'faq'];
  }

  return uniqueStrings(sections);
}

function resolveContextPresetArgs(route: IntentWizardRoute): Record<string, unknown> {
  const userRole = route.userPosture === 'technical'
    ? 'agency-operator'
    : route.userPosture === 'assisted'
      ? 'freelancer'
      : 'site-owner';

  const sitePurpose = route.recommendedAddonProfile.id === 'content-marketing-free'
    ? 'content-marketing'
    : route.recommendedAddonProfile.id === 'conversion-free' || route.recommendedAddonProfile.id === 'conversion-pro'
      ? 'lead-generation'
      : route.origin === 'idea_only' || route.origin === 'brand_without_site'
        ? 'new-site'
        : route.intent === 'extension'
          ? 'site-extension'
          : route.intent === 'clean_up' || route.intent === 'refresh' || route.intent === 'optimization'
            ? 'optimization'
            : route.intent === 'relaunch'
              ? 'relaunch'
              : 'corporate';

  return {
    user_role: userRole,
    site_purpose: sitePurpose,
    primary_language: 'en',
  };
}

function resolveBrandSetupFocus(
  route: IntentWizardRoute,
  recommendationIds: string[],
): string[] {
  if (route.recommendedStackProfile.id === 'fsp-3-brownfield-staged-transition') {
    return ['define_global_colors', 'define_global_typography'];
  }

  const focus = [...recommendationIds];

  if (route.origin === 'idea_only' || route.origin === 'brand_without_site') {
    focus.unshift('set_logo');
  }

  if (route.recommendedAddonProfile.id === 'content-marketing-free') {
    focus.push('define_global_typography');
  }

  if (route.recommendedAddonProfile.id === 'conversion-free' || route.recommendedAddonProfile.id === 'conversion-pro') {
    focus.push('define_global_colors');
  }

  return uniqueStrings(
    focus.length > 0 ? focus : ['define_global_colors', 'define_global_typography'],
  );
}

function resolveBrandSetupExecutionNotes(route: IntentWizardRoute): string[] {
  const notes = [
    'This runs the brand wizard in dry-run mode only.',
    'Immediate writes stay opt-in through wizard_brand_setup(auto_execute=true).',
  ];

  if (route.recommendedStackProfile.id === 'fsp-3-brownfield-staged-transition') {
    notes.push('This brownfield path avoids forcing a theme swap before the baseline is understood.');
  }

  if (route.recommendedSkillProfile.explanationStyle === 'direct_operator') {
    notes.push('The preset keeps the focus list explicit because this route is operator-leaning.');
  }

  if (route.recommendedAddonProfile.id !== 'none') {
    notes.push('Finish the brand baseline before expanding into the addon profile.');
  }

  return notes;
}

function buildBrandSetupPreset(
  route: IntentWizardRoute,
  recommendationIds: string[],
  title: string,
): FreeRuntimeWizardActionPreset {
  const focus = resolveBrandSetupFocus(route, recommendationIds);

  return {
    id: `${title}-brand-setup`,
    label: 'Brand foundation preset',
    tool: 'wizard_brand_setup',
    expectedOutcome: 'A first visible brand baseline for logo, colors, and typography without forcing immediate execution.',
    executionMode: 'safe_execute',
    dependsOn: recommendationIds,
    args: {
      auto_execute: false,
      focus,
    },
    executionNotes: resolveBrandSetupExecutionNotes(route),
  };
}

function buildCreatorPreset(
  route: IntentWizardRoute,
  title: string,
): FreeRuntimeWizardActionPreset {
  const sections = resolveCreatorSections(route);
  const templateTitle = title === 'bootstrap'
    ? 'First Guided Page'
    : title === 'new-site'
      ? 'New Site Lite Draft'
      : title === 'optimization'
        ? 'Optimization Pass Draft'
        : title === 'extension' && route.recommendedAddonProfile.id === 'content-marketing-free'
          ? 'Content Extension Draft'
          : title === 'extension' && (route.recommendedAddonProfile.id === 'conversion-free' || route.recommendedAddonProfile.id === 'conversion-pro')
            ? 'Conversion Extension Draft'
        : title === 'extension'
          ? 'Extension Lite Draft'
          : 'Relaunch Lite Draft';
  const templateType = route.intent === 'optimization' || route.intent === 'clean_up' || route.intent === 'refresh'
    ? 'section'
    : 'page';

  const executionNotes = [
    'This runs Creator Mode as a dry run.',
    'It is meant to validate library matches before any page write happens.',
  ];

  if (templateType === 'section') {
    executionNotes.push('This route saves the first result as a reusable section draft to keep the change surface smaller.');
  }

  if (route.recommendedAddonProfile.id !== 'none') {
    executionNotes.push(`The first draft stays aligned with the ${route.recommendedAddonProfile.label} profile instead of widening the stack broadly.`);
  }

  return {
    id: `${title}-creator-light`,
    label: 'Creator Light preset',
    tool: 'creator_mode',
    expectedOutcome: 'A first draft page or reusable structure that turns the guided path into a tangible Elementor result.',
    executionMode: 'safe_execute',
    dependsOn: ['wizard_brand_setup'],
    args: {
      sections,
      dry_run: true,
      save_as_template: {
        title: templateTitle,
        template_type: templateType,
        status: 'draft',
      },
    },
    executionNotes,
  };
}

function buildExplainPreset(
  report: RecommendationEngineReport | null,
  title: string,
): FreeRuntimeWizardActionPreset {
  const firstRecommendation = report?.recommendations[0];

  return {
    id: `${title}-explain-recommendation`,
    label: 'Recommendation explanation preset',
    tool: 'explain_recommendation',
    expectedOutcome: 'The next meaningful recommendation is translated into a concrete guided execution step.',
    executionMode: 'preview_only',
    dependsOn: ['get_recommendations'],
    args: {
      recommendation_id: firstRecommendation?.id ?? 'set_logo',
    },
    executionNotes: [
      'Recommendation explanation remains preview-only for now.',
      'Use it to clarify the next move before running deeper guided actions.',
    ],
  };
}

function buildStackBootstrapOperativeHandoffs(route: IntentWizardRoute): FreeRuntimeWizardAction[] {
  return [
    {
      id: 'bootstrap-context',
      label: 'Store minimal site context first',
      tool: 'set_site_context',
      reason: 'The recommendation and wizard layers become more scenario-aware once role and site purpose are known.',
      when: 'After confirming the baseline stack but before wider recommendations are interpreted.',
      exampleArgs: {
        user_role: 'site-owner',
        site_purpose: 'corporate',
        primary_language: 'en',
      },
    },
    {
      id: 'bootstrap-brand-foundation',
      label: 'Start brand setup as the first visible lift',
      tool: 'wizard_brand_setup',
      reason: 'A first logo, color, and typography baseline makes the stack feel real before the first page build.',
      when: 'Use when logo, color, or typography gaps are active or when the user has enough brand input.',
      exampleArgs: {
        auto_execute: false,
      },
    },
    {
      id: 'bootstrap-first-build',
      label: 'Hand off into the first Creator Light build',
      tool: 'creator_mode',
      reason: 'The bootstrap path should end in a real first structure, not a diagnosis-only loop.',
      when: 'Use after the baseline stack and initial brand foundation are acceptable.',
      exampleArgs: {
        sections: route.origin === 'idea_only' || route.origin === 'brand_without_site'
          ? ['hero', 'about', 'services', 'cta']
          : ['hero', 'features', 'cta'],
        dry_run: true,
        save_as_template: {
          title: 'First Guided Page',
          template_type: 'page',
          status: 'draft',
        },
      },
    },
  ];
}

function buildStackBootstrapActionPresets(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardActionPreset[] {
  const foundationRecommendationIds = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]).map((recommendation) => recommendation.id);

  return [
    {
      id: 'bootstrap-context-preset',
      label: 'Bootstrap context preset',
      tool: 'set_site_context',
      expectedOutcome: 'The recommendation engine has enough context to keep guidance relevant and role-aware.',
      executionMode: 'safe_execute',
      dependsOn: ['route_intent_wizard'],
      args: {
        ...resolveContextPresetArgs(route),
      },
      executionNotes: [
        'This is safe to execute directly when a site_id is available.',
      ],
    },
    buildBrandSetupPreset(route, foundationRecommendationIds, 'bootstrap'),
    buildCreatorPreset(route, 'bootstrap'),
  ];
}

function buildNewSiteLiteOperativeHandoffs(
  route: IntentWizardRoute,
): FreeRuntimeWizardAction[] {
  return [
    {
      id: 'new-site-context',
      label: 'Store minimal site context for the new site',
      tool: 'set_site_context',
      reason: 'The first site draft becomes more useful once the role and site purpose are clear.',
      when: 'Use once the new-site baseline is accepted.',
      exampleArgs: {
        user_role: route.userPosture === 'technical' ? 'freelancer' : 'site-owner',
        site_purpose: 'corporate',
        primary_language: 'en',
      },
    },
    {
      id: 'new-site-brand-foundation',
      label: 'Shape the first brand baseline',
      tool: 'wizard_brand_setup',
      reason: 'A new site should feel coherent before the first page draft is assembled.',
      when: 'Use as soon as basic logo, color, or typography direction exists.',
      exampleArgs: {
        auto_execute: false,
      },
    },
    {
      id: 'new-site-first-build',
      label: 'Create the first new-site draft',
      tool: 'creator_mode',
      reason: 'The path should end in a tangible first page draft, not only in setup advice.',
      when: 'Use after the baseline stack and first brand foundation are acceptable.',
      exampleArgs: {
        sections: resolveCreatorSections(route),
        dry_run: true,
        save_as_template: {
          title: 'New Site Lite Draft',
          template_type: 'page',
          status: 'draft',
        },
      },
    },
  ];
}

function buildNewSiteLiteActionPresets(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardActionPreset[] {
  const foundationRecommendationIds = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]).map((recommendation) => recommendation.id);

  return [
    {
      id: 'new-site-context-preset',
      label: 'New-site context preset',
      tool: 'set_site_context',
      expectedOutcome: 'The new-site path is grounded in a real role and purpose context.',
      executionMode: 'safe_execute',
      dependsOn: ['route_intent_wizard'],
      args: {
        ...resolveContextPresetArgs(route),
      },
      executionNotes: ['This is safe to execute directly when a site_id is available.'],
    },
    buildBrandSetupPreset(route, foundationRecommendationIds, 'new-site'),
    buildCreatorPreset(route, 'new-site'),
  ];
}

function buildOptimizationOperativeHandoffs(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardAction[] {
  const firstRecommendation = report?.recommendations[0];

  return [
    {
      id: 'optimization-explain',
      label: 'Explain the first active optimization recommendation',
      tool: 'explain_recommendation',
      reason: 'Optimization should start with the clearest current bottleneck instead of broad edits everywhere.',
      when: 'Use before applying broader changes so the first iteration stays focused.',
      exampleArgs: {
        recommendation_id: firstRecommendation?.id ?? 'set_logo',
      },
    },
    {
      id: 'optimization-foundation',
      label: 'Apply the smallest meaningful foundation fix',
      tool: 'wizard_brand_setup',
      reason: 'Brand and clarity gaps often unlock more visible optimization value than deeper restructuring at the start.',
      when: 'Use when brand inconsistencies or missing foundations are part of the active recommendations.',
      exampleArgs: {
        auto_execute: false,
      },
    },
    {
      id: 'optimization-creator-light',
      label: 'Carry the optimization into a small Creator Light pass',
      tool: 'creator_mode',
      reason: 'Once the main bottleneck is understood, a small structure improvement can create a visible outcome without forcing a rebuild.',
      when: 'Use only after the first recommendation is explained and the user is ready for a small execution step.',
      exampleArgs: {
        sections: ['hero', 'features', 'cta'],
        dry_run: true,
        save_as_template: {
          title: 'Optimization Pass Draft',
          template_type: 'page',
          status: 'draft',
        },
      },
    },
  ];
}

function buildOptimizationActionPresets(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardActionPreset[] {
  const foundationRecommendationIds = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]).map((recommendation) => recommendation.id);

  return [
    buildExplainPreset(report, 'optimization'),
    buildBrandSetupPreset(route, foundationRecommendationIds, 'optimization'),
    buildCreatorPreset(route, 'optimization'),
  ];
}

function buildExtensionOperativeHandoffs(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardAction[] {
  const firstRecommendation = report?.recommendations[0];

  return [
    {
      id: 'extension-explain',
      label: 'Explain the first extension recommendation',
      tool: 'explain_recommendation',
      reason: 'Extension work should start from the clearest scenario-fit need rather than broad plugin enthusiasm.',
      when: 'Use before building the extension draft.',
      exampleArgs: {
        recommendation_id: firstRecommendation?.id ?? 'build_first_elementor_page',
      },
    },
    {
      id: 'extension-foundation',
      label: 'Stabilize the supporting foundation',
      tool: 'wizard_brand_setup',
      reason: 'A small amount of foundation work often makes the extension feel integrated rather than bolted on.',
      when: 'Use when the current site still needs visible brand or baseline coherence.',
      exampleArgs: {
        auto_execute: false,
      },
    },
    {
      id: 'extension-build',
      label: 'Create the first extension draft',
      tool: 'creator_mode',
      reason: 'The extension path should deliver a tangible first draft rather than stopping at addon advice.',
      when: 'Use after the extension scope is narrow enough and the baseline is stable enough.',
      exampleArgs: {
        sections: resolveCreatorSections(route),
        dry_run: true,
        save_as_template: {
          title: 'Extension Lite Draft',
          template_type: 'page',
          status: 'draft',
        },
      },
    },
  ];
}

function buildExtensionActionPresets(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardActionPreset[] {
  const foundationRecommendationIds = pickRecommendations(report, [
    'set_logo',
    'define_global_colors',
    'define_global_typography',
  ]).map((recommendation) => recommendation.id);

  return [
    buildExplainPreset(report, 'extension'),
    buildBrandSetupPreset(route, foundationRecommendationIds, 'extension'),
    buildCreatorPreset(route, 'extension'),
  ];
}

function buildRelaunchOperativeHandoffs(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardAction[] {
  const firstRecommendation = report?.recommendations[0];

  return [
    {
      id: 'relaunch-preserve',
      label: 'Save reusable current-state structures first',
      tool: 'save_full_page_as_template',
      reason: 'Relaunch Lite should protect recoverable assets before structural work begins.',
      when: 'Use once the preservation priorities are named and before broader changes touch key pages.',
      exampleArgs: {
        page_id: 0,
        title: 'Pre-Relaunch Snapshot',
        status: 'draft',
      },
    },
    {
      id: 'relaunch-diagnose',
      label: 'Explain the first active relaunch recommendation',
      tool: 'explain_recommendation',
      reason: 'The first relaunch move should be justified clearly, not inferred loosely from a big overhaul mindset.',
      when: 'Use after the protection step so the next improvement path is explicit.',
      exampleArgs: {
        recommendation_id: firstRecommendation?.id ?? 'define_global_colors',
      },
    },
    {
      id: 'relaunch-advanced-boundary',
      label: 'Check whether the relaunch should hand off into Advanced',
      tool: 'get_advanced_recommendations',
      reason: 'Relaunch Lite should hand off cleanly once deeper workflow or structure depth becomes the real need.',
      when: 'Use after low-risk stabilization if the relaunch starts demanding deeper structural work.',
      exampleArgs: {},
    },
  ];
}

function buildRelaunchActionPresets(
  route: IntentWizardRoute,
  report: RecommendationEngineReport | null,
): FreeRuntimeWizardActionPreset[] {
  return [
    {
      id: 'relaunch-preserve-preset',
      label: 'Relaunch preservation preset',
      tool: 'save_full_page_as_template',
      expectedOutcome: 'The current site has a recoverable snapshot before relaunch work changes key surfaces.',
      executionMode: 'preview_only',
      dependsOn: ['list_elementor_pages'],
      args: {
        page_id: 0,
        title: 'Pre-Relaunch Snapshot',
        status: 'draft',
      },
      executionNotes: [
        'This stays preview-only until a real page selection is confirmed.',
      ],
    },
    buildExplainPreset(report, 'relaunch'),
    {
      id: 'relaunch-advanced-boundary-preset',
      label: 'Advanced boundary check preset',
      tool: 'get_advanced_recommendations',
      expectedOutcome: 'The relaunch boundary is explicit before Free overreaches into deeper structural workflow territory.',
      executionMode: 'preview_only',
      dependsOn: ['get_destination_capabilities'],
      args: {},
      executionNotes: [
        'This boundary check points toward Advanced and is intentionally not auto-executed from Free.',
      ],
    },
  ];
}

export function buildFreeRuntimeWizardPlan(params: {
  kind: FreeRuntimeWizardKind;
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  switch (params.kind) {
    case 'stack-bootstrap':
      return buildStackBootstrapWizardPlan(params);
    case 'new-site-lite':
      return buildNewSiteLiteWizardPlan(params);
    case 'optimization-lite':
      return buildOptimizationLiteWizardPlan(params);
    case 'extension-lite':
      return buildExtensionLiteWizardPlan(params);
    case 'relaunch-lite':
      return buildRelaunchLiteWizardPlan(params);
  }
}

export function buildStackBootstrapWizardPlan(params: {
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  const report = buildReport(params.assessment, params.context);
  const phases = buildStackBootstrapPhases(params.route, report);
  const policy = buildRuntimePolicy({
    kind: 'stack-bootstrap',
    route: params.route,
    context: params.context,
  });

  return {
    kind: 'stack-bootstrap',
    title: 'Stack Bootstrap Wizard',
    summary: resolveBootstrapSummary(params.route),
    route: params.route,
    ...policy,
    immediateActions: summarizeImmediateActions(phases),
    phases,
    handoffs: [
      'Use wizard_brand_setup once the first logo, color, or typography decisions are clear.',
      'Use creator_mode or compose_page_from_templates once the baseline stack is ready for the first real page build.',
    ],
    operativeHandoffs: buildStackBootstrapOperativeHandoffs(params.route),
    actionPresets: buildStackBootstrapActionPresets(params.route, report),
    profileApplications: buildProfileApplications(params.route),
    upgradeSignal: params.route.recommendedTier === 'advanced'
      ? 'The routing layer already sees enough workflow depth to justify an Advanced handoff after the baseline is stabilized.'
      : null,
    recommendationReport: report,
  };
}

export function buildOptimizationLiteWizardPlan(params: {
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  const report = buildReport(params.assessment, params.context);
  const phases = buildOptimizationLitePhases(params.route, report);
  const policy = buildRuntimePolicy({
    kind: 'optimization-lite',
    route: params.route,
    context: params.context,
  });

  return {
    kind: 'optimization-lite',
    title: 'Optimization Lite Wizard',
    summary: params.route.intent === 'clean_up'
      ? 'Turn cleanup into a guided, low-risk sequence that reduces clutter before larger changes.'
      : params.route.intent === 'refresh'
        ? 'Turn refresh into a guided, low-risk sequence that creates visible presentation uplift before larger changes.'
        : 'Turn optimization into a guided, low-risk sequence that prioritizes the clearest lift first.',
    route: params.route,
    ...policy,
    immediateActions: summarizeImmediateActions(phases),
    phases,
    handoffs: [
      'Use explain_recommendation on the first active recommendation before making broader changes.',
      'Hand off into Creator Light only after the primary optimization bottleneck is named.',
    ],
    operativeHandoffs: buildOptimizationOperativeHandoffs(params.route, report),
    actionPresets: buildOptimizationActionPresets(params.route, report),
    profileApplications: buildProfileApplications(params.route),
    upgradeSignal: params.route.recommendedTier === 'advanced'
      ? 'The scenario is starting to move beyond a lite optimization pass. Use Free for the first wins, then hand off to Advanced if deeper critique or workflow reduction is needed.'
      : null,
    recommendationReport: report,
  };
}

export function buildNewSiteLiteWizardPlan(params: {
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  const report = buildReport(params.assessment, params.context);
  const phases = buildNewSiteLitePhases(params.route, report);
  const policy = buildRuntimePolicy({
    kind: 'new-site-lite',
    route: params.route,
    context: params.context,
  });

  return {
    kind: 'new-site-lite',
    title: 'New Site Lite Wizard',
    summary: 'Turn a new-site starting point into a coherent first Elementor-based draft without overcomplicating the baseline.',
    route: params.route,
    ...policy,
    immediateActions: summarizeImmediateActions(phases),
    phases,
    handoffs: [
      'Use wizard_brand_setup to make the first site direction visible before larger build work starts.',
      'Use creator_mode to turn the new-site path into a first draft instead of staying in setup mode.',
    ],
    operativeHandoffs: buildNewSiteLiteOperativeHandoffs(params.route),
    actionPresets: buildNewSiteLiteActionPresets(params.route, report),
    profileApplications: buildProfileApplications(params.route),
    upgradeSignal: params.route.recommendedTier === 'advanced'
      ? 'The new-site path is already pushing beyond lite scope. Stabilize the first baseline in Free, then hand off to Advanced.'
      : null,
    recommendationReport: report,
  };
}

export function buildExtensionLiteWizardPlan(params: {
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  const report = buildReport(params.assessment, params.context);
  const phases = buildExtensionLitePhases(params.route, report);
  const policy = buildRuntimePolicy({
    kind: 'extension-lite',
    route: params.route,
    context: params.context,
  });

  return {
    kind: 'extension-lite',
    title: 'Extension Lite Wizard',
    summary: 'Add a new capability through a restrained, support-aware extension path instead of uncontrolled plugin or structure growth.',
    route: params.route,
    ...policy,
    immediateActions: summarizeImmediateActions(phases),
    phases,
    handoffs: [
      'Use explain_recommendation to name the first extension move clearly before building.',
      'Use Creator Light for the first extension draft and keep the boundary to Advanced explicit once rollout depth increases.',
    ],
    operativeHandoffs: buildExtensionOperativeHandoffs(params.route, report),
    actionPresets: buildExtensionActionPresets(params.route, report),
    profileApplications: buildProfileApplications(params.route),
    upgradeSignal: params.route.recommendedTier === 'advanced'
      ? 'This extension path is starting to require deeper rollout or workflow depth than Free should carry.'
      : null,
    recommendationReport: report,
  };
}

export function buildRelaunchLiteWizardPlan(params: {
  route: IntentWizardRoute;
  assessment: SiteAssessment | null;
  context: SiteContext | null;
}): FreeRuntimeWizardPlan {
  const report = buildReport(params.assessment, params.context);
  const phases = buildRelaunchLitePhases(params.route, report);
  const policy = buildRuntimePolicy({
    kind: 'relaunch-lite',
    route: params.route,
    context: params.context,
  });

  return {
    kind: 'relaunch-lite',
    title: 'Relaunch Lite Wizard',
    summary: 'Start relaunch work with preservation-aware diagnostics and visible early improvements before committing to deeper structural rollout.',
    route: params.route,
    ...policy,
    immediateActions: summarizeImmediateActions(phases),
    phases,
    handoffs: [
      'Save reusable sections or pages before changing structure so the current site stays recoverable.',
      'Treat Advanced as the next path when relaunch work moves into deeper structure, migration, or critique loops.',
    ],
    operativeHandoffs: buildRelaunchOperativeHandoffs(params.route, report),
    actionPresets: buildRelaunchActionPresets(params.route, report),
    profileApplications: buildProfileApplications(params.route),
    upgradeSignal: params.route.recommendedTier === 'advanced'
      ? 'This relaunch already leans beyond lite scope. Free should handle preservation, early uplift, and boundary-setting, then hand off to Advanced.'
      : null,
    recommendationReport: report,
  };
}
