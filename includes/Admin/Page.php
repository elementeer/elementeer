<?php

declare(strict_types=1);

namespace Elementeer\MCP\Admin;

use Elementeer\MCP\Auth\Capabilities;
use Elementeer\MCP\Auth\Manager as Auth;
use Elementeer\MCP\Governance\Settings;

/**
 * WP Admin settings page for Elementeer MCP.
 */
final class Page {

    public static function register_menu(): void {
        add_menu_page(
            __( 'Elementeer', 'elementeer' ),
            __( 'Elementeer', 'elementeer' ),
            'manage_options',
            'elementeer',
            [ self::class, 'render' ],
            ELEMENTEER_URL . 'assets/images/icon.svg',
            self::get_menu_position()
        );
        
        // Add admin styles for icon sizing
        add_action( 'admin_head', [ self::class, 'add_admin_styles' ] );
    }
    
    private static function get_menu_position(): float {
        global $menu;
        
        if ( empty( $menu ) || ! is_array( $menu ) ) {
            // Fallback: position after Elementor (2.1) if menu not yet initialized
            return 2.1;
        }
        
        $elementor_position = null;
        
        foreach ( $menu as $position => $item ) {
            if ( is_numeric( $position ) ) {
                $slug = $item[2] ?? '';
                if ( strpos( $slug, 'elementor' ) === 0 ) {
                    $elementor_position = (float) $position;
                    break;
                }
            }
        }

        if ( $elementor_position !== null ) {
            // Place directly before Elementor.
            return $elementor_position - 0.1;
        }

        return 2.1;
    }
    
