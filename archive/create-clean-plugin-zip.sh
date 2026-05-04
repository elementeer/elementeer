#!/bin/bash
set -e

# ============================================
# Create Clean WordPress Plugin ZIP
# ============================================
# Erstellt eine saubere ZIP ohne Test-Dateien
# ============================================

echo "=== Clean WordPress Plugin ZIP ==="
echo ""

# Verzeichnisse
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$PROJECT_ROOT/plugin"
PLUGIN_NAME="elementify"
VERSION="1.0.0"
TEMP_DIR="/tmp/elementify-clean-$(date +%s)"
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

# 1. Bereinige Plugin-Quelle
log "1. Bereinige Plugin-Quelldateien..."
cd "$PLUGIN_SRC"

# Entferne Test-Dateien und temporäre Dateien
rm -rf tests/ 2>/dev/null || true
rm -rf coverage/ 2>/dev/null || true
rm -f phpunit.xml phpunit.xml.bak 2>/dev/null || true
rm -f patchwork.json 2>/dev/null || true
rm -f *.log 2>/dev/null || true
rm -f *.zip *.zip.bak 2>/dev/null || true
rm -f composer.lock 2>/dev/null || true

# Stelle sicher, dass vendor/ vorhanden ist
if [ ! -f "vendor/autoload.php" ]; then
    warn "vendor/autoload.php nicht gefunden"
    if command -v composer &> /dev/null; then
        log "Installiere Composer Abhängigkeiten..."
        composer install --no-dev --optimize-autoloader --quiet
        success "Composer Abhängigkeiten installiert"
    else
        error "Composer nicht verfügbar"
        exit 1
    fi
fi

# 2. Erstelle temporäres Verzeichnis
log "2. Erstelle temporäre Struktur..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/$PLUGIN_NAME"
mkdir -p "$DIST_DIR"

# 3. Kopiere nur benötigte Dateien
log "3. Kopiere Plugin-Dateien..."
cp -r includes "$TEMP_DIR/$PLUGIN_NAME/" 2>/dev/null || true
cp -r vendor "$TEMP_DIR/$PLUGIN_NAME/" 2>/dev/null || true
cp elementify-mcp.php "$TEMP_DIR/$PLUGIN_NAME/"
cp composer.json "$TEMP_DIR/$PLUGIN_NAME/" 2>/dev/null || true

# Endanwender readme
if [ -f "readme-enduser.txt" ]; then
    cp readme-enduser.txt "$TEMP_DIR/$PLUGIN_NAME/readme.txt"
    log "Endanwender-Dokumentation erstellt"
elif [ -f "readme.txt" ]; then
    cp readme.txt "$TEMP_DIR/$PLUGIN_NAME/readme.txt"
fi

# 4. Erstelle ZIP
log "4. Erstelle WordPress ZIP..."
cd "$TEMP_DIR"
ZIP_NAME="elementify-${VERSION}-clean.zip"
zip -ry "$ZIP_NAME" "$PLUGIN_NAME/" -q

# 5. Validiere
log "5. Validiere ZIP..."
VALID_TEMP="/tmp/validate-clean-$(date +%s)"
mkdir -p "$VALID_TEMP"
cd "$VALID_TEMP"
unzip -q "$TEMP_DIR/$ZIP_NAME"

echo "ZIP-Inhalt:"
find "$PLUGIN_NAME" -type f -name "*.php" | head -10 | while read file; do
    echo "  - $(basename "$file")"
done

if [ -f "$PLUGIN_NAME/elementify-mcp.php" ]; then
    VERSION_CHECK=$(grep -i "version" "$PLUGIN_NAME/elementify-mcp.php" | head -1)
    echo "✅ Plugin-Version: $VERSION_CHECK"
fi

if [ -f "$PLUGIN_NAME/vendor/autoload.php" ]; then
    echo "✅ Autoloader vorhanden"
else
    echo "❌ Autoloader fehlt"
fi

# 6. Kopiere fertige ZIP
log "6. Kopiere fertige Dateien..."
cp "$TEMP_DIR/$ZIP_NAME" "$DIST_DIR/"
cp "$TEMP_DIR/$ZIP_NAME" "$PROJECT_ROOT/elementify-${VERSION}-clean.zip"

# 7. Aufräumen
rm -rf "$VALID_TEMP"
rm -rf "$TEMP_DIR"

# 8. Erfolg
success "✅ Clean WordPress Plugin ZIP erstellt!"
echo ""
echo "Dateien:"
echo "  - $DIST_DIR/$ZIP_NAME"
echo "  - $PROJECT_ROOT/elementify-${VERSION}-clean.zip"
echo ""
echo "Größe: $(du -h "$PROJECT_ROOT/elementify-${VERSION}-clean.zip" | cut -f1)"
echo ""
echo "Diese ZIP:"
echo "✅ Enthält nur benötigte Dateien (keine Tests)"
echo "✅ Hat korrekte WordPress Verzeichnisstruktur"
echo "✅ Enthält vollständigen vendor/ Ordner"
echo "✅ Plug & Play Installation"
echo ""
echo "Installation:"
echo "1. Deaktiviere alte Elementify Version (v0.5.0)"
echo "2. Lösche das Plugin (optional, für sauberes Update)"
echo "3. Lade diese ZIP in WordPress hoch"
echo "4. Aktiviere das Plugin"
echo "5. Teste REST API: /wp-json/elementify/v1/health"