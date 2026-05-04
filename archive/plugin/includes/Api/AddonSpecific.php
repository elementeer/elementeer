<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Api\Adapters\AddonRegistry;

/**
 * REST controller for addon‑specific operations.
 *
 * Provides detailed information and control for individual Elementor add‑ons:
 * - Widget management (list, enable/disable, usage analysis)
 * - Post‑type discovery (Crocoblock JetEngine, etc.)
 * - Add‑on‑specific capabilities
 */
final class AddonSpecific {

	private Auth $auth;
	private AddonRegistry $registry;

	public function __construct() {
		$this->auth = Auth::get_instance();
		$this->registry = AddonRegistry::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Add‑on information
	// ------------------------------------------------------------------ //

	/**
	 * Get detailed information for a specific add‑on by its plugin slug.
	 *
	 * GET /addons/{plugin_slug}
	 */
	public function get_addon( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( empty( $plugin_slug ) ) {
			return new WP_Error(
				'missing_plugin_slug',
				'Plugin slug parameter is required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( $adapter->get_info(), 200 );
	}

	/**
	 * List all widgets for a specific add‑on with activation status.
	 *
	 * GET /addons/{plugin_slug}/widgets
	 */
	public function get_addon_widgets( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( empty( $plugin_slug ) ) {
			return new WP_Error(
				'missing_plugin_slug',
				'Plugin slug parameter is required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( $adapter->get_widgets(), 200 );
	}

	/**
	 * List custom post types introduced by an add‑on (e.g., JetEngine CPTs).
	 *
	 * GET /addons/{plugin_slug}/post-types
	 */
	public function get_addon_post_types( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( empty( $plugin_slug ) ) {
			return new WP_Error(
				'missing_plugin_slug',
				'Plugin slug parameter is required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( $adapter->get_post_types(), 200 );
	}

	/**
	 * Get add‑on‑specific capabilities.
	 *
	 * GET /addons/{plugin_slug}/capabilities
	 */
	public function get_addon_capabilities( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( empty( $plugin_slug ) ) {
			return new WP_Error(
				'missing_plugin_slug',
				'Plugin slug parameter is required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( $adapter->get_capabilities(), 200 );
	}

	// ------------------------------------------------------------------ //
	// Add‑on widget management
	// ------------------------------------------------------------------ //

	/**
	 * Toggle activation status of a specific widget within an add‑on.
	 * Only works for add‑ons that store widget status in WordPress options.
	 *
	 * POST /addons/{plugin_slug}/widgets/{widget_id}/toggle
	 */
	public function toggle_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		$widget_id   = $request->get_param( 'widget_id' );
		$enable      = $request->get_param( 'enable' ); // Optional boolean

		if ( empty( $plugin_slug ) || empty( $widget_id ) ) {
			return new WP_Error(
				'missing_parameters',
				'Plugin slug and widget ID parameters are required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		// This is a placeholder implementation.
		// Actual widget toggling depends on each add‑on's storage mechanism.
		// For Essential Addons, the option is 'eael_save_settings' with key 'widget_list'.
		// For Ultimate Addons, it's 'uael_save_settings'.
		// Implementation would need to be adapter‑specific.

		return new WP_REST_Response( [
			'success'    => false,
			'message'    => 'Widget toggling not yet implemented for this add‑on.',
			'plugin'     => $plugin_slug,
			'widget_id'  => $widget_id,
			'note'       => 'This endpoint requires add‑on‑specific implementation in the adapter.',
		], 501 );
	}

	// ------------------------------------------------------------------ //
	// Add‑on usage analysis
	// ------------------------------------------------------------------ //

	/**
	 * Analyze usage of an add‑on's widgets across the site.
	 * Scans Elementor pages to find where widgets from this add‑on are used.
	 *
	 * GET /addons/{plugin_slug}/usage
	 */
	public function analyze_addon_usage( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( empty( $plugin_slug ) ) {
			return new WP_Error(
				'missing_plugin_slug',
				'Plugin slug parameter is required.',
				[ 'status' => 400 ]
			);
		}

		$adapter = $this->registry->get_adapter( $plugin_slug );
		if ( $adapter === null ) {
			return new WP_Error(
				'addon_not_found',
				'Add‑on not found or not installed.',
				[ 'status' => 404 ]
			);
		}

		// Placeholder implementation
		// Actual scanning would need to:
		// 1. Get all Elementor pages/posts
		// 2. Parse _elementor_data meta
		// 3. Count occurrences of widgets with the add‑on's prefix
		// 4. Return statistics

		return new WP_REST_Response( [
			'plugin_slug' => $plugin_slug,
			'widget_prefix' => $adapter->get_elementor_widget_types(),
			'note' => 'Usage analysis not yet implemented. Would scan Elementor pages for widget usage.',
			'placeholder_data' => [
				'total_pages_scanned' => 0,
				'widgets_found' => [],
				'most_used_widget' => null,
			],
		], 200 );
	}

	/**
	 * Analyze widget overlap between installed add‑ons.
	 * Identifies redundant widgets that appear in multiple add‑ons.
	 *
	 * GET /addons/analyze-overlap
	 */
	public function analyze_addon_overlap( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		// Get all add‑ons and their widgets
		$all_addons = $this->registry->get_active_addons();
		$widget_map = [];

		foreach ( $all_addons as $addon ) {
			$adapter = $this->registry->get_adapter( $addon['plugin_slug'] );
			if ( $adapter === null ) {
				continue;
			}

			$widgets = $adapter->get_widgets();
			foreach ( $widgets as $widget ) {
				$widget_name = $this->normalize_widget_name( $widget['title'] );
				if ( ! isset( $widget_map[ $widget_name ] ) ) {
					$widget_map[ $widget_name ] = [];
				}
				$widget_map[ $widget_name ][] = [
					'addon' => $addon['plugin_name'],
					'addon_slug' => $addon['plugin_slug'],
					'widget_id' => $widget['id'],
					'active' => $widget['active'],
				];
			}
		}

		// Find overlaps (widgets appearing in 2+ add‑ons)
		$overlaps = [];
		foreach ( $widget_map as $widget_name => $occurrences ) {
			if ( count( $occurrences ) > 1 ) {
				$overlaps[ $widget_name ] = $occurrences;
			}
		}

		return new WP_REST_Response( [
			'total_addons' => count( $all_addons ),
			'total_widgets' => count( $widget_map ),
			'overlapping_widgets' => count( $overlaps ),
			'overlaps' => $overlaps,
			'recommendations' => $this->generate_overlap_recommendations( $overlaps ),
		], 200 );
	}

	/**
	 * Normalize widget name for comparison (lowercase, remove "Advanced", "Pro", etc.)
	 */
	private function normalize_widget_name( string $name ): string {
		$name = strtolower( $name );
		$name = preg_replace( '/\b(advanced|pro|lite|free|elementor|addon|widget)\b/', '', $name );
		$name = preg_replace( '/[^a-z0-9]/', '', $name );
		return $name;
	}

	/**
	 * Generate recommendations based on widget overlap analysis.
	 */
	private function generate_overlap_recommendations( array $overlaps ): array {
		if ( empty( $overlaps ) ) {
			return [ 'No redundant widgets found.' ];
		}

		$recommendations = [];
		foreach ( $overlaps as $widget_name => $occurrences ) {
			$addon_list = array_map( fn( $occ ) => $occ['addon'], $occurrences );
			$active_addons = array_filter( $occurrences, fn( $occ ) => $occ['active'] );
			
			if ( count( $active_addons ) > 1 ) {
				$recommendations[] = sprintf(
					'Widget "%s" appears in %d add‑ons: %s. Consider deactivating duplicates.',
					$widget_name,
					count( $addon_list ),
					implode( ', ', $addon_list )
				);
			}
		}

		return $recommendations;
	}
}