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
    }
}
