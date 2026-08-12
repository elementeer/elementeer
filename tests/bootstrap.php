<?php
require_once __DIR__ . '/../vendor/autoload.php';

define( 'ELEMENTEER_DIR', dirname( __DIR__ ) . '/' );
define( 'ELEMENTEER_OPTION_KEYS', 'elementeer_api_keys' );
define( 'ELEMENTEER_OPTION_GOVERNANCE', 'elementeer_governance' );
define( 'ELEMENTEER_OPTION_ACTIVATION_MODE', 'elementeer_activation_mode' );

if ( ! class_exists( 'WP_Error' ) ) {
    class WP_Error {
        private string $code;
        private string $message;
        private array $data;

        public function __construct( string $code = '', string $message = '', array $data = [] ) {
            $this->code    = $code;
            $this->message = $message;
            $this->data    = $data;
        }

        public function get_error_code(): string {
            return $this->code;
        }

        public function get_error_message(): string {
            return $this->message;
        }

        public function get_error_data(): array {
            return $this->data;
        }
    }
}

