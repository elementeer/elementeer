<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Governance;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Governance\Settings;
use Mockery;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for Governance\Settings.
 */
class SettingsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Reset singleton between tests
        $ref = new \ReflectionProperty( Settings::class, 'instance' );
        $ref->setValue( null, null );
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------ //
    // get()
    // ------------------------------------------------------------------ //

    public function test_get_returns_defaults_when_no_option_set(): void
    {
        Functions\when( 'get_option' )->justReturn( [] );

        $settings = Settings::get_instance();
        $result   = $settings->get();

        $this->assertArrayHasKey( 'allowed_capabilities', $result );
        $this->assertArrayHasKey( 'require_approval', $result );
        $this->assertArrayHasKey( 'audit_log_enabled', $result );
        $this->assertArrayHasKey( 'max_keys', $result );

        // Default capabilities use the canonical domain model
        $this->assertContains( 'content-structure:read', $result['allowed_capabilities'] );
        $this->assertContains( 'content-structure:write', $result['allowed_capabilities'] );
        $this->assertContains( 'site-audit:read', $result['allowed_capabilities'] );

        // Default values
        $this->assertFalse( $result['require_approval'] );
        $this->assertTrue( $result['audit_log_enabled'] );
        $this->assertSame( 10, $result['max_keys'] );
    }

    public function test_get_merges_stored_values_with_defaults(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'require_approval' => true,
            'max_keys'         => 5,
        ] );

        $settings = Settings::get_instance();
        $result   = $settings->get();

        $this->assertTrue( $result['require_approval'] );
        $this->assertSame( 5, $result['max_keys'] );
        // Defaults still present for unset keys
        $this->assertTrue( $result['audit_log_enabled'] );
        $this->assertNotEmpty( $result['allowed_capabilities'] );
    }

    public function test_get_handles_non_array_stored_value(): void
    {
        Functions\when( 'get_option' )->justReturn( false ); // get_option returns false when not set

        $settings = Settings::get_instance();
        $result   = $settings->get();

        // Should not throw, should return defaults
        $this->assertIsArray( $result );
        $this->assertArrayHasKey( 'allowed_capabilities', $result );
    }

    // ------------------------------------------------------------------ //
    // update()
    // ------------------------------------------------------------------ //

    public function test_update_persists_settings_via_update_option(): void
    {
        $savedValue = null;

        Functions\when( 'get_option' )->justReturn( [] );
        Functions\when( 'update_option' )->alias( function ( string $option, $value ) use ( &$savedValue ) {
            $savedValue = $value;
            return true;
        } );

        $settings = Settings::get_instance();
        $settings->update( [ 'require_approval' => true ] );

        $this->assertNotNull( $savedValue );
        $this->assertTrue( $savedValue['require_approval'] );
    }

    public function test_update_ignores_unrecognized_keys(): void
    {
        $savedValue = null;

        Functions\when( 'get_option' )->justReturn( [] );
        Functions\when( 'update_option' )->alias( function ( string $option, $value ) use ( &$savedValue ) {
            $savedValue = $value;
            return true;
        } );

        $settings = Settings::get_instance();
        $settings->update( [ 'unknown_key' => 'should_be_ignored' ] );

        $this->assertNotNull( $savedValue );
        $this->assertArrayNotHasKey( 'unknown_key', $savedValue );
    }

    public function test_update_filters_invalid_capabilities(): void
    {
        $savedValue = null;

        Functions\when( 'get_option' )->justReturn( [] );
        Functions\when( 'update_option' )->alias( function ( string $option, $value ) use ( &$savedValue ) {
            $savedValue = $value;
            return true;
        } );

        $settings = Settings::get_instance();
        $settings->update( [
            'allowed_capabilities' => [
                'templates:read',      // valid
                'fake:capability',     // invalid — should be removed
                'templates:delete',    // valid
            ],
        ] );

        $this->assertNotNull( $savedValue );
        $this->assertContains( 'content-structure:read', $savedValue['allowed_capabilities'] );
        $this->assertContains( 'content-structure:write', $savedValue['allowed_capabilities'] );
        $this->assertNotContains( 'fake:capability', $savedValue['allowed_capabilities'] );
    }

    // ------------------------------------------------------------------ //
    // is_allowed()
    // ------------------------------------------------------------------ //

    public function test_is_allowed_returns_true_when_capability_in_allowed_list(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [ 'templates:read', 'templates:write' ],
        ] );

        $settings = Settings::get_instance();
        $this->assertTrue( $settings->is_allowed( 'templates:read' ) );
        $this->assertTrue( $settings->is_allowed( 'templates:write' ) );
    }

    public function test_is_allowed_accepts_canonical_domain_capabilities(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [ 'library-operations:read', 'governance:review' ],
        ] );

        $settings = Settings::get_instance();
        $this->assertTrue( $settings->is_allowed( 'library-operations:read' ) );
        $this->assertTrue( $settings->is_allowed( 'governance:review' ) );
    }

    public function test_is_allowed_returns_false_when_capability_not_in_allowed_list(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [ 'templates:read' ],
        ] );

        $settings = Settings::get_instance();
        $this->assertFalse( $settings->is_allowed( 'templates:delete' ) );
    }

    public function test_is_allowed_returns_false_when_allowed_capabilities_is_empty(): void
    {
        // Empty allowed_capabilities = deny all
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [],
        ] );

        $settings = Settings::get_instance();
        $this->assertFalse( $settings->is_allowed( 'templates:read' ) );
        $this->assertFalse( $settings->is_allowed( 'templates:write' ) );
        $this->assertFalse( $settings->is_allowed( 'templates:delete' ) );
    }
}
