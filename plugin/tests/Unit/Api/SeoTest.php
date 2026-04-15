<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Seo;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

class SeoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\when('is_wp_error')->alias(
            static fn($value): bool => $value instanceof WP_Error
        );
        Functions\when('sanitize_text_field')->returnArg();
        Functions\when('sanitize_textarea_field')->returnArg();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_get_seo_meta_requires_post_id(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET');
        // No post_id parameter
        $response = $controller->get_seo_meta($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('missing_post_id', $response->get_error_code());
    }

    public function test_get_seo_meta_returns_empty_when_no_plugin(): void
    {
        Functions\when('get_post')->justReturn((object) ['ID' => 123]);
        Functions\when('get_post_meta')->justReturn('');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET');
        $request->set_param('post_id', 123);

        $response = $controller->get_seo_meta($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame(123, $data['post_id']);
        $this->assertSame('', $data['plugin']);
        $this->assertSame('', $data['title']);
        $this->assertSame('', $data['description']);
        $this->assertSame('', $data['focus_keyword']);
    }

    public function test_get_seo_meta_with_yoast(): void
    {
        Functions\when('get_post')->justReturn((object) ['ID' => 123]);
        Functions\when('get_post_meta')->alias(function($post_id, $key) {
            $map = [
                '_yoast_wpseo_title' => 'Test Title',
                '_yoast_wpseo_metadesc' => 'Test Description',
                '_yoast_wpseo_focuskw' => 'test keyword',
            ];
            return $map[$key] ?? '';
        });
        Functions\when('defined')->alias(function($constant) {
            return $constant === 'WPSEO_VERSION';
        });

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET');
        $request->set_param('post_id', 123);

        $response = $controller->get_seo_meta($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame('yoast', $data['plugin']);
        $this->assertSame('Test Title', $data['title']);
        $this->assertSame('Test Description', $data['description']);
        $this->assertSame('test keyword', $data['focus_keyword']);
    }

    public function test_update_seo_meta_requires_post_id(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', []);

        $response = $controller->update_seo_meta($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('missing_post_id', $response->get_error_code());
    }

    public function test_update_seo_meta_rejects_missing_post(): void
    {
        Functions\when('get_post')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', ['post_id' => 999]);

        $response = $controller->update_seo_meta($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('not_found', $response->get_error_code());
    }

    public function test_update_seo_meta_with_no_plugin(): void
    {
        Functions\when('get_post')->justReturn((object) ['ID' => 123]);
        Functions\when('defined')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', [
            'post_id' => 123,
            'title' => 'New Title',
        ]);

        $response = $controller->update_seo_meta($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('no_seo_plugin', $response->get_error_code());
    }

    public function test_update_seo_meta_updates_fields(): void
    {
        Functions\when('get_post')->justReturn((object) ['ID' => 123]);
        Functions\when('defined')->alias(function($constant) {
            return $constant === 'RANK_MATH_VERSION';
        });
        $saved = [];
        Functions\when('update_post_meta')->alias(
            static function($post_id, $meta_key, $meta_value) use (&$saved) {
                $saved[$meta_key] = $meta_value;
                return true;
            }
        );

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', [
            'post_id' => 123,
            'title' => 'Rank Math Title',
            'description' => 'Rank Math Description',
            'focus_keyword' => 'rankmath keyword',
        ]);

        $response = $controller->update_seo_meta($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame('rankmath', $data['plugin']);
        $this->assertContains('title', $data['updated']);
        $this->assertContains('description', $data['updated']);
        $this->assertContains('focus_keyword', $data['updated']);
        $this->assertArrayHasKey('rank_math_title', $saved);
        $this->assertSame('Rank Math Title', $saved['rank_math_title']);
        $this->assertArrayHasKey('rank_math_description', $saved);
        $this->assertSame('Rank Math Description', $saved['rank_math_description']);
        $this->assertArrayHasKey('rank_math_focus_keyword', $saved);
        $this->assertSame('rankmath keyword', $saved['rank_math_focus_keyword']);
    }

    private function make_controller(): Seo
    {
        $controller = new Seo();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => ['seo-operations:read', 'seo-operations:write'],
                'is_active' => true,
            ]
        );

        $ref = new \ReflectionProperty(Seo::class, 'auth');
        $ref->setValue($controller, $auth);

        return $controller;
    }
}