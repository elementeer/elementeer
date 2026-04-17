<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Charity recommendation wizard (CHARITY-003).
 *
 * Recommends charity plugin based on needs, checks payment gateway setup,
 * suggests donation form placement and design.
 */
final class CharityWizard extends BaseWizard {

	public function assess_module_state(): array {
		$charity_status = $this->detect_charity_plugin();
		$form_count = $charity_status['charity_available'] ? $this->count_donation_forms() : 0;

		$status = 'missing';
		if ($charity_status['charity_available']) {
			$status = $form_count > 0 ? 'active' : 'needs_configuration';
		}

		$details = [
			'charity_available' => $charity_status['charity_available'],
			'charity_plugin' => $charity_status['plugin'] ?? null,
			'charity_version' => $charity_status['version'] ?? null,
			'form_count' => $form_count,
			'has_payment_gateway' => $this->has_payment_gateway(),
			'has_donation_page' => $this->has_donation_page(),
			'has_thank_you_page' => $this->has_thank_you_page(),
			'has_donor_wall' => $this->has_donor_wall(),
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

		if (!$details['charity_available']) {
			$gaps[] = [
				'id' => 'charity_missing',
				'severity' => 'warning',
				'description' => 'No charity/donation plugin detected. Fundraising functionality unavailable.',
				'data' => [],
			];
			return $gaps;
		}

		if ($details['form_count'] === 0) {
			$gaps[] = [
				'id' => 'no_donation_forms',
				'severity' => 'warning',
				'description' => 'No donation forms created yet.',
				'data' => [],
			];
		}

		if (!$details['has_payment_gateway']) {
			$gaps[] = [
				'id' => 'missing_payment_gateway',
				'severity' => 'critical',
				'description' => 'No payment gateway configured. Donations cannot be processed.',
				'data' => [],
			];
		}

		if (!$details['has_donation_page']) {
			$gaps[] = [
				'id' => 'missing_donation_page',
				'severity' => 'critical',
				'description' => 'No dedicated donation page detected.',
				'data' => [],
			];
		}

		if (!$details['has_thank_you_page']) {
			$gaps[] = [
				'id' => 'missing_thank_you_page',
				'severity' => 'warning',
				'description' => 'No thank‑you/page‑confirmation page detected.',
				'data' => [],
			];
		}

		if (!$details['has_donor_wall']) {
			$gaps[] = [
				'id' => 'missing_donor_wall',
				'severity' => 'info',
				'description' => 'No donor wall/recognition page. Consider adding one to encourage repeat donations.',
				'data' => [],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];
		$recommendations = [];

		if (!$details['charity_available']) {
			$recommendations[] = [
				'id' => 'install_charity',
				'priority' => 'high',
				'title' => 'Install a Charity Plugin',
				'description' => 'Add fundraising capabilities to your site.',
				'action' => 'Choose GiveWP (recommended) or Charitable.',
				'gap_id' => 'charity_missing',
			];
			return $recommendations;
		}

		if ($details['form_count'] === 0) {
			$recommendations[] = [
				'id' => 'create_first_form',
				'priority' => 'high',
				'title' => 'Create Your First Donation Form',
				'description' => 'Start collecting donations.',
				'action' => 'Use your charity plugin’s form builder.',
				'gap_id' => 'no_donation_forms',
			];
		}

		if (!$details['has_payment_gateway']) {
			$recommendations[] = [
				'id' => 'configure_payment_gateway',
				'priority' => 'critical',
				'title' => 'Configure a Payment Gateway',
				'description' => 'Set up Stripe, PayPal, or another payment processor.',
				'action' => 'Go to the plugin’s settings and connect a payment gateway.',
				'gap_id' => 'missing_payment_gateway',
			];
		}

		if (!$details['has_donation_page']) {
			$recommendations[] = [
				'id' => 'create_donation_page',
				'priority' => 'critical',
				'title' => 'Create a Dedicated Donation Page',
				'description' => 'Visitors need a clear page to make donations.',
				'action' => 'Create a page with the donation form shortcode or Elementor widget.',
				'gap_id' => 'missing_donation_page',
			];
		}

		if (!$details['has_thank_you_page']) {
			$recommendations[] = [
				'id' => 'create_thank_you_page',
				'priority' => 'medium',
				'title' => 'Create a Thank‑You Page',
				'description' => 'Show appreciation and provide next steps after a donation.',
				'action' => 'Create a page and set it as the confirmation page in plugin settings.',
				'gap_id' => 'missing_thank_you_page',
			];
		}

		if (!$details['has_donor_wall']) {
			$recommendations[] = [
				'id' => 'create_donor_wall',
				'priority' => 'low',
				'title' => 'Add a Donor Recognition Wall',
				'description' => 'Publicly thank donors to encourage repeat donations.',
				'action' => 'Create a page listing recent donors (plugin may have a shortcode).',
				'gap_id' => 'missing_donor_wall',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];

		$suggested_tools = [];
		$suggested_plugins = [];

		if ($details['charity_available']) {
			$suggested_tools[] = [
				'tool' => 'list_donation_forms',
				'purpose' => 'List all donation forms with goals and progress.',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'get_donation_stats',
				'purpose' => 'View total raised, donor count, average donation.',
				'governance_level' => 'L0',
			];
		} else {
			$suggested_plugins[] = [
				'slug' => 'give',
				'name' => 'GiveWP',
				'reason' => 'Most popular donation plugin with deep Elementor integration.',
				'required_capability' => 'charity:read',
			];
			$suggested_plugins[] = [
				'slug' => 'charitable',
				'name' => 'Charitable',
				'reason' => 'Lightweight donation plugin with flexible campaigns.',
				'required_capability' => 'charity:read',
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

	private function detect_charity_plugin(): array {
		// Reuse detection from Charity.php
		$active = (array) \get_option('active_plugins', []);
		$active_slugs = array_map(fn($p) => \dirname($p), $active);

		$charity_slugs = [
			'give'         => 'GiveWP',
			'charitable'   => 'Charitable',
		];

		$detected = [];
		foreach ($charity_slugs as $slug => $name) {
			if (\in_array($slug, $active_slugs, true)) {
				$detected[] = $name;
			}
		}

		if (empty($detected)) {
			return [
				'charity_available' => false,
				'plugin' => null,
				'version' => null,
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_charity_version($plugin_name);

		return [
			'charity_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
		];
	}

	private function get_charity_version(string $plugin_name): ?string {
		if (!\function_exists('get_plugin_data')) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$slug_map = [
			'GiveWP'     => 'give',
			'Charitable' => 'charitable',
		];

		$slug = $slug_map[$plugin_name] ?? null;
		if (!$slug) {
			return null;
		}

		$plugin_file = \WP_PLUGIN_DIR . '/' . $slug . '/' . $slug . '.php';
		if (!\file_exists($plugin_file)) {
			return null;
		}

		$plugin_data = \get_plugin_data($plugin_file, false, false);
		return $plugin_data['Version'] ?? null;
	}

	private function count_donation_forms(): int {
		$state = $this->detect_charity_plugin();
		if (!$state['charity_available']) {
			return 0;
		}

		// GiveWP: post type 'give_forms'
		// Charitable: post type 'campaign'
		$post_types = ['give_forms', 'campaign'];
		$total = 0;
		foreach ($post_types as $post_type) {
			$query = new \WP_Query([
				'post_type'      => $post_type,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			]);
			$total += $query->found_posts;
		}
		return $total;
	}

	private function has_payment_gateway(): bool {
		// Check GiveWP settings
		if (\class_exists('Give')) {
			$gateways = \give_get_enabled_payment_gateways();
			return !empty($gateways);
		}
		// Check Charitable settings
		if (\class_exists('Charitable')) {
			$gateways = \charitable_get_helper('gateways')->get_active_gateways();
			return !empty($gateways);
		}
		return false;
	}

	private function has_donation_page(): bool {
		$possible_slugs = ['donate', 'donation', 'give', 'support'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_thank_you_page(): bool {
		$possible_slugs = ['thank-you', 'donation-received', 'success'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_donor_wall(): bool {
		$possible_slugs = ['donors', 'donor-wall', 'supporters'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}
}