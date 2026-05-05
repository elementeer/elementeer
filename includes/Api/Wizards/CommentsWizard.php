<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api\Wizards;

/**
 * Comments wizard for comment volume and moderation recommendation.
 */
final class CommentsWizard extends BaseWizard {

	public function assess_module_state(): array {
		$comment_stats = $this->get_comment_stats();
		$status = 'active'; // Most sites have comments enabled by default
		$details = [
			'comment_stats' => $comment_stats,
			'comments_enabled' => $this->are_comments_enabled(),
			'moderation_backlog' => $comment_stats['pending'] ?? 0,
			'spam_ratio' => $this->calculate_spam_ratio($comment_stats),
		];

		return [
			'status' => $status,
			'details' => $details,
		];
	}

	public function analyze_gaps(): array {
		$gaps = [];
		$comment_stats = $this->get_comment_stats();
		
		$pending = $comment_stats['pending'] ?? 0;
		if ($pending > 10) {
			$gaps[] = [
				'id' => 'moderation_backlog',
				'severity' => 'warning',
				'description' => sprintf('%d comments pending moderation.', $pending),
				'data' => ['count' => $pending],
			];
		}
		
		$spam_ratio = $this->calculate_spam_ratio($comment_stats);
		if ($spam_ratio > 0.1) { // > 10% spam
			$gaps[] = [
				'id' => 'high_spam_ratio',
				'severity' => 'warning',
				'description' => sprintf('High spam ratio: %.1f%%', $spam_ratio * 100),
				'data' => ['ratio' => $spam_ratio],
			];
		}
		
		$volume = $comment_stats['approved'] ?? 0;
		if ($volume > 50 && !$this->has_advanced_comment_system()) {
			$gaps[] = [
				'id' => 'need_advanced_comments',
				'severity' => 'info',
				'description' => 'High comment volume (>50) may benefit from advanced comment system.',
				'data' => ['volume' => $volume],
			];
		}
		
		$site_type = $this->assessment['site_purpose'] ?? 'unknown';
		if (in_array($site_type, ['portfolio', 'corporate', 'ecommerce']) && $this->are_comments_enabled()) {
			$gaps[] = [
				'id' => 'comments_may_be_unnecessary',
				'severity' => 'info',
				'description' => 'Comments may be unnecessary for ' . $site_type . ' site.',
				'data' => ['site_type' => $site_type],
			];
		}

		return $gaps;
	}

	public function generate_recommendations(): array {
		$comment_stats = $this->get_comment_stats();
		$recommendations = [];
		
		$pending = $comment_stats['pending'] ?? 0;
		if ($pending > 10) {
			$recommendations[] = [
				'id' => 'clear_moderation_backlog',
				'priority' => 'medium',
				'title' => 'Clear Moderation Backlog',
				'description' => 'Review and approve/reject pending comments.',
				'action' => 'Use WordPress Comments screen to moderate pending comments.',
				'gap_id' => 'moderation_backlog',
			];
		}
		
		$spam_ratio = $this->calculate_spam_ratio($comment_stats);
		if ($spam_ratio > 0.1) {
			$recommendations[] = [
				'id' => 'install_akismet',
				'priority' => 'high',
				'title' => 'Install Akismet Anti‑Spam',
				'description' => 'Reduce spam comments with Akismet.',
				'action' => 'Install and activate Akismet plugin.',
				'gap_id' => 'high_spam_ratio',
			];
		}
		
		$volume = $comment_stats['approved'] ?? 0;
		if ($volume > 50) {
			$recommendations[] = [
				'id' => 'consider_advanced_comment_plugin',
				'priority' => 'low',
				'title' => 'Consider Advanced Comment Plugin',
				'description' => 'High comment volume may benefit from wpDiscuz or Disqus.',
				'action' => 'Evaluate wpDiscuz (free) or Disqus (third‑party).',
				'gap_id' => 'need_advanced_comments',
			];
		}
		
		$site_type = $this->assessment['site_purpose'] ?? 'unknown';
		if (in_array($site_type, ['portfolio', 'corporate', 'ecommerce'])) {
			$recommendations[] = [
				'id' => 'consider_disabling_comments',
				'priority' => 'low',
				'title' => 'Consider Disabling Comments',
				'description' => 'Comments may not be needed for ' . $site_type . ' sites.',
				'action' => 'Disable comments site‑wide or on specific post types.',
				'gap_id' => 'comments_may_be_unnecessary',
			];
		}

		return $recommendations;
	}

	public function suggest_tools_or_plugins(): array {
		$suggested_tools = [];
		$suggested_plugins = [];
		
		$comment_stats = $this->get_comment_stats();
		$spam_ratio = $this->calculate_spam_ratio($comment_stats);
		
		if ($spam_ratio > 0.1) {
			$suggested_plugins[] = [
				'slug' => 'akismet',
				'name' => 'Akismet',
				'reason' => 'Blocks spam comments automatically.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}
		
		$volume = $comment_stats['approved'] ?? 0;
		if ($volume > 50) {
			$suggested_plugins[] = [
				'slug' => 'wpdiscuz',
				'name' => 'wpDiscuz',
				'reason' => 'Advanced comment system with threading and voting.',
				'required_capability' => 'plugin-stack-context:read',
			];
			$suggested_plugins[] = [
				'slug' => 'disqus-comment-system',
				'name' => 'Disqus',
				'reason' => 'Third‑party comment system with moderation tools.',
				'required_capability' => 'plugin-stack-context:read',
			];
		}
		
		$suggested_tools[] = [
			'tool' => 'list_post_types',
			'purpose' => 'Check which post types have comments enabled',
			'governance_level' => 'L0',
		];

		return [
			'suggested_tools' => $suggested_tools,
			'suggested_plugins' => $suggested_plugins,
		];
	}

	// Helper methods
	private function get_comment_stats(): array {
		// Placeholder - in real implementation, query wp_comments
		return [
			'approved' => 0,
			'pending' => 0,
			'spam' => 0,
			'trash' => 0,
		];
	}
	
	private function are_comments_enabled(): bool {
		return \get_option('default_comment_status') === 'open';
	}
	
	private function calculate_spam_ratio(array $stats): float {
		$approved = $stats['approved'] ?? 0;
		$spam = $stats['spam'] ?? 0;
		if ($approved + $spam === 0) {
			return 0.0;
		}
		return $spam / ($approved + $spam);
	}
	
	private function has_advanced_comment_system(): bool {
		return \is_plugin_active('wpdiscuz/class.wpdiscuz.php') ||
			\is_plugin_active('disqus-comment-system/disqus.php');
	}
}