<?php
declare(strict_types=1);
namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for reading Elementor data from any post/page.
 *
 * Enables extracting _elementor_data from published pages so their
 * sections, containers and widgets can be saved as reusable library templates.
 */
final class Pages {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * GET /pages/{id}/data
     *
     * Returns the raw _elementor_data from any post/page.
     * Optional query params:
     *   ?extract=section&index=N  — returns only the Nth top-level element (0-based)
     *   ?extract=all              — returns all top-level elements as array with index info
     *
     * Requires 'content-structure:read' capability.
     */
    public function get_page_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id = (int) $request->get_param( 'id' );
        $post = get_post( $id );

        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        // Verify Elementor was used on this post
        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error(
                'not_elementor',
                'This post was not built with Elementor.',
                [ 'status' => 422 ]
            );
        }

        $raw = get_post_meta( $id, '_elementor_data', true );
        $data = is_array( $raw ) ? $raw : json_decode( $raw ?: '[]', true );
        $data = is_array( $data ) ? $data : [];

        $extract = sanitize_text_field( $request->get_param( 'extract' ) ?: '' );
        $index   = (int) ( $request->get_param( 'index' ) ?? -1 );

        // ?extract=all — return all top-level elements with metadata
        if ( $extract === 'all' ) {
            $elements = [];
            foreach ( $data as $i => $el ) {
                $elements[] = [
                    'index'    => $i,
                    'id'       => $el['id'] ?? null,
                    'elType'   => $el['elType'] ?? null,
                    'children' => count( $el['elements'] ?? [] ),
                    'data'     => $el,
                ];
            }
            return new WP_REST_Response( [
                'post_id'        => $id,
                'post_title'     => $post->post_title,
                'post_type'      => $post->post_type,
                'element_count'  => count( $data ),
                'elements'       => $elements,
            ] );
        }

        // ?extract=section&index=N — return a single top-level element
        if ( $extract === 'section' && $index >= 0 ) {
            if ( ! isset( $data[ $index ] ) ) {
                return new WP_Error(
                    'index_out_of_range',
                    sprintf( 'Index %d out of range. Post has %d top-level elements.', $index, count( $data ) ),
                    [ 'status' => 422 ]
                );
            }
            return new WP_REST_Response( [
                'post_id'    => $id,
                'post_title' => $post->post_title,
                'index'      => $index,
                'element'    => $data[ $index ],
            ] );
        }

        // Default — return full elementor_data
        return new WP_REST_Response( [
            'post_id'       => $id,
            'post_title'    => $post->post_title,
            'post_type'     => $post->post_type,
            'element_count' => count( $data ),
            'elementor_data' => $data,
        ] );
    }

    /**
     * PUT /pages/{id}/data
     *
     * Writes Elementor JSON back to any post/page, replacing its _elementor_data.
     * Flushes Elementor's CSS cache so changes are reflected immediately.
     * Requires 'content-structure:write' capability.
     */
    public function update_page_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id   = (int) $request->get_param( 'id' );
        $post = get_post( $id );

        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error(
                'not_elementor',
                'This post was not built with Elementor.',
                [ 'status' => 422 ]
            );
        }

        $body = $request->get_json_params() ?: [];

        if ( ! isset( $body['elementor_data'] ) || ! is_array( $body['elementor_data'] ) ) {
            return new WP_Error(
                'invalid_data',
                'elementor_data must be a JSON array.',
                [ 'status' => 400 ]
            );
        }

        $encoded = wp_json_encode( $body['elementor_data'] );
        update_post_meta( $id, '_elementor_data', wp_slash( $encoded ) );

        // Clear Elementor's CSS cache so changes are live immediately
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        // Touch modified date
        wp_update_post( [ 'ID' => $id ] );

        return new WP_REST_Response( [ 'id' => $id, 'updated' => true ], 200 );
    }

    /**
     * GET /pages
     *
     * Lists all posts/pages that were built with Elementor (have _elementor_edit_mode = builder).
     * Requires 'content-structure:read' capability.
     */
    public function list_pages( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $post_type = sanitize_text_field( $request->get_param( 'post_type' ) ?: 'page' );
        $per_page  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 50 ) ) );
        $page      = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );

        $query = new \WP_Query( [
            'post_type'      => $post_type,
            'post_status'    => 'publish',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'meta_query'     => [
                [
                    'key'   => '_elementor_edit_mode',
                    'value' => 'builder',
                ],
            ],
            'orderby'        => 'modified',
            'order'          => 'DESC',
        ] );

        $posts = [];
        foreach ( $query->posts as $post ) {
            $posts[] = [
                'id'         => $post->ID,
                'title'      => $post->post_title,
                'slug'       => $post->post_name,
                'post_type'  => $post->post_type,
                'status'     => $post->post_status,
                'url'        => get_permalink( $post->ID ),
                'modified'   => $post->post_modified,
            ];
        }

        return new WP_REST_Response( [
            'posts'       => $posts,
            'total'       => $query->found_posts,
            'total_pages' => $query->max_num_pages,
        ] );
    }
}
