import { describe, expect, it } from 'vitest';
import type { IntentWizardRoute, SiteAssessment, SiteContext } from '../client.js';
import {
  buildExtensionLiteWizardPlan,
  buildNewSiteLiteWizardPlan,
  buildOptimizationLiteWizardPlan,
  buildRelaunchLiteWizardPlan,
  buildStackBootstrapWizardPlan,
} from '../free-runtime-wizards.js';

function makeAssessment(overrides: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    assessed_at: '2026-04-12T00:00:00Z',
    wordpress: {
      version: '6.5.0',
      language: 'en_US',
      timezone: 'UTC',
      is_multisite: false,
      site_name: 'Runtime Wizard Test',
      site_tagline: '',
      admin_url: 'https://example.com/wp-admin/',
    },
    elementor: {
      version: '3.20.0',
      pro: false,
      pro_version: null,
      active_kit_id: 1,
    },
    brand: {
      logo_set: false,
      logo_id: null,
      global_colors_count: 0,
      global_typography_count: 0,
    },
    theme_builder: { header: [], footer: [], single: [], 'single-post': [], archive: [], search: [], 'error-404': [], popup: [] },
    template_library: {
      total: 6,
      by_type: { section: 6 },
      uncategorized: 6,
      published: 6,
      draft: 0,
    },
    pages: {
      elementor_total: 0,
      by_post_type: { page: 0, post: 0 },
    },
    performance: {
      css_print_method: 'internal',
      optimized_dom: true,
      load_fa4_shim: true,
    },
    plugins: {
      active_count: 2,
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
    user_role: 'freelancer',
    site_purpose: 'corporate',
    brand_notes: null,
    target_audience: null,
    primary_language: 'en',
    set_at: '2026-04-12T00:00:00Z',
    ...overrides,
  };
}

function makeRoute(overrides: Partial<IntentWizardRoute> = {}): IntentWizardRoute {
  return {
    origin: 'wordpress_without_elementor',
    intent: 'bootstrap',
    depth: 'moderate',
    userPosture: 'guided',
    scenarioId: 'B2',
    scenarioLabel: 'Bootstrap from existing WordPress without Elementor',
    recommendedWizard: 'stack-bootstrap-wizard',
    recommendedTier: 'free',
    recommendedStackProfile: {
      id: 'fsp-3-brownfield-staged-transition',
      label: 'Brownfield staged transition baseline',
      summary: 'Assess current WordPress before adding Elementor.',
      baselineStack: ['Current WordPress site', 'Current theme assessed', 'Elementor Free'],
      addonProfile: 'none',
      addonRationale: 'Stay simple first.',
      upgradePath: ['Elementify Advanced only if the path turns into a deeper migration'],
      supportConfidence: 'high',
    },
    recommendedSkillProfile: {
      id: 'bootstrap-guided',
      label: 'bootstrap guided',
      summary: 'Guided bootstrap posture.',
      explanationStyle: 'step_by_step',
      operatorControl: 'low',
    },
    recommendedAddonProfile: {
      id: 'none',
      label: 'No addon profile',
      summary: 'Keep the stack simple.',
      recommended: false,
      rationale: 'Baseline first.',
      examples: [],
    },
    guidanceMode: 'step_by_step',
    preservationPriorities: ['keep current content'],
    constraints: ['free_only'],
    stackReadiness: {
      wordpressPresent: true,
      elementorInstalled: false,
      elementorProInstalled: false,
      helloThemeInstalled: null,
      currentTheme: 'Custom Theme',
      knownAddons: [],
    },
    rationale: ['Bootstrap from existing WordPress is the closest fit.'],
    guardrails: ['Do not recommend paid upgrades unless the scenario clearly justifies them.'],
    suggestedTools: ['assess_site', 'get_destination_capabilities'],
    nextDecision: 'Decide whether Elementor should be introduced conservatively on the current theme or paired with a safer baseline change.',
    ...overrides,
  };
}

