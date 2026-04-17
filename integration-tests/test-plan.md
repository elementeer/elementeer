# Elementify MCP Integration Test Plan

## Overview

This document outlines concrete test cases for each MCP tool. Each test case includes:

- **Tool**: The MCP tool name.
- **Purpose**: What the tool should achieve.
- **Preconditions**: State required before the test.
- **Steps**: Sequence of actions.
- **Expected Result**: Valid response and side effects.
- **Validation**: How to verify the outcome.

## Test Setup

1. Start a fresh WordPress installation with Elementor and Elementify plugin.
2. Create an API key with full capabilities.
3. Configure MCP server to use the test site.
4. Run each test in isolation; clean up after write tests.

## Test Cases

### TC‑001: `list_templates`
- **Purpose**: Retrieve paginated list of Elementor templates.
- **Preconditions**: At least 3 templates exist in library.
- **Steps**: Call `list_templates` with `per_page=2`, `page=1`.
- **Expected Result**: HTTP 200, JSON with `templates` array of length 2, `total` >=3.
- **Validation**: Verify each template has `id`, `title`, `type`, `status`.

### TC‑002: `create_template`
- **Purpose**: Create a new section template.
- **Preconditions**: None.
- **Steps**: Call `create_template` with `title="Test Section"`, `type="section"`.
- **Expected Result**: HTTP 201, response includes `template` object with assigned ID.
- **Validation**: Call `list_templates` and verify new template appears.

### TC‑003: `get_template_data` & `update_template_data`
- **Purpose**: Read and write Elementor JSON data.
- **Preconditions**: A template created in TC‑002.
- **Steps**:
  1. Call `get_template_data` with the template ID.
  2. Modify the JSON (add a dummy widget).
  3. Call `update_template_data` with the modified JSON.
- **Expected Result**: Both calls succeed; updated data matches sent JSON.
- **Validation**: Fetch again and compare.

### TC‑004: `list_elementor_pages`
- **Purpose**: List pages built with Elementor.
- **Preconditions**: At least one Elementor page exists.
- **Steps**: Call `list_elementor_pages` with `post_type="page"`.
- **Expected Result**: Array of pages, each with `id`, `title`, `edit_mode: "builder"`.

### TC‑005: `get_page_data` & `update_page_data`
- **Purpose**: Read and replace entire page layout.
- **Preconditions**: An Elementor page from TC‑004.
- **Steps**:
  1. Call `get_page_data` with page ID, `extract="all"`.
  2. Replace one section with a simple container.
  3. Call `update_page_data` with modified Elementor data.
- **Expected Result**: Update succeeds; page retains new layout.
- **Validation**: Fetch again and verify section count changed.

### TC‑006: `save_page_section_as_template`
- **Purpose**: Extract a section from a page and save as reusable template.
- **Preconditions**: Page with at least two top‑level sections.
- **Steps**:
  1. Call `get_page_data` to see section indices.
  2. Call `save_page_section_as_template` with `section_index=0`, `template_title="Extracted Section"`.
- **Expected Result**: New template created; template data matches the extracted section.
- **Validation**: List templates includes the new one; its data matches original section.

### TC‑007: `compose_page_from_templates`
- **Purpose**: Assemble a new layout by merging sections from multiple templates.
- **Preconditions**: Two or more section templates.
- **Steps**:
  1. Call `compose_page_from_templates` with `sources` array referencing those templates.
  2. Optionally `write_to_page` an existing page.
- **Expected Result**: Composed layout contains all source sections in order.
- **Validation**: If written to page, verify page layout matches.

### TC‑008: `assess_site`
- **Purpose**: Get comprehensive site health report.
- **Preconditions**: Site has logo, global colors, some templates.
- **Steps**: Call `assess_site`.
- **Expected Result**: JSON with sections `brand`, `structure`, `library`, `performance`, `issues`.
- **Validation**: Each section contains expected keys; issues list reflects missing brand assets.

### TC‑009: `get_recommendations`
- **Purpose**: Receive context‑aware next steps.
- **Preconditions**: Site assessment completed.
- **Steps**: Call `get_recommendations`.
- **Expected Result**: Array of recommendations, each with `id`, `title`, `priority`, `automated`.
- **Validation**: At least one recommendation matches a known missing item (e.g., logo).

### TC‑010: `set_global_colors` & `get_global_styles`
- **Purpose**: Update Elementor’s global color palette.
- **Preconditions**: Elementor Kit exists.
- **Steps**:
  1. Call `set_global_colors` with a new palette (Primary, Secondary, Text, Accent).
  2. Call `get_global_styles`.
- **Expected Result**: Palette appears in returned global styles.
- **Validation**: Colors match those sent.

