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
            const customer = item.customer ? item.customer.substring(0, 20) + (item.customer.length > 20 ? '…' : '' ) : '—';
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

export function registerBookingAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_amelia_services
  // ------------------------------------------------------------------ //
  server.tool(
    'list_amelia_services',
    'List Amelia services with pagination. Returns service details including ID, name, duration, price, capacity.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
    },
    async ({ site_id, page, per_page }) => {
      try {
        const client = getClient(site_id);
        const services = await client.listAmeliaServices({ page, per_page });

        const lines: string[] = [
          '# Amelia Services',
          `**Total services**: ${services.total}`,
          `**Page**: ${services.page} of ${services.total_pages}`,
          `**Per page**: ${services.per_page}`,
        ];

        if (services.services.length === 0) {
          lines.push('\nNo Amelia services found.');
        } else {
          lines.push('\n## Services');
          lines.push('| ID | Name | Duration | Price | Capacity |');
          lines.push('|----|------|----------|-------|----------|');
          for (const service of services.services.slice(0, 20)) {
            const name = service.name.substring(0, 30) + (service.name.length > 30 ? '…' : '');
            const duration = service.duration ? `${service.duration} min` : '—';
            const price = service.price ? `$${service.price.toFixed(2)}` : 'Free';
            lines.push(`| ${service.id} | ${name} | ${duration} | ${price} | ${service.capacity ?? '—'} |`);
          }
          if (services.services.length > 20) {
            lines.push(`| … ${services.services.length - 20} more … |`);
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
            text: `❌ Error listing Amelia services: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_amelia_service
  // ------------------------------------------------------------------ //
  server.tool(
    'get_amelia_service',
    'Get detailed information about a specific Amelia service.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      service_id: z.number().describe('Amelia service ID'),
    },
    async ({ site_id, service_id }) => {
      try {
        const client = getClient(site_id);
        const service = await client.getAmeliaService(service_id);

        const lines: string[] = [
          `# Amelia Service: ${service.name}`,
          `**ID**: ${service.id}`,
          `**Duration**: ${service.duration} minutes`,
          `**Price**: ${service.price ? `$${service.price.toFixed(2)}` : 'Free'}`,
          `**Capacity**: ${service.capacity ?? 'Unlimited'}`,
          `**Description**: ${service.description || '(No description)'}`,
        ];

        if (service.category) {
          lines.push(`**Category**: ${service.category}`);
        }
        if (service.employees && service.employees.length > 0) {
          lines.push(`**Employees**: ${service.employees.join(', ')}`);
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
            text: `❌ Error fetching Amelia service: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // create_amelia_service
  // ------------------------------------------------------------------ //
  server.tool(
    'create_amelia_service',
    'Create a new Amelia service. Requires service details: name, duration, price, etc.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      name: z.string().describe('Service name'),
      duration: z.number().describe('Duration in minutes'),
      price: z.number().optional().describe('Price (optional, defaults to free)'),
      capacity: z.number().optional().describe('Maximum capacity (optional)'),
      description: z.string().optional().describe('Service description (optional)'),
      category_id: z.number().optional().describe('Category ID (optional)'),
    },
    async ({ site_id, name, duration, price, capacity, description, category_id }) => {
      try {
        const client = getClient(site_id);
        const service = await client.createAmeliaService({
          name,
          duration,
          price,
          capacity,
          description,
          category_id,
        });

        const lines: string[] = [
          `✅ Amelia service created`,
          `**ID**: ${service.id}`,
          `**Name**: ${service.name}`,
          `**Duration**: ${service.duration} minutes`,
          `**Price**: ${service.price ? `$${service.price.toFixed(2)}` : 'Free'}`,
          `**Capacity**: ${service.capacity ?? 'Unlimited'}`,
        ];

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
            text: `❌ Error creating Amelia service: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // update_amelia_service
  // ------------------------------------------------------------------ //
  server.tool(
    'update_amelia_service',
    'Update an existing Amelia service.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      service_id: z.number().describe('Amelia service ID'),
      name: z.string().optional().describe('New service name (optional)'),
      duration: z.number().optional().describe('New duration in minutes (optional)'),
      price: z.number().optional().describe('New price (optional)'),
      capacity: z.number().optional().describe('New capacity (optional)'),
      description: z.string().optional().describe('New description (optional)'),
      category_id: z.number().optional().describe('New category ID (optional)'),
    },
    async ({ site_id, service_id, name, duration, price, capacity, description, category_id }) => {
      try {
        const client = getClient(site_id);
        const service = await client.updateAmeliaService(service_id, {
          name,
          duration,
          price,
          capacity,
          description,
          category_id,
        });

        const lines: string[] = [
          `✅ Amelia service updated`,
          `**ID**: ${service.id}`,
          `**Name**: ${service.name}`,
          `**Duration**: ${service.duration} minutes`,
          `**Price**: ${service.price ? `$${service.price.toFixed(2)}` : 'Free'}`,
          `**Capacity**: ${service.capacity ?? 'Unlimited'}`,
        ];

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
            text: `❌ Error updating Amelia service: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // delete_amelia_service
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_amelia_service',
    'Delete an Amelia service.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      service_id: z.number().describe('Amelia service ID'),
    },
    async ({ site_id, service_id }) => {
      try {
        const client = getClient(site_id);
        await client.deleteAmeliaService(service_id);

        return {
          content: [{
            type: 'text',
            text: `✅ Amelia service ${service_id} deleted successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error deleting Amelia service: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_amelia_appointments
  // ------------------------------------------------------------------ //
  server.tool(
    'list_amelia_appointments',
    'List Amelia appointments with pagination. Returns appointment details including ID, customer, service, date, status.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
      status: z.string().optional().describe('Filter by status (e.g., "approved", "pending", "canceled")'),
    },
    async ({ site_id, page, per_page, status }) => {
      try {
        const client = getClient(site_id);
        const appointments = await client.listAmeliaAppointments({ page, per_page, status });

        const lines: string[] = [
          '# Amelia Appointments',
          `**Total appointments**: ${appointments.total}`,
          `**Page**: ${appointments.page} of ${appointments.total_pages}`,
          `**Per page**: ${appointments.per_page}`,
        ];

        if (appointments.appointments.length === 0) {
          lines.push('\nNo Amelia appointments found.');
        } else {
          lines.push('\n## Appointments');
          lines.push('| ID | Customer | Service | Date | Status |');
          lines.push('|----|----------|---------|------|--------|');
          for (const apt of appointments.appointments.slice(0, 20)) {
            const customer = apt.customer_name ? apt.customer_name.substring(0, 20) + (apt.customer_name.length > 20 ? '…' : '') : '—';
            const service = apt.service_name ? apt.service_name.substring(0, 20) + (apt.service_name.length > 20 ? '…' : '') : '—';
            const date = apt.start_date ? new Date(apt.start_date).toLocaleString() : '—';
            lines.push(`| ${apt.id} | ${customer} | ${service} | ${date} | ${apt.status} |`);
          }
          if (appointments.appointments.length > 20) {
            lines.push(`| … ${appointments.appointments.length - 20} more … |`);
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
            text: `❌ Error listing Amelia appointments: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_amelia_appointment
  // ------------------------------------------------------------------ //
  server.tool(
    'get_amelia_appointment',
    'Get detailed information about a specific Amelia appointment.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      appointment_id: z.number().describe('Amelia appointment ID'),
    },
    async ({ site_id, appointment_id }) => {
      try {
        const client = getClient(site_id);
        const appointment = await client.getAmeliaAppointment(appointment_id);

        const lines: string[] = [
          `# Amelia Appointment: ${appointment.id}`,
          `**Customer**: ${appointment.customer_name}`,
          `**Service**: ${appointment.service_name}`,
          `**Date**: ${new Date(appointment.start_date).toLocaleString()}`,
          `**Duration**: ${appointment.duration} minutes`,
          `**Status**: ${appointment.status}`,
          `**Price**: ${appointment.price ? `$${appointment.price.toFixed(2)}` : 'Free'}`,
        ];

        if (appointment.employee_name) {
          lines.push(`**Employee**: ${appointment.employee_name}`);
        }
        if (appointment.notes) {
          lines.push(`**Notes**: ${appointment.notes}`);
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
            text: `❌ Error fetching Amelia appointment: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // create_amelia_appointment
  // ------------------------------------------------------------------ //
  server.tool(
    'create_amelia_appointment',
    'Create a new Amelia appointment.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      service_id: z.number().describe('Service ID'),
      customer_id: z.number().optional().describe('Customer ID (optional if customer_email provided)'),
      customer_email: z.string().optional().describe('Customer email (optional if customer_id provided)'),
      customer_name: z.string().optional().describe('Customer name'),
      start_date: z.string().describe('Start date/time (ISO 8601)'),
      end_date: z.string().optional().describe('End date/time (optional, calculated from service duration if not provided)'),
      employee_id: z.number().optional().describe('Employee ID (optional)'),
      notes: z.string().optional().describe('Notes (optional)'),
    },
    async ({ site_id, service_id, customer_id, customer_email, customer_name, start_date, end_date, employee_id, notes }) => {
      try {
        const client = getClient(site_id);
        const appointment = await client.createAmeliaAppointment({
          service_id,
          customer_id,
          customer_email,
          customer_name,
          start_date,
          end_date,
          employee_id,
          notes,
        });

        const lines: string[] = [
          `✅ Amelia appointment created`,
          `**ID**: ${appointment.id}`,
          `**Customer**: ${appointment.customer_name}`,
          `**Service**: ${appointment.service_name}`,
          `**Date**: ${new Date(appointment.start_date).toLocaleString()}`,
          `**Status**: ${appointment.status}`,
        ];

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
            text: `❌ Error creating Amelia appointment: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // update_amelia_appointment
  // ------------------------------------------------------------------ //
  server.tool(
    'update_amelia_appointment',
    'Update an existing Amelia appointment.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      appointment_id: z.number().describe('Appointment ID'),
      status: z.string().optional().describe('New status (optional)'),
      start_date: z.string().optional().describe('New start date/time (optional)'),
      employee_id: z.number().optional().describe('New employee ID (optional)'),
      notes: z.string().optional().describe('New notes (optional)'),
    },
    async ({ site_id, appointment_id, status, start_date, employee_id, notes }) => {
      try {
        const client = getClient(site_id);
        const appointment = await client.updateAmeliaAppointment(appointment_id, {
          status,
          start_date,
          employee_id,
          notes,
        });

        const lines: string[] = [
          `✅ Amelia appointment updated`,
          `**ID**: ${appointment.id}`,
          `**Customer**: ${appointment.customer_name}`,
          `**Service**: ${appointment.service_name}`,
          `**Date**: ${new Date(appointment.start_date).toLocaleString()}`,
          `**Status**: ${appointment.status}`,
        ];

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
            text: `❌ Error updating Amelia appointment: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // delete_amelia_appointment
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_amelia_appointment',
    'Delete an Amelia appointment.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      appointment_id: z.number().describe('Appointment ID'),
    },
    async ({ site_id, appointment_id }) => {
      try {
        const client = getClient(site_id);
        await client.deleteAmeliaAppointment(appointment_id);

        return {
          content: [{
            type: 'text',
            text: `✅ Amelia appointment ${appointment_id} deleted successfully.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error deleting Amelia appointment: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}
