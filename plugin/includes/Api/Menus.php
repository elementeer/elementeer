<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for WordPress menu management.
 * Provides CRUD operations for navigation menus and menu items.
 */
final class Menus {

    private Auth $auth;

    public function __construct() {
        $this->auth = Auth::get_instance();
    }

    // ------------------------------------------------------------------ //
    // Menus
    // ------------------------------------------------------------------ //

    /**
     * List all navigation menus.
     */
    public function list_menus( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $menus = wp_get_nav_menus();
        if ( false === $menus ) {
            return new WP_REST_Response( [ 'menus' => [] ], 200 );
        }

        $formatted = array_map( [ $this, 'format_menu' ], $menus );

        return new WP_REST_Response(
            [
                'menus' => $formatted,
                'total' => count( $formatted ),
            ],
            200
        );
    }

    /**
     * Create a new navigation menu.
     */
    public function create_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $name = sanitize_text_field( $request->get_param( 'name' ) );
        if ( empty( $name ) ) {
            return new WP_Error(
                'missing_param',
                'Menu name is required.',
                [ 'status' => 400 ]
            );
        }

        $menu_id = wp_create_nav_menu( $name );
        if ( is_wp_error( $menu_id ) ) {
            return $menu_id;
        }

        $menu = wp_get_nav_menu_object( $menu_id );
        if ( ! $menu ) {
            return new WP_Error(
                'menu_not_found',
                'Menu created but could not be retrieved.',
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'menu' => $this->format_menu( $menu ),
                'message' => 'Menu created successfully.',
            ],
            201
        );
    }

    /**
     * Delete a navigation menu.
     */
    public function delete_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $menu_id = (int) $request->get_param( 'id' );
        if ( $menu_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu ID is required.',
                [ 'status' => 400 ]
            );
        }

        $result = wp_delete_nav_menu( $menu_id );
        if ( ! $result ) {
            return new WP_Error(
                'delete_failed',
                'Menu could not be deleted.',
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'message' => 'Menu deleted successfully.',
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Menu Items
    // ------------------------------------------------------------------ //

    /**
     * List all menu items for a specific menu.
     */
    public function list_menu_items( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $menu_id = (int) $request->get_param( 'menu_id' );
        if ( $menu_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu ID is required.',
                [ 'status' => 400 ]
            );
        }

        $items = wp_get_nav_menu_items( $menu_id );
        if ( false === $items ) {
            return new WP_REST_Response( [ 'items' => [] ], 200 );
        }

        $formatted = array_map( [ $this, 'format_menu_item' ], $items );

        return new WP_REST_Response(
            [
                'items' => $formatted,
                'total' => count( $formatted ),
            ],
            200
        );
    }

    /**
     * Create a new menu item in a menu.
     */
    public function create_menu_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $menu_id = (int) $request->get_param( 'menu_id' );
        if ( $menu_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu ID is required.',
                [ 'status' => 400 ]
            );
        }

        $label = sanitize_text_field( $request->get_param( 'label' ) );
        $url   = esc_url_raw( $request->get_param( 'url' ) );
        $parent = (int) $request->get_param( 'parent' ) ?: 0;
        $position = (int) $request->get_param( 'position' ) ?: 0;

        if ( empty( $label ) || empty( $url ) ) {
            return new WP_Error(
                'missing_param',
                'Label and URL are required.',
                [ 'status' => 400 ]
            );
        }

        // Create menu item
        $item_id = wp_update_nav_menu_item(
            $menu_id,
            0,
            [
                'menu-item-title'     => $label,
                'menu-item-url'       => $url,
                'menu-item-status'    => 'publish',
                'menu-item-parent-id' => $parent,
                'menu-item-position'  => $position,
            ]
        );

        if ( is_wp_error( $item_id ) ) {
            return $item_id;
        }

        $item = wp_setup_nav_menu_item( get_post( $item_id ) );
        if ( ! $item ) {
            return new WP_Error(
                'item_not_found',
                'Menu item created but could not be retrieved.',
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'item' => $this->format_menu_item( $item ),
                'message' => 'Menu item created successfully.',
            ],
            201
        );
    }

    /**
     * Update an existing menu item.
     */
    public function update_menu_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $item_id = (int) $request->get_param( 'id' );
        if ( $item_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu item ID is required.',
                [ 'status' => 400 ]
            );
        }

        $menu_id = (int) $request->get_param( 'menu_id' );
        if ( $menu_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu ID is required.',
                [ 'status' => 400 ]
            );
        }

        $updates = [];
        $label = $request->get_param( 'label' );
        $url = $request->get_param( 'url' );
        $parent = $request->get_param( 'parent' );
        $position = $request->get_param( 'position' );
        
        if ( $label !== null ) {
            $updates['menu-item-title'] = sanitize_text_field( $label );
        }
        if ( $url !== null ) {
            $updates['menu-item-url'] = esc_url_raw( $url );
        }
        if ( $parent !== null ) {
            $updates['menu-item-parent-id'] = (int) $parent;
        }
        if ( $position !== null ) {
            $updates['menu-item-position'] = (int) $position;
        }

        if ( empty( $updates ) ) {
            return new WP_Error(
                'missing_param',
                'At least one field to update is required.',
                [ 'status' => 400 ]
            );
        }

        $updates['menu-item-status'] = 'publish';

        $updated_id = wp_update_nav_menu_item( $menu_id, $item_id, $updates );
        if ( is_wp_error( $updated_id ) ) {
            return $updated_id;
        }

        $item = wp_setup_nav_menu_item( get_post( $updated_id ) );
        if ( ! $item ) {
            return new WP_Error(
                'item_not_found',
                'Menu item updated but could not be retrieved.',
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'item' => $this->format_menu_item( $item ),
                'message' => 'Menu item updated successfully.',
            ],
            200
        );
    }

    /**
     * Delete a menu item.
     */
    public function delete_menu_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $item_id = (int) $request->get_param( 'id' );
        if ( $item_id <= 0 ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu item ID is required.',
                [ 'status' => 400 ]
            );
        }

        $result = wp_delete_post( $item_id, true );
        if ( ! $result ) {
            return new WP_Error(
                'delete_failed',
                'Menu item could not be deleted.',
                [ 'status' => 500 ]
            );
        }

        return new WP_REST_Response(
            [
                'message' => 'Menu item deleted successfully.',
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Menu Locations
    // ------------------------------------------------------------------ //

    /**
     * Assign a menu to a theme location.
     */
    public function assign_menu_location( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:write' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $menu_id = (int) $request->get_param( 'menu_id' );
        $location = sanitize_text_field( $request->get_param( 'location' ) );

        if ( $menu_id <= 0 || empty( $location ) ) {
            return new WP_Error(
                'invalid_param',
                'Valid menu ID and location are required.',
                [ 'status' => 400 ]
            );
        }

        $locations = get_theme_mod( 'nav_menu_locations', [] );
        $locations[ $location ] = $menu_id;
        set_theme_mod( 'nav_menu_locations', $locations );

        return new WP_REST_Response(
            [
                'message' => 'Menu assigned to location successfully.',
                'location' => $location,
                'menu_id' => $menu_id,
            ],
            200
        );
    }

    /**
     * List available theme menu locations.
     */
    public function list_menu_locations( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize( $request, 'theme-structure:read' );
        if ( is_wp_error( $auth ) ) {
            return $auth;
        }

        $locations = get_registered_nav_menus();
        $assigned = get_theme_mod( 'nav_menu_locations', [] );

        $formatted = [];
        foreach ( $locations as $location => $description ) {
            $formatted[] = [
                'location' => $location,
                'description' => $description,
                'menu_id' => $assigned[ $location ] ?? null,
            ];
        }

        return new WP_REST_Response(
            [
                'locations' => $formatted,
                'total' => count( $formatted ),
            ],
            200
        );
    }

    // ------------------------------------------------------------------ //
    // Formatting
    // ------------------------------------------------------------------ //

    private function format_menu( object $menu ): array {
        return [
            'id'          => (int) $menu->term_id,
            'name'        => $menu->name,
            'slug'        => $menu->slug,
            'count'       => (int) $menu->count,
            'description' => $menu->description ?? '',
        ];
    }

    private function format_menu_item( object $item ): array {
        return [
            'id'       => (int) $item->ID,
            'label'    => $item->title,
            'url'      => $item->url,
            'parent'   => (int) $item->menu_item_parent,
            'position' => (int) $item->menu_order,
            'type'     => $item->type, // 'custom', 'post_type', 'taxonomy', etc.
            'target'   => $item->target ?? '',
            'classes'  => $item->classes ?? [],
            'xfn'      => $item->xfn ?? '',
        ];
    }
}