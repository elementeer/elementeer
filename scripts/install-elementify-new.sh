#!/bin/bash

# Elementify MCP Installer with Interactive Menu
# Installs and manages the Elementify MCP server with configuration support
# Compatible with Bash 3.x and later

set +e

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_LOG="$HOME/.elementify/install.log"
CONFIG_DIR="$HOME/.elementify"
CONFIG_FILE="$CONFIG_DIR/config.json"
NPM_PACKAGE="@elementify/mcp"

# UI colors (faigate style)
RESET=$'\033[0m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
CYAN=$'\033[36m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
BLUE=$'\033[34m'
MAGENTA=$'\033[35m'

# Color detection
has_color() {
    [ -t 1 ] && [ -z "${NO_COLOR:-}" ]
}

# UI helpers
print_header() {
    local title="$1"
    local subtitle="$2"
    
    if has_color; then
        echo ""
        echo "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
        echo "${BOLD}${BLUE}  ${title}${RESET}"
        if [ -n "$subtitle" ]; then
            echo "${DIM}  ${subtitle}${RESET}"
        fi
        echo "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
        echo ""
    else
        echo ""
        echo "================================================================"
        echo "  $title"
        if [ -n "$subtitle" ]; then
            echo "  $subtitle"
        fi
        echo "================================================================"
        echo ""
    fi
}

print_info() {
    if has_color; then
        echo "${CYAN}❯${RESET} $1"
    else
        echo "> $1"
    fi
}

print_success() {
    if has_color; then
        echo "${GREEN}✓${RESET} $1"
    else
        echo "✓ $1"
    fi
}

print_warning() {
    if has_color; then
        echo "${YELLOW}⚠${RESET} $1"
    else
        echo "⚠ $1"
    fi
}

print_error() {
    if has_color; then
        echo "${RED}✗${RESET} $1" >&2
    else
        echo "✗ $1" >&2
    fi
}

print_prompt() {
    if has_color; then
        echo -n "${BOLD}▸${RESET} "
    else
        echo -n "> "
    fi
}

pause() {
    echo ""
    if has_color; then
        echo -n "${DIM}Press Enter to continue...${RESET}"
    else
        echo -n "Press Enter to continue..."
    fi
    read -r
    echo ""
}

clear_screen() {
    if [ -t 1 ] && command -v clear >/dev/null 2>&1; then
        clear
    fi
}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$INSTALL_LOG" >&2 || true
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$INSTALL_LOG" >&2
    print_error "$1"
    return 1
}

# ============================================================================
# Core functions from original script (simplified for menu version)
# ============================================================================

check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20 or later."
        return 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 20 ]; then
        error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 20 or later."
        return 1
    fi
    
    log "Node.js $NODE_VERSION detected"
    return 0
}

check_npm() {
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm."
        return 1
    fi
    
    log "npm $(npm --version) detected"
    return 0
}

check_installed_version() {
    if command -v elementify-mcp &> /dev/null; then
        INSTALLED_VERSION=$(elementify-mcp --version 2>/dev/null || echo "unknown")
        echo "$INSTALLED_VERSION"
        return 0
    else
        echo "not_installed"
        return 1
    fi
}

# ============================================================================
# Menu System
# ============================================================================

show_main_menu() {
    clear_screen
    print_header "Elementify MCP" "Interactive Control Center"
    
    # Show quick status
    local version=$(check_installed_version)
    if [ "$version" != "not_installed" ]; then
        print_success "Elementify MCP: $version"
    else
        print_warning "Elementify MCP: Not installed"
    fi
    
    if [ -f "$CONFIG_FILE" ]; then
        print_success "Config: $CONFIG_FILE"
    else
        print_warning "Config: Not found"
    fi
    
    echo ""
    echo "${BOLD}Available actions:${RESET}"
    echo ""
    echo "  1)  Install           Install/update Elementify MCP server"
    echo "  2)  Setup             Configure WordPress site (interactive)"
    echo "  3)  Status            Detailed installation status"
    echo "  4)  Config            Configure MCP clients and AI agents"
    echo "  5)  Update            Check for and install updates"
    echo "  6)  Uninstall         Remove Elementify MCP"
    echo ""
    echo "  7)  Quick Setup       Guided installation and configuration"
    echo "  8)  Client Status     Show detected MCP clients and agents"
    echo ""
    echo "  h)  Help              Show usage information"
    echo "  q)  Quit              Exit menu"
    echo ""
    
    print_prompt
    read -r choice
    
    case "$choice" in
        1)
            run_install
            ;;
        2)
            run_setup
            ;;
        3)
            run_status
            ;;
        4)
            run_config
            ;;
        5)
            run_update
            ;;
        6)
            run_uninstall
            ;;
        7)
            run_quick_setup
            ;;
        8)
            run_client_status
            ;;
        h|H|help)
            show_help
            ;;
        q|Q|quit)
            echo ""
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_warning "Invalid choice. Please try again."
            pause
            ;;
    esac
}

