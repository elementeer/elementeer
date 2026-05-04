import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../../client.js';
import { FREE_PRODUCT_SURFACE } from '../../product-surfaces.js';
import {
  registerAdvancedTools,
  registerAllTools,
  registerFreeTools,
  registerStudioFutureTools,
} from '../../tools/index.js';

function makeClient(): ElementifyClient {
  return {} as ElementifyClient;
}

describe.skip('tiered tool registration', () => {
  let server: McpServer;
  let getClient: (siteId?: string) => ElementifyClient;
  let registered: string[];

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    getClient = vi.fn().mockReturnValue(makeClient());
    registered = [];

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      registered.push(args[0] as string);
      return server as any;
    });
  });

  it('registerFreeTools excludes advanced and studio-future surfaces', () => {
    registerFreeTools(server, getClient);

    expect([...registered].sort()).toEqual([...FREE_PRODUCT_SURFACE.primaryTools].sort());
    expect(registered).toContain('assess_site');
    expect(registered).toContain('creator_mode');
    expect(registered).toContain('route_intent_wizard');
    expect(registered).toContain('plan_stack_bootstrap');
    expect(registered).toContain('wizard_stack_bootstrap');
    expect(registered).toContain('wizard_relaunch_lite');
    expect(registered).toContain('wizard_optimization_lite');
    expect(registered).not.toContain('wizard_theme_builder');
    expect(registered).not.toContain('plan_brand_adaptation');
    expect(registered).not.toContain('get_advanced_recommendations');
    expect(registered).not.toContain('advanced_creator_mode');
    expect(registered).not.toContain('plan_premium_library_usage');
    expect(registered).not.toContain('import_premium_library_asset');
    expect(registered).not.toContain('suggest_pipeline_path');
  });

  it('registerAdvancedTools isolates deeper private workflows', () => {
    registerAdvancedTools(server, getClient);

    expect(registered).toContain('list_premium_library_assets');
    expect(registered).toContain('inspect_premium_library_asset');
    expect(registered).toContain('wizard_theme_builder');
    expect(registered).toContain('plan_brand_adaptation');
    expect(registered).toContain('get_advanced_recommendations');
    expect(registered).toContain('plan_advanced_upgrade_path');
    expect(registered).toContain('route_advanced_scenario');
    expect(registered).toContain('advanced_creator_mode');
    expect(registered).toContain('plan_premium_library_usage');
    expect(registered).toContain('import_premium_library_asset');
    expect(registered).toContain('critique_elementor_output');
    expect(registered).not.toContain('assess_site');
    expect(registered).not.toContain('creator_mode');
    expect(registered).not.toContain('suggest_pipeline_path');
  });

  it('registerStudioFutureTools only registers orchestration seed work', () => {
    registerStudioFutureTools(server, getClient);

    expect(registered).toEqual(['suggest_pipeline_path']);
  });

  it.skip('registerAllTools can build a free-only surface', () => {
    registerAllTools(server, getClient, {
      includeAdvanced: false,
      includeStudioFuture: false,
    });

    expect([...registered].sort()).toEqual([...FREE_PRODUCT_SURFACE.primaryTools].sort());
    expect(registered).toContain('get_recommendations');
    expect(registered).toContain('route_intent_wizard');
    expect(registered).toContain('wizard_stack_bootstrap');
    expect(registered).not.toContain('wizard_theme_builder');
    expect(registered).not.toContain('get_advanced_recommendations');
    expect(registered).not.toContain('advanced_creator_mode');
    expect(registered).not.toContain('plan_premium_library_usage');
    expect(registered).not.toContain('import_premium_library_asset');
    expect(registered).not.toContain('suggest_pipeline_path');
  });

  it('registerAllTools preserves the current full registration by default', () => {
    registerAllTools(server, getClient);

    expect(registered).toContain('get_recommendations');
    expect(registered).toContain('get_advanced_recommendations');
    expect(registered).toContain('plan_advanced_upgrade_path');
    expect(registered).toContain('route_advanced_scenario');
    expect(registered).toContain('advanced_creator_mode');
    expect(registered).toContain('wizard_theme_builder');
    expect(registered).toContain('suggest_pipeline_path');
  });
});
