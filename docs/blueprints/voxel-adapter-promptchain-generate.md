# Voxel Adapter — Prompt Sequence

## Type: mixed
## Workflow: Ralph Loop Attended
## Parallel Opportunities: 2

---

## Step 1: Build PHP Detection Class

**Title:** Create `plugin/includes/Api/Voxel.php`

**Dependencies:** None

**Instructions:**

Create a new file `plugin/includes/Api/Voxel.php` following the pattern of `Lms.php`, `Charity.php`, and `Booking.php`.

Implement these REST endpoints under the `voxel` namespace:

1. `/wp-json/elementify/v1/voxel/detect`
   - Returns: `{ active: bool, version: string, elementor_integration: bool, theme_active: bool }`
   - Detection: `class_exists('Voxel\Plugin')`, `\Voxel\Plugin::version()` or `get_option('voxel_version')`

2. `/wp-json/elementify/v1/voxel/post-types`
   - Proxy to Voxel REST: `GET /wp-json/voxel/v1/post-types/`
   - Returns: array of `{ slug, label, field_count, taxonomy_count }`

3. `/wp-json/elementify/v1/voxel/post-types/{type}`
   - Proxy to `GET /wp-json/voxel/v1/post-types/{type}`
   - Returns full post type definition with fields, taxonomies, product types

4. `/wp-json/elementify/v1/voxel/taxonomies`
   - Proxy to `GET /wp-json/voxel/v1/taxonomies/`
   - Returns: array of `{ slug, label, post_types, term_count }`

5. `/wp-json/elementify/v1/voxel/product-types`
   - Proxy to `GET /wp-json/voxel/v1/product-types/`
   - Returns: array of `{ slug, label, price, interval, features }`

6. `/wp-json/elementify/v1/voxel/settings`
   - Proxy to `GET /wp-json/voxel/v1/settings/`
   - Returns: `{ pagination, map_provider, currency, moderation_enabled }`

7. `/wp-json/elementify/v1/voxel/health`
   - Returns: `{ rest_reachable: bool, tables_exist: bool, memory_usage: string }`

**Verification:**
- PHP syntax check: `php -l plugin/includes/Api/Voxel.php`
- Route registration verified in Router.php

---

## Step 2: Build TypeScript Tools (parallel with Step 1)

**Title:** Create `mcp-server/src/tools/voxel.ts`

**Dependencies:** None (parallel to Step 1)

**Instructions:**

Create a new file `mcp-server/src/tools/voxel.ts` following the pattern of `lms.ts`, `charity.ts`, `booking.ts`.

Implement these tool definitions:

1. `elementify_detect_voxel` — no params, calls `/voxel/detect`
2. `elementify_list_voxel_post_types` — no params, calls `/voxel/post-types`
3. `elementify_get_voxel_post_type` — param `{ type: string }`, calls `/voxel/post-types/{type}`
4. `elementify_list_voxel_taxonomies` — no params, calls `/voxel/taxonomies`
5. `elementify_get_voxel_product_types` — no params, calls `/voxel/product-types`
6. `elementify_get_voxel_settings` — no params, calls `/voxel/settings`
7. `elementify_voxel_health_check` — no params, calls `/voxel/health`

All tools use Free tier governance (L2 auto-queue for reads = no governance needed).

**Verification:**
- TypeScript compilation: `npx tsc --noEmit`
- No lint errors: `npx eslint mcp-server/src/tools/voxel.ts`

---

## Step 3: Register in product-tiers.ts

**Title:** Register all Voxel tools in Free tier

**Dependencies:** Step 2

**Instructions:**

Add all 7 Voxel tools to `mcp-server/src/product-tiers.ts` under the Free tier tool list.

Also ensure `plugin/includes/Router.php` registers the `Voxel` controller.

**Verification:**
- All 7 tools appear in the Free tier manifest
- Tools appear in `list_tools` response

---

## Step 4: Write Tests

**Title:** Add PHP + TypeScript tests for Voxel adapter

**Dependencies:** Steps 1, 2

**Instructions:**

1. PHP tests in `plugin/tests/` following existing pattern
2. TypeScript tests in `mcp-server/src/__tests__/` following existing pattern

**Verification:**
- `composer test` passes
- `npm test` passes
