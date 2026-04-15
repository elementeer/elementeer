/**
 * Type-level and runtime tests for shared types.
 * Verifies that type values are consistent and exhaustive.
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_KEY_CAPABILITIES,
  KEY_CAPABILITIES,
  LEGACY_KEY_CAPABILITIES,
  LEGACY_KEY_CAPABILITY_ALIASES,
  normalizeStoredCapabilities,
} from '../index.js';
import type {
  AssessmentIssue,
  GlobalColor,
  GlobalStylesData,
  GlobalTypographyEntry,
  ElementifyErrorCode,
  ElementifyError,
  ActivationMode,
  GovernanceSettings,
  ElementifyTemplate,
  ElementifyTemplateList,
  CapabilityMatrix,
  DesignTokenReport,
  DestinationProfile,
  BrandAdaptationPlan,
  ImportReport,
  ImportSmokeTestPlan,
  LibraryBoundaryReport,
  LibraryProviderDescriptor,
  PremiumLibraryUsagePlan,
  PremiumLibraryAssetSummary,
  PremiumLibraryAssetDetail,
  PremiumLibraryCatalogReport,
  PremiumLibraryInspectionReport,
  OutputCritique,
  PipelinePathPlan,
  RebuildStrategy,
  SiteFingerprint,
  StrategyCritique,
  QueuedChange,
  Recommendation,
  RecommendationEngineInput,
  RecommendationEngineReport,
  SiteConfig,
  ElementifyConfig,
  SiteAssessment,
  SiteContext,
  SiteInfo,
  ProductSurfaceAssignment,
  ProductSurfaceKind,
  ProductEntitlement,
  ProductTierProfile,
  ProductTier,
  ProductVisibility,
  ProjectProfile,
  LayoutRiskSignal,
  RiskResolutionMode,
  TierBoundaryCase,
} from '../index.js';

// ------------------------------------------------------------------ //
// Runtime values derived from the type system
// ------------------------------------------------------------------ //

const ACTIVATION_MODES: ActivationMode[] = [
  'standalone-free',
  'standalone-pro',
  'vamerli-embedded',
  'vamerli-agency',
];

const PRODUCT_TIERS: ProductTier[] = [
  'free',
  'advanced',
  'studio_future',
];

const PRODUCT_VISIBILITIES: ProductVisibility[] = [
  'public',
  'private',
  'future',
];

const PRODUCT_SURFACE_KINDS: ProductSurfaceKind[] = [
  'tool',
  'workflow',
  'provider',
  'asset',
  'contract',
];

const PRODUCT_ENTITLEMENTS: ProductEntitlement[] = [
  'site-intelligence',
  'local-library',
  'simple-assembly',
  'brand-setup',
  'advanced-creation',
  'theme-builder-workflows',
  'governed-changes',
  'premium-library',
  'brand-adaptation',
  'ai-critique',
  'studio-orchestration',
  'cloud-library',
];

const RISK_RESOLUTION_MODES: RiskResolutionMode[] = [
  'ask-before-apply',
  'conservative-default',
  'preserve-layout-first',
  'preserve-copy-first',
];

const ERROR_CODES: ElementifyErrorCode[] = [
  'auth_invalid_key',
  'auth_key_inactive',
  'auth_insufficient_scope',
  'governance_blocked',
  'not_found',
  'elementor_not_active',
  'template_type_unsupported',
  'rate_limited',
];

// ------------------------------------------------------------------ //
// Tests
// ------------------------------------------------------------------ //

describe('KeyCapability', () => {
  it('all capability values are non-empty strings', () => {
    for (const cap of KEY_CAPABILITIES) {
      expect(typeof cap).toBe('string');
      expect(cap.length).toBeGreaterThan(0);
    }
  });

  it('all capabilities follow namespace:action format', () => {
    for (const cap of KEY_CAPABILITIES) {
      expect(cap).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });

  it('contains exactly 27 canonical domain capabilities', () => {
    expect(KEY_CAPABILITIES).toHaveLength(27);
    expect(KEY_CAPABILITIES).toEqual(DOMAIN_KEY_CAPABILITIES);
  });

  it('has no duplicate values', () => {
    const unique = new Set(KEY_CAPABILITIES);
    expect(unique.size).toBe(KEY_CAPABILITIES.length);
  });

  it('includes the new domain-oriented capability families', () => {
    expect(KEY_CAPABILITIES).toContain('site-audit:read');
    expect(KEY_CAPABILITIES).toContain('stack-bootstrap:prepare');
    expect(KEY_CAPABILITIES).toContain('content-structure:write');
    expect(KEY_CAPABILITIES).toContain('theme-structure:write');
    expect(KEY_CAPABILITIES).toContain('governance:apply');
    expect(KEY_CAPABILITIES).toContain('workflow-orchestration:prepare');
  });

  it('keeps legacy capabilities as transitional aliases', () => {
    expect(LEGACY_KEY_CAPABILITIES).toContain('templates:read');
    expect(LEGACY_KEY_CAPABILITY_ALIASES['templates:read']).toEqual(['content-structure:read']);
    expect(LEGACY_KEY_CAPABILITY_ALIASES['site:read']).toEqual(['site-audit:read']);
    expect(LEGACY_KEY_CAPABILITY_ALIASES['theme-builder:write']).toEqual(['theme-structure:write']);
  });

  it('normalizes legacy stored capabilities into canonical domains', () => {
    expect(
      normalizeStoredCapabilities(['templates:read', 'pages:write', 'site:read']),
    ).toEqual(['content-structure:read', 'content-structure:write', 'site-audit:read']);
  });

  it('auth_insufficient_scope is separate from auth_invalid_key', () => {
    // This is the critical Respira distinction
    expect(ERROR_CODES).toContain('auth_insufficient_scope');
    expect(ERROR_CODES).toContain('auth_invalid_key');
    const insufficientIdx = ERROR_CODES.indexOf('auth_insufficient_scope');
    const invalidIdx = ERROR_CODES.indexOf('auth_invalid_key');
    expect(insufficientIdx).not.toBe(invalidIdx);
  });
});

describe('ActivationMode', () => {
  it('all mode values are non-empty strings', () => {
    for (const mode of ACTIVATION_MODES) {
      expect(typeof mode).toBe('string');
      expect(mode.length).toBeGreaterThan(0);
    }
  });

  it('contains exactly 4 modes', () => {
    expect(ACTIVATION_MODES).toHaveLength(4);
  });

  it('has no duplicate values', () => {
    const unique = new Set(ACTIVATION_MODES);
    expect(unique.size).toBe(ACTIVATION_MODES.length);
  });

  it('includes standalone-free as lowest tier', () => {
    expect(ACTIVATION_MODES).toContain('standalone-free');
  });

  it('includes vamerli-agency as highest tier', () => {
    expect(ACTIVATION_MODES).toContain('vamerli-agency');
  });
});

describe('Product tier contracts', () => {
  it('product tiers are explicit and non-empty', () => {
    expect(PRODUCT_TIERS).toEqual(['free', 'advanced', 'studio_future']);
  });

  it('product visibilities are explicit and non-empty', () => {
    expect(PRODUCT_VISIBILITIES).toEqual(['public', 'private', 'future']);
  });

  it('product surface kinds cover operational mapping needs', () => {
    expect(PRODUCT_SURFACE_KINDS).toContain('tool');
    expect(PRODUCT_SURFACE_KINDS).toContain('workflow');
    expect(PRODUCT_SURFACE_KINDS).toContain('provider');
  });

  it('product entitlements cover free, advanced, and studio seams', () => {
    expect(PRODUCT_ENTITLEMENTS).toContain('site-intelligence');
    expect(PRODUCT_ENTITLEMENTS).toContain('premium-library');
    expect(PRODUCT_ENTITLEMENTS).toContain('cloud-library');
  });
});

describe('Project profile and sensorik contracts', () => {
  it('project profiles can express editing and briefing posture', () => {
    const profile: ProjectProfile = {
      editing_mode: 'approval-first',
      copy_density: 'complete',
      layout_priority: 'preserve-copy-completeness',
      change_style: 'adaptive',
      question_policy: 'ask-on-ambiguity',
      notes: 'Keep full copy unless layout review says otherwise.',
    };

    expect(profile.editing_mode).toBe('approval-first');
    expect(profile.copy_density).toBe('complete');
  });

  it('risk resolution modes stay explicit and finite', () => {
    expect(RISK_RESOLUTION_MODES).toEqual([
      'ask-before-apply',
      'conservative-default',
      'preserve-layout-first',
      'preserve-copy-first',
    ]);
  });

  it('layout risk signals can describe deterministic review warnings', () => {
    const signal: LayoutRiskSignal = {
      code: 'cta_spacing_review',
      severity: 'medium',
      affected_surface: 'cta-block-spacing-and-button-groups',
      reason: 'Longer CTA copy can break spacing rhythm in compact blocks.',
      suggested_handling: 'Review the CTA block after replacing copy.',
    };

    expect(signal.code).toBe('cta_spacing_review');
    expect(signal.severity).toBe('medium');
  });
});

describe('ElementifyErrorCode', () => {
  it('all error codes are non-empty strings', () => {
    for (const code of ERROR_CODES) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate error codes', () => {
    const unique = new Set(ERROR_CODES);
    expect(unique.size).toBe(ERROR_CODES.length);
  });

  it('contains exactly 8 error codes', () => {
    expect(ERROR_CODES).toHaveLength(8);
  });

  it('auth_insufficient_scope is present and distinct', () => {
    expect(ERROR_CODES.filter((c) => c.includes('scope'))).toHaveLength(1);
    expect(ERROR_CODES.filter((c) => c === 'auth_insufficient_scope')).toHaveLength(1);
  });

  it('all auth error codes start with "auth_"', () => {
    const authCodes = ERROR_CODES.filter((c) => c.startsWith('auth_'));
    expect(authCodes).toContain('auth_invalid_key');
    expect(authCodes).toContain('auth_key_inactive');
    expect(authCodes).toContain('auth_insufficient_scope');
  });
});

describe('GovernanceSettings runtime shape', () => {
  it('can construct a valid GovernanceSettings object', () => {
    const settings: GovernanceSettings = {
      allowed_capabilities: ['content-structure:read', 'content-structure:write'],
      require_approval: false,
      audit_log_enabled: true,
      max_keys: 10,
    };

    expect(settings.allowed_capabilities).toHaveLength(2);
    expect(settings.require_approval).toBe(false);
    expect(settings.audit_log_enabled).toBe(true);
    expect(settings.max_keys).toBe(10);
  });
});

describe('ElementifyTemplate runtime shape', () => {
  it('can construct a valid template object', () => {
    const template: ElementifyTemplate = {
      id: 1,
      title: 'Hero Section',
      status: 'publish',
      type: 'section',
      author: 1,
      date: '2025-01-01T00:00:00',
      modified: '2025-06-01T00:00:00',
      categories: ['hero'],
      tags: ['promo'],
      shortcode: '[elementor-template id="1"]',
    };

    expect(template.id).toBe(1);
    expect(template.type).toBe('section');
  });

  it('template list total and total_pages are numeric', () => {
    const list: ElementifyTemplateList = {
      templates: [],
      total: 0,
      total_pages: 1,
    };

    expect(typeof list.total).toBe('number');
    expect(typeof list.total_pages).toBe('number');
  });
});

describe('ElementifyError runtime shape', () => {
  it('can construct a valid error object', () => {
    const error: ElementifyError = {
      code: 'auth_insufficient_scope',
      message: 'Key lacks required capability.',
      status: 403,
    };

    expect(error.code).toBe('auth_insufficient_scope');
    expect(error.status).toBe(403);
  });
});

describe('SiteConfig and ElementifyConfig', () => {
  it('can construct a valid single-site config', () => {
    const config: ElementifyConfig = {
      sites: [
        {
          id: 'my-site',
          name: 'My Site',
          url: 'https://example.com',
          apiKey: 'ek_abc123',
          default: true,
          activationMode: 'standalone-free',
        },
      ],
    };

    expect(config.sites).toHaveLength(1);
    expect(config.sites[0]!.id).toBe('my-site');
  });

  it('activationMode is optional on SiteConfig', () => {
    const config: SiteConfig = {
      id: 'x',
      name: 'X',
      url: 'https://x.com',
      apiKey: 'ek_x',
    };
    expect(config.activationMode).toBeUndefined();
  });
});

describe('shared intelligence contracts', () => {
  it('can construct product-surface and boundary-case contracts', () => {
    const assignment: ProductSurfaceAssignment = {
      id: 'get_recommendations',
      label: 'Recommendation engine',
      tier: 'free',
      visibility: 'public',
      kind: 'tool',
      rationale: 'Core Free guidance surface.',
      dependsOn: ['assess_site', 'set_site_context'],
      notes: ['Must remain mirror-safe.'],
    };
    const boundaryCase: TierBoundaryCase = {
      id: 'theme-builder-boundary',
      decision: 'Theme Builder wizard remains Advanced.',
      rationale: 'It crosses from creator-light into site-wide structural workflows.',
      affectedSurfaces: ['wizard_theme_builder', 'plan_rebuild_strategy'],
    };
    const profile: ProductTierProfile = {
      tier: 'advanced',
      label: 'Advanced',
      visibility: 'private',
      entitlements: ['advanced-creation', 'premium-library', 'brand-adaptation'],
      notes: ['Extends Free without requiring Studio cloud behavior.'],
    };

    expect(assignment.tier).toBe('free');
    expect(boundaryCase.affectedSurfaces).toContain('wizard_theme_builder');
    expect(profile.entitlements).toContain('premium-library');
  });

  it('can construct a valid SiteInfo object', () => {
    const info: SiteInfo = {
      name: 'Example',
      url: 'https://example.com',
      wp_version: '6.5.0',
      elementor_version: '3.20.0',
      elementor_pro: true,
      activation_mode: 'standalone-pro',
      template_count: 12,
      capabilities: ['content-structure:read', 'content-structure:write'],
    };

    expect(info.elementor_pro).toBe(true);
    expect(info.capabilities).toContain('content-structure:read');
  });

  it('can construct global style payloads', () => {
    const colors: GlobalColor[] = [{ title: 'Primary', color: '#1A56DB' }];
    const typography: GlobalTypographyEntry[] = [{ title: 'Primary', font_family: 'Inter', font_size: 16 }];
    const styles: GlobalStylesData = {
      kit_id: 1,
      system_colors: [{ _id: 'primary', title: 'Primary', color: '#1A56DB' }],
      custom_colors: [],
      system_typography: typography,
      custom_typography: [],
    };

    expect(colors[0]!.color).toBe('#1A56DB');
    expect(styles.kit_id).toBe(1);
  });

  it('can construct site context and site assessment contracts', () => {
    const issue: AssessmentIssue = {
      severity: 'warning',
      code: 'no_logo',
      message: 'No site logo is set.',
    };
    const context: SiteContext = {
      user_role: 'agency',
      site_purpose: 'corporate',
      brand_notes: null,
      target_audience: 'B2B teams',
      primary_language: 'en',
      set_at: null,
    };
    const assessment: SiteAssessment = {
      assessed_at: '2026-04-09T00:00:00Z',
      wordpress: {
        version: '6.5.0',
        language: 'en_US',
        timezone: 'UTC',
        is_multisite: false,
        site_name: 'Example',
        site_tagline: 'Tagline',
        admin_url: 'https://example.com/wp-admin/',
      },
      elementor: {
        version: '3.20.0',
        pro: true,
        pro_version: '3.20.0',
        active_kit_id: 1,
      },
      brand: {
        logo_set: false,
        logo_id: null,
        global_colors_count: 0,
        global_typography_count: 0,
      },
      theme_builder: { header: [], footer: [] },
      template_library: {
        total: 4,
        by_type: { section: 4 },
        uncategorized: 1,
        published: 3,
        draft: 1,
      },
      pages: {
        elementor_total: 2,
        by_post_type: { page: 2 },
      },
      performance: {
        css_print_method: 'external',
        optimized_dom: true,
        load_fa4_shim: false,
      },
      plugins: {
        active_count: 5,
        classified: {},
        woocommerce: false,
        multilingual: false,
      },
      custom_post_types: [],
      user_roles: ['administrator'],
      issues: [issue],
      issues_count: { critical: 0, warning: 1, info: 0 },
    };

    expect(context.user_role).toBe('agency');
    expect(assessment.issues[0]!.code).toBe('no_logo');
  });

  it('can construct recommendation and queue models', () => {
    const recommendation: Recommendation = {
      id: 'set_logo',
      priority: 1,
      category: 'brand',
      title: 'Set logo',
      description: 'Upload and apply a site logo.',
      impact: 'high',
      effort: 'low',
      automated: true,
      tools: ['set_site_logo'],
      blocked_by: [],
    };
    const change: QueuedChange = {
      id: 'chg_123',
      created_at: '2026-04-09T00:00:00Z',
      status: 'pending',
      operation: 'set_global_colors',
      params: { colors: [{ title: 'Primary', color: '#1A56DB' }] },
      note: 'Refresh brand colors',
      before_state: null,
      reviewed_at: null,
      review_note: null,
      applied_at: null,
    };

    expect(recommendation.tools).toContain('set_site_logo');
    expect(change.status).toBe('pending');
  });

  it('can construct a site fingerprint contract', () => {
    const fingerprint: SiteFingerprint = {
      cms: 'wordpress',
      builder: 'elementor',
      elementorDetected: true,
      elementorPro: true,
      ecommerceDetected: false,
      multilingualDetected: false,
      themeBuilderCoverage: 2,
      elementorPageCount: 5,
      confidence: 0.94,
      signals: [
        {
          key: 'elementor_active',
          label: 'Elementor active',
          detected: true,
          confidence: 0.98,
          evidence: 'Elementor version detected in site assessment.',
        },
      ],
      notes: ['Theme Builder has published templates.'],
    };

    expect(fingerprint.builder).toBe('elementor');
    expect(fingerprint.signals[0]!.detected).toBe(true);
  });

  it('can construct destination and capability contracts', () => {
    const destination: DestinationProfile = {
      kind: 'elementor-pro',
      label: 'Elementor Pro',
      elementorDetected: true,
      elementorPro: true,
      activePluginCategories: ['woocommerce'],
      notes: ['Published Theme Builder templates detected.'],
    };
    const matrix: CapabilityMatrix = {
      destination,
      capabilities: [
        {
          id: 'theme-builder',
          available: true,
          source: 'elementor-pro',
          notes: ['Elementor Pro is active.'],
        },
      ],
      compatibilitySummary: 'Destination supports advanced Elementor workflows.',
      warnings: [],
    };

    expect(matrix.destination.kind).toBe('elementor-pro');
    expect(matrix.capabilities[0]!.available).toBe(true);
  });

  it('can construct recommendation engine input and report contracts', () => {
    const assessment: SiteAssessment = {
      assessed_at: '2026-04-09T00:00:00Z',
      wordpress: {
        version: '6.5.0',
        language: 'en_US',
        timezone: 'UTC',
        is_multisite: false,
        site_name: 'Example',
        site_tagline: 'Tagline',
        admin_url: 'https://example.com/wp-admin/',
      },
      elementor: {
        version: '3.20.0',
        pro: false,
        pro_version: null,
        active_kit_id: 1,
      },
      brand: {
        logo_set: true,
        logo_id: 10,
        global_colors_count: 4,
        global_typography_count: 2,
      },
      theme_builder: { header: [], footer: [] },
      template_library: {
        total: 4,
        by_type: { section: 4 },
        uncategorized: 0,
        published: 4,
        draft: 0,
      },
      pages: {
        elementor_total: 2,
        by_post_type: { page: 2 },
      },
      performance: {
        css_print_method: 'external',
        optimized_dom: true,
        load_fa4_shim: false,
      },
      plugins: {
        active_count: 3,
        classified: {},
        woocommerce: false,
        multilingual: false,
      },
      custom_post_types: [],
      user_roles: ['administrator'],
      issues: [],
      issues_count: { critical: 0, warning: 0, info: 0 },
    };
    const context: SiteContext = {
      user_role: 'agency',
      site_purpose: 'corporate',
      brand_notes: null,
      target_audience: null,
      primary_language: 'en',
      set_at: '2026-04-09T00:00:00Z',
    };
    const fingerprint: SiteFingerprint = {
      cms: 'wordpress',
      builder: 'elementor',
      elementorDetected: true,
      elementorPro: false,
      ecommerceDetected: false,
      multilingualDetected: false,
      themeBuilderCoverage: 0,
      elementorPageCount: 2,
      confidence: 0.88,
      signals: [],
      notes: ['Elementor is active, but Theme Builder is not available yet.'],
    };
    const destination: DestinationProfile = {
      kind: 'elementor-free',
      label: 'Elementor Free',
      elementorDetected: true,
      elementorPro: false,
      activePluginCategories: [],
      notes: [],
    };
    const matrix: CapabilityMatrix = {
      destination,
      capabilities: [
        {
          id: 'theme-builder',
          available: false,
          source: 'unknown',
          notes: ['Theme Builder capability is not available.'],
        },
      ],
      compatibilitySummary: 'Destination supports core Elementor workflows, with advanced capabilities limited.',
      warnings: ['Elementor Pro is not detected.'],
    };
    const input: RecommendationEngineInput = {
      assessment,
      context,
      fingerprint,
      capabilityMatrix: matrix,
      validationWarnings: ['Open the header manually after setup.'],
    };
    const report: RecommendationEngineReport = {
      destination,
      compatibilitySummary: matrix.compatibilitySummary,
      capabilityWarnings: [...matrix.warnings, ...input.validationWarnings!],
      recommendations: [
        {
          id: 'unlock_theme_builder_capability',
          priority: 1,
          category: 'structure',
          title: 'Unlock Theme Builder workflows',
          description: 'Upgrade the destination before creating Theme Builder templates.',
          impact: 'high',
          effort: 'medium',
          automated: false,
          tools: ['get_destination_capabilities'],
          blocked_by: [],
        },
      ],
    };

    expect(input.capabilityMatrix.destination.kind).toBe('elementor-free');
    expect(report.recommendations[0]!.id).toBe('unlock_theme_builder_capability');
  });

  it('can construct a design token report contract', () => {
    const report: DesignTokenReport = {
      colors: [
        { id: 'primary', title: 'Primary', value: '#1A56DB', source: 'system-color' },
      ],
      typography: [
        {
          id: 'primary',
          title: 'Primary',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: '400',
          lineHeight: 1.6,
          source: 'system-typography',
        },
      ],
      spacing: [
        {
          id: 'space-md',
          label: 'Base spacing',
          pixels: 16,
          source: 'heuristic',
          reason: 'Derived from the smallest global typography size.',
        },
      ],
      radiusHints: [
        {
          id: 'radius-card',
          label: 'Card radius',
          value: '12px',
          source: 'heuristic',
          reason: 'Neutral starting point for modern Elementor cards.',
        },
      ],
      shadowHints: [
        {
          id: 'shadow-soft',
          label: 'Soft elevation',
          value: '0 12px 32px rgba(17, 24, 39, 0.12)',
          source: 'heuristic',
          reason: 'Conservative elevation hint for cards and modals.',
        },
      ],
      notes: ['Spacing and elevation hints are heuristic, not extracted from rendered CSS.'],
    };

    expect(report.colors[0]!.source).toBe('system-color');
    expect(report.spacing[0]!.pixels).toBe(16);
  });

  it('can construct rebuild strategy and critique contracts', () => {
    const strategy: RebuildStrategy = {
      strategyId: 'brand-foundation-first',
      label: 'Brand foundation first',
      summary: 'Stabilize logo, palette, and typography before template work.',
      rationale: ['The site is missing core brand signals.', 'Later composition depends on a stable visual system.'],
      orderedSteps: ['set_logo', 'define_global_colors', 'define_global_typography'],
      requiredCapabilities: ['global-styles'],
      fallbackStrategies: ['content-expansion-first'],
    };
    const critique: StrategyCritique = {
      verdict: 'caution',
      summary: 'The overall sequence is sound, but Theme Builder work should wait.',
      concerns: ['Theme Builder capability is not available yet.'],
      suggestedAdjustments: ['Resolve destination capability before creating header and footer templates.'],
    };

    expect(strategy.requiredCapabilities[0]).toBe('global-styles');
    expect(critique.verdict).toBe('caution');
  });

  it('can construct a control-plane pipeline plan contract', () => {
    const plan: PipelinePathPlan = {
      intent: 'adapt-to-brand',
      label: 'Adapt to brand',
      summary: 'Prioritize brand alignment before composition.',
      suggestedTools: ['set_site_context', 'get_global_styles', 'set_global_colors'],
      rationale: ['Brand primitives are the strongest current leverage point.'],
      gates: ['Confirm global colors and typography before page composition.'],
    };

    expect(plan.intent).toBe('adapt-to-brand');
    expect(plan.suggestedTools[0]).toBe('set_site_context');
  });

  it('can construct smoke-test, brand-adaptation, and output-critique contracts', () => {
    const smokePlan: ImportSmokeTestPlan = {
      readiness: 'ready-for-manual-smoke',
      environmentTargets: ['local WordPress + Elementor Free'],
      preparedHooks: ['validate_elementor_write', 'update_page_data'],
      checklist: ['Import into a non-production page and confirm Elementor opens without structural errors.'],
    };
    const brandPlan: BrandAdaptationPlan = {
      targetBrandSummary: 'Align the current Elementor kit with a cleaner B2B palette and calmer typography rhythm.',
      tokenAnchors: ['Primary color #1A56DB', 'Inter 16px body text', '16px base spacing'],
      suggestedActions: ['Refresh global colors before changing hero and CTA sections.'],
      guardrails: ['Do not overwrite live templates before validating color and typography deltas.'],
    };
    const critique: OutputCritique = {
      verdict: 'caution',
      summary: 'The payload is structurally usable, but the rollout should stay validation-led.',
      concerns: ['One destination capability warning is still active.'],
      repairSteps: ['Re-run destination scan before applying Theme Builder-heavy changes.'],
      validationBasis: ['Structural import report: warn'],
    };

    expect(smokePlan.preparedHooks[0]).toBe('validate_elementor_write');
    expect(brandPlan.tokenAnchors[0]).toContain('Primary color');
    expect(critique.verdict).toBe('caution');
  });

  it('can construct library provider boundary contracts', () => {
    const localProvider: LibraryProviderDescriptor = {
      kind: 'local-elementor',
      label: 'Local Elementor Library',
      scope: 'site',
      availability: 'active',
      storageModel: 'wordpress-local',
      syncMode: 'none',
      targetSystem: 'elementor_library on the current WordPress site',
      notes: ['Primary target system for Free and Advanced.'],
    };
    const report: LibraryBoundaryReport = {
      tier: 'advanced',
      defaultProvider: 'local-elementor',
      providers: [
        localProvider,
        {
          kind: 'elementify-premium',
          label: 'Elementify Premium Library',
          scope: 'catalog',
          availability: 'active',
          storageModel: 'curated-catalog',
          syncMode: 'manual-import',
          targetSystem: 'Imports into the local Elementor Library',
          notes: ['Premium library is not a cloud library.'],
        },
      ],
      usageRules: [
        'Premium assets are imported into or used alongside the local Elementor Library.',
      ],
    };

    expect(report.defaultProvider).toBe('local-elementor');
    expect(report.providers[1]!.kind).toBe('elementify-premium');
  });

  it('can construct premium library catalog and inspection contracts', () => {
    const summary: PremiumLibraryAssetSummary = {
      id: 'premium-service-section-stack',
      title: 'Premium Service Section Stack',
      type: 'section-starter',
      collection: 'service-pages',
      curationLevel: 'featured',
      audience: ['freelancer', 'agency'],
      summary: 'A layered section pattern for service pages.',
      intendedUse: 'Use to accelerate service section assembly.',
      tags: ['services', 'proof', 'section'],
      curationSignals: ['Service-page foundation', 'Reusable section system'],
      useCases: ['service page assembly', 'proof-led sectioning'],
    };
    const detail: PremiumLibraryAssetDetail = {
      ...summary,
      description: 'A reusable premium section starter for service-led layouts.',
      localImportNotes: ['Import into the local Elementor Library before adapting it.'],
      prerequisites: ['Global colors should already be in place.'],
      guardrails: ['Do not imply cross-site reuse.'],
    };
    const catalog: PremiumLibraryCatalogReport = {
      provider: 'elementify-premium',
      availability: 'active',
      assetCount: 1,
      assets: [summary],
      notes: ['Catalog stays local-site operational.'],
    };
    const inspection: PremiumLibraryInspectionReport = {
      provider: 'elementify-premium',
      availability: 'active',
      asset: detail,
      importMode: 'manual-import',
      recommendedWorkflow: [
        'Inspect the asset.',
        'Import it into the local Elementor Library.',
      ],
      notes: ['No cloud semantics.'],
    };

    expect(catalog.assets[0]!.id).toBe(summary.id);
    expect(inspection.asset.guardrails[0]).toContain('cross-site');
  });

  it('can construct a premium library usage plan contract', () => {
    const plan: PremiumLibraryUsagePlan = {
      assetId: 'premium-service-section-stack',
      assetTitle: 'Premium Service Section Stack',
      targetType: 'section-starter',
      activeProvider: 'local-elementor',
      premiumProviderAvailable: true,
      importMode: 'manual-import',
      recommendedWorkflow: [
        'Choose a curated premium section starter.',
        'Import it into the local Elementor Library before adapting it.',
      ],
      prerequisites: [
        'Keep the current site context and brand notes up to date.',
      ],
      guardrails: [
        'Do not describe the premium library as cloud storage.',
      ],
      notes: [
        'Premium usage remains local-site operational.',
      ],
    };

    expect(plan.importMode).toBe('manual-import');
    expect(plan.premiumProviderAvailable).toBe(true);
  });

  it('can construct an import report contract', () => {
    const report: ImportReport = {
      sourceType: 'template',
      sourceRef: 'template:42',
      templateMetadata: {
        title: 'Homepage Hero',
        topLevelCount: 3,
        widgetCount: 8,
      },
      validationResult: 'warn',
      warnings: ['One top-level element is missing a stable id.'],
      structuralNotes: ['Top-level Elementor array detected.'],
      nextStepHints: ['Open in Elementor and confirm responsive behavior.'],
      automatedCoverage: 'structural-only',
      smokeTestPlan: {
        readiness: 'ready-for-manual-smoke',
        environmentTargets: ['local WordPress + Elementor Free'],
        preparedHooks: ['validate_elementor_write'],
        checklist: ['Import into a disposable page and confirm Elementor loads the structure.'],
      },
    };

    expect(report.validationResult).toBe('warn');
    expect(report.templateMetadata.widgetCount).toBe(8);
  });
});
