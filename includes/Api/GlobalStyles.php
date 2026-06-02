<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * REST controller for Elementor Global Styles (Kit settings).
 *
 * Reads and writes _elementor_page_settings on the active Elementor Kit post.
 * This is the same data that powers the Global Colors and Global Typography
 * panels in the Elementor editor.
 *
 * GET  /site/global-styles           → current system + custom colors/typography
 * PUT  /site/global-styles/colors    → replace color slot (system or custom)
 * PUT  /site/global-styles/typography → replace typography slot (system or custom)
 */
final class GlobalStyles {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // GET /site/global-styles
    // ------------------------------------------------------------------ //

    public function get_global_styles( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'design-system:read' );
        if ( is_wp_error( $auth ) ) return $auth;

        $kit_id = $this->get_active_kit_id();
        if ( ! $kit_id ) {
            return new WP_Error( 'no_kit', 'No active Elementor Kit found.', [ 'status' => 404 ] );
        }

        $settings = $this->get_kit_settings( $kit_id );

        return new WP_REST_Response( [
            'kit_id'            => $kit_id,
            'system_colors'     => $settings['system_colors']     ?? [],
            'custom_colors'     => $settings['custom_colors']     ?? [],
            'system_typography' => $settings['system_typography'] ?? [],
            'custom_typography' => $settings['custom_typography'] ?? [],
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // PUT /site/global-styles/colors
    // ------------------------------------------------------------------ //

    public function set_colors( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'design-system:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $kit_id = $this->get_active_kit_id();
        if ( ! $kit_id ) {
            return new WP_Error( 'no_kit', 'No active Elementor Kit found.', [ 'status' => 404 ] );
        }

        $body = $request->get_json_params() ?: [];

        if ( ! isset( $body['colors'] ) || ! is_array( $body['colors'] ) ) {
            return new WP_Error( 'invalid_data', 'colors must be an array.', [ 'status' => 400 ] );
        }

        $slot = ( $body['slot'] ?? 'system' ) === 'custom' ? 'custom_colors' : 'system_colors';

        $colors = [];
        foreach ( $body['colors'] as $c ) {
            if ( ! isset( $c['color'] ) ) continue;

            $title   = sanitize_text_field( $c['title'] ?? 'Color' );
            $id      = sanitize_key( $c['id'] ?? $this->title_to_id( $title ) );
            $color   = sanitize_hex_color( $c['color'] ) ?? '';

            if ( empty( $color ) ) continue;

            $colors[] = [
                '_id'   => $id,
                'title' => $title,
                'color' => $color,
            ];
        }

        if ( empty( $colors ) ) {
            return new WP_Error( 'empty_colors', 'No valid colors provided (each needs a hex color value).', [ 'status' => 400 ] );
        }

        $settings          = $this->get_kit_settings( $kit_id );
        $settings[ $slot ] = $colors;
        $this->save_kit_settings( $kit_id, $settings );

        return new WP_REST_Response( [
            'kit_id'  => $kit_id,
            'slot'    => $slot,
            'colors'  => $colors,
            'updated' => true,
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // PUT /site/global-css
    // ------------------------------------------------------------------ //

    public function set_global_css( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'design-system:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $kit_id = $this->get_active_kit_id();
        if ( ! $kit_id ) {
            return new WP_Error( 'no_kit', 'No active Elementor Kit found.', [ 'status' => 404 ] );
        }

        $body = $request->get_json_params() ?: [];

        if ( ! isset( $body['css'] ) || ! is_string( $body['css'] ) ) {
            return new WP_Error( 'invalid_data', 'css must be a string.', [ 'status' => 400 ] );
        }

        $css = wp_strip_all_tags( $body['css'] );

        $settings               = $this->get_kit_settings( $kit_id );
        $settings['custom_css'] = $css;
        $this->save_kit_settings( $kit_id, $settings );

        return new WP_REST_Response( [
            'kit_id' => $kit_id,
            'css'    => $css,
            'updated' => true,
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // PUT /site/global-styles/typography
    // ------------------------------------------------------------------ //

    public function set_typography( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'design-system:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $kit_id = $this->get_active_kit_id();
        if ( ! $kit_id ) {
            return new WP_Error( 'no_kit', 'No active Elementor Kit found.', [ 'status' => 404 ] );
        }

        $body = $request->get_json_params() ?: [];

        if ( ! isset( $body['typography'] ) || ! is_array( $body['typography'] ) ) {
            return new WP_Error( 'invalid_data', 'typography must be an array.', [ 'status' => 400 ] );
        }

        $slot = ( $body['slot'] ?? 'system' ) === 'custom' ? 'custom_typography' : 'system_typography';

        $entries = [];
        foreach ( $body['typography'] as $t ) {
            $title  = sanitize_text_field( $t['title'] ?? 'Text' );
            $id     = sanitize_key( $t['id'] ?? $this->title_to_id( $title ) );
            $entry  = [
                '_id'                   => $id,
                'title'                 => $title,
                'typography_typography' => 'custom',
            ];

            if ( ! empty( $t['font_family'] ) ) {
                $entry['typography_font_family'] = sanitize_text_field( $t['font_family'] );
            }
            if ( isset( $t['font_size'] ) && is_numeric( $t['font_size'] ) ) {
                $entry['typography_font_size'] = [ 'unit' => 'px', 'size' => (int) $t['font_size'] ];
            }
            if ( ! empty( $t['font_weight'] ) ) {
                $entry['typography_font_weight'] = sanitize_text_field( (string) $t['font_weight'] );
            }
            if ( isset( $t['line_height'] ) && is_numeric( $t['line_height'] ) ) {
                $entry['typography_line_height'] = [ 'unit' => 'em', 'size' => (float) $t['line_height'] ];
            }
            if ( isset( $t['letter_spacing'] ) && is_numeric( $t['letter_spacing'] ) ) {
                $entry['typography_letter_spacing'] = [ 'unit' => 'px', 'size' => (float) $t['letter_spacing'] ];
            }
            if ( ! empty( $t['text_transform'] ) && in_array( $t['text_transform'], [ 'none', 'uppercase', 'lowercase', 'capitalize' ], true ) ) {
                $entry['typography_text_transform'] = $t['text_transform'];
            }

            $entries[] = $entry;
        }

        if ( empty( $entries ) ) {
            return new WP_Error( 'empty_typography', 'No valid typography entries provided.', [ 'status' => 400 ] );
        }

        $settings          = $this->get_kit_settings( $kit_id );
        $settings[ $slot ] = $entries;
        $this->save_kit_settings( $kit_id, $settings );

        return new WP_REST_Response( [
            'kit_id'     => $kit_id,
            'slot'       => $slot,
            'typography' => $entries,
            'updated'    => true,
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // PUT /site/theme-mode
    // ------------------------------------------------------------------ //

    public function set_theme_mode( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'design-system:write' );
        if ( is_wp_error( $auth ) ) return $auth;

        $body = $request->get_json_params() ?: [];

        $mode = sanitize_text_field( $body['mode'] ?? '' );

        if ( ! in_array( $mode, [ 'dark', 'light', 'auto' ], true ) ) {
            return new WP_Error(
                'invalid_mode',
                'mode must be one of: dark, light, auto.',
                [ 'status' => 400 ]
            );
        }

        update_option( 'elementeer_theme_mode', $mode );

        return new WP_REST_Response( [
            'mode'    => $mode,
            'updated' => true,
        ], 200 );
    }

    // ------------------------------------------------------------------ //
    // Private helpers
    // ------------------------------------------------------------------ //

    private function get_active_kit_id(): int {
        return (int) \get_option( 'elementor_active_kit', 0 );
    }

    private function get_kit_settings( int $kit_id ): array {
        $raw = get_post_meta( $kit_id, '_elementor_page_settings', true );
        return is_array( $raw ) ? $raw : [];
    }

    private function save_kit_settings( int $kit_id, array $settings ): void {
        update_post_meta( $kit_id, '_elementor_page_settings', $settings );

        // Clear Elementor's generated CSS — global style changes affect all pages
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        // Touch the kit post's modified date so Elementor picks up the change
        wp_update_post( [ 'ID' => $kit_id ] );
    }

    /**
     * Convert a human-readable title to a safe ID slug.
     * "Brand Blue" → "brand-blue"
     */
    private function title_to_id( string $title ): string {
        return strtolower( preg_replace( '/[^a-z0-9]+/i', '-', trim( $title ) ) );
    }
}
