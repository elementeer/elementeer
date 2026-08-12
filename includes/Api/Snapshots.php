<?php
declare(strict_types=1);

namespace Elementeer\MCP\Api;

use Elementeer\MCP\Api\ElementorDocument;

/**
 * Snapshot / rollback system for Elementor _elementor_data mutations.
 *
 * Every mutating write captures a snapshot before modifying the live data.
 * Snapshots are stored in wp_options, not as WordPress post revisions
 * (which Performance::clean_database() treats as bloat and deletes).
 *
 * Sessions group multiple writes so they can be rolled back as a unit
 * (cascade rollback across every touched object).
 */
class Snapshots {

	private const OPTION_SNAPSHOTS = 'elementeer_snapshots';
	private const OPTION_SESSIONS  = 'elementeer_sessions';
	private const MAX_SNAPSHOTS    = 500;

	// ------------------------------------------------------------------ //
	// Single snapshot
	// ------------------------------------------------------------------ //

	/**
	 * Capture the current _elementor_data of a post as a snapshot.
	 * Returns the snapshot UUID. Safe to call on empty posts.
	 */
	public static function capture( int $post_id, string $session_id = '' ): string {
		// Auto-attach to the most-recently-begun active session
		if ( $session_id === '' ) {
			$session_id = self::findActiveSession();
		}

		$doc  = ElementorDocument::load( $post_id );
		$uuid = self::uuid();

		$snapshot = [
			'uuid'           => $uuid,
			'post_id'        => $post_id,
			'session_id'     => $session_id,
			'elementor_data' => \wp_json_encode( $doc->toArray() ),
			'content_hash'   => $doc->contentHash(),
			'created_at'     => \gmdate( 'c' ),
		];

		$snapshots          = self::loadSnapshots();
		$snapshots[ $uuid ] = $snapshot;
		self::saveSnapshots( $snapshots );

		if ( $session_id !== '' ) {
			self::attachToSession( $session_id, $uuid );
		}

		self::enforceLimit();

		return $uuid;
	}

	/**
	 * Restore a single snapshot — writes its _elementor_data back to the post.
	 */
	public static function restore( string $uuid ): bool {
		$snapshots = self::loadSnapshots();
		$snapshot  = $snapshots[ $uuid ] ?? null;

		if ( $snapshot === null ) {
			return false;
		}

		\update_post_meta(
			$snapshot['post_id'],
			'_elementor_data',
			\wp_slash( $snapshot['elementor_data'] )
		);

		if ( \class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}

		\wp_update_post( [ 'ID' => $snapshot['post_id'] ] );

		return true;
	}

	/**
	 * Get a snapshot by UUID. Returns null if not found.
	 */
	public static function get( string $uuid ): ?array {
		$snapshots = self::loadSnapshots();
		return $snapshots[ $uuid ] ?? null;
	}

	// ------------------------------------------------------------------ //
	// Session management
	// ------------------------------------------------------------------ //

	/**
	 * Begin a new change session. All subsequent captures inside this session
	 * are tracked so they can be rolled back together.
	 */
	public static function beginSession(): string {
		$session_id = self::uuid();
		$sessions   = self::loadSessions();

		$sessions[ $session_id ] = [
			'session_id'      => $session_id,
			'snapshot_uuids'  => [],
			'status'          => 'active',
			'created_at'      => \gmdate( 'c' ),
		];

		self::saveSessions( $sessions );

		return $session_id;
	}

	/**
	 * End a session — marks it complete so no further snapshots are attached.
	 */
	public static function endSession( string $session_id ): bool {
		$sessions = self::loadSessions();
		if ( ! isset( $sessions[ $session_id ] ) ) {
			return false;
		}

		$sessions[ $session_id ]['status']    = 'ended';
		$sessions[ $session_id ]['ended_at']  = \gmdate( 'c' );
		self::saveSessions( $sessions );

		return true;
	}

	/**
	 * Roll back an entire session — restores every snapshot captured in it,
	 * in reverse chronological order.
	 */
	public static function restoreSession( string $session_id ): array {
		$sessions = self::loadSessions();
		$session  = $sessions[ $session_id ] ?? null;

		if ( $session === null ) {
			return [ 'success' => false, 'restored' => 0 ];
		}

		$uuids    = \array_reverse( $session['snapshot_uuids'] );
		$restored = 0;

		foreach ( $uuids as $uuid ) {
			if ( self::restore( $uuid ) ) {
				$restored++;
			}
		}

		$sessions[ $session_id ]['status']        = 'rolled_back';
		$sessions[ $session_id ]['rolled_back_at'] = \gmdate( 'c' );
		self::saveSessions( $sessions );

		return [
			'success'  => true,
			'restored' => $restored,
			'total'    => \count( $uuids ),
		];
	}

	/**
	 * Get a session by id. Returns null if not found.
	 */
	public static function getSession( string $session_id ): ?array {
		$sessions = self::loadSessions();
		return $sessions[ $session_id ] ?? null;
	}

	// ------------------------------------------------------------------ //
	// Cleanup
	// ------------------------------------------------------------------ //

	/**
	 * Remove snapshots beyond the configured limit, oldest first.
	 */
	public static function enforceLimit(): void {
		$snapshots = self::loadSnapshots();

		if ( \count( $snapshots ) <= self::MAX_SNAPSHOTS ) {
			return;
		}

		\uasort( $snapshots, fn( $a, $b ) => \strcmp( $a['created_at'], $b['created_at'] ) );
		$to_keep   = \array_slice( $snapshots, -self::MAX_SNAPSHOTS, self::MAX_SNAPSHOTS, true );
		self::saveSnapshots( $to_keep );
	}

	// ------------------------------------------------------------------ //
	// Internal storage
	// ------------------------------------------------------------------ //

	/**
	 * @return array<string, array>
	 */
	private static function loadSnapshots(): array {
		$data = \get_option( self::OPTION_SNAPSHOTS, [] );
		return \is_array( $data ) ? $data : [];
	}

	private static function saveSnapshots( array $snapshots ): void {
		\update_option( self::OPTION_SNAPSHOTS, $snapshots, false );
	}

	/**
	 * @return array<string, array>
	 */
	private static function loadSessions(): array {
		$data = \get_option( self::OPTION_SESSIONS, [] );
		return \is_array( $data ) ? $data : [];
	}

	private static function saveSessions( array $sessions ): void {
		\update_option( self::OPTION_SESSIONS, $sessions, false );
	}

	private static function attachToSession( string $session_id, string $uuid ): void {
		$sessions = self::loadSessions();
		if ( ! isset( $sessions[ $session_id ] ) ) {
			return;
		}
		$sessions[ $session_id ]['snapshot_uuids'][] = $uuid;
		self::saveSessions( $sessions );
	}

	private static function findActiveSession(): string {
		$sessions = self::loadSessions();
		$latest = '';
		$latest_time = '';
		foreach ( $sessions as $id => $s ) {
			if ( ( $s['status'] ?? '' ) === 'active' ) {
				$t = $s['created_at'] ?? '';
				if ( $latest === '' || $t > $latest_time ) {
					$latest = $id;
					$latest_time = $t;
				}
			}
		}
		return $latest;
	}

	private static function uuid(): string {
		return \wp_generate_uuid4();
	}
}
