<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Voxel (directory/community plugin) integration.
 * Auto-detects Voxel and proxies its REST API.
 */
final class Voxel {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Voxel detection (VOXEL-001)
	// ------------------------------------------------------------------ //

	public function get_voxel_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		return new WP_REST_Response( $status, 200 );
	}

	public function list_post_types( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$post_types = $this->fetch_post_types();
		return new WP_REST_Response( $post_types, 200 );
	}

	public function get_post_type( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$post_type = $request->get_param( 'post_type' );
		if ( empty( $post_type ) ) {
			return new WP_Error(
				'elementify_missing_param',
				'post_type is required.',
				[ 'status' => 400 ]
			);
		}

		$data = $this->fetch_post_type( \sanitize_key( $post_type ) );
		return new WP_REST_Response( $data, 200 );
	}

	public function list_taxonomies( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$taxonomies = $this->fetch_taxonomies();
		return new WP_REST_Response( $taxonomies, 200 );
	}

	public function list_product_types( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$product_types = $this->fetch_product_types();
		return new WP_REST_Response( $product_types, 200 );
	}

	public function get_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$settings = $this->fetch_settings();
		return new WP_REST_Response( $settings, 200 );
	}

	public function get_health( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'voxel:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_voxel();
		if ( ! $status['voxel_available'] ) {
			return new WP_Error(
				'elementify_voxel_inactive',
				'Voxel plugin is not active.',
				[ 'status' => 400 ]
			);
		}

		$health = $this->check_health();
		return new WP_REST_Response( $health, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & Voxel API proxy
	// ------------------------------------------------------------------ //

	private function detect_voxel(): array {
		$available = \class_exists( 'Voxel\\Plugin' )
			|| \function_exists( 'Voxel\\is_debug_mode' )
			|| \class_exists( 'Voxel\\Post_Type' );
		$version = null;
		$post_type_count = 0;
		$taxonomy_count = 0;
		$product_type_count = 0;

		if ( $available ) {
			$version = \get_option( 'voxel_version', null );
			$post_type_count = $this->count_voxel_post_types();
			$taxonomy_count = $this->count_voxel_taxonomies();
			$product_type_count = $this->count_voxel_product_types();
		}

		return [
			'voxel_available'   => $available,
			'version'           => $version,
			'post_type_count'   => $post_type_count,
			'taxonomy_count'    => $taxonomy_count,
			'product_type_count' => $product_type_count,
		];
	}

	private function proxy_voxel_api( string $path ): array|WP_Error {
		$base_url = \rest_url( 'voxel/v1/' );
		$url = $base_url . \ltrim( $path, '/' );

		$response = \wp_remote_get( $url, [
			'timeout' => 10,
			'headers' => [
				'X-WP-Nonce' => \wp_create_nonce( 'wp_rest' ),
			],
		] );

		if ( \is_wp_error( $response ) ) {
			return new WP_Error(
				'elementify_voxel_proxy_failed',
				'Failed to reach Voxel REST API: ' . $response->get_error_message(),
				[ 'status' => 502 ]
			);
		}

		$code = \wp_remote_retrieve_response_code( $response );
		if ( $code >= 400 ) {
			return new WP_Error(
				'elementify_voxel_api_error',
				'Voxel API returned status ' . $code,
				[ 'status' => 502 ]
			);
		}

		$body = \wp_remote_retrieve_body( $response );
		$data = \json_decode( $body, true );

		if ( \json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error(
				'elementify_voxel_invalid_json',
				'Invalid JSON response from Voxel API.',
				[ 'status' => 502 ]
			);
		}

		return $data ?: [];
	}

	private function count_voxel_post_types(): int {
		if ( ! \class_exists( 'Voxel\\Post_Type' ) ) {
			return 0;
		}

		try {
			$items = \Voxel\Post_Type::get_all();
			return \is_array( $items ) ? \count( $items ) : 0;
		} catch ( \Throwable $e ) {
			return 0;
		}
	}

	private function count_voxel_taxonomies(): int {
		if ( ! \class_exists( 'Voxel\\Taxonomy' ) ) {
			return 0;
		}

		try {
			$items = \Voxel\Taxonomy::get_all();
			return \is_array( $items ) ? \count( $items ) : 0;
		} catch ( \Throwable $e ) {
			return 0;
		}
	}

	private function count_voxel_product_types(): int {
		if ( ! \class_exists( 'Voxel\\Product_Type' ) ) {
			return 0;
		}

		try {
			$items = \Voxel\Product_Type::get_all();
			return \is_array( $items ) ? \count( $items ) : 0;
		} catch ( \Throwable $e ) {
			return 0;
		}
	}

	private function fetch_post_types(): array {
		$result = $this->proxy_voxel_api( 'post-types' );
		if ( \is_wp_error( $result ) ) {
			return $this->fetch_post_types_fallback();
		}
		return $result;
	}

	private function fetch_post_type( string $post_type ): array {
		$result = $this->proxy_voxel_api( 'post-types/' . $post_type );
		if ( \is_wp_error( $result ) ) {
			return $this->fetch_post_type_fallback( $post_type );
		}
		return $result;
	}

	private function fetch_taxonomies(): array {
		$result = $this->proxy_voxel_api( 'taxonomies' );
		if ( \is_wp_error( $result ) ) {
			return $this->fetch_taxonomies_fallback();
		}
		return $result;
	}

	private function fetch_product_types(): array {
		$result = $this->proxy_voxel_api( 'product-types' );
		if ( \is_wp_error( $result ) ) {
			return $this->fetch_product_types_fallback();
		}
		return $result;
	}

	private function fetch_settings(): array {
		$result = $this->proxy_voxel_api( 'settings' );
		if ( \is_wp_error( $result ) ) {
			return $this->fetch_settings_fallback();
		}
		return $result;
	}

	// ------------------------------------------------------------------ //
	// Fallback methods (when Voxel REST API is unreachable)
	// ------------------------------------------------------------------ //

	private function fetch_post_types_fallback(): array {
		$types = [];

		if ( ! \class_exists( 'Voxel\\Post_Type' ) ) {
			return [ 'post_types' => [] ];
		}

		try {
			$all = \Voxel\Post_Type::get_all();
		} catch ( \Throwable $e ) {
			return [ 'post_types' => [] ];
		}

		foreach ( $all as $key => $pt ) {
			$types[] = [
				'key'         => $key,
				'label'       => $pt->get_label() ?? $key,
				'singular'    => $pt->get_singular_name() ?? $key,
				'is_managed'  => \method_exists( $pt, 'is_managed_by_voxel' ) ? $pt->is_managed_by_voxel() : false,
				'is_built_in' => \method_exists( $pt, 'is_built_in' ) ? $pt->is_built_in() : false,
			];
		}

		return [ 'post_types' => $types, 'total' => \count( $types ) ];
	}

	private function fetch_post_type_fallback( string $post_type ): array {
		if ( ! \class_exists( 'Voxel\\Post_Type' ) ) {
			return [ 'error' => 'Voxel Post_Type class not found.' ];
		}

		try {
			$pt = \Voxel\Post_Type::get( $post_type );
		} catch ( \Throwable $e ) {
			return [ 'error' => 'Post type not found: ' . $post_type ];
		}

		if ( ! $pt ) {
			return [ 'error' => 'Post type not found: ' . $post_type ];
		}

		return [
			'key'         => $post_type,
			'label'       => $pt->get_label() ?? $post_type,
			'singular'    => $pt->get_singular_name() ?? $post_type,
			'is_managed'  => \method_exists( $pt, 'is_managed_by_voxel' ) ? $pt->is_managed_by_voxel() : false,
			'is_built_in' => \method_exists( $pt, 'is_built_in' ) ? $pt->is_built_in() : false,
			'fields'      => $this->get_post_type_fields( $pt ),
		];
	}

	private function get_post_type_fields( $pt ): array {
		try {
			if ( \method_exists( $pt, 'get_fields' ) ) {
				$fields = $pt->get_fields();
				$result = [];
				foreach ( $fields as $key => $field ) {
					$result[] = [
						'key'  => $key,
						'type' => $field['type'] ?? 'text',
						'label' => $field['label'] ?? $key,
					];
				}
				return $result;
			}
		} catch ( \Throwable $e ) {
			// Silently handle
		}
		return [];
	}

	private function fetch_taxonomies_fallback(): array {
		$taxonomies = [];

		if ( ! \class_exists( 'Voxel\\Taxonomy' ) ) {
			return [ 'taxonomies' => [] ];
		}

		try {
			$all = \Voxel\Taxonomy::get_all();
		} catch ( \Throwable $e ) {
			return [ 'taxonomies' => [] ];
		}

		foreach ( $all as $key => $tax ) {
			$post_types = \method_exists( $tax, 'get_post_types' )
				? $tax->get_post_types()
				: [];
			$taxonomies[] = [
				'key'      => $key,
				'label'    => $tax->get_label() ?? $key,
				'singular' => $tax->get_singular_name() ?? $key,
				'post_types' => $post_types,
			];
		}

		return [ 'taxonomies' => $taxonomies, 'total' => \count( $taxonomies ) ];
	}

	private function fetch_product_types_fallback(): array {
		$product_types = [];

		if ( ! \class_exists( 'Voxel\\Product_Type' ) ) {
			return [ 'product_types' => [] ];
		}

		try {
			$all = \Voxel\Product_Type::get_all();
		} catch ( \Throwable $e ) {
			return [ 'product_types' => [] ];
		}

		foreach ( $all as $key => $pt ) {
			$product_types[] = [
				'key'   => $key,
				'label' => $pt->get_label() ?? $key,
			];
		}

		return [ 'product_types' => $product_types, 'total' => \count( $product_types ) ];
	}

	private function fetch_settings_fallback(): array {
		$settings = \get_option( 'voxel_settings', [] );
		if ( ! \is_array( $settings ) ) {
			$settings = [];
		}

		return [
			'settings' => $settings,
		];
	}

	// ------------------------------------------------------------------ //
	// Health check
	// ------------------------------------------------------------------ //

	private function check_health(): array {
		$issues = [];

		$rest_reachable = $this->test_rest_reachability();
		if ( ! $rest_reachable ) {
			$issues[] = 'Voxel REST API endpoints are not reachable at /wp-json/voxel/v1/.';
		}

		$table_issues = $this->check_table_existence();
		if ( ! empty( $table_issues ) ) {
			$issues = \array_merge( $issues, $table_issues );
		}

		$memory = $this->get_memory_usage();

		return [
			'healthy'         => empty( $issues ),
			'issues'          => $issues,
			'rest_reachable'  => $rest_reachable,
			'tables_healthy'  => empty( $table_issues ),
			'memory_usage_mb' => $memory,
		];
	}

	private function test_rest_reachability(): bool {
		$response = \wp_remote_get( \rest_url( 'voxel/v1/' ), [
			'timeout'   => 5,
			'blocking'  => true,
		] );

		if ( \is_wp_error( $response ) ) {
			return false;
		}

		$code = \wp_remote_retrieve_response_code( $response );
		return $code >= 200 && $code < 500;
	}

	private function check_table_existence(): array {
		global $wpdb;
		$issues = [];

		$expected_tables = [
			$wpdb->prefix . 'voxel_post_type'    => 'voxel_post_type',
			$wpdb->prefix . 'voxel_taxonomy'     => 'voxel_taxonomy',
			$wpdb->prefix . 'voxel_product_type' => 'voxel_product_type',
			$wpdb->prefix . 'voxel_settings'     => 'voxel_settings',
		];

		$existing_tables = $wpdb->get_col( "SHOW TABLES LIKE '{$wpdb->prefix}voxel_%'" );

		foreach ( $expected_tables as $table => $name ) {
			if ( ! \in_array( $table, $existing_tables, true ) ) {
				$issues[] = "Missing table: {$name} ({$table})";
			}
		}

		return $issues;
	}

	private function get_memory_usage(): ?float {
		if ( ! \function_exists( 'memory_get_usage' ) ) {
			return null;
		}

		$bytes = \memory_get_usage( true );
		return \round( $bytes / 1024 / 1024, 2 );
	}
}