run_install() {
    print_header "Install Elementify MCP" "Install or update the MCP server"
    
    if ! check_node || ! check_npm; then
        pause
        return 1
    fi
    
    local version=$(check_installed_version)
    if [ "$version" != "not_installed" ]; then
        print_info "Elementify MCP is already installed: $version"
        echo ""
        echo "What would you like to do?"
        echo "  1) Reinstall (keep configuration)"
        echo "  2) Install fresh (clean install)"
        echo "  3) Return to main menu"
        echo ""
        
        print_prompt
        read -r choice
        
        case "$choice" in
            1)
                print_info "Reinstalling Elementify MCP..."
                # Call original install logic
                install_mcp_server
                init_config
                print_success "Reinstallation complete"
                ;;
            2)
                print_warning "This will remove existing installation. Continue? (y/N)"
                print_prompt
                read -r confirm
                if [[ "$confirm" =~ ^[Yy]$ ]]; then
                    uninstall_mcp_server
                    install_mcp_server
                    init_config
                    print_success "Fresh installation complete"
                fi
                ;;
            *)
                return
                ;;
        esac
    else
        print_info "Installing Elementify MCP..."
        install_mcp_server
        init_config
        print_success "Installation complete"
    fi
    
    pause
}

run_setup() {
    print_header "Setup Configuration" "Configure WordPress sites and API keys"
    
    local version=$(check_installed_version)
    if [ "$version" = "not_installed" ]; then
        print_warning "Elementify MCP is not installed. Please install first."
        pause
        return 1
    fi
    
    echo "Options:"
    echo "  1) Add new WordPress site"
    echo "  2) View current configuration"
    echo "  3) Edit configuration manually"
    echo "  4) Return to main menu"
    echo ""
    
    print_prompt
    read -r choice
    
    case "$choice" in
        1)
            setup_config
            ;;
        2)
            if [ -f "$CONFIG_FILE" ]; then
                echo ""
                echo "Current configuration:"
                if command -v python3 &> /dev/null; then
                    python3 -m json.tool "$CONFIG_FILE" 2>/dev/null || cat "$CONFIG_FILE"
                elif command -v jq &> /dev/null; then
                    jq . "$CONFIG_FILE"
                else
                    cat "$CONFIG_FILE"
                fi
            else
                print_warning "No configuration file found."
            fi
            pause
            ;;
        3)
            print_info "Opening configuration file..."
            if command -v nano &> /dev/null; then
                nano "$CONFIG_FILE"
            elif command -v vim &> /dev/null; then
                vim "$CONFIG_FILE"
            elif command -v vi &> /dev/null; then
                vi "$CONFIG_FILE"
            else
                print_error "No text editor found. Please edit manually: $CONFIG_FILE"
            fi
            pause
            ;;
        *)
            return
            ;;
    esac
}

run_status() {
    print_header "Detailed Status" "Comprehensive installation status"
    
    # Check Node.js
    if check_node > /dev/null 2>&1; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js: Not installed or version too old"
    fi
    
    # Check npm
    if check_npm > /dev/null 2>&1; then
        print_success "npm: $(npm --version)"
    else
        print_error "npm: Not installed"
    fi
    
    # Check MCP server
    local INSTALLED_VERSION=$(check_installed_version)
    if [ "$INSTALLED_VERSION" != "not_installed" ]; then
        print_success "Elementify MCP: $INSTALLED_VERSION"
    else
        print_error "Elementify MCP: Not installed"
    fi
    
    # Check config
    if [ -f "$CONFIG_FILE" ]; then
        print_success "Config file: $CONFIG_FILE"
        # Count sites
        if command -v python3 &> /dev/null; then
            SITE_COUNT=$(python3 -c "import json; f=open('$CONFIG_FILE'); data=json.load(f); print(len(data.get('sites', [])))" 2>/dev/null || echo "0")
            echo "  Configured sites: $SITE_COUNT"
        elif command -v jq &> /dev/null; then
            SITE_COUNT=$(jq '.sites | length' "$CONFIG_FILE" 2>/dev/null || echo "0")
            echo "  Configured sites: $SITE_COUNT"
        fi
    else
        print_warning "Config file: Not found (run setup to create)"
    fi
    
    echo ""
    
    pause
}

