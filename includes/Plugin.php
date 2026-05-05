<?php

declare(strict_types=1);

namespace Elementify\MCP;

use Elementify\MCP\Admin\Page;
use Elementify\MCP\Api\Router;
use Elementify\MCP\Activation\Mode;
use Elementify\MCP\Auth\Capabilities;

/**
 * Main plugin singleton.
 */
final class Plugin {

    private static ?self $instance = null;

    private function __construct() {}

    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Boot the plugin — called after Elementor is confirmed active.
     */
    public function init(): void {
        // Detect and persist activation mode
        Mode::get_instance()->detect();

        // Register REST API routes
        \add_action( 'rest_api_init', [ Router::class, 'register' ] );

        // Admin menu - use priority 99 to ensure Elementor's menu is registered first
        if ( \is_admin() ) {
            \add_action( 'admin_menu', [ Page::class, 'register_menu' ], 99 );
        }

        // Load text domain
        \add_action( 'init', function (): void {
            \load_plugin_textdomain( 'elementify', false, dirname( \plugin_basename( ELEMENTIFY_MCP_FILE ) ) . '/languages' );
        } );
    }

    /**
     * Runs on plugin activation.
     */
    public static function activate(): void {
        // Seed default governance settings if not already set
        if ( false === \get_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE ) ) {
            \update_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE, [
                'allowed_capabilities' => Capabilities::default_governance_allowed(),
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
     * Runs on plugin deactivation.
     */
    public static function deactivate(): void {
        \flush_rewrite_rules();
    }
}
