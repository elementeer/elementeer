import { describe, expect, it } from 'vitest';
import type { CapabilityMatrix, SiteAssessment, SiteContext } from '../client.js';
import {
  buildAdvancedScenarioPlan,
  buildAdvancedWorkflowPlan,
} from '../advanced-workflows.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-10T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Advanced Workflow Test',
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
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], 'error-404': [] },
    template_library: { total: 10, by_type: { section: 10 }, uncategorized: 2, published: 8, draft: 2 },
    pages: { elementor_total: 5, by_post_type: { page: 4, post: 1 } },
    performance: { css_print_method: 'external', optimized_dom: true, load_fa4_shim: false },
    plugins: { active_count: 4, classified: {}, woocommerce: false, multilingual: false },
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
    brand_notes: 'Clear premium positioning.',
    target_audience: 'B2B teams',
    primary_language: 'en',
    set_at: '2026-04-10T00:00:00Z',
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
      { id: 'theme-builder', available: true, source: 'elementor-pro', notes: [] },
      { id: 'change-review', available: true, source: 'core', notes: [] },
    ],
    compatibilitySummary: 'Destination supports advanced Elementor workflows.',
    warnings: [],
    ...overrides,
  };
}

describe('buildAdvancedWorkflowPlan', () => {
  it('builds a premium page rollout plan', () => {
    const plan = buildAdvancedWorkflowPlan({
      workflow: 'premium-page-rollout',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      premiumAssetId: 'premium-service-section-stack',
      targetPageId: 55,
    });

    expect(plan.title).toContain('premium page rollout');
    expect(plan.recommendedTools).toContain('import_premium_library_asset');
    expect(plan.executionSteps.join(' ')).toContain('page 55');
    expect(plan.operativeHandoffs[0]?.tool).toBe('inspect_premium_library_asset');
    expect(plan.actionPresets[1]?.tool).toBe('import_premium_library_asset');
    expect(plan.workflowApplications.map((application) => application.layer)).toContain('library');
    expect(plan.productivityLayer.summary).toContain('reduce work');
    expect(plan.productivityLayer.reuseLightMoves.length).toBeGreaterThan(0);
  });

  it('builds a theme-builder rollout plan', () => {
    const plan = buildAdvancedWorkflowPlan({
      workflow: 'theme-builder-rollout',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      premiumAssetId: 'premium-theme-foundation-header',
      themeBuilderType: 'header',
    });

    expect(plan.recommendedTools).toContain('wizard_theme_builder');
    expect(plan.guardrails.join(' ')).toContain('Theme Builder');
    expect(plan.operativeHandoffs[0]?.tool).toBe('get_destination_capabilities');
    expect(plan.actionPresets[2]?.tool).toBe('wizard_theme_builder');
    expect(plan.workflowApplications.map((application) => application.layer)).toContain('workflow');
  });

  it('builds a deep relaunch plan', () => {
    const plan = buildAdvancedWorkflowPlan({
      workflow: 'deep-relaunch',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      targetPageId: 55,
      themeBuilderType: 'header',
    });

    expect(plan.title).toContain('deep relaunch');
    expect(plan.recommendedTools).toContain('plan_rebuild_strategy');
    expect(plan.recommendedTools).toContain('queue_change');
    expect(plan.operativeHandoffs[0]?.tool).toBe('save_full_page_as_template');
    expect(plan.actionPresets[1]?.id).toBe('deep-relaunch-plan-preset');
    expect(plan.workflowApplications.map((application) => application.layer)).toContain('workflow');
    expect(plan.productivityLayer.variantMoves.join(' ')).toContain('rollback');
  });

  it('builds a migration rollout plan', () => {
    const plan = buildAdvancedWorkflowPlan({
      workflow: 'migration-rollout',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      sourceTemplateId: 42,
      themeBuilderType: 'header',
    });

    expect(plan.title).toContain('migration');
    expect(plan.recommendedTools).toContain('critique_rebuild_strategy');
    expect(plan.recommendedTools).toContain('wizard_theme_builder');
    expect(plan.operativeHandoffs[0]?.tool).toBe('get_destination_capabilities');
    expect(plan.actionPresets[2]?.id).toBe('migration-critique-preset');
    expect(plan.workflowApplications.map((application) => application.layer)).toContain('workflow');
    expect(plan.productivityLayer.timeSavingMoves.join(' ')).toContain('migration slice');
  });

  it('builds a critique repair loop plan', () => {
    const plan = buildAdvancedWorkflowPlan({
      workflow: 'critique-repair-loop',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      sourceTemplateId: 42,
    });

    expect(plan.recommendedTools).toContain('critique_elementor_output');
    expect(plan.executionSteps[0]).toContain('template 42');
    expect(plan.recommendedTools).toContain('queue_change');
    expect(plan.notes.join(' ')).toContain('safer');
    expect(plan.operativeHandoffs[0]?.tool).toBe('validate_elementor_write');
    expect(plan.actionPresets[1]?.tool).toBe('critique_elementor_output');
    expect(plan.workflowApplications.map((application) => application.layer)).toContain('quality');
    expect(plan.productivityLayer.followUpMode).toContain('Queue');
  });
});

describe('buildAdvancedScenarioPlan', () => {
  it('routes deep relaunch into the deeper relaunch workflow', () => {
    const plan = buildAdvancedScenarioPlan({
      scenario: 'deep-relaunch',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      userPosture: 'assisted',
      targetSurface: 'mixed',
      targetPageId: 55,
    });

    expect(plan.title).toContain('Deep Relaunch');
    expect(plan.recommendedWorkflow).toBe('deep-relaunch');
    expect(plan.supportingWorkflows).toContain('theme-builder-rollout');
    expect(plan.recommendedTools).toContain('get_advanced_recommendations');
    expect(plan.actionPresets[0]?.tool).toBe('save_full_page_as_template');
    expect(plan.productivityLayer.summary).toContain('save time');
  });

  it('routes migration into migration rollout with structural support', () => {
    const plan = buildAdvancedScenarioPlan({
      scenario: 'migration',
      assessment: makeAssessment(),
      context: makeContext(),
      capabilityMatrix: makeCapabilityMatrix(),
      userPosture: 'technical',
      targetSurface: 'theme-builder',
      sourceTemplateId: 42,
    });

    expect(plan.title).toContain('Migration');
    expect(plan.recommendedWorkflow).toBe('migration-rollout');
    expect(plan.supportingWorkflows).toContain('theme-builder-rollout');
    expect(plan.rationale.join(' ')).toContain('structural rollout');
  });
});
