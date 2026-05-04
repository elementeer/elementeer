# Elementify Pre-Release Workflow

## Goal
Establish a strict, repeatable process for testing, reviewing, and releasing Elementify plugin updates to production environments.

## Prerequisites
- Local WordPress testing environment (`wp-testing-env`) with Docker.
- Access to production WordPress sites (marcus-urban.de, preview.fusionaize.com) via admin dashboard (no SSH).
- Elementify plugin source code with version bumped.

## Workflow Steps

### 1. Testing Phase
**Objective:** Validate plugin functionality and identify regressions.

**Actions:**
1. Ensure the local test environment is running:
   ```bash
   cd /path/to/wp-testing-env
   docker-compose up -d
   ```
2. Install/update the plugin in the test environment:
   - Copy the plugin files to `wp-testing-env/plugins/elementify/` or use the distribution ZIP.
   - Activate the plugin via WP-CLI:
     ```bash
     docker-compose exec wp-cli wp plugin activate elementify
     ```
3. Run the comprehensive test suite:
   ```bash
   ./tests/test-elementify-comprehensive.sh
   ```
4. Generate test report (JSON) and review console output.
5. Verify that all **core endpoints** (templates, site management, global styles, authentication) return expected HTTP 200.
6. Confirm that known bugs (e.g., addon-related endpoints returning 500) are documented and acceptable for this release.

**Deliverable:** Test report (`reports/elementify-api-test-*.json`) and a summary of passing/failing endpoints.

### 2. Review Phase
**Objective:** Assess production readiness and decide whether to proceed.

**Checklist:**
- [ ] Plugin naming: Name **"Elementify"**, slug `elementify`, text-domain `elementify`.
- [ ] Menu placement: Plugin appears as a top‑level menu item directly after Elementor (position 59).
- [ ] No new critical bugs (excluding previously accepted issues).
- [ ] API key authentication works with explicit capabilities list (46 capabilities, no wildcards).
- [ ] All required capabilities are documented.
- [ ] Plugin version number updated (e.g., `2.0.0`).
- [ ] Distribution ZIP (`elementify-<version>.zip`) builds successfully.

**If any check fails:** Return to development and repeat Testing Phase.

### 3. Release Preparation
**Objective:** Package the plugin for deployment.

**Actions:**
1. Create a clean distribution:
   ```bash
   cd /path/to/elementify-mcp
   ./scripts/build-dist.sh   # or manually zip the `dist/elementify/` directory
   ```
2. Name the ZIP file `elementify-<version>.zip` (e.g., `elementify-2.0.0.zip`).
3. Optionally create a Git tag for the version:
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```
4. Store the ZIP in a known location (e.g., `dist/elementify-2.0.0.zip`).

**Deliverable:** Versioned plugin ZIP ready for upload.

### 4. Deployment Phase
**Objective:** Install the new version on production sites.

**Actions:**
1. For each production site (marcus-urban.de, preview.fusionaize.com):
   - Log into WordPress admin dashboard.
   - Navigate to **Plugins → Add New → Upload Plugin**.
   - Upload `elementify-<version>.zip`.
   - Choose **Replace current version** (if already installed).
   - Activate the plugin if necessary.
2. Verify activation:
   - No PHP errors on plugin activation.
   - The Elementify menu appears in the admin sidebar after Elementor.

**Note:** No SSH access; deployment must be performed via the WordPress admin interface.

### 5. Post‑Deployment Smoke Test
**Objective:** Ensure the plugin works correctly in production.

**Actions:**
1. Create a test API key with all 46 capabilities (use the same structure as in testing).
2. Call a few critical endpoints:
   - `GET /wp-json/elementify/v1/site`
   - `GET /wp-json/elementify/v1/templates`
   - `GET /wp-json/elementify/v1/global-styles`
3. Confirm responses are successful (HTTP 200).
4. Verify the admin menu is visible and correctly positioned.

**Deliverable:** Brief confirmation that core functionality is operational.

## Known Issues & Acceptable Bugs
The following issues are currently known and may be tolerated in a release if they do not block core functionality:

1. **AddonRegistry abstract class bug** – Endpoints `/elementify/v1/addons` and `/elementify/v1/site/assessment` return 500 errors. Workaround: Avoid using addon‑related features until the plugin is updated.
2. **Wildcard capabilities not supported** – API keys must list all 46 capabilities explicitly; `["*"]` is rejected.
3. **Inconsistent error messages** – Some 500 errors lack descriptive details.

These issues should be tracked and fixed in subsequent releases.

## CI/CD Integration
The existing CI workflow (`ci-enhanced.yml`) automates steps 1–3:

- Generates correctly structured API keys.
- Runs the comprehensive test suite.
- Skips known buggy endpoints.
- Produces detailed test reports.

Ensure the CI pipeline passes before proceeding to the Review Phase.

## Rollback Procedure
If a deployment introduces critical issues:

1. Deactivate the plugin via WordPress admin.
2. Delete the plugin (WordPress will revert to the previous version if available).
3. Restore from backup if necessary.

## Document History
- **2026‑04‑21** – Initial version.
