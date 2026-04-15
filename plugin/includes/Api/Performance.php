<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for performance and cache management.
 *
 * POST /site/performance/flush-cache   — flush Elementor CSS cache
 * GET /site/performance/report         — performance report (CSS method, DOM size, asset optimization)
 * POST /site/performance/optimize-assets — optimize Elementor assets (Advanced tier)
 */
final class Performance {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function flush_elementor_cache( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        if ( ! class_exists( '\Elementor\Plugin' ) ) {
            return new WP_Error( 'elementor_not_active', 'Elementor is not active.', [ 'status' => 400 ] );
        }

        try {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
            return new WP_REST_Response( [
                'flushed' => true,
                'message' => 'Elementor CSS cache cleared.',
            ], 200 );
        } catch ( \Exception $e ) {
            return new WP_Error( 'flush_failed', $e->getMessage(), [ 'status' => 500 ] );
        }
    }

    public function get_performance_report( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $report = [
            'css_method' => $this->detect_css_method(),
            'dom_size'   => $this->estimate_dom_size(),
            'asset_optimization' => $this->check_asset_optimization(),
            'cache_status' => $this->check_cache_status(),
            'elementor_status' => defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null,
            'elementor_pro' => defined( 'ELEMENTOR_PRO_VERSION' ),
        ];

        return new WP_REST_Response( $report, 200 );
    }

    public function optimize_elementor_assets( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        if ( ! class_exists( '\Elementor\Plugin' ) ) {
            return new WP_Error( 'elementor_not_active', 'Elementor is not active.', [ 'status' => 400 ] );
        }

        // This is a placeholder for future optimization logic.
        // Currently just flushes cache and suggests enabling Elementor's built-in optimizations.
        \Elementor\Plugin::$instance->files_manager->clear_cache();

        $suggestions = [];
        if ( defined( 'ELEMENTOR_PRO_VERSION' ) ) {
            $suggestions[] = 'Enable Elementor Pro asset optimization in Elementor → Settings → Advanced.';
        } else {
            $suggestions[] = 'Consider using a caching plugin (e.g., WP Rocket, W3 Total Cache).';
        }

        return new WP_REST_Response( [
            'optimized'   => true,
            'message'     => 'Elementor cache cleared. Further optimizations require manual configuration.',
            'suggestions' => $suggestions,
        ], 200 );
    }

    private function detect_css_method(): string {
        if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
            return 'none';
        }
        $option = get_option( 'elementor_css_print_method', 'external' );
        return in_array( $option, [ 'external', 'internal' ] ) ? $option : 'external';
    }

    private function estimate_dom_size(): array {
        // Placeholder: return dummy data.
        // In a real implementation, we could analyze recent pages.
        return [
            'average_nodes' => 0,
            'note' => 'DOM size analysis requires page scanning (not implemented).',
        ];
    }

    private function check_asset_optimization(): array {
        $checks = [];
        if ( defined( 'ELEMENTOR_VERSION' ) ) {
            $checks['elementor_css_print_method'] = get_option( 'elementor_css_print_method', 'external' );
            $checks['elementor_optimized_css'] = (bool) get_option( 'elementor_disable_color_schemes', false );
            $checks['elementor_optimized_js'] = (bool) get_option( 'elementor_disable_typography_schemes', false );
        }
        $checks['minify_css'] = (bool) get_option( 'elementor_css_print_method', 'external' ) === 'internal';
        $checks['async_loading'] = false;
        return $checks;
    }

    private function check_cache_status(): array {
        if ( ! class_exists( '\Elementor\Plugin' ) ) {
            return [ 'elementor_cache' => 'inactive' ];
        }
        $uploads = wp_upload_dir();
        $cache_dir = $uploads['basedir'] . '/elementor/css';
        $has_cache = is_dir( $cache_dir ) && count( scandir( $cache_dir ) ) > 2;
        return [
            'elementor_cache' => $has_cache ? 'active' : 'inactive',
            'cache_dir' => $has_cache ? $cache_dir : null,
        ];
    }
}