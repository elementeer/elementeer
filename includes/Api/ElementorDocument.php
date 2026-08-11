<?php
declare(strict_types=1);

namespace Elementeer\MCP\Api;

/**
 * Reads, traverses, and partially mutates Elementor _elementor_data.
 *
 * This is the single source of truth for traversing the Elementor JSON tree
 * in the Elementeer plugin. Both read-only consumers (Ally accessibility scans)
 * and write paths (PATCH endpoints) use this class.
 *
 * There must be exactly one traversal path in the repo — this class.
 */
class ElementorDocument {

	private int $postId;
	private array $data;

	private function __construct( int $post_id, array $data ) {
		$this->postId = $post_id;
		$this->data   = $data;
	}

	/**
	 * Load and validate _elementor_data from a post.
	 */
	public static function load( int $post_id ): self {
		$raw = \get_post_meta( $post_id, '_elementor_data', true );
		if ( empty( $raw ) ) {
			return new self( $post_id, [] );
		}
		$data = \json_decode( $raw, true );
		if ( ! \is_array( $data ) ) {
			return new self( $post_id, [] );
		}
		return new self( $post_id, $data );
	}

	/**
	 * Create a document from an already-decoded array. Used internally for
	 * deep-cloning (dry run) and by tests.
	 */
	public static function fromArray( int $post_id, array $data ): self {
		return new self( $post_id, $data );
	}

	// ------------------------------------------------------------------ //
	// Read operations
	// ------------------------------------------------------------------ //

	/**
	 * Find an element by its Elementor id in the tree.
	 * Returns a copy of the element array, or null if not found.
	 */
	public function findById( string $element_id ): ?array {
		return $this->findByIdIn( $this->data, $element_id );
	}

