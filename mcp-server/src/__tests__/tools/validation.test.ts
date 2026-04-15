import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildImportReport } from '../../validation.js';
import { registerValidationTools } from '../../tools/validation.js';
import type { ElementifyClient, ImportReport } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getTemplate: vi.fn().mockResolvedValue({
      id: 42,
      title: 'Homepage Hero',
      type: 'container',
      status: 'publish',
      author: 1,
      date: '',
      modified: '',
      categories: [],
      tags: [],
    }),
    getTemplateData: vi.fn().mockResolvedValue({
      id: 42,
      elementor_data: [
        { id: 'hero', elType: 'container', elements: [{ id: 'w1', widgetType: 'heading' }] },
      ],
    }),
    getPageData: vi.fn().mockResolvedValue({
      post_id: 7,
      post_title: 'Landing Page',
      element_count: 1,
      elementor_data: [
        { id: 'page-root', elType: 'container', elements: [] },
      ],
    }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('buildImportReport', () => {
  it('passes clean structured Elementor data', () => {
    const report = buildImportReport({
      sourceType: 'raw',
      sourceRef: 'raw:test',
      title: 'Payload',
      elementorData: [
        { id: 'root', elType: 'container', elements: [{ id: 'widget-1', widgetType: 'heading' }] },
      ],
    });

    expect(report.validationResult).toBe('pass');
    expect(report.templateMetadata.topLevelCount).toBe(1);
    expect(report.templateMetadata.widgetCount).toBe(1);
    expect(report.smokeTestPlan.readiness).toBe('ready-for-manual-smoke');
  });

  it('warns on missing ids and missing type hints', () => {
    const report = buildImportReport({
      sourceType: 'raw',
      sourceRef: 'raw:test',
      title: 'Payload',
      elementorData: [
        { elements: [{}] },
      ],
    });

    expect(report.validationResult).toBe('warn');
    expect(report.warnings.some((warning: ImportReport['warnings'][number]) => warning.includes('missing a stable id'))).toBe(true);
    expect(report.warnings.some((warning: ImportReport['warnings'][number]) => warning.includes('missing elType/widgetType'))).toBe(true);
  });

  it('fails non-array payloads', () => {
    const report = buildImportReport({
      sourceType: 'raw',
      sourceRef: 'raw:test',
      title: 'Payload',
      elementorData: { invalid: true },
    });

    expect(report.validationResult).toBe('fail');
    expect(report.warnings).toContain('Elementor data is not an array.');
  });
});

describe('validate_elementor_write tool', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);
    handlers = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      handlers.set(args[0] as string, args[args.length - 1] as any);
      return server as any;
    });

    registerValidationTools(server, getClient);
  });

  it('validates template-based Elementor data', async () => {
    const handler = handlers.get('validate_elementor_write');
    if (!handler) throw new Error('validate_elementor_write not registered');

    const result = await handler({ source_type: 'template', source_id: 42 });
    const text = result.content[0]!.text;

    expect(client.getTemplate).toHaveBeenCalledWith(42);
    expect(client.getTemplateData).toHaveBeenCalledWith(42);
    expect(text).toContain('template:42');
    expect(text).toContain('Result: pass');
  });

  it('validates raw Elementor JSON', async () => {
    const handler = handlers.get('validate_elementor_write');
    if (!handler) throw new Error('validate_elementor_write not registered');

    const result = await handler({
      source_type: 'raw',
      title: 'Manual Payload',
      elementor_data: JSON.stringify([{ id: 'root', elType: 'container', elements: [] }]),
    });

    const text = result.content[0]!.text;
    expect(text).toContain('raw:Manual Payload');
    expect(text).toContain('Top-level elements: 1');
    expect(text).toContain('## Smoke Test Plan');
    expect(text).toContain('Readiness: ready-for-manual-smoke');
  });

  it('returns an error for invalid raw JSON', async () => {
    const handler = handlers.get('validate_elementor_write');
    if (!handler) throw new Error('validate_elementor_write not registered');

    const result = await handler({
      source_type: 'raw',
      elementor_data: '{invalid json',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('must be valid JSON');
  });
});
