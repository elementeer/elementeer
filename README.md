[![repo-safety](https://github.com/Vamerli/elementify-mcp/actions/workflows/repo-safety.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/repo-safety.yml)
[![CI](https://github.com/Vamerli/elementify-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Vamerli/elementify-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/@elementify/mcp?label=npm)](https://www.npmjs.com/package/@elementify/mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![WordPress tested](https://img.shields.io/badge/WordPress-6.0%2B-21759b.svg?logo=wordpress)](./plugin/readme.txt)
[![Elementor tested](https://img.shields.io/badge/Elementor-3.x-92003b.svg)](./plugin/readme.txt)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg?logo=node.js)](./mcp-server/package.json)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-7c3aed.svg)](https://modelcontextprotocol.io)
[![Vamerli Studio](https://img.shields.io/badge/Vamerli_Studio-embedded-1A56DB.svg)](https://elementify.studio)

# Elementify MCP

Elementor-native MCP bridge for AI-assisted template management. Exposes the full `elementor_library` post type over a typed REST API — no 401 surprises, no empty responses. Ships as a WordPress plugin + Node.js MCP server with fine-grained, governance-controlled API key permissions.

---

## What it is

Elementify MCP is a dual-distribution product connecting AI assistants to Elementor's template library. The WordPress plugin registers a REST API under `/wp-json/elementify/v1/` that queries `elementor_library` directly, bypassing the limitations in Elementor's own REST modifications. The MCP server bridges Claude, Cursor, or any MCP-compatible client to any WordPress site running the plugin, with support for multiple sites, capability-scoped API keys, and a site-level governance layer.

---

## Dual Distribution

### Standalone

Install the plugin on your WordPress site and run the MCP server locally. Works with any Elementor installation — free or Pro.

### Embedded in Vamerli Studio

When running inside [Vamerli Studio](https://vamerli.com), Elementify MCP activates automatically in `vamerli-embedded` or `vamerli-agency` mode. The Bundle Importer deploys the plugin; no separate configuration is needed.

---

## Quick Start — Standalone

**Step 1: Install the plugin**

1. Download or clone this repo
2. Zip the `/plugin` directory
3. Upload via WordPress admin: Plugins → Add New → Upload Plugin
4. Activate **Elementify MCP Plugin**
5. Go to Settings → Elementify MCP → generate your first API key

**Step 2: Install and configure the MCP server**

```bash
npm install -g @elementify/mcp
elementify-mcp init   # creates ~/.elementify/config.json
```

Edit `~/.elementify/config.json`:

```json
{
  "sites": [
    {
      "id": "my-site",
      "name": "My WordPress Site",
      "url": "https://yoursite.com",
      "apiKey": "ek_your_key_here",
      "default": true
    }
  ]
}
```

**Step 3: Add to your MCP client**

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

## Quick Start — Vamerli Studio

Vamerli Studio deploys and configures the Elementify plugin automatically via the Bundle Importer. The MCP server activates in `vamerli-embedded` mode with your Vamerli license. No additional setup required.

---

## Available MCP Tools

| Tool | Description | Capability required |
|------|-------------|---------------------|
| `list_templates` | List templates with filtering by type, status, keyword | `templates:read` |
| `get_template` | Get a single template by ID | `templates:read` |
| `create_template` | Create a new template | `templates:write` |
| `update_template` | Update title, status, categories, tags | `templates:write` |
| `delete_template` | Permanently delete a template | `templates:delete` |
| `rename_template` | Rename a single template | `templates:write` |
| `duplicate_template` | Duplicate a template with optional new title | `templates:write` |
| `bulk_rename` | Rename multiple templates in one call | `templates:write` |
| `get_template_data` | Get raw `_elementor_data` JSON | `templates:read` |
| `update_template_data` | Replace `_elementor_data` entirely | `templates:write` |
| `extract_sections` | Get top-level section/container summary | `templates:read` |
| `list_by_type` | List all templates grouped by type | `templates:read` |
| `set_category` | Assign categories to a template | `templates:write` |
| `set_tags` | Assign tags to a template | `templates:write` |
| `audit_library` | Full library audit: counts, drafts, stale, uncategorized | `templates:read` |
| `get_site_info` | WP version, Elementor version, activation mode, capabilities | `templates:read` |
| `list_sites` | List all configured sites in `~/.elementify/config.json` | — |
| `switch_site` | Change the default site | — |

---

## Permission Architecture

Elementify uses a two-layer permission model.

**Layer 1 — Key capabilities.** Each API key is created with an explicit list of capabilities (e.g., `templates:read`, `templates:write`, `templates:delete`). A key with only `templates:read` cannot write. When a write endpoint is called with a read-only key, the plugin returns `elementify_insufficient_scope` — not `elementify_invalid_key`. This distinction is intentional and must be preserved by any client that consumes the API.

**Layer 2 — Governance settings.** Site administrators define an `allowed_capabilities` list in Settings → Elementify MCP. Even if a key has a capability, if governance disables it at the site level, the request returns `elementify_governance_blocked`. This enables a site owner to lock down destructive operations (e.g., `templates:delete`) without revoking keys.

The MCP server maps these server-side error codes to typed `ElementifyErrorCode` values so AI clients receive actionable, precise error information.

---

## Why not Respira?

- **`elementor_library` access**: Respira uses the default WordPress REST API for posts, which conflicts with Elementor's own REST modifications and returns 401 or empty results for template library requests. Elementify queries `elementor_library` directly via `WP_Query`.
- **Permission error clarity**: Respira maps both "wrong key" and "insufficient capability" to the same generic auth error. Elementify distinguishes `auth_invalid_key` from `auth_insufficient_scope`, so AI clients can tell users exactly what to fix.
- **Elementor-native focus**: Elementify is purpose-built for Elementor template management with Elementor-specific data structures, template types, and shortcode support. Respira is a general WordPress MCP tool.

---

## Monorepo Structure

```
elementify-mcp/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Test matrix: Node 20/22, PHP 8.1/8.2/8.3
│   │   ├── codeql.yml          # CodeQL security analysis
│   │   ├── repo-safety.yml     # Block committed secrets
│   │   └── release.yml         # npm publish + plugin ZIP on tag
│   ├── dependabot.yml
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md
│
├── plugin/                     # WordPress PHP plugin
│   ├── elementify-mcp.php      # Plugin bootstrap
│   ├── includes/
│   │   ├── Plugin.php          # Singleton main class
│   │   ├── Auth/Manager.php    # X-Elementify-Key auth + capability checks
│   │   ├── Api/Router.php      # REST route registration
│   │   ├── Api/Templates.php   # Template CRUD controller
│   │   ├── Api/Site.php        # Site info endpoint
│   │   ├── Governance/Settings.php
│   │   └── Activation/Mode.php
│   ├── tests/
│   │   ├── bootstrap.php
│   │   ├── Stubs/              # WordPress class stubs for unit tests
│   │   ├── Unit/
│   │   │   ├── Auth/ManagerTest.php
│   │   │   ├── Governance/SettingsTest.php
│   │   │   ├── Activation/ModeTest.php
│   │   │   └── Api/TemplatesTest.php
│   │   └── Integration/RestApiTest.php
│   ├── composer.json
│   └── phpunit.xml
│
├── mcp-server/                 # Node.js/TypeScript MCP server
│   ├── src/
│   │   ├── index.ts            # MCP server entry
│   │   ├── cli.ts              # elementify-mcp binary
│   │   ├── client.ts           # ElementifyClient (axios + error mapping)
│   │   ├── config.ts           # ~/.elementify/config.json
│   │   └── tools/
│   │       ├── index.ts
│   │       ├── library.ts      # list/get/create/update/delete/rename/duplicate/bulk_rename
│   │       ├── content.ts      # get/update template data, extract sections
│   │       ├── organization.ts # list_by_type, set_category, set_tags, audit_library
│   │       └── site.ts         # get_site_info, list_sites, switch_site
│   ├── src/__tests__/
│   │   ├── client.test.ts
│   │   ├── config.test.ts
│   │   ├── tools/
│   │   │   ├── library.test.ts
│   │   │   ├── content.test.ts
│   │   │   ├── organization.test.ts
│   │   │   └── site.test.ts
│   │   ├── integration/client-api.test.ts
│   │   └── smoke/server.test.ts
│   ├── vitest.config.ts
│   └── package.json
│
└── shared/                     # Shared TypeScript types
    ├── src/
    │   ├── index.ts
    │   ├── types/
    │   │   ├── template.ts
    │   │   ├── auth.ts
    │   │   ├── config.ts
    │   │   └── errors.ts
    │   └── __tests__/types.test.ts
    ├── vitest.config.ts
    └── package.json
```

---

## Development

```bash
# Install all dependencies
npm install

# Build everything
npm run build

# Run MCP server tests
npm run test --workspace=mcp-server

# Run with coverage
npm run test:coverage --workspace=mcp-server

# Run shared type tests
npm run test --workspace=shared

# Run PHP tests (from plugin/)
cd plugin && composer install && vendor/bin/phpunit

# Watch mode during development
npm run test:watch --workspace=mcp-server
```

### Contributing

1. Fork and clone
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes with tests
4. Run the full test suite: `npm test` + `phpunit`
5. Open a pull request using the provided template

---

## Security

See [SECURITY.md](.github/SECURITY.md) for the vulnerability reporting policy and supported versions.

Never commit API keys or `.env` files. Use governance settings to restrict destructive capabilities in production environments.

---

## License

MIT — see [LICENSE](./LICENSE).
