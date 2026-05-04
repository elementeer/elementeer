<?php
/**
 * Plugin Name: Elementify - WordPress/Elementor AI Development Platform
 * Plugin URI:  https://github.com/elementify/elementify-mcp
 * Description: Complete WordPress/Elementor AI development platform with enhanced API, intelligent composition, workflow staging, governance systems, and MCP integration.
 * Version:     2.0.0
 * Author:      Elementify
 * Author URI:  https://elementify.dev
 * License:     GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
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

// ======================================================================
// 1. CONSTANTS
// ======================================================================

// Plugin constants - using WordPress functions when available, fallback otherwise
define( 'ELEMENTIFY_MCP_VERSION', '2.0.0' );
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

// ======================================================================
// 2. AUTOLOADER - ROBUST WITH FALLBACK
// ======================================================================

/**
 * Robust autoloader implementation with Composer fallback
 */
$elementify_autoloader_loaded = false;

// Try Composer autoloader first
$composer_autoload = __DIR__ . '/vendor/autoload.php';
if ( file_exists( $composer_autoload ) ) {
    try {
        require_once $composer_autoload;
        $elementify_autoloader_loaded = true;
    } catch ( \Throwable $e ) {
        // Composer autoloader failed, fall back to custom autoloader
        error_log( 'Elementify MCP: Composer autoloader failed: ' . $e->getMessage() );
    }
}

// If Composer autoloader not loaded, register our own
if ( ! $elementify_autoloader_loaded ) {
    spl_autoload_register( function ( string $class ): void {
        $prefix   = 'Elementify\\MCP\\';
        $base_dir = ELEMENTIFY_MCP_DIR . 'includes/';
        
        // Does the class use the plugin namespace?
        $len = strlen( $prefix );
        if ( strncmp( $prefix, $class, $len ) !== 0 ) {
            return; // Not our class
        }
        
        // Get the relative class name
        $relative_class = substr( $class, $len );
        
        // Replace namespace separators with directory separators
        $file = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';
        
        // If the file exists, require it
        if ( file_exists( $file ) ) {
            require $file;
        }
    } );
}

// ======================================================================
// 3. PLUGIN BOOTSTRAP
// ======================================================================

/**
 * Bootstrap the plugin after WordPress and Elementor are loaded
 */
function elementify_mcp_bootstrap(): void {
    // Check if Elementor is active
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
    
    // Initialize the plugin
    try {
        Plugin::get_instance()->init();
    } catch ( \Throwable $e ) {
        error_log( 'Elementify MCP Plugin initialization failed: ' . $e->getMessage() );
        add_action( 'admin_notices', function () use ( $e ): void {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>Elementify MCP Plugin Error:</strong> ';
            esc_html_e( 'Plugin failed to initialize. Check error logs for details.', 'elementify-mcp' );
            echo '</p></div>';
        } );
    }
}

/**
 * Plugin activation handler
 */
function elementify_mcp_activate(): void {
    // Seed default governance settings if not already set
    if ( false === \get_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE ) ) {
        // We need the Capabilities class - ensure autoloader is ready
        if ( class_exists( 'Elementify\\MCP\\Auth\\Capabilities' ) ) {
            $default_caps = \Elementify\MCP\Auth\Capabilities::default_governance_allowed();
        } else {
            // Fallback default capabilities
            $default_caps = [
                'site-audit:read',
                'stack-bootstrap:read',
                'stack-bootstrap:prepare',
                'stack-bootstrap:write',
                'site-foundation:read',
                'site-foundation:write',
                'design-system:read',
                'design-system:write',
                'content-structure:read',
                'content-structure:write',
                'theme-structure:read',
                'theme-structure:write',
                'library-operations:read',
                'library-operations:write',
                'library-operations:import',
                'library-operations:export',
                'media-operations:read',
                'media-operations:write',
                'plugin-stack-context:read',
                'plugin-stack-context:prepare',
                'governance:read',
                'governance:review',
                'governance:apply',
                'governance:write',
                'governance:queue',
                'workflow-orchestration:read',
                'workflow-orchestration:prepare',
                'workflow-orchestration:write',
                'site-settings:read',
                'site-settings:write',
                'seo-operations:read',
                'seo-operations:write',
                'performance-operations:read',
                'performance-operations:write',
                'ecommerce-operations:read',
                'ecommerce-operations:write',
                'ally:read',
                'ally:trigger',
                'translate:read',
                'translate:write',
                'lms:read',
                'charity:read',
                'booking:read',
                'booking:write',
                'diagnostics:read',
                'diagnostics:write',
            ];
        }
        
        \update_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE, [
            'allowed_capabilities' => $default_caps,
            'require_approval'   => false,
            'audit_log_enabled'  => true,
            'max_keys'           => 10,
        ] );
    }
    
    // Seed empty keys array
    if ( false === \get_option( ELEMENTIFY_MCP_OPTION_KEYS ) ) {
        \update_option( ELEMENTIFY_MCP_OPTION_KEYS, [] );
    }
    
    \flush_rewrite_rules();
}

/**
 * Plugin deactivation handler
 */
function elementify_mcp_deactivate(): void {
    \flush_rewrite_rules();
}

// ======================================================================
// 4. HOOK REGISTRATION
// ======================================================================

// Register activation/deactivation hooks
if ( function_exists( 'register_activation_hook' ) ) {
    \register_activation_hook( __FILE__, 'elementify_mcp_activate' );
}
if ( function_exists( 'register_deactivation_hook' ) ) {
    \register_deactivation_hook( __FILE__, 'elementify_mcp_deactivate' );
}

// Bootstrap plugin after all plugins are loaded
if ( function_exists( 'add_action' ) ) {
    \add_action( 'plugins_loaded', 'elementify_mcp_bootstrap' );
}

// ======================================================================
// 5. DEBUG HELPER (only in development)
// ======================================================================
if ( defined( 'WP_DEBUG' ) && WP_DEBUG && ! defined( 'ELEMENTIFY_MCP_NO_DEBUG' ) ) {
    add_action( 'admin_bar_menu', function ( $wp_admin_bar ) {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        
        $wp_admin_bar->add_node( [
            'id'    => 'elementify-debug',
            'title' => 'Elementify v' . ELEMENTIFY_MCP_VERSION,
            'href'  => admin_url( 'admin.php?page=elementify-mcp' ),
            'meta'  => [ 'class' => 'elementify-debug-node' ],
        ] );
    }, 100 );
}