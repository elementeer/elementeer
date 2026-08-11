<?php
declare(strict_types=1);

namespace Elementeer\Tests;

use Elementeer\MCP\Api\ElementorDocument;
use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

class ElementorDocumentTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        Functions\when( '__' )->returnArg();
        Functions\when( 'wp_json_encode' )->alias( 'json_encode' );
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    // -----------------------------------------------------------------
    // findById
    // -----------------------------------------------------------------

    public function testFindByIdFound(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $el  = $doc->findById( 'widget1' );
        $this->assertIsArray( $el );
        $this->assertEquals( 'heading', $el['widgetType'] );
    }

    public function testFindByIdNested(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $el  = $doc->findById( 'col2' );
        $this->assertIsArray( $el );
        $this->assertEquals( 'column', $el['elType'] );
    }

    public function testFindByIdNotFound(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $el  = $doc->findById( 'nonexistent' );
        $this->assertNull( $el );
    }

    // -----------------------------------------------------------------
    // updateById
    // -----------------------------------------------------------------

    public function testUpdateByIdModifiesSettings(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $path = '';
        $ok = $doc->updateById( 'widget1', [ 'settings' => [ 'title' => 'Changed' ] ], $path );
        $this->assertTrue( $ok );
        $this->assertNotEquals( '', $path );

        $el = $doc->findById( 'widget1' );
        $this->assertEquals( 'Changed', $el['settings']['title'] );
    }

    public function testUpdateByIdMergesSettings(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $doc->updateById( 'widget1', [ 'settings' => [ 'new_key' => 'val' ] ] );

        $el = $doc->findById( 'widget1' );
        $this->assertEquals( 'Hello World', $el['settings']['title'] );
        $this->assertEquals( 'val', $el['settings']['new_key'] );
    }

    public function testUpdateByIdTopLevelKey(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $doc->updateById( 'section1', [ 'elType' => 'container' ] );

        $el = $doc->findById( 'section1' );
        $this->assertEquals( 'container', $el['elType'] );
    }

    public function testUpdateByIdNotFound(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );
        $ok  = $doc->updateById( 'nope', [ 'settings' => [] ] );
        $this->assertFalse( $ok );
    }

    // -----------------------------------------------------------------
    // contentHash
    // -----------------------------------------------------------------

    public function testContentHashIsDeterministic(): void {
        $doc  = ElementorDocument::fromArray( 1, $this->sampleData() );
        $doc2 = ElementorDocument::fromArray( 1, $this->sampleData() );
        $this->assertEquals( $doc->contentHash(), $doc2->contentHash() );
    }

    public function testContentHashChangesAfterMutation(): void {
        $doc    = ElementorDocument::fromArray( 1, $this->sampleData() );
        $before = $doc->contentHash();
        $doc->updateById( 'widget1', [ 'settings' => [ 'title' => 'Changed' ] ] );
        $after = $doc->contentHash();
        $this->assertNotEquals( $before, $after );
    }

    // -----------------------------------------------------------------
    // traverse
    // -----------------------------------------------------------------

    public function testTraverseVisitsEveryElement(): void {
        $doc      = ElementorDocument::fromArray( 1, $this->sampleData() );
        $visited  = [];
        $doc->traverse( function ( array $el ) use ( &$visited ): void {
            $visited[] = $el['id'] ?? '';
        } );

        $expected = [ 'section1', 'col1', 'widget1', 'widget2', 'col2', 'widget3' ];
        $this->assertEquals( $expected, $visited );
    }

    // -----------------------------------------------------------------
    // Byte-identical: styling outside delta must remain unchanged
    // -----------------------------------------------------------------

    public function testUpdateByIdPreservesUnchangedData(): void {
        $doc     = ElementorDocument::fromArray( 1, $this->sampleData() );
        $before  = $doc->toArray();
        $doc->updateById( 'widget1', [ 'settings' => [ 'title' => 'Changed Title' ] ] );
        $after   = $doc->toArray();

        // widget2 should be untouched
        $this->assertEquals(
            $before[0]['elements'][0]['elements'][1],
            $after[0]['elements'][0]['elements'][1]
        );

        // col2 and its subtree should be untouched
        $this->assertEquals(
            $before[0]['elements'][1],
            $after[0]['elements'][1]
        );
    }

    // -----------------------------------------------------------------
    // dryRun
    // -----------------------------------------------------------------

    public function testDryRunDoesNotModifyOriginal(): void {
        $doc    = ElementorDocument::fromArray( 1, $this->sampleData() );
        $before = $doc->toArray();

        $report = $doc->dryRun( [ 'widget1' => [ 'settings' => [ 'title' => 'Temp' ] ] ] );
        $after  = $doc->toArray();

        $this->assertTrue( $report['dry_run'] );
        $this->assertEquals( $before, $after );
    }

    public function testDryRunReportsFoundAndNotFound(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );

        $report = $doc->dryRun( [
            'widget1' => [ 'settings' => [ 'title' => 'X' ] ],
            'nope'    => [ 'settings' => [] ],
        ] );

        $this->assertCount( 2, $report['patches'] );
        $this->assertTrue( $report['patches'][0]['found'] );
        $this->assertFalse( $report['patches'][1]['found'] );
    }

    public function testDryRunShowsBeforeAfter(): void {
        $doc = ElementorDocument::fromArray( 1, $this->sampleData() );

        $report = $doc->dryRun( [ 'widget1' => [ 'settings' => [ 'title' => 'New' ] ] ] );

        $this->assertEquals( 'Hello World', $report['patches'][0]['before']['settings']['title'] );
        $this->assertEquals( 'New', $report['patches'][0]['after']['settings']['title'] );
    }

    // -----------------------------------------------------------------
    // loadWithHashGuard (requires mocking _elementor_data get_post_meta)
    // -----------------------------------------------------------------

    public function testLoadWithHashGuardMatch(): void {
        $postId = 99;
        $raw    = json_encode( $this->sampleData() );

        Functions\when( 'get_post_meta' )
            ->justReturn( $raw );

        $expectedHash = md5( json_encode( $this->sampleData() ) );
        $doc = ElementorDocument::loadWithHashGuard( $postId, $expectedHash );
        $this->assertInstanceOf( ElementorDocument::class, $doc );
    }

    public function testLoadWithHashGuardMismatchReturnsError(): void {
        $postId = 99;
        $raw    = json_encode( $this->sampleData() );

        Functions\when( 'get_post_meta' )
            ->justReturn( $raw );

        $result = ElementorDocument::loadWithHashGuard( $postId, 'wrong-hash-value' );
        $this->assertInstanceOf( \WP_Error::class, $result );
        $this->assertEquals( 'target_changed', $result->get_error_code() );
    }

    // -----------------------------------------------------------------
    // Empty data
    // -----------------------------------------------------------------

    public function testEmptyDocument(): void {
        Functions\when( 'get_post_meta' )->justReturn( '' );
        $doc = ElementorDocument::load( 1 );
        $this->assertTrue( $doc->isEmpty() );
        $this->assertEquals( [], $doc->toArray() );
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /**
     * Minimal Elementor data tree for testing.
     *
     * section1
     *   col1
     *     widget1 (heading, "Hello World")
     *     widget2 (text)
     *   col2
     *     widget3 (image, no alt text)
     */
    private function sampleData(): array {
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
                                ],
                            ],
                            [
                                'id'         => 'widget2',
                                'elType'     => 'widget',
                                'widgetType' => 'text',
                                'settings'   => [
                                    'editor' => '<p>Lorem ipsum</p>',
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
                                    'src' => 'https://example.com/photo.jpg',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
