<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for WordPress content management.
 * Provides CRUD operations for posts, pages, taxonomies, and terms.
 */
final class Content {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // Pages
    // ------------------------------------------------------------------ //

    /**
     * Create a new WordPress page.
     */
    public function create_page( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $params = $request->get_params();

        $title   = sanitize_text_field( $params['title'] ?? '' );
        $content = wp_kses_post( $params['content'] ?? '' );
        $status  = sanitize_text_field( $params['status'] ?? 'draft' );
        $parent  = isset( $params['parent'] ) ? absint( $params['parent'] ) : 0;
        $elementor_ready = isset( $params['elementor_ready'] ) && rest_sanitize_boolean( $params['elementor_ready'] );

        if ( empty( $title ) ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Title is required.', 'elementify' ),
                [ 'status' => 400 ]
            );
        }

        $post_data = [
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => $status,
            'post_type'    => 'page',
            'post_parent'  => $parent,
        ];

        $page_id = wp_insert_post( $post_data, true );
        if ( is_wp_error( $page_id ) ) {
            return new WP_Error(
                'elementify_create_failed',
                sprintf(
                    /* translators: %s: error message */
                    __( 'Failed to create page: %s', 'elementify' ),
                    $page_id->get_error_message()
                ),
                [ 'status' => 500 ]
            );
        }

        // If elementor_ready is true, set Elementor edit mode
        if ( $elementor_ready ) {
            update_post_meta( $page_id, '_elementor_edit_mode', 'builder' );
            update_post_meta( $page_id, '_elementor_data', '[]' );
        }

        $page = get_post( $page_id );

