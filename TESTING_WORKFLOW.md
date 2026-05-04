# 🧪 Elementify MCP Plugin Testing Workflow

**Version**: 2.0.1  
**Last Updated**: 2026-04-22  
**Environment**: WordPress Testing Environment v1.1.0 (Docker)  
**Purpose**: Comprehensive testing of all five advanced feature domains before release

## 📋 Overview

This document outlines the complete testing workflow for the Elementify MCP WordPress plugin, covering installation, activation, and validation of all newly implemented features across five domains:

1. **Media Operations Enhancement** - AI alt-text generation, stock image search
2. **Addon Ecosystem Expansion** - Addon-specific analysis, widget usage, overlap detection
3. **Performance Analysis Enhancement** - Core Web Vitals, critical CSS generation
4. **Accessibility Enhancement** - WCAG compliance scanning, auto-fixes
5. **Snapshot & Versioning** - Template snapshots, version history, comparisons

## 🐳 Test Environment

### Location
```
/Users/andrelange/Documents/repositories/github/wp-testing-env/
```

### Services (Docker Compose)
- **WordPress**: `http://localhost:8082` (port 8082)
- **phpMyAdmin**: `http://localhost:8083` (port 8083)
- **MailHog**: `http://localhost:8025` (port 8025)
- **MySQL**: `localhost:3306` (internal)

### Plugin Directory
```
/Users/andrelange/Documents/repositories/github/wp-testing-env/plugins/
```

### Naming Convention (Non-Negotiable)
All release ZIP files MUST follow the naming convention:
```
elementify.X.Y.Z.zip
```
Where X.Y.Z is the semantic version (e.g., 2.0.1). This convention is enforced across all release workflows.

### Existing Test Plugins
- `elementify.2.0.1.zip` - Latest plugin ZIP
- `elementify/` - Currently installed version (if any)
- `elementor/`, `elementor-pro/` - Required dependencies
- `essential-addons-elementor/` - Test addon

## 🔧 Setup Instructions

### 1. Start Test Environment
```bash
cd /Users/andrelange/Documents/repositories/github/wp-testing-env/
docker-compose up -d
```

Wait for services to start (1-2 minutes):
```bash
docker-compose logs wordpress | tail -20
```

### 2. Prepare Plugin
**Use existing plugin ZIPs from the plugin folder**:
```bash
# List available Elementify plugin ZIPs
ls -la plugins/Elementify\ v*.zip

# Recommended: Use the latest version
./scripts/install-plugin.sh plugins/Elementify\ v2.0.1.zip

# Or use specific version if needed
./scripts/install-plugin.sh plugins/Elementify\ v2.0.0.zip
```

**Note**: The plugin folder already contains tested and working plugin ZIPs. Do not copy new ZIPs from development unless specifically testing new builds.

### 3. Verify Installation
```bash
# Check plugin folder
ls -la plugins/elementify/

# Check via WP-CLI
docker-compose exec wordpress wp plugin list --name=elementify --fields=name,status,version
```

### 4. Generate API Key
```bash
# Use existing script
./scripts/setup-api-key.sh

# Or manually generate via PHP
php generate-api-key-v2.php
```

## 🧪 Testing Phases

### Phase 1: Installation & Activation
- [ ] Plugin ZIP can be uploaded via WordPress admin
- [ ] Plugin activates without PHP errors
- [ ] No conflicts with Elementor/other plugins
- [ ] Admin menu appears (Elementify → Dashboard)
- [ ] REST API endpoints are registered (check `wp-json/elementify/v2/`)

### Phase 2: Core API Validation
- [ ] `GET /wp-json/elementify/v2/` - API root returns version info
- [ ] `GET /wp-json/elementify/v2/site/info` - Site information
- [ ] `GET /wp-json/elementify/v2/templates` - Template listing
- [ ] Authentication works with API key header

### Phase 3: Media Operations Testing
**Endpoints to test:**
- [ ] `POST /wp-json/elementify/v2/media/generate-alt-text` - AI alt-text generation
- [ ] `POST /wp-json/elementify/v2/media/batch-generate-alt-text` - Batch processing
- [ ] `GET /wp-json/elementify/v2/media/stock-images` - Stock image search

**Test scenarios:**
1. Upload test image via WordPress media library
2. Generate alt-text for single image
3. Batch generate for multiple images
4. Search stock images with query "office background"
5. Verify API responses structure

### Phase 4: Addon Ecosystem Testing
**Endpoints to test:**
- [ ] `GET /wp-json/elementify/v2/addons/essential-addons` - EA info & widgets
- [ ] `GET /wp-json/elementify/v2/addons/ultimate-addons` - UAE info
- [ ] `GET /wp-json/elementify/v2/addons/crocoblock` - JetEngine/plugins
- [ ] `GET /wp-json/elementify/v2/addons/widget-usage` - Site-wide widget census
- [ ] `GET /wp-json/elementify/v2/addons/overlap-analysis` - Redundant widget detection

