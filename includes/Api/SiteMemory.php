<?php
declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * Persistent site rules with enforcement.
 *
 * Entries are stored in the `elementeer_site_memory`
 * option.  Rules of type 'rule' with a `protect.post_ids`
 * array cause writes to those post IDs to be refused.
 */
final class SiteMemory {

    private const OPTION_KEY = 'elementeer_site_memory';

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // REST endpoints
    // ------------------------------------------------------------------ //

    /**
     * GET /site/memory — list all entries
     */
    public function list_memory( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-foundation:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        return new WP_REST_Response( self::load(), 200 );
    }

    /**
     * PUT /site/memory/{key} — upsert an entry
     *
     * Body: { "type": "rule", "content": "...", "rule": { "protect": { "post_ids": [2618] } } }
     */
    public function set_entry( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-foundation:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $key  = sanitize_text_field( $request->get_param( 'key' ) );
        $body = $request->get_json_params() ?: [];

        if ( $key === '' ) {
            return new WP_Error( 'invalid_key', 'key is required.', [ 'status' => 400 ] );
        }

        $entry = [
            'key'      => $key,
            'type'     => sanitize_text_field( $body['type'] ?? 'fact' ),
            'content'  => sanitize_textarea_field( $body['content'] ?? '' ),
            'set_at'   => \gmdate( 'c' ),
        ];

        if ( ( $body['type'] ?? '' ) === 'rule' && isset( $body['rule'] ) && is_array( $body['rule'] ) ) {
            $rule = [];
            if ( isset( $body['rule']['protect'] ) && is_array( $body['rule']['protect'] ) ) {
                $rule['protect'] = [
                    'post_ids' => array_map( 'absint', $body['rule']['protect']['post_ids'] ?? [] ),
                    'slugs'    => array_values( array_filter( array_map( 'sanitize_title', $body['rule']['protect']['slugs'] ?? [] ) ) ),
                ];
            }
            $entry['rule'] = $rule;
        }

        $memory        = self::load();
        $memory[ $key ] = $entry;
        self::save( $memory );

        return new WP_REST_Response( $entry, 200 );
    }

    /**
     * DELETE /site/memory/{key} — remove an entry
     */
    public function delete_entry( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-foundation:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $key = sanitize_text_field( $request->get_param( 'key' ) );

        $memory = self::load();
        if ( ! isset( $memory[ $key ] ) ) {
            return new WP_Error( 'not_found', 'No entry with that key.', [ 'status' => 404 ] );
        }

        unset( $memory[ $key ] );
        self::save( $memory );

        return new WP_REST_Response( [ 'deleted' => $key ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Enforcement — called by write endpoints
    // ------------------------------------------------------------------ //

    /**
     * Check whether a post ID is protected.  Returns a WP_Error if it is.
     */
    public static function refuseIfProtected( int $post_id ): ?WP_Error {
        $memory = self::load();
        foreach ( $memory as $entry ) {
            if ( ( $entry['type'] ?? '' ) !== 'rule' ) continue;
            $protect = $entry['rule']['protect'] ?? [];
            $post_ids = $protect['post_ids'] ?? [];
            if ( in_array( $post_id, $post_ids, true ) ) {
                return self::build_blocked_error( $post_id, $entry );
            }

            // Resolve slug-based protection to the concrete post.
            $slugs = $protect['slugs'] ?? [];
            if ( ! empty( $slugs ) ) {
                $post = \get_post( $post_id );
                $actual_slug = $post ? $post->post_name : '';
                if ( $actual_slug !== '' && in_array( $actual_slug, $slugs, true ) ) {
                    return self::build_blocked_error( $post_id, $entry );
                }
            }
        }
        return null;
    }

    /**
     * @param array $entry
     */
    private static function build_blocked_error( int $post_id, array $entry ): WP_Error {
        return new WP_Error(
            'protected_resource',
            sprintf(
                'Post %d is protected by rule "%s". Write operations are blocked.',
                $post_id,
                $entry['key'] ?? 'unknown'
            ),
            [
                'status'        => 423,
                'rule_key'      => $entry['key'] ?? '',
                'post_id'       => $post_id,
            ]
        );
    }

    // ------------------------------------------------------------------ //
    // Storage
    // ------------------------------------------------------------------ //

    /**
     * @return array<string, array>
     */
    private static function load(): array {
        $data = \get_option( self::OPTION_KEY, [] );
        return \is_array( $data ) ? $data : [];
    }

    private static function save( array $memory ): void {
        \update_option( self::OPTION_KEY, $memory, false );
    }
}
