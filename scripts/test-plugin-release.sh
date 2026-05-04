#!/bin/bash

# Elementify Plugin Release Test Script
# Runs basic smoke tests on the Elementify WordPress plugin
# Designed to be called by SkillWeave ReleaseChain

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_ENV_DIR="/Users/andrelange/Documents/repositories/github/wp-testing-env"

# Extract version from plugin header to construct ZIP name
PLUGIN_DIR="$REPO_DIR/plugin"
VERSION=$(grep -o "Version:[[:space:]]*[0-9]\.[0-9]\.[0-9]" "$PLUGIN_DIR/elementify.php" 2>/dev/null | awk '{print $2}')
if [ -z "$VERSION" ]; then
    echo "Warning: Could not extract version from $PLUGIN_DIR/elementify.php, defaulting to 2.0.1"
    VERSION="2.0.1"
fi

# Use existing plugin ZIP from test environment plugin folder
# Naming Convention: elementify.X.Y.Z.zip
PLUGIN_ZIP="$TEST_ENV_DIR/plugins/elementify.$VERSION.zip"
API_KEY_FILE="$TEST_ENV_DIR/.elementify-api-key"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check test environment exists
    if [ ! -d "$TEST_ENV_DIR" ]; then
        log_error "Test environment not found at: $TEST_ENV_DIR"
        exit 1
    fi
    
    # Check plugin ZIP exists in test environment
    if [ ! -f "$PLUGIN_ZIP" ]; then
        log_error "Plugin ZIP not found at: $PLUGIN_ZIP"
        log_info "Checking for available Elementify plugin ZIPs in test environment..."
        
        # List available Elementify plugin ZIPs
        local available_zips
        available_zips=$(find "$TEST_ENV_DIR/plugins/" -name "*elementify*.zip" 2>/dev/null | head -5)
        
        if [ -n "$available_zips" ]; then
            log_info "Available Elementify plugin ZIPs:"
            echo "$available_zips"
            log_info "Please update PLUGIN_ZIP variable to use one of the available ZIPs"
        else
            log_error "No Elementify plugin ZIPs found in $TEST_ENV_DIR/plugins/"
        fi
        exit 1
    fi
    
    log_success "Dependencies checked"
}

start_test_environment() {
    log_info "Starting test environment..."
    
    cd "$TEST_ENV_DIR"
    
    # Check if environment is already running
    if docker-compose ps wordpress 2>/dev/null | grep -q "Up"; then
        log_info "Test environment is already running"
    else
        log_info "Starting Docker containers..."
        docker-compose up -d
        
        # Wait for WordPress to be ready
        log_info "Waiting for WordPress to be ready..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s -f "http://localhost:8082" > /dev/null 2>&1; then
                log_success "WordPress is ready"
                break
            fi
            log_info "Attempt $attempt/$max_attempts: WordPress not ready yet..."
            sleep 2
            attempt=$((attempt + 1))
        done
        
        if [ $attempt -gt $max_attempts ]; then
            log_error "WordPress failed to start"
            docker-compose logs wordpress | tail -20
            exit 1
        fi
    fi
}

install_plugin() {
    log_info "Installing plugin..."
    
    cd "$TEST_ENV_DIR"
    
    # Check if plugin ZIP exists in test environment
    if [ ! -f "$PLUGIN_ZIP" ]; then
        log_error "Plugin ZIP not found at: $PLUGIN_ZIP"
        log_info "Available Elementify plugin ZIPs in $TEST_ENV_DIR/plugins/:"
        ls -la "$TEST_ENV_DIR/plugins/elementify.*.zip" 2>/dev/null || true
        exit 1
    fi
    
    # Extract just the filename from full path
    PLUGIN_FILENAME=$(basename "$PLUGIN_ZIP")
    
    # Use install script with the existing ZIP
    if [ -f "./scripts/install-plugin.sh" ]; then
        ./scripts/install-plugin.sh --name elementify "plugins/$PLUGIN_FILENAME"
    else
        log_warn "install-plugin.sh not found, attempting manual installation..."
        # Fallback to WP-CLI
        docker-compose exec -T wordpress wp plugin install "/var/www/html/wp-content/plugins/$PLUGIN_FILENAME" --activate --force --allow-root
    fi
    
    log_success "Plugin installed"
}

