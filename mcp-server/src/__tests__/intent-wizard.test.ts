import { describe, expect, it } from 'vitest';
import { deriveStackReadinessSignals, routeIntentWizard } from '../intent-wizard.js';
import type { IntentWizardInput } from '../client.js';

function makeInput(overrides: Partial<IntentWizardInput> = {}): IntentWizardInput {
  return {
    origin: 'wordpress_without_elementor',
    intent: 'bootstrap',
    depth: 'moderate',
    userPosture: 'guided',
    preservationPriorities: ['keep current content'],
    constraints: ['free_only'],
    stackReadiness: {
      wordpressPresent: true,
      elementorInstalled: false,
      elementorProInstalled: false,
      helloThemeInstalled: null,
      currentTheme: 'Twenty Twenty-Five',
      knownAddons: [],
    },
    ...overrides,
  };
}

describe('intent wizard routing', () => {
  it('routes WordPress without Elementor into a bootstrap free path', () => {
    const route = routeIntentWizard(makeInput());

    expect(route.scenarioId).toBe('B2');
    expect(route.recommendedTier).toBe('free');
    expect(route.recommendedWizard).toBe('stack-bootstrap-wizard');
    expect(route.recommendedStackProfile.id).toBe('fsp-3-brownfield-staged-transition');
    expect(route.recommendedSkillProfile.id).toBe('bootstrap-guided');
    expect(route.recommendedAddonProfile.id).toBe('none');
    expect(route.suggestedTools).toContain('get_destination_capabilities');
  });

  it('routes idea-only starts into the new-site-lite free path', () => {
    const route = routeIntentWizard(makeInput({
      origin: 'idea_only',
      intent: 'bootstrap',
      depth: 'light',
      userPosture: 'guided',
      constraints: ['free_only'],
      stackReadiness: {
        wordpressPresent: false,
        elementorInstalled: false,
        elementorProInstalled: false,
        helloThemeInstalled: null,
        currentTheme: null,
        knownAddons: [],
      },
    }));

    expect(route.scenarioId).toBe('B1');
    expect(route.recommendedTier).toBe('free');
    expect(route.recommendedWizard).toBe('new-site-lite-wizard');
    expect(route.suggestedTools).toContain('wizard_new_site_lite');
  });

  it('routes deep relaunch work toward advanced', () => {
    const route = routeIntentWizard(makeInput({
      origin: 'existing_elementor_site',
      intent: 'relaunch',
      depth: 'deep',
      userPosture: 'technical',
      constraints: [],
      stackReadiness: {
        wordpressPresent: true,
        elementorInstalled: true,
        elementorProInstalled: true,
        helloThemeInstalled: true,
        currentTheme: 'Hello Elementor',
        knownAddons: ['seo'],
      },
    }));

    expect(route.scenarioId).toBe('E6');
    expect(route.recommendedTier).toBe('advanced');
    expect(route.recommendedWizard).toBe('deep-relaunch-wizard');
    expect(route.recommendedStackProfile.id).toBe('asp-3-deep-relaunch-migration');
    expect(route.recommendedSkillProfile.id).toBe('relaunch-technical');
    expect(route.suggestedTools).toContain('get_advanced_recommendations');
  });

  it('routes extension with a partial stack to a curated free addon profile', () => {
    const route = routeIntentWizard(makeInput({
      origin: 'existing_elementor_site',
      intent: 'extension',
      depth: 'light',
      userPosture: 'assisted',
      constraints: [],
      stackReadiness: {
        wordpressPresent: true,
        elementorInstalled: true,
        elementorProInstalled: false,
        helloThemeInstalled: true,
        currentTheme: 'Hello Elementor',
        knownAddons: [],
      },
    }));

    expect(route.recommendedTier).toBe('free');
    expect(route.recommendedStackProfile.id).toBe('fsp-2-curated-free-addon');
    expect(route.recommendedAddonProfile.id).toBe('content-marketing-free');
    expect(route.recommendedSkillProfile.id).toBe('extension-assisted');
    expect(route.recommendedWizard).toBe('extension-lite-wizard');
    expect(route.suggestedTools).toContain('wizard_extension_lite');
  });

  it('maps refresh and clean_up into optimization-lite runtime behavior', () => {
    const refreshRoute = routeIntentWizard(makeInput({
      origin: 'existing_elementor_site',
      intent: 'refresh',
      depth: 'light',
      constraints: ['free_only'],
      stackReadiness: {
        wordpressPresent: true,
        elementorInstalled: true,
        elementorProInstalled: false,
        helloThemeInstalled: true,
        currentTheme: 'Hello Elementor',
        knownAddons: [],
      },
    }));

    const cleanupRoute = routeIntentWizard(makeInput({
      origin: 'existing_elementor_site',
      intent: 'clean_up',
      depth: 'light',
      constraints: ['free_only'],
      stackReadiness: {
        wordpressPresent: true,
        elementorInstalled: true,
        elementorProInstalled: false,
        helloThemeInstalled: true,
        currentTheme: 'Hello Elementor',
        knownAddons: [],
      },
    }));

    expect(refreshRoute.recommendedWizard).toBe('optimization-lite-wizard');
    expect(cleanupRoute.recommendedWizard).toBe('optimization-lite-wizard');
    expect(refreshRoute.suggestedTools).toContain('wizard_optimization_lite');
    expect(cleanupRoute.suggestedTools).toContain('wizard_optimization_lite');
  });

  it('derives stack readiness from site info and assessment', () => {
    const readiness = deriveStackReadinessSignals(
      {
        name: 'Demo',
        url: 'https://example.com',
        wp_version: '6.8',
        elementor_version: '3.28.0',
        elementor_pro: false,
        activation_mode: 'standalone-free',
        template_count: 4,
        capabilities: ['site-audit:read'],
      },
      {
        assessed_at: '2026-04-12T00:00:00Z',
        wordpress: {
          version: '6.8',
          language: 'en_US',
          timezone: 'UTC',
          is_multisite: false,
          site_name: 'Demo',
          site_tagline: 'Tagline',
          admin_url: 'https://example.com/wp-admin',
        },
        elementor: {
          version: '3.28.0',
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
        theme_builder: {},
        template_library: {
          total: 4,
          by_type: { section: 2 },
          uncategorized: 1,
          published: 4,
          draft: 0,
        },
        pages: {
          elementor_total: 1,
          by_post_type: { page: 1 },
        },
        performance: {
          css_print_method: 'internal',
          optimized_dom: false,
          load_fa4_shim: false,
        },
        plugins: {
          active_count: 3,
          classified: { seo: ['wordpress-seo'], multilingual: ['polylang'] },
          woocommerce: false,
          multilingual: true,
        },
        custom_post_types: [],
        user_roles: ['administrator'],
        issues: [],
        issues_count: { critical: 0, warning: 0, info: 0 },
      },
      {},
    );

    expect(readiness.wordpressPresent).toBe(true);
    expect(readiness.elementorInstalled).toBe(true);
    expect(readiness.knownAddons).toEqual(expect.arrayContaining(['seo', 'multilingual']));
  });
});