**Test scenarios:**
1. Verify Essential Addons detection (installed in test env)
2. Check widget listing includes EA widgets
3. Run widget usage analysis across test pages
4. Verify overlap detection returns meaningful results

### Phase 5: Performance Analysis Testing
**Endpoints to test:**
- [ ] `GET /wp-json/elementify/v2/performance/core-web-vitals` - Core Web Vitals
- [ ] `POST /wp-json/elementify/v2/performance/generate-critical-css` - Critical CSS
- [ ] `GET /wp-json/elementify/v2/performance/analyze` - Comprehensive analysis

**Test scenarios:**
1. Get Core Web Vitals for homepage
2. Generate critical CSS for a test page
3. Run full performance analysis
4. Verify response includes actionable recommendations

### Phase 6: Accessibility Testing
**Endpoints to test:**
- [ ] `POST /wp-json/elementify/v2/ally/wcag-scan` - WCAG compliance scan
- [ ] `POST /wp-json/elementify/v2/ally/wcag-auto-fix` - Auto-fix accessibility issues

**Test scenarios:**
1. Create test page with accessibility issues (missing alt text, low contrast)
2. Run WCAG scan (wcag2aa standard)
3. Verify violations are detected
4. Apply auto-fixes for supported issues
5. Verify fixes were applied correctly

### Phase 7: Snapshot & Versioning Testing
**Endpoints to test:**
- [ ] `POST /wp-json/elementify/v2/snapshots/create` - Create template snapshot
- [ ] `GET /wp-json/elementify/v2/snapshots` - List snapshots
- [ ] `GET /wp-json/elementify/v2/snapshots/{uuid}` - Get snapshot details
- [ ] `POST /wp-json/elementify/v2/snapshots/restore` - Restore snapshot
- [ ] `GET /wp-json/elementify/v2/snapshots/diff` - Compare snapshots
- [ ] `GET /wp-json/elementify/v2/templates/{id}/versions` - Template version history

**Test scenarios:**
1. Create an Elementor template
2. Create snapshot with note "Test v1"
3. Modify template content
4. Create second snapshot "Test v2"
5. List snapshots, verify both appear
6. Compare snapshots, verify differences detected
7. Restore to first snapshot
8. Verify template reverted

### Phase 8: Integration & Edge Cases
- [ ] Test with Elementor Pro features enabled
- [ ] Test with multiple addons active simultaneously
- [ ] Test error handling (invalid parameters, missing resources)
- [ ] Test rate limiting and permissions
- [ ] Verify no PHP warnings/errors in debug log

## 📊 Validation Criteria

### Success Criteria
- ✅ All endpoints return 200/201 status codes for valid requests
- ✅ All endpoints return proper error codes for invalid requests
- ✅ No PHP errors in WordPress debug log
- ✅ Response structures match expected schemas
- ✅ Data persistence works (snapshots saved, settings preserved)
- ✅ Performance acceptable (< 2s response time for complex operations)

### Failure Criteria
- ❌ Any endpoint causes PHP fatal error
- ❌ Authentication bypass possible
- ❌ Data loss or corruption during operations
- ❌ Conflicts with Elementor core functionality
- ❌ Memory leaks or excessive resource usage

## 🐛 Troubleshooting

### Common Issues

**1. Plugin activation fails**
```
Solution: Check WordPress debug log at wp-content/debug.log
```

**2. API endpoints return 404**
```
Solution: Verify rewrite rules are flushed:
docker-compose exec wordpress wp rewrite flush
```

**3. Authentication errors**
```
Solution: Regenerate API key:
./scripts/setup-api-key.sh
```

**4. Docker container issues**
```
Solution: Restart environment:
docker-compose down
docker-compose up -d
```

**5. Missing dependencies**
```
Solution: Install required plugins:
docker-compose exec wordpress wp plugin install elementor --activate
```

**6. Elementor core errors (common in test environment)**
```
Solution: Elementor may have file corruption or compatibility issues.

# Check Elementor version and status
docker-compose exec wordpress wp plugin get elementor --field=version --allow-root
docker-compose exec wordpress wp eval "echo defined('ELEMENTOR_VERSION') ? 'Elementor v' . ELEMENTOR_VERSION : 'Elementor not loaded';" --allow-root

# Check for Elementor loading errors
docker-compose exec wordpress wp eval "echo did_action('elementor/loaded') ? 'Elementor loaded OK' : 'Elementor NOT loaded';" --allow-root

# Fix: Reinstall Elementor completely
docker-compose exec wordpress wp plugin deactivate elementor elementor-pro --allow-root
docker-compose exec wordpress wp plugin delete elementor --allow-root
docker-compose exec wordpress wp plugin install elementor --activate --allow-root
docker-compose exec wordpress wp plugin install elementor-pro --activate --allow-root

# Verify Elementor loads without errors
docker-compose exec wordpress tail -10 /var/www/html/wp-content/debug.log | grep -i elementor

# Specific issue: "Access denied" in Elementor kit manager
# This occurs when Elementify updates WordPress options that trigger Elementor hooks
# Workaround: Ensure proper user permissions or handle the exception in Elementify
docker-compose exec wordpress wp user list --role=administrator --field=ID --allow-root | head -1
docker-compose exec wordpress wp user set-role 1 administrator --allow-root
```

