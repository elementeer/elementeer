<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

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
                'elementeer_missing_param',
                __( 'Media ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Media attachment not found.', 'elementeer' ),
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
                'elementeer_missing_param',
                __( 'Media ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Media attachment not found.', 'elementeer' ),
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
                'message'  => __( 'Media updated successfully.', 'elementeer' ),
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
                'elementeer_missing_param',
                __( 'Media ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Media attachment not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        $force = isset( $request['force'] ) && rest_sanitize_boolean( $request['force'] );
        $result = wp_delete_attachment( $attachment_id, $force );

        if ( ! $result ) {
            return new WP_Error(
                'elementeer_delete_failed',
                __( 'Failed to delete media attachment.', 'elementeer' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'media_id' => $attachment_id,
                'deleted'  => true,
                'message'  => $force
                    ? __( 'Media permanently deleted.', 'elementeer' )
                    : __( 'Media moved to trash.', 'elementeer' ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // AI-powered alt text generation
    // ------------------------------------------------------------------ //

    /**
     * Generate alt text for a media attachment using AI.
     */
    public function generate_alt_text( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $attachment_id = absint( $request->get_param( 'id' ) );
        if ( ! $attachment_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Media ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $attachment = get_post( $attachment_id );
        if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Media attachment not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        // Check if image
        if ( ! wp_attachment_is_image( $attachment_id ) ) {
            return new WP_Error(
                'elementeer_not_image',
                __( 'Only images can have alt text generated.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        // Generate alt text using AI service
        $alt_text = $this->generate_alt_text_with_ai( $attachment );

        if ( is_wp_error( $alt_text ) ) {
            return $alt_text;
        }

        // Update the alt text
        update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt_text );

        return new WP_REST_Response(
            [
                'media_id' => $attachment_id,
                'alt_text' => $alt_text,
                'message'  => __( 'Alt text generated successfully.', 'elementeer' ),
            ],
            200
        );
    }

    /**
     * Generate alt text for multiple media attachments in batch.
     */
    public function batch_generate_alt_text( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $params = $request->get_params();
        $attachment_ids = $params['attachment_ids'] ?? [];
        $limit = min( absint( $params['limit'] ?? 10 ), 50 ); // Max 50 per batch

        if ( empty( $attachment_ids ) ) {
            // If no IDs provided, find images without alt text
            $args = [
                'post_type'      => 'attachment',
                'post_status'    => 'inherit',
                'post_mime_type' => 'image',
                'posts_per_page' => $limit,
                'meta_query'     => [
                    [
                        'key'     => '_wp_attachment_image_alt',
                        'compare' => 'NOT EXISTS',
                    ],
                ],
            ];

            $query = new \WP_Query( $args );
            $attachment_ids = array_map( fn( $post ) => $post->ID, $query->posts );
        } else {
            // Validate and limit IDs
            $attachment_ids = array_slice( array_map( 'absint', $attachment_ids ), 0, $limit );
        }

        if ( empty( $attachment_ids ) ) {
            return new WP_REST_Response(
                [
                    'processed' => 0,
                    'updated'   => 0,
                    'results'   => [],
                    'message'   => __( 'No images found without alt text.', 'elementeer' ),
                ],
                200
            );
        }

        $results = [];
        $updated = 0;

        foreach ( $attachment_ids as $attachment_id ) {
            $attachment = get_post( $attachment_id );
            if ( ! $attachment || 'attachment' !== $attachment->post_type || ! wp_attachment_is_image( $attachment_id ) ) {
                $results[] = [
                    'id'      => $attachment_id,
                    'success' => false,
                    'error'   => 'Not a valid image attachment',
                ];
                continue;
            }

            $alt_text = $this->generate_alt_text_with_ai( $attachment );
            if ( is_wp_error( $alt_text ) ) {
                $results[] = [
                    'id'      => $attachment_id,
                    'success' => false,
                    'error'   => $alt_text->get_error_message(),
                ];
                continue;
            }

            update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt_text );
            $updated++;

            $results[] = [
                'id'       => $attachment_id,
                'success'  => true,
                'alt_text' => $alt_text,
            ];
        }

        return new WP_REST_Response(
            [
                'processed' => count( $attachment_ids ),
                'updated'   => $updated,
                'results'   => $results,
                'message'   => sprintf(
                    __( 'Generated alt text for %d out of %d images.', 'elementeer' ),
                    $updated,
                    count( $attachment_ids )
                ),
            ],
            200
        );
    }

    /**
     * Generate alt text using AI service.
     * This is a placeholder implementation that should be replaced with actual AI integration.
     */
    private function generate_alt_text_with_ai( \WP_Post $attachment ): string|\WP_Error {
        // Placeholder: Extract image information and generate descriptive text
        // In a real implementation, this would call an external AI service (OpenAI, Google Vision, etc.)
        
        $image_url = wp_get_attachment_url( $attachment->ID );
        $image_title = $attachment->post_title;
        $image_caption = $attachment->post_excerpt;
        
        // Simple rule-based alt text generation as fallback
        if ( ! empty( $image_caption ) ) {
            return sanitize_text_field( $image_caption );
        }
        
        if ( ! empty( $image_title ) ) {
            return sanitize_text_field( $image_title );
        }
        
        // Extract filename and use it as basis
        $filename = basename( $image_url );
        $name_without_ext = pathinfo( $filename, PATHINFO_FILENAME );
        $name_without_ext = str_replace( [ '-', '_' ], ' ', $name_without_ext );
        $name_without_ext = ucwords( $name_without_ext );
        
        return sprintf( __( 'Image of %s', 'elementeer' ), $name_without_ext );
    }

    // ------------------------------------------------------------------ //
    // Stock image search
    // ------------------------------------------------------------------ //

    /**
     * Search for stock images from external APIs (Unsplash, Pexels, etc.)
     */
    public function search_stock_images( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'media-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $params = $request->get_params();
        $query = sanitize_text_field( $params['query'] ?? '' );
        $per_page = min( absint( $params['per_page'] ?? 10 ), 30 );
        $page = max( absint( $params['page'] ?? 1 ), 1 );
        $source = sanitize_text_field( $params['source'] ?? 'unsplash' );

        if ( empty( $query ) ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Search query is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        // Placeholder: In a real implementation, this would call external APIs
        // For now, return a simulated response
        $results = $this->simulate_stock_image_search( $query, $per_page, $page, $source );

        return new WP_REST_Response(
            [
                'query'    => $query,
                'source'   => $source,
                'page'     => $page,
                'per_page' => $per_page,
                'total'    => 100, // Simulated total
                'images'   => $results,
            ],
            200
        );
    }

    /**
     * Simulate stock image search (placeholder for actual API integration).
     */
    private function simulate_stock_image_search( string $query, int $per_page, int $page, string $source ): array {
        $images = [];
        $start_index = ( $page - 1 ) * $per_page;
        
        for ( $i = 1; $i <= $per_page; $i++ ) {
            $image_num = $start_index + $i;
            $width = rand( 800, 2000 );
            $height = rand( 600, 1500 );
            
            $images[] = [
                'id'            => 'simulated_' . $image_num,
                'url'           => "https://source.unsplash.com/featured/{$width}x{$height}?{$query}&sig={$image_num}",
                'url_thumbnail' => "https://source.unsplash.com/featured/300x200?{$query}&sig={$image_num}",
                'url_large'     => "https://source.unsplash.com/featured/{$width}x{$height}?{$query}&sig={$image_num}",
                'width'         => $width,
                'height'        => $height,
                'photographer'  => 'Simulated Photographer',
                'photographer_url' => 'https://unsplash.com/@simulated',
                'source'        => $source,
                'license'       => 'Free to use under the Unsplash License',
                'description'   => "Simulated image of {$query}",
                'color'         => '#' . dechex( rand( 0, 0xFFFFFF ) ),
            ];
        }
        
        return $images;
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