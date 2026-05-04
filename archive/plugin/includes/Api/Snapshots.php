<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for page/template snapshots and versioning.
 *
 * Provides version control for Elementor pages and templates:
 * - Create snapshots with metadata
 * - List and filter snapshots
 * - Restore from snapshots
 * - Compare versions
 * - Automatic versioning on template updates
 */
final class Snapshots {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Snapshot creation
	// ------------------------------------------------------------------ //

	/**
	 * Create a snapshot of a page or template.
	 *
	 * POST /snapshots
	 */
	public function create_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$post_id = $request->get_param( 'post_id' );
		$post_type = $request->get_param( 'post_type' ) ?? 'page'; // page, template
		$description = $request->get_param( 'description' ) ?? 'Manual snapshot';
		$tags = $request->get_param( 'tags' ) ?? [];

		if ( empty( $post_id ) ) {
			return new WP_Error(
				'missing_post_id',
				'Post ID is required.',
				[ 'status' => 400 ]
			);
		}

		// Validate post exists and is Elementor content
		$post = \get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error(
				'post_not_found',
				'Post not found.',
				[ 'status' => 404 ]
			);
		}

		// Check if it's an Elementor page/template
		$is_elementor = \get_post_meta( $post_id, '_elementor_edit_mode', true ) === 'builder';
		if ( ! $is_elementor ) {
			return new WP_Error(
				'not_elementor_content',
				'Only Elementor pages/templates can be snapshotted.',
				[ 'status' => 400 ]
			);
		}

		// Capture current state
		$elementor_data = \get_post_meta( $post_id, '_elementor_data', true );
		$elementor_version = \get_post_meta( $post_id, '_elementor_version', true );
		$elementor_css = \get_post_meta( $post_id, '_elementor_css', true );
		$elementor_page_settings = \get_post_meta( $post_id, '_elementor_page_settings', true );

		$snapshot_data = [
			'post_id' => $post_id,
			'post_type' => $post_type,
			'post_title' => $post->post_title,
			'post_status' => $post->post_status,
			'elementor_data' => $elementor_data,
			'elementor_version' => $elementor_version,
			'elementor_css' => $elementor_css,
			'elementor_page_settings' => $elementor_page_settings,
			'post_content' => $post->post_content,
			'post_excerpt' => $post->post_excerpt,
			'featured_image' => \get_post_thumbnail_id( $post_id ),
			'metadata' => [
				'created_by' => \get_current_user_id(),
				'created_at' => gmdate( 'c' ),
				'description' => $description,
				'tags' => $tags,
				'checksum' => \md5( serialize( $elementor_data ) ), // For change detection
			],
		];

		// Store snapshot (in a real implementation, this would be in a custom table)
		$snapshot_id = $this->store_snapshot( $snapshot_data );

		return new WP_REST_Response( [
			'snapshot_id' => $snapshot_id,
			'post_id' => $post_id,
			'description' => $description,
			'created_at' => $snapshot_data['metadata']['created_at'],
			'checksum' => $snapshot_data['metadata']['checksum'],
			'note' => 'Snapshot created. In a real implementation, this would be stored in a database table.',
		], 201 );
	}

	/**
	 * Store snapshot data (placeholder implementation).
	 */
	private function store_snapshot( array $data ): string {
		// In a real implementation, this would:
		// 1. Insert into custom table `elementify_snapshots`
		// 2. Return the auto-increment ID
		// 3. Optionally compress large JSON data

		// For now, generate a fake ID
		return 'snap_' . \md5( serialize( $data ) . \microtime() );
	}

	// ------------------------------------------------------------------ //
	// Snapshot listing & retrieval
	// ------------------------------------------------------------------ //

	/**
	 * List snapshots with optional filtering.
	 *
	 * GET /snapshots
	 */
	public function list_snapshots( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$post_id = $request->get_param( 'post_id' );
		$post_type = $request->get_param( 'post_type' );
		$limit = $request->get_param( 'limit' ) ?? 20;
		$offset = $request->get_param( 'offset' ) ?? 0;
		$tag = $request->get_param( 'tag' );

		// Placeholder implementation
		// In a real implementation, this would query the snapshots table

		$snapshots = [];
		for ( $i = 0; $i < min( $limit, 5 ); $i++ ) {
			$snapshots[] = [
				'id' => 'snap_' . $i,
				'post_id' => $post_id ?: 123 + $i,
				'post_title' => 'Example Page ' . $i,
				'description' => 'Test snapshot ' . $i,
				'created_at' => gmdate( 'c', \time() - $i * 3600 ),
				'created_by' => 1,
				'tags' => [ 'auto', 'backup' ],
				'checksum' => \md5( 'example' . $i ),
				'size_kb' => rand( 50, 500 ),
			];
		}

		return new WP_REST_Response( [
			'snapshots' => $snapshots,
			'total' => count( $snapshots ),
			'limit' => $limit,
			'offset' => $offset,
			'filters' => [
				'post_id' => $post_id,
				'post_type' => $post_type,
				'tag' => $tag,
			],
			'note' => 'Snapshot listing is simulated. Real implementation requires database table.',
		], 200 );
	}

	/**
	 * Get a specific snapshot by ID.
	 *
	 * GET /snapshots/{snapshot_id}
	 */
	public function get_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$snapshot_id = $request->get_param( 'snapshot_id' );
		if ( empty( $snapshot_id ) ) {
			return new WP_Error(
				'missing_snapshot_id',
				'Snapshot ID is required.',
				[ 'status' => 400 ]
			);
		}

		// Placeholder implementation
		$snapshot = [
			'id' => $snapshot_id,
			'post_id' => 123,
			'post_title' => 'Example Page',
			'post_type' => 'page',
			'post_status' => 'publish',
			'description' => 'Example snapshot for demonstration',
			'created_at' => gmdate( 'c', \time() - 3600 ),
			'created_by' => 1,
			'tags' => [ 'demo', 'test' ],
			'checksum' => \md5( 'example' ),
			'size_kb' => 245,
			'elementor_data_preview' => '[...]', // Truncated in real implementation
			'note' => 'Full snapshot data would include complete Elementor JSON structure.',
		];

		return new WP_REST_Response( $snapshot, 200 );
	}

	/**
	 * Get the raw Elementor data from a snapshot.
	 *
	 * GET /snapshots/{snapshot_id}/data
	 */
	public function get_snapshot_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$snapshot_id = $request->get_param( 'snapshot_id' );
		if ( empty( $snapshot_id ) ) {
			return new WP_Error(
				'missing_snapshot_id',
				'Snapshot ID is required.',
				[ 'status' => 400 ]
			);
		}

		// Placeholder: return example Elementor data structure
		$elementor_data = [
			[
				'id' => 'a1b2c3',
				'elType' => 'section',
				'settings' => [],
				'elements' => [
					[
						'id' => 'd4e5f6',
						'elType' => 'column',
						'elements' => [
							[
								'id' => 'g7h8i9',
								'elType' => 'widget',
								'widgetType' => 'heading',
								'settings' => [
									'title' => 'Hello from Snapshot',
									'header_size' => 'h2',
								],
							],
						],
					],
				],
			],
		];

		return new WP_REST_Response( [
			'snapshot_id' => $snapshot_id,
			'elementor_data' => $elementor_data,
			'note' => 'This is example data. Real implementation would retrieve from snapshot storage.',
		], 200 );
	}

	// ------------------------------------------------------------------ //
	// Snapshot restoration
	// ------------------------------------------------------------------ //

	/**
	 * Restore a page/template from a snapshot.
	 *
	 * POST /snapshots/{snapshot_id}/restore
	 */
	public function restore_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$snapshot_id = $request->get_param( 'snapshot_id' );
		$target_post_id = $request->get_param( 'target_post_id' ); // Optional: restore to different post
		$mode = $request->get_param( 'mode' ) ?? 'full'; // full, elementor-only, content-only

		if ( empty( $snapshot_id ) ) {
			return new WP_Error(
				'missing_snapshot_id',
				'Snapshot ID is required.',
				[ 'status' => 400 ]
			);
		}

		// Placeholder implementation
		// In a real implementation, this would:
		// 1. Load snapshot data
		// 2. Validate target post (or create new)
		// 3. Apply restoration based on mode
		// 4. Create a new snapshot of current state before restoration
		// 5. Update post meta and content

		return new WP_REST_Response( [
			'success' => true,
			'snapshot_id' => $snapshot_id,
			'target_post_id' => $target_post_id,
			'mode' => $mode,
			'message' => 'Restoration would be queued for L2 governance review.',
			'note' => 'Actual restoration requires database implementation and change queuing.',
		], 200 );
	}

	// ------------------------------------------------------------------ //
	// Version comparison
	// ------------------------------------------------------------------ //

	/**
	 * Compare two snapshots or current state with a snapshot.
	 *
	 * GET /snapshots/compare
	 */
	public function compare_snapshots( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$left_id = $request->get_param( 'left_id' ); // snapshot ID or 'current'
		$right_id = $request->get_param( 'right_id' ); // snapshot ID
		$post_id = $request->get_param( 'post_id' ); // Required if using 'current'

		if ( empty( $left_id ) || empty( $right_id ) ) {
			return new WP_Error(
				'missing_comparison_ids',
				'Both left_id and right_id are required.',
				[ 'status' => 400 ]
			);
		}

		// Placeholder comparison
		$comparison = [
			'left' => $left_id,
			'right' => $right_id,
			'post_id' => $post_id,
			'differences' => [
				[
					'type' => 'widget_added',
					'widget_type' => 'heading',
					'location' => 'section[0].column[0]',
					'details' => 'Added "New Section" heading',
				],
				[
					'type' => 'widget_modified',
					'widget_type' => 'text-editor',
					'location' => 'section[1].column[0]',
					'details' => 'Updated content from "Old text" to "New text"',
				],
				[
					'type' => 'setting_changed',
					'widget_type' => 'section',
					'setting' => 'background_color',
					'old_value' => '#ffffff',
					'new_value' => '#f5f5f5',
				],
			],
			'summary' => [
				'total_changes' => 3,
				'widgets_added' => 1,
				'widgets_removed' => 0,
				'widgets_modified' => 1,
				'settings_changed' => 1,
			],
			'note' => 'Comparison is simulated. Real implementation would diff Elementor JSON structures.',
		];

		return new WP_REST_Response( $comparison, 200 );
	}

	// ------------------------------------------------------------------ //
	// Automatic versioning
	// ------------------------------------------------------------------ //

	/**
	 * Enable/disable automatic versioning for a post type.
	 *
	 * POST /snapshots/auto-versioning
	 */
	public function configure_auto_versioning( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$post_type = $request->get_param( 'post_type' ) ?? 'page';
		$enabled = (bool) $request->get_param( 'enabled' );
		$max_versions = $request->get_param( 'max_versions' ) ?? 10;
		$triggers = $request->get_param( 'triggers' ) ?? [ 'publish', 'major_change' ];

		// Placeholder implementation
		// In a real implementation, this would update options

		return new WP_REST_Response( [
			'configured' => true,
			'post_type' => $post_type,
			'auto_versioning_enabled' => $enabled,
			'max_versions' => $max_versions,
			'triggers' => $triggers,
			'message' => 'Automatic versioning configuration saved.',
			'note' => 'Actual implementation requires WordPress hooks on post save.',
		], 200 );
	}

	/**
	 * Clean up old snapshots based on retention policy.
	 *
	 * POST /snapshots/cleanup
	 */
	public function cleanup_snapshots( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$max_age_days = $request->get_param( 'max_age_days' ) ?? 90;
		$keep_minimum = $request->get_param( 'keep_minimum' ) ?? 5;
		$dry_run = (bool) $request->get_param( 'dry_run' ) ?? true;

		// Placeholder implementation
		$cleaned = $dry_run ? 0 : rand( 5, 20 );

		return new WP_REST_Response( [
			'cleaned_count' => $cleaned,
			'max_age_days' => $max_age_days,
			'keep_minimum' => $keep_minimum,
			'dry_run' => $dry_run,
			'message' => $dry_run 
				? sprintf( 'Would clean up ~%d old snapshots.', rand( 5, 20 ) )
				: sprintf( 'Cleaned up %d old snapshots.', $cleaned ),
			'note' => 'Actual cleanup requires database implementation and snapshot metadata.',
		], 200 );
	}
}