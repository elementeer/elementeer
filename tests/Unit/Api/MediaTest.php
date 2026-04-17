<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Media;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

class MediaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\when('is_wp_error')->alias(
            static function($value): bool {
                return $value instanceof WP_Error;
            }
        );
        Functions\when('sanitize_text_field')->returnArg();
        Functions\when('sanitize_textarea_field')->returnArg();
        Functions\when('absint')->alias(
            static function($value): int {
                return (int) $value;
            }
        );
        Functions\when('rest_sanitize_boolean')->alias(
            static function($value): bool {
                return (bool) $value;
            }
        );

        // Reset WP_Query static properties
        \WP_Query::reset();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    private function create_attachment_post(array $properties): \WP_Post
    {
        return new \WP_Post((object) $properties);
    }

    // Test list_media
    public function test_list_media_returns_paginated_media(): void
    {
        // Mock WP_Query results
        $mock_posts = [
            $this->create_attachment_post([
                'ID' => 1,
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'post_title' => 'Test Image',
                'post_excerpt' => 'Caption',
                'post_content' => 'Description',
                'post_mime_type' => 'image/jpeg',
                'post_date' => '2025-01-01 00:00:00',
                'post_modified' => '2025-01-01 00:00:00',
                'post_author' => 1,
            ]),
            $this->create_attachment_post([
                'ID' => 2,
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'post_title' => 'Another Image',
                'post_excerpt' => '',
                'post_content' => '',
                'post_mime_type' => 'image/png',
                'post_date' => '2025-01-02 00:00:00',
                'post_modified' => '2025-01-02 00:00:00',
                'post_author' => 2,
            ]),
        ];
        \WP_Query::$mock_posts = $mock_posts;
        \WP_Query::$mock_found_posts = 15;
        \WP_Query::$mock_max_num_pages = 2;

        // Mock attachment formatting functions
        Functions\when('wp_get_attachment_metadata')->justReturn([
            'width' => 800,
            'height' => 600,
            'sizes' => [
                'thumbnail' => ['width' => 150, 'height' => 150],
                'medium' => ['width' => 300, 'height' => 200],
            ],
        ]);
        Functions\when('wp_get_attachment_image_url')->alias(
            static function($attachment_id, $size) {
                return "https://example.com/wp-content/uploads/{$attachment_id}-{$size}.jpg";
            }
        );
        Functions\when('wp_get_attachment_url')->alias(
            static function($attachment_id) {
                return "https://example.com/wp-content/uploads/{$attachment_id}.jpg";
            }
        );
        Functions\when('get_post_meta')->justReturn('Alt text');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', [
            'page' => 2,
            'per_page' => 10,
        ]);

        $response = $controller->list_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertArrayHasKey('media', $data);
        $this->assertCount(2, $data['media']);
        $this->assertSame(15, $data['total']);
        $this->assertSame(2, $data['total_pages']);
        $this->assertSame(2, $data['page']);
        $this->assertSame(10, $data['per_page']);

        // Verify WP_Query args
        $args = \WP_Query::$captured_args;
        $this->assertSame('attachment', $args['post_type']);
        $this->assertSame('inherit', $args['post_status']);
        $this->assertSame(10, $args['posts_per_page']);
        $this->assertSame(2, $args['paged']);
        $this->assertSame('date', $args['orderby']);
        $this->assertSame('DESC', $args['order']);
    }

    public function test_list_media_with_search_filter(): void
    {
        \WP_Query::$mock_posts = [];
        \WP_Query::$mock_found_posts = 0;
        \WP_Query::$mock_max_num_pages = 0;

        Functions\when('wp_get_attachment_metadata')->justReturn([]);
        Functions\when('wp_get_attachment_image_url')->justReturn('');
        Functions\when('wp_get_attachment_url')->justReturn('');
        Functions\when('get_post_meta')->justReturn('');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', [
            'search' => 'test query',
        ]);

        $response = $controller->list_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $args = \WP_Query::$captured_args;
        $this->assertSame('test query', $args['s']);
    }

    public function test_list_media_with_mime_type_filter(): void
    {
        \WP_Query::$mock_posts = [];
        \WP_Query::$mock_found_posts = 0;
        \WP_Query::$mock_max_num_pages = 0;

        Functions\when('wp_get_attachment_metadata')->justReturn([]);
        Functions\when('wp_get_attachment_image_url')->justReturn('');
        Functions\when('wp_get_attachment_url')->justReturn('');
        Functions\when('get_post_meta')->justReturn('');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', [
            'mime_type' => 'image/jpeg',
        ]);

        $response = $controller->list_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $args = \WP_Query::$captured_args;
        $this->assertSame('image/jpeg', $args['post_mime_type']);
    }

    public function test_list_media_unauthorized(): void
    {
        $controller = new Media();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            new WP_Error(
                'unauthorized',
                'Missing capability media-operations:read',
                ['status' => 403]
            )
        );
        $ref = new \ReflectionProperty(Media::class, 'auth');
        $ref->setValue($controller, $auth);

        $request = new WP_REST_Request('GET');
        $response = $controller->list_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('unauthorized', $response->get_error_code());
    }

    // Test get_media
    public function test_get_media_returns_attachment(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'post_title' => 'Test Image',
            'post_excerpt' => 'Caption',
            'post_content' => 'Description',
            'post_mime_type' => 'image/jpeg',
            'post_date' => '2025-01-01 00:00:00',
            'post_modified' => '2025-01-01 00:00:00',
            'post_author' => 1,
        ]);
        Functions\when('get_post')->justReturn($attachment);
        Functions\when('wp_get_attachment_metadata')->justReturn([
            'width' => 800,
            'height' => 600,
            'sizes' => [],
        ]);
        Functions\when('wp_get_attachment_image_url')->justReturn('https://example.com/image.jpg');
        Functions\when('wp_get_attachment_url')->justReturn('https://example.com/image-full.jpg');
        Functions\when('get_post_meta')->justReturn('Alt text');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', ['id' => 123]);

        $response = $controller->get_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertArrayHasKey('media', $data);
        $this->assertSame(123, $data['media']['id']);
        $this->assertSame('Test Image', $data['media']['title']);
        $this->assertSame('Caption', $data['media']['caption']);
        $this->assertSame('Description', $data['media']['description']);
        $this->assertSame('Alt text', $data['media']['alt_text']);
        $this->assertSame('image/jpeg', $data['media']['mime_type']);
    }

    public function test_get_media_invalid_id(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', ['id' => 0]);

        $response = $controller->get_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_missing_param', $response->get_error_code());
    }

    public function test_get_media_not_found(): void
    {
        Functions\when('get_post')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', ['id' => 999]);

        $response = $controller->get_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_not_found', $response->get_error_code());
    }

    public function test_get_media_wrong_post_type(): void
    {
        $post = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'post',
            'post_status' => 'publish',
        ]);
        Functions\when('get_post')->justReturn($post);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET', ['id' => 123]);

        $response = $controller->get_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_not_found', $response->get_error_code());
    }

    public function test_get_media_unauthorized(): void
    {
        $controller = new Media();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            new WP_Error(
                'unauthorized',
                'Missing capability media-operations:read',
                ['status' => 403]
            )
        );
        $ref = new \ReflectionProperty(Media::class, 'auth');
        $ref->setValue($controller, $auth);

        $request = new WP_REST_Request('GET', ['id' => 123]);

        $response = $controller->get_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('unauthorized', $response->get_error_code());
    }

    // Test update_media
    public function test_update_media_updates_fields(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'post_title' => 'Old Title',
            'post_excerpt' => 'Old Caption',
            'post_content' => 'Old Description',
            'post_mime_type' => 'image/jpeg',
            'post_date' => '2025-01-01 00:00:00',
            'post_modified' => '2025-01-01 00:00:00',
            'post_author' => 1,
        ]);
        Functions\when('get_post')->justReturn($attachment);
        $saved_meta = [];
        Functions\when('update_post_meta')->alias(
            static function($post_id, $meta_key, $meta_value) use (&$saved_meta) {
                $saved_meta[$meta_key] = $meta_value;
                return true;
            }
        );
        $updated_posts = [];
        Functions\when('wp_update_post')->alias(
            static function($postarr) use (&$updated_posts) {
                $updated_posts[] = $postarr;
                return $postarr['ID'];
            }
        );
        Functions\when('wp_get_attachment_metadata')->justReturn([]);
        Functions\when('wp_get_attachment_image_url')->justReturn('');
        Functions\when('wp_get_attachment_url')->justReturn('');
        Functions\when('get_post_meta')->justReturn('');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', [
            'id' => 123,
            'alt_text' => 'New Alt Text',
            'title' => 'New Title',
            'caption' => 'New Caption',
            'description' => 'New Description',
        ]);

        $response = $controller->update_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame(123, $data['media_id']);
        $this->assertArrayHasKey('updated', $data);
        // Ensure alt_text was processed
        $this->assertArrayHasKey('_wp_attachment_image_alt', $saved_meta, 'update_post_meta should have been called with _wp_attachment_image_alt');
        $this->assertSame('New Alt Text', $saved_meta['_wp_attachment_image_alt']);
        $this->assertArrayHasKey('alt_text', $data['updated']);
        $this->assertSame('New Alt Text', $data['updated']['alt_text']);
        $this->assertArrayHasKey('title', $data['updated']);
        $this->assertSame('New Title', $data['updated']['title']);
        $this->assertArrayHasKey('caption', $data['updated']);
        $this->assertSame('New Caption', $data['updated']['caption']);
        $this->assertArrayHasKey('description', $data['updated']);
        $this->assertSame('New Description', $data['updated']['description']);
        $this->assertArrayHasKey('media', $data);

        // Verify post updates
        $this->assertCount(3, $updated_posts); // title, caption, description (separate calls)
        $title_update = array_filter($updated_posts, static function($arr) {
            return isset($arr['post_title']);
        });
        $this->assertNotEmpty($title_update);
    }

    public function test_update_media_partial_updates(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'post_title' => 'Old Title',
            'post_excerpt' => 'Old Caption',
            'post_content' => 'Old Description',
            'post_mime_type' => 'image/jpeg',
            'post_date' => '2025-01-01 00:00:00',
            'post_modified' => '2025-01-01 00:00:00',
            'post_author' => 1,
        ]);
        Functions\when('get_post')->justReturn($attachment);
        $saved_meta = [];
        Functions\when('update_post_meta')->alias(
            static function($post_id, $meta_key, $meta_value) use (&$saved_meta) {
                $saved_meta[$meta_key] = $meta_value;
                return true;
            }
        );
        Functions\when('wp_update_post')->justReturn($attachment->ID);
        Functions\when('wp_get_attachment_metadata')->justReturn([]);
        Functions\when('wp_get_attachment_image_url')->justReturn('');
        Functions\when('wp_get_attachment_url')->justReturn('');
        Functions\when('get_post_meta')->justReturn('');

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', [
            'id' => 123,
            'alt_text' => 'New Alt Text',
        ]);

        $response = $controller->update_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame(123, $data['media_id']);
        $this->assertArrayHasKey('_wp_attachment_image_alt', $saved_meta, 'update_post_meta should have been called with _wp_attachment_image_alt');
        $this->assertSame('New Alt Text', $saved_meta['_wp_attachment_image_alt']);
        $this->assertArrayHasKey('alt_text', $data['updated']);
        $this->assertSame('New Alt Text', $data['updated']['alt_text']);
        $this->assertArrayNotHasKey('title', $data['updated']);
        $this->assertArrayNotHasKey('caption', $data['updated']);
        $this->assertArrayNotHasKey('description', $data['updated']);
    }

    public function test_update_media_invalid_id(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', ['id' => 0]);

        $response = $controller->update_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_missing_param', $response->get_error_code());
    }

    public function test_update_media_not_found(): void
    {
        Functions\when('get_post')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('PUT', ['id' => 999]);

        $response = $controller->update_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_not_found', $response->get_error_code());
    }

    public function test_update_media_unauthorized(): void
    {
        $controller = new Media();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            new WP_Error(
                'unauthorized',
                'Missing capability media-operations:write',
                ['status' => 403]
            )
        );
        $ref = new \ReflectionProperty(Media::class, 'auth');
        $ref->setValue($controller, $auth);

        $request = new WP_REST_Request('PUT', ['id' => 123]);

        $response = $controller->update_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('unauthorized', $response->get_error_code());
    }

    // Test delete_media
    public function test_delete_media_moves_to_trash(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
        ]);
        Functions\when('get_post')->justReturn($attachment);
        Functions\when('wp_delete_attachment')->justReturn($attachment);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('DELETE', ['id' => 123]);
        // force not set defaults to false (move to trash)

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame(123, $data['media_id']);
        $this->assertTrue($data['deleted']);
        $this->assertStringContainsString('moved to trash', $data['message']);
    }

    public function test_delete_media_permanent(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
        ]);
        Functions\when('get_post')->justReturn($attachment);
        Functions\when('wp_delete_attachment')->justReturn($attachment);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('DELETE', [
            'id' => 123,
            'force' => true,
        ]);

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame(123, $data['media_id']);
        $this->assertTrue($data['deleted']);
        $this->assertStringContainsString('permanently deleted', $data['message']);
    }

    public function test_delete_media_invalid_id(): void
    {
        $controller = $this->make_controller();
        $request = new WP_REST_Request('DELETE', ['id' => 0]);

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_missing_param', $response->get_error_code());
    }

    public function test_delete_media_not_found(): void
    {
        Functions\when('get_post')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('DELETE', ['id' => 999]);

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_not_found', $response->get_error_code());
    }

    public function test_delete_media_fails(): void
    {
        $attachment = $this->create_attachment_post([
            'ID' => 123,
            'post_type' => 'attachment',
            'post_status' => 'inherit',
        ]);
        Functions\when('get_post')->justReturn($attachment);
        Functions\when('wp_delete_attachment')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('DELETE', ['id' => 123]);

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_delete_failed', $response->get_error_code());
    }

    public function test_delete_media_unauthorized(): void
    {
        $controller = new Media();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            new WP_Error(
                'unauthorized',
                'Missing capability media-operations:write',
                ['status' => 403]
            )
        );
        $ref = new \ReflectionProperty(Media::class, 'auth');
        $ref->setValue($controller, $auth);

        $request = new WP_REST_Request('DELETE', ['id' => 123]);

        $response = $controller->delete_media($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('unauthorized', $response->get_error_code());
    }

    // Helper
    private function make_controller(): Media
    {
        $controller = new Media();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => ['media-operations:read', 'media-operations:write'],
                'is_active' => true,
            ]
        );

        $ref = new \ReflectionProperty(Media::class, 'auth');
        $ref->setValue($controller, $auth);

        return $controller;
    }
}
