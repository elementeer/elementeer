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
    // -----------------------------------------------------------------
    // Payload size: PATCH vs full-replace
    // -----------------------------------------------------------------

    /**
     * The economic rationale for partial mutation: changing ONE
     * field via PATCH sends ~1 KB instead of the full page (~50+ KB).
     *
     * PATCH body: { "settings": { "title": "X" }, "content_hash": "..." }
     * PUT body:   { "elementor_data": <entire page JSON> }
     */
    public function testPayloadSizeRatio(): void {
        $doc = ElementorDocument::fromArray( 1, $this->realisticPage() );
        $fullPageSize = strlen( json_encode( [ 'elementor_data' => $doc->toArray() ] ) );

        $hash = $doc->contentHash();
        $patchBody = json_encode( [
            'settings'     => [ 'title' => 'New Heading Text' ],
            'content_hash' => $hash,
        ] );
        $patchSize = strlen( $patchBody );

        $ratio = $fullPageSize / max( $patchSize, 1 );

        fwrite( STDERR, sprintf(
            "\nPAYLOAD SIZE: patch=%d bytes  full-replace=%d bytes  ratio=%.1fx\n",
            $patchSize, $fullPageSize, $ratio
        ) );

        $this->assertLessThan( 2048, $patchSize,
            sprintf( 'PATCH body (%d bytes) must stay under 2 KB', $patchSize ) );

        $this->assertGreaterThan( $patchSize * 10, $fullPageSize,
            sprintf(
                'Full-replace (%d bytes) must be at least 10x the PATCH size (%d bytes)',
                $fullPageSize, $patchSize
            ) );
    }

        /**
         * Realistic mid-size Elementor page: hero heading, 4 feature
         * sections with icon boxes and images, a CTA, testimonials,
         * and a text block. ~8 sections, ~30+ widgets. When serialised
         * this produces ~20-30 KB of JSON.
         */
    private function realisticPage(): array {
        $hero = [
            'id'       => 's1',
            'elType'   => 'section',
            'settings' => [
                'background_overlay_background' => 'classic',
                'background_overlay_color'      => '#1a1a2e',
                'padding'                       => [ 'unit' => 'px', 'top' => 80, 'bottom' => 80 ],
            ],
            'elements' => [
                [
                    'id'       => 'c1',
                    'elType'   => 'column',
                    'settings' => [ '_column_size' => 100 ],
                    'elements' => [
                        [
                            'id'         => 'h1',
                            'elType'     => 'widget',
                            'widgetType' => 'heading',
                            'settings'   => [
                                'title'             => 'Build Faster with Elementor',
                                'header_size'       => 'h1',
                                'align'             => 'center',
                                'title_color'       => '#ffffff',
                                'typography_typography' => 'custom',
                                'typography_font_size'  => [ 'unit' => 'px', 'size' => 48 ],
                            ],
                        ],
                        [
                            'id'         => 'h2',
                            'elType'     => 'widget',
                            'widgetType' => 'text-editor',
                            'settings'   => [
                                'editor' => '<p style="text-align:center;color:#e0e0e0;">The fastest way to build WordPress sites</p>',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $features = [];
        for ( $i = 1; $i <= 4; $i++ ) {
            $features[] = $this->featureSection( $i );
        }

        $testimonials = [];
        for ( $j = 1; $j <= 3; $j++ ) {
            $testimonials[] = $this->testimonialWidget( $j );
        }

        $cta = [
            'id'       => 's5',
            'elType'   => 'section',
            'settings' => [ 'background_background' => 'classic', 'background_color' => '#f5f5f5' ],
            'elements' => [
                [
                    'id'       => 'c5',
                    'elType'   => 'column',
                    'settings' => [ '_column_size' => 100 ],
                    'elements' => [
                        [
                            'id'         => 'h3',
                            'elType'     => 'widget',
                            'widgetType' => 'heading',
                            'settings'   => [ 'title' => 'Ready to start?', 'header_size' => 'h2', 'align' => 'center' ],
                        ],
                        [
                            'id'         => 'b1',
                            'elType'     => 'widget',
                            'widgetType' => 'button',
                            'settings'   => [
                                'text'     => 'Get Started',
                                'align'    => 'center',
                                'button_text_color' => '#ffffff',
                                'background_color'  => '#6c63ff',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $testimonialsSection = [
            'id'       => 's6',
            'elType'   => 'section',
            'settings' => [ 'background_background' => 'classic', 'background_color' => '#ffffff' ],
            'elements' => [
                [
                    'id'       => 'c6',
                    'elType'   => 'column',
                    'settings' => [ '_column_size' => 100 ],
                    'elements' => [
                        [
                            'id'         => 'h6',
                            'elType'     => 'widget',
                            'widgetType' => 'heading',
                            'settings'   => [ 'title' => 'What our customers say', 'header_size' => 'h2', 'align' => 'center' ],
                        ],
                    ],
                ],
            ],
        ];

        return [ $hero, ...$features, $testimonialsSection, ...$testimonials, $cta ];
    }

    private function featureSection( int $n ): array {
        $icons   = [ '', 'rocket', 'shield', 'code', 'clock' ];
        $titles  = [ '', 'Lightning Fast', 'Enterprise Security', 'Clean Code', 'High Performance' ];
        $descs   = [ '',
            'Pages load in under 200ms with our optimized rendering pipeline.',
            'SOC 2 compliant with end-to-end encryption for all your data.',
            'Developer-friendly APIs with comprehensive documentation.',
            'Blazing fast CDN delivery with edge caching worldwide.',
        ];

        $col1 = [
            'id'       => "c{$n}1",
            'elType'   => 'column',
            'settings' => [ '_column_size' => 33 ],
            'elements' => [
                [
                    'id'         => "ib{$n}1",
                    'elType'     => 'widget',
                    'widgetType' => 'icon-box',
                    'settings'   => [
                        'icon'            => "fa fa-{$icons[$n]}",
                        'title_text'      => $titles[$n],
                        'description_text' => $descs[$n],
                        'title_color'     => '#1a1a2e',
                    ],
                ],
            ],
        ];

        $col2 = [
            'id'       => "c{$n}2",
            'elType'   => 'column',
            'settings' => [ '_column_size' => 33 ],
            'elements' => [
                [
                    'id'         => "ib{$n}2",
                    'elType'     => 'widget',
                    'widgetType' => 'image',
                    'settings'   => [
                        'src'  => "https://example.com/feature-{$n}-1.jpg",
                        'alt'  => "Feature {$n} illustration A",
                    ],
                ],
            ],
        ];

        $col3 = [
            'id'       => "c{$n}3",
            'elType'   => 'column',
            'settings' => [ '_column_size' => 33 ],
            'elements' => [
                [
                    'id'         => "ib{$n}3",
                    'elType'     => 'widget',
                    'widgetType' => 'image',
                    'settings'   => [
                        'src'  => "https://example.com/feature-{$n}-2.jpg",
                        'alt'  => "Feature {$n} illustration B",
                    ],
                ],
            ],
        ];

        return [
            'id'       => "s{$n}",
            'elType'   => 'section',
            'settings' => [ 'padding' => [ 'unit' => 'px', 'top' => 60, 'bottom' => 60 ] ],
            'elements' => [ $col1, $col2, $col3 ],
        ];
    }

    private function testimonialWidget( int $n ): array {
        $names     = [ '', 'Sarah Chen', 'Marcus Rivera', 'Aiko Tanaka' ];
        $roles     = [ '', 'CTO at DataFlow', 'VP Engineering at CloudScale', 'Director at NexusLabs' ];
        $quotes    = [ '',
            'We migrated 200 pages in under a week. The partial mutation engine was the difference between a rewrite and an incremental rollout.',
            'Our team cut page update time from 4 hours to 15 minutes. The snapshot system saved us twice when we made mistakes.',
            'Cannot imagine going back to exporting elementor_data by hand. This is what Elementor should have shipped out of the box.',
        ];

        return [
            'id'         => "test{$n}",
            'elType'     => 'widget',
            'widgetType' => 'testimonial',
            'settings'   => [
                'testimonial_content'     => $quotes[$n],
                'testimonial_name'        => $names[$n],
                'testimonial_job'         => $roles[$n],
                'testimonial_alignment'   => 'center',
                'testimonial_text_color'  => '#444444',
            ],
        ];
    }

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
