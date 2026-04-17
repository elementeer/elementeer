<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Booking & Events integration.
 * Auto-detects Amelia > Simply Schedule Appointments > The Events Calendar.
 */
final class Booking {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Booking plugin detection (BOOK-001)
	// ------------------------------------------------------------------ //

	public function get_booking_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_booking_plugin();
		return new WP_REST_Response( $status, 200 );
	}

	public function list_bookings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_booking_plugin();
		if ( ! $status['booking_available'] ) {
			return new WP_Error(
				'elementify_booking_inactive',
				'No active booking/events plugin detected (Amelia, Simply Schedule Appointments, or The Events Calendar).',
				[ 'status' => 400 ]
			);
		}

		$page = \absint( $request->get_param( 'page' ) ?: 1 );
		$per_page = \absint( $request->get_param( 'per_page' ) ?: 20 );
		$per_page = min( max( $per_page, 1 ), 100 );

		$bookings = $this->fetch_bookings( $status['plugin'], $page, $per_page );
		return new WP_REST_Response( $bookings, 200 );
	}

	public function get_booking_stats( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_booking_plugin();
		if ( ! $status['booking_available'] ) {
			return new WP_Error(
				'elementify_booking_inactive',
				'No active booking/events plugin detected.',
				[ 'status' => 400 ]
			);
		}

		$stats = $this->fetch_booking_stats( $status['plugin'] );
		return new WP_REST_Response( $stats, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & data collection
	// ------------------------------------------------------------------ //

	private function detect_booking_plugin(): array {
		$active = (array) \get_option( 'active_plugins', [] );
		$active_slugs = array_map( fn( $p ) => \dirname( $p ), $active );

		$booking_slugs = [
			'ameliabooking' => 'Amelia',
			'simply-schedule-appointments' => 'Simply Schedule Appointments',
			'the-events-calendar' => 'The Events Calendar',
		];

		$detected = [];
		foreach ( $booking_slugs as $slug => $name ) {
			if ( \in_array( $slug, $active_slugs, true ) ) {
				$detected[] = $name;
			}
		}

		if ( empty( $detected ) ) {
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
		$version = $this->get_booking_version( $plugin_name );
		$counts = $this->count_booking_items( $plugin_name );

		return [
			'booking_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
			'service_count' => $counts['service_count'] ?? 0,
			'event_count' => $counts['event_count'] ?? 0,
			'appointment_count' => $counts['appointment_count'] ?? 0,
		];
	}

	private function get_booking_version( string $plugin_name ): ?string {
		if ( ! \function_exists( 'get_plugin_data' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_slug = \array_search( $plugin_name, [
			'Amelia' => 'ameliabooking',
			'Simply Schedule Appointments' => 'simply-schedule-appointments',
			'The Events Calendar' => 'the-events-calendar',
		], true );

		if ( ! $plugin_slug ) {
			return null;
		}

		$plugin_file = \WP_PLUGIN_DIR . '/' . $plugin_slug . '/' . $plugin_slug . '.php';
		if ( ! \file_exists( $plugin_file ) ) {
			return null;
		}

		$plugin_data = \get_plugin_data( $plugin_file, false, false );
		return $plugin_data['Version'] ?? null;
	}

	private function count_booking_items( string $plugin_name ): array {
		$counts = [
			'service_count' => 0,
			'event_count' => 0,
			'appointment_count' => 0,
		];

		switch ( $plugin_name ) {
			case 'Amelia':
				// Try to get counts via Amelia REST API or fallback to direct table query
				if ( $this->is_amelia_api_available() ) {
					$services = $this->fetch_amelia_api( 'services' );
					$counts['service_count'] = \is_array( $services ) ? \count( $services ) : 0;
					$appointments = $this->fetch_amelia_api( 'appointments', [ 'status' => 'approved' ] );
					$counts['appointment_count'] = \is_array( $appointments ) ? \count( $appointments ) : 0;
				} else {
					// Fallback: direct table count (read-only)
					global $wpdb;
					$counts['service_count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}amelia_services WHERE status = 'visible'" );
					$counts['appointment_count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}amelia_appointments WHERE status IN ('approved', 'pending')" );
				}
				break;

			case 'Simply Schedule Appointments':
				// SSA stores appointments in custom table wp_ssa_appointments
				global $wpdb;
				$counts['appointment_count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}ssa_appointments WHERE deleted_at IS NULL" );
				// Appointment types
				$counts['service_count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}ssa_appointment_types WHERE deleted_at IS NULL" );
				break;

			case 'The Events Calendar':
				// TEC uses custom post type 'tribe_events'
				$query = new \WP_Query( [
					'post_type'      => 'tribe_events',
					'post_status'    => 'publish',
					'posts_per_page' => 1,
					'fields'         => 'ids',
				] );
				$counts['event_count'] = $query->found_posts;
				break;
		}

		return $counts;
	}

	private function fetch_bookings( string $plugin_name, int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		$bookings = [];

		switch ( $plugin_name ) {
			case 'Amelia':
				$bookings = $this->fetch_amelia_bookings( $page, $per_page );
				break;

			case 'Simply Schedule Appointments':
				$bookings = $this->fetch_ssa_bookings( $page, $per_page );
				break;

			case 'The Events Calendar':
				$bookings = $this->fetch_tec_events( $page, $per_page );
				break;
		}

		return $bookings;
	}

	private function fetch_amelia_bookings( int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		$bookings = [];

		if ( $this->is_amelia_api_available() ) {
			$response = $this->fetch_amelia_api( 'appointments', [
				'page' => $page,
				'limit' => $per_page,
			] );

			if ( \is_array( $response ) && isset( $response['data'] ) ) {
				foreach ( $response['data'] as $appointment ) {
					$bookings[] = [
						'id' => $appointment['id'] ?? 0,
						'type' => 'appointment',
						'title' => $appointment['service']['name'] ?? 'Appointment',
						'customer' => $appointment['customer']['firstName'] . ' ' . $appointment['customer']['lastName'],
						'date' => $appointment['bookingStart'] ?? null,
						'status' => $appointment['status'] ?? 'pending',
						'service' => $appointment['service']['name'] ?? null,
						'staff' => $appointment['provider']['firstName'] . ' ' . $appointment['provider']['lastName'],
						'duration' => $appointment['duration'] ?? null,
					];
				}

				return [
					'bookings' => $bookings,
					'total' => $response['total'] ?? 0,
					'page' => $page,
					'per_page' => $per_page,
					'total_pages' => \ceil( ( $response['total'] ?? 0 ) / $per_page ),
				];
			}
		}

		// Fallback: direct table query
		global $wpdb;
		$table = $wpdb->prefix . 'amelia_appointments';
		$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status IN ('approved', 'pending')" );
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE status IN ('approved', 'pending') ORDER BY bookingStart DESC LIMIT %d OFFSET %d",
				$per_page,
				$offset
			),
			ARRAY_A
		);

		foreach ( $results as $row ) {
			$bookings[] = [
				'id' => $row['id'],
				'type' => 'appointment',
				'title' => 'Appointment #' . $row['id'],
				'customer' => 'Customer',
				'date' => $row['bookingStart'],
				'status' => $row['status'],
				'service' => null,
				'staff' => null,
				'duration' => $row['duration'],
			];
		}

		return [
			'bookings' => $bookings,
			'total' => $total,
			'page' => $page,
			'per_page' => $per_page,
			'total_pages' => \ceil( $total / $per_page ),
		];
	}

	private function fetch_ssa_bookings( int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		global $wpdb;
		$table = $wpdb->prefix . 'ssa_appointments';
		$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE deleted_at IS NULL" );
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE deleted_at IS NULL ORDER BY start_date DESC LIMIT %d OFFSET %d",
				$per_page,
				$offset
			),
			ARRAY_A
		);

		$bookings = [];
		foreach ( $results as $row ) {
			$bookings[] = [
				'id' => $row['id'],
				'type' => 'appointment',
				'title' => $row['appointment_type_title'] ?? 'Appointment',
				'customer' => $row['customer_information']['name'] ?? 'Customer',
				'date' => $row['start_date'],
				'status' => $row['status'] ?? 'booked',
				'service' => $row['appointment_type_title'] ?? null,
				'staff' => null,
				'duration' => $row['duration'] ?? null,
			];
		}

		return [
			'bookings' => $bookings,
			'total' => $total,
			'page' => $page,
			'per_page' => $per_page,
			'total_pages' => \ceil( $total / $per_page ),
		];
	}

	private function fetch_tec_events( int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		$query = new \WP_Query( [
			'post_type'      => 'tribe_events',
			'post_status'    => 'publish',
			'posts_per_page' => $per_page,
			'offset'         => $offset,
			'orderby'        => 'meta_value',
			'meta_key'       => '_EventStartDate',
			'order'          => 'DESC',
		] );

		$bookings = [];
		foreach ( $query->posts as $post ) {
			$start_date = \get_post_meta( $post->ID, '_EventStartDate', true );
			$end_date = \get_post_meta( $post->ID, '_EventEndDate', true );
			$venue_id = \get_post_meta( $post->ID, '_EventVenueID', true );
			$venue = $venue_id ? \get_the_title( $venue_id ) : null;

			$bookings[] = [
				'id' => $post->ID,
				'type' => 'event',
				'title' => $post->post_title,
				'description' => \wp_trim_words( $post->post_content, 30 ),
				'start_date' => $start_date,
				'end_date' => $end_date,
				'venue' => $venue,
				'url' => \get_permalink( $post->ID ),
				'status' => $post->post_status,
			];
		}

		return [
			'bookings' => $bookings,
			'total' => $query->found_posts,
			'page' => $page,
			'per_page' => $per_page,
			'total_pages' => \ceil( $query->found_posts / $per_page ),
		];
	}

	private function fetch_booking_stats( string $plugin_name ): array {
		$stats = [
			'plugin' => $plugin_name,
			'total_bookings' => 0,
			'upcoming_bookings' => 0,
			'past_bookings' => 0,
			'cancelled_bookings' => 0,
			'popular_services' => [],
			'peak_hours' => [],
			'revenue' => null,
		];

		switch ( $plugin_name ) {
			case 'Amelia':
				// Try API first
				if ( $this->is_amelia_api_available() ) {
					$appointments = $this->fetch_amelia_api( 'appointments', [ 'limit' => 1000 ] );
					if ( \is_array( $appointments ) && isset( $appointments['data'] ) ) {
						$stats = $this->calculate_amelia_stats( $appointments['data'] );
					}
				} else {
					// Direct table analysis
					global $wpdb;
					$table = $wpdb->prefix . 'amelia_appointments';
					$now = \current_time( 'mysql' );

					$stats['total_bookings'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
					$stats['upcoming_bookings'] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE bookingStart > %s", $now ) );
					$stats['past_bookings'] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE bookingStart <= %s", $now ) );
					$stats['cancelled_bookings'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status = 'canceled'" );

					// Popular services
					$services = $wpdb->get_results(
						"SELECT serviceId, COUNT(*) as count FROM {$table} GROUP BY serviceId ORDER BY count DESC LIMIT 5",
						ARRAY_A
					);
					foreach ( $services as $service ) {
						$stats['popular_services'][] = [
							'service_id' => $service['serviceId'],
							'count' => (int) $service['count'],
						];
					}
				}
				break;

			case 'Simply Schedule Appointments':
				global $wpdb;
				$table = $wpdb->prefix . 'ssa_appointments';
				$now = \current_time( 'mysql' );

				$stats['total_bookings'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE deleted_at IS NULL" );
				$stats['upcoming_bookings'] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE start_date > %s AND deleted_at IS NULL", $now ) );
				$stats['past_bookings'] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE start_date <= %s AND deleted_at IS NULL", $now ) );
				$stats['cancelled_bookings'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status = 'canceled' AND deleted_at IS NULL" );
				break;

			case 'The Events Calendar':
				$query = new \WP_Query( [
					'post_type' => 'tribe_events',
					'post_status' => 'publish',
					'posts_per_page' => 1,
					'fields' => 'ids',
				] );
				$stats['total_bookings'] = $query->found_posts;

				// Count upcoming events
				$upcoming_query = new \WP_Query( [
					'post_type' => 'tribe_events',
					'post_status' => 'publish',
					'posts_per_page' => 1,
					'fields' => 'ids',
					'meta_query' => [
						[
							'key' => '_EventStartDate',
							'value' => \current_time( 'mysql' ),
							'compare' => '>',
							'type' => 'DATETIME',
						],
					],
				] );
				$stats['upcoming_bookings'] = $upcoming_query->found_posts;
				$stats['past_bookings'] = $stats['total_bookings'] - $stats['upcoming_bookings'];
				break;
		}

		return $stats;
	}

	private function calculate_amelia_stats( array $appointments ): array {
		$stats = [
			'plugin' => 'Amelia',
			'total_bookings' => \count( $appointments ),
			'upcoming_bookings' => 0,
			'past_bookings' => 0,
			'cancelled_bookings' => 0,
			'popular_services' => [],
			'peak_hours' => [],
			'revenue' => 0,
		];

		$now = \current_time( 'timestamp' );
		$service_counts = [];
		$hour_counts = array_fill( 0, 24, 0 );

		foreach ( $appointments as $apt ) {
			$start_time = \strtotime( $apt['bookingStart'] ?? '' );
			if ( $start_time ) {
				$hour = (int) \date( 'G', $start_time );
				$hour_counts[ $hour ]++;

				if ( $start_time > $now ) {
					$stats['upcoming_bookings']++;
				} else {
					$stats['past_bookings']++;
				}
			}

			if ( ( $apt['status'] ?? '' ) === 'canceled' ) {
				$stats['cancelled_bookings']++;
			}

			$service_id = $apt['service']['id'] ?? null;
			if ( $service_id ) {
				$service_counts[ $service_id ] = ( $service_counts[ $service_id ] ?? 0 ) + 1;
			}

			// Revenue calculation
			if ( isset( $apt['price'] ) && \is_numeric( $apt['price'] ) ) {
				$stats['revenue'] += (float) $apt['price'];
			}
		}

		// Popular services
		\arsort( $service_counts );
		$service_counts = \array_slice( $service_counts, 0, 5, true );
		foreach ( $service_counts as $service_id => $count ) {
			$stats['popular_services'][] = [
				'service_id' => $service_id,
				'count' => $count,
			];
		}

		// Peak hours
		\arsort( $hour_counts );
		$peak_hours = \array_slice( $hour_counts, 0, 3, true );
		foreach ( $peak_hours as $hour => $count ) {
			$stats['peak_hours'][] = [
				'hour' => $hour,
				'count' => $count,
			];
		}

		return $stats;
	}

	// ------------------------------------------------------------------ //
	// Amelia CRUD operations (Advanced tier)
	// ------------------------------------------------------------------ //

	public function list_amelia_services( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$page = \absint( $request->get_param( 'page' ) ?: 1 );
		$per_page = \absint( $request->get_param( 'per_page' ) ?: 20 );
		$per_page = min( max( $per_page, 1 ), 100 );

		$params = [
			'page' => $page,
			'limit' => $per_page,
		];

		$services = $this->fetch_amelia_api( 'services', $params );
		if ( $services === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to fetch services from Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $services, 200 );
	}

	public function get_amelia_service( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$service_id = \absint( $request->get_param( 'id' ) );
		if ( ! $service_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Service ID is required.',
				[ 'status' => 400 ]
			);
		}

		$service = $this->fetch_amelia_api( 'services/' . $service_id );
		if ( $service === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to fetch service from Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $service, 200 );
	}

	public function create_amelia_service( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$body = $request->get_json_params();
		if ( empty( $body ) ) {
			return new WP_Error(
				'elementify_invalid_data',
				'Request body is empty or invalid.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'POST', 'services', [], $body );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to create service via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $result, 201 );
	}

	public function update_amelia_service( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$service_id = \absint( $request->get_param( 'id' ) );
		if ( ! $service_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Service ID is required.',
				[ 'status' => 400 ]
			);
		}

		$body = $request->get_json_params();
		if ( empty( $body ) ) {
			return new WP_Error(
				'elementify_invalid_data',
				'Request body is empty or invalid.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'PATCH', 'services/' . $service_id, [], $body );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to update service via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $result, 200 );
	}

	public function delete_amelia_service( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$service_id = \absint( $request->get_param( 'id' ) );
		if ( ! $service_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Service ID is required.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'DELETE', 'services/' . $service_id );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to delete service via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( [ 'deleted' => true, 'id' => $service_id ], 200 );
	}

	public function list_amelia_appointments( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$page = \absint( $request->get_param( 'page' ) ?: 1 );
		$per_page = \absint( $request->get_param( 'per_page' ) ?: 20 );
		$per_page = min( max( $per_page, 1 ), 100 );
		$status = $request->get_param( 'status' );

		$params = [
			'page' => $page,
			'limit' => $per_page,
		];
		if ( $status ) {
			$params['status'] = \sanitize_text_field( $status );
		}

		$appointments = $this->fetch_amelia_api( 'appointments', $params );
		if ( $appointments === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to fetch appointments from Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $appointments, 200 );
	}

	public function get_amelia_appointment( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$appointment_id = \absint( $request->get_param( 'id' ) );
		if ( ! $appointment_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Appointment ID is required.',
				[ 'status' => 400 ]
			);
		}

		$appointment = $this->fetch_amelia_api( 'appointments/' . $appointment_id );
		if ( $appointment === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to fetch appointment from Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $appointment, 200 );
	}

	public function create_amelia_appointment( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$body = $request->get_json_params();
		if ( empty( $body ) ) {
			return new WP_Error(
				'elementify_invalid_data',
				'Request body is empty or invalid.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'POST', 'appointments', [], $body );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to create appointment via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $result, 201 );
	}

	public function update_amelia_appointment( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$appointment_id = \absint( $request->get_param( 'id' ) );
		if ( ! $appointment_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Appointment ID is required.',
				[ 'status' => 400 ]
			);
		}

		$body = $request->get_json_params();
		if ( empty( $body ) ) {
			return new WP_Error(
				'elementify_invalid_data',
				'Request body is empty or invalid.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'PATCH', 'appointments/' . $appointment_id, [], $body );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to update appointment via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( $result, 200 );
	}

	public function delete_amelia_appointment( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'booking:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		if ( ! $this->is_amelia_api_available() ) {
			return new WP_Error(
				'elementify_amelia_unavailable',
				'Amelia plugin is not active or API is not available.',
				[ 'status' => 400 ]
			);
		}

		$appointment_id = \absint( $request->get_param( 'id' ) );
		if ( ! $appointment_id ) {
			return new WP_Error(
				'elementify_missing_param',
				'Appointment ID is required.',
				[ 'status' => 400 ]
			);
		}

		$result = $this->call_amelia_api( 'DELETE', 'appointments/' . $appointment_id );
		if ( $result === null ) {
			return new WP_Error(
				'elementify_amelia_api_error',
				'Failed to delete appointment via Amelia API.',
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( [ 'deleted' => true, 'id' => $appointment_id ], 200 );
	}

	// ------------------------------------------------------------------ //
	// Amelia API helper methods
	// ------------------------------------------------------------------ //

	private function is_amelia_api_available(): bool {
		return \function_exists( 'rest_url' ) && \defined( 'AMELIA_VERSION' );
	}

	private function fetch_amelia_api( string $endpoint, array $params = [] ): ?array {
		return $this->call_amelia_api( 'GET', $endpoint, $params );
	}

	private function call_amelia_api( string $method, string $endpoint, array $params = [], array $body = null ): ?array {
		$url = \rest_url( 'amelia/v1/' . $endpoint );
		if ( ! empty( $params ) ) {
			$url = \add_query_arg( $params, $url );
		}

		$args = [
			'method'  => $method,
			'headers' => [
				'Authorization' => 'Bearer ' . $this->get_amelia_api_token(),
				'Content-Type'  => 'application/json',
			],
			'timeout' => 10,
		];

		if ( $body !== null ) {
			$args['body'] = \wp_json_encode( $body );
		}

		$response = \wp_remote_request( $url, $args );

		if ( \is_wp_error( $response ) ) {
			return null;
		}

		$response_body = \wp_remote_retrieve_body( $response );
		$data = \json_decode( $response_body, true );

		return \is_array( $data ) ? $data : null;
	}

	private function get_amelia_api_token(): string {
		// Try to get Amelia API token from wp_options
		$settings = \get_option( 'amelia_settings', [] );
		if ( \is_array( $settings ) && isset( $settings['api']['token'] ) ) {
			return (string) $settings['api']['token'];
		}

		// Fallback: generate a token based on site URL and salt
		return \wp_hash( \site_url() . 'amelia_api_token' );
	}
}