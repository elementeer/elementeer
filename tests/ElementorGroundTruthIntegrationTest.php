<?php
declare(strict_types=1);

namespace Elementeer\Tests;

use Elementeer\MCP\Api\ElementorDocument;
use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

/**
 * BRG-007 (Phase 2): Elementor Ground Truth CI Integration Test.
 *
 * Validates:
 * 1. Elementor Ground Truth as a pure CI fixture (independent of product runtime).
 * 2. Ingestion and traversal by ElementorDocument.
 * 3. Kennzahlen / Metrics: Elementtreffer (matching), Stildelta (isolated styling),
 *    Inhaltserhalt (content preservation), and Konfidenz-Eichung (calibration).
 * 4. Payload size & mutation ratio benchmarks against ground truth.
 */
class ElementorGroundTruthIntegrationTest extends TestCase {

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
    // 1. Fixture Loading & Integrity
    // -----------------------------------------------------------------

    public function testGroundTruthFixtureLoadsValidJson(): void {
        $rawJson = FixtureHelper::loadJson( 'elementor-ground-truth.json' );
        $this->assertNotEmpty( $rawJson, 'Ground truth fixture JSON must not be empty' );

        $data = FixtureHelper::getGroundTruth();
        $this->assertIsArray( $data, 'Parsed ground truth must be an array' );
        $this->assertCount( 10, $data, 'Ground truth page must contain exactly 10 top-level sections' );
    }

    public function testGroundTruthMetricsFixtureIntegrity(): void {
        $metrics = FixtureHelper::getMetrics();
        $this->assertIsArray( $metrics );
        $this->assertEquals( 'elementor-ground-truth', $metrics['name'] );
        $this->assertEquals( 10, $metrics['metrics']['sections_count'] );
        $this->assertEquals( 18, $metrics['metrics']['columns_count'] );
        $this->assertEquals( 20, $metrics['metrics']['widgets_count'] );
        $this->assertEquals( 48, $metrics['metrics']['total_elements_count'] );
        $this->assertEquals( 100.0, $metrics['fidelity_thresholds']['element_match_min_percent'] );
    }

    // -----------------------------------------------------------------
    // 2. Ingestion, Traversal & Elementtreffer (Element Matching)
    // -----------------------------------------------------------------

    public function testGroundTruthDocumentIngestionAndTraverse(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc         = ElementorDocument::fromArray( 101, $groundTruth );

        $this->assertFalse( $doc->isEmpty() );
        $this->assertEquals( 101, $doc->getPostId() );

        $visitedElements = [];
        $visitedTypes    = [];
        $widgetTypes     = [];

        $doc->traverse( function ( array $el ) use ( &$visitedElements, &$visitedTypes, &$widgetTypes ): void {
            $id = $el['id'] ?? '';
            $this->assertNotEmpty( $id, 'Every element in ground truth must have an ID' );
            $visitedElements[] = $id;

            $elType = $el['elType'] ?? '';
            $this->assertNotEmpty( $elType, "Element {$id} must have an elType" );
            $visitedTypes[ $elType ] = ( $visitedTypes[ $elType ] ?? 0 ) + 1;

            if ( $elType === 'widget' ) {
                $widgetType = $el['widgetType'] ?? 'unknown';
                $widgetTypes[ $widgetType ] = ( $widgetTypes[ $widgetType ] ?? 0 ) + 1;
            }
        } );

        // 10 sections + 18 columns + 20 widgets = 48 total elements
        $this->assertCount( 48, $visitedElements, 'Ground truth must traverse exactly 48 elements' );
        $this->assertEquals( 10, $visitedTypes['section'] ?? 0, 'Must have 10 sections' );
        $this->assertEquals( 18, $visitedTypes['column'] ?? 0, 'Must have 18 columns' );
        $this->assertEquals( 20, $visitedTypes['widget'] ?? 0, 'Must have 20 widgets' );

        // Expected widget types: heading (3), text-editor (1), icon-box (4), image (8), testimonial (3), button (1)
        $expectedWidgets = [
            'heading'     => 3,
            'text-editor' => 1,
            'icon-box'    => 4,
            'image'       => 8,
            'testimonial' => 3,
            'button'      => 1,
        ];

        foreach ( $expectedWidgets as $type => $count ) {
            $this->assertArrayHasKey( $type, $widgetTypes, "Widget type {$type} must exist in ground truth" );
            $this->assertEquals( $count, $widgetTypes[ $type ], "Widget type {$type} count mismatch" );
        }
    }

