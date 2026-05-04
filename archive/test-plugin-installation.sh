#!/bin/bash
set -e

# ============================================
# Test Elementify Plugin Installation
# ============================================
# Simuliert die WordPress Installation
# ============================================

echo "=== Elementify Plugin Installation Test ==="
echo ""

# Temporäres WordPress Verzeichnis
TEST_DIR="/tmp/wp-test-$(date +%s)"
PLUGIN_DIR="$TEST_DIR/wp-content/plugins/elementify"
ZIP_FILE="elementify-1.0.0-wordpress.zip"

mkdir -p "$PLUGIN_DIR"
mkdir -p "$TEST_DIR"

# ZIP extrahieren
echo "1. Extrahiere Plugin ZIP..."
cd "$TEST_DIR"
if [ -f "/Users/andrelange/Documents/repositories/github/elementify-mcp/$ZIP_FILE" ]; then
    unzip -q "/Users/andrelange/Documents/repositories/github/elementify-mcp/$ZIP_FILE"
else
    unzip -q "/Users/andrelange/Documents/repositories/github/elementify-mcp/dist/$ZIP_FILE"
fi

# Prüfe Plugin-Struktur
echo "2. Prüfe Plugin-Struktur..."
if [ -f "$PLUGIN_DIR/elementify-mcp.php" ]; then
    echo "✅ Hauptdatei gefunden: elementify-mcp.php"
    
    # Prüfe Version
    VERSION=$(grep "Version:" "$PLUGIN_DIR/elementify-mcp.php" | head -1 | sed 's/.*Version:[[:space:]]*//' | sed "s/'//g" | sed 's/"//g' | tr -d ' ')
    echo "✅ Version: $VERSION"
    
    # Prüfe Autoloader
    if [ -f "$PLUGIN_DIR/vendor/autoload.php" ]; then
        echo "✅ Autoloader gefunden: vendor/autoload.php"
        
        # Teste Autoloader
        TEST_PHP=$(cat << 'PHP'
<?php
// Simuliere WordPress Umgebung
define('ABSPATH', '/tmp/test');
define('ELEMENTIFY_MCP_DIR', __DIR__ . '/');

// Teste Autoloader
require_once __DIR__ . '/vendor/autoload.php';

// Teste Plugin-Klassen
if (class_exists('Elementify\\MCP\\Plugin')) {
    echo "✅ Plugin-Klasse lädt\n";
} else {
    echo "❌ Plugin-Klasse lädt nicht\n";
}

// Teste Composer Autoloader
if (function_exists('composer\\autoload\\classloader')) {
    echo "✅ Composer Autoloader registriert\n";
} else {
    echo "⚠️  Composer Autoloader nicht registriert\n";
}
PHP
)
        
        echo "$TEST_PHP" > "$TEST_DIR/test-autoload.php"
        cd "$PLUGIN_DIR"
        php "$TEST_DIR/test-autoload.php" 2>&1 || echo "⚠️  PHP Test fehlgeschlagen"
        
    else
        echo "❌ Autoloader fehlt: vendor/autoload.php"
    fi
    
    # Prüfe wichtige Dateien
    IMPORTANT_FILES=(
        "includes/Plugin.php"
        "includes/Api/Router.php"
        "includes/Admin/Page.php"
        "includes/Auth/Manager.php"
    )
    
    echo ""
    echo "3. Prüfe wichtige Plugin-Dateien..."
    for file in "${IMPORTANT_FILES[@]}"; do
        if [ -f "$PLUGIN_DIR/$file" ]; then
            echo "✅ $file"
        else
            echo "❌ $file fehlt"
        fi
    done
    
else
    echo "❌ Hauptdatei nicht gefunden"
fi

# Aufräumen
echo ""
echo "4. Aufräumen..."
rm -rf "$TEST_DIR"
echo "✅ Test abgeschlossen"

echo ""
echo "=== EMPFEHLUNGEN ==="
echo "1. Verwende 'elementify-1.0.0-wordpress.zip' für WordPress Upload"
echo "2. Stelle sicher, dass PHP 8.0+ auf dem Server läuft"
echo "3. Aktiviere WordPress Debug Log für Fehleranalyse"
echo "4. Bei REST API Fehlern: Prüfe /wp-content/debug.log"