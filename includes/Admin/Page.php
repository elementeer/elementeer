<?php

declare(strict_types=1);

namespace Elementify\MCP\Admin;

use Elementify\MCP\Auth\Manager as Auth;
use Elementify\MCP\Governance\Settings;

/**
 * WP Admin settings page for Elementify MCP.
 */
final class Page {

    public static function register_menu(): void {
        add_options_page(
            __( 'Elementify MCP', 'elementify-mcp' ),
            __( 'Elementify MCP', 'elementify-mcp' ),
            'manage_options',
            'elementify-mcp',
            [ self::class, 'render' ]
        );
    }

    public static function render(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to access this page.', 'elementify-mcp' ) );
        }

        // Handle form submissions
        if ( isset( $_POST['elementify_action'] ) && check_admin_referer( 'elementify_mcp_admin' ) ) {
            self::handle_action( sanitize_text_field( $_POST['elementify_action'] ) );
        }

        $keys       = get_option( ELEMENTIFY_MCP_OPTION_KEYS, [] );
        $governance = Settings::get_instance()->get();

        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Elementify MCP Settings', 'elementify-mcp' ); ?></h1>

            <h2><?php esc_html_e( 'API Keys', 'elementify-mcp' ); ?></h2>
            <p><?php esc_html_e( 'Use these keys in the X-Elementify-Key header when connecting your MCP server.', 'elementify-mcp' ); ?></p>

            <?php if ( ! empty( $keys ) ) : ?>
            <table class="widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e( 'Label', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Key (first 12 chars)', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Capabilities', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Status', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Last Used', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Actions', 'elementify-mcp' ); ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $keys as $key ) : ?>
                    <tr>
                        <td><?php echo esc_html( $key['label'] ?? '—' ); ?></td>
                        <td><code><?php echo esc_html( substr( $key['key'] ?? '', 0, 12 ) . '…' ); ?></code></td>
                        <td><?php echo esc_html( implode( ', ', $key['capabilities'] ?? [] ) ); ?></td>
                        <td><?php echo $key['is_active'] ? '<span style="color:green">Active</span>' : '<span style="color:red">Inactive</span>'; ?></td>
                        <td><?php echo esc_html( $key['last_used'] ?? 'Never' ); ?></td>
                        <td>
                            <?php if ( $key['is_active'] ) : ?>
                            <form method="post" style="display:inline">
                                <?php wp_nonce_field( 'elementify_mcp_admin' ); ?>
                                <input type="hidden" name="elementify_action" value="revoke_key">
                                <input type="hidden" name="key_value" value="<?php echo esc_attr( $key['key'] ); ?>">
                                <button type="submit" class="button button-small"><?php esc_html_e( 'Revoke', 'elementify-mcp' ); ?></button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <?php else : ?>
                <p><em><?php esc_html_e( 'No API keys yet. Generate one below.', 'elementify-mcp' ); ?></em></p>
            <?php endif; ?>

            <h3><?php esc_html_e( 'Generate New Key', 'elementify-mcp' ); ?></h3>
            <form method="post">
                <?php wp_nonce_field( 'elementify_mcp_admin' ); ?>
                <input type="hidden" name="elementify_action" value="generate_key">
                <table class="form-table">
                    <tr>
                        <th><label for="key_label"><?php esc_html_e( 'Label', 'elementify-mcp' ); ?></label></th>
                        <td><input type="text" id="key_label" name="key_label" class="regular-text" placeholder="My MCP Client" required></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Capabilities', 'elementify-mcp' ); ?></th>
                        <td>
                            <?php
                            $all_caps = [
                                'templates:read'        => __( 'Read templates', 'elementify-mcp' ),
                                'templates:write'       => __( 'Create / update templates', 'elementify-mcp' ),
                                'templates:delete'      => __( 'Delete templates', 'elementify-mcp' ),
                                'theme-builder:read'    => __( 'Read theme builder', 'elementify-mcp' ),
                                'theme-builder:write'   => __( 'Write theme builder', 'elementify-mcp' ),
                                'global-widgets:read'   => __( 'Read global widgets', 'elementify-mcp' ),
                                'global-widgets:write'  => __( 'Write global widgets', 'elementify-mcp' ),
                                'library:export'        => __( 'Export library', 'elementify-mcp' ),
                                'library:import'        => __( 'Import library', 'elementify-mcp' ),
                            ];
                            foreach ( $all_caps as $cap => $label ) :
                                ?>
                                <label style="display:block;margin-bottom:4px">
                                    <input type="checkbox" name="capabilities[]" value="<?php echo esc_attr( $cap ); ?>"
                                        <?php checked( in_array( $cap, [ 'templates:read', 'templates:write' ], true ) ); ?>>
                                    <?php echo esc_html( $label ); ?> <code><?php echo esc_html( $cap ); ?></code>
                                </label>
                            <?php endforeach; ?>
                        </td>
                    </tr>
                </table>
                <?php submit_button( __( 'Generate Key', 'elementify-mcp' ) ); ?>
            </form>

