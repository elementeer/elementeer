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

# ============================================================================
# Import ALL functions from the original install script
# We'll source it directly to get all functionality
# ============================================================================

# First, define essential logging functions that the original script expects
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$INSTALL_LOG" >&2 || true
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$INSTALL_LOG" >&2
    print_error "$1"
    return 1
}

# Now source the original script to get all its functions
# We need to do this carefully to avoid infinite recursion
import_original_functions() {
    # Define a flag so the original script knows it's being sourced
    export ELEMENTIFY_MENU_MODE=1
    
    # Source the original script
    source "$SOURCE_DIR/scripts/install-elementify.sh.backup"
}

# Try to import functions
import_original_functions 2>/dev/null || {
    # If sourcing fails, we'll define minimal versions of key functions
    print_warning "Could not import original functions. Using minimal implementation."
    
    # Minimal fallback functions
    check_node() {
        if ! command -v node &> /dev/null; then
            error "Node.js is not installed."
            return 1
        fi
        return 0
    }
    
    check_npm() {
        if ! command -v npm &> /dev/null; then
            error "npm is not installed."
            return 1
        fi
        return 0
    }
    
    check_installed_version() {
        if command -v elementify-mcp &> /dev/null; then
            elementify-mcp --version 2>/dev/null || echo "unknown"
        else
            echo "not_installed"
        fi
    }
    
    # Export these functions
    export -f check_node check_npm check_installed_version
}

# ============================================================================
# Menu System
# ============================================================================

show_main_menu() {
    clear_screen
    print_header "Elementify MCP" "Interactive Control Center"
    
    # Show quick status
    local version=$(check_installed_version 2>/dev/null || echo "not_installed")
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
            run_install_menu
            ;;
        2)
            run_setup_menu
            ;;
        3)
            run_status_menu
            ;;
        4)
            run_config_menu
            ;;
        5)
            run_update_menu
            ;;
        6)
            run_uninstall_menu
            ;;
        7)
            run_quick_setup_menu
            ;;
        8)
            run_client_status_menu
            ;;
        h|H|help)
            show_help_menu
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

run_install_menu() {
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
                # Use original install command
                bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" install
                print_success "Reinstallation complete"
                ;;
            2)
                print_warning "This will remove existing installation. Continue? (y/N)"
                print_prompt
                read -r confirm
                if [[ "$confirm" =~ ^[Yy]$ ]]; then
                    bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" uninstall
                    bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" install
                    print_success "Fresh installation complete"
                fi
                ;;
            *)
                return
                ;;
        esac
    else
        print_info "Installing Elementify MCP..."
        bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" install
        print_success "Installation complete"
    fi
    
    pause
}

run_setup_menu() {
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
            bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" setup
            pause
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

run_status_menu() {
    print_header "Detailed Status" "Comprehensive installation status"
    
    bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" status
    pause
}

run_config_menu() {
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

run_update_menu() {
    print_header "Update Elementify MCP" "Check for and install updates"
    
    local version=$(check_installed_version)
    if [ "$version" = "not_installed" ]; then
        print_warning "Elementify MCP is not installed. Please install first."
        pause
        return 1
    fi
    
    print_info "Checking for updates..."
    bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" update --dry-run
    
    echo ""
    echo "Would you like to install available updates? (y/N)"
    print_prompt
    read -r choice
    
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" update
    fi
    
    pause
}

run_uninstall_menu() {
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
                bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" uninstall
                print_success "Uninstallation complete (configuration kept)"
            fi
            ;;
        2)
            print_warning "Uninstall Elementify MCP AND remove configuration? (y/N)"
            print_prompt
            read -r confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" uninstall --remove-config
                print_success "Uninstallation complete (configuration removed)"
            fi
            ;;
        *)
            return
            ;;
    esac
    
    pause
}

run_quick_setup_menu() {
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
        bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" install
    fi
    
    pause
    
    # Step 3: Configure
    print_header "Step 3: Configuration" "Setting up WordPress site"
    
    echo "Would you like to configure a WordPress site now? (y/N)"
    print_prompt
    read -r configure_choice
    
    if [[ "$configure_choice" =~ ^[Yy]$ ]]; then
        bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" setup
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

run_client_status_menu() {
    print_header "Client Status" "MCP client and AI agent detection"
    
    print_info "Checking for MCP clients and AI agents..."
    echo ""
    
    # Run the original script's status which includes client detection
    bash "$SOURCE_DIR/scripts/install-elementify.sh.backup" status | grep -A 50 "MCP Client and AI Agent Detection" || {
        echo "Client detection not available in current output."
        echo ""
        echo "For detailed client configuration, run:"
        echo "  ./scripts/install-elementify.sh config"
    }
    
    pause
}

show_help_menu() {
    print_header "Help" "Usage information and documentation"
    
    echo "Elementify MCP provides WordPress management capabilities"
    echo "through the Model Context Protocol (MCP)."
    echo ""
    echo "Key features:"
    echo "  • Manage WordPress sites (posts, pages, media, etc.)"
    echo "  • Support for multiple MCP clients (Claude Desktop, Cursor, etc.)"
    echo "  • Support for AI agents (opencode, codex, gemini-cli, etc.)"
    echo "  • Interactive menu system for easy management"
    echo ""
    echo "For detailed documentation, visit:"
    echo "  https://github.com/elementify/mcp"
    echo ""
    echo "Command-line usage (without menu):"
    echo "  ./scripts/install-elementify.sh [command]"
    echo ""
    echo "Available commands: install, update, setup, status, uninstall, config, help"
    echo ""
    
    pause
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
    
    # Otherwise, pass through to original script
    exec "$SOURCE_DIR/scripts/install-elementify.sh.backup" "$@"
}

main "$@"