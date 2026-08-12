<?php
declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * REST controller for change session lifecycle.
 *
 * Sessions group multiple snapshot captures so they can be rolled back
 * as a unit via the cascade-rollback mechanism in Snapshots.
 */
final class Sessions {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * POST /changes/sessions/begin
     */
    public function begin( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $session_id = Snapshots::beginSession();
        return new WP_REST_Response( [
            'session_id' => $session_id,
            'status'     => 'active',
        ], 201 );
    }

    /**
     * POST /changes/sessions/{session_id}/end
     */
    public function end( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $session_id = \sanitize_text_field( $request->get_param( 'session_id' ) );
        $ok = Snapshots::endSession( $session_id );
        if ( ! $ok ) {
            return new WP_Error( 'not_found', 'Session not found.', [ 'status' => 404 ] );
        }
        return new WP_REST_Response( [ 'session_id' => $session_id, 'status' => 'ended' ], 200 );
    }

    /**
     * POST /changes/sessions/{session_id}/restore
     */
    public function restore( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $session_id = \sanitize_text_field( $request->get_param( 'session_id' ) );
        $result = Snapshots::restoreSession( $session_id );
        if ( ! $result['success'] ) {
            $session = Snapshots::getSession( $session_id );
            if ( $session === null ) {
                return new WP_Error( 'not_found', 'Session not found.', [ 'status' => 404 ] );
            }
        }
        return new WP_REST_Response( $result, 200 );
    }

    /**
     * GET /changes/sessions/{session_id}
     */
    public function get_session( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $session_id = \sanitize_text_field( $request->get_param( 'session_id' ) );
        $session = Snapshots::getSession( $session_id );
        if ( $session === null ) {
            return new WP_Error( 'not_found', 'Session not found.', [ 'status' => 404 ] );
        }
        return new WP_REST_Response( $session, 200 );
    }
}
