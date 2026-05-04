<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Stack Bootstrap operations.
 *
 * GET /stack-bootstrap          — get stack bootstrap status and options
 * POST /stack-bootstrap/plan    — create a stack bootstrap plan
 * POST /stack-bootstrap/execute — execute a stack bootstrap plan
 */
final class StackBootstrap {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * GET /stack-bootstrap
     * Capability: stack-bootstrap:read
     */
    public function get_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'stack-bootstrap:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        // Placeholder: Return current stack bootstrap status
        return new WP_REST_Response( [
            'status' => 'available',
            'operations' => [
                'plan' => [
                    'description' => 'Create a stack bootstrap plan based on site assessment',
                    'capability_required' => 'stack-bootstrap:prepare',
                ],
                'execute' => [
                    'description' => 'Execute a stack bootstrap plan to configure the site',
                    'capability_required' => 'stack-bootstrap:write',
                ],
            ],
            'supported_scenarios' => [
                'idea_only' => 'Starting from just an idea',
                'brand_without_site' => 'Brand exists but no website',
                'wordpress_without_elementor' => 'WordPress installed but no Elementor',
                'partial_stack' => 'Partial Elementor stack needs completion',
            ],
        ], 200 );
    }

    /**
     * POST /stack-bootstrap/plan
     * Capability: stack-bootstrap:prepare
     */
    public function create_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'stack-bootstrap:prepare' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $scenario = $body['scenario'] ?? 'idea_only';
        $user_posture = $body['user_posture'] ?? 'guided';
        $depth = $body['depth'] ?? 'moderate';
        $constraints = $body['constraints'] ?? [];

        // Placeholder: Generate a simple plan
        $plan = [
            'id' => uniqid('plan_'),
            'scenario' => $scenario,
            'user_posture' => $user_posture,
            'depth' => $depth,
            'constraints' => $constraints,
            'phases' => [
                [
                    'name' => 'Assessment',
                    'description' => 'Analyze current site state and requirements',
                    'estimated_time' => '5 minutes',
                ],
                [
                    'name' => 'Foundation Setup',
                    'description' => 'Configure WordPress, Elementor, and essential plugins',
                    'estimated_time' => '15 minutes',
                ],
                [
                    'name' => 'Brand Application',
                    'description' => 'Apply brand colors, typography, and logo',
                    'estimated_time' => '10 minutes',
                ],
                [
                    'name' => 'Content Structure',
                    'description' => 'Create initial pages and templates',
                    'estimated_time' => '20 minutes',
                ],
            ],
            'recommended_plugins' => [
                'Essential Addons for Elementor',
                'Elementor Pro (if licensed)',
                'Hello Elementor Theme',
            ],
            'created_at' => gmdate('c'),
        ];

        return new WP_REST_Response( [
            'plan' => $plan,
            'message' => 'Stack bootstrap plan created successfully',
        ], 201 );
    }

    /**
     * POST /stack-bootstrap/execute
     * Capability: stack-bootstrap:write
     */
    public function execute_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'stack-bootstrap:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $plan_id = $body['plan_id'] ?? null;

        if ( empty( $plan_id ) ) {
            return new WP_Error( 'missing_plan_id', 'plan_id is required to execute a plan.', [ 'status' => 400 ] );
        }

        // Placeholder: Simulate execution
        return new WP_REST_Response( [
            'execution_id' => uniqid('exec_'),
            'plan_id' => $plan_id,
            'status' => 'started',
            'steps_completed' => 0,
            'total_steps' => 4,
            'estimated_completion' => gmdate('c', time() + 1800), // 30 minutes from now
            'message' => 'Stack bootstrap execution started. This is a placeholder implementation.',
        ], 202 );
    }
}