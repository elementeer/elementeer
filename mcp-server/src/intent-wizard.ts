import type {
  AddonProfileId,
  IntentWizardInput,
  IntentWizardIntent,
  IntentWizardOrigin,
  IntentWizardRoute,
  IntentWizardScenarioId,
  IntentWizardTierRecommendation,
  RecommendedAddonProfile,
  RecommendedSkillProfile,
  RecommendedStackProfile,
  SiteAssessment,
  SiteInfo,
  StackReadinessSignals,
} from './client.js';

export function deriveStackReadinessSignals(
  siteInfo: SiteInfo | null,
  assessment: SiteAssessment | null,
  overrides: Partial<StackReadinessSignals> = {},
): StackReadinessSignals {
  const knownAddons = new Set<string>();

  if (assessment) {
    for (const [category, slugs] of Object.entries(assessment.plugins.classified ?? {})) {
      if (slugs.length > 0) {
        knownAddons.add(category);
      }
    }
  }

  return {
    wordpressPresent: overrides.wordpressPresent ?? Boolean(siteInfo || assessment),
    elementorInstalled: overrides.elementorInstalled ?? Boolean(siteInfo?.elementor_version ?? assessment?.elementor.version),
    elementorProInstalled: overrides.elementorProInstalled ?? Boolean(siteInfo?.elementor_pro ?? assessment?.elementor.pro),
    helloThemeInstalled: overrides.helloThemeInstalled ?? null,
    currentTheme: overrides.currentTheme ?? null,
    knownAddons: overrides.knownAddons ?? [...knownAddons],
  };
}

function resolveScenarioId(origin: IntentWizardOrigin, intent: IntentWizardIntent): IntentWizardScenarioId {
  if (origin === 'idea_only' || origin === 'brand_without_site') {
    return 'B1';
  }

  if (origin === 'wordpress_without_elementor') {
    return 'B2';
  }

  if (origin === 'partial_stack' && intent === 'bootstrap') {
    return 'B3';
  }

  if (origin === 'unclear_needs_diagnosis') {
    return 'D1';
  }

  switch (intent) {
    case 'clean_up':
      return 'E1';
    case 'refresh':
      return 'E2';
    case 'optimization':
      return 'E3';
    case 'extension':
      return 'E4';
    case 'reduction':
      return 'E5';
    case 'relaunch':
      return 'E6';
    case 'migration':
      return 'E7';
    case 'bootstrap':
    default:
      return 'B3';
  }
}

function resolveScenarioLabel(scenarioId: IntentWizardScenarioId): string {
  const labels: Record<IntentWizardScenarioId, string> = {
    B1: 'Bootstrap from idea or brand',
    B2: 'Bootstrap from existing WordPress without Elementor',
    B3: 'Stack completion',
    E1: 'Clean-up',
    E2: 'Refresh',
    E3: 'Optimization',
    E4: 'Extension',
    E5: 'Reduction',
    E6: 'Relaunch',
    E7: 'Migration',
    D1: 'Guided diagnosis',
  };

  return labels[scenarioId];
}

function resolveRecommendedTier(input: IntentWizardInput): IntentWizardTierRecommendation {
  if (input.depth === 'deep') {
    return 'advanced';
  }

  if (input.intent === 'migration' || input.intent === 'relaunch') {
    return input.depth === 'light' ? 'free' : 'advanced';
  }

  if (
    input.origin === 'partial_stack'
    && input.intent === 'bootstrap'
    && input.stackReadiness.elementorInstalled
    && !input.constraints.includes('free_only')
  ) {
    return input.depth === 'moderate' ? 'advanced' : 'free';
  }

  return 'free';
}

function resolveRecommendedWizard(input: IntentWizardInput, tier: IntentWizardTierRecommendation): IntentWizardRoute['recommendedWizard'] {
  if (input.origin === 'idea_only') {
    return 'new-site-lite-wizard';
  }

  if (input.origin === 'brand_without_site') {
    return 'new-site-lite-wizard';
  }

  if (input.origin === 'wordpress_without_elementor' || (input.origin === 'partial_stack' && input.intent === 'bootstrap')) {
    return 'stack-bootstrap-wizard';
  }

  if (input.origin === 'unclear_needs_diagnosis') {
    return 'intent-wizard';
  }

  if (input.intent === 'relaunch') {
    return tier === 'advanced' ? 'deep-relaunch-wizard' : 'relaunch-lite-wizard';
  }

  if (input.intent === 'migration') {
    return 'migration-wizard';
  }

  if (input.intent === 'clean_up') {
    return 'optimization-lite-wizard';
  }

  if (input.intent === 'refresh') {
    return 'optimization-lite-wizard';
  }

  if (input.intent === 'optimization') {
    return 'optimization-lite-wizard';
  }

  if (input.intent === 'extension') {
    return 'extension-lite-wizard';
  }

  if (input.intent === 'reduction') {
    return 'reduction-wizard';
  }

  return tier === 'advanced' ? 'advanced-site-build-wizard' : 'new-site-lite-wizard';
}

