#!/bin/bash
# build-elementify-v2-fixed-final.sh
# ==============================================
# 🛠️  KORRIGIERTE VERSION - Behebt alle kritischen Probleme
# ✅ Inkludiert ALLE Composer-Abhängigkeiten
# ✅ Validiert Plugin-Struktur vor der Erstellung
# ✅ Einfacher Plugin-Name "Elementify"
# ==============================================

set -e  # Bei Fehler abbrechen
set -u  # Undefinierte Variablen als Fehler behandeln

echo ""
echo "🚀 ELEMENTIFY v2 PLUGIN-ZIP ERSTELLUNG (KORRIGIERT)"
echo "=================================================="
echo ""

# ===================== KONFIGURATION =====================
PLUGIN_SLUG="elementify"
PLUGIN_VERSION="2.0.0"
PLUGIN_DISPLAY_NAME="Elementify"
PLUGIN_DESCRIPTION="Complete WordPress/Elementor AI development platform with enhanced API, intelligent composition, workflow staging, governance systems, and MCP integration."

# Verzeichnispfade
REPO_ROOT="/Users/andrelange/Documents/repositories/github/elementify-mcp"
PLUGIN_SOURCE_DIR="$REPO_ROOT/plugin"
BUILD_DIR="$REPO_ROOT/build-temp-$PLUGIN_VERSION"
OUTPUT_ZIP="$REPO_ROOT/$PLUGIN_SLUG-$PLUGIN_VERSION-wordpress-fixed.zip"

# ===================== VORBEREITUNG =====================
echo "📋 VORBEREITUNG"
echo "  • Repo-Verzeichnis: $REPO_ROOT"
echo "  • Plugin-Quelle: $PLUGIN_SOURCE_DIR"
echo "  • Build-Verzeichnis: $BUILD_DIR"
echo "  • Ausgabe-ZIP: $OUTPUT_ZIP"
echo ""

# Vorherige Builds bereinigen
echo "🧹 BEREINIGUNG"
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    echo "  ✅ Altes Build-Verzeichnis gelöscht"
fi

if [ -f "$OUTPUT_ZIP" ]; then
    rm -f "$OUTPUT_ZIP"
    echo "  ✅ Altes ZIP gelöscht"
fi

# Build-Verzeichnis erstellen
mkdir -p "$BUILD_DIR/$PLUGIN_SLUG"
echo "  ✅ Build-Verzeichnis erstellt: $BUILD_DIR/$PLUGIN_SLUG"
echo ""

# ===================== DATEIEN KOPIEREN =====================
echo "📁 DATEIEN KOPIEREN"
echo "  • Kopiere Plugin-Dateien..."

# 1. Haupt-Plugin-Datei und Includes
cp "$PLUGIN_SOURCE_DIR/elementify-mcp.php" "$BUILD_DIR/$PLUGIN_SLUG/"
echo "    ✅ Haupt-Plugin-Datei kopiert"

if [ -d "$PLUGIN_SOURCE_DIR/includes" ]; then
    cp -r "$PLUGIN_SOURCE_DIR/includes" "$BUILD_DIR/$PLUGIN_SLUG/includes"
    echo "    ✅ Includes-Verzeichnis kopiert"
else
    echo "    ❌ KRITISCH: includes-Verzeichnis nicht gefunden!"
    exit 1
fi

# 2. REST API-Verzeichnis (falls vorhanden)
if [ -d "$PLUGIN_SOURCE_DIR/rest-api" ]; then
    cp -r "$PLUGIN_SOURCE_DIR/rest-api" "$BUILD_DIR/$PLUGIN_SLUG/rest-api"
    echo "    ✅ REST API-Verzeichnis kopiert"
fi

# 3. Admin-Verzeichnis (falls vorhanden)
if [ -d "$PLUGIN_SOURCE_DIR/admin" ]; then
    cp -r "$PLUGIN_SOURCE_DIR/admin" "$BUILD_DIR/$PLUGIN_SLUG/admin"
    echo "    ✅ Admin-Verzeichnis kopiert"
fi

# 4. Languages-Verzeichnis (falls vorhanden)
if [ -d "$PLUGIN_SOURCE_DIR/languages" ]; then
    cp -r "$PLUGIN_SOURCE_DIR/languages" "$BUILD_DIR/$PLUGIN_SLUG/languages"
    echo "    ✅ Languages-Verzeichnis kopiert"
fi

# 5. Assets-Verzeichnis (falls vorhanden)
if [ -d "$PLUGIN_SOURCE_DIR/assets" ]; then
    cp -r "$PLUGIN_SOURCE_DIR/assets" "$BUILD_DIR/$PLUGIN_SLUG/assets"
    echo "    ✅ Assets-Verzeichnis kopiert"
fi

