<?php

declare(strict_types=1);

namespace Elementify\MCP\Governance;

use Elementify\MCP\Auth\Capabilities;

/**
 * Manages site-level governance settings stored in wp_options.
 *
 * Governance settings control which capabilities are site-allowed (even if a key has them),
 * whether approval is required for new keys, audit log behavior, and key limits.
 */
final class Settings {

    private static ?self $instance = null;

    private const DEFAULTS = [
        'allowed_capabilities' => Capabilities::ALL,
        'require_approval'   => false,
        'audit_log_enabled'  => true,
        'max_keys'           => 10,
    ];

    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get current governance settings, merged with defaults.
     *
     * @return array{allowed_capabilities: string[], require_approval: bool, audit_log_enabled: bool, max_keys: int}
     */
    public function get(): array {
        $stored = \get_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE, [] );
        $settings = array_merge( self::DEFAULTS, is_array( $stored ) ? $stored : [] );

        if ( isset( $settings['allowed_capabilities'] ) ) {
            $settings['allowed_capabilities'] = Capabilities::filter( (array) $settings['allowed_capabilities'] );
        }

        return $settings;
    }

    /**
     * Update governance settings (partial update, merges with existing).
     *
     * @param array $partial  Keys to update. Unrecognized keys are ignored.
     */
    public function update( array $partial ): void {
        $current  = $this->get();
        $allowed_keys = [ 'allowed_capabilities', 'require_approval', 'audit_log_enabled', 'max_keys' ];

        foreach ( $allowed_keys as $key ) {
            if ( array_key_exists( $key, $partial ) ) {
                $current[ $key ] = $partial[ $key ];
            }
        }

        // Validate allowed_capabilities is a subset of known capabilities
        if ( isset( $current['allowed_capabilities'] ) ) {
            $current['allowed_capabilities'] = Capabilities::filter( (array) $current['allowed_capabilities'] );
        }

        \update_option( ELEMENTIFY_MCP_OPTION_GOVERNANCE, $current );
    }

    /**
     * Check if a specific capability is enabled at the governance level.
     */
    public function is_allowed( string $capability ): bool {
        $settings = $this->get();
        return Capabilities::matches_granted( (array) ( $settings['allowed_capabilities'] ?? [] ), $capability );
    }
}
