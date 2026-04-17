import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerBookingTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // detect_booking_plugin (BOOK-001, BOOK-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'detect_booking_plugin',
    'Detect active booking/events plugin (Amelia, Simply Schedule Appointments, The Events Calendar). Returns plugin name, version, service/event counts.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getBookingStatus();

        const lines: string[] = [
          '# Booking & Events Status',
          `**Booking available**: ${status.booking_available ? 'Yes' : 'No'}`,
        ];

        if (status.booking_available) {
          lines.push(`**Plugin**: ${status.plugin}`);
          lines.push(`**Version**: ${status.version}`);
          lines.push(`**Services/Types**: ${status.service_count}`);
          lines.push(`**Events**: ${status.event_count}`);
          lines.push(`**Appointments**: ${status.appointment_count}`);
        } else {
          lines.push('\nNo active booking/events plugin detected (Amelia, Simply Schedule Appointments, or The Events Calendar).');
          lines.push('Consider installing a booking plugin for appointment scheduling or event management.');
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error detecting booking plugin: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_bookings (BOOK-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_bookings',
    'List bookings/events from the active plugin with pagination. Unified listing across Amelia, SSA, TEC.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
    },
    async ({ site_id, page, per_page }) => {
      try {
        const client = getClient(site_id);
        const bookings = await client.listBookings({ page, per_page });

        const lines: string[] = [
          '# Bookings & Events',
          `**Total items**: ${bookings.total}`,
          `**Page**: ${bookings.page} of ${bookings.total_pages}`,
          `**Per page**: ${bookings.per_page}`,
        ];

        if (bookings.bookings.length === 0) {
          lines.push('\nNo bookings or events found.');
        } else {
          lines.push('\n## Items');
          lines.push('| ID | Type | Title | Customer | Date | Status | Service |');
          lines.push('|----|------|-------|----------|------|--------|---------|');
          for (const item of bookings.bookings.slice(0, 20)) {
            const title = item.title.substring(0, 30) + (item.title.length > 30 ? '…' : '');
            const customer = item.customer ? item.customer.substring(0, 20) + (item.customer.length > 20 ? '…' : '') : '—';
            const date = item.date ? new Date(item.date).toLocaleDateString() : '—';
            lines.push(`| ${item.id} | ${item.type} | ${title} | ${customer} | ${date} | ${item.status} | ${item.service ?? '—'} |`);
          }
          if (bookings.bookings.length > 20) {
            lines.push(`| … ${bookings.bookings.length - 20} more … |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error listing bookings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_booking_stats (BOOK-002 Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_booking_stats',
    'Get booking statistics: total, upcoming, past, cancelled bookings, popular services, peak hours, revenue.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const stats = await client.getBookingStats();

        const lines: string[] = [
          '# Booking Statistics',
          `**Plugin**: ${stats.plugin}`,
          `**Total bookings**: ${stats.total_bookings}`,
          `**Upcoming**: ${stats.upcoming_bookings}`,
          `**Past**: ${stats.past_bookings}`,
          `**Cancelled**: ${stats.cancelled_bookings}`,
        ];

        if (stats.revenue !== null) {
          lines.push(`**Revenue**: $${stats.revenue.toFixed(2)}`);
        }

        if (stats.popular_services.length > 0) {
          lines.push('\n## Popular Services');
          lines.push('| Service ID | Bookings |');
          lines.push('|------------|----------|');
          for (const service of stats.popular_services) {
            lines.push(`| ${service.service_id} | ${service.count} |`);
          }
        }

        if (stats.peak_hours.length > 0) {
          lines.push('\n## Peak Hours');
          lines.push('| Hour | Bookings |');
          lines.push('|------|----------|');
          for (const hour of stats.peak_hours) {
            lines.push(`| ${hour.hour}:00 | ${hour.count} |`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error fetching booking statistics: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // wizard_booking (BOOK-002 Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'wizard_booking',
    'Booking plugin recommendation wizard. Analyzes site needs and recommends appropriate booking/events plugin.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getBookingStatus();

        const lines: string[] = [
          '# Booking Plugin Wizard',
        ];

        if (status.booking_available) {
          lines.push(`✅ **Active plugin**: ${status.plugin} ${status.version ? `(${status.version})` : ''}`);
          lines.push(`\n**Current stats**:`);
          lines.push(`- Services/Types: ${status.service_count}`);
          lines.push(`- Events: ${status.event_count}`);
          lines.push(`- Appointments**: ${status.appointment_count}`);

          lines.push(`\n## Recommendations for ${status.plugin}:`);
          switch (status.plugin) {
            case 'Amelia':
              lines.push('- **Service optimization**: Consider adding service categories for better organization.');
              lines.push('- **Staff management**: Ensure all staff have updated availability and profiles.');
              lines.push('- **Marketing integration**: Connect with email marketing plugins for automated reminders.');
              break;
            case 'Simply Schedule Appointments':
              lines.push('- **Appointment types**: Review and optimize appointment durations and buffer times.');
              lines.push('- **Calendar sync**: Ensure Google/Outlook calendar integration is active.');
              lines.push('- **Payment gateways**: Consider adding online payments for confirmed bookings.');
              break;
            case 'The Events Calendar':
              lines.push('- **Event series**: Use recurring events for regular meetings or classes.');
              lines.push('- **Ticket sales**: Consider adding WooCommerce integration for paid events.');
              lines.push('- **Venue management**: Ensure all venues have correct addresses and maps.');
              break;
          }
        } else {
          lines.push('❌ **No booking plugin detected**');
          lines.push('\n## Plugin Recommendation based on site type:');
          lines.push('**Amelia** - Best for appointment‑based businesses (salons, consulting, health)');
          lines.push('- Features: Staff management, service categories, package bookings, payments');
          lines.push('- Pricing: Freemium, Pro starts at $59/year');
          lines.push('\n**Simply Schedule Appointments** - Best for simple 1:1 scheduling');
          lines.push('- Features: Google Calendar sync, Zoom integration, buffer times');
          lines.push('- Pricing: Freemium, Business starts at $99/year');
          lines.push('\n**The Events Calendar** - Best for event listing and calendar management');
          lines.push('- Features: Recurring events, venue management, ticket sales (with WooCommerce)');
          lines.push('- Pricing: Freemium, Pro starts at $99/year');
          lines.push('\n**Recommendation**: For most business sites, start with **Amelia** for appointment booking.');
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error running booking wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}