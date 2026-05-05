<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * LMS recommendation wizard (LMS-003).
 *
 * Recommends LMS plugin based on site needs, checks Elementor compatibility,
 * suggests course structure based on content inventory.
 */
final class LmsWizard extends BaseWizard {

	public function assess_module_state(): array {
		$lms_status = $this->detect_lms_plugin();
		$course_count = $lms_status['lms_available'] ? $this->count_courses() : 0;

		$status = 'missing';
		if ($lms_status['lms_available']) {
			$status = $course_count > 0 ? 'active' : 'needs_configuration';
		}

		$details = [
			'lms_available' => $lms_status['lms_available'],
			'lms_plugin' => $lms_status['plugin'] ?? null,
			'lms_version' => $lms_status['version'] ?? null,
			'course_count' => $course_count,
			'elementor_compatible' => $this->check_elementor_compatibility($lms_status['plugin'] ?? null),
			'has_course_listing_page' => $this->has_course_listing_page(),
			'has_checkout_page' => $this->has_checkout_page(),
			'has_my_courses_page' => $this->has_my_courses_page(),
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

		if (!$details['lms_available']) {
			$gaps[] = [
				'id' => 'lms_missing',
				'severity' => 'warning',
				'description' => 'No LMS plugin detected. Learning management functionality unavailable.',
				'data' => [],
			];
			return $gaps;
		}

		if ($details['course_count'] === 0) {
			$gaps[] = [
				'id' => 'no_courses',
				'severity' => 'warning',
				'description' => 'No courses created yet.',
				'data' => [],
			];
		}

		if (!$details['has_course_listing_page']) {
			$gaps[] = [
				'id' => 'missing_course_listing',
				'severity' => 'critical',
				'description' => 'No course listing page detected. Students cannot browse courses.',
				'data' => [],
			];
		}

		if (!$details['has_checkout_page']) {
			$gaps[] = [
				'id' => 'missing_checkout',
				'severity' => 'critical',
				'description' => 'No checkout/payment page detected. Cannot sell courses.',
				'data' => [],
			];
		}

		if (!$details['has_my_courses_page']) {
			$gaps[] = [
				'id' => 'missing_my_courses',
				'severity' => 'warning',
				'description' => 'No "My Courses" dashboard page detected. Student experience incomplete.',
				'data' => [],
			];
		}

		if (!$details['elementor_compatible']) {
			$gaps[] = [
				'id' => 'elementor_incompatible',
				'severity' => 'info',
				'description' => 'LMS plugin may not have native Elementor widgets.',
				'data' => ['plugin' => $details['lms_plugin']],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];
		$recommendations = [];

		if (!$details['lms_available']) {
			$recommendations[] = [
				'id' => 'install_lms',
				'priority' => 'high',
				'title' => 'Install an LMS Plugin',
				'description' => 'Add learning management capabilities to your site.',
				'action' => 'Choose LearnDash (premium), Tutor LMS (freemium), or LifterLMS (freemium).',
				'gap_id' => 'lms_missing',
			];
			return $recommendations;
		}

		if ($details['course_count'] === 0) {
			$recommendations[] = [
				'id' => 'create_first_course',
				'priority' => 'high',
				'title' => 'Create Your First Course',
				'description' => 'Start building course content.',
				'action' => 'Use your LMS plugin’s course builder.',
				'gap_id' => 'no_courses',
			];
		}

		if (!$details['has_course_listing_page']) {
			$recommendations[] = [
				'id' => 'create_course_listing',
				'priority' => 'critical',
				'title' => 'Create a Course Listing Page',
				'description' => 'Students need a page to browse available courses.',
				'action' => 'Create a page with the LMS shortcode or Elementor widget.',
				'gap_id' => 'missing_course_listing',
			];
		}

		if (!$details['has_checkout_page']) {
			$recommendations[] = [
				'id' => 'create_checkout_page',
				'priority' => 'critical',
				'title' => 'Set Up Checkout/Payment',
				'description' => 'Enable course purchases with a checkout page.',
				'action' => 'Install WooCommerce and configure LMS payment integration.',
				'gap_id' => 'missing_checkout',
			];
		}

		if (!$details['has_my_courses_page']) {
			$recommendations[] = [
				'id' => 'create_my_courses_page',
				'priority' => 'medium',
				'title' => 'Create a "My Courses" Dashboard',
				'description' => 'Give students a central place to access enrolled courses.',
				'action' => 'Create a page with the LMS student dashboard shortcode.',
				'gap_id' => 'missing_my_courses',
			];
		}

		if (!$details['elementor_compatible']) {
			$recommendations[] = [
				'id' => 'add_elementor_integration',
				'priority' => 'low',
				'title' => 'Add Elementor Integration',
				'description' => 'Improve course page design with Elementor widgets.',
				'action' => 'Install the Elementor addon for your LMS plugin, if available.',
				'gap_id' => 'elementor_incompatible',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$state = $this->assess_module_state();
		$details = $state['details'];

		$suggested_tools = [];
		$suggested_plugins = [];

		if ($details['lms_available']) {
			$suggested_tools[] = [
				'tool' => 'list_courses',
				'purpose' => 'List all courses and their structure.',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'get_course_structure',
				'purpose' => 'Get detailed course lesson/topic tree.',
				'governance_level' => 'L0',
			];
		} else {
			$suggested_plugins[] = [
				'slug' => 'learndash',
				'name' => 'LearnDash',
				'reason' => 'Industry‑leading premium LMS with deep Elementor integration.',
				'required_capability' => 'lms:read',
			];
			$suggested_plugins[] = [
				'slug' => 'tutor-lms',
				'name' => 'Tutor LMS',
				'reason' => 'Freemium LMS with good Elementor compatibility.',
				'required_capability' => 'lms:read',
			];
			$suggested_plugins[] = [
				'slug' => 'lifterlms',
				'name' => 'LifterLMS',
				'reason' => 'Freemium LMS with built‑in e‑commerce.',
				'required_capability' => 'lms:read',
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

	private function detect_lms_plugin(): array {
		// Reuse detection from Lms.php
		$active = (array) \get_option('active_plugins', []);
		$active_slugs = array_map(fn($p) => \dirname($p), $active);

		$lms_slugs = [
			'sfwd-lms'       => 'LearnDash',
			'tutor'          => 'Tutor LMS',
			'lifterlms'      => 'LifterLMS',
		];

		$detected = [];
		foreach ($lms_slugs as $slug => $name) {
			if (\in_array($slug, $active_slugs, true)) {
				$detected[] = $name;
			}
		}

		if (empty($detected)) {
			return [
				'lms_available' => false,
				'plugin' => null,
				'version' => null,
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_lms_version($plugin_name);

		return [
			'lms_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
		];
	}

	private function get_lms_version(string $plugin_name): ?string {
		if (!\function_exists('get_plugin_data')) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$slug_map = [
			'LearnDash'   => 'sfwd-lms',
			'Tutor LMS'   => 'tutor',
			'LifterLMS'   => 'lifterlms',
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

	private function count_courses(): int {
		$state = $this->detect_lms_plugin();
		if (!$state['lms_available']) {
			return 0;
		}

		// Generic WP_Query for posts of type 'course' (LearnDash, Tutor, LifterLMS)
		$query = new \WP_Query([
			'post_type'      => 'course',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
		]);

		return $query->found_posts;
	}

	private function check_elementor_compatibility(?string $plugin): bool {
		if (!$plugin) {
			return false;
		}

		// Known Elementor integrations
		$compatible_plugins = [
			'LearnDash'  => class_exists('\LearnDash_Elementor\LearnDash_Elementor'),
			'Tutor LMS'  => defined('TUTOR_ELEMENTOR_VERSION'),
			'LifterLMS'  => defined('LLMS_ELEMENTOR_VERSION'),
		];

		return $compatible_plugins[$plugin] ?? false;
	}

	private function has_course_listing_page(): bool {
		// Look for a page containing LMS shortcode or with a specific slug
		$possible_slugs = ['courses', 'course-list', 'all-courses'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_checkout_page(): bool {
		// Check for WooCommerce checkout page
		if (\function_exists('wc_get_page_id') && \wc_get_page_id('checkout') > 0) {
			return true;
		}
		// Check for LMS-specific checkout page
		$possible_slugs = ['checkout', 'purchase', 'buy-course'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}

	private function has_my_courses_page(): bool {
		$possible_slugs = ['my-courses', 'dashboard', 'student-dashboard'];
		foreach ($possible_slugs as $slug) {
			$page = \get_page_by_path($slug);
			if ($page && $page->post_status === 'publish') {
				return true;
			}
		}
		return false;
	}
}