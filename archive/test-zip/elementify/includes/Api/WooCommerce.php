<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for WooCommerce integration.
 * Provides CRUD operations for products, orders, and store settings.
 */
final class WooCommerce {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // Products
    // ------------------------------------------------------------------ //

    /**
     * List WooCommerce products with pagination and filtering.
     */
    public function list_products( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementify_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $params = $request->get_params();

        $page     = absint( $params['page'] ?? 1 );
        $per_page = absint( $params['per_page'] ?? 20 );
        $status   = sanitize_text_field( $params['status'] ?? 'any' );
        $category = isset( $params['category'] ) ? absint( $params['category'] ) : 0;
        $search   = sanitize_text_field( $params['search'] ?? '' );

        if ( $per_page < 1 || $per_page > 100 ) {
            $per_page = 20;
        }

        $args = [
            'limit'  => $per_page,
            'offset' => ( $page - 1 ) * $per_page,
            'status' => $status,
            'return' => 'objects',
        ];

        if ( ! empty( $search ) ) {
            $args['s'] = $search;
        }

        if ( $category > 0 ) {
            $args['category'] = [ $category ];
        }

        $products = wc_get_products( $args );
        $total    = $this->count_products( $args );

        $formatted = array_map( [ $this, 'format_product' ], $products );

        return new WP_REST_Response(
            [
                'products'      => $formatted,
                'total'         => $total,
                'page'          => $page,
                'per_page'      => $per_page,
                'total_pages'   => ceil( $total / $per_page ),
            ],
            200
        );
    }

    /**
     * Get a single product by ID.
     */
    public function get_product( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementify_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $product_id = absint( $request->get_param( 'id' ) );
        if ( ! $product_id ) {
            return new WP_Error(
                'elementify_missing_param',
                __( 'Product ID is required.', 'elementify-mcp' ),
                [ 'status' => 400 ]
            );
        }

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return new WP_Error(
                'elementify_not_found',
                __( 'Product not found.', 'elementify-mcp' ),
                [ 'status' => 404 ]
            );
        }

        return new WP_REST_Response(
            [
                'product' => $this->format_product( $product ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Helpers
    // ------------------------------------------------------------------ //

    private function is_woocommerce_active(): bool {
        return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' );
    }

    private function count_products( array $args ): int {
        $args['limit']  = -1;
        $args['offset'] = 0;
        $args['return'] = 'ids';
        unset( $args['s'] ); // search not needed for count
        $ids = wc_get_products( $args );
        return is_array( $ids ) ? count( $ids ) : 0;
    }

    private function format_product( $product ): array {
        if ( ! is_a( $product, 'WC_Product' ) ) {
            return [];
        }

        $image_id = $product->get_image_id();
        $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';

        return [
            'id'                 => $product->get_id(),
            'name'               => $product->get_name(),
            'slug'               => $product->get_slug(),
            'description'        => $product->get_description(),
            'short_description'  => $product->get_short_description(),
            'price'              => $product->get_price(),
            'regular_price'      => $product->get_regular_price(),
            'sale_price'         => $product->get_sale_price(),
            'stock_quantity'     => $product->get_stock_quantity(),
            'stock_status'       => $product->get_stock_status(),
            'sku'                => $product->get_sku(),
            'type'               => $product->get_type(),
            'status'             => $product->get_status(),
            'featured'           => $product->get_featured(),
            'catalog_visibility' => $product->get_catalog_visibility(),
            'image_url'          => $image_url,
            'categories'         => wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'ids' ] ),
            'tags'               => wp_get_post_terms( $product->get_id(), 'product_tag', [ 'fields' => 'ids' ] ),
            'date_created'       => $product->get_date_created() ? $product->get_date_created()->format( 'c' ) : null,
            'date_modified'      => $product->get_date_modified() ? $product->get_date_modified()->format( 'c' ) : null,
        ];
    }
}