import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerImportExportTools } from '../../tools/import-export.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    createChange: vi.fn().mockResolvedValue({
      id: 'change-123',
      operation: 'import_external_data',
      status: 'pending',
      note: 'Test import',
    }),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Import/Export tools', () => {
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

    registerImportExportTools(server, getClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('import_external_data', () => {
    it('calls createChange with correct parameters and returns queued message', async () => {
      const result = await callTool('import_external_data', {
        site_id: 'test-site',
        format: 'json',
        data: '{"title":"Test"}',
        post_type: 'post',
        field_mapping: { title: 'post_title' },
        duplicate_detection: 'title',
        dry_run: false,
        note: 'Import test data',
      });
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'import_external_data',
        params: {
          format: 'json',
          data: '{"title":"Test"}',
          post_type: 'post',
          field_mapping: { title: 'post_title' },
          duplicate_detection: 'title',
          dry_run: false,
        },
        note: 'Import test data',
      });
      expect(result.content[0].text).toContain('🟡 External data import queued for review (governance level L2)');
      expect(result.content[0].text).toContain('ID: change-123');
      expect(result.content[0].text).toContain('Operation: import_external_data');
      expect(result.content[0].text).toContain('Format: json');
      expect(result.content[0].text).toContain('Post type: post');
      expect(result.content[0].text).toContain('Duplicate detection: title');
      expect(result.content[0].text).toContain('Data size: 16 bytes');
    });

    it('handles dry_run flag', async () => {
      const result = await callTool('import_external_data', {
        format: 'csv',
        data: 'col1,col2\nval1,val2',
        post_type: 'product',
        duplicate_detection: 'sku',
        dry_run: true,
      });
      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'import_external_data',
        params: {
          format: 'csv',
          data: 'col1,col2\nval1,val2',
          post_type: 'product',
          duplicate_detection: 'sku',
          dry_run: true,
          field_mapping: undefined,
        },
        note: 'Import product from csv data (19 bytes)',
      });
      expect(result.content[0].text).toContain('DRY RUN: No changes will be applied until approved and executed.');
    });

    it('requires consent for L3 operations (should not happen for import_external_data)', async () => {
      // Mock GOVERNANCE_LEVELS to return L3 for import_external_data to test consent requirement
      const originalLevels = await import('../../product-tiers.js');
      vi.spyOn(originalLevels, 'GOVERNANCE_LEVELS', 'get').mockReturnValue({
        import_external_data: 'L3',
      } as any);
      // Re-register tools with mocked governance levels
      registerImportExportTools(server, getClient);
      
      const result = await callTool('import_external_data', {
        format: 'json',
        data: '{}',
        post_type: 'post',
      });
      // Should require consent
      expect(result.content[0].text).toContain('requires explicit consent (governance level L3)');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.createChange).mockRejectedValueOnce(new Error('Queue error'));
      const result = await callTool('import_external_data', {
        format: 'json',
        data: '{}',
        post_type: 'post',
      });
      expect(result.content[0].text).toContain('❌ Error queuing external data import');
    });

    it('calculates correct data size in note', async () => {
      const data = 'a'.repeat(150);
      await callTool('import_external_data', {
        format: 'json',
        data,
        post_type: 'page',
      });
      expect(client.createChange).toHaveBeenCalledWith(
        expect.objectContaining({
          note: `Import page from json data (${data.length} bytes)`,
        })
      );
    });
  });
});