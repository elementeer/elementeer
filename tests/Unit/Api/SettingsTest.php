<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Settings;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

class SettingsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\when( 'is_wp_error' )->alias(
            static fn ( $value ): bool => $value instanceof WP_Error
        );
        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'sanitize_textarea_field' )->returnArg();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_get_site_settings_returns_defaults(): void
    {
        Functions\when( 'get_option' )->alias( function( $key, $default = '' ) {
            static $options = [
                'blogname' => 'Test Site',
                'blogdescription' => 'Just another WordPress site',
                'page_on_front' => 0,
                'page_for_posts' => 0,
                'permalink_structure' => '/%postname%/',
                'date_format' => 'F j, Y',
                'time_format' => 'g:i a',
                'start_of_week' => 1,
            ];
            return $options[$key] ?? $default;
        });
        Functions\when( 'get_the_title' )->returnArg();
        Functions\when( 'get_permalink' )->justReturn( 'https://example.com/page' );
        Functions\when( 'wp_timezone_string' )->justReturn( 'UTC' );

        $controller = $this->make_controller();
        $response = $controller->get_site_settings( new WP_REST_Request( 'GET' ) );

        $this->assertInstanceOf( WP_REST_Response::class, $response );
        $data = $response->get_data();

        $this->assertArrayHasKey( 'blogname', $data );
        $this->assertSame( 'Test Site', $data['blogname'] );
        $this->assertArrayHasKey( 'homepage', $data );
        $this->assertNull( $data['homepage'] );
        $this->assertSame( '/%postname%/', $data['permalink'] );
    }

    public function test_update_site_settings_updates_blogname(): void
    {
        $saved = [];
        Functions\when( 'update_option' )->alias(
            static function ( string $key, $value ) use ( &$saved ): bool {
                $saved[$key] = $value;
                return true;
            }
        );
        Functions\when( 'get_option' )->alias( function( $key, $default = '' ) use ( &$saved ) {
            if ( isset( $saved[$key] ) ) {
                return $saved[$key];
            }
            static $defaults = [
                'blogname' => 'Old Site',
                'blogdescription' => '',
                'page_on_front' => 0,
                'page_for_posts' => 0,
                'permalink_structure' => '',
                'date_format' => 'F j, Y',
                'time_format' => 'g:i a',
                'start_of_week' => 0,
            ];
            return $defaults[$key] ?? $default;
        });
        Functions\when( 'get_the_title' )->returnArg();
        Functions\when( 'get_permalink' )->justReturn( 'https://example.com/page' );
        Functions\when( 'get_post' )->justReturn( (object) [ 'ID' => 42 ] );
        Functions\when( 'flush_rewrite_rules' )->justReturn();
        Functions\when( 'wp_timezone_string' )->justReturn( 'UTC' );

        $controller = $this->make_controller();
        $request = new WP_REST_Request( 'PUT', [
            'blogname' => 'New Site Name',
        ] );

        $response = $controller->update_site_settings( $request );

        $this->assertInstanceOf( WP_REST_Response::class, $response );
        $data = $response->get_data();
        $this->assertContains( 'blogname', $data['updated'] );
        $this->assertArrayHasKey( 'settings', $data );
        $this->assertSame( 'New Site Name', $data['settings']['blogname'] );
    }

    public function test_update_site_settings_rejects_invalid_homepage(): void
    {
        Functions\when( 'get_post' )->justReturn( false );
        Functions\when( 'update_option' )->justReturn( true );

        $controller = $this->make_controller();
        $request = new WP_REST_Request( 'PUT', [
            'homepage' => 999,
        ] );

        $response = $controller->update_site_settings( $request );

        $this->assertInstanceOf( WP_Error::class, $response );
        $this->assertSame( 'invalid_settings', $response->get_error_code() );
    }

    private function make_controller(): Settings
    {
        $controller = new Settings();
        $auth = Mockery::mock( Manager::class );
        $auth->shouldReceive( 'authorize' )->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => [ 'site-settings:read', 'site-settings:write' ],
                'is_active' => true,
            ]
        );

        $ref = new \ReflectionProperty( Settings::class, 'auth' );
        $ref->setValue( $controller, $auth );

        return $controller;
    }
}