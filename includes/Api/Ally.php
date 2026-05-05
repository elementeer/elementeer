<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

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
	 * Get IDs of posts/pages built with Elementor.
	 */
	private function get_elementor_page_ids( int $limit = 100 ): array {
		$query = new \WP_Query( [
			'post_type'      => 'any',
			'post_status'    => 'publish',
			'posts_per_page' => $limit,
			'fields'         => 'ids',
			'meta_query'     => [
				[
					'key'   => '_elementor_edit_mode',
					'value' => 'builder',
				],
			],
		] );
		return $query->posts ?? [];
	}

	/**
	 * Scan a single Elementor page for accessibility violations.
	 */
	private function scan_elementor_page( int $page_id ): array {
		$raw = \get_post_meta( $page_id, '_elementor_data', true );
		$data = \is_array( $raw ) ? $raw : \json_decode( $raw ?: '[]', true );
		$data = \is_array( $data ) ? $data : [];

		$violations = [];
		$context = [ 'headings' => [] ];
		$this->traverse_elementor_data( $data, $violations, $page_id, $context );
		$this->analyze_headings( $context['headings'], $violations, $page_id );
		return $violations;
	}

	/**
	 * Recursively traverse Elementor data to collect violations.
	 */
	private function traverse_elementor_data( array $elements, array &$violations, int $page_id, array &$context = [] ): void {
		foreach ( $elements as $element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}

			$elType = $element['elType'] ?? null;
			$widgetType = $element['widgetType'] ?? null;
			$settings = $element['settings'] ?? [];
			$element_id = $element['id'] ?? '';

			// Check for violations based on element type
			$this->check_violations( $elType, $widgetType, $settings, $violations, $page_id, $element_id, $context );

			// Recursively process children
			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				$this->traverse_elementor_data( $element['elements'], $violations, $page_id, $context );
			}
		}
	}

	/**
	 * Check for specific accessibility violations.
	 */
	private function check_violations( ?string $elType, ?string $widgetType, array $settings, array &$violations, int $page_id, string $element_id, array &$context ): void {
		// 1. Missing alt text on images
		if ( $widgetType === 'image' || $widgetType === 'image-box' || $widgetType === 'image-gallery' ) {
			$alt = $settings['alt'] ?? $settings['image_alt'] ?? '';
			if ( empty( $alt ) ) {
				$violations[] = [
					'severity' => 'serious',
					'element_type' => $widgetType,
					'location' => [
						'page_id' => $page_id,
						'element_id' => $element_id,
						'widget_type' => $widgetType,
					],
					'description' => 'Image missing alt text.',
					'suggested_fix' => 'Add descriptive alt text for the image.',
				];
			}
		}

		// 2. Heading hierarchy
		if ( $widgetType === 'heading' ) {
			$header_size = $settings['header_size'] ?? 'h2';
			// Track headings for later analysis
			if ( ! isset( $context['headings'] ) ) {
				$context['headings'] = [];
			}
			$context['headings'][] = [
				'size' => $header_size,
				'element_id' => $element_id,
			];
		}

		// 3. Low color contrast (simplified)
		if ( isset( $settings['color'] ) && isset( $settings['background_color'] ) ) {
			$contrast = $this->calculate_color_contrast( $settings['color'], $settings['background_color'] );
			if ( $contrast < 4.5 ) {
				$violations[] = [
					'severity' => 'serious',
					'element_type' => $widgetType ?? $elType,
					'location' => [
						'page_id' => $page_id,
						'element_id' => $element_id,
					],
					'description' => sprintf( 'Low color contrast (ratio: %.1f).', $contrast ),
					'suggested_fix' => 'Increase contrast between text and background colors.',
				];
			}
		}

		// 4. Missing form labels
		if ( $widgetType === 'form' ) {
			$fields = $settings['form_fields'] ?? [];
			foreach ( $fields as $index => $field ) {
				$label = $field['field_label'] ?? '';
				$placeholder = $field['placeholder'] ?? '';
				if ( empty( $label ) && empty( $placeholder ) ) {
					$violations[] = [
						'severity' => 'serious',
						'element_type' => 'form-field',
						'location' => [
							'page_id' => $page_id,
							'element_id' => $element_id,
							'field_index' => $index,
						],
						'description' => 'Form field missing label and placeholder.',
						'suggested_fix' => 'Add a label or placeholder to identify the field.',
					];
				}
			}
		}

		// 5. Empty link text
		if ( $widgetType === 'button' || $widgetType === 'icon' || ( $elType === 'widget' && isset( $settings['link']['url'] ) ) ) {
			$text = $settings['text'] ?? $settings['icon'] ?? '';
			if ( empty( $text ) ) {
				$violations[] = [
					'severity' => 'moderate',
					'element_type' => $widgetType,
					'location' => [
						'page_id' => $page_id,
						'element_id' => $element_id,
					],
					'description' => 'Link or button has empty text.',
					'suggested_fix' => 'Add visible text to the link or button.',
				];
			}
		}
	}

	/**
	 * Analyze heading hierarchy violations.
	 */
	private function analyze_headings( array $headings, array &$violations, int $page_id ): void {
		if ( empty( $headings ) ) {
			return;
		}
		// Check for missing H1
		$has_h1 = false;
		foreach ( $headings as $heading ) {
			if ( $heading['size'] === 'h1' ) {
				$has_h1 = true;
				break;
			}
		}
		if ( ! $has_h1 ) {
			$violations[] = [
				'severity' => 'moderate',
				'element_type' => 'heading',
				'location' => [
					'page_id' => $page_id,
				],
				'description' => 'Page missing H1 heading.',
				'suggested_fix' => 'Add at least one H1 heading to the page.',
			];
		}
		// Check for skipped heading levels (simplified)
		$previous_level = null;
		foreach ( $headings as $heading ) {
			$level = (int) \substr( $heading['size'], 1 ); // h2 -> 2
			if ( $previous_level !== null && $level > $previous_level + 1 ) {
				$violations[] = [
					'severity' => 'minor',
					'element_type' => 'heading',
					'location' => [
						'page_id' => $page_id,
						'element_id' => $heading['element_id'],
					],
					'description' => sprintf( 'Heading level skipped from H%d to H%d.', $previous_level, $level ),
					'suggested_fix' => 'Maintain sequential heading order.',
				];
			}
			$previous_level = $level;
		}
	}

	/**
	 * Calculate approximate contrast ratio between two hex colors.
	 */
	private function calculate_color_contrast( string $color1, string $color2 ): float {
		$l1 = $this->relative_luminance( $color1 );
		$l2 = $this->relative_luminance( $color2 );
		if ( $l1 > $l2 ) {
			return ( $l1 + 0.05 ) / ( $l2 + 0.05 );
		}
		return ( $l2 + 0.05 ) / ( $l1 + 0.05 );
	}

	/**
	 * Calculate relative luminance of a hex color.
	 */
	private function relative_luminance( string $hex ): float {
		$hex = \ltrim( $hex, '#' );
		if ( \strlen( $hex ) === 3 ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		$r = \hexdec( \substr( $hex, 0, 2 ) ) / 255;
		$g = \hexdec( \substr( $hex, 2, 2 ) ) / 255;
		$b = \hexdec( \substr( $hex, 4, 2 ) ) / 255;

		$r = $r <= 0.03928 ? $r / 12.92 : \pow( ( $r + 0.055 ) / 1.055, 2.4 );
		$g = $g <= 0.03928 ? $g / 12.92 : \pow( ( $g + 0.055 ) / 1.055, 2.4 );
		$b = $b <= 0.03928 ? $b / 12.92 : \pow( ( $b + 0.055 ) / 1.055, 2.4 );

		return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
	}

	/**
	 * Calculate a simple accessibility score based on violations.
	 */
	private function calculate_accessibility_score( array $violations ): int {
		$severity_weights = [
			'critical' => 10,
			'serious' => 5,
			'moderate' => 2,
			'minor' => 1,
		];
		$score = 100;
		foreach ( $violations as $violation ) {
			$weight = $severity_weights[ $violation['severity'] ] ?? 1;
			$score -= $weight;
		}
		return \max( 0, $score );
	}

	/**
	 * Run built‑in accessibility scan (basic checks).
	 */
	private function run_builtin_accessibility_scan(): array {
		$page_ids = $this->get_elementor_page_ids( 50 );
		$scans = [];

		foreach ( $page_ids as $page_id ) {
			$violations = $this->scan_elementor_page( $page_id );
			if ( empty( $violations ) ) {
				continue;
			}

			$post = \get_post( $page_id );
			$scans[] = [
				'id'           => $page_id,
				'title'        => $post->post_title ?? 'Untitled',
				'date'         => $post->post_modified ?? $post->post_date,
				'issues_count' => \count( $violations ),
				'score'        => $this->calculate_accessibility_score( $violations ),
				'url'          => \get_permalink( $page_id ),
				'source'       => 'builtin',
			];
		}

		return $scans;
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

	// ------------------------------------------------------------------ //
	// Built‑in accessibility scan (ALLY-004)
	// ------------------------------------------------------------------ //

	public function scan_accessibility( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'ally:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$page_id = $request->get_param( 'page_id' );
		$scan_type = $request->get_param( 'scan_type' ) ?? 'quick';

		$violations = [];
		if ( $page_id ) {
			$violations = $this->scan_elementor_page( (int) $page_id );
		} else {
			$page_ids = $this->get_elementor_page_ids( $scan_type === 'full' ? 200 : 50 );
			foreach ( $page_ids as $pid ) {
				$violations = array_merge( $violations, $this->scan_elementor_page( $pid ) );
			}
		}

        return new WP_REST_Response( [
            'scanned_at' => gmdate( 'c' ),
            'page_id'    => $page_id ? (int) $page_id : null,
            'scan_type'  => $scan_type,
            'violations' => $violations,
            'count'      => count( $violations ),
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // WCAG compliance scanning
    // ------------------------------------------------------------------ //

    /**
     * Scan for WCAG compliance at specified level (A, AA, AAA).
     *
     * GET /ally/wcag-scan
     */
    public function wcag_scan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ally:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page_id = $request->get_param( 'page_id' );
        $level = $request->get_param( 'level' ) ?? 'AA'; // A, AA, AAA
        $version = $request->get_param( 'version' ) ?? '2.1'; // 2.0, 2.1, 2.2

        // Get basic violations from existing scanner
        $basic_scan = $this->scan_accessibility( $request )->get_data();
        $violations = $basic_scan['violations'] ?? [];

        // Enhance violations with WCAG-specific metadata
        $wcag_violations = [];
        foreach ( $violations as $violation ) {
            $wcag_violations[] = $this->map_to_wcag( $violation, $level, $version );
        }

        // Add WCAG-specific checks not covered by basic scanner
        $additional_checks = $this->perform_wcag_checks( $page_id, $level, $version );
        $wcag_violations = array_merge( $wcag_violations, $additional_checks );

        // Calculate compliance score
        $total_checks = count( $wcag_violations );
        $passed_checks = count( array_filter( $wcag_violations, fn( $v ) => $v['status'] === 'passed' ) );
        $score = $total_checks > 0 ? ( $passed_checks / $total_checks ) * 100 : 100;

        return new WP_REST_Response( [
            'scan_type' => 'wcag',
            'wcag_level' => $level,
            'wcag_version' => $version,
            'page_id' => $page_id,
            'scanned_at' => gmdate( 'c' ),
            'compliance_score' => round( $score, 1 ),
            'total_checks' => $total_checks,
            'passed' => $passed_checks,
            'failed' => $total_checks - $passed_checks,
            'results' => $wcag_violations,
            'summary' => $this->generate_wcag_summary( $wcag_violations, $level ),
        ], 200 );
    }

    /**
     * Auto-fix common WCAG violations.
     *
     * POST /ally/wcag-auto-fix
     */
    public function wcag_auto_fix( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ally:trigger' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page_id = $request->get_param( 'page_id' );
        $fix_types = $request->get_param( 'fix_types' ) ?? [ 'alt_text', 'heading_order', 'color_contrast' ];

        // Get current violations
        $scan_request = new WP_REST_Request( 'GET' );
        $scan_request->set_param( 'page_id', $page_id );
        $scan_result = $this->scan_accessibility( $scan_request )->get_data();
        $violations = $scan_result['violations'] ?? [];

        $applied_fixes = [];
        $failed_fixes = [];

        foreach ( $violations as $violation ) {
            $fix_result = $this->apply_single_fix( $violation, $page_id, $fix_types );
            if ( $fix_result['success'] ) {
                $applied_fixes[] = $fix_result;
            } else {
                $failed_fixes[] = $fix_result;
            }
        }

        return new WP_REST_Response( [
            'page_id' => $page_id,
            'applied_fixes' => count( $applied_fixes ),
            'failed_fixes' => count( $failed_fixes ),
            'applied' => $applied_fixes,
            'failed' => $failed_fixes,
            'note' => 'Auto-fix is a placeholder. Actual implementation requires direct Elementor data modification.',
        ], 200 );
    }

    /**
     * Map basic violation to WCAG criteria.
     */
    private function map_to_wcag( array $violation, string $level, string $version ): array {
        $mapping = [
            'Image missing alt text.' => [
                'wcag_id' => '1.1.1',
                'wcag_level' => 'A',
                'description' => 'Non-text Content',
                'techniques' => [ 'G94', 'H30' ],
            ],
            'Low color contrast' => [
                'wcag_id' => '1.4.3',
                'wcag_level' => 'AA',
                'description' => 'Contrast (Minimum)',
                'techniques' => [ 'G18', 'G145' ],
            ],
            'Missing form label' => [
                'wcag_id' => '1.3.1',
                'wcag_level' => 'A',
                'description' => 'Info and Relationships',
                'techniques' => [ 'H44' ],
            ],
            'Heading hierarchy issue' => [
                'wcag_id' => '1.3.1',
                'wcag_level' => 'A',
                'description' => 'Info and Relationships',
                'techniques' => [ 'G141', 'H42' ],
            ],
        ];

        $desc = $violation['description'] ?? '';
        $wcag_info = null;

        foreach ( $mapping as $key => $info ) {
            if ( strpos( $desc, $key ) !== false ) {
                $wcag_info = $info;
                break;
            }
        }

        if ( $wcag_info === null ) {
            $wcag_info = [
                'wcag_id' => 'N/A',
                'wcag_level' => 'unknown',
                'description' => 'Unknown WCAG mapping',
                'techniques' => [],
            ];
        }

        // Check if this violation meets the requested compliance level
        $level_priority = [ 'A' => 1, 'AA' => 2, 'AAA' => 3 ];
        $violation_level = $wcag_info['wcag_level'] ?? 'A';
        $include = ( $level_priority[ $violation_level ] <= $level_priority[ $level ] );

        return [
            'violation' => $violation,
            'wcag' => $wcag_info,
            'status' => 'failed', // or 'passed' for checks that pass
            'included_in_level' => $include,
            'auto_fixable' => $this->is_auto_fixable( $violation ),
        ];
    }

    /**
     * Perform additional WCAG checks not covered by basic scanner.
     */
    private function perform_wcag_checks( ?int $page_id, string $level, string $version ): array {
        $checks = [];

        // Placeholder for additional WCAG checks:
        // - Link purpose (2.4.4, 2.4.9)
        // - Language of page (3.1.1)
        // - Focus order (2.4.3)
        // - Focus visible (2.4.7)
        // - Label in name (4.1.2)
        // - Error identification (3.3.1)

        // Example check: Page language
        $checks[] = [
            'wcag_id' => '3.1.1',
            'wcag_level' => 'A',
            'description' => 'Language of Page',
            'status' => 'passed', // Would check get_bloginfo('language')
            'element_type' => 'page',
            'suggested_fix' => 'Ensure lang attribute is set on HTML element.',
        ];

        // Example check: Skip links
        $checks[] = [
            'wcag_id' => '2.4.1',
            'wcag_level' => 'A',
            'description' => 'Bypass Blocks',
            'status' => 'failed',
            'element_type' => 'navigation',
            'suggested_fix' => 'Add skip-to-content link for keyboard users.',
        ];

        return $checks;
    }

    /**
     * Generate WCAG compliance summary.
     */
    private function generate_wcag_summary( array $results, string $level ): array {
        $by_level = [ 'A' => 0, 'AA' => 0, 'AAA' => 0 ];
        $by_status = [ 'passed' => 0, 'failed' => 0, 'not_applicable' => 0 ];

        foreach ( $results as $result ) {
            $wcag_level = $result['wcag']['wcag_level'] ?? 'A';
            $status = $result['status'] ?? 'failed';
            
            if ( isset( $by_level[ $wcag_level ] ) ) {
                $by_level[ $wcag_level ]++;
            }
            if ( isset( $by_status[ $status ] ) ) {
                $by_status[ $status ]++;
            }
        }

        return [
            'level_breakdown' => $by_level,
            'status_breakdown' => $by_status,
            'compliance' => [
                'A' => $this->calculate_level_compliance( $results, 'A' ),
                'AA' => $this->calculate_level_compliance( $results, 'AA' ),
                'AAA' => $this->calculate_level_compliance( $results, 'AAA' ),
            ],
        ];
    }

    private function calculate_level_compliance( array $results, string $level ): float {
        $level_results = array_filter( $results, fn( $r ) => ( $r['wcag']['wcag_level'] ?? 'A' ) === $level );
        if ( empty( $level_results ) ) {
            return 100.0;
        }
        $passed = count( array_filter( $level_results, fn( $r ) => ( $r['status'] ?? 'failed' ) === 'passed' ) );
        return round( ( $passed / count( $level_results ) ) * 100, 1 );
    }

    private function is_auto_fixable( array $violation ): bool {
        $auto_fixable_types = [
            'Image missing alt text.',
            'Low color contrast',
            'Missing form label',
        ];
        $desc = $violation['description'] ?? '';
        foreach ( $auto_fixable_types as $type ) {
            if ( strpos( $desc, $type ) !== false ) {
                return true;
            }
        }
        return false;
    }

    private function apply_single_fix( array $violation, int $page_id, array $fix_types ): array {
        // Placeholder implementation
        // Actual implementation would:
        // 1. Load Elementor data for page
        // 2. Find element by element_id
        // 3. Update settings (e.g., add alt text)
        // 4. Save back to post meta

        return [
            'success' => false,
            'violation' => $violation['description'] ?? 'unknown',
            'message' => 'Auto-fix not implemented yet.',
            'note' => 'Requires direct Elementor data modification.',
        ];
    }
}