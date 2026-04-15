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

        // Library import — dedicated seam for local-site imports from curated or local sources
        register_rest_route( self::NAMESPACE, '/library/import', [
            [
                'methods'             => 'POST',
                'callback'            => [ $templates, 'import_library_asset' ],
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
    }
}
