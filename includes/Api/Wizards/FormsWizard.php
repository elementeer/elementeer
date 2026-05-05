<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * Forms wizard for form plugin recommendation.
 */
final class FormsWizard extends BaseWizard {

	public function assess_module_state(): array {
		$forms_plugins = $this->get_forms_plugins();
		$has_forms = !empty($forms_plugins);
		$status = $has_forms ? 'active' : 'missing';
		$details = [
			'forms_plugins' => $forms_plugins,
			'forms_count' => $this->estimate_forms_count(),
			'submission_rate' => $this->estimate_submission_rate(),
			'spam_ratio' => $this->estimate_spam_ratio(),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$forms_plugins = $this->get_forms_plugins();

		if (empty($forms_plugins)) {
			$gaps[] = [
				'id' => 'no_forms_plugin',
				'severity' => 'warning',
				'description' => 'No form plugin detected. Site cannot collect user input via forms.',
				'data' => [],
			];
			return $gaps;
		}

		// Check for anti-spam
		$has_anti_spam = $this->has_anti_spam();
		if (!$has_anti_spam) {
			$gaps[] = [
				'id' => 'no_anti_spam',
				'severity' => 'warning',
				'description' => 'No anti-spam solution detected. Forms may receive spam submissions.',
				'data' => [],
			];
		}

		// Check for marketing integrations
		$has_marketing = $this->has_marketing_integration();
		if (!$has_marketing) {
			$gaps[] = [
				'id' => 'no_marketing_integration',
				'severity' => 'info',
				'description' => 'No marketing integration (MailChimp, HubSpot) detected.',
				'data' => [],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$forms_plugins = $this->get_forms_plugins();
		$recommendations = [];

		if (empty($forms_plugins)) {
			$recommendations[] = [
				'id' => 'install_forms_plugin',
				'priority' => 'high',
				'title' => 'Install a Form Plugin',
				'description' => 'Choose a form plugin to enable contact forms, surveys, and lead capture.',
				'action' => 'Evaluate Contact Form 7, WPForms, Gravity Forms, or Elementor Forms.',
				'gap_id' => 'no_forms_plugin',
			];
			return $recommendations;
		}

		if (!$this->has_anti_spam()) {
			$recommendations[] = [
				'id' => 'add_anti_spam',
				'priority' => 'medium',
				'title' => 'Add Anti‑Spam Protection',
				'description' => 'Reduce spam submissions with Akismet, reCAPTCHA, or a dedicated anti‑spam plugin.',
				'action' => 'Install and configure Akismet or enable Google reCAPTCHA.',
				'gap_id' => 'no_anti_spam',
			];
		}

		if (!$this->has_marketing_integration()) {
			$recommendations[] = [
				'id' => 'add_marketing_integration',
				'priority' => 'low',
				'title' => 'Connect Forms to Marketing',
				'description' => 'Sync form submissions with your email marketing or CRM platform.',
				'action' => 'Install integration for MailChimp, HubSpot, or ActiveCampaign.',
				'gap_id' => 'no_marketing_integration',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];

		$forms_plugins = $this->get_forms_plugins();
		if (empty($forms_plugins)) {
			$suggested_plugins[] = [
				'slug' => 'contact-form-7',
				'name' => 'Contact Form 7',
				'reason' => 'Lightweight, widely used contact form plugin.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'wpforms-lite',
				'name' => 'WPForms Lite',
				'reason' => 'User‑friendly drag‑and‑drop form builder.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'gravityforms',
				'name' => 'Gravity Forms',
				'reason' => 'Advanced forms with conditional logic and payments.',
				'required_capability' => 'plugin-stack-context:read',
			];
		} else {
			$suggested_tools[] = [
				'tool' => 'list_elementor_pages',
				'purpose' => 'Find pages with existing forms to optimize',
				'governance_level' => 'L0',
			];
			$suggested_tools[] = [
				'tool' => 'update_page_data',
				'purpose' => 'Replace legacy forms with Elementor Forms',
				'governance_level' => 'L2',
			];
		}

		// Anti-spam recommendation
		$suggested_plugins[] = [
			'slug' => 'akismet',
			'name' => 'Akismet',
			'reason' => 'Blocks spam form submissions and comments.',
			'required_capability' => 'plugin-stack-context:read',
		];

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_forms_plugins(): array {
		return $this->assessment['plugins']['classified']['forms'] ?? [];
	}

	private function estimate_forms_count(): int {
		// Placeholder: could query posts with form shortcodes or custom post types
		return 0;
	}

	private function estimate_submission_rate(): ?float {
		// Placeholder: could retrieve from form plugin stats
		return null;
	}

	private function estimate_spam_ratio(): ?float {
		// Placeholder
		return null;
	}

	private function has_anti_spam(): bool {
		// Check for Akismet, reCAPTCHA, etc.
		return \is_plugin_active('akismet/akismet.php') || \is_plugin_active('google-captcha/google-captcha.php');
	}

	private function has_marketing_integration(): bool {
		// Check for MailChimp, HubSpot plugins
		return \is_plugin_active('mailchimp-for-wp/mailchimp-for-wp.php') ||
			\is_plugin_active('hubspot-tracking-code/hubspot-tracking-code.php');
	}
}