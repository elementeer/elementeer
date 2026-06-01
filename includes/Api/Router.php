<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

/**
 * Registers all REST routes under /wp-json/elementeer/v1/
 */
final class Router {

    public const NAMESPACE = 'elementeer/v1';

    public static function register(): void {
        $templates = new Templates();
        $theme_builder = new ThemeBuilder();
        $translation = new Translation();

        // Templates collection
        register_rest_route( self::NAMESPACE, '/templates', [
            [
                'methods'             => 'GET',
                'callback'            => [ $templates, 'list_templates' ],
                'permission_callback' => '__return_true', // Auth handled inside callback
                'args'                => [
                    'type'     => [
                        'type'              => 'string',
                        'enum'              => [ 'page', 'section', 'container', 'widget', 'popup', 'kit', 'global-widget' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'status'   => [
                        'type'              => 'string',
                        'enum'              => [ 'publish', 'draft', 'private', 'trash' ],
                        'default'           => 'publish',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'search'   => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'category' => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'page'     => [
                        'type'    => 'integer',
                        'default' => 1,
                        'minimum' => 1,
                    ],
                    'per_page' => [
                        'type'    => 'integer',
                        'default' => 20,
                        'minimum' => 1,
                        'maximum' => 100,
                ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $templates, 'create_template' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'title'    => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'type'     => [
                        'type'              => 'string',
                        'enum'              => [ 'page', 'section', 'container', 'widget', 'popup', 'kit', 'global-widget' ],
                        'default'           => 'page',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'status'   => [
                        'type'              => 'string',
                        'enum'              => [ 'publish', 'draft', 'private', 'trash' ],
                        'default'           => 'draft',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'elementor_data' => [
                        'type'              => 'string',
                        'sanitize_callback' => 'wp_kses_post',
                    ],
                    'categories' => [
                        'type'    => 'array',
                        'items'   => [ 'type' => 'string' ],
                        'default' => [],
                    ],
                    'tags' => [
                        'type'    => 'array',
                        'items'   => [ 'type' => 'string' ],
                        'default' => [],
                    ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Add‑ons detection
        // ------------------------------------------------------------------ //
        $addons = new Addons();
        register_rest_route( self::NAMESPACE, '/addons', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addons, 'list_addons' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/detailed', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addons, 'list_detailed' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Add‑on‑specific operations
        // ------------------------------------------------------------------ //
        $addon_specific = new AddonSpecific();
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons))', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons))/widgets', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_widgets' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons))/post-types', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_post_types' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons))/capabilities', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_capabilities' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons))/widgets/(?P<widget_id>[a-zA-Z0-9_:-]+)/toggle', [
            [
                'methods'             => 'POST',
                'callback'            => [ $addon_specific, 'toggle_widget' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                    'widget_id'   => [ 'type' => 'string', 'required' => true ],
                    'enable'      => [ 'type' => 'boolean' ],
                ],
            ],
        ] );
        // Single template
        register_rest_route( self::NAMESPACE, '/templates/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $templates, 'get_template' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PATCH',
                'callback'            => [ $templates, 'update_template' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $templates, 'delete_template' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Duplicate
        register_rest_route( self::NAMESPACE, '/templates/(?P<id>\d+)/duplicate', [
            [
                'methods'             => 'POST',
                'callback'            => [ $templates, 'duplicate_template' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Template data
        register_rest_route( self::NAMESPACE, '/templates/(?P<id>\d+)/data', [
            [
                'methods'             => 'GET',
                'callback'            => [ $templates, 'get_template_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $templates, 'update_template_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Theme Builder templates
        register_rest_route( self::NAMESPACE, '/theme-builder/templates', [
            [
                'methods'             => 'GET',
                'callback'            => [ $theme_builder, 'list_templates' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'type'   => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'status' => [
                        'type'    => 'string',
                        'default' => 'publish',
                    ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $theme_builder, 'create_template' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/theme-builder/templates/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $theme_builder, 'get_template' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PATCH',
                'callback'            => [ $theme_builder, 'update_template' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/theme-builder/templates/(?P<id>\d+)/conditions', [
            [
                'methods'             => 'GET',
                'callback'            => [ $theme_builder, 'get_conditions' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $theme_builder, 'update_conditions' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Pages — read Elementor data from any page/post
        $pages = new Pages();

        register_rest_route( self::NAMESPACE, '/pages', [
            [
                'methods'             => 'GET',
                'callback'            => [ $pages, 'list_pages' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_type' => [
                        'type'              => 'string',
                        'default'           => 'page',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'per_page' => [ 'type' => 'integer', 'default' => 50 ],
                    'page'     => [ 'type' => 'integer', 'default' => 1 ],
                ],
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/pages/(?P<id>\d+)/data', [
            [
                'methods'             => 'GET',
                'callback'            => [ $pages, 'get_page_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'      => [ 'type' => 'integer', 'required' => true ],
                    'extract' => [
                        'type'              => 'string',
                        'enum'              => [ 'all', 'section' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'index'   => [ 'type' => 'integer', 'minimum' => 0 ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $pages, 'update_page_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Translation coverage analysis
        register_rest_route( self::NAMESPACE, '/translation/coverage', [
            [
                'methods'             => 'GET',
                'callback'            => [ $translation, 'get_coverage' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // String translation (LANG-004)
        register_rest_route( self::NAMESPACE, '/translation/strings/untranslated', [
            [
                'methods'             => 'GET',
                'callback'            => [ $translation, 'get_untranslated_strings' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'target_language' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );

        // Ally detection (ALLY-001)
        $ally = new \Elementeer\MCP\Api\Ally();
        register_rest_route( self::NAMESPACE, '/ally/status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $ally, 'get_ally_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/ally/scan/results', [
            [
                'methods'             => 'GET',
                'callback'            => [ $ally, 'get_ally_scan_results' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/ally/scan/accessibility', [
            [
                'methods'             => 'GET',
                'callback'            => [ $ally, 'scan_accessibility' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id'   => [
                        'type'     => 'integer',
                        'required' => false,
                    ],
                    'scan_type' => [
                        'type'     => 'string',
                        'required' => false,
                        'default'  => 'quick',
                        'enum'     => [ 'quick', 'full' ],
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/ally/scan/trigger', [
            [
                'methods'             => 'POST',
                'callback'            => [ $ally, 'trigger_ally_scan' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/ally/fix/apply', [
            [
                'methods'             => 'POST',
                'callback'            => [ $ally, 'apply_ally_fix' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'scan_id'  => [
                        'type'     => 'integer',
                        'required' => true,
                    ],
                    'issue_id' => [
                        'type'     => 'string',
                        'required' => true,
                    ],
                     'fix_type' => [
                         'required' => false,
                         'default'  => 'basic',
                         'enum'     => [ 'basic', 'ai' ],
                     ],
                 ],
             ],
         ] );

        // ------------------------------------------------------------------ //
        // WCAG compliance scanning
        // ------------------------------------------------------------------ //
        register_rest_route( self::NAMESPACE, '/ally/wcag-scan', [
            [
                'methods'             => 'GET',
                'callback'            => [ $ally, 'wcag_scan' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id' => [
                        'type'     => 'integer',
                        'required' => false,
                    ],
                    'level' => [
                        'type'     => 'string',
                        'required' => false,
                        'default'  => 'AA',
                        'enum'     => [ 'A', 'AA', 'AAA' ],
                    ],
                    'version' => [
                        'type'     => 'string',
                        'required' => false,
                        'default'  => '2.1',
                        'enum'     => [ '2.0', '2.1', '2.2' ],
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/ally/wcag-auto-fix', [
            [
                'methods'             => 'POST',
                'callback'            => [ $ally, 'wcag_auto_fix' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id' => [
                        'type'     => 'integer',
                        'required' => false,
                    ],
                    'fix_types' => [
                        'type'     => 'array',
                        'required' => false,
                        'default'  => [ 'alt_text', 'heading_order', 'color_contrast' ],
                        'items'    => [
                            'type' => 'string',
                            'enum' => [ 'alt_text', 'heading_order', 'color_contrast', 'form_labels', 'link_purpose' ],
                        ],
                    ],
                ],
            ],
        ] );

        // LMS integration (LMS-001, LMS-002)
        $lms = new \Elementeer\MCP\Api\Lms();
        register_rest_route( self::NAMESPACE, '/lms/status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $lms, 'get_lms_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/lms/courses', [
            [
                'methods'             => 'GET',
                'callback'            => [ $lms, 'list_courses' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [
                        'type'    => 'integer',
                        'default' => 1,
                        'minimum' => 1,
                    ],
                    'per_page' => [
                        'type'    => 'integer',
                        'default' => 20,
                        'minimum' => 1,
                        'maximum' => 100,
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/lms/courses/(?P<course_id>\d+)/structure', [
            [
                'methods'             => 'GET',
                'callback'            => [ $lms, 'get_course_structure' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'course_id' => [
                        'type'    => 'integer',
                        'required' => true,
                    ],
                ],
            ],
        ] );

        // Charity integration (CHARITY-001, CHARITY-002)
        $charity = new \Elementeer\MCP\Api\Charity();
        register_rest_route( self::NAMESPACE, '/charity/status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $charity, 'get_charity_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/charity/forms', [
            [
                'methods'             => 'GET',
                'callback'            => [ $charity, 'list_donation_forms' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [
                        'type'    => 'integer',
                        'default' => 1,
                        'minimum' => 1,
                    ],
                    'per_page' => [
                        'type'    => 'integer',
                        'default' => 20,
                        'minimum' => 1,
                        'maximum' => 100,
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/charity/stats', [
            [
                'methods'             => 'GET',
                'callback'            => [ $charity, 'get_donation_stats' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Voxel integration (VOXEL-001 through VOXEL-006)
        $voxel = new \Elementeer\MCP\Api\Voxel();
        register_rest_route( self::NAMESPACE, '/voxel/status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'get_voxel_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/post-types', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'list_post_types' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/post-types/(?P<post_type>[a-z0-9_-]+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'get_post_type' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_type' => [
                        'type'        => 'string',
                        'required'    => true,
                        'sanitize_callback' => 'sanitize_key',
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/taxonomies', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'list_taxonomies' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/product-types', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'list_product_types' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/settings', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'get_settings' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/voxel/health', [
            [
                'methods'             => 'GET',
                'callback'            => [ $voxel, 'get_health' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Booking & Events integration (BOOK-001, BOOK-002)
        $booking = new \Elementeer\MCP\Api\Booking();
        register_rest_route( self::NAMESPACE, '/booking/status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'get_booking_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/booking/list', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'list_bookings' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [
                        'type'    => 'integer',
                        'default' => 1,
                        'minimum' => 1,
                    ],
                    'per_page' => [
                        'type'    => 'integer',
                        'default' => 20,
                        'minimum' => 1,
                        'maximum' => 100,
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/booking/stats', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'get_booking_stats' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        // Site info
        register_rest_route( self::NAMESPACE, '/site', [
            [
                'methods'             => 'GET',
                'callback'            => [ new \Elementeer\MCP\Api\Site(), 'get_site_info' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Site assessment — comprehensive snapshot for AI recommendation engine
        register_rest_route( self::NAMESPACE, '/site/assessment', [
            [
                'methods'             => 'GET',
                'callback'            => [ new \Elementeer\MCP\Api\Assessment(), 'get_assessment' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Module wizards
        $wizards = new \Elementeer\MCP\Api\Wizards();
        register_rest_route( self::NAMESPACE, '/site/wizards/(?P<wizard_id>[a-zA-Z0-9_-]+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $wizards, 'get_wizard' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'wizard_id' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );

        // Site settings — WordPress core settings (blogname, homepage, permalinks)
        $settings = new \Elementeer\MCP\Api\Settings();
        register_rest_route( self::NAMESPACE, '/site/settings', [
            [
                'methods'             => 'GET',
                'callback'            => [ $settings, 'get_site_settings' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $settings, 'update_site_settings' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // SEO meta management
        $seo = new \Elementeer\MCP\Api\Seo();
        register_rest_route( self::NAMESPACE, '/site/seo/meta', [
            [
                'methods'             => 'GET',
                'callback'            => [ $seo, 'get_seo_meta' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_id' => [
                        'type'              => 'integer',
                        'required'          => true,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $seo, 'update_seo_meta' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Performance & cache management
        $performance = new \Elementeer\MCP\Api\Performance();
        register_rest_route( self::NAMESPACE, '/site/performance/flush-cache', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'flush_elementor_cache' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/performance/report', [
            [
                'methods'             => 'GET',
                'callback'            => [ $performance, 'get_performance_report' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/performance/clean-database', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'clean_database' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'preview' => [
                        'type'              => 'boolean',
                        'default'           => true,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                ],
            ],
        ] );

        // Site logo
        $logo = new \Elementeer\MCP\Api\Logo();
        register_rest_route( self::NAMESPACE, '/site/logo', [
            [
                'methods'             => 'GET',
                'callback'            => [ $logo, 'get_logo' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $logo, 'set_logo' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Global Styles — Elementor Kit colors + typography
        $gs = new \Elementeer\MCP\Api\GlobalStyles();
        register_rest_route( self::NAMESPACE, '/site/global-styles', [
            [
                'methods'             => 'GET',
                'callback'            => [ $gs, 'get_global_styles' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/global-styles/colors', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $gs, 'set_colors' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/global-styles/typography', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $gs, 'set_typography' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Site context — user role + site purpose + brand notes
        $context = new \Elementeer\MCP\Api\SiteContext();
        register_rest_route( self::NAMESPACE, '/site/context', [
            [
                'methods'             => 'GET',
                'callback'            => [ $context, 'get_context' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $context, 'set_context' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Menus
        $menus = new Menus();
        
        // Content
        $content = new Content();
        
        // Media
        $media = new Media();
        
        // List menus
        register_rest_route( self::NAMESPACE, '/menus', [
            [
                'methods'             => 'GET',
                'callback'            => [ $menus, 'list_menus' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $menus, 'create_menu' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Single menu
        register_rest_route( self::NAMESPACE, '/menus/(?P<id>\d+)', [
            [
                'methods'             => 'DELETE',
                'callback'            => [ $menus, 'delete_menu' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Menu items
        register_rest_route( self::NAMESPACE, '/menus/(?P<menu_id>\d+)/items', [
            [
                'methods'             => 'GET',
                'callback'            => [ $menus, 'list_menu_items' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'menu_id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $menus, 'create_menu_item' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'menu_id' => [ 'type' => 'integer', 'required' => true ],
                    'label'   => [ 'type' => 'string', 'required' => true ],
                    'url'     => [ 'type' => 'string', 'required' => true ],
                    'parent'  => [ 'type' => 'integer' ],
                    'position' => [ 'type' => 'integer' ],
                ],
            ],
        ] );

        // Single menu item
        register_rest_route( self::NAMESPACE, '/menu-items/(?P<id>\d+)', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $menus, 'update_menu_item' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'      => [ 'type' => 'integer', 'required' => true ],
                    'menu_id' => [ 'type' => 'integer', 'required' => true ],
                    'label'   => [ 'type' => 'string' ],
                    'url'     => [ 'type' => 'string' ],
                    'parent'  => [ 'type' => 'integer' ],
                    'position' => [ 'type' => 'integer' ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $menus, 'delete_menu_item' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Menu locations
        register_rest_route( self::NAMESPACE, '/menu-locations', [
            [
                'methods'             => 'GET',
                'callback'            => [ $menus, 'list_menu_locations' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $menus, 'assign_menu_location' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'menu_id'  => [ 'type' => 'integer', 'required' => true ],
                    'location' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Content
        // ------------------------------------------------------------------ //

        // Create page
        register_rest_route( self::NAMESPACE, '/pages', [
            [
                'methods'             => 'POST',
                'callback'            => [ $content, 'create_page' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'title'           => [ 'type' => 'string', 'required' => true ],
                    'content'         => [ 'type' => 'string' ],
                    'status'          => [ 'type' => 'string', 'default' => 'draft' ],
                    'parent'          => [ 'type' => 'integer' ],
                    'elementor_ready' => [ 'type' => 'boolean', 'default' => false ],
                ],
            ],
        ] );

        // Create post
        register_rest_route( self::NAMESPACE, '/posts', [
            [
                'methods'             => 'POST',
                'callback'            => [ $content, 'create_post' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'title'       => [ 'type' => 'string', 'required' => true ],
                    'content'     => [ 'type' => 'string' ],
                    'status'      => [ 'type' => 'string', 'default' => 'draft' ],
                    'categories'  => [ 'type' => 'array', 'items' => [ 'type' => 'integer' ] ],
                    'tags'        => [ 'type' => 'array', 'items' => [ 'type' => 'string' ] ],
                ],
            ],
        ] );

        // Update post meta
        register_rest_route( self::NAMESPACE, '/posts/(?P<id>\d+)/meta', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $content, 'update_post_meta' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'                => [ 'type' => 'integer', 'required' => true ],
                    'slug'              => [ 'type' => 'string' ],
                    'excerpt'           => [ 'type' => 'string' ],
                    'featured_image_id' => [ 'type' => 'integer' ],
                ],
            ],
        ] );

        // Delete post
        register_rest_route( self::NAMESPACE, '/posts/(?P<id>\d+)', [
            [
                'methods'             => 'DELETE',
                'callback'            => [ $content, 'delete_post' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'    => [ 'type' => 'integer', 'required' => true ],
                    'force' => [ 'type' => 'boolean', 'default' => false ],
                ],
            ],
        ] );

        // List taxonomies
        register_rest_route( self::NAMESPACE, '/taxonomies', [
            [
                'methods'             => 'GET',
                'callback'            => [ $content, 'list_taxonomies' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Manage terms for a taxonomy
        register_rest_route( self::NAMESPACE, '/terms/(?P<taxonomy>[a-zA-Z0-9_-]+)', [
            [
                'methods'             => 'POST',
                'callback'            => [ $content, 'manage_terms' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'taxonomy'    => [ 'type' => 'string', 'required' => true ],
                    'name'        => [ 'type' => 'string', 'required' => true ],
                    'slug'        => [ 'type' => 'string' ],
                    'parent'      => [ 'type' => 'integer' ],
                    'description' => [ 'type' => 'string' ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $content, 'manage_terms' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'taxonomy'    => [ 'type' => 'string', 'required' => true ],
                    'id'          => [ 'type' => 'integer', 'required' => true ],
                    'name'        => [ 'type' => 'string' ],
                    'slug'        => [ 'type' => 'string' ],
                    'parent'      => [ 'type' => 'integer' ],
                    'description' => [ 'type' => 'string' ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $content, 'manage_terms' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'taxonomy' => [ 'type' => 'string', 'required' => true ],
                    'id'       => [ 'type' => 'integer', 'required' => true ],
                    'force'    => [ 'type' => 'boolean', 'default' => false ],
                ],
            ],
        ] );

        // List post types
        register_rest_route( self::NAMESPACE, '/post-types', [
            [
                'methods'             => 'GET',
                'callback'            => [ $content, 'list_post_types' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Media
        // ------------------------------------------------------------------ //

        // List media
        register_rest_route( self::NAMESPACE, '/media', [
            [
                'methods'             => 'GET',
                'callback'            => [ $media, 'list_media' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'      => [ 'type' => 'integer', 'default' => 1, 'minimum' => 1 ],
                    'per_page'  => [ 'type' => 'integer', 'default' => 20, 'minimum' => 1, 'maximum' => 100 ],
                    'search'    => [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ],
                    'mime_type' => [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ],
                ],
            ],
        ] );

        // Single media
        register_rest_route( self::NAMESPACE, '/media/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $media, 'get_media' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $media, 'update_media' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'          => [ 'type' => 'integer', 'required' => true ],
                    'alt_text'    => [ 'type' => 'string' ],
                    'title'       => [ 'type' => 'string' ],
                    'caption'     => [ 'type' => 'string' ],
                    'description' => [ 'type' => 'string' ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $media, 'delete_media' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'    => [ 'type' => 'integer', 'required' => true ],
                    'force' => [ 'type' => 'boolean', 'default' => false ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Stack Bootstrap
        // ------------------------------------------------------------------ //
        $stackBootstrap = new StackBootstrap();
        register_rest_route( self::NAMESPACE, '/stack-bootstrap', [
            [
                'methods'             => 'GET',
                'callback'            => [ $stackBootstrap, 'get_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/stack-bootstrap/plan', [
            [
                'methods'             => 'POST',
                'callback'            => [ $stackBootstrap, 'create_plan' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/stack-bootstrap/execute', [
            [
                'methods'             => 'POST',
                'callback'            => [ $stackBootstrap, 'execute_plan' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Diagnostics
        // ------------------------------------------------------------------ //
        $diagnostics = new Diagnostics();
        register_rest_route( self::NAMESPACE, '/diagnostics/system-status', [
            [
                'methods'             => 'GET',
                'callback'            => [ $diagnostics, 'get_system_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/diagnostics/run-scan', [
            [
                'methods'             => 'POST',
                'callback'            => [ $diagnostics, 'run_diagnostic_scan' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/diagnostics/system', [
            [
                'methods'             => 'GET',
                'callback'            => [ $diagnostics, 'get_system' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/diagnostics/debug', [
            [
                'methods'             => 'GET',
                'callback'            => [ $diagnostics, 'get_debug' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/diagnostics/logs', [
            [
                'methods'             => 'GET',
                'callback'            => [ $diagnostics, 'get_logs' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/diagnostics/test', [
            [
                'methods'             => 'POST',
                'callback'            => [ $diagnostics, 'run_test' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Plugin Stack Context
        // ------------------------------------------------------------------ //
        $pluginStackContext = new PluginStackContext();
        register_rest_route( self::NAMESPACE, '/plugin-stack-context', [
            [
                'methods'             => 'GET',
                'callback'            => [ $pluginStackContext, 'get_context' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        do_action( 'elementeer_register_pro_routes' );
        do_action( 'elementeer_register_addons', \Elementeer\MCP\Addons\Registry::get_instance() );
    }
}
