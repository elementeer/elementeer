<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Templates;
use Elementify\MCP\Auth\Manager as Auth;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_Post;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Unit tests for Api\Templates REST controller.
 */
class TemplatesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        if ( ! class_exists( 'WP_Error' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_Error.php';
        }
        if ( ! class_exists( 'WP_REST_Request' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_REST_Request.php';
        }
        if ( ! class_exists( 'WP_REST_Response' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_REST_Response.php';
        }
        if ( ! class_exists( 'WP_Post' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_Post.php';
        }
        if ( ! class_exists( 'WP_Query' ) ) {
            require_once __DIR__ . '/../../Stubs/WP_Query.php';
        }

        // Reset Auth singleton
        $ref = new \ReflectionProperty( Auth::class, 'instance' );
        $ref->setAccessible( true );
        $ref->setValue( null, null );
    }

    protected function tearDown(): void
    {
        WP_Query::reset();
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    private function mockAuthSuccess( WP_REST_Request $request ): void
    {
        $authMock = Mockery::mock( Auth::class );
        $authMock->shouldReceive( 'authorize' )->andReturn( [
            'key'          => 'ek_test',
            'capabilities' => [ 'templates:read', 'templates:write', 'templates:delete' ],
            'is_active'    => true,
        ] );

        $ref = new \ReflectionProperty( Auth::class, 'instance' );
        $ref->setAccessible( true );
        $ref->setValue( null, $authMock );
    }

    private function makePost( array $overrides = [] ): WP_Post
    {
        $post                 = new WP_Post( (object) [] );
        $post->ID             = $overrides['ID'] ?? 1;
        $post->post_title     = $overrides['post_title'] ?? 'Test Template';
        $post->post_status    = $overrides['post_status'] ?? 'publish';
        $post->post_type      = $overrides['post_type'] ?? 'elementor_library';
        $post->post_author    = $overrides['post_author'] ?? 1;
        $post->post_content   = $overrides['post_content'] ?? '';
        return $post;
    }

    private function makeRequest( array $params = [], string $method = 'GET' ): WP_REST_Request
    {
        $request = Mockery::mock( WP_REST_Request::class );
        $request->shouldReceive( 'get_param' )->andReturnUsing( fn( $key ) => $params[ $key ] ?? null );
        $request->shouldReceive( 'get_json_params' )->andReturn( $params );
        $request->shouldReceive( 'get_method' )->andReturn( $method );
        return $request;
    }

    // ------------------------------------------------------------------ //
    // list_templates
    // ------------------------------------------------------------------ //

    public function test_list_templates_builds_query_with_elementor_library_post_type(): void
    {
        $request = $this->makeRequest( [ 'page' => 1, 'per_page' => 20, 'status' => 'publish' ] );
        $this->mockAuthSuccess( $request );

        WP_Query::$mock_posts         = [];
        WP_Query::$mock_found_posts   = 0;
        WP_Query::$mock_max_num_pages = 1;

        Functions\when( 'get_option' )->justReturn( [] );
        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'wp_get_object_terms' )->justReturn( [] );
        Functions\when( 'is_wp_error' )->justReturn( false );
        Functions\when( 'get_the_date' )->justReturn( '2025-01-01T00:00:00' );
        Functions\when( 'get_the_modified_date' )->justReturn( '2025-06-01T00:00:00' );
        Functions\when( 'get_post_meta' )->justReturn( 'page' );

        $controller = new Templates();
        $controller->list_templates( $request );

        $this->assertSame( 'elementor_library', WP_Query::$captured_args['post_type'] );
    }

    public function test_list_templates_maps_wp_post_to_elementify_template_structure(): void
    {
        $post  = $this->makePost( [ 'ID' => 42, 'post_title' => 'My Hero' ] );
        $request = $this->makeRequest( [ 'page' => 1, 'per_page' => 20, 'status' => 'publish' ] );
        $this->mockAuthSuccess( $request );

        WP_Query::$mock_posts         = [ $post ];
        WP_Query::$mock_found_posts   = 1;
        WP_Query::$mock_max_num_pages = 1;

        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'wp_get_object_terms' )->justReturn( [] );
        Functions\when( 'is_wp_error' )->justReturn( false );
        Functions\when( 'get_the_date' )->justReturn( '2025-01-01T00:00:00' );
        Functions\when( 'get_the_modified_date' )->justReturn( '2025-06-01T00:00:00' );
        Functions\when( 'get_post_meta' )->justReturn( 'section' );
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $response   = $controller->list_templates( $request );

        $data      = $response->get_data();
        $templates = $data['templates'];

        $this->assertCount( 1, $templates );
        $this->assertSame( 42, $templates[0]['id'] );
        $this->assertSame( 'My Hero', $templates[0]['title'] );
        $this->assertArrayHasKey( 'type', $templates[0] );
        $this->assertArrayHasKey( 'shortcode', $templates[0] );
        $this->assertArrayHasKey( 'categories', $templates[0] );
        $this->assertArrayHasKey( 'tags', $templates[0] );
    }

    // ------------------------------------------------------------------ //
    // get_template
    // ------------------------------------------------------------------ //

    public function test_get_template_returns_404_when_post_not_found(): void
    {
        $request = $this->makeRequest( [ 'id' => 9999 ] );
        $this->mockAuthSuccess( $request );

        Functions\when( 'get_post' )->justReturn( null );
        Functions\when( '__' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $result     = $controller->get_template( $request );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'not_found', $result->get_error_code() );
    }

    public function test_get_template_returns_404_when_post_type_is_not_elementor_library(): void
    {
        $post = $this->makePost( [ 'post_type' => 'post' ] ); // wrong post type
        $request = $this->makeRequest( [ 'id' => 1 ] );
        $this->mockAuthSuccess( $request );

        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( '__' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $result     = $controller->get_template( $request );

        $this->assertInstanceOf( WP_Error::class, $result );
        $this->assertSame( 'not_found', $result->get_error_code() );
    }

    public function test_get_template_returns_template_data_for_valid_id(): void
    {
        $post    = $this->makePost( [ 'ID' => 5, 'post_title' => 'Landing Page' ] );
        $request = $this->makeRequest( [ 'id' => 5 ] );
        $this->mockAuthSuccess( $request );

        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( 'get_post_meta' )->justReturn( 'page' );
        Functions\when( 'wp_get_object_terms' )->justReturn( [] );
        Functions\when( 'is_wp_error' )->justReturn( false );
        Functions\when( 'get_the_date' )->justReturn( '2025-01-01T00:00:00' );
        Functions\when( 'get_the_modified_date' )->justReturn( '2025-06-01T00:00:00' );
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $response   = $controller->get_template( $request );

        $this->assertInstanceOf( WP_REST_Response::class, $response );
        $data = $response->get_data();
        $this->assertSame( 5, $data['id'] );
        $this->assertSame( 'Landing Page', $data['title'] );
    }

    // ------------------------------------------------------------------ //
    // create_template
    // ------------------------------------------------------------------ //

    public function test_create_template_inserts_post_with_correct_args(): void
    {
        $insertedArgs = null;
        $request      = $this->makeRequest( [
            'title'  => 'New Template',
            'type'   => 'section',
            'status' => 'draft',
        ], 'POST' );
        $this->mockAuthSuccess( $request );

        $newPost = $this->makePost( [ 'ID' => 100, 'post_title' => 'New Template', 'post_status' => 'draft' ] );

        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'wp_insert_post' )->alias( function ( $args ) use ( &$insertedArgs, $newPost ) {
            $insertedArgs = $args;
            return 100;
        } );
        Functions\when( 'update_post_meta' )->justReturn( true );
        Functions\when( 'wp_set_object_terms' )->justReturn( [] );
        Functions\when( 'get_post' )->justReturn( $newPost );
        Functions\when( 'get_post_meta' )->justReturn( 'section' );
        Functions\when( 'wp_get_object_terms' )->justReturn( [] );
        Functions\when( 'is_wp_error' )->justReturn( false );
        Functions\when( 'get_the_date' )->justReturn( '2025-01-01T00:00:00' );
        Functions\when( 'get_the_modified_date' )->justReturn( '2025-06-01T00:00:00' );
        Functions\when( 'wp_slash' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $controller->create_template( $request );

        $this->assertSame( 'elementor_library', $insertedArgs['post_type'] );
        $this->assertSame( 'New Template', $insertedArgs['post_title'] );
        $this->assertSame( 'draft', $insertedArgs['post_status'] );
    }

    // ------------------------------------------------------------------ //
    // update_template
    // ------------------------------------------------------------------ //

    public function test_update_template_updates_title_and_status(): void
    {
        $post    = $this->makePost( [ 'ID' => 3 ] );
        $request = $this->makeRequest( [ 'id' => 3, 'title' => 'Updated Title', 'status' => 'publish' ], 'PATCH' );
        $this->mockAuthSuccess( $request );

        $updatedWith = null;

        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( 'sanitize_text_field' )->returnArg();
        Functions\when( 'wp_update_post' )->alias( function ( $args ) use ( &$updatedWith ) {
            $updatedWith = $args;
            return $args['ID'];
        } );
        Functions\when( 'wp_set_object_terms' )->justReturn( [] );
        Functions\when( 'get_post_meta' )->justReturn( 'page' );
        Functions\when( 'wp_get_object_terms' )->justReturn( [] );
        Functions\when( 'is_wp_error' )->justReturn( false );
        Functions\when( 'get_the_date' )->justReturn( '2025-01-01T00:00:00' );
        Functions\when( 'get_the_modified_date' )->justReturn( '2025-06-01T00:00:00' );
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $controller->update_template( $request );

        $this->assertSame( 3, $updatedWith['ID'] );
        $this->assertSame( 'Updated Title', $updatedWith['post_title'] );
        $this->assertSame( 'publish', $updatedWith['post_status'] );
    }

    // ------------------------------------------------------------------ //
    // delete_template
    // ------------------------------------------------------------------ //

    public function test_delete_template_moves_post_to_trash_via_wp_delete_post(): void
    {
        $post    = $this->makePost( [ 'ID' => 10 ] );
        $request = $this->makeRequest( [ 'id' => 10 ], 'DELETE' );
        $this->mockAuthSuccess( $request );

        $deletedId = null;
        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( 'wp_delete_post' )->alias( function ( $id ) use ( &$deletedId, $post ) {
            $deletedId = $id;
            return $post;
        } );
        Functions\when( '__' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $response   = $controller->delete_template( $request );

        $this->assertSame( 10, $deletedId );
        $data = $response->get_data();
        $this->assertTrue( $data['deleted'] );
        $this->assertSame( 10, $data['id'] );
    }

    // ------------------------------------------------------------------ //
    // get_template_data
    // ------------------------------------------------------------------ //

    public function test_get_template_data_reads_elementor_data_meta(): void
    {
        $elementorData = json_encode( [ [ 'id' => 'abc', 'elType' => 'section', 'elements' => [] ] ] );
        $post          = $this->makePost( [ 'ID' => 7 ] );
        $request       = $this->makeRequest( [ 'id' => 7 ] );
        $this->mockAuthSuccess( $request );

        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( 'get_post_meta' )->alias( function ( $id, $key ) use ( $elementorData ) {
            if ( '_elementor_data' === $key ) {
                return $elementorData;
            }
            return 'page';
        } );
        Functions\when( '__' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $response   = $controller->get_template_data( $request );

        $data = $response->get_data();
        $this->assertSame( 7, $data['id'] );
        $this->assertIsArray( $data['elementor_data'] );
        $this->assertCount( 1, $data['elementor_data'] );
        $this->assertSame( 'abc', $data['elementor_data'][0]['id'] );
    }

    // ------------------------------------------------------------------ //
    // update_template_data
    // ------------------------------------------------------------------ //

    public function test_update_template_data_writes_elementor_data_meta(): void
    {
        $post    = $this->makePost( [ 'ID' => 9 ] );
        $newData = [ [ 'id' => 'xyz', 'elType' => 'container', 'elements' => [] ] ];
        $request = $this->makeRequest( [ 'id' => 9, 'elementor_data' => $newData ], 'PUT' );
        $this->mockAuthSuccess( $request );

        $savedMeta = null;
        Functions\when( 'get_post' )->justReturn( $post );
        Functions\when( 'wp_json_encode' )->alias( fn( $v ) => json_encode( $v ) );
        Functions\when( 'wp_slash' )->returnArg();
        Functions\when( 'update_post_meta' )->alias( function ( $id, $key, $value ) use ( &$savedMeta ) {
            if ( '_elementor_data' === $key ) {
                $savedMeta = $value;
            }
            return true;
        } );
        Functions\when( 'wp_update_post' )->justReturn( 9 );
        Functions\when( '__' )->returnArg();
        Functions\when( 'get_option' )->justReturn( [] );

        $controller = new Templates();
        $response   = $controller->update_template_data( $request );

        $this->assertNotNull( $savedMeta );
        $decoded = json_decode( $savedMeta, true );
        $this->assertSame( 'xyz', $decoded[0]['id'] );

        $data = $response->get_data();
        $this->assertTrue( $data['updated'] );
    }
}
