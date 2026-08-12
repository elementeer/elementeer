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

	/**
	 * Find the container element at the given dot-separated path and return a
	 * reference to its 'elements' array so the caller can mutate it directly.
	 *
	 * NOT declared by-reference: returning `null` from a `function &()` is
	 * illegal in PHP and triggers "Only variable references should be returned
	 * by reference", intermittently corrupting reference navigation. Instead
	 * the reference is passed inside the result array (PHP preserves array
	 * element references regardless of the function's return type).
	 *
	 * Returns ['elements' => &$elements, 'parent' => &$parent_element] on
	 * success, or null if the path does not resolve to a container element.
	 *
	 * @return ?array{ elements: array, parent: array }
	 */
	public function resolveContainer( string $path ): ?array {
		if ( $path === '' || $path === 'root' ) {
			return [ 'elements' => &$this->data, 'parent' => &$this->data ];
		}

		$segments = \explode( '.', $path );
		$cursor   = &$this->data;

		foreach ( $segments as $i => $seg ) {
			$index = (int) $seg;
			if ( ! isset( $cursor[ $index ] ) || ! \is_array( $cursor[ $index ] ) ) {
				return null;
			}
			if ( $i === \count( $segments ) - 1 ) {
				$parent = &$cursor[ $index ];
				if ( ! isset( $parent['elements'] ) || ! \is_array( $parent['elements'] ) ) {
					$parent['elements'] = [];
				}
				return [ 'elements' => &$parent['elements'], 'parent' => &$parent ];
			}
			if ( ! isset( $cursor[ $index ]['elements'] ) || ! \is_array( $cursor[ $index ]['elements'] ) ) {
				return null;
			}
			$cursor = &$cursor[ $index ]['elements'];
		}
		return null;
	}

	/**
	 * Remove an element by its id. Returns the removed element array, or null
	 * if not found.
	 */
	public function removeById( string $element_id ): ?array {
		return $this->removeByIdIn( $this->data, $element_id );
	}

	private function removeByIdIn( array &$elements, string $element_id ): ?array {
		foreach ( $elements as $i => $element ) {
			if ( ! \is_array( $element ) ) {
				continue;
			}
			if ( ( $element['id'] ?? '' ) === $element_id ) {
				$removed = $element;
				\array_splice( $elements, $i, 1 );
				return $removed;
			}
			if ( ! empty( $element['elements'] ) && \is_array( $element['elements'] ) ) {
				$found = $this->removeByIdIn( $element['elements'], $element_id );
				if ( $found !== null ) {
					return $found;
				}
			}
		}
		return null;
	}

	/**
	 * Insert a widget element into a container at a given position.
	 *
	 * @param string $container_path Dot-separated path to the container (e.g. "0.1")
	 * @param array  $widget         The full widget array (id, widgetType, elType, settings, ...)
	 * @param int    $position       Insertion index (0-based). -1 means append.
	 * @return int The actual index where the widget was inserted, or -1 on failure.
	 */
	public function insertAt( string $container_path, array $widget, int $position = -1 ): int {
		$resolved = $this->resolveContainer( $container_path );
		if ( $resolved === null ) {
			return -1;
		}
		$target = &$resolved['elements'];
		$count  = \count( $target );
		if ( $position < 0 || $position > $count ) {
			$position = $count;
		}
		\array_splice( $target, $position, 0, [ $widget ] );
		return $position;
	}

	/**
	 * Move an element from one container to another. Returns true on success.
	 *
	 * @param string $element_id          Element to move
	 * @param string $target_container_path Destination container path (dot notation)
	 * @param int    $position            Target index inside the destination (-1 = append)
	 * @return ?array The moved element with its new path info, or null on failure.
	 */
	public function moveToPath( string $element_id, string $target_container_path, int $position = -1 ): ?array {
		$source_path = $this->getPath( $element_id );
		if ( $source_path === null ) {
			return null;
		}

		// 1) Remove from source
		$removed = $this->removeById( $element_id );
		if ( $removed === null ) {
			return null;
		}

		// 2) Insert into target
		$actual_pos = $this->insertAt( $target_container_path, $removed, $position );
		if ( $actual_pos < 0 ) {
			// Restore: re-insert at source (best effort)
			$source_parent_path = \dirname( (string) $source_path );
			$source_idx         = (int) \basename( (string) $source_path );
			$this->insertAt( $source_parent_path, $removed, $source_idx );
			return null;
		}

		$new_path = $target_container_path === '' || $target_container_path === 'root'
			? (string) $actual_pos
			: $target_container_path . '.' . $actual_pos;

		return [
			'element_id'     => $element_id,
			'source_path'    => $source_path,
			'target_path'    => $new_path,
			'widget'         => $removed,
		];
	}

	/**
	 * Deep-clone a widget array for cross-page insertion.
	 *
	 * This is a structural clone: __globals__, __dynamic__, and
	 * typography-typography references are preserved verbatim. If a
	 * referenced global color or typography does not exist on the
	 * target page, the reference is kept but may render differently.
	 * The caller receives a warnings list for missing references.
	 *
	 * @param array $source_widget The full widget array from the source document
	 * @return array The clone, ready for insertion into this document
	 */
	public function cloneWidgetForInsert( array $source_widget ): array {
		$clone = \json_decode( \wp_json_encode( $source_widget ), true );

		$clone['id'] = \bin2hex( \random_bytes( 4 ) );

		return $clone;
	}

	/**
	 * Lists global elements referenced by a widget's __globals__ and
	 * typography settings. Used for cross-page validation.
	 *
	 * @return string[] Array of referenced global IDs
	 */
	public static function collectGlobalReferences( array $widget ): array {
		$refs = [];
		$globals = $widget['settings']['__globals__'] ?? [];
		if ( \is_array( $globals ) ) {
			foreach ( $globals as $_ => $global_ref ) {
				if ( \is_string( $global_ref ) ) {
					$refs[] = $global_ref;
				}
			}
		}

		// Typography references: settings key like 'typography_typography' = 'custom'
		// and individual font settings with global references
		$typography_fields = [ 'title_typography_typography', 'content_typography_typography' ];
		foreach ( $typography_fields as $field ) {
			if ( ( $widget['settings'][ $field ] ?? '' ) === 'custom' ) {
				$refs[] = $widget['settings'][ $field ] ?? '';
			}
		}

		return $refs;
	}
}
