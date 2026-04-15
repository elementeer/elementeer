import type {
  IntentWizardRoute,
  LayoutRiskSignal,
  ProjectEditingMode,
  ProjectProfile,
  RiskResolutionMode,
  SiteContext,
} from './client.js';

export type RuntimeScenarioKind =
  | 'stack-bootstrap'
  | 'new-site-lite'
  | 'optimization-lite'
  | 'extension-lite'
  | 'relaunch-lite'
  | 'advanced-scenario';

export function getDefaultProjectProfile(): ProjectProfile {
  return {
    editing_mode: 'draft-first',
    copy_density: 'balanced',
    layout_priority: 'balanced',
    change_style: 'adaptive',
    question_policy: 'ask-on-ambiguity',
    notes: null,
  };
}

export function resolveProjectProfile(context: SiteContext | null): ProjectProfile {
  return {
    ...getDefaultProjectProfile(),
    ...(context?.project_profile ?? {}),
  };
}

export function buildLayoutRiskSignals(params: {
  kind: RuntimeScenarioKind;
  route: IntentWizardRoute;
  profile: ProjectProfile;
}): LayoutRiskSignal[] {
  const { kind, route, profile } = params;
  const signals: LayoutRiskSignal[] = [];
  const denseCopy = profile.copy_density === 'complete';
  const layoutFirst = profile.layout_priority === 'preserve-existing-layout';

  if (kind === 'new-site-lite' || kind === 'stack-bootstrap' || route.intent === 'refresh') {
    signals.push({
      code: 'headline_wrap_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'hero-headlines-and-section-headings',
      reason: denseCopy
        ? 'The current profile prefers fuller copy, which raises the chance of long headline wraps inside existing hero geometry.'
        : 'Fresh headline and section copy can wrap early on narrower existing layouts.',
      suggested_handling: layoutFirst
        ? 'Keep headings shorter or split long statements into headline plus support copy.'
        : 'Review the existing hero geometry before keeping longer headline variants.',
    });
  }

  if (kind === 'optimization-lite' || kind === 'extension-lite' || route.intent === 'clean_up' || route.intent === 'optimization') {
    signals.push({
      code: 'card_density_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'benefit-cards-and-icon-boxes',
      reason: 'Optimization and extension work often pushes more copy into fixed-height card layouts.',
      suggested_handling: 'Prefer fewer stronger bullets or review card heights before keeping full copy.',
    });
  }

  if (kind === 'extension-lite' || kind === 'relaunch-lite' || route.intent === 'extension') {
    signals.push({
      code: 'package_card_overflow_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'pricing-and-package-cards',
      reason: 'Extension and relaunch paths often add package detail into narrow multi-column cards.',
      suggested_handling: 'Trim package bullets conservatively or move fuller detail into supporting copy below the cards.',
    });
  }

  if (kind === 'relaunch-lite' || kind === 'new-site-lite' || route.intent === 'relaunch') {
    signals.push({
      code: 'faq_block_density_risk',
      severity: denseCopy ? 'medium' : 'low',
      affected_surface: 'faq-accordion-and-long-form-explainer-blocks',
      reason: 'FAQ and explainer sections become visually heavy quickly when full copy is preserved by default.',
      suggested_handling: 'Keep the first pass to the strongest FAQs and expand only after a review pass.',
    });
  }

  if (kind !== 'stack-bootstrap') {
    signals.push({
      code: 'cta_spacing_review',
      severity: profile.change_style === 'transformative' ? 'medium' : 'low',
      affected_surface: 'cta-block-spacing-and-button-groups',
      reason: 'CTA blocks are sensitive to copy length, button count, and inherited spacing values.',
      suggested_handling: 'Always review CTA spacing and button wrapping after content replacement.',
    });
  }

  return signals;
}

export function deriveRiskResolutionMode(
  profile: ProjectProfile,
  signals: LayoutRiskSignal[],
): RiskResolutionMode {
  const hasMeaningfulRisk = signals.some(
    (signal) => signal.severity === 'medium' || signal.severity === 'high',
  );

  if (profile.question_policy === 'ask-on-ambiguity' && hasMeaningfulRisk) {
    return 'ask-before-apply';
  }

  if (profile.layout_priority === 'preserve-existing-layout') {
    return 'preserve-layout-first';
  }

  if (
    profile.layout_priority === 'preserve-copy-completeness'
    || profile.question_policy === 'prefer-complete-content'
  ) {
    return 'preserve-copy-first';
  }

  return 'conservative-default';
}

export function deriveApprovalMode(
  profile: ProjectProfile,
  signals: LayoutRiskSignal[],
): ProjectEditingMode {
  const hasHighRisk = signals.some((signal) => signal.severity === 'high');
  const hasMediumRisk = signals.some((signal) => signal.severity === 'medium');

  if (profile.editing_mode === 'approval-first') {
    return 'approval-first';
  }

  if (hasHighRisk) {
    return 'draft-first';
  }

  if (hasMediumRisk && profile.editing_mode === 'direct-edit') {
    return 'draft-first';
  }

  return profile.editing_mode;
}

export function buildAdvancedLayoutRiskSignals(params: {
  scenario: RuntimeScenarioKind | 'advanced-scenario';
  workflow:
    | 'deep-relaunch'
    | 'migration-rollout'
    | 'premium-page-rollout'
    | 'theme-builder-rollout'
    | 'critique-repair-loop';
  profile: ProjectProfile;
}): LayoutRiskSignal[] {
  const { workflow, profile } = params;
  const signals: LayoutRiskSignal[] = [];
  const denseCopy = profile.copy_density === 'complete';

  if (workflow === 'deep-relaunch' || workflow === 'migration-rollout') {
    signals.push({
      code: 'headline_wrap_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'hero-headlines-and-structural-entry-sections',
      reason: 'Relaunch and migration slices often carry fuller replacement copy into preserved layout geometry.',
      suggested_handling: 'Review headline length and support copy before broadening the slice.',
    });
    signals.push({
      code: 'cta_spacing_review',
      severity: 'medium',
      affected_surface: 'cta-block-spacing-after-structural-rollout',
      reason: 'Structural slices often preserve CTA geometry while changing copy density and section rhythm.',
      suggested_handling: 'Review CTA spacing after each bounded structural slice.',
    });
  }

  if (workflow === 'premium-page-rollout' || workflow === 'theme-builder-rollout') {
    signals.push({
      code: 'card_density_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'premium-starter-cards-and-feature-grids',
      reason: 'Curated starters can become visually dense when fuller custom copy is pushed into fixed cards.',
      suggested_handling: 'Prefer a first adaptation pass before keeping all replacement copy in dense premium sections.',
    });
  }

  if (workflow === 'premium-page-rollout') {
    signals.push({
      code: 'package_card_overflow_risk',
      severity: denseCopy ? 'high' : 'medium',
      affected_surface: 'pricing-and-package-sections',
      reason: 'Premium and conversion-oriented rollouts commonly hit overflow risk in pricing and package cards.',
      suggested_handling: 'Review package card length and break detail into supporting content when needed.',
    });
  }

  if (workflow === 'critique-repair-loop') {
    signals.push({
      code: 'faq_block_density_risk',
      severity: denseCopy ? 'medium' : 'low',
      affected_surface: 'faq-and-explainer-sections-under-repair',
      reason: 'Repair loops often add clarifying copy that can make FAQ or explainer sections too dense.',
      suggested_handling: 'Keep the first repair pass focused on the strongest fixes before expanding copy depth.',
    });
  }

  return signals;
}
