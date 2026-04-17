# Elementify MCP — Roadmap

---

## Release v0.5.0 (2026-04-15)

- **WordPress Core Settings**: `get_site_settings` / `update_site_settings` — read and modify blog name, tagline, homepage, posts page, permalink structure, timezone, date/time formats.
- **SEO Management**: `get_seo_meta` / `update_seo_meta` — auto‑detects Yoast SEO, Rank Math, SEOPress, All‑In‑One SEO; reads and writes SEO title, description, focus keyword.
- **Performance & Cache**: `flush_elementor_cache`, `get_performance_report`, `optimize_elementor_assets` — Elementor CSS cache flushing, performance analysis, and asset optimization (Advanced tier).
- **Assessment enhancements**: Added `capabilities` section reporting SEO plugin presence and Elementify plugin capabilities.

Plugin version bumped to 0.5.0, MCP Server version bumped to 0.5.0.

---

## Produkt-Positionierung & Freemium-Strategie

Elementify konkurriert nicht mit Elementor — es **multipliziert** Elementor. Die Pricing-Logik ist:

| Kombination | übertrifft |
|---|---|
| Elementify Free + Elementor Free | Elementor Essential (paid) |
| Elementify Basic + Elementor Free | Elementor Advanced |
| Elementify Basic + Elementor Advanced | Elementor Expert |
| Elementify One + Elementor One | unschlagbar — volle agentic Kontrolle |

Einzelne Elementify-Module (Stock Images, AI Generation, Governance Pro, Multi-Site) sind granular zubuchbar — kein Alles-oder-Nichts-Upgrade.

### Was Elementify Free bereits bietet, das Elementor Essential nicht hat
- `assess_site` — vollständiger Site-Health-Report (Elementor: nicht vorhanden)
- `get_recommendations` — kontextbezogener Aktionsplan (Elementor: nicht vorhanden)
- `set_global_colors` / `set_global_typography` — automatisiert, nicht nur manuell
- `creator_mode` — Template-Komposition aus bestehender Library per Brief
- `wizard_brand_setup` — koordinierter Brand-Setup in einem Schritt
- Multi-Site-Support (Elementor verlangt separate Lizenzen)
- `compose_page_from_templates` — Layout-Assembly ohne Editor

### Was Elementify Basic zusätzlich bietet
- Vollständige Creator Mode AI-Integration (automatische Section-Generierung)
- Theme Builder Wizard (Header/Footer automatisch aus Library bauen)
- Stock Images Integration (Pexels/Unsplash API)
- Governance-Profiles für Agencies
- Change-Review-Queue (AI schlägt vor, Mensch approves)

### Was Elementify One zusätzlich bietet
- AI Image Generation (integriert, kein separater Service nötig)
- Vollständige agentic Site-Verwaltung (inkl. Posts, Media, Users)
- White-Label-fähig für Agencies
- Priority Support + SLA

---

## Status (2026-04-17)

| Bereich | Stand |
|---|---|
| Template Library CRUD | ✅ vollständig |
| Template Data (lesen/schreiben) | ✅ vollständig |
| Organisation (audit, kategorie, tags) | ✅ vollständig |
| Site Info | ✅ vollständig |
| Pages — lesen (list + get_data) | ✅ vollständig |
| Pages — schreiben (update_page_data) | ✅ vollständig |
| Template Composition | ✅ compose_page_from_templates |
| Multi-Site-Support | ✅ vollständig |
| Admin-UI + API-Key-Verwaltung | ✅ vollständig |
| Governance-Layer (Basis) | ✅ Basis, ausbaufähig |
| Site Assessment | ✅ assess_site — 10 Datenkategorien + Issues |
| Site Context (Onboarding-Basis) | ✅ set/get_site_context |
| Recommendation Engine | ✅ get_recommendations — 20 Regeln, context-aware |
| Global Styles (Colors + Typography) | ✅ get/set_global_styles, set_global_colors, set_global_typography |
| Logo Setter | ✅ set_site_logo |
| WordPress Core Settings | ✅ get_site_settings / update_site_settings |
| SEO Management | ✅ get_seo_meta / update_seo_meta |
| Performance & Cache | ✅ flush_elementor_cache / get_performance_report / optimize_elementor_assets / generate_critical_css |
| Media Library Management | ✅ list_media / get_media / update_media / delete_media / audit_unused_media |
| Content Management (Posts, CPT, Taxonomies) | ✅ create_page / create_post / update_post_meta / delete_post / list_taxonomies / manage_terms / list_post_types |
| Navigation Menus | ✅ list_menus / create_menu / delete_menu / list_menu_items / create_menu_item / update_menu_item / delete_menu_item / list_menu_locations / assign_menu_location |
| Brand Setup Wizard | ✅ wizard_brand_setup (dry-run + execute) |
| Creator Mode | ✅ creator_mode (keyword matching + composition) |
| Theme Builder Wizard | ✅ wizard_theme_builder (conditions, sections, source template, dry-run) |
| Stock Images Integration | ✅ search_stock_images (Pexels/Unsplash), sideload_stock_image |
| AI Image Generation | ✅ generate_ai_image (DALL-E 3 + Pollinations.ai free fallback) |
| Change Review Queue | ✅ queue_change / list_change_queue / review_change / apply_change |
| Forms Management | ✅ create_form_light / create_form_advanced / list_form_templates / migrate_form |
| Translation Management | ✅ analyze_translation_coverage / batch_translate_strings / translate_media_metadata |
| Site Health & Troubleshooting | ✅ clean_database / get_cache_recommendation / diagnose_issue / read_error_log / test_plugin_conflict |
| LMS Integration | ✅ get_lms_status / list_lms_courses / get_lms_course_structure |
| Charity/Donation Integration | ✅ get_charity_status / list_charity_forms / get_charity_stats |
| Accessibility (Ally) Integration | ✅ get_ally_status / get_ally_scan_results / trigger_ally_scan / apply_ally_fix |
| Booking & Events Integration | ✅ detect_booking_plugin / list_bookings / get_booking_stats / Amelia CRUD operations |
| WooCommerce Integration | ✅ list_products / get_product / create_product / update_product / delete_product / list_orders / get_order / update_order_status / list_product_categories / manage_product_category / get_store_settings / update_store_settings / setup_woocommerce_pages |
| Import/Export Tools | ✅ import_external_data (CSV/JSON/XML import with field mapping) |
| Module Wizards | ✅ wizard_acf / wizard_forms / wizard_comments / wizard_multi / wizard_plugin / wizard_export / wizard_health / wizard_ally / wizard_lms / wizard_charity / wizard_booking |
| Governance Model | ✅ L0 (read) / L1 (safe writes) / L2 (auto-queue) / L3 (consent) |
| Product Tier Mapping | ✅ 150+ tools mapped to free/advanced/studio_future tiers |

