<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Booking & Events recommendation wizard (BOOK-003).
 *
 * Recommends booking plugin based on needs, checks service/event setup,
 * suggests booking form placement and design.
 */
final class BookingWizard extends BaseWizard {

	public function assess_module_state(): array {
		$booking_status = $this->detect_booking_plugin();
		$service_count = $booking_status['booking_available'] ? $booking_status['service_count'] : 0;
		$event_count = $booking_status['booking_available'] ? $booking_status['event_count'] : 0;
		$appointment_count = $booking_status['booking_available'] ? $booking_status['appointment_count'] : 0;

		$status = 'missing';
		if ($booking_status['booking_available']) {
			if ($service_count > 0 || $event_count > 0) {
				$status = $appointment_count > 0 ? 'active' : 'needs_configuration';
			} else {
				$status = 'needs_configuration';
			}
		}

		$details = [
			'booking_available' => $booking_status['booking_available'],
			'booking_plugin' => $booking_status['plugin'] ?? null,
			'booking_version' => $booking_status['version'] ?? null,
			'service_count' => $service_count,
			'event_count' => $event_count,
			'appointment_count' => $appointment_count,
			'has_payment_gateway' => $this->has_payment_gateway(),
			'has_booking_page' => $this->has_booking_page(),
			'has_confirmation_page' => $this->has_confirmation_page(),
			'has_calendar_sync' => $this->has_calendar_sync(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$state = $this->assess_module_state();
		$details = $state['details'];

		if (!$details['booking_available']) {
			$gaps[] = [
				'id' => 'booking_missing',
				'severity' => 'warning',
				'description' => 'No booking/events plugin detected. Appointment scheduling or event management functionality unavailable.',
				'data' => [],
			];
			return $gaps;
		}

		if ($details['service_count'] === 0 && $details['event_count'] === 0) {
			$gaps[] = [
				'id' => 'no_services_events',
				'severity' => 'warning',
				'description' => 'No services or events created yet.',
				'data' => [],
			];
		}

		if ($details['appointment_count'] === 0) {
			$gaps[] = [
				'id' => 'no_appointments_bookings',
				'severity' => 'info',
				'description' => 'No appointments or bookings recorded.',
				'data' => [],
			];
		}

		if (!$details['has_payment_gateway']) {
			$gaps[] = [
				'id' => 'missing_payment_gateway',
				'severity' => 'critical',
				'description' => 'No payment gateway configured. Paid bookings cannot be processed.',
				'data' => [],
			];
		}

		if (!$details['has_booking_page']) {
			$gaps[] = [
				'id' => 'missing_booking_page',
				'severity' => 'critical',
				'description' => 'No dedicated booking/events page detected.',
				'data' => [],
			];
		}

		if (!$details['has_confirmation_page']) {
			$gaps[] = [
				'id' => 'missing_confirmation_page',
				'severity' => 'warning',
				'description' => 'No booking confirmation/thank‑you page detected.',
				'data' => [],
			];
		}

		if (!$details['has_calendar_sync']) {
			$gaps[] = [
				'id' => 'missing_calendar_sync',
				'severity' => 'info',
				'description' => 'Calendar sync (Google/Outlook) not configured. Consider enabling to avoid double‑booking.',
				'data' => [],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];
		$recommendations = [];

		if (!$details['booking_available']) {
			$recommendations[] = [
				'id' => 'install_booking',
				'priority' => 'high',
				'title' => 'Install a Booking/Events Plugin',
				'description' => 'Add appointment scheduling or event management to your site.',
				'action' => 'Choose Amelia (recommended for appointments), Simply Schedule Appointments (simple 1:1), or The Events Calendar (events).',
				'gap_id' => 'booking_missing',
			];
			return $recommendations;
		}

		if ($details['service_count'] === 0 && $details['event_count'] === 0) {
			$recommendations[] = [
				'id' => 'create_first_service_event',
				'priority' => 'high',
				'title' => 'Create Your First Service or Event',
				'description' => 'Define what customers can book.',
				'action' => 'Use your booking plugin’s admin to create a service (Amelia/SSA) or event (The Events Calendar).',
				'gap_id' => 'no_services_events',
			];
		}

		if ($details['appointment_count'] === 0) {
			$recommendations[] = [
				'id' => 'promote_booking_page',
				'priority' => 'medium',
				'title' => 'Promote Your Booking Page',
				'description' => 'Drive traffic to your booking page to get first appointments.',
				'action' => 'Add booking links to your navigation, footer, or promotional banners.',
				'gap_id' => 'no_appointments_bookings',
			];
		}

		if (!$details['has_payment_gateway']) {
			$recommendations[] = [
				'id' => 'configure_payment_gateway',
				'priority' => 'critical',
				'title' => 'Configure a Payment Gateway',
				'description' => 'Set up Stripe, PayPal, or another payment processor for paid bookings.',
				'action' => 'Go to the plugin’s settings and connect a payment gateway.',
				'gap_id' => 'missing_payment_gateway',
			];
		}

		if (!$details['has_booking_page']) {
			$recommendations[] = [
				'id' => 'create_booking_page',
				'priority' => 'critical',
				'title' => 'Create a Dedicated Booking/Events Page',
				'description' => 'Visitors need a clear page to book appointments or view events.',
				'action' => 'Create a page with the booking shortcode or Elementor widget.',
				'gap_id' => 'missing_booking_page',
			];
		}

		if (!$details['has_confirmation_page']) {
			$recommendations[] = [
				'id' => 'create_confirmation_page',
				'priority' => 'medium',
				'title' => 'Create a Confirmation/Thank‑You Page',
				'description' => 'Show confirmation details and provide next steps after a booking.',
				'action' => 'Create a page and set it as the confirmation page in plugin settings.',
				'gap_id' => 'missing_confirmation_page',
			];
		}

		if (!$details['has_calendar_sync']) {
			$recommendations[] = [
				'id' => 'enable_calendar_sync',
				'priority' => 'low',
				'title' => 'Enable Calendar Sync',
				'description' => 'Sync bookings with Google Calendar, Outlook, or other calendars.',
				'action' => 'Connect your calendar in the plugin’s calendar sync settings.',
				'gap_id' => 'missing_calendar_sync',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];

		$suggested_tools = [];
		$suggested_plugins = [];

		if ($details['booking_available']) {
			$suggested_tools[] = [
				'tool' => 'detect_booking_plugin',
				'purpose' => 'Detect active booking plugin and version.',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'list_bookings',
				'purpose' => 'List all bookings/events with pagination.',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'get_booking_stats',
				'purpose' => 'View booking statistics (total, upcoming, past, revenue).',
				'governance_level' => 'L0',
			];
		} else {
			$suggested_plugins[] = [
				'slug' => 'ameliabooking',
				'name' => 'Amelia',
				'reason' => 'Professional appointment booking plugin with staff management, service categories, and payments.',
				'required_capability' => 'booking:read',
			];
			$suggested_plugins[] = [
				'slug' => 'simply-schedule-appointments',
				'name' => 'Simply Schedule Appointments',
				'reason' => 'Simple 1:1 scheduling with Google Calendar sync and Zoom integration.',
				'required_capability' => 'booking:read',
			];
			$suggested_plugins[] = [
				'slug' => 'the-events-calendar',
				'name' => 'The Events Calendar',
				'reason' => 'Event listing and calendar management with recurring events and ticket sales.',
				'required_capability' => 'booking:read',
			];
		}

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// ------------------------------------------------------------------ //
	// Helper methods
	// ------------------------------------------------------------------ //

	private function detect_booking_plugin(): array {
		$active = (array) \get_option('active_plugins', []);
		$active_slugs = array_map(fn($p) => \dirname($p), $active);

		$booking_slugs = [
			'ameliabooking' => 'Amelia',
			'simply-schedule-appointments' => 'Simply Schedule Appointments',
			'the-events-calendar' => 'The Events Calendar',
		];

		$detected = [];
		foreach ($booking_slugs as $slug => $name) {
			if (\in_array($slug, $active_slugs, true)) {
				$detected[] = $name;
			}
		}

		if (empty($detected)) {
			return [
				'booking_available' => false,
				'plugin' => null,
				'version' => null,
				'service_count' => 0,
				'event_count' => 0,
				'appointment_count' => 0,
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_booking_version($plugin_name);
		$counts = $this->count_booking_items($plugin_name);

		return [
			'booking_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
			'service_count' => $counts['service_count'] ?? 0,
			'event_count' => $counts['event_count'] ?? 0,
			'appointment_count' => $counts['appointment_count'] ?? 0,
		];
	}

	private function get_booking_version(string $plugin_name): ?string {
		if (!\function_exists('get_plugin_data')) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$slug_map = [
			'Amelia' => 'ameliabooking',
			'Simply Schedule Appointments' => 'simply-schedule-appointments',
			'The Events Calendar' => 'the-events-calendar',
		];

		$slug = $slug_map[$plugin_name] ?? null;
		if (!$slug) {
			return null;
		}

		$plugin_file = \WP_PLUGIN_DIR . '/' . $slug . '/' . $slug . '.php';
		if (!\file_exists($plugin_file)) {
			return null;
		}

		$plugin_data = \get_plugin_data($plugin_file, false, false);
		return $plugin_data['Version'] ?? null;
	}

	private function count_booking_items(string $plugin_name): array {
		$counts = [
			'service_count' => 0,
			'event_count' => 0,
			'appointment_count' => 0,
		];

		switch ($plugin_name) {
			case 'Amelia':
				// Try to get counts via Amelia REST API or fallback to direct table query
				if ($this->is_amelia_api_available()) {
					$services = $this->fetch_amelia_api('services');
					$counts['service_count'] = \is_array($services) ? \count($services) : 0;
					$appointments = $this->fetch_amelia_api('appointments', ['status' => 'approved']);
					$counts['appointment_count'] = \is_array($appointments) ? \count($appointments) : 0;
				} else {
					// Fallback: direct table count (read-only)
					global $wpdb;
					$counts['service_count'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}amelia_services WHERE status = 'visible'");
					$counts['appointment_count'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}amelia_appointments WHERE status IN ('approved', 'pending')");
				}
				break;

			case 'Simply Schedule Appointments':
				global $wpdb;
				$counts['appointment_count'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}ssa_appointments WHERE deleted_at IS NULL");
				$counts['service_count'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}ssa_appointment_types WHERE deleted_at IS NULL");
				break;

			case 'The Events Calendar':
				$query = new \WP_Query([
					'post_type'      => 'tribe_events',
					'post_status'    => 'publish',
					'posts_per_page' => 1,
					'fields'         => 'ids',
				]);
				$counts['event_count'] = $query->found_posts;
				break;
		}

		return $counts;
	}

	private function is_amelia_api_available(): bool {
		return \function_exists('rest_url') && \defined('AMELIA_VERSION');
	}

	private function fetch_amelia_api(string $endpoint, array $params = []): ?array {
		$url = \rest_url('amelia/v1/' . $endpoint);
		if (!empty($params)) {
			$url = \add_query_arg($params, $url);
		}

		$response = \wp_remote_get($url, [
			'headers' => [
				'Authorization' => 'Bearer ' . $this->get_amelia_api_token(),
			],
			'timeout' => 10,
		]);

		if (\is_wp_error($response)) {
			return null;
		}

		$body = \wp_remote_retrieve_body($response);
		$data = \json_decode($body, true);

		return \is_array($data) ? $data : null;
	}

	private function get_amelia_api_token(): string {
		$settings = \get_option('amelia_settings', []);
		if (\is_array($settings) && isset($settings['api']['token'])) {
			return (string) $settings['api']['token'];
		}

		return \wp_hash(\site_url() . 'amelia_api_token');
	}

	private function has_payment_gateway(): bool {
		$state = $this->detect_booking_plugin();
		if (!$state['booking_available']) {
			return false;
		}

		switch ($state['plugin']) {
			case 'Amelia':
				$settings = \get_option('amelia_settings', []);
				return !empty($settings['payments']['stripe']['enabled']) || !empty($settings['payments']['paypal']['enabled']);
			case 'Simply Schedule Appointments':
				$settings = \get_option('ssa_settings', []);
				return !empty($settings['payments']['stripe']['enabled']) || !empty($settings['payments']['paypal']['enabled']);
			case 'The Events Calendar':
				// TEC payments usually via WooCommerce
				return \class_exists('WooCommerce');
			default:
				return false;
		}
	}

	private function has_booking_page(): bool {
		$possible_slugs = ['book', 'booking', 'appointments', 'schedule', 'events', 'calendar'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_confirmation_page(): bool {
		$possible_slugs = ['booking-confirmation', 'appointment-confirmed', 'thank-you', 'success'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_calendar_sync(): bool {
		$state = $this->detect_booking_plugin();
		if (!$state['booking_available']) {
			return false;
		}

		switch ($state['plugin']) {
			case 'Amelia':
				$settings = \get_option('amelia_settings', []);
				return !empty($settings['googleCalendar']['enabled']) || !empty($settings['outlookCalendar']['enabled']);
			case 'Simply Schedule Appointments':
				$settings = \get_option('ssa_settings', []);
				return !empty($settings['google_calendar']['enabled']) || !empty($settings['outlook_calendar']['enabled']);
			case 'The Events Calendar':
				// TEC doesn't have calendar sync in same sense
				return false;
			default:
				return false;
		}
	}
}