<?php

declare(strict_types=1);

/**
 * PHPUnit bootstrap for Elementify MCP plugin tests.
 *
 * Uses Brain\Monkey to provide WordPress function stubs without loading
 * the full WordPress stack. This enables fast, isolated unit tests.
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

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
    define( 'ELEMENTIFY_MCP_VERSION', '0.1.0' );
}

// Brain\Monkey setUp/tearDown is handled per-test in TestCase base
// (tests should call Brain\Monkey\setUp() in setUp() and tearDown() in tearDown())
