<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Api\Wizards\BookingWizard;
use Elementify\MCP\Api\Adapters\AddonRegistry;

/**
 * REST controller for the site assessment endpoint.
 *
 * GET /site/assessment
 *
 * Returns a comprehensive snapshot of the site's Elementor configuration,
 * brand completeness, template library state, and plugin ecosystem — plus
 * a pre-computed issues list for the AI recommendation engine.
 */
final class Assessment {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_assessment( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-audit:read' );
        if ( \is_wp_error( $auth ) ) return $auth;

        $issues = [];

        // ------------------------------------------------------------------ //
        // 1. WordPress basics
        // ------------------------------------------------------------------ //
        $wordpress = [
            'version'      => \get_bloginfo( 'version' ),
            'language'     => \get_bloginfo( 'language' ),
            'timezone'     => \wp_timezone_string(),
            'is_multisite' => \is_multisite(),
            'site_name'    => \get_bloginfo( 'name' ),
            'site_tagline' => \get_bloginfo( 'description' ),
            'admin_url'    => \admin_url(),
        ];

        // ------------------------------------------------------------------ //
        // 2. Elementor status
        // ------------------------------------------------------------------ //
        $el_version     = defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null;
        $el_pro_version = defined( 'ELEMENTOR_PRO_VERSION' ) ? ELEMENTOR_PRO_VERSION : null;
        $kit_id         = (int) \get_option( 'elementor_active_kit', 0 );

        $elementor = [
            'version'       => $el_version,
            'pro'           => ! is_null( $el_pro_version ),
            'pro_version'   => $el_pro_version,
            'active_kit_id' => $kit_id ?: null,
        ];

        if ( ! $el_version ) {
            $issues[] = [ 'severity' => 'critical', 'code' => 'elementor_not_active', 'message' => 'Elementor plugin is not active.' ];
        }

        // ------------------------------------------------------------------ //
        // 3. Brand / Global Styles (from active Elementor Kit)
        // ------------------------------------------------------------------ //
        $global_colors_count     = 0;
        $global_typography_count = 0;
        $logo_id                 = 0;
        $logo_set                = false;

        if ( $kit_id ) {
            $kit_settings = \get_post_meta( $kit_id, '_elementor_page_settings', true );
            if ( is_array( $kit_settings ) ) {
                $global_colors_count     = count( $kit_settings['system_colors'] ?? [] );
                $global_typography_count = count( $kit_settings['system_typography'] ?? [] );
            }
        }

        // WP custom logo (works with most themes including Astra)
        $logo_id  = (int) \get_theme_mod( 'custom_logo', 0 );
        $logo_set = $logo_id > 0;

        if ( ! $logo_set ) {
            $issues[] = [ 'severity' => 'warning', 'code' => 'no_logo', 'message' => 'No site logo is set.' ];
        }
        if ( $global_colors_count === 0 ) {
            $issues[] = [ 'severity' => 'warning', 'code' => 'no_global_colors', 'message' => 'No global color palette defined in Elementor Kit.' ];
        }
        if ( $global_typography_count === 0 ) {
            $issues[] = [ 'severity' => 'warning', 'code' => 'no_global_typography', 'message' => 'No global typography defined in Elementor Kit.' ];
        }

        $brand = [
            'logo_set'               => $logo_set,
            'logo_id'                => $logo_id ?: null,
            'global_colors_count'    => $global_colors_count,
            'global_typography_count' => $global_typography_count,
        ];

        // ------------------------------------------------------------------ //
        // 4. Theme Builder templates
        // ------------------------------------------------------------------ //
        $theme_builder_types = [ 'header', 'footer', 'single', 'single-post', 'single-page', 'archive', 'search', 'error-404', 'popup' ];
        $theme_builder       = [];

        foreach ( $theme_builder_types as $type ) {
            $theme_builder[ $type ] = [];
        }

        $tb_posts = \get_posts( [
            'post_type'      => 'elementor_library',
            'post_status'    => [ 'publish', 'draft' ],
            'posts_per_page' => 200,
            'meta_query'     => [
                [
                    'key'     => '_elementor_template_type',
                    'value'   => $theme_builder_types,
                    'compare' => 'IN',
                ],
            ],
        ] );

        foreach ( $tb_posts as $post ) {
            $type = \get_post_meta( $post->ID, '_elementor_template_type', true );
            if ( isset( $theme_builder[ $type ] ) ) {
                $theme_builder[ $type ][] = [
                    'id'     => $post->ID,
                    'title'  => $post->post_title,
                    'status' => $post->post_status,
                ];
            }
        }

        if ( empty( $theme_builder['header'] ) ) {
            $issues[] = [ 'severity' => 'warning', 'code' => 'no_theme_builder_header', 'message' => 'No header template in Theme Builder.' ];
        }
        if ( empty( $theme_builder['footer'] ) ) {
            $issues[] = [ 'severity' => 'warning', 'code' => 'no_theme_builder_footer', 'message' => 'No footer template in Theme Builder.' ];
        }

        // ------------------------------------------------------------------ //
        // 5. Template library stats
        // ------------------------------------------------------------------ //
        $content_types = [ 'page', 'section', 'container', 'widget', 'popup', 'kit', 'global-widget' ];

        $all_templates = \get_posts( [
            'post_type'      => 'elementor_library',
            'post_status'    => [ 'publish', 'draft', 'private' ],
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'meta_query'     => [
                [
                    'key'     => '_elementor_template_type',
                    'value'   => array_merge( $content_types, [ 'kit' ] ),
                    'compare' => 'IN',
                ],
            ],
        ] );

        $by_type       = array_fill_keys( $content_types, 0 );
        $uncategorized = 0;
        $published     = 0;
        $draft         = 0;

        foreach ( $all_templates as $tid ) {
            $type = \get_post_meta( $tid, '_elementor_template_type', true );
            if ( isset( $by_type[ $type ] ) ) {
                $by_type[ $type ]++;
            }

            $status = \get_post_status( $tid );
            if ( $status === 'publish' ) $published++;
            else $draft++;

            $terms = \wp_get_object_terms( $tid, 'elementor_library_category', [ 'fields' => 'ids' ] );
            if ( empty( $terms ) || \is_wp_error( $terms ) ) {
                $uncategorized++;
            }
        }

        // Remove kit from by_type (internal to Elementor)
        unset( $by_type['kit'] );

        if ( $uncategorized > 5 ) {
            $issues[] = [ 'severity' => 'info', 'code' => 'uncategorized_templates', 'count' => $uncategorized, 'message' => sprintf( '%d templates have no category — consider using audit_library.', $uncategorized ) ];
        }

        $template_library = [
            'total'         => count( $all_templates ),
            'by_type'       => array_filter( $by_type ),
            'uncategorized' => $uncategorized,
            'published'     => $published,
            'draft'         => $draft,
        ];

        // ------------------------------------------------------------------ //
        // 6. Elementor pages/posts
        // ------------------------------------------------------------------ //
        $pages_data = [];
        $pages_total_elementor = 0;

        $public_post_types = \get_post_types( [ 'public' => true, '_builtin' => false ], 'names' );
        $page_post_types   = array_merge( [ 'page', 'post' ], array_values( $public_post_types ) );

        foreach ( $page_post_types as $pt ) {
            $query = new \WP_Query( [
                'post_type'      => $pt,
                'post_status'    => [ 'publish', 'draft' ],
                'posts_per_page' => -1,
                'fields'         => 'ids',
                'meta_query'     => [ [ 'key' => '_elementor_edit_mode', 'value' => 'builder' ] ],
            ] );
            if ( $query->found_posts > 0 ) {
                $pages_data[ $pt ] = $query->found_posts;
                $pages_total_elementor += $query->found_posts;
            }
        }

        $pages = [
            'elementor_total' => $pages_total_elementor,
            'by_post_type'    => $pages_data,
        ];

        // ------------------------------------------------------------------ //
        // 7. Performance indicators
        // ------------------------------------------------------------------ //
        $css_method  = \get_option( 'elementor_css_print_method', 'internal' );
        $opt_dom     = \get_option( 'elementor_optimized_dom_output', '' );
        $load_fa4    = \get_option( 'elementor_load_fa4_shim', '' );

        if ( $css_method === 'internal' ) {
            $issues[] = [ 'severity' => 'info', 'code' => 'css_internal_embedding', 'message' => 'Elementor CSS is embedded inline (internal). Switch to "external" CSS files for better caching.' ];
        }
        if ( $load_fa4 === 'yes' ) {
            $issues[] = [ 'severity' => 'info', 'code' => 'fa4_shim_active', 'message' => 'Font Awesome 4 compatibility shim is active — disable if not needed.' ];
        }

        $performance = [
            'css_print_method'   => $css_method,
            'optimized_dom'      => $opt_dom === 'yes',
            'load_fa4_shim'      => $load_fa4 === 'yes',
        ];

        // ------------------------------------------------------------------ //
        // 8. Active plugins — categorized
        // ------------------------------------------------------------------ //
        $active = (array) \get_option( 'active_plugins', [] );

        $plugin_map = [
            'seo'           => [ 'seo-by-rank-math', 'wordpress-seo', 'all-in-one-seo-pack', 'autodescription', 'squirrly-seo' ],
            'cache'         => [ 'litespeed-cache', 'w3-total-cache', 'wp-super-cache', 'wp-rocket', 'autoptimize', 'sg-cachepress', 'swift-performance-lite' ],
            'forms'         => [ 'gravityforms', 'contact-form-7', 'ninja-forms', 'wpforms-lite', 'wpforms', 'forminator' ],
            'woocommerce'   => [ 'woocommerce' ],
            'multilingual'  => [ 'sitepress-multilingual-cms', 'polylang', 'translatepress-multilingual' ],
            'security'      => [ 'wordfence', 'all-in-one-wp-security-and-firewall', 'better-wp-security', 'wp-cerber' ],
            'backup'        => [ 'updraftplus', 'backwpup', 'all-in-one-wp-migration' ],
            'membership'    => [ 'learndash', 'memberpress', 'restrict-content-pro', 'learnpress' ],
            'booking'       => [ 'ameliabooking', 'simply-schedule-appointments', 'the-events-calendar' ],
        ];

        $plugins_classified = [];
        $active_slugs = array_map( fn( $p ) => dirname( $p ), $active );

        foreach ( $plugin_map as $category => $slugs ) {
            $found = array_values( array_intersect( $active_slugs, $slugs ) );
            if ( ! empty( $found ) ) {
                $plugins_classified[ $category ] = $found;
            }
        }

        $plugins = [
            'active_count'  => count( $active ),
            'classified'    => $plugins_classified,
            'woocommerce'   => isset( $plugins_classified['woocommerce'] ),
            'multilingual'  => ! empty( $plugins_classified['multilingual'] ),
            'booking'       => ! empty( $plugins_classified['booking'] ),
        ];

        // ------------------------------------------------------------------ //
        // 9. Elementor add‑ons (via adapter framework)
        // ------------------------------------------------------------------ //
        $addons = AddonRegistry::get_instance()->get_active_addons();
        $addons_detailed = AddonRegistry::get_instance()->get_all_info();

        $elementor_addons = [
            'active_count' => count( $addons ),
            'addons'       => $addons,
            'detailed'     => $addons_detailed,
        ];

        // ------------------------------------------------------------------ //
        // 10a. Booking gaps & recommendations (if booking plugin detected)
        // ------------------------------------------------------------------ //
        $booking_recommendations = [];
        if ( ! empty( $plugins_classified['booking'] ) ) {
            try {
                $wizard_assessment = [
                    'plugins' => $plugins,
                    'pages'   => $pages,
                ];
                $booking_wizard = new BookingWizard( $wizard_assessment );
                $booking_gaps = $booking_wizard->analyze_gaps();
                foreach ( $booking_gaps as $gap ) {
                    $issues[] = [
                        'severity' => $gap['severity'],
                        'code'     => 'booking_' . $gap['id'],
                        'message'  => $gap['description'],
                    ];
                }
                // Generate booking-specific recommendations
                $raw_recs = $booking_wizard->generate_recommendations();
                foreach ( $raw_recs as $rec ) {
                    // Map priority strings to numeric priority (high=>1, medium=>2, low=>3)
                    $priority_map = [ 'high' => 1, 'medium' => 2, 'low' => 3 ];
                    $priority = $priority_map[ $rec['priority'] ] ?? 2;
                    $booking_recommendations[] = [
                        'id'          => $rec['id'],
                        'priority'    => $priority,
                        'category'    => 'booking',
                        'title'       => $rec['title'],
                        'description' => $rec['description'],
                        'impact'      => 'medium',
                        'effort'      => 'medium',
                        'automated'   => false,
                        'tools'       => [],
                        'blocked_by'  => [],
                    ];
                }
            } catch ( \Throwable $e ) {
                // Silently ignore errors; booking gaps are optional
            }
        }

        // ------------------------------------------------------------------ //
        // 11. Capabilities (Elementify plugin)
        // ------------------------------------------------------------------ //
        $seo_plugin = null;
        if ( ! empty( $plugins_classified['seo'] ) ) {
            $seo_plugin = $plugins_classified['seo'][0];
        }

        $capabilities = [
            'seo_management'       => true,
            'settings_management'  => true,
            'performance_cache'    => true,
            'asset_optimization'   => true,
            'seo_plugin'           => $seo_plugin,
        ];

        // ------------------------------------------------------------------ //
        // 12. Custom Post Types
        // ------------------------------------------------------------------ //
        $cpt_objects = \get_post_types( [ 'public' => true, '_builtin' => false ], 'objects' );
        $custom_post_types = array_values( array_map( function ( $cpt ) {
            return [
                'name'  => $cpt->name,
                'label' => $cpt->label,
                'rest'  => (bool) $cpt->show_in_rest,
            ];
        }, $cpt_objects ) );

        // ------------------------------------------------------------------ //
        // 13. User roles
        // ------------------------------------------------------------------ //
        $roles = array_keys( wp_roles()->roles );

        // ------------------------------------------------------------------ //
        // Compose final response
        // ------------------------------------------------------------------ //
        return new WP_REST_Response( [
            'assessed_at'      => gmdate( 'c' ),
            'wordpress'        => $wordpress,
            'elementor'        => $elementor,
            'brand'            => $brand,
            'theme_builder'    => $theme_builder,
            'template_library' => $template_library,
            'pages'            => $pages,
            'performance'      => $performance,
            'plugins'          => $plugins,
            'elementor_addons' => $elementor_addons,
            'capabilities'     => $capabilities,
            'custom_post_types' => $custom_post_types,
            'user_roles'       => $roles,
            'issues'           => $issues,
            'issues_count'     => [
                'critical' => count( array_filter( $issues, fn( $i ) => $i['severity'] === 'critical' ) ),
                'warning'  => count( array_filter( $issues, fn( $i ) => $i['severity'] === 'warning' ) ),
                'info'     => count( array_filter( $issues, fn( $i ) => $i['severity'] === 'info' ) ),
            ],
            'booking_recommendations' => $booking_recommendations,
        ], 200 );
    }
}