get_api_key() {
    log_info "Getting API key..."
    
    if [ -f "$API_KEY_FILE" ]; then
        API_KEY=$(cat "$API_KEY_FILE")
        log_info "Using existing API key from $API_KEY_FILE"
    else
        log_warn "API key file not found, attempting to generate..."
        
        # Try to generate API key
        if [ -f "$TEST_ENV_DIR/generate-api-key-v2.php" ]; then
            cd "$TEST_ENV_DIR"
            php generate-api-key-v2.php > /tmp/api-key-output.txt 2>&1
            if grep -q "API Key:" /tmp/api-key-output.txt; then
                API_KEY=$(grep "API Key:" /tmp/api-key-output.txt | cut -d':' -f2 | tr -d ' ')
                echo "$API_KEY" > "$API_KEY_FILE"
                log_success "Generated new API key"
            else
                log_error "Failed to generate API key"
                cat /tmp/api-key-output.txt
                exit 1
            fi
        else
            log_error "No API key generation script found"
            exit 1
        fi
    fi
}

test_api_endpoint() {
    local endpoint=$1
    local expected_code=${2:-200}
    local description=${3:-"API endpoint"}
    
    log_info "Testing $description: $endpoint"
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        "http://localhost:8082/wp-json/elementify/v1$endpoint")
    
    if [ "$response_code" -eq "$expected_code" ]; then
        log_success "$description returned $response_code"
        return 0
    else
        log_error "$description returned $response_code (expected $expected_code)"
        return 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local tests_passed=0
    local tests_failed=0
    
    # Test 1: API root
    if test_api_endpoint "/" 200 "API root"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Test 2: Site info
    if test_api_endpoint "/site" 200 "Site info endpoint"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Test 3: Templates list
    if test_api_endpoint "/templates" 200 "Templates endpoint"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Test 4: Media endpoints (basic check)
    if test_api_endpoint "/media" 200 "Media endpoint"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Test 5: Performance endpoint
    if test_api_endpoint "/site/performance/report" 200 "Performance endpoint"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Summary
    log_info "Smoke tests completed: $tests_passed passed, $tests_failed failed"
    
    if [ $tests_failed -eq 0 ]; then
        log_success "All smoke tests passed!"
        return 0
    else
        log_error "Some smoke tests failed"
        return 1
    fi
}

check_debug_log() {
    log_info "Checking WordPress debug log for errors..."
    
    local debug_log="$TEST_ENV_DIR/logs/debug.log"
    
    if [ -f "$debug_log" ]; then
        local error_count
        error_count=$(grep -i -c "error\|fatal\|warning" "$debug_log" | tail -100 || true)
        
        if [ "$error_count" -gt 0 ]; then
            log_warn "Found $error_count errors/warnings in debug log"
            # Show last 5 errors
            grep -i "error\|fatal\|warning" "$debug_log" | tail -5 | while read -r line; do
                log_warn "  $line"
            done
        else
            log_success "No errors found in debug log"
        fi
    else
        log_info "Debug log not found (may be normal if no errors)"
    fi
}

main() {
    log_info "Starting Elementify Plugin Release Test"
    log_info "========================================"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-install)
                SKIP_INSTALL=1
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=1
                shift
                ;;
            --help)
                echo "Usage: $0 [--skip-install] [--skip-tests]"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run steps
    check_dependencies
    start_test_environment
    
    if [ -z "${SKIP_INSTALL:-}" ]; then
        install_plugin
    else
        log_info "Skipping plugin installation (--skip-install)"
    fi
    
    get_api_key
    
    if [ -z "${SKIP_TESTS:-}" ]; then
        run_smoke_tests
    else
        log_info "Skipping smoke tests (--skip-tests)"
    fi
    
    check_debug_log
    
    log_info "Test completed. See TESTING_WORKFLOW.md for detailed testing instructions."
    log_success "Elementify Plugin Release Test finished"
}

# Run main function
main "$@"