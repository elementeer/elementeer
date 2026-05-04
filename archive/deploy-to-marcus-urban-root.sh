#!/bin/bash
set -e

echo "=== Deploy Elementify v2.0.0 to marcus-urban.de (as root) ==="
echo ""

# Configuration
SERVER="marcus-urban.de"
SSH_USER="root"
WP_PATH="/var/www/html"
ZIP_FILE="elementify-2.0.0-final-fixed.zip"

# Call generic deploy script
exec ./deploy-plugin.sh "$SERVER" "$SSH_USER" "$WP_PATH" "$ZIP_FILE"