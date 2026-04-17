<?php

/**
 * Minimal WP_REST_Request stub for testing outside the WordPress environment.
 */
if ( ! class_exists( 'WP_REST_Request' ) ) {
    class WP_REST_Request implements ArrayAccess
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

        public function get_params(): array
        {
            return $this->params;
        }

        public function set_param( string $key, $value ): void
        {
            $this->params[ $key ] = $value;
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

        // ArrayAccess implementation
        public function offsetExists( $offset ): bool
        {
            return isset( $this->params[ $offset ] );
        }

        public function offsetGet( $offset ): mixed
        {
            return $this->params[ $offset ] ?? null;
        }

        public function offsetSet( $offset, $value ): void
        {
            $this->params[ $offset ] = $value;
        }

        public function offsetUnset( $offset ): void
        {
            unset( $this->params[ $offset ] );
        }
    }
}
