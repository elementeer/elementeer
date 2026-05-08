<?php

declare(strict_types=1);

namespace Elementeer\MCP\Auth;

/**
 * Canonical capability registry for the plugin.
 *
 * Domain capabilities are the source of truth.
 * Legacy capabilities remain accepted as transitional aliases for
 * existing keys and endpoint mappings.
 */
final class Capabilities {

    public const ALL = [
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
        'ally:read',
        'ally:trigger',
        'translate:read',
        'translate:write',
        'lms:read',
        'charity:read',
        'booking:read',
        'booking:write',
        'voxel:read',
        'diagnostics:read',
        'diagnostics:write',
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
        'snapshot:read',
        'snapshot:write',
        'addon-analysis:read',
        'workflow:read',
        'workflow:write',
        'plugin-stack:write',
        'media-stock:search',
        'media-ai:generate',
    ];

    public const LEGACY = [
        'templates:read',
        'templates:write',
        'templates:delete',
        'pages:read',
        'pages:write',
        'site:read',
        'site:write',
        'global-styles:read',
        'global-styles:write',
        'theme-builder:read',
        'theme-builder:write',
        'global-widgets:read',
        'global-widgets:write',
        'library:export',
        'library:import',
        'governance:read',
        'governance:write',
        'content:read',
        'content:write',
        'media:read',
        'media:write',
        'settings:read',
        'settings:write',
        'seo:read',
        'seo:write',
        'performance:read',
        'performance:write',
        'woocommerce:read',
        'woocommerce:write',
    ];

    public const LEGACY_ALIASES = [
        'templates:read'       => [ 'content-structure:read' ],
        'templates:write'      => [ 'content-structure:write' ],
        'templates:delete'     => [ 'content-structure:write' ],
        'pages:read'           => [ 'content-structure:read' ],
        'pages:write'          => [ 'content-structure:write' ],
        'site:read'            => [ 'site-audit:read' ],
        'site:write'           => [ 'site-foundation:write' ],
        'global-styles:read'   => [ 'design-system:read' ],
        'global-styles:write'  => [ 'design-system:write' ],
        'theme-builder:read'   => [ 'theme-structure:read' ],
        'theme-builder:write'  => [ 'theme-structure:write' ],
        'global-widgets:read'  => [ 'content-structure:read' ],
        'global-widgets:write' => [ 'content-structure:write' ],
        'library:export'       => [ 'library-operations:export' ],
        'library:import'       => [ 'library-operations:import' ],
        'governance:read'      => [ 'governance:read' ],
        'governance:write'     => [ 'governance:write' ],
        'content:read'         => [ 'content-structure:read' ],
        'content:write'        => [ 'content-structure:write' ],
        'media:read'           => [ 'media-operations:read' ],
        'media:write'          => [ 'media-operations:write' ],
        'settings:read'        => [ 'site-settings:read' ],
        'settings:write'       => [ 'site-settings:write' ],
        'seo:read'             => [ 'seo-operations:read' ],
        'seo:write'            => [ 'seo-operations:write' ],
        'performance:read'     => [ 'performance-operations:read' ],
        'performance:write'    => [ 'performance-operations:write' ],
        'woocommerce:read'     => [ 'ecommerce-operations:read' ],
        'woocommerce:write'    => [ 'ecommerce-operations:write' ],
        'woocommerce-operations:read'  => [ 'ecommerce-operations:read' ],
        'woocommerce-operations:write' => [ 'ecommerce-operations:write' ],
    ];

    public const LABELS = [
        'site-audit:read'                => 'Site Audit — Read',
        'stack-bootstrap:read'           => 'Stack Bootstrap — Read',
        'stack-bootstrap:prepare'        => 'Stack Bootstrap — Prepare',
        'stack-bootstrap:write'          => 'Stack Bootstrap — Write',
        'site-foundation:read'           => 'Site Foundation — Read',
        'site-foundation:write'          => 'Site Foundation — Write',
        'design-system:read'             => 'Design System — Read',
        'design-system:write'            => 'Design System — Write',
        'content-structure:read'         => 'Content Structure — Read',
        'content-structure:write'        => 'Content Structure — Write',
        'theme-structure:read'           => 'Theme Structure — Read',
        'theme-structure:write'          => 'Theme Structure — Write',
        'library-operations:read'        => 'Library Operations — Read',
        'library-operations:write'       => 'Library Operations — Write',
        'library-operations:import'      => 'Library Operations — Import',
        'library-operations:export'      => 'Library Operations — Export',
        'media-operations:read'          => 'Media Operations — Read',
        'media-operations:write'         => 'Media Operations — Write',
        'plugin-stack-context:read'      => 'Plugin Stack Context — Read',
        'plugin-stack-context:prepare'   => 'Plugin Stack Context — Prepare',
        'governance:read'                => 'Governance — Read',
        'governance:review'              => 'Governance — Review',
        'governance:apply'               => 'Governance — Apply',
        'governance:write'               => 'Governance — Write',
        'governance:queue'               => 'Governance — Queue',
        'ally:read'                      => 'Ally — Read',
        'ally:trigger'                   => 'Ally — Trigger',
        'translate:read'                 => 'Translation — Read',
        'translate:write'                => 'Translation — Write',
        'lms:read'                       => 'LMS — Read',
        'charity:read'                   => 'Charity — Read',
        'booking:read'                   => 'Booking — Read',
        'booking:write'                  => 'Booking — Write',
        'voxel:read'                     => 'Voxel — Read',
        'diagnostics:read'               => 'Diagnostics — Read',
        'diagnostics:write'              => 'Diagnostics — Write',
        'workflow-orchestration:read'    => 'Workflow Orchestration — Read',
        'workflow-orchestration:prepare' => 'Workflow Orchestration — Prepare',
        'workflow-orchestration:write'   => 'Workflow Orchestration — Write',
        'site-settings:read'             => 'Site Settings — Read',
        'site-settings:write'            => 'Site Settings — Write',
        'seo-operations:read'            => 'SEO Operations — Read',
        'seo-operations:write'           => 'SEO Operations — Write',
        'performance-operations:read'    => 'Performance Operations — Read',
        'performance-operations:write'   => 'Performance Operations — Write',
        'ecommerce-operations:read'      => 'E‑commerce Operations — Read',
        'ecommerce-operations:write'     => 'E‑commerce Operations — Write',
    ];

