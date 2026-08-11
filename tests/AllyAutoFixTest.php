<?php
declare(strict_types=1);

namespace Elementeer\Tests;

use Elementeer\MCP\Api\ElementorDocument;
use Elementeer\MCP\Api\Snapshots;
use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

/**
 * Integration test for Ally::apply_single_fix() — the path that
 * exercises ElementorDocument::load() + findById() + updateById() + save()
 * through real production code.
 *
 * This is DoD point 7 from the PRD.
 */
class AllyAutoFixTest extends TestCase {

    private array $optionStore = [];

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        $this->optionStore = [];

        Functions\when( '__' )->returnArg();
        Functions\when( 'wp_json_encode' )->alias( 'json_encode' );
        Functions\when( 'wp_slash' )->returnArg( 1 );
        Functions\when( 'wp_generate_uuid4' )->alias( fn() => bin2hex( random_bytes( 16 ) ) );
        Functions\when( 'wp_update_post' )->justReturn( 1 );

        Functions\when( 'get_option' )->alias( function ( string $key, $default = false ) {
            return $this->optionStore[ $key ] ?? $default;
        } );

        Functions\when( 'update_option' )->alias( function ( string $key, $value ) {
            $this->optionStore[ $key ] = $value;
            return true;
        } );

        Functions\when( 'get_post_meta' )->alias( function ( int $id, string $key ) {
            $storeKey = "meta_{$id}_{$key}";
            return $this->optionStore[ $storeKey ] ?? $this->defaultPageJson();
        } );

        Functions\when( 'update_post_meta' )->alias( function ( int $id, string $key, $value ) {
            $this->optionStore[ "meta_{$id}_{$key}" ] = $value;
            return true;
        } );
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    // -----------------------------------------------------------------
    // alt_text fix on image widget
    // -----------------------------------------------------------------

    public function testAltTextFixSetsAltOnImageWidget(): void {
        $this->seedPageData( 1 );

        // Build a violation matching our image widget (widget3 has no alt)
        $violation = [
            'description' => 'Image missing alt text.',
            'location'    => [ 'element_id' => 'widget3' ],
        ];

        $result = $this->invokeApplySingleFix( $violation, 1, [ 'alt_text' ] );

        $this->assertTrue( $result['success'], 'alt text fix should succeed' );
        $this->assertEquals( 'widget3', $result['element_id'] );
        $this->assertNotEmpty( $result['path'] );
        $this->assertArrayHasKey( 'alt', $result['patch'] );

        $doc = ElementorDocument::load( 1 );
        $img = $doc->findById( 'widget3' );
        $this->assertNotEmpty( $img['settings']['alt'] );
    }

    // -----------------------------------------------------------------
    // element not found → success false, no mutation
    // -----------------------------------------------------------------

    public function testElementNotFoundReturnsFailure(): void {
        $this->seedPageData( 1 );

        $before = ElementorDocument::load( 1 );
        $beforeHash = $before->contentHash();

        $violation = [
            'description' => 'Image missing alt text.',
            'location'    => [ 'element_id' => 'nonexistent_widget' ],
        ];

        $result = $this->invokeApplySingleFix( $violation, 1, [ 'alt_text' ] );

        $this->assertFalse( $result['success'] );
        $this->assertStringContainsString( 'not found', $result['message'] );

        // Page must be unchanged
        $after = ElementorDocument::load( 1 );
        $this->assertEquals( $beforeHash, $after->contentHash() );
    }

    // -----------------------------------------------------------------
    // no element_id → returns immediately
    // -----------------------------------------------------------------

    public function testNoElementIdReturnsFailure(): void {
        $this->seedPageData( 1 );

        $violation = [
            'description' => 'Image missing alt text.',
            'location'    => [],
        ];

        $result = $this->invokeApplySingleFix( $violation, 1, [ 'alt_text' ] );

        $this->assertFalse( $result['success'] );
        $this->assertEquals( 'No element_id in violation data.', $result['message'] );
    }

    // -----------------------------------------------------------------
    // styling outside delta byte-identical
    // -----------------------------------------------------------------

