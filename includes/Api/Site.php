<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Activation\Mode;

/**
 * REST controller for site info endpoint.
 */
final class Site {

    public function get_site_info( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = Auth::get_instance()->authorize( $request, 'templates:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $elementor_version     = null;
        $elementor_pro_version = false;

        if ( defined( 'ELEMENTOR_VERSION' ) ) {
            $elementor_version = ELEMENTOR_VERSION;
        }
        if ( defined( 'ELEMENTOR_PRO_VERSION' ) ) {
            $elementor_pro_version = true;
        }

        // Count published templates
        $template_count = wp_count_posts( 'elementor_library' )->publish ?? 0;

        // Capabilities available to this key
        $capabilities = $auth['capabilities'] ?? [];

        return new WP_REST_Response(
            [
                'name'              => get_bloginfo( 'name' ),
                'url'               => get_site_url(),
                'wp_version'        => get_bloginfo( 'version' ),
                'elementor_version' => $elementor_version,
                'elementor_pro'     => $elementor_pro_version,
                'activation_mode'   => Mode::get_instance()->get_mode(),
                'template_count'    => (int) $template_count,
                'capabilities'      => $capabilities,
            ],
            200
        );
    }
}
