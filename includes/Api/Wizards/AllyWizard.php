<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * Accessibility recommendation wizard (ALLY-004).
 *
 * Recommends built-in scanner vs Ally based on site needs.
 * Assess current accessibility state, suggest Ally upgrade if beneficial.
 */
final class AllyWizard extends BaseWizard {

	public function assess_module_state(): array {
		$ally_status = $this->detect_ally_plugin();
		$builtin_scanner = $this->check_builtin_scanner();

		$status = 'missing';
		if ($ally_status['ally_available']) {
			$status = 'active';
		} elseif ($builtin_scanner) {
			$status = 'needs_configuration';
		}

		$details = [
			'ally_available' => $ally_status['ally_available'],
			'ally_tier' => $ally_status['tier'] ?? null,
			'ally_credits' => $ally_status['credits_remaining'] ?? null,
			'builtin_scanner' => $builtin_scanner,
			'page_count' => $this->estimate_page_count(),
			'wcag_required' => $this->detect_wcag_requirement(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$state = $this->assess_module_state();
		$details = $state['details'];

		if (!$details['ally_available'] && !$details['builtin_scanner']) {
			$gaps[] = [
				'id' => 'no_accessibility_tool',
				'severity' => 'warning',
				'description' => 'No accessibility scanning tool detected (neither Ally nor built-in scanner).',
				'data' => [],
			];
		}

		if ($details['ally_available'] && $details['ally_tier'] === 'free') {
			$gaps[] = [
				'id' => 'ally_free_tier',
				'severity' => 'info',
				'description' => 'Ally Free tier active. AI fixes and batch scans require Ally Pro.',
				'data' => ['tier' => 'free'],
			];
		}

		if ($details['wcag_required'] && !$details['ally_available']) {
			$gaps[] = [
				'id' => 'wcag_compliance_needs',
				'severity' => 'critical',
				'description' => 'Site likely requires WCAG compliance but no Ally plugin detected.',
				'data' => [],
			];
		}

		if ($details['page_count'] > 50 && !$details['ally_available']) {
			$gaps[] = [
				'id' => 'large_site_no_ally',
				'severity' => 'warning',
				'description' => sprintf('Site has ~%d pages; manual accessibility review is impractical.', $details['page_count']),
				'data' => ['page_count' => $details['page_count']],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];
		$recommendations = [];

		if (!$details['ally_available'] && !$details['builtin_scanner']) {
			$recommendations[] = [
				'id' => 'install_ally_free',
				'priority' => 'high',
				'title' => 'Install Elementor Ally Free',
				'description' => 'Add basic accessibility scanning to your site.',
				'action' => 'Install the "Elementor Ally" plugin from WordPress.org.',
				'gap_id' => 'no_accessibility_tool',
			];
		}

		if ($details['ally_available'] && $details['ally_tier'] === 'free') {
			$recommendations[] = [
				'id' => 'upgrade_ally_pro',
				'priority' => 'medium',
				'title' => 'Upgrade to Ally Pro',
				'description' => 'Get AI-powered fixes, batch scans, and scheduled scanning.',
				'action' => 'Purchase Ally Pro from elementorally.com.',
				'gap_id' => 'ally_free_tier',
			];
		}

		if ($details['wcag_required'] && !$details['ally_available']) {
			$recommendations[] = [
				'id' => 'install_ally_pro_wcag',
				'priority' => 'critical',
				'title' => 'Install Ally Pro for WCAG Compliance',
				'description' => 'Professional accessibility scanning required for WCAG compliance.',
				'action' => 'Purchase and install Ally Pro.',
				'gap_id' => 'wcag_compliance_needs',
			];
		}

		if ($details['page_count'] > 50 && !$details['ally_available']) {
			$recommendations[] = [
				'id' => 'install_ally_for_large_site',
				'priority' => 'high',
				'title' => 'Install Ally for Large Site',
				'description' => 'Automate accessibility scanning across many pages.',
				'action' => 'Install Ally Free first, then consider Pro for batch scans.',
				'gap_id' => 'large_site_no_ally',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];

		$suggested_tools = [];
		$suggested_plugins = [];

		if ($details['ally_available']) {
			$suggested_tools[] = [
				'tool' => 'get_ally_status',
				'purpose' => 'Check Ally plugin status and credits.',
				'governance_level' => 'L0',
			];
			// Note: ALLY-002 and ALLY-003 tools not yet implemented
		} else {
			$suggested_plugins[] = [
				'slug' => 'elementor-ally',
				'name' => 'Elementor Ally',
				'reason' => 'Adds accessibility scanning and AI-powered fixes.',
				'required_capability' => 'ally:read',
			];
		}

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// ------------------------------------------------------------------ //
	// Helper methods
	// ------------------------------------------------------------------ //

	private function detect_ally_plugin(): array {
		// Reuse the detection logic from Ally.php
		// For simplicity, we mimic the detection.
		$active = (array) \get_option('active_plugins', []);
		$active_slugs = array_map(fn($p) => \dirname($p), $active);

		$ally_slugs = [
			'elementor-ally' => 'Elementor Ally',
			'elementor-ally-pro' => 'Elementor Ally Pro',
			'elementor-ally-one' => 'Elementor Ally One',
		];

		$detected = [];
		foreach ($ally_slugs as $slug => $name) {
			if (\in_array($slug, $active_slugs, true)) {
				$detected[] = $name;
			}
		}

		if (empty($detected)) {
			return [
				'ally_available' => false,
				'plugin' => null,
				'version' => null,
				'tier' => null,
				'credits_remaining' => null,
			];
		}

		$plugin_name = $detected[0];
		$tier = $this->determine_ally_tier($plugin_name);
		$credits = $this->get_ally_credits($plugin_name);

		return [
			'ally_available' => true,
			'plugin' => $plugin_name,
			'tier' => $tier,
			'credits_remaining' => $credits,
		];
	}

	private function determine_ally_tier(string $plugin_name): string {
		if (\strpos($plugin_name, 'Pro') !== false) {
			return 'pro';
		}
		if (\strpos($plugin_name, 'One') !== false) {
			return 'one';
		}
		return 'free';
	}

	private function get_ally_credits(string $plugin_name): ?int {
		$option_name = 'ally_credits_remaining';
		$credits = \get_option($option_name, null);
		return \is_numeric($credits) ? (int) $credits : null;
	}

	private function check_builtin_scanner(): bool {
		// Placeholder: check if built-in A11Y scanner is available (PRD v2)
		// For now, assume not available.
		return false;
	}

	private function estimate_page_count(): int {
		// Rough estimate of published pages
		$count = \wp_count_posts('page');
		return (int) ($count->publish ?? 0);
	}

	private function detect_wcag_requirement(): bool {
		// Heuristic: check if site is government, education, or large corporate
		// For now, return false.
		return false;
	}
}