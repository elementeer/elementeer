import { describe, expect, it } from 'vitest';
import {
  ADVANCED_PRODUCT_SURFACE,
  FREE_PRODUCT_SURFACE,
} from '../product-surfaces.js';

describe('product surface manifests', () => {
  it('defines a public Free surface with local-library-first scope', () => {
    expect(FREE_PRODUCT_SURFACE.tier).toBe('free');
    expect(FREE_PRODUCT_SURFACE.positioning).toContain('free');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('get_recommendations');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('creator_mode');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('wizard_new_site_lite');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('wizard_stack_bootstrap');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('wizard_relaunch_lite');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('wizard_optimization_lite');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('wizard_extension_lite');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('run_free_wizard_preset');
    expect(FREE_PRODUCT_SURFACE.primaryTools).toContain('run_free_guided_transition');
    expect(FREE_PRODUCT_SURFACE.primaryTools).not.toContain('wizard_theme_builder');
    expect(FREE_PRODUCT_SURFACE.primaryTools).not.toContain('plan_premium_library_usage');
    expect(FREE_PRODUCT_SURFACE.excludes).toContain('Premium Elementify Library access');
  });

  it('defines a private Advanced surface with deeper workflow depth', () => {
    expect(ADVANCED_PRODUCT_SURFACE.tier).toBe('advanced');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('wizard_theme_builder');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('route_advanced_scenario');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('advanced_creator_mode');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('plan_brand_adaptation');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('get_advanced_recommendations');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('plan_advanced_upgrade_path');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('plan_premium_library_usage');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).toContain('import_premium_library_asset');
    expect(ADVANCED_PRODUCT_SURFACE.primaryTools).not.toContain('get_recommendations');
    expect(ADVANCED_PRODUCT_SURFACE.notes.join(' ')).toContain('Forgejo');
  });

  it('keeps cloud promises out of Free and Studio promises out of Advanced', () => {
    expect(FREE_PRODUCT_SURFACE.excludes).toContain('Cloud library, orchestration, or cross-site delivery promises');
    expect(ADVANCED_PRODUCT_SURFACE.excludes).toContain('Studio cloud library');
  });

  it('models premium library as an Advanced surface without requiring tool ids yet', () => {
    const freeFrontDoorWorkflow = FREE_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'free-front-door',
    );
    const premiumWorkflow = ADVANCED_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'advanced-premium-library',
    );
    const advancedFrontDoor = ADVANCED_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'advanced-front-door',
    );
    const advancedUpgradeGuidance = ADVANCED_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'advanced-upgrade-guidance',
    );
    const critiqueWorkflow = ADVANCED_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'advanced-brand-and-critique',
    );
    const themeBuilderWorkflow = ADVANCED_PRODUCT_SURFACE.workflows.find(
      (workflow) => workflow.id === 'advanced-theme-builder',
    );

    expect(freeFrontDoorWorkflow?.toolIds).toContain('wizard_stack_bootstrap');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('wizard_new_site_lite');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('wizard_relaunch_lite');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('wizard_optimization_lite');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('wizard_extension_lite');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('run_free_wizard_preset');
    expect(freeFrontDoorWorkflow?.toolIds).toContain('run_free_guided_transition');
    expect(advancedFrontDoor).toBeDefined();
    expect(advancedFrontDoor?.toolIds).toContain('route_advanced_scenario');
    expect(advancedFrontDoor?.toolIds).toContain('advanced_creator_mode');
    expect(advancedUpgradeGuidance).toBeDefined();
    expect(advancedUpgradeGuidance?.toolIds).toContain('plan_advanced_upgrade_path');
    expect(premiumWorkflow).toBeDefined();
    expect(premiumWorkflow?.toolIds).toEqual([
      'route_advanced_scenario',
      'advanced_creator_mode',
      'list_premium_library_assets',
      'inspect_premium_library_asset',
      'plan_premium_library_usage',
      'import_premium_library_asset',
    ]);
    expect(premiumWorkflow?.notes?.[0]).toContain('browse -> inspect -> plan -> import');
    expect(critiqueWorkflow?.toolIds).toContain('get_advanced_recommendations');
    expect(themeBuilderWorkflow?.toolIds).toContain('advanced_creator_mode');
  });
});
