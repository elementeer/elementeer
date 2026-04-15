<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\SiteContext;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

class SiteContextTest extends TestCase
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

    public function test_get_context_returns_defaults_with_project_profile_null(): void
    {
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = $this->make_controller();
        $response = $controller->get_context( new WP_REST_Request( 'GET' ) );

        $this->assertInstanceOf( WP_REST_Response::class, $response );
        $data = $response->get_data();

        $this->assertArrayHasKey( 'project_profile', $data );
        $this->assertNull( $data['project_profile'] );
    }

    public function test_set_context_persists_project_profile(): void
    {
        $saved = null;

        Functions\when( 'update_option' )->alias(
            static function ( string $key, array $value ) use ( &$saved ): bool {
                $saved = [ $key, $value ];
                return true;
            }
        );

        $controller = $this->make_controller();
        $request = new WP_REST_Request(
            'PUT',
            [
                'user_role' => 'agency',
                'site_purpose' => 'corporate',
                'project_profile' => [
                    'editing_mode' => 'approval-first',
                    'copy_density' => 'complete',
                    'layout_priority' => 'preserve-copy-completeness',
                    'change_style' => 'adaptive',
                    'question_policy' => 'ask-on-ambiguity',
                    'notes' => 'Prefer review before live changes.',
                ],
            ]
        );

        $response = $controller->set_context( $request );

        $this->assertInstanceOf( WP_REST_Response::class, $response );
        $this->assertNotNull( $saved );
        $this->assertSame( 'elementify_site_context', $saved[0] );
        $this->assertSame( 'approval-first', $saved[1]['project_profile']['editing_mode'] );
        $this->assertSame( 'complete', $saved[1]['project_profile']['copy_density'] );
        $this->assertSame( 'ask-on-ambiguity', $saved[1]['project_profile']['question_policy'] );
    }

    public function test_set_context_rejects_invalid_project_profile_value(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request(
            'PUT',
            [
                'project_profile' => [
                    'editing_mode' => 'wild-west',
                ],
            ]
        );

        $response = $controller->set_context( $request );

        $this->assertInstanceOf( WP_Error::class, $response );
        $this->assertSame( 'invalid_editing_mode', $response->get_error_code() );
    }

    private function make_controller(): SiteContext
    {
        $controller = new SiteContext();
        $auth = Mockery::mock( Manager::class );
        $auth->shouldReceive( 'authorize' )->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => [ 'site-foundation:read', 'site-foundation:write' ],
                'is_active' => true,
            ]
        );

        $ref = new \ReflectionProperty( SiteContext::class, 'auth' );
        $ref->setValue( $controller, $auth );

        return $controller;
    }
}