function resolveStackProfile(input: IntentWizardInput, tier: IntentWizardTierRecommendation): RecommendedStackProfile {
  const wantsNoThemeChange = input.constraints.includes('must_avoid_theme_change');
  const wantsFewPlugins = input.constraints.includes('must_avoid_plugin_growth');

  if (tier === 'advanced' && (input.intent === 'relaunch' || input.intent === 'migration' || input.depth === 'deep')) {
    return {
      id: 'asp-3-deep-relaunch-migration',
      label: 'Advanced deep relaunch / migration profile',
      summary: 'Keep current site context visible while using a deeper rebuild, critique, and rollout layer.',
      baselineStack: [
        'WordPress',
        input.stackReadiness.elementorInstalled ? 'Current Elementor baseline' : 'Elementor Free or Pro (scenario-fit)',
        wantsNoThemeChange ? 'Retained compatible theme baseline' : 'Hello Theme or retained compatible baseline',
        'Elementify Advanced',
      ],
      addonProfile: 'content-system-pro',
      addonRationale: 'Deeper relaunch and migration work benefits from a curated, support-aware premium addon profile only when the structure demands it.',
      upgradePath: ['Elementor Pro when Theme Builder or richer structure control is required'],
      supportConfidence: 'medium',
    };
  }

  if (tier === 'advanced') {
    return {
      id: wantsFewPlugins ? 'asp-1-advanced-productivity-baseline' : 'asp-2-advanced-premium-addon',
      label: wantsFewPlugins
        ? 'Advanced productivity baseline'
        : 'Advanced with curated premium addon profile',
      summary: wantsFewPlugins
        ? 'Use Advanced for workflow depth before adding more plugins.'
        : 'Use Advanced plus one curated premium addon profile when it materially reduces friction.',
      baselineStack: [
        'WordPress',
        wantsNoThemeChange ? 'Retained compatible theme baseline' : 'Hello Theme',
        input.stackReadiness.elementorProInstalled ? 'Elementor Pro' : 'Elementor Free or Pro (scenario-fit)',
        'Elementify Advanced',
      ],
      addonProfile: wantsFewPlugins ? 'none' : 'conversion-pro',
      addonRationale: wantsFewPlugins
        ? 'The scenario benefits more from better workflow reduction than from early plugin stacking.'
        : 'A curated premium addon profile is justified when the scenario needs stronger components or rollout support.',
      upgradePath: input.stackReadiness.elementorProInstalled ? ['Keep plugin growth restrained and route deeper work through Advanced workflows'] : ['Consider Elementor Pro for stronger structure control'],
      supportConfidence: wantsFewPlugins ? 'high' : 'medium',
    };
  }

  if (input.origin === 'wordpress_without_elementor') {
    return {
      id: 'fsp-3-brownfield-staged-transition',
      label: 'Brownfield staged transition baseline',
      summary: 'Assess the current WordPress setup, introduce Elementor carefully, and treat theme replacement as a decision instead of a default.',
      baselineStack: [
        'Current WordPress site',
        'Current theme assessed before replacement',
        'Elementor Free',
        wantsNoThemeChange ? 'Retained theme baseline (if compatible)' : 'Hello Theme considered when appropriate',
      ],
      addonProfile: 'none',
      addonRationale: 'Start with the cleanest staged transition before adding addon complexity.',
      upgradePath: ['Elementify Advanced only if the migration or relaunch path becomes deeper than a staged transition'],
      supportConfidence: 'high',
    };
  }

  if (
    (input.origin === 'partial_stack' || input.origin === 'existing_elementor_site')
    && input.intent === 'extension'
    && !wantsFewPlugins
  ) {
    return {
      id: 'fsp-2-curated-free-addon',
      label: 'Baseline plus curated free addon profile',
      summary: 'Keep the core stack simple and add one support-aware free addon profile only when the scenario truly benefits.',
      baselineStack: [
        'WordPress',
        wantsNoThemeChange ? 'Retained compatible theme baseline' : 'Hello Theme',
        'Elementor Free',
      ],
      addonProfile: input.intent === 'extension' ? 'content-marketing-free' : 'free-utility-widgets',
      addonRationale: 'A single curated free addon profile can reduce friction for the specific extension scenario without turning guidance into plugin inflation.',
      upgradePath: ['Stay on Free while the scenario remains light and local-library-first'],
      supportConfidence: 'medium',
    };
  }

  return {
    id: 'fsp-1-minimal-guided-baseline',
    label: 'Minimal guided baseline',
    summary: 'The clearest safe starting point for guided Free workflows.',
    baselineStack: [
      'WordPress',
      wantsNoThemeChange && input.stackReadiness.currentTheme
        ? `Retain current theme for now (${input.stackReadiness.currentTheme})`
        : 'Hello Theme',
      'Elementor Free',
    ],
    addonProfile: 'none',
    addonRationale: 'The best default is often no addon profile until the baseline is working and the scenario clearly benefits from more.',
    upgradePath: ['Move to a curated free addon profile only if the scenario shows a clear, support-aware gap'],
    supportConfidence: 'high',
  };
}

