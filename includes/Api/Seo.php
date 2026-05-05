<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for plugin-agnostic SEO meta management.
 *
 * GET /site/seo/meta?post_id=123   — retrieve SEO title, description, focus keyword
 * PUT /site/seo/meta                — update SEO meta for a post
 *
 * Auto-detects active SEO plugin:
 * - Yoast SEO
 * - Rank Math SEO
 * - SEOPress
 * - All-In-One SEO
 */
final class Seo {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_seo_meta( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'seo-operations:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $post_id = (int) $request->get_param( 'post_id' );
        if ( ! $post_id ) {
            return new WP_Error( 'missing_post_id', 'post_id parameter required.', [ 'status' => 400 ] );
        }

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error( 'not_found', "Post {$post_id} not found.", [ 'status' => 404 ] );
        }

        $plugin = $this->detect_seo_plugin();
        $meta = $this->get_meta_for_post( $post_id, $plugin );

        return new WP_REST_Response( [
            'post_id'     => $post_id,
            'plugin'      => $plugin,
            'title'       => $meta['title'] ?? '',
            'description' => $meta['description'] ?? '',
            'focus_keyword' => $meta['focus_keyword'] ?? '',
        ], 200 );
    }

    public function update_seo_meta( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'seo-operations:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $post_id = isset( $body['post_id'] ) ? (int) $body['post_id'] : 0;
        if ( ! $post_id ) {
            return new WP_Error( 'missing_post_id', 'post_id field required.', [ 'status' => 400 ] );
        }

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error( 'not_found', "Post {$post_id} not found.", [ 'status' => 404 ] );
        }

        $plugin = $this->detect_seo_plugin();
        if ( ! $plugin ) {
            return new WP_Error( 'no_seo_plugin', 'No supported SEO plugin detected.', [ 'status' => 400 ] );
        }

        $updated = [];
        if ( isset( $body['title'] ) ) {
            $this->update_meta_field( $post_id, $plugin, 'title', sanitize_text_field( $body['title'] ) );
            $updated[] = 'title';
        }
        if ( isset( $body['description'] ) ) {
            $this->update_meta_field( $post_id, $plugin, 'description', sanitize_textarea_field( $body['description'] ) );
            $updated[] = 'description';
        }
        if ( isset( $body['focus_keyword'] ) ) {
            $this->update_meta_field( $post_id, $plugin, 'focus_keyword', sanitize_text_field( $body['focus_keyword'] ) );
            $updated[] = 'focus_keyword';
        }

        return new WP_REST_Response( [
            'post_id' => $post_id,
            'plugin'  => $plugin,
            'updated' => $updated,
        ], 200 );
    }

    private function detect_seo_plugin(): string {
        if ( defined( 'WPSEO_VERSION' ) ) {
            return 'yoast';
        }
        if ( defined( 'RANK_MATH_VERSION' ) ) {
            return 'rankmath';
        }
        if ( defined( 'SEOPRESS_VERSION' ) ) {
            return 'seopress';
        }
        if ( defined( 'AIOSEO_VERSION' ) ) {
            return 'aioseo';
        }
        return '';
    }

    private function get_meta_for_post( int $post_id, string $plugin ): array {
        $meta = [];
        switch ( $plugin ) {
            case 'yoast':
                $meta['title'] = get_post_meta( $post_id, '_yoast_wpseo_title', true );
                $meta['description'] = get_post_meta( $post_id, '_yoast_wpseo_metadesc', true );
                $meta['focus_keyword'] = get_post_meta( $post_id, '_yoast_wpseo_focuskw', true );
                break;
            case 'rankmath':
                $meta['title'] = get_post_meta( $post_id, 'rank_math_title', true );
                $meta['description'] = get_post_meta( $post_id, 'rank_math_description', true );
                $meta['focus_keyword'] = get_post_meta( $post_id, 'rank_math_focus_keyword', true );
                break;
            case 'seopress':
                $meta['title'] = get_post_meta( $post_id, '_seopress_titles_title', true );
                $meta['description'] = get_post_meta( $post_id, '_seopress_titles_desc', true );
                $meta['focus_keyword'] = get_post_meta( $post_id, '_seopress_analysis_target_kw', true );
                break;
            case 'aioseo':
                $meta['title'] = get_post_meta( $post_id, '_aioseo_title', true );
                $meta['description'] = get_post_meta( $post_id, '_aioseo_description', true );
                $meta['focus_keyword'] = get_post_meta( $post_id, '_aioseo_keywords', true );
                break;
            default:
                // No plugin, return empty
                break;
        }
        return $meta;
    }

    private function update_meta_field( int $post_id, string $plugin, string $field, string $value ): void {
        $mapping = [
            'yoast' => [
                'title'        => '_yoast_wpseo_title',
                'description'  => '_yoast_wpseo_metadesc',
                'focus_keyword' => '_yoast_wpseo_focuskw',
            ],
            'rankmath' => [
                'title'        => 'rank_math_title',
                'description'  => 'rank_math_description',
                'focus_keyword' => 'rank_math_focus_keyword',
            ],
            'seopress' => [
                'title'        => '_seopress_titles_title',
                'description'  => '_seopress_titles_desc',
                'focus_keyword' => '_seopress_analysis_target_kw',
            ],
            'aioseo' => [
                'title'        => '_aioseo_title',
                'description'  => '_aioseo_description',
                'focus_keyword' => '_aioseo_keywords',
            ],
        ];

        if ( isset( $mapping[ $plugin ][ $field ] ) ) {
            update_post_meta( $post_id, $mapping[ $plugin ][ $field ], $value );
        }
    }
}