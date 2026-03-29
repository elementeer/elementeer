<?php
/**
 * Plugin Name: Elementify MCP Plugin
 * Plugin URI:  https://github.com/elementify/elementify-mcp
 * Description: AI-native REST API for Elementor template management. Exposes the Elementor library to MCP servers with capability-scoped API keys and optional governance controls.
 * Version:     0.1.0
 * Author:      Elementify
 * Author URI:  https://elementify.dev
 * License:     MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: elementify-mcp
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

declare(strict_types=1);

namespace Elementify\MCP;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( 'ELEMENTIFY_MCP_VERSION', '0.1.0' );
define( 'ELEMENTIFY_MCP_FILE', __FILE__ );
define( 'ELEMENTIFY_MCP_DIR', plugin_dir_path( __FILE__ ) );
define( 'ELEMENTIFY_MCP_URL', plugin_dir_url( __FILE__ ) );
define( 'ELEMENTIFY_MCP_OPTION_KEYS', 'elementify_mcp_api_keys' );
define( 'ELEMENTIFY_MCP_OPTION_GOVERNANCE', 'elementify_mcp_governance' );
define( 'ELEMENTIFY_MCP_OPTION_MODE', 'elementify_mcp_activation_mode' );

// Autoloader
spl_autoload_register( function ( string $class ): void {
    $prefix   = 'Elementify\\MCP\\';
    $base_dir = ELEMENTIFY_MCP_DIR . 'includes/';

    if ( str_starts_with( $class, $prefix ) ) {
        $relative = substr( $class, strlen( $prefix ) );
        $file     = $base_dir . str_replace( '\\', '/', $relative ) . '.php';
        if ( file_exists( $file ) ) {
            require $file;
        }
    }
} );

/**
 * Elementor dependency check — bail out gracefully if Elementor is inactive.
 */
add_action( 'plugins_loaded', function (): void {
    if ( ! did_action( 'elementor/loaded' ) ) {
        add_action( 'admin_notices', function (): void {
            echo '<div class="notice notice-error"><p>';
            esc_html_e(
                'Elementify MCP Plugin requires Elementor to be installed and active.',
                'elementify-mcp'
            );
            echo '</p></div>';
        } );
        return;
    }

    Plugin::get_instance()->init();
} );

// Activation / deactivation hooks
register_activation_hook( __FILE__, [ Plugin::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ Plugin::class, 'deactivate' ] );
