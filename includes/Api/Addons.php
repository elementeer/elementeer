<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;
use Elementeer\MCP\Addons\Registry;

final class Addons {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	public function list_addons( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$registry = Registry::get_instance();
		$addons   = $registry->get_addons();

		$response = [];
		foreach ( $addons as $slug => $data ) {
			$response[] = [
				'slug'         => $slug,
				'label'        => $data['label'],
				'version'      => $data['version'],
				'capabilities' => $data['capabilities'],
			];
		}

		return new WP_REST_Response( [
			'addons' => $response,
			'total'  => count( $response ),
		] );
	}

	public function list_detailed( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'addon-analysis:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$registry = Registry::get_instance();
		$addons   = $registry->get_addons();

		$response = [];
		foreach ( $addons as $slug => $data ) {
			$plugin = $this->get_plugin_info( $slug );

			$response[] = [
				'slug'         => $slug,
				'label'        => $data['label'],
				'version'      => $data['version'],
				'capabilities' => $data['capabilities'],
				'registered_at' => $data['registered_at'],
				'plugin'       => $plugin,
				'widgets'      => $this->detect_widgets( $slug ),
			];
		}

		return new WP_REST_Response( [
			'addons' => $response,
			'total'  => count( $response ),
		] );
	}

	private function get_plugin_info( string $slug ): ?array {
		$plugin_slugs = [
			'voxel'                     => 'voxel/voxel.php',
			'essential-addons'          => 'essential-addons-for-elementor-lite/essential_adons_elementor.php',
			'elementskit'               => 'elementskit-lite/elementskit.php',
			'powerpack'                 => 'powerpack-lite-for-elementor/powerpack-lite-elementor.php',
			'premium-addons'            => 'premium-addons-for-elementor/premium-addons-for-elementor.php',
			'happy-addons'              => 'happy-elementor-addons/happy-elementor-addons.php',
			'the-plus-addons'           => 'the-plus-addons-for-elementor-page-builder/theplus_elementor_addon.php',
			'ultimate-addons'           => 'ultimate-elementor/ultimate-elementor.php',
		];

		$plugin_file = $plugin_slugs[ $slug ] ?? null;
		if ( ! $plugin_file ) {
			return null;
		}

		if ( ! \function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_path = WP_PLUGIN_DIR . '/' . $plugin_file;
		if ( ! file_exists( $plugin_path ) ) {
			return [
				'installed' => false,
				'active'    => false,
				'name'      => null,
				'version'   => null,
			];
		}

		$data = \get_plugin_data( $plugin_path, false, false );

		return [
			'installed' => true,
			'active'    => \is_plugin_active( $plugin_file ),
			'name'      => $data['Name'],
			'version'   => $data['Version'],
		];
	}

	private function detect_widgets( string $slug ): array {
		$prefixes = [
			'essential-addons' => 'eael',
			'elementskit'      => 'ekit',
			'powerpack'        => 'pp',
			'premium-addons'   => 'premium',
			'happy-addons'     => 'happy',
			'the-plus-addons'  => 'tp',
			'ultimate-addons'  => 'uael',
		];

		$prefix = $prefixes[ $slug ] ?? null;
		if ( ! $prefix ) {
			return [];
		}

		$widgets = [];
		$base_class = '\\Elementor\\Widget_Base';

		foreach ( \get_declared_classes() as $class ) {
			if ( \is_subclass_of( $class, $base_class ) ) {
				$short_name = ( new \ReflectionClass( $class ) )->getShortName();
				if ( \stripos( $short_name, $prefix ) === 0 ) {
					$widgets[] = $short_name;
				}
			}
		}

		return $widgets;
	}
}