---

## Implementierte Integrationen

Alle PRD-v2 und PRD-v3 Module sind vollständig implementiert:

### ✅ PRD-v2 (Foundation)
- **Menus**: Navigation menu management
- **Content**: Posts, pages, taxonomies
- **Media**: Media library with audit
- **Settings**: WordPress core settings
- **WooCommerce**: Full store management (products, orders, settings)
- **SEO**: Multi‑plugin meta management
- **Performance**: Cache, reports, critical CSS, diagnostics

### ✅ PRD-v3 (Extended Ecosystem)
- **Wizards**: Module‑specific diagnostic wizards (ACF, Forms, Comments, etc.)
- **Forms**: Light/advanced creation, templates, migration
- **Translation**: Coverage analysis, batch translation, media metadata
- **Ally**: Accessibility plugin detection, scans, fixes
- **LMS**: Learning management system integration
- **Charity**: Donation plugin integration
- **Booking**: Amelia, SSA, TEC support with CRUD operations
- **Import‑Export**: External data import with field mapping

---

## Phase 1 — Foundation (abgeschlossen)

Elementor‑Daten lesen, Templates verwalten, Sections extrahieren, Layouts zusammensetzen, direkt auf Pages schreiben. Der MCP‑Server kann als AI‑Agent eigenständig arbeiten.

---

## Phase 2 — Intelligent Onboarding (abgeschlossen)

**Kernidee**: Bevor ein Agent irgendetwas tut, soll er *verstehen*, womit er es zu tun hat.

### 2a — Site Assessment ✅
Vollständiger Scan: Logo, Global Styles, Theme Builder Templates, Elementor‑Pages, Sprachen, WooCommerce, Custom Post Types, aktive Plugins, Performance‑Zustand, Template‑Bibliothek.

### 2b — User Role Identification ✅
Context‑Wizard erfasst Benutzerrolle (Freelancer, Agency, Site‑Owner, AI‑Agent) und Site‑Zweck (eCommerce, Corporate, Portfolio, Blog, etc.).

### 2c — Recommendation Engine ✅
Priorisierte, kontextbezogene Handlungsempfehlungen basierend auf Assessment + User Context.

---

## Phase 3 — Wizard‑basierte Workflows (abgeschlossen)

Konkrete, end‑to‑end Wizard‑Flows für häufige Aufgaben:

### Wizard 1: Brand Setup ✅
`assess_brand_state` → `set_global_colors` → `set_global_typography` → `set_site_logo`

### Wizard 2: Template Library Aufbau ✅
`list_elementor_pages` → `get_page_data` → `save_page_section_as_template` → `set_category` + `set_tags`

### Wizard 3: Page Composition ✅
`list_templates` → AI‑Auswahl → `compose_page_from_templates`

### Wizard 4: New Page from Brief ✅
Seitentyp + Beschreibung → Template‑Auswahl → Komposition

### Wizard 5: Site Health Check ✅
`assess_site` → Performance‑Analyse → SEO‑Prüfung → Strukturprüfung → Aktionsplan

### Modul‑Wizards ✅
ACF, Forms, Comments, Multilingual, Plugin Stack, Export, Health, Ally, LMS, Charity, Booking

