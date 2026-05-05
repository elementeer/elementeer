<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * Base abstract class for all module wizards.
 *
 * Provides a consistent structure for:
 * - Reading cached assessment data
 * - Analyzing module-specific gaps
 * - Generating prioritized recommendations
 * - Mapping gaps to MCP tools or plugin recommendations
 */
abstract class BaseWizard {

	/**
	 * The cached site assessment data.
	 *
	 * @var array<string,mixed>
	 */
	protected array $assessment;

	/**
	 * Constructor.
	 *
	 * @param array<string,mixed> $assessment The cached assess_site data.
	 */
	public function __construct( array $assessment ) {
		$this->assessment = $assessment;
	}

	/**
	 * Assess the current state of the module.
	 *
	 * Should read the cached assessment data and perform any additional
	 * module-specific checks not covered by the general assessment.
	 *
	 * @return array{
	 *     status: 'active'|'inactive'|'missing'|'needs_configuration',
	 *     details: array<string,mixed>
	 * }
	 */
	abstract public function assess_module_state(): array;

	/**
	 * Identify gaps in the module's configuration or content.
	 *
	 * @return array<array{
	 *     id: string,
	 *     severity: 'critical'|'warning'|'info',
	 *     description: string,
	 *     data?: array<string,mixed>
	 * }>
	 */
	abstract public function analyze_gaps(): array;

	/**
	 * Generate prioritized action list to address the gaps.
	 *
	 * @return array<array{
	 *     id: string,
	 *     priority: 'high'|'medium'|'low',
	 *     title: string,
	 *     description: string,
	 *     action: string,
	 *     gap_id?: string
	 * }>
	 */
	abstract public function generate_recommendations(): array;

	/**
	 * Map gaps to MCP tools or plugin recommendations.
	 *
	 * @return array{
	 *     suggested_tools: array<array{
	 *         tool: string,
	 *         purpose: string,
	 *         governance_level?: 'L0'|'L1'|'L2'|'L3'
	 *     }>,
	 *     suggested_plugins: array<array{
	 *         slug: string,
	 *         name: string,
	 *         reason: string,
	 *         required_capability?: string
	 *     }>
	 * }
	 */
	abstract public function suggest_tools_or_plugins(): array;

	/**
	 * Run the full wizard analysis and return the complete result.
	 *
	 * @return array{
	 *     status: 'active'|'inactive'|'missing'|'needs_configuration',
	 *     gaps: array<array{
	 *         id: string,
	 *         severity: 'critical'|'warning'|'info',
	 *         description: string,
	 *         data?: array<string,mixed>
	 *     }>,
	 *     recommendations: array<array{
	 *         id: string,
	 *         priority: 'high'|'medium'|'low',
	 *         title: string,
	 *         description: string,
	 *         action: string,
	 *         gap_id?: string
	 *     }>,
	 *     suggested_tools: array<array{
	 *         tool: string,
	 *         purpose: string,
	 *         governance_level?: 'L0'|'L1'|'L2'|'L3'
	 *     }>,
	 *     suggested_plugins: array<array{
	 *         slug: string,
	 *         name: string,
	 *         reason: string,
	 *         required_capability?: string
	 *     }>
	 * }
	 */
	public function run(): array {
		$status           = $this->assess_module_state();
		$gaps             = $this->analyze_gaps();
		$recommendations  = $this->generate_recommendations();
		$tools_and_plugins = $this->suggest_tools_or_plugins();

		return [
			'status'           => $status['status'],
			'gaps'             => $gaps,
			'recommendations'  => $recommendations,
			'suggested_tools'  => $tools_and_plugins['suggested_tools'],
			'suggested_plugins' => $tools_and_plugins['suggested_plugins'],
		];
	}

	/**
	 * Helper to check if a plugin is active.
	 *
	 * @param string $plugin_slug Plugin directory/file (e.g., 'advanced-custom-fields/acf.php').
	 * @return bool
	 */
	protected function is_plugin_active( string $plugin_slug ): bool {
		if ( ! \function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		return \is_plugin_active( $plugin_slug );
	}

	/**
	 * Helper to check if a plugin is installed (active or inactive).
	 *
	 * @param string $plugin_slug Plugin directory/file.
	 * @return bool
	 */
	protected function is_plugin_installed( string $plugin_slug ): bool {
		$all_plugins = \get_plugins();
		return \array_key_exists( $plugin_slug, $all_plugins );
	}

	/**
	 * Get a value from the cached assessment data.
	 *
	 * @param string $path Dot‑separated path (e.g., 'elementor.version', 'brand.logo_set').
	 * @param mixed  $default Default value if path not found.
	 * @return mixed
	 */
	protected function get_assessment_value( string $path, $default = null ) {
		$data = $this->assessment;
		$keys = explode( '.', $path );

		foreach ( $keys as $key ) {
			if ( ! \is_array( $data ) || ! \array_key_exists( $key, $data ) ) {
				return $default;
			}
			$data = $data[ $key ];
		}

		return $data;
	}
}