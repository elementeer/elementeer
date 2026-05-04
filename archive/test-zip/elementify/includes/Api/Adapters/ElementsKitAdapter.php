<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

/**
 * Adapter for ElementsKit for Elementor (Free & Pro).
 */
final class ElementsKitAdapter extends BaseAddonAdapter {

	/**
	 * Plugin basename for the free version.
	 */
	private const FREE_BASENAME = 'elementskit-lite/elementskit-lite.php';

	/**
	 * Plugin basename for the pro version.
	 */
	private const PRO_BASENAME = 'elementskit/elementskit.php';

	/**
	 * Option name where widget activation status is stored.
	 */
	private const OPTION_NAME = 'elementskit_options';

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
		$name = 'ElementsKit for Elementor';
		$slug = $this->basename_to_slug( $basename );
		$prefix = 'ekit-';

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
		if ( defined( 'ELEMENTOR_ELEMENTSKIT_PRO_VERSION' ) ) {
			return 'pro';
		}
		if ( defined( 'ELEMENTOR_ELEMENTSKIT_VERSION' ) ) {
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
	 * Retrieve the list of ElementsKit widgets with activation status.
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
			$caps[] = 'elementskit-widgets';
			$caps[] = 'ekit-' . $this->detect_tier();
			if ( $this->has_mega_menu() ) {
				$caps[] = 'elementskit-mega-menu';
			}
		}
		return $caps;
	}

	/**
	 * Detect if ElementsKit Mega Menu feature is active.
	 *
	 * @return bool
	 */
	private function has_mega_menu(): bool {
		if ( ! $this->active ) {
			return false;
		}
		// Check if the mega menu post type exists
		return post_type_exists( 'elementskit_mega_menu' );
	}

	/**
	 * Return post types registered by ElementsKit.
	 *
	 * @inheritDoc
	 */
	public function get_post_types(): array {
		if ( ! $this->active ) {
			return [];
		}
		$post_types = [];
		if ( $this->has_mega_menu() ) {
			$post_types[] = [
				'slug' => 'elementskit_mega_menu',
				'label' => 'ElementsKit Mega Menu',
				'public' => false,
			];
		}
		return $post_types;
	}
}