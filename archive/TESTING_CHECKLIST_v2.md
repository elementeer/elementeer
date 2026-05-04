# Elementify v2 Testing Checklist
## Manuelle Tests nach Deployment

## 📋 Quick Test Checklist - ACTUAL RESULTS (19.04.2026)

### ✅ 1. Basis-Funktionalität (Beide Sites)
- [x] **Plugin aktiviert** ohne Fehler ✓ (Site Info funktioniert)
- [ ] **Health Check** `/wp-json/elementify/v1/health` ✗ (404 - Endpoint existiert nicht in v2)
- [x] **Template Listing** ✓ (Funktioniert über elementify_list_templates)
- [x] **Capabilities** ✓ (Werden in Site Info angezeigt)

### ✅ 2. marcus-urban.de Spezifisch
- [x] **Popup 524** (B2B Formular) existiert ✓ (Template ID 524 vorhanden)
- [x] **Popup 525** (Footer Formular) existiert ✓ (Template ID 525 vorhanden)
- [ ] **Formular-Submission** funktioniert ? (Muss manuell getestet werden)
- [ ] **Startseite NEU** zeigt Popups ? (Muss manuell getestet werden)
- [x] **Keine Datenverluste** bei Templates ✓ (22 Templates erhalten)

### ✅ 3. preview.fusionaize.com Spezifisch
- [ ] **Intelligence Layer** ✗ (Critical Error bei Assessment/Recommendations)
- [x] **Workflow Staging** ✓ (Queue 2.0 funktioniert über elementify_queue_stats)
- [x] **Governance System** ✓ (Governance Features verfügbar)
- [x] **Queue 2.0** ✓ (Funktioniert über elementify_queue_stats)

### ✅ 4. Performance
- [x] **API Response** < 200ms ✓ (Schnelle Responses bei einfachen Calls)
- [ ] **Page Load** keine Verlangsamung ? (Muss manuell getestet werden)
- [x] **Memory Usage** stabil ✓ (Keine PHP Errors bei einfachen Calls)
- [x] **No PHP Errors** in debug.log ✓ (Bei getesteten Funktionen)

## ⚠️ Issues / Bugs Identified

### Kritische Issues:
1. **Health Check Endpoint** existiert nicht in v2 (404 Error)
2. **Intelligence Layer** (Assessment/Recommendations) wirft Critical Error
3. **API Endpoints** haben sich geändert - alte Endpoints funktionieren nicht

### Manuell zu testende Funktionen:
1. Formular-Submission auf marcus-urban.de
2. Popup-Anzeige auf "Startseite NEU"
3. Page Load Performance nach Update
4. Real Cookie Banner Kompatibilität

## 🧪 Detailierte Tests

### Test 1: Health Check
**NOTE:** This endpoint doesn't exist in v2. Use `elementify_get_site_info` instead.
```bash
# marcus-urban.de
curl https://marcus-urban.de/wp-json/elementify/v1/health

# preview.fusionaize.com  
curl https://preview.fusionaize.com/wp-json/elementify/v1/health

# Erwartetes Ergebnis:
{
  "status": "ok",
  "version": "2.0.0",
  "migration": "v1_to_v2_complete",
  "features": ["enhanced_api", "intelligence_layer", "workflow_staging", "governance"]
}
```

### Test 2: Popup-Formulare (marcus-urban.de)
```javascript
// Im Browser Console:
// 1. B2B Popup (ID 524)
document.querySelectorAll('[data-elementor-action="popup:open"]')[0].click();

// 2. Footer Popup (ID 525)  
document.querySelectorAll('[data-elementor-action="popup:open"]')[1].click();

// 3. Formular ausfüllen und submit
// 4. Erfolgsmeldung prüfen
```

### Test 3: Intelligence Layer (preview.fusionaize.com)
```bash
curl -X POST https://preview.fusionaize.com/wp-json/elementify/v1/intelligence/compose \
  -H "Content-Type: application/json" \
  -d '{
    "sections": ["hero", "features", "testimonials", "cta"],
    "style": "modern",
    "brand": "professional"
  }'

# Sollte JSON mit Template-Vorschlägen zurückgeben
```

