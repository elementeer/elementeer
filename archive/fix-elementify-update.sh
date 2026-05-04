#!/bin/bash
set -e

# ============================================
# Fix Elementify v1.0.0 Update Problem
# ============================================
# Behebt das "Nichterkennen" des Plugin-Updates
# und den REST API 500 Error
# ============================================

echo "=== ELEMENTIFY v1.0.0 UPDATE FIX ==="
echo ""

# Prüfe ob wir auf dem Server sind
if [ ! -f "/var/www/html/wp-config.php" ] && [ ! -f "wp-config.php" ]; then
    echo "⚠️  Nicht im WordPress Root-Verzeichnis"
    echo "Wechsle in: /var/www/html/ oder WordPress Installationsverzeichnis"
    read -p "Trotzdem fortfahren? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 1. Finde alte Elementify Plugin-Version
echo "1. Suche alte Elementify Plugin-Version..."
OLD_PLUGIN_DIR=""
PLUGIN_DIRS=(
    "/var/www/html/wp-content/plugins/elementify"
    "/var/www/html/wp-content/plugins/elementify-mcp" 
    "wp-content/plugins/elementify"
    "wp-content/plugins/elementify-mcp"
    "./wp-content/plugins/elementify"
    "./wp-content/plugins/elementify-mcp"
)

for dir in "${PLUGIN_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        OLD_PLUGIN_DIR="$dir"
        echo "   ✅ Gefunden: $dir"
        break
    fi
done

if [ -z "$OLD_PLUGIN_DIR" ]; then
    echo "   ⚠️  Keine alte Elementify Version gefunden"
    echo "   Neue Installation wird durchgeführt"
else
    # Prüfe Version der alten Installation
    if [ -f "$OLD_PLUGIN_DIR/elementify-mcp.php" ]; then
        OLD_VERSION=$(grep "Version:" "$OLD_PLUGIN_DIR/elementify-mcp.php" | head -1 | sed 's/.*Version:[[:space:]]*//' | sed "s/'//g" | sed 's/"//g' | tr -d ' ')
        echo "   Alte Version: $OLD_VERSION"
    fi
fi

# 2. Lösche alte Version komplett (wenn gewünscht)
if [ -n "$OLD_PLUGIN_DIR" ]; then
    echo ""
    echo "2. Lösche alte Version für sauberes Update..."
    read -p "   Altes Plugin '$OLD_PLUGIN_DIR' komplett löschen? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$OLD_PLUGIN_DIR"
        echo "   ✅ Gelöscht: $OLD_PLUGIN_DIR"
    else
        echo "   ⚠️  Überspringe Löschung (Update im gleichen Verzeichnis)"
    fi
fi

# 3. Bestimme Ziel-Verzeichnis
echo ""
echo "3. Bestimme Installationsverzeichnis..."
TARGET_DIR=""
if [ -n "$OLD_PLUGIN_DIR" ] && [[ ! $REPLY =~ ^[Yy]$ ]]; then
    # Update im gleichen Verzeichnis
    TARGET_DIR="$OLD_PLUGIN_DIR"
else
    # Neue Installation
    TARGET_DIR="/var/www/html/wp-content/plugins/elementify"
    if [ ! -d "/var/www/html" ]; then
        TARGET_DIR="wp-content/plugins/elementify"
    fi
fi

echo "   Ziel: $TARGET_DIR"

# 4. Frage nach ZIP-Datei
echo ""
echo "4. Elementify v1.0.0 ZIP-Datei auswählen..."
DEFAULT_ZIP="elementify-mcp-1.0.0-standalone-fixed.zip"
if [ -f "$DEFAULT_ZIP" ]; then
    ZIP_FILE="$DEFAULT_ZIP"
    echo "   ✅ Verwende: $ZIP_FILE"
else
    echo "   Verfügbare ZIP-Dateien:"
    ls -la *.zip 2>/dev/null | grep -i elementify || echo "   Keine ZIP-Dateien gefunden"
    read -p "   ZIP Dateipfad: " ZIP_FILE
    if [ ! -f "$ZIP_FILE" ]; then
        echo "❌ ZIP-Datei nicht gefunden: $ZIP_FILE"
        exit 1
    fi
fi

# 5. Installiere neue Version
echo ""
echo "5. Installiere Elementify v1.0.0..."
mkdir -p "$TARGET_DIR"
cd "$(dirname "$TARGET_DIR")"

# Entpacke ZIP
echo "   Entpacke $ZIP_FILE..."
unzip -q -o "$(cd - && pwd)/$ZIP_FILE" -d "$(basename "$TARGET_DIR")" 2>/dev/null || \
unzip -q -o "$ZIP_FILE" -d "$(basename "$TARGET_DIR")"

# Stelle sicher, dass readme.txt existiert (Endanwender-Version)
if [ -f "$TARGET_DIR/readme-enduser.txt" ] && [ ! -f "$TARGET_DIR/readme.txt" ]; then
    cp "$TARGET_DIR/readme-enduser.txt" "$TARGET_DIR/readme.txt"
    echo "   ✅ Endanwender-Dokumentation erstellt"
