=== Elementeer ===
Contributors: elementeer
Tags: elementor, mcp, ai, rest-api, template-management
Requires at least: 6.0
Tested up to: 6.5
Stable tag: 2.0.1
Requires PHP: 8.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI-native REST API for Elementor template management. Connect Claude, Cursor, and other MCP clients directly to your Elementor library.

== Description ==

Elementeer MCP Plugin exposes your Elementor template library through a secure, capability-scoped REST API at `/wp-json/elementeer/v1/`. It is the WordPress-side counterpart to the `@elementeer/mcp` Node.js MCP server.

**Key features:**

* Full CRUD for `elementor_library` templates — without the 401 / empty-response bug
* Dedicated `library-operations:import` REST path for local-site imports from curated or local sources
* Authentication via `X-Elementeer-Key` header (Bearer fallback)
* Capability-scoped API keys (`site-audit:read`, `library-operations:read`, `library-operations:write`, etc.)
* Governance controls — enable/disable capabilities site-wide, set key limits, require approval
* Activation mode detection: standalone-free, standalone-pro, vamerli-embedded, vamerli-agency
* Admin UI to generate and revoke keys

**Why not use the default WP REST API?**

The default `/wp-json/wp/v2/elementor_library` endpoint returns 401 or empty results for unauthenticated requests, even with application passwords — because Elementor's own REST modifications intercept the endpoint. Elementeer MCP uses direct `WP_Query` calls to bypass this, reading `_elementor_data` and `_elementor_template_type` post meta directly.

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/elementeer/`, or install the plugin through the WordPress Plugins screen.
2. Click "Activate Plugin".
3. Ensure Elementor is installed and active (the plugin will display an error notice if not).
4. Go to **Settings → Elementeer MCP** to generate your first API key.
5. Copy the key and add it to your MCP server config.

== MCP Server Setup ==

```bash
npm install -g @elementeer/mcp
elementeer-mcp init
# Edit ~/.elementeer/config.json with your site URL and API key
```

Add to Claude Desktop or your MCP client:
```json
{
  "mcpServers": {
    "elementeer": { "command": "elementeer-mcp" }
  }
}
```

== Frequently Asked Questions ==

= Why do I get "elementeer_insufficient_scope" instead of "elementeer_invalid_key"? =

This is intentional and important for debugging. If your key is valid but lacks a required capability (e.g., `library-operations:write`), the error code is `elementeer_insufficient_scope` — not `elementeer_invalid_key`. This allows MCP clients to give you accurate guidance: "add the required write capability to your key" rather than "check your API key".

= Is this compatible with Elementor Free? =

Yes. Elementor Pro is detected and reported but not required.

= How does library import work? =

Use the dedicated `/wp-json/elementeer/v1/library/import` endpoint with a `library-operations:import` key capability. The route creates or stages a local `elementor_library` template on the current site and stores source metadata for curated library workflows. It does not add cloud sync behavior.

= Can I use this with Vamerli Studio? =

Yes. When Vamerli Studio is active alongside this plugin, the activation mode switches to `vamerli-embedded` or `vamerli-agency`, unlocking additional governance features.

== Changelog ==

= 2.0.1 =
* Complete parallel development of five advanced feature domains
* Media operations enhancement: AI alt‑text generation, stock image search
* Addon ecosystem expansion: addon‑specific analysis, widget usage tracking, overlap detection
* Performance analysis enhancement: Core Web Vitals, critical CSS generation, comprehensive reporting
* Accessibility enhancement: WCAG compliance scanning, auto‑fixes, Ally integration
* Snapshot & versioning implementation: template snapshots, version history, comparisons, auto‑versioning
* Authentication fixes: wildcard capability support, Elementor compatibility improvements
* Plugin naming standardization: renamed to "Elementeer" (no "MCP" in plugin name)
* ReleaseChain integration: comprehensive testing workflow for SkillWeave ReleaseChain

= 0.2.0 =
* Adds page data routes for reading and updating Elementor-built pages
* Adds theme builder, site context, media sideload, assessment, and change queue routes
* Expands governance and capability handling for the new domain model
* Improves admin key handling and copy UX
* Keeps backward-compatible capability aliases for existing keys

= 0.1.0 =
* Initial release
* Full CRUD for elementor_library templates
* Capability-scoped API key authentication
* Governance settings
* Admin UI

== Upgrade Notice ==

= 2.0.1 =
Recommended update. Adds five advanced feature domains, improves Elementor compatibility, and includes comprehensive testing workflow for ReleaseChain.

= 0.2.0 =
Recommended update. Adds the page and workflow routes required for the newer Elementeer Free and Advanced flows.

= 0.1.0 =
Initial release — no upgrade needed.
