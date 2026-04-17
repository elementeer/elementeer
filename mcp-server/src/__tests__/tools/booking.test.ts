import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBookingTools } from '../../tools/booking.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getBookingStatus: vi.fn().mockResolvedValue({
      booking_available: true,
      plugin: 'Amelia',
      version: '5.0',
      service_count: 3,
      event_count: 0,
      appointment_count: 12,
    }),
    listBookings: vi.fn().mockResolvedValue({
      total: 12,
      page: 1,
      per_page: 20,
      total_pages: 1,
      bookings: [
        { id: 1, type: 'appointment', title: 'Haircut with John', customer: 'John Doe', date: '2026-04-18T10:00:00', status: 'approved', service: 'Haircut' },
        { id: 2, type: 'appointment', title: 'Consultation', customer: 'Jane Smith', date: '2026-04-19T14:30:00', status: 'pending', service: 'Consultation' },
      ],
    }),
    getBookingStats: vi.fn().mockResolvedValue({
      plugin: 'Amelia',
      total_bookings: 12,
      upcoming_bookings: 5,
      past_bookings: 7,
      cancelled_bookings: 0,
      revenue: 450.50,
      popular_services: [
        { service_id: 1, count: 5 },
        { service_id: 2, count: 4 },
      ],
      peak_hours: [
        { hour: 9, count: 3 },
        { hour: 14, count: 4 },
      ],
    }),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Booking tools', () => {
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

    registerBookingTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('detect_booking_plugin', () => {
    it('calls getBookingStatus and returns formatted output', async () => {
      const result = await callTool('detect_booking_plugin', { site_id: 'test-site' });
      expect(client.getBookingStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Booking & Events Status');
      expect(result.content[0].text).toContain('**Booking available**: Yes');
      expect(result.content[0].text).toContain('**Plugin**: Amelia');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getBookingStatus).mockRejectedValueOnce(new Error('Network error'));
      const result = await callTool('detect_booking_plugin', {});
      expect(result.content[0].text).toContain('❌ Error detecting booking plugin');
    });

    it('shows missing plugin message when booking not available', async () => {
      vi.mocked(client.getBookingStatus).mockResolvedValueOnce({
        booking_available: false,
      });
      const result = await callTool('detect_booking_plugin', {});
      expect(result.content[0].text).toContain('No active booking/events plugin detected');
    });
  });

  describe('list_bookings', () => {
    it('calls listBookings with pagination parameters', async () => {
      const result = await callTool('list_bookings', { page: 2, per_page: 10 });
      expect(client.listBookings).toHaveBeenCalledWith({ page: 2, per_page: 10 });
      expect(result.content[0].text).toContain('# Bookings & Events');
      expect(result.content[0].text).toContain('**Total items**: 12');
      expect(result.content[0].text).toContain('**Page**: 1 of 1');
    });

    it('formats bookings as a markdown table', async () => {
      const result = await callTool('list_bookings', {});
      expect(result.content[0].text).toContain('| ID | Type | Title | Customer | Date | Status | Service |');
      expect(result.content[0].text).toContain('| 1 | appointment | Haircut with John | John Doe |');
    });

    it('handles empty bookings list', async () => {
      vi.mocked(client.listBookings).mockResolvedValueOnce({
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        bookings: [],
      });
      const result = await callTool('list_bookings', {});
      expect(result.content[0].text).toContain('No bookings or events found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listBookings).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_bookings', {});
      expect(result.content[0].text).toContain('❌ Error listing bookings');
    });
  });

  describe('get_booking_stats', () => {
    it('calls getBookingStats and returns formatted output', async () => {
      const result = await callTool('get_booking_stats', { site_id: 'test-site' });
      expect(client.getBookingStats).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Booking Statistics');
      expect(result.content[0].text).toContain('**Plugin**: Amelia');
      expect(result.content[0].text).toContain('**Total bookings**: 12');
    });

    it('includes revenue when available', async () => {
      const result = await callTool('get_booking_stats', {});
      expect(result.content[0].text).toContain('**Revenue**: $450.50');
    });

    it('includes popular services and peak hours tables', async () => {
      const result = await callTool('get_booking_stats', {});
      expect(result.content[0].text).toContain('## Popular Services');
      expect(result.content[0].text).toContain('| Service ID | Bookings |');
      expect(result.content[0].text).toContain('| 1 | 5 |');
      expect(result.content[0].text).toContain('## Peak Hours');
      expect(result.content[0].text).toContain('| Hour | Bookings |');
      expect(result.content[0].text).toContain('| 9:00 | 3 |');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getBookingStats).mockRejectedValueOnce(new Error('Stats error'));
      const result = await callTool('get_booking_stats', {});
      expect(result.content[0].text).toContain('❌ Error fetching booking statistics');
    });
  });

  describe('wizard_booking', () => {
    it('calls getBookingStatus and returns wizard output', async () => {
      const result = await callTool('wizard_booking', {});
      expect(client.getBookingStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Booking Plugin Wizard');
      expect(result.content[0].text).toContain('✅ **Active plugin**: Amelia');
    });

    it('shows plugin-specific recommendations for Amelia', async () => {
      vi.mocked(client.getBookingStatus).mockResolvedValueOnce({
        booking_available: true,
        plugin: 'Amelia',
        version: '5.0',
        service_count: 3,
        event_count: 0,
        appointment_count: 12,
      });
      const result = await callTool('wizard_booking', {});
      expect(result.content[0].text).toContain('**Service optimization**: Consider adding service categories');
      expect(result.content[0].text).toContain('**Staff management**:');
      expect(result.content[0].text).toContain('**Marketing integration**:');
    });

    it('shows plugin-specific recommendations for Simply Schedule Appointments', async () => {
      vi.mocked(client.getBookingStatus).mockResolvedValueOnce({
        booking_available: true,
        plugin: 'Simply Schedule Appointments',
        version: '1.0',
        service_count: 5,
        event_count: 0,
        appointment_count: 20,
      });
      const result = await callTool('wizard_booking', {});
      expect(result.content[0].text).toContain('**Appointment types**:');
      expect(result.content[0].text).toContain('**Calendar sync**:');
      expect(result.content[0].text).toContain('**Payment gateways**:');
    });

    it('shows plugin-specific recommendations for The Events Calendar', async () => {
      vi.mocked(client.getBookingStatus).mockResolvedValueOnce({
        booking_available: true,
        plugin: 'The Events Calendar',
        version: '6.0',
        service_count: 0,
        event_count: 8,
        appointment_count: 0,
      });
      const result = await callTool('wizard_booking', {});
      expect(result.content[0].text).toContain('**Event series**:');
      expect(result.content[0].text).toContain('**Ticket sales**:');
      expect(result.content[0].text).toContain('**Venue management**:');
    });

    it('shows installation recommendations when no plugin detected', async () => {
      vi.mocked(client.getBookingStatus).mockResolvedValueOnce({
        booking_available: false,
      });
      const result = await callTool('wizard_booking', {});
      expect(result.content[0].text).toContain('❌ **No booking plugin detected**');
      expect(result.content[0].text).toContain('**Amelia** - Best for appointment‑based businesses');
      expect(result.content[0].text).toContain('**Simply Schedule Appointments**');
      expect(result.content[0].text).toContain('**The Events Calendar**');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getBookingStatus).mockRejectedValueOnce(new Error('Wizard error'));
      const result = await callTool('wizard_booking', {});
      expect(result.content[0].text).toContain('❌ Error running booking wizard');
    });
  });
});