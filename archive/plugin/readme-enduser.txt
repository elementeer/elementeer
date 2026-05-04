=== Elementify MCP ===
Contributors: elementify
Tags: elementor, mcp, ai, automation, templates, library
Requires at least: 6.0
Tested up to: 6.5
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPL-3.0-or-later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

AI-native REST API for Elementor template management. Exposes the Elementor library to MCP servers with capability-scoped API keys and optional governance controls.

== Description ==

**Plug & Play Installation - Keine zusätzlichen Tools nötig!**

Elementify MCP ist eine komplette "Plug & Play" Lösung für WordPress + Elementor. Diese Version enthält bereits alle notwendigen Abhängigkeiten - **kein Composer, kein SSH, keine Kommandozeile erforderlich**.

**Features:**
✅ Komplette Addon-Ökosystem Integration (11 Elementor Addons)
✅ 45+ AI-Tools für Addon-Analyse und -Detection
✅ REST API für MCP Server Integration
✅ Site Assessment mit detaillierten Analytics
✅ Governance Layer mit Änderungs-Review
✅ WooCommerce, Booking, LMS Integration
✅ Stock Images & AI Image Generation
✅ Multilingual & Accessibility Tools

**Einfach installieren:**
1. ZIP-Datei in WordPress hochladen
2. Plugin aktivieren
3. Fertig!

**Für AI Agents & MCP Server:**
- REST API verfügbar unter: /wp-json/elementify/v1/
- API Keys über WordPress Admin erstellen
- Vollständige Dokumentation: https://github.com/elementify/elementify-mcp

== Installation ==

1. **Standard Installation** (empfohlen):
   - Lade die ZIP-Datei in WordPress hoch (Plugins → Add New → Upload Plugin)
   - Aktiviere das Plugin
   - Gehe zu Elementify → Settings um API Keys zu erstellen

2. **Manuelle Installation:**
   - Entpacke die ZIP-Datei in /wp-content/plugins/
   - Benenne den Ordner in "elementify" um
   - Aktiviere das Plugin in WordPress Admin

== Häufig gestellte Fragen ==

**F: Benötige ich Composer oder SSH-Zugang?**
A: NEIN! Diese Version enthält bereits alle Abhängigkeiten. Einfach hochladen und aktivieren.

**F: Welche WordPress/Elementor Version wird benötigt?**
A: WordPress 6.0+, Elementor 3.5+, PHP 8.0+

**F: Funktioniert es mit meinen Elementor Addons?**
A: Ja! Unterstützt: Essential Addons, Crocoblock, Ultimate Addons, PowerPack, Happy Addons, ElementsKit, Premium Addons, The Plus Addons, Dynamic Content, ShopEngine, Unlimited Elements

**F: Wie integriere ich es mit Claude/Cursor/Nova?**
A: Konfiguriere deinen MCP Client mit der WordPress URL und API Key.

== Upgrade von früheren Versionen ==

**Von v0.5.0 oder älter:**
- Deaktiviere die alte Version NICHT
- Lade diese ZIP hoch (WordPress fragt "Plugin existiert, ersetzen?")
- Klicke auf "Ja, ersetzen"
- WordPress aktualisiert automatisch

**Bei Problemen:**
1. Prüfe /wp-content/debug.log
2. Erhöhe PHP memory_limit auf 256M
3. Deaktiviere andere Plugins für Konflikt-Test

== Changelog ==

= 1.0.0 (2026-04-18) =
* PRD v4: Komplette Elementor Addon Ökosystem Integration
* 11 Plugin-Adapter mit 45+ Analyse-Tools
* CI Pipeline stabilisiert
* Plug & Play Installation (kein Composer nötig)
* Verbesserte Fehlerbehandlung

= 0.5.0 (2026-04-15) =
* Phase 5: Production Foundation
* Governance Layer, Change Queue, Premium Library
* WooCommerce, Booking, LMS, Charity Integration
* Performance & Security Tools

== Support ==

* GitHub: https://github.com/elementify/elementify-mcp
* Issues: https://github.com/elementify/elementify-mcp/issues
* Dokumentation: https://github.com/elementify/elementify-mcp/docs

**Wichtiger Hinweis:** Diese Version ist für Endanwender optimiert. Für Entwickler: Quellcode und volle Dokumentation auf GitHub.