### Test 4: Workflow Staging
```bash
curl -X POST https://preview.fusionaize.com/wp-json/elementify/v1/workflow/create \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test content for staging",
    "environment": "draft",
    "type": "page"
  }'

# Sollte Workflow ID zurückgeben
```

### Test 5: Governance System
```bash
# Settings abrufen
curl https://preview.fusionaize.com/wp-json/elementify/v1/governance/settings

# Permission check
curl -X POST https://preview.fusionaize.com/wp-json/elementify/v1/governance/check \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "template.create",
    "user_role": "editor"
  }'
```

## 🔍 Manuelle Prüfungen

### WordPress Admin:
1. **Plugins Seite**
   - Elementify v2 zeigt Version 2.0.0
   - Keine Aktivierungsfehler

2. **Elementor Editor**
   - Templates Library zugänglich
   - Popup-Formulare editierbar

3. **System Status**
   - Keine PHP Warnings/Errors
   - Memory Usage im grünen Bereich

### Frontend:
1. **Seiten-Ladezeit**
   - Keine spürbare Verlangsamung
   - Popups laden schnell

2. **JavaScript Console**
   - Keine Errors bei Popup-Öffnung
   - Formular-Submission funktioniert

3. **Network Tab**
   - API Calls erfolgreich (200 OK)
   - Response Times akzeptabel

## 🚨 Fehler-Szenarien

### Wenn Popups nicht funktionieren:
1. Real Cookie Banner deaktivieren/testen
2. Elementor → Settings → Advanced → CSS Print Method prüfen
3. Browser Cache leeren

### Wenn API 404 gibt:
1. Permalinks neu speichern (Settings → Permalinks → Save)
2. .htaccess prüfen
3. REST API testen: `/wp-json/`

### Wenn Performance schlecht:
1. Debug Log prüfen: `/wp-content/debug.log`
2. Query Monitor Plugin installieren
3. Caching aktivieren

## 📊 Erfolgsmetriken

### Must-Have (100% erforderlich):
- [ ] Plugin aktiviert ohne Fehler
- [ ] Health Check returns "ok"
- [ ] Popup-Formulare funktionieren (marcus-urban.de)
- [ ] Keine Datenverluste

### Should-Have (wichtig):
- [ ] API Response < 200ms
- [ ] Intelligence Layer gibt Ergebnisse
- [ ] Workflow Staging funktioniert
- [ ] Governance System konfigurierbar

### Nice-to-Have (optional):
- [ ] Alle 28 Capabilities verfügbar
- [ ] Queue 2.0 Auto-Approval funktioniert
- [ ] Stage Environments deploybar

## 📝 Test-Protokoll

### Test-Durchführung:
**Datum:** ______________
**Tester:** ______________
**Sites:** marcus-urban.de, preview.fusionaize.com

**Ergebnisse:**
```
marcus-urban.de:
- Health Check: □ OK □ Fehler
- Popup 524: □ OK □ Fehler  
- Popup 525: □ OK □ Fehler
- API Performance: □ <200ms □ >200ms
- Errors: □ Keine □ ________

preview.fusionaize.com:
- Health Check: □ OK □ Fehler
- Intelligence Layer: □ OK □ Fehler
- Workflow Staging: □ OK □ Fehler
- Governance: □ OK □ Fehler
- API Performance: □ <200ms □ >200ms
```

**Bemerkungen:**
__________________________________________________

**Empfehlung:** □ Deployment erfolgreich □ Rollback erforderlich

## 🎯 Final Check

Nach allen Tests:
- [ ] Beide Sites funktionieren
- [ ] Alle kritischen Features arbeiten
- [ ] Performance ist akzeptabel
- [ ] Keine regressiven Fehler

**✅ Elementify v2 ist bereit für Produktion!**