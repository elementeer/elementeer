<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Activation;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Activation\Mode;
use Mockery;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for Activation\Mode.
 */
class ModeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Reset singleton
        $ref = new \ReflectionProperty( Mode::class, 'instance' );
        $ref->setAccessible( true );
        $ref->setValue( null, null );
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    private function getMode(): Mode
    {
        return Mode::get_instance();
    }

    // ------------------------------------------------------------------ //
    // detect() / get_mode() — mode computation
    // ------------------------------------------------------------------ //

    public function test_get_mode_returns_vamerli_embedded_when_vamerli_studio_class_exists(): void
    {
        // Simulate Vamerli Studio being active via class
        Functions\when( 'get_option' )->justReturn( '' );
        Functions\when( 'update_option' )->justReturn( true );

        // We can't easily define a class at runtime, so we test via the constant path
        // Define VAMERLI_STUDIO_VERSION constant to simulate Vamerli being active
        if ( ! defined( 'VAMERLI_STUDIO_VERSION' ) ) {
            define( 'VAMERLI_STUDIO_VERSION', '1.0.0' );
        }

        // Ensure we're not in agency mode
        // get_option('vamerli_license_tier') should return empty
        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            if ( 'vamerli_license_tier' === $option ) {
                return '';
            }
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertSame( 'vamerli-embedded', $result );
    }

    public function test_get_mode_returns_vamerli_agency_when_license_tier_is_agency(): void
    {
        if ( ! defined( 'VAMERLI_STUDIO_VERSION' ) ) {
            define( 'VAMERLI_STUDIO_VERSION', '1.0.0' );
        }

        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            if ( 'vamerli_license_tier' === $option ) {
                return 'agency';
            }
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertSame( 'vamerli-agency', $result );
    }

    public function test_get_mode_returns_standalone_pro_when_pro_license_present(): void
    {
        // No Vamerli, but has a pro license option
        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            if ( 'elementify_mcp_pro_license' === $option ) {
                return 'VALID-PRO-LICENSE-KEY';
            }
            if ( ELEMENTIFY_MCP_OPTION_MODE === $option ) {
                return '';
            }
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        // Only run this test if VAMERLI_STUDIO_VERSION is not defined (would change result)
        if ( defined( 'VAMERLI_STUDIO_VERSION' ) ) {
            $this->markTestSkipped( 'VAMERLI_STUDIO_VERSION is defined in this environment; standalone-pro path cannot be isolated.' );
        }

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertSame( 'standalone-pro', $result );
    }

    public function test_get_mode_returns_standalone_free_as_default(): void
    {
        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            // No pro license, no Vamerli, no stored mode
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        if ( defined( 'VAMERLI_STUDIO_VERSION' ) ) {
            $this->markTestSkipped( 'VAMERLI_STUDIO_VERSION defined; standalone-free path cannot be isolated.' );
        }

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertSame( 'standalone-free', $result );
    }

    public function test_detect_persists_mode_to_wp_options(): void
    {
        $updatedOption = null;
        $updatedValue  = null;

        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->alias( function ( $option, $value ) use ( &$updatedOption, &$updatedValue ) {
            $updatedOption = $option;
            $updatedValue  = $value;
            return true;
        } );

        if ( defined( 'VAMERLI_STUDIO_VERSION' ) ) {
            $this->markTestSkipped( 'VAMERLI_STUDIO_VERSION defined; cannot test standalone detection.' );
        }

        $mode = $this->getMode();
        $mode->detect();

        $this->assertSame( ELEMENTIFY_MCP_OPTION_MODE, $updatedOption );
        $this->assertIsString( $updatedValue );
        $this->assertNotEmpty( $updatedValue );
    }

    public function test_get_mode_returns_stored_mode_without_recomputing(): void
    {
        // If a mode is already stored, return it without re-evaluating environment
        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_MODE === $option ) {
                return 'standalone-pro'; // already stored
            }
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertSame( 'standalone-pro', $result );
    }

    public function test_valid_mode_values_are_constrained_to_known_set(): void
    {
        $validModes = [ 'standalone-free', 'standalone-pro', 'vamerli-embedded', 'vamerli-agency' ];

        Functions\when( 'get_option' )->alias( function ( $option, $default = null ) {
            if ( ELEMENTIFY_MCP_OPTION_MODE === $option ) {
                return 'standalone-free';
            }
            return $default ?? '';
        } );
        Functions\when( 'update_option' )->justReturn( true );

        $mode   = $this->getMode();
        $result = $mode->get_mode();

        $this->assertContains( $result, $validModes );
    }
}
