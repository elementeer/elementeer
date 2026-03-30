<?php

declare(strict_types=1);

/**
 * PHPUnit bootstrap for Elementify MCP plugin tests.
 *
 * Uses Brain\Monkey to provide WordPress function stubs without loading
 * the full WordPress stack. This enables fast, isolated unit tests.
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

// Load WordPress class/function stubs so tests run without a real WP install
foreach ( glob( __DIR__ . '/Stubs/*.php' ) ?: [] as $stub ) {
    require_once $stub;
}

// Define plugin constants that the source code depends on
if ( ! defined( 'ELEMENTIFY_MCP_OPTION_KEYS' ) ) {
    define( 'ELEMENTIFY_MCP_OPTION_KEYS', 'elementify_mcp_api_keys' );
}
if ( ! defined( 'ELEMENTIFY_MCP_OPTION_GOVERNANCE' ) ) {
    define( 'ELEMENTIFY_MCP_OPTION_GOVERNANCE', 'elementify_mcp_governance' );
}
if ( ! defined( 'ELEMENTIFY_MCP_OPTION_MODE' ) ) {
    define( 'ELEMENTIFY_MCP_OPTION_MODE', 'elementify_mcp_activation_mode' );
}
if ( ! defined( 'ELEMENTIFY_MCP_VERSION' ) ) {
    define( 'ELEMENTIFY_MCP_VERSION', '0.2.0' );
}

// WordPress i18n function stubs — Brain\Monkey sets up interceptors but the
// global functions must exist before the source files are parsed.
if ( ! function_exists( '__' ) ) {
    function __( string $text, string $domain = 'default' ): string { return $text; }
}
if ( ! function_exists( '_e' ) ) {
    function _e( string $text, string $domain = 'default' ): void { echo $text; }
}
if ( ! function_exists( 'esc_html__' ) ) {
    function esc_html__( string $text, string $domain = 'default' ): string { return htmlspecialchars( $text, ENT_QUOTES ); }
}
if ( ! function_exists( 'esc_html_e' ) ) {
    function esc_html_e( string $text, string $domain = 'default' ): void { echo htmlspecialchars( $text, ENT_QUOTES ); }
}
if ( ! function_exists( 'esc_attr__' ) ) {
    function esc_attr__( string $text, string $domain = 'default' ): string { return htmlspecialchars( $text, ENT_QUOTES ); }
}

// Brain\Monkey setUp/tearDown is handled per-test in TestCase base
// (tests should call Brain\Monkey\setUp() in setUp() and tearDown() in tearDown())
