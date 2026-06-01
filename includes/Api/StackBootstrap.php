<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

final class StackBootstrap {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	public function get_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'stack-bootstrap:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( [
			'wordpress' => [
				'version'        => \get_bloginfo( 'version' ),
				'php_version'    => PHP_VERSION,
				'is_multisite'   => \is_multisite(),
				'home_url'       => \home_url(),
				'site_url'       => \site_url(),
			],
			'elementor' => [
				'installed'   => \defined( 'ELEMENTOR_VERSION' ),
				'version'     => \defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null,
				'pro_active'  => \defined( 'ELEMENTOR_PRO_VERSION' ),
				'pro_version' => \defined( 'ELEMENTOR_PRO_VERSION' ) ? ELEMENTOR_PRO_VERSION : null,
			],
			'elementeer' => [
				'version' => \defined( 'ELEMENTEER_VERSION' ) ? ELEMENTEER_VERSION : 'unknown',
			],
			'theme' => [
				'name'    => \wp_get_theme()->get( 'Name' ),
				'version' => \wp_get_theme()->get( 'Version' ),
			],
			'active_plugins_count' => \count( \get_option( 'active_plugins', [] ) ),
		] );
	}

	public function create_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'stack-bootstrap:prepare' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$body = \json_decode( $request->get_body(), true ) ?: [];

		return new WP_REST_Response( [
			'plan'    => $body,
			'message' => 'Bootstrap plan accepted. Execute via POST /stack-bootstrap/execute.',
			'status'  => 'planned',
		] );
	}

	public function execute_plan( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'stack-bootstrap:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$body = \json_decode( $request->get_body(), true ) ?: [];

		return new WP_REST_Response( [
			'plan'    => $body,
			'message' => 'Bootstrap execution placeholder — real automated stack setup not yet implemented.',
			'status'  => 'executed',
		] );
	}
}
