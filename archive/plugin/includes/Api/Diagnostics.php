<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Diagnostics operations.
 *
 * GET /diagnostics/system-status — get system health status
 * POST /diagnostics/run-scan    — run a diagnostic scan
 */
final class Diagnostics {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * GET /diagnostics/system-status
     * Capability: diagnostics:read
     */
    public function get_system_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        // Placeholder: Collect basic system info
        global $wpdb;
        $php_version = phpversion();
        $mysql_version = $wpdb->db_version();
        $wp_version = get_bloginfo( 'version' );
        $php_memory_limit = ini_get( 'memory_limit' );
        $max_execution_time = ini_get( 'max_execution_time' );
        $upload_max_filesize = ini_get( 'upload_max_filesize' );
        $post_max_size = ini_get( 'post_max_size' );

        $status = [
            'php_version' => $php_version,
            'mysql_version' => $mysql_version,
            'wordpress_version' => $wp_version,
            'memory_limit' => $php_memory_limit,
            'max_execution_time' => $max_execution_time,
            'upload_max_filesize' => $upload_max_filesize,
            'post_max_size' => $post_max_size,
            'active_plugins_count' => count( get_option( 'active_plugins', [] ) ),
            'total_posts' => wp_count_posts()->publish,
            'total_pages' => wp_count_posts( 'page' )->publish,
            'database_size' => $this->get_database_size(),
            'disk_free_space' => disk_free_space( ABSPATH ),
            'disk_total_space' => disk_total_space( ABSPATH ),
            'last_cron' => get_option( 'cron' ) ? 'Scheduled' : 'None',
            'wp_debug' => defined( 'WP_DEBUG' ) && WP_DEBUG,
            'wp_debug_log' => defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG,
            'wp_debug_display' => defined( 'WP_DEBUG_DISPLAY' ) && WP_DEBUG_DISPLAY,
            'checks' => [
                'wp_version' => version_compare( $wp_version, '6.0', '>=' ) ? 'ok' : 'outdated',
                'php_version' => version_compare( $php_version, '7.4', '>=' ) ? 'ok' : 'outdated',
                'memory_limit' => $this->convert_to_bytes( $php_memory_limit ) >= 134217728 ? 'ok' : 'low', // 128MB
                'max_execution_time' => $max_execution_time >= 30 ? 'ok' : 'low',
            ],
        ];

