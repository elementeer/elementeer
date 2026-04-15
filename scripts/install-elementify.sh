#!/bin/bash

# Elementify MCP Installer
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

# MCP Client configuration arrays (Bash 3.x compatible)
MCP_CLIENT_NAMES=(
    "claude-desktop"
    "cursor"
    "windsurf"
    "continue"
    "tabby"
    "aider"
)

MCP_CLIENT_PATHS=(
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"  # macOS
    "$HOME/.cursor/mcp.json"
    "$HOME/.config/windsurf/config.json"
    "$HOME/.continue/config.json"
    "$HOME/.tabby/agent/config.json"
    "$HOME/.aider/config.json"
)

# Alternative paths for different OS
MCP_CLIENT_ALT_PATHS=(
    "$HOME/.config/Claude/claude_desktop_config.json"  # Linux
    ""  # cursor - no alt path
    ""  # windsurf - no alt path
    ""  # continue - no alt path
    "$HOME/.tabby/config.toml"  # tabby alt
    ""  # aider - no alt path
)

# AI Agent configuration (some support MCP servers, some only skills)
AI_AGENT_NAMES=(
    "opencode"
    "codex"
    "gemini-cli"
    "antigravity"
    "openclaw"
    "qwen"
    "elementify-installer"
)

AI_AGENT_PATHS=(
    "$HOME/.config/opencode/opencode.json"
    "$HOME/.codex/config.toml"
    "$HOME/.gemini/settings.json"
    "$HOME/.gemini/antigravity/mcp_config.json"
    "$HOME/.config/openclaw/config.json"
    "$HOME/.qwen/settings.json"
    "$HOME/.elementify/installer.json"
)

AI_AGENT_TYPES=(
    "json"  # opencode
    "toml"  # codex
    "json"  # gemini-cli
    "json"  # antigravity
    "json"  # openclaw
    "json"  # qwen
    "json"  # elementify-installer
)

AI_AGENT_ALT_PATHS=(
    ""  # opencode - no alt
    ""  # codex - no alt
    "$HOME/.gemini-cli/settings.json"  # gemini-cli alt
    "$HOME/.antigravity/config.json"  # antigravity alt (legacy path)
    ""  # openclaw - no alt
    ""  # qwen - no alt
    ""  # elementify-installer - no alt
)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$INSTALL_LOG" >&2 || true
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$INSTALL_LOG" >&2
    return 1
}

check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20 or later."
        echo ""
        echo "Installation options:"
        echo "  - macOS: brew install node"
        echo "  - Linux: Use your package manager (apt, yum, etc.)"
        echo "  - Windows: Download from https://nodejs.org/"
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

get_node_path() {
    # Try to find the full path to node executable
    # Check common installation locations
    
    local node_paths=(
        "$(command -v node 2>/dev/null)"  # Standard PATH
        "/opt/homebrew/bin/node"          # Homebrew on Apple Silicon
        "/usr/local/bin/node"             # Homebrew on Intel / system
        "/usr/bin/node"                   # System Node (Linux)
        "$HOME/.nvm/versions/*/bin/node"  # nvm installations
        "$HOME/.asdf/shims/node"          # asdf installation
        "/opt/node/bin/node"              # Alternative installation
    )
    
    for path in "${node_paths[@]}"; do
        # Expand glob patterns
        if [[ "$path" == *"*"* ]]; then
            # Find the latest nvm version
            local expanded_path=$(ls -d $path 2>/dev/null | sort -V | tail -n1)
            if [ -n "$expanded_path" ] && [ -x "$expanded_path" ]; then
                echo "$expanded_path"
                return 0
            fi
        elif [ -n "$path" ] && [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    # Fallback: use 'node' from PATH (might fail if not in agent's PATH)
    echo "node"
    log "WARNING: Could not find absolute path to node, using 'node' from PATH"
    log "  If MCP servers fail to start, ensure 'node' is in your PATH"
    return 1
}

get_wrapper_path() {
    # Get absolute path to elementify-mcp wrapper
    if command -v elementify-mcp &> /dev/null; then
        local wrapper_path=$(command -v elementify-mcp)
        echo "$wrapper_path"
        return 0
    fi
    
    # Check common locations
    local common_paths=(
        "/usr/local/bin/elementify-mcp"
        "/usr/bin/elementify-mcp"
        "$HOME/.local/bin/elementify-mcp"
        "/opt/homebrew/bin/elementify-mcp"
    )
    
    for path in "${common_paths[@]}"; do
        if [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    echo "elementify-mcp"
    log "WARNING: Could not find absolute wrapper path, using 'elementify-mcp'"
    log "  AI agents may fail to find the executable"
    return 1
}

repair_existing_wrapper() {
    # Check and repair existing wrapper if it uses plain 'node' instead of full path
    local wrapper_path=""
    
    # Find existing wrapper
    if command -v elementify-mcp &> /dev/null; then
        wrapper_path=$(command -v elementify-mcp)
    else
        return 0  # No wrapper found, nothing to repair
    fi
    
    if [ ! -f "$wrapper_path" ]; then
        return 0
    fi
    
    # Check if wrapper uses plain 'node' (without full path)
    if grep -q "^exec node " "$wrapper_path" 2>/dev/null; then
        log "Found wrapper using plain 'node': $wrapper_path"
        local node_path=$(get_node_path)
        
        if [ "$node_path" = "node" ]; then
            log "  Cannot repair: could not determine absolute node path"
            return 1
        fi
        
        log "  Repairing with node path: $node_path"
        
        # Create backup
        local backup_path="${wrapper_path}.backup.$(date +%s)"
        cp "$wrapper_path" "$backup_path"
        log "  Created backup: $backup_path"
        
        # Replace the wrapper
        cat > "$wrapper_path" << EOF
#!/bin/bash
# Elementify MCP wrapper (repaired)
# Node.js path: $node_path
exec "$node_path" "$SOURCE_DIR/mcp-server/dist/cli.js" "\$@"
EOF
        chmod +x "$wrapper_path"
        log "✓ Wrapper repaired"
        return 0
    fi
    
    return 0
}

# MCP Client detection and management functions

mcp_client_exists() {
    local client_name="$1"
    local client_path=""
    local alt_path=""
    
    # Find client in arrays
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        if [ "${MCP_CLIENT_NAMES[$i]}" = "$client_name" ]; then
            client_path="${MCP_CLIENT_PATHS[$i]}"
            alt_path="${MCP_CLIENT_ALT_PATHS[$i]}"
            break
        fi
    done
    
    if [ -z "$client_path" ]; then
        return 1
    fi
    
    # Check if primary path exists
    if [ -f "$client_path" ]; then
        echo "$client_path"
        return 0
    fi
    
    # Check alternative path if exists
    if [ -n "$alt_path" ] && [ -f "$alt_path" ]; then
        echo "$alt_path"
        return 0
    fi
    
    return 1
}

check_mcp_client_config() {
    local client_name="$1"
    local config_path="$2"
    
    if [ ! -f "$config_path" ]; then
        echo "not_found"
        return 1
    fi
    
    # Check if it's valid JSON
    if command -v python3 &> /dev/null; then
        if ! python3 -m json.tool "$config_path" > /dev/null 2>&1; then
            echo "invalid_json"
            return 1
        fi
    elif command -v jq &> /dev/null; then
        if ! jq empty "$config_path" > /dev/null 2>&1; then
            echo "invalid_json"
            return 1
        fi
    fi
    
    # Check if elementify is already configured
    if command -v python3 &> /dev/null; then
        if python3 -c "import json; f=open('$config_path'); data=json.load(f); print('elementify_configured' if 'mcpServers' in data and 'elementify' in data.get('mcpServers', {}) else 'not_configured')" 2>/dev/null; then
            return 0
        fi
    elif command -v jq &> /dev/null; then
        if jq -e '.mcpServers.elementify' "$config_path" > /dev/null 2>&1; then
            echo "elementify_configured"
        else
            echo "not_configured"
        fi
        return 0
    fi
    
    echo "unknown"
    return 0
}

add_elementify_to_config() {
    local client_name="$1"
    local config_path="$2"
    
    log "  Adding Elementify to $client_name configuration..."
    
    # Get absolute wrapper path for consistent configuration
    local wrapper_path="elementify-mcp"
    if command -v elementify-mcp &> /dev/null; then
        wrapper_path=$(command -v elementify-mcp)
        log "    Using wrapper path: $wrapper_path"
    else
        log "    WARNING: Could not find elementify-mcp in PATH, using 'elementify-mcp'"
        log "    MCP clients may fail to find the executable"
    fi
    
    if [ ! -f "$config_path" ]; then
        # Create empty config file
        if [ -z "$DRY_RUN" ]; then
            mkdir -p "$(dirname "$config_path")"
            echo '{}' > "$config_path"
        fi
    fi
    
    # Read and update config
    if command -v python3 &> /dev/null; then
        if [ -z "$DRY_RUN" ]; then
            python3 -c "
import json, sys
try:
    with open('$config_path', 'r') as f:
        config = json.load(f)
except:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['elementify'] = {'command': '$wrapper_path'}

with open('$config_path', 'w') as f:
    json.dump(config, f, indent=2)
" || return 1
        else
            log "  Would add elementify to mcpServers in $config_path"
        fi
    elif command -v jq &> /dev/null; then
        if [ -z "$DRY_RUN" ]; then
            jq --arg wrapper "$wrapper_path" '.mcpServers.elementify = {"command": $wrapper}' "$config_path" > "${config_path}.tmp" && mv "${config_path}.tmp" "$config_path" || return 1
        else
            log "  Would add elementify to mcpServers in $config_path"
        fi
    else
        error "  Neither python3 nor jq found. Cannot update JSON config."
        return 1
    fi
    
    log "  ✓ Elementify added to $client_name configuration"
    return 0
}

remove_elementify_from_config() {
    local client_name="$1"
    local config_path="$2"
    
    log "  Removing Elementify from $client_name configuration..."
    
    if [ ! -f "$config_path" ]; then
        log "  Config file not found: $config_path"
        return 0
    fi
    
    if command -v python3 &> /dev/null; then
        if [ -z "$DRY_RUN" ]; then
            python3 -c "
import json, sys
try:
    with open('$config_path', 'r') as f:
        config = json.load(f)
except:
    config = {}

if 'mcpServers' in config and 'elementify' in config['mcpServers']:
    del config['mcpServers']['elementify']
    # Remove empty mcpServers object
    if not config['mcpServers']:
        del config['mcpServers']

with open('$config_path', 'w') as f:
    json.dump(config, f, indent=2)
" || return 1
        else
            log "  Would remove elementify from mcpServers in $config_path"
        fi
    elif command -v jq &> /dev/null; then
        if [ -z "$DRY_RUN" ]; then
            jq 'del(.mcpServers.elementify) | if .mcpServers == {} then del(.mcpServers) else . end' "$config_path" > "${config_path}.tmp" && mv "${config_path}.tmp" "$config_path" || return 1
        else
            log "  Would remove elementify from mcpServers in $config_path"
        fi
    else
        error "  Neither python3 nor jq found. Cannot update JSON config."
        return 1
    fi
    
    log "  ✓ Elementify removed from $client_name configuration"
    return 0
}

show_mcp_clients_status() {
    echo "MCP Client Detection"
    echo "===================="
    echo ""
    
    local found_clients=0
    
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        local client="${MCP_CLIENT_NAMES[$i]}"
        local config_path
        
        config_path=$(mcp_client_exists "$client")
        if [ $? -eq 0 ]; then
            echo "  ✓ $client: $config_path"
            ((found_clients++))
            
            # Check config status
            local config_status=$(check_mcp_client_config "$client" "$config_path")
            case "$config_status" in
                "elementify_configured")
                    echo "      ✓ Elementify already configured"
                    ;;
                "not_configured")
                    echo "      ○ Elementify not configured"
                    ;;
                "invalid_json")
                    echo "      ⚠ Configuration file has invalid JSON"
                    ;;
                "not_found")
                    echo "      ✗ Configuration file not found"
                    ;;
            esac
        else
            echo "  ○ $client: not found"
        fi
    done
    
    echo ""
    if [ $found_clients -eq 0 ]; then
        echo "No MCP clients detected. You may need to install one."
        echo "Popular options: Claude Desktop, Cursor, Windsurf, Continue"
    else
        echo "Found $found_clients MCP client(s)"
    fi
    
    return $found_clients
}

