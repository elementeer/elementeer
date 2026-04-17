<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Wizards;

/**
 * Test wizard for verifying BaseWizard architecture.
 */
final class TestWizard extends BaseWizard {

	public function assess_module_state(): array {
		return [
			'status' => 'active',
			'details' => [
				'test' => true,
				'assessment_data_present' => ! empty( $this->assessment ),
			],
		];
	}

	public function analyze_gaps(): array {
		return [
			[
				'id' => 'test_gap',
				'severity' => 'info',
				'description' => 'Test wizard is working correctly.',
				'data' => [ 'sample' => 'data' ],
			],
		];
	}

	public function generate_recommendations(): array {
		return [
			[
				'id' => 'test_recommendation',
				'priority' => 'low',
				'title' => 'Test Recommendation',
				'description' => 'This is a test recommendation from the TestWizard.',
				'action' => 'No action required.',
				'gap_id' => 'test_gap',
			],
		];
	}

	public function suggest_tools_or_plugins(): array {
		return [
			'suggested_tools' => [
				[
					'tool' => 'wizard_test',
					'purpose' => 'Test the wizard architecture',
					'governance_level' => 'L0',
				],
			],
			'suggested_plugins' => [
				[
					'slug' => 'elementify-mcp/elementify-mcp.php',
					'name' => 'Elementify MCP',
					'reason' => 'Already installed and active',
					'required_capability' => 'plugin-stack-context:read',
				],
			],
		];
	}
}