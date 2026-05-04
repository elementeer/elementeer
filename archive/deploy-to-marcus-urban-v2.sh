#!/bin/bash
set -e

echo "=== Deploy Elementify v2.0.0 to marcus-urban.de ==="
echo ""

# Configuration
SERVER="91.98.136.136"
SSH_USER="$(whoami)"
WP_PATH="/var/www/html"
ZIP_FILE="elementify-2.0.0-final-fixed.zip"

# Call generic deploy script
exec ./deploy-plugin.sh "$SERVER" "$SSH_USER" "$WP_PATH" "$ZIP_FILE"