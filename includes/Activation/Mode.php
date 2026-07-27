<?php

declare(strict_types=1);

namespace Elementeer\MCP\Activation;

/**
 * Detects and persists the plugin activation mode.
 *
 * Modes:
 *   elementeer-agency    — Elementeer Agency license detected (highest tier)
 *   elementeer-embedded  — Running inside Elementeer Studio (non-agency)
 *   standalone-pro       — Elementeer Pro license present
 *   standalone-free      — Free tier, no special licenses
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
        $stored = \get_option( ELEMENTEER_OPTION_ACTIVATION_MODE, '' );

        if ( $mode !== $stored ) {
            \update_option( ELEMENTEER_OPTION_ACTIVATION_MODE, $mode );
        }
    }

    /**
     * Get the currently stored mode (or recompute if not set).
     *
     * @return 'standalone-free'|'standalone-pro'|'elementeer-embedded'|'elementeer-agency'
     */
    public function get_mode(): string {
        $stored = \get_option( ELEMENTEER_OPTION_ACTIVATION_MODE, '' );
        if ( '' === $stored ) {
            $stored = $this->compute_mode();
            \update_option( ELEMENTEER_OPTION_ACTIVATION_MODE, $stored );
        }
        return $stored;
    }

    /**
     * Compute the activation mode based on what's present in the environment.
     */
    private function compute_mode(): string {
        if ( $this->is_elementeer_embedded_active() ) {
            if ( $this->is_elementeer_agency_active() ) {
                return 'elementeer-agency';
            }
            return 'elementeer-embedded';
        }

        if ( $this->has_elementeer_pro_license() ) {
            return 'standalone-pro';
        }

        return 'standalone-free';
    }

    private function is_elementeer_embedded_active(): bool {
        return defined( 'ELEMENTEER_STUDIO_VERSION' )
            || class_exists( 'Elementeer\\Studio\\Plugin' );
    }

    private function is_elementeer_agency_active(): bool {
        if ( defined( 'ELEMENTEER_LICENSE_TIER' ) && ELEMENTEER_LICENSE_TIER === 'agency' ) {
            return true;
        }
        $tier = \get_option( 'elementeer_license_tier', '' );
        return 'agency' === $tier;
    }

    private function has_elementeer_pro_license(): bool {
        $license = \get_option( 'elementeer_pro_license', '' );
        return ! empty( $license );
    }
}
