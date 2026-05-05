<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * Site health wizard for performance and optimization recommendation.
 */
final class HealthWizard extends BaseWizard {

	public function assess_module_state(): array {
		$health_metrics = $this->get_health_metrics();
		$status = $this->determine_health_status($health_metrics);
		$details = [
			'health_metrics' => $health_metrics,
			'critical_issues' => $this->find_critical_issues($health_metrics),
			'optimization_opportunities' => $this->find_optimization_opportunities($health_metrics),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$health_metrics = $this->get_health_metrics();
		
		// PHP version
		$php_version = $health_metrics['php']['version'] ?? '';
		$php_eol = $health_metrics['php']['eol'] ?? false;
		if ($php_eol) {
			$gaps[] = [
				'id' => 'php_eol',
				'severity' => 'critical',
				'description' => sprintf('PHP %s is end‑of‑life and insecure.', $php_version),
				'data' => ['version' => $php_version],
			];
		} elseif (version_compare($php_version, '8.1', '<')) {
			$gaps[] = [
				'id' => 'php_outdated',
				'severity' => 'warning',
				'description' => sprintf('PHP %s is outdated (8.1+ recommended).', $php_version),
				'data' => ['version' => $php_version],
			];
		}
		
		// Memory
		$memory_limit = $health_metrics['php']['memory_limit_mb'] ?? 0;
		if ($memory_limit < 256) {
			$gaps[] = [
				'id' => 'low_memory',
				'severity' => 'warning',
				'description' => sprintf('Low memory limit: %d MB (256+ recommended).', $memory_limit),
				'data' => ['limit_mb' => $memory_limit],
			];
		}
		
		// Database bloat
		$db_bloat = $health_metrics['database']['bloat_items'] ?? 0;
		if ($db_bloat > 1000) {
			$gaps[] = [
				'id' => 'database_bloat',
				'severity' => 'warning',
				'description' => sprintf('Database has %d+ bloated items (revisions, transients).', $db_bloat),
				'data' => ['count' => $db_bloat],
			];
		}
		
		// Cache status
		$has_object_cache = $health_metrics['cache']['object_cache'] ?? false;
		$has_page_cache = $health_metrics['cache']['page_cache'] ?? false;
		
		if (!$has_object_cache) {
			$gaps[] = [
				'id' => 'no_object_cache',
				'severity' => 'info',
				'description' => 'No object cache (Redis/Memcached) configured.',
				'data' => [],
			];
		}
		
		if (!$has_page_cache) {
			$gaps[] = [
				'id' => 'no_page_cache',
				'severity' => 'warning',
				'description' => 'No page cache plugin active.',
				'data' => [],
			];
		}
		
		// Hosting check
		$hosting_type = $health_metrics['hosting']['type'] ?? 'unknown';
		if ($hosting_type === 'shared' && $health_metrics['plugins']['active_count'] ?? 0 > 20) {
			$gaps[] = [
				'id' => 'shared_hosting_heavy',
				'severity' => 'warning',
				'description' => 'Many plugins on shared hosting may cause performance issues.',
				'data' => [
					'hosting_type' => $hosting_type,
					'plugin_count' => $health_metrics['plugins']['active_count'],
				],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$recommendations = [];
		$health_metrics = $this->get_health_metrics();
		
		// PHP version
		$php_version = $health_metrics['php']['version'] ?? '';
		$php_eol = $health_metrics['php']['eol'] ?? false;
		if ($php_eol) {
			$recommendations[] = [
				'id' => 'upgrade_php_critical',
				'priority' => 'critical',
				'title' => 'Upgrade PHP Immediately',
				'description' => 'End‑of‑life PHP version has security vulnerabilities.',
				'action' => 'Contact hosting provider to upgrade to PHP 8.2+.',
				'gap_id' => 'php_eol',
			];
		} elseif (version_compare($php_version, '8.1', '<')) {
			$recommendations[] = [
				'id' => 'upgrade_php',
				'priority' => 'high',
				'title' => 'Upgrade PHP Version',
				'description' => 'Newer PHP versions are faster and more secure.',
				'action' => 'Upgrade to PHP 8.1 or higher via hosting control panel.',
				'gap_id' => 'php_outdated',
			];
		}
		
		// Memory
		$memory_limit = $health_metrics['php']['memory_limit_mb'] ?? 0;
		if ($memory_limit < 256) {
			$recommendations[] = [
				'id' => 'increase_memory',
				'priority' => 'medium',
				'title' => 'Increase PHP Memory Limit',
				'description' => 'Higher memory prevents crashes with Elementor and plugins.',
				'action' => 'Set memory_limit to 256M or 512M in wp‑config.php or .htaccess.',
				'gap_id' => 'low_memory',
			];
		}
		
		// Database optimization
		$db_bloat = $health_metrics['database']['bloat_items'] ?? 0;
		if ($db_bloat > 1000) {
			$recommendations[] = [
				'id' => 'clean_database',
				'priority' => 'medium',
				'title' => 'Clean Database Bloat',
				'description' => 'Remove old revisions, transients, and orphaned data.',
				'action' => 'Use WP‑Optimize or similar plugin to clean database.',
				'gap_id' => 'database_bloat',
			];
		}
		
		// Cache
		$has_page_cache = $health_metrics['cache']['page_cache'] ?? false;
		if (!$has_page_cache) {
			$hosting_type = $health_metrics['hosting']['type'] ?? 'unknown';
			$cache_plugin = $this->recommend_cache_plugin($hosting_type);
			
			$recommendations[] = [
				'id' => 'install_cache_plugin',
				'priority' => 'high',
				'title' => 'Install Cache Plugin',
				'description' => 'Page cache dramatically improves site speed.',
				'action' => 'Install and configure ' . $cache_plugin . '.',
				'gap_id' => 'no_page_cache',
			];
		}
		
		// Hosting upgrade
		$hosting_type = $health_metrics['hosting']['type'] ?? 'unknown';
		if ($hosting_type === 'shared' && ($health_metrics['plugins']['active_count'] ?? 0) > 20) {
			$recommendations[] = [
				'id' => 'consider_better_hosting',
				'priority' => 'low',
				'title' => 'Consider Better Hosting',
				'description' => 'Heavy plugin stack may need VPS or managed WordPress hosting.',
				'action' => 'Evaluate Kinsta, WP Engine, or Cloudways.',
				'gap_id' => 'shared_hosting_heavy',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];
		
		$health_metrics = $this->get_health_metrics();
		
		// Database cleanup
		$db_bloat = $health_metrics['database']['bloat_items'] ?? 0;
		if ($db_bloat > 0) {
			$suggested_plugins[] = [
				'slug' => 'wp-optimize',
				'name' => 'WP‑Optimize',
				'reason' => 'Cleans database revisions, transients, and optimizes tables.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}
		
		// Cache
		$has_page_cache = $health_metrics['cache']['page_cache'] ?? false;
		if (!$has_page_cache) {
			$hosting_type = $health_metrics['hosting']['type'] ?? 'unknown';
			$cache_slug = $this->get_cache_plugin_slug($hosting_type);
			if ($cache_slug) {
				$suggested_plugins[] = [
					'slug' => $cache_slug,
					'name' => $this->recommend_cache_plugin($hosting_type),
					'reason' => 'Improves site speed with page caching.',
					'required_capability' => 'plugin-stack-context:read',
				];
			}
		}
		
		$suggested_tools[] = [
			'tool' => 'get_performance_report',
			'purpose' => 'Detailed performance analysis',
			'governance_level' => 'L0',
		];
		$suggested_tools[] = [
			'tool' => 'flush_elementor_cache',
			'purpose' => 'Clear Elementor CSS cache after optimizations',
			'governance_level' => 'L2',
		];

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_health_metrics(): array {
		// Placeholder - would gather from WordPress Site Health, server info, etc.
		return [
			'php' => [
				'version' => PHP_VERSION,
				'memory_limit_mb' => $this->parse_memory_limit(ini_get('memory_limit')),
				'eol' => version_compare(PHP_VERSION, '8.0', '<'),
			],
			'database' => [
				'bloat_items' => 0,
				'total_size_mb' => 0,
			],
			'cache' => [
				'object_cache' => false,
				'page_cache' => false,
			],
			'hosting' => [
				'type' => 'unknown',
			],
			'plugins' => [
				'active_count' => $this->assessment['plugins']['active_count'] ?? 0,
			],
		];
	}
	
	private function determine_health_status(array $metrics): string {
		$php_eol = $metrics['php']['eol'] ?? false;
		if ($php_eol) return 'critical';
		
		$memory = $metrics['php']['memory_limit_mb'] ?? 0;
		if ($memory < 128) return 'warning';
		
		return 'good';
	}
	
	private function find_critical_issues(array $metrics): array {
		$issues = [];
		if ($metrics['php']['eol'] ?? false) {
			$issues[] = 'PHP version is end‑of‑life';
		}
		return $issues;
	}
	
	private function find_optimization_opportunities(array $metrics): array {
		$opps = [];
		if (!($metrics['cache']['page_cache'] ?? false)) {
			$opps[] = 'Add page caching';
		}
		if (!($metrics['cache']['object_cache'] ?? false)) {
			$opps[] = 'Add object caching (Redis/Memcached)';
		}
		if (($metrics['database']['bloat_items'] ?? 0) > 0) {
			$opps[] = 'Clean database bloat';
		}
		return $opps;
	}
	
	private function parse_memory_limit(string $limit): int {
		$value = (int) $limit;
		$unit = strtolower(substr($limit, -1));
		if ($unit === 'g') return $value * 1024;
		if ($unit === 'm') return $value;
		if ($unit === 'k') return (int) ($value / 1024);
		return (int) ($value / (1024 * 1024)); // bytes to MB
	}
	
	private function recommend_cache_plugin(string $hosting_type): string {
		switch ($hosting_type) {
			case 'litespeed':
				return 'LiteSpeed Cache';
			case 'nginx':
				return 'WP Rocket';
			default:
				return 'W3 Total Cache or WP Super Cache';
		}
	}
	
	private function get_cache_plugin_slug(string $hosting_type): string {
		switch ($hosting_type) {
			case 'litespeed':
				return 'litespeed-cache';
			case 'nginx':
				return 'wp-rocket';
			default:
				return 'w3-total-cache';
		}
	}
}