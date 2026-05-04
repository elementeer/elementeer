#!/bin/bash
set -e

# ============================================
# FIX ELEMENTIFY v1.0.0 INSTALLATION
# Für REST API 500 Error nach Update
# ============================================

echo "=== ELEMENTIFY v1.0.0 FIX SCRIPT ==="
echo ""

# SSH Zugangsdaten (anpassen falls nötig)
SSH_HOST="marcus-urban.de"
SSH_USER="$(whoami)"
WP_PATH="/var/www/html"
PLUGIN_DIR="$WP_PATH/wp-content/plugins/elementify"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Prüfe ob Plugin-Verzeichnis existiert
log "1. Prüfe Plugin-Installation..."
ssh "$SSH_USER@$SSH_HOST" "
    if [ -d '$PLUGIN_DIR' ]; then
        echo '✅ Plugin-Verzeichnis existiert'
        echo '   Version:'
        grep 'Version:' '$PLUGIN_DIR/elementify-mcp.php' || echo '   ❌ Version nicht gefunden'
        
        echo '   Wichtige Dateien:'
        ls -la '$PLUGIN_DIR/' | grep -E 'elementify-mcp.php|composer.json|vendor'
        
        echo '   vendor/ Ordner:'
        if [ -d '$PLUGIN_DIR/vendor' ]; then
            echo '   ✅ vendor/ existiert'
            ls -la '$PLUGIN_DIR/vendor/' | head -5
        else
            echo '   ❌ vendor/ fehlt!'
        fi
    else
        echo '❌ Plugin-Verzeichnis nicht gefunden'
    fi
"

