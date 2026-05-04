#!/bin/bash
set -e

# ============================================
# CREATE STANDALONE ELEMENTIFY PLUGIN v1.0.0
# ============================================
# Erstellt eine komplette "Plug & Play" Version
# mit allen Abhängigkeiten für Endanwender
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
PLUGIN_DIR="$PROJECT_ROOT/plugin"
DIST_DIR="$PROJECT_ROOT/dist"
PLUGIN_NAME="elementify-mcp"
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║       ELEMENTIFY v1.0.0 - STANDALONE BUILDER             ║"
    echo "║          Plug & Play für Endanwender                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Prüfe Voraussetzungen
check_prerequisites() {
    log "Prüfe Voraussetzungen..."
    
    # Check PHP
    if ! command -v php &> /dev/null; then
        warn "PHP nicht gefunden. Composer wird möglicherweise benötigt."
    fi
    
    # Check Composer
    if ! command -v composer &> /dev/null; then
        warn "Composer nicht gefunden. Stelle sicher, dass Abhängigkeiten bereits installiert sind."
    fi
    
    # Check zip
    if ! command -v zip &> /dev/null; then
        error "zip Befehl nicht gefunden. Benötigt für ZIP-Erstellung."
        exit 1
    fi
    
    success "Voraussetzungen OK"
}

# Installiere Composer Abhängigkeiten
install_dependencies() {
    log "Installiere Composer Abhängigkeiten (nur Produktion)..."
    
    cd "$PLUGIN_DIR"
    
    if [ -f "composer.json" ]; then
        if command -v composer &> /dev/null; then
            composer install --no-dev --optimize-autoloader --quiet
            success "Composer Abhängigkeiten installiert"
            
            # Prüfe vendor/ Ordner
            if [ -d "vendor" ]; then
                log "vendor/ Ordner Inhalt:"
                ls -la vendor/ | head -5
            else
                warn "vendor/ Ordner wurde nicht erstellt"
            fi
        else
            warn "Composer nicht verfügbar. Stelle sicher, dass vendor/ bereits existiert."
        fi
    else
        error "composer.json nicht gefunden"
        exit 1
    fi
}

# Erstelle enhanced readme.txt für Endanwender
create_enduser_readme() {
    log "Erstelle Endanwender-Dokumentation..."
    
    cat > "$PLUGIN_DIR/readme-enduser.txt" << 'README'
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
README
    
    success "Endanwender-Dokumentation erstellt"
}

# Erstelle fertige ZIP-Datei
create_standalone_zip() {
    log "Erstelle komplette Plug & Play ZIP..."
    
    # Erstelle dist Verzeichnis
    mkdir -p "$DIST_DIR"
    
    # ZIP Dateiname
    ZIP_NAME="elementify-mcp-${VERSION}-standalone.zip"
    ZIP_PATH="$DIST_DIR/$ZIP_NAME"
    
    cd "$PLUGIN_DIR"
    
    # Erstelle ZIP mit ALLEM was benötigt wird
    log "Packe Plugin in ZIP: $ZIP_NAME"
    zip -ry "$ZIP_PATH" . \
        -x "*.git*" \
        -x "node_modules/*" \
        -x "tests/*" \
        -x "coverage/*" \
        -x "*.log" \
        -x "*.zip" \
        -x ".DS_Store" \
        -x "composer.lock" \
        -x "package-lock.json" \
        -x ".phpunit*" \
        -x "patchwork.json" \
        -x "phpunit.xml*" \
        -x "readme.txt" -q  # Original ersetzen, -q am Ende
    
    # Benenne readme-enduser.txt um
    if [ -f "readme-enduser.txt" ]; then
        cd "$DIST_DIR"
        unzip -q "$ZIP_PATH"
        mv "readme-enduser.txt" "readme.txt"
        rm -f "$ZIP_PATH"
        zip -ry "$ZIP_NAME" . -q
        rm -rf "$(ls -1 | grep -v "$ZIP_NAME")"
    fi
    
    ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
    success "Standalone ZIP erstellt: $ZIP_SIZE"
    log "Pfad: $ZIP_PATH"
    
    # Kopiere auch ins Hauptverzeichnis für einfachen Zugriff
    cp "$ZIP_PATH" "$PROJECT_ROOT/$ZIP_NAME"
    log "Kopiert nach: $PROJECT_ROOT/$ZIP_NAME"
}

# Validiere die ZIP-Datei
validate_zip() {
    log "Validiere ZIP-Datei..."
    
    ZIP_PATH="$DIST_DIR/elementify-mcp-${VERSION}-standalone.zip"
    
    if [ ! -f "$ZIP_PATH" ]; then
        error "ZIP-Datei nicht gefunden: $ZIP_PATH"
        exit 1
    fi
    
    # Prüfe wichtige Dateien in der ZIP
    log "Prüfe ZIP-Inhalt..."
    TEMP_DIR="/tmp/elementify-validate-$(date +%s)"
    mkdir -p "$TEMP_DIR"
    unzip -q "$ZIP_PATH" -d "$TEMP_DIR"
    
    echo "Wichtige Dateien in ZIP:"
    IMPORTANT_FILES=(
        "elementify-mcp.php"
        "vendor/autoload.php"
        "readme.txt"
        "composer.json"
        "includes/Api/Router.php"
        "includes/Api/Adapters/AddonRegistry.php"
    )
    
    all_ok=true
    for file in "${IMPORTANT_FILES[@]}"; do
        if [ -f "$TEMP_DIR/elementify-mcp/$file" ]; then
            echo "  ✅ $file"
            
            # Spezielle Checks
            if [ "$file" = "elementify-mcp.php" ]; then
                if grep -q "Version:     1.0.0" "$TEMP_DIR/elementify-mcp/$file"; then
                    echo "    → Version: 1.0.0 korrekt"
                else
                    echo "    ❌ Falsche Version"
                    all_ok=false
                fi
            fi
            
            if [ "$file" = "vendor/autoload.php" ]; then
                echo "    → Autoloader vorhanden"
            fi
            
        else
            echo "  ❌ $file fehlt!"
            all_ok=false
        fi
    done
    
    # Prüfe vendor/ Ordner Größe
    if [ -d "$TEMP_DIR/elementify-mcp/vendor" ]; then
        VENDOR_SIZE=$(du -sh "$TEMP_DIR/elementify-mcp/vendor" | cut -f1)
        echo "  📦 vendor/ Ordner: $VENDOR_SIZE"
    fi
    
    # Aufräumen
    rm -rf "$TEMP_DIR"
    
    if [ "$all_ok" = true ]; then
        success "✅ ZIP-Validierung erfolgreich"
    else
        error "❌ ZIP-Validierung fehlgeschlagen"
        exit 1
    fi
}

