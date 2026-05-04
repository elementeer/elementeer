#!/bin/bash
set -e

# ============================================
# REST API 500 Error Diagnose Script
# Für Elementify Plugin nach Update
# ============================================

echo "=== REST API 500 ERROR DIAGNOSE ==="
echo ""

# 1. WordPress Debug aktivieren
echo "1. Aktiviere WordPress Debug..."
cat > /tmp/debug-config.php << 'DEBUG'
<?php
// Temporäre debug.php für Diagnose
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
define('SAVEQUERIES', true);
DEBUG

# 2. Fehlerlog überprüfen
echo ""
echo "2. Überprüfe WordPress Error Log..."
ERROR_LOG="/var/www/html/wp-content/debug.log"
if [ -f "$ERROR_LOG" ]; then
    echo "Letzte 20 Fehler aus debug.log:"
    tail -20 "$ERROR_LOG" 2>/dev/null | grep -i "error\|fatal\|warning\|elementify" || echo "Keine relevanten Fehler gefunden"
else
    echo "debug.log nicht gefunden. Versuche alternative Logs:"
    # Apache/Nginx Logs
    ls -la /var/log/apache2/error.log 2>/dev/null && tail -10 /var/log/apache2/error.log | grep -i "php\|elementify" || true
    ls -la /var/log/nginx/error.log 2>/dev/null && tail -10 /var/log/nginx/error.log | grep -i "php\|elementify" || true
fi

# 3. Plugin Status prüfen
echo ""
echo "3. Prüfe Elementify Plugin Status..."
cd /var/www/html
if command -v wp &> /dev/null; then
    echo "WP-CLI verfügbar:"
    wp plugin status elementify --fields=name,status,version
    
    echo ""
    echo "Prüfe auf Plugin-Konflikte:"
    wp plugin list --fields=name,status --status=active | grep -v elementify
else
    echo "WP-CLI nicht verfügbar. Prüfe Plugin manuell:"
    ls -la /var/www/html/wp-content/plugins/elementify/
fi

# 4. PHP Fehler in Elementify prüfen
echo ""
echo "4. Prüfe Elementify PHP Syntax..."
cd /var/www/html/wp-content/plugins/elementify
if command -v php &> /dev/null; then
    echo "PHP Syntax Check:"
    find . -name "*.php" -type f -exec php -l {} \; 2>&1 | grep -v "No syntax errors" | head -10 || echo "✅ Keine Syntax-Fehler gefunden"
    
    echo ""
    echo "Prüfe Autoloader:"
    if [ -f "vendor/autoload.php" ]; then
        echo "✅ Autoloader vorhanden"
        php -r "require_once 'vendor/autoload.php'; echo '✅ Autoloader lädt erfolgreich\n';" 2>&1 || echo "❌ Autoloader Fehler"
    else
        echo "❌ Autoloader nicht gefunden. Führe aus: composer install --no-dev --optimize-autoloader"
    fi
fi

# 5. REST API Test
echo ""
echo "5. Teste REST API Zugriff..."
API_URL="https://www.marcus-urban.de/wp-json"
echo "Teste: $API_URL/real-cookie-banner/v1/consent"
curl -s -o /tmp/api-test1.txt -w "HTTP Status: %{http_code}\n" "$API_URL/real-cookie-banner/v1/consent"
echo "Antwort (erste 200 Zeichen):"
head -c 200 /tmp/api-test1.txt 2>/dev/null || true
echo ""

echo "Teste: $API_URL/elementify/v1/health"
curl -s -o /tmp/api-test2.txt -w "HTTP Status: %{http_code}\n" "$API_URL/elementify/v1/health"
echo "Antwort (erste 200 Zeichen):"
head -c 200 /tmp/api-test2.txt 2>/dev/null || true
echo ""

# 6. Plugin-Konflikte testen
echo ""
echo "6. Plugin-Konflikt Test..."
echo "Deaktiviere Elementify temporär (nur für Test)..."
cd /var/www/html
if command -v wp &> /dev/null; then
    wp plugin deactivate elementify --quiet 2>/dev/null || true
    echo "Elementify deaktiviert. Teste REST API..."
    curl -s -o /tmp/api-test3.txt -w "HTTP Status: %{http_code}\n" "$API_URL/real-cookie-banner/v1/consent"
    echo "Status nach Deaktivierung: %{http_code}"
    
    echo "Aktiviere Elementify wieder..."
    wp plugin activate elementify --quiet
else
    echo "WP-CLI nicht verfügbar für Konflikt-Test"
fi

# 7. PHP Version und Extensions
echo ""
echo "7. PHP Konfiguration:"
php -v | head -1
php -m | grep -E "json|curl|mbstring|openssl"

# 8. Empfehlungen
echo ""
echo "=== EMPFEHLUNGEN ==="
echo ""
echo "Mögliche Ursachen und Lösungen:"
echo ""
echo "A) PHP Fatal Error in Elementify:"
echo "   - Prüfe debug.log für konkrete Fehlermeldung"
echo "   - Stelle sicher, dass composer install --no-dev --optimize-autoloader ausgeführt wurde"
echo ""
echo "B) Plugin-Konflikt mit Real Cookie Banner:"
echo "   - Teste mit nur Elementify und Real Cookie Banner aktiv"
echo "   - Deaktiviere andere Plugins nacheinander"
echo ""
echo "C) REST API Blockierung:"
echo "   - Prüfe .htaccess oder Nginx Konfiguration"
echo "   - Prüfe Security Plugins (Wordfence, iThemes Security, etc.)"
echo ""
echo "D) Memory Limit zu niedrig:"
echo "   - Erhöhe PHP memory_limit in wp-config.php:"
echo "     define('WP_MEMORY_LIMIT', '256M');"
echo "     define('WP_MAX_MEMORY_LIMIT', '512M');"
echo ""
echo "Nächste Schritte:"
echo "1. Fehler in debug.log identifizieren"
echo "2. Bei Autoloader-Fehler: cd /var/www/html/wp-content/plugins/elementify && composer install --no-dev --optimize-autoloader"
echo "3. Bei Plugin-Konflikt: Plugins nacheinander deaktivieren"
echo "4. Falls nötig: Rollback auf v0.5.0 ZIP"
echo ""

# 9. Quick Fix: Elementify Reparatur
echo ""
echo "9. Elementify Quick Repair..."
cd /var/www/html/wp-content/plugins/elementify
if [ -f "composer.json" ]; then
    echo "Führe composer install aus..."
    composer install --no-dev --optimize-autoloader --quiet
    echo "✅ Composer Abhängigkeiten installiert"
fi

echo ""
echo "=== DIAGNOSE ABGESCHLOSSEN ==="
echo "Überprüfe /var/www/html/wp-content/debug.log für detaillierte Fehler"