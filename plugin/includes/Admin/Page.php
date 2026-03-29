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
        add_menu_page(
            __( 'Elementify', 'elementify-mcp' ),
            __( 'Elementify', 'elementify-mcp' ),
            'manage_options',
            'elementify-mcp',
            [ self::class, 'render' ],
            'dashicons-superhero',
            58
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

            <?php
            // Capture new key from redirect (shown only on this page load).
            $just_generated_key = isset( $_GET['new_key'] ) // phpcs:ignore WordPress.Security.NonceVerification
                ? sanitize_text_field( wp_unslash( $_GET['new_key'] ) ) // phpcs:ignore WordPress.Security.NonceVerification
                : '';
            ?>

            <?php if ( $just_generated_key ) : ?>
                <div class="notice notice-warning" style="padding:12px 16px">
                    <p>
                        <strong><?php esc_html_e( 'New API Key generated — save this key now. It won\'t be shown again.', 'elementify-mcp' ); ?></strong>
                    </p>
                    <p>
                        <code id="elementify-new-key" style="font-size:1.1em;user-select:all"><?php echo esc_html( $just_generated_key ); ?></code>
                        &nbsp;
                        <button type="button" class="button button-small"
                            onclick="(function(btn){navigator.clipboard.writeText('<?php echo esc_js( $just_generated_key ); ?>').then(function(){var t=btn.textContent;btn.textContent='Copied!';setTimeout(function(){btn.textContent=t;},2000);});})(this)">
                            <?php esc_html_e( 'Copy', 'elementify-mcp' ); ?>
                        </button>
                    </p>
                </div>
            <?php endif; ?>

            <?php if ( ! empty( $keys ) ) : ?>
            <table class="widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e( 'Label', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Key', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Capabilities', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Status', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Last Used', 'elementify-mcp' ); ?></th>
                        <th><?php esc_html_e( 'Actions', 'elementify-mcp' ); ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $keys as $key ) :
                    $raw_key    = $key['key'] ?? '';
                    $is_new_key = $just_generated_key && hash_equals( $raw_key, $just_generated_key );
                ?>
                    <tr>
                        <td><?php echo esc_html( $key['label'] ?? '—' ); ?></td>
                        <td>
                            <?php if ( $is_new_key ) : ?>
                                <code><?php echo esc_html( $raw_key ); ?></code>
                            <?php else : ?>
                                <code><?php echo esc_html( substr( $raw_key, 0, 16 ) . '…' ); ?></code>
                            <?php endif; ?>
                        </td>
                        <td><?php echo esc_html( implode( ', ', $key['capabilities'] ?? [] ) ); ?></td>
                        <td><?php echo $key['is_active'] ? '<span style="color:green">Active</span>' : '<span style="color:red">Inactive</span>'; ?></td>
                        <td><?php echo esc_html( $key['last_used'] ?? 'Never' ); ?></td>
                        <td>
                            <?php if ( $is_new_key ) : ?>
                                <button type="button" class="button button-small"
                                    onclick="(function(btn){navigator.clipboard.writeText('<?php echo esc_js( $raw_key ); ?>').then(function(){var t=btn.textContent;btn.textContent='Copied!';setTimeout(function(){btn.textContent=t;},2000);});})(this)">
                                    <?php esc_html_e( 'Copy', 'elementify-mcp' ); ?>
                                </button>
                            <?php endif; ?>
                            <?php if ( $key['is_active'] ) : ?>
                            <form method="post" style="display:inline">
                                <?php wp_nonce_field( 'elementify_mcp_admin' ); ?>
                                <input type="hidden" name="elementify_action" value="revoke_key">
                                <input type="hidden" name="key_value" value="<?php echo esc_attr( $raw_key ); ?>">
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
                            $all_capabilities = [
                                'templates:read'    => 'Templates — Read (list &amp; get)',
                                'templates:write'   => 'Templates — Write (create &amp; update)',
                                'templates:delete'  => 'Templates — Delete',
                                'theme-builder:read'  => 'Theme Builder — Read',
                                'theme-builder:write' => 'Theme Builder — Write',
                                'global-widgets:read'  => 'Global Widgets — Read',
                                'global-widgets:write' => 'Global Widgets — Write',
                                'library:export'    => 'Library — Export',
                                'library:import'    => 'Library — Import',
                                'site:read'         => 'Site Info — Read',
                                'governance:read'   => 'Governance — Read settings',
                                'governance:write'  => 'Governance — Write settings',
                            ];
                            $cap_groups = [
                                'Templates'       => [ 'templates:read', 'templates:write', 'templates:delete' ],
                                'Theme Builder'   => [ 'theme-builder:read', 'theme-builder:write' ],
                                'Global Widgets'  => [ 'global-widgets:read', 'global-widgets:write' ],
                                'Library'         => [ 'library:export', 'library:import' ],
                                'Site'            => [ 'site:read' ],
                                'Governance'      => [ 'governance:read', 'governance:write' ],
                            ];
                            $default_caps = [ 'templates:read', 'templates:write' ];
                            ?>
                            <button type="button" class="button button-small" style="margin-bottom:10px"
                                onclick="(function(){
                                    var boxes=document.querySelectorAll('#elementify-caps-wrap input[type=checkbox]');
                                    var allChecked=Array.from(boxes).every(function(b){return b.checked;});
                                    boxes.forEach(function(b){b.checked=!allChecked;});
                                    this.textContent=allChecked?'Select All':'Deselect All';
                                }).call(this)">
                                <?php esc_html_e( 'Select All', 'elementify-mcp' ); ?>
                            </button>
                            <div id="elementify-caps-wrap" style="display:flex;flex-wrap:wrap;gap:12px">
                            <?php foreach ( $cap_groups as $group_label => $group_caps ) : ?>
                                <fieldset style="border:1px solid #ddd;padding:8px 12px;min-width:180px">
                                    <legend style="font-weight:600;padding:0 4px"><?php echo esc_html( $group_label ); ?></legend>
                                    <?php foreach ( $group_caps as $cap ) :
                                        $label = $all_capabilities[ $cap ] ?? $cap;
                                    ?>
                                        <label style="display:block;margin:4px 0">
                                            <input type="checkbox" name="capabilities[]" value="<?php echo esc_attr( $cap ); ?>"
                                                <?php checked( in_array( $cap, $default_caps, true ) ); ?>>
                                            <?php echo esc_html( $label ); ?><br>
                                            <code style="font-size:0.85em;color:#666"><?php echo esc_html( $cap ); ?></code>
                                        </label>
                                    <?php endforeach; ?>
                                </fieldset>
                            <?php endforeach; ?>
                            </div>
                        </td>
                    </tr>
                </table>
                <?php submit_button( __( 'Generate Key', 'elementify-mcp' ) ); ?>
            </form>

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
                ], admin_url( 'admin.php' ) ) );
                exit;

            case 'revoke_key':
                $key_value = sanitize_text_field( $_POST['key_value'] ?? '' );
                if ( ! empty( $key_value ) ) {
                    Auth::get_instance()->revoke_key( $key_value );
                }
                wp_safe_redirect( add_query_arg( 'page', 'elementify-mcp', admin_url( 'admin.php' ) ) );
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
