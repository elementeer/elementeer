<?php

/**
 * Minimal WP_Query stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_Query' ) ) {
    class WP_Query
    {
        public array $posts         = [];
        public int   $found_posts   = 0;
        public int   $max_num_pages = 1;

        public function __construct( array $args = [] )
        {
            // Stub — real behavior is mocked via Mockery in tests
        }
    }
}