# Erstelle Installations-Skript für Server
create_installation_script() {
    log "Erstelle Installations-Skript..."
    
    cat > "$DIST_DIR/install-elementify.sh" << 'INSTALLSCRIPT'
#!/bin/bash
set -e

# ============================================
# ELEMENTIFY v1.0.0 - INSTALLATION SCRIPT
# ============================================
# Für manuelle Installation auf Server
# ============================================

echo "=== Elementify v1.0.0 Installation ==="
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "elementify-mcp.php" ]; then
    echo "❌ Nicht im Elementify Plugin-Verzeichnis"
    echo "Wechsle in: /wp-content/plugins/elementify/"
    exit 1
fi

# Prüfe PHP Version
PHP_VERSION=$(php -v | head -1 | cut -d' ' -f2)
echo "PHP Version: $PHP_VERSION"

if [[ "$PHP_VERSION" < "8.0" ]]; then
    echo "⚠️  PHP Version zu alt (benötigt 8.0+)"
fi

# Prüfe WordPress Konstante
if [ -z "$(grep -r "WP_CONTENT_DIR" . 2>/dev/null | head -1)" ]; then
    echo "ℹ️  Installation im WordPress Kontext empfohlen"
fi

# Prüfe Autoloader
if [ -f "vendor/autoload.php" ]; then
    echo "✅ Autoloader vorhanden"
    
    # Teste Autoloader
    if php -r "require_once 'vendor/autoload.php'; echo '✅ Autoloader funktioniert\n';" 2>/dev/null; then
        echo "✅ Autoloader test erfolgreich"
    else
        echo "❌ Autoloader Fehler"
        echo "   Möglicherweise benötigt: composer install --no-dev --optimize-autoloader"
    fi
else
    echo "❌ Autoloader fehlt"
    echo "   Führe aus: composer install --no-dev --optimize-autoloader"
fi

# Berechtigungen setzen
echo ""
echo "Setze Berechtigungen..."
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod 755 .

echo ""
echo "=== INSTALLATION FERTIG ==="
echo ""
echo "Nächste Schritte in WordPress:"
echo "1. Gehe zu Plugins → Installierte Plugins"
echo "2. Aktiviere 'Elementify MCP Plugin'"
echo "3. Gehe zu Elementify → Settings für API Keys"
echo "4. Teste REST API: /wp-json/elementify/v1/health"
echo ""
echo "Bei Problemen:"
echo "- Prüfe /wp-content/debug.log"
echo "- Erhöhe PHP memory_limit auf 256M"
echo "- Deaktiviere andere Plugins für Konflikt-Test"
INSTALLSCRIPT

    chmod +x "$DIST_DIR/install-elementify.sh"
    success "Installations-Skript erstellt: $DIST_DIR/install-elementify.sh"
}

# Main Funktion
main() {
    print_banner
    
    log "Erstelle Plug & Play Elementify v$VERSION..."
    echo ""
    
    # 1. Voraussetzungen prüfen
    check_prerequisites
    echo ""
    
    # 2. Abhängigkeiten installieren
    install_dependencies
    echo ""
    
    # 3. Endanwender-Dokumentation
    create_enduser_readme
    echo ""
    
    # 4. ZIP erstellen
    create_standalone_zip
    echo ""
    
    # 5. Validieren
    validate_zip
    echo ""
    
    # 6. Installations-Skript
    create_installation_script
    echo ""
    
    # 7. Zusammenfassung
    success "🎉 PLUG & PLAY VERSION FERTIG!"
    echo ""
    echo "Erstellte Dateien:"
    echo "✅ $DIST_DIR/elementify-mcp-${VERSION}-standalone.zip  (Haupt-ZIP)"
    echo "✅ $PROJECT_ROOT/elementify-mcp-${VERSION}-standalone.zip  (Kopie)"
    echo "✅ $DIST_DIR/install-elementify.sh  (Installations-Skript)"
    echo ""
    echo "Für Endanwender:"
    echo "1. ZIP in WordPress hochladen (Plugins → Add New → Upload)"
    echo "2. Plugin aktivieren"
    echo "3. Fertig! Kein Composer, kein SSH nötig"
    echo ""
    echo "Für marcus-urban.de:"
    echo "scp elementify-mcp-${VERSION}-standalone.zip marcus-urban.de:/var/www/html/wp-content/plugins/"
    echo "ssh marcus-urban.de 'cd /var/www/html/wp-content/plugins && unzip -o elementify-mcp-${VERSION}-standalone.zip -d elementify'"
    echo ""
    echo "Wichtiger Hinweis:"
    echo "Diese Version enthält bereits alle Abhängigkeiten im vendor/ Ordner."
    echo "Endanwender benötigen KEINEN Zugang zu Composer oder SSH."
}

# Ausführung
main "$@"