# Changelog

All notable changes to Elementify MCP are documented here.

Format is intentionally lightweight: group entries by release, focus on user-visible changes and operational notes.

---

## Unreleased

---

## v0.2.0 — 2026-03-30

### Added

- **`generate_ai_image`** — AI image generation with DALL-E 3 (via `integrations.openai_api_key`) and Pollinations.ai as a free zero-config fallback. Optional style parameter (`photorealistic`, `illustration`, `digital-art`, `sketch`, `watercolor`). Auto-sideloads result into WordPress media library.

- **Change Review Queue** (4 new tools) — governance workflow for AI-agent write operations:
  - `queue_change` — stages any supported write operation for human review instead of applying it immediately
  - `list_change_queue` — lists pending / approved / rejected / applied changes
  - `review_change` — approve or reject with optional reason
  - `apply_change` — executes an approved change via operation executor map, marks as `applied`
  - PHP: `ChangeQueue.php` controller, stores up to 500 entries in `wp_options`
  - Supports 7 queueable operations: `set_global_colors`, `set_global_typography`, `update_template_data`, `update_page_data`, `create_template`, `set_logo`, `set_site_context`

- **`wizard_theme_builder`** — compose Elementor Theme Builder templates (header, footer, single, archive) from library sections, existing templates, or blank; dry-run mode; full conditions support.

- **`search_stock_images` + `sideload_stock_image`** — Pexels/Unsplash stock photo search with Pexels-first fallback; PHP `MediaSideload.php` endpoint wraps `media_sideload_image()`.

- **`explain_recommendation`** — per-recommendation detailed guides with step-by-step instructions and exact tool call examples for all 20 recommendation rules.

- **`assess_site`** — comprehensive 10-category site snapshot (WordPress, Elementor, Brand, Theme Builder, Library, Pages, Performance, Plugins, Custom Post Types, User Roles) with pre-computed issues array.

- **`get_recommendations` / `set_site_context` / `get_site_context`** — context-aware recommendation engine with 20 rules; role-aware filtering (ai-agent gets only automated recs).

- **Global Styles** (`get_global_styles`, `set_global_colors`, `set_global_typography`) — read/write Elementor Kit colors and typography via `_elementor_page_settings` post meta.

- **`wizard_brand_setup`** — coordinated brand setup (logo + colors + typography) with dry-run mode and before/after state display.

- **`creator_mode`** — compose pages from library templates via keyword matching; optional `save_as_template` and `write_to_page` outputs.

- **`set_site_logo`** — sets `custom_logo` theme-mod and Elementor `elementor_site_logo` option; clears CSS cache.

- **Page writing** — `update_page_data`, `compose_page_from_templates`, `save_page_section_as_template`, `save_full_page_as_template`.

### Changed

- PHP plugin version bumped to `0.2.0`.
- `shared` package version bumped to `0.2.0`.
- CI: PHP test job now targets `--testsuite Unit` only (integration suite requires live WP environment).
- PHP test bootstrap now auto-loads `tests/Stubs/*.php` so Brain\Monkey tests run without a real WordPress install.

### Configuration

New optional `integrations` block in `~/.elementify/config.json`:

```json
{
  "integrations": {
    "pexels_api_key": "your-pexels-key",
    "unsplash_access_key": "your-unsplash-key",
    "openai_api_key": "sk-..."
  }
}
```

All integration keys are optional — stock image search degrades to "no results" without them, AI image generation falls back to Pollinations.ai (free).

---

## v0.1.0 — 2026-03-15

### Added

- Initial release — MCP server + WordPress plugin foundation.
- Template CRUD: `list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`, `duplicate_template`.
- Template data: `get_template_data`, `update_template_data`, `extract_sections`.
- Organization: `list_by_type`, `set_category`, `set_tags`, `audit_library`.
- Multi-site: `get_site_info`, `list_sites`, `switch_site`.
- Capability-scoped API keys with Governance layer (capability allow/deny, dry-run mode).
- PHP plugin with `Auth\Manager`, `Governance\Settings`, REST `Router`.
