# Elementify v2 Deployment Guide
## WordPress/Elementor AI Development Platform

## 📦 Deployment Package
**Datei:** `elementify-2.0.0-wordpress.zip`
**Größe:** ~190KB
**Version:** 2.0.0
**PHP:** 8.0+
**WordPress:** 6.0+
**Elementor:** Erforderlich

## 🎯 Deployment auf zwei Sites

### 1. marcus-urban.de (Produktion)
**Aktueller Status:**
- Elementify v1 installiert
- 2 Popup-Formulare (ID 524, 525) aktiv
- "Startseite NEU" verwendet Popups

**Deployment Schritte:**
```bash
# 1. Backup erstellen
- WordPress Database exportieren
- Plugin-Verzeichnis sichern: /wp-content/plugins/elementify/

# 2. Altes Plugin deaktivieren
WordPress Admin → Plugins → Elementify → Deaktivieren

# 3. Neues Plugin hochladen
Plugins → Add New → Upload Plugin → elementify-2.0.0-wordpress.zip

# 4. Plugin aktivieren
WordPress wird automatisch v1 → v2 migrieren

# 5. Migration verifizieren
- Popup-Formulare (524, 525) sollten weiterhin funktionieren
- Alle Templates sollten erhalten bleiben
- API Keys migriert
```

### 2. preview.fusionaize.com (Test)
**Aktueller Status:**
- Frische Installation testen

**Deployment Schritte:**
```bash
# 1. Plugin installieren
Plugins → Add New → Upload Plugin → elementify-2.0.0-wordpress.zip

# 2. Plugin aktivieren
- Ersteinrichtung durchführen
- API Keys konfigurieren

# 3. Vollständiges Testing
```

## 🔄 v1 → v2 Migration

### Automatische Migration
Das Plugin führt automatisch folgende Migrationen durch:
1. **API Keys** - Alle bestehenden Keys werden migriert
2. **Governance Settings** - Einstellungen werden übernommen
3. **Templates** - Alle Elementor Templates bleiben erhalten
4. **Capabilities** - Neue v2 Capabilities werden hinzugefügt

### Manuelle Überprüfung nach Migration
```php
// Prüfe Migration Status
$ curl https://marcus-urban.de/wp-json/elementify/v1/health
{
  "status": "ok",
  "version": "2.0.0",
  "migration": "v1_to_v2_complete",
  "features": ["enhanced_api", "intelligence_layer", "workflow_staging", "governance"]
}
```

## 🧪 Testing nach Deployment

### 1. Basis-Funktionalität
```bash
# API Health Check
curl https://marcus-urban.de/wp-json/elementify/v1/health

# Template Listing
curl https://marcus-urban.de/wp-json/elementify/v1/templates

# Capability Check
curl https://marcus-urban.de/wp-json/elementify/v1/capabilities
```

### 2. Popup-Formulare testen (marcus-urban.de)
```javascript
// Teste B2B Popup (ID 524)
document.querySelector('[data-elementor-action="popup:open"]').click();

// Teste Footer Popup (ID 525)
document.querySelector('[data-elementor-action="popup:open"]').click();

// Formular-Submission testen
```

### 3. Neue v2 Features testen
```bash
# Intelligence Layer
curl -X POST https://preview.fusionaize.com/wp-json/elementify/v1/intelligence/compose \
  -H "Content-Type: application/json" \
  -d '{"sections": ["hero", "features", "cta"]}'

# Workflow Staging
curl -X POST https://preview.fusionaize.com/wp-json/elementify/v1/workflow/create \
  -H "Content-Type: application/json" \
  -d '{"content": "test", "environment": "draft"}'

# Governance System
curl https://preview.fusionaize.com/wp-json/elementify/v1/governance/settings
```

### 4. Performance Testing
```bash
# API Response Time
time curl -s https://marcus-urban.de/wp-json/elementify/v1/health > /dev/null

# Concurrent Requests
ab -n 100 -c 10 https://marcus-urban.de/wp-json/elementify/v1/health
```

## 🚨 Rollback Procedure

### Falls Probleme auftreten:
```bash
# 1. Plugin deaktivieren
WordPress Admin → Plugins → Elementify v2 → Deaktivieren

# 2. v1 Plugin wiederherstellen
#    a) Aus Backup: /wp-content/plugins/elementify-v1/
#    b) Oder: elementify-1.0.0-wordpress.zip hochladen

# 3. v1 Plugin aktivieren
#    Daten bleiben erhalten (keine DB Änderungen in v2)
```

## 📊 Erfolgskriterien

### Für marcus-urban.de:
- [ ] Popup-Formulare (524, 525) funktionieren
- [ ] "Startseite NEU" zeigt Popups korrekt an
- [ ] Alle Templates sind zugänglich
- [ ] API Response < 200ms
- [ ] Keine PHP Errors im Debug Log

### Für preview.fusionaize.com:
- [ ] Plugin aktiviert ohne Fehler
- [ ] Alle v2 Features funktionieren
- [ ] Intelligence Layer gibt Ergebnisse
- [ ] Workflow Staging arbeitet
- [ ] Governance System konfigurierbar

## 📋 Deployment Checklist

### Vor Deployment:
- [ ] Backup von Database und Plugin
- [ ] WordPress Debug auf false setzen
- [ ] Maintenance Mode aktivieren (optional)

### Während Deployment:
- [ ] v1 Plugin deaktivieren
- [ ] v2 ZIP hochladen
- [ ] Plugin aktivieren
- [ ] Migration abwarten

### Nach Deployment:
- [ ] Health Check durchführen
- [ ] Popup-Formulare testen
- [ ] API Features testen
- [ ] Performance messen
- [ ] Error Log überprüfen

## 🔧 Troubleshooting

### Häufige Probleme:
1. **"Plugin konnte nicht aktiviert werden"**
   - PHP Version prüfen (mind. 8.0)
   - Elementor aktiviert?
   - WordPress Debug Log prüfen

2. **"Popup-Formulare funktionieren nicht"**
   - Real Cookie Banner Konflikt prüfen
   - Elementor Popup Settings überprüfen
   - JavaScript Console prüfen

3. **"API gibt 404 Error"**
   - Permalinks neu speichern
   - .htaccess prüfen
   - REST API aktiviert?

### Support:
- Debug Log: `/wp-content/debug.log`
- Elementor System Info: Elementor → Tools → System Info
- API Test: `/wp-json/elementify/v1/health`

## 🎉 Erfolgsmeldung

Wenn alles funktioniert:
- ✅ Health Check: `{"status":"ok","version":"2.0.0"}`
- ✅ Popup-Formulare öffnen sich
- ✅ Templates sind zugänglich
- ✅ Neue Features funktionieren
- ✅ Performance ist gut (<200ms)

**Elementify v2 ist erfolgreich deployed!** 🚀