    public function testFixPreservesUnchangedElements(): void {
        $this->seedPageData( 1 );

        $before = ElementorDocument::load( 1 );
        $beforeData = $before->toArray();

        $violation = [
            'description' => 'Image missing alt text.',
            'location'    => [ 'element_id' => 'widget3' ],
        ];

        $this->invokeApplySingleFix( $violation, 1, [ 'alt_text' ] );

        $after = ElementorDocument::load( 1 );
        $afterData = $after->toArray();

        // widget1 (heading) must be untouched
        $beforeWidget1 = $beforeData[0]['elements'][0]['elements'][0];
        $afterWidget1  = $afterData[0]['elements'][0]['elements'][0];
        $this->assertEquals( $beforeWidget1, $afterWidget1, 'widget1 must be byte-identical' );

        // widget2 (text) must be untouched
        $beforeWidget2 = $beforeData[0]['elements'][0]['elements'][1];
        $afterWidget2  = $afterData[0]['elements'][0]['elements'][1];
        $this->assertEquals( $beforeWidget2, $afterWidget2, 'widget2 must be byte-identical' );
    }

    // -----------------------------------------------------------------
    // fix creates a snapshot
    // -----------------------------------------------------------------

    public function testFixCreatesSnapshot(): void {
        $this->seedPageData( 1 );
        $this->optionStore[ 'elementeer_snapshots' ] = [];

        $violation = [
            'description' => 'Image missing alt text.',
            'location'    => [ 'element_id' => 'widget3' ],
        ];

        $this->invokeApplySingleFix( $violation, 1, [ 'alt_text' ] );

        $snapshots = $this->optionStore[ 'elementeer_snapshots' ] ?? [];
        $this->assertNotEmpty( $snapshots, 'a snapshot must have been created' );

        $snapshot = reset( $snapshots );
        $this->assertEquals( 1, $snapshot['post_id'] );
        $this->assertNotEmpty( $snapshot['uuid'] );
    }

    // -----------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------

    private function seedPageData( int $postId ): void {
        $this->optionStore[ "meta_{$postId}__elementor_data" ] = $this->defaultPageJson();
    }

    private function defaultPageJson(): string {
        return json_encode( $this->defaultPageData() );
    }

    /**
     * Minimal page matching the AllyViolation format.
     *
     * section1
     *   col1
     *     widget1 (heading, "Hello World")  — no alt issue
     *     widget2 (text)                     — no alt issue
     *   col2
     *     widget3 (image, no alt text)       — the target
     */
    private function defaultPageData(): array {
        return [
            [
                'id'       => 'section1',
                'elType'   => 'section',
                'settings' => [],
                'elements' => [
                    [
                        'id'       => 'col1',
                        'elType'   => 'column',
                        'settings' => [],
                        'elements' => [
                            [
                                'id'         => 'widget1',
                                'elType'     => 'widget',
                                'widgetType' => 'heading',
                                'settings'   => [
                                    'title'       => 'Hello World',
                                    'header_size' => 'h1',
                                    'title_color' => '#333333',
                                ],
                            ],
                            [
                                'id'         => 'widget2',
                                'elType'     => 'widget',
                                'widgetType' => 'text',
                                'settings'   => [
                                    'editor'           => '<p>Lorem ipsum dolor sit amet.</p>',
                                    'text_color'       => '#555555',
                                    'typography_typography' => 'custom',
                                ],
                            ],
                        ],
                    ],
                    [
                        'id'       => 'col2',
                        'elType'   => 'column',
                        'settings' => [],
                        'elements' => [
                            [
                                'id'         => 'widget3',
                                'elType'     => 'widget',
                                'widgetType' => 'image',
                                'settings'   => [
                                    'src'      => 'https://example.com/photo.jpg',
                                    'caption'  => 'Team photo',
                                    'image_size' => 'full',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Invoke Ally::apply_single_fix() via reflection since it's private.
     */
    private function invokeApplySingleFix( array $violation, int $page_id, array $fix_types ): array {
        $ally = new \Elementeer\MCP\Api\Ally();

        $ref = new \ReflectionMethod( $ally, 'apply_single_fix' );

        return $ref->invoke( $ally, $violation, $page_id, $fix_types );
    }
}
