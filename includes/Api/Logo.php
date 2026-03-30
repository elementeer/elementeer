<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for the site logo.
 *
 * GET /site/logo   — current logo (WP custom_logo theme-mod + Elementor kit reference)
 * PUT /site/logo   — set logo by existing media attachment ID
 *
 * Note: this sets the WordPress custom_logo theme-mod, which is the canonical
 * logo source used by Astra, GeneratePress, and all well-behaved themes as well
 * as Elementor's Site Identity settings.
 */
final class Logo {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_logo( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'templates:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $logo_id  = (int) get_theme_mod( 'custom_logo', 0 );
        $logo_url = $logo_id ? wp_get_attachment_image_url( $logo_id, 'full' ) : null;

        return new WP_REST_Response( [
            'logo_id'  => $logo_id ?: null,
            'logo_url' => $logo_url ?: null,
            'set'      => $logo_id > 0,
        ], 200 );
    }

    public function set_logo( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'global-styles:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body     = $request->get_json_params() ?: [];
        $media_id = isset( $body['media_id'] ) ? (int) $body['media_id'] : 0;

        if ( $media_id <= 0 ) {
            return new WP_Error( 'invalid_media_id', 'media_id must be a positive integer.', [ 'status' => 400 ] );
        }

        $attachment = get_post( $media_id );
        if ( ! $attachment || $attachment->post_type !== 'attachment' ) {
            return new WP_Error( 'not_found', "Attachment {$media_id} not found.", [ 'status' => 404 ] );
        }

        $mime = get_post_mime_type( $media_id );
        if ( ! str_starts_with( (string) $mime, 'image/' ) ) {
            return new WP_Error( 'not_image', "Attachment {$media_id} is not an image (mime: {$mime}).", [ 'status' => 422 ] );
        }

        // Set WordPress custom logo (canonical, works with all themes + Elementor)
        set_theme_mod( 'custom_logo', $media_id );

        // Also update Elementor site_logo option if Elementor is active
        // (Elementor stores logo in a separate option for its own Site Settings panel)
        if ( defined( 'ELEMENTOR_VERSION' ) ) {
            update_option( 'elementor_site_logo', $media_id );
        }

        // Clear Elementor CSS cache so header templates re-render with new logo
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        $logo_url = wp_get_attachment_image_url( $media_id, 'full' );

        return new WP_REST_Response( [
            'logo_id'  => $media_id,
            'logo_url' => $logo_url ?: null,
            'updated'  => true,
        ], 200 );
    }
}