# 2. Aktuellen Fehlerstatus prüfen
log ""
log "2. Prüfe REST API Fehler..."
ssh "$SSH_USER@$SSH_HOST" "
    echo 'WordPress Debug Log (letzte 10 Einträge):'
    tail -10 '$WP_PATH/wp-content/debug.log' 2>/dev/null | grep -i 'error\|fatal\|elementify' || echo '   Keine relevanten Fehler im debug.log'
    
    echo ''
    echo 'PHP Error Log:'
    tail -5 /var/log/php*/*.log 2>/dev/null | grep -i 'error\|fatal' | tail -5 || echo '   Keine PHP Fehler gefunden'
"

# 3. Lösung A: Composer install ausführen
log ""
log "3. Lösung A: Composer Abhängigkeiten installieren..."
ssh "$SSH_USER@$SSH_HOST" "
    cd '$PLUGIN_DIR'
    echo 'Aktuelles Verzeichnis: \$(pwd)'
    
    if [ -f 'composer.json' ]; then
        echo '✅ composer.json gefunden'
        
        # Prüfe ob composer verfügbar ist
        if command -v composer &> /dev/null; then
            echo 'Composer verfügbar: \$(composer --version)'
            
            # Installiere Abhängigkeiten
            echo 'Installiere Abhängigkeiten...'
            composer install --no-dev --optimize-autoloader --quiet
            
            if [ $? -eq 0 ]; then
                echo '✅ Composer install erfolgreich'
                
                # Prüfe ob vendor/ jetzt existiert
                if [ -d 'vendor' ]; then
                    echo '✅ vendor/ Ordner erstellt'
                    ls -la vendor/ | head -3
                fi
            else
                echo '❌ Composer install fehlgeschlagen'
            fi
        else
            echo '❌ Composer nicht verfügbar'
            echo '   Installation: sudo apt-get install composer'
        fi
    else
        echo '❌ composer.json nicht gefunden'
    fi
"

# 4. Lösung B: ZIP mit vendor/ Ordner neu erstellen und hochladen
log ""
log "4. Lösung B: Komplette ZIP mit vendor/ neu erstellen..."

# Lokal: ZIP mit allen Abhängigkeiten erstellen
log "Erstelle komplette ZIP mit vendor/ Ordner..."
cd /Users/andrelange/Documents/repositories/github/elementify-mcp/plugin

# Stelle sicher, dass vendor/ existiert
if [ ! -d "vendor" ]; then
    log "Installiere Composer Abhängigkeiten lokal..."
    composer install --no-dev --optimize-autoloader --quiet
fi

# Erstelle ZIP inklusive vendor/
ZIP_FILE="/tmp/elementify-v1.0.0-complete-$(date +%Y%m%d-%H%M%S).zip"
log "Erstelle ZIP: $ZIP_FILE"
zip -r "$ZIP_FILE" . \
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

log "ZIP Größe: $(du -h "$ZIP_FILE" | cut -f1)"

# Hochladen und ersetzen
log "Lade ZIP hoch und ersetze Plugin..."
scp "$ZIP_FILE" "$SSH_USER@$SSH_HOST:/tmp/elementify-complete.zip"

ssh "$SSH_USER@$SSH_HOST" "
    cd '$WP_PATH/wp-content/plugins'
    
    # Backup des aktuellen
    if [ -d 'elementify' ]; then
        backup_name='elementify-backup-\$(date +%Y%m%d-%H%M%S)'
        echo 'Erstelle Backup: \$backup_name'
        cp -r elementify \"\$backup_name\"
    fi
    
    # Entferne altes Plugin
    rm -rf elementify
    
    # Extrahiere neue Version
    echo 'Extrahiere komplette Version...'
    unzip -q -o /tmp/elementify-complete.zip -d elementify
    
    # Setze korrekte Berechtigungen
    echo 'Setze Berechtigungen...'
    chmod -R 755 elementify
    find elementify -type f -exec chmod 644 {} \;
    
    # Lös temporäre ZIP
    rm -f /tmp/elementify-complete.zip
    
    echo '✅ Komplette Version installiert'
    
    # Prüfe Installation
    echo 'Installationsprüfung:'
    if [ -d 'elementify/vendor' ]; then
        echo '✅ vendor/ Ordner vorhanden'
        echo '   Autoloader:'
        ls -la elementify/vendor/autoload.php 2>/dev/null && echo '   ✅ autoload.php existiert'
    else
        echo '❌ vendor/ immer noch nicht vorhanden'
    fi
"

# 5. Plugin reaktivieren
log ""
log "5. Plugin reaktivieren..."
ssh "$SSH_USER@$SSH_HOST" "
    cd '$WP_PATH'
    
    if command -v wp &> /dev/null; then
        echo 'Deaktiviere Plugin...'
        wp plugin deactivate elementify --quiet 2>/dev/null || true
        
        echo 'Aktiviere Plugin...'
        wp plugin activate elementify --quiet
        
        echo 'Leere Cache...'
        wp cache flush --quiet
        
        echo '✅ Plugin reaktiviert'
    else
        echo '⚠️  WP-CLI nicht verfügbar. Plugin manuell reaktivieren.'
    fi
"

# 6. Finaler Test
log ""
log "6. Finaler Test..."
log "Teste REST API:"
curl -s -o /tmp/final-test.txt -w "HTTP Status: %{http_code}\n" https://www.marcus-urban.de/wp-json/elementify/v1/health
echo "Antwort:"
head -c 200 /tmp/final-test.txt 2>/dev/null || true
echo ""

log "Teste Real Cookie Banner API:"
curl -s -o /tmp/cookie-test.txt -w "HTTP Status: %{http_code}\n" https://www.marcus-urban.de/wp-json/real-cookie-banner/v1/consent
echo ""

# 7. Alternative: Rollback auf v0.5.0
log ""
log "7. Alternative: Rollback auf v0.5.0 falls Probleme bleiben..."
log "Falls die obigen Lösungen nicht funktionieren:"
echo "  ssh $SSH_USER@$SSH_HOST"
echo "  cd $WP_PATH/wp-content/plugins"
echo "  rm -rf elementify"
echo "  unzip -o elementify-mcp-0.5.0.zip -d elementify"
echo "  cd elementify"
echo "  composer install --no-dev --optimize-autoloader"
echo "  cd $WP_PATH"
echo "  wp plugin activate elementify"
echo ""

# 8. Zusammenfassung
log ""
log "=== ZUSAMMENFASSUNG ==="
log "Durchgeführte Schritte:"
log "1. Plugin-Installation geprüft"
log "2. Composer Abhängigkeiten installiert (falls nötig)"
log "3. Komplette ZIP mit vendor/ hochgeladen"
log "4. Plugin reaktiviert"
log "5. REST API getestet"
log ""
log "Wenn immer noch 500 Fehler:"
log "1. Prüfe: /var/www/html/wp-content/debug.log"
log "2. Prüfe: /var/log/apache2/error.log oder /var/log/nginx/error.log"
log "3. Deaktiviere andere Plugins für Konflikt-Test"
log "4. Erhöhe PHP memory_limit in wp-config.php"
log ""
log "Support:"
log "- Debug Log: ssh $SSH_USER@$SSH_HOST 'tail -50 /var/www/html/wp-content/debug.log'"
log "- Plugin Status: ssh $SSH_USER@$SSH_HOST 'cd /var/www/html && wp plugin status elementify'"
log "- PHP Info: ssh $SSH_USER@$SSH_HOST 'php -v && php -m | grep -E \"json|curl\"'"
log ""

# Cleanup
rm -f "$ZIP_FILE" /tmp/final-test.txt /tmp/cookie-test.txt 2>/dev/null || true

log "=== FIX SCRIPT ABGESCHLOSSEN ==="