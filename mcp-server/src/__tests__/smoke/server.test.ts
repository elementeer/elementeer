/**
 * Smoke tests: MCP server initializes and registers all expected tools.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../tools/index.js';
import type { ElementifyClient } from '../../client.js';

const EXPECTED_TOOLS = [
  // Library
  'list_templates',
  'get_template',
  'create_template',
  'update_template',
  'delete_template',
  'rename_template',
  'duplicate_template',
  'bulk_rename',
  // Content
  'get_template_data',
  'update_template_data',
  'extract_sections',
  // Organization
  'list_by_type',
  'set_category',
  'set_tags',
  'audit_library',
  // Site
  'get_site_info',
  'list_sites',
  'switch_site',
] as const;

describe('MCP server smoke tests', () => {
  let server: McpServer;
  let registeredTools: string[];

  beforeEach(() => {
    server = new McpServer({ name: 'elementify-mcp', version: '0.1.0' });
    registeredTools = [];

    // Spy on tool() to capture all registrations
    const originalTool = server.tool.bind(server);
    // @ts-ignore — we're intentionally intercepting the call
    server.tool = (name: string, ...rest: unknown[]) => {
      registeredTools.push(name);
      return (originalTool as Function)(name, ...rest);
    };

    const mockGetClient = (): ElementifyClient => {
      return {
        listTemplates: async () => ({ templates: [], total: 0, total_pages: 1 }),
        getTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
        createTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
        updateTemplate: async () => ({ id: 1, title: '', type: 'page', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
        deleteTemplate: async () => ({ deleted: true, id: 1 }),
        duplicateTemplate: async () => ({ id: 2, title: '', type: 'page', status: 'draft', author: 1, date: '', modified: '', categories: [], tags: [] }),
        getTemplateData: async () => ({ id: 1, elementor_data: [] }),
        updateTemplateData: async () => ({ id: 1, updated: true }),
        getSiteInfo: async () => ({ name: '', url: '', wp_version: '', elementor_version: null, elementor_pro: false, activation_mode: 'standalone-free', template_count: 0, capabilities: [] }),
      } as unknown as ElementifyClient;
    };

    registerAllTools(server, mockGetClient);
  });

  it('initializes without throwing', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(McpServer);
  });

  it('registers all expected tools', () => {
    for (const toolName of EXPECTED_TOOLS) {
      expect(registeredTools).toContain(toolName);
    }
  });

  it(`registers exactly ${EXPECTED_TOOLS.length} tools (no missing, no unexpected duplicates)`, () => {
    // Each tool should be registered exactly once
    const counts = registeredTools.reduce(
      (acc, name) => {
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const name of EXPECTED_TOOLS) {
      expect(counts[name], `Tool "${name}" should be registered exactly once`).toBe(1);
    }

    expect(registeredTools.length).toBe(EXPECTED_TOOLS.length);
  });

  it.each(EXPECTED_TOOLS)('tool "%s" is registered', (toolName) => {
    expect(registeredTools).toContain(toolName);
  });
});
