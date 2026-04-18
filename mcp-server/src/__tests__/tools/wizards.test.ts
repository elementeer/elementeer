/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerModuleWizards } from '../../tools/wizards.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getWizard: vi.fn().mockImplementation((wizardId: string) => {
      // Return a generic wizard result structure
      return Promise.resolve({
        status: 'active' as const,
        gaps: [
          { id: 'gap-1', severity: 'warning' as const, description: 'Missing configuration for feature X' },
          { id: 'gap-2', severity: 'info' as const, description: 'Consider enabling advanced settings' },
        ],
        recommendations: [
          { id: 'rec-1', priority: 'high' as const, title: 'Configure settings', description: 'Set up the missing configuration', action: 'configure', gap_id: 'gap-1' },
          { id: 'rec-2', priority: 'medium' as const, title: 'Enable advanced options', description: 'Enable advanced options for better performance', action: 'enable', gap_id: 'gap-2' },
        ],
        suggested_tools: [
          { tool: 'list_templates', purpose: 'List existing templates to assess current state', governance_level: 'L0' },
          { tool: 'set_global_colors', purpose: 'Configure brand colors', governance_level: 'L2' },
        ],
        suggested_plugins: [
          { slug: 'elementor', name: 'Elementor', reason: 'Required for page building' },
          { slug: 'wpml', name: 'WPML', reason: 'Multilingual support' },
        ],
      });
    }),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Module wizards', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      // The callback is always the last argument
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerModuleWizards(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('wizard_acf', () => {
    it('calls getWizard with "acf" and returns formatted output', async () => {
      const result = await callTool('wizard_acf', { site_id: 'test-site' });
      expect(client.getWizard).toHaveBeenCalledWith('acf');
      expect(result.content[0].text).toContain('# ACF Wizard');
      expect(result.content[0].text).toContain('**Status**: active');
      expect(result.content[0].text).toContain('## Gaps');
      expect(result.content[0].text).toContain('- WARNING: Missing configuration for feature X');
      expect(result.content[0].text).toContain('- INFO: Consider enabling advanced settings');
      expect(result.content[0].text).toContain('## Recommendations');
      expect(result.content[0].text).toContain('- HIGH: Configure settings — Set up the missing configuration');
      expect(result.content[0].text).toContain('- MEDIUM: Enable advanced options — Enable advanced options for better performance');
      expect(result.content[0].text).toContain('## Suggested MCP Tools');
      expect(result.content[0].text).toContain('- `list_templates`: List existing templates to assess current state (L0)');
      expect(result.content[0].text).toContain('- `set_global_colors`: Configure brand colors (L2)');
      expect(result.content[0].text).toContain('## Suggested Plugins');
      expect(result.content[0].text).toContain('- **Elementor** (elementor): Required for page building');
      expect(result.content[0].text).toContain('- **WPML** (wpml): Multilingual support');
    });

    it('handles missing suggested_tools and suggested_plugins gracefully', async () => {
      vi.mocked(client.getWizard).mockResolvedValueOnce({
        status: 'inactive',
        gaps: [],
        recommendations: [],
        suggested_tools: [],
        suggested_plugins: [],
      });
      const result = await callTool('wizard_acf', {});
      expect(result.content[0].text).not.toContain('## Suggested MCP Tools');
      expect(result.content[0].text).not.toContain('## Suggested Plugins');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getWizard).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('wizard_acf', {});
      expect(result.content[0].text).toContain('❌ Error running wizard');
    });
  });

  describe('wizard_forms', () => {
    it('calls getWizard with "forms"', async () => {
      const result = await callTool('wizard_forms', {});
      expect(client.getWizard).toHaveBeenCalledWith('forms');
      expect(result.content[0].text).toContain('# Forms Wizard');
    });
  });

  describe('wizard_comments', () => {
    it('calls getWizard with "comments"', async () => {
      const result = await callTool('wizard_comments', {});
      expect(client.getWizard).toHaveBeenCalledWith('comments');
      expect(result.content[0].text).toContain('# Comments Wizard');
    });
  });

  describe('wizard_multi', () => {
    it('calls getWizard with "multi"', async () => {
      const result = await callTool('wizard_multi', {});
      expect(client.getWizard).toHaveBeenCalledWith('multi');
      expect(result.content[0].text).toContain('# Multilingual Wizard');
    });
  });

  describe('wizard_plugin', () => {
    it('calls getWizard with "plugin"', async () => {
      const result = await callTool('wizard_plugin', {});
      expect(client.getWizard).toHaveBeenCalledWith('plugin');
      expect(result.content[0].text).toContain('# Plugin Stack Wizard');
    });
  });

  describe('wizard_export', () => {
    it('calls getWizard with "export"', async () => {
      const result = await callTool('wizard_export', {});
      expect(client.getWizard).toHaveBeenCalledWith('export');
      expect(result.content[0].text).toContain('# Import/Export Wizard');
    });
  });

  describe('wizard_health', () => {
    it('calls getWizard with "health"', async () => {
      const result = await callTool('wizard_health', {});
      expect(client.getWizard).toHaveBeenCalledWith('health');
      expect(result.content[0].text).toContain('# Site Health Wizard');
    });
  });

  describe('wizard_ally', () => {
    it('calls getWizard with "ally"', async () => {
      const result = await callTool('wizard_ally', {});
      expect(client.getWizard).toHaveBeenCalledWith('ally');
      expect(result.content[0].text).toContain('# Accessibility Wizard');
    });
  });

  describe('wizard_lms', () => {
    it('calls getWizard with "lms"', async () => {
      const result = await callTool('wizard_lms', {});
      expect(client.getWizard).toHaveBeenCalledWith('lms');
      expect(result.content[0].text).toContain('# LMS Wizard');
    });
  });

  describe('wizard_charity', () => {
    it('calls getWizard with "charity"', async () => {
      const result = await callTool('wizard_charity', {});
      expect(client.getWizard).toHaveBeenCalledWith('charity');
      expect(result.content[0].text).toContain('# Charity Wizard');
    });
  });


});