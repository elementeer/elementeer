[![repo-safety](https://github.com/Vamerli/elementify-mcp/actions/workflows/repo-safety.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/repo-safety.yml)
[![CI](https://github.com/Vamerli/elementify-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Vamerli/elementify-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Vamerli/elementify-mcp/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/@elementify/mcp?label=npm)](https://www.npmjs.com/package/@elementify/mcp)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-green.svg)](./LICENSE)
[![WordPress tested](https://img.shields.io/badge/WordPress-6.0%2B-21759b.svg?logo=wordpress)](./plugin/readme.txt)
[![Elementor tested](https://img.shields.io/badge/Elementor-3.x-92003b.svg)](./plugin/readme.txt)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg?logo=node.js)](./mcp-server/package.json)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-7c3aed.svg)](https://modelcontextprotocol.io)
[![Vamerli Studio](https://img.shields.io/badge/Vamerli_Studio-embedded-1A56DB.svg)](https://elementify.studio)

# Elementify MCP

Elementor-native MCP bridge for the public Free surface. Exposes the full `elementor_library` post type over a typed REST API — no 401 surprises, no empty responses. Ships as a WordPress plugin + Node.js MCP server with fine-grained, governance-controlled API key permissions.

---

## Product Surfaces

- `Free`: public and mirror-safe.
- `Advanced`: private in the Forgejo primary repository.
- `Studio`: future seam for cloud, cross-site, and delivery orchestration.

The WordPress plugin registers a REST API under `/wp-json/elementify/v1/` that queries `elementor_library` directly, bypassing the limitations in Elementor's own REST modifications. The MCP server bridges Claude, Cursor, or any MCP-compatible client to any WordPress site running the plugin, with support for multiple sites, capability-scoped API keys, and a site-level governance layer.

---

## Quick Start — Free

This is the canonical public quickstart for the mirror-safe Free surface:

- [Public Free quickstart](docs/quickstart/free.md)
- [Install guide](INSTALL.md)
- [Public Free release checklist](docs/release/free-public-release-checklist.md)

### 1. Install the plugin

1. Download or clone this repo
2. Zip the `/plugin` directory
3. Upload via WordPress admin: Plugins → Add New → Upload Plugin
4. Activate **Elementify MCP Plugin**
5. Go to Settings → Elementify MCP → generate your first API key

### 2. Install and configure the MCP server

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

### 3. Add to your MCP client

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

## Free Workflow

The public Free surface focuses on:

- scenario-first front door and intent routing
- runtime wizard families for:
  - `new-site-lite`
  - `stack-bootstrap`
  - `optimization-lite`
  - `relaunch-lite`
  - `extension-lite`
- limited guided transitions for the first safe bootstrap and optimization paths
- site assessment and context capture
- prioritized recommendations
- brand setup
- Creator Light and simple assembly
- local Elementor Library operations
- honest write validation

This public mirror does not include Advanced-only premium library flows, Studio orchestration, or cloud library semantics.
It is still meant to function as a 360-degree starting point for both new-site and existing-site Elementor journeys.

For a compact public summary of what Free includes and excludes, see [docs/public/free-includes-excludes.md](docs/public/free-includes-excludes.md).

---

## Available MCP Tools

| Tool | Description | Capability required |
|------|-------------|---------------------|
| `list_templates` | List templates with filtering by type, status, keyword | `library-operations:read` |
| `get_template` | Get a single template by ID | `library-operations:read` |
| `create_template` | Create a new template | `library-operations:write` |
| `update_template` | Update title, status, categories, tags | `library-operations:write` |
| `delete_template` | Permanently delete a template | `library-operations:write` |
| `rename_template` | Rename a single template | `library-operations:write` |
| `duplicate_template` | Duplicate a template with optional new title | `library-operations:write` |
| `bulk_rename` | Rename multiple templates in one call | `library-operations:write` |
| `get_template_data` | Get raw `_elementor_data` JSON | `library-operations:read` |
| `update_template_data` | Replace `_elementor_data` entirely | `library-operations:write` |
| `extract_sections` | Get top-level section/container summary | `library-operations:read` |
| `list_by_type` | List all templates grouped by type | `library-operations:read` |
| `set_category` | Assign categories to a template | `library-operations:write` |
| `set_tags` | Assign tags to a template | `library-operations:write` |
| `audit_library` | Full library audit: counts, drafts, stale, uncategorized | `library-operations:read` |
| `get_site_info` | WP version, Elementor version, activation mode, capabilities | `site-audit:read` |
| `list_sites` | List all configured sites in `~/.elementify/config.json` | — |
| `switch_site` | Change the default site | — |

The public mirror keeps this surface aligned with the Free tier only. Advanced-only and Studio-future tools remain private in the Forgejo primary repository.

---

## Permission Architecture

Elementify uses a two-layer permission model.

**Layer 1 — Key capabilities.** Each API key is created with an explicit list of domain capabilities (e.g., `site-audit:read`, `library-operations:read`, `library-operations:write`). A key with only `library-operations:read` cannot write. When a write endpoint is called with a read-only key, the plugin returns `elementify_insufficient_scope` — not `elementify_invalid_key`. This distinction is intentional and must be preserved by any client that consumes the API. Legacy resource-first scopes remain accepted as transitional aliases for older keys.

**Layer 2 — Governance settings.** Site administrators define an `allowed_capabilities` list in Settings → Elementify MCP. Even if a key has a capability, if governance disables it at the site level, the request returns `elementify_governance_blocked`. This enables a site owner to lock down operating domains such as `library-operations:write` or `governance:apply` without revoking keys.

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

GPL-3.0-or-later — see [LICENSE](./LICENSE).
