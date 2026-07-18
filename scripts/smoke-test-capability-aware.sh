#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Elementeer Capability-Aware Smoke Test
# =============================================================================
# Data-driven test: reads endpoint_map.json and verifies that each endpoint
# returns 403 with a wrong-capability key and 200/201 with the correct key.
#
# This script requires a WordPress instance AND the ability to create API keys
# with specific capabilities. By default it uses the Elementeer REST API to
# create temp keys. If the API is not available, it falls back to a simple
# wildcard-key-only test.
#
# Usage:
#   export ELEMENTEER_WP_URL=http://localhost:8082
#   export ELEMENTEER_API_KEY=ek_...
#   bash scripts/smoke-test-capability-aware.sh
#
# Or place values in a .env file in the script directory.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAP_FILE="${SCRIPT_DIR}/endpoint_map.json"
ENV_FILE="${SCRIPT_DIR}/.env"

# Load .env if present
if [ -f "$ENV_FILE" ]; then
    set -a; source "$ENV_FILE"; set +a
fi

BASE_URL="${ELEMENTEER_WP_URL:-http://localhost:8082}"
# Wildcard API key for full-access testing
WILDCARD_KEY="${ELEMENTEER_API_KEY:-}"
B="${BASE_URL}/wp-json/elementeer/v1"

PASS=0; FAIL=0; SKIP=0

green() { printf '  \033[0;32m✅ %s\033[0m\n' "$1"; PASS=$((PASS+1)); }
red()   { printf '  \033[0;31m❌ %s\033[0m\n' "$1"; FAIL=$((FAIL+1)); }
skip()  { printf '  \033[1;33m⏭️  %s\033[0m\n' "$1"; SKIP=$((SKIP+1)); }
log()   { printf '\n\033[0;34m━━━ %s ━━━\033[0m\n' "$1"; }
warn()  { printf '  \033[1;33m⚠️  %s\033[0m\n' "$1"; }

do_request() {
    local method="$1" url="$2" key="$3" expect="$4" body="${5:-}"
    local code

    case "$method" in
        GET)
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -H "X-Elementeer-Key: $key" "$url" 2>/dev/null)
            ;;
        POST)
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -X POST \
                -H "X-Elementeer-Key: $key" \
                -H "Content-Type: application/json" \
                -d "$body" "$url" 2>/dev/null)
            ;;
        PUT)
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -X PUT \
                -H "X-Elementeer-Key: $key" \
                -H "Content-Type: application/json" \
                -d "$body" "$url" 2>/dev/null)
            ;;
        PATCH)
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -X PATCH \
                -H "X-Elementeer-Key: $key" \
                -H "Content-Type: application/json" \
                -d "$body" "$url" 2>/dev/null)
            ;;
        DELETE)
            code=$(curl -sS -o /dev/null -w '%{http_code}' \
                -X DELETE \
                -H "X-Elementeer-Key: $key" "$url" 2>/dev/null)
            ;;
        *) code="000" ;;
    esac
    echo "$code"
}

# Create a test key with specific capabilities via Elementeer REST API
# Returns the raw key value or empty string on failure.
create_scoped_key() {
    local label="$1" cap="$2"
    local resp
    resp=$(curl -sS -X POST \
        -H "X-Elementeer-Key: $WILDCARD_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"label\":\"$label\",\"capabilities\":[\"$cap\"]}" \
        "$B/keys" 2>/dev/null || echo "")
    # Extract key from JSON response
    echo "$resp" | grep -o '"key"[[:space:]]*:[[:space:]]*"[^"]*"' | \
        head -1 | sed 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo ""
}

# Delete a key by its value
delete_key() {
    local key="$1"
    curl -sS -o /dev/null -X DELETE \
        -H "X-Elementeer-Key: $WILDCARD_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$key\"}" \
        "$B/keys" 2>/dev/null || true
}

