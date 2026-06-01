<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;
use Elementeer\MCP\Addons\Registry;

final class AddonSpecific {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	public function get_addon( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$slug     = $request->get_param( 'plugin_slug' );
		$registry = Registry::get_instance();
		$addon    = $registry->get_addon( $slug );

		if ( ! $addon ) {
			return new WP_Error(
				'addon_not_found',
				\sprintf( 'Addon "%s" is not registered.', $slug ),
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( $addon );
	}

	public function get_addon_widgets( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$slug     = $request->get_param( 'plugin_slug' );
		$addon    = Registry::get_instance()->get_addon( $slug );

		if ( ! $addon ) {
			return new WP_Error(
				'addon_not_found',
				\sprintf( 'Addon "%s" is not registered.', $slug ),
				[ 'status' => 404 ]
			);
		}

		$widgets = [];
		foreach ( $addon['capabilities'] ?? [] as $cap ) {
			if ( \str_starts_with( $cap, $slug . ':' ) ) {
				$widget_key = \substr( $cap, \strlen( $slug ) + 1 );
				$widgets[]  = [
					'id'     => $cap,
					'name'   => $widget_key,
					'enabled' => true,
				];
			}
		}

		return new WP_REST_Response( [
			'slug'    => $slug,
			'widgets' => $widgets,
		] );
	}

	public function get_addon_post_types( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$slug  = $request->get_param( 'plugin_slug' );
		$addon = Registry::get_instance()->get_addon( $slug );

		if ( ! $addon ) {
			return new WP_Error(
				'addon_not_found',
				\sprintf( 'Addon "%s" is not registered.', $slug ),
				[ 'status' => 404 ]
			);
		}

		$post_types = [];
		$all_pt     = \get_post_types( [ 'public' => true ], 'objects' );

		$slug_pt_map = [
			'voxel' => [ 'listing', 'profile', 'collection' ],
		];

		$relevant = $slug_pt_map[ $slug ] ?? [];

		foreach ( $all_pt as $pt_name => $pt ) {
			if ( \in_array( $pt_name, $relevant, true ) ) {
				$post_types[] = [
					'name'        => $pt_name,
					'label'       => $pt->label,
					'description' => $pt->description,
				];
			}
		}

		return new WP_REST_Response( [
			'slug'       => $slug,
			'post_types' => $post_types,
		] );
	}

	public function get_addon_capabilities( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$slug  = $request->get_param( 'plugin_slug' );
		$addon = Registry::get_instance()->get_addon( $slug );

		return new WP_REST_Response( [
			'slug'         => $slug,
			'capabilities' => $addon['capabilities'] ?? [],
		] );
	}

	public function toggle_widget( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$slug      = $request->get_param( 'plugin_slug' );
		$widget_id = $request->get_param( 'widget_id' );
		$enable    = $request->get_param( 'enable' );

		$addon = Registry::get_instance()->get_addon( $slug );
		if ( ! $addon ) {
			return new WP_Error(
				'addon_not_found',
				\sprintf( 'Addon "%s" is not registered.', $slug ),
				[ 'status' => 404 ]
			);
		}

		return new WP_REST_Response( [
			'slug'      => $slug,
			'widget_id' => $widget_id,
			'enabled'   => $enable ?? true,
			'message'   => 'Toggle placeholder — real plugin toggle not yet implemented.',
		] );
	}
}
