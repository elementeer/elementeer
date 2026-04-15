export type IntentWizardOrigin =
  | 'idea_only'
  | 'brand_without_site'
  | 'wordpress_without_elementor'
  | 'partial_stack'
  | 'existing_elementor_site'
  | 'unclear_needs_diagnosis';

export type IntentWizardIntent =
  | 'bootstrap'
  | 'clean_up'
  | 'refresh'
  | 'optimization'
  | 'extension'
  | 'reduction'
  | 'relaunch'
  | 'migration';

export type IntentWizardDepth = 'light' | 'moderate' | 'deep';

export type IntentWizardUserPosture = 'guided' | 'assisted' | 'technical';

export type IntentWizardTierRecommendation = 'free' | 'advanced';

export type IntentWizardScenarioId =
  | 'B1'
  | 'B2'
  | 'B3'
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'E5'
  | 'E6'
  | 'E7'
  | 'D1';

export type IntentWizardId =
  | 'intent-wizard'
  | 'stack-bootstrap-wizard'
  | 'brand-foundation-wizard'
  | 'new-site-lite-wizard'
  | 'cleanup-wizard'
  | 'refresh-wizard'
  | 'optimization-lite-wizard'
  | 'extension-lite-wizard'
  | 'reduction-wizard'
  | 'relaunch-lite-wizard'
  | 'deep-relaunch-wizard'
  | 'migration-wizard'
  | 'advanced-site-build-wizard';

export type StackProfileId =
  | 'fsp-1-minimal-guided-baseline'
  | 'fsp-2-curated-free-addon'
  | 'fsp-3-brownfield-staged-transition'
  | 'asp-1-advanced-productivity-baseline'
  | 'asp-2-advanced-premium-addon'
  | 'asp-3-deep-relaunch-migration';

export type SkillProfileId =
  | 'bootstrap-guided'
  | 'bootstrap-assisted'
  | 'bootstrap-technical'
  | 'new-site-guided'
  | 'new-site-assisted'
  | 'cleanup-guided'
  | 'cleanup-assisted'
  | 'refresh-guided'
  | 'optimization-guided'
  | 'optimization-assisted'
  | 'extension-guided'
  | 'extension-assisted'
  | 'reduction-guided'
  | 'relaunch-assisted'
  | 'relaunch-technical'
  | 'migration-assisted'
  | 'migration-technical'
  | 'diagnostic-guided'
  | 'diagnostic-technical'
  | 'advanced-site-build-assisted';

export type AddonProfileId =
  | 'none'
  | 'free-utility-widgets'
  | 'content-marketing-free'
  | 'conversion-free'
  | 'conversion-pro'
  | 'content-system-pro';

export type GuidanceMode = 'step_by_step' | 'branching' | 'direct_operator';

export interface StackReadinessSignals {
  wordpressPresent: boolean;
  elementorInstalled: boolean;
  elementorProInstalled: boolean;
  helloThemeInstalled: boolean | null;
  currentTheme: string | null;
  knownAddons: string[];
}

export interface IntentWizardInput {
  origin: IntentWizardOrigin;
  intent: IntentWizardIntent;
  depth: IntentWizardDepth;
  userPosture: IntentWizardUserPosture;
  preservationPriorities: string[];
  constraints: string[];
  stackReadiness: StackReadinessSignals;
}

export interface RecommendedStackProfile {
  id: StackProfileId;
  label: string;
  summary: string;
  baselineStack: string[];
  addonProfile: AddonProfileId;
  addonRationale: string;
  upgradePath: string[];
  supportConfidence: 'high' | 'medium';
}

export interface RecommendedSkillProfile {
  id: SkillProfileId;
  label: string;
  summary: string;
  explanationStyle: GuidanceMode;
  operatorControl: 'low' | 'medium' | 'high';
}

export interface RecommendedAddonProfile {
  id: AddonProfileId;
  label: string;
  summary: string;
  recommended: boolean;
  rationale: string;
  examples: string[];
}

export interface IntentWizardRoute {
  origin: IntentWizardOrigin;
  intent: IntentWizardIntent;
  depth: IntentWizardDepth;
  userPosture: IntentWizardUserPosture;
  scenarioId: IntentWizardScenarioId;
  scenarioLabel: string;
  recommendedWizard: IntentWizardId;
  recommendedTier: IntentWizardTierRecommendation;
  recommendedStackProfile: RecommendedStackProfile;
  recommendedSkillProfile: RecommendedSkillProfile;
  recommendedAddonProfile: RecommendedAddonProfile;
  guidanceMode: GuidanceMode;
  preservationPriorities: string[];
  constraints: string[];
  stackReadiness: StackReadinessSignals;
  rationale: string[];
  guardrails: string[];
  suggestedTools: string[];
  nextDecision: string;
}
