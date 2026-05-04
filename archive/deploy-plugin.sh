#!/bin/bash
set -e

echo "=== Deploy Elementify Plugin ==="
echo ""

# Default configuration
SERVER="${1:-marcus-urban.de}"
SSH_USER="${2:-$(whoami)}"
WP_PATH="${3:-/var/www/html}"
ZIP_FILE="${4:-elementify-2.0.0-final-fixed.zip}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Validate ZIP file exists
if [ ! -f "$ZIP_FILE" ]; then
    error "ZIP file not found: $ZIP_FILE"
    echo "Available ZIP files:"
    ls -la *.zip 2>/dev/null | grep elementify || echo "No elementify ZIPs found"
    exit 1
fi

echo "Target: $SERVER"
echo "User: $SSH_USER"
echo "WP Path: $WP_PATH"
echo "ZIP: $ZIP_FILE"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

PLUGIN_DIR="$WP_PATH/wp-content/plugins/elementify"

log "1. Deactivating old plugin..."
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp plugin deactivate elementify --quiet 2>/dev/null || true"

log "2. Removing old plugin files..."
ssh "$SSH_USER@$SERVER" "rm -rf $PLUGIN_DIR 2>/dev/null || true"

log "3. Uploading new ZIP..."
scp "$ZIP_FILE" "$SSH_USER@$SERVER:/tmp/$ZIP_FILE"

log "4. Installing new plugin..."
ssh "$SSH_USER@$SERVER" "cd $WP_PATH/wp-content/plugins && unzip -q -o /tmp/$ZIP_FILE && rm -f /tmp/$ZIP_FILE"

log "5. Setting permissions..."
ssh "$SSH_USER@$SERVER" "find $PLUGIN_DIR -type d -exec chmod 755 {} \; 2>/dev/null || true"
ssh "$SSH_USER@$SERVER" "find $PLUGIN_DIR -type f -exec chmod 644 {} \; 2>/dev/null || true"

log "6. Activating plugin..."
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp plugin activate elementify --quiet"

log "7. Clearing cache..."
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp transient delete --all --quiet 2>/dev/null || true"
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp cache flush --quiet 2>/dev/null || true"

log "8. Testing REST API..."
API_RESPONSE=$(ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp rest post /elementify/v1/health --quiet 2>&1 || echo 'API_TEST_FAILED'")

if [[ "$API_RESPONSE" == *"API_TEST_FAILED"* ]] || [[ "$API_RESPONSE" == *"Error"* ]]; then
    warn "REST API test failed: $API_RESPONSE"
    warn "This might be normal if no API key is configured yet"
else
    success "REST API responded: (truncated) ${API_RESPONSE:0:100}..."
fi

log "9. Fixing Real Cookie Banner (if present)..."
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp plugin deactivate real-cookie-banner --quiet 2>/dev/null || true"
sleep 2
ssh "$SSH_USER@$SERVER" "cd $WP_PATH && wp plugin activate real-cookie-banner --quiet 2>/dev/null || true"

echo ""
success "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Visit https://$SERVER/wp-admin/"
echo "2. Go to Elementify → Settings"
echo "3. Create API keys if needed"
echo "4. Test MCP connection"
echo ""
echo "If Real Cookie Banner still shows errors:"
echo "- Go to Real Cookie Banner → Settings → Save Changes"
echo "- OR: Deactivate and reactivate Real Cookie Banner"
echo ""
echo "For debugging:"
echo "- Check /wp-content/debug.log"
echo "- Run: ssh $SSH_USER@$SERVER 'tail -50 $WP_PATH/wp-content/debug.log 2>/dev/null || echo \"No debug.log found\"'"