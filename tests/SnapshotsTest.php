<?php
declare(strict_types=1);

namespace Elementeer\Tests;

use Elementeer\MCP\Api\Snapshots;
use PHPUnit\Framework\TestCase;
use Brain\Monkey;
use Brain\Monkey\Functions;

class SnapshotsTest extends TestCase {

    private array $optionStore = [];

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        $this->optionStore = [];

        Functions\when( '__' )->returnArg();
        Functions\when( 'wp_json_encode' )->alias( 'json_encode' );
        Functions\when( 'wp_slash' )->returnArg( 1 );
        Functions\when( 'wp_generate_uuid4' )->alias( fn() => bin2hex( random_bytes( 16 ) ) );

        Functions\when( 'get_option' )->alias( function ( string $key, $default = false ) {
            return $this->optionStore[ $key ] ?? $default;
        } );

        Functions\when( 'update_option' )->alias( function ( string $key, $value ) {
            $this->optionStore[ $key ] = $value;
            return true;
        } );

        Functions\when( 'get_post_meta' )->justReturn( json_encode( $this->sampleData() ) );
        Functions\when( 'update_post_meta' )->alias( function ( int $id, string $key, $value ) {
            $this->optionStore[ "meta_{$id}_{$key}" ] = $value;
            return true;
        } );

        Functions\when( 'wp_update_post' )->justReturn( 1 );
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    // -----------------------------------------------------------------
    // capture / restore
    // -----------------------------------------------------------------

    public function testCaptureReturnsUuid(): void {
        $uuid = Snapshots::capture( 1 );
        $this->assertNotEmpty( $uuid );
        $this->assertMatchesRegularExpression( '/^[a-f0-9\-]+$/', $uuid );
    }

    public function testRestoreWritesDataBack(): void {
        $uuid = Snapshots::capture( 1 );
        $this->assertNotEmpty( $uuid );

        $result = Snapshots::restore( $uuid );
        $this->assertTrue( $result );
    }

    public function testRestoreNonexistentReturnsFalse(): void {
        $result = Snapshots::restore( 'nonexistent-uuid' );
        $this->assertFalse( $result );
    }

    public function testGetReturnsSnapshot(): void {
        $uuid = Snapshots::capture( 1 );
        $snap = Snapshots::get( $uuid );
        $this->assertIsArray( $snap );
        $this->assertEquals( $uuid, $snap['uuid'] );
        $this->assertEquals( 1, $snap['post_id'] );
    }

    public function testGetNonexistentReturnsNull(): void {
        $snap = Snapshots::get( 'nope' );
        $this->assertNull( $snap );
    }

    // -----------------------------------------------------------------
    // Session management
    // -----------------------------------------------------------------

    public function testBeginSessionReturnsId(): void {
        $sessionId = Snapshots::beginSession();
        $this->assertNotEmpty( $sessionId );
    }

    public function testEndSessionMarksEnded(): void {
        $sessionId = Snapshots::beginSession();
        $result    = Snapshots::endSession( $sessionId );
        $this->assertTrue( $result );

        $session = Snapshots::getSession( $sessionId );
        $this->assertEquals( 'ended', $session['status'] );
    }

    public function testEndSessionUnknownReturnsFalse(): void {
        $result = Snapshots::endSession( 'unknown' );
        $this->assertFalse( $result );
    }

    public function testRestoreSessionRollsBackAllSnapshots(): void {
        $sessionId = Snapshots::beginSession();

        $uuid1 = Snapshots::capture( 1, $sessionId );
        $uuid2 = Snapshots::capture( 2, $sessionId );

        $result = Snapshots::restoreSession( $sessionId );
        $this->assertTrue( $result['success'] );
        $this->assertEquals( 2, $result['restored'] );
        $this->assertEquals( 2, $result['total'] );

        $session = Snapshots::getSession( $sessionId );
        $this->assertEquals( 'rolled_back', $session['status'] );
    }

    public function testRestoreSessionUnknownReturnsFailure(): void {
        $result = Snapshots::restoreSession( 'unknown' );
        $this->assertFalse( $result['success'] );
        $this->assertEquals( 0, $result['restored'] );
    }

    // -----------------------------------------------------------------
    // Helper data
    // -----------------------------------------------------------------

    private function sampleData(): array {
        return [
            [
                'id'       => 'section1',
                'elType'   => 'section',
                'settings' => [],
                'elements' => [],
            ],
        ];
    }
}
