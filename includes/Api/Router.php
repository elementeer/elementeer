<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

/**
 * Registers all REST routes under /wp-json/elementify/v1/
 */
final class Router {

    public const NAMESPACE = 'elementify/v1';

    public static function register(): void {
        $templates = new Templates();
        $importExport = new ImportExport();
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
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)/widgets', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_widgets' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)/post-types', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_post_types' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)/capabilities', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'get_addon_capabilities' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)/widgets/(?P<widget_id>[a-zA-Z0-9_-]+)/toggle', [
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
        register_rest_route( self::NAMESPACE, '/addons/(?P<plugin_slug>[a-zA-Z0-9_-]+)/usage', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'analyze_addon_usage' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/addons/analyze-overlap', [
            [
                'methods'             => 'GET',
                'callback'            => [ $addon_specific, 'analyze_addon_overlap' ],
                'permission_callback' => '__return_true',
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

        // Media sideload
        register_rest_route( self::NAMESPACE, '/media/sideload', [
            [
                'methods'             => 'POST',
                'callback'            => [ new \Elementify\MCP\Api\MediaSideload(), 'sideload' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Theme Builder templates
        register_rest_route( self::NAMESPACE, '/theme-builder/templates', [
            [
                'methods'             => 'POST',
                'callback'            => [ new \Elementify\MCP\Api\ThemeBuilder(), 'create_template' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Library import — dedicated seam for local-site imports from curated or local sources
        register_rest_route( self::NAMESPACE, '/library/import', [
            [
                'methods'             => 'POST',
                'callback'            => [ $templates, 'import_library_asset' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // External data import (CSV/JSON/XML)
        register_rest_route( self::NAMESPACE, '/import/external', [
            [
                'methods'             => 'POST',
                'callback'            => [ $importExport, 'import_external_data' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Data export (CSV/JSON)
        register_rest_route( self::NAMESPACE, '/export/data', [
            [
                'methods'             => 'POST',
                'callback'            => [ $importExport, 'export_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_type' => [
                        'type'              => 'string',
                        'default'           => 'post',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'format' => [
                        'type'              => 'string',
                        'default'           => 'json',
                        'enum'              => [ 'csv', 'json' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'limit' => [
                        'type'              => 'integer',
                        'default'           => 100,
                        'minimum'           => 1,
                        'maximum'           => 1000,
                        'sanitize_callback' => 'absint',
                    ],
                    'offset' => [
                        'type'              => 'integer',
                        'default'           => 0,
                        'minimum'           => 0,
                        'sanitize_callback' => 'absint',
                    ],
                    'filters' => [
                        'type'              => 'object',
                        'default'           => [],
                        'sanitize_callback' => function( $value ) {
                            return \is_array( $value ) ? $value : [];
                        },
                    ],
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

        register_rest_route( self::NAMESPACE, '/translation/strings/translate', [
            [
                'methods'             => 'POST',
                'callback'            => [ $translation, 'translate_strings' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'target_language' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'strings' => [
                        'type'              => 'array',
                        'required'          => true,
                        'items'             => [
                            'type'       => 'object',
                            'properties' => [
                                'id'   => [ 'type' => 'string' ],
                                'text' => [ 'type' => 'string' ],
                            ],
                        ],
                    ],
                    'preview' => [
                        'type'              => 'boolean',
                        'default'           => true,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                ],
            ],
        ] );

        // Media metadata translation (LANG-005)
        register_rest_route( self::NAMESPACE, '/translation/media/untranslated', [
            [
                'methods'             => 'GET',
                'callback'            => [ $translation, 'get_untranslated_media' ],
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

        register_rest_route( self::NAMESPACE, '/translation/media/translate', [
            [
                'methods'             => 'POST',
                'callback'            => [ $translation, 'translate_media_metadata' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'target_language' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'items' => [
                        'type'              => 'array',
                        'required'          => true,
                        'items'             => [
                            'type'       => 'object',
                            'properties' => [
                                'media_id' => [ 'type' => 'integer' ],
                                'alt'      => [ 'type' => 'string' ],
                                'caption'  => [ 'type' => 'string' ],
                                'description' => [ 'type' => 'string' ],
                                'title'    => [ 'type' => 'string' ],
                            ],
                        ],
                    ],
                    'preview' => [
                        'type'              => 'boolean',
                        'default'           => true,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                ],
            ],
        ] );

        // Ally detection (ALLY-001)
        $ally = new \Elementify\MCP\Api\Ally();
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
        $lms = new \Elementify\MCP\Api\Lms();
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
        $charity = new \Elementify\MCP\Api\Charity();
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

        // Booking & Events integration (BOOK-001, BOOK-002)
        $booking = new \Elementify\MCP\Api\Booking();
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
        // Amelia-specific CRUD operations (Advanced tier)
        register_rest_route( self::NAMESPACE, '/booking/amelia/services', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'list_amelia_services' ],
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
            [
                'methods'             => 'POST',
                'callback'            => [ $booking, 'create_amelia_service' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/booking/amelia/services/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'get_amelia_service' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PATCH',
                'callback'            => [ $booking, 'update_amelia_service' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $booking, 'delete_amelia_service' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/booking/amelia/appointments', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'list_amelia_appointments' ],
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
            [
                'methods'             => 'POST',
                'callback'            => [ $booking, 'create_amelia_appointment' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/booking/amelia/appointments/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $booking, 'get_amelia_appointment' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PATCH',
                'callback'            => [ $booking, 'update_amelia_appointment' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $booking, 'delete_amelia_appointment' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // Site info
        register_rest_route( self::NAMESPACE, '/site', [
            [
                'methods'             => 'GET',
                'callback'            => [ new \Elementify\MCP\Api\Site(), 'get_site_info' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Site assessment — comprehensive snapshot for AI recommendation engine
        register_rest_route( self::NAMESPACE, '/site/assessment', [
            [
                'methods'             => 'GET',
                'callback'            => [ new \Elementify\MCP\Api\Assessment(), 'get_assessment' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Module wizards
        $wizards = new \Elementify\MCP\Api\Wizards();
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
        $settings = new \Elementify\MCP\Api\Settings();
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
        $seo = new \Elementify\MCP\Api\Seo();
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
        $performance = new \Elementify\MCP\Api\Performance();
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
        register_rest_route( self::NAMESPACE, '/site/performance/optimize-assets', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'optimize_elementor_assets' ],
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

        // Cache plugin recommendation (HEALTH-005)
        register_rest_route( self::NAMESPACE, '/site/performance/cache-recommendation', [
            [
                'methods'             => 'GET',
                'callback'            => [ $performance, 'get_cache_recommendation' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // Guided troubleshooting (HEALTH-006)
        register_rest_route( self::NAMESPACE, '/site/performance/diagnose-issue', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'diagnose_issue' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'symptom' => [
                        'type'              => 'string',
                        'required'          => true,
                        'enum'              => [ 'slow_page', 'white_screen', '500_error', 'plugin_conflict' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );

        // Error log reader (HEALTH-006 helper)
        register_rest_route( self::NAMESPACE, '/site/performance/error-log', [
            [
                'methods'             => 'GET',
                'callback'            => [ $performance, 'read_error_log' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'lines' => [
                        'type'              => 'integer',
                        'default'           => 50,
                        'minimum'           => 1,
                        'maximum'           => 1000,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ] );

        // Safe plugin conflict test (HEALTH-006 helper, L2 governance)
        register_rest_route( self::NAMESPACE, '/site/performance/test-plugin-conflict', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'test_plugin_conflict' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'plugin_slug' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                     'action' => [
                         'type'              => 'string',
                         'required'          => true,
                         'enum'              => [ 'deactivate', 'reactivate' ],
                         'sanitize_callback' => 'sanitize_text_field',
                     ],
                 ],
             ],
         ] );

        // ------------------------------------------------------------------ //
        // Core Web Vitals & advanced performance analysis
        // ------------------------------------------------------------------ //
        register_rest_route( self::NAMESPACE, '/site/performance/core-web-vitals', [
            [
                'methods'             => 'GET',
                'callback'            => [ $performance, 'get_core_web_vitals' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id' => [
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'url' => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/performance/generate-critical-css', [
            [
                'methods'             => 'POST',
                'callback'            => [ $performance, 'generate_critical_css' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id' => [
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'force' => [
                        'type'              => 'boolean',
                        'default'           => false,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/site/performance/analyze', [
            [
                'methods'             => 'GET',
                'callback'            => [ $performance, 'analyze_performance' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page_id' => [
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'depth' => [
                        'type'              => 'string',
                        'enum'              => [ 'quick', 'standard', 'deep' ],
                        'default'           => 'standard',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );

        // Site logo
        $logo = new \Elementify\MCP\Api\Logo();
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
        $gs = new \Elementify\MCP\Api\GlobalStyles();
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
        $context = new \Elementify\MCP\Api\SiteContext();
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

        // Change review queue
        $cq = new \Elementify\MCP\Api\ChangeQueue();
        register_rest_route( self::NAMESPACE, '/changes/queue', [
            [
                'methods'             => 'GET',
                'callback'            => [ $cq, 'list_changes' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'status' => [
                        'type'              => 'string',
                        'enum'              => [ 'pending', 'approved', 'rejected', 'applied', 'all' ],
                        'default'           => 'all',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $cq, 'create_change' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/changes/queue/stats', [
            [
                'methods'             => 'GET',
                'callback'            => [ $cq, 'get_queue_stats' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/changes/(?P<id>[a-zA-Z0-9_]+)/status', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $cq, 'update_status' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/changes/(?P<id>[a-zA-Z0-9_]+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $cq, 'get_change' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $cq, 'delete_change' ],
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
        // Media AI operations
        // ------------------------------------------------------------------ //
        
        // Generate alt text for a single image
        register_rest_route( self::NAMESPACE, '/media/(?P<id>\d+)/generate-alt-text', [
            [
                'methods'             => 'POST',
                'callback'            => [ $media, 'generate_alt_text' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );
        
        // Batch generate alt text for multiple images
        register_rest_route( self::NAMESPACE, '/media/batch-generate-alt-text', [
            [
                'methods'             => 'POST',
                'callback'            => [ $media, 'batch_generate_alt_text' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'attachment_ids' => [
                        'type'              => 'array',
                        'items'             => [ 'type' => 'integer' ],
                        'default'           => [],
                        'sanitize_callback' => function( $value ) {
                            return \is_array( $value ) ? $value : [];
                        },
                    ],
                    'limit' => [
                        'type'              => 'integer',
                        'default'           => 10,
                        'minimum'           => 1,
                        'maximum'           => 50,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ] );
        
        // Search stock images
        register_rest_route( self::NAMESPACE, '/media/search-stock', [
            [
                'methods'             => 'GET',
                'callback'            => [ $media, 'search_stock_images' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'query' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'per_page' => [
                        'type'              => 'integer',
                        'default'           => 10,
                        'minimum'           => 1,
                        'maximum'           => 30,
                        'sanitize_callback' => 'absint',
                    ],
                    'page' => [
                        'type'              => 'integer',
                        'default'           => 1,
                        'minimum'           => 1,
                        'sanitize_callback' => 'absint',
                    ],
                    'source' => [
                        'type'              => 'string',
                        'default'           => 'unsplash',
                        'enum'              => [ 'unsplash', 'pexels', 'pixabay' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // Snapshots & Versioning
        // ------------------------------------------------------------------ //
        $snapshots = new Snapshots();
        register_rest_route( self::NAMESPACE, '/snapshots', [
            [
                'methods'             => 'GET',
                'callback'            => [ $snapshots, 'list_snapshots' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_id'   => [
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'post_type' => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'limit'     => [
                        'type'              => 'integer',
                        'default'           => 20,
                        'minimum'           => 1,
                        'maximum'           => 100,
                        'sanitize_callback' => 'absint',
                    ],
                    'offset'    => [
                        'type'              => 'integer',
                        'default'           => 0,
                        'minimum'           => 0,
                        'sanitize_callback' => 'absint',
                    ],
                    'tag'       => [
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $snapshots, 'create_snapshot' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_id'     => [
                        'type'              => 'integer',
                        'required'          => true,
                        'sanitize_callback' => 'absint',
                    ],
                    'post_type'   => [
                        'type'              => 'string',
                        'default'           => 'page',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'description' => [
                        'type'              => 'string',
                        'default'           => 'Manual snapshot',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'tags'        => [
                        'type'              => 'array',
                        'default'           => [],
                        'sanitize_callback' => function( $value ) {
                            return \is_array( $value ) ? $value : [];
                        },
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/(?P<snapshot_id>[a-zA-Z0-9_]+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $snapshots, 'get_snapshot' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'snapshot_id' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/(?P<snapshot_id>[a-zA-Z0-9_]+)/data', [
            [
                'methods'             => 'GET',
                'callback'            => [ $snapshots, 'get_snapshot_data' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'snapshot_id' => [ 'type' => 'string', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/(?P<snapshot_id>[a-zA-Z0-9_]+)/restore', [
            [
                'methods'             => 'POST',
                'callback'            => [ $snapshots, 'restore_snapshot' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'snapshot_id'     => [ 'type' => 'string', 'required' => true ],
                    'target_post_id'  => [ 'type' => 'integer', 'sanitize_callback' => 'absint' ],
                    'mode'            => [
                        'type'              => 'string',
                        'default'           => 'full',
                        'enum'              => [ 'full', 'elementor-only', 'content-only' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/compare', [
            [
                'methods'             => 'GET',
                'callback'            => [ $snapshots, 'compare_snapshots' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'left_id'  => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'right_id' => [
                        'type'              => 'string',
                        'required'          => true,
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'post_id'  => [
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/auto-versioning', [
            [
                'methods'             => 'POST',
                'callback'            => [ $snapshots, 'configure_auto_versioning' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'post_type'    => [
                        'type'              => 'string',
                        'default'           => 'page',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'enabled'      => [
                        'type'              => 'boolean',
                        'default'           => true,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'max_versions' => [
                        'type'              => 'integer',
                        'default'           => 10,
                        'minimum'           => 1,
                        'maximum'           => 100,
                        'sanitize_callback' => 'absint',
                    ],
                    'triggers'     => [
                        'type'              => 'array',
                        'default'           => [ 'publish', 'major_change' ],
                        'sanitize_callback' => function( $value ) {
                            return \is_array( $value ) ? $value : [];
                        },
                    ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/snapshots/cleanup', [
            [
                'methods'             => 'POST',
                'callback'            => [ $snapshots, 'cleanup_snapshots' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'max_age_days' => [
                        'type'              => 'integer',
                        'default'           => 90,
                        'minimum'           => 1,
                        'maximum'           => 3650,
                        'sanitize_callback' => 'absint',
                    ],
                    'keep_minimum' => [
                        'type'              => 'integer',
                        'default'           => 5,
                        'minimum'           => 0,
                        'maximum'           => 1000,
                        'sanitize_callback' => 'absint',
                    ],
                    'dry_run'      => [
                        'type'              => 'boolean',
                        'default'           => true,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
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
        // Workflow Orchestration
        // ------------------------------------------------------------------ //
        $workflowOrchestration = new WorkflowOrchestration();
        register_rest_route( self::NAMESPACE, '/workflows', [
            [
                'methods'             => 'GET',
                'callback'            => [ $workflowOrchestration, 'list_workflows' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/workflows/plan', [
            [
                'methods'             => 'POST',
                'callback'            => [ $workflowOrchestration, 'create_workflow_plan' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/workflows/execute', [
            [
                'methods'             => 'POST',
                'callback'            => [ $workflowOrchestration, 'execute_workflow_plan' ],
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
        register_rest_route( self::NAMESPACE, '/plugin-stack-context/plan', [
            [
                'methods'             => 'POST',
                'callback'            => [ $pluginStackContext, 'create_plan' ],
                'permission_callback' => '__return_true',
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/plugin-stack-context/execute', [
            [
                'methods'             => 'POST',
                'callback'            => [ $pluginStackContext, 'execute_plan' ],
                'permission_callback' => '__return_true',
            ],
        ] );

        // ------------------------------------------------------------------ //
        // WooCommerce
        // ------------------------------------------------------------------ //
        $woocommerce = new WooCommerce();
        register_rest_route( self::NAMESPACE, '/woocommerce/products', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'list_products' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [ 'type' => 'integer', 'default' => 1, 'minimum' => 1 ],
                    'per_page' => [ 'type' => 'integer', 'default' => 20, 'minimum' => 1, 'maximum' => 100 ],
                    'status'   => [ 'type' => 'string', 'default' => 'any' ],
                    'category' => [ 'type' => 'integer' ],
                    'search'   => [ 'type' => 'string' ],
                ],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $woocommerce, 'create_product' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'name'           => [ 'type' => 'string', 'required' => true ],
                    'type'           => [ 'type' => 'string', 'default' => 'simple' ],
                    'status'         => [ 'type' => 'string', 'default' => 'draft' ],
                    'regular_price'  => [ 'type' => 'string' ],
                    'sale_price'     => [ 'type' => 'string' ],
                    'description'    => [ 'type' => 'string' ],
                    'short_description' => [ 'type' => 'string' ],
                    'sku'            => [ 'type' => 'string' ],
                    'manage_stock'   => [ 'type' => 'boolean', 'default' => false ],
                    'stock_quantity' => [ 'type' => 'integer' ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/woocommerce/products/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'get_product' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $woocommerce, 'update_product' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $woocommerce, 'delete_product' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // WooCommerce Orders
        // ------------------------------------------------------------------ //
        register_rest_route( self::NAMESPACE, '/woocommerce/orders', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'list_orders' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [ 'type' => 'integer', 'default' => 1, 'minimum' => 1 ],
                    'per_page' => [ 'type' => 'integer', 'default' => 20, 'minimum' => 1, 'maximum' => 100 ],
                    'status'   => [ 'type' => 'string' ],
                    'customer' => [ 'type' => 'integer' ],
                    'product'  => [ 'type' => 'integer' ],
                ],
            ],
        ] );

        register_rest_route( self::NAMESPACE, '/woocommerce/orders/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'get_order' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id' => [ 'type' => 'integer', 'required' => true ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/woocommerce/orders/(?P<id>\d+)/status', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $woocommerce, 'update_order_status' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'     => [ 'type' => 'integer', 'required' => true ],
                    'status' => [ 'type' => 'string', 'required' => true ],
                    'note'   => [ 'type' => 'string' ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // WooCommerce Product Categories
        // ------------------------------------------------------------------ //
        register_rest_route( self::NAMESPACE, '/woocommerce/product-categories', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'list_product_categories' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'page'     => [ 'type' => 'integer', 'default' => 1, 'minimum' => 1 ],
                    'per_page' => [ 'type' => 'integer', 'default' => 50, 'minimum' => 1, 'maximum' => 100 ],
                    'parent'   => [ 'type' => 'integer' ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/woocommerce/product-categories/manage', [
            [
                'methods'             => 'POST',
                'callback'            => [ $woocommerce, 'manage_product_category' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'action' => [ 'type' => 'string', 'required' => true ],
                    'id'     => [ 'type' => 'integer' ],
                    'name'   => [ 'type' => 'string' ],
                    'slug'   => [ 'type' => 'string' ],
                    'parent' => [ 'type' => 'integer' ],
                    'description' => [ 'type' => 'string' ],
                ],
            ],
        ] );

        // ------------------------------------------------------------------ //
        // WooCommerce Store Settings
        // ------------------------------------------------------------------ //
        register_rest_route( self::NAMESPACE, '/woocommerce/store-settings', [
            [
                'methods'             => 'GET',
                'callback'            => [ $woocommerce, 'get_store_settings' ],
                'permission_callback' => '__return_true',
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $woocommerce, 'update_store_settings' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'currency'             => [ 'type' => 'string' ],
                    'currency_position'    => [ 'type' => 'string' ],
                    'thousand_separator'   => [ 'type' => 'string' ],
                    'decimal_separator'    => [ 'type' => 'string' ],
                    'number_of_decimals'   => [ 'type' => 'integer' ],
                    'weight_unit'          => [ 'type' => 'string' ],
                    'dimension_unit'       => [ 'type' => 'string' ],
                    'enable_taxes'         => [ 'type' => 'boolean' ],
                    'tax_based_on'         => [ 'type' => 'string' ],
                    'shipping_calculation' => [ 'type' => 'string' ],
                    'coupons_enabled'      => [ 'type' => 'boolean' ],
                ],
            ],
        ] );
        register_rest_route( self::NAMESPACE, '/woocommerce/pages/setup', [
            [
                'methods'             => 'POST',
                'callback'            => [ $woocommerce, 'setup_woocommerce_pages' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'create_missing'  => [ 'type' => 'boolean', 'default' => true ],
                    'assign_template' => [ 'type' => 'boolean', 'default' => true ],
                ],
            ],
        ] );
    }
}
