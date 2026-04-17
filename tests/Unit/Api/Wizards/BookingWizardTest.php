<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api\Wizards;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Wizards\BookingWizard;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for BookingWizard.
 *
 * @covers \Elementify\MCP\Api\Wizards\BookingWizard
 */
class BookingWizardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Stub WP_Error and WP_REST_Request if not available
        if (!class_exists('WP_Error')) {
            require_once __DIR__ . '/../../../Stubs/WP_Error.php';
        }
        if (!class_exists('WP_REST_Request')) {
            require_once __DIR__ . '/../../../Stubs/WP_REST_Request.php';
        }
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function test_class_can_be_instantiated(): void
    {
        $assessment = [
            'plugins' => [
                'classified' => [],
            ],
            'pages' => [],
        ];
        $wizard = new BookingWizard($assessment);
        $this->assertInstanceOf(BookingWizard::class, $wizard);
    }

    public function test_assess_module_state_without_booking_plugin(): void
    {
        $assessment = [
            'plugins' => [
                'classified' => [],
            ],
            'pages' => [],
        ];
        $wizard = new BookingWizard($assessment);
        $state = $wizard->assess_module_state();

        $this->assertIsArray($state);
        $this->assertArrayHasKey('status', $state);
        $this->assertArrayHasKey('details', $state);
        $this->assertSame('missing', $state['status']);
        $this->assertFalse($state['details']['booking_available']);
    }

    public function test_analyze_gaps_without_booking_plugin(): void
    {
        $assessment = [
            'plugins' => [
                'classified' => [],
            ],
            'pages' => [],
        ];
        $wizard = new BookingWizard($assessment);
        $gaps = $wizard->analyze_gaps();

        $this->assertIsArray($gaps);
        $this->assertCount(1, $gaps);
        $this->assertSame('booking_missing', $gaps[0]['id']);
    }

    public function test_generate_recommendations_without_booking_plugin(): void
    {
        $assessment = [
            'plugins' => [
                'classified' => [],
            ],
            'pages' => [],
        ];
        $wizard = new BookingWizard($assessment);
        $recs = $wizard->generate_recommendations();

        $this->assertIsArray($recs);
        $this->assertCount(1, $recs);
        $this->assertSame('install_booking', $recs[0]['id']);
    }
}