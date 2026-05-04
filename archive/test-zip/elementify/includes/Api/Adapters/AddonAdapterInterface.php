<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

/**
 * Contract for Elementor add‑on detection and inventory.
 *
 * All add‑on adapters must implement this interface.
 */
interface AddonAdapterInterface {

	/**
	 * Detect whether the add‑on plugin is active and return its basic metadata.
	 *
	 * @return array{
	 *     active: bool,
	 *     version: string|null,
	 *     tier: string|null,
	 *     plugin_name: string,
	 *     plugin_slug: string
	 * }|null Null if plugin not installed.
	 */
	public function detect(): ?array;

	/**
	 * Retrieve extended information about the add‑on (widgets, capabilities, etc.).
	 *
	 * @return array{
	 *     active: bool,
	 *     version: string|null,
	 *     tier: string|null,
	 *     plugin_name: string,
	 *     plugin_slug: string,
	 *     widgets: array<int, array{id: string, title: string, active: bool}>,
	 *     post_types: array<int, array{slug: string, label: string}>,
	 *     capabilities: array<int, string>,
	 *     elementor_widget_types: array<int, string>
	 * }
	 */
	public function get_info(): array;

	/**
	 * List all widgets this add‑on registers (including activation status).
	 *
	 * @return array<int, array{id: string, title: string, active: bool}>
	 */
	public function get_widgets(): array;

	/**
	 * List any custom post types introduced by this add‑on (e.g., JetEngine CPTs).
	 *
	 * @return array<int, array{slug: string, label: string}>
	 */
	public function get_post_types(): array;

	/**
	 * Return any special capabilities this add‑on provides (e.g., 'jet-engine-cpt').
	 *
	 * @return array<int, string>
	 */
	public function get_capabilities(): array;

	/**
	 * Return widget type prefixes this add‑on uses (e.g., 'eael-', 'jet-').
	 *
	 * @return array<int, string>
	 */
	public function get_elementor_widget_types(): array;
}