run_config() {
    print_header "Configure MCP Clients" "Setup MCP clients and AI agents"
    
    local version=$(check_installed_version)
    if [ "$version" = "not_installed" ]; then
        print_warning "Elementify MCP is not installed. Please install first."
        pause
        return 1
    fi
    
    echo "This feature configures Elementify for detected MCP clients."
    echo ""
    echo "Please run the original install script for full client configuration:"
    echo ""
    echo "  ./scripts/install-elementify.sh config"
    echo ""
    echo "This will provide interactive client selection and configuration."
    
    pause
}

run_update() {
    print_header "Update Elementify MCP" "Check for and install updates"
    
    local version=$(check_installed_version)
    if [ "$version" = "not_installed" ]; then
        print_warning "Elementify MCP is not installed. Please install first."
        pause
        return 1
    fi
    
    print_info "Checking for updates..."
    
    # Check latest version
    local LATEST_VERSION="unknown"
    if command -v npm &> /dev/null; then
        LATEST_VERSION=$(npm view "$NPM_PACKAGE" version 2>/dev/null || echo "unknown")
    fi
    
    print_info "Installed version: $version"
    print_info "Latest version: $LATEST_VERSION"
    
    if [ "$version" = "$LATEST_VERSION" ] && [ "$LATEST_VERSION" != "unknown" ]; then
        print_success "Already up to date"
    else
        echo ""
        echo "Would you like to update? (y/N)"
        print_prompt
        read -r choice
        
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            print_info "Updating Elementify MCP..."
            if command -v npm &> /dev/null; then
                npm update -g "$NPM_PACKAGE"
                if [ $? -eq 0 ]; then
                    print_success "Update successful"
                else
                    print_error "Update failed"
                fi
            else
                print_error "npm not available"
            fi
        fi
    fi
    
    pause
}

run_uninstall() {
    print_header "Uninstall Elementify MCP" "Remove installation and configuration"
    
    local version=$(check_installed_version)
    if [ "$version" = "not_installed" ]; then
        print_warning "Elementify MCP is not installed."
        pause
        return 1
    fi
    
    print_warning "WARNING: This will remove Elementify MCP from your system."
    echo ""
    echo "Options:"
    echo "  1) Uninstall (keep configuration)"
    echo "  2) Uninstall (remove configuration)"
    echo "  3) Cancel and return"
    echo ""
    
    print_prompt
    read -r choice
    
    case "$choice" in
        1)
            print_warning "Uninstall Elementify MCP? (y/N)"
            print_prompt
            read -r confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                uninstall_mcp_server
                print_success "Uninstallation complete (configuration kept)"
            fi
            ;;
        2)
            print_warning "Uninstall Elementify MCP AND remove configuration? (y/N)"
            print_prompt
            read -r confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                uninstall_mcp_server
                if [ -d "$CONFIG_DIR" ]; then
                    rm -rf "$CONFIG_DIR"
                    print_info "Removed config directory: $CONFIG_DIR"
                fi
                print_success "Uninstallation complete (configuration removed)"
            fi
            ;;
        *)
            return
            ;;
    esac
    
    pause
}

