<?php

/**
 * Minimal WP_REST_Response stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_REST_Response' ) ) {
    class WP_REST_Response
    {
        private mixed $data;
        private int $status;

        public function __construct( mixed $data = null, int $status = 200 )
        {
            $this->data   = $data;
            $this->status = $status;
        }

        public function get_data(): mixed
        {
            return $this->data;
        }

        public function get_status(): int
        {
            return $this->status;
        }
    }
}
