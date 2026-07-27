<?php

declare(strict_types=1);

namespace Elementeer\MCP\Auth;

/**
 * Contract identifiers for Core-owned capabilities.
 *
 * AMD-002: Core owns WordPress/Elementor import and write.
 * These contract IDs declare that the Core plugin is the
 * authoritative provider for CMS import and write operations.
 */
final class Contracts {

    /**
     * Core-owned contract IDs.
     */
    public const CORE = [
        'cms.wordpress.import',
        'cms.wordpress.write',
        'cms.elementor.import',
        'cms.elementor.write',
    ];

    /**
     * Wildcard contract identifiers for discovery.
     */
    public const CORE_WILDCARDS = [
        'cms.*.import',
        'cms.*.write',
    ];

    /**
     * Check if a contract ID is Core-owned.
     */
    public static function is_core_owned( string $contract_id ): bool {
        return in_array( $contract_id, self::CORE, true )
            || in_array( $contract_id, self::CORE_WILDCARDS, true );
    }
}