    // -----------------------------------------------------------------
    // 3. Inhaltserhalt (Content Preservation)
    // -----------------------------------------------------------------

    public function testGroundTruthContentPreservation(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc         = ElementorDocument::fromArray( 101, $groundTruth );

        // Verify Hero content
        $h1 = $doc->findById( 'h1' );
        $this->assertNotNull( $h1 );
        $this->assertEquals( 'Build Faster with Elementor', $h1['settings']['title'] );
        $this->assertEquals( '#ffffff', $h1['settings']['title_color'] );

        $h2 = $doc->findById( 'h2' );
        $this->assertNotNull( $h2 );
        $this->assertStringContainsString( 'fastest way to build WordPress sites', $h2['settings']['editor'] );

        // Verify Feature icon box content
        $ib11 = $doc->findById( 'ib11' );
        $this->assertNotNull( $ib11 );
        $this->assertEquals( 'Lightning Fast', $ib11['settings']['title_text'] );
        $this->assertEquals( 'fa fa-rocket', $ib11['settings']['icon'] );

        // Verify Feature image content
        $ib12 = $doc->findById( 'ib12' );
        $this->assertNotNull( $ib12 );
        $this->assertEquals( 'https://example.com/feature-1-1.jpg', $ib12['settings']['src'] );

        // Verify Testimonial content
        $test1 = $doc->findById( 'test1' );
        $this->assertNotNull( $test1 );
        $this->assertEquals( 'Sarah Chen', $test1['settings']['testimonial_name'] );
        $this->assertEquals( 'CTO at DataFlow', $test1['settings']['testimonial_job'] );

        // Verify CTA Button content
        $b1 = $doc->findById( 'b1' );
        $this->assertNotNull( $b1 );
        $this->assertEquals( 'Get Started', $b1['settings']['text'] );
        $this->assertEquals( '#6c63ff', $b1['settings']['background_color'] );

        // Verify full round-trip serialization preserves exact ground truth content
        $serialized = $doc->toArray();
        $this->assertEquals( $groundTruth, $serialized, 'Serialized array must exactly match ground truth fixture' );
    }

    // -----------------------------------------------------------------
    // 4. Stildelta (Style Delta Isolation & Deterministic Hashing)
    // -----------------------------------------------------------------

