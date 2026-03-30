<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for the site context resource.
 *
 * Site context is a small, human-provided metadata object that gives the AI
 * agent essential background it cannot infer from code alone: who is using
 * the site, what it is for, and any brand guidance.  It is stored as a single
 * wp_option and read by the recommendation engine to tailor its output.
 *
 * GET  /site/context  — retrieve current context (or defaults)
 * PUT  /site/context  — overwrite context (full replace)
 */
final class SiteContext {

    private const OPTION_KEY = 'elementify_site_context';

    private const VALID_ROLES    = [ 'freelancer', 'agency', 'site-owner', 'ai-agent' ];
    private const VALID_PURPOSES = [ 'ecommerce', 'corporate', 'portfolio', 'blog', 'community', 'other' ];

    private const DEFAULTS = [
        'user_role'       => null,
        'site_purpose'    => null,
        'brand_notes'     => null,
        'target_audience' => null,
        'primary_language' => null,
        'set_at'          => null,
    ];

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'templates:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $stored = get_option( self::OPTION_KEY, [] );
        $ctx    = array_merge( self::DEFAULTS, is_array( $stored ) ? $stored : [] );

        return new WP_REST_Response( $ctx, 200 );
    }

    public function set_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'templates:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];

        // Validate enum fields
        if ( isset( $body['user_role'] ) && ! in_array( $body['user_role'], self::VALID_ROLES, true ) ) {
            return new WP_Error( 'invalid_user_role', sprintf( 'user_role must be one of: %s', implode( ', ', self::VALID_ROLES ) ), [ 'status' => 400 ] );
        }
        if ( isset( $body['site_purpose'] ) && ! in_array( $body['site_purpose'], self::VALID_PURPOSES, true ) ) {
            return new WP_Error( 'invalid_site_purpose', sprintf( 'site_purpose must be one of: %s', implode( ', ', self::VALID_PURPOSES ) ), [ 'status' => 400 ] );
        }

        $ctx = [
            'user_role'        => isset( $body['user_role'] )       ? sanitize_text_field( $body['user_role'] )       : null,
            'site_purpose'     => isset( $body['site_purpose'] )     ? sanitize_text_field( $body['site_purpose'] )    : null,
            'brand_notes'      => isset( $body['brand_notes'] )      ? sanitize_textarea_field( $body['brand_notes'] ) : null,
            'target_audience'  => isset( $body['target_audience'] )  ? sanitize_text_field( $body['target_audience'] ) : null,
            'primary_language' => isset( $body['primary_language'] ) ? sanitize_text_field( $body['primary_language'] ): null,
            'set_at'           => gmdate( 'c' ),
        ];

        update_option( self::OPTION_KEY, $ctx );

        return new WP_REST_Response( $ctx, 200 );
    }
}
