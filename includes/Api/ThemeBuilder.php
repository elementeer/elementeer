<?php
declare(strict_types=1);
namespace Elementeer\MCP\Api;
use WP_REST_Request; use WP_REST_Response; use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

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
        $auth = $this->auth->authorize($request, 'theme-structure:write');
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

    public function list_templates(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'theme-structure:read');
        if (is_wp_error($auth)) return $auth;

        $type   = sanitize_text_field($request->get_param('type') ?? '');
        $status = sanitize_text_field($request->get_param('status') ?? 'publish');

        $args = [
            'post_type'      => 'elementor_library',
            'post_status'    => $status,
            'posts_per_page' => 50,
            'meta_key'       => '_elementor_template_type',
            'orderby'        => 'title',
            'order'          => 'ASC',
        ];

        if (!empty($type) && in_array($type, self::VALID_TYPES, true)) {
            $args['meta_value'] = $type;
        }

        $query = new \WP_Query($args);
        $templates = [];

        foreach ($query->posts as $post) {
            $templates[] = $this->format_template_item($post);
        }

        return new WP_REST_Response($templates);
    }

    public function get_template(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'theme-structure:read');
        if (is_wp_error($auth)) return $auth;

        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'elementor_library') {
            return new WP_Error('not_found', 'Template not found', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_template_item($post));
    }

    public function update_template(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'theme-structure:write');
        if (is_wp_error($auth)) return $auth;

        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'elementor_library') {
            return new WP_Error('not_found', 'Template not found', ['status' => 404]);
        }

        $body = $request->get_json_params() ?: [];

        if (isset($body['title'])) {
            wp_update_post(['ID' => $id, 'post_title' => sanitize_text_field($body['title'])]);
        }

        if (isset($body['status'])) {
            wp_update_post(['ID' => $id, 'post_status' => sanitize_key($body['status'])]);
        }

        if (isset($body['conditions'])) {
            $conditions_key = sanitize_key($body['conditions']);
            $conditions     = self::CONDITIONS_MAP[$conditions_key] ?? null;
            if ($conditions) {
                update_post_meta($id, '_elementor_conditions', $conditions);
            }
        }

        if (isset($body['type']) && in_array($body['type'], self::VALID_TYPES, true)) {
            update_post_meta($id, '_elementor_template_type', sanitize_text_field($body['type']));
        }

        return new WP_REST_Response($this->format_template_item(get_post($id)));
    }

    public function get_conditions(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'theme-structure:read');
        if (is_wp_error($auth)) return $auth;

        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'elementor_library') {
            return new WP_Error('not_found', 'Template not found', ['status' => 404]);
        }

        $conditions     = get_post_meta($id, '_elementor_conditions', true);
        $template_type  = get_post_meta($id, '_elementor_template_type', true);

        return new WP_REST_Response([
            'id'             => $id,
            'title'          => $post->post_title,
            'type'           => $template_type,
            'status'         => $post->post_status,
            'conditions'     => $conditions ?: [],
            'conditions_map' => self::CONDITIONS_MAP,
        ]);
    }

    public function update_conditions(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'theme-structure:write');
        if (is_wp_error($auth)) return $auth;

        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'elementor_library') {
            return new WP_Error('not_found', 'Template not found', ['status' => 404]);
        }

        $body = $request->get_json_params() ?: [];
        $conditions = [];

        if (!empty($body['conditions']) && is_array($body['conditions'])) {
            $conditions = array_map('sanitize_text_field', $body['conditions']);
        } elseif (!empty($body['conditions_key'])) {
            $conditions_key = sanitize_key($body['conditions_key']);
            $conditions     = self::CONDITIONS_MAP[$conditions_key] ?? [];
        }

        update_post_meta($id, '_elementor_conditions', $conditions);

        return new WP_REST_Response([
            'id'         => $id,
            'title'      => $post->post_title,
            'conditions' => $conditions,
        ]);
    }

    private function format_template_item(\WP_Post $post): array {
        return [
            'id'                => $post->ID,
            'title'             => $post->post_title,
            'type'              => get_post_meta($post->ID, '_elementor_template_type', true),
            'status'            => $post->post_status,
            'conditions'        => get_post_meta($post->ID, '_elementor_conditions', true) ?: [],
            'has_elementor_data' => !empty(get_post_meta($post->ID, '_elementor_data', true)),
        ];
    }
}
