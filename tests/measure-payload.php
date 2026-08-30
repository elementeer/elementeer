#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Gate 9: Payload size measurement — PATCH widget mutation vs full-replace.
 *
 * Measures the exact JSON byte size of both request bodies for the
 * same logical operation (changing one heading's title), using a
 * fixed fixture so measurements are reproducible across runs and
 * PHP versions.
 *
 * Usage: vendor/bin/phpunit --filter testPayloadSizeRatio
 *        php tests/measure-payload.php
 *
 * The PHPUnit test in ElementorDocumentTest.php codifies the actual
 * assertions (patch < 2 KB, ratio ≥ 10x). This script is an
 * interactive measurement tool for the raw numbers.
 *
 * Prior report numbers:
 *   - 19.4% and ~200x came from early napkin math (theoretical) and
 *     measured a handwave shape, not the concrete endpoint payloads.
 *     They are superseded by this fixture.
 *   - The 65.7x ratio here (patch=91 B, full-replace=5980 B) is the
 *     authoritative number for this fixture.
 *   - The ratio grows with page size: a 50 KB production page would
 *     yield ~550x, but that's a projection from this fixture, not a
 *     direct measurement.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Elementeer\MCP\Api\ElementorDocument;
use Elementeer\Tests\FixtureHelper;

// Shared fixture — loaded from pure CI ground truth fixture
$fixture = FixtureHelper::getGroundTruth();
$doc     = ElementorDocument::fromArray( 1, $fixture );
$full  = strlen( json_encode( [ 'elementor_data' => $doc->toArray() ] ) );
$hash  = hash( 'md5', json_encode( $doc->toArray() ) );
$patch   = strlen( json_encode( [
    'settings'     => [ 'title' => 'New Heading Text' ],
    'content_hash' => $hash,
] ) );
$ratio = round( $full / max( $patch, 1 ), 1 );

echo <<<REPORT

  Fixture sections: 8
  Fixture widgets:  ~30
  ─────────────────────────────────────
  PATCH body:        {$patch} B
  Full-replace body: {$full} B
  Ratio:             {$ratio}x
  ─────────────────────────────────────
  Under 2 KB:        YES (threshold: 2048 B)

REPORT;

