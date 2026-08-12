#!/bin/bash

# Create Elementeer Plugin ZIP file for distribution
#
# CONVENTIONS (non-negotiable — enforced by this script):
#   • ZIP name:   elementeer.X.Y.Z.zip
#   • SHA256:     elementeer.X.Y.Z.sha256
#   • Version:    auto-extracted from plugin/elementeer.php Version header
#   • Release:    GitHub Release title must be "Elementeer vX.Y.Z"
#   • Tag:        vX.Y.Z  (semantic version, triggers .github/workflows/release.yml)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="${ELEMENTEER_PLUGIN_SOURCE:-$REPO_DIR}"
OUTPUT_DIR="/tmp/elementeer-build-final"

# Extract version from plugin header
VERSION=$(grep -o "Version:[[:space:]]*[0-9]\.[0-9]\.[0-9]" "$PLUGIN_DIR/elementeer.php" | awk '{print $2}')
if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from $PLUGIN_DIR/elementeer.php"
    exit 1
fi

ZIP_NAME="elementeer.$VERSION.zip"
RELEASE_DIR="$OUTPUT_DIR/$VERSION"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Creating Elementeer Plugin ZIP v$VERSION..."
echo "Output: $RELEASE_DIR/$ZIP_NAME"

# Check plugin directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo -e "${RED}Error: Plugin directory not found at $PLUGIN_DIR${NC}"
    exit 1
fi

# Check required files exist
required_files=(
    "$PLUGIN_DIR/elementeer.php"
    "$PLUGIN_DIR/includes/Plugin.php"
    "$PLUGIN_DIR/includes/Api/Router.php"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: Required file not found: $file${NC}"
        exit 1
    fi
done

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy plugin files with correct folder structure.
#
# ALLOWLIST, not blocklist. A blocklist ships whatever nobody thought of:
# a `cp -r *` from a developer machine with dev packages installed put 5.8 MB
# of PHPUnit, Mockery and Sebastian into the distribution, plus tests/,
# scripts/ and composer.*. Test PHP inside a web-served plugin directory is a
# hardening problem, not just dead weight.
#
# vendor/ is deliberately NOT shipped: the plugin has no runtime dependencies
# (composer.json `require` is php>=8.0 only), and elementeer.php registers its
# own PSR-4 autoloader for Elementeer\MCP\ — the Composer autoloader is loaded
# only `if file_exists`. Shipping vendor/ adds risk and no capability.
#
# Adding a new top-level file or directory to the plugin means adding it here.
DIST_PATHS=(
    elementeer.php
    includes
    assets
    readme.txt
    README.md
    LICENSE
)

echo "Copying plugin files (allowlist)..."
mkdir -p "$TEMP_DIR/elementeer"
for path in "${DIST_PATHS[@]}"; do
    if [ -e "$PLUGIN_DIR/$path" ]; then
        cp -r "$PLUGIN_DIR/$path" "$TEMP_DIR/elementeer/"
    else
        echo "Error: allowlisted path missing from source: $path"
        exit 1
    fi
done

# Remove any unnecessary files
find "$TEMP_DIR" -name ".git*" -delete
find "$TEMP_DIR" -name "*.bak" -delete
find "$TEMP_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Guard: nothing that is not allowlisted may reach the package
UNEXPECTED=$(cd "$TEMP_DIR/elementeer" && ls -A | grep -vxF "$(printf '%s\n' "${DIST_PATHS[@]}")" || true)
if [ -n "$UNEXPECTED" ]; then
    echo "Error: unexpected entries in package:"
    printf '  %s\n' $UNEXPECTED
    exit 1
fi

# Create release directory
mkdir -p "$RELEASE_DIR"

# Remove existing ZIP if present
if [ -f "$RELEASE_DIR/$ZIP_NAME" ]; then
    rm "$RELEASE_DIR/$ZIP_NAME"
fi

# Create ZIP file
echo "Creating ZIP file: $RELEASE_DIR/$ZIP_NAME"
cd "$TEMP_DIR"
zip -r "$RELEASE_DIR/$ZIP_NAME" elementeer -q

# Clean up
rm -rf "$TEMP_DIR"

# Verify ZIP was created
if [ -f "$RELEASE_DIR/$ZIP_NAME" ]; then
    zip_size=$(du -h "$RELEASE_DIR/$ZIP_NAME" | cut -f1)
    echo -e "${GREEN}Successfully created ZIP: $RELEASE_DIR/$ZIP_NAME ($zip_size)${NC}"
    
    # Create SHA256 checksum
    cd "$RELEASE_DIR"
    sha256sum "$ZIP_NAME" > "elementeer.$VERSION.sha256"
    echo -e "${GREEN}Created checksum: elementeer.$VERSION.sha256${NC}"
    
    # List contents
    echo "ZIP contents:"
    unzip -l "$RELEASE_DIR/$ZIP_NAME" | head -20
else
    echo -e "${RED}Error: ZIP file was not created${NC}"
    exit 1
fi