<?php
/**
 * Plugin Name: Elementify MCP Plugin (Minimal Test)
 * Plugin URI:  https://github.com/elementify/elementify-mcp
 * Description: Minimal test version to identify the error.
 * Version:     1.0.0-test
 * Author:      Elementify
 * Author URI:  https://elementify.dev
 * License:     GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: elementify-mcp
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

namespace Elementify\MCP;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Simple constants without WordPress functions
define( 'ELEMENTIFY_MCP_VERSION', '1.0.0-test' );
define( 'ELEMENTIFY_MCP_FILE', __FILE__ );
define( 'ELEMENTIFY_MCP_DIR', dirname( __FILE__ ) . '/' );
define( 'ELEMENTIFY_MCP_URL', plugins_url( '', __FILE__ ) );

// Minimal autoloader
spl_autoload_register( function ( $class ) {
    $prefix = 'Elementify\\MCP\\';
    $base_dir = ELEMENTIFY_MCP_DIR . 'includes/';
    
    if ( str_starts_with( $class, $prefix ) ) {
        $relative = substr( $class, strlen( $prefix ) );
        $file = $base_dir . str_replace( '\\', '/', $relative ) . '.php';
        if ( file_exists( $file ) ) {
            require $file;
        }
    }
} );

// Minimal Plugin class
if ( ! class_exists( 'Elementify\MCP\MinimalPlugin' ) ) {
    class MinimalPlugin {
        private static $instance = null;
        
        public static function get_instance() {
            if ( null === self::$instance ) {
                self::$instance = new self();
            }
            return self::$instance;
        }
        
        private function __construct() {}
        
        public function init() {
            // Register REST route
            add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
        }
        
        public function register_rest_routes() {
            register_rest_route( 'elementify/v1', '/health', array(
                'methods' => 'GET',
                'callback' => array( $this, 'health_check' ),
                'permission_callback' => '__return_true',
            ) );
        }
        
        public function health_check() {
            return array(
                'status' => 'ok',
                'version' => ELEMENTIFY_MCP_VERSION,
                'message' => 'Minimal test plugin is working',
            );
        }
    }
}

// Initialize
add_action( 'plugins_loaded', function() {
    if ( ! did_action( 'elementor/loaded' ) ) {
        // Don't show error, just don't initialize
        return;
    }
    
    MinimalPlugin::get_instance()->init();
} );

// Activation/deactivation hooks
register_activation_hook( __FILE__, function() {
    // Simple activation
} );

register_deactivation_hook( __FILE__, function() {
    // Simple deactivation
} );