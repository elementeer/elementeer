<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Api\Adapters\AddonRegistry;

/**
 * REST controller for Elementor add‑on detection and inventory.
 */
final class Addons {

	/**
	 * List all active Elementor add‑ons with basic metadata.
	 *
	 * GET /wp-json/elementify/v1/addons
	 */
	public function list_addons( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = Auth::get_instance()->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$registry = AddonRegistry::get_instance();
		$addons   = $registry->get_active_addons();

		return new WP_REST_Response( $addons, 200 );
	}

	/**
	 * Get detailed information for all active add‑ons (widgets, post types, etc.).
	 *
	 * GET /wp-json/elementify/v1/addons/detailed
	 */
	public function list_detailed( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = Auth::get_instance()->authorize( $request, 'site-audit:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$registry = AddonRegistry::get_instance();
		$info     = $registry->get_all_info();

		return new WP_REST_Response( $info, 200 );
	}
}