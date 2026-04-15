<?php
declare(strict_types=1);
namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for the change review queue.
 * Changes are stored as a JSON array in wp_options under 'elementify_change_queue'.
 *
 * GET    /changes/queue          — list changes (?status=pending|approved|rejected|applied|all)
 * POST   /changes/queue          — create a queued change
 * GET    /changes/{id}           — get a single change
 * PUT    /changes/{id}/status    — approve, reject, or mark applied
 * DELETE /changes/{id}           — delete a change
 */
final class ChangeQueue {

    private const OPTION_KEY  = 'elementify_change_queue';
    private const MAX_CHANGES = 500;

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // GET /changes/queue
    // ------------------------------------------------------------------ //
    public function list_changes( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'governance:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $status = sanitize_text_field( $request->get_param( 'status' ) ?? 'all' );
        $queue  = $this->load_queue();

        if ( $status !== 'all' ) {
            $queue = array_values( array_filter( $queue, fn( $c ) => $c['status'] === $status ) );
        }

        // Newest first
        usort( $queue, fn( $a, $b ) => strcmp( $b['created_at'], $a['created_at'] ) );

        return new WP_REST_Response( [ 'changes' => $queue, 'total' => count( $queue ) ], 200 );
    }

    // ------------------------------------------------------------------ //
    // POST /changes/queue
    // ------------------------------------------------------------------ //
    public function create_change( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'workflow-orchestration:prepare' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];

        $operation = sanitize_text_field( $body['operation'] ?? '' );
        if ( empty( $operation ) ) {
            return new WP_Error( 'missing_operation', 'operation is required.', [ 'status' => 400 ] );
        }

        $params = $body['params'] ?? [];
        if ( ! is_array( $params ) ) {
            return new WP_Error( 'invalid_params', 'params must be an object.', [ 'status' => 400 ] );
        }

        $change = [
            'id'           => 'chg_' . bin2hex( random_bytes( 8 ) ),
            'created_at'   => gmdate( 'c' ),
            'status'       => 'pending',
            'operation'    => $operation,
            'params'       => $params,
            'note'         => sanitize_text_field( $body['note'] ?? '' ) ?: null,
            'before_state' => isset( $body['before_state'] ) && is_array( $body['before_state'] )
                              ? $body['before_state']
                              : null,
            'reviewed_at'  => null,
            'review_note'  => null,
            'applied_at'   => null,
        ];

        $queue   = $this->load_queue();
        $queue[] = $change;
        $this->save_queue( $queue );

        return new WP_REST_Response( $change, 201 );
    }

    // ------------------------------------------------------------------ //
    // GET /changes/{id}
    // ------------------------------------------------------------------ //
    public function get_change( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'governance:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id     = sanitize_text_field( $request->get_param( 'id' ) ?? '' );
        $change = $this->find_change( $id );
        if ( ! $change ) {
            return new WP_Error( 'not_found', "Change {$id} not found.", [ 'status' => 404 ] );
        }

        return new WP_REST_Response( $change, 200 );
    }

    // ------------------------------------------------------------------ //
    // PUT /changes/{id}/status   { status: "approved"|"rejected"|"applied", note?: string }
    // ------------------------------------------------------------------ //
    public function update_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $id   = sanitize_text_field( $request->get_param( 'id' ) ?? '' );
        $body = $request->get_json_params() ?: [];

        $new_status = sanitize_text_field( $body['status'] ?? '' );
        if ( ! in_array( $new_status, [ 'approved', 'rejected', 'applied' ], true ) ) {
            return new WP_Error(
                'invalid_status',
                'status must be one of: approved, rejected, applied.',
                [ 'status' => 400 ]
            );
        }

        $required_capability = $new_status === 'applied' ? 'governance:apply' : 'governance:review';
        $auth = $this->auth->authorize( $request, $required_capability );
        if ( is_wp_error( $auth ) ) return $auth;

        $queue = $this->load_queue();
        $found = false;

        foreach ( $queue as &$change ) {
            if ( $change['id'] !== $id ) continue;

            $change['status']      = $new_status;
            $change['reviewed_at'] = gmdate( 'c' );
            $change['review_note'] = sanitize_text_field( $body['note'] ?? '' ) ?: null;

            if ( $new_status === 'applied' ) {
                $change['applied_at'] = gmdate( 'c' );
            }

            $found = $change;
            break;
        }
        unset( $change );

        if ( ! $found ) {
            return new WP_Error( 'not_found', "Change {$id} not found.", [ 'status' => 404 ] );
        }

        $this->save_queue( $queue );
        return new WP_REST_Response( $found, 200 );
    }

    // ------------------------------------------------------------------ //
    // DELETE /changes/{id}
    // ------------------------------------------------------------------ //
    public function delete_change( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'governance:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $id        = sanitize_text_field( $request->get_param( 'id' ) ?? '' );
        $queue     = $this->load_queue();
        $new_queue = array_values( array_filter( $queue, fn( $c ) => $c['id'] !== $id ) );

        if ( count( $new_queue ) === count( $queue ) ) {
            return new WP_Error( 'not_found', "Change {$id} not found.", [ 'status' => 404 ] );
        }

        $this->save_queue( $new_queue );
        return new WP_REST_Response( [ 'deleted' => true, 'id' => $id ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private function load_queue(): array {
        $raw  = get_option( self::OPTION_KEY, '[]' );
        $data = json_decode( is_string( $raw ) ? $raw : '[]', true );
        return is_array( $data ) ? $data : [];
    }

    private function save_queue( array $queue ): void {
        // Cap at MAX_CHANGES, keeping the newest
        if ( count( $queue ) > self::MAX_CHANGES ) {
            usort( $queue, fn( $a, $b ) => strcmp( $b['created_at'], $a['created_at'] ) );
            $queue = array_slice( $queue, 0, self::MAX_CHANGES );
        }
        update_option( self::OPTION_KEY, wp_json_encode( $queue ), false );
    }

    private function find_change( string $id ): array|false {
        foreach ( $this->load_queue() as $change ) {
            if ( $change['id'] === $id ) return $change;
        }
        return false;
    }
}
