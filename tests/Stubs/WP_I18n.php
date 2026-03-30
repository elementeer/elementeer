<?php

/**
 * WordPress i18n function stubs for unit tests.
 *
 * These are defined in a separate file (not inline in bootstrap.php) so that
 * Patchwork's stream wrapper can intercept the file load and mark these
 * functions as patchable. Brain\Monkey tests can then replace them via
 * Functions\when('__') etc. without triggering DefinedTooEarly errors.
 */

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
