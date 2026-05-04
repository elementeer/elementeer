#!/bin/bash

# Validation script for new Elementify MCP domains
# Tests each of the five advanced feature domains

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_KEY_FILE="/Users/andrelange/Documents/repositories/github/wp-testing-env/.elementify-api-key"

if [ ! -f "$API_KEY_FILE" ]; then
    echo "ERROR: API key file not found at $API_KEY_FILE"
    exit 1
fi

API_KEY=$(cat "$API_KEY_FILE" | tr -d '\n')
BASE_URL="http://localhost:8082/wp-json/elementify/v2"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_code=${3:-200}
    local data=${4:-}
    
    local curl_cmd="curl -s -o /dev/null -w \"%{http_code}\" -H \"Authorization: Bearer $API_KEY\" -X $method"
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    curl_cmd="$curl_cmd \"$BASE_URL$endpoint\""
    
    local response_code
    response_code=$(eval "$curl_cmd")
    
    if [ "$response_code" -eq "$expected_code" ]; then
        log_success "$method $endpoint -> $response_code"
        return 0
    else
        log_error "$method $endpoint -> $response_code (expected $expected_code)"
        return 1
    fi
}

echo "=== Elementify New Domains Validation ==="
echo

log_info "1. Testing Media AI Operations..."
test_endpoint "GET" "/media/search-stock?query=test" 200

log_info "2. Testing Addon Ecosystem Expansion..."
test_endpoint "GET" "/addons" 200
test_endpoint "GET" "/addons/essential-addons-for-elementor-lite" 200
test_endpoint "GET" "/addons/essential-addons-for-elementor-lite/widgets" 200

log_info "3. Testing Performance Analysis Enhancement..."
test_endpoint "GET" "/site/performance/core-web-vitals" 200
test_endpoint "GET" "/site/performance/report" 200

log_info "4. Testing Accessibility Enhancement..."
test_endpoint "GET" "/ally/scan/accessibility" 200
test_endpoint "POST" "/ally/scan/trigger" 200 '{"scan_type":"quick"}'

log_info "5. Testing Snapshot & Versioning..."
test_endpoint "GET" "/snapshots" 200
# Create a snapshot (requires a valid post_id)
# We'll skip creation for now as it needs actual post_id
# test_endpoint "POST" "/snapshots" 201 '{"post_id":1,"description":"Test"}'

echo
echo "=== Validation Complete ==="