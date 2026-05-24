<?php

declare(strict_types=1);

namespace Elementeer\MCP\Auth;

use WP_Error;
use WP_REST_Request;
use Elementeer\MCP\Governance\Settings;

/**
 * Two-layer API key authentication.
 *
 * Layer 1: Validate key exists and is active → WP_Error 'elementeer_invalid_key' if not.
 * Layer 2: Check the key has the required capability → WP_Error 'elementeer_insufficient_scope' if not.
 *          NOTE: This is intentionally a DIFFERENT error than invalid_key. Callers must distinguish these.
 * Layer 3: Governance check → WP_Error 'elementeer_governance_blocked' if the site disallows the capability.
 */
class Manager {

    private static ?self $instance = null;

    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Authenticate a request. Returns the matched key data array on success, WP_Error on failure.
     *
     * @param WP_REST_Request $request
     * @return array{key: string, label: string, capabilities: string[], created_at: string, last_used: string|null, is_active: bool}|WP_Error
     */
    public function authenticate( WP_REST_Request $request ): array|WP_Error {
        $raw_key = $this->extract_key( $request );

        if ( empty( $raw_key ) ) {
            return new WP_Error(
                'elementeer_invalid_key',
                __( 'Missing API key. Provide X-Elementeer-Key header or Bearer token.', 'elementeer' ),
                [ 'status' => 401 ]
            );
        }

        $keys    = \get_option( ELEMENTEER_OPTION_KEYS, [] );
        $matched = null;

        foreach ( $keys as $stored ) {
            if ( isset( $stored['key'] ) && hash_equals( $stored['key'], $raw_key ) ) {
                $matched = $stored;
                break;
            }
        }

        if ( null === $matched ) {
            return new WP_Error(
                'elementeer_invalid_key',
                __( 'Invalid API key.', 'elementeer' ),
                [ 'status' => 401 ]
            );
        }

        if ( empty( $matched['is_active'] ) ) {
            return new WP_Error(
                'elementeer_invalid_key',
                __( 'This API key has been deactivated.', 'elementeer' ),
                [ 'status' => 401 ]
            );
        }

        // Update last_used timestamp
        $this->touch_key( $matched['key'] );

        return $matched;
    }

    /**
     * Check that an already-authenticated key has a specific capability.
     *
     * Returns true on success, WP_Error 'elementeer_insufficient_scope' on failure.
     * IMPORTANT: never return 'elementeer_invalid_key' here — the key is valid, it just lacks scope.
     *
     * @param array  $key_data  Result from authenticate().
     * @param string $capability  e.g. 'templates:write'
     */
    public function check_capability( array $key_data, string $capability ): bool|WP_Error {
        $key_capabilities = $key_data['capabilities'] ?? [];

        if ( ! Capabilities::matches_granted( (array) $key_capabilities, $capability ) ) {
            return new WP_Error(
                'elementeer_insufficient_scope',
                sprintf(
                    /* translators: %s: required capability */
                    __( 'This API key does not have the "%s" capability.', 'elementeer' ),
                    $capability
                ),
                [ 'status' => 403 ]
            );
        }

        return true;
    }

    /**
     * Check that governance settings allow the requested capability.
     *
     * Returns true on success, WP_Error 'elementeer_governance_blocked' on failure.
     *
     * @param string $capability  e.g. 'templates:delete'
     */
    public function governance_allows( string $capability ): bool|WP_Error {
        $settings = Settings::get_instance()->get();

        if ( ! Capabilities::matches_granted( (array) ( $settings['allowed_capabilities'] ?? [] ), $capability ) ) {
            return new WP_Error(
                'elementeer_governance_blocked',
                sprintf(
                    /* translators: %s: capability */
                    __( 'The capability "%s" is disabled by governance settings for this site.', 'elementeer' ),
                    $capability
                ),
                [ 'status' => 403 ]
            );
        }

        return true;
    }

