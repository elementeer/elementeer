<?php

/**
 * Minimal WP_REST_Request stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_REST_Request' ) ) {
    class WP_REST_Request
    {
        private array $params;
        private string $method;

        public function __construct( string $method = 'GET', array $params = [] )
        {
            $this->method = $method;
            $this->params = $params;
        }

        public function get_param( string $key ): mixed
        {
            return $this->params[ $key ] ?? null;
        }

        public function get_json_params(): array
        {
            return $this->params;
        }

        public function get_header( string $name ): string
        {
            return $this->params[ 'header_' . strtolower( $name ) ] ?? '';
        }

        public function get_method(): string
        {
            return $this->method;
        }
    }
}
