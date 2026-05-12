<?php
/**
 * Plugin Name: Elementeer
 * Plugin URI: https://git.langevc.com/elementeer/elementeer
 * Description: The agent-native Elementor growth layer. Complete WordPress/Elementor AI platform with AI-native REST API, Theme Builder management, intelligent composition, workflow staging, and governance. Route preflight, route discovery, structural validation, and mass export included.
 * Version: 2.1.4
 * Author:      Elementeer
 * Author URI: https://elementeer.xyz
 * License:     GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: elementeer
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

declare(strict_types=1);

namespace Elementeer\MCP;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Load Composer autoloader
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// Plugin constants - using WordPress functions when available, fallback otherwise
define( 'ELEMENTEER_MCP_VERSION', '2.1.4' );
define( 'ELEMENTEER_MCP_FILE', __FILE__ );

// Define ELEMENTEER_MCP_DIR safely
if ( function_exists( 'plugin_dir_path' ) ) {
    define( 'ELEMENTEER_MCP_DIR', \plugin_dir_path( __FILE__ ) );
} else {
    define( 'ELEMENTEER_MCP_DIR', dirname( __FILE__ ) . '/' );
}

// Define ELEMENTEER_MCP_URL safely  
if ( function_exists( 'plugin_dir_url' ) ) {
    define( 'ELEMENTEER_MCP_URL', \plugin_dir_url( __FILE__ ) );
} elseif ( function_exists( 'plugins_url' ) ) {
    define( 'ELEMENTEER_MCP_URL', \plugins_url( '', __FILE__ ) );
} else {
    define( 'ELEMENTEER_MCP_URL', '' );
}

define( 'ELEMENTEER_MCP_OPTION_KEYS', 'elementeer_mcp_api_keys' );
define( 'ELEMENTEER_MCP_OPTION_GOVERNANCE', 'elementeer_mcp_governance' );
define( 'ELEMENTEER_MCP_OPTION_MODE', 'elementeer_mcp_activation_mode' );

// Autoloader for our classes
spl_autoload_register( function ( string $class ): void {
    $prefix   = 'Elementeer\\MCP\\';
    $base_dir = ELEMENTEER_MCP_DIR . 'includes/';

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
if ( function_exists( 'add_action' ) ) {
    \add_action( 'plugins_loaded', function (): void {
        if ( ! \did_action( 'elementor/loaded' ) ) {
            \add_action( 'admin_notices', function (): void {
                echo '<div class="notice notice-error"><p>';
                if ( function_exists( 'esc_html_e' ) ) {
                    \esc_html_e(
                         'Elementeer MCP Plugin requires Elementor to be installed and active.',
                        'elementeer'
                    );
                } else {
                    echo 'Elementeer MCP Plugin requires Elementor to be installed and active.';
                }
                echo '</p></div>';
            } );
            return;
        }

        \Elementeer\MCP\Plugin::get_instance()->init();
    } );
}

// Activation / deactivation hooks
if ( function_exists( 'register_activation_hook' ) ) {
    \register_activation_hook( __FILE__, [ \Elementeer\MCP\Plugin::class, 'activate' ] );
}
if ( function_exists( 'register_deactivation_hook' ) ) {
    \register_deactivation_hook( __FILE__, [ \Elementeer\MCP\Plugin::class, 'deactivate' ] );
}
