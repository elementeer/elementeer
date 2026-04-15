<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Admin;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Admin\Page;
use Elementify\MCP\Governance\Settings;
use Mockery;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for Admin\Page key rendering behavior.
 */
class PageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        $_GET  = [];
        $_POST = [];

        $settings_ref = new \ReflectionProperty( Settings::class, 'instance' );
        $settings_ref->setValue( null, null );

        Functions\when( 'current_user_can' )->justReturn( true );
        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [];
            }

            return $default;
        } );
        Functions\when( 'esc_html' )->returnArg();
        Functions\when( 'esc_attr' )->returnArg();
        Functions\when( 'esc_js' )->returnArg();
        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'sanitize_textarea_field' )->returnArg();
        Functions\when( 'wp_unslash' )->returnArg();
        Functions\when( 'check_admin_referer' )->justReturn( true );
        Functions\when( 'wp_nonce_field' )->alias( static function (): void {} );
        Functions\when( 'add_settings_error' )->alias( static function (): void {} );
        Functions\when( 'submit_button' )->alias( static function ( string $text ): void {
            echo '<button type="submit">' . $text . '</button>';
        } );
        Functions\when( 'checked' )->alias( static function ( $checked, $current = true ): void {
            if ( $checked === $current ) {
                echo 'checked="checked"';
            }
        } );
    }

    protected function tearDown(): void
    {
        $_GET  = [];
        $_POST = [];

        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_render_shows_copy_button_for_active_existing_key(): void
    {
        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [
                    [
                        'key'          => 'ek_active_key_123456789',
                        'label'        => 'Primary Key',
                        'capabilities' => [ 'templates:read' ],
                        'created_at'   => '2026-04-12T00:00:00Z',
                        'last_used'    => null,
                        'is_active'    => true,
                    ],
                ];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [];
            }

            return $default;
        } );

        ob_start();
        Page::render();
        $html = (string) ob_get_clean();

        $this->assertStringContainsString( 'Primary Key', $html );
        $this->assertStringContainsString( 'navigator.clipboard.writeText(\'ek_active_key_123456789\')', $html );
        $this->assertMatchesRegularExpression( '/>\s*Copy\s*</', $html );
    }

    public function test_render_normalizes_legacy_capabilities_to_domain_labels(): void
    {
        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [
                    [
                        'key'          => 'ek_legacy_key_123456789',
                        'label'        => 'Legacy Key',
                        'capabilities' => [ 'templates:read', 'site:read' ],
                        'created_at'   => '2026-04-12T00:00:00Z',
                        'last_used'    => null,
                        'is_active'    => true,
                    ],
                ];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [];
            }

            return $default;
        } );

        ob_start();
        Page::render();
        $html = (string) ob_get_clean();

        $this->assertStringContainsString( 'Content Structure — Read', $html );
        $this->assertStringContainsString( 'Site Audit — Read', $html );
    }

    public function test_render_hides_copy_button_for_revoked_key(): void
    {
        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [
                    [
                        'key'          => 'ek_revoked_key_987654321',
                        'label'        => 'Revoked Key',
                        'capabilities' => [ 'templates:read' ],
                        'created_at'   => '2026-04-12T00:00:00Z',
                        'last_used'    => null,
                        'is_active'    => false,
                    ],
                ];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [];
            }

            return $default;
        } );

        ob_start();
        Page::render();
        $html = (string) ob_get_clean();

        $this->assertStringContainsString( 'Revoked', $html );
        $this->assertStringNotContainsString( 'navigator.clipboard.writeText(\'ek_revoked_key_987654321\')', $html );
    }

    public function test_render_shows_governance_capability_groups(): void
    {
        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [
                    'allowed_capabilities' => [ 'content-structure:read', 'design-system:write' ],
                ];
            }

            return $default;
        } );

        ob_start();
        Page::render();
        $html = (string) ob_get_clean();

        $this->assertStringContainsString( 'Allowed Capabilities', $html );
        $this->assertStringContainsString( 'name="allowed_capabilities[]"', $html );
        $this->assertStringContainsString( 'Content Structure — Read', $html );
        $this->assertStringContainsString( 'Design System — Write', $html );
    }

    public function test_save_governance_normalizes_and_persists_allowed_capabilities(): void
    {
        $savedGovernance = null;

        $_POST = [
            'elementify_action'               => 'save_governance',
            'governance_capabilities_present' => '1',
            'allowed_capabilities'           => [ 'content-structure:read', 'templates:write', 'fake:scope' ],
            'max_keys'                       => '12',
            'audit_log_enabled'             => '1',
            'require_approval'              => '1',
        ];

        Functions\when( 'get_option' )->alias( function ( string $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_KEYS === $option ) {
                return [];
            }
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                return [];
            }

            return $default;
        } );
        Functions\when( 'update_option' )->alias( function ( string $option, $value ) use ( &$savedGovernance ) {
            if ( ELEMENTIFY_MCP_OPTION_GOVERNANCE === $option ) {
                $savedGovernance = $value;
            }

            return true;
        } );

        ob_start();
        Page::render();
        ob_end_clean();

        $this->assertIsArray( $savedGovernance );
        $this->assertSame(
            [ 'content-structure:read', 'content-structure:write' ],
            $savedGovernance['allowed_capabilities']
        );
        $this->assertSame( 12, $savedGovernance['max_keys'] );
        $this->assertTrue( $savedGovernance['audit_log_enabled'] );
        $this->assertTrue( $savedGovernance['require_approval'] );
    }
}