interactive_select_clients() {
    echo "Elementify MCP Client Selection" >&2
    echo "================================" >&2
    echo "" >&2
    echo "Available MCP clients:" >&2
    
    local clients=()
    local client_paths=()
    local client_status=()
    local index=1
    
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        local client="${MCP_CLIENT_NAMES[$i]}"
        local config_path
        
        config_path=$(mcp_client_exists "$client")
        if [ $? -eq 0 ]; then
            clients+=("$client")
            client_paths+=("$config_path")
            
            # Check if elementify is already configured
            local config_status=$(check_mcp_client_config "$client" "$config_path")
            if [ "$config_status" = "elementify_configured" ]; then
                client_status+=("configured")
                echo "  $index. ✓ $client: $config_path (already configured)" >&2
            else
                client_status+=("not_configured")
                echo "  $index. ○ $client: $config_path" >&2
            fi
            ((index++))
        fi
    done
    
    if [ ${#clients[@]} -eq 0 ]; then
        echo "  No MCP clients found." >&2
        echo "" >&2
        return 1
    fi
    
    echo "" >&2
    echo "Select clients to configure (enter numbers separated by commas, 'all', or 'none'):" >&2
    echo "  'all' = all detected clients" >&2
    echo "  'none' = skip client configuration" >&2
    echo -n "> " >&2
    
    local selection=""
    read selection
    
    case "$selection" in
        [Aa][Ll][Ll])
            echo "Selected: all clients (${#clients[@]} clients)" >&2
            # Output arrays in structured format
            # First line: count
            echo "${#clients[@]}"
            # Then each item on its own line
            printf '%s\n' "${clients[@]}"
            printf '%s\n' "${client_paths[@]}"
            ;;
        [Nn][Oo][Nn][Ee])
            echo "No clients selected. Skipping client configuration." >&2
            echo "" >&2
            return 1
            ;;
        *)
            # Parse comma-separated numbers
            local selected_clients=()
            local selected_paths=()
            IFS=',' read -ra numbers <<< "$selection"
            for num in "${numbers[@]}"; do
                # Trim whitespace
                num=$(echo "$num" | tr -d '[:space:]')
                if [[ "$num" =~ ^[0-9]+$ ]]; then
                    local idx=$((num - 1))
                    if [ $idx -ge 0 ] && [ $idx -lt ${#clients[@]} ]; then
                        selected_clients+=("${clients[$idx]}")
                        selected_paths+=("${client_paths[$idx]}")
                    else
                        echo "Warning: Invalid number $num. Skipping." >&2
                    fi
                fi
            done
            
            if [ ${#selected_clients[@]} -eq 0 ]; then
                echo "No valid clients selected. Skipping." >&2
                return 1
            fi
            
            echo "Selected: ${selected_clients[*]}" >&2
            # Output arrays in structured format
            echo "${#selected_clients[@]}"
            printf '%s\n' "${selected_clients[@]}"
            printf '%s\n' "${selected_paths[@]}"
            ;;
    esac
}

configure_mcp_clients() {
    local mode="$1"  # "add" or "remove"
    
    echo ""
    show_mcp_clients_status
    
    # Skip prompt in non-interactive mode
    if [ -n "$AUTO_YES" ]; then
        echo "Auto-configuring MCP clients (non-interactive mode)..."
        answer="yes"
    else
        echo ""
        echo "Would you like to configure MCP clients? (yes/no)"
        echo -n "> "
        
        local answer=""
        read answer
        
        if [[ ! "$answer" =~ ^[Yy](es)?$ ]]; then
            echo "Skipping client configuration."
            return 0
        fi
    fi
    
    local selection_result
    selection_result=$(interactive_select_clients)
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Parse the structured output
    local count=0
    local selected_clients=()
    local selected_paths=()
    
    # Read count (first line)
    count=$(echo "$selection_result" | head -n1)
    if ! [[ "$count" =~ ^[0-9]+$ ]] || [ "$count" -eq 0 ]; then
        error "Invalid output from selection"
        return 1
    fi
    
    # Read names (next 'count' lines)
    selected_clients=()
    for ((i=0; i<count; i++)); do
        selected_clients[i]=$(echo "$selection_result" | sed -n "$((i+2))p")
    done
    
    # Read paths (next 'count' lines after names)
    for ((i=0; i<count; i++)); do
        selected_paths[i]=$(echo "$selection_result" | sed -n "$((i+2+count))p")
    done
    
    local success_count=0
    local total_count=${#selected_clients[@]}
    
    for i in "${!selected_clients[@]}"; do
        local client="${selected_clients[$i]}"
        local config_path="${selected_paths[$i]}"
        
        if [ "$mode" = "add" ]; then
            if add_elementify_to_config "$client" "$config_path"; then
                ((success_count++))
            fi
        elif [ "$mode" = "remove" ]; then
            if remove_elementify_from_config "$client" "$config_path"; then
                ((success_count++))
            fi
        fi
    done
    
    echo ""
    if [ "$mode" = "add" ]; then
        echo "Client configuration complete: $success_count/$total_count clients configured"
        echo "Restart your MCP client(s) to load Elementify."
    elif [ "$mode" = "remove" ]; then
        echo "Client configuration removed: $success_count/$total_count clients updated"
    fi
    
    return 0
}

# AI Agent detection and configuration functions

ai_agent_exists() {
    local agent_name="$1"
    local agent_path=""
    local alt_path=""
    
    # Find agent in arrays
    for i in "${!AI_AGENT_NAMES[@]}"; do
        if [ "${AI_AGENT_NAMES[$i]}" = "$agent_name" ]; then
            agent_path="${AI_AGENT_PATHS[$i]}"
            alt_path="${AI_AGENT_ALT_PATHS[$i]}"
            break
        fi
    done
    
    if [ -z "$agent_path" ]; then
        return 1
    fi
    
    # Check if primary path exists
    if [ -f "$agent_path" ]; then
        echo "$agent_path"
        return 0
    fi
    
    # Check alternative path if exists
    if [ -n "$alt_path" ] && [ -f "$alt_path" ]; then
        echo "$alt_path"
        return 0
    fi
    
    return 1
}

check_ai_agent_config() {
    local agent_name="$1"
    local config_path="$2"
    local agent_type=""
    
    # Get agent type
    for i in "${!AI_AGENT_NAMES[@]}"; do
        if [ "${AI_AGENT_NAMES[$i]}" = "$agent_name" ]; then
            agent_type="${AI_AGENT_TYPES[$i]}"
            break
        fi
    done
    
    if [ -z "$agent_type" ]; then
        echo "unknown_type"
        return 1
    fi
    
    if [ ! -f "$config_path" ]; then
        echo "not_found"
        return 1
    fi
    
    # Check if elementify is already configured
    if [ "$agent_type" = "json" ]; then
        if command -v python3 &> /dev/null; then
            if python3 -c "
import json, sys
try:
    with open('$config_path', 'r') as f:
        data = json.load(f)
except:
    sys.exit(1)

# Check different possible MCP configurations
if 'mcpServers' in data and 'elementify' in data['mcpServers']:
    print('elementify_configured')
elif 'mcp' in data and 'elementify' in data['mcp']:
    print('elementify_configured')
else:
    print('not_configured')
" 2>/dev/null; then
                return 0
            else
                echo "invalid_json"
                return 1
            fi
        elif command -v jq &> /dev/null; then
            if jq -e '.mcpServers.elementify' "$config_path" > /dev/null 2>&1; then
                echo "elementify_configured"
            elif jq -e '.mcp.elementify' "$config_path" > /dev/null 2>&1; then
                echo "elementify_configured"
            else
                echo "not_configured"
            fi
            return 0
        else
            echo "no_json_tool"
            return 1
        fi
    elif [ "$agent_type" = "toml" ]; then
        # Check TOML file (codex)
        if command -v python3 &> /dev/null; then
            # Try to parse TOML with tomllib (Python 3.11+)
            if python3 -c "
try:
    import tomllib
    with open('$config_path', 'rb') as f:
        data = tomllib.load(f)
except ImportError:
    # Fallback to tomli if installed
    try:
        import tomli as tomllib
        with open('$config_path', 'rb') as f:
            data = tomllib.load(f)
    except ImportError:
        sys.exit(1)
except:
    sys.exit(1)

# Check for mcp_servers in TOML
if 'mcp_servers' in data and 'elementify' in data['mcp_servers']:
    print('elementify_configured')
else:
    print('not_configured')
" 2>/dev/null; then
                return 0
            else
                echo "invalid_toml"
                return 1
            fi
        else
            echo "no_toml_tool"
            return 1
        fi
    fi
    
    echo "unknown"
    return 0
}

add_elementify_to_ai_agent() {
    local agent_name="$1"
    local config_path="$2"
    local agent_type=""
    
    # Get agent type
    for i in "${!AI_AGENT_NAMES[@]}"; do
        if [ "${AI_AGENT_NAMES[$i]}" = "$agent_name" ]; then
            agent_type="${AI_AGENT_TYPES[$i]}"
            break
        fi
    done
    
    if [ -z "$agent_type" ]; then
        error "  Unknown agent type: $agent_name"
        return 1
    fi
    
    log "  Adding Elementify to $agent_name configuration..."
    
    # Get absolute wrapper path for AI agents (they often have restricted PATH)
    local wrapper_path="elementify-mcp"
    if command -v elementify-mcp &> /dev/null; then
        wrapper_path=$(command -v elementify-mcp)
        log "    Using wrapper path: $wrapper_path"
    else
        log "    WARNING: Could not find elementify-mcp in PATH, using 'elementify-mcp'"
        log "    AI agents may fail to find the executable"
    fi
    
    if [ ! -f "$config_path" ]; then
        # Create empty config file based on type
        if [ -z "$DRY_RUN" ]; then
            mkdir -p "$(dirname "$config_path")"
            if [ "$agent_type" = "json" ]; then
                echo '{}' > "$config_path"
            elif [ "$agent_type" = "toml" ]; then
                touch "$config_path"
            fi
        fi
    fi
    
    if [ "$agent_type" = "json" ]; then
        # JSON configuration (opencode, gemini, etc.)
        if command -v python3 &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                python3 -c "
import json, sys, os
try:
    with open('$config_path', 'r') as f:
        config = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    config = {}

# Different agents use different MCP structures
if '$agent_name' == 'opencode':
    if 'mcp' not in config:
        config['mcp'] = {}
    # opencode requires type and enabled fields
    config['mcp']['elementify'] = {
        'type': 'local',
        'enabled': True,
        'command': ['$wrapper_path']
    }
else:
    # Default to mcpServers structure (gemini, etc.)
    if 'mcpServers' not in config:
        config['mcpServers'] = {}
    config['mcpServers']['elementify'] = {'command': '$wrapper_path'}

with open('$config_path', 'w') as f:
    json.dump(config, f, indent=2)
" || return 1
            else
                log "  Would add elementify to $config_path"
            fi
        elif command -v jq &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                if [ "$agent_name" = "opencode" ]; then
                    jq --arg wrapper "$wrapper_path" '.mcp.elementify = {"type": "local", "enabled": true, "command": [$wrapper]}' "$config_path" > "${config_path}.tmp" && mv "${config_path}.tmp" "$config_path" || return 1
                else
                    jq --arg wrapper "$wrapper_path" '.mcpServers.elementify = {"command": $wrapper}' "$config_path" > "${config_path}.tmp" && mv "${config_path}.tmp" "$config_path" || return 1
                fi
            else
                log "  Would add elementify to $config_path"
            fi
        else
            error "  Neither python3 nor jq found. Cannot update JSON config."
            return 1
        fi
    elif [ "$agent_type" = "toml" ]; then
        # TOML configuration (codex)
        if command -v python3 &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                python3 -c "
import sys, os
try:
    import tomllib
    with open('$config_path', 'rb') as f:
        config = tomllib.load(f)
except ImportError:
    try:
        import tomli as tomllib
        with open('$config_path', 'rb') as f:
            config = tomllib.load(f)
    except ImportError:
        # Create empty config if tomli not available
        config = {}
except FileNotFoundError:
    config = {}
except:
    config = {}

# Add elementify to mcp_servers
if 'mcp_servers' not in config:
    config['mcp_servers'] = {}
config['mcp_servers']['elementify'] = {'command': '$wrapper_path'}

# Write back as TOML (need tomli-w for writing)
try:
    import tomli_w
    with open('$config_path', 'wb') as f:
        tomli_w.dump(config, f)
except ImportError:
    # Fallback: write as INI-like TOML (simplified)
    with open('$config_path', 'a') as f:
        f.write('\n[mcp_servers.elementify]\n')
        f.write('command = \"$wrapper_path\"\n')
" || return 1
            else
                log "  Would add elementify to $config_path (TOML)"
            fi
        else
            error "  Python3 required for TOML configuration. Cannot update TOML config."
            return 1
        fi
    fi
    
    log "  ✓ Elementify added to $agent_name configuration"
    return 0
}

remove_elementify_from_ai_agent() {
    local agent_name="$1"
    local config_path="$2"
    local agent_type=""
    
    # Get agent type
    for i in "${!AI_AGENT_NAMES[@]}"; do
        if [ "${AI_AGENT_NAMES[$i]}" = "$agent_name" ]; then
            agent_type="${AI_AGENT_TYPES[$i]}"
            break
        fi
    done
    
    if [ -z "$agent_type" ]; then
        error "  Unknown agent type: $agent_name"
        return 1
    fi
    
    log "  Removing Elementify from $agent_name configuration..."
    
    if [ ! -f "$config_path" ]; then
        log "  Config file not found: $config_path"
        return 0
    fi
    
    if [ "$agent_type" = "json" ]; then
        if command -v python3 &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                python3 -c "
import json, sys
try:
    with open('$config_path', 'r') as f:
        config = json.load(f)
except:
    config = {}

# Remove from both possible structures
if 'mcpServers' in config and 'elementify' in config['mcpServers']:
    del config['mcpServers']['elementify']
    if not config['mcpServers']:
        del config['mcpServers']

if 'mcp' in config and 'elementify' in config['mcp']:
    del config['mcp']['elementify']
    if not config['mcp']:
        del config['mcp']

with open('$config_path', 'w') as f:
    json.dump(config, f, indent=2)
" || return 1
            else
                log "  Would remove elementify from $config_path"
            fi
        elif command -v jq &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                # Try both structures
                jq 'del(.mcpServers.elementify) | del(.mcp.elementify) | if .mcpServers == {} then del(.mcpServers) else . end | if .mcp == {} then del(.mcp) else . end' "$config_path" > "${config_path}.tmp" && mv "${config_path}.tmp" "$config_path" || return 1
            else
                log "  Would remove elementify from $config_path"
            fi
        else
            error "  Neither python3 nor jq found. Cannot update JSON config."
            return 1
        fi
    elif [ "$agent_type" = "toml" ]; then
        if command -v python3 &> /dev/null; then
            if [ -z "$DRY_RUN" ]; then
                python3 -c "
import sys
try:
    import tomllib
    with open('$config_path', 'rb') as f:
        config = tomllib.load(f)
except ImportError:
    try:
        import tomli as tomllib
        with open('$config_path', 'rb') as f:
            config = tomllib.load(f)
    except ImportError:
        sys.exit(0)
except:
    sys.exit(0)

# Remove elementify from mcp_servers
if 'mcp_servers' in config and 'elementify' in config['mcp_servers']:
    del config['mcp_servers']['elementify']
    if not config['mcp_servers']:
        del config['mcp_servers']

# Write back
try:
    import tomli_w
    with open('$config_path', 'wb') as f:
        tomli_w.dump(config, f)
except ImportError:
    # Can't write TOML without tomli-w, skip
    pass
" || return 1
            else
                log "  Would remove elementify from $config_path (TOML)"
            fi
        else
            error "  Python3 required for TOML configuration. Cannot update TOML config."
            return 1
        fi
    fi
    
    log "  ✓ Elementify removed from $agent_name configuration"
    return 0
}

show_all_clients_status() {
    echo "MCP Client and AI Agent Detection"
    echo "=================================="
    echo ""
    
    local found_mcp_clients=0
    local found_ai_agents=0
    
    echo "MCP Clients:"
    echo "------------"
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        local client="${MCP_CLIENT_NAMES[$i]}"
        local config_path
        
        config_path=$(mcp_client_exists "$client")
        if [ $? -eq 0 ]; then
            echo "  ✓ $client: $config_path"
            ((found_mcp_clients++))
            
            local config_status=$(check_mcp_client_config "$client" "$config_path")
            case "$config_status" in
                "elementify_configured")
                    echo "      ✓ Elementify already configured"
                    ;;
                "not_configured")
                    echo "      ○ Elementify not configured"
                    ;;
                "invalid_json")
                    echo "      ⚠ Configuration file has invalid JSON"
                    ;;
                "not_found")
                    echo "      ✗ Configuration file not found"
                    ;;
            esac
        else
            echo "  ○ $client: not found"
        fi
    done
    
    echo ""
    echo "AI Agents:"
    echo "----------"
    for i in "${!AI_AGENT_NAMES[@]}"; do
        local agent="${AI_AGENT_NAMES[$i]}"
        local config_path
        
        config_path=$(ai_agent_exists "$agent")
        if [ $? -eq 0 ]; then
            echo "  ✓ $agent: $config_path"
            ((found_ai_agents++))
            
            local config_status=$(check_ai_agent_config "$agent" "$config_path")
            case "$config_status" in
                "elementify_configured")
                    echo "      ✓ Elementify already configured"
                    ;;
                "not_configured")
                    echo "      ○ Elementify not configured"
                    ;;
                "invalid_json"|"invalid_toml")
                    echo "      ⚠ Configuration file has invalid format"
                    ;;
                "no_json_tool"|"no_toml_tool")
                    echo "      ⚠ Cannot check configuration (missing tools)"
                    ;;
                "not_found")
                    echo "      ✗ Configuration file not found"
                    ;;
                "unknown_type")
                    echo "      ⚠ Unknown agent type"
                    ;;
            esac
        else
            echo "  ○ $agent: not found"
        fi
    done
    
    echo ""
    local total_found=$((found_mcp_clients + found_ai_agents))
    if [ $total_found -eq 0 ]; then
        echo "No MCP clients or AI agents detected."
        echo "You may need to install one of the supported tools."
    else
        echo "Found $found_mcp_clients MCP client(s) and $found_ai_agents AI agent(s)"
    fi
    
    return $total_found
}