echo "  ✅ Alle Plugin-Dateien kopiert"
echo ""

# ===================== COMPOSER ABHÄNGIGKEITEN =====================
echo "📦 COMPOSER ABHÄNGIGKEITEN"
echo "  • Überprüfe vendor-Verzeichnis..."

if [ -d "$PLUGIN_SOURCE_DIR/vendor" ]; then
    echo "  ✅ Vendor-Verzeichnis gefunden"
    
    # Vendor-Verzeichnis kopieren
    cp -r "$PLUGIN_SOURCE_DIR/vendor" "$BUILD_DIR/$PLUGIN_SLUG/vendor"
    echo "  ✅ Vendor-Verzeichnis kopiert"
    
    # Autoloader überprüfen
    if [ -f "$BUILD_DIR/$PLUGIN_SLUG/vendor/autoload.php" ]; then
        echo "  ✅ Composer Autoloader vorhanden"
    else
        echo "  ❌ KRITISCH: vendor/autoload.php nicht gefunden!"
        exit 1
    fi
else
    echo "  ❌ KRITISCH: Vendor-Verzeichnis nicht gefunden!"
    echo "  • Bitte führe 'composer install' im plugin/ Verzeichnis aus."
    exit 1
fi
echo ""

# ===================== PLUGIN METADATEN AKTUALISIEREN =====================
echo "✏️  PLUGIN METADATEN AKTUALISIEREN"
MAIN_PLUGIN_FILE="$BUILD_DIR/$PLUGIN_SLUG/elementify-mcp.php"

if [ -f "$MAIN_PLUGIN_FILE" ]; then
    # Backup der Originaldatei
    cp "$MAIN_PLUGIN_FILE" "$MAIN_PLUGIN_FILE.backup"
    
    echo "  • Aktualisiere Plugin-Header..."
    
    # Plugin-Name auf "Elementify" vereinfachen
    sed -i '' "s/Plugin Name: Elementify v2 - WordPress\/Elementor AI Development Platform/Plugin Name: $PLUGIN_DISPLAY_NAME/" "$MAIN_PLUGIN_FILE"
    sed -i '' "s/Title: Elementify v2 - WordPress\/Elementor AI Development Platform/Title: $PLUGIN_DISPLAY_NAME/" "$MAIN_PLUGIN_FILE"
    
    # Description aktualisieren (falls anders)
    CURRENT_DESC=$(grep -o 'Description: .*' "$MAIN_PLUGIN_FILE" | head -1)
    if [[ ! "$CURRENT_DESC" =~ "$PLUGIN_DESCRIPTION" ]]; then
        sed -i '' "s/Description: .*/Description: $PLUGIN_DESCRIPTION/" "$MAIN_PLUGIN_FILE"
    fi
    
    echo "  ✅ Plugin-Header aktualisiert"
    echo "  • Neuer Name: $PLUGIN_DISPLAY_NAME"
    echo "  • Beschreibung: $PLUGIN_DESCRIPTION"
else
    echo "  ❌ Haupt-Plugin-Datei nicht gefunden: $MAIN_PLUGIN_FILE"
    exit 1
fi
echo ""

# ===================== 🔍 KRITISCHE VALIDIERUNG =====================
echo "🔍 KRITISCHE VALIDIERUNG"
echo "  • Überprüfe, ob alle essentiellen Dateien vorhanden sind..."

# Kritische Dateien für v2 Funktion
CRITICAL_FILES=(
    "elementify-mcp.php"
    "vendor/autoload.php"
    "includes/Plugin.php"
    "includes/Auth/Manager.php"
    "includes/Api/Router.php"
)

ALL_GOOD=true
for FILE in "${CRITICAL_FILES[@]}"; do
    FILE_PATH="$BUILD_DIR/$PLUGIN_SLUG/$FILE"
    if [ -f "$FILE_PATH" ]; then
        echo "    ✅ $FILE"
    else
        echo "    ❌ $FILE FEHLT!"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = false ]; then
    echo ""
    echo "❌ KRITISCHE FEHLER: Einige essentielle Dateien fehlen!"
    echo "   Das Plugin kann nicht erstellt werden."
    exit 1
fi

echo "  ✅ Alle kritischen Dateien vorhanden"
echo ""

# ===================== 📁 ICON HINWEIS =====================
echo "🎨 PLUGIN-ICON HINWEIS"
echo "  ⚠️  Hinweis: SVG/ICO-Icon kann nicht automatisch eingefügt werden."
echo "  • Falls ein Icon benötigt wird, kopiere 'elementify-001_icon.ico' oder"
echo "    'elementify-001_icon.svg' manuell nach der Installation in:"
echo "    /wp-content/plugins/elementify/assets/"
echo ""

