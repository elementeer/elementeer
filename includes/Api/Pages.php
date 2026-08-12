<?php
declare(strict_types=1);
namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

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
     * PATCH /pages/{id}/widgets/{widget_id}
     *
     * Partially mutates a single widget inside the page's _elementor_data.
     * Only the specified settings keys are changed — the rest of the page
     * stays byte-identical.
     *
     * Body: { "settings": { "title": "New" }, "content_hash": "abc", "dry_run": false }
     *
     * Requires 'content-structure:write' capability.
     */
    public function patch_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id        = (int) $request->get_param( 'id' );
        $widget_id = sanitize_text_field( $request->get_param( 'widget_id' ) );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;

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

        $settings      = $body['settings'] ?? null;
        $content_hash  = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run    = (bool) ( $body['dry_run'] ?? false );

        if ( ! is_array( $settings ) || empty( $settings ) ) {
            return new WP_Error(
                'invalid_data',
                'settings must be a non-empty object.',
                [ 'status' => 400 ]
            );
        }

        if ( $content_hash === '' ) {
            return new WP_Error(
                'missing_content_hash',
                'content_hash is required.',
                [ 'status' => 400 ]
            );
        }

        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) {
            return $doc;
        }

        $before = $doc->findById( $widget_id );
        if ( $before === null ) {
            return new WP_Error(
                'widget_not_found',
                sprintf( 'Widget with id "%s" not found on this page.', $widget_id ),
                [ 'status' => 404 ]
            );
        }

        if ( $is_dry_run ) {
            $report = $doc->dryRun( [ $widget_id => [ 'settings' => $settings ] ] );
            $report['post_id']     = $id;
            $report['widget_id']   = $widget_id;
            $report['content_hash_input'] = $content_hash;
            return new WP_REST_Response( $report, 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $path_out = '';
        $updated  = $doc->updateById( $widget_id, [ 'settings' => $settings ], $path_out );
        if ( ! $updated ) {
            return new WP_Error(
                'update_failed',
                'Element was found during pre-check but not during write.',
                [ 'status' => 500 ]
            );
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'       => $id,
            'widget_id'     => $widget_id,
            'path'          => $path_out,
            'updated'       => true,
            'new_hash'      => $doc->contentHash(),
        ], 200 );
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
        $doc = ElementorDocument::load( $id );
        return new WP_REST_Response( [
            'post_id'       => $id,
            'post_title'    => $post->post_title,
            'post_type'     => $post->post_type,
            'element_count' => count( $data ),
            'elementor_data' => $data,
            'content_hash'  => $doc->contentHash(),
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

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;
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
     * POST /pages/{id}/widgets/batch
     *
     * Atomic multi-widget mutation in one transaction.
     * Updates multiple widgets with one content_hash validation pass,
     * so a concurrent edit on any target widget fails the whole batch.
     *
     * Body: {
     *   "operations": [
     *     { "widget_id": "abc", "settings": { "title": "X" } },
     *     ...
     *   ],
     *   "content_hash": "...",
     *   "dry_run": false,
     *   "partial": false
     * }
     *
     * If "partial" is true, missing widget_ids are reported as not_found
     * instead of failing the batch.  The server-side dryRun in the Document
     * operates on a clone; the write path operates on the live document.
     */
    public function patch_widgets_batch( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id = (int) $request->get_param( 'id' );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;
        $post = get_post( $id );
        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error( 'not_elementor', 'Not built with Elementor.', [ 'status' => 422 ] );
        }

        $body         = $request->get_json_params() ?: [];
        $operations   = $body['operations'] ?? null;
        $content_hash = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run   = (bool) ( $body['dry_run'] ?? false );
        $is_partial   = (bool) ( $body['partial'] ?? false );

        if ( ! is_array( $operations ) || empty( $operations ) ) {
            return new WP_Error( 'invalid_data', 'operations must be a non-empty array.', [ 'status' => 400 ] );
        }

        if ( $content_hash === '' ) {
            return new WP_Error( 'missing_content_hash', 'content_hash is required.', [ 'status' => 400 ] );
        }

        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) return $doc;

        // Build patch map
        $patches = [];
        foreach ( $operations as $op ) {
            $w_id     = sanitize_text_field( $op['widget_id'] ?? '' );
            $settings = $op['settings'] ?? null;
            if ( $w_id === '' || ! is_array( $settings ) || empty( $settings ) ) {
                return new WP_Error( 'invalid_operation', 'Each operation needs widget_id (string) and settings (non-empty object).', [ 'status' => 400 ] );
            }
            $patches[ $w_id ] = [ 'settings' => $settings ];
        }

        if ( $is_dry_run ) {
            $report = $doc->dryRun( $patches );
            $report['post_id']     = $id;
            $report['content_hash_input'] = $content_hash;
            $report['partial'] = $is_partial;
            $report['operation_count'] = count( $operations );
            return new WP_REST_Response( $report, 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $results   = [];
        $not_found = [];

        foreach ( $patches as $w_id => $patch ) {
            $path_out = '';
            $updated  = $doc->updateById( $w_id, $patch, $path_out );
            if ( $updated ) {
                $results[] = [
                    'widget_id' => $w_id,
                    'path'      => $path_out,
                    'updated'   => true,
                ];
            } else {
                $not_found[] = $w_id;
                if ( ! $is_partial ) {
                    return new WP_Error(
                        'widget_not_found',
                        sprintf( 'Widget "%s" not found. Set partial:true to skip missing widgets.', $w_id ),
                        [ 'status' => 404 ]
                    );
                }
            }
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'    => $id,
            'updated'    => count( $results ),
            'not_found'  => $not_found,
            'partial'    => $is_partial,
            'new_hash'   => $doc->contentHash(),
        ], 200 );
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

    /**
     * POST /pages/{id}/widgets
     *
     * Insert a widget into a container at a specific position.
     *
     * Body: {
     *   "widget": { ... full widget array ... },
     *   "container_path": "0.1",
     *   "position": 2,
     *   "content_hash": "...",
     *   "dry_run": false
     * }
     */
    public function insert_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id = (int) $request->get_param( 'id' );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;

        $post = get_post( $id );
        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error( 'not_elementor', 'This post was not built with Elementor.', [ 'status' => 422 ] );
        }

        $body = $request->get_json_params() ?: [];
        $widget         = $body['widget'] ?? null;
        $container_path = sanitize_text_field( $body['container_path'] ?? 'root' );
        $position       = (int) ( $body['position'] ?? -1 );
        $content_hash   = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run     = (bool) ( $body['dry_run'] ?? false );

        if ( ! is_array( $widget ) || empty( $widget ) ) {
            return new WP_Error( 'invalid_data', 'widget must be a non-empty object.', [ 'status' => 400 ] );
        }

        if ( $content_hash === '' ) {
            return new WP_Error( 'missing_content_hash', 'content_hash is required.', [ 'status' => 400 ] );
        }

        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) return $doc;

        if ( $is_dry_run ) {
            $clone = ElementorDocument::fromArray( $id, $doc->toArray() );
            $actual_pos = $clone->insertAt( $container_path, $widget, $position );
            if ( $actual_pos < 0 ) {
                return new WP_Error( 'container_not_found', 'Container path not found.', [ 'status' => 404 ] );
            }
            return new WP_REST_Response( [
                'dry_run'          => true,
                'post_id'          => $id,
                'position'         => $actual_pos,
                'container_path'   => $container_path,
                'new_content_hash' => $clone->contentHash(),
            ], 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $actual_pos = $doc->insertAt( $container_path, $widget, $position );
        if ( $actual_pos < 0 ) {
            return new WP_Error( 'container_not_found', 'Container path not found.', [ 'status' => 404 ] );
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'        => $id,
            'position'       => $actual_pos,
            'container_path' => $container_path,
            'new_hash'       => $doc->contentHash(),
        ], 200 );
    }

    /**
     * DELETE /pages/{id}/widgets/{widget_id}
     *
     * Remove a widget by its element id.
     *
     * Body: { "content_hash": "...", "dry_run": false }
     */
    public function remove_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id        = (int) $request->get_param( 'id' );
        $widget_id = sanitize_text_field( $request->get_param( 'widget_id' ) );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;

        $post = get_post( $id );
        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error( 'not_elementor', 'This post was not built with Elementor.', [ 'status' => 422 ] );
        }

        $body         = $request->get_json_params() ?: [];
        $content_hash = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run   = (bool) ( $body['dry_run'] ?? false );

        if ( $content_hash === '' ) {
            return new WP_Error( 'missing_content_hash', 'content_hash is required.', [ 'status' => 400 ] );
        }

        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) return $doc;

        $path_before = $doc->getPath( $widget_id );
        if ( $path_before === null ) {
            return new WP_Error(
                'widget_not_found',
                sprintf( 'Widget "%s" not found.', $widget_id ),
                [ 'status' => 404 ]
            );
        }

        if ( $is_dry_run ) {
            $clone = ElementorDocument::fromArray( $id, $doc->toArray() );
            $removed = $clone->removeById( $widget_id );
            return new WP_REST_Response( [
                'dry_run'          => true,
                'post_id'          => $id,
                'widget_id'        => $widget_id,
                'path'             => $path_before,
                'removed'          => $removed,
                'new_content_hash' => $clone->contentHash(),
            ], 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $removed = $doc->removeById( $widget_id );
        if ( $removed === null ) {
            return new WP_Error(
                'widget_not_found',
                sprintf( 'Widget "%s" disappeared between validation and write.', $widget_id ),
                [ 'status' => 500 ]
            );
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'   => $id,
            'widget_id' => $widget_id,
            'path'      => $path_before,
            'removed'   => true,
            'new_hash'  => $doc->contentHash(),
        ], 200 );
    }

    /**
     * PUT /pages/{id}/widgets/{widget_id}/move
     *
     * Move a widget from its current location to a different container
     * and position within the same page.
     *
     * Body: {
     *   "target_container_path": "0.2",
     *   "position": 0,
     *   "content_hash": "...",
     *   "dry_run": false
     * }
     */
    public function move_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id        = (int) $request->get_param( 'id' );
        $widget_id = sanitize_text_field( $request->get_param( 'widget_id' ) );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;

        $post = get_post( $id );
        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error( 'not_elementor', 'This post was not built with Elementor.', [ 'status' => 422 ] );
        }

        $body = $request->get_json_params() ?: [];
        $target_container_path = sanitize_text_field( $body['target_container_path'] ?? 'root' );
        $position              = (int) ( $body['position'] ?? -1 );
        $content_hash          = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run            = (bool) ( $body['dry_run'] ?? false );

        if ( $content_hash === '' ) {
            return new WP_Error( 'missing_content_hash', 'content_hash is required.', [ 'status' => 400 ] );
        }

        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) return $doc;

        $source_path = $doc->getPath( $widget_id );
        if ( $source_path === null ) {
            return new WP_Error( 'widget_not_found', sprintf( 'Widget "%s" not found.', $widget_id ), [ 'status' => 404 ] );
        }

        if ( $is_dry_run ) {
            $clone = ElementorDocument::fromArray( $id, $doc->toArray() );
            $result = $clone->moveToPath( $widget_id, $target_container_path, $position );
            if ( $result === null ) {
                return new WP_Error( 'move_failed', 'Target container not found.', [ 'status' => 404 ] );
            }
            return new WP_REST_Response( [
                'dry_run'          => true,
                'post_id'          => $id,
                'widget_id'        => $widget_id,
                'source_path'      => $source_path,
                'new_path'         => $result['target_path'],
                'new_content_hash' => $clone->contentHash(),
            ], 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $result = $doc->moveToPath( $widget_id, $target_container_path, $position );
        if ( $result === null ) {
            return new WP_Error( 'move_failed', 'Target container not found.', [ 'status' => 404 ] );
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'     => $id,
            'widget_id'   => $widget_id,
            'source_path' => $source_path,
            'new_path'    => $result['target_path'],
            'new_hash'    => $doc->contentHash(),
        ], 200 );
    }

    /**
     * POST /pages/{id}/widgets/clone
     *
     * Clone a widget from a source page into this page at a specific position.
     * Supports cross-page cloning with __globals__-aware warnings.
     *
     * Body: {
     *   "source_page_id": 123,
     *   "widget_id": "a85a3a7",
     *   "container_path": "0.0",
     *   "position": 1,
     *   "content_hash": "...",
     *   "dry_run": false
     * }
     */
    public function clone_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'content-structure:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id = (int) $request->get_param( 'id' );

        $protected = SiteMemory::refuseIfProtected( $id );
        if ( $protected !== null ) return $protected;

        $post = get_post( $id );
        if ( ! $post || $post->post_status === 'trash' ) {
            return new WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
        }

        $edit_mode = get_post_meta( $id, '_elementor_edit_mode', true );
        if ( $edit_mode !== 'builder' ) {
            return new WP_Error( 'not_elementor', 'This post was not built with Elementor.', [ 'status' => 422 ] );
        }

        $body = $request->get_json_params() ?: [];
        $source_page_id = (int) ( $body['source_page_id'] ?? 0 );
        $widget_id      = sanitize_text_field( $body['widget_id'] ?? '' );
        $container_path = sanitize_text_field( $body['container_path'] ?? 'root' );
        $position       = (int) ( $body['position'] ?? -1 );
        $content_hash   = sanitize_text_field( $body['content_hash'] ?? '' );
        $is_dry_run     = (bool) ( $body['dry_run'] ?? false );

        if ( $source_page_id <= 0 || $widget_id === '' ) {
            return new WP_Error( 'invalid_data', 'source_page_id (int > 0) and widget_id (string) are required.', [ 'status' => 400 ] );
        }

        if ( $content_hash === '' ) {
            return new WP_Error( 'missing_content_hash', 'content_hash is required.', [ 'status' => 400 ] );
        }

        // Load source widget from the other page
        $source_doc = ElementorDocument::load( $source_page_id );
        $source_widget = $source_doc->findById( $widget_id );
        if ( $source_widget === null ) {
            return new WP_Error(
                'source_widget_not_found',
                sprintf( 'Widget "%s" not found on source page %d.', $widget_id, $source_page_id ),
                [ 'status' => 404 ]
            );
        }

        // Collect global references for warnings
        $global_refs = ElementorDocument::collectGlobalReferences( $source_widget );

        // Clone the widget for the target page
        $clone_widget = $source_doc->cloneWidgetForInsert( $source_widget );

        // Load target document with hash guard
        $doc = ElementorDocument::loadWithHashGuard( $id, $content_hash );
        if ( is_wp_error( $doc ) ) return $doc;

        if ( $is_dry_run ) {
            $dry_clone = ElementorDocument::fromArray( $id, $doc->toArray() );
            $actual_pos = $dry_clone->insertAt( $container_path, $clone_widget, $position );
            if ( $actual_pos < 0 ) {
                return new WP_Error( 'container_not_found', 'Target container path not found.', [ 'status' => 404 ] );
            }
            return new WP_REST_Response( [
                'dry_run'             => true,
                'post_id'             => $id,
                'source_page_id'      => $source_page_id,
                'source_widget_id'    => $widget_id,
                'new_widget_id'       => $clone_widget['id'],
                'position'            => $actual_pos,
                'container_path'      => $container_path,
                'global_references'   => $global_refs,
                'new_content_hash'    => $dry_clone->contentHash(),
            ], 200 );
        }

        Snapshots::capture( $id, Sessions::resolveFromRequest( $request ) );

        $actual_pos = $doc->insertAt( $container_path, $clone_widget, $position );
        if ( $actual_pos < 0 ) {
            return new WP_Error( 'container_not_found', 'Target container path not found after guard.', [ 'status' => 500 ] );
        }

        $doc->save();

        return new WP_REST_Response( [
            'post_id'           => $id,
            'source_page_id'    => $source_page_id,
            'source_widget_id'  => $widget_id,
            'new_widget_id'     => $clone_widget['id'],
            'position'          => $actual_pos,
            'container_path'    => $container_path,
            'global_references' => $global_refs,
            'new_hash'          => $doc->contentHash(),
        ], 200 );
    }
}