fi

# 6. Prüfe Autoloader
echo ""
echo "6. Prüfe Autoloader und Abhängigkeiten..."
cd "$TARGET_DIR"

if [ -f "vendor/autoload.php" ]; then
    echo "   ✅ vendor/autoload.php vorhanden"
    
    # Teste Autoloader
    if php -r "require_once 'vendor/autoload.php'; echo '   ✅ Autoloader funktioniert\n';" 2>/dev/null; then
        echo "   ✅ Autoloader test erfolgreich"
    else
        echo "   ⚠️  Autoloader Fehler - versuche composer install"
        if command -v composer &> /dev/null; then
            composer install --no-dev --optimize-autoloader --quiet
            echo "   ✅ Composer Abhängigkeiten aktualisiert"
        fi
    fi
else
    echo "   ❌ vendor/autoload.php fehlt!"
    echo "   Führe aus: composer install --no-dev --optimize-autoloader"
fi

# 7. Setze Berechtigungen
echo ""
echo "7. Setze Dateiberechtigungen..."
find "$TARGET_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
find "$TARGET_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
chmod 755 "$TARGET_DIR" 2>/dev/null || true
echo "   ✅ Berechtigungen gesetzt"

# 8. WordPress Cache leeren
echo ""
echo "8. Leere WordPress Cache..."
if command -v wp &> /dev/null; then
    wp transient delete --all --quiet 2>/dev/null || true
    wp cache flush --quiet 2>/dev/null || true
    echo "   ✅ WordPress Cache geleert"
else
    echo "   ⚠️  WP-CLI nicht verfügbar, Cache manuell leeren"
fi

# 9. Plugin aktivieren
echo ""
echo "9. Aktiviere Elementify Plugin..."
if command -v wp &> /dev/null; then
    wp plugin deactivate elementify --quiet 2>/dev/null || true
    wp plugin activate elementify --quiet 2>/dev/null || true
    echo "   ✅ Plugin aktiviert"
else
    echo "   ℹ️  Aktiviere Plugin manuell in WordPress Admin:"
    echo "   - Gehe zu Plugins → Installierte Plugins"
    echo "   - Aktiviere 'Elementify MCP Plugin'"
fi

# 10. Teste REST API
echo ""
echo "10. Teste REST API..."
if command -v wp &> /dev/null; then
    API_TEST=$(wp rest post /elementify/v1/health --quiet 2>&1 || true)
    if echo "$API_TEST" | grep -q "status.*ok\|200\|success"; then
        echo "   ✅ REST API funktioniert"
    else
        echo "   ⚠️  REST API Test fehlgeschlagen"
        echo "   Fehler: $API_TEST"
        echo ""
        echo "   Debug-Schritte:"
        echo "   1. Prüfe /wp-content/debug.log"
        echo "   2. Erhöhe PHP memory_limit auf 256M"
        echo "   3. Deaktiviere andere Plugins für Konflikt-Test"
    fi
else
    echo "   ℹ️  Teste REST API manuell:"
    echo "   - Besuche: https://deine-domain.de/wp-json/elementify/v1/health"
    echo "   - Erwarte JSON mit {'status':'ok'}"
fi

echo ""
echo "========================================"
echo "✅ UPDATE FIX ABGESCHLOSSEN"
echo ""
echo "Zusammenfassung:"
echo "- Plugin installiert in: $TARGET_DIR"
echo "- Version: 1.0.0 (mit vendor/ Autoloader)"
echo "- REST API sollte jetzt funktionieren"
echo ""
echo "Bei weiteren Problemen:"
echo "1. Prüfe /wp-content/debug.log"
echo "2. Deaktiviere alle anderen Plugins temporär"
echo "3. Kontaktiere Support: https://github.com/elementify/elementify-mcp"
echo ""
echo "Wichtiger Hinweis:"
echo "Diese Version ist Plug & Play - kein Composer oder SSH nötig!"
echo ""

# Optional: Real Cookie Banner Fix
echo "=== REAL COOKIE BANNER FIX ==="
echo ""
echo "Wenn Real Cookie Banner immer noch Fehler zeigt:"
echo "1. Gehe zu Real Cookie Banner → Settings"
echo "2. Klicke auf 'Save Changes' (ohne Änderungen)"
echo "3. Das erzwingt eine Neuvalidierung der REST API"
echo ""
echo "Alternative: Temporär deaktivieren und wieder aktivieren"
if command -v wp &> /dev/null; then
    read -p "Real Cookie Banner neu laden? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wp plugin deactivate real-cookie-banner --quiet 2>/dev/null || true
        sleep 2
        wp plugin activate real-cookie-banner --quiet 2>/dev/null || true
        echo "✅ Real Cookie Banner neu geladen"
    fi
fi