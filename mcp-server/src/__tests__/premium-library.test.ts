import { describe, expect, it } from 'vitest';
import type { CapabilityMatrix, SiteAssessment, SiteContext } from '../client.js';
import {
  buildPremiumLibraryImportInput,
  buildPremiumLibraryUsagePlan,
  inspectPremiumLibraryAsset,
  listPremiumLibraryAssets,
  PREMIUM_LIBRARY_CATALOG,
} from '../premium-library.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-09T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Premium Library Test',
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
    ...overrides,
  };
}

function makeContext(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    user_role: 'agency',
    site_purpose: 'corporate',
    brand_notes: null,
    target_audience: null,
    primary_language: 'en',
    set_at: '2026-04-09T00:00:00Z',
    ...overrides,
  };
}

function makeCapabilityMatrix(overrides: Partial<CapabilityMatrix> = {}): CapabilityMatrix {
  return {
    destination: {
      kind: 'elementor-pro',
      label: 'Elementor Pro',
      elementorDetected: true,
      elementorPro: true,
      activePluginCategories: [],
      notes: [],
    },
    capabilities: [
      {
        id: 'theme-builder',
        available: true,
        source: 'elementor-pro',
        notes: ['Theme Builder is available.'],
      },
    ],
    compatibilitySummary: 'Destination supports advanced Elementor workflows.',
    warnings: [],
    ...overrides,
  };
}

describe('buildPremiumLibraryUsagePlan', () => {
  it('builds an Advanced premium-library workflow that stays local-site operational', () => {
    const plan = buildPremiumLibraryUsagePlan({
      assetId: 'premium-service-section-stack',
      targetType: 'section-starter',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
    });

    expect(plan.premiumProviderAvailable).toBe(true);
    expect(plan.importMode).toBe('manual-import');
    expect(plan.guardrails.join(' ')).toContain('cloud');
    expect(plan.assetTitle).toBe('Premium Service Section Stack');
    expect(plan.notes.join(' ')).toContain('Collection: Service pages');
    expect(plan.notes.join(' ')).toContain('Curation level: Featured');
  });

  it('adds a theme-builder prerequisite when the destination cannot support theme blocks yet', () => {
    const plan = buildPremiumLibraryUsagePlan({
      targetType: 'theme-block',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix({
        capabilities: [
          {
            id: 'theme-builder',
            available: false,
            source: 'unknown',
            notes: ['Theme Builder is not available.'],
          },
        ],
      }),
    });

    expect(plan.prerequisites.join(' ')).toContain('Theme Builder capability');
  });
});

describe('buildPremiumLibraryImportInput', () => {
  it('builds a dedicated local-library import payload for a curated premium asset', () => {
    const payload = buildPremiumLibraryImportInput({
      assetId: 'premium-service-section-stack',
    });

    expect(payload.source.kind).toBe('elementify-premium');
    expect(payload.source.asset_id).toBe('premium-service-section-stack');
    expect(payload.type).toBe('section');
    expect(payload.status).toBe('draft');
    expect(Array.isArray(payload.elementor_data)).toBe(true);
    expect(payload.categories).toContain('elementify-premium');
  });
});

describe('premium library catalog helpers', () => {
  it('lists a curated premium catalog without cloud semantics', () => {
    const report = listPremiumLibraryAssets({
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
    });

    expect(report.provider).toBe('elementify-premium');
    expect(report.assetCount).toBe(PREMIUM_LIBRARY_CATALOG.length);
    expect(report.assets[0]!.title).toContain('Premium');
    expect(report.notes.join(' ')).toContain('Catalog collections:');
    expect(report.notes.join(' ')).toContain('Curation mix:');
    expect(report.assets.some((asset) => asset.collection === 'theme-builder')).toBe(true);
  });

  it('inspects a premium asset for local-site import planning', () => {
    const report = inspectPremiumLibraryAsset({
      assetId: 'premium-theme-foundation-header',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
    });

    expect(report.asset.type).toBe('theme-block');
    expect(report.importMode).toBe('manual-import');
    expect(report.recommendedWorkflow.join(' ')).toContain('local Elementor Library');
    expect(report.asset.curationSignals.join(' ')).toContain('Theme Builder');
  });
});