            <?php if ( isset( $_GET['new_key'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification ?>
                <div class="notice notice-success">
                    <p>
                        <strong><?php esc_html_e( 'New API Key (copy now — shown only once):', 'elementify-mcp' ); ?></strong><br>
                        <code style="font-size:1.1em"><?php echo esc_html( sanitize_text_field( $_GET['new_key'] ) ); // phpcs:ignore WordPress.Security.NonceVerification ?></code>
                    </p>
                </div>
            <?php endif; ?>

            <hr>
            <h2><?php esc_html_e( 'Governance Settings', 'elementify-mcp' ); ?></h2>
            <form method="post">
                <?php wp_nonce_field( 'elementify_mcp_admin' ); ?>
                <input type="hidden" name="elementify_action" value="save_governance">
                <table class="form-table">
                    <tr>
                        <th><label for="max_keys"><?php esc_html_e( 'Max API Keys', 'elementify-mcp' ); ?></label></th>
                        <td><input type="number" id="max_keys" name="max_keys" min="1" max="100"
                            value="<?php echo esc_attr( $governance['max_keys'] ?? 10 ); ?>"></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Audit Log', 'elementify-mcp' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="audit_log_enabled" value="1"
                                    <?php checked( $governance['audit_log_enabled'] ?? true ); ?>>
                                <?php esc_html_e( 'Enable audit logging for API key usage', 'elementify-mcp' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Require Approval', 'elementify-mcp' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="require_approval" value="1"
                                    <?php checked( $governance['require_approval'] ?? false ); ?>>
                                <?php esc_html_e( 'Require admin approval before new keys become active', 'elementify-mcp' ); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                <?php submit_button( __( 'Save Governance Settings', 'elementify-mcp' ) ); ?>
            </form>
        </div>
        <?php
    }

    private static function handle_action( string $action ): void {
        switch ( $action ) {
            case 'generate_key':
                $label        = sanitize_text_field( $_POST['key_label'] ?? '' );
                $capabilities = isset( $_POST['capabilities'] ) && is_array( $_POST['capabilities'] )
                    ? array_map( 'sanitize_text_field', $_POST['capabilities'] )
                    : [];

                if ( empty( $label ) ) {
                    add_settings_error( 'elementify_mcp', 'missing_label', __( 'Key label is required.', 'elementify-mcp' ) );
                    break;
                }

                $record  = Auth::get_instance()->generate_key( $label, $capabilities );
                $new_key = $record['key'];

                wp_safe_redirect( add_query_arg( [
                    'page'    => 'elementify-mcp',
                    'new_key' => $new_key,
                ], admin_url( 'options-general.php' ) ) );
                exit;

            case 'revoke_key':
                $key_value = sanitize_text_field( $_POST['key_value'] ?? '' );
                if ( ! empty( $key_value ) ) {
                    Auth::get_instance()->revoke_key( $key_value );
                }
                wp_safe_redirect( add_query_arg( 'page', 'elementify-mcp', admin_url( 'options-general.php' ) ) );
                exit;

            case 'save_governance':
                Settings::get_instance()->update( [
                    'max_keys'          => max( 1, (int) ( $_POST['max_keys'] ?? 10 ) ),
                    'audit_log_enabled' => ! empty( $_POST['audit_log_enabled'] ),
                    'require_approval'  => ! empty( $_POST['require_approval'] ),
                ] );
                add_settings_error( 'elementify_mcp', 'saved', __( 'Governance settings saved.', 'elementify-mcp' ), 'updated' );
                break;
        }
    }
}
