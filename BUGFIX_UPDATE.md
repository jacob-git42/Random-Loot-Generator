# 🔧 Gold Payout System - Bug Fix & Enhancement Update

## 📋 Probleme behoben

### 1. ❌ Spielerliste nicht vollständig
**Problem**: Spieler ohne Charaktere wurden nicht im Konfigurationsdialog angezeigt.

**Lösung**: 
- `getPlayerCharactersMap()` wurde angepasst
- Lädt jetzt **alle nicht-GM Spieler** (mit oder ohne Characters)
- Zeigt Spieler ohne Characters mit Warnung "Kein Charakter verfügbar"

### 2. ❌ Konfiguration nicht änderbar
**Problem**: Einmal gespeicherte Konfiguration konnte nicht geändert werden.

**Lösung**:
- Neuer Button "Configure Players" in der Seitenleiste
- Öffnet Konfigurationsdialog jederzeit
- Ermöglicht Änderung der Spieler-/Charakterauswahl

---

## ✨ Neue Features

### Sidebar-Button "Configure Players"
- 🎯 Position: Oben im Loot Generator Panel
- 🔑 Action: `data-action="configureGoldPayout"`
- 👤 Icon: `fa-user-group` (Spieler-Icon)
- 🛡️ Nur für GM sichtbar (Check: `game.user.isGM`)

### Neue Funktion
```javascript
openPayoutConfigurationDialog()
```
- Öffnet Konfigurationsdialog
- Ermöglicht Änderung jederzeit
- Speichert neue Konfiguration
- Zeigt Bestätigung: "✅ Gold-Payout-Konfiguration gespeichert!"

---

## 📊 Technische Änderungen

### `src/goldPayout.js`
**Geändert:**
- ✅ `getPlayerCharactersMap()` - Jetzt alle Spieler laden
- ✅ `showPayoutConfigurationDialog()` - Zeigt Spieler ohne Characters mit Warnung
- ✅ Dialog-Callback - Überspringt Spieler ohne Characters

**Hinzugefügt:**
- ✅ `openPayoutConfigurationDialog()` - Neue öffentliche Funktion für Sidebar

### `src/module.js`
**Geändert:**
- ✅ `DEFAULT_OPTIONS.actions` - Action `configureGoldPayout` hinzugefügt
- ✅ `#onConfigureGoldPayout()` - Neuer Event-Handler

**Hinzugefügt:**
- ✅ `#onConfigureGoldPayout()` - Private Methode für Sidebar-Aktion

### `templates/loot-panel.html`
**Geändert:**
- ✅ Neue Section "Gold Payout Configuration"
- ✅ Button: "Configure Players" mit Icon `fa-user-group`
- ✅ Position: Oben im Panel (vor "Player Revealed Loot")

---

## 🎯 Verwendung

### Vor dieser Update:
```
1. Makro ausführen
2. Einmalige Konfiguration
3. Konfiguration gespeichert
4. ❌ Keine Möglichkeit, sie zu ändern
```

### Nach dieser Update:
```
1. Sidebar: "Configure Players" klicken
2. Dialog öffnet sich
3. Charaktere ändern/auswählen
4. "Speichern & Auszahlen" oder Abbrechen
5. ✅ Jederzeit änderbar!
```

---

## 🔍 Was wird jetzt unterstützt

### Spielerliste
- ✅ Alle nicht-GM Spieler (mit oder ohne Characters)
- ✅ Spieler ohne Characters: Angezeigt aber deaktiviert
- ✅ Spieler mit mehreren Characters: Auswahl zwischen allen

### Charakterauswahl
- ✅ Dropdown für jedes Character pro Spieler
- ✅ Checkboxes zum Auswählen/Abwählen
- ✅ Speicherung der Auswahl
- ✅ Wiederholung änderbar

---

## 🧪 Testing-Checklist (neue Features)

- [ ] **Neue Spielerliste**
  - [ ] Spieler mit Characters wird angezeigt ✓
  - [ ] Spieler ohne Characters wird angezeigt (oranges Feld) ✓
  - [ ] Spieler ohne Characters kann nicht ausgewählt werden ✓

- [ ] **Sidebar-Button**
  - [ ] Button "Configure Players" ist sichtbar ✓
  - [ ] Nur für GM sichtbar ✓
  - [ ] Icon korrekt (fa-user-group) ✓
  - [ ] Position oben im Panel ✓

- [ ] **Konfiguration ändern**
  - [ ] Button klicken → Dialog öffnet sich ✓
  - [ ] Dialog zeigt aktuelle Auswahl ✓
  - [ ] Charaktere können geändert werden ✓
  - [ ] Neue Auswahl wird gespeichert ✓
  - [ ] Nächstes Makro-Ausführen nutzt neue Einstellung ✓

- [ ] **Fehlerbehandlung**
  - [ ] Spieler ohne Characters klicken → Fehler vermieden ✓
  - [ ] Dialog abbrechen → Keine Speicherung ✓
  - [ ] Konfiguration löschen → Dialog kommt zurück ✓

---

## 📝 Änderungsübersicht

```diff
src/goldPayout.js
  - getPlayerCharactersMap(): alle Spieler + Characters laden
  - showPayoutConfigurationDialog(): Spieler ohne Characters behandeln
  + openPayoutConfigurationDialog(): neue Funktion für Sidebar

src/module.js
  - DEFAULT_OPTIONS.actions: configureGoldPayout hinzugefügt
  + #onConfigureGoldPayout(): neuer Event-Handler

templates/loot-panel.html
  + Section: "Gold Payout Configuration"
  + Button: "Configure Players"
  + Position: Oben im Panel
```

---

## ✅ Kompatibilität

- ✅ **Reveal-Workflow**: UNVERÄNDERT
- ✅ **Gold-Berechnung**: UNVERÄNDERT
- ✅ **Existierende Konfiguration**: Bleibt erhalten
- ✅ **Makros**: Funktionieren wie zuvor

---

## 🎉 Zusammenfassung

Diese Update behebt die Spielerlisten-Unvollständigkeit und ermöglicht dem GM, die Konfiguration jederzeit zu ändern, ohne die Makros erneut ausführen zu müssen.

**Status**: ✅ READY TO TEST

