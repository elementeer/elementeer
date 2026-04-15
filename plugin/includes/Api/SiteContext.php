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
    private const VALID_EDITING_MODES = [ 'direct-edit', 'draft-first', 'approval-first' ];
    private const VALID_COPY_DENSITIES = [ 'compact', 'balanced', 'complete' ];
    private const VALID_LAYOUT_PRIORITIES = [ 'preserve-existing-layout', 'preserve-copy-completeness', 'balanced' ];
    private const VALID_CHANGE_STYLES = [ 'minimal', 'adaptive', 'transformative' ];
    private const VALID_QUESTION_POLICIES = [ 'ask-on-ambiguity', 'choose-conservative-default', 'prefer-complete-content' ];

    private const DEFAULTS = [
        'user_role'       => null,
        'site_purpose'    => null,
        'brand_notes'     => null,
        'target_audience' => null,
        'primary_language' => null,
        'project_profile' => null,
        'set_at'          => null,
    ];

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    public function get_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-foundation:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $stored = get_option( self::OPTION_KEY, [] );
        $ctx    = array_merge( self::DEFAULTS, is_array( $stored ) ? $stored : [] );

        return new WP_REST_Response( $ctx, 200 );
    }

    public function set_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'site-foundation:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];

        // Validate enum fields
        if ( isset( $body['user_role'] ) && ! in_array( $body['user_role'], self::VALID_ROLES, true ) ) {
            return new WP_Error( 'invalid_user_role', sprintf( 'user_role must be one of: %s', implode( ', ', self::VALID_ROLES ) ), [ 'status' => 400 ] );
        }
        if ( isset( $body['site_purpose'] ) && ! in_array( $body['site_purpose'], self::VALID_PURPOSES, true ) ) {
            return new WP_Error( 'invalid_site_purpose', sprintf( 'site_purpose must be one of: %s', implode( ', ', self::VALID_PURPOSES ) ), [ 'status' => 400 ] );
        }
        if ( array_key_exists( 'project_profile', $body ) && null !== $body['project_profile'] ) {
            if ( ! is_array( $body['project_profile'] ) ) {
                return new WP_Error( 'invalid_project_profile', 'project_profile must be an object or null.', [ 'status' => 400 ] );
            }

            $profile = $body['project_profile'];

            if ( isset( $profile['editing_mode'] ) && ! in_array( $profile['editing_mode'], self::VALID_EDITING_MODES, true ) ) {
                return new WP_Error( 'invalid_editing_mode', sprintf( 'project_profile.editing_mode must be one of: %s', implode( ', ', self::VALID_EDITING_MODES ) ), [ 'status' => 400 ] );
            }
            if ( isset( $profile['copy_density'] ) && ! in_array( $profile['copy_density'], self::VALID_COPY_DENSITIES, true ) ) {
                return new WP_Error( 'invalid_copy_density', sprintf( 'project_profile.copy_density must be one of: %s', implode( ', ', self::VALID_COPY_DENSITIES ) ), [ 'status' => 400 ] );
            }
            if ( isset( $profile['layout_priority'] ) && ! in_array( $profile['layout_priority'], self::VALID_LAYOUT_PRIORITIES, true ) ) {
                return new WP_Error( 'invalid_layout_priority', sprintf( 'project_profile.layout_priority must be one of: %s', implode( ', ', self::VALID_LAYOUT_PRIORITIES ) ), [ 'status' => 400 ] );
            }
            if ( isset( $profile['change_style'] ) && ! in_array( $profile['change_style'], self::VALID_CHANGE_STYLES, true ) ) {
                return new WP_Error( 'invalid_change_style', sprintf( 'project_profile.change_style must be one of: %s', implode( ', ', self::VALID_CHANGE_STYLES ) ), [ 'status' => 400 ] );
            }
            if ( isset( $profile['question_policy'] ) && ! in_array( $profile['question_policy'], self::VALID_QUESTION_POLICIES, true ) ) {
                return new WP_Error( 'invalid_question_policy', sprintf( 'project_profile.question_policy must be one of: %s', implode( ', ', self::VALID_QUESTION_POLICIES ) ), [ 'status' => 400 ] );
            }
        }

        $ctx = [
            'user_role'        => isset( $body['user_role'] )       ? sanitize_text_field( $body['user_role'] )       : null,
            'site_purpose'     => isset( $body['site_purpose'] )     ? sanitize_text_field( $body['site_purpose'] )    : null,
            'brand_notes'      => isset( $body['brand_notes'] )      ? sanitize_textarea_field( $body['brand_notes'] ) : null,
            'target_audience'  => isset( $body['target_audience'] )  ? sanitize_text_field( $body['target_audience'] ) : null,
            'primary_language' => isset( $body['primary_language'] ) ? sanitize_text_field( $body['primary_language'] ): null,
            'project_profile'  => $this->sanitize_project_profile( $body['project_profile'] ?? null ),
            'set_at'           => gmdate( 'c' ),
        ];

        update_option( self::OPTION_KEY, $ctx );

        return new WP_REST_Response( $ctx, 200 );
    }

    private function sanitize_project_profile( mixed $profile ): ?array {
        if ( ! is_array( $profile ) ) {
            return null;
        }

        return [
            'editing_mode'    => isset( $profile['editing_mode'] ) ? sanitize_text_field( $profile['editing_mode'] ) : 'draft-first',
            'copy_density'    => isset( $profile['copy_density'] ) ? sanitize_text_field( $profile['copy_density'] ) : 'balanced',
            'layout_priority' => isset( $profile['layout_priority'] ) ? sanitize_text_field( $profile['layout_priority'] ) : 'balanced',
            'change_style'    => isset( $profile['change_style'] ) ? sanitize_text_field( $profile['change_style'] ) : 'adaptive',
            'question_policy' => isset( $profile['question_policy'] ) ? sanitize_text_field( $profile['question_policy'] ) : 'ask-on-ambiguity',
            'notes'           => isset( $profile['notes'] ) ? sanitize_textarea_field( (string) $profile['notes'] ) : null,
        ];
    }
}