run_quick_setup() {
    print_header "Quick Setup" "Guided installation and configuration"
    
    echo "This will guide you through the complete setup process:"
    echo ""
    echo "  1) Check system requirements"
    echo "  2) Install Elementify MCP"
    echo "  3) Configure WordPress site"
    echo ""
    echo "Start quick setup? (y/N)"
    print_prompt
    read -r choice
    
    if [[ ! "$choice" =~ ^[Yy]$ ]]; then
        return
    fi
    
    # Step 1: Check requirements
    print_header "Step 1: System Check" "Verifying requirements"
    
    if ! check_node || ! check_npm; then
        pause
        return 1
    fi
    
    print_success "System requirements met"
    pause
    
    # Step 2: Install
    print_header "Step 2: Installation" "Installing Elementify MCP"
    
    local version=$(check_installed_version)
    if [ "$version" != "not_installed" ]; then
        print_info "Elementify MCP is already installed: $version"
        echo ""
        echo "Continue with setup? (y/N)"
        print_prompt
        read -r continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            return
        fi
    else
        install_mcp_server
        init_config
    fi
    
    pause
    
    # Step 3: Configure
    print_header "Step 3: Configuration" "Setting up WordPress site"
    
    echo "Would you like to configure a WordPress site now? (y/N)"
    print_prompt
    read -r configure_choice
    
    if [[ "$configure_choice" =~ ^[Yy]$ ]]; then
        setup_config
    else
        print_info "You can configure a site later using the Setup menu."
    fi
    
    # Completion
    print_header "Quick Setup Complete" "Elementify MCP is ready to use"
    
    print_success "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  • Configure MCP clients using the Config menu"
    echo "  • Check status using the Status menu"
    echo "  • Add more WordPress sites using the Setup menu"
    echo ""
    
    pause
}

run_client_status() {
    print_header "Client Status" "MCP client and AI agent detection"
    
    print_info "Checking for MCP clients and AI agents..."
    echo ""
    
    # Simple detection (simplified from original)
    echo "Common MCP clients:"
    echo "  • Claude Desktop: $(check_file "$HOME/Library/Application Support/Claude/claude_desktop_config.json" "$HOME/.config/Claude/claude_desktop_config.json")"
    echo "  • Cursor: $(check_file "$HOME/.cursor/mcp.json")"
    echo "  • Windsurf: $(check_file "$HOME/.config/windsurf/config.json")"
    echo "  • Continue: $(check_file "$HOME/.continue/config.json")"
    echo ""
    
    echo "Common AI agents:"
    echo "  • opencode: $(check_file "$HOME/.config/opencode/opencode.json")"
    echo "  • codex: $(check_file "$HOME/.codex/config.toml")"
    echo "  • gemini-cli: $(check_file "$HOME/.gemini/settings.json" "$HOME/.gemini-cli/settings.json")"
    echo "  • qwen: $(check_file "$HOME/.qwen/settings.json")"
    
    echo ""
    print_info "For detailed client configuration, use the Config menu or run:"
    echo "  ./scripts/install-elementify.sh config"
    
    pause
}

check_file() {
    for file in "$@"; do
        if [ -f "$file" ]; then
            echo "✓ Found"
            return 0
        fi
    done
    echo "○ Not found"
}

show_help() {
    print_header "Help" "Usage information and documentation"
    
    echo "Elementify MCP provides WordPress management capabilities"
    echo "through the Model Context Protocol (MCP)."
    echo ""
    echo "Key features:"
    echo "  • Manage WordPress sites (posts, pages, media, etc.)"
    echo "  • Interactive menu system for easy management"
    echo ""
    echo "Command-line usage (without menu):"
    echo "  ./scripts/install-elementify.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  install    - Install Elementify MCP"
    echo "  update     - Update to latest version"
    echo "  setup      - Interactive setup with token input"
    echo "  status     - Check installation status"
    echo "  uninstall  - Remove installation"
    echo "  config     - Configure MCP clients"
    echo "  help       - Show this help message"
    echo ""
    
    pause
}

# ============================================================================
# Core installation functions (simplified)
# ============================================================================