    public static function add_admin_styles(): void {
        ?>
        <style>
            #adminmenu .toplevel_page_elementeer .wp-menu-image img {
                width: 20px;
                height: 20px;
                padding: 7px 0 0;
                opacity: 0.8;
                transition: opacity 0.3s;
            }
            #adminmenu .toplevel_page_elementeer:hover .wp-menu-image img,
            #adminmenu .toplevel_page_elementeer.current .wp-menu-image img {
                opacity: 1;
            }
        </style>
        <?php
    }

    public static function render(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to access this page.', 'elementeer' ) );
        }

        // Handle form submissions
        if ( isset( $_POST['elementeer_action'] ) && check_admin_referer( 'elementeer_mcp_admin' ) ) {
            self::handle_action( sanitize_text_field( $_POST['elementeer_action'] ) );
        }

        $keys       = get_option( ELEMENTEER_OPTION_KEYS, [] );
        $governance = Settings::get_instance()->get();

        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Elementeer MCP Settings', 'elementeer' ); ?></h1>

            <h2><?php esc_html_e( 'API Keys', 'elementeer' ); ?></h2>
            <p><?php esc_html_e( 'Use these keys in the X-Elementeer-Key header when connecting your MCP server.', 'elementeer' ); ?></p>

            <?php
            // Capture new key from redirect (shown only on this page load).
            $just_generated_key = isset( $_GET['new_key'] ) // phpcs:ignore WordPress.Security.NonceVerification
                ? sanitize_text_field( wp_unslash( $_GET['new_key'] ) ) // phpcs:ignore WordPress.Security.NonceVerification
                : '';
            ?>

            <?php if ( $just_generated_key ) : ?>
                <div class="notice notice-warning" style="padding:12px 16px">
                    <p>
                        <strong><?php esc_html_e( 'New API Key generated — save this key now. It won\'t be shown again.', 'elementeer' ); ?></strong>
                    </p>
                    <p>
                        <code id="elementeer-new-key" style="font-size:1.1em;user-select:all"><?php echo esc_html( $just_generated_key ); ?></code>
                        &nbsp;
                        <button type="button" class="button button-small"
                            onclick="(function(btn){navigator.clipboard.writeText('<?php echo esc_js( $just_generated_key ); ?>').then(function(){var t=btn.textContent;btn.textContent='Copied!';setTimeout(function(){btn.textContent=t;},2000);});})(this)">
                                     <?php esc_html_e( 'Copy', 'elementeer' ); ?>
                        </button>
                    </p>
                </div>
            <?php endif; ?>

            <?php if ( ! empty( $keys ) ) : ?>
            <table class="widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e( 'Label', 'elementeer' ); ?></th>
                        <th><?php esc_html_e( 'Key', 'elementeer' ); ?></th>
                        <th><?php esc_html_e( 'Capabilities', 'elementeer' ); ?></th>
                        <th><?php esc_html_e( 'Status', 'elementeer' ); ?></th>
                        <th><?php esc_html_e( 'Last Used', 'elementeer' ); ?></th>
                        <th><?php esc_html_e( 'Actions', 'elementeer' ); ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $keys as $key ) :
                    $raw_key    = $key['key'] ?? '';
                    $is_new_key = $just_generated_key && hash_equals( $raw_key, $just_generated_key );
                    $capability_labels = Capabilities::display_labels( (array) ( $key['capabilities'] ?? [] ) );
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
                        <td><?php echo esc_html( implode( ', ', $capability_labels ) ); ?></td>
                        <td><?php echo $key['is_active'] ? '<span style="color:green">Active</span>' : '<span style="color:red">Revoked</span>'; ?></td>
                        <td><?php echo esc_html( $key['last_used'] ?? 'Never' ); ?></td>
                        <td>
                            <?php if ( ! empty( $key['is_active'] ) ) : ?>
                                <button type="button" class="button button-small"
                                    onclick="(function(btn){navigator.clipboard.writeText('<?php echo esc_js( $raw_key ); ?>').then(function(){var t=btn.textContent;btn.textContent='Copied!';setTimeout(function(){btn.textContent=t;},2000);});})(this)">
                                    <?php esc_html_e( 'Copy', 'elementeer' ); ?>
                                </button>
                            <?php endif; ?>
                            <?php if ( $key['is_active'] ) : ?>
                            <form method="post" style="display:inline">
                                <?php wp_nonce_field( 'elementeer_mcp_admin' ); ?>
                                <input type="hidden" name="elementeer_action" value="revoke_key">
                                <input type="hidden" name="key_value" value="<?php echo esc_attr( $raw_key ); ?>">
                                 <button type="submit" class="button button-small"><?php esc_html_e( 'Revoke', 'elementeer' ); ?></button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <?php else : ?>
                 <p><em><?php esc_html_e( 'No API keys yet. Generate one below.', 'elementeer' ); ?></em></p>
            <?php endif; ?>

             <h3><?php esc_html_e( 'Generate New Key', 'elementeer' ); ?></h3>
            <form method="post">
                <?php wp_nonce_field( 'elementeer_mcp_admin' ); ?>
                <input type="hidden" name="elementeer_action" value="generate_key">
                <table class="form-table">
                    <tr>
                         <th><label for="key_label"><?php esc_html_e( 'Label', 'elementeer' ); ?></label></th>
                        <td><input type="text" id="key_label" name="key_label" class="regular-text" placeholder="My MCP Client" required></td>
                    </tr>
                    <tr>
                         <th><?php esc_html_e( 'Capabilities', 'elementeer' ); ?></th>
                        <td>
                            <?php
                            $all_capabilities = Capabilities::labels();
                            $cap_groups       = Capabilities::groups();
                            $default_caps     = Capabilities::default_key_capabilities();
                            ?>
                            <button type="button" class="button button-small" style="margin-bottom:10px"
                                onclick="(function(){
                                    var boxes=document.querySelectorAll('#elementeer-caps-wrap input[type=checkbox]');
                                    var allChecked=Array.from(boxes).every(function(b){return b.checked;});
                                    boxes.forEach(function(b){b.checked=!allChecked;});
                                    this.textContent=allChecked?'Select All':'Deselect All';
                                }).call(this)">
                                <?php esc_html_e( 'Select All', 'elementeer' ); ?>
                            </button>
                            <p class="description" style="margin-top:0">
                                <?php esc_html_e( 'Capabilities are grouped by operating domain. Existing legacy keys continue to work, but newly generated keys use the new domain-based capability model.', 'elementeer' ); ?>
                            </p>
                            <div id="elementeer-caps-wrap" style="display:flex;flex-wrap:wrap;gap:12px">
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
                 <?php submit_button( __( 'Generate Key', 'elementeer' ) ); ?>
            </form>

            <hr>
             <h2><?php esc_html_e( 'Governance Settings', 'elementeer' ); ?></h2>
            <form method="post">
                <?php wp_nonce_field( 'elementeer_mcp_admin' ); ?>
                <input type="hidden" name="elementeer_action" value="save_governance">
                <input type="hidden" name="governance_capabilities_present" value="1">
                <table class="form-table">
                    <tr>
                         <th><label for="max_keys"><?php esc_html_e( 'Max API Keys', 'elementeer' ); ?></label></th>
                        <td><input type="number" id="max_keys" name="max_keys" min="1" max="100"
                            value="<?php echo esc_attr( $governance['max_keys'] ?? 10 ); ?>"></td>
                    </tr>
                    <tr>
                         <th><?php esc_html_e( 'Allowed Capabilities', 'elementeer' ); ?></th>
                        <td>
                            <?php
                            $all_capabilities     = Capabilities::labels();
                            $cap_groups           = Capabilities::groups();
                            $allowed_capabilities = array_values( array_unique( (array) ( $governance['allowed_capabilities'] ?? [] ) ) );
                            ?>
                            <button type="button" class="button button-small" style="margin-bottom:10px"
                                onclick="(function(){
                                    var boxes=document.querySelectorAll('#elementeer-governance-caps-wrap input[type=checkbox]');
                                    var allChecked=Array.from(boxes).every(function(b){return b.checked;});
                                    boxes.forEach(function(b){b.checked=!allChecked;});
                                    this.textContent=allChecked?'Select All':'Deselect All';
                                }).call(this)">
                                <?php esc_html_e( 'Select All', 'elementeer' ); ?>
                            </button>
                            <p class="description" style="margin-top:0">
                                <?php esc_html_e( 'Governance can allow or deny whole operating domains regardless of what an individual key grants. Existing legacy settings are normalized to the domain model automatically.', 'elementeer' ); ?>
                            </p>
                            <div id="elementeer-governance-caps-wrap" style="display:flex;flex-wrap:wrap;gap:12px">
                            <?php foreach ( $cap_groups as $group_label => $group_caps ) : ?>
                                <fieldset style="border:1px solid #ddd;padding:8px 12px;min-width:180px">
                                    <legend style="font-weight:600;padding:0 4px"><?php echo esc_html( $group_label ); ?></legend>
                                    <?php foreach ( $group_caps as $cap ) :
                                        $label = $all_capabilities[ $cap ] ?? $cap;
                                    ?>
                                        <label style="display:block;margin:4px 0">
                                            <input type="checkbox" name="allowed_capabilities[]" value="<?php echo esc_attr( $cap ); ?>"
                                                <?php checked( in_array( $cap, $allowed_capabilities, true ) ); ?>>
                                            <?php echo esc_html( $label ); ?><br>
                                            <code style="font-size:0.85em;color:#666"><?php echo esc_html( $cap ); ?></code>
                                        </label>
                                    <?php endforeach; ?>
                                </fieldset>
                            <?php endforeach; ?>
                            </div>
                        </td>
                    </tr>
                    <tr>
                         <th><?php esc_html_e( 'Audit Log', 'elementeer' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="audit_log_enabled" value="1"
                                    <?php checked( $governance['audit_log_enabled'] ?? true ); ?>>
                                 <?php esc_html_e( 'Enable audit logging for API key usage', 'elementeer' ); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                         <th><?php esc_html_e( 'Require Approval', 'elementeer' ); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="require_approval" value="1"
                                    <?php checked( $governance['require_approval'] ?? false ); ?>>
                                 <?php esc_html_e( 'Require admin approval before new keys become active', 'elementeer' ); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                 <?php submit_button( __( 'Save Governance Settings', 'elementeer' ) ); ?>
            </form>
        </div>
        <?php
    }

    private static function handle_action( string $action ): void {
        switch ( $action ) {
            case 'generate_key':
                $label        = sanitize_text_field( $_POST['key_label'] ?? '' );
                $capabilities = isset( $_POST['capabilities'] ) && is_array( $_POST['capabilities'] )
                    ? Capabilities::filter( array_map( 'sanitize_text_field', $_POST['capabilities'] ) )
                    : [];

                if ( empty( $label ) ) {
                     add_settings_error( 'elementeer_mcp', 'missing_label', __( 'Key label is required.', 'elementeer' ) );
                    break;
                }

                $record  = Auth::get_instance()->generate_key( $label, $capabilities );
                $new_key = $record['key'];

                wp_safe_redirect( add_query_arg( [
                     'page'    => 'elementeer',
                    'new_key' => $new_key,
                ], admin_url( 'admin.php' ) ) );
                exit;

            case 'revoke_key':
                $key_value = sanitize_text_field( $_POST['key_value'] ?? '' );
                if ( ! empty( $key_value ) ) {
                    Auth::get_instance()->revoke_key( $key_value );
                }
                 wp_safe_redirect( add_query_arg( 'page', 'elementeer', admin_url( 'admin.php' ) ) );
                exit;

            case 'save_governance':
                $allowed_capabilities = [];
                if ( isset( $_POST['governance_capabilities_present'] ) ) {
                    $allowed_capabilities = isset( $_POST['allowed_capabilities'] ) && is_array( $_POST['allowed_capabilities'] )
                        ? Capabilities::filter( array_map( 'sanitize_text_field', $_POST['allowed_capabilities'] ) )
                        : [];
                }

                Settings::get_instance()->update( [
                    'allowed_capabilities' => $allowed_capabilities,
                    'max_keys'          => max( 1, (int) ( $_POST['max_keys'] ?? 10 ) ),
                    'audit_log_enabled' => ! empty( $_POST['audit_log_enabled'] ),
                    'require_approval'  => ! empty( $_POST['require_approval'] ),
                ] );
                 add_settings_error( 'elementeer_mcp', 'saved', __( 'Governance settings saved.', 'elementeer' ), 'updated' );
                break;
        }
    }
}