# ===================== 🔧 AKTIVIERUNGS-HOOK ÜBERPRÜFUNG =====================
echo "🔧 AKTIVIERUNGS-HOOK ÜBERPRÜFUNG"
echo "  • Überprüfe, ob register_activation_hook vorhanden ist..."

if grep -q "register_activation_hook" "$MAIN_PLUGIN_FILE"; then
    echo "  ✅ Activation Hook gefunden"
else
    echo "  ⚠️  Activation Hook nicht gefunden! Füge ihn hinzu..."
    
    # Nach dem Plugin-Header den Activation Hook hinzufügen
    sed -i '' '/\*\/$/a\
\
\/\/ Activation hook\
register_activation_hook(__FILE__, function() {\
    // Initialize plugin on activation\
    if (class_exists(\"Elementify\\\\MCP\\\\Plugin\")) {\
        Elementify\\\\MCP\\\\Plugin::get_instance()->activate();\
    }\
});' "$MAIN_PLUGIN_FILE"
    
    echo "  ✅ Activation Hook hinzugefügt"
fi
echo ""

# ===================== 📦 ZIP ERSTELLEN =====================
echo "📦 ZIP-ARCHIV ERSTELLEN"
echo "  • Erstelle ZIP-Datei..."

cd "$BUILD_DIR"

if zip -rq "$OUTPUT_ZIP" "$PLUGIN_SLUG"; then
    echo "  ✅ ZIP erfolgreich erstellt: $OUTPUT_ZIP"
    
    # ZIP-Größe anzeigen
    ZIP_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
    echo "  • Dateigröße: $ZIP_SIZE"
else
    echo "  ❌ ZIP-Erstellung fehlgeschlagen!"
    exit 1
fi
echo ""

# ===================== ✅ FINALE ÜBERPRÜFUNG =====================
echo "✅ FINALE ÜBERPRÜFUNG"
echo "  • Überprüfe ZIP-Struktur..."

# Temporäres Verzeichnis für ZIP-Überprüfung
TEMP_CHECK_DIR="$BUILD_DIR/zip-check"
mkdir -p "$TEMP_CHECK_DIR"
cd "$TEMP_CHECK_DIR"
unzip -q "$OUTPUT_ZIP" 2>/dev/null || true

echo "  • Enthaltene Verzeichnisse:"
find "$PLUGIN_SLUG" -type d | head -15 | while read dir; do
    echo "    📁 $dir"
done

echo ""
echo "  • Wichtige Dateien im ZIP:"
IMPORTANT_FILES=(
    "$PLUGIN_SLUG/elementify-mcp.php"
    "$PLUGIN_SLUG/vendor/autoload.php"
    "$PLUGIN_SLUG/includes/Plugin.php"
    "$PLUGIN_SLUG/includes/Auth/Manager.php"
    "$PLUGIN_SLUG/includes/Api/Router.php"
)

for FILE in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo "    ✅ $FILE"
    else
        echo "    ❌ $FILE (fehlt im ZIP!)"
    fi
done

# Aufräumen
cd "$REPO_ROOT"
rm -rf "$TEMP_CHECK_DIR"
echo ""

# ===================== 🎉 FERTIG =====================
echo "🎉 PLUGIN-ZIP ERFOLGREICH ERSTELLT!"
echo "=========================================="
echo ""
echo "📦 AUSGABE-DATEI:"
echo "   $OUTPUT_ZIP"
echo ""
echo "🚀 NÄCHSTE SCHRITTE:"
echo "   1. Melde dich bei WordPress Admin an"
echo "   2. Gehe zu: Plugins → Installieren"
echo "   3. Lade die ZIP-Datei hoch: $OUTPUT_ZIP"
echo "   4. Aktiviere das Plugin"
echo "   5. Teste die REST API mit:"
echo "      curl -H \"X-API-Key: ek_8eb2088d7da2d9e9b2088cf90e09e4d214bbe456c16bf672\" \\"
echo "           https://www.marcus-urban.de/wp-json/elementify/v1"
echo ""
echo "🔧 FÜR DAS ICON:"
echo "   Falls benötigt, kopiere 'elementify-001_icon.ico' oder"
echo "   'elementify-001_icon.svg' nach der Installation manuell in:"
echo "   /wp-content/plugins/elementify/assets/"
echo ""
echo "📝 HINWEIS:"
echo "   Dieses Skript standardisiert den Build-Prozess und"
echo "   stellt sicher, dass zukünftige Releases korrekt sind."
echo ""

# ===================== 🔄 AUFRÄUMEN =====================
echo "🗑️  AUFRÄUMEN"
echo "  • Lösche temporäres Build-Verzeichnis..."
rm -rf "$BUILD_DIR"
echo "  ✅ Build-Verzeichnis gelöscht"
echo ""
echo "✨ VORGANG ABGESCHLOSSEN ✨"