### Debug Commands
```bash
# Check WordPress logs
docker-compose exec wordpress tail -f /var/www/html/wp-content/debug.log

# Check plugin status
docker-compose exec wordpress wp plugin status elementify

# Check Elementor status and health
docker-compose exec wordpress wp plugin status elementor
docker-compose exec wordpress wp eval "echo did_action('elementor/loaded') ? 'Elementor loaded' : 'Elementor NOT loaded';" --allow-root

# List registered REST routes
docker-compose exec wordpress wp rest route list --namespace=elementify/v2

# Test API endpoint directly
curl -H "X-Elementify-Key: YOUR_API_KEY" \
  http://localhost:8082/wp-json/elementify/v2/

# Check API key validity
curl -s -H "X-Elementify-Key: YOUR_API_KEY" \
  http://localhost:8082/wp-json/elementify/v2/site/info | jq .
```

## 📝 Test Reporting

### Success Report Template
```markdown
## Test Summary - [Date]
**Plugin Version**: 2.0.1
**Environment**: WordPress 6.x, Elementor 3.x, PHP 8.x

### Results
- Installation: ✅/❌
- Activation: ✅/❌
- Media Operations: X/X tests passed
- Addon Ecosystem: X/X tests passed
- Performance Analysis: X/X tests passed
- Accessibility: X/X tests passed
- Snapshots: X/X tests passed

### Issues Found
1. [Description] - [Severity] - [Status]
```

### Automated Testing Script
```bash
#!/bin/bash
# Run basic smoke tests
cd /Users/andrelange/Documents/repositories/github/wp-testing-env/
./scripts/run-smoke-tests.sh
```

## 🔄 Continuous Testing & ReleaseChain Integration

### For SkillWeave ReleaseChain Integration
This testing workflow is fully integrated with SkillWeave ReleaseChain for automated validation of Elementify plugin releases. The release validation PRD (`release-validation-2.0.1.json`) defines 8 validation tasks that ReleaseChain executes sequentially.

#### Release Validation Tasks:
1. **RELEASE-VAL-001**: Plugin Installation & Activation Validation
2. **RELEASE-VAL-002**: Core API Endpoint Validation  
3. **RELEASE-VAL-003**: Five New Feature Domains Validation
4. **RELEASE-VAL-004**: Authentication & Elementor Compatibility Validation
5. **RELEASE-VAL-005**: Plugin ZIP Structure & Naming Validation
6. **RELEASE-VAL-006**: Documentation & Changelog Validation
7. **RELEASE-VAL-007**: ReleaseChain Integration Validation
8. **RELEASE-VAL-008**: Final Release Artifacts Generation

#### Automated Test Scripts:
The following scripts are available for ReleaseChain integration:

1. **`test-plugin-release.sh`** - Main release test script
   ```bash
   cd /Users/andrelange/Documents/repositories/github/elementify-mcp
   ./scripts/test-plugin-release.sh [--skip-install] [--skip-tests]
   ```
   
2. **`validate-new-domains.sh`** - Five feature domains validation
   ```bash
   cd /Users/andrelange/Documents/repositories/github/elementify-mcp
   ./scripts/validate-new-domains.sh
   ```
   
3. **`create-plugin-zip.sh`** - Plugin ZIP creation
   ```bash
   cd /Users/andrelange/Documents/repositories/github/elementify-mcp
   ./scripts/create-plugin-zip.sh
   ```

#### ReleaseChain Workflow:
1. **Detect changes** in the Elementify MCP repository
2. **Build plugin ZIP** with version 2.0.1 using `create-plugin-zip.sh`
3. **Deploy to test environment** in `wp-testing-env/`
4. **Execute validation tasks** 1-8 using the test scripts
5. **Generate validation report** based on PRD acceptance criteria
6. **Approve/reject release** based on test results
7. **Generate final artifacts** (ZIP, checksum, release notes)

#### Quick Test Command for ReleaseChain:
```bash
cd /Users/andrelange/Documents/repositories/github/elementify-mcp
./scripts/test-plugin-release.sh
```

## 📚 References

- [Elementify MCP Repository](/Users/andrelange/Documents/repositories/github/elementify-mcp)
- [WordPress Testing Environment](/Users/andrelange/Documents/repositories/github/wp-testing-env)
- [Elementor Documentation](https://developers.elementor.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [Core Web Vitals](https://web.dev/vitals/)