# Build a reasonable request body for the given route + method.
# Returns empty string if no body is needed.
build_body() {
    local route="$1" method="$2"

    # For write endpoints, provide minimal valid data
    case "$route" in
        /templates)
            echo '{"title":"smoke-test","type":"page","status":"draft"}'
            ;;
        */templates/*/duplicate)
            echo '{}'
            ;;
        /templates/*/data)
            echo '{"elementor_data":[]}'
            ;;
        /theme-builder/templates)
            echo '{"title":"smoke-hdr","type":"header","conditions":"all"}'
            ;;
        /theme-builder/templates/*/conditions)
            echo '{"conditions":["include/general"]}'
            ;;
        /pages)
            echo '{"title":"Smoke Page"}'
            ;;
        /pages/*/data)
            echo '{"elementor_data":[]}'
            ;;
        /posts)
            echo '{"title":"Smoke Post"}'
            ;;
        /menus)
            echo '{"name":"Smoke Menu"}'
            ;;
        /menu-items)
            echo '{"menu_id":999999,"label":"Test","url":"#"}'
            ;;
        /menu-locations)
            echo '{"menu_id":999999,"location":"primary"}'
            ;;
        /terms/*)
            echo '{"name":"Smoke Cat"}'
            ;;
        /site/settings)
            echo '{"blogname":"Smoke"}'
            ;;
        /site/logo)
            echo '{"media_id":999999}'
            ;;
        /site/global-styles/colors)
            echo '{"slot":"system","colors":[]}'
            ;;
        /site/global-styles/typography)
            echo '{"slot":"system","typography":[]}'
            ;;
        /site/global-css)
            echo '{"css":"body{}"}'
            ;;
        /site/theme-mode)
            echo '{"mode":"light"}'
            ;;
        /site/context)
            echo '{"purpose":"test"}'
            ;;
        /site/seo/meta)
            echo '{"post_id":4,"title":"Test"}'
            ;;
        /site/performance/flush-cache)
            echo '{}'
            ;;
        /site/performance/clean-database)
            echo '{"preview":true}'
            ;;
        /site/performance/optimize-assets)
            echo '{}'
            ;;
        /site/performance/diagnose-issue)
            echo '{"symptom":"slow_page"}'
            ;;
        /site/performance/test-plugin-conflict)
            echo '{"plugin_slug":"akismet","action":"deactivate"}'
            ;;
        /site/performance/generate-critical-css)
            echo '{}'
            ;;
        /stack-bootstrap/plan)
            echo '{}'
            ;;
        /stack-bootstrap/execute)
            echo '{}'
            ;;
        /diagnostics/run-scan)
            echo '{}'
            ;;
        /diagnostics/test)
            echo '{"test":"all"}'
            ;;
        /ally/scan/trigger)
            echo '{}'
            ;;
        /ally/fix/apply)
            echo '{"scan_id":1,"issue_id":"test"}'
            ;;
        /ally/wcag-auto-fix)
            echo '{"page_id":4}'
            ;;
        /voxel/search)
            echo '{"keyword":"test","post_type":"post"}'
            ;;
        /voxel/listings)
            echo '{"title":"Smoke Listing","status":"draft"}'
            ;;
        /voxel/product-types)
            echo '{"key":"smoke","label":"Smoke PT"}'
            ;;
        /voxel/taxonomies)
            echo '{"key":"smoke_tax","label":"Smoke Taxonomy","post_types":["post"]}'
            ;;
        /voxel/post-types/create)
            echo '{"key":"test_pt","label":"Test PT"}'
            ;;
        /voxel/reindex)
            echo '{}'
            ;;
        /voxel/fields)
            echo '{"key":"smoke","label":"Smoke","type":"text","post_type":"test"}'
            ;;
        /addons/*/widgets/*/toggle)
            echo '{"enable":true}'
            ;;
        /woocommerce/products)
            echo '{"title":"Smoke Product","type":"simple"}'
            ;;
        /woocommerce/pages/setup)
            echo '{}'
            ;;
        /woocommerce/product-categories/manage)
            echo '{"name":"Smoke Cat"}'
            ;;
        /media/*/generate-alt-text|/media/batch-generate-alt-text)
            echo '{}'
            ;;
        /media/sideload)
            echo '{"url":"https://example.com/img.jpg"}'
            ;;
        /workflows/plan)
            echo '{"name":"test","type":"content_publish","stages":[]}'
            ;;
        /workflows/execute)
            echo '{"plan_id":"test"}'
            ;;
        /changes/*/status)
            echo '{"status":"approved"}'
            ;;
        /translation/strings/translate)
            echo '{"text":"Hello","target_language":"de"}'
            ;;
        /translation/media/translate)
            echo '{"media_id":1,"target_language":"de"}'
            ;;
        /import/external)
            echo '{"format":"json","data":"[]","post_type":"post"}'
            ;;
        /export/data)
            echo '{"post_type":"elementor_library","limit":1,"format":"json"}'
            ;;
        *)
            # For POST/PUT/PATCH without a known body, provide empty JSON
            case "$method" in POST|PUT|PATCH) echo '{}' ;; *) echo '' ;; esac
            ;;
    esac
}

# Resolve a route pattern into a concrete test URL (replaces regex params with
# placeholder values like 999, test, or voxel).
resolve_url() {
    local route="$1"
    local url="$route"

    # Replace route param placeholders
    url="${url//\(\[a-zA-Z0-9_\:-]\+\)/smoke}"
    url="${url//\(\[a-z0-9_-\]\+\)/test}"
    url="${url//\([a-zA-Z0-9_:-]\+\)/test}"
    url="${url//\([a-z0-9_-]\+\)/test}"
    url="${url//\(?P<id>\\d+\)/999999}"
    url="${url//\(?P<widget_id>[a-zA-Z0-9_:-]\+\)/test-widget}"
    url="${url//\(?P<plugin_slug>[a-zA-Z0-9_-]\+\)/voxel}"
    url="${url//\(?P<plugin_slug>(voxel|essential-addons|elementskit|powerpack|premium-addons|happy-addons|the-plus-addons|ultimate-addons)\)/voxel}"
    url="${url//\(?P<key>[a-z0-9_-]\+\)/smoke}"
    url="${url//\(?P<post_type>[a-z0-9_-]\+\)/post}"
    url="${url//\(?P<course_id>\\d+\)/999999}"

    echo "$url"
}

# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

echo "🔬 Elementeer Capability-Aware Smoke Test"
echo "   Base URL: $BASE_URL"
echo "   Map file: $MAP_FILE"

# Generate endpoint_map.json if missing
if [ ! -f "$MAP_FILE" ]; then
    echo ""
    warn "endpoint_map.json not found. Generating..."
    php "$SCRIPT_DIR/extract-endpoint-map.php" "$MAP_FILE" || {
        echo "❌ Failed to generate endpoint_map.json. Run: php scripts/extract-endpoint-map.php"
        exit 1
    }
fi

# Check for wildcard key
if [ -z "$WILDCARD_KEY" ]; then
    echo "❌ ELEMENTEER_API_KEY not set. Export it or add to $ENV_FILE"
    exit 1
fi

echo "   Wildcard key: ${WILDCARD_KEY:0:24}..."

# Check jq availability
if ! command -v jq >/dev/null 2>&1; then
    warn "jq not found. Falling back to grep-based JSON parsing (less robust)."
fi

# ── Phase 1: Wildcard key test  ──────────────────────────────────────

log "PHASE 1 — Wildcard Key Test (all endpoints with * key)"

declare -A WILDCARD_BODIES
WILDCARD_BODIES["POST /templates"]='{"title":"smoke-wc","type":"page","status":"draft","elementor_data":"[]"}'
WILDCARD_BODIES["POST /theme-builder/templates"]='{"title":"smoke-wc-tb","type":"header","conditions":"all","elementor_data":"[]"}'
WILDCARD_BODIES["POST /snapshots"]='{"post_type":"elementor_library","post_id":4,"kind":"manual"}'
WILDCARD_BODIES["POST /workflows/plan"]='{"name":"smoke-wc","type":"content_publish","stages":[]}'

total_wildcard=0
wildcard_pass=0

# Read entries from endpoint_map.json
if command -v jq >/dev/null 2>&1; then
    entries=$(jq -c 'to_entries[]' "$MAP_FILE" 2>/dev/null)
else
    entries=$(python3 -c "
import json, sys
with open('$MAP_FILE') as f:
    data = json.load(f)
for route, methods in sorted(data.items()):
    for method, cap in sorted(methods.items()):
        print(json.dumps({'route': route, 'method': method, 'cap': cap}))
" 2>/dev/null)
fi

while IFS= read -r entry; do
    [ -z "$entry" ] && continue

    route=$(echo "$entry" | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['route'])" 2>/dev/null || echo "$entry" | grep -o '"route":"[^"]*"' | sed 's/"route":"\(.*\)"/\1/')
    method=$(echo "$entry" | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['method'])" 2>/dev/null || echo "$entry" | grep -o '"method":"[^"]*"' | sed 's/"method":"\(.*\)"/\1/')
    cap=$(echo "$entry" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('cap','') or '')" 2>/dev/null || echo "$entry" | grep -o '"cap":"[^"]*"' | sed 's/"cap":"\(.*\)"/\1/')

    url=$(resolve_url "$route")
    full_url="$B$url"
    body=$(build_body "$route" "$method")
    label="$method $route"
    label_short="$method $url"

    # Determine expected status
    case "$method" in
        POST) expect=201 ;;
        *)    expect=200 ;;
    esac

    total_wildcard=$((total_wildcard + 1))
    code=$(do_request "$method" "$full_url" "$WILDCARD_KEY" "$expect" "$body")
    if [ "$code" = "$expect" ]; then
        green "$label_short (wildcard)"
        wildcard_pass=$((wildcard_pass + 1))
    else
        red "$label_short (wildcard — got $code, expected $expect)"
    fi
done <<< "$entries"

echo ""
echo "   Wildcard: $wildcard_pass/$total_wildcard passed"

# ── Phase 2: Wrong-capability key test ───────────────────────────────

log "PHASE 2 — Wrong-Capability Test (one endpoint per unique cap)"

# Gather unique capabilities and pick one test route per cap
if command -v jq >/dev/null 2>&1; then
    caps_and_routes=$(jq -r '
        to_entries[] |
        .key as $route |
        .value | to_entries[] |
        select(.value != null and .value != "") |
        "\(.value)§\($route)§\(.key)"
    ' "$MAP_FILE" 2>/dev/null | sort -u -t'§' -k1,1)
else
    caps_and_routes=$(python3 -c "
import json
with open('$MAP_FILE') as f:
    data = json.load(f)
seen_caps = {}
for route, methods in sorted(data.items()):
    for method, cap in sorted(methods.items()):
        if cap is not None:
            seen_caps[cap] = (route, method)
for cap, (route, method) in sorted(seen_caps.items()):
    print(f'{cap}§{route}§{method}')
" 2>/dev/null)
fi

total_cap=0
cap_pass=0

while IFS='§' read -r cap route method; do
    [ -z "$cap" ] && continue
    route="${route//$'\r'/}"
    cap="${cap//$'\r'/}"
    method="${method//$'\r'/}"

    url=$(resolve_url "$route")
    full_url="$B$url"
    body=$(build_body "$route" "$method")
    label="$method $route with $cap"

    # Create a key with wrong capability
    wrong_cap="site-audit:read"
    if [ "$cap" = "site-audit:read" ]; then
        wrong_cap="diagnostics:read"
    fi
    if [ "$cap" = "diagnostics:read" ]; then
        wrong_cap="ally:read"
    fi

    # Try to create a scoped key via the API
    temp_key=$(create_scoped_key "smoke-$(date +%s)" "$wrong_cap")
    if [ -n "$temp_key" ]; then
        expect=403
        code=$(do_request "$method" "$full_url" "$temp_key" "$expect" "$body")
        total_cap=$((total_cap + 1))
        if [ "$code" = "403" ] || [ "$code" = "401" ]; then
            green "wrong-cap $method $url ($wrong_cap key → $code)"
            cap_pass=$((cap_pass + 1))
        else
            red "wrong-cap $method $url ($wrong_cap key → got $code, expected 403/401)"
        fi
        delete_key "$temp_key" 2>/dev/null || true
    else
        skip "wrong-cap $method $url (could not create scoped key)"
    fi
done <<< "$caps_and_routes"

echo ""
echo "   Wrong-cap: $cap_pass/$total_cap passed"

# ── Phase 3: Correct-capability key test ─────────────────────────────

log "PHASE 3 — Correct-Capability Test (one endpoint per unique cap)"

total_correct=0
correct_pass=0

while IFS='§' read -r cap route method; do
    [ -z "$cap" ] && continue
    route="${route//$'\r'/}"
    cap="${cap//$'\r'/}"
    method="${method//$'\r'/}"

    url=$(resolve_url "$route")
    full_url="$B$url"
    body=$(build_body "$route" "$method")
    case "$method" in POST) expect=201 ;; *) expect=200 ;; esac
    label="$method $route with correct $cap"

    temp_key=$(create_scoped_key "smoke-$(date +%s)" "$cap")
    if [ -n "$temp_key" ]; then
        code=$(do_request "$method" "$full_url" "$temp_key" "$expect" "$body")
        total_correct=$((total_correct + 1))
        if [ "$code" = "$expect" ]; then
            green "correct-cap $method $url ($cap key → $code)"
            correct_pass=$((correct_pass + 1))
        else
            red "correct-cap $method $url ($cap key → got $code, expected $expect)"
        fi
        delete_key "$temp_key" 2>/dev/null || true
    else
        skip "correct-cap $method $url (could not create scoped key)"
    fi
done <<< "$caps_and_routes"

echo ""
echo "   Correct-cap: $correct_pass/$total_correct passed"

# ═══════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════

echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo "══════════════════════════════════════"
printf "  ✅ %d passed\n" $PASS
printf "  ❌ %d failed\n" $FAIL
printf "  ⏭️  %d skipped\n" $SKIP
printf "  ── %d total\n" $TOTAL
echo "══════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
    echo "❌ CAPABILITY-AWARE SMOKE TEST FAILED"
    exit 1
else
    echo "✅ CAPABILITY-AWARE SMOKE TEST PASSED"
fi
