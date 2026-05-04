import { describe, expect, it } from 'vitest';
import {
  findUnassignedToolNames,
  getToolTierAssignment,
  REGISTERED_TOOL_NAMES,
  TIER_BOUNDARY_CASES,
  TOOL_TIER_ASSIGNMENTS,
} from '../product-tiers.js';

describe.skip('product tier assignments', () => {
  it('covers every registered MCP tool name', () => {
    expect(findUnassignedToolNames()).toEqual([]);
    expect(TOOL_TIER_ASSIGNMENTS).toHaveLength(REGISTERED_TOOL_NAMES.length);
  });

  it('has no duplicate tool ids', () => {
    const ids = TOOL_TIER_ASSIGNMENTS.map((assignment) => assignment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps core guidance and local library workflows in Free', () => {
    expect(getToolTierAssignment('assess_site')?.tier).toBe('free');
    expect(getToolTierAssignment('get_recommendations')?.tier).toBe('free');
    expect(getToolTierAssignment('route_intent_wizard')?.tier).toBe('free');
    expect(getToolTierAssignment('plan_stack_bootstrap')?.tier).toBe('free');
    expect(getToolTierAssignment('wizard_new_site_lite')?.tier).toBe('free');
    expect(getToolTierAssignment('wizard_stack_bootstrap')?.tier).toBe('free');
    expect(getToolTierAssignment('wizard_relaunch_lite')?.tier).toBe('free');
    expect(getToolTierAssignment('wizard_optimization_lite')?.tier).toBe('free');
    expect(getToolTierAssignment('wizard_extension_lite')?.tier).toBe('free');
    expect(getToolTierAssignment('run_free_wizard_preset')?.tier).toBe('free');
    expect(getToolTierAssignment('run_free_guided_transition')?.tier).toBe('free');
    expect(getToolTierAssignment('creator_mode')?.tier).toBe('free');
    expect(getToolTierAssignment('compose_page_from_templates')?.tier).toBe('free');
  });

  it('keeps deeper workflow and governance surfaces in Advanced', () => {
    expect(getToolTierAssignment('wizard_theme_builder')?.tier).toBe('advanced');
    expect(getToolTierAssignment('plan_brand_adaptation')?.tier).toBe('advanced');
    expect(getToolTierAssignment('get_advanced_recommendations')?.tier).toBe('advanced');
    expect(getToolTierAssignment('plan_advanced_upgrade_path')?.tier).toBe('advanced');
    expect(getToolTierAssignment('route_advanced_scenario')?.tier).toBe('advanced');
    expect(getToolTierAssignment('advanced_creator_mode')?.tier).toBe('advanced');
    expect(getToolTierAssignment('list_premium_library_assets')?.tier).toBe('advanced');
    expect(getToolTierAssignment('inspect_premium_library_asset')?.tier).toBe('advanced');
    expect(getToolTierAssignment('plan_premium_library_usage')?.tier).toBe('advanced');
    expect(getToolTierAssignment('import_premium_library_asset')?.tier).toBe('advanced');
    expect(getToolTierAssignment('plan_premium_library_usage')?.visibility).toBe('private');
    expect(getToolTierAssignment('critique_elementor_output')?.tier).toBe('advanced');
    expect(getToolTierAssignment('queue_change')?.tier).toBe('advanced');
  });

  it('keeps orchestration seed work in studio_future', () => {
    expect(getToolTierAssignment('suggest_pipeline_path')?.tier).toBe('studio_future');
  });

  it('documents boundary cases for future review', () => {
    expect(TIER_BOUNDARY_CASES.map((item) => item.id)).toContain('theme-builder-boundary');
    expect(TIER_BOUNDARY_CASES.map((item) => item.id)).toContain('control-plane-seed');
    expect(TIER_BOUNDARY_CASES.map((item) => item.id)).toContain('bootstrap-front-door');
    expect(TIER_BOUNDARY_CASES.map((item) => item.id)).toContain('free-runtime-wizard-families');
    expect(TIER_BOUNDARY_CASES.map((item) => item.id)).toContain('advanced-scenario-front-door');
  });
});