install_mcp_server() {
    log "Installing Elementify MCP..."
    
    if command -v elementify-mcp &> /dev/null; then
        local version=$(elementify-mcp --version 2>/dev/null || echo "unknown")
        log "✓ Elementify MCP already installed: $version"
        return 0
    fi
    
    log "Trying npm installation from registry..."
    
    npm install -g "$NPM_PACKAGE"
    if [ $? -eq 0 ]; then
        log "✓ MCP server installed via npm"
        return 0
    fi
    
    # npm installation failed, try local installation
    log "npm installation failed. Trying local installation from repository..."
    
    if [ -d "$SOURCE_DIR/mcp-server" ]; then
        log "  Found local repository at: $SOURCE_DIR"
        
        if [ -f "$SOURCE_DIR/mcp-server/dist/cli.js" ]; then
            log "  Found built MCP server in dist/"
            
            local target_dir="/usr/local/bin"
            if [ ! -w "$target_dir" ]; then
                target_dir="$HOME/.local/bin"
                mkdir -p "$target_dir"
            fi
            
            local wrapper="$target_dir/elementify-mcp"
            cat > "$wrapper" << EOF
#!/bin/bash
exec node "$SOURCE_DIR/mcp-server/dist/cli.js" "\$@"
EOF
            chmod +x "$wrapper"
            log "  Created wrapper at: $wrapper"
            log "✓ MCP server installed locally"
            return 0
        else
            log "  Building MCP server from source..."
            cd "$SOURCE_DIR"
            if npm run build 2>&1 | tee -a "$INSTALL_LOG"; then
                log "✓ Build successful"
                
                local target_dir="/usr/local/bin"
                if [ ! -w "$target_dir" ]; then
                    target_dir="$HOME/.local/bin"
                    mkdir -p "$target_dir"
                fi
                
                local wrapper="$target_dir/elementify-mcp"
                cat > "$wrapper" << EOF
#!/bin/bash
exec node "$SOURCE_DIR/mcp-server/dist/cli.js" "\$@"
EOF
                chmod +x "$wrapper"
                log "  Created wrapper at: $wrapper"
                log "✓ MCP server built and installed locally"
                return 0
            else
                error "Failed to build MCP server from source"
                return 1
            fi
        fi
    else
        error "Failed to install via npm and no local repository found"
        return 1
    fi
}

init_config() {
    log "Initializing Elementify configuration..."
    
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        log "  Created config directory: $CONFIG_DIR"
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log "  Creating initial configuration..."
        if command -v elementify-mcp &> /dev/null; then
            elementify-mcp init
        else
            cat > "$CONFIG_FILE" << EOF
{
  "sites": [
    {
      "id": "my-site",
      "name": "My WordPress Site",
      "url": "https://example.com",
      "apiKey": "ek_replace_with_your_api_key",
      "activationMode": "standalone-free",
      "default": true
    }
  ]
}
EOF
            log "  Created config file: $CONFIG_FILE"
        fi
    else
        log "  Config file already exists: $CONFIG_FILE"
    fi
    
    log "✓ Configuration initialized"
    return 0
}

