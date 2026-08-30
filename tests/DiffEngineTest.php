<?php
declare(strict_types=1);

namespace Elementeer\Tests;

use Elementeer\MCP\Api\ElementorDocument;
use Elementeer\MCP\Api\DiffEngine;
use PHPUnit\Framework\TestCase;
use Brain\Monkey;

class DiffEngineTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testCompareSortsByConfidence(): void {
        $targetData = [
            [
                'id' => 't1',
                'elType' => 'section',
                'elements' => [
                    [
                        'id' => 'w1',
                        'elType' => 'widget',
                        'settings' => ['title' => 'Old Title']
                    ]
                ]
            ]
        ];

        $modelData = [
            [
                'id' => 't1',
                'elType' => 'section',
                'elements' => [
                    [
                        'id' => 'w1', // Modified
                        'elType' => 'widget',
                        'settings' => ['title' => 'New Title', '__confidence' => 'low']
                    ],
                    [
                        'id' => 'w2', // Added
                        'elType' => 'widget',
                        'settings' => ['title' => 'Added Title', '__confidence' => 'medium']
                    ],
                    [
                        'id' => 'w3', // Added high confidence
                        'elType' => 'widget',
                        '__confidence' => 'high'
                    ]
                ]
            ]
        ];

        $target = ElementorDocument::fromArray(1, $targetData);
        $model = ElementorDocument::fromArray(1, $modelData);

        $diffs = DiffEngine::compare($target, $model);

        $this->assertCount(3, $diffs);

        // First should be lowest confidence ('low' -> 0)
        $this->assertEquals('w1', $diffs[0]['element_id']);
        $this->assertEquals(0, $diffs[0]['confidence']);
        $this->assertEquals('modified', $diffs[0]['type']);

        // Second should be 'medium' -> 50
        $this->assertEquals('w2', $diffs[1]['element_id']);
        $this->assertEquals(50, $diffs[1]['confidence']);
        $this->assertEquals('added', $diffs[1]['type']);

        // Third should be 'high' -> 100
        $this->assertEquals('w3', $diffs[2]['element_id']);
        $this->assertEquals(100, $diffs[2]['confidence']);
        $this->assertEquals('added', $diffs[2]['type']);
    }

    public function testCompareFindsRemovals(): void {
        $targetData = [
            [
                'id' => 'to_remove',
                'elType' => 'widget',
            ]
        ];

        $modelData = [];

        $target = ElementorDocument::fromArray(1, $targetData);
        $model = ElementorDocument::fromArray(1, $modelData);

        $diffs = DiffEngine::compare($target, $model);

        $this->assertCount(1, $diffs);
        $this->assertEquals('to_remove', $diffs[0]['element_id']);
        $this->assertEquals('removed', $diffs[0]['type']);
    }
}