	private function findByIdIn( array $elements, string $element_id ): ?array {
		foreach ( $elements as $element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}

			if ( ( $element['id'] ?? '' ) === $element_id ) {
				return $element;
			}

			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				$found = $this->findByIdIn( $element['elements'], $element_id );
				if ( $found !== null ) {
					return $found;
				}
			}
		}
		return null;
	}

	/**
	 * Get the dot-separated path to an element by its id.
	 * Returns null if not found.
	 */
	public function getPath( string $element_id ): ?string {
		return $this->getPathIn( $this->data, $element_id, '' );
	}

	private function getPathIn( array $elements, string $element_id, string $current ): ?string {
		foreach ( $elements as $index => $element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}

			$path = $current === '' ? (string) $index : $current . '.' . $index;

			if ( ( $element['id'] ?? '' ) === $element_id ) {
				return $path;
			}

			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				$found = $this->getPathIn( $element['elements'], $element_id, $path );
				if ( $found !== null ) {
					return $found;
				}
			}
		}
		return null;
	}

	/**
	 * Recursively traverse every element in the tree with a callback.
	 * Used by Ally for accessibility scan read operations.
	 *
	 * The callback receives each element array. Do NOT modify the element
	 * inside this callback — use updateById for writes.
	 */
	public function traverse( callable $callback ): void {
		$this->traverseElements( $this->data, $callback );
	}

	private function traverseElements( array $elements, callable $callback ): void {
		foreach ( $elements as $element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}

			$callback( $element );

			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				$this->traverseElements( $element['elements'], $callback );
			}
		}
	}

	// ------------------------------------------------------------------ //
	// Write operations
	// ------------------------------------------------------------------ //

	/**
	 * Update fields on an element by its id. Returns true if found and updated.
	 *
	 * The $patch is merged directly into the element array. To update settings
	 * on a widget, pass [ 'settings' => [ 'title' => 'New Title' ] ].
	 * Settings keys in the patch are merged into existing settings,
	 * not replaced — only the specified keys change.
	 *
	 * @param string $element_id Elementor element id (e.g. "a85a3a7")
	 * @param array  $patch      Key-value pairs to set on the element
	 * @param string|null $path_out Filled with the dot-separated path where the element was found
	 */
	public function updateById( string $element_id, array $patch, ?string &$path_out = null ): bool {
		return $this->updateByIdIn( $this->data, $element_id, $patch, '', $path_out );
	}

	private function updateByIdIn( array &$elements, string $element_id, array $patch, string $currentPath, ?string &$path_out ): bool {
		foreach ( $elements as $index => &$element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}

			$path = $currentPath === '' ? (string) $index : $currentPath . '.' . $index;

			if ( ( $element['id'] ?? '' ) === $element_id ) {
				foreach ( $patch as $key => $value ) {
					if ( $key === 'settings' && \is_array( $value ) && isset( $element['settings'] ) && \is_array( $element['settings'] ) ) {
						$element['settings'] = \array_merge( $element['settings'], $value );
					} else {
						$element[ $key ] = $value;
					}
				}
				$path_out = $path;
				return true;
			}

			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				if ( $this->updateByIdIn( $element['elements'], $element_id, $patch, $path, $path_out ) ) {
					return true;
				}
			}
		}
		unset( $element );
		return false;
	}

	/**
	 * Write the current data back to _elementor_data post meta.
	 * Clears Elementor CSS cache so changes render immediately.
	 */
	public function save(): void {
		$encoded = \wp_json_encode( $this->data );
		\update_post_meta( $this->postId, '_elementor_data', \wp_slash( $encoded ) );

		if ( \class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}

		\wp_update_post( [ 'ID' => $this->postId ] );
	}

	// ------------------------------------------------------------------ //
	// Accessors
	// ------------------------------------------------------------------ //

	public function toArray(): array {
		return $this->data;
	}

	public function getPostId(): int {
		return $this->postId;
	}

	public function isEmpty(): bool {
		return empty( $this->data );
	}

	/**
	 * Canonical content hash for concurrency control.
	 * md5 of the serialised, un-prettified JSON.
	 */
	public function contentHash(): string {
		return \md5( \wp_json_encode( $this->data ) );
	}

	/**
	 * Preview a mutation without writing. Returns a structured response
	 * with before/after values, affected paths, and the expected new contentHash.
	 *
	 * @param array<string, array<string, mixed>> $patches  Map of element_id => patch array
	 * @return array{ dry_run: true, patches: array, new_content_hash: string, affected_paths: array }
	 */
	public function dryRun( array $patches ): array {
		$report = [
			'dry_run'          => true,
			'patches'          => [],
			'new_content_hash' => '',
			'affected_paths'   => [],
		];

		$clone = self::fromArray( $this->postId, $this->data );

		foreach ( $patches as $element_id => $patch ) {
			$before   = $clone->findById( $element_id );
			$path_out = '';
			$found    = $clone->updateById( $element_id, $patch, $path_out );

			$entry = [
				'element_id' => $element_id,
				'found'      => $found,
				'path'       => $path_out,
				'before'     => $before,
				'after'      => $found ? $clone->findById( $element_id ) : null,
			];

			$report['patches'][] = $entry;

			if ( $found ) {
				$report['affected_paths'][] = $path_out;
			}
		}

		$report['new_content_hash'] = $clone->contentHash();

		return $report;
	}

	/**
	 * Load a document and verify the provided content hash matches.
	 *
	 * Returns the loaded ElementorDocument on success, or a WP_Error
	 * with code 'target_changed' and HTTP 409 if the hash does not match.
	 *
	 * @param int    $post_id       Post ID to load
	 * @param string $expected_hash Expected content hash from the client
	 * @return ElementorDocument|\WP_Error
	 */
	public static function loadWithHashGuard( int $post_id, string $expected_hash ): ElementorDocument|\WP_Error {
		$doc = self::load( $post_id );
		$actual = $doc->contentHash();

		if ( ! \hash_equals( $actual, $expected_hash ) ) {
			return new \WP_Error(
				'target_changed',
				\__( 'The page was modified by another request. Reload and try again.', 'elementeer' ),
				[
					'status'          => 409,
					'expected_hash'   => $expected_hash,
					'current_hash'    => $actual,
				]
			);
		}

		return $doc;
	}
}
