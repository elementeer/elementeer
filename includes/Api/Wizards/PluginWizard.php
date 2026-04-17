<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Plugin stack wizard for conflict and optimization recommendation.
 */
final class PluginWizard extends BaseWizard {

	public function assess_module_state(): array {
		$plugin_stats = $this->get_plugin_stats();
		$status = 'active'; // Always active since plugins exist
		$details = [
			'plugin_stats' => $plugin_stats,
			'conflicts' => $this->detect_conflicts(),
			'outdated_plugins' => $this->find_outdated_plugins(),
			'missing_essentials' => $this->identify_missing_essentials(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$plugin_stats = $this->get_plugin_stats();
		
		$total_plugins = $plugin_stats['total'] ?? 0;
		if ($total_plugins > 30) {
			$gaps[] = [
				'id' => 'too_many_plugins',
				'severity' => 'warning',
				'description' => sprintf('%d active plugins may impact performance.', $total_plugins),
				'data' => ['count' => $total_plugins],
			];
		}
		
		$conflicts = $this->detect_conflicts();
		if (!empty($conflicts)) {
			foreach ($conflicts as $conflict) {
				$gaps[] = [
					'id' => 'plugin_conflict_' . \sanitize_title($conflict['type']),
					'severity' => 'critical',
					'description' => $conflict['description'],
					'data' => $conflict,
				];
			}
		}
		
		$outdated = $this->find_outdated_plugins();
		if (!empty($outdated)) {
			$gaps[] = [
				'id' => 'outdated_plugins',
				'severity' => 'warning',
				'description' => sprintf('%d plugin(s) not updated in 6+ months.', count($outdated)),
				'data' => ['plugins' => $outdated],
			];
		}
		
		$missing = $this->identify_missing_essentials();
		if (!empty($missing)) {
			foreach ($missing as $essential) {
				$gaps[] = [
					'id' => 'missing_essential_' . \sanitize_title($essential['type']),
					'severity' => 'info',
					'description' => $essential['description'],
					'data' => $essential,
				];
			}
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$recommendations = [];
		$plugin_stats = $this->get_plugin_stats();
		
		$total_plugins = $plugin_stats['total'] ?? 0;
		if ($total_plugins > 30) {
			$recommendations[] = [
				'id' => 'reduce_plugin_count',
				'priority' => 'medium',
				'title' => 'Reduce Plugin Count',
				'description' => 'Too many plugins can slow down your site.',
				'action' => 'Deactivate and delete unused plugins.',
				'gap_id' => 'too_many_plugins',
			];
		}
		
		$conflicts = $this->detect_conflicts();
		foreach ($conflicts as $conflict) {
			$recommendations[] = [
				'id' => 'resolve_conflict_' . \sanitize_title($conflict['type']),
				'priority' => 'high',
				'title' => 'Resolve Plugin Conflict: ' . $conflict['type'],
				'description' => $conflict['description'],
				'action' => 'Deactivate one of the conflicting plugins: ' . implode(', ', $conflict['plugins']),
				'gap_id' => 'plugin_conflict_' . \sanitize_title($conflict['type']),
			];
		}
		
		$outdated = $this->find_outdated_plugins();
		if (!empty($outdated)) {
			$recommendations[] = [
				'id' => 'update_outdated_plugins',
				'priority' => 'medium',
				'title' => 'Update Outdated Plugins',
				'description' => 'Outdated plugins may have security vulnerabilities.',
				'action' => 'Update plugins via WordPress Updates screen.',
				'gap_id' => 'outdated_plugins',
			];
		}
		
		$missing = $this->identify_missing_essentials();
		foreach ($missing as $essential) {
			$recommendations[] = [
				'id' => 'install_essential_' . \sanitize_title($essential['type']),
				'priority' => 'low',
				'title' => 'Install Essential: ' . $essential['type'],
				'description' => $essential['description'],
				'action' => 'Install recommended plugin: ' . $essential['recommended'],
				'gap_id' => 'missing_essential_' . \sanitize_title($essential['type']),
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];
		
		$conflicts = $this->detect_conflicts();
		if (!empty($conflicts)) {
			$suggested_tools[] = [
				'tool' => 'flush_elementor_cache',
				'purpose' => 'Clear cache after resolving plugin conflicts',
				'governance_level' => 'L2',
			];
		}
		
		$missing = $this->identify_missing_essentials();
		foreach ($missing as $essential) {
			if (isset($essential['plugin_slug'])) {
				$suggested_plugins[] = [
					'slug' => $essential['plugin_slug'],
					'name' => $essential['recommended'],
					'reason' => $essential['description'],
					'required_capability' => 'plugin-stack-context:read',
				];
			}
		}

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_plugin_stats(): array {
		$total = $this->assessment['plugins']['active_count'] ?? 0;
		$classified = $this->assessment['plugins']['classified'] ?? [];
		
		return [
			'total' => $total,
			'classified' => $classified,
			'performance_impact' => $this->estimate_performance_impact($total, $classified),
		];
	}
	
	private function detect_conflicts(): array {
		$conflicts = [];
		$classified = $this->assessment['plugins']['classified'] ?? [];
		
		// Multiple SEO plugins
		if (isset($classified['seo']) && count($classified['seo']) > 1) {
			$conflicts[] = [
				'type' => 'multiple_seo',
				'description' => 'Multiple SEO plugins active: ' . implode(', ', $classified['seo']),
				'plugins' => $classified['seo'],
			];
		}
		
		// Multiple cache plugins
		if (isset($classified['cache']) && count($classified['cache']) > 1) {
			$conflicts[] = [
				'type' => 'multiple_cache',
				'description' => 'Multiple cache plugins active: ' . implode(', ', $classified['cache']),
				'plugins' => $classified['cache'],
			];
		}
		
		return $conflicts;
	}
	
	private function find_outdated_plugins(): array {
		// Placeholder - would compare version with WordPress.org API
		return [];
	}
	
	private function identify_missing_essentials(): array {
		$missing = [];
		$classified = $this->assessment['plugins']['classified'] ?? [];
		$site_type = $this->assessment['site_purpose'] ?? 'unknown';
		
		// Security
		if (!isset($classified['security'])) {
			$missing[] = [
				'type' => 'security',
				'description' => 'No security plugin installed.',
				'recommended' => 'Wordfence or Solid Security',
				'plugin_slug' => 'wordfence',
			];
		}
		
		// Backup
		if (!isset($classified['backup'])) {
			$missing[] = [
				'type' => 'backup',
				'description' => 'No backup plugin installed.',
				'recommended' => 'UpdraftPlus',
				'plugin_slug' => 'updraftplus',
			];
		}
		
		// Cache for non-managed hosting
		if (!isset($classified['cache']) && $site_type !== 'ecommerce') {
			$missing[] = [
				'type' => 'cache',
				'description' => 'No cache plugin for performance.',
				'recommended' => 'LiteSpeed Cache or WP Rocket',
				'plugin_slug' => 'litespeed-cache',
			];
		}
		
		return $missing;
	}
	
	private function estimate_performance_impact(int $total, array $classified): string {
		if ($total > 40) return 'high';
		if ($total > 20) return 'medium';
		return 'low';
	}
}