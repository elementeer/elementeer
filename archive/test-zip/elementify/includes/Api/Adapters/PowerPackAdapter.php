<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

/**
 * Adapter for PowerPack for Elementor (Free & Pro).
 */
final class PowerPackAdapter extends BaseAddonAdapter {

	/**
	 * Plugin basename for the free version.
	 */
	private const FREE_BASENAME = 'powerpack-elements/plugin.php';

	/**
	 * Plugin basename for the pro version.
	 */
	private const PRO_BASENAME = 'powerpack-pro/plugin.php';

	/**
	 * Option name where widget activation status is stored.
	 */
	private const OPTION_NAME = 'pp_elementor_settings';

	/**
	 * Key inside the option array that holds widget status.
	 */
	private const WIDGET_KEY = 'widget_list';

	/**
	 * Constructor.
	 */
	public function __construct() {
		// Determine which version is active
		$basename = $this->detect_active_basename();
		$name = 'PowerPack for Elementor';
		$slug = $this->basename_to_slug( $basename );
		$prefix = 'pp-';

		parent::__construct( $basename, $name, $slug, $prefix );
	}

	/**
	 * Detect which version (Free or Pro) is active.
	 *
	 * @return string Active plugin basename
	 * @throws \RuntimeException If neither version is active.
	 */
	private function detect_active_basename(): string {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( is_plugin_active( self::FREE_BASENAME ) ) {
			return self::FREE_BASENAME;
		}

		if ( is_plugin_active( self::PRO_BASENAME ) ) {
			return self::PRO_BASENAME;
		}

		// Neither active – still return free basename for detection purposes
		// The parent detect() will return null anyway.
		return self::FREE_BASENAME;
	}

	/**
	 * Convert a plugin basename to a slug.
	 */
	private function basename_to_slug( string $basename ): string {
		return dirname( $basename );
	}

	/**
	 * Detect the tier (Free/Pro) based on active plugin constants.
	 *
	 * @inheritDoc
	 */
	protected function detect_tier(): ?string {
		if ( defined( 'POWERPACK_ELEMENTS_PRO_VERSION' ) ) {
			return 'pro';
		}
		if ( defined( 'POWERPACK_ELEMENTS_VERSION' ) ) {
			return 'free';
		}

		// Fallback: check if the pro basename is active
		if ( $this->plugin_basename === self::PRO_BASENAME ) {
			return 'pro';
		}
		if ( $this->plugin_basename === self::FREE_BASENAME ) {
			return 'free';
		}

		return null;
	}

	/**
	 * Retrieve the list of PowerPack widgets with activation status.
	 *
	 * @inheritDoc
	 */
	public function get_widgets(): array {
		if ( ! $this->active ) {
			return [];
		}
		return $this->get_widget_status_from_option( self::OPTION_NAME, self::WIDGET_KEY );
	}

	/**
	 * Return any special capabilities this add‑on provides.
	 *
	 * @inheritDoc
	 */
	public function get_capabilities(): array {
		$caps = [];
		if ( $this->active ) {
			$caps[] = 'powerpack-widgets';
			$caps[] = 'pp-' . $this->detect_tier();
		}
		return $caps;
	}
}