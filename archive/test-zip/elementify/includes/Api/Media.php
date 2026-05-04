<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for WordPress media library management.
 * Provides CRUD operations for media attachments.
 */
final class Media {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // List media
    // ------------------------------------------------------------------ //

    /**
     * List media attachments with pagination and filtering.
     */
    public function list_media( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $params = $request->get_params();

        $page     = absint( $params['page'] ?? 1 );
        $per_page = absint( $params['per_page'] ?? 20 );
        $search   = sanitize_text_field( $params['search'] ?? '' );
        $mime_type = sanitize_text_field( $params['mime_type'] ?? '' );

        if ( $per_page < 1 || $per_page > 100 ) {
            $per_page = 20;
        }

        $args = [
            'post_type'      => 'attachment',
            'post_status'    => 'inherit',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ];

        if ( ! empty( $search ) ) {
            $args['s'] = $search;
        }

        if ( ! empty( $mime_type ) ) {
            $args['post_mime_type'] = $mime_type;
        }

        $query = new \WP_Query( $args );

        $attachments = [];
        foreach ( $query->posts as $post ) {
            $attachments[] = $this->format_attachment( $post );
        }

        return new WP_REST_Response(
            [
                'media'       => $attachments,
                'total'       => (int) $query->found_posts,
                'total_pages' => (int) $query->max_num_pages,
                'page'        => $page,
                'per_page'    => $per_page,
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Get single media
    // ------------------------------------------------------------------ //

    /**
     * Get details of a single media attachment.
     */
    public function get_media( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $attachment_id = absint( $request->get_param( 'id' ) );
        if ( ! $attachment_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Media ID is required.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Media attachment not found.', 'elementify-mcp' ),
                [ 'status' => 404 ]
            );
        }

        return new WP_REST_Response(
            [
                'media' => $this->format_attachment( $attachment ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Update media metadata
    // ------------------------------------------------------------------ //

    /**
     * Update media metadata (alt text, title, caption, description).
     */
    public function update_media( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $attachment_id = absint( $request->get_param( 'id' ) );
        if ( ! $attachment_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Media ID is required.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Media attachment not found.', 'elementify-mcp' ),
                [ 'status' => 404 ]
            );
        }

        $params = $request->get_params();
        $updated = [];

        // Update alt text
        if ( isset( $params['alt_text'] ) ) {
            $alt_text = sanitize_text_field( $params['alt_text'] );
            update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt_text );
            $updated['alt_text'] = $alt_text;
        }

        // Update title (post_title)
        if ( isset( $params['title'] ) ) {
            $title = sanitize_text_field( $params['title'] );
            if ( $title !== $attachment->post_title ) {
                wp_update_post( [
                    'ID'         => $attachment_id,
                    'post_title' => $title,
                ] );
                $updated['title'] = $title;
            }
        }

        // Update caption (post_excerpt)
        if ( isset( $params['caption'] ) ) {
            $caption = sanitize_textarea_field( $params['caption'] );
            if ( $caption !== $attachment->post_excerpt ) {
                wp_update_post( [
                    'ID'           => $attachment_id,
                    'post_excerpt' => $caption,
                ] );
                $updated['caption'] = $caption;
            }
        }

        // Update description (post_content)
        if ( isset( $params['description'] ) ) {
            $description = sanitize_textarea_field( $params['description'] );
            if ( $description !== $attachment->post_content ) {
                wp_update_post( [
                    'ID'           => $attachment_id,
                    'post_content' => $description,
                ] );
                $updated['description'] = $description;
            }
        }

        // Refresh attachment data
        $attachment = get_post( $attachment_id );

        return new WP_REST_Response(
            [
                'media_id' => $attachment_id,
                'updated'  => $updated,
                'media'    => $this->format_attachment( $attachment ),
                'message'  => __( 'Media updated successfully.', 'elementify-mcp' ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Delete media
    // ------------------------------------------------------------------ //

    /**
     * Delete a media attachment.
     */
    public function delete_media( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $attachment_id = absint( $request->get_param( 'id' ) );
        if ( ! $attachment_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Media ID is required.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Media attachment not found.', 'elementify-mcp' ),
                [ 'status' => 404 ]
            );
        }

        $force = isset( $request['force'] ) && rest_sanitize_boolean( $request['force'] );
        $result = wp_delete_attachment( $attachment_id, $force );

        if ( ! $result ) {
            return new WP_Error(
                'elementify_delete_failed',
                __( 'Failed to delete media attachment.', 'elementify-mcp' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'media_id' => $attachment_id,
                'deleted'  => true,
                'message'  => $force
                    ? __( 'Media permanently deleted.', 'elementify-mcp' )
                    : __( 'Media moved to trash.', 'elementify-mcp' ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Formatting helper
    // ------------------------------------------------------------------ //

    private function format_attachment( \WP_Post $attachment ): array {
        $metadata = wp_get_attachment_metadata( $attachment->ID );
        $sizes = [];

        if ( is_array( $metadata ) && isset( $metadata['sizes'] ) ) {
            foreach ( $metadata['sizes'] as $size => $size_data ) {
                $sizes[ $size ] = [
                    'url'    => wp_get_attachment_image_url( $attachment->ID, $size ),
                    'width'  => $size_data['width'] ?? 0,
                    'height' => $size_data['height'] ?? 0,
                ];
            }
        }

        // Add full size
        $sizes['full'] = [
            'url'    => wp_get_attachment_url( $attachment->ID ),
            'width'  => $metadata['width'] ?? 0,
            'height' => $metadata['height'] ?? 0,
        ];

        // Add thumbnail if missing (should be present)
        if ( ! isset( $sizes['thumbnail'] ) && isset( $sizes['full'] ) ) {
            $sizes['thumbnail'] = $sizes['full'];
        }

        return [
            'id'          => $attachment->ID,
            'title'       => $attachment->post_title,
            'caption'     => $attachment->post_excerpt,
            'description' => $attachment->post_content,
            'alt_text'    => get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true ),
            'mime_type'   => $attachment->post_mime_type,
            'date'        => $attachment->post_date,
            'modified'    => $attachment->post_modified,
            'author'      => $attachment->post_author,
            'url'         => wp_get_attachment_url( $attachment->ID ),
            'sizes'       => $sizes,
            'metadata'    => $metadata ?: [],
        ];
    }
}