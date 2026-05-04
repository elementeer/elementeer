<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for Workflow Orchestration operations.
 *
 * GET /workflows          — list available workflow templates
 * POST /workflows/plan    — create a workflow plan
 * POST /workflows/execute — execute a workflow plan
 */
final class WorkflowOrchestration {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * GET /workflows
     * Capability: workflow-orchestration:read
     */
    public function list_workflows( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'workflow-orchestration:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        // Placeholder: Return predefined workflow templates
        $workflows = [
            [
                'id' => 'content-publish',
                'name' => 'Content Publishing Workflow',
                'description' => 'Multi-stage content approval and publishing workflow with staging environments.',
                'stages' => [ 'draft', 'review', 'staging', 'production' ],
                'estimated_duration' => '2 hours',
                'supports_rollback' => true,
            ],
            [
                'id' => 'template-update',
                'name' => 'Template Update Workflow',
                'description' => 'Safe template updates with versioning and rollback support.',
                'stages' => [ 'draft', 'staging', 'production' ],
                'estimated_duration' => '1 hour',
                'supports_rollback' => true,
            ],
            [
                'id' => 'style-migration',
                'name' => 'Style Migration Workflow',
                'description' => 'Migrate global styles (colors, typography) across environments.',
                'stages' => [ 'draft', 'production' ],
                'estimated_duration' => '30 minutes',
                'supports_rollback' => false,
            ],
            [
                'id' => 'bulk-operation',
                'name' => 'Bulk Operation Workflow',
                'description' => 'Apply changes across multiple pages with atomic rollback.',
                'stages' => [ 'draft', 'production' ],
                'estimated_duration' => 'Varies',
                'supports_rollback' => true,
            ],
        ];

        return new WP_REST_Response( [
            'workflows' => $workflows,
            'total' => count( $workflows ),
        ], 200 );
    }

    /**
     * POST /workflows/plan
     * Capability: workflow-orchestration:prepare
     */
    public function create_workflow_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'workflow-orchestration:prepare' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $workflow_id = $body['workflow_id'] ?? 'content-publish';
        $target_environment = $body['target_environment'] ?? 'production';
        $content_ids = $body['content_ids'] ?? [];
        $options = $body['options'] ?? [];

        // Placeholder: Generate a workflow plan
        $plan = [
            'plan_id' => uniqid( 'wfplan_' ),
            'workflow_id' => $workflow_id,
            'target_environment' => $target_environment,
            'content_ids' => $content_ids,
            'options' => $options,
            'stages' => [
                [
                    'name' => 'Draft Creation',
                    'description' => 'Create draft copies of selected content.',
                    'estimated_time' => '5 minutes',
                    'operations' => [
                        [ 'type' => 'duplicate', 'content_type' => 'page' ],
                    ],
                ],
                [
                    'name' => 'Staging Deployment',
                    'description' => 'Deploy drafts to staging environment for review.',
                    'estimated_time' => '10 minutes',
                    'operations' => [
                        [ 'type' => 'promote', 'environment' => 'staging' ],
                    ],
                ],
                [
                    'name' => 'Approval',
                    'description' => 'Await approval from designated reviewers.',
                    'estimated_time' => '30 minutes',
                    'operations' => [
                        [ 'type' => 'wait', 'event' => 'approval' ],
                    ],
                ],
                [
                    'name' => 'Production Deployment',
                    'description' => 'Promote approved changes to production.',
                    'estimated_time' => '5 minutes',
                    'operations' => [
                        [ 'type' => 'promote', 'environment' => 'production' ],
                    ],
                ],
            ],
            'created_at' => gmdate( 'c' ),
        ];

        return new WP_REST_Response( [
            'plan' => $plan,
            'message' => 'Workflow plan created successfully.',
        ], 201 );
    }

    /**
     * POST /workflows/execute
     * Capability: workflow-orchestration:write
     */
    public function execute_workflow_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'workflow-orchestration:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $plan_id = $body['plan_id'] ?? null;
        $confirm = $body['confirm'] ?? false;

        if ( empty( $plan_id ) ) {
            return new WP_Error( 'missing_plan_id', 'plan_id is required to execute a workflow plan.', [ 'status' => 400 ] );
        }

        // Placeholder: Simulate workflow execution
        $execution_id = uniqid( 'wfexec_' );
        $status = $confirm ? 'started' : 'pending_confirmation';

        return new WP_REST_Response( [
            'execution_id' => $execution_id,
            'plan_id' => $plan_id,
            'status' => $status,
            'current_stage' => $confirm ? 'Draft Creation' : 'Awaiting confirmation',
            'progress' => $confirm ? 10 : 0,
            'estimated_completion' => $confirm ? gmdate( 'c', time() + 3600 ) : null,
            'message' => $confirm
                ? 'Workflow execution started. This is a placeholder implementation.'
                : 'Workflow execution requires confirmation. Send confirm=true to proceed.',
        ], $confirm ? 202 : 200 );
    }
}