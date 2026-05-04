<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Api\Adapters\AddonRegistry;

/**
 * REST controller for Plugin Stack Context operations.
 *
 * GET /plugin-stack-context          — get current plugin stack context and recommendations
 * POST /plugin-stack-context/plan    — create a plugin stack optimization plan
 */
final class PluginStackContext {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    /**
     * GET /plugin-stack-context
     * Capability: plugin-stack-context:read
     */
    public function get_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'plugin-stack-context:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $registry = AddonRegistry::get_instance();
        $addons = $registry->get_active_addons();
        $detailed = $registry->get_all_info();

        // Analyze plugin stack health
        $plugin_count = count( $addons );
        $recommendations = $this->generate_recommendations( $addons, $detailed );

        return new WP_REST_Response( [
            'plugin_stack' => [
                'total_addons' => $plugin_count,
                'addons' => $addons,
                'health_score' => $this->calculate_health_score( $addons ),
                'recommendations' => $recommendations,
                'overlap_analysis' => $this->analyze_overlap( $detailed ),
            ],
            'supported_operations' => [
                'plan' => [
                    'description' => 'Create a plugin stack optimization plan',
                    'capability_required' => 'plugin-stack-context:prepare',
                ],
            ],
        ], 200 );
    }

    /**
     * POST /plugin-stack-context/plan
     * Capability: plugin-stack-context:prepare
     */
    public function create_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'plugin-stack-context:prepare' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $focus = $body['focus'] ?? 'performance'; // 'performance', 'redundancy', 'security', 'completeness'
        $depth = $body['depth'] ?? 'moderate';
        $constraints = $body['constraints'] ?? [];

        // Placeholder: Generate a plugin stack optimization plan
        $plan = [
            'id' => uniqid('pluginplan_'),
            'focus' => $focus,
            'depth' => $depth,
            'constraints' => $constraints,
            'phases' => [
                [
                    'name' => 'Audit',
                    'description' => 'Analyze current plugin stack for conflicts, redundancies, and performance impact',
                    'estimated_time' => '10 minutes',
                    'actions' => [
                        'scan_plugin_conflicts',
                        'identify_redundant_widgets',
                        'check_update_status',
                    ],
                ],
                [
                    'name' => 'Optimization',
                    'description' => 'Deactivate unnecessary plugins, consolidate widgets, update outdated plugins',
                    'estimated_time' => '15 minutes',
                    'actions' => [
                        'deactivate_unused_addons',
                        'consolidate_overlapping_widgets',
                        'update_plugins',
                    ],
                ],
                [
                    'name' => 'Validation',
                    'description' => 'Test site functionality after changes, ensure no breakage',
                    'estimated_time' => '5 minutes',
                    'actions' => [
                        'run_functionality_tests',
                        'verify_performance_improvement',
                        'create_rollback_point',
                    ],
                ],
            ],
            'estimated_impact' => [
                'performance_gain' => '20%',
                'reduced_conflicts' => 'High',
                'security_improvement' => 'Medium',
            ],
            'created_at' => gmdate('c'),
        ];

        return new WP_REST_Response( [
            'plan' => $plan,
            'message' => 'Plugin stack optimization plan created successfully',
        ], 201 );
    }

    /**
     * POST /plugin-stack-context/execute
     * Capability: plugin-stack-context:prepare
     */
    public function execute_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'plugin-stack-context:prepare' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];
        $plan_id = $body['plan_id'] ?? null;
        $phase = $body['phase'] ?? 'all'; // 'audit', 'optimization', 'validation', 'all'

        if ( ! $plan_id ) {
            return new WP_Error( 'missing_plan_id', 'Plan ID is required', [ 'status' => 400 ] );
        }

        // Placeholder: Simulate plan execution
        $execution_id = uniqid( 'exec_' );
        $results = [
            'execution_id' => $execution_id,
            'plan_id' => $plan_id,
            'phase' => $phase,
            'steps_completed' => [],
            'issues_found' => [],
            'recommendations_applied' => [],
        ];

        switch ( $phase ) {
            case 'audit':
                $results['steps_completed'] = [ 'scan_plugin_conflicts', 'identify_redundant_widgets' ];
                $results['issues_found'] = [ 'outdated_plugin' => 'Plugin XYZ is outdated' ];
                break;
            case 'optimization':
                $results['steps_completed'] = [ 'deactivate_unused_addons', 'consolidate_overlapping_widgets' ];
                $results['recommendations_applied'] = [ 'deactivated_plugin_abc' ];
                break;
            case 'validation':
                $results['steps_completed'] = [ 'run_functionality_tests', 'verify_performance_improvement' ];
                break;
            case 'all':
                $results['steps_completed'] = [ 'scan_plugin_conflicts', 'identify_redundant_widgets', 'deactivate_unused_addons', 'consolidate_overlapping_widgets', 'run_functionality_tests' ];
                $results['issues_found'] = [ 'outdated_plugin' => 'Plugin XYZ is outdated' ];
                $results['recommendations_applied'] = [ 'deactivated_plugin_abc' ];
                break;
        }

        return new WP_REST_Response( [
            'execution' => $results,
            'message' => 'Plugin stack optimization plan executed successfully',
            'next_steps' => [
                'review_results' => '/plugin-stack-context/results/' . $execution_id,
                'rollback_if_needed' => '/plugin-stack-context/rollback/' . $execution_id,
            ],
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private function generate_recommendations( array $addons, array $detailed ): array {
        $recommendations = [];
        $addon_count = count( $addons );

        if ( $addon_count > 10 ) {
            $recommendations[] = [
                'type' => 'performance',
                'priority' => 'high',
                'message' => 'Too many add‑ons active (' . $addon_count . '). Consider deactivating unused ones to improve site performance.',
                'action' => 'run_plugin_stack_plan',
            ];
        }

        // Check for outdated plugins
        foreach ( $addons as $addon ) {
            if ( isset( $addon['version'] ) && version_compare( $addon['version'], '5.0', '<' ) ) {
                $recommendations[] = [
                    'type' => 'security',
                    'priority' => 'medium',
                    'message' => sprintf( '%s version %s is outdated. Consider updating.', $addon['name'], $addon['version'] ),
                    'action' => 'update_plugin',
                ];
            }
        }

        // Check for overlapping widgets
        $overlap = $this->analyze_overlap( $detailed );
        if ( ! empty( $overlap['overlapping_widgets'] ) ) {
            $recommendations[] = [
                'type' => 'redundancy',
                'priority' => 'medium',
                'message' => 'Found ' . count( $overlap['overlapping_widgets'] ) . ' overlapping widget groups. Consider consolidating.',
                'action' => 'consolidate_widgets',
            ];
        }

        return $recommendations;
    }

    private function calculate_health_score( array $addons ): int {
        $score = 100;
        $addon_count = count( $addons );

        // Penalize for too many addons
        if ( $addon_count > 15 ) $score -= 30;
        elseif ( $addon_count > 10 ) $score -= 20;
        elseif ( $addon_count > 5 ) $score -= 10;

        // TODO: Add more factors (outdated plugins, conflicts, etc.)

        return max( $score, 0 );
    }

    private function analyze_overlap( array $detailed ): array {
        $widget_counts = [];
        foreach ( $detailed as $addon ) {
            if ( isset( $addon['widgets'] ) && is_array( $addon['widgets'] ) ) {
                foreach ( $addon['widgets'] as $widget ) {
                    $type = $widget['type'] ?? 'unknown';
                    if ( ! isset( $widget_counts[ $type ] ) ) {
                        $widget_counts[ $type ] = [];
                    }
                    $widget_counts[ $type ][] = $addon['name'];
                }
            }
        }

        $overlapping = [];
        foreach ( $widget_counts as $type => $addons ) {
            if ( count( $addons ) > 1 ) {
                $overlapping[] = [
                    'widget_type' => $type,
                    'provided_by' => $addons,
                    'count' => count( $addons ),
                ];
            }
        }

        return [
            'overlapping_widgets' => $overlapping,
            'total_overlaps' => count( $overlapping ),
        ];
    }
}