describe('free runtime wizard plans', () => {
  it('builds a bootstrap plan with foundation and first-build phases', () => {
    const plan = buildStackBootstrapWizardPlan({
      route: makeRoute(),
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(plan.kind).toBe('stack-bootstrap');
    expect(plan.phases.map((phase) => phase.id)).toEqual(['baseline', 'foundation', 'first-output']);
    expect(plan.phases[1]?.recommendationIds).toContain('set_logo');
    expect(plan.phases[2]?.suggestedTools).toContain('creator_mode');
    expect(plan.handoffs.join(' ')).toContain('wizard_brand_setup');
    expect(plan.operativeHandoffs[0]?.tool).toBe('set_site_context');
    expect(plan.operativeHandoffs[2]?.tool).toBe('creator_mode');
    expect(plan.actionPresets[0]?.tool).toBe('set_site_context');
    expect(plan.actionPresets[1]?.tool).toBe('wizard_brand_setup');
    expect(plan.actionPresets[2]?.tool).toBe('creator_mode');
    expect(plan.actionPresets[1]?.args).toEqual(expect.objectContaining({
      focus: ['define_global_colors', 'define_global_typography'],
    }));
    expect(plan.actionPresets[1]?.executionNotes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('avoids forcing a theme swap'),
      ]),
    );
    expect(plan.actionPresets[2]?.args).toEqual(expect.objectContaining({
      sections: ['hero', 'features', 'cta'],
    }));
    expect(plan.profileApplications.map((profile) => profile.layer)).toEqual(['stack', 'skill', 'addon']);
  });

  it('builds an optimization-lite plan from recommendation and performance signals', () => {
    const route = makeRoute({
      origin: 'existing_elementor_site',
      intent: 'optimization',
      scenarioId: 'E3',
      scenarioLabel: 'Optimization',
      recommendedWizard: 'optimization-lite-wizard',
    });
    const plan = buildOptimizationLiteWizardPlan({
      route,
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(plan.kind).toBe('optimization-lite');
    expect(plan.phases[0]?.recommendationIds).toContain('switch_css_to_external');
    expect(plan.phases[1]?.suggestedTools).toContain('audit_library');
    expect(plan.handoffs.join(' ')).toContain('Creator Light');
    expect(plan.operativeHandoffs[0]?.tool).toBe('explain_recommendation');
    expect(plan.operativeHandoffs[1]?.tool).toBe('wizard_brand_setup');
    expect(plan.actionPresets[0]?.tool).toBe('explain_recommendation');
    expect(plan.actionPresets[1]?.tool).toBe('wizard_brand_setup');
    expect(plan.actionPresets[2]?.tool).toBe('creator_mode');
  });

  it('builds a new-site-lite plan for idea and brand-first starts', () => {
    const route = makeRoute({
      origin: 'idea_only',
      scenarioId: 'B1',
      scenarioLabel: 'Bootstrap from idea or brand',
      recommendedWizard: 'new-site-lite-wizard',
      recommendedStackProfile: {
        id: 'fsp-1-minimal-guided-baseline',
        label: 'Minimal guided baseline',
        summary: 'Minimal baseline.',
        baselineStack: ['WordPress', 'Hello Theme', 'Elementor Free'],
        addonProfile: 'none',
        addonRationale: 'Stay simple first.',
        upgradePath: ['Stay on Free first'],
        supportConfidence: 'high',
      },
    });

    const plan = buildNewSiteLiteWizardPlan({
      route,
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(plan.kind).toBe('new-site-lite');
    expect(plan.phases.map((phase) => phase.id)).toEqual(['baseline', 'foundation', 'first-build']);
    expect(plan.operativeHandoffs[0]?.tool).toBe('set_site_context');
    expect(plan.actionPresets[0]?.args).toEqual(expect.objectContaining({
      site_purpose: 'new-site',
    }));
    expect(plan.actionPresets[1]?.tool).toBe('wizard_brand_setup');
    expect(plan.actionPresets[2]?.tool).toBe('creator_mode');
  });

  it('builds an extension-lite plan for controlled expansion work', () => {
    const route = makeRoute({
      origin: 'existing_elementor_site',
      intent: 'extension',
      scenarioId: 'E4',
      scenarioLabel: 'Extension',
      recommendedWizard: 'extension-lite-wizard',
      recommendedStackProfile: {
        id: 'fsp-2-curated-free-addon',
        label: 'Baseline plus curated free addon profile',
        summary: 'Curated addon profile.',
        baselineStack: ['WordPress', 'Hello Theme', 'Elementor Free'],
        addonProfile: 'content-marketing-free',
        addonRationale: 'Add one scenario-fit addon profile.',
        upgradePath: ['Stay on Free first'],
        supportConfidence: 'medium',
      },
      recommendedAddonProfile: {
        id: 'content-marketing-free',
        label: 'Content marketing free',
        summary: 'Content profile.',
        recommended: true,
        rationale: 'Scenario-fit.',
        examples: ['blog widgets'],
      },
      recommendedSkillProfile: {
        id: 'extension-assisted',
        label: 'extension assisted',
        summary: 'Extension flow.',
        explanationStyle: 'branching',
        operatorControl: 'medium',
      },
    });

    const plan = buildExtensionLiteWizardPlan({
      route,
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(plan.kind).toBe('extension-lite');
    expect(plan.phases.map((phase) => phase.id)).toEqual(['scope', 'prepare', 'build']);
    expect(plan.operativeHandoffs[0]?.tool).toBe('explain_recommendation');
    expect(plan.actionPresets[0]?.tool).toBe('explain_recommendation');
    expect(plan.actionPresets[1]?.args).toEqual(expect.objectContaining({
      focus: ['set_logo', 'define_global_colors', 'define_global_typography'],
    }));
    expect(plan.actionPresets[2]?.args).toEqual(expect.objectContaining({
      sections: ['hero', 'featured-content', 'latest-posts', 'newsletter', 'cta'],
      save_as_template: expect.objectContaining({
        title: 'Content Extension Draft',
      }),
    }));
    expect(plan.actionPresets[2]?.executionNotes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Content marketing free'),
      ]),
    );
    expect(plan.actionPresets[2]?.tool).toBe('creator_mode');
  });

  it('shapes runtime defaults more directly for technical operator profiles', () => {
    const route = makeRoute({
      origin: 'idea_only',
      intent: 'bootstrap',
      scenarioId: 'B1',
      scenarioLabel: 'Bootstrap from idea or brand',
      recommendedWizard: 'new-site-lite-wizard',
      userPosture: 'technical',
      recommendedSkillProfile: {
        id: 'bootstrap-technical',
        label: 'bootstrap technical',
        summary: 'Operator-leaning bootstrap flow.',
        explanationStyle: 'direct_operator',
        operatorControl: 'high',
      },
      recommendedStackProfile: {
        id: 'fsp-1-minimal-guided-baseline',
        label: 'Minimal guided baseline',
        summary: 'Minimal baseline.',
        baselineStack: ['WordPress', 'Hello Theme', 'Elementor Free'],
        addonProfile: 'none',
        addonRationale: 'Stay simple first.',
        upgradePath: ['Stay on Free first'],
        supportConfidence: 'high',
      },
    });

    const plan = buildNewSiteLiteWizardPlan({
      route,
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(plan.actionPresets[0]?.args).toEqual(expect.objectContaining({
      user_role: 'agency-operator',
      site_purpose: 'new-site',
    }));
    expect(plan.actionPresets[1]?.executionNotes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('focus list explicit'),
      ]),
    );
    expect(plan.actionPresets[2]?.args).toEqual(expect.objectContaining({
      sections: ['hero', 'about', 'services', 'cta', 'faq'],
    }));
  });

  it('uses optimization-lite as the runtime family for refresh and clean-up', () => {
    const refreshPlan = buildOptimizationLiteWizardPlan({
      route: makeRoute({
        origin: 'existing_elementor_site',
        intent: 'refresh',
        scenarioId: 'E2',
        scenarioLabel: 'Refresh',
        recommendedWizard: 'optimization-lite-wizard',
      }),
      assessment: makeAssessment(),
      context: makeContext(),
    });

    const cleanupPlan = buildOptimizationLiteWizardPlan({
      route: makeRoute({
        origin: 'existing_elementor_site',
        intent: 'clean_up',
        scenarioId: 'E1',
        scenarioLabel: 'Clean-up',
        recommendedWizard: 'optimization-lite-wizard',
      }),
      assessment: makeAssessment(),
      context: makeContext(),
    });

    expect(refreshPlan.summary).toContain('refresh');
    expect(cleanupPlan.summary).toContain('cleanup');
    expect(refreshPlan.phases[0]?.label).toContain('refresh');
    expect(cleanupPlan.phases[0]?.label).toContain('cleanup');
  });

  it('marks deeper relaunch work as an Advanced handoff after lite stabilization', () => {
    const route = makeRoute({
      origin: 'existing_elementor_site',
      intent: 'relaunch',
      depth: 'moderate',
      scenarioId: 'E6',
      scenarioLabel: 'Relaunch',
      recommendedWizard: 'deep-relaunch-wizard',
      recommendedTier: 'advanced',
    });
    const plan = buildRelaunchLiteWizardPlan({
      route,
      assessment: makeAssessment({
        pages: { elementor_total: 3, by_post_type: { page: 3, post: 1 } },
      }),
      context: makeContext(),
    });

    expect(plan.kind).toBe('relaunch-lite');
    expect(plan.phases.map((phase) => phase.id)).toEqual(['protect', 'stabilize', 'handoff']);
    expect(plan.upgradeSignal).toContain('Advanced');
    expect(plan.phases[2]?.suggestedTools).toContain('get_advanced_recommendations');
    expect(plan.operativeHandoffs[0]?.tool).toBe('save_full_page_as_template');
    expect(plan.operativeHandoffs[2]?.tool).toBe('get_advanced_recommendations');
    expect(plan.actionPresets[0]?.tool).toBe('save_full_page_as_template');
    expect(plan.actionPresets[1]?.tool).toBe('explain_recommendation');
    expect(plan.actionPresets[2]?.tool).toBe('get_advanced_recommendations');
  });
});
