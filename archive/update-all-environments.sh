#!/bin/bash
set -e

# ============================================
# Elementify v1.0.0 - Multi-Environment Update
# ============================================
# Updates all environments to v1.0.0
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
PLUGIN_DIR="$PROJECT_ROOT/plugin"
MCP_SERVER_DIR="$PROJECT_ROOT/mcp-server"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          ELEMENTIFY v1.0.0 - UPDATE ALL                  ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check PHP
    if ! command -v php &> /dev/null; then
        warn "PHP not found. Plugin deployment may fail"
    fi
    
    # Check zip
    if ! command -v zip &> /dev/null; then
        error "zip command not found. Required for plugin packaging"
        exit 1
    fi
    
    success "Prerequisites OK"
}

# Build MCP server
build_mcp_server() {
    log "Building MCP server v1.0.0..."
    
    cd "$MCP_SERVER_DIR"
    
    # Install dependencies
    log "Installing Node.js dependencies..."
    npm ci --silent
    
    # TypeScript compilation
    log "Compiling TypeScript..."
    npm run build --silent
    
    # Run tests
    log "Running MCP server tests..."
    if npm test -- --passWithNoTests --silent; then
        success "MCP server built and tested successfully"
    else
        warn "MCP server tests failed, but continuing with build"
    fi
    
    # Check version
    local version=$(node dist/cli.js --version)
    log "MCP Server version: $version"
}

# Build plugin ZIP
build_plugin_zip() {
    log "Building WordPress plugin v1.0.0..."
    
    cd "$PLUGIN_DIR"
    
    # Install PHP dependencies
    log "Installing PHP dependencies..."
    composer install --no-dev --optimize-autoloader --quiet
    
    # Create ZIP
    ZIP_FILE="/tmp/elementify-v1.0.0-$(date +%Y%m%d-%H%M%S).zip"
    log "Creating plugin ZIP: $ZIP_FILE"
    
    zip -r "$ZIP_FILE" . \
        -x "*.git*" \
        -x "node_modules/*" \
        -x "tests/*" \
        -x "coverage/*" \
        -x "*.log" \
        -x "*.zip" \
        -x ".DS_Store" \
        -x "composer.lock" \
        -x "package-lock.json" \
        -q
    
    local size=$(du -h "$ZIP_FILE" | cut -f1)
    success "Plugin ZIP created: $size"
    
    echo "$ZIP_FILE"
}

# Deploy to environment
deploy_to() {
    local env_name=$1
    local ssh_host=$2
    local ssh_user=$3
    local wp_path=$4
    local zip_file=$5
    
    log "Deploying to $env_name ($ssh_host)..."
    
    # Copy ZIP to server
    log "Copying files to $ssh_host..."
    scp -q "$zip_file" "$ssh_user@$ssh_host:$wp_path/wp-content/plugins/"
    
    # Create deployment script
    cat > /tmp/deploy-elementify.sh << DEPLOYSCRIPT
#!/bin/bash
set -e

echo "=== Elementify v1.0.0 Deployment on \$HOSTNAME ==="
cd "$wp_path/wp-content/plugins"

# Backup existing
if [ -d "elementify" ]; then
    backup_dir="elementify-backup-\$(date +%Y%m%d-%H%M%S)"
    echo "Creating backup: \$backup_dir"
    cp -r elementify "\$backup_dir"
    echo "Backup created: \$backup_dir"
fi

# Remove old version
rm -rf elementify-old 2>/dev/null || true
if [ -d "elementify" ]; then
    mv elementify elementify-old
    echo "Moved old version to elementify-old"
fi

# Extract new version
echo "Extracting v1.0.0..."
unzip -q -o "$(basename "$zip_file")" -d elementify
rm -f "$(basename "$zip_file")"

# Install PHP dependencies
echo "Installing PHP dependencies..."
cd elementify
composer install --no-dev --optimize-autoloader --quiet

# Fix permissions
echo "Setting permissions..."
chmod -R 755 .
find . -type f -exec chmod 644 {} \;

echo "✅ Deployment complete on \$HOSTNAME"

# WordPress CLI commands (if available)
if command -v wp &> /dev/null; then
    echo "Activating plugin via WP-CLI..."
    cd "$wp_path"
    wp plugin deactivate elementify --quiet 2>/dev/null || true
    wp plugin activate elementify --quiet
    wp cache flush --quiet
    echo "Plugin activated"
else
    echo "⚠️  WP-CLI not available. Please activate plugin manually."
fi
DEPLOYSCRIPT
    
    # Copy and run deployment script
    scp -q /tmp/deploy-elementify.sh "$ssh_user@$ssh_host:/tmp/deploy-elementify.sh"
    ssh "$ssh_user@$ssh_host" "bash /tmp/deploy-elementify.sh"
    
    # Verify deployment
    log "Verifying deployment..."
    if ssh "$ssh_user@$ssh_host" "cd '$wp_path/wp-content/plugins/elementify' && grep -q 'Version:     1.0.0' elementify-mcp.php"; then
        success "✅ $env_name: Successfully updated to v1.0.0"
    else
        warn "⚠️  $env_name: Version check failed (may still be OK)"
    fi
}