interactive_select_all() {
    local all_items=()
    local all_paths=()
    local all_types=()  # "mcp" or "ai"
    local all_status=()
    local index=1
    
    # First collect all items
    # Add MCP clients
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        local client="${MCP_CLIENT_NAMES[$i]}"
        local config_path
        
        config_path=$(mcp_client_exists "$client")
        if [ $? -eq 0 ]; then
            all_items+=("$client")
            all_paths+=("$config_path")
            all_types+=("mcp")
            
            local config_status=$(check_mcp_client_config "$client" "$config_path")
            if [ "$config_status" = "elementify_configured" ]; then
                all_status+=("configured")
            else
                all_status+=("not_configured")
            fi
            ((index++))
        fi
    done
    
    # Add AI agents
    for i in "${!AI_AGENT_NAMES[@]}"; do
        local agent="${AI_AGENT_NAMES[$i]}"
        local config_path
        
        config_path=$(ai_agent_exists "$agent")
        if [ $? -eq 0 ]; then
            all_items+=("$agent")
            all_paths+=("$config_path")
            all_types+=("ai")
            
            local config_status=$(check_ai_agent_config "$agent" "$config_path")
            if [ "$config_status" = "elementify_configured" ]; then
                all_status+=("configured")
            else
                all_status+=("not_configured")
            fi
            ((index++))
        fi
    done
    
    if [ ${#all_items[@]} -eq 0 ]; then
        echo "  No MCP clients or AI agents found." >&2
        echo "" >&2
        return 1
    fi
    
    echo "Elementify MCP Configuration" >&2
    echo "=============================" >&2
    echo "" >&2
    echo "Detected ${#all_items[@]} agent(s)" >&2
    echo "" >&2
    echo "Select agents to configure:" >&2
    
    # Display all items with numbering
    local display_index=1
    for i in "${!all_items[@]}"; do
        local name="${all_items[$i]}"
        local status="${all_status[$i]}"
        
        if [ "$status" = "configured" ]; then
            echo "  $display_index. ✓ $name" >&2
        else
            echo "  $display_index. ○ $name" >&2
        fi
        ((display_index++))
    done
    
    echo "" >&2
    echo "Enter selection (comma-separated numbers, 'all', or 'none'):" >&2
    echo -n "> " >&2
    
    local selection=""
    read selection
    
    case "$selection" in
        [Aa][Ll][Ll])
            echo "Selected: all items (${#all_items[@]} items)" >&2
            # Output arrays in structured format
            # First line: count
            echo "${#all_items[@]}"
            # Then each item on its own line
            printf '%s\n' "${all_items[@]}"
            printf '%s\n' "${all_paths[@]}"
            printf '%s\n' "${all_types[@]}"
            ;;
        [Nn][Oo][Nn][Ee])
            echo "No items selected. Skipping configuration." >&2
            echo "" >&2
            return 1
            ;;
        *)
            # Parse comma-separated numbers
            local selected_items=()
            local selected_paths=()
            local selected_types=()
            IFS=',' read -ra numbers <<< "$selection"
            for num in "${numbers[@]}"; do
                # Trim whitespace
                num=$(echo "$num" | tr -d '[:space:]')
                if [[ "$num" =~ ^[0-9]+$ ]]; then
                    local idx=$((num - 1))
                    if [ $idx -ge 0 ] && [ $idx -lt ${#all_items[@]} ]; then
                        selected_items+=("${all_items[$idx]}")
                        selected_paths+=("${all_paths[$idx]}")
                        selected_types+=("${all_types[$idx]}")
                    else
                        echo "Warning: Invalid number $num. Skipping." >&2
                    fi
                fi
            done
            
            if [ ${#selected_items[@]} -eq 0 ]; then
                echo "No valid items selected. Skipping." >&2
                return 1
            fi
            
            echo "Selected: ${selected_items[*]}" >&2
            # Output arrays in structured format
            echo "${#selected_items[@]}"
            printf '%s\n' "${selected_items[@]}"
            printf '%s\n' "${selected_paths[@]}"
            printf '%s\n' "${selected_types[@]}"
            ;;
    esac
}

configure_all_noninteractive() {
    local mode="$1"  # "add" or "remove"
    
    log "Non-interactive configuration mode: $mode"
    
    local success_count=0
    local total_count=0
    
    # Configure MCP clients
    for i in "${!MCP_CLIENT_NAMES[@]}"; do
        local client="${MCP_CLIENT_NAMES[$i]}"
        local config_path
        
        config_path=$(mcp_client_exists "$client")
        if [ $? -eq 0 ]; then
            ((total_count++))
            if [ "$mode" = "add" ]; then
                if add_elementify_to_config "$client" "$config_path"; then
                    ((success_count++))
                fi
            elif [ "$mode" = "remove" ]; then
                if remove_elementify_from_config "$client" "$config_path"; then
                    ((success_count++))
                fi
            fi
        fi
    done
    
    # Configure AI agents
    for i in "${!AI_AGENT_NAMES[@]}"; do
        local agent="${AI_AGENT_NAMES[$i]}"
        local config_path
        
        config_path=$(ai_agent_exists "$agent")
        if [ $? -eq 0 ]; then
            ((total_count++))
            if [ "$mode" = "add" ]; then
                if add_elementify_to_ai_agent "$agent" "$config_path"; then
                    ((success_count++))
                fi
            elif [ "$mode" = "remove" ]; then
                if remove_elementify_from_ai_agent "$agent" "$config_path"; then
                    ((success_count++))
                fi
            fi
        fi
    done
    
    log "Non-interactive configuration complete: $success_count/$total_count items"
    echo "Configuration complete: $success_count/$total_count items $mode"
    return 0
}

configure_all_clients() {
    local mode="$1"  # "add" or "remove"
    
    echo ""
    show_all_clients_status
    
    # Skip prompt in non-interactive mode
    if [ -n "$AUTO_YES" ]; then
        echo "Auto-configuring MCP clients and AI agents (non-interactive mode)..."
        # Use non-interactive configuration for all detected clients
        configure_all_noninteractive "$mode"
        return $?
    else
        echo ""
        echo "Would you like to configure MCP clients and AI agents? (yes/no)"
        echo -n "> "
        
        local answer=""
        read answer
        
        if [[ ! "$answer" =~ ^[Yy](es)?$ ]]; then
            echo "Skipping client configuration."
            return 0
        fi
    fi
    
    local selection_result
    selection_result=$(interactive_select_all)
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Parse the structured output
    local count=0
    local selected_names=()
    local selected_paths=()
    local selected_types=()
    
    # Read count (first line)
    count=$(echo "$selection_result" | head -n1)
    if ! [[ "$count" =~ ^[0-9]+$ ]] || [ "$count" -eq 0 ]; then
        error "Invalid output from selection"
        return 1
    fi
    
    # Read names (next 'count' lines)
    selected_names=()
    for ((i=0; i<count; i++)); do
        selected_names[i]=$(echo "$selection_result" | sed -n "$((i+2))p")
    done
    
    # Read paths (next 'count' lines after names)
    for ((i=0; i<count; i++)); do
        selected_paths[i]=$(echo "$selection_result" | sed -n "$((i+2+count))p")
    done
    
    # Read types (next 'count' lines after paths)
    for ((i=0; i<count; i++)); do
        selected_types[i]=$(echo "$selection_result" | sed -n "$((i+2+count*2))p")
    done
    
    local success_count=0
    local total_count=${#selected_names[@]}
    
    for i in "${!selected_names[@]}"; do
        local name="${selected_names[$i]}"
        local config_path="${selected_paths[$i]}"
        local type="${selected_types[$i]}"
        
        if [ "$mode" = "add" ]; then
            if [ "$type" = "mcp" ]; then
                if add_elementify_to_config "$name" "$config_path"; then
                    ((success_count++))
                fi
            elif [ "$type" = "ai" ]; then
                if add_elementify_to_ai_agent "$name" "$config_path"; then
                    ((success_count++))
                fi
            fi
        elif [ "$mode" = "remove" ]; then
            if [ "$type" = "mcp" ]; then
                if remove_elementify_from_config "$name" "$config_path"; then
                    ((success_count++))
                fi
            elif [ "$type" = "ai" ]; then
                if remove_elementify_from_ai_agent "$name" "$config_path"; then
                    ((success_count++))
                fi
            fi
        fi
    done
    
    echo ""
    if [ "$mode" = "add" ]; then
        echo "Configuration complete: $success_count/$total_count items configured"
        echo "Restart your client(s) to load Elementify."
    elif [ "$mode" = "remove" ]; then
        echo "Configuration removed: $success_count/$total_count items updated"
    fi
    
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

check_latest_version() {
    # Try to get latest version from npm
    if command -v npm &> /dev/null; then
        LATEST_VERSION=$(npm view "$NPM_PACKAGE" version 2>/dev/null || echo "unknown")
        echo "$LATEST_VERSION"
        return 0
    else
        echo "unknown"
        return 1
    fi
}

install_mcp_server() {
    # Check if already installed
    if command -v elementify-mcp &> /dev/null; then
        local version=$(elementify-mcp --version 2>/dev/null || echo "unknown")
        log "✓ Elementify MCP already installed: $version"
        
        # Try to repair existing wrapper if needed
        repair_existing_wrapper
        return 0
    fi
    
    log "Installing Elementify MCP..."
    log "Trying npm installation from registry..."
    
    if [ -z "$DRY_RUN" ]; then
        npm install -g "$NPM_PACKAGE"
        if [ $? -eq 0 ]; then
            log "✓ MCP server installed via npm"
            return 0
        fi
        
        # npm installation failed, try local installation
        log "npm installation failed. Trying local installation from repository..."
        
        # Check if we're in the elementify-mcp repository
        if [ -d "$SOURCE_DIR/mcp-server" ]; then
            log "  Found local repository at: $SOURCE_DIR"
            
            # Check if build exists
            if [ -f "$SOURCE_DIR/mcp-server/dist/cli.js" ]; then
                log "  Found built MCP server in dist/"
                
                # Create symlink or copy to a location in PATH
                local target_dir="/usr/local/bin"
                if [ ! -w "$target_dir" ]; then
                    target_dir="$HOME/.local/bin"
                    mkdir -p "$target_dir"
                fi
                
                # Check if ~/.local/bin is in PATH
                if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
                    log "  WARNING: $HOME/.local/bin is not in your PATH"
                    log "  Add this to your shell profile:"
                    log "    export PATH=\"\$HOME/.local/bin:\$PATH\""
                fi
                
                # Create wrapper script
                local wrapper="$target_dir/elementify-mcp"
                local node_path=$(get_node_path)
                cat > "$wrapper" << EOF
#!/bin/bash
# Elementify MCP wrapper
# Node.js path: $node_path
exec "$node_path" "$SOURCE_DIR/mcp-server/dist/cli.js" "\$@"
EOF
                chmod +x "$wrapper"
                log "  Created wrapper at: $wrapper"
                log "  Using node path: $node_path"
                log "✓ MCP server installed locally"
                return 0
            else
                # Build from source
                log "  Building MCP server from source..."
                cd "$SOURCE_DIR"
                if npm run build 2>&1 | tee -a "$INSTALL_LOG"; then
                    log "✓ Build successful"
                    
                    # Now create wrapper as above
                    local target_dir="/usr/local/bin"
                    if [ ! -w "$target_dir" ]; then
                        target_dir="$HOME/.local/bin"
                        mkdir -p "$target_dir"
                    fi
                    
                    local wrapper="$target_dir/elementify-mcp"
                    local node_path=$(get_node_path)
                    cat > "$wrapper" << EOF
#!/bin/bash
# Elementify MCP wrapper
# Node.js path: $node_path
exec "$node_path" "$SOURCE_DIR/mcp-server/dist/cli.js" "\$@"
EOF
                    chmod +x "$wrapper"
                    log "  Created wrapper at: $wrapper"
                    log "  Using node path: $node_path"
                    log "✓ MCP server built and installed locally"
                    return 0
                else
                    error "Failed to build MCP server from source"
                    return 1
                fi
            fi
        else
            error "Failed to install via npm and no local repository found"
            error "Package @elementify/mcp is not published to npm registry"
            error "You can:"
            error "  1. Build from source: cd $SOURCE_DIR && npm run build"
            error "  2. Manually create symlink to mcp-server/dist/cli.js"
            return 1
        fi
    else
        log "  Would run: npm install -g $NPM_PACKAGE"
        log "  (Dry run: would try local installation if npm fails)"
    fi
    
    return 0
}

init_config() {
    log "Initializing Elementify configuration..."
    
    if [ ! -d "$CONFIG_DIR" ]; then
        if [ -z "$DRY_RUN" ]; then
            mkdir -p "$CONFIG_DIR"
            log "  Created config directory: $CONFIG_DIR"
        else
            log "  Would create directory: $CONFIG_DIR"
        fi
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log "  Creating initial configuration..."
        if [ -z "$DRY_RUN" ]; then
            if command -v elementify-mcp &> /dev/null; then
                elementify-mcp init
            else
                # Create basic config manually
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
            log "  Would create config file: $CONFIG_FILE"
        fi
    else
        log "  Config file already exists: $CONFIG_FILE"
    fi
    
    log "✓ Configuration initialized"
    return 0
}

show_status_json() {
    # Machine-readable JSON output for agents
    local node_ok=false
    local npm_ok=false
    local mcp_installed=false
    local config_exists=false
    local node_version=""
    local npm_version=""
    local installed_version=""
    local latest_version=""
    local site_count=0
    local update_available=false
    
    # Check Node.js
    if check_node > /dev/null 2>&1; then
        node_ok=true
        node_version=$(node --version)
    fi
    
    # Check npm
    if check_npm > /dev/null 2>&1; then
        npm_ok=true
        npm_version=$(npm --version)
    fi
    
    # Check MCP server
    installed_version=$(check_installed_version)
    if [ "$installed_version" != "not_installed" ]; then
        mcp_installed=true
        latest_version=$(check_latest_version)
        if [ "$latest_version" != "unknown" ] && [ "$installed_version" != "$latest_version" ]; then
            update_available=true
        fi
    fi
    
    # Check config
    if [ -f "$CONFIG_FILE" ]; then
        config_exists=true
        # Count sites
        if command -v python3 &> /dev/null; then
            site_count=$(python3 -c "import json; f=open('$CONFIG_FILE'); data=json.load(f); print(len(data.get('sites', [])))" 2>/dev/null || echo "0")
        elif command -v jq &> /dev/null; then
            site_count=$(jq '.sites | length' "$CONFIG_FILE" 2>/dev/null || echo "0")
        fi
    fi
    
    # Output JSON
    cat << EOF
{
  "node": {
    "installed": $node_ok,
    "version": "$node_version"
  },
  "npm": {
    "installed": $npm_ok,
    "version": "$npm_version"
  },
  "elementify_mcp": {
    "installed": $mcp_installed,
    "version": "$installed_version",
    "latest_version": "$latest_version",
    "update_available": $update_available
  },
  "config": {
    "exists": $config_exists,
    "path": "$CONFIG_FILE",
    "sites_count": $site_count
  },
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

show_agent_usage() {
    echo "Agent Native Usage"
    echo "=================="
    echo ""
    echo "The Elementify MCP Installer supports full non-interactive operation for AI agents."
    echo ""
    echo "Environment variables for non-interactive setup:"
    echo "  ELEMENTIFY_SITE_ID      Site identifier (e.g., 'my-site')"
    echo "  ELEMENTIFY_SITE_NAME    Site display name"
    echo "  ELEMENTIFY_SITE_URL     WordPress site URL"
    echo "  ELEMENTIFY_API_KEY      API key starting with 'ek_'"
    echo ""
    echo "Examples for agents:"
    echo "  1. Install Elementify MCP:"
    echo "     $0 install --quiet"
    echo ""
    echo "  2. Setup with environment variables:"
    echo "     export ELEMENTIFY_SITE_ID='my-site'"
    echo "     export ELEMENTIFY_SITE_NAME='My Site'"
    echo "     export ELEMENTIFY_SITE_URL='https://example.com'"
    echo "     export ELEMENTIFY_API_KEY='ek_your_key'"
    echo "     $0 setup --yes"
    echo ""
    echo "  3. Configure all MCP clients non-interactively:"
    echo "     $0 config --yes"
    echo ""
    echo "  4. Get machine-readable status:"
    echo "     $0 status --json"
    echo ""
    echo "  5. Update Elementify MCP:"
    echo "     $0 update --quiet"
    echo ""
    echo "All commands support --quiet for minimal output and --dry-run for simulation."
    echo "Exit codes: 0 = success, 1 = error, 2 = invalid arguments"
    echo ""
}

show_supported_clients() {
    echo "Supported MCP Clients and AI Agents"
    echo "==================================="
    echo ""
    echo "MCP Clients (uses 'mcpServers' JSON structure):"
    echo "  • claude-desktop"
    echo "    - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
    echo "    - Linux: ~/.config/Claude/claude_desktop_config.json"
    echo "    - Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
    echo "  • cursor: ~/.cursor/mcp.json"
    echo "  • windsurf: ~/.config/windsurf/config.json"
    echo "  • continue: ~/.continue/config.json"
    echo "  • tabby: ~/.tabby/agent/config.json (or ~/.tabby/config.toml)"
    echo "  • aider: ~/.aider/config.json"
    echo ""
    echo "AI Agents (uses various structures):"
    echo "  • opencode: ~/.config/opencode/opencode.json (uses 'mcp' object)"
    echo "  • codex: ~/.codex/config.toml (uses 'mcp_servers' TOML)"
    echo "  • gemini-cli: ~/.gemini/settings.json (or ~/.gemini-cli/settings.json)"
    echo "  • antigravity: ~/.gemini/antigravity/mcp_config.json (or ~/.antigravity/config.json) (uses 'mcpServers' like MCP clients)"
    echo "  • openclaw: ~/.config/openclaw/config.json"
    echo "  • qwen: ~/.qwen/settings.json"
    echo ""
    echo "The installer automatically detects which clients/agents are installed"
    echo "and configures them with the appropriate structure."
    echo ""
}

show_config_help() {
    echo ""
    echo "Elementify Configuration"
    echo "========================"
    echo ""
    echo "Config file location: $CONFIG_FILE"
    echo ""
    
    show_supported_clients
    
    show_agent_usage
    
    if [ -f "$CONFIG_FILE" ]; then
        echo "Current configuration:"
        cat "$CONFIG_FILE" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_FILE"
        echo ""
    fi
    
    echo "Next steps:"
    echo "  1. Install the Elementify MCP Plugin on your WordPress site"
    echo "  2. Generate an API key in Settings → Elementify MCP"
    echo "  3. Edit $CONFIG_FILE with your site URL and API key"
    echo "  4. Add to your MCP client config:"
    echo ""
    echo "     For Claude Desktop (config file location varies by OS):"
    echo "       ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)"
    echo "       %APPDATA%\\Claude\\claude_desktop_config.json (Windows)"
    echo "       ~/.config/Claude/claude_desktop_config.json (Linux)"
    echo ""
    echo "     Add this to the JSON configuration:"
    echo "       {"
    echo "         \"mcpServers\": {"
    echo "           \"elementify\": {"
    echo "             \"command\": \"elementify-mcp\""
    echo "           }"
    echo "         }"
    echo "       }"
    echo ""
    echo "  5. Restart your MCP client to load Elementify"
    echo ""
}

update_mcp_server() {
    log "Updating $NPM_PACKAGE..."
    
    INSTALLED_VERSION=$(check_installed_version)
    LATEST_VERSION=$(check_latest_version)
    
    if [ "$INSTALLED_VERSION" = "not_installed" ]; then
        error "Elementify MCP is not installed. Use --install first."
        return 1
    fi
    
    log "  Installed version: $INSTALLED_VERSION"
    log "  Latest version: $LATEST_VERSION"
    
    if [ "$INSTALLED_VERSION" = "$LATEST_VERSION" ] && [ "$LATEST_VERSION" != "unknown" ]; then
        log "✓ Already up to date"
        return 0
    fi
    
    if [ -z "$DRY_RUN" ]; then
        npm update -g "$NPM_PACKAGE"
        if [ $? -ne 0 ]; then
            error "Failed to update $NPM_PACKAGE"
            return 1
        fi
    else
        log "  Would run: npm update -g $NPM_PACKAGE"
    fi
    
    log "✓ MCP server updated"
    return 0
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
        if [ -f "$cmd_path" ] && head -n5 "$cmd_path" 2>/dev/null | grep -q "$SOURCE_DIR/mcp-server/dist/cli.js"; then
            installed_locally=1
            wrapper_path="$cmd_path"
        elif [[ "$cmd_path" == *"/.local/bin/"* ]] || [[ "$cmd_path" == *"$HOME/.local/bin/"* ]]; then
            # Also check for standard local bin paths
            installed_locally=1
            wrapper_path="$cmd_path"
        fi
    fi
    
    if [ $installed_via_npm -eq 1 ]; then
        log "  Found npm installation, uninstalling via npm..."
        if [ -z "$DRY_RUN" ]; then
            npm uninstall -g "$NPM_PACKAGE"
            if [ $? -ne 0 ]; then
                error "Failed to uninstall $NPM_PACKAGE via npm"
                # Continue to try local uninstall
            else
                log "  ✓ npm package uninstalled"
            fi
        else
            log "  Would run: npm uninstall -g $NPM_PACKAGE"
        fi
    fi
    
    if [ $installed_locally -eq 1 ] && [ -n "$wrapper_path" ]; then
        log "  Found local installation at: $wrapper_path"
        if [ -z "$DRY_RUN" ]; then
            rm -f "$wrapper_path"
            log "  ✓ Local wrapper removed"
        else
            log "  Would remove: $wrapper_path"
        fi
    fi
    
    if [ $installed_via_npm -eq 0 ] && [ $installed_locally -eq 0 ]; then
        log "  No Elementify MCP installation found"
    else
        log "✓ MCP server uninstalled"
    fi
    
    # Optionally remove config directory
    if [ "$REMOVE_CONFIG" = "1" ]; then
        if [ -d "$CONFIG_DIR" ]; then
            if [ -z "$DRY_RUN" ]; then
                rm -rf "$CONFIG_DIR"
                log "  Removed config directory: $CONFIG_DIR"
            else
                log "  Would remove config directory: $CONFIG_DIR"
            fi
        fi
    fi
    
    return 0
}

show_status() {
    echo "Elementify MCP Status"
    echo "====================="
    echo ""
    
    # Check Node.js
    if check_node > /dev/null 2>&1; then
        echo "✓ Node.js: $(node --version)"
    else
        echo "✗ Node.js: Not installed or version too old"
    fi
    
    # Check npm
    if check_npm > /dev/null 2>&1; then
        echo "✓ npm: $(npm --version)"
    else
        echo "✗ npm: Not installed"
    fi
    
    # Check MCP server
    INSTALLED_VERSION=$(check_installed_version)
    if [ "$INSTALLED_VERSION" != "not_installed" ]; then
        echo "✓ Elementify MCP: $INSTALLED_VERSION"
        
        # Check latest version
        LATEST_VERSION=$(check_latest_version)
        if [ "$LATEST_VERSION" != "unknown" ] && [ "$INSTALLED_VERSION" != "$LATEST_VERSION" ]; then
            echo "  Update available: $LATEST_VERSION (run with --update)"
        fi
    else
        echo "✗ Elementify MCP: Not installed"
    fi
    
    # Check config
    if [ -f "$CONFIG_FILE" ]; then
        echo "✓ Config file: $CONFIG_FILE"
        # Count sites
        if command -v python3 &> /dev/null; then
            SITE_COUNT=$(python3 -c "import json; f=open('$CONFIG_FILE'); data=json.load(f); print(len(data.get('sites', [])))" 2>/dev/null || echo "0")
            echo "  Configured sites: $SITE_COUNT"
        elif command -v jq &> /dev/null; then
            SITE_COUNT=$(jq '.sites | length' "$CONFIG_FILE" 2>/dev/null || echo "0")
            echo "  Configured sites: $SITE_COUNT"
        fi
    else
        echo "✗ Config file: Not found (run with --init)"
    fi
    
    echo ""
    
    # Show client and agent detection if Elementify is installed
    if [ "$INSTALLED_VERSION" != "not_installed" ]; then
        show_all_clients_status
        echo ""
    fi
}

show_usage() {
    cat << EOF
Elementify MCP Installer
========================

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  install           Install Elementify MCP server
  update            Update to latest version  
  setup             Setup configuration (interactive)
  status            Show installation status
  uninstall         Remove Elementify MCP
  config            Configure MCP clients
  docs              Show configuration documentation
  repair            Repair existing installation (node path, wrapper)
  help              Show this help message

Options:
  --quiet           Minimal output
  --dry-run         Simulate actions
  --remove-config   Remove config when uninstalling
  --json            Machine-readable JSON output (for agents)
  --yes             Automatic yes to all prompts (non-interactive)

Examples:
  $0 install        # Install Elementify MCP
  $0 setup          # Interactive setup with token input
  $0 status         # Check installation
  $0 update         # Update to latest version
  $0 uninstall      # Remove installation
  $0 config         # Configure MCP clients

EOF
}

setup_config() {
    echo "Elementify MCP Setup"
    echo "===================="
    echo ""
    
    # Check if elementify-mcp is installed
    if ! command -v elementify-mcp &> /dev/null; then
        echo "Elementify MCP is not installed."
        echo "Please run '$0 install' first."
        echo ""
        return 1
    fi
    
    # Initialize config if needed
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Creating initial configuration..."
        init_config
    fi
    
    echo "Current configuration:"
    echo "----------------------"
    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_FILE"
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
    
    # Non-interactive mode (for agents)
    if [ -n "$AUTO_YES" ]; then
        # Try environment variables first
        site_id="${ELEMENTIFY_SITE_ID}"
        site_name="${ELEMENTIFY_SITE_NAME}"
        site_url="${ELEMENTIFY_SITE_URL}"
        api_key="${ELEMENTIFY_API_KEY}"
        
        # Generate defaults if not provided
        if [ -z "$site_id" ]; then
            site_id="my-site-$(date +%s)"
            log "  Generated site ID: $site_id"
        fi
        
        if [ -z "$site_name" ]; then
            site_name="My WordPress Site"
            log "  Using default site name: $site_name"
        fi
        
        if [ -z "$site_url" ]; then
            site_url="https://example.com"
            log "  Using default URL: $site_url (please update with your actual site)"
        fi
        
        if [ -z "$api_key" ]; then
            api_key="ek_replace_with_your_api_key"
            log "  Using placeholder API key (please update with your actual key)"
        fi
        
        # Validate what we have
        if [[ ! "$site_url" =~ ^https?:// ]]; then
            log "  Warning: Site URL '$site_url' doesn't start with http:// or https://"
        fi
        
        if [[ ! "$api_key" =~ ^ek_ ]] && [ "$api_key" != "ek_replace_with_your_api_key" ]; then
            log "  Warning: API key should start with 'ek_'"
        fi
        
        echo "Using configuration:"
        echo "  Site ID: $site_id"
        echo "  Site name: $site_name"
        echo "  Site URL: $site_url"
        echo "  API key: ${api_key:0:10}..."  # Show only first 10 chars
        
    else
        # Interactive mode
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
    fi
    
    echo ""
    echo "Adding site to configuration..."
    
    # Read existing config or create new
    if [ ! -f "$CONFIG_FILE" ]; then
        mkdir -p "$CONFIG_DIR"
        echo '{"sites": []}' > "$CONFIG_FILE"
    fi
    
    # Add new site
    if command -v python3 &> /dev/null; then
        python3 -c "
import json, sys
try:
    with open('$CONFIG_FILE', 'r') as f:
        config = json.load(f)
except:
    config = {'sites': []}

# Remove existing site with same ID if present
config['sites'] = [s for s in config.get('sites', []) if s.get('id') != '$site_id']

# Add new site
new_site = {
    'id': '$site_id',
    'name': '$site_name',
    'url': '$site_url',
    'apiKey': '$api_key',
    'default': len(config['sites']) == 0  # First site is default
}

config['sites'].append(new_site)

with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
"
    elif command -v jq &> /dev/null; then
        # This is more complex with jq, using a simple approach
        temp_file="${CONFIG_FILE}.tmp"
        if [ ! -f "$CONFIG_FILE" ] || [ ! -s "$CONFIG_FILE" ]; then
            echo '{"sites": []}' > "$temp_file"
        else
            cp "$CONFIG_FILE" "$temp_file"
        fi
        
        # Remove existing site if present
        jq "del(.sites[] | select(.id == \"$site_id\"))" "$temp_file" > "${temp_file}.2" && mv "${temp_file}.2" "$temp_file"
        
        # Add new site
        jq --arg id "$site_id" \
           --arg name "$site_name" \
           --arg url "$site_url" \
           --arg key "$api_key" \
           '.sites += [{"id": $id, "name": $name, "url": $url, "apiKey": $key, "default": (.sites | length == 0)}]' \
           "$temp_file" > "$CONFIG_FILE" && rm -f "$temp_file"
    else
        echo "Error: Need python3 or jq to update configuration."
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✓ Site '$site_name' added to configuration."
        echo ""
        echo "Next steps:"
        echo "  1. Restart your MCP client to load changes"
        echo "  2. Test connection: elementify-mcp sites"
        return 0
    else
        echo "✗ Failed to update configuration."
        return 1
    fi
}

show_simple_status() {
    local script_name="$1"
    # Check if elementify-mcp is installed
    if command -v elementify-mcp &> /dev/null; then
        local version=$(elementify-mcp --version 2>/dev/null || echo "unknown")
        echo "✓ Elementify MCP: $version"
        
        # Check config
        if [ -f "$CONFIG_FILE" ]; then
            echo "✓ Config: $CONFIG_FILE"
            # Count sites
            if command -v python3 &> /dev/null; then
                local count=$(python3 -c "import json; f=open('$CONFIG_FILE'); data=json.load(f); print(len(data.get('sites', [])))" 2>/dev/null || echo "0")
                echo "  Sites: $count configured"
            elif command -v jq &> /dev/null; then
                local count=$(jq '.sites | length' "$CONFIG_FILE" 2>/dev/null || echo "0")
                echo "  Sites: $count configured"
            fi
        else
            echo "✗ Config: Not found (run '$script_name setup')"
        fi
    else
        echo "✗ Elementify MCP: Not installed"
        echo "  Run '$script_name install' to install"
    fi
}

# Menu functions
show_interactive_menu() {
    clear_screen
    print_header "Elementify MCP" "Interactive Control Center"
    
    # Show quick status
    if command -v elementify-mcp &> /dev/null; then
        local version=$(elementify-mcp --version 2>/dev/null || echo "unknown")
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
            echo ""
            echo "Installing Elementify MCP..."
            exec "$0" install
            ;;
        2)
            echo ""
            echo "Starting setup..."
            exec "$0" setup
            ;;
        3)
            echo ""
            echo "Showing status..."
            exec "$0" status
            ;;
        4)
            echo ""
            echo "Configuring clients..."
            exec "$0" config
            ;;
        5)
            echo ""
            echo "Checking for updates..."
            exec "$0" update
            ;;
        6)
            echo ""
            echo "Uninstalling..."
            exec "$0" uninstall
            ;;
        7)
            echo ""
            echo "Starting quick setup..."
            run_quick_setup
            ;;
        8)
            echo ""
            echo "Showing client status..."
            run_client_status
            ;;
        h|H|help)
            echo ""
            exec "$0" help
            ;;
        q|Q|quit)
            echo ""
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_warning "Invalid choice. Please try again."
            pause
            show_interactive_menu
            ;;
    esac
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
        show_interactive_menu
        return
    fi
    
    # Step 1: Check requirements
    print_header "Step 1: System Check" "Verifying requirements"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        echo "Please install Node.js 20 or later and try again."
        pause
        show_interactive_menu
        return
    else
        print_success "Node.js: $(node --version)"
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        echo "Please install npm and try again."
        pause
        show_interactive_menu
        return
    else
        print_success "npm: $(npm --version)"
    fi
    
    pause
    
    # Step 2: Install
    print_header "Step 2: Installation" "Installing Elementify MCP"
    
    if command -v elementify-mcp &> /dev/null; then
        print_info "Elementify MCP is already installed."
        echo ""
        echo "Continue with setup? (y/N)"
        print_prompt
        read -r continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            show_interactive_menu
            return
        fi
    else
        exec "$0" install
    fi
    
    pause
    
    # Step 3: Configure
    print_header "Step 3: Configuration" "Setting up WordPress site"
    
    echo "Would you like to configure a WordPress site now? (y/N)"
    print_prompt
    read -r configure_choice
    
    if [[ "$configure_choice" =~ ^[Yy]$ ]]; then
        exec "$0" setup
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
    show_interactive_menu
}

