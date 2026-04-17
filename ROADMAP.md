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

## Status (2026-03-29)

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
| Performance & Cache | ✅ flush_elementor_cache / get_performance_report / optimize_elementor_assets |
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
| Governance Model | ✅ L0 (read) / L1 (safe writes) / L2 (auto-queue) / L3 (consent) |

---

## Planned Integration: Booking & Events (Phase 3.5d)

Based on PRD5 analysis, upcoming integration with popular booking & events plugins:
- **Amelia** — appointment scheduling
- **SSA (Simply Schedule Appointments)** — calendar booking
- **The Events Calendar (TEC)** — event management
- **Modern Events Calendar** — alternative events plugin

Tools will include: `list_events`, `create_event`, `update_event`, `list_bookings`, `create_booking`, `sync_calendars`.

## Phase 1 — Foundation (jetzt fertig)

Das ist gebaut. Elementor-Daten lesen, Templates verwalten, Sections extrahieren, Layouts zusammensetzen, direkt auf Pages schreiben. Der MCP-Server kann als AI-Agent eigenständig arbeiten.

---

## Phase 2 — Intelligent Onboarding

**Kernidee**: Bevor ein Agent irgendetwas tut, soll er *verstehen*, womit er es zu tun hat. Das ist der härteste Differenzierungspunkt gegenüber Respira.

### 2a — Site Assessment

Ein `assess_site` Tool, das einen vollständigen Scan liefert:

- Ist ein Logo gesetzt? (Media, Custom CSS, Theme-Setting)
- Existieren Global Styles (Color Palette, Typography)?
- Sind Theme Builder Templates vorhanden (Header, Footer, Single, Archive)?
- Wie viele Elementor-Pages gibt es, wie viele davon published?
- Welche Sprachen / WPML?
- WooCommerce aktiv?
- Custom Post Types?
- Welche Plugins sind aktiv (SEO, Forms, Cache)?
- Performance-Zustand (Elementor CSS-Print-Method, Inline-CSS)?
- Template-Bibliothek: Größe, Typen, Kategorisierung, verwaiste Templates?

Ausgabe: strukturiertes JSON + ein lesbares Summary für den AI-Agent.

### 2b — User Role Identification

Beim ersten Connect fragt ein Wizard nach Kontext:

```
Wer bist du?
  → Freelancer (baut für Kunden)
  → Agency-Developer (ein Team, mehrere Projekte)
  → Site-Owner (eigener Auftritt)
  → AI-Agent (vollautomatisch, kein menschlicher Nutzer)

Was ist der Zweck dieser Site?
  → eCommerce / Shop
  → Corporate / Unternehmensseite
  → Portfolio / Agentur
  → Blog / Publisher
  → Community / Membership
  → Sonstiges (Freitext)
```

Das Ergebnis wird als Site-Context-Metadatum gespeichert und von allen Folge-Tools genutzt.

### 2c — Recommendation Engine

Basierend auf Assessment + User Context: eine geordnete Liste von "nächsten sinnvollen Schritten":

```
1. Kein Logo hinterlegt → set_site_logo
2. Global Color Palette fehlt → create_global_palette
3. 12 Templates ohne Kategorie → audit_library + set_category
4. Theme Builder hat keinen Footer → create_theme_template (footer)
5. CSS-Print-Method auf "internal embedding" → performance-Warnung
```

Jede Empfehlung kennt: Priorität, betroffene Tools, geschätzter Impact, Automatisierbarkeit (kann der Agent das selbst tun? oder braucht er Input?).

**Differenzierung**: Das ist nicht eine Liste von Tools wie bei Respira. Das ist eine kontextbezogene Handlungsempfehlung, die sich ändert je nachdem was auf der Site ist.

---

## Phase 3 — Wizard-basierte Workflows

Konkrete, end-to-end Wizard-Flows für die häufigsten Aufgaben. Jeder Wizard ist eine MCP-Tool-Gruppe, die zusammen einen zusammenhängenden Workflow bildet.

### Wizard 1: Brand Setup
`assess_brand_state` → `set_global_palette` → `set_global_typography` → `set_site_logo` → Ergebnis-Report

