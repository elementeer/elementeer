<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

final class PluginStackContext {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	public function get_context( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'plugin-stack-context:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( $this->build_context() );
	}

	/**
	 * Refresh plugin stack context data.
	 *
	 * Rescans active plugins, Elementor status, and WordPress environment,
	 * returning updated context identical in structure to get_context().
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function refresh( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = Auth::get_instance()->authorize( $request, 'plugin-stack-context:prepare' );
		if ( is_wp_error( $auth ) ) {
			return $auth;
		}

		return new WP_REST_Response( $this->build_context(), 200 );
	}

	private function build_context(): array {
		$all_plugins = \get_plugins();
		$active      = \get_option( 'active_plugins', [] );

		$plugins = [];
		foreach ( $all_plugins as $file => $data ) {
			$plugins[] = [
				'slug'        => \dirname( $file ),
				'name'        => $data['Name'],
				'version'     => $data['Version'],
				'author'      => $data['Author'],
				'active'      => \in_array( $file, $active, true ),
				'plugin_uri'  => $data['PluginURI'] ?? '',
			];
		}

		return [
			'plugins'       => $plugins,
			'active_count'  => \count( $active ),
			'total_count'   => \count( $all_plugins ),
			'php_version'   => PHP_VERSION,
			'wp_version'    => \get_bloginfo( 'version' ),
			'elementor'     => \defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null,
			'elementor_pro' => \defined( 'ELEMENTOR_PRO_VERSION' ) ? ELEMENTOR_PRO_VERSION : null,
		];
	}
}
