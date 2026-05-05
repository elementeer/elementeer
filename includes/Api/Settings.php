<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for WordPress core settings.
 *
 * GET /site/settings   — retrieve blogname, description, homepage, permalink structure
 * PUT /site/settings   — update blogname, page_on_front, permalinks
 */
final class Settings {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_site_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-settings:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $page_on_front = (int) \get_option( 'page_on_front', 0 );
        $page_for_posts = (int) \get_option( 'page_for_posts', 0 );

        $homepage = $page_on_front ? [
            'id'   => $page_on_front,
            'title' => get_the_title( $page_on_front ) ?: '',
            'url'   => get_permalink( $page_on_front ) ?: '',
        ] : null;

        $posts_page = $page_for_posts ? [
            'id'   => $page_for_posts,
            'title' => get_the_title( $page_for_posts ) ?: '',
            'url'   => get_permalink( $page_for_posts ) ?: '',
        ] : null;

        return new WP_REST_Response( [
            'blogname'        => \get_option( 'blogname', '' ),
            'description'     => \get_option( 'blogdescription', '' ),
            'homepage'        => $homepage,
            'posts_page'      => $posts_page,
            'permalink'       => \get_option( 'permalink_structure', '' ),
            'timezone'        => wp_timezone_string(),
            'date_format'     => \get_option( 'date_format' ),
            'time_format'     => \get_option( 'time_format' ),
            'start_of_week'   => (int) \get_option( 'start_of_week', 0 ),
        ], 200 );
    }

    public function update_site_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-settings:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $updated = [];
        $errors = [];

        // Blogname
        if ( isset( $body['blogname'] ) ) {
            $blogname = sanitize_text_field( (string) $body['blogname'] );
            if ( ! empty( $blogname ) ) {
                update_option( 'blogname', $blogname );
                $updated[] = 'blogname';
            } else {
                $errors[] = 'blogname cannot be empty';
            }
        }

        // Description
        if ( isset( $body['description'] ) ) {
            $description = sanitize_text_field( (string) $body['description'] );
            update_option( 'blogdescription', $description );
            $updated[] = 'description';
        }

        // Homepage
        if ( isset( $body['homepage'] ) ) {
            $homepage_id = (int) $body['homepage'];
            if ( $homepage_id > 0 && get_post( $homepage_id ) ) {
                update_option( 'page_on_front', $homepage_id );
                update_option( 'show_on_front', 'page' );
                $updated[] = 'homepage';
            } elseif ( $homepage_id === 0 ) {
                // Reset to default (latest posts)
                update_option( 'show_on_front', 'posts' );
                update_option( 'page_on_front', 0 );
                $updated[] = 'homepage';
            } else {
                $errors[] = 'invalid homepage page ID';
            }
        }

        // Posts page
        if ( isset( $body['posts_page'] ) ) {
            $posts_page_id = (int) $body['posts_page'];
            if ( $posts_page_id > 0 && get_post( $posts_page_id ) ) {
                update_option( 'page_for_posts', $posts_page_id );
                $updated[] = 'posts_page';
            } elseif ( $posts_page_id === 0 ) {
                update_option( 'page_for_posts', 0 );
                $updated[] = 'posts_page';
            } else {
                $errors[] = 'invalid posts page ID';
            }
        }

        // Permalink structure
        if ( isset( $body['permalink'] ) ) {
            $permalink = sanitize_text_field( (string) $body['permalink'] );
            // Validate allowed structures
            $allowed = [
                '',
                '/%year%/%monthnum%/%day%/%postname%/',
                '/%year%/%monthnum%/%postname%/',
                '/%postname%/',
                '/archives/%post_id%',
            ];
            if ( in_array( $permalink, $allowed, true ) ) {
                update_option( 'permalink_structure', $permalink );
                // Flush rewrite rules
                flush_rewrite_rules( false );
                $updated[] = 'permalink';
            } else {
                $errors[] = 'invalid permalink structure';
            }
        }

        if ( ! empty( $errors ) ) {
            return new WP_Error( 'invalid_settings', implode( '; ', $errors ), [ 'status' => 400 ] );
        }

        return new WP_REST_Response( [
            'updated' => $updated,
            'settings' => $this->get_site_settings( $request )->get_data(),
        ], 200 );
    }
}