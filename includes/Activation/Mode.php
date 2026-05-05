<?php

declare(strict_types=1);

namespace Elementify\MCP\Activation;

/**
 * Detects and persists the plugin activation mode.
 *
 * Modes:
 *   vamerli-agency    — Vamerli Agency license detected (highest tier)
 *   vamerli-embedded  — Running inside Vamerli Studio (non-agency)
 *   standalone-pro    — Elementify Pro license present, no Vamerli
 *   standalone-free   — Free tier, no special licenses
 */
final class Mode {

    private static ?self $instance = null;

    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Detect current mode and persist to wp_options.
     */
    public function detect(): void {
        $mode = $this->compute_mode();
        $stored = \get_option( ELEMENTIFY_MCP_OPTION_MODE, '' );

        if ( $mode !== $stored ) {
            \update_option( ELEMENTIFY_MCP_OPTION_MODE, $mode );
        }
    }

    /**
     * Get the currently stored mode (or recompute if not set).
     *
     * @return 'standalone-free'|'standalone-pro'|'vamerli-embedded'|'vamerli-agency'
     */
    public function get_mode(): string {
        $stored = \get_option( ELEMENTIFY_MCP_OPTION_MODE, '' );
        if ( '' === $stored ) {
            $stored = $this->compute_mode();
            \update_option( ELEMENTIFY_MCP_OPTION_MODE, $stored );
        }
        return $stored;
    }

    /**
     * Compute the activation mode based on what's present in the environment.
     */
    private function compute_mode(): string {
        // Vamerli Agency: plugin class + agency license constant/option
        if ( $this->is_vamerli_active() ) {
            if ( $this->is_vamerli_agency() ) {
                return 'vamerli-agency';
            }
            return 'vamerli-embedded';
        }

        // Standalone Pro: Elementify Pro license key in options
        if ( $this->has_elementify_pro_license() ) {
            return 'standalone-pro';
        }

        return 'standalone-free';
    }

    private function is_vamerli_active(): bool {
        // Check for Vamerli Studio plugin class or constant
        return defined( 'VAMERLI_STUDIO_VERSION' )
            || class_exists( 'Vamerli\\Studio\\Plugin' );
    }

    private function is_vamerli_agency(): bool {
        if ( defined( 'VAMERLI_LICENSE_TIER' ) && VAMERLI_LICENSE_TIER === 'agency' ) {
            return true;
        }
        $tier = \get_option( 'vamerli_license_tier', '' );
        return 'agency' === $tier;
    }

    private function has_elementify_pro_license(): bool {
        $license = \get_option( 'elementify_mcp_pro_license', '' );
        return ! empty( $license );
    }
}
