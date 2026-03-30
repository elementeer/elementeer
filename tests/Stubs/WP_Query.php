<?php

/**
 * Minimal WP_Query stub for testing outside the WordPress environment.
 *
 * Uses static properties so tests can pre-configure return values and capture
 * constructor args without Mockery's overload: (which conflicts with
 * pre-existing classes and Patchwork).
 */
if ( ! class_exists( 'WP_Query' ) ) {
    class WP_Query
    {
        // --- test configuration (set before instantiating) ---
        public static array $mock_posts         = [];
        public static int   $mock_found_posts   = 0;
        public static int   $mock_max_num_pages = 1;
        public static array $captured_args      = [];

        // --- instance properties read by source code ---
        public array $posts;
        public int   $found_posts;
        public int   $max_num_pages;

        public function __construct( array $args = [] )
        {
            self::$captured_args  = $args;
            $this->posts          = self::$mock_posts;
            $this->found_posts    = self::$mock_found_posts;
            $this->max_num_pages  = self::$mock_max_num_pages;
        }

        /** Reset between tests. */
        public static function reset(): void
        {
            self::$mock_posts         = [];
            self::$mock_found_posts   = 0;
            self::$mock_max_num_pages = 1;
            self::$captured_args      = [];
        }
    }
}
