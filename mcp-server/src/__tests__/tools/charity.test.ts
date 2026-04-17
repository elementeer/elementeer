import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCharityTools } from '../../tools/charity.js';
import type { ElementifyClient, CharityStatus, CharityFormList, CharityDonationStats } from '../../client.js';

function makeCharityStatus(overrides: Partial<CharityStatus> = {}): CharityStatus {
  return {
    charity_available: true,
    plugin: 'GiveWP',
    version: '3.0',
    form_count: 5,
    ...overrides,
  };
}

function makeCharityFormList(overrides: Partial<CharityFormList> = {}): CharityFormList {
  return {
    forms: [
      {
        id: 1,
        title: 'Annual Fundraiser',
        slug: 'annual-fundraiser',
        status: 'publish',
        url: 'https://example.com/donate/annual-fundraiser',
        goal: '10000',
        raised: '8500',
        donor_count: 120,
      },
      {
        id: 2,
        title: 'Emergency Relief',
        slug: 'emergency-relief',
        status: 'publish',
        url: 'https://example.com/donate/emergency-relief',
        goal: '5000',
        raised: '3200',
        donor_count: 45,
      },
    ],
    total: 2,
    page: 1,
    per_page: 20,
    total_pages: 1,
    ...overrides,
  };
}

function makeCharityDonationStats(overrides: Partial<CharityDonationStats> = {}): CharityDonationStats {
  return {
    total_raised: 11700.00,
    donor_count: 165,
    average_donation: 70.91,
    total_donations: 210,
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getCharityStatus: vi.fn().mockResolvedValue(makeCharityStatus()),
    listCharityForms: vi.fn().mockResolvedValue(makeCharityFormList()),
    getCharityStats: vi.fn().mockResolvedValue(makeCharityDonationStats()),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Charity tools', () => {
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

    registerCharityTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_charity_status', () => {
    it('calls getCharityStatus and returns formatted output', async () => {
      const result = await callTool('get_charity_status', { site_id: 'test-site' });
      expect(client.getCharityStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Charity Status');
      expect(result.content[0].text).toContain('**Charity plugin available**: Yes');
      expect(result.content[0].text).toContain('**Plugin**: GiveWP');
      expect(result.content[0].text).toContain('**Version**: 3.0');
      expect(result.content[0].text).toContain('**Form count**: 5');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getCharityStatus).mockRejectedValueOnce(new Error('Network error'));
      const result = await callTool('get_charity_status', {});
      expect(result.content[0].text).toContain('❌ Error getting charity status');
    });

    it('shows missing plugin message when charity not available', async () => {
      vi.mocked(client.getCharityStatus).mockResolvedValueOnce(makeCharityStatus({ charity_available: false }));
      const result = await callTool('get_charity_status', {});
      expect(result.content[0].text).toContain('No active charity plugin detected');
    });
  });

  describe('list_charity_forms', () => {
    it('calls listCharityForms with pagination parameters', async () => {
      const result = await callTool('list_charity_forms', { page: 2, per_page: 10 });
      expect(client.listCharityForms).toHaveBeenCalledWith({ page: 2, per_page: 10 });
      expect(result.content[0].text).toContain('# Donation Forms');
      expect(result.content[0].text).toContain('**Total forms**: 2');
      expect(result.content[0].text).toContain('**Page**: 1 of 1');
    });

    it('formats forms as a markdown table', async () => {
      const result = await callTool('list_charity_forms', {});
      expect(result.content[0].text).toContain('| ID | Title | Goal | Raised | Donors | URL |');
      expect(result.content[0].text).toContain('| 1 | Annual Fundraiser | $10000 | $8500 | 120 |');
      expect(result.content[0].text).toContain('| 2 | Emergency Relief | $5000 | $3200 | 45 |');
    });

    it('handles empty forms list', async () => {
      vi.mocked(client.listCharityForms).mockResolvedValueOnce(makeCharityFormList({ forms: [] }));
      const result = await callTool('list_charity_forms', {});
      expect(result.content[0].text).toContain('No donation forms found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listCharityForms).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_charity_forms', {});
      expect(result.content[0].text).toContain('❌ Error listing charity forms');
    });
  });

  describe('get_charity_stats', () => {
    it('calls getCharityStats and returns formatted output', async () => {
      const result = await callTool('get_charity_stats', { site_id: 'test-site' });
      expect(client.getCharityStats).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Charity Donation Statistics');
      expect(result.content[0].text).toContain('**Total raised**: $11700.00');
      expect(result.content[0].text).toContain('**Donor count**: 165');
      expect(result.content[0].text).toContain('**Average donation**: $70.91');
      expect(result.content[0].text).toContain('**Total donations**: 210');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getCharityStats).mockRejectedValueOnce(new Error('Stats error'));
      const result = await callTool('get_charity_stats', {});
      expect(result.content[0].text).toContain('❌ Error getting charity stats');
    });
  });
});