<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

/**
 * Adapter for the Crocoblock suite (Jet plugins).
 */
final class CrocoblockAdapter extends BaseAddonAdapter {

	/**
	 * Map plugin slug → basename for all Jet plugins.
	 */
	private const JET_PLUGINS = [
		'jet-elements'        => 'jet-elements/jet-elements.php',
		'jet-engine'          => 'jet-engine/jet-engine.php',
		'jet-smart-filters'   => 'jet-smart-filters/jet-smart-filters.php',
		'jet-menu'            => 'jet-menu/jet-menu.php',
		'jet-tabs'            => 'jet-tabs/jet-tabs.php',
		'jet-blocks'          => 'jet-blocks/jet-blocks.php',
		'jet-woobuilder'      => 'jet-woobuilder/jet-woobuilder.php',
		'jet-booking'         => 'jet-booking/jet-booking.php',
		'jet-form-builder'    => 'jet-form-builder/jet-form-builder.php',
		'jet-popup'           => 'jet-popup/jet-popup.php',
	];

	/**
	 * Option name where JetEngine stores CPT definitions.
	 */
	private const JET_ENGINE_CPT_OPTION = 'jet_engine_cpt';

	/**
	 * Active Jet plugins (slug → version).
	 *
	 * @var array<string, string|null>
	 */
	private array $active_plugins = [];

	/**
	 * Constructor.
	 */
	public function __construct() {
		// Use jet-engine as the representative basename for detection.
		$basename = self::JET_PLUGINS['jet-engine'] ?? 'jet-engine/jet-engine.php';
		$name = 'Crocoblock Suite';
		$slug = 'crocoblock-suite';
		$prefix = 'jet-';

		parent::__construct( $basename, $name, $slug, $prefix );
	}

	/**
	 * Detect which Jet plugins are active and collect their versions.
	 *
	 * @inheritDoc
	 */
	public function detect(): ?array {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$this->active_plugins = [];
		foreach ( self::JET_PLUGINS as $slug => $basename ) {
			if ( is_plugin_active( $basename ) ) {
				$this->active_plugins[ $slug ] = $this->get_plugin_version( $basename );
			}
		}

		if ( empty( $this->active_plugins ) ) {
			$this->active = false;
			return null;
		}

		$this->active = true;
		// Determine suite version as the highest version among active plugins.
		$versions = array_filter( $this->active_plugins );
		$version = empty( $versions ) ? null : max( $versions );

		return [
			'active'       => true,
			'version'      => $version,
			'tier'         => $this->detect_tier(),
			'plugin_name'  => $this->plugin_name,
			'plugin_slug'  => $this->plugin_slug,
		];
	}

	/**
	 * Retrieve extended information about the Crocoblock suite.
	 *
	 * @inheritDoc
	 */
	public function get_info(): array {
		$detection = $this->detect();
		if ( $detection === null ) {
			return [
				'active'                  => false,
				'version'                 => null,
				'tier'                    => null,
				'plugin_name'             => $this->plugin_name,
				'plugin_slug'             => $this->plugin_slug,
				'widgets'                 => [],
				'post_types'              => [],
				'capabilities'            => [],
				'elementor_widget_types'  => [],
			];
		}

		return [
			'active'                  => true,
			'version'                 => $detection['version'],
			'tier'                    => $detection['tier'],
			'plugin_name'             => $detection['plugin_name'],
			'plugin_slug'             => $detection['plugin_slug'],
			'widgets'                 => $this->get_widgets(),
			'post_types'              => $this->get_post_types(),
			'capabilities'            => $this->get_capabilities(),
			'elementor_widget_types'  => $this->get_elementor_widget_types(),
		];
	}

	/**
	 * Get version of a plugin by its basename.
	 */
	private function get_plugin_version( string $basename ): ?string {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_file = WP_PLUGIN_DIR . '/' . $basename;
		if ( ! file_exists( $plugin_file ) ) {
			return null;
		}

		$plugin_data = get_plugin_data( $plugin_file, false, false );
		return $plugin_data['Version'] ?? null;
	}

	/**
	 * Detect tier (Free/Pro) based on active plugin constants.
	 *
	 * @inheritDoc
	 */
	protected function detect_tier(): ?string {
		// If any pro plugin is active, consider suite as pro.
		// For simplicity, assume all Jet plugins are pro if any pro version exists.
		// We can check for constant 'JET_ELEMENTS_VERSION' (free) vs 'JET_ELEMENTS_PRO_VERSION' (pro).
		// This is a placeholder – should be refined.
		foreach ( $this->active_plugins as $slug => $version ) {
			if ( strpos( $slug, '-pro' ) !== false ) {
				return 'pro';
			}
		}
		return 'free';
	}

	/**
	 * Retrieve list of widgets from all active Jet plugins.
	 *
	 * @inheritDoc
	 */
	public function get_widgets(): array {
		// This is a placeholder – in reality we would need to scan each plugin's widget registry.
		// For now, return empty.
		return [];
	}

	/**
	 * List custom post types created by JetEngine.
	 *
	 * @inheritDoc
	 */
	public function get_post_types(): array {
		if ( ! isset( $this->active_plugins['jet-engine'] ) ) {
			return [];
		}

		$cpt_option = \get_option( self::JET_ENGINE_CPT_OPTION, [] );
		if ( ! is_array( $cpt_option ) ) {
			return [];
		}

		$post_types = [];
		foreach ( $cpt_option as $cpt ) {
			if ( ! isset( $cpt['slug'] ) || ! isset( $cpt['labels']['name'] ) ) {
				continue;
			}
			$post_types[] = [
				'slug'  => (string) $cpt['slug'],
				'label' => (string) $cpt['labels']['name'],
			];
		}
		return $post_types;
	}

	/**
	 * Return suite‑level capabilities.
	 *
	 * @inheritDoc
	 */
	public function get_capabilities(): array {
		$caps = [];
		if ( $this->active ) {
			$caps[] = 'crocoblock-suite';
			foreach ( array_keys( $this->active_plugins ) as $plugin ) {
				$caps[] = 'jet-' . $plugin;
			}
		}
		return $caps;
	}

	/**
	 * Return widget type prefixes used by each active Jet plugin.
	 *
	 * @inheritDoc
	 */
	public function get_elementor_widget_types(): array {
		$prefixes = [];
		foreach ( array_keys( $this->active_plugins ) as $plugin ) {
			// Map plugin slug to known widget prefix.
			$prefix = $this->plugin_prefix_map( $plugin );
			if ( $prefix !== null ) {
				$prefixes[] = $prefix;
			}
		}
		return array_unique( $prefixes );
	}

	/**
	 * Map plugin slug to its typical Elementor widget prefix.
	 */
	private function plugin_prefix_map( string $plugin ): ?string {
		$map = [
			'jet-elements'        => 'jet-',
			'jet-engine'          => 'jetengine-',
			'jet-smart-filters'   => 'jet-smart-filters-',
			'jet-menu'            => 'jet-menu-',
			'jet-tabs'            => 'jet-tabs-',
			'jet-blocks'          => 'jet-blocks-',
			'jet-woobuilder'      => 'jet-woobuilder-',
			'jet-booking'         => 'jet-booking-',
			'jet-form-builder'    => 'jet-form-builder-',
			'jet-popup'           => 'jet-popup-',
		];
		return $map[ $plugin ] ?? null;
	}
}