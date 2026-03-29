=== Elementify MCP Plugin ===
Contributors: elementify
Tags: elementor, mcp, ai, rest-api, template-management
Requires at least: 6.0
Tested up to: 6.5
Stable tag: 0.1.0
Requires PHP: 8.0
License: MIT
License URI: https://opensource.org/licenses/MIT

AI-native REST API for Elementor template management. Connect Claude, Cursor, and other MCP clients directly to your Elementor library.

== Description ==

Elementify MCP Plugin exposes your Elementor template library through a secure, capability-scoped REST API at `/wp-json/elementify/v1/`. It is the WordPress-side counterpart to the `@elementify/mcp` Node.js MCP server.

**Key features:**

* Full CRUD for `elementor_library` templates — without the 401 / empty-response bug
* Authentication via `X-Elementify-Key` header (Bearer fallback)
* Capability-scoped API keys (`templates:read`, `templates:write`, `templates:delete`, etc.)
* Governance controls — enable/disable capabilities site-wide, set key limits, require approval
* Activation mode detection: standalone-free, standalone-pro, vamerli-embedded, vamerli-agency
* Admin UI to generate and revoke keys

**Why not use the default WP REST API?**

The default `/wp-json/wp/v2/elementor_library` endpoint returns 401 or empty results for unauthenticated requests, even with application passwords — because Elementor's own REST modifications intercept the endpoint. Elementify MCP uses direct `WP_Query` calls to bypass this, reading `_elementor_data` and `_elementor_template_type` post meta directly.

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/elementify-mcp/`, or install the plugin through the WordPress Plugins screen.
2. Click "Activate Plugin".
3. Ensure Elementor is installed and active (the plugin will display an error notice if not).
4. Go to **Settings → Elementify MCP** to generate your first API key.
5. Copy the key and add it to your MCP server config.

== MCP Server Setup ==

```bash
npm install -g @elementify/mcp
elementify-mcp init
# Edit ~/.elementify/config.json with your site URL and API key
```

Add to Claude Desktop or your MCP client:
```json
{
  "mcpServers": {
    "elementify": { "command": "elementify-mcp" }
  }
}
```

== Frequently Asked Questions ==

= Why do I get "elementify_insufficient_scope" instead of "elementify_invalid_key"? =

This is intentional and important for debugging. If your key is valid but lacks a required capability (e.g., `templates:delete`), the error code is `elementify_insufficient_scope` — not `elementify_invalid_key`. This allows MCP clients to give you accurate guidance: "add the delete capability to your key" rather than "check your API key".

= Is this compatible with Elementor Free? =

Yes. Elementor Pro is detected and reported but not required.

= Can I use this with Vamerli Studio? =

Yes. When Vamerli Studio is active alongside this plugin, the activation mode switches to `vamerli-embedded` or `vamerli-agency`, unlocking additional governance features.

== Changelog ==

= 0.1.0 =
* Initial release
* Full CRUD for elementor_library templates
* Capability-scoped API key authentication
* Governance settings
* Admin UI

== Upgrade Notice ==

= 0.1.0 =
Initial release — no upgrade needed.
