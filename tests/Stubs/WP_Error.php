<?php

/**
 * Minimal WP_Error stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_Error' ) ) {
    class WP_Error
    {
        private string $code;
        private string $message;
        private mixed $data;

        public function __construct( string $code = '', string $message = '', mixed $data = '' )
        {
            $this->code    = $code;
            $this->message = $message;
            $this->data    = $data;
        }

        public function get_error_code(): string
        {
            return $this->code;
        }

        public function get_error_message(): string
        {
            return $this->message;
        }

        public function get_error_data(): mixed
        {
            return $this->data;
        }
    }
}

// is_wp_error() is intentionally NOT defined here.
// Brain\Monkey/Patchwork intercepts it at test time via Functions\when().
// Defining it here before Patchwork loads would cause DefinedTooEarly errors.