    public function testGroundTruthDeterministicHash(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc1        = ElementorDocument::fromArray( 101, $groundTruth );
        $doc2        = ElementorDocument::fromArray( 101, $groundTruth );

        $hash1 = $doc1->contentHash();
        $hash2 = $doc2->contentHash();

        $this->assertEquals( $hash1, $hash2, 'Ground truth contentHash must be deterministic' );
        $this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $hash1, 'Content hash must be 32-char hex MD5' );
    }

    public function testGroundTruthStyleDeltaIsolation(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc         = ElementorDocument::fromArray( 101, $groundTruth );
        $initialHash = $doc->contentHash();

        $beforeArray = $doc->toArray();

        // Mutate only button b1 background_color
        $pathOut = '';
        $mutated = $doc->updateById( 'b1', [ 'settings' => [ 'background_color' => '#ff0055' ] ], $pathOut );
        $this->assertTrue( $mutated );
        $this->assertNotEmpty( $pathOut );

        $afterArray = $doc->toArray();
        $newHash    = $doc->contentHash();

        $this->assertNotEquals( $initialHash, $newHash, 'Hash must change after mutating style' );

        // Check target element updated
        $updatedButton = $doc->findById( 'b1' );
        $this->assertEquals( '#ff0055', $updatedButton['settings']['background_color'] );
        $this->assertEquals( 'Get Started', $updatedButton['settings']['text'] ); // text preserved

        // Verify section 0 (hero) and section 1 (features) are completely untouched (zero delta)
        $this->assertEquals( $beforeArray[0], $afterArray[0], 'Hero section must have zero style delta' );
        $this->assertEquals( $beforeArray[1], $afterArray[1], 'Feature section 1 must have zero style delta' );
        $this->assertEquals( $beforeArray[5], $afterArray[5], 'Testimonials header section must have zero style delta' );
    }

    // -----------------------------------------------------------------
    // 5. Dry Run on Ground Truth
    // -----------------------------------------------------------------

    public function testGroundTruthDryRunVerification(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc         = ElementorDocument::fromArray( 101, $groundTruth );
        $beforeHash  = $doc->contentHash();

        $patches = [
            [
                'widget_id' => 'h1',
                'settings'  => [ 'title' => 'Updated Ground Truth Title' ],
            ],
            [
                'widget_id' => 'ib11',
                'settings'  => [ 'title_text' => 'Ultra Fast' ],
            ],
            [
                'widget_id' => 'nonexistent_target',
                'settings'  => [ 'foo' => 'bar' ],
            ],
        ];

        $report = $doc->dryRun( $patches );

        $this->assertTrue( $report['dry_run'] );
        $this->assertCount( 3, $report['patches'] );

        // h1 patch check
        $this->assertTrue( $report['patches'][0]['found'] );
        $this->assertEquals( 'h1', $report['patches'][0]['element_id'] );
        $this->assertEquals( 'Build Faster with Elementor', $report['patches'][0]['before']['settings']['title'] );
        $this->assertEquals( 'Updated Ground Truth Title', $report['patches'][0]['after']['settings']['title'] );

        // ib11 patch check
        $this->assertTrue( $report['patches'][1]['found'] );
        $this->assertEquals( 'ib11', $report['patches'][1]['element_id'] );
        $this->assertEquals( 'Lightning Fast', $report['patches'][1]['before']['settings']['title_text'] );
        $this->assertEquals( 'Ultra Fast', $report['patches'][1]['after']['settings']['title_text'] );

        // Nonexistent patch check
        $this->assertFalse( $report['patches'][2]['found'] );
        $this->assertNull( $report['patches'][2]['after'] );

        // Document itself remains unmutated
        $this->assertEquals( $beforeHash, $doc->contentHash() );
        $this->assertEquals( 'Build Faster with Elementor', $doc->findById( 'h1' )['settings']['title'] );
    }

    // -----------------------------------------------------------------
    // 6. Economic Payload Benchmark against Ground Truth
    // -----------------------------------------------------------------

    public function testGroundTruthPayloadRatioBenchmark(): void {
        $groundTruth = FixtureHelper::getGroundTruth();
        $doc         = ElementorDocument::fromArray( 101, $groundTruth );

        $fullReplaceSize = strlen( (string) json_encode( [ 'elementor_data' => $doc->toArray() ] ) );
        $patchBody       = (string) json_encode( [
            'settings'     => [ 'title' => 'Updated Benchmark Heading' ],
            'content_hash' => $doc->contentHash(),
        ] );
        $patchSize = strlen( $patchBody );

        $this->assertGreaterThan( 5000, $fullReplaceSize, 'Ground truth full replace payload should exceed 5 KB' );
        $this->assertLessThan( 2048, $patchSize, 'PATCH body must stay under 2 KB' );

        $ratio = $fullReplaceSize / max( $patchSize, 1 );
        $this->assertGreaterThanOrEqual( 50.0, $ratio, 'Ground truth mutation ratio must be at least 50x' );
    }
}
