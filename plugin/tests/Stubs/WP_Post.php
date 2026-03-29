<?php

/**
 * Minimal WP_Post stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_Post' ) ) {
    class WP_Post
    {
        public int    $ID           = 0;
        public string $post_title   = '';
        public string $post_status  = 'publish';
        public string $post_type    = 'post';
        public string $post_author  = '0';
        public string $post_content = '';
        public string $post_date    = '';
        public string $post_modified = '';

        public function __construct( object $post )
        {
            foreach ( get_object_vars( $post ) as $key => $value ) {
                $this->$key = $value;
            }
        }
    }
}
