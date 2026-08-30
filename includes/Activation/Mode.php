<?php

declare(strict_types=1);

namespace Elementeer\MCP\Activation;

/**
 * Detects and persists the plugin activation mode.
 *
 * Modes:
 *   standalone-pro    — Elementeer Pro license present
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
        $stored = \get_option( ELEMENTEER_OPTION_ACTIVATION_MODE, '' );

        if ( $mode !== $stored ) {
            \update_option( ELEMENTEER_OPTION_ACTIVATION_MODE, $mode );
        }
    }

    /**
     * Get the currently stored mode (or recompute if not set).
     *
     * @return 'standalone-free'|'standalone-pro'
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
        // Standalone Pro: Elementeer Pro license key in options
        if ( $this->has_elementeer_pro_license() ) {
            return 'standalone-pro';
        }

        return 'standalone-free';
    }

    private function has_elementeer_pro_license(): bool {
        $license = \get_option( 'elementeer_pro_license', '' );
        return ! empty( $license );
    }
}
