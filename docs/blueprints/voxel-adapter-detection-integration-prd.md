# PRD: Elementify Voxel Adapter Integration

## 1. Executive Summary

**Goal:** Enable Elementify (MCP server + WordPress plugin) to detect, inspect, and manage Voxel — the WordPress directory/community platform — through a dedicated adapter, following the same integration pattern as existing LMS, Charity, and Booking integrations.

**Tier:** Free tier (detect + list + get only; no write operations in first iteration)

**Pattern Reference:** `plugin/includes/Api/Lms.php`, `Charity.php`, `Booking.php` + corresponding `mcp-server/src/tools/lms.ts` etc.

## 2. Background & Context

### What is Voxel?

Voxel is a WordPress directory and community theme + plugin suite. It allows building:
- Multi-type directory listings (post types)
- Advanced custom fields on listings
- Paid membership plans (Voxel Memberships)
- Paid listing/products
- Timeline/activity feeds
- Map-based discovery (Google Maps, OSM)
- Front-end submission forms
- Visibility rules for conditional content

Voxel exposes a comprehensive REST API (`/wp-json/voxel/v1/`) for most of its core data.

### Why an Adapter?

Elementify currently has no awareness of Voxel. An adapter gives users:
- Detection of Voxel + version in site assessment
- Listing of Voxel-defined post types and taxonomies
- Inspection of Voxel-specific settings and configurations
- Foundation for future write operations (create listing, manage membership)

## 3. Scope

### In Scope (Iteration 1 — Free Tier)

| ID | Feature | Description | Pattern |
|----|---------|-------------|---------|
| A1 | detect_voxel | Detect Voxel plugin, version, Elementor integration | Like `detect_*` in all adapters |
| A2 | list_voxel_post_types | List Voxel-defined directory post types | Like `list_lms_courses` |
| A3 | get_voxel_post_type | Get single Voxel post type with fields | Like `get_lms_course_structure` |
| B1 | list_voxel_taxonomies | List Voxel taxonomies with terms | Custom (Voxel-specific) |
| B2 | get_voxel_product_types | List Voxel product types (pricing models) | Extends A2 pattern |
| C1 | get_voxel_settings | Inspect global Voxel config | Custom (Voxel-specific) |
| C2 | check_voxel_health | Quick health check (REST API reachable, Elementor live mode, required tables exist) | Custom |

### Out of Scope (Future Iterations)

- Write operations (create/update listings, memberships, timeline posts)
- Field management (CRUD on Voxel advanced fields)
- Timeline moderation
- Front-end form configuration

## 4. Integration Architecture

### Plugin Side: `plugin/includes/Api/Voxel.php`

```php
class Voxel extends BaseController {
    public function register_routes();
    // GET  /voxel/detect
    // GET  /voxel/post-types
    // GET  /voxel/post-types/{type}
    // GET  /voxel/taxonomies
    // GET  /voxel/product-types
    // GET  /voxel/settings
    // GET  /voxel/health
}
```

### MCP Server Side: `mcp-server/src/tools/voxel.ts`

Each map to a `elementify_voxel_*` tool following naming convention:
- `elementify_detect_voxel`
- `elementify_list_voxel_post_types`
- `elementify_get_voxel_post_type`
- `elementify_list_voxel_taxonomies`
- `elementify_get_voxel_product_types`
- `elementify_get_voxel_settings`
- `elementify_voxel_health_check`

### Tool Registration

In `mcp-server/src/product-tiers.ts` — registered under Free tier.

## 5. Voxel REST API Reference

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/wp-json/voxel/v1/post-types/` | GET | List all post types |
| `/wp-json/voxel/v1/post-types/{type}` | GET | Single post type with fields |
| `/wp-json/voxel/v1/taxonomies/` | GET | List all taxonomies |
| `/wp-json/voxel/v1/product-types/` | GET | List product types |
| `/wp-json/voxel/v1/settings/` | GET | Global settings |
| `/wp-json/voxel/v1/timeline/` | GET | Timeline posts |

### Detection Strategy

1. Check if `class_exists('Voxel\Plugin')` (Voxel plugin active)
2. Check Voxel version: `get_option('voxel_version')` or `\Voxel\PLUGIN_VERSION`
3. Check Elementor integration: `get_option('elementor_active_kit')` + Voxel widget registration
4. Fallback: check REST endpoint reachability

## 6. Acceptance Criteria

### Detection
- [ ] `detect_voxel` returns `{ active: bool, version: string, elementor_integration: bool, theme_active: bool }`
- [ ] Detection works even if Voxel REST API is disabled

### Read Operations
- [ ] `list_voxel_post_types` returns all directory post types with label, slug, field count
- [ ] `get_voxel_post_type` returns full structure: fields, taxonomies, product types linked
- [ ] `list_voxel_taxonomies` returns all taxonomies with term count
- [ ] `get_voxel_product_types` returns pricing models with amount, interval, features
- [ ] `get_voxel_settings` returns pagination, map provider, currency, moderation

### Health
- [ ] `voxel_health_check` returns REST status, table presence, memory usage hint

### Registration
- [ ] All tools registered in `product-tiers.ts` under Free tier
- [ ] Tools appear in `list_tools` response

## 7. Dependencies

- Voxel plugin installed and active on the target WordPress site
- Elementor installed (optional, for detection of integration status)
- WordPress REST API enabled

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Voxel REST API disabled | Detection falls back to PHP class_exists + option reading |
| Voxel changes API in update | Version-gate API calls; log warnings on mismatch |
| Large post types with many fields | Paginate responses; default limit of 50 |
| Performance on big sites | Cache Voxel settings in Elementify assessment cache |

## 9. Success Metrics

- All 7 tools return valid structured data against a live Voxel site
- Detection correctly identifies Voxel Free vs Pro (when Voxel tiers differentiate)
- No Elementor integration breakage
- <500ms response time for list operations with <50 items
