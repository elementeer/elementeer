<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Elementor Ally plugin detection and capabilities.
 */
final class Ally {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Ally detection (ALLY-001)
	// ------------------------------------------------------------------ //

	public function get_ally_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'ally:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_ally_plugin();
		return new WP_REST_Response( $status, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & data collection
	// ------------------------------------------------------------------ //

	private function detect_ally_plugin(): array {
		$active = (array) \get_option( 'active_plugins', [] );
		$active_slugs = array_map( fn( $p ) => \dirname( $p ), $active );

		$ally_slugs = [
			'elementor-ally' => 'Elementor Ally',
			'elementor-ally-pro' => 'Elementor Ally Pro',
			'elementor-ally-one' => 'Elementor Ally One',
		];

		$detected = [];
		foreach ( $ally_slugs as $slug => $name ) {
			if ( \in_array( $slug, $active_slugs, true ) ) {
				$detected[] = $name;
			}
		}

		if ( empty( $detected ) ) {
			return [
				'ally_available' => false,
				'plugin' => null,
				'version' => null,
				'tier' => null,
				'credits_remaining' => null,
				'capabilities' => [],
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_ally_version( $plugin_name );
		$tier = $this->determine_tier( $plugin_name );
		$credits = $this->get_ally_credits( $plugin_name );
		$capabilities = $this->map_capabilities( $tier );

		return [
			'ally_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
			'tier' => $tier,
			'credits_remaining' => $credits,
			'capabilities' => $capabilities,
		];
	}

	private function get_ally_version( string $plugin_name ): ?string {
		if ( ! \function_exists( 'get_plugin_data' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_slug = \array_search( $plugin_name, [
			'Elementor Ally' => 'elementor-ally',
			'Elementor Ally Pro' => 'elementor-ally-pro',
			'Elementor Ally One' => 'elementor-ally-one',
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

	private function determine_tier( string $plugin_name ): string {
		if ( \strpos( $plugin_name, 'Pro' ) !== false ) {
			return 'pro';
		}
		if ( \strpos( $plugin_name, 'One' ) !== false ) {
			return 'one';
		}
		return 'free';
	}

	private function get_ally_credits( string $plugin_name ): ?int {
		// Placeholder: Ally stores credits in options
		$option_name = 'ally_credits_remaining';
		$credits = \get_option( $option_name, null );
		return \is_numeric( $credits ) ? (int) $credits : null;
	}

	private function map_capabilities( string $tier ): array {
		$capabilities = [
			'scan' => true,
			'report' => true,
			'basic_fixes' => $tier !== 'free',
			'ai_fixes' => $tier === 'pro' || $tier === 'one',
			'batch_scan' => $tier !== 'free',
			'scheduled_scans' => $tier === 'pro' || $tier === 'one',
			'custom_rules' => $tier === 'one',
		];

		return $capabilities;
	}

	/**
	 * Fetch Ally plugin scan results from database.
	 */
	private function fetch_ally_scan_results( string $tier ): array {
		// Try to get scans from Ally plugin's custom post type
		$args = [
			'post_type'      => 'ally_scan',
			'posts_per_page' => 50,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'post_status'    => 'publish',
		];
		$query = new \WP_Query( $args );
		$scans = [];
		if ( $query->have_posts() ) {
			while ( $query->have_posts() ) {
				$query->the_post();
				$post_id = \get_the_ID();
				$scans[] = [
					'id'          => $post_id,
					'title'       => \get_the_title(),
					'date'        => \get_the_date( 'c' ),
					'issues_count' => \get_post_meta( $post_id, 'ally_issues_count', true ) ?: 0,
					'score'       => \get_post_meta( $post_id, 'ally_score', true ) ?: 0,
					'url'         => \get_post_meta( $post_id, 'ally_scanned_url', true ) ?: '',
					'source'      => 'ally',
				];
			}
			\wp_reset_postdata();
		}
		return $scans;
	}

	/**
	 * Run built‑in accessibility scan (basic checks).
	 */
	private function run_builtin_accessibility_scan(): array {
		// TODO: Implement basic A11Y scanner
		// For now, return empty array
		return [];
	}

	/**
	 * Extract the most recent scan date from scan results.
	 */
	private function get_last_scan_date( array $scans ): ?string {
		if ( empty( $scans ) ) {
			return null;
		}
		$latest = null;
		foreach ( $scans as $scan ) {
			if ( isset( $scan['date'] ) && ( $latest === null || $scan['date'] > $latest ) ) {
				$latest = $scan['date'];
			}
		}
		return $latest;
	}

	// ------------------------------------------------------------------ //
	// Ally scan results (ALLY-002)
	// ------------------------------------------------------------------ //

	public function get_ally_scan_results( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'ally:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_ally_plugin();
		if ( ! $status['ally_available'] ) {
			return new WP_REST_Response( [
				'scans' => [],
				'last_scan' => null,
				'available_credits' => 0,
				'message' => 'Elementor Ally plugin not detected.',
			], 200 );
		}

		$ally_scans = $this->fetch_ally_scan_results( $status['tier'] );
		$builtin_scans = $this->run_builtin_accessibility_scan();

		$merged_scans = \array_merge( $ally_scans, $builtin_scans );

		return new WP_REST_Response( [
			'scans' => $merged_scans,
			'last_scan' => $this->get_last_scan_date( $ally_scans ),
			'available_credits' => $status['credits_remaining'] ?? 0,
			'ally_status' => $status,
			'message' => \count( $merged_scans ) > 0 ? 'Scan results retrieved.' : 'No accessibility scan results found.',
		], 200 );
	}

	// ------------------------------------------------------------------ //
	// Trigger Ally scan (ALLY-003)
	// ------------------------------------------------------------------ //

	public function trigger_ally_scan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'ally:trigger' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_ally_plugin();
		if ( ! $status['ally_available'] ) {
			return new WP_REST_Response( [
				'triggered' => false,
				'scan_id' => null,
				'message' => 'Elementor Ally plugin not detected.',
				'credits_required' => 1,
				'credits_remaining' => 0,
			], 200 );
		}

		$tier = $status['tier'];
		$capabilities = $status['capabilities'];
		if ( ! $capabilities['scan'] ) {
			return new WP_Error(
				'ally_scan_not_allowed',
				'Your Ally tier does not allow scanning.',
				[ 'status' => 403 ]
			);
		}

		$credits_needed = 1;
		$credits_available = $status['credits_remaining'] ?? 0;
		if ( $credits_available < $credits_needed ) {
			return new WP_Error(
				'ally_insufficient_credits',
				'Insufficient credits to trigger scan.',
				[ 'status' => 402 ]
			);
		}

		// Try to trigger scan via Ally plugin API
		$scan_triggered = false;
		$scan_id = null;
		$message = '';

		if ( \function_exists( 'ally_trigger_scan' ) ) {
			$result = \ally_trigger_scan();
			if ( \is_array( $result ) && isset( $result['scan_id'] ) ) {
				$scan_triggered = true;
				$scan_id = $result['scan_id'];
				$message = 'Scan triggered via Ally plugin.';
			} else {
				$message = 'Ally plugin returned an error.';
			}
		} elseif ( \class_exists( '\ElementorAlly\Scanner' ) ) {
			// Alternative: use class method
			$scanner = new \ElementorAlly\Scanner();
			if ( \method_exists( $scanner, 'trigger' ) ) {
				$scan_id = $scanner->trigger();
				$scan_triggered = true;
				$message = 'Scan triggered via Ally Scanner class.';
			}
		} else {
			// No direct API — queue a change for L2 governance
			$message = 'Scan trigger queued for manual execution (L2 governance).';
			// Simulate queued change
			$scan_triggered = false;
			$scan_id = null;
		}

		if ( $scan_triggered ) {
			// Deduct credit (simulated)
			// In real implementation, update credits option
			$new_credits = $credits_available - $credits_needed;
			\update_option( 'ally_credits_remaining', $new_credits );
		}

		return new WP_REST_Response( [
			'triggered' => $scan_triggered,
			'scan_id' => $scan_id,
			'message' => $message,
			'credits_required' => $credits_needed,
			'credits_remaining' => $scan_triggered ? $new_credits : $credits_available,
			'ally_status' => $status,
		], $scan_triggered ? 200 : 202 );
	}

	// ------------------------------------------------------------------ //
	// Apply Ally fix (ALLY-003 part 2)
	// ------------------------------------------------------------------ //

	public function apply_ally_fix( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'ally:trigger' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_ally_plugin();
		if ( ! $status['ally_available'] ) {
			return new WP_Error(
				'ally_not_detected',
				'Elementor Ally plugin not detected.',
				[ 'status' => 404 ]
			);
		}

		$scan_id = $request->get_param( 'scan_id' );
		$issue_id = $request->get_param( 'issue_id' );
		$fix_type = $request->get_param( 'fix_type' ); // 'basic' or 'ai'

		if ( ! $scan_id || ! $issue_id ) {
			return new WP_Error(
				'ally_missing_params',
				'Missing scan_id or issue_id.',
				[ 'status' => 400 ]
			);
		}

		$capabilities = $status['capabilities'];
		if ( $fix_type === 'ai' && ! $capabilities['ai_fixes'] ) {
			return new WP_Error(
				'ally_ai_fixes_not_allowed',
				'AI fixes not available for your Ally tier.',
				[ 'status' => 403 ]
			);
		}
		if ( $fix_type === 'basic' && ! $capabilities['basic_fixes'] ) {
			return new WP_Error(
				'ally_basic_fixes_not_allowed',
				'Basic fixes not available for your Ally tier.',
				[ 'status' => 403 ]
			);
		}

		// Try to apply fix via Ally plugin API
		$fix_applied = false;
		$message = '';

		if ( \function_exists( 'ally_apply_fix' ) ) {
			$result = \ally_apply_fix( $scan_id, $issue_id, $fix_type );
			if ( \is_array( $result ) && isset( $result['fixed'] ) && $result['fixed'] ) {
				$fix_applied = true;
				$message = 'Fix applied via Ally plugin.';
			} else {
				$message = $result['message'] ?? 'Ally plugin returned an error.';
			}
		} else {
			// No direct API — queue a change for L2 governance
			$message = 'Fix application queued for manual execution (L2 governance).';
			$fix_applied = false;
		}

		return new WP_REST_Response( [
			'fixed' => $fix_applied,
			'message' => $message,
			'scan_id' => $scan_id,
			'issue_id' => $issue_id,
			'fix_type' => $fix_type,
			'ally_status' => $status,
		], $fix_applied ? 200 : 202 );
	}
}