<?php
declare(strict_types=1);

namespace Elementeer\Tests;

final class FixtureHelper {

    public static function getFixturePath( string $filename ): string {
        return __DIR__ . '/fixtures/' . ltrim( $filename, '/' );
    }

    public static function loadJson( string $filename ): string {
        $path = self::getFixturePath( $filename );
        if ( ! file_exists( $path ) ) {
            throw new \RuntimeException( "Fixture file not found: {$path}" );
        }
        $content = file_get_contents( $path );
        if ( $content === false ) {
            throw new \RuntimeException( "Failed to read fixture file: {$path}" );
        }
        return $content;
    }

    public static function load( string $filename ): array {
        $json = self::loadJson( $filename );
        $data = json_decode( $json, true );
        if ( json_last_error() !== JSON_ERROR_NONE || ! is_array( $data ) ) {
            throw new \RuntimeException( "Invalid JSON in fixture {$filename}: " . json_last_error_msg() );
        }
        return $data;
    }

    public static function getGroundTruth(): array {
        return self::load( 'elementor-ground-truth.json' );
    }

    public static function getSampleData(): array {
        return self::load( 'elementor-sample-data.json' );
    }

    public static function getMetrics(): array {
        return self::load( 'elementor-ground-truth-metrics.json' );
    }
}
