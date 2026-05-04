<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * ACF wizard for custom fields recommendation.
 */
final class AcfWizard extends BaseWizard {

	public function assess_module_state(): array {
		// Check if ACF plugin is active
		$acf_active = $this->is_acf_active();
		$status = $acf_active ? 'active' : 'missing';
		$details = [
			'acf_active' => $acf_active,
			'acf_version' => $acf_active ? $this->get_acf_version() : null,
			'field_groups_count' => $acf_active ? $this->count_field_groups() : 0,
			'posts_without_fields' => $acf_active ? $this->estimate_posts_without_fields() : 0,
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$acf_active = $this->is_acf_active();

		if (!$acf_active) {
			$gaps[] = [
				'id' => 'acf_missing',
				'severity' => 'warning',
				'description' => 'Advanced Custom Fields plugin is not active. Custom fields functionality is limited.',
				'data' => [],
			];
			return $gaps;
		}

		$field_groups_count = $this->count_field_groups();
		if ($field_groups_count === 0) {
			$gaps[] = [
				'id' => 'no_field_groups',
				'severity' => 'warning',
				'description' => 'No ACF field groups defined.',
				'data' => [],
			];
		}

		$posts_without = $this->estimate_posts_without_fields();
		if ($posts_without > 0) {
			$gaps[] = [
				'id' => 'posts_without_fields',
				'severity' => 'info',
				'description' => sprintf('%d posts/pages may lack custom fields.', $posts_without),
				'data' => ['count' => $posts_without],
			];
		}

		// Check for ACF Pro features if needed
		$is_pro = $this->is_acf_pro();
		if (!$is_pro) {
			$gaps[] = [
				'id' => 'acf_free',
				'severity' => 'info',
				'description' => 'Using ACF free version. Consider upgrading to ACF Pro for repeater/flexible content fields.',
				'data' => [],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$acf_active = $this->is_acf_active();
		$recommendations = [];

		if (!$acf_active) {
			$recommendations[] = [
				'id' => 'install_acf',
				'priority' => 'high',
				'title' => 'Install Advanced Custom Fields',
				'description' => 'Install and activate the Advanced Custom Fields plugin to enable custom fields management.',
				'action' => 'Install ACF plugin from WordPress.org or purchase ACF Pro.',
				'gap_id' => 'acf_missing',
			];
			return $recommendations;
		}

		$field_groups_count = $this->count_field_groups();
		if ($field_groups_count === 0) {
			$recommendations[] = [
				'id' => 'create_field_groups',
				'priority' => 'medium',
				'title' => 'Create ACF Field Groups',
				'description' => 'Define custom field groups for your post types to enrich content structure.',
				'action' => 'Use ACF interface to create field groups.',
				'gap_id' => 'no_field_groups',
			];
		}

		$posts_without = $this->estimate_posts_without_fields();
		if ($posts_without > 0) {
			$recommendations[] = [
				'id' => 'audit_posts_for_fields',
				'priority' => 'low',
				'title' => 'Audit Posts Without Custom Fields',
				'description' => 'Review posts that may benefit from custom fields.',
				'action' => 'Identify posts without field values and assign appropriate field groups.',
				'gap_id' => 'posts_without_fields',
			];
		}

		if (!$this->is_acf_pro()) {
			$recommendations[] = [
				'id' => 'upgrade_to_acf_pro',
				'priority' => 'low',
				'title' => 'Upgrade to ACF Pro',
				'description' => 'ACF Pro adds repeater, flexible content, and clone fields for advanced layouts.',
				'action' => 'Purchase ACF Pro license.',
				'gap_id' => 'acf_free',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];

		$acf_active = $this->is_acf_active();
		if ($acf_active) {
			$suggested_tools[] = [
				'tool' => 'list_templates',
				'purpose' => 'Inspect existing templates for integration with ACF fields',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'update_template_data',
				'purpose' => 'Add ACF dynamic tags to Elementor templates',
				'governance_level' => 'L2',
			];
		} else {
			$suggested_plugins[] = [
				'slug' => 'advanced-custom-fields',
				'name' => 'Advanced Custom Fields',
				'reason' => 'Enables custom fields for posts, pages, and custom post types.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'advanced-custom-fields-pro',
				'name' => 'Advanced Custom Fields Pro',
				'reason' => 'Adds repeater, flexible content, and clone fields.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function is_acf_active(): bool {
		return \function_exists('acf') || \class_exists('ACF') || \is_plugin_active('advanced-custom-fields/acf.php');
	}

	private function get_acf_version(): ?string {
		if (\defined('ACF_VERSION')) {
			return \ACF_VERSION;
		}
		return null;
	}

	private function is_acf_pro(): bool {
		return \defined('ACF_PRO') && \ACF_PRO;
	}

	private function count_field_groups(): int {
		if (!\function_exists('acf_get_field_groups')) {
			return 0;
		}
		$groups = \acf_get_field_groups();
		return \is_array($groups) ? \count($groups) : 0;
	}

	private function estimate_posts_without_fields(): int {
		// Simplified estimation: count posts that have no ACF fields attached.
		// For now, return 0 as placeholder.
		return 0;
	}
}