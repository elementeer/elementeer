import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllyTools } from '../../tools/ally.js';
import type { ElementifyClient, AllyStatus, AllyScanResults, AllyTriggerScanResponse, AllyApplyFixResponse } from '../../client.js';

function makeAllyStatus(overrides: Partial<AllyStatus> = {}): AllyStatus {
  return {
    ally_available: true,
    plugin: 'Elementor Ally',
    version: '2.0',
    tier: 'pro',
    credits_remaining: 100,
    capabilities: {
      scan: true,
      report: true,
      basic_fixes: true,
      ai_fixes: true,
      batch_scan: true,
      scheduled_scans: true,
      custom_rules: true,
    },
    ...overrides,
  };
}

function makeAllyScanResults(overrides: Partial<AllyScanResults> = {}): AllyScanResults {
  return {
    scans: [
      {
        id: 'scan_1',
        title: 'Homepage Scan',
        date: '2026-04-17T10:00:00Z',
        issues_count: 5,
        score: 85,
        url: 'https://example.com',
      },
      {
        id: 'scan_2',
        title: 'About Page Scan',
        date: '2026-04-16T14:30:00Z',
        issues_count: 12,
        score: 72,
        url: 'https://example.com/about',
      },
    ],
    last_scan: '2026-04-17T10:00:00Z',
    available_credits: 98,
    ally_status: makeAllyStatus(),
    message: 'Success',
    ...overrides,
  };
}

function makeAllyTriggerScanResponse(overrides: Partial<AllyTriggerScanResponse> = {}): AllyTriggerScanResponse {
  return {
    triggered: true,
    scan_id: 'scan_new_123',
    message: 'Scan triggered successfully',
    credits_required: 2,
    credits_remaining: 98,
    ally_status: makeAllyStatus(),
    ...overrides,
  };
}

function makeAllyApplyFixResponse(overrides: Partial<AllyApplyFixResponse> = {}): AllyApplyFixResponse {
  return {
    fixed: true,
    message: 'Fix applied successfully',
    scan_id: 'scan_1',
    issue_id: 'issue_5',
    fix_type: 'basic',
    ally_status: makeAllyStatus(),
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getAllyStatus: vi.fn().mockResolvedValue(makeAllyStatus()),
    getAllyScanResults: vi.fn().mockResolvedValue(makeAllyScanResults()),
    triggerAllyScan: vi.fn().mockResolvedValue(makeAllyTriggerScanResponse()),
    applyAllyFix: vi.fn().mockResolvedValue(makeAllyApplyFixResponse()),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Ally tools', () => {
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

    registerAllyTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_ally_status', () => {
    it('calls getAllyStatus and returns formatted output', async () => {
      const result = await callTool('get_ally_status', { site_id: 'test-site' });
      expect(client.getAllyStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Elementor Ally Status');
      expect(result.content[0].text).toContain('**Ally available**: Yes');
      expect(result.content[0].text).toContain('**Plugin**: Elementor Ally');
      expect(result.content[0].text).toContain('**Tier**: pro');
      expect(result.content[0].text).toContain('**Scan credits remaining**: 100');
      expect(result.content[0].text).toContain('## Capabilities');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getAllyStatus).mockRejectedValueOnce(new Error('Network error'));
      const result = await callTool('get_ally_status', {});
      expect(result.content[0].text).toContain('❌ Error fetching Ally status');
    });

    it('shows missing plugin message when ally not available', async () => {
      vi.mocked(client.getAllyStatus).mockResolvedValueOnce(makeAllyStatus({ ally_available: false }));
      const result = await callTool('get_ally_status', {});
      expect(result.content[0].text).toContain('Elementor Ally is not installed or activated.');
    });
  });

  describe('get_ally_scan_results', () => {
    it('calls getAllyScanResults and returns formatted output', async () => {
      const result = await callTool('get_ally_scan_results', { site_id: 'test-site' });
      expect(client.getAllyScanResults).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Ally Scan Results');
      expect(result.content[0].text).toContain('**Last scan**: 2026-04-17T10:00:00Z');
      expect(result.content[0].text).toContain('**Available credits**: 98');
      expect(result.content[0].text).toContain('**Total scans**: 2');
      expect(result.content[0].text).toContain('## Recent Scans');
      expect(result.content[0].text).toContain('**Homepage Scan**');
    });

    it('handles empty scans list', async () => {
      vi.mocked(client.getAllyScanResults).mockResolvedValueOnce(makeAllyScanResults({ scans: [] }));
      const result = await callTool('get_ally_scan_results', {});
      expect(result.content[0].text).toContain('No scan results found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getAllyScanResults).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('get_ally_scan_results', {});
      expect(result.content[0].text).toContain('❌ Error fetching Ally scan results');
    });
  });

  describe('trigger_ally_scan', () => {
    it('calls triggerAllyScan and returns formatted output', async () => {
      const result = await callTool('trigger_ally_scan', { site_id: 'test-site' });
      expect(client.triggerAllyScan).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Ally Scan Trigger');
      expect(result.content[0].text).toContain('**Triggered**: Yes');
      expect(result.content[0].text).toContain('**Scan ID**: scan_new_123');
      expect(result.content[0].text).toContain('**Credits required**: 2');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.triggerAllyScan).mockRejectedValueOnce(new Error('Scan error'));
      const result = await callTool('trigger_ally_scan', {});
      expect(result.content[0].text).toContain('❌ Error triggering Ally scan');
    });

    it('shows not triggered when triggered is false', async () => {
      vi.mocked(client.triggerAllyScan).mockResolvedValueOnce(makeAllyTriggerScanResponse({ triggered: false }));
      const result = await callTool('trigger_ally_scan', {});
      expect(result.content[0].text).toContain('**Triggered**: No');
    });
  });

  describe('apply_ally_fix', () => {
    it('calls applyAllyFix with parameters and returns formatted output', async () => {
      const args = { scan_id: 'scan_1', issue_id: 'issue_5', fix_type: 'basic' as const };
      const result = await callTool('apply_ally_fix', args);
      expect(client.applyAllyFix).toHaveBeenCalledWith(args);
      expect(result.content[0].text).toContain('# Ally Fix Application');
      expect(result.content[0].text).toContain('**Fixed**: Yes');
      expect(result.content[0].text).toContain('**Scan ID**: scan_1');
      expect(result.content[0].text).toContain('**Fix type**: basic');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.applyAllyFix).mockRejectedValueOnce(new Error('Fix error'));
      const result = await callTool('apply_ally_fix', { scan_id: 'scan_1', issue_id: 'issue_5' });
      expect(result.content[0].text).toContain('❌ Error applying Ally fix');
    });

    it('shows not fixed when fixed is false', async () => {
      vi.mocked(client.applyAllyFix).mockResolvedValueOnce(makeAllyApplyFixResponse({ fixed: false }));
      const result = await callTool('apply_ally_fix', { scan_id: 'scan_1', issue_id: 'issue_5' });
      expect(result.content[0].text).toContain('**Fixed**: No');
    });
  });
});