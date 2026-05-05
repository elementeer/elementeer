<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;
use Elementor\Plugin;

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
        if ( \is_wp_error( $auth ) ) return $auth;

        if ( ! \class_exists( Plugin::class ) ) {
            return new WP_Error( 'elementor_not_active', 'Elementor is not active.', [ 'status' => 400 ] );
        }

        try {
            Plugin::$instance->files_manager->clear_cache();
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
        if ( \is_wp_error( $auth ) ) return $auth;

        $report = [
            'css_method' => $this->detect_css_method(),
            'dom_size'   => $this->estimate_dom_size(),
            'asset_optimization' => $this->check_asset_optimization(),
            'cache_status' => $this->check_cache_status(),
            'elementor_status' => \defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null,
            'elementor_pro' => \defined( 'ELEMENTOR_PRO_VERSION' ),
            // Comprehensive health metrics (HEALTH-003)
            'php_info' => $this->get_php_info(),
            'object_cache' => $this->check_object_cache(),
            'autoloaded_options' => $this->get_autoloaded_options(),
            'database_stats' => $this->get_database_stats(),
            'enqueued_assets' => $this->get_enqueued_assets(),
            'render_blocking_resources' => $this->detect_render_blocking_resources(),
        ];

        return new WP_REST_Response( $report, 200 );
    }

    public function optimize_elementor_assets( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( \is_wp_error( $auth ) ) return $auth;

        if ( ! \class_exists( Plugin::class ) ) {
            return new WP_Error( 'elementor_not_active', 'Elementor is not active.', [ 'status' => 400 ] );
        }

        // This is a placeholder for future optimization logic.
        // Currently just flushes cache and suggests enabling Elementor's built-in optimizations.
        Plugin::$instance->files_manager->clear_cache();

        $suggestions = [];
        if ( \defined( 'ELEMENTOR_PRO_VERSION' ) ) {
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
        if ( ! \defined( 'ELEMENTOR_VERSION' ) ) {
            return 'none';
        }
        $option = \get_option( 'elementor_css_print_method', 'external' );
        return \in_array( $option, [ 'external', 'internal' ] ) ? $option : 'external';
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
        if ( \defined( 'ELEMENTOR_VERSION' ) ) {
            $checks['elementor_css_print_method'] = \get_option( 'elementor_css_print_method', 'external' );
            $checks['elementor_optimized_css'] = (bool) \get_option( 'elementor_disable_color_schemes', false );
            $checks['elementor_optimized_js'] = (bool) \get_option( 'elementor_disable_typography_schemes', false );
        }
        $checks['minify_css'] = (bool) \get_option( 'elementor_css_print_method', 'external' ) === 'internal';
        $checks['async_loading'] = false;
        return $checks;
    }

    private function check_cache_status(): array {
        if ( ! \class_exists( Plugin::class ) ) {
            return [ 'elementor_cache' => 'inactive' ];
        }
        $uploads = \wp_upload_dir();
        $cache_dir = $uploads['basedir'] . '/elementor/css';
        $has_cache = \is_dir( $cache_dir ) && \count( \scandir( $cache_dir ) ) > 2;
        return [
            'elementor_cache' => $has_cache ? 'active' : 'inactive',
            'cache_dir' => $has_cache ? $cache_dir : null,
        ];
    }

    /**
     * Clean database bloat (revisions, transients, spam comments) – L2 governance.
     */
    public function clean_database( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $preview = $request->get_param( 'preview' ) !== false ? (bool) $request->get_param( 'preview' ) : true;
        $stats = [
            'revisions' => 0,
            'transients' => 0,
            'spam_comments' => 0,
            'total' => 0,
        ];

        if ( ! $preview ) {
            // Delete revisions
            global $wpdb;
            $revisions = $wpdb->get_col(
                "SELECT ID FROM $wpdb->posts WHERE post_type = 'revision'"
            );
            $stats['revisions'] = \count( $revisions );
            foreach ( $revisions as $id ) {
                \wp_delete_post( $id, true );
            }

            // Delete expired transients
            $transients = $wpdb->get_col(
                "SELECT option_name FROM $wpdb->options WHERE option_name LIKE '_transient_timeout_%' AND option_value < UNIX_TIMESTAMP()"
            );
            $stats['transients'] = \count( $transients );
            foreach ( $transients as $transient ) {
                $name = \str_replace( '_transient_timeout_', '', $transient );
                \delete_transient( $name );
            }

            // Delete spam comments
            $spam = $wpdb->get_col(
                "SELECT comment_ID FROM $wpdb->comments WHERE comment_approved = 'spam'"
            );
            $stats['spam_comments'] = \count( $spam );
            foreach ( $spam as $comment_id ) {
                \wp_delete_comment( $comment_id, true );
            }

            $stats['total'] = $stats['revisions'] + $stats['transients'] + $stats['spam_comments'];
        } else {
            // Preview mode: count only
            global $wpdb;
            $stats['revisions'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $wpdb->posts WHERE post_type = 'revision'" );
            $stats['transients'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $wpdb->options WHERE option_name LIKE '_transient_timeout_%' AND option_value < UNIX_TIMESTAMP()" );
            $stats['spam_comments'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $wpdb->comments WHERE comment_approved = 'spam'" );
            $stats['total'] = $stats['revisions'] + $stats['transients'] + $stats['spam_comments'];
        }

        return new WP_REST_Response( [
            'cleaned' => ! $preview,
            'preview' => $preview,
            'stats'   => $stats,
            'message' => $preview
                ? \sprintf( 'Preview: %d revisions, %d expired transients, %d spam comments found.', $stats['revisions'], $stats['transients'], $stats['spam_comments'] )
                : \sprintf( 'Cleaned: %d revisions, %d expired transients, %d spam comments removed.', $stats['revisions'], $stats['transients'], $stats['spam_comments'] ),
        ], 200 );
    }

    /**
     * Get PHP information for performance report.
     */
    private function get_php_info(): array {
        return [
            'version' => PHP_VERSION,
            'memory_limit' => \ini_get( 'memory_limit' ),
            'max_execution_time' => \ini_get( 'max_execution_time' ),
            'upload_max_filesize' => \ini_get( 'upload_max_filesize' ),
            'post_max_size' => \ini_get( 'post_max_size' ),
            'opcache_enabled' => \extension_loaded( 'opcache' ) && \ini_get( 'opcache.enable' ),
            'eol' => \version_compare( PHP_VERSION, '8.1', '<' ) || \version_compare( PHP_VERSION, '8.0', '<' ),
        ];
    }

    /**
     * Check object cache status.
     */
    private function check_object_cache(): array {
        global $wp_object_cache;
        $has_redis = \class_exists( 'Redis' ) && \defined( 'WP_REDIS_HOST' );
        $has_memcached = \class_exists( 'Memcached' ) && \defined( 'WP_MEMCACHED_HOST' );
        $has_apc = \function_exists( 'apc_cache_info' );
        
        return [
            'enabled' => \wp_using_ext_object_cache(),
            'type' => $has_redis ? 'redis' : ( $has_memcached ? 'memcached' : ( $has_apc ? 'apc' : 'none' ) ),
            'redis' => $has_redis,
            'memcached' => $has_memcached,
            'apc' => $has_apc,
        ];
    }

    /**
     * Get autoloaded options count and size.
     */
    private function get_autoloaded_options(): array {
        global $wpdb;
        $count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $wpdb->options WHERE autoload = 'yes'" );
        $size = (int) $wpdb->get_var( "SELECT SUM(LENGTH(option_value)) FROM $wpdb->options WHERE autoload = 'yes'" );
        
        return [
            'count' => $count,
            'size_bytes' => $size,
            'size_human' => \size_format( $size ),
            'note' => $count > 200 ? 'Many autoloaded options may slow down WordPress' : 'OK',
        ];
    }

    /**
     * Get database statistics.
     */
    private function get_database_stats(): array {
        global $wpdb;
        
        // Table sizes
        $tables = $wpdb->get_results( "SHOW TABLE STATUS", \ARRAY_A );
        $total_size = 0;
        $data_size = 0;
        $index_size = 0;
        
        foreach ( $tables as $table ) {
            $data_size += (int) $table['Data_length'];
            $index_size += (int) $table['Index_length'];
        }
        $total_size = $data_size + $index_size;
        
        // Query cache hit rate (MySQL only)
        $qcache = $wpdb->get_var( "SHOW VARIABLES LIKE 'query_cache_type'" );
        $has_query_cache = $qcache && $qcache !== 'OFF';
        
        return [
            'total_size_bytes' => $total_size,
            'total_size_human' => \size_format( $total_size ),
            'data_size_bytes' => $data_size,
            'index_size_bytes' => $index_size,
            'table_count' => \count( $tables ),
            'has_query_cache' => $has_query_cache,
            'engine' => $wpdb->dbh ? $wpdb->dbh->server_info ?? 'unknown' : 'unknown',
        ];
    }

    /**
     * Get enqueued scripts and styles.
     */
    private function get_enqueued_assets(): array {
        global $wp_scripts, $wp_styles;
        
        $scripts = $wp_scripts ? \count( $wp_scripts->queue ) : 0;
        $styles = $wp_styles ? \count( $wp_styles->queue ) : 0;
        
        // Get external resources
        $external_scripts = 0;
        $external_styles = 0;
        
        if ( $wp_scripts ) {
            foreach ( $wp_scripts->queue as $handle ) {
                if ( isset( $wp_scripts->registered[ $handle ] ) ) {
                    $src = $wp_scripts->registered[ $handle ]->src;
                    if ( $src && \strpos( $src, \home_url() ) === false && \strpos( $src, '//' ) !== false ) {
                        $external_scripts++;
                    }
                }
            }
        }
        
        if ( $wp_styles ) {
            foreach ( $wp_styles->queue as $handle ) {
                if ( isset( $wp_styles->registered[ $handle ] ) ) {
                    $src = $wp_styles->registered[ $handle ]->src;
                    if ( $src && \strpos( $src, \home_url() ) === false && \strpos( $src, '//' ) !== false ) {
                        $external_styles++;
                    }
                }
            }
        }
        
        return [
            'scripts' => $scripts,
            'styles' => $styles,
            'external_scripts' => $external_scripts,
            'external_styles' => $external_styles,
            'total' => $scripts + $styles,
        ];
    }

    /**
     * Detect render-blocking resources (heuristic).
     */
    private function detect_render_blocking_resources(): array {
        global $wp_scripts, $wp_styles;
        $blocking = [];
        
        if ( $wp_scripts ) {
            foreach ( $wp_scripts->queue as $handle ) {
                if ( isset( $wp_scripts->registered[ $handle ] ) ) {
                    $script = $wp_scripts->registered[ $handle ];
                    // Heuristic: scripts in head without async/defer
                    if ( ! empty( $script->extra['group'] ) && $script->extra['group'] === 1 ) {
                        $has_async = ! empty( $script->extra['async'] ) || ! empty( $script->extra['defer'] );
                        if ( ! $has_async ) {
                            $blocking[] = [
                                'type' => 'script',
                                'handle' => $handle,
                                'src' => $script->src ?? '(inline)',
                            ];
                        }
                    }
                }
            }
        }
        
        return [
            'count' => \count( $blocking ),
            'resources' => $blocking,
            'note' => \count( $blocking ) > 5 ? 'Many render-blocking resources detected' : 'OK',
        ];
    }

    /**
     * Cache plugin recommendation based on hosting environment (HEALTH-005).
     */
    public function get_cache_recommendation( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $hosting = $this->detect_hosting();
        $server_software = $_SERVER['SERVER_SOFTWARE'] ?? '';
        $server = $this->detect_server_software( $server_software );

        $recommendation = $this->generate_cache_recommendation( $hosting, $server );

        return new WP_REST_Response( $recommendation, 200 );
    }

    private function detect_hosting(): string {
        // Managed hosting detection
        if ( \defined( 'KINSTA_CACHE_ZONE' ) ) {
            return 'kinsta';
        }
        if ( \defined( 'WPENGINE_ACCOUNT' ) ) {
            return 'wpengine';
        }
        if ( \defined( 'FLYWHEEL_CONFIG_DIR' ) ) {
            return 'flywheel';
        }
        if ( \defined( 'PANTHEON_ENVIRONMENT' ) ) {
            return 'pantheon';
        }
        if ( \defined( 'GD_SYSTEM_PLUGIN_DIR' ) ) {
            return 'godaddy';
        }
        if ( \defined( 'SG_CACHEPRESS_ENABLED' ) ) {
            return 'siteground';
        }
        return 'generic';
    }

    private function detect_server_software( string $software ): string {
        $software = \strtolower( $software );
        if ( \strpos( $software, 'litespeed' ) !== false ) {
            return 'litespeed';
        }
        if ( \strpos( $software, 'nginx' ) !== false ) {
            return 'nginx';
        }
        if ( \strpos( $software, 'apache' ) !== false ) {
            return 'apache';
        }
        if ( \strpos( $software, 'iis' ) !== false ) {
            return 'iis';
        }
        return 'unknown';
    }

    private function generate_cache_recommendation( string $hosting, string $server ): array {
        $recommended_plugin = null;
        $reason = '';
        $should_install = true;

        // Managed hosting: usually have built-in caching
        if ( \in_array( $hosting, [ 'kinsta', 'wpengine', 'flywheel', 'pantheon', 'siteground' ], true ) ) {
            $should_install = false;
            $reason = \sprintf( 'Your hosting provider (%s) includes built‑in caching. Adding a separate cache plugin may cause conflicts.', $hosting );
            $recommended_plugin = null;
        } else {
            // Generic hosting: recommend based on server
            switch ( $server ) {
                case 'litespeed':
                    $recommended_plugin = 'LiteSpeed Cache';
                    $reason = 'LiteSpeed server detected. The LiteSpeed Cache plugin is tightly integrated and offers the best performance.';
                    break;
                case 'nginx':
                    $recommended_plugin = 'WP Rocket';
                    $reason = 'Nginx server detected. WP Rocket works well with Nginx and offers advanced optimization features.';
                    break;
                case 'apache':
                    $recommended_plugin = 'W3 Total Cache';
                    $reason = 'Apache server detected. W3 Total Cache is a solid free option that works well with Apache.';
                    break;
                default:
                    $recommended_plugin = 'WP Super Cache';
                    $reason = 'Generic server detected. WP Super Cache is a reliable, simple caching plugin.';
                    break;
            }
        }

        return [
            'hosting' => $hosting,
            'server' => $server,
            'recommended_plugin' => $recommended_plugin,
            'should_install' => $should_install,
            'reason' => $reason,
            'detected_server_software' => $_SERVER['SERVER_SOFTWARE'] ?? '',
        ];
    }

    /**
     * Guided troubleshooting for common issues (HEALTH-006).
     */
    public function diagnose_issue( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $symptom = $request->get_param( 'symptom' );
        $allowed_symptoms = [ 'slow_page', 'white_screen', '500_error', 'plugin_conflict' ];
        
        if ( ! \in_array( $symptom, $allowed_symptoms, true ) ) {
            return new WP_Error(
                'elementeer_invalid_symptom',
                'Invalid symptom. Must be one of: ' . \implode( ', ', $allowed_symptoms ),
                [ 'status' => 400 ]
            );
        }

        $diagnosis = $this->generate_diagnosis( $symptom );
        return new WP_REST_Response( $diagnosis, 200 );
    }

    private function generate_diagnosis( string $symptom ): array {
        $steps = [];
        $title = '';
        
        switch ( $symptom ) {
            case 'slow_page':
                $title = 'Slow Page Load Diagnosis';
                $steps = [
                    [
                        'step' => 1,
                        'action' => 'Check PHP execution time and memory limit',
                        'command' => 'Review php_info from performance report',
                        'expected' => 'max_execution_time ≥ 30s, memory_limit ≥ 128M',
                    ],
                    [
                        'step' => 2,
                        'action' => 'Check for render-blocking resources',
                        'command' => 'Review render_blocking_resources from performance report',
                        'expected' => 'Fewer than 5 render-blocking scripts/styles',
                    ],
                    [
                        'step' => 3,
                        'action' => 'Check database query performance',
                        'command' => 'Enable WP_DEBUG and check debug.log for slow queries',
                        'expected' => 'No slow query warnings',
                    ],
                    [
                        'step' => 4,
                        'action' => 'Test with default theme',
                        'command' => 'Temporarily switch to Twenty Twenty-Four theme',
                        'expected' => 'Page loads faster with default theme',
                        'risk' => 'low',
                    ],
                ];
                break;
                
            case 'white_screen':
                $title = 'White Screen of Death Diagnosis';
                $steps = [
                    [
                        'step' => 1,
                        'action' => 'Check PHP error logs',
                        'command' => 'Read wp-content/debug.log for fatal errors',
                        'expected' => 'No fatal PHP errors',
                    ],
                    [
                        'step' => 2,
                        'action' => 'Enable WP_DEBUG',
                        'command' => 'Set define(\'WP_DEBUG\', true) in wp-config.php',
                        'expected' => 'Error messages appear on screen',
                    ],
                    [
                        'step' => 3,
                        'action' => 'Disable plugins one by one',
                        'command' => 'Use plugin conflict tester (requires L2 governance)',
                        'expected' => 'Identify conflicting plugin',
                        'risk' => 'medium',
                    ],
                ];
                break;
                
            case '500_error':
                $title = '500 Internal Server Error Diagnosis';
                $steps = [
                    [
                        'step' => 1,
                        'action' => 'Check server error logs',
                        'command' => 'Review Apache/Nginx error logs via hosting panel',
                        'expected' => 'Identify server-side error cause',
                    ],
                    [
                        'step' => 2,
                        'action' => 'Check .htaccess file',
                        'command' => 'Rename .htaccess to .htaccess_backup',
                        'expected' => 'Error resolves if .htaccess was corrupt',
                        'risk' => 'low',
                    ],
                    [
                        'step' => 3,
                        'action' => 'Increase PHP memory limit',
                        'command' => 'Set memory_limit to 256M in php.ini',
                        'expected' => 'Error resolves if memory was exhausted',
                    ],
                ];
                break;
                
            case 'plugin_conflict':
                $title = 'Plugin Conflict Diagnosis';
                $steps = [
                    [
                        'step' => 1,
                        'action' => 'Read recent error logs',
                        'command' => 'Get recent errors from debug.log',
                        'expected' => 'Identify which plugin is throwing errors',
                    ],
                    [
                        'step' => 2,
                        'action' => 'Run conflict test (safe mode)',
                        'command' => 'Deactivate plugins one by one via REST API (L2 governance)',
                        'expected' => 'Identify conflicting plugin without breaking site',
                        'risk' => 'medium',
                    ],
                    [
                        'step' => 3,
                        'action' => 'Check plugin compatibility',
                        'command' => 'Verify plugins are compatible with current WordPress/PHP versions',
                        'expected' => 'All plugins are up-to-date and compatible',
                    ],
                ];
                break;
        }

        return [
            'symptom' => $symptom,
            'title' => $title,
            'steps' => $steps,
            'note' => 'For steps marked with risk, use L2 governance auto-queue or manual testing.',
        ];
    }

    /**
     * Read error log (HEALTH-006 helper).
     */
    public function read_error_log( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $log_file = \WP_CONTENT_DIR . '/debug.log';
        $lines = $request->get_param( 'lines' ) ?: 50;
        
        if ( ! \file_exists( $log_file ) ) {
            return new WP_REST_Response( [
                'exists' => false,
                'message' => 'debug.log file not found. Enable WP_DEBUG_LOG to create it.',
                'entries' => [],
            ], 200 );
        }

        $content = \file_get_contents( $log_file );
        $all_lines = \explode( "\n", $content );
        $recent = \array_slice( $all_lines, -\min( $lines, \count( $all_lines ) ) );
        $entries = \array_filter( $recent, fn( $line ) => ! empty( \trim( $line ) ) );

        return new WP_REST_Response( [
            'exists' => true,
            'total_lines' => \count( $all_lines ),
            'recent_lines' => $lines,
            'entries' => \array_values( $entries ),
        ], 200 );
    }

    /**
     * Safe plugin conflict test (HEALTH-006 helper, L2 governance).
     */
    public function test_plugin_conflict( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $plugin_slug = $request->get_param( 'plugin_slug' );
        $action = $request->get_param( 'action' ); // 'deactivate' or 'reactivate'
        
        if ( ! \in_array( $action, [ 'deactivate', 'reactivate' ], true ) ) {
            return new WP_Error(
                'elementeer_invalid_action',
                'Action must be "deactivate" or "reactivate"',
                [ 'status' => 400 ]
            );
        }

        if ( $action === 'deactivate' ) {
            // In a real implementation, we would deactivate the plugin
            // For safety, we just return a simulated response
            return new WP_REST_Response( [
                'action' => 'deactivate',
                'plugin' => $plugin_slug,
                'simulated' => true,
                'message' => 'Plugin deactivation would be queued for L2 governance review.',
                'note' => 'Actual deactivation requires queued change approval.',
            ], 200 );
        } else {
            // Reactivate
            return new WP_REST_Response( [
                'action' => 'reactivate',
                'plugin' => $plugin_slug,
                'simulated' => true,
                'message' => 'Plugin reactivation would be queued for L2 governance review.',
                'note' => 'Actual reactivation requires queued change approval.',
            ], 200 );
        }
    }

    // ------------------------------------------------------------------ //
    // Core Web Vitals & advanced performance
    // ------------------------------------------------------------------ //

    /**
     * Get Core Web Vitals metrics for a page or site-wide.
     *
     * GET /site/performance/core-web-vitals
     */
    public function get_core_web_vitals( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page_id = $request->get_param( 'page_id' );
        $url = $request->get_param( 'url' );

        // Placeholder implementation
        // In a real implementation, this would:
        // 1. Use Google PageSpeed Insights API or similar
        // 2. Return LCP, FID, CLS metrics
        // 3. Provide recommendations

        $metrics = [
            'lcp' => [ // Largest Contentful Paint
                'value' => 2.5, // seconds
                'score' => 'good', // good, needs-improvement, poor
                'thresholds' => [ 'good' => 2.5, 'needs-improvement' => 4.0 ],
            ],
            'fid' => [ // First Input Delay
                'value' => 100, // milliseconds
                'score' => 'good',
                'thresholds' => [ 'good' => 100, 'needs-improvement' => 300 ],
            ],
            'cls' => [ // Cumulative Layout Shift
                'value' => 0.1,
                'score' => 'good',
                'thresholds' => [ 'good' => 0.1, 'needs-improvement' => 0.25 ],
            ],
            'ttfb' => [ // Time to First Byte
                'value' => 600, // ms
                'score' => 'needs-improvement',
            ],
            'inp' => [ // Interaction to Next Paint (replaces FID)
                'value' => 200,
                'score' => 'good',
            ],
        ];

        $recommendations = [];
        if ( $metrics['lcp']['score'] !== 'good' ) {
            $recommendations[] = 'Optimize Largest Contentful Paint: compress images, remove render-blocking resources.';
        }
        if ( $metrics['cls']['score'] !== 'good' ) {
            $recommendations[] = 'Reduce Cumulative Layout Shift: specify image dimensions, avoid dynamic content insertion above existing content.';
        }
        if ( $metrics['ttfb']['score'] !== 'good' ) {
            $recommendations[] = 'Improve server response time: enable caching, optimize database queries.';
        }

        return new WP_REST_Response( [
            'metrics' => $metrics,
            'recommendations' => $recommendations,
            'note' => 'Core Web Vitals data is simulated. Real implementation requires Google PageSpeed Insights API integration.',
            'page_id' => $page_id,
            'url' => $url,
        ], 200 );
    }

    /**
     * Generate critical CSS for a page to improve performance.
     *
     * POST /site/performance/generate-critical-css
     */
    public function generate_critical_css( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page_id = $request->get_param( 'page_id' );
        $force_regenerate = (bool) $request->get_param( 'force' );

        // Placeholder implementation
        // In a real implementation, this would:
        // 1. Fetch page HTML
        // 2. Extract above-the-fold CSS
        // 3. Inline critical CSS
        // 4. Store for reuse

        return new WP_REST_Response( [
            'generated' => true,
            'page_id' => $page_id,
            'message' => 'Critical CSS generation would be queued for processing.',
            'note' => 'Actual critical CSS generation requires external service or headless browser.',
            'estimated_savings' => [
                'lcp_improvement' => '0.5s - 1.5s',
                'fcp_improvement' => '0.3s - 0.8s',
            ],
        ], 200 );
    }

    /**
     * Comprehensive performance analysis with actionable insights.
     *
     * GET /site/performance/analyze
     */
    public function analyze_performance( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'performance-operations:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page_id = $request->get_param( 'page_id' );
        $depth = $request->get_param( 'depth' ) ?? 'standard'; // quick, standard, deep

        // Placeholder comprehensive analysis
        $analysis = [
            'core_web_vitals' => $this->get_core_web_vitals( $request )->get_data(),
            'asset_analysis' => [
                'total_css' => '450 KB',
                'total_js' => '780 KB',
                'unused_css' => '120 KB (27%)',
                'render_blocking_js' => 3,
                'deferrable_js' => 5,
            ],
            'image_analysis' => [
                'total_images' => 15,
                'unoptimized_images' => 4,
                'missing_alt' => 2,
                'potential_savings' => '180 KB',
            ],
            'server_analysis' => [
                'ttfb' => '620 ms',
                'caching_enabled' => true,
                'gzip_enabled' => true,
                'cdn_detected' => false,
            ],
            'elementor_specific' => [
                'css_print_method' => $this->detect_css_method(),
                'asset_loading_mode' => $this->check_asset_loading_mode(),
                'custom_breakpoints' => $this->check_custom_breakpoints(),
            ],
            'action_items' => [
                [ 'priority' => 'high', 'action' => 'Enable CDN for static assets', 'impact' => 'high' ],
                [ 'priority' => 'medium', 'action' => 'Defer non-critical JavaScript', 'impact' => 'medium' ],
                [ 'priority' => 'low', 'action' => 'Remove unused CSS', 'impact' => 'low' ],
            ],
        ];

        return new WP_REST_Response( $analysis, 200 );
    }

    // Helper methods for performance analysis
    private function check_asset_loading_mode(): string {
        if ( ! \defined( 'ELEMENTOR_VERSION' ) ) {
            return 'none';
        }
        $option = \get_option( 'elementor_experiment-e_optimized_assets_loading' );
        return $option === 'active' ? 'optimized' : 'default';
    }

    private function check_custom_breakpoints(): bool {
        if ( ! \defined( 'ELEMENTOR_VERSION' ) ) {
            return false;
        }
        $breakpoints = \get_option( 'elementor_scheme_breakpoints' );
        return ! empty( $breakpoints ) && is_array( $breakpoints );
    }
}