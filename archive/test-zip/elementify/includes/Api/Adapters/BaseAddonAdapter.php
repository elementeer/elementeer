<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

/**
 * Skeleton implementation with common detection helpers.
 *
 * Extend this class for each concrete add‑on adapter.
 */
abstract class BaseAddonAdapter implements AddonAdapterInterface {

	/** @var string Plugin basename (e.g., 'essential-addons-for-elementor-lite/essential_adons_elementor.php') */
	protected string $plugin_basename;

	/** @var string Human‑readable plugin name */
	protected string $plugin_name;

	/** @var string Plugin slug (e.g., 'essential-addons-for-elementor-lite') */
	protected string $plugin_slug;

	/** @var string Widget prefix (e.g., 'eael-') */
	protected string $widget_prefix;

	/** @var string|null Detected version */
	protected ?string $version = null;

	/** @var bool Whether the plugin is active */
	protected bool $active = false;

	/**
	 * @param string $plugin_basename WordPress plugin basename
	 * @param string $plugin_name Human‑readable name
	 * @param string $plugin_slug Plugin slug
	 * @param string $widget_prefix Widget ID prefix used in Elementor
	 */
	public function __construct(
		string $plugin_basename,
		string $plugin_name,
		string $plugin_slug,
		string $widget_prefix
	) {
		$this->plugin_basename = $plugin_basename;
		$this->plugin_name     = $plugin_name;
		$this->plugin_slug     = $plugin_slug;
		$this->widget_prefix   = $widget_prefix;
	}

	/**
	 * Detect plugin presence and version.
	 *
	 * @inheritDoc
	 */
	public function detect(): ?array {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$this->active = is_plugin_active( $this->plugin_basename );

		if ( ! $this->active ) {
			return null;
		}

		// Try to read version from plugin header
		$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $this->plugin_basename, false );
		$this->version = $plugin_data['Version'] ?? null;

		return [
			'active'       => true,
			'version'      => $this->version,
			'tier'         => $this->detect_tier(),
			'plugin_name'  => $this->plugin_name,
			'plugin_slug'  => $this->plugin_slug,
		];
	}

	/**
	 * Default implementation of get_info() that calls the other getters.
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
	 * Default implementation returns empty arrays.
	 *
	 * @inheritDoc
	 */
	public function get_widgets(): array {
		return [];
	}

	/**
	 * @inheritDoc
	 */
	public function get_post_types(): array {
		return [];
	}

	/**
	 * @inheritDoc
	 */
	public function get_capabilities(): array {
		return [];
	}

	/**
	 * Default implementation returns the configured widget prefix.
	 *
	 * @inheritDoc
	 */
	public function get_elementor_widget_types(): array {
		return [ $this->widget_prefix ];
	}

	/**
	 * Attempt to detect Free/Pro tier based on plugin constants or class existence.
	 *
	 * Override in concrete adapters for more accurate detection.
	 *
	 * @return string|null 'free', 'pro', or null if unknown
	 */
	protected function detect_tier(): ?string {
		// Default implementation – subclasses should override
		return null;
	}

	/**
	 * Helper to read Elementor widget activation status from options.
	 *
	 * Many add‑ons store widget activation in an option like 'eael_save_settings'.
	 *
	 * @param string $option_name WordPress option name
	 * @param string $widget_key Array key inside the option that holds widget status
	 * @return array<int, array{id: string, title: string, active: bool}>
	 */
	protected function get_widget_status_from_option( string $option_name, string $widget_key = 'widget_list' ): array {
		$option = \get_option( $option_name, [] );
		$widgets = $option[ $widget_key ] ?? [];

		$result = [];
		foreach ( $widgets as $widget_id => $enabled ) {
			// Expects $widget_id like 'eael-advanced-accordion'
			$result[] = [
				'id'     => (string) $widget_id,
				'title'  => $this->humanize_widget_id( $widget_id ),
				'active' => (bool) $enabled,
			];
		}
		return $result;
	}

	/**
	 * Turn a widget ID into a readable title.
	 *
	 * Example: 'eael-advanced-accordion' → 'Advanced Accordion'
	 */
	protected function humanize_widget_id( string $widget_id ): string {
		// Remove prefix
		$without_prefix = preg_replace( '/^' . preg_quote( $this->widget_prefix, '/' ) . '/', '', $widget_id );
		// Replace hyphens with spaces and title case
		return ucwords( str_replace( '-', ' ', $without_prefix ) );
	}
}