run_client_status() {
    print_header "Client Status" "MCP client and AI agent detection"
    
    echo "Checking for MCP clients and AI agents..."
    echo ""
    
    # Call the existing show_all_clients_status function if it exists
    if command -v show_all_clients_status &> /dev/null; then
        show_all_clients_status
    else
        echo "Client detection not available in current output."
        echo ""
        echo "For detailed client configuration, run:"
        echo "  $0 config"
    fi
    
    pause
    show_interactive_menu
}

main() {
    # Create log directory
    mkdir -p "$(dirname "$INSTALL_LOG")"
    
    log "Starting Elementify MCP installer"
    [ -n "$DRY_RUN" ] && log "DRY RUN MODE - simulating actions only"
    
    # Check for command
    if [ $# -eq 0 ]; then
        show_interactive_menu
        exit 0
    fi
    
    # Parse command (first argument)
    local command="$1"
    shift
    
    # Parse options
    while [ $# -gt 0 ]; do
        case "$1" in
            --quiet)
                QUIET=1
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --remove-config)
                REMOVE_CONFIG=1
                ;;
            --json)
                JSON_OUTPUT=1
                ;;
            --yes)
                AUTO_YES=1
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
    
    case "$command" in
        install)
            echo "Installing Elementify MCP..."
            if ! check_node || ! check_npm; then
                exit 1
            fi
            
            install_mcp_server
            init_config
            
            if [ -z "$QUIET" ]; then
                if [ -n "$JSON_OUTPUT" ]; then
                    show_status_json
                else
                    show_simple_status "$0"
                    echo ""
                    echo "Run '$0 setup' to configure your WordPress site."
                fi
            else
                echo "✓ Installation complete"
            fi
            ;;
            
        update)
            echo "Updating Elementify MCP..."
            if ! check_node || ! check_npm; then
                exit 1
            fi
            
            update_mcp_server
            
            if [ -z "$QUIET" ]; then
                if [ -n "$JSON_OUTPUT" ]; then
                    show_status_json
                else
                    show_simple_status "$0"
                fi
            else
                echo "✓ Update complete"
            fi
            ;;
            
        setup)
            setup_config
            ;;
            
        status)
            if [ -n "$JSON_OUTPUT" ]; then
                show_status_json
            else
                show_simple_status "$0"
            fi
            ;;
            
        uninstall)
            echo "Uninstalling Elementify MCP..."
            uninstall_mcp_server
            
            if [ -n "$REMOVE_CONFIG" ]; then
                echo "Configuration removed."
            fi
            
            if [ -z "$QUIET" ]; then
                echo "✓ Uninstallation complete"
            fi
            ;;
            
        config)
            if [ -z "$QUIET" ]; then
                configure_all_clients "add"
            else
                # Quiet mode: configure all without interactive prompts
                configure_all_noninteractive "add"
            fi
            ;;
            
        docs)
            show_config_help
            ;;
            
        repair)
            echo "Repairing Elementify MCP installation..."
            if ! check_node || ! check_npm; then
                exit 1
            fi
            
            repair_existing_wrapper
            
            if [ -z "$QUIET" ]; then
                if [ -n "$JSON_OUTPUT" ]; then
                    show_status_json
                else
                    show_simple_status "$0"
                    echo ""
                    echo "✓ Repair completed"
                fi
            else
                echo "✓ Repair completed"
            fi
            ;;
            
        help)
            show_usage
            ;;
            
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
    
    log "Elementify installer finished"
}

main "$@"