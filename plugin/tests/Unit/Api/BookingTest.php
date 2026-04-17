<?php

declare(strict_types=1);

namespace Elementify\Tests\Unit\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Booking;
use Mockery;
use PHPUnit\Framework\TestCase;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Unit tests for Booking API.
 *
 * @covers \Elementify\MCP\Api\Booking
 */
class BookingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Stub WP_Error and WP_REST_Request if not available
        if (!class_exists('WP_Error')) {
            require_once __DIR__ . '/../../Stubs/WP_Error.php';
        }
        if (!class_exists('WP_REST_Request')) {
            require_once __DIR__ . '/../../Stubs/WP_REST_Request.php';
        }

        // Mock Auth manager to avoid real authentication
        $authMock = Mockery::mock('overload:Elementify\MCP\Auth\Manager');
        $authMock->shouldReceive('get_instance')->andReturnSelf();
        $authMock->shouldReceive('authorize')->andReturn(true);
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        Mockery::close();
        parent::tearDown();
    }

    public function test_class_can_be_instantiated(): void
    {
        $booking = new Booking();
        $this->assertInstanceOf(Booking::class, $booking);
    }

    public function test_get_booking_status_returns_response(): void
    {
        // Mock WordPress functions
        Functions\when('get_option')->justReturn(['ameliabooking/ameliabooking.php']);
        Functions\when('dirname')->justReturn('ameliabooking');
        Functions\when('absint')->justReturn(1);

        $booking = new Booking();
        $request = new WP_REST_Request('GET', '/booking/status');
        $response = $booking->get_booking_status($request);

        $this->assertInstanceOf(WP_REST_Response::class, $response);
        $data = $response->get_data();
        $this->assertIsArray($data);
        $this->assertArrayHasKey('booking_available', $data);
    }

    public function test_list_bookings_returns_error_when_no_plugin(): void
    {
        Functions\when('get_option')->justReturn([]);
        Functions\when('dirname')->justReturn('');

        $booking = new Booking();
        $request = new WP_REST_Request('GET', '/booking/list');
        $request->set_param('page', 1);
        $request->set_param('per_page', 20);
        $response = $booking->list_bookings($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_booking_inactive', $response->get_error_code());
    }

    public function test_get_booking_stats_returns_error_when_no_plugin(): void
    {
        Functions\when('get_option')->justReturn([]);
        Functions\when('dirname')->justReturn('');

        $booking = new Booking();
        $request = new WP_REST_Request('GET', '/booking/stats');
        $response = $booking->get_booking_stats($request);

        $this->assertInstanceOf(WP_Error::class, $response);
        $this->assertSame('elementify_booking_inactive', $response->get_error_code());
    }
}