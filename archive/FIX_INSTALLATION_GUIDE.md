# 🔧 Elementify v1.0.0 Installation Fix Guide

## ❌ Problem
- WordPress erkennt v1.0.0 nicht als Update von v0.5.0
- Nach Aktivierung: "Großer Cookie Banner Fehlerblock" (REST API 500 Error)
- Plugin wird nicht korrekt aktualisiert

## ✅ Lösung

### Schritt 1: Komplette Clean Installation
**ZIP-Datei:** `elementify-1.0.0-clean.zip` (144 KB)

Diese ZIP hat:
- ✅ Korrekte WordPress Verzeichnisstruktur (`elementify/` Root)
- ✅ Vollständiger `vendor/` Ordner mit Autoloader
- ✅ Keine Test-Dateien
- ✅ Plug & Play (kein Composer/SSH nötig)

### Schritt 2: Manuelles Update-Procedure

#### Option A: WordPress Admin (empfohlen)
1. **Deaktiviere** alte Elementify Version (v0.5.0)
2. **Lösche** das Plugin komplett (Plugins → Elementify → Delete)
3. **Gehe zu** Plugins → Add New → Upload Plugin
4. **Wähle** `elementify-1.0.0-clean.zip`
5. **Installiere** und **aktiviere** das Plugin
6. **Teste** REST API: `https://marcus-urban.de/wp-json/elementify/v1/health`

#### Option B: Direktes Deployment (falls SSH verfügbar)
```bash
# 1. Skript ausführbar machen
chmod +x deploy-to-marcus-urban.sh

# 2. SSH Zugang prüfen (SSH Key muss eingerichtet sein)
# 3. Deploy ausführen
./deploy-to-marcus-urban.sh
```

### Schritt 3: Fehlerdiagnose (falls Problem bleibt)

#### 1. Debug-Skript hochladen
```bash
# debug-plugin-errors.php auf Server kopieren
scp debug-plugin-errors.php user@marcus-urban.de:/var/www/html/
```

#### 2. Debug-Skript ausführen
Besuche: `https://marcus-urban.de/debug-plugin-errors.php`

Das Skript zeigt:
- ✅ PHP Version (muss 8.0+ sein)
- ✅ Plugin Dateien
- ✅ Autoloader Funktionalität
- ✅ Syntax-Fehler

#### 3. WordPress Debug Log prüfen
```bash
# Auf Server ausführen:
tail -50 /var/www/html/wp-content/debug.log
```

#### 4. Real Cookie Banner Problem beheben
1. Gehe zu Plugins → Real Cookie Banner
2. Deaktiviere das Plugin
3. Aktiviere es wieder
4. ODER: Gehe zu Real Cookie Banner → Settings → "Save Changes"

## 🔍 Häufige Fehler & Lösungen

### Fehler 1: "Plugin wird nicht als Update erkannt"
**Ursache:** Unterschiedliche Plugin-Struktur oder Cache
**Lösung:** 
- Altes Plugin komplett löschen
- Neue ZIP mit korrekter Verzeichnisstruktur verwenden

### Fehler 2: "REST API 500 Error"
**Ursache:** PHP Fatal Error beim Plugin-Load
**Lösung:**
1. Prüfe PHP Version (`debug-plugin-errors.php`)
2. Prüfe Autoloader (`vendor/autoload.php`)
3. Erhöhe PHP Memory Limit auf 256M

### Fehler 3: "Real Cookie Banner Fehlerblock"
**Ursache:** REST API ist kaputt wegen PHP-Fehler
**Lösung:**
1. Elementify Plugin deaktivieren
2. Real Cookie Banner neu laden (deaktivieren/aktivieren)
3. Elementify Plugin mit korrigierter Version neu installieren

## 📦 Verfügbare ZIP-Dateien

1. **`elementify-1.0.0-clean.zip`** (144 KB) - **EMPFEHLUNG**
   - Saubere Installation
   - Korrekte WordPress-Struktur
   - Vollständiger Autoloader

2. `elementify-1.0.0-wordpress.zip` (189 KB)
   - Ältere Version mit Test-Dateien
   - Nicht empfohlen

3. `elementify-mcp-1.0.0-standalone-fixed.zip` (140 KB)
   - Falsche Struktur (kein Plugin-Verzeichnis)
   - Nicht für WordPress Upload geeignet

## 🚀 Erfolgs-Checkliste

Nach erfolgreicher Installation:
- [ ] Kein "Cookie Banner Fehlerblock" mehr
- [ ] REST API erreichbar: `/wp-json/elementify/v1/health`
- [ ] WordPress Admin: Elementify Menu sichtbar
- [ ] API Keys können erstellt werden
- [ ] MCP Verbindung funktioniert

## 📞 Support

Bei weiterhin bestehenden Problemen:
1. Debug-Output von `debug-plugin-errors.php` teilen
2. Inhalt von `/wp-content/debug.log` teilen
3. GitHub Issue erstellen: https://github.com/elementify/elementify-mcp/issues

**Wichtig:** Die v1.0.0 Version ist Plug & Play - keine zusätzlichen Tools wie Composer oder SSH-Zugang nötig!