### Wizard 2: Template Library Aufbau (aus bestehenden Pages)
`list_elementor_pages` → `get_page_data(extract=all)` → (AI wählt Sections) → `save_page_section_as_template` (bulk) → `set_category` + `set_tags` → `audit_library`

### Wizard 3: Page Composition
`list_templates(by_type)` → AI schlägt Kombination vor → `compose_page_from_templates` → `write_to_page` → Preview-URL zurück

### Wizard 4: New Page from Brief
Eingabe: Seitentyp + Inhaltsbeschreibung → AI wählt passende Templates aus Library → `compose_page_from_templates` → Ergebnis

### Wizard 5: Site Health Check
`assess_site` → Performance-Analyse → SEO-Grundprüfung → Strukturprüfung → priorisierter Aktionsplan

---

## Phase 4 — Elementor Feature Parität + Differenzierung

### Was Elementor bietet, Elementify ergänzen soll

| Elementor Feature | Elementify-Ergänzung |
|---|---|
| Site Planner (paid) | AI-generierter Siteplan aus Brief (free in Elementify) |
| Template Library (eigene) | AI-kuratierte Auswahl aus eigener Library |
| Global Styles (manuell) | `suggest_palette_from_content` — AI analysiert Content und schlägt Brand-Farben vor |
| Theme Builder (visuell) | `create_theme_template` via MCP für agentic workflows |
| Accessibility (paid) | Basis-Accessibility-Scan (free in Elementify) |

### Bewusste Nicht-Überschneidungen
- Kein visueller Editor → Elementor bleibt der Editor
- Keine Form-Verwaltung → WooCommerce/Gravity/CF7 bleiben zuständig
- Keine User-Management-Tiefe → WordPress nativ

---

## Phase 5 — E‑Commerce & Advanced Features

Erweiterung um WooCommerce‑Integration, Form‑Management und Performance‑Vertiefung:

- **WooCommerce Product Management** — CRUD für Produkte, Kategorien, Bestellungen (via REST API) — *Prototyp implementiert (list_products, get_product)*
- **WooCommerce Store Setup** — automatische Konfiguration von Shop‑Seiten (Shop, Product Single, Cart, Checkout)
- **Form Management** — Integration mit Gravity Forms, Contact Form 7, WPForms (Feld‑Export, Submission‑Logs)
- **Performance Deep‑Dive** — LCP‑Optimierung, Critical‑CSS‑Generierung, Asset‑Lazy‑Loading — *Grundfunktionen vorhanden (flush_cache, performance_report)*
- **Advanced Caching** — Redis‑Support, CDN‑Purge‑Integration, Browser‑Caching‑Regeln
- **Accessibility Scanner** — automatisierte WCAG‑Prüfung von Elementor‑Seiten

---

## Phase 6 — Governance & Multi-Tenant

Für Agency-Use-Cases:

- **Per-Site Governance Profiles** — unterschiedliche Regeln pro Site-Typ (Shop vs. Blog vs. Portfolio)
- **Change Review Queue** — AI schlägt Änderungen vor, Mensch approves (besonders für Live-Sites)
- **Audit Log** — wer hat wann was geändert (MCP-Key + Timestamp + Diff)
- **Capability Templates** — vordefinierte Key-Profile (Read-Only Auditor, Content Editor, Full Agent)
- **Webhook-Events** — notify on template change, page update, etc.

---

## Technische Schulden & Qualität

- [x] PHP Unit Tests (Pages.php, Templates.php, Media.php, Menus.php, Content.php, Settings.php, SEO.php, Performance.php) — vollständig abgeschlossen (Patchwork‑Issue gelöst, Mocking‑Fehler für Elementor\Plugin::$instance behoben)
- [ ] Integration Tests gegen echte WordPress-Instanz (Docker Compose Setup) — Design & PoC‑Runner vorhanden
- [ ] OpenAPI-Spec für den Plugin-REST-Layer
- [ ] Versionierung des Plugin-REST-Namespace (v1 → v2 wenn breaking changes)
- [ ] Rate Limiting im Plugin (aktuell kein throttling)
- [ ] key rotation / expiry im Auth-Layer

---

## Nicht auf der Roadmap (bewusst)

- Native WordPress Gutenberg Integration
- Eigene Template Marketplace / Cloud Library
- Elementor-Pro-only Features (Popups, Loop Builder) als Dependency
- Mobile App
