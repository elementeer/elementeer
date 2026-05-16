#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
GATE_PASS=0; GATE_FAIL=0

log_section()  { echo -e "\n${BLUE}═══ $1 ═══${NC}"; }
log_pass()     { echo -e "  ${GREEN}✓${NC} $1"; GATE_PASS=$((GATE_PASS + 1)); }
log_fail()     { echo -e "  ${RED}✗${NC} $1"; GATE_FAIL=$((GATE_FAIL + 1)); }
log_warn()     { echo -e "  ${YELLOW}⚠${NC} $1"; }

check_plugin_header() {
    log_section "Plugin Header"
    local hdr="$REPO_DIR/elementeer.php"
    if [ ! -f "$hdr" ]; then log_fail "elementeer.php not found"; return; fi
    log_pass "elementeer.php present"

    local ver; ver=$(grep "Version:" "$hdr" | head -1 | awk '{print $NF}')
    local cver; cver=$(grep "ELEMENTEER_MCP_VERSION" "$hdr" | sed "s/.*'\(.*\)'.*/\1/")
    if [ "$ver" = "$cver" ]; then
        log_pass "Version: $ver (header == PHP constant)"
    else
        log_fail "Version mismatch: header=$ver, constant=$cver"
    fi

    local uri; uri=$(grep "Plugin URI:" "$hdr" | head -1)
    if echo "$uri" | grep -q "git\.langevc\.com"; then
        log_pass "Plugin URI: Forgejo"
    else
        log_fail "Plugin URI must be git.langevc.com"
    fi
}

check_php_syntax() {
    log_section "PHP Syntax"
    local files; files=$(find "$REPO_DIR/includes" -name '*.php' 2>/dev/null || true)
    local errs=0
    for f in $files; do
        php -l "$f" >/dev/null 2>&1 || { log_fail "Syntax: $f"; errs=$((errs+1)); }
    done
    [ $errs -eq 0 ] && log_pass "All PHP files pass ($(echo "$files" | wc -l | tr -d ' ') files)"
}

check_required_files() {
    log_section "Required Files"
    for f in elementeer.php readme.txt includes/Plugin.php includes/Api/Router.php includes/Api/Templates.php includes/Api/Assessment.php includes/Api/ThemeBuilder.php; do
        [ -f "$REPO_DIR/$f" ] && log_pass "$f" || log_fail "MISSING: $f"
    done
}

check_forgejo_origin() {
    log_section "Source of Truth"
    local origin; origin=$(cd "$REPO_DIR" && git remote get-url origin 2>/dev/null)
    if echo "$origin" | grep -q 'git\.langevc\.com'; then
        log_pass "Origin: Forgejo"
    else
        log_fail "Origin is not Forgejo: $origin"
    fi
}

print_summary() {
    log_section "Gate Summary"
    local total=$((GATE_PASS + GATE_FAIL))
    echo -e "  ${GREEN}Passed: $GATE_PASS${NC}  ${RED}Failed: $GATE_FAIL${NC}  Total: $total"
    [ $GATE_FAIL -gt 0 ] && { echo -e "\n${RED}RELEASE BLOCKED${NC}"; exit 1; }
    echo -e "\n${GREEN}All gates passed — release can proceed.${NC}"
    exit 0
}

case "${1:-full}" in
    --pre-build)
        log_section "PRE-BUILD GATES (Plugin)"
        check_forgejo_origin
        check_plugin_header
        check_required_files
        check_php_syntax
        print_summary
        ;;
    *)
        log_section "FULL RELEASE GATE (Plugin)"
        check_forgejo_origin
        check_plugin_header
        check_required_files
        check_php_syntax
        print_summary
        ;;
esac
