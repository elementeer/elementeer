<?php
declare(strict_types=1);
namespace Elementify\MCP\Api;
use WP_REST_Request; use WP_REST_Response; use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for creating Elementor Theme Builder templates.
 *
 * POST /theme-builder/templates
 * Body: { title, type, elementor_data?, conditions }
 *
 * Creates an elementor_library post with the correct type meta and
 * _elementor_conditions so Elementor knows where to display it.
 */
final class ThemeBuilder {
    private const VALID_TYPES = ['header','footer','single','single-post','single-page','archive','search','error-404','popup'];
    private const CONDITIONS_MAP = [
        'all'        => ['include/general'],
        'front_page' => ['include/singular/page/front_page'],
        'singular'   => ['include/singular'],
        'archive'    => ['include/archive'],
        'posts'      => ['include/archive/post'],
    ];
    private Auth $auth;
    public function __construct() { $this->auth = Auth::get_instance(); }

    public function create_template(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'templates:write');
        if (is_wp_error($auth)) return $auth;

        $body  = $request->get_json_params() ?: [];
        $title = sanitize_text_field($body['title'] ?? '');
        $type  = sanitize_text_field($body['type'] ?? '');

        if (empty($title)) return new WP_Error('missing_title', 'title is required.', ['status' => 400]);
        if (!in_array($type, self::VALID_TYPES, true)) {
            return new WP_Error('invalid_type', sprintf('type must be one of: %s', implode(', ', self::VALID_TYPES)), ['status' => 400]);
        }

        $conditions_key = sanitize_key($body['conditions'] ?? 'all');
        $conditions     = self::CONDITIONS_MAP[$conditions_key] ?? self::CONDITIONS_MAP['all'];

        $post_id = wp_insert_post([
            'post_title'  => $title,
            'post_type'   => 'elementor_library',
            'post_status' => sanitize_key($body['status'] ?? 'publish'),
        ], true);

        if (is_wp_error($post_id)) {
            return new WP_Error('insert_failed', $post_id->get_error_message(), ['status' => 500]);
        }

        update_post_meta($post_id, '_elementor_template_type', $type);
        update_post_meta($post_id, '_elementor_conditions', $conditions);
        update_post_meta($post_id, '_elementor_edit_mode', 'builder');

        // Write Elementor data if provided
        if (!empty($body['elementor_data']) && is_array($body['elementor_data'])) {
            $encoded = wp_json_encode($body['elementor_data']);
            update_post_meta($post_id, '_elementor_data', wp_slash($encoded));
        }

        if (class_exists('\Elementor\Plugin')) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        return new WP_REST_Response([
            'id'         => $post_id,
            'title'      => $title,
            'type'       => $type,
            'status'     => get_post_status($post_id),
            'conditions' => $conditions,
        ], 201);
    }
}
