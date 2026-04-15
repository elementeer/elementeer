<?php

declare(strict_types=1);

namespace Elementify\Tests\Integration;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Router;
use Elementify\MCP\Api\Templates;
use Mockery;
use PHPUnit\Framework\TestCase;

/**
 * Integration smoke tests for REST API registration.
 *
 * Verifies that routes are registered under the correct namespace
 * and that the router wires up the Templates controller.
 */
class RestApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_rest_routes_registered_under_elementify_v1_namespace(): void
    {
        $registeredRoutes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$registeredRoutes ) {
                $registeredRoutes[] = [
                    'namespace' => $namespace,
                    'route'     => $route,
                    'args'      => $args,
                ];
            }
        );

        Router::register();

        $this->assertNotEmpty( $registeredRoutes );

        foreach ( $registeredRoutes as $route ) {
            $this->assertSame(
                'elementify/v1',
                $route['namespace'],
                "All routes should be under 'elementify/v1' namespace"
            );
        }
    }

    public function test_templates_collection_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/templates', $routes );
    }

    public function test_single_template_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/templates/(?P<id>\d+)', $routes );
    }

    public function test_duplicate_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/templates/(?P<id>\d+)/duplicate', $routes );
    }

    public function test_template_data_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/templates/(?P<id>\d+)/data', $routes );
    }

    public function test_library_import_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/library/import', $routes );

        $methods = array_column( $routes['/library/import'], 'methods' );
        $this->assertContains( 'POST', $methods );
    }

    public function test_site_info_route_is_registered(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/site', $routes );
    }

    public function test_all_routes_use_permission_callback_return_true(): void
    {
        // Auth is handled inside callbacks, not at route level
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        foreach ( $routes as $route => $routeArgs ) {
            // Route args can be a single method or an array of methods
            $methodDefinitions = isset( $routeArgs[0] ) ? $routeArgs : [ $routeArgs ];

            foreach ( $methodDefinitions as $def ) {
                if ( isset( $def['permission_callback'] ) ) {
                    $this->assertSame(
                        '__return_true',
                        $def['permission_callback'],
                        "Route '{$route}' should use __return_true as permission_callback (auth handled internally)"
                    );
                }
            }
        }
    }

    public function test_router_namespace_constant_is_correct(): void
    {
        $this->assertSame( 'elementify/v1', Router::NAMESPACE );
    }

    public function test_templates_collection_supports_get_and_post(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $this->assertArrayHasKey( '/templates', $routes );
        $templatesMethods = array_column( $routes['/templates'], 'methods' );

        $this->assertContains( 'GET', $templatesMethods );
        $this->assertContains( 'POST', $templatesMethods );
    }

    public function test_single_template_supports_get_patch_and_delete(): void
    {
        $routes = [];

        Functions\when( 'register_rest_route' )->alias(
            function ( $namespace, $route, $args ) use ( &$routes ) {
                $routes[ $route ] = $args;
            }
        );

        Router::register();

        $singleRoute = $routes['/templates/(?P<id>\d+)'];
        $methods     = array_column( $singleRoute, 'methods' );

        $this->assertContains( 'GET', $methods );
        $this->assertContains( 'PATCH', $methods );
        $this->assertContains( 'DELETE', $methods );
    }
}
