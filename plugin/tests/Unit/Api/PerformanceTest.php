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
    private $authMock;

    protected function setUp(): void
    {
        parent::setUp();

        Monkey\setUp();
        Mockery::close(); // Clear any previous mocks

        // Create a single auth mock to be reused across tests
        $this->authMock = Mockery::mock(Manager::class);
        $this->authMock->shouldReceive('authorize')->andReturn(
            [
                'key' => 'ek_test',
                'label' => 'Test Key',
                'capabilities' => ['performance-operations:read', 'performance-operations:write'],
                'is_active' => true,
            ]
        );

        Functions\when('is_wp_error')->alias(
            static fn($value): bool => $value instanceof WP_Error
        );

        // Define WordPress constants
        if (!defined('ARRAY_A')) {
            define('ARRAY_A', 2);
        }
        if (!defined('WP_CONTENT_DIR')) {
            define('WP_CONTENT_DIR', '/var/www/wp-content');
        }
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_flush_elementor_cache_success(): void
    {
        // Define Elementor\Plugin class if not exists
        if (!class_exists('\\Elementor\\Plugin', false)) {
            eval('namespace Elementor; class Plugin { public static $instance; public $files_manager; }');
        }
        
        // Create mock instance
        $mockFilesManager = Mockery::mock('\\Elementor\\Plugin');
        $mockFilesManager->files_manager = Mockery::mock();
        $mockFilesManager->files_manager->shouldReceive('clear_cache')->once();
        
        // Set static instance
        \Elementor\Plugin::$instance = $mockFilesManager;

        Functions\when('class_exists')->alias(function($class) {
            return $class === 'Elementor\Plugin' || $class === '\\Elementor\\Plugin';
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
        // Mock globals for health metrics
        $this->mock_health_metric_globals();

        // Elementor-specific mocks
        Functions\when('defined')->alias(function($constant) {
            // Support Elementor constants AND cache constants
            $elementor_constants = ['ELEMENTOR_VERSION', 'ELEMENTOR_PRO_VERSION'];
            $cache_constants = ['WP_REDIS_HOST', 'WP_MEMCACHED_HOST'];
            return in_array($constant, array_merge($elementor_constants, $cache_constants), true);
        });
        define('ELEMENTOR_VERSION', '3.0.0');
        define('ELEMENTOR_PRO_VERSION', true);
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
        // Mock new health metric functions
        Functions\when('wp_using_ext_object_cache')->justReturn(false);
        Functions\when('size_format')->justReturn('1 MB');
        Functions\when('home_url')->justReturn('https://example.com');
        // Functions\when('function_exists')->justReturn(false); // No apc_cache_info, etc.
        Functions\when('class_exists')->justReturn(false); // No Redis, Memcached, APC
        Functions\when('ini_get')->alias(function($key) {
            $defaults = [
                'memory_limit' => '256M',
                'max_execution_time' => '30',
                'upload_max_filesize' => '64M',
                'post_max_size' => '128M',
                'opcache.enable' => '1',
            ];
            return $defaults[$key] ?? '';
        });
        Functions\when('extension_loaded')->alias(function($ext) {
            return $ext === 'opcache';
        });
        Functions\when('version_compare')->alias(function($v1, $v2, $op = null) {
            // Simulate PHP not EOL (return false for PHP_VERSION < 8.1)
            if ($op === '<') {
                return false;
            }
            // Default comparison: return 0 (equal) for simplicity
            return 0;
        });

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
        // Check new health metrics
        $this->assertArrayHasKey('php_info', $data);
        $this->assertArrayHasKey('object_cache', $data);
        $this->assertArrayHasKey('autoloaded_options', $data);
        $this->assertArrayHasKey('database_stats', $data);
        $this->assertArrayHasKey('enqueued_assets', $data);
        $this->assertArrayHasKey('render_blocking_resources', $data);
    }

    public function test_optimize_elementor_assets_success(): void
    {
        // Define Elementor\Plugin class if not exists
        if (!class_exists('\\Elementor\\Plugin', false)) {
            eval('namespace Elementor; class Plugin { public static $instance; public $files_manager; }');
        }
        
        // Create mock instance
        $mockFilesManager = Mockery::mock('\\Elementor\\Plugin');
        $mockFilesManager->files_manager = Mockery::mock();
        $mockFilesManager->files_manager->shouldReceive('clear_cache')->once();
        
        // Set static instance
        \Elementor\Plugin::$instance = $mockFilesManager;

        Functions\when('class_exists')->alias(function($class) {
            return $class === 'Elementor\Plugin' || $class === '\\Elementor\\Plugin';
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
        $ref = new \ReflectionProperty(Performance::class, 'auth');
        $ref->setValue($controller, $this->authMock);
        return $controller;
    }

    private function mock_health_metric_globals(): void
    {
        global $wpdb, $wp_scripts, $wp_styles;

        // Mock $wpdb with specific query responses
        $wpdb = Mockery::mock('wpdb');
        $wpdb->options = 'wp_options';
        $wpdb->posts = 'wp_posts';
        $wpdb->comments = 'wp_comments';
        $wpdb->dbh = Mockery::mock();
        $wpdb->dbh->server_info = 'MySQL 8.0.0';
        
        // Mock get_var for specific queries
        $wpdb->shouldReceive('get_var')->andReturnUsing(function($query) {
            if (strpos($query, 'COUNT(*) FROM wp_options WHERE autoload') !== false) {
                return 50; // autoloaded options count
            }
            if (strpos($query, 'SUM(LENGTH(option_value)) FROM wp_options WHERE autoload') !== false) {
                return 102400; // 100KB size
            }
            if (strpos($query, "SHOW VARIABLES LIKE 'query_cache_type'") !== false) {
                return 'ON';
            }
            if (strpos($query, 'SELECT COUNT(*) FROM wp_posts WHERE post_type') !== false) {
                return 10; // revisions count
            }
            if (strpos($query, 'SELECT COUNT(*) FROM wp_options WHERE option_name LIKE') !== false) {
                return 5; // expired transients
            }
            if (strpos($query, 'SELECT COUNT(*) FROM wp_comments WHERE comment_approved') !== false) {
                return 2; // spam comments
            }
            return 0;
        });
        
        // Mock get_results for SHOW TABLE STATUS
        $wpdb->shouldReceive('get_results')->with("SHOW TABLE STATUS", \ARRAY_A)->andReturn([
            ['Data_length' => 1048576, 'Index_length' => 262144], // 1MB data, 256KB index
        ]);
        
        // Mock get_col for clean_database queries
        $wpdb->shouldReceive('get_col')->andReturn([]);

        // Mock $wp_scripts and $wp_styles
        $wp_scripts = Mockery::mock('WP_Scripts');
        $wp_scripts->queue = ['jquery', 'script1'];
        $wp_scripts->registered = [
            'jquery' => (object) ['src' => 'https://example.com/wp-includes/js/jquery/jquery.js'],
            'script1' => (object) ['src' => '/wp-content/plugins/my-plugin/script.js'],
        ];

        $wp_styles = Mockery::mock('WP_Styles');
        $wp_styles->queue = ['style1'];
        $wp_styles->registered = [
            'style1' => (object) ['src' => 'https://cdn.example.com/style.css'],
        ];




    }


}