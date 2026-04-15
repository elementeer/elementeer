import { describe, expect, it } from 'vitest';
import type { CapabilityMatrix, RecommendationEngineInput, SiteAssessment, SiteContext } from '../client.js';
import {
  buildAdvancedUpgradePlan,
  buildAdvancedRecommendationReport,
  groupAdvancedRecommendationsByTrack,
} from '../advanced-recommendations.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-10T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Advanced Recs Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: {
      version: '3.20.0',
      pro: true,
      pro_version: '3.20.0',
      active_kit_id: 1,
    },
    brand: {
      logo_set: true,
      logo_id: 10,
      global_colors_count: 4,
      global_typography_count: 2,
    },
    theme_builder: {
      header: [{ id: 1, title: 'Header', status: 'publish' }],
      footer: [{ id: 2, title: 'Footer', status: 'publish' }],
      single: [],
      'single-post': [],
      archive: [],
      'error-404': [],
    },
    template_library: {
      total: 12,
      by_type: { section: 8, page: 4 },
      uncategorized: 2,
      published: 10,
      draft: 2,
    },
    pages: {
      elementor_total: 6,
      by_post_type: { page: 5, post: 1 },
    },
    performance: {
      css_print_method: 'external',
      optimized_dom: true,
      load_fa4_shim: false,
    },
    plugins: {
      active_count: 4,
      classified: { seo: ['seo-by-rank-math'] },
      woocommerce: false,
      multilingual: false,
    },
    custom_post_types: [],
    user_roles: ['administrator'],
    issues: [],
    issues_count: { critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: 'agency',
    site_purpose: 'corporate',
    brand_notes: 'Structured brand with clear premium positioning.',
    target_audience: 'B2B teams',
    primary_language: 'en',
    set_at: '2026-04-10T00:00:00Z',
    ...overrides,
  };
}

function makeInput(overrides: Partial<RecommendationEngineInput> = {}): RecommendationEngineInput {
  const assessment = overrides.assessment ?? makeAssessment();
  const fingerprint = overrides.fingerprint ?? buildSiteFingerprint(assessment);
  const capabilityMatrix = overrides.capabilityMatrix ?? buildCapabilityMatrix(assessment, fingerprint);

  return {
    assessment,
    context: overrides.context ?? makeContext(),
    fingerprint,
    capabilityMatrix,
    validationWarnings: overrides.validationWarnings,
  };
}

describe('buildAdvancedRecommendationReport', () => {
  it('adds Advanced-only tracks on top of the Free foundation', () => {
    const report = buildAdvancedRecommendationReport(makeInput());

    expect(report.foundationRecommendations.length).toBeGreaterThanOrEqual(0);
    expect(report.advancedRecommendations.map((recommendation) => recommendation.id)).toContain('run_brand_adaptation_pass');
    expect(report.advancedRecommendations.map((recommendation) => recommendation.id)).toContain('activate_premium_library_flow');
    expect(report.advancedRecommendations.map((recommendation) => recommendation.id)).toContain('run_output_critique_loop');
    expect(report.advancedRecommendations.map((recommendation) => recommendation.id)).toContain('shape_honest_upgrade_path');
    expect(report.advancedRecommendations.map((recommendation) => recommendation.id)).toContain('activate_productivity_pass');
  });

  it('prioritizes critique when validation warnings exist', () => {
    const report = buildAdvancedRecommendationReport(
      makeInput({
        validationWarnings: ['Theme Builder capability is limited on the current destination.'],
      }),
    );

    const critique = report.advancedRecommendations.find((recommendation) => recommendation.id === 'run_output_critique_loop');
    expect(critique?.priority).toBe(1);
  });

  it('filters governed-operations for site-owner context', () => {
    const report = buildAdvancedRecommendationReport(
      makeInput({
        context: makeContext({ user_role: 'site-owner' }),
      }),
    );

    expect(report.advancedRecommendations.some((recommendation) => recommendation.workflowTrack === 'governed-operations')).toBe(false);
  });
});

describe('groupAdvancedRecommendationsByTrack', () => {
  it('groups advanced recommendations by workflow track', () => {
    const report = buildAdvancedRecommendationReport(makeInput());
    const groups = groupAdvancedRecommendationsByTrack(report.advancedRecommendations);

    expect(groups.some((group) => group.track === 'brand-adaptation')).toBe(true);
    expect(groups.some((group) => group.track === 'premium-library')).toBe(true);
    expect(groups.some((group) => group.track === 'upgrade-guidance')).toBe(true);
    expect(groups.some((group) => group.track === 'productivity')).toBe(true);
  });
});

describe('buildAdvancedUpgradePlan', () => {
  it('recommends Elementor Pro for structural scenarios without theme-builder capability', () => {
    const assessment = makeAssessment({
      elementor: {
        version: '3.20.0',
        pro: false,
        pro_version: null,
        active_kit_id: 1,
      },
    });
    const fingerprint = buildSiteFingerprint(assessment);
    const capabilityMatrix: CapabilityMatrix = {
      ...buildCapabilityMatrix(assessment, fingerprint),
      capabilities: [
        { id: 'theme-builder', available: false, source: 'unknown', notes: ['Theme Builder is not available on the current stack.'] },
      ],
    };

    const plan = buildAdvancedUpgradePlan({
      assessment,
      context: makeContext(),
      capabilityMatrix,
      currentTier: 'advanced',
      scenario: 'deep-relaunch',
      targetSurface: 'theme-builder',
    });

    expect(plan.recommendedUpgradeTarget).toBe('elementor-pro');
    expect(plan.recommendedStackProfile).toBe('asp-3-deep-relaunch-migration');
    expect(plan.isUpgradeNeeded).toBe(true);
  });

  it('recommends keeping the current stack when Advanced is already enough', () => {
    const assessment = makeAssessment();
    const fingerprint = buildSiteFingerprint(assessment);
    const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);

    const plan = buildAdvancedUpgradePlan({
      assessment,
      context: makeContext(),
      capabilityMatrix,
      currentTier: 'advanced',
      scenario: 'critique-repair',
      targetSurface: 'page',
    });

    expect(plan.recommendedUpgradeTarget).toBe('keep-current-stack');
    expect(plan.isUpgradeNeeded).toBe(false);
    expect(plan.supportingRecommendations.join(' ')).toContain('workflow');
  });
});
