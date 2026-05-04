<?php
/**
 * Plugin Name: Elementify
 * Plugin URI:  https://github.com/elementify/elementify-mcp
 * Description: Complete WordPress/Elementor AI development platform with enhanced API, intelligent composition, workflow staging, governance systems, and MCP integration.
 * Version:     2.0.1
 * Author:      Elementify
 * Author URI:  https://elementify.dev
 * License:     GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: elementify
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

declare(strict_types=1);

namespace Elementify\MCP;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Load Composer autoloader
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// Plugin constants - using WordPress functions when available, fallback otherwise
define( 'ELEMENTIFY_MCP_VERSION', '2.0.1' );
define( 'ELEMENTIFY_MCP_FILE', __FILE__ );

// Define ELEMENTIFY_MCP_DIR safely
if ( function_exists( 'plugin_dir_path' ) ) {
    define( 'ELEMENTIFY_MCP_DIR', \plugin_dir_path( __FILE__ ) );
} else {
    define( 'ELEMENTIFY_MCP_DIR', dirname( __FILE__ ) . '/' );
}

// Define ELEMENTIFY_MCP_URL safely  
if ( function_exists( 'plugin_dir_url' ) ) {
    define( 'ELEMENTIFY_MCP_URL', \plugin_dir_url( __FILE__ ) );
} elseif ( function_exists( 'plugins_url' ) ) {
    define( 'ELEMENTIFY_MCP_URL', \plugins_url( '', __FILE__ ) );
} else {
    define( 'ELEMENTIFY_MCP_URL', '' );
}

define( 'ELEMENTIFY_MCP_OPTION_KEYS', 'elementify_mcp_api_keys' );
define( 'ELEMENTIFY_MCP_OPTION_GOVERNANCE', 'elementify_mcp_governance' );
define( 'ELEMENTIFY_MCP_OPTION_MODE', 'elementify_mcp_activation_mode' );

// Autoloader for our classes
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
if ( function_exists( 'add_action' ) ) {
    \add_action( 'plugins_loaded', function (): void {
        if ( ! \did_action( 'elementor/loaded' ) ) {
            \add_action( 'admin_notices', function (): void {
                echo '<div class="notice notice-error"><p>';
                if ( function_exists( 'esc_html_e' ) ) {
                    \esc_html_e(
                         'Elementify MCP Plugin requires Elementor to be installed and active.',
                        'elementify'
                    );
                } else {
                    echo 'Elementify MCP Plugin requires Elementor to be installed and active.';
                }
                echo '</p></div>';
            } );
            return;
        }

        Plugin::get_instance()->init();
    } );
}

// Activation / deactivation hooks
if ( function_exists( 'register_activation_hook' ) ) {
    \register_activation_hook( __FILE__, [ Plugin::class, 'activate' ] );
}
if ( function_exists( 'register_deactivation_hook' ) ) {
    \register_deactivation_hook( __FILE__, [ Plugin::class, 'deactivate' ] );
}