setup_config() {
    print_header "Elementify MCP Setup" "Configure WordPress site"
    
    if ! command -v elementify-mcp &> /dev/null; then
        print_error "Elementify MCP is not installed."
        echo "Please run installation first."
        pause
        return 1
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        print_info "Creating initial configuration..."
        init_config
    fi
    
    echo "Current configuration:"
    echo "----------------------"
    if [ -f "$CONFIG_FILE" ]; then
        if command -v python3 &> /dev/null; then
            python3 -m json.tool "$CONFIG_FILE" 2>/dev/null || cat "$CONFIG_FILE"
        else
            cat "$CONFIG_FILE"
        fi
    else
        echo "No configuration found."
    fi
    
    echo ""
    echo "Add new WordPress site"
    echo "----------------------"
    
    local site_id=""
    local site_name=""
    local site_url=""
    local api_key=""
    
    # Get site ID
    while [ -z "$site_id" ]; do
        echo -n "Site ID (e.g., 'my-site'): "
        read site_id
        if [ -z "$site_id" ]; then
            echo "Site ID cannot be empty."
        fi
    done
    
    # Get site name
    while [ -z "$site_name" ]; do
        echo -n "Site name (e.g., 'My WordPress Site'): "
        read site_name
        if [ -z "$site_name" ]; then
            echo "Site name cannot be empty."
        fi
    done
    
    # Get site URL
    while [ -z "$site_url" ]; do
        echo -n "WordPress site URL (e.g., 'https://example.com'): "
        read site_url
        if [ -z "$site_url" ]; then
            echo "Site URL cannot be empty."
        elif [[ ! "$site_url" =~ ^https?:// ]]; then
            echo "Please enter a valid URL starting with http:// or https://"
            site_url=""
        fi
    done
    
    # Get API key
    while [ -z "$api_key" ]; do
        echo -n "API key (starts with 'ek_'): "
        read api_key
        if [ -z "$api_key" ]; then
            echo "API key cannot be empty."
        elif [[ ! "$api_key" =~ ^ek_ ]]; then
            echo "API key should start with 'ek_'."
            echo "Generate one in WordPress: Settings → Elementify MCP"
            api_key=""
        fi
    done
    
    echo ""
    print_info "Adding site to configuration..."
    
    # Update config file
    if command -v python3 &> /dev/null; then
        python3 -c "
import json
import sys

try:
    with open('$CONFIG_FILE', 'r') as f:
        config = json.load(f)
except:
    config = {'sites': []}

if 'sites' not in config:
    config['sites'] = []

# Remove existing site with same ID if it exists
config['sites'] = [site for site in config['sites'] if site.get('id') != '$site_id']

# Add new site
new_site = {
    'id': '$site_id',
    'name': '$site_name',
    'url': '$site_url',
    'apiKey': '$api_key',
    'default': len(config['sites']) == 0
}

config['sites'].append(new_site)

with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
"
        if [ $? -eq 0 ]; then
            print_success "Site '$site_name' added to configuration"
        else
            print_error "Failed to update configuration"
        fi
    elif command -v jq &> /dev/null; then
        jq --arg id "$site_id" \
           --arg name "$site_name" \
           --arg url "$site_url" \
           --arg key "$api_key" \
           '.sites |= map(select(.id != $id)) + [{"id": $id, "name": $name, "url": $url, "apiKey": $key, "default": (.sites | length == 0)}]' \
           "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
        if [ $? -eq 0 ]; then
            print_success "Site '$site_name' added to configuration"
        else
            print_error "Failed to update configuration"
        fi
    else
        print_error "Neither python3 nor jq found. Cannot update configuration."
    fi
    
    echo ""
    print_info "Configuration saved to: $CONFIG_FILE"
    
    pause
}

uninstall_mcp_server() {
    log "Uninstalling Elementify MCP..."
    
    # Check installation method
    local installed_via_npm=0
    local installed_locally=0
    local wrapper_path=""
    
    # Check if installed via npm
    if npm list -g "$NPM_PACKAGE" 2>/dev/null | grep -q "$NPM_PACKAGE"; then
        installed_via_npm=1
    fi
    
    # Check for local wrapper
    if command -v elementify-mcp &> /dev/null; then
        local cmd_path=$(which elementify-mcp)
        # Check if it's our wrapper script (contains our source path)
        if [ -f "$cmd_path" ] && head -n5 "$cmd_path" 2>/dev/null | grep -q "exec node.*$SOURCE_DIR/mcp-server/dist/cli.js"; then
            installed_locally=1
            wrapper_path="$cmd_path"
        elif [[ "$cmd_path" == *"/.local/bin/"* ]] || [[ "$cmd_path" == *"$HOME/.local/bin/"* ]]; then
            installed_locally=1
            wrapper_path="$cmd_path"
        fi
    fi
    
    if [ $installed_via_npm -eq 1 ]; then
        print_info "Found npm installation, uninstalling via npm..."
        npm uninstall -g "$NPM_PACKAGE"
        if [ $? -eq 0 ]; then
            print_success "npm package uninstalled"
        else
            print_error "Failed to uninstall via npm"
        fi
    fi
    
    if [ $installed_locally -eq 1 ] && [ -n "$wrapper_path" ]; then
        print_info "Found local installation at: $wrapper_path"
        rm -f "$wrapper_path"
        print_success "Local wrapper removed"
    fi
    
    if [ $installed_via_npm -eq 0 ] && [ $installed_locally -eq 0 ]; then
        print_warning "No Elementify MCP installation found"
    else
        print_success "MCP server uninstalled"
    fi
    
    return 0
}

# ============================================================================
# Main entry point
# ============================================================================

main() {
    log "Starting Elementify MCP installer"
    
    # If no arguments, show menu
    if [ $# -eq 0 ]; then
        while true; do
            show_main_menu
        done
    fi
    
    # Parse command line arguments
    local command=""
    local QUIET=""
    local DRY_RUN=""
    local REMOVE_CONFIG=""
    
    while [ $# -gt 0 ]; do
        case "$1" in
            install|update|setup|status|uninstall|config|help)
                command="$1"
                ;;
            --quiet)
                QUIET=1
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --remove-config)
                REMOVE_CONFIG=1
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done
    
    # Execute command
    case "$command" in
        install)
            run_install
            ;;
        update)
            run_update
            ;;
        setup)
            run_setup
            ;;
        status)
            run_status
            ;;
        uninstall)
            run_uninstall
            ;;
        config)
            run_config
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
    
    log "Elementify installer finished"
}

main "$@"