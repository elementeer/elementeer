<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

use Exception;

/**
 * Discovers and manages all installed add‑on adapters.
 *
 * Auto‑discovers classes in the Adapters directory that implement
 * AddonAdapterInterface and returns their aggregated data.
 */
final class AddonRegistry {

	/** @var self|null Singleton instance */
	private static ?self $instance = null;

	/** @var array<string, AddonAdapterInterface> Map plugin_slug → adapter instance */
	private array $adapters = [];

	/** @var array<string, array> Cache of detection results */
	private array $detection_cache = [];

	/**
	 * Private constructor – use get_instance().
	 */
	private function __construct() {
		$this->discover_adapters();
	}

	/**
	 * Get the singleton registry instance.
	 */
	public static function get_instance(): self {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Scan the Adapters directory for concrete adapter classes.
	 */
	private function discover_adapters(): void {
		// Allow external registration via filter
		$external = apply_filters( 'elementify_mcp_addon_adapters', [] );
		foreach ( $external as $adapter ) {
			if ( $adapter instanceof AddonAdapterInterface ) {
				$this->register_adapter( $adapter );
			}
		}

		// Auto‑discover files in the Adapters directory
		$adapter_dir = __DIR__;
		$pattern     = $adapter_dir . '/*Adapter.php';

		foreach ( glob( $pattern ) as $file ) {
			$class_name = $this->filename_to_class( $file );
			if ( $class_name === null ) {
				continue;
			}

			try {
				$adapter = new $class_name();
				if ( $adapter instanceof AddonAdapterInterface ) {
					$this->register_adapter( $adapter );
				}
			} catch ( Exception $e ) {
				// Silently skip adapters that cannot be instantiated
				continue;
			}
		}
	}

	/**
	 * Register a single adapter instance.
	 */
	private function register_adapter( AddonAdapterInterface $adapter ): void {
		$info = $adapter->detect();
		if ( $info === null ) {
			// Plugin not active – skip registration
			return;
		}

		$slug = $info['plugin_slug'];
		$this->adapters[ $slug ] = $adapter;
		$this->detection_cache[ $slug ] = $info;
	}

	/**
	 * Get all active add‑ons with their detection metadata.
	 *
	 * @return array<int, array{active: bool, version: string|null, tier: string|null, plugin_name: string, plugin_slug: string}>
	 */
	public function get_active_addons(): array {
		return array_values( $this->detection_cache );
	}

	/**
	 * Get detailed information for all active add‑ons.
	 *
	 * @return array<int, array>
	 */
	public function get_all_info(): array {
		$results = [];
		foreach ( $this->adapters as $adapter ) {
			$results[] = $adapter->get_info();
		}
		return $results;
	}

	/**
	 * Get a specific adapter by plugin slug.
	 */
	public function get_adapter( string $plugin_slug ): ?AddonAdapterInterface {
		return $this->adapters[ $plugin_slug ] ?? null;
	}

	/**
	 * Convert a filename to a fully‑qualified class name.
	 *
	 * Example: '/path/to/EssentialAddonsAdapter.php' → 'Elementify\MCP\Api\Adapters\EssentialAddonsAdapter'
	 */
	private function filename_to_class( string $file ): ?string {
		$basename = basename( $file, '.php' );
		if ( ! preg_match( '/^[a-zA-Z_][a-zA-Z0-9_]*$/', $basename ) ) {
			return null;
		}

		return __NAMESPACE__ . '\\' . $basename;
	}
}