### TC‑011: `wizard_brand_setup`
- **Purpose**: Coordinate brand setup (logo, colors, typography) in one dry‑run.
- **Preconditions**: Logo image uploaded to media library.
- **Steps**: Call `wizard_brand_setup` with `auto_execute=false`, providing logo ID, colors, typography.
- **Expected Result**: Plan returned showing what would be changed.
- **Validation**: Plan includes steps for colors, typography, logo.

### TC‑012: `creator_mode`
- **Purpose**: Compose a page from brief using template library matching.
- **Preconditions**: Library has templates tagged “hero”, “features”, “cta”.
- **Steps**: Call `creator_mode` with `sections=["hero", "features", "cta"]`, `dry_run=true`.
- **Expected Result**: Plan showing which templates will be used.
- **Validation**: Each section type matched to a template ID.

### TC‑013: `wizard_theme_builder`
- **Purpose**: Create a Theme Builder template with conditions.
- **Preconditions**: None.
- **Steps**: Call `wizard_theme_builder` with `type="header"`, `title="Test Header"`, `dry_run=false`.
- **Expected Result**: New Theme Builder template created, assigned to “all” locations.
- **Validation**: Template appears in `list_templates` with type “header”.

### TC‑014: `list_media` & `update_media`
- **Purpose**: Browse media library and update metadata.
- **Preconditions**: At least one image in media library.
- **Steps**:
  1. Call `list_media` with `per_page=5`.
  2. Pick first media ID, call `update_media` with new `alt_text`.
- **Expected Result**: Alt text updated.
- **Validation**: Call `get_media` and verify new alt text.

### TC‑015: `create_page` & `delete_post`
- **Purpose**: Create a WordPress page and later delete it.
- **Preconditions**: None.
- **Steps**:
  1. Call `create_page` with `title="Test Page"`, `status="draft"`.
  2. Note page ID, call `delete_post` with that ID.
- **Expected Result**: Page created, then moved to trash.
- **Validation**: `list_elementor_pages` no longer includes the page (or shows status trash).

### TC‑016: `list_menus` & `create_menu_item`
- **Purpose**: Manage navigation menus.
- **Preconditions**: A menu exists.
- **Steps**:
  1. Call `list_menus`, get menu ID.
  2. Call `create_menu_item` with `label="Test Link"`, `url="https://example.com"`.
- **Expected Result**: New menu item added.
- **Validation**: `list_menu_items` includes the new item.

### TC‑017: `queue_change` & `apply_change`
- **Purpose**: Queue a change for review, then apply it.
- **Preconditions**: None.
- **Steps**:
  1. Call `queue_change` with operation `set_global_colors` and a palette.
  2. Call `list_change_queue` – change appears as pending.
  3. Call `review_change` with `action="approve"`.
  4. Call `apply_change` with the change ID.
- **Expected Result**: Change applied, global colors updated.
- **Validation**: `get_global_styles` shows new colors.

### TC‑018: `search_stock_images` & `sideload_stock_image`
- **Purpose**: Search free stock photos and import into media library.
- **Preconditions**: Pexels/Unsplash API key configured.
- **Steps**:
  1. Call `search_stock_images` with `query="office"`.
  2. Pick first result, call `sideload_stock_image` with its URL.
- **Expected Result**: Image added to media library, attachment ID returned.
- **Validation**: `list_media` includes the new image.

### TC‑019: `generate_ai_image`
- **Purpose**: Generate an AI image and sideload it.
- **Preconditions**: OpenAI API key or Pollinations fallback.
- **Steps**: Call `generate_ai_image` with `prompt="modern abstract background"`, `sideload=true`.
- **Expected Result**: Image created and added to media library.
- **Validation**: Attachment ID valid, file exists.

### TC‑020: `get_performance_report` & `flush_elementor_cache`
- **Purpose**: Check performance metrics and clear cache.
- **Preconditions**: Elementor CSS cache exists.
- **Steps**:
  1. Call `get_performance_report`.
  2. Call `flush_elementor_cache`.
  3. Call `get_performance_report` again (optional).
- **Expected Result**: Report includes CSS printing method, cache status; flush succeeds.
- **Validation**: No errors.

## Execution Notes

- Tests that modify live data should be run in a dedicated test environment.
- Use unique titles/IDs to avoid conflicts.
- Clean up after each test (delete created templates, pages, media).
- Log all tool calls and responses for debugging.

## Next Steps

1. Implement a TypeScript test runner that uses the MCP server’s tool registry.
2. Create Docker Compose setup for repeatable WordPress test site.
3. Integrate into CI/CD pipeline (GitHub Actions).