function resolveSkillProfile(input: IntentWizardInput, tier: IntentWizardTierRecommendation): RecommendedSkillProfile {
  if (input.origin === 'unclear_needs_diagnosis') {
    return input.userPosture === 'technical'
      ? {
          id: 'diagnostic-technical',
          label: 'Diagnostic technical',
          summary: 'Direct diagnostic route with explicit branching and less hand-holding.',
          explanationStyle: 'direct_operator',
          operatorControl: 'high',
        }
      : {
          id: 'diagnostic-guided',
          label: 'Diagnostic guided',
          summary: 'Step-by-step diagnosis for users who are still clarifying what kind of intervention is needed.',
          explanationStyle: 'step_by_step',
          operatorControl: 'low',
        };
  }

  if (input.intent === 'bootstrap') {
    const profileId =
      input.userPosture === 'technical'
        ? 'bootstrap-technical'
        : input.userPosture === 'assisted'
          ? 'bootstrap-assisted'
          : 'bootstrap-guided';

    return {
      id: profileId,
      label: profileId.replace(/-/g, ' '),
      summary: 'Bootstrap the right starting stack with posture-aware guidance and a conservative recommendation style.',
      explanationStyle:
        input.userPosture === 'technical'
          ? 'direct_operator'
          : input.userPosture === 'assisted'
            ? 'branching'
            : 'step_by_step',
      operatorControl:
        input.userPosture === 'technical' ? 'high' : input.userPosture === 'assisted' ? 'medium' : 'low',
    };
  }

  if (input.intent === 'relaunch') {
    return {
      id: tier === 'advanced' || input.userPosture === 'technical'
        ? 'relaunch-technical'
        : 'relaunch-assisted',
      label: tier === 'advanced' || input.userPosture === 'technical'
        ? 'relaunch technical'
        : 'relaunch assisted',
      summary: 'Route relaunch work through a stronger multi-step path with clearer guardrails and preservation constraints.',
      explanationStyle: input.userPosture === 'guided' ? 'branching' : 'direct_operator',
      operatorControl: input.userPosture === 'guided' ? 'medium' : 'high',
    };
  }

  if (input.intent === 'migration') {
    return {
      id: input.userPosture === 'technical' ? 'migration-technical' : 'migration-assisted',
      label: input.userPosture === 'technical' ? 'migration technical' : 'migration assisted',
      summary: 'Handle migration as a structured staged path rather than a one-shot conversion.',
      explanationStyle: input.userPosture === 'technical' ? 'direct_operator' : 'branching',
      operatorControl: input.userPosture === 'technical' ? 'high' : 'medium',
    };
  }

  const simpleProfiles: Record<Exclude<IntentWizardIntent, 'bootstrap' | 'relaunch' | 'migration'>, RecommendedSkillProfile> = {
    clean_up: {
      id: input.userPosture === 'assisted' ? 'cleanup-assisted' : 'cleanup-guided',
      label: input.userPosture === 'assisted' ? 'cleanup assisted' : 'cleanup guided',
      summary: 'Make cleanup work concrete and confidence-building rather than abstract.',
      explanationStyle: input.userPosture === 'assisted' ? 'branching' : 'step_by_step',
      operatorControl: input.userPosture === 'assisted' ? 'medium' : 'low',
    },
    refresh: {
      id: 'refresh-guided',
      label: 'refresh guided',
      summary: 'Modernize presentation without forcing a deep rebuild posture.',
      explanationStyle: input.userPosture === 'technical' ? 'branching' : 'step_by_step',
      operatorControl: input.userPosture === 'technical' ? 'medium' : 'low',
    },
    optimization: {
      id: input.userPosture === 'guided' ? 'optimization-guided' : 'optimization-assisted',
      label: input.userPosture === 'guided' ? 'optimization guided' : 'optimization assisted',
      summary: 'Tie optimization to practical guidance instead of vague advice.',
      explanationStyle: input.userPosture === 'guided' ? 'step_by_step' : 'branching',
      operatorControl: input.userPosture === 'guided' ? 'low' : 'medium',
    },
    extension: {
      id: input.userPosture === 'guided' ? 'extension-guided' : 'extension-assisted',
      label: input.userPosture === 'guided' ? 'extension guided' : 'extension assisted',
      summary: 'Add new features or sections through restrained, scenario-fit rollout.',
      explanationStyle: input.userPosture === 'guided' ? 'step_by_step' : 'branching',
      operatorControl: input.userPosture === 'guided' ? 'low' : 'medium',
    },
    reduction: {
      id: 'reduction-guided',
      label: 'reduction guided',
      summary: 'Simplify the site with clear guardrails and preservation priorities.',
      explanationStyle: input.userPosture === 'technical' ? 'branching' : 'step_by_step',
      operatorControl: input.userPosture === 'technical' ? 'medium' : 'low',
    },
  };

  return simpleProfiles[input.intent as keyof typeof simpleProfiles];
}

