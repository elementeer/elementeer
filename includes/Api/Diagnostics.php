<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

final class Diagnostics {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	public function get_system_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( [
			'status'       => 'ok',
			'wordpress'    => \get_bloginfo( 'version' ),
			'php'          => PHP_VERSION,
			'memory_limit' => \ini_get( 'memory_limit' ),
			'max_execution' => \ini_get( 'max_execution_time' ),
			'disk_free'    => \function_exists( 'disk_free_space' ) ? \disk_free_space( ABSPATH ) : null,
			'db_size'      => $this->get_database_size(),
		] );
	}

	public function run_diagnostic_scan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$checks = [
			'php_version'       => \version_compare( PHP_VERSION, '8.0', '>=' ) ? 'pass' : 'fail',
			'memory_limit'      => $this->check_memory(),
			'wp_debug'          => \defined( 'WP_DEBUG' ) && WP_DEBUG ? 'enabled' : 'disabled',
			'elementor_version' => \defined( 'ELEMENTOR_VERSION' ) ? 'pass' : 'fail',
			'cache_plugin'      => $this->detect_cache_plugin() ?: 'none',
			'object_cache'      => \wp_using_ext_object_cache() ? 'enabled' : 'disabled',
		];

		return new WP_REST_Response( [
			'scan'   => 'full',
			'checks' => $checks,
			'status' => \in_array( 'fail', $checks, true ) ? 'issues_found' : 'all_clear',
		] );
	}

	public function get_system( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( [
			'server'       => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
			'php_handler'  => \php_sapi_name(),
			'loaded_extensions' => \get_loaded_extensions(),
			'db_host'      => DB_HOST,
			'db_name'      => DB_NAME,
		] );
	}

	public function get_debug( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( [
			'wp_debug'         => \defined( 'WP_DEBUG' ) && WP_DEBUG,
			'wp_debug_log'     => \defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG,
			'wp_debug_display' => \defined( 'WP_DEBUG_DISPLAY' ) && WP_DEBUG_DISPLAY,
			'error_reporting'  => \error_reporting(),
			'display_errors'   => \ini_get( 'display_errors' ),
			'script_debug'     => \defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG,
			'savequeries'      => \defined( 'SAVEQUERIES' ) && SAVEQUERIES,
		] );
	}

	public function get_logs( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$log_file = \defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG
			? ( \is_string( WP_DEBUG_LOG ) ? WP_DEBUG_LOG : WP_CONTENT_DIR . '/debug.log' )
			: null;

		$entries = [];
		if ( $log_file && \file_exists( $log_file ) ) {
			$lines = \array_slice( \file( $log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) ?: [], -50 );
			foreach ( $lines as $line ) {
				$entries[] = $line;
			}
		}

		return new WP_REST_Response( [
			'log_file_exists'  => $log_file !== null && \file_exists( $log_file ),
			'log_file_path'    => $log_file,
			'log_file_size'    => $log_file && \file_exists( $log_file ) ? \filesize( $log_file ) : 0,
			'recent_entries'   => $entries,
		] );
	}

	public function run_test( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'diagnostics:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$body = \json_decode( $request->get_body(), true ) ?: [];
		$test = $body['test'] ?? 'all';

		return new WP_REST_Response( [
			'test'    => $test,
			'status'  => 'passed',
			'message' => 'Diagnostic test placeholder — real test suite not yet implemented.',
		] );
	}

	private function get_database_size(): ?string {
		global $wpdb;
		if ( ! \method_exists( $wpdb, 'get_var' ) ) {
			return null;
		}
		$size = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = %s",
				DB_NAME
			)
		);
		if ( ! $size ) {
			return null;
		}
		return \size_format( (int) $size );
	}

	private function check_memory(): string {
		$limit = \ini_get( 'memory_limit' );
		if ( $limit === '-1' ) {
			return 'unlimited';
		}
		$bytes = \wp_convert_hr_to_bytes( $limit );
		return $bytes >= 128 * MB_IN_BYTES ? 'pass' : 'low';
	}

	private function detect_cache_plugin(): ?string {
		$plugins = [
			'w3-total-cache/w3-total-cache.php'                 => 'W3 Total Cache',
			'wp-super-cache/wp-cache.php'                       => 'WP Super Cache',
			'wp-rocket/wp-rocket.php'                           => 'WP Rocket',
			'litespeed-cache/litespeed-cache.php'                => 'LiteSpeed Cache',
			'sg-cachepress/sg-cachepress.php'                   => 'SiteGround Optimizer',
			'wp-optimize/wp-optimize.php'                       => 'WP-Optimize',
		];

		foreach ( $plugins as $file => $name ) {
			if ( \is_plugin_active( $file ) ) {
				return $name;
			}
		}

		return null;
	}
}
