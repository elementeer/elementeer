<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Import/Export wizard for data migration recommendation.
 */
final class ExportWizard extends BaseWizard {

	public function assess_module_state(): array {
		$exportable_content = $this->get_exportable_content();
		$status = 'active'; // Export is always possible
		$details = [
			'exportable_content' => $exportable_content,
			'export_formats_available' => $this->get_available_formats(),
			'import_capabilities' => $this->get_import_capabilities(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$exportable = $this->get_exportable_content();
		
		if (empty($exportable)) {
			$gaps[] = [
				'id' => 'no_exportable_content',
				'severity' => 'info',
				'description' => 'No significant content to export (empty site).',
				'data' => [],
			];
			return $gaps;
		}
		
		$total_items = array_sum(array_column($exportable, 'count'));
		if ($total_items > 1000) {
			$gaps[] = [
				'id' => 'large_export_volume',
				'severity' => 'warning',
				'description' => sprintf('Large export volume: %d items total.', $total_items),
				'data' => ['total' => $total_items],
			];
		}
		
		$complex_types = array_filter($exportable, fn($type) => 
			in_array($type['type'], ['product', 'course', 'form_entry'])
		);
		if (!empty($complex_types) && !$this->has_advanced_export_tools()) {
			$gaps[] = [
				'id' => 'need_advanced_export',
				'severity' => 'info',
				'description' => 'Complex content types may need advanced export tools.',
				'data' => ['complex_types' => array_column($complex_types, 'type')],
			];
		}
		
		$import_caps = $this->get_import_capabilities();
		if (!$import_caps['can_import']) {
			$gaps[] = [
				'id' => 'no_import_capability',
				'severity' => 'info',
				'description' => 'No dedicated import tools detected.',
				'data' => [],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$recommendations = [];
		$exportable = $this->get_exportable_content();
		
		if (empty($exportable)) {
			$recommendations[] = [
				'id' => 'create_content_before_export',
				'priority' => 'low',
				'title' => 'Create Content Before Export',
				'description' => 'Site has little content to export.',
				'action' => 'Add posts, pages, or products before considering export.',
				'gap_id' => 'no_exportable_content',
			];
			return $recommendations;
		}
		
		$total_items = array_sum(array_column($exportable, 'count'));
		if ($total_items > 1000) {
			$recommendations[] = [
				'id' => 'use_batch_export',
				'priority' => 'medium',
				'title' => 'Use Batch Export Strategy',
				'description' => 'Large volume requires careful batch processing.',
				'action' => 'Export in batches by date or content type.',
				'gap_id' => 'large_export_volume',
			];
		}
		
		$complex_types = array_filter($exportable, fn($type) => 
			in_array($type['type'], ['product', 'course', 'form_entry'])
		);
		if (!empty($complex_types)) {
			$recommendations[] = [
				'id' => 'consider_wp_all_export',
				'priority' => 'low',
				'title' => 'Consider WP All Export for Complex Data',
				'description' => 'Advanced export tool for custom post types and fields.',
				'action' => 'Evaluate WP All Export plugin.',
				'gap_id' => 'need_advanced_export',
			];
		}
		
		$import_caps = $this->get_import_capabilities();
		if (!$import_caps['can_import']) {
			$recommendations[] = [
				'id' => 'add_import_capability',
				'priority' => 'low',
				'title' => 'Add Import Capability',
				'description' => 'Prepare for future data migration needs.',
				'action' => 'Install WP All Import for CSV/XML imports.',
				'gap_id' => 'no_import_capability',
			];
		}
		
		// Format recommendation
		$use_case = $this->infer_use_case($exportable);
		$recommendations[] = [
			'id' => 'choose_export_format',
			'priority' => 'medium',
			'title' => 'Choose Appropriate Export Format',
			'description' => $this->get_format_recommendation($use_case),
			'action' => $this->get_format_action($use_case),
		];

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];
		
		$exportable = $this->get_exportable_content();
		$total_items = array_sum(array_column($exportable, 'count'));
		
		if ($total_items > 500) {
			$suggested_plugins[] = [
				'slug' => 'wp-all-export-pro',
				'name' => 'WP All Export Pro',
				'reason' => 'Advanced export for large/complex datasets.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}
		
		$complex_types = array_filter($exportable, fn($type) => 
			in_array($type['type'], ['product', 'course'])
		);
		if (!empty($complex_types)) {
			$suggested_plugins[] = [
				'slug' => 'wp-all-import',
				'name' => 'WP All Import',
				'reason' => 'Powerful import tool for CSV/XML data.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}
		
		$suggested_tools[] = [
			'tool' => 'list_elementor_pages',
			'purpose' => 'Identify Elementor pages for export',
			'governance_level' => 'L0',
		];

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_exportable_content(): array {
		// Placeholder - would query post types
		return [
			['type' => 'post', 'count' => 0, 'label' => 'Posts'],
			['type' => 'page', 'count' => 0, 'label' => 'Pages'],
			['type' => 'product', 'count' => 0, 'label' => 'Products'],
		];
	}
	
	private function get_available_formats(): array {
		return ['csv', 'json', 'xml'];
	}
	
	private function get_import_capabilities(): array {
		return [
			'can_import' => false,
			'formats' => [],
			'plugins' => [],
		];
	}
	
	private function has_advanced_export_tools(): bool {
		return \is_plugin_active('wp-all-export-pro/wp-all-export-pro.php') ||
			\is_plugin_active('wp-all-export/wp-all-export.php');
	}
	
	private function infer_use_case(array $exportable): string {
		$total = array_sum(array_column($exportable, 'count'));
		if ($total === 0) return 'empty';
		if ($total > 1000) return 'large_migration';
		
		$has_products = !empty(array_filter($exportable, fn($e) => $e['type'] === 'product'));
		if ($has_products) return 'ecommerce';
		
		return 'standard';
	}
	
	private function get_format_recommendation(string $use_case): string {
		switch ($use_case) {
			case 'large_migration':
				return 'CSV format for large datasets (handled by WP All Export).';
			case 'ecommerce':
				return 'CSV with product data, images, and variations.';
			case 'standard':
				return 'JSON for preserving post relationships and metadata.';
			default:
				return 'WordPress native export (Tools → Export) for simple sites.';
		}
	}
	
	private function get_format_action(string $use_case): string {
		switch ($use_case) {
			case 'large_migration':
				return 'Use WP All Export Pro for batch CSV export.';
			case 'ecommerce':
				return 'Export products as CSV with proper column mapping.';
			case 'standard':
				return 'Use WordPress export tool or generate custom JSON.';
			default:
				return 'Use WordPress Tools → Export screen.';
		}
	}
}