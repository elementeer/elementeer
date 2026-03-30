<?php
declare(strict_types=1);
namespace Elementify\MCP\Api;
use WP_REST_Request; use WP_REST_Response; use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for sideloading external images into the media library.
 * POST /media/sideload
 * Body: { url: string, title?: string, alt_text?: string, caption?: string }
 */
final class MediaSideload {
    private Auth $auth;
    public function __construct() { $this->auth = Auth::get_instance(); }

    public function sideload(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $auth = $this->auth->authorize($request, 'global-styles:write');
        if (is_wp_error($auth)) return $auth;

        $body = $request->get_json_params() ?: [];
        $url  = esc_url_raw($body['url'] ?? '');
        if (empty($url)) {
            return new WP_Error('missing_url', 'url is required.', ['status' => 400]);
        }

        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $attachment_id = media_sideload_image($url, 0, sanitize_text_field($body['alt_text'] ?? ''), 'id');

        if (is_wp_error($attachment_id)) {
            return new WP_Error('sideload_failed', $attachment_id->get_error_message(), ['status' => 500]);
        }
        $att_id = (int) $attachment_id;

        if (!empty($body['title'])) {
            wp_update_post(['ID' => $att_id, 'post_title' => sanitize_text_field($body['title'])]);
        }
        if (!empty($body['alt_text'])) {
            update_post_meta($att_id, '_wp_attachment_image_alt', sanitize_text_field($body['alt_text']));
        }
        if (!empty($body['caption'])) {
            wp_update_post(['ID' => $att_id, 'post_excerpt' => sanitize_text_field($body['caption'])]);
        }

        $full_url = wp_get_attachment_image_url($att_id, 'full');
        $mime     = get_post_mime_type($att_id);

        return new WP_REST_Response([
            'id'        => $att_id,
            'url'       => $full_url ?: null,
            'mime_type' => $mime ?: null,
            'title'     => get_the_title($att_id),
        ], 201);
    }
}
