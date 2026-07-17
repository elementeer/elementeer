[![WordPress](https://img.shields.io/badge/WordPress-6.0%2B-21759b.svg?logo=wordpress)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777bb4.svg?logo=php)](https://php.net/)
[![Elementor](https://img.shields.io/badge/Elementor-3.x-92003b.svg)](https://elementor.com/)
[![License: GPL-2.0+](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/release-2.2.2-6A35FF.svg)](https://github.com/elementeer/elementeer/releases)

# Elementeer

**The agent-native freemium extension for the Elementor ecosystem.**

Elementeer exposes your WordPress and Elementor site through a secure, capability-scoped REST API at `/wp-json/elementeer/v1/`. AI agents — Claude, Cursor, OpenCode, Codex, Qwen, or any MCP-compatible client — use this API to read templates, assess site health, set up brand systems, compose pages, build theme templates, manage media, handle SEO, and more. No AI hype. Just a clean REST surface with real access control.

---

## What it does

Elementeer is the WordPress-side counterpart to the `@elementeer/mcp` Node.js MCP server. The plugin does not ship an AI model. It provides a structured, validated REST API that AI agents consume through the MCP server. Every endpoint is scoped by capability. Every write is gated by governance.

The API bypasses Elementor's own REST limitations — which return 401 errors or empty responses for `elementor_library` queries — by using direct `WP_Query` calls to read `_elementor_data` and `_elementor_template_type` post meta.

---

## Features

### Template Library CRUD

Full lifecycle management of `elementor_library` templates: list, get, create, update, rename, duplicate, delete, bulk rename, extract sections, import from curated sources, audit the library.

### Site Assessment

A 10-category health report covering brand consistency, template inventory, performance posture, plugin landscape, accessibility gaps, SEO configuration, content structure, media library state, navigation architecture, and addon ecosystem. Each category produces a score and prioritized recommendations.

### Brand Setup Wizard

Coordinated brand configuration in one step: global colors, typography presets, site logo, and design tokens. No manual clicking through Elementor's settings panels.

### Creator Mode

Compose pages from the template library by specifying section types. Assembles existing library parts into complete layouts without opening the editor.

### Theme Builder

Programmatic creation of Theme Builder templates — header, footer, single post, archive, 404 — with section assignment and display conditions.

### Navigation Menus

Full CRUD for WordPress menus and menu items, plus menu location assignment. Create, reorder, and assign navigation structures from an agent interface.

### Media Management

List, upload, update metadata (alt text, title, caption), delete, audit orphaned files, search stock photography (Pexels/Unsplash), and sideload images into the media library.

### SEO

Multi-plugin SEO meta management. Auto-detects Rank Math, Yoast, SEOPress, or native WordPress SEO fields and provides a unified read/write interface. No need to know which plugin is active.

### Global Styles

Read and write Elementor's global colors, typography, and design tokens directly — no UI required.

### Performance

Elementor CSS method detection, DOM size analysis, asset auditing, cache flush, Core Web Vitals reporting, and critical CSS generation.

### 8 Integration Families

| Family | Adapter | Capabilities |
|--------|---------|--------------|
| **E-Commerce** | WooCommerce | Product, order, store settings CRUD |
| **Dynamic Sites** | Voxel | Post types, dynamic tags, collections |
| **Booking** | Amelia | Services, appointments, employees |
| **LMS** | LearnDash, Tutor LMS | Courses, lessons, quizzes |
| **Charity** | GiveWP, Charitable | Campaigns, donations, reporting |
| **Accessibility** | Ally | WCAG scanning, auto-fixes, scoring |
| **Translation** | WPML, Polylang | Batch translation, language switching |
| **Addon Detection** | Registry | Widget inventory, overlap detection, usage tracking |

All integration families auto-detect their respective plugins and expose domain-appropriate read/write operations. If a plugin is absent, the adapter reports `not_available` rather than erroring.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  AI Agent (Claude, Cursor, OpenCode, Codex, Qwen, etc.)  │
└──────────────────────┬───────────────────────────────────┘
                       │ MCP Protocol (stdio)
┌──────────────────────▼───────────────────────────────────┐
│               @elementeer/mcp (Node.js)                   │
│           128+ Free tools  •  L0–L3 Governance            │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS + X-Elementeer-Key
┌──────────────────────▼───────────────────────────────────┐
│               /wp-json/elementeer/v1/                     │
│   WordPress REST API  •  39 route controllers             │
│   Capability-scoped  •  Governance-gated                  │
└──────────────────────┬───────────────────────────────────┘
                       │ WP_Query / Elementor APIs
┌──────────────────────▼───────────────────────────────────┐
│            WordPress + Elementor (Free or Pro)             │
└──────────────────────────────────────────────────────────┘
```

---

## Authentication

Elementeer uses a two-layer permission model.

**Layer 1 — API Key Capabilities.** Each key is generated with an explicit list of domain capabilities (e.g., `site-audit:read`, `library-operations:write`). There are **65 fine-grained capabilities** organized into **26 groups**. A key with only `library-operations:read` cannot write — the API returns `elementeer_insufficient_scope`, not `elementeer_invalid_key`, so agents can provide precise feedback.

**Layer 2 — Governance Settings.** Site administrators define an `allowed_capabilities` list in Settings → Elementeer MCP. Even if a key has a capability, if governance disables it at the site level, the request returns `elementeer_governance_blocked`. This lets site owners lock down entire operating domains without revoking keys.

Authentication is via the `X-Elementeer-Key` header (Bearer fallback accepted).

---

## Quick Install

```bash
# 1. Download the latest release ZIP from
#    https://github.com/elementeer/elementeer/releases

# 2. Upload to your WordPress site
#    Plugins → Add New → Upload Plugin → Choose ZIP → Install Now

# 3. Activate
#    Click "Activate Plugin" (Elementor must be installed and active)

# 4. Generate an API key
#    Settings → Elementeer MCP → Generate Key
#    Select capabilities, copy the key

# 5. Configure the MCP server
#    See github.com/elementeer/elementeer-mcp
```

---

## Requirements

| Dependency | Minimum |
|-----------|---------|
| WordPress | 6.0 |
| PHP | 8.0 |
| Elementor | 3.x (Free or Pro) |

---

## Activation Modes

Elementeer detects its environment and adjusts behavior:

| Mode | Condition |
|------|-----------|
| `standalone-free` | Elementeer running alone with Elementor Free |
| `standalone-pro` | Elementeer running alone with Elementor Pro |
| `vamerli-embedded` | Running inside Vamerli Studio |
| `vamerli-agency` | Running inside Vamerli Studio with agency features |

---

## Development

```bash
# Install dependencies
composer install

# Run tests
composer test

# Run with coverage
composer test:coverage
```

### Plugin Structure

```
elementeer/
├── assets/                     # Admin UI assets
├── includes/
│   ├── Activation/            # Plugin activation/deactivation
│   ├── Addons/                # Integration adapters (Registry)
│   ├── Admin/                 # Settings screens
│   ├── Api/                   # 39 REST route controllers
│   │   ├── Router.php         # Central route registration
│   │   ├── Templates.php      # Library CRUD
│   │   ├── Assessment.php     # Site assessment
│   │   ├── Seo.php            # Multi-plugin SEO
│   │   ├── Performance.php    # Performance & Core Web Vitals
│   │   ├── GlobalStyles.php   # Design tokens
│   │   ├── ThemeBuilder.php   # Theme Builder management
│   │   ├── Menus.php          # Navigation CRUD
│   │   ├── Media.php          # Media library
│   │   ├── WooCommerce.php    # E-commerce integration
│   │   ├── Voxel.php          # Dynamic sites
│   │   ├── Booking.php        # Amelia integration
│   │   ├── Lms.php            # LearnDash / Tutor LMS
│   │   ├── Charity.php        # GiveWP / Charitable
│   │   ├── Ally.php           # Accessibility
│   │   ├── Translation.php    # WPML / Polylang
│   │   ├── Addons.php         # Addon detection & analytics
│   │   ├── Snapshots.php      # Template snapshots & versioning
│   │   ├── ChangeQueue.php    # Governed change queue
│   │   ├── Wizards.php        # Guided workflows
│   │   ├── Content.php        # Pages, posts, taxonomies
│   │   ├── Forms.php          # Form creation
│   │   ├── Site.php           # Site info & settings
│   │   ├── StackBootstrap.php # Stack bootstrap
│   │   ├── Diagnostics.php    # Module diagnostics (11 domains)
│   │   ├── ImportExport.php   # Data import/export
│   │   ├── WorkflowOrchestration.php
│   │   └── ...                # Additional controllers
│   ├── Auth/
│   │   ├── Manager.php        # API key management
│   │   └── Capabilities.php   # 65 capabilities, 26 groups
│   ├── Governance/
│   │   └── Settings.php       # Site-wide governance
│   └── Plugin.php             # Bootstrap & init
├── elementeer.php             # Plugin entry point
├── composer.json
├── readme.txt                 # WordPress.org readme
└── LICENSE
```

---

## Links

- **Documentation:** [docs.elementeer.xyz](https://docs.elementeer.xyz)
- **Website:** [elementeer.xyz](https://elementeer.xyz)
- **MCP Server:** [github.com/elementeer/elementeer-mcp](https://github.com/elementeer/elementeer-mcp)
- **Conversion Bridge:** [github.com/elementeer/elementeer-bridge](https://github.com/elementeer/elementeer-bridge)

---

## License

[GPL-2.0-or-later](./LICENSE)

Elementeer is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or (at your option) any later version.
