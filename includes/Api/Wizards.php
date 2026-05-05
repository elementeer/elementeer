<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;
use Elementeer\MCP\Api\Wizards\BaseWizard;

/**
 * REST controller for module wizards.
 *
 * GET /site/wizards/{wizard_id}
 *
 * Returns the analysis result for a specific module wizard.
 */
final class Wizards {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	/**
	 * Get wizard analysis by ID.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_wizard( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$wizard_id = $request->get_param( 'wizard_id' );
		$auth = $this->auth->authorize( $request, 'plugin-stack-context:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		// Get cached assessment data (in a real implementation, this would come from a transient)
		// Get cached assessment data
		$assessment = $this->get_cached_assessment();

		// Map wizard ID to class name
		$class_map = [
			'acf'      => 'AcfWizard',
			'forms'    => 'FormsWizard',
			'comments' => 'CommentsWizard',
			'multi'    => 'MultilingualWizard',
			'plugin'   => 'PluginWizard',
			'export'   => 'ExportWizard',
			'health'   => 'HealthWizard',
			'ally'     => 'AllyWizard',
			'lms'      => 'LmsWizard',
			'charity'  => 'CharityWizard',
			'booking'  => 'BookingWizard',
		];

		if ( ! isset( $class_map[ $wizard_id ] ) ) {
			return new WP_Error(
				'elementeer_wizard_not_found',
				\sprintf( 'Wizard "%s" does not exist.', $wizard_id ),
				[ 'status' => 404 ]
			);
		}

		$class_name = 'Elementify\\MCP\\Api\\Wizards\\' . $class_map[ $wizard_id ];

		// Check if the wizard class exists
		if ( ! \class_exists( $class_name ) ) {
			// Return placeholder result
			return new WP_REST_Response( $this->get_placeholder_result( $wizard_id, $assessment ), 200 );
		}

		// Instantiate and run the wizard
		try {
			$wizard = new $class_name( $assessment );
			$result = $wizard->run();
			return new WP_REST_Response( $result, 200 );
		} catch ( \Exception $e ) {
			return new WP_Error(
				'elementeer_wizard_error',
				\sprintf( 'Wizard "%s" failed: %s', $wizard_id, $e->getMessage() ),
				[ 'status' => 500 ]
			);
		}
	}

	/**
	 * Generate a placeholder result for wizards not yet implemented.
	 *
	 * @param string $wizard_id
	 * @param array $assessment
	 * @return array
	 */
	private function get_placeholder_result( string $wizard_id, array $assessment ): array {
		$label = \ucfirst( $wizard_id );
		return [
			'status' => 'missing',
			'gaps' => [
				[
					'id' => 'implementation_pending',
					'severity' => 'warning',
					'description' => "The {$label} wizard is not yet implemented.",
					'data' => [ 'wizard_id' => $wizard_id ],
				],
			],
			'recommendations' => [
				[
					'id' => 'implement_wizard',
					'priority' => 'medium',
					'title' => "Implement {$label} Wizard",
					'description' => "Complete the PHP implementation for the {$label} wizard.",
					'action' => "Create Api/Wizards/{$label}Wizard.php extending BaseWizard.",
					'gap_id' => 'implementation_pending',
				],
			],
			'suggested_tools' => [],
			'suggested_plugins' => [],
		];
	}
	/**
	 * Get cached assessment data from transient or fresh from Assessment API.
	 *
	 * @return array
	 */
	private function get_cached_assessment(): array {
		$transient_key = "elementeer_assessment_cache";
		$cached = \get_transient( $transient_key );
		
		if ( $cached !== false ) {
			return (array) $cached;
		}
		
		// No cached data, fetch fresh assessment
		$assessment_api = new Assessment();
		$assessment = $assessment_api->get_assessment();
		
		// Cache for 1 hour
		\set_transient( $transient_key, $assessment, HOUR_IN_SECONDS );
		
		return $assessment;
	}
}