# Elementify MCP Integration Tests

This directory contains integration test plans for the Elementify MCP server.

## Purpose

Integration tests verify that the MCP server correctly communicates with a live WordPress site running the Elementify plugin. They simulate real tool calls and validate responses.

## Test Strategy

1. **Tool Call Simulation**: Use the MCP server's tool interface directly (via TypeScript test runner) or simulate HTTP requests to the plugin REST API.
2. **Response Validation**: Check that responses match expected structure, status codes, and data types.
3. **Side‑Effect Verification**: After write operations, verify that changes are persisted in WordPress (e.g., a template was created, a page updated).
4. **Error Handling**: Ensure appropriate error responses for invalid inputs, missing capabilities, etc.

## Test Environment

- A dedicated WordPress test site (can be local Docker container).
- Elementify plugin installed and activated.
- An API key with appropriate capabilities.
- MCP server configured to connect to the test site.

## Test Categories

### 1. Template Library Operations
- `list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`
- `extract_sections`, `update_template_data`

### 2. Page Operations
- `list_elementor_pages`, `get_page_data`, `update_page_data`
- `save_page_section_as_template`, `save_full_page_as_template`

### 3. Composition & Wizards
- `compose_page_from_templates`
- `creator_mode`
- `wizard_brand_setup`, `wizard_theme_builder`

### 4. Site Management
- `assess_site`, `get_recommendations`
- `get_site_settings`, `update_site_settings`
- `get_seo_meta`, `update_seo_meta`
- `get_performance_report`, `flush_elementor_cache`

### 5. Content & Media
- `create_page`, `create_post`, `update_post_meta`, `delete_post`
- `list_media`, `get_media`, `update_media`, `delete_media`
- `list_menus`, `create_menu`, `manage_menu_items`

### 6. Global Styles & Brand
- `get_global_styles`, `set_global_colors`, `set_global_typography`
- `set_site_logo`

### 7. Governance & Change Queue
- `queue_change`, `list_change_queue`, `review_change`, `apply_change`

## Implementation Plan

See [test-plan.md](./test-plan.md) for detailed step‑by‑step test cases.

## Running Tests

### Prerequisites
- Node.js & npm
- Docker & Docker Compose (for WordPress test site)
- PHPUnit (for plugin unit tests)

### Steps
1. Start test WordPress site: `docker-compose up -d`
2. Install Elementify plugin and configure API key.
3. Run integration test script: `npm run integration-test`
   (Script to be written.)

## Future Enhancements
- Automated CI/CD pipeline integration.
- Performance benchmarking.
- Fuzz testing for edge cases.
- Multi‑site scenario tests.