---

## Phase 4 — Elementor Feature Parität + Differenzierung (abgeschlossen)

| Elementor Feature | Elementify‑Ergänzung |
|---|---|
| Site Planner (paid) | AI‑generierter Siteplan aus Brief (free in Elementify) |
| Template Library (eigene) | AI‑kuratierte Auswahl aus eigener Library |
| Global Styles (manuell) | `suggest_palette_from_content` — AI analysiert Content |
| Theme Builder (visuell) | `create_theme_template` via MCP für agentic workflows |
| Accessibility (paid) | Basis‑Accessibility‑Scan (free in Elementify) |

**Bewusste Nicht‑Überschneidungen**
- Kein visueller Editor → Elementor bleibt der Editor
- Keine Form‑Verwaltung → WooCommerce/Gravity/CF7 bleiben zuständig
- Keine User‑Management‑Tiefe → WordPress nativ

---

## Phase 5 — E‑Commerce & Advanced Features (abgeschlossen)

Alle geplanten Erweiterungen sind implementiert:

- **WooCommerce Product Management** — Vollständige CRUD für Produkte, Kategorien, Bestellungen, Store‑Settings
- **WooCommerce Store Setup** — Automatische Konfiguration von Shop‑Seiten (Shop, Cart, Checkout, My‑Account)
- **Form Management** — Integration mit Gravity Forms, Contact Form 7, WPForms (Feld‑Export, Migration)
- **Performance Deep‑Dive** — LCP‑Optimierung, Critical‑CSS‑Generierung, Asset‑Lazy‑Loading, Cache‑Empfehlungen
- **Advanced Caching** — Redis‑Support, CDN‑Purge‑Integration (Platzhalter)
- **Accessibility Scanner** — Elementor Ally Integration + built‑in Scanner (teilweise)

---

## Phase 6 — Governance & Multi‑Tenant (teilweise)

Für Agency‑Use‑Cases:

- ✅ **Change Review Queue** — AI schlägt vor, Mensch approves
- ✅ **Governance Model** — L0‑L3 mit Auto‑Queue für L2/L3
- 🔄 **Per‑Site Governance Profiles** — In Planung
- 🔄 **Audit Log** — Wer hat wann was geändert
- 🔄 **Capability Templates** — Vordefinierte Key‑Profile
- 🔄 **Webhook‑Events** — Notify on template change, page update

---

## Verbleibende Lücken & Nächste Schritte

### Hochpriorität
1. **AI‑powered batch translation** — Platzhalter in `translation.ts` durch echte AI‑Integration ersetzen
2. **Built‑in accessibility scanner** — TODO in `Ally.php` implementieren (grundlegende WCAG‑Prüfung)
3. **Booking‑Release bestätigen** — Roadmap‑Eintrag aktualisiert, Integrationstests durchführen

### Mittelpriorität
4. **Export‑Tools ergänzen** — `export_external_data` für CSV/JSON/XML Export implementieren
5. **Cached assessment für Wizards** — Platzhalter in `Wizards.php` durch echte Assessment‑Daten ersetzen
6. **Redis/CDN‑Integration** — Performance‑Tools um echte Redis/CDN‑Integration erweitern

### Niedrigpriorität
7. **Governance Profiles** — Per‑Site‑Regeln erweitern
8. **Audit Log** — Änderungsprotokoll implementieren
9. **Webhook‑Events** — Event‑System für externe Integrationen

---

## Technische Schulden & Qualität

- [x] **PHP Unit Tests** — Vollständig abgeschlossen (alle API‑Klassen)
- [ ] **Integration Tests** gegen echte WordPress‑Instanz (Docker Compose Setup) — Design & PoC‑Runner vorhanden
- [ ] **OpenAPI‑Spec** für den Plugin‑REST‑Layer
- [ ] **Versionierung** des Plugin‑REST‑Namespace (v1 → v2 bei breaking changes)
- [ ] **Rate Limiting** im Plugin (aktuell kein throttling)
- [ ] **Key rotation / expiry** im Auth‑Layer

---

## Nicht auf der Roadmap (bewusst)

- Native WordPress Gutenberg Integration
- Eigene Template Marketplace / Cloud Library (später Studio)
- Elementor‑Pro‑only Features (Popups, Loop Builder) als Dependency
- Mobile App

---

## Release‑Strategie & Packaging

Die Codebase ist **feature‑komplett** für Free + Advanced. Nächste Schritte:

1. **Mirror‑Export verifizieren** — Automatische Prüfung, dass nur Free‑Tools im öffentlichen GitHub‑Mirror landen
2. **Tier‑Boundary Enforcement** — Build‑Zeit‑Checks für Advanced‑only Abhängigkeiten
3. **Studio‑Seams validieren** — Cloud‑Library‑Provider‑Interface vorbereiten
4. **v0.6.0 Release** — Verbleibende Lücken schließen + Packaging‑Verbesserungen

**Aktueller Fokus**: Alle identifizierten Lücken parallelisiert mit Skillweave‑Promptchain schließen.