    public const GROUPS = [
        'Site Audit'             => [ 'site-audit:read' ],
        'Stack Bootstrap'        => [ 'stack-bootstrap:read', 'stack-bootstrap:prepare', 'stack-bootstrap:write' ],
        'Site Foundation'        => [ 'site-foundation:read', 'site-foundation:write' ],
        'Design System'          => [ 'design-system:read', 'design-system:write' ],
        'Content Structure'      => [ 'content-structure:read', 'content-structure:write' ],
        'Theme Structure'        => [ 'theme-structure:read', 'theme-structure:write' ],
        'Library Operations'     => [ 'library-operations:read', 'library-operations:write', 'library-operations:import', 'library-operations:export' ],
        'Media Operations'       => [ 'media-operations:read', 'media-operations:write' ],
        'Plugin Stack Context'   => [ 'plugin-stack-context:read', 'plugin-stack-context:prepare' ],
        'Governance'             => [ 'governance:read', 'governance:review', 'governance:apply', 'governance:write', 'governance:queue' ],
        'Workflow Orchestration' => [ 'workflow-orchestration:read', 'workflow-orchestration:prepare', 'workflow-orchestration:write' ],
        'Site Settings'          => [ 'site-settings:read', 'site-settings:write' ],
        'SEO Operations'         => [ 'seo-operations:read', 'seo-operations:write' ],
        'Performance Operations' => [ 'performance-operations:read', 'performance-operations:write' ],
        'E‑commerce Operations'  => [ 'ecommerce-operations:read', 'ecommerce-operations:write' ],
        'Ally'                   => [ 'ally:read', 'ally:trigger' ],
        'Translation'            => [ 'translate:read', 'translate:write' ],
        'LMS'                    => [ 'lms:read' ],
        'Charity'                => [ 'charity:read' ],
        'Booking'                => [ 'booking:read', 'booking:write' ],
        'Voxel'                  => [ 'voxel:read' ],
        'Diagnostics'            => [ 'diagnostics:read', 'diagnostics:write' ],
    ];

    public const DEFAULT_KEY_CAPABILITIES = [
        'site-audit:read',
        'stack-bootstrap:read',
        'site-foundation:read',
        'design-system:read',
        'content-structure:read',
        'media-operations:read',
        'site-settings:read',
        'seo-operations:read',
        'performance-operations:read',
        'ecommerce-operations:read',
    ];

    public static function all(): array {
        return self::ALL;
    }

    public static function all_known(): array {
        return array_values( array_unique( array_merge( self::ALL, self::LEGACY ) ) );
    }

    public static function labels(): array {
        return self::LABELS;
    }

    public static function groups(): array {
        return self::GROUPS;
    }

    public static function default_key_capabilities(): array {
        return self::DEFAULT_KEY_CAPABILITIES;
    }

    public static function default_governance_allowed(): array {
        return self::ALL;
    }

    public static function filter( array $capabilities ): array {
        return self::normalize_many( $capabilities );
    }

    public static function normalize( string $capability ): array {
        if ( in_array( $capability, self::ALL, true ) ) {
            return [ $capability ];
        }

        return self::LEGACY_ALIASES[ $capability ] ?? [];
    }

    public static function normalize_many( array $capabilities ): array {
        $normalized = [];

        foreach ( $capabilities as $capability ) {
            // Skip wildcard '*', it's handled in matches_granted
            if ( $capability === '*' ) {
                continue;
            }
            foreach ( self::normalize( (string) $capability ) as $resolved ) {
                $normalized[] = $resolved;
            }
        }

        return array_values( array_unique( $normalized ) );
    }

    public static function matches_granted( array $granted_capabilities, string $required_capability ): bool {
        // Wildcard '*' grants all capabilities
        if ( in_array( '*', $granted_capabilities, true ) ) {
            return true;
        }
        
        $granted  = self::normalize_many( $granted_capabilities );
        $required = self::normalize( $required_capability );

        if ( empty( $required ) ) {
            return false;
        }

        return [] !== array_intersect( $granted, $required );
    }

    public static function display_labels( array $capabilities ): array {
        $labels = [];

        foreach ( self::normalize_many( $capabilities ) as $capability ) {
            $labels[] = self::LABELS[ $capability ] ?? $capability;
        }

        return $labels;
    }
}