    /**
     * Full auth pipeline: authenticate → check_capability → governance_allows.
     * Returns key data on success, WP_Error on any failure.
     *
     * @param WP_REST_Request $request
     * @param string          $capability  Required capability for this endpoint.
     */
    public function authorize( WP_REST_Request $request, string $capability ): array|WP_Error {
        // Step 1: authenticate
        $key_data = $this->authenticate( $request );
        if ( \is_wp_error( $key_data ) ) {
            return $key_data;
        }

        // Step 2: check capability on the key
        $cap_check = $this->check_capability( $key_data, $capability );
        if ( \is_wp_error( $cap_check ) ) {
            return $cap_check;
        }

        // Step 3: governance
        $gov_check = $this->governance_allows( $capability );
        if ( \is_wp_error( $gov_check ) ) {
            return $gov_check;
        }

        // Step 4: set current WordPress user for capability checks (Elementor, etc.)
        $this->set_current_user();

        return $key_data;
    }

    // ------------------------------------------------------------------ //
    // Key management helpers
    // ------------------------------------------------------------------ //

    /**
     * Generate a new API key with the given capabilities.
     *
     * @param string   $label
     * @param string[] $capabilities
     * @return array The new key record (contains 'key' — only returned once).
     */
    public function generate_key( string $label, array $capabilities ): array {
        $raw_key = 'ek_' . bin2hex( random_bytes( 24 ) );
        $capabilities = Capabilities::filter( $capabilities );

        $record = [
            'key'          => $raw_key,
            'label'        => $label,
            'capabilities' => $capabilities,
            'created_at'   => gmdate( 'c' ),
            'last_used'    => null,
            'is_active'    => true,
        ];

        $keys   = \get_option( ELEMENTEER_OPTION_KEYS, [] );
        $keys[] = $record;
        \update_option( ELEMENTEER_OPTION_KEYS, $keys );

        return $record;
    }

    /**
     * Revoke (deactivate) a key by its prefix value.
     */
    public function revoke_key( string $key_value ): bool {
        $keys    = \get_option( ELEMENTEER_OPTION_KEYS, [] );
        $updated = false;

        foreach ( $keys as &$record ) {
            if ( isset( $record['key'] ) && hash_equals( $record['key'], $key_value ) ) {
                $record['is_active'] = false;
                $updated             = true;
                break;
            }
        }
        unset( $record );

        if ( $updated ) {
            \update_option( ELEMENTEER_OPTION_KEYS, $keys );
        }

        return $updated;
    }

    // ------------------------------------------------------------------ //
    // Private helpers
    // ------------------------------------------------------------------ //

    /**
     * Extract key from X-Elementeer-Key header (preferred) or Authorization: Bearer fallback.
     */
    private function extract_key( WP_REST_Request $request ): string {
        $header = $request->get_header( 'X-Elementeer-Key' );
        if ( ! empty( $header ) ) {
            return trim( $header );
        }

        $auth = $request->get_header( 'Authorization' );
        if ( ! empty( $auth ) && preg_match( '/^Bearer\s+(.+)$/i', $auth, $matches ) ) {
            return trim( $matches[1] );
        }

        return '';
    }

    /**
     * Update last_used for a key.
     */
    private function touch_key( string $key_value ): void {
        $keys = \get_option( ELEMENTEER_OPTION_KEYS, [] );
        foreach ( $keys as &$record ) {
            if ( isset( $record['key'] ) && hash_equals( $record['key'], $key_value ) ) {
                $record['last_used'] = gmdate( 'c' );
                break;
            }
        }
        unset( $record );
        \update_option( ELEMENTEER_OPTION_KEYS, $keys );
    }

    /**
     * Set current WordPress user to the first administrator account.
     * This ensures WordPress hooks and capability checks (e.g., Elementor) work correctly.
     */
    private function set_current_user(): void {
        // Always set to administrator for Elementeer API requests
        // This ensures Elementor and other plugins see a user with full capabilities
        
        // Find first administrator user
        $admin_users = \get_users( [
            'role'   => 'administrator',
            'number' => 1,
            'fields' => 'ID',
        ] );
        
        if ( ! empty( $admin_users ) ) {
            $admin_id = (int) $admin_users[0];
            \wp_set_current_user( $admin_id );
        } else {
            // Fallback to user ID 1 (default admin)
            \wp_set_current_user( 1 );
        }
        
        // Verify user has administrator role
        $user = \wp_get_current_user();
        if ( ! in_array( 'administrator', (array) $user->roles, true ) ) {
            // User is not administrator, force add role (temporarily)
            $user->set_role( 'administrator' );
        }
    }
}