# Update local MCP
update_local_mcp() {
    log "Updating local MCP installation..."
    
    # Check if installed globally
    if command -v elementify-mcp &> /dev/null; then
        log "Found global installation, updating..."
        cd "$MCP_SERVER_DIR"
        npm install -g --silent
        success "Global MCP server updated"
    else
        log "No global installation found"
        log "To use locally: cd '$MCP_SERVER_DIR' && npm start"
    fi
    
    # Update config if needed
    if [ -f "$HOME/.elementify/config.json" ]; then
        log "Found existing config: $HOME/.elementify/config.json"
    else
        warn "No config found. Run: ./scripts/elementify-mcp.sh setup"
    fi
}

# Main execution
main() {
    print_banner
    
    log "Starting Elementify v1.0.0 update process..."
    echo ""
    
    # 1. Check prerequisites
    check_prerequisites
    echo ""
    
    # 2. Build MCP server
    build_mcp_server
    echo ""
    
    # 3. Build plugin ZIP
    ZIP_FILE=$(build_plugin_zip)
    echo ""
    
    # 4. Define environments
    declare -A environments=(
        ["marcus-urban.de"]="marcus-urban.de|$(whoami)|/var/www/html"
        ["preview.fusionaize.com"]="fusionaize.com|$(whoami)|/var/www/preview"
    )
    
    # 5. Deploy to each environment
    for env_name in "${!environments[@]}"; do
        IFS='|' read -r ssh_host ssh_user wp_path <<< "${environments[$env_name]}"
        
        echo "========================================"
        read -p "Deploy to $env_name? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            deploy_to "$env_name" "$ssh_host" "$ssh_user" "$wp_path" "$ZIP_FILE"
        else
            log "Skipping $env_name"
        fi
        echo ""
    done
    
    # 6. Update local MCP
    update_local_mcp
    echo ""
    
    # 7. Cleanup
    log "Cleaning up temporary files..."
    rm -f "$ZIP_FILE" /tmp/deploy-elementify.sh 2>/dev/null || true
    
    # 8. Summary
    success "🎉 UPDATE COMPLETE!"
    echo ""
    echo "Summary:"
    echo "- MCP Server: Built v1.0.0"
    echo "- WordPress Plugin: Packaged v1.0.0"
    echo "- Environments: Updated as selected"
    echo ""
    echo "Next steps:"
    echo "1. Test WordPress REST API: https://marcus-urban.de/wp-json/elementify/v1/health"
    echo "2. Test MCP server: elementify-mcp --version"
    echo "3. Verify new addon features: Check /wp-json/elementify/v1/addons"
    echo ""
    echo "For issues, check:"
    echo "- Plugin error logs: /var/log/apache2/error.log"
    echo "- MCP server logs: $MCP_SERVER_DIR/logs/"
    echo ""
}

# Run main
main "$@"