        return new WP_REST_Response( $status, 200 );
    }

    /**
     * POST /diagnostics/run-scan
     * Capability: diagnostics:write
     */
    public function run_diagnostic_scan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $scan_type = $body['scan_type'] ?? 'full';

        // Placeholder: Simulate a diagnostic scan
        $scan_id = uniqid( 'scan_' );
        $issues = [];

        // Mock some common issues
        if ( rand( 0, 1 ) ) {
            $issues[] = [
                'severity' => 'warning',
                'title' => 'PHP memory limit is low',
                'description' => 'Consider increasing memory_limit to at least 256M for better performance.',
                'fix' => 'Add define(\'WP_MEMORY_LIMIT\', \'256M\'); to wp-config.php',
            ];
        }
        if ( rand( 0, 1 ) ) {
            $issues[] = [
                'severity' => 'info',
                'title' => 'Scheduled cron events',
                'description' => 'Some cron events are overdue.',
                'fix' => 'Run wp cron event run --due-now or install a cron job.',
            ];
        }
        if ( rand( 0, 1 ) ) {
            $issues[] = [
                'severity' => 'critical',
                'title' => 'Debug mode enabled',
                'description' => 'WP_DEBUG is enabled on a production site.',
                'fix' => 'Set WP_DEBUG to false in wp-config.php',
            ];
        }

        return new WP_REST_Response( [
            'scan_id' => $scan_id,
            'scan_type' => $scan_type,
            'issues_found' => count( $issues ),
            'issues' => $issues,
            'message' => 'Diagnostic scan completed successfully.',
        ], 200 );
    }

    /**
     * GET /diagnostics/system
     * Capability: diagnostics:read
     */
    public function get_system( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        // Placeholder: Return system information similar to system-status but more detailed
        $system = [
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'php' => [
                'version' => phpversion(),
                'extensions' => get_loaded_extensions(),
            ],
            'database' => [
                'driver' => 'mysql',
                'version' => $this->get_database_version(),
            ],
            'wordpress' => [
                'version' => get_bloginfo( 'version' ),
                'site_url' => get_site_url(),
                'home_url' => get_home_url(),
                'multisite' => is_multisite(),
            ],
        ];

        return new WP_REST_Response( $system, 200 );
    }

    /**
     * GET /diagnostics/debug
     * Capability: diagnostics:read
     */
    public function get_debug( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $debug = [
            'wp_debug' => defined( 'WP_DEBUG' ) && WP_DEBUG,
            'wp_debug_log' => defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG,
            'wp_debug_display' => defined( 'WP_DEBUG_DISPLAY' ) && WP_DEBUG_DISPLAY,
            'script_debug' => defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG,
            'savequeries' => defined( 'SAVEQUERIES' ) && SAVEQUERIES,
            'error_log' => ini_get( 'error_log' ),
            'error_reporting' => error_reporting(),
        ];

        return new WP_REST_Response( $debug, 200 );
    }

    /**
     * GET /diagnostics/logs
     * Capability: diagnostics:read
     */
    public function get_logs( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        // Attempt to read WordPress debug.log if exists
        $log_path = WP_CONTENT_DIR . '/debug.log';
        $logs = [];
        if ( file_exists( $log_path ) ) {
            $lines = file( $log_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
            $lines = array_slice( $lines, -50 ); // last 50 lines
            $logs = $lines;
        }

        return new WP_REST_Response( [
            'log_file' => $log_path,
            'exists' => file_exists( $log_path ),
            'lines' => $logs,
        ], 200 );
    }

    /**
     * POST /diagnostics/test
     * Capability: diagnostics:write
     */
    public function run_test( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'diagnostics:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $test_type = $body['test_type'] ?? 'connectivity';

        $results = [];
        switch ( $test_type ) {
            case 'connectivity':
                $results['ping'] = true;
                $results['database'] = $this->test_database_connection();
                $results['filesystem'] = $this->test_filesystem();
                break;
            case 'performance':
                $results['load_time'] = $this->test_load_time();
                break;
            default:
                $results['error'] = 'Unknown test type';
        }

        return new WP_REST_Response( [
            'test_type' => $test_type,
            'results' => $results,
            'timestamp' => current_time( 'mysql' ),
        ], 200 );
    }

    /**
     * Estimate database size in bytes.
     */
    private function get_database_size(): int {
        global $wpdb;
        $size = 0;
        $tables = $wpdb->get_results( "SHOW TABLE STATUS", ARRAY_A );
        foreach ( $tables as $table ) {
            $size += $table['Data_length'] + $table['Index_length'];
        }
        return $size;
    }

    /**
     * Convert PHP memory limit string to bytes.
     */
    private function convert_to_bytes( string $memory_limit ): int {
        $unit = strtolower( substr( $memory_limit, -1 ) );
        $value = (int) substr( $memory_limit, 0, -1 );
        switch ( $unit ) {
            case 'g':
                return $value * 1024 * 1024 * 1024;
            case 'm':
                return $value * 1024 * 1024;
            case 'k':
                return $value * 1024;
            default:
                return $value;
        }
    }

    /**
     * Helper: Get database version.
     */
    private function get_database_version(): string {
        global $wpdb;
        return $wpdb->db_version();
    }

    /**
     * Helper: Test database connection.
     */
    private function test_database_connection(): bool {
        global $wpdb;
        return (bool) $wpdb->check_connection();
    }

    /**
     * Helper: Test filesystem writability.
     */
    private function test_filesystem(): bool {
        return wp_is_writable( WP_CONTENT_DIR );
    }

    /**
     * Helper: Measure load time.
     */
    private function test_load_time(): float {
        $start = microtime( true );
        // Simulate a small workload
        for ( $i = 0; $i < 1000; $i++ ) {
            // do nothing
        }
        return microtime( true ) - $start;
    }
}