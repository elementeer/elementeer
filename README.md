# Elementify MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@elementify/mcp.svg)](https://www.npmjs.com/package/@elementify/mcp)
[![WordPress tested up to](https://img.shields.io/badge/WordPress-6.5-blue.svg)](https://wordpress.org)

**Elementor-native MCP server + WordPress plugin for AI-driven template management.**

Elementify MCP exposes your Elementor template library as a Model Context Protocol server, letting AI assistants read, create, update, and organize your templates — without 401 errors, without empty responses, and with fine-grained capability-scoped API keys.

---

## What it is

Elementify MCP is a dual-distribution product:

1. **WordPress Plugin** (`/plugin`) — Installs on your WP site, registers a REST API under `/wp-json/elementify/v1/`, handles authentication via `X-Elementify-Key` header (with Bearer fallback), and exposes all Elementor library operations including proper `elementor_library` post type queries.

2. **MCP Server** (`/mcp-server`, npm: `@elementify/mcp`) — A Node.js/TypeScript MCP server that bridges AI assistants (Claude, Cursor, etc.) to any WordPress site running the Elementify plugin. Supports multiple sites, activation modes, and governance controls.

---

## Distributions

### Standalone — Elementify MCP

Install the plugin on your WordPress site and run the MCP server locally. Ideal for freelancers, agencies, and individual site owners.

```bash
# Install MCP server
npm install -g @elementify/mcp

# Configure your first site
elementify-mcp init

# Add to Claude Desktop config
# { "mcpServers": { "elementify": { "command": "elementify-mcp" } } }
```

### Embedded in Vamerli Studio

When running inside [Vamerli Studio](https://vamerli.com), Elementify MCP activates in `vamerli-embedded` or `vamerli-agency` mode. The plugin detects the Vamerli license and unlocks additional governance features. No separate MCP server configuration is needed.

---

## Monorepo structure

```
elementify-mcp/
├── plugin/                    # WordPress PHP plugin
│   ├── elementify-mcp.php     # Plugin bootstrap
│   ├── includes/
│   │   ├── Plugin.php         # Singleton main class
│   │   ├── Auth/Manager.php   # X-Elementify-Key auth + capability checks
│   │   ├── Api/Router.php     # REST route registration
│   │   ├── Api/Templates.php  # Template CRUD controller
│   │   ├── Admin/Page.php     # WP Admin page
│   │   ├── Governance/Settings.php
│   │   └── Activation/Mode.php
│   └── readme.txt
│
├── mcp-server/                # Node.js/TypeScript MCP server
│   ├── src/
│   │   ├── index.ts           # MCP server entry
│   │   ├── cli.ts             # elementify-mcp binary
│   │   ├── client.ts          # ElementifyClient (HTTP)
│   │   ├── config.ts          # ~/.elementify/config.json
│   │   └── tools/
│   │       ├── index.ts       # Register all tool groups
│   │       ├── library.ts     # list/get/create/update/delete/rename/duplicate
│   │       ├── content.ts     # get/update template data, extract sections
│   │       ├── organization.ts # list_by_type, set_category, audit
│   │       └── site.ts        # get_site_info, list_sites, switch_site
│   └── package.json
│
└── shared/                    # Shared TypeScript types
    ├── src/
    │   ├── index.ts
    │   └── types/
    │       ├── template.ts
    │       ├── auth.ts
    │       ├── config.ts
    │       └── errors.ts
    └── package.json
```

---

## Quick start

### Plugin

1. Download or clone this repo
2. Zip the `/plugin` directory
3. Upload to WordPress → Plugins → Add New → Upload Plugin
4. Activate **Elementify MCP Plugin**
5. Go to **Settings → Elementify MCP** to generate your first API key

### MCP Server

```bash
npm install -g @elementify/mcp
elementify-mcp init   # creates ~/.elementify/config.json
```

Then add to your MCP client config:

```json
{
  "mcpServers": {
    "elementify": {
      "command": "elementify-mcp"
    }
  }
}
```

---

## Spec

Full API spec and architecture decisions are in progress. See `docs/` once available.

---

## License

MIT — see [LICENSE](LICENSE).
