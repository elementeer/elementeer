import type { StoredKeyCapability } from './auth.js';

export interface SiteInfo {
  name: string;
  url: string;
  wp_version: string;
  elementor_version: string | null;
  elementor_pro: boolean;
  activation_mode: string;
  template_count: number;
  capabilities: StoredKeyCapability[];
}

export interface GlobalColor {
  id?: string;
  title: string;
  color: string;
}

export interface GlobalTypographyEntry {
  id?: string;
  title: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface GlobalStylesColorEntry {
  _id: string;
  title: string;
  color: string;
}

export interface GlobalStylesData {
  kit_id: number;
  system_colors: GlobalStylesColorEntry[];
  custom_colors: GlobalStylesColorEntry[];
  system_typography: unknown[];
  custom_typography: unknown[];
}

export type SiteContextRole =
  | 'freelancer'
  | 'agency'
  | 'site-owner'
  | 'ai-agent';

export type SiteContextPurpose =
  | 'ecommerce'
  | 'corporate'
  | 'portfolio'
  | 'blog'
  | 'community'
  | 'other';

export type ProjectEditingMode =
  | 'direct-edit'
  | 'draft-first'
  | 'approval-first';

export type ProjectCopyDensity =
  | 'compact'
  | 'balanced'
  | 'complete';

export type ProjectLayoutPriority =
  | 'preserve-existing-layout'
  | 'preserve-copy-completeness'
  | 'balanced';

export type ProjectChangeStyle =
  | 'minimal'
  | 'adaptive'
  | 'transformative';

export type ProjectQuestionPolicy =
  | 'ask-on-ambiguity'
  | 'choose-conservative-default'
  | 'prefer-complete-content';

export interface ProjectProfile {
  editing_mode: ProjectEditingMode;
  copy_density: ProjectCopyDensity;
  layout_priority: ProjectLayoutPriority;
  change_style: ProjectChangeStyle;
  question_policy: ProjectQuestionPolicy;
  notes: string | null;
}

export type LayoutRiskCode =
  | 'headline_wrap_risk'
  | 'card_density_risk'
  | 'package_card_overflow_risk'
  | 'cta_spacing_review'
  | 'faq_block_density_risk';

export type LayoutRiskSeverity = 'low' | 'medium' | 'high';

export interface LayoutRiskSignal {
  code: LayoutRiskCode;
  severity: LayoutRiskSeverity;
  affected_surface: string;
  reason: string;
  suggested_handling: string;
}

export type RiskResolutionMode =
  | 'ask-before-apply'
  | 'conservative-default'
  | 'preserve-layout-first'
  | 'preserve-copy-first';

export interface SiteContext {
  user_role: SiteContextRole | null;
  site_purpose: SiteContextPurpose | null;
  brand_notes: string | null;
  target_audience: string | null;
  primary_language: string | null;
  project_profile?: ProjectProfile | null;
  set_at: string | null;
}

export interface AssessmentIssue {
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  count?: number;
}

export interface ThemeBuilderTemplateSummary {
  id: number;
  title: string;
  status: string;
}

export interface SiteAssessment {
  assessed_at: string;
  wordpress: {
    version: string;
    language: string;
    timezone: string;
    is_multisite: boolean;
    site_name: string;
    site_tagline: string;
    admin_url: string;
  };
  elementor: {
    version: string | null;
    pro: boolean;
    pro_version: string | null;
    active_kit_id: number | null;
  };
  brand: {
    logo_set: boolean;
    logo_id: number | null;
    global_colors_count: number;
    global_typography_count: number;
  };
  theme_builder: Record<string, ThemeBuilderTemplateSummary[]>;
  template_library: {
    total: number;
    by_type: Record<string, number>;
    uncategorized: number;
    published: number;
    draft: number;
  };
  pages: {
    elementor_total: number;
    by_post_type: Record<string, number>;
  };
  performance: {
    css_print_method: string;
    optimized_dom: boolean;
    load_fa4_shim: boolean;
  };
  plugins: {
    active_count: number;
    classified: Record<string, string[]>;
    woocommerce: boolean;
    multilingual: boolean;
  };
  custom_post_types: Array<{ name: string; label: string; rest: boolean }>;
  user_roles: string[];
  issues: AssessmentIssue[];
  issues_count: { critical: number; warning: number; info: number };
}

export type RecommendationCategory =
  | 'brand'
  | 'structure'
  | 'library'
  | 'performance'
  | 'content'
  | 'seo'
  | 'woocommerce';

export interface Recommendation {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: RecommendationCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
  tools: string[];
  blocked_by: string[];
}

export type FingerprintCms = 'wordpress' | 'unknown';

export type FingerprintBuilder =
  | 'elementor'
  | 'wordpress-theme'
  | 'mixed'
  | 'unknown';

export interface SiteFingerprintSignal {
  key: string;
  label: string;
  detected: boolean;
  confidence: number;
  evidence: string;
}

export interface SiteFingerprint {
  cms: FingerprintCms;
  builder: FingerprintBuilder;
  elementorDetected: boolean;
  elementorPro: boolean;
  ecommerceDetected: boolean;
  multilingualDetected: boolean;
  themeBuilderCoverage: number;
  elementorPageCount: number;
  confidence: number;
  signals: SiteFingerprintSignal[];
  notes: string[];
}

export type DestinationProfileKind =
  | 'unknown'
  | 'elementor-free'
  | 'elementor-pro'
  | 'plugin-assisted-elementor';

export interface DestinationProfile {
  kind: DestinationProfileKind;
  label: string;
  elementorDetected: boolean;
  elementorPro: boolean;
  activePluginCategories: string[];
  notes: string[];
}

export type CapabilityId =
  | 'global-styles'
  | 'page-composition'
  | 'theme-builder'
  | 'woocommerce-templates'
  | 'multilingual-workflows'
  | 'change-review';

export interface Capability {
  id: CapabilityId;
  available: boolean;
  source: 'core' | 'elementor-free' | 'elementor-pro' | 'plugin-assisted' | 'unknown';
  notes: string[];
}

export interface CapabilityMatrix {
  destination: DestinationProfile;
  capabilities: Capability[];
  compatibilitySummary: string;
  warnings: string[];
}

export interface RecommendationEngineInput {
  assessment: SiteAssessment;
  context: SiteContext;
  fingerprint: SiteFingerprint;
  capabilityMatrix: CapabilityMatrix;
  validationWarnings?: string[];
}

export interface RecommendationEngineReport {
  destination: DestinationProfile;
  compatibilitySummary: string;
  capabilityWarnings: string[];
  recommendations: Recommendation[];
}

export type DesignTokenSource =
  | 'system-color'
  | 'custom-color'
  | 'system-typography'
  | 'custom-typography'
  | 'heuristic';

export interface DesignColorToken {
  id: string;
  title: string;
  value: string;
  source: Extract<DesignTokenSource, 'system-color' | 'custom-color'>;
}

export interface DesignTypographyToken {
  id: string;
  title: string;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: string | null;
  lineHeight: number | null;
  source: Extract<DesignTokenSource, 'system-typography' | 'custom-typography'>;
}

export interface DesignSpacingToken {
  id: string;
  label: string;
  pixels: number;
  source: 'heuristic';
  reason: string;
}

export interface DesignValueHint {
  id: string;
  label: string;
  value: string;
  source: 'heuristic';
  reason: string;
}

export interface DesignTokenReport {
  colors: DesignColorToken[];
  typography: DesignTypographyToken[];
  spacing: DesignSpacingToken[];
  radiusHints: DesignValueHint[];
  shadowHints: DesignValueHint[];
  notes: string[];
}

export type RebuildStrategyId =
  | 'brand-foundation-first'
  | 'destination-first'
  | 'theme-builder-first'
  | 'content-expansion-first';

export interface RebuildStrategy {
  strategyId: RebuildStrategyId;
  label: string;
  summary: string;
  rationale: string[];
  orderedSteps: string[];
  requiredCapabilities: CapabilityId[];
  fallbackStrategies: string[];
}

export interface StrategyCritique {
  verdict: 'solid' | 'caution' | 'blocked';
  summary: string;
  concerns: string[];
  suggestedAdjustments: string[];
}

export type ControlIntent =
  | 'rebuild-close-to-source'
  | 'rebuild-with-minimal-plugins'
  | 'optimize-for-existing-destination'
  | 'adapt-to-brand';

export interface PipelinePathPlan {
  intent: ControlIntent;
  label: string;
  summary: string;
  suggestedTools: string[];
  rationale: string[];
  gates: string[];
}

export type ImportSmokeTestReadiness =
  | 'ready-for-manual-smoke'
  | 'needs-environment'
  | 'blocked';

export interface ImportSmokeTestPlan {
  readiness: ImportSmokeTestReadiness;
  environmentTargets: string[];
  preparedHooks: string[];
  checklist: string[];
}

export interface BrandAdaptationPlan {
  targetBrandSummary: string;
  tokenAnchors: string[];
  suggestedActions: string[];
  guardrails: string[];
}

export interface OutputCritique {
  verdict: 'solid' | 'caution' | 'blocked';
  summary: string;
  concerns: string[];
  repairSteps: string[];
  validationBasis: string[];
}

export type ImportValidationResult = 'pass' | 'warn' | 'fail';

export interface ImportReport {
  sourceType: 'template' | 'page' | 'raw';
  sourceRef: string;
  templateMetadata: {
    title: string | null;
    topLevelCount: number;
    widgetCount: number;
  };
  validationResult: ImportValidationResult;
  warnings: string[];
  structuralNotes: string[];
  nextStepHints: string[];
  automatedCoverage: 'structural-only';
  smokeTestPlan: ImportSmokeTestPlan;
}

export interface QueuedChange {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  operation: string;
  params: Record<string, unknown>;
  note: string | null;
  before_state: Record<string, unknown> | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_at: string | null;
}
