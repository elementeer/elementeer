<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Multilingual wizard for translation plugin recommendation.
 */
final class MultilingualWizard extends BaseWizard {

	public function assess_module_state(): array {
		$multilingual_plugins = $this->get_multilingual_plugins();
		$has_multilingual = !empty($multilingual_plugins);
		$status = $has_multilingual ? 'active' : 'missing';
		$details = [
			'multilingual_plugins' => $multilingual_plugins,
			'translation_coverage' => $this->estimate_translation_coverage(),
			'languages_configured' => $this->get_configured_languages(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$multilingual_plugins = $this->get_multilingual_plugins();

		if (empty($multilingual_plugins)) {
			$gaps[] = [
				'id' => 'no_multilingual_plugin',
				'severity' => 'info',
				'description' => 'No multilingual plugin detected. Site is single‑language only.',
				'data' => [],
			];
			return $gaps;
		}

		$coverage = $this->estimate_translation_coverage();
		if ($coverage['missing'] > 0) {
			$gaps[] = [
				'id' => 'incomplete_translation',
				'severity' => 'warning',
				'description' => sprintf('%d posts/pages missing translations.', $coverage['missing']),
				'data' => $coverage,
			];
		}

		$languages = $this->get_configured_languages();
		if (count($languages) < 2) {
			$gaps[] = [
				'id' => 'only_one_language',
				'severity' => 'info',
				'description' => 'Only one language configured. Add target languages.',
				'data' => ['languages' => $languages],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$multilingual_plugins = $this->get_multilingual_plugins();
		$recommendations = [];

		if (empty($multilingual_plugins)) {
			$recommendations[] = [
				'id' => 'install_multilingual_plugin',
				'priority' => 'medium',
				'title' => 'Install Multilingual Plugin',
				'description' => 'Add multilingual support to reach international audiences.',
				'action' => 'Evaluate WPML (premium), Polylang (free), or TranslatePress.',
				'gap_id' => 'no_multilingual_plugin',
			];
			return $recommendations;
		}

		$coverage = $this->estimate_translation_coverage();
		if ($coverage['missing'] > 0) {
			$recommendations[] = [
				'id' => 'complete_translations',
				'priority' => 'medium',
				'title' => 'Complete Missing Translations',
				'description' => 'Translate content that is currently only available in source language.',
				'action' => 'Use your multilingual plugin interface to translate missing content.',
				'gap_id' => 'incomplete_translation',
			];
		}

		$languages = $this->get_configured_languages();
		if (count($languages) < 2) {
			$recommendations[] = [
				'id' => 'add_target_languages',
				'priority' => 'low',
				'title' => 'Add Target Languages',
				'description' => 'Expand reach by adding more languages.',
				'action' => 'Add languages based on your audience demographics.',
				'gap_id' => 'only_one_language',
			];
		}

		// Plugin-specific recommendations
		$active_plugin = $multilingual_plugins[0] ?? '';
		if ($active_plugin === 'polylang' && !$this->has_polylang_pro()) {
			$recommendations[] = [
				'id' => 'consider_polylang_pro',
				'priority' => 'low',
				'title' => 'Consider Polylang Pro',
				'description' => 'Polylang Pro adds translation management and automatic sync.',
				'action' => 'Upgrade to Polylang Pro for advanced features.',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];

		$multilingual_plugins = $this->get_multilingual_plugins();
		if (empty($multilingual_plugins)) {
			$suggested_plugins[] = [
				'slug' => 'polylang',
				'name' => 'Polylang',
				'reason' => 'Free, lightweight multilingual plugin.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'translatepress-multilingual',
				'name' => 'TranslatePress',
				'reason' => 'Visual translation interface.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'sitepress-multilingual-cms',
				'name' => 'WPML',
				'reason' => 'Enterprise multilingual solution (premium).',
				'required_capability' => 'plugin-stack-context:read',
			];
		} else {
			$suggested_tools[] = [
				'tool' => 'list_elementor_pages',
				'purpose' => 'Find pages needing translation',
				'governance_level' => 'L0',
			];
		}

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_multilingual_plugins(): array {
		return $this->assessment['plugins']['classified']['multilingual'] ?? [];
	}

	private function estimate_translation_coverage(): array {
		// Placeholder
		return [
			'total' => 0,
			'translated' => 0,
			'missing' => 0,
			'outdated' => 0,
		];
	}

	private function get_configured_languages(): array {
		// Placeholder
		return ['en'];
	}

	private function has_polylang_pro(): bool {
		return \is_plugin_active('polylang-pro/polylang.php');
	}
}