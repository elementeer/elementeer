import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerContentTools } from '../../tools/content.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    createChange:         vi.fn().mockResolvedValue({ id: 'chg_test', created_at: '2026-03-30T10:00:00+00:00', status: 'pending', operation: 'update_template_data', params: {}, note: '', before_state: null, reviewed_at: null, review_note: null, applied_at: null }),
    listChanges:          vi.fn().mockResolvedValue({ changes: [], total: 0 }),
    getChange:            vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    updateChangeStatus:   vi.fn().mockResolvedValue({ id: 'chg_test', status: 'approved' }),
    setGlobalColors:      vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography:  vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    setLogo:              vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext:       vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    getTemplateData: vi.fn().mockResolvedValue({ id: 1, elementor_data: [] }),
    updateTemplateData: vi.fn().mockResolvedValue({ id: 1, updated: true }),
    getSiteInfo: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Content tools', () => {
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

    registerContentTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_template_data', () => {
    it('calls getTemplateData with the given ID', async () => {
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({
        id: 15,
        elementor_data: [{ id: 'abc', elType: 'section', elements: [] }],
      });

      await callTool('get_template_data', { id: 15 });
      expect(client.getTemplateData).toHaveBeenCalledWith(15);
    });

    it('returns raw elementor_data as formatted JSON', async () => {
      const data = [{ id: 'abc', elType: 'section', elements: [] }];
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({ id: 1, elementor_data: data });

      const result = await callTool('get_template_data', { id: 1 });
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed).toEqual(data);
    });

    it('returns empty array JSON when template has no data', async () => {
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({ id: 1, elementor_data: [] });

      const result = await callTool('get_template_data', { id: 1 });
      expect(JSON.parse(result.content[0]!.text)).toEqual([]);
    });
  });

  describe('update_template_data', () => {
    it('parses JSON string and queues change for review (governance level L2)', async () => {
      const data = [{ id: 'x', elType: 'container', elements: [] }];
      const jsonStr = JSON.stringify(data);

      await callTool('update_template_data', { id: 3, elementor_data: jsonStr });

      expect(client.createChange).toHaveBeenCalledWith({
        operation: 'update_template_data',
        params: { id: 3, elementor_data: jsonStr },
        note: 'Auto-queued by governance level L2',
      });
      expect(client.updateTemplateData).not.toHaveBeenCalled();
    });

    it('returns queued change summary with element count', async () => {
      const data = [
        { id: 'a', elType: 'section', elements: [] },
        { id: 'b', elType: 'section', elements: [] },
      ];
      const result = await callTool('update_template_data', {
        id: 3,
        elementor_data: JSON.stringify(data),
      });
      const text = result.content[0]!.text;
      expect(text).toContain('🟡 Change queued for review (governance level L2)');
      expect(text).toContain('ID: chg_test');
      expect(text).toContain('Operation: update_template_data');
      expect(text).toContain('Next steps:');
    });

    it('includes note in queued change when provided', async () => {
      const data = [{ id: 'x', elType: 'container', elements: [] }];
      const jsonStr = JSON.stringify(data);

      await callTool('update_template_data', { 
        id: 3, 
        elementor_data: jsonStr,
        note: 'Custom note' 
      });

      expect(client.createChange).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Custom note',
        })
      );
    });

    it('returns error when elementor_data is invalid JSON', async () => {
      const result = await callTool('update_template_data', {
        id: 3,
        elementor_data: '{invalid json',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('valid JSON');
      expect(client.createChange).not.toHaveBeenCalled();
    });

    it('returns error when elementor_data is a JSON object (not array)', async () => {
      const result = await callTool('update_template_data', {
        id: 3,
        elementor_data: JSON.stringify({ not: 'an array' }),
      });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('JSON array');
      expect(client.createChange).not.toHaveBeenCalled();
    });

    it('does not call createChange when JSON is invalid', async () => {
      await callTool('update_template_data', { id: 3, elementor_data: 'bad json' });
      expect(client.createChange).not.toHaveBeenCalled();
    });
  });

  describe('extract_sections', () => {
    it('calls getTemplateData and returns section summary', async () => {
      const data = [
        {
          id: 'sec1',
          elType: 'section',
          elements: [
            { id: 'col1', elType: 'column', elements: [] },
            { id: 'col2', elType: 'column', elements: [] },
          ],
        },
        {
          id: 'sec2',
          elType: 'container',
          elements: [
            { id: 'btn1', elType: 'widget', widgetType: 'button', elements: [] },
          ],
        },
      ];

      vi.mocked(client.getTemplateData).mockResolvedValueOnce({ id: 5, elementor_data: data });

      const result = await callTool('extract_sections', { id: 5 });
      const sections = JSON.parse(result.content[0]!.text);

      expect(sections).toHaveLength(2);

      // First section
      expect(sections[0]).toMatchObject({
        index: 0,
        id: 'sec1',
        elType: 'section',
        child_count: 2,
      });
      expect(sections[0].children_types).toContain('column');

      // Second section (container)
      expect(sections[1]).toMatchObject({
        index: 1,
        id: 'sec2',
        elType: 'container',
        child_count: 1,
      });
    });

    it('returns message when template has no elementor data', async () => {
      vi.mocked(client.getTemplateData).mockResolvedValueOnce({ id: 5, elementor_data: [] });

      const result = await callTool('extract_sections', { id: 5 });
      expect(result.content[0]!.text).toContain('no Elementor data');
    });

    it('deduplicates children_types using Set', async () => {
      const data = [
        {
          id: 'sec1',
          elType: 'section',
          elements: [
            { id: 'c1', elType: 'column', elements: [] },
            { id: 'c2', elType: 'column', elements: [] },
            { id: 'c3', elType: 'column', elements: [] },
          ],
        },
      ];

      vi.mocked(client.getTemplateData).mockResolvedValueOnce({ id: 1, elementor_data: data });
      const result = await callTool('extract_sections', { id: 1 });
      const sections = JSON.parse(result.content[0]!.text);

      // Should have 'column' only once even though there are 3 columns
      expect(sections[0].children_types).toEqual(['column']);
    });
  });
});
