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

        // Site info
        register_rest_route( self::NAMESPACE, '/site', [
            [
                'methods'             => 'GET',
                'callback'            => [ new \Elementify\MCP\Api\Site(), 'get_site_info' ],
                'permission_callback' => '__return_true',
            ],
        ] );
    }
}
