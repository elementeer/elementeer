#!/bin/bash
set -e

# ============================================
# Create WordPress-Compatible Plugin ZIP
# ============================================
# Erstellt eine ZIP mit korrekter Verzeichnisstruktur
# für WordPress Plugin Upload
# ============================================

echo "=== WordPress Plugin ZIP Creator ==="
echo ""

# Verzeichnisse
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$PROJECT_ROOT/plugin"
PLUGIN_NAME="elementify"
VERSION="2.0.0"
TEMP_DIR="/tmp/elementify-build-$(date +%s)"
DIST_DIR="$PROJECT_ROOT/dist"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Vorbereitung
log "Bereite temporäres Verzeichnis vor..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/$PLUGIN_NAME"
mkdir -p "$DIST_DIR"

# Kopiere Plugin-Dateien
log "Kopiere Plugin-Dateien..."
cp -r "$PLUGIN_SRC"/* "$TEMP_DIR/$PLUGIN_NAME/" 2>/dev/null || true

# Entferne unerwünschte Dateien
cd "$TEMP_DIR/$PLUGIN_NAME"
rm -f *.zip 2>/dev/null || true
rm -f *.zip.bak 2>/dev/null || true
rm -f composer.lock 2>/dev/null || true

# Stelle sicher, dass readme.txt existiert (Endanwender-Version)
if [ -f "readme-enduser.txt" ]; then
    cp "readme-enduser.txt" "readme.txt"
    log "Endanwender-Dokumentation erstellt"
fi

# Prüfe Autoloader
if [ ! -f "vendor/autoload.php" ]; then
    warn "vendor/autoload.php nicht gefunden"
    if command -v composer &> /dev/null; then
        log "Installiere Composer Abhängigkeiten..."
        composer install --no-dev --optimize-autoloader --quiet
    else
        error "Composer nicht verfügbar. Stelle sicher, dass vendor/ vorhanden ist."
        exit 1
    fi
fi

# Erstelle ZIP mit korrekter Struktur
log "Erstelle WordPress-kompatible ZIP..."
cd "$TEMP_DIR"
ZIP_NAME="elementify-${VERSION}-wordpress.zip"
zip -ry "$ZIP_NAME" "$PLUGIN_NAME/" \
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
    -q

# Kopiere ZIPs
cp "$ZIP_NAME" "$DIST_DIR/"
cp "$ZIP_NAME" "$PROJECT_ROOT/elementify-${VERSION}-wordpress.zip"

# Validiere ZIP
log "Validiere ZIP-Struktur..."
VALID_TEMP="/tmp/validate-$(date +%s)"
mkdir -p "$VALID_TEMP"
cd "$VALID_TEMP"
unzip -q "$TEMP_DIR/$ZIP_NAME"

if [ -d "$PLUGIN_NAME" ] && [ -f "$PLUGIN_NAME/elementify-mcp.php" ]; then
    PLUGIN_HEADER=$(head -20 "$PLUGIN_NAME/elementify-mcp.php" | grep "Version:")
    echo "✅ ZIP-Struktur korrekt:"
    echo "   - Plugin-Verzeichnis: $PLUGIN_NAME/"
    echo "   - Hauptdatei: elementify-mcp.php"
    echo "   - Version: $PLUGIN_HEADER"
    
    if [ -f "$PLUGIN_NAME/vendor/autoload.php" ]; then
        echo "   - Autoloader: ✅ vorhanden"
    else
        echo "   - Autoloader: ❌ fehlt"
    fi
else
    error "ZIP-Struktur fehlerhaft"
    exit 1
fi

rm -rf "$VALID_TEMP"
rm -rf "$TEMP_DIR"

# Erfolgsmeldung
success "✅ WordPress Plugin ZIP erstellt!"
echo ""
echo "Erstellte Dateien:"
echo "  - $DIST_DIR/$ZIP_NAME"
echo "  - $PROJECT_ROOT/elementify-${VERSION}-wordpress.zip"
echo ""
echo "Installation in WordPress:"
echo "1. Gehe zu Plugins → Add New → Upload Plugin"
echo "2. Wähle '$ZIP_NAME' aus"
echo "3. WordPress wird fragen: 'Plugin existiert bereits, ersetzen?'"
echo "4. Klicke auf 'Ja, ersetzen'"
echo "5. Das Plugin wird von v0.5.0 auf v1.0.0 aktualisiert"
echo ""
echo "Wichtig: Diese ZIP hat die korrekte Verzeichnisstruktur"
echo "für WordPress Plugin Updates!"