<?php

declare(strict_types=1);

/**
 * PHPUnit bootstrap for Elementify MCP plugin tests.
 *
 * Uses Brain\Monkey to provide WordPress function stubs without loading
 * the full WordPress stack. This enables fast, isolated unit tests.
 */

// Patchwork MUST be loaded before any WP function stubs are defined so it can
// intercept them later via Brain\Monkey. Loading it explicitly here (before the
// autoloader) guarantees correct ordering regardless of composer files order.
require_once dirname(__DIR__) . '/vendor/antecedent/patchwork/Patchwork.php';

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

// WordPress i18n stubs — loaded from a separate file so Patchwork's stream
// wrapper can intercept the load and mark them as patchable for Brain\Monkey.
require_once __DIR__ . '/Stubs/WP_I18n.php';

// Brain\Monkey setUp/tearDown is handled per-test in TestCase base
// (tests should call Brain\Monkey\setUp() in setUp() and tearDown() in tearDown())
