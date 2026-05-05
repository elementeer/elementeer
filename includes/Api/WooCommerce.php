<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

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
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
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
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product_id = absint( $request->get_param( 'id' ) );
        if ( ! $product_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Product ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Product not found.', 'elementeer' ),
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

    /**
     * Create a new product.
     */
    public function create_product( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        $name = sanitize_text_field( $body['name'] ?? '' );
        $type = sanitize_text_field( $body['type'] ?? 'simple' );
        $status = sanitize_text_field( $body['status'] ?? 'draft' );

        if ( empty( $name ) ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Product name is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        // Placeholder: Create product logic
        $product = new \WC_Product_Simple();
        $product->set_name( $name );
        $product->set_status( $status );
        $product->set_regular_price( $body['regular_price'] ?? '' );
        $product->set_sale_price( $body['sale_price'] ?? '' );
        $product->set_description( $body['description'] ?? '' );
        $product->set_short_description( $body['short_description'] ?? '' );
        $product->set_sku( $body['sku'] ?? '' );
        $product->set_manage_stock( $body['manage_stock'] ?? false );
        if ( isset( $body['stock_quantity'] ) ) {
            $product->set_stock_quantity( intval( $body['stock_quantity'] ) );
        }
        $product_id = $product->save();

        if ( ! $product_id ) {
            return new WP_Error(
                'elementeer_create_failed',
                __( 'Failed to create product.', 'elementeer' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'product_id' => $product_id,
                'message' => 'Product created successfully.',
                'product' => $this->format_product( wc_get_product( $product_id ) ),
            ],
            201
        );
    }

    /**
     * Update an existing product.
     */
    public function update_product( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product_id = absint( $request->get_param( 'id' ) );
        if ( ! $product_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Product ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Product not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        if ( isset( $body['name'] ) ) {
            $product->set_name( sanitize_text_field( $body['name'] ) );
        }
        if ( isset( $body['regular_price'] ) ) {
            $product->set_regular_price( $body['regular_price'] );
        }
        if ( isset( $body['sale_price'] ) ) {
            $product->set_sale_price( $body['sale_price'] );
        }
        if ( isset( $body['description'] ) ) {
            $product->set_description( $body['description'] );
        }
        if ( isset( $body['short_description'] ) ) {
            $product->set_short_description( $body['short_description'] );
        }
        if ( isset( $body['sku'] ) ) {
            $product->set_sku( $body['sku'] );
        }
        if ( isset( $body['manage_stock'] ) ) {
            $product->set_manage_stock( (bool) $body['manage_stock'] );
        }
        if ( isset( $body['stock_quantity'] ) ) {
            $product->set_stock_quantity( intval( $body['stock_quantity'] ) );
        }
        if ( isset( $body['status'] ) ) {
            $product->set_status( sanitize_text_field( $body['status'] ) );
        }

        $updated_id = $product->save();

        return new WP_REST_Response(
            [
                'product_id' => $updated_id,
                'message' => 'Product updated successfully.',
                'product' => $this->format_product( wc_get_product( $updated_id ) ),
            ],
            200
        );
    }

    /**
     * Delete a product.
     */
    public function delete_product( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product_id = absint( $request->get_param( 'id' ) );
        if ( ! $product_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Product ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Product not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        $force = (bool) ( $request->get_param( 'force' ) ?? false );
        $deleted = $force ? $product->delete( true ) : wp_trash_post( $product_id );

        if ( ! $deleted ) {
            return new WP_Error(
                'elementeer_delete_failed',
                __( 'Failed to delete product.', 'elementeer' ),
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'product_id' => $product_id,
                'deleted' => true,
                'message' => $force ? 'Product permanently deleted.' : 'Product moved to trash.',
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Orders
    // ------------------------------------------------------------------ //

    /**
     * List WooCommerce orders with pagination and filtering.
     */
    public function list_orders( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $params = $request->get_params();
        $page     = absint( $params['page'] ?? 1 );
        $per_page = absint( $params['per_page'] ?? 20 );
        $status   = sanitize_text_field( $params['status'] ?? '' );
        $customer = isset( $params['customer'] ) ? absint( $params['customer'] ) : 0;
        $product  = isset( $params['product'] ) ? absint( $params['product'] ) : 0;

        if ( $per_page < 1 || $per_page > 100 ) {
            $per_page = 20;
        }

        $args = [
            'limit'  => $per_page,
            'offset' => ( $page - 1 ) * $per_page,
            'return' => 'objects',
        ];

        if ( ! empty( $status ) ) {
            $args['status'] = $status;
        }
        if ( $customer > 0 ) {
            $args['customer_id'] = $customer;
        }
        if ( $product > 0 ) {
            $args['product_id'] = $product;
        }

        $orders = wc_get_orders( $args );
        $total  = $this->count_orders( $args );

        $formatted = array_map( [ $this, 'format_order' ], $orders );

        return new WP_REST_Response(
            [
                'orders'       => $formatted,
                'total'        => $total,
                'page'         => $page,
                'per_page'     => $per_page,
                'total_pages'  => ceil( $total / $per_page ),
            ],
            200
        );
    }

    /**
     * Get a single order by ID.
     */
    public function get_order( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $order_id = absint( $request->get_param( 'id' ) );
        if ( ! $order_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Order ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Order not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        return new WP_REST_Response(
            [
                'order' => $this->format_order( $order ),
            ],
            200
        );
    }

    /**
     * Update order status.
     */
    public function update_order_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $order_id = absint( $request->get_param( 'id' ) );
        if ( ! $order_id ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Order ID is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return new WP_Error(
                'elementeer_not_found',
                __( 'Order not found.', 'elementeer' ),
                [ 'status' => 404 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        $new_status = sanitize_text_field( $body['status'] ?? '' );
        $note = sanitize_text_field( $body['note'] ?? '' );

        if ( empty( $new_status ) ) {
            return new WP_Error(
                'elementeer_missing_param',
                __( 'Status is required.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $order->update_status( $new_status, $note );

        return new WP_REST_Response(
            [
                'order_id' => $order_id,
                'status'   => $new_status,
                'message'  => 'Order status updated successfully.',
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Product Categories
    // ------------------------------------------------------------------ //

    /**
     * List WooCommerce product categories.
     */
    public function list_product_categories( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $params = $request->get_params();
        $page     = absint( $params['page'] ?? 1 );
        $per_page = absint( $params['per_page'] ?? 50 );
        $parent   = isset( $params['parent'] ) ? absint( $params['parent'] ) : 0;

        if ( $per_page < 1 || $per_page > 100 ) {
            $per_page = 50;
        }

        $args = [
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'number'     => $per_page,
            'offset'     => ( $page - 1 ) * $per_page,
        ];

        if ( $parent > 0 ) {
            $args['parent'] = $parent;
        }

        $terms = get_terms( $args );
        if ( is_wp_error( $terms ) ) {
            return new WP_Error(
                'elementeer_categories_error',
                __( 'Failed to retrieve categories.', 'elementeer' ),
                [ 'status' => 500 ]
            );
        }

        $formatted = array_map( [ $this, 'format_product_category' ], $terms );

        return new WP_REST_Response(
            [
                'categories'   => $formatted,
                'page'         => $page,
                'per_page'     => $per_page,
            ],
            200
        );
    }

    /**
     * Create, update, or delete a product category.
     */
    public function manage_product_category( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        $action = sanitize_text_field( $body['action'] ?? '' );
        $id     = isset( $body['id'] ) ? absint( $body['id'] ) : 0;
        $name   = sanitize_text_field( $body['name'] ?? '' );

        if ( $action === 'create' || $action === 'update' ) {
            if ( empty( $name ) ) {
                return new WP_Error(
                    'elementeer_missing_param',
                    __( 'Category name is required.', 'elementeer' ),
                    [ 'status' => 400 ]
                );
            }

            $args = [
                'name'        => $name,
                'slug'        => sanitize_text_field( $body['slug'] ?? '' ),
                'description' => sanitize_text_field( $body['description'] ?? '' ),
                'parent'      => isset( $body['parent'] ) ? absint( $body['parent'] ) : 0,
            ];

            if ( $action === 'create' ) {
                $result = wp_insert_term( $name, 'product_cat', $args );
            } else {
                if ( ! $id ) {
                    return new WP_Error(
                        'elementeer_missing_param',
                        __( 'Category ID is required for update.', 'elementeer' ),
                        [ 'status' => 400 ]
                    );
                }
                $result = wp_update_term( $id, 'product_cat', $args );
            }

            if ( is_wp_error( $result ) ) {
                return new WP_Error(
                    'elementeer_category_failed',
                    $result->get_error_message(),
                    [ 'status' => 500 ]
                );
            }

            return new WP_REST_Response(
                [
                    'category_id' => $result['term_id'],
                    'message'     => 'Category ' . ( $action === 'create' ? 'created' : 'updated' ) . ' successfully.',
                ],
                $action === 'create' ? 201 : 200
            );
        }

        if ( $action === 'delete' ) {
            if ( ! $id ) {
                return new WP_Error(
                    'elementeer_missing_param',
                    __( 'Category ID is required for deletion.', 'elementeer' ),
                    [ 'status' => 400 ]
                );
            }

            $result = wp_delete_term( $id, 'product_cat' );
            if ( is_wp_error( $result ) || ! $result ) {
                return new WP_Error(
                    'elementeer_delete_failed',
                    __( 'Failed to delete category.', 'elementeer' ),
                    [ 'status' => 500 ]
                );
            }

            return new WP_REST_Response(
                [
                    'category_id' => $id,
                    'deleted'     => true,
                    'message'     => 'Category deleted successfully.',
                ],
                200
            );
        }

        return new WP_Error(
            'elementeer_invalid_action',
            __( 'Invalid action. Must be "create", "update", or "delete".', 'elementeer' ),
            [ 'status' => 400 ]
        );
    }

    // ------------------------------------------------------------------ //
    // Store Settings
    // ------------------------------------------------------------------ //

    /**
     * Get WooCommerce store settings.
     */
    public function get_store_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $settings = [
            'currency'               => get_option( 'woocommerce_currency', 'USD' ),
            'currency_position'      => get_option( 'woocommerce_currency_pos', 'left' ),
            'thousand_separator'     => get_option( 'woocommerce_price_thousand_sep', ',' ),
            'decimal_separator'      => get_option( 'woocommerce_price_decimal_sep', '.' ),
            'number_of_decimals'     => get_option( 'woocommerce_price_num_decimals', 2 ),
            'weight_unit'            => get_option( 'woocommerce_weight_unit', 'kg' ),
            'dimension_unit'         => get_option( 'woocommerce_dimension_unit', 'cm' ),
            'enable_taxes'           => get_option( 'woocommerce_calc_taxes', 'no' ) === 'yes',
            'tax_based_on'           => get_option( 'woocommerce_tax_based_on', 'shipping' ),
            'shipping_calculation'   => get_option( 'woocommerce_shipping_tax_class', '' ),
            'coupons_enabled'        => get_option( 'woocommerce_enable_coupons', 'yes' ) === 'yes',
        ];

        return new WP_REST_Response( $settings, 200 );
    }

    /**
     * Update WooCommerce store settings.
     */
    public function update_store_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        $updated = [];

        $mapping = [
            'currency'             => 'woocommerce_currency',
            'currency_position'    => 'woocommerce_currency_pos',
            'thousand_separator'   => 'woocommerce_price_thousand_sep',
            'decimal_separator'    => 'woocommerce_price_decimal_sep',
            'number_of_decimals'   => 'woocommerce_price_num_decimals',
            'weight_unit'          => 'woocommerce_weight_unit',
            'dimension_unit'       => 'woocommerce_dimension_unit',
            'enable_taxes'         => [ 'woocommerce_calc_taxes', fn($v) => $v ? 'yes' : 'no' ],
            'tax_based_on'         => 'woocommerce_tax_based_on',
            'shipping_calculation' => 'woocommerce_shipping_tax_class',
            'coupons_enabled'      => [ 'woocommerce_enable_coupons', fn($v) => $v ? 'yes' : 'no' ],
        ];

        foreach ( $mapping as $key => $target ) {
            if ( isset( $body[ $key ] ) ) {
                $value = $body[ $key ];
                if ( is_array( $target ) ) {
                    list( $option, $transform ) = $target;
                    $value = $transform( $value );
                    update_option( $option, $value );
                } else {
                    update_option( $target, $value );
                }
                $updated[] = $key;
            }
        }

        return new WP_REST_Response(
            [
                'updated' => $updated,
                'message' => 'Store settings updated successfully.',
            ],
            200
        );
    }

    /**
     * Ensure WooCommerce pages exist and are Elementor ready.
     */
    public function setup_woocommerce_pages( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'ecommerce-operations:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        if ( ! $this->is_woocommerce_active() ) {
            return new WP_Error(
                'elementeer_woocommerce_inactive',
                __( 'WooCommerce is not active on this site.', 'elementeer' ),
                [ 'status' => 400 ]
            );
        }

        $body = $request->get_json_params() ?: [];
        $create_missing = $body['create_missing'] ?? true;
        $assign_template = $body['assign_template'] ?? true;

        $pages = [
            'shop'      => wc_get_page_id( 'shop' ),
            'cart'      => wc_get_page_id( 'cart' ),
            'checkout'  => wc_get_page_id( 'checkout' ),
            'myaccount' => wc_get_page_id( 'myaccount' ),
        ];

        $results = [];
        foreach ( $pages as $page_name => $page_id ) {
            if ( $page_id > 0 && get_post_status( $page_id ) === 'publish' ) {
                $results[ $page_name ] = [
                    'id'      => $page_id,
                    'status'  => 'exists',
                    'message' => 'Page already exists.',
                ];
            } elseif ( $create_missing ) {
                // Placeholder: Create missing page
                $new_page_id = wp_insert_post( [
                    'post_title'   => ucfirst( $page_name ),
                    'post_type'    => 'page',
                    'post_status'  => 'publish',
                    'post_content' => '[' . $page_name . ']',
                ] );
                if ( $new_page_id ) {
                    update_option( 'woocommerce_' . $page_name . '_page_id', $new_page_id );
                    $results[ $page_name ] = [
                        'id'      => $new_page_id,
                        'status'  => 'created',
                        'message' => 'Page created successfully.',
                    ];
                } else {
                    $results[ $page_name ] = [
                        'id'      => 0,
                        'status'  => 'failed',
                        'message' => 'Failed to create page.',
                    ];
                }
            } else {
                $results[ $page_name ] = [
                    'id'      => 0,
                    'status'  => 'missing',
                    'message' => 'Page missing and create_missing is false.',
                ];
            }
        }

        return new WP_REST_Response(
            [
                'pages' => $results,
                'message' => 'WooCommerce pages setup completed.',
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

    private function count_orders( array $args ): int {
        $args['limit']  = -1;
        $args['offset'] = 0;
        $args['return'] = 'ids';
        $ids = wc_get_orders( $args );
        return is_array( $ids ) ? count( $ids ) : 0;
    }

    private function format_order( $order ): array {
        if ( ! is_a( $order, 'WC_Order' ) ) {
            return [];
        }

        $items = [];
        foreach ( $order->get_items() as $item ) {
            $items[] = [
                'product_id' => $item->get_product_id(),
                'quantity'   => $item->get_quantity(),
                'total'      => $item->get_total(),
                'name'       => $item->get_name(),
            ];
        }

        return [
            'id'               => $order->get_id(),
            'status'           => $order->get_status(),
            'currency'         => $order->get_currency(),
            'total'            => $order->get_total(),
            'date_created'     => $order->get_date_created() ? $order->get_date_created()->format( 'c' ) : null,
            'date_modified'    => $order->get_date_modified() ? $order->get_date_modified()->format( 'c' ) : null,
            'customer_id'      => $order->get_customer_id(),
            'billing'          => $order->get_address( 'billing' ),
            'shipping'         => $order->get_address( 'shipping' ),
            'payment_method'   => $order->get_payment_method(),
            'transaction_id'   => $order->get_transaction_id(),
            'customer_note'    => $order->get_customer_note(),
            'line_items'       => $items,
        ];
    }

    private function format_product_category( $term ): array {
        if ( ! is_a( $term, 'WP_Term' ) ) {
            return [];
        }

        return [
            'id'          => $term->term_id,
            'name'        => $term->name,
            'slug'        => $term->slug,
            'description' => $term->description,
            'count'       => $term->count,
            'parent'      => $term->parent,
        ];
    }
}