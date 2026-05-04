<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Charity/Donation plugin integration.
 * Auto-detects GiveWP > Charitable.
 */
final class Charity {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Charity detection (CHARITY-001)
	// ------------------------------------------------------------------ //

	public function get_charity_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'charity:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_charity_plugin();
		return new WP_REST_Response( $status, 200 );
	}

	public function list_donation_forms( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'charity:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_charity_plugin();
		if ( ! $status['charity_available'] ) {
			return new WP_Error(
				'elementify_charity_inactive',
				'No active charity plugin detected (GiveWP or Charitable).',
				[ 'status' => 400 ]
			);
		}

		$page = \absint( $request->get_param( 'page' ) ?: 1 );
		$per_page = \absint( $request->get_param( 'per_page' ) ?: 20 );
		$per_page = min( max( $per_page, 1 ), 100 );

		$forms = $this->fetch_donation_forms( $status['plugin'], $page, $per_page );
		return new WP_REST_Response( $forms, 200 );
	}

	public function get_donation_stats( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'charity:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_charity_plugin();
		if ( ! $status['charity_available'] ) {
			return new WP_Error(
				'elementify_charity_inactive',
				'No active charity plugin detected.',
				[ 'status' => 400 ]
			);
		}

		$stats = $this->fetch_donation_stats( $status['plugin'] );
		return new WP_REST_Response( $stats, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & data collection
	// ------------------------------------------------------------------ //

	private function detect_charity_plugin(): array {
		$active = (array) \get_option( 'active_plugins', [] );
		$active_slugs = array_map( fn( $p ) => \dirname( $p ), $active );

		$charity_slugs = [
			'give' => 'GiveWP',
			'charitable' => 'Charitable',
		];

		$detected = [];
		foreach ( $charity_slugs as $slug => $name ) {
			if ( \in_array( $slug, $active_slugs, true ) ) {
				$detected[] = $name;
			}
		}

		if ( empty( $detected ) ) {
			return [
				'charity_available' => false,
				'plugin' => null,
				'version' => null,
				'form_count' => 0,
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_charity_version( $plugin_name );
		$form_count = $this->count_donation_forms( $plugin_name );

		return [
			'charity_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
			'form_count' => $form_count,
		];
	}

	private function get_charity_version( string $plugin_name ): ?string {
		if ( ! \function_exists( 'get_plugin_data' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_slug = \array_search( $plugin_name, [
			'GiveWP' => 'give',
			'Charitable' => 'charitable',
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

	private function count_donation_forms( string $plugin_name ): int {
		// Placeholder implementations
		if ( $plugin_name === 'GiveWP' && \function_exists( 'give_get_forms' ) ) {
			$forms = \give_get_forms();
			return \is_array( $forms ) ? \count( $forms ) : 0;
		}

		if ( $plugin_name === 'Charitable' && \class_exists( 'Charitable_Campaign' ) ) {
			$count = \Charitable_Campaign::get_campaigns_count();
			return \is_numeric( $count ) ? (int) $count : 0;
		}

		// Fallback: WP Query
		$query = new \WP_Query( [
			'post_type'      => [ 'give_forms', 'campaign' ],
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		] );

		return $query->found_posts;
	}

	private function fetch_donation_forms( string $plugin_name, int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		$forms = [];

		if ( $plugin_name === 'GiveWP' && \function_exists( 'give_get_forms' ) ) {
			$args = [
				'number' => $per_page,
				'offset' => $offset,
				'status' => 'publish',
			];
			$forms_query = \give_get_forms( $args );
			if ( \is_array( $forms_query ) ) {
				foreach ( $forms_query as $form ) {
					$forms[] = [
						'id' => $form->ID,
						'title' => $form->post_title,
						'slug' => $form->post_name,
						'status' => $form->post_status,
						'url' => \get_permalink( $form->ID ),
						'goal' => \give_get_meta( $form->ID, '_give_set_goal', true ),
						'raised' => \give_get_meta( $form->ID, '_give_form_earnings', true ),
						'donor_count' => $this->get_givewp_donor_count( $form->ID ),
					];
				}
				$total = $this->count_donation_forms( $plugin_name );
				return [
					'forms' => $forms,
					'total' => $total,
					'page' => $page,
					'per_page' => $per_page,
					'total_pages' => \ceil( $total / $per_page ),
				];
			}
		}

		if ( $plugin_name === 'Charitable' && \class_exists( 'Charitable_Campaign' ) ) {
			$args = [
				'posts_per_page' => $per_page,
				'offset' => $offset,
				'post_status' => 'publish',
			];
			$campaigns = \Charitable_Campaign::query( $args );
			foreach ( $campaigns->posts as $campaign ) {
				$forms[] = [
					'id' => $campaign->ID,
					'title' => $campaign->post_title,
					'slug' => $campaign->post_name,
					'status' => $campaign->post_status,
					'url' => \get_permalink( $campaign->ID ),
					'goal' => \get_post_meta( $campaign->ID, '_campaign_goal', true ),
					'raised' => \get_post_meta( $campaign->ID, '_campaign_donated_amount', true ),
					'donor_count' => $this->get_charitable_donor_count( $campaign->ID ),
				];
			}
			$total = $campaigns->found_posts;
			return [
				'forms' => $forms,
				'total' => $total,
				'page' => $page,
				'per_page' => $per_page,
				'total_pages' => \ceil( $total / $per_page ),
			];
		}

		// Fallback: generic WP Query
		$query = new \WP_Query( [
			'post_type' => [ 'give_forms', 'campaign' ],
			'post_status' => 'publish',
			'posts_per_page' => $per_page,
			'offset' => $offset,
		] );
		foreach ( $query->posts as $post ) {
			$forms[] = [
				'id' => $post->ID,
				'title' => $post->post_title,
				'slug' => $post->post_name,
				'status' => $post->post_status,
				'url' => \get_permalink( $post->ID ),
				'goal' => null,
				'raised' => null,
				'donor_count' => null,
			];
		}
		$total = $query->found_posts;
		return [
			'forms' => $forms,
			'total' => $total,
			'page' => $page,
			'per_page' => $per_page,
			'total_pages' => \ceil( $total / $per_page ),
		];
	}

	private function get_givewp_donor_count( int $form_id ): ?int {
		if ( \function_exists( 'give_count_donors' ) ) {
			$count = \give_count_donors( $form_id );
			return \is_numeric( $count ) ? (int) $count : null;
		}
		return null;
	}

	private function get_charitable_donor_count( int $campaign_id ): ?int {
		if ( \class_exists( 'Charitable_Donations' ) ) {
			$donations = \Charitable_Donations::query( [
				'campaign' => $campaign_id,
				'number' => -1,
				'output' => 'count',
			] );
			return \is_numeric( $donations ) ? (int) $donations : null;
		}
		return null;
	}

	private function fetch_donation_stats( string $plugin_name ): array {
		if ( $plugin_name === 'GiveWP' ) {
			if ( \function_exists( 'give_get_total_earnings' ) && \function_exists( 'give_get_total_donations' ) ) {
				$total_raised = \give_get_total_earnings();
				$total_donations = \give_get_total_donations();
				$donor_count = \function_exists( 'give_count_total_donors' ) ? \give_count_total_donors() : 0;
				$average = $total_donations > 0 ? $total_raised / $total_donations : 0;
				return [
					'total_raised' => (float) $total_raised,
					'donor_count' => (int) $donor_count,
					'average_donation' => (float) $average,
					'total_donations' => (int) $total_donations,
				];
			}
		}

		if ( $plugin_name === 'Charitable' ) {
			if ( \class_exists( 'Charitable_Campaign' ) ) {
				$total_raised = \Charitable_Campaign::get_total_donated_amount();
				$total_donations = \Charitable_Campaign::get_donation_count();
				$donor_count = \class_exists( 'Charitable_Donor' ) ? \Charitable_Donor::count_all() : 0;
				$average = $total_donations > 0 ? $total_raised / $total_donations : 0;
				return [
					'total_raised' => (float) $total_raised,
					'donor_count' => (int) $donor_count,
					'average_donation' => (float) $average,
					'total_donations' => (int) $total_donations,
				];
			}
		}

		// Fallback
		return [
			'total_raised' => 0,
			'donor_count' => 0,
			'average_donation' => 0,
			'total_donations' => 0,
		];
	}
}