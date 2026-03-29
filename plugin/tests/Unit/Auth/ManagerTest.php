<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Auth;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;

/**
 * Unit tests for Auth\Manager.
 *
 * Critical contract being tested:
 *   - `authenticate()` returns WP_Error 'elementify_invalid_key' when key is missing or wrong.
 *   - `check_capability()` returns WP_Error 'elementify_insufficient_scope' (NOT 'elementify_invalid_key')
 *     when the key is valid but lacks a capability. This distinction is the Respira bug fix.
 *   - `governance_allows()` returns WP_Error 'elementify_governance_blocked' when governance blocks.
 *   - `generate_key()` produces keys with 'ek_' prefix.
 */
class ManagerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Stub WP_Error and WP_REST_Request if not available (non-WP environment)
        if ( ! class_exists( 'WP_Error' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_Error.php';
        }
        if ( ! class_exists( 'WP_REST_Request' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_REST_Request.php';
        }

        // Reset singleton between tests
        $ref = new \ReflectionProperty( Manager::class, 'instance' );
        $ref->setAccessible( true );
        $ref->setValue( null, null );
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------ //
    // authenticate()
    // ------------------------------------------------------------------ //

    public function test_authenticate_returns_error_when_no_key_header(): void
    {
        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_header' )
            ->with( 'X-Elementify-Key' )
            ->andReturn( '' );
        $request->shouldReceive( 'get_header' )
            ->with( 'Authorization' )
            ->andReturn( '' );

        $manager = Manager::get_instance();
        $result  = $manager->authenticate( $request );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_invalid_key', $result->get_error_code() );
    }

    public function test_authenticate_returns_error_for_unknown_key(): void
    {
        Functions\when( 'get_option' )->justReturn( [] ); // no keys stored

        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_header' )
            ->with( 'X-Elementify-Key' )
            ->andReturn( 'ek_unknown_key_value' );

        $manager = Manager::get_instance();
        $result  = $manager->authenticate( $request );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_invalid_key', $result->get_error_code() );
    }

    public function test_authenticate_returns_error_for_inactive_key(): void
    {
        $storedKeys = [
            [
                'key'          => 'ek_inactive_key',
                'label'        => 'Inactive',
                'capabilities' => [ 'templates:read' ],
                'is_active'    => false,
                'created_at'   => '2025-01-01T00:00:00',
                'last_used'    => null,
            ],
        ];

        Functions\when( 'get_option' )->justReturn( $storedKeys );
        Functions\when( 'update_option' )->justReturn( true );

        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_header' )
            ->with( 'X-Elementify-Key' )
            ->andReturn( 'ek_inactive_key' );

        $manager = Manager::get_instance();
        $result  = $manager->authenticate( $request );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_invalid_key', $result->get_error_code() );
    }

    public function test_authenticate_succeeds_for_valid_active_key(): void
    {
        $storedKeys = [
            [
                'key'          => 'ek_valid_key',
                'label'        => 'My Key',
                'capabilities' => [ 'templates:read', 'templates:write' ],
                'is_active'    => true,
                'created_at'   => '2025-01-01T00:00:00',
                'last_used'    => null,
            ],
        ];

        Functions\when( 'get_option' )->justReturn( $storedKeys );
        Functions\when( 'update_option' )->justReturn( true );

        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_header' )
            ->with( 'X-Elementify-Key' )
            ->andReturn( 'ek_valid_key' );

        $manager = Manager::get_instance();
        $result  = $manager->authenticate( $request );

        $this->assertIsArray( $result );
        $this->assertSame( 'ek_valid_key', $result['key'] );
        $this->assertSame( 'My Key', $result['label'] );
    }

    public function test_authenticate_accepts_bearer_token_fallback(): void
    {
        $storedKeys = [
            [
                'key'          => 'ek_bearer_key',
                'label'        => 'Bearer Key',
                'capabilities' => [ 'templates:read' ],
                'is_active'    => true,
                'created_at'   => '2025-01-01T00:00:00',
                'last_used'    => null,
            ],
        ];

        Functions\when( 'get_option' )->justReturn( $storedKeys );
        Functions\when( 'update_option' )->justReturn( true );

        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_header' )
            ->with( 'X-Elementify-Key' )
            ->andReturn( '' );
        $request->shouldReceive( 'get_header' )
            ->with( 'Authorization' )
            ->andReturn( 'Bearer ek_bearer_key' );

        $manager = Manager::get_instance();
        $result  = $manager->authenticate( $request );

        $this->assertIsArray( $result );
        $this->assertSame( 'ek_bearer_key', $result['key'] );
    }

    // ------------------------------------------------------------------ //
    // check_capability() — the critical distinction
    // ------------------------------------------------------------------ //

    public function test_check_capability_returns_true_when_key_has_capability(): void
    {
        $keyData = [
            'key'          => 'ek_test',
            'capabilities' => [ 'templates:read', 'templates:write' ],
            'is_active'    => true,
        ];

        $manager = Manager::get_instance();
        $result  = $manager->check_capability( $keyData, 'templates:write' );

        $this->assertTrue( $result );
    }

    public function test_check_capability_returns_insufficient_scope_not_invalid_key(): void
    {
        // CRITICAL: when a valid key lacks a capability, the error MUST be
        // 'elementify_insufficient_scope', NOT 'elementify_invalid_key'.
        // This is the exact bug that existed in Respira.

        $keyData = [
            'key'          => 'ek_test',
            'capabilities' => [ 'templates:read' ], // only has read, not delete
            'is_active'    => true,
        ];

        $manager = Manager::get_instance();
        $result  = $manager->check_capability( $keyData, 'templates:delete' );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_insufficient_scope', $result->get_error_code() );

        // Explicitly assert it is NOT the wrong error code
        $this->assertNotSame( 'elementify_invalid_key', $result->get_error_code() );
    }

    public function test_check_capability_returns_false_for_empty_capabilities(): void
    {
        $keyData = [
            'key'          => 'ek_test',
            'capabilities' => [], // no capabilities at all
            'is_active'    => true,
        ];

        $manager = Manager::get_instance();
        $result  = $manager->check_capability( $keyData, 'templates:read' );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_insufficient_scope', $result->get_error_code() );
    }

    // ------------------------------------------------------------------ //
    // governance_allows()
    // ------------------------------------------------------------------ //

    public function test_governance_allows_returns_true_when_capability_allowed(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [ 'templates:read', 'templates:write', 'templates:delete' ],
            'require_approval'     => false,
            'audit_log_enabled'    => true,
            'max_keys'             => 10,
        ] );

        // Reset Settings singleton too
        $settingsRef = new \ReflectionProperty( \Elementify\MCP\Governance\Settings::class, 'instance' );
        $settingsRef->setAccessible( true );
        $settingsRef->setValue( null, null );

        $manager = Manager::get_instance();
        $result  = $manager->governance_allows( 'templates:delete' );

        $this->assertTrue( $result );
    }

    public function test_governance_allows_returns_governance_blocked_when_denied(): void
    {
        Functions\when( 'get_option' )->justReturn( [
            'allowed_capabilities' => [ 'templates:read' ], // delete not allowed
        ] );

        $settingsRef = new \ReflectionProperty( \Elementify\MCP\Governance\Settings::class, 'instance' );
        $settingsRef->setAccessible( true );
        $settingsRef->setValue( null, null );

        $manager = Manager::get_instance();
        $result  = $manager->governance_allows( 'templates:delete' );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'elementify_governance_blocked', $result->get_error_code() );
    }

    // ------------------------------------------------------------------ //
    // generate_key()
    // ------------------------------------------------------------------ //

    public function test_generate_key_returns_key_with_ek_prefix(): void
    {
        $existingKeys = [];
        Functions\when( 'get_option' )->justReturn( $existingKeys );
        Functions\when( 'update_option' )->justReturn( true );

        $manager = Manager::get_instance();
        $record  = $manager->generate_key( 'Test Key', [ 'templates:read' ] );

        $this->assertStringStartsWith( 'ek_', $record['key'] );
        $this->assertSame( 'Test Key', $record['label'] );
        $this->assertSame( [ 'templates:read' ], $record['capabilities'] );
        $this->assertTrue( $record['is_active'] );
        $this->assertNull( $record['last_used'] );
    }

    public function test_generate_key_produces_unique_keys(): void
    {
        Functions\when( 'get_option' )->justReturn( [] );
        Functions\when( 'update_option' )->justReturn( true );

        $manager = Manager::get_instance();
        $key1    = $manager->generate_key( 'Key 1', [] );
        $key2    = $manager->generate_key( 'Key 2', [] );

        $this->assertNotSame( $key1['key'], $key2['key'] );
    }

    // ------------------------------------------------------------------ //
    // revoke_key()
    // ------------------------------------------------------------------ //

    public function test_revoke_key_deactivates_key(): void
    {
        $storedKeys = [
            [
                'key'          => 'ek_to_revoke',
                'label'        => 'Revokable',
                'capabilities' => [ 'templates:read' ],
                'is_active'    => true,
                'created_at'   => '2025-01-01T00:00:00',
                'last_used'    => null,
            ],
        ];

        $savedKeys = null;
        Functions\when( 'get_option' )->justReturn( $storedKeys );
        Functions\when( 'update_option' )->alias( function ( $option, $value ) use ( &$savedKeys ) {
            $savedKeys = $value;
            return true;
        } );

        $manager = Manager::get_instance();
        $result  = $manager->revoke_key( 'ek_to_revoke' );

        $this->assertTrue( $result );
        $this->assertNotNull( $savedKeys );
        $this->assertFalse( $savedKeys[0]['is_active'] );
    }

    public function test_revoke_key_returns_false_for_nonexistent_key(): void
    {
        Functions\when( 'get_option' )->justReturn( [] );

        $manager = Manager::get_instance();
        $result  = $manager->revoke_key( 'ek_nonexistent' );

        $this->assertFalse( $result );
    }
}
