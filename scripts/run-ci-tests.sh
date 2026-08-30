#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "================================================================"
echo "🧪 Running BRG-007 Ground Truth Integration Tests & Benchmarks"
echo "   Working Directory: ${REPO_ROOT}"
echo "================================================================"

echo ""
echo "--- 1. Verifying CI Fixtures exist and are valid JSON ---"
for fixture in tests/fixtures/*.json; do
    if [ -f "$fixture" ]; then
        php -r "json_decode(file_get_contents('$fixture')) !== null or exit(1);"
        echo "  ✅ Fixture valid: $fixture"
    fi
done

echo ""
echo "--- 2. Running PHPUnit Integration Test Suite ---"
./vendor/bin/phpunit --configuration phpunit.xml

echo ""
echo "--- 3. Running Ground Truth Payload Benchmark ---"
php tests/measure-payload.php

echo ""
echo "================================================================"
echo "✅ All BRG-007 Ground Truth Integration Tests & Gates PASSED"
echo "================================================================"