function resolveAddonProfile(id: AddonProfileId, scenarioSummary: string): RecommendedAddonProfile {
  const profiles: Record<AddonProfileId, RecommendedAddonProfile> = {
    none: {
      id: 'none',
      label: 'No addon profile',
      summary: 'Keep the baseline stack simple and prove the path before adding more moving parts.',
      recommended: false,
      rationale: 'The baseline stack already supports the current scenario well enough.',
      examples: [],
    },
    'free-utility-widgets': {
      id: 'free-utility-widgets',
      label: 'Free utility widgets',
      summary: 'A restrained free addon profile for a few high-value utility widgets.',
      recommended: true,
      rationale: `${scenarioSummary} benefits from a few richer building blocks without pushing the user into plugin sprawl.`,
      examples: ['Essential Addons Free', 'one well-supported free widget bundle'],
    },
    'content-marketing-free': {
      id: 'content-marketing-free',
      label: 'Content marketing free',
      summary: 'A curated free addon profile for blog, magazine, or content-heavy extensions.',
      recommended: true,
      rationale: `${scenarioSummary} needs content-system help more than broad plugin growth.`,
      examples: ['one free content-oriented addon profile', 'blog or magazine-oriented widget support'],
    },
    'conversion-free': {
      id: 'conversion-free',
      label: 'Conversion free',
      summary: 'A free addon profile for light conversion-oriented enhancements.',
      recommended: true,
      rationale: `${scenarioSummary} would benefit from clearer conversion building blocks while still staying in a lightweight stack.`,
      examples: ['free CTA and social-proof widgets'],
    },
    'conversion-pro': {
      id: 'conversion-pro',
      label: 'Conversion pro',
      summary: 'A premium addon profile for stronger conversion and landing-page workflows.',
      recommended: true,
      rationale: `${scenarioSummary} justifies a curated premium addon path because workflow reduction and structural depth matter.`,
      examples: ['one curated supported pro addon profile'],
    },
    'content-system-pro': {
      id: 'content-system-pro',
      label: 'Content system pro',
      summary: 'A premium addon profile for deeper relaunch, migration, or content-system rollout work.',
      recommended: true,
      rationale: `${scenarioSummary} goes beyond a simple baseline and benefits from a stronger support-aware premium profile.`,
      examples: ['one curated supported pro addon profile for deeper rollout work'],
    },
  };

  return profiles[id];
}

function buildSuggestedTools(route: {
  recommendedWizard: IntentWizardRoute['recommendedWizard'];
  recommendedTier: IntentWizardTierRecommendation;
  intent: IntentWizardIntent;
  origin: IntentWizardOrigin;
}): string[] {
  const tools = ['assess_site', 'get_site_info', 'get_recommendations'];

  if (route.origin === 'idea_only' || route.origin === 'brand_without_site') {
    tools.push('wizard_new_site_lite', 'wizard_brand_setup', 'creator_mode');
  }

  if (route.origin === 'wordpress_without_elementor' || route.origin === 'partial_stack') {
    tools.push('get_destination_capabilities', 'get_site_fingerprint');
  }

  if (route.intent === 'bootstrap') {
    tools.push('validate_elementor_write');
  }

  if (route.intent === 'optimization' || route.intent === 'clean_up' || route.intent === 'refresh') {
    tools.push('wizard_optimization_lite', 'explain_recommendation');
  }

  if (route.intent === 'extension') {
    tools.push('wizard_extension_lite', 'explain_recommendation');
  }

  if (route.recommendedTier === 'advanced') {
    tools.push('get_advanced_recommendations');
  }

  return [...new Set(tools)];
}

export function routeIntentWizard(input: IntentWizardInput): IntentWizardRoute {
  const scenarioId = resolveScenarioId(input.origin, input.intent);
  const recommendedTier = resolveRecommendedTier(input);
  const recommendedWizard = resolveRecommendedWizard(input, recommendedTier);
  const recommendedStackProfile = resolveStackProfile(input, recommendedTier);
  const recommendedSkillProfile = resolveSkillProfile(input, recommendedTier);
  const recommendedAddonProfile = resolveAddonProfile(
    recommendedStackProfile.addonProfile,
    resolveScenarioLabel(scenarioId),
  );

  const guidanceMode = recommendedSkillProfile.explanationStyle;
  const rationale: string[] = [
    `${resolveScenarioLabel(scenarioId)} is the closest fit for the reported starting point and goal.`,
    recommendedTier === 'free'
      ? 'The current scope can be moved forward credibly through the Free baseline without forcing an early paid upgrade.'
      : 'The requested depth or workflow complexity justifies the deeper Advanced path.',
    recommendedStackProfile.addonRationale,
  ];

  if (!input.stackReadiness.elementorInstalled) {
    rationale.push('Elementor is not currently installed or confirmed, so the route starts with stack bootstrap rather than assuming an existing builder setup.');
  }

  if (input.constraints.includes('free_only')) {
    rationale.push('The route honors the free_only constraint and avoids recommending paid upgrades as defaults.');
  }

  const guardrails = [
    'Do not recommend paid upgrades unless the scenario clearly justifies them.',
    'Do not treat more plugins as better by default.',
    'Do not assume Hello Theme must replace the current theme without checking constraints.',
  ];

  if (!input.stackReadiness.elementorInstalled) {
    guardrails.push('Do not assume Elementor is already installed.');
  }

  if (input.constraints.includes('must_avoid_theme_change')) {
    guardrails.push('Do not replace the current theme baseline unless the user explicitly accepts that tradeoff.');
  }

  const nextDecisionMap: Record<IntentWizardScenarioId, string> = {
    B1: 'Confirm the smallest sensible starting stack and whether a brand foundation step should come before the first page build.',
    B2: 'Decide whether Elementor should be introduced conservatively on the current theme or paired with a safer baseline change.',
    B3: 'Decide whether the current partial stack is already enough or should be completed with one curated supported layer.',
    E1: 'Choose the first cleanup target so the site gets visibly simpler without risking important live content.',
    E2: 'Choose whether the refresh should stay presentation-first or also stabilize brand and structure.',
    E3: 'Choose which optimization bottleneck matters first: clarity, conversion, or operational hygiene.',
    E4: 'Decide the narrowest extension that creates value without turning into uncontrolled plugin growth.',
    E5: 'Choose what should be removed first so simplification is visible and low-risk.',
    E6: 'Decide which parts must be preserved before deeper relaunch work starts.',
    E7: 'Choose the lowest-risk migration boundary before touching broader structure.',
    D1: 'Clarify whether this is closer to bootstrap, optimization, extension, or relaunch before committing to a deeper path.',
  };

  return {
    origin: input.origin,
    intent: input.intent,
    depth: input.depth,
    userPosture: input.userPosture,
    scenarioId,
    scenarioLabel: resolveScenarioLabel(scenarioId),
    recommendedWizard,
    recommendedTier,
    recommendedStackProfile,
    recommendedSkillProfile,
    recommendedAddonProfile,
    guidanceMode,
    preservationPriorities: input.preservationPriorities,
    constraints: input.constraints,
    stackReadiness: input.stackReadiness,
    rationale,
    guardrails,
    suggestedTools: buildSuggestedTools({
      recommendedWizard,
      recommendedTier,
      intent: input.intent,
      origin: input.origin,
    }),
    nextDecision: nextDecisionMap[scenarioId],
  };
}