        return new WP_REST_Response(
            [
                'page' => $this->format_post( $page ),
                'message' => sprintf(
                    /* translators: %s: page title */
                    __( 'Page "%s" created successfully.', 'elementify' ),
                    $title
                ),
            ],
            201
        );
    }

    // ------------------------------------------------------------------ //
    // Posts
    // ------------------------------------------------------------------ //

    /**
     * Create a new WordPress post.
     */
    public function create_post( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $params = $request->get_params();

        $title      = sanitize_text_field( $params['title'] ?? '' );
        $content    = wp_kses_post( $params['content'] ?? '' );
        $status     = sanitize_text_field( $params['status'] ?? 'draft' );
        $categories = isset( $params['categories'] ) ? array_map( 'absint', (array) $params['categories'] ) : [];
        $tags       = isset( $params['tags'] ) ? array_map( 'sanitize_text_field', (array) $params['tags'] ) : [];

        if ( empty( $title ) ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Title is required.', 'elementify' ),
                [ 'status' => 400 ]
            );
        }

        $post_data = [
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => $status,
            'post_type'    => 'post',
        ];

        $post_id = wp_insert_post( $post_data, true );
        if ( is_wp_error( $post_id ) ) {
            return new WP_Error(
                'elementify_create_failed',
                sprintf(
                    /* translators: %s: error message */
                    __( 'Failed to create post: %s', 'elementify' ),
                    $post_id->get_error_message()
                ),
                [ 'status' => 500 ]
            );
        }

        // Set categories and tags
        if ( ! empty( $categories ) ) {
            wp_set_object_terms( $post_id, $categories, 'category' );
        }
        if ( ! empty( $tags ) ) {
            wp_set_object_terms( $post_id, $tags, 'post_tag' );
        }

        $post = get_post( $post_id );

        return new WP_REST_Response(
            [
                'post' => $this->format_post( $post ),
                'message' => sprintf(
                    /* translators: %s: post title */
                    __( 'Post "%s" created successfully.', 'elementify' ),
                    $title
                ),
            ],
            201
        );
    }

    /**
     * Update post meta (slug, excerpt, featured_image_id).
     */
    public function update_post_meta( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $post_id = absint( $request->get_param( 'id' ) );
        if ( ! $post_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Post ID is required.', 'elementify' ),
                [ 'status' => 400 ]
            );
        }

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Post not found.', 'elementify' ),
                [ 'status' => 404 ]
            );
        }

        $params = $request->get_params();
        $updated = [];

        // Update slug (post_name)
        if ( isset( $params['slug'] ) ) {
            $slug = sanitize_title( $params['slug'] );
            if ( $slug && $slug !== $post->post_name ) {
                wp_update_post( [
                    'ID'        => $post_id,
                    'post_name' => $slug,
                ] );
                $updated['slug'] = $slug;
            }
        }

        // Update excerpt (post_excerpt)
        if ( isset( $params['excerpt'] ) ) {
            $excerpt = sanitize_textarea_field( $params['excerpt'] );
            if ( $excerpt !== $post->post_excerpt ) {
                wp_update_post( [
                    'ID'           => $post_id,
                    'post_excerpt' => $excerpt,
                ] );
                $updated['excerpt'] = $excerpt;
            }
        }

        // Update featured image
        if ( isset( $params['featured_image_id'] ) ) {
            $featured_image_id = absint( $params['featured_image_id'] );
            if ( $featured_image_id > 0 ) {
                $attachment = get_post( $featured_image_id );
                if ( $attachment && 'attachment' === $attachment->post_type ) {
                    set_post_thumbnail( $post_id, $featured_image_id );
                    $updated['featured_image_id'] = $featured_image_id;
                } else {
                    return new WP_Error(
                        'elementify_invalid_param',
                        __( 'Invalid featured image ID.', 'elementify' ),
                        [ 'status' => 400 ]
                    );
                }
            } elseif ( 0 === $featured_image_id ) {
                // Remove featured image
                delete_post_thumbnail( $post_id );
                $updated['featured_image_id'] = 0;
            }
        }

        return new WP_REST_Response(
            [
                'post_id' => $post_id,
                'updated' => $updated,
                'message' => __( 'Post meta updated successfully.', 'elementify' ),
            ],
            200
        );
    }

    /**
     * Delete a post (move to trash or permanently delete).
     */
    public function delete_post( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $post_id = absint( $request->get_param( 'id' ) );
        if ( ! $post_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Post ID is required.', 'elementify' ),
                [ 'status' => 400 ]
            );
        }

        $force = isset( $request['force'] ) && rest_sanitize_boolean( $request['force'] );

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Post not found.', 'elementify' ),
                [ 'status' => 404 ]
            );
        }

        if ( $force ) {
            $result = wp_delete_post( $post_id, true );
            $message = __( 'Post permanently deleted.', 'elementify' );
        } else {
            $result = wp_trash_post( $post_id );
            $message = __( 'Post moved to trash.', 'elementify' );
        }

        if ( ! $result ) {
            return new WP_Error(
                'elementify_delete_failed',
                __( 'Failed to delete post.', 'elementify' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'post_id' => $post_id,
                'deleted' => true,
                'message' => $message,
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Taxonomies & Terms
    // ------------------------------------------------------------------ //

    /**
     * List all registered taxonomies.
     */
    public function list_taxonomies( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $taxonomies = get_taxonomies( [], 'objects' );
        $formatted = [];

        foreach ( $taxonomies as $taxonomy ) {
            $formatted[] = [
                'name'         => $taxonomy->name,
                'label'        => $taxonomy->label,
                'labels'       => (array) $taxonomy->labels,
                'hierarchical' => $taxonomy->hierarchical,
                'public'       => $taxonomy->public,
                'object_type'  => $taxonomy->object_type,
            ];
        }

        return new WP_REST_Response(
            [
                'taxonomies' => $formatted,
                'total'      => count( $formatted ),
            ],
            200
        );
    }

    /**
     * Manage terms for a taxonomy (create, update, delete).
     */
    public function manage_terms( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $taxonomy = sanitize_text_field( $request->get_param( 'taxonomy' ) );
        if ( ! taxonomy_exists( $taxonomy ) ) {
            return new WP_Error(
                'elementify_invalid_taxonomy',
                sprintf(
                    /* translators: %s: taxonomy name */
                    __( 'Taxonomy "%s" does not exist.', 'elementify' ),
                    $taxonomy
                ),
                [ 'status' => 400 ]
            );
        }

        $method = $request->get_method();
        $params = $request->get_params();

        switch ( $method ) {
            case 'POST':
                // Create term
                $name = sanitize_text_field( $params['name'] ?? '' );
                if ( empty( $name ) ) {
                    return new WP_Error(
                        'elementify_missing_param',
                        __( 'Term name is required.', 'elementify' ),
                        [ 'status' => 400 ]
                    );
                }

                $slug = isset( $params['slug'] ) ? sanitize_title( $params['slug'] ) : '';
                $parent = isset( $params['parent'] ) ? absint( $params['parent'] ) : 0;
                $description = isset( $params['description'] ) ? sanitize_textarea_field( $params['description'] ) : '';

                $term = wp_insert_term( $name, $taxonomy, [
                    'slug'        => $slug,
                    'parent'      => $parent,
                    'description' => $description,
                ] );

                if ( is_wp_error( $term ) ) {
                    return new WP_Error(
                        'elementify_term_create_failed',
                        sprintf(
                            /* translators: %s: error message */
                            __( 'Failed to create term: %s', 'elementify' ),
                            $term->get_error_message()
                        ),
                        [ 'status' => 500 ]
                    );
                }

                $term_obj = get_term( $term['term_id'], $taxonomy );

                return new WP_REST_Response(
                    [
                        'term' => $this->format_term( $term_obj ),
                        'message' => sprintf(
                            /* translators: %s: term name */
                            __( 'Term "%s" created successfully.', 'elementify' ),
                            $name
                        ),
                    ],
                    201
                );

            case 'PUT':
                // Update term
                $term_id = absint( $params['id'] ?? 0 );
                if ( ! $term_id ) {
                    return new WP_Error(
                        'elementify_missing_param',
                        __( 'Term ID is required.', 'elementify' ),
                        [ 'status' => 400 ]
                    );
                }

                $args = [];
                if ( isset( $params['name'] ) ) {
                    $args['name'] = sanitize_text_field( $params['name'] );
                }
                if ( isset( $params['slug'] ) ) {
                    $args['slug'] = sanitize_title( $params['slug'] );
                }
                if ( isset( $params['parent'] ) ) {
                    $args['parent'] = absint( $params['parent'] );
                }
                if ( isset( $params['description'] ) ) {
                    $args['description'] = sanitize_textarea_field( $params['description'] );
                }

                if ( empty( $args ) ) {
                    return new WP_Error(
                        'elementify_missing_param',
                        __( 'No fields to update.', 'elementify' ),
                        [ 'status' => 400 ]
                    );
                }

                $term = wp_update_term( $term_id, $taxonomy, $args );
                if ( is_wp_error( $term ) ) {
                    return new WP_Error(
                        'elementify_term_update_failed',
                        sprintf(
                            /* translators: %s: error message */
                            __( 'Failed to update term: %s', 'elementify' ),
                            $term->get_error_message()
                        ),
                        [ 'status' => 500 ]
                    );
                }

                $term_obj = get_term( $term['term_id'], $taxonomy );

                return new WP_REST_Response(
                    [
                        'term' => $this->format_term( $term_obj ),
                        'message' => __( 'Term updated successfully.', 'elementify' ),
                    ],
                    200
                );

            case 'DELETE':
                // Delete term
                $term_id = absint( $params['id'] ?? 0 );
                if ( ! $term_id ) {
                    return new WP_Error(
                        'elementify_missing_param',
                        __( 'Term ID is required.', 'elementify' ),
                        [ 'status' => 400 ]
                    );
                }

                $force = isset( $params['force'] ) && rest_sanitize_boolean( $params['force'] );

                $result = wp_delete_term( $term_id, $taxonomy, [ 'force' => $force ] );
                if ( is_wp_error( $result ) ) {
                    return new WP_Error(
                        'elementify_term_delete_failed',
                        sprintf(
                            /* translators: %s: error message */
                            __( 'Failed to delete term: %s', 'elementify' ),
                            $result->get_error_message()
                        ),
                        [ 'status' => 500 ]
                    );
                }

                return new WP_REST_Response(
                    [
                        'term_id' => $term_id,
                        'deleted' => true,
                        'message' => __( 'Term deleted successfully.', 'elementify' ),
                    ],
                    200
                );

            default:
                return new WP_Error(
                    'elementify_method_not_allowed',
                    __( 'Method not allowed.', 'elementify' ),
                    [ 'status' => 405 ]
                );
        }
    }

    // ------------------------------------------------------------------ //
    // Post Types
    // ------------------------------------------------------------------ //

    /**
     * List all registered post types.
     */
    public function list_post_types( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $post_types = get_post_types( [], 'objects' );
        $formatted = [];

        foreach ( $post_types as $post_type ) {
            $formatted[] = [
                'name'         => $post_type->name,
                'label'        => $post_type->label,
                'labels'       => (array) $post_type->labels,
                'public'       => $post_type->public,
                'hierarchical' => $post_type->hierarchical,
                'has_archive'  => $post_type->has_archive,
                'supports'     => get_all_post_type_supports( $post_type->name ),
            ];
        }

        return new WP_REST_Response(
            [
                'post_types' => $formatted,
                'total'      => count( $formatted ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Formatting helpers
    // ------------------------------------------------------------------ //

    private function format_post( \WP_Post $post ): array {
        return [
            'id'           => $post->ID,
            'title'        => $post->post_title,
            'slug'         => $post->post_name,
            'content'      => $post->post_content,
            'excerpt'      => $post->post_excerpt,
            'status'       => $post->post_status,
            'type'         => $post->post_type,
            'author'       => $post->post_author,
            'parent'       => $post->post_parent,
            'date'         => $post->post_date,
            'modified'     => $post->post_modified,
            'featured_image_id' => get_post_thumbnail_id( $post->ID ),
            'permalink'    => get_permalink( $post->ID ),
            'elementor_edit_mode' => get_post_meta( $post->ID, '_elementor_edit_mode', true ) === 'builder',
        ];
    }

    private function format_term( \WP_Term $term ): array {
        return [
            'id'          => $term->term_id,
            'name'        => $term->name,
            'slug'        => $term->slug,
            'description' => $term->description,
            'parent'      => $term->parent,
            'count'       => $term->count,
            'taxonomy'    => $term->taxonomy,
        ];
    }
}