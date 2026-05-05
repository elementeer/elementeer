<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use WP_Query;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * REST controller for Elementor template CRUD.
 *
 * Fixes the Respira bug: uses get_posts() with post_type = 'elementor_library'
 * instead of relying on the default WP REST API endpoint, which can return 401
 * or empty results when Elementor's own REST modifications interfere.
 */
final class Templates {

    private const ALLOWED_TEMPLATE_TYPES = [ 'page', 'section', 'container', 'widget', 'popup', 'kit', 'global-widget' ];
    private const ALLOWED_LIBRARY_SOURCE_KINDS = [ 'local-elementor', 'elementeer-premium' ];

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // List
    // ------------------------------------------------------------------ //

    public function list_templates( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $page     = max( 1, (int) $request->get_param( 'page' ) );
        $per_page = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 20 ) ) );
        $status   = \sanitize_text_field( $request->get_param( 'status' ) ?: 'publish' );
        $type     = \sanitize_text_field( $request->get_param( 'type' ) ?: '' );
        $search   = \sanitize_text_field( $request->get_param( 'search' ) ?: '' );
        $category = \sanitize_text_field( $request->get_param( 'category' ) ?: '' );

        $query_args = [
            'post_type'      => 'elementor_library',
            'post_status'    => $status,
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'orderby'        => 'modified',
            'order'          => 'DESC',
        ];

        if ( ! empty( $search ) ) {
            $query_args['s'] = $search;
        }

        // Filter by Elementor template type via meta
        if ( ! empty( $type ) ) {
            $query_args['meta_query'] = [
                [
                    'key'     => '_elementor_template_type',
                    'value'   => $type,
                    'compare' => '=',
                ],
            ];
        }

        // Filter by category (elementor_library_category taxonomy)
        if ( ! empty( $category ) ) {
            $query_args['tax_query'] = [
                [
                    'taxonomy' => 'elementor_library_category',
                    'field'    => 'slug',
                    'terms'    => $category,
                ],
            ];
        }

        $query = new WP_Query( $query_args );

        $templates = \array_map( [ $this, 'format_template' ], $query->posts );

        return new WP_REST_Response(
            [
                'templates'   => $templates,
                'total'       => (int) $query->found_posts,
                'total_pages' => (int) $query->max_num_pages,
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Get single
    // ------------------------------------------------------------------ //

    public function get_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error(
                'not_found',
                \__( 'Template not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        return new WP_REST_Response( $this->format_template( $post ), 200 );
    }

    // ------------------------------------------------------------------ //
    // Create
    // ------------------------------------------------------------------ //

    public function create_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $body   = $request->get_json_params() ?: [];
        $title  = \sanitize_text_field( $body['title'] ?? '' );
        $type   = \sanitize_text_field( $body['type'] ?? 'page' );
        $status = \sanitize_text_field( $body['status'] ?? 'draft' );

        if ( empty( $title ) ) {
            return new WP_Error(
                'missing_title',
                \__( 'Template title is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        if ( ! in_array( $type, self::ALLOWED_TEMPLATE_TYPES, true ) ) {
            return new WP_Error(
                'template_type_unsupported',
                sprintf( \__( 'Unsupported template type: %s.', 'elementeer' ), $type ),
                [ 'status' => 400 ]
            );
        }

        $post_id = \wp_insert_post(
            [
                'post_title'   => $title,
                'post_type'    => 'elementor_library',
                'post_status'  => $status,
                'post_content' => '',
            ],
            true
        );

        if ( \is_wp_error( $post_id ) ) {
            return $post_id;
        }

        \update_post_meta( $post_id, '_elementor_template_type', $type );
        \update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );

        if ( ! empty( $body['elementor_data'] ) ) {
            \update_post_meta( $post_id, '_elementor_data', \wp_slash( $body['elementor_data'] ) );
        } else {
            \update_post_meta( $post_id, '_elementor_data', \wp_slash( '[]' ) );
        }

        // Assign categories
        if ( ! empty( $body['categories'] ) && is_array( $body['categories'] ) ) {
            \wp_set_object_terms( $post_id, \array_map( 'sanitize_text_field', $body['categories'] ), 'elementor_library_category' );
        }

        // Assign tags
        if ( ! empty( $body['tags'] ) && is_array( $body['tags'] ) ) {
            \wp_set_object_terms( $post_id, \array_map( 'sanitize_text_field', $body['tags'] ), 'post_tag' );
        }

        return new WP_REST_Response( $this->format_template( \get_post( $post_id ) ), 201 );
    }

    // ------------------------------------------------------------------ //
    // Library import
    // ------------------------------------------------------------------ //

    public function import_library_asset( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:import' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $body = $request->get_json_params() ?: [];

        $title  = \sanitize_text_field( $body['title'] ?? '' );
        $type   = \sanitize_text_field( $body['type'] ?? 'page' );
        $status = \sanitize_text_field( $body['status'] ?? 'draft' );
        $source = is_array( $body['source'] ?? null ) ? $body['source'] : [];

        if ( empty( $title ) ) {
            return new WP_Error(
                'missing_title',
                \__( 'Template title is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        if ( ! in_array( $type, self::ALLOWED_TEMPLATE_TYPES, true ) ) {
            return new WP_Error(
                'template_type_unsupported',
                sprintf( \__( 'Unsupported template type: %s.', 'elementeer' ), $type ),
                [ 'status' => 400 ]
            );
        }

        if ( ! isset( $body['elementor_data'] ) || ! is_array( $body['elementor_data'] ) ) {
            return new WP_Error(
                'invalid_data',
                \__( 'elementor_data must be a JSON array.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $source_kind  = \sanitize_text_field( $source['kind'] ?? '' );
        $source_id    = \sanitize_text_field( $source['asset_id'] ?? '' );
        $source_title = \sanitize_text_field( $source['asset_title'] ?? $title );
        $source_ref   = \sanitize_text_field( $source['reference'] ?? '' );

        if ( empty( $source_kind ) || empty( $source_id ) ) {
            return new WP_Error(
                'missing_source',
                \__( 'Library imports require a source.kind and source.asset_id.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        if ( ! in_array( $source_kind, self::ALLOWED_LIBRARY_SOURCE_KINDS, true ) ) {
            return new WP_Error(
                'library_source_unsupported',
                \__( 'Cloud library imports are not supported on the plugin side.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $post_id = \wp_insert_post(
            [
                'post_title'   => $title,
                'post_type'    => 'elementor_library',
                'post_status'  => $status,
                'post_content' => '',
            ],
            true
        );

        if ( \is_wp_error( $post_id ) ) {
            return $post_id;
        }

        \update_post_meta( $post_id, '_elementor_template_type', $type );
        \update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
        \update_post_meta( $post_id, '_elementor_data', \wp_slash( \wp_json_encode( $body['elementor_data'] ) ) );

        \update_post_meta( $post_id, '_elementeer_library_source_kind', $source_kind );
        \update_post_meta( $post_id, '_elementeer_library_source_asset_id', $source_id );
        \update_post_meta( $post_id, '_elementeer_library_source_title', $source_title );
        \update_post_meta( $post_id, '_elementeer_library_source_reference', $source_ref );
        \update_post_meta( $post_id, '_elementeer_library_import_mode', 'manual-import' );
        \update_post_meta( $post_id, '_elementeer_library_imported_at', gmdate( 'c' ) );
        \update_post_meta(
            $post_id,
            '_elementeer_library_source',
            \wp_slash(
                \wp_json_encode(
                    [
                        'kind'       => $source_kind,
                        'asset_id'   => $source_id,
                        'asset_title' => $source_title,
                        'reference'  => $source_ref,
                    ]
                )
            )
        );

        if ( ! empty( $body['categories'] ) && is_array( $body['categories'] ) ) {
            \wp_set_object_terms( $post_id, \array_map( 'sanitize_text_field', $body['categories'] ), 'elementor_library_category' );
        }

        if ( ! empty( $body['tags'] ) && is_array( $body['tags'] ) ) {
            \wp_set_object_terms( $post_id, \array_map( 'sanitize_text_field', $body['tags'] ), 'post_tag' );
        }

        $template = $this->format_template( \get_post( $post_id ) );

        return new WP_REST_Response(
            [
                'imported'      => true,
                'import_mode'   => 'manual-import',
                'source'        => [
                    'kind'        => $source_kind,
                    'asset_id'    => $source_id,
                    'asset_title' => $source_title,
                    'reference'   => $source_ref,
                ],
                'template'      => $template,
            ],
            201
        );
    }

    // ------------------------------------------------------------------ //
    // Update
    // ------------------------------------------------------------------ //

    public function update_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error( 'not_found', \__( 'Template not found.', 'elementeer' ), [ 'status' => 404 ] );
        }

        $body    = $request->get_json_params() ?: [];
        $to_save = [ 'ID' => $id ];

        if ( isset( $body['title'] ) ) {
            $to_save['post_title'] = \sanitize_text_field( $body['title'] );
        }
        if ( isset( $body['status'] ) ) {
            $to_save['post_status'] = \sanitize_text_field( $body['status'] );
        }

        if ( count( $to_save ) > 1 ) {
            $result = wp_update_post( $to_save, true );
            if ( \is_wp_error( $result ) ) {
                return $result;
            }
        }

        if ( isset( $body['categories'] ) && is_array( $body['categories'] ) ) {
            \wp_set_object_terms( $id, \array_map( 'sanitize_text_field', $body['categories'] ), 'elementor_library_category' );
        }

        if ( isset( $body['tags'] ) && is_array( $body['tags'] ) ) {
            \wp_set_object_terms( $id, \array_map( 'sanitize_text_field', $body['tags'] ), 'post_tag' );
        }

        return new WP_REST_Response( $this->format_template( \get_post( $id ) ), 200 );
    }

    // ------------------------------------------------------------------ //
    // Delete
    // ------------------------------------------------------------------ //

    public function delete_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error( 'not_found', \__( 'Template not found.', 'elementeer' ), [ 'status' => 404 ] );
        }

        $deleted = wp_delete_post( $id, true ); // force delete, skip trash
        if ( ! $deleted ) {
            return new WP_Error(
                'delete_failed',
                \__( 'Failed to delete template.', 'elementeer' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response( [ 'deleted' => true, 'id' => $id ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Duplicate
    // ------------------------------------------------------------------ //

    public function duplicate_template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error( 'not_found', \__( 'Template not found.', 'elementeer' ), [ 'status' => 404 ] );
        }

        $body      = $request->get_json_params() ?: [];
        $new_title = ! empty( $body['title'] )
            ? \sanitize_text_field( $body['title'] )
            : 'Copy of ' . $post->post_title;

        $new_id = \wp_insert_post(
            [
                'post_title'   => $new_title,
                'post_type'    => 'elementor_library',
                'post_status'  => 'draft',
                'post_content' => $post->post_content,
            ],
            true
        );

        if ( \is_wp_error( $new_id ) ) {
            return $new_id;
        }

        // Copy all Elementor meta
        $meta_keys = [ '_elementor_data', '_elementor_template_type', '_elementor_edit_mode', '_elementor_page_settings' ];
        foreach ( $meta_keys as $key ) {
            $value = get_post_meta( $id, $key, true );
            if ( '' !== $value ) {
                \update_post_meta( $new_id, $key, $value );
            }
        }

        // Copy categories and tags
        $cats = wp_get_object_terms( $id, 'elementor_library_category', [ 'fields' => 'slugs' ] );
        if ( ! \is_wp_error( $cats ) && ! empty( $cats ) ) {
            \wp_set_object_terms( $new_id, $cats, 'elementor_library_category' );
        }

        $tags = wp_get_object_terms( $id, 'post_tag', [ 'fields' => 'slugs' ] );
        if ( ! \is_wp_error( $tags ) && ! empty( $tags ) ) {
            \wp_set_object_terms( $new_id, $tags, 'post_tag' );
        }

        return new WP_REST_Response( $this->format_template( \get_post( $new_id ) ), 201 );
    }

    // ------------------------------------------------------------------ //
    // Template data endpoints
    // ------------------------------------------------------------------ //

    public function get_template_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:read' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error( 'not_found', \__( 'Template not found.', 'elementeer' ), [ 'status' => 404 ] );
        }

        $raw  = get_post_meta( $id, '_elementor_data', true );
        $data = ! empty( $raw ) ? json_decode( $raw, true ) : [];

        return new WP_REST_Response(
            [
                'id'            => $id,
                'elementor_data' => $data ?? [],
            ],
            200
        );
    }

    public function update_template_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'library-operations:write' );
        if ( \is_wp_error( $auth ) ) {
            return $auth;
        }

        $id   = (int) $request->get_param( 'id' );
        $post = \get_post( $id );

        if ( ! $post || 'elementor_library' !== $post->post_type ) {
            return new WP_Error( 'not_found', \__( 'Template not found.', 'elementeer' ), [ 'status' => 404 ] );
        }

        $body = $request->get_json_params() ?: [];

        if ( ! isset( $body['elementor_data'] ) || ! is_array( $body['elementor_data'] ) ) {
            return new WP_Error(
                'invalid_data',
                \__( 'elementor_data must be a JSON array.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $encoded = \wp_json_encode( $body['elementor_data'] );
        \update_post_meta( $id, '_elementor_data', \wp_slash( $encoded ) );

        // Clear Elementor's CSS cache for this post
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        // Touch post modified date
        wp_update_post( [ 'ID' => $id ] );

        return new WP_REST_Response( [ 'id' => $id, 'updated' => true ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Private helpers
    // ------------------------------------------------------------------ //

    /**
     * Format a WP_Post into our response shape.
     */
    private function format_template( \WP_Post $post ): array {
        $type      = get_post_meta( $post->ID, '_elementor_template_type', true ) ?: 'page';
        $shortcode = sprintf( '[elementor-template id="%d"]', $post->ID );

        $categories = [];
        $terms      = wp_get_object_terms( $post->ID, 'elementor_library_category', [ 'fields' => 'slugs' ] );
        if ( ! \is_wp_error( $terms ) ) {
            $categories = $terms;
        }

        $tags      = [];
        $tag_terms = wp_get_object_terms( $post->ID, 'post_tag', [ 'fields' => 'slugs' ] );
        if ( ! \is_wp_error( $tag_terms ) ) {
            $tags = $tag_terms;
        }

        return [
            'id'             => $post->ID,
            'title'          => $post->post_title,
            'status'         => $post->post_status,
            'type'           => $type,
            'author'         => (int) $post->post_author,
            'date'           => get_the_date( 'c', $post ),
            'modified'       => get_the_modified_date( 'c', $post ),
            'categories'     => $categories,
            'tags'           => $tags,
            'shortcode'      => $shortcode,
        ];
    }
}
