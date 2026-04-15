<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Performance;
use Elementify\MCP\Auth\Manager;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

class PerformanceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\when('is_wp_error')->alias(
            static fn($value): bool => $value instanceof WP_Error
        );
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_flush_elementor_cache_success(): void
    {
        // Mock Elementor class exists
        $mockFilesManager = Mockery::mock('overload:Elementor\Plugin');
        $mockFilesManager->shouldReceive('files_manager->clear_cache')->once();

        Functions\when('class_exists')->alias(function($class) {
            return $class === 'Elementor\Plugin';
        });

        $controller = $this->make_controller();
        $request = new WP_REST_Request('POST');

        $response = $controller->flush_elementor_cache($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertTrue($data['flushed']);
        $this->assertSame('Elementor CSS cache cleared.', $data['message']);
    }

    public function test_flush_elementor_cache_elementor_not_active(): void
    {
        Functions\when('class_exists')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('POST');

        $response = $controller->flush_elementor_cache($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementor_not_active', $response->get_error_code());
    }

    public function test_get_performance_report(): void
    {
        Functions\when('defined')->alias(function($constant) {
            return $constant === 'ELEMENTOR_VERSION' || $constant === 'ELEMENTOR_PRO_VERSION';
        });
        Functions\when('get_option')->alias(function($key) {
            if ($key === 'elementor_css_print_method') {
                return 'internal';
            }
            if ($key === 'elementor_disable_color_schemes') {
                return '1';
            }
            if ($key === 'elementor_disable_typography_schemes') {
                return '0';
            }
            return '';
        });
        Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/wp-content/uploads']);
        Functions\when('is_dir')->justReturn(true);
        Functions\when('scandir')->justReturn(['.', '..', 'file.css']);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('GET');

        $response = $controller->get_performance_report($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertSame('internal', $data['css_method']);
        $this->assertArrayHasKey('dom_size', $data);
        $this->assertArrayHasKey('asset_optimization', $data);
        $this->assertArrayHasKey('cache_status', $data);
        $this->assertArrayHasKey('elementor_status', $data);
        $this->assertTrue($data['elementor_pro']);
    }

    public function test_optimize_elementor_assets_success(): void
    {
        $mockFilesManager = Mockery::mock('overload:Elementor\Plugin');
        $mockFilesManager->shouldReceive('files_manager->clear_cache')->once();

        Functions\when('class_exists')->alias(function($class) {
            return $class === 'Elementor\Plugin';
        });
        Functions\when('defined')->alias(function($constant) {
            return $constant === 'ELEMENTOR_PRO_VERSION';
        });

        $controller = $this->make_controller();
        $request = new WP_REST_Request('POST');

        $response = $controller->optimize_elementor_assets($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertTrue($data['optimized']);
        $this->assertStringContainsString('Elementor cache cleared.', $data['message']);
        $this->assertIsArray($data['suggestions']);
    }

    public function test_optimize_elementor_assets_elementor_not_active(): void
    {
        Functions\when('class_exists')->justReturn(false);

        $controller = $this->make_controller();
        $request = new WP_REST_Request('POST');

        $response = $controller->optimize_elementor_assets($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementor_not_active', $response->get_error_code());
    }

    private function make_controller(): Performance
    {
        $controller = new Performance();
        $auth = Mockery::mock(Manager::class);
        $auth->shouldReceive('authorize')->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => ['performance-operations:read', 'performance-operations:write'],
                'is_active' => true,
            ]
        );

        $ref = new \ReflectionProperty(Performance::class, 'auth');
        $ref->setValue($controller, $auth);

        